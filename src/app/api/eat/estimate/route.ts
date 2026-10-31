import { generateText, Output } from 'ai'
import { z } from 'zod'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { clientIpFromRequest } from '@/lib/request-ip'

export const maxDuration = 60

const DEFAULT_MODEL = 'google/gemini-2.5-flash'
/** ~1.2MB base64 ≈ ~900KB binary after client compress */
const MAX_DATA_URL_CHARS = 1_600_000

const estimateSchema = z.object({
  label_zh: z
    .string()
    .describe('廣東話／繁中菜名或簡短描述，例如「叉燒飯」「雞胸沙律」'),
  kcal: z.number().describe('估計卡路里 kcal（整份可見食物）'),
  protein_g: z.number().describe('蛋白質克數'),
  carbs_g: z.number().describe('碳水化合物克數'),
  fat_g: z.number().describe('脂肪克數'),
  fiber_g: z.number().nullable().describe('膳食纖維克數，唔確定就 null'),
  confidence: z.number().min(0).max(1).describe('0–1 自信度'),
  notes_zh: z
    .string()
    .describe('一句廣東話備註，例如醬汁／份量假設；短過 40 字'),
})

type Body = {
  imageDataUrl?: string
  mediaType?: string
}

function stripDataUrl(dataUrl: string): { base64: string; mediaType: string } | null {
  const raw = dataUrl.trim()
  if (!raw.startsWith('data:') || !raw.includes(';base64,')) return null
  const comma = raw.indexOf(',')
  const header = raw.slice(5, comma) // after data:
  const mediaType = header.split(';')[0] || 'image/jpeg'
  const base64 = raw.slice(comma + 1)
  if (!base64) return null
  return { mediaType, base64 }
}

function clampMacro(n: number, max: number) {
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.min(max, Math.round(n))
}

export async function POST(req: Request) {
  const ip = clientIpFromRequest(req)

  const burst = checkRateLimit(`eat-est-burst:${ip}`, { limit: 3, windowMs: 30_000 })
  if (!burst.ok) {
    return NextResponse.json(
      { error: '估得太密，等陣再試', retryAfterSec: burst.retryAfterSec, code: 'rate_limit' },
      { status: 429, headers: { 'Retry-After': String(burst.retryAfterSec) } }
    )
  }
  const daily = checkRateLimit(`eat-est-day:${ip}`, { limit: 40, windowMs: 24 * 60 * 60_000 })
  if (!daily.ok) {
    return NextResponse.json(
      { error: '今日 AI 估算次數用晒，聽日再嚟或者用手改', retryAfterSec: daily.retryAfterSec, code: 'rate_limit' },
      { status: 429, headers: { 'Retry-After': String(daily.retryAfterSec) } }
    )
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: '無效請求', code: 'bad_request' }, { status: 400 })
  }

  const dataUrl = body.imageDataUrl?.trim()
  if (!dataUrl || dataUrl.length > MAX_DATA_URL_CHARS) {
    return NextResponse.json(
      { error: '相片太大或者缺失，請再影細啲', code: 'bad_image' },
      { status: 400 }
    )
  }

  const parsed = stripDataUrl(dataUrl)
  if (!parsed || !parsed.mediaType.startsWith('image/')) {
    return NextResponse.json({ error: '只接受圖片', code: 'bad_image' }, { status: 400 })
  }

  const model = process.env.AI_GATEWAY_MODEL?.trim() || DEFAULT_MODEL

  try {
    const { output } = await generateText({
      model,
      temperature: 0.2,
      maxOutputTokens: 400,
      instructions: `你係香港健身飲食助手。根據餐相估算營養（整份可見食物）。
優先用香港菜式／茶記／燒味／便當名稱（繁中／粵語口語）。
數字要合理；唔確定就保守估。回傳結構化欄位；notes_zh 用廣東話一句。
唔好講醫療建議。`,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '請估算呢餐嘅卡路里同三大營養素（同可選纖維），並畀廣東話菜名。',
            },
            {
              type: 'file',
              mediaType: parsed.mediaType.startsWith('image/')
                ? parsed.mediaType
                : 'image/jpeg',
              data: parsed.base64,
            },
          ],
        },
      ],
      output: Output.object({ schema: estimateSchema }),
    })

    if (!output) {
      return NextResponse.json(
        { error: 'AI 冇回傳結果', code: 'ai_empty' },
        { status: 502 }
      )
    }

    const macros = {
      kcal: clampMacro(output.kcal, 5000),
      protein: clampMacro(output.protein_g, 400),
      carbs: clampMacro(output.carbs_g, 800),
      fat: clampMacro(output.fat_g, 400),
      fiber:
        output.fiber_g == null || !Number.isFinite(output.fiber_g)
          ? undefined
          : clampMacro(output.fiber_g, 120),
    }

    return NextResponse.json({
      source: 'ai' as const,
      name: (output.label_zh || '未知餐食').slice(0, 48),
      macros,
      confidence: Math.max(0, Math.min(1, output.confidence ?? 0.5)),
      note: (output.notes_zh || '').slice(0, 80),
      model,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'AI 估算失敗'
    console.error('[eat/estimate]', message)
    return NextResponse.json(
      { error: 'AI 暫時估唔到', code: 'ai_failed', detail: message.slice(0, 160) },
      { status: 502 }
    )
  }
}
