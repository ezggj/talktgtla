import { generateText, Output } from 'ai'
import { z } from 'zod'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { clientIpFromRequest } from '@/lib/request-ip'
import { estimateFromFoodName } from '@/lib/fitness/meals-demo'

export const maxDuration = 30

/**
 * Re-estimate macros from an edited food name (no photo).
 * Prefer HK table heuristic — does NOT consume vision free-AI daily quota.
 * Optional light text AI only when table confidence is low / no match.
 */

const DEFAULT_MODEL = 'google/gemini-2.5-flash'

const estimateSchema = z.object({
  label_zh: z.string().describe('整理後嘅繁中／粵語菜名'),
  kcal: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
  fiber_g: z.number().nullable(),
  confidence: z.number().min(0).max(1),
  notes_zh: z.string().describe('一句廣東話備註，短過 40 字'),
})

function clampMacro(n: number, max: number) {
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.min(max, Math.round(n))
}

type Body = {
  name?: string
  /** If true, skip AI even when table miss (default false) */
  tableOnly?: boolean
}

export async function POST(req: Request) {
  const ip = clientIpFromRequest(req)
  const burst = checkRateLimit(`eat-name-burst:${ip}`, { limit: 12, windowMs: 60_000 })
  if (!burst.ok) {
    return NextResponse.json(
      { error: '重估太密，等陣再試', code: 'rate_limit', retryAfterSec: burst.retryAfterSec },
      { status: 429, headers: { 'Retry-After': String(burst.retryAfterSec) } }
    )
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: '無效請求', code: 'bad_request' }, { status: 400 })
  }

  const name = (body.name || '').trim().slice(0, 64)
  if (!name) {
    return NextResponse.json({ error: '先寫個名先', code: 'bad_name' }, { status: 400 })
  }

  const table = estimateFromFoodName(name)
  if (table && table.confidence >= 0.55) {
    return NextResponse.json({
      source: 'table' as const,
      name: table.name,
      macros: table.macros,
      confidence: table.confidence,
      note: table.note,
      matched: table.matched,
      quotaBurned: false,
    })
  }

  if (body.tableOnly) {
    if (table) {
      return NextResponse.json({
        source: 'table' as const,
        name: table.name,
        macros: table.macros,
        confidence: table.confidence,
        note: table.note,
        matched: table.matched,
        quotaBurned: false,
      })
    }
    return NextResponse.json(
      {
        error: '未對到呢個名——試下改做常見港式名，或者自己改數字',
        code: 'no_match',
      },
      { status: 404 }
    )
  }

  // Light text-only AI — does NOT touch vision free daily quota
  const model = process.env.AI_GATEWAY_MODEL?.trim() || DEFAULT_MODEL
  try {
    const { output } = await generateText({
      model,
      temperature: 0.2,
      maxOutputTokens: 300,
      instructions: `你係香港健身飲食助手。用戶改咗食物名稱，請只根據名稱（可含份量字眼）估算營養。
優先香港茶記／街坊菜式。數字要合理；唔確定就保守。notes_zh 用廣東話一句。唔好講醫療建議。`,
      messages: [
        {
          role: 'user',
          content: `請按呢個名稱估算卡路里同三大營養素：「${name}」`,
        },
      ],
      output: Output.object({ schema: estimateSchema }),
    })

    if (!output) {
      if (table) {
        return NextResponse.json({
          source: 'table' as const,
          name: table.name,
          macros: table.macros,
          confidence: table.confidence,
          note: table.note + ' · AI 未回傳，用返表',
          matched: table.matched,
          quotaBurned: false,
        })
      }
      return NextResponse.json({ error: 'AI 冇回傳結果', code: 'ai_empty' }, { status: 502 })
    }

    return NextResponse.json({
      source: 'ai' as const,
      name: (output.label_zh || name).slice(0, 48),
      macros: {
        kcal: clampMacro(output.kcal, 5000),
        protein: clampMacro(output.protein_g, 400),
        carbs: clampMacro(output.carbs_g, 800),
        fat: clampMacro(output.fat_g, 400),
        fiber:
          output.fiber_g == null || !Number.isFinite(output.fiber_g)
            ? undefined
            : clampMacro(output.fiber_g, 120),
      },
      confidence: Math.max(0, Math.min(1, output.confidence ?? 0.5)),
      note: ((output.notes_zh || '') + ' · 按名重估（唔扣影相額）').slice(0, 80),
      quotaBurned: false,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'AI 失敗'
    console.error('[eat/estimate-by-name]', message)
    if (table) {
      return NextResponse.json({
        source: 'table' as const,
        name: table.name,
        macros: table.macros,
        confidence: table.confidence,
        note: table.note + ' · AI 暫時唔得，用返表',
        matched: table.matched,
        quotaBurned: false,
      })
    }
    return NextResponse.json(
      {
        error: '未對到又暫時 AI 唔得——試改名或者自己改數字',
        code: 'ai_failed',
        detail: message.slice(0, 120),
      },
      { status: 502 }
    )
  }
}
