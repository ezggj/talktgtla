'use client'

import { useState } from 'react'
import { Check, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardDesc, CardTitle } from '@/components/ui/card'
import { WEEKLY_PRESETS } from '@/lib/fitness/plan-presets'
import { persistPlanToCloud, setFollowingPlan, type StoredPlanMeta } from '@/lib/fitness/plan-store'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type Props = {
  userId?: string | null
  onApplied?: (meta: StoredPlanMeta) => void
}

export function WeeklyPresets({ userId, onApplied }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [doneId, setDoneId] = useState<string | null>(null)

  const apply = async (presetId: string) => {
    const preset = WEEKLY_PRESETS.find((p) => p.id === presetId)
    if (!preset) return
    setBusyId(presetId)
    try {
      let cloudId: string | undefined
      if (userId) {
        try {
          const supabase = createClient()
          cloudId = await persistPlanToCloud(supabase, userId, preset.plan, {
            presetId: preset.id,
          })
        } catch {
          /* local ok */
        }
      }
      const meta = setFollowingPlan(preset.plan, {
        source: 'preset',
        inputs: { presetId: preset.id },
        cloudId,
      })
      setDoneId(presetId)
      onApplied?.(meta)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-0.5">
        <Sparkles className="h-3.5 w-3.5 text-accent" />
        <span className="text-xs font-medium text-muted">一週模板 · 撳一下跟住</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {WEEKLY_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={busyId === p.id}
            onClick={() => void apply(p.id)}
            className={cn(
              'text-left rounded-2xl border px-3.5 py-3 transition touch-manipulation',
              p.newbie
                ? 'border-accent/30 bg-accent-soft/25 hover:bg-accent-soft/45'
                : 'border-border bg-surface hover:border-accent/35',
              doneId === p.id && 'ring-2 ring-accent/40'
            )}
          >
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <Badge tone={p.newbie ? 'accent' : 'muted'}>{p.badge}</Badge>
              {doneId === p.id && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-accent font-semibold">
                  <Check className="h-3 w-3" />
                  已跟住
                </span>
              )}
            </div>
            <div className="text-sm font-semibold leading-snug">{p.plan.title}</div>
            <p className="mt-1 text-[10px] text-muted leading-relaxed line-clamp-2">
              {p.blurb} · {p.plan.days.length} 日 · {p.plan.summary}
            </p>
            <div className="mt-2 text-[11px] font-semibold text-accent">
              {busyId === p.id ? '設定緊…' : '用呢套'}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

/** Compact card wrapper for /me */
export function WeeklyPresetsCard(props: Props) {
  return (
    <Card>
      <CardTitle className="text-lg">現成一週課表</CardTitle>
      <CardDesc className="mt-1 mb-3">
        唔想慢慢填？直接跟推拉腿、腿日加強或新手全身。
      </CardDesc>
      <WeeklyPresets {...props} />
    </Card>
  )
}
