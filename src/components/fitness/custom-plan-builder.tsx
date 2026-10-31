'use client'

import { useMemo, useState } from 'react'
import { Check, Plus, Trash2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDesc, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { EXERCISES, exerciseById, searchExercises } from '@/lib/fitness/exercises'
import type { GeneratedPlan, PlanDay, PlanExercise } from '@/lib/fitness/plan-generator'
import { setFollowingPlan, type StoredPlanMeta } from '@/lib/fitness/plan-store'
import { createClient } from '@/lib/supabase/client'
import { persistPlanToCloud } from '@/lib/fitness/plan-store'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']
const FOCUS_PRESETS = ['推', '拉', '腿', '上身', '下身', '全身'] as const

type DraftDay = {
  enabled: boolean
  focus: string
  exerciseIds: string[]
}

function emptyDraft(): DraftDay[] {
  return WEEKDAYS.map((_, i) => ({
    enabled: i === 0 || i === 2 || i === 4,
    focus: i === 0 ? '推' : i === 2 ? '拉' : i === 4 ? '腿' : '全身',
    exerciseIds:
      i === 0
        ? ['chest-press-machine', 'db-shoulder-press', 'tricep']
        : i === 2
          ? ['latpulldown', 'seated-row', 'curl']
          : i === 4
            ? ['goblet-squat', 'rdl', 'calf']
            : [],
  }))
}

type Props = {
  userId?: string | null
  onSaved?: (meta: StoredPlanMeta) => void
}

export function CustomPlanBuilder({ userId, onSaved }: Props) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('我嘅週課表')
  const [days, setDays] = useState<DraftDay[]>(emptyDraft)
  const [editDay, setEditDay] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  const hits = useMemo(() => {
    if (!search.trim()) return EXERCISES.slice(0, 12)
    return searchExercises(search).slice(0, 16)
  }, [search])

  const toggleDay = (i: number) => {
    setDays((prev) =>
      prev.map((d, idx) => (idx === i ? { ...d, enabled: !d.enabled } : d))
    )
  }

  const setFocus = (i: number, focus: string) => {
    setDays((prev) => prev.map((d, idx) => (idx === i ? { ...d, focus } : d)))
  }

  const toggleEx = (dayIdx: number, id: string) => {
    setDays((prev) =>
      prev.map((d, idx) => {
        if (idx !== dayIdx) return d
        const has = d.exerciseIds.includes(id)
        return {
          ...d,
          exerciseIds: has ? d.exerciseIds.filter((x) => x !== id) : [...d.exerciseIds, id].slice(0, 8),
        }
      })
    )
  }

  const buildPlan = (): GeneratedPlan | null => {
    const planDays: PlanDay[] = []
    days.forEach((d, dayIndex) => {
      if (!d.enabled || d.exerciseIds.length === 0) return
      const exercises: PlanExercise[] = d.exerciseIds
        .map((id) => {
          const ex = exerciseById(id)
          if (!ex) return null
          return {
            exerciseId: id,
            nameZh: ex.nameZh,
            sets: 3,
            reps: id === 'plank' ? '30–60秒' : '8–12',
            restSec: 90,
          } satisfies PlanExercise
        })
        .filter(Boolean) as PlanExercise[]
      if (!exercises.length) return
      planDays.push({
        dayIndex,
        nameZh: `星期${WEEKDAYS[dayIndex]}`,
        focus: d.focus || '訓練',
        exercises,
      })
    })
    if (!planDays.length) return null
    const name = title.trim() || '我嘅週課表'
    return {
      title: name,
      split: '自訂',
      summary: `你自己砌嘅課表 · 一週 ${planDays.length} 練。跟住一掣就可以開波。`,
      days: planDays,
    }
  }

  const save = async () => {
    setErr(null)
    setOk(false)
    const plan = buildPlan()
    if (!plan) {
      setErr('至少開一日，同埋每日本最少一個動作')
      return
    }
    setBusy(true)
    try {
      let cloudId: string | undefined
      if (userId) {
        try {
          const supabase = createClient()
          cloudId = await persistPlanToCloud(supabase, userId, plan, {
            custom: true,
            source: 'custom',
          })
        } catch {
          /* local still ok */
        }
      }
      const meta = setFollowingPlan(plan, {
        source: 'custom',
        inputs: { custom: true },
        cloudId,
      })
      setOk(true)
      onSaved?.(meta)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '儲存失敗')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border border-dashed border-border bg-surface px-4 py-3.5 text-left hover:border-accent/40 hover:bg-accent-soft/20 transition touch-manipulation"
      >
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold">我嘅自訂</span>
          <Badge tone="muted">儲存</Badge>
        </div>
        <p className="mt-1 text-[11px] text-muted leading-relaxed">
          揀邊幾日練、加動作，本機即存；登入會一同上雲。
        </p>
      </button>
    )
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Badge tone="accent">自訂</Badge>
          <CardTitle className="mt-2 text-lg">砌你嘅自訂課表</CardTitle>
          <CardDesc className="mt-1">開／關日子 → 揀部位 → 加動作 → 儲存跟住</CardDesc>
        </div>
        <button
          type="button"
          aria-label="關閉"
          className="rounded-lg p-1.5 text-muted hover:bg-border/60"
          onClick={() => setOpen(false)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <label className="block text-xs text-muted">
        課表名
        <Input
          className="mt-1.5"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例如：我嘅推拉腿"
        />
      </label>

      <div className="flex flex-wrap gap-1.5">
        {WEEKDAYS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => toggleDay(i)}
            className={cn(
              'h-9 min-w-9 rounded-full px-2.5 text-xs font-semibold border transition',
              days[i].enabled
                ? 'bg-accent text-white border-accent'
                : 'bg-surface text-muted border-border'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {days.map((d, i) =>
          d.enabled ? (
            <div key={i} className="rounded-2xl border border-border bg-[#fafaf9] p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-sm font-medium">星期{WEEKDAYS[i]}</span>
                <button
                  type="button"
                  className="text-[11px] text-muted inline-flex items-center gap-1"
                  onClick={() => toggleDay(i)}
                >
                  <Trash2 className="h-3 w-3" />
                  關掉
                </button>
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {FOCUS_PRESETS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFocus(i, f)}
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[10px] font-medium border',
                      d.focus === f
                        ? 'bg-accent text-white border-accent'
                        : 'bg-surface border-border text-muted'
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {d.exerciseIds.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleEx(i, id)}
                    className="inline-flex items-center gap-1 rounded-full bg-accent-soft text-accent border border-accent/20 px-2 py-0.5 text-[10px] font-medium"
                  >
                    {exerciseById(id)?.nameZh || id}
                    <X className="h-2.5 w-2.5" />
                  </button>
                ))}
              </div>
              <Button
                size="sm"
                variant="soft"
                className="w-full"
                onClick={() => setEditDay(editDay === i ? null : i)}
              >
                <Plus className="h-3.5 w-3.5" />
                {editDay === i ? '收起動作' : '加動作'}
              </Button>
              {editDay === i && (
                <div className="mt-2 space-y-2">
                  <Input
                    placeholder="搜：RDL、保加利亞、卧推…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {hits.map((ex) => {
                      const on = d.exerciseIds.includes(ex.id)
                      return (
                        <button
                          key={ex.id}
                          type="button"
                          onClick={() => toggleEx(i, ex.id)}
                          className={cn(
                            'w-full flex items-center justify-between rounded-xl border px-2.5 py-2 text-left text-xs',
                            on
                              ? 'border-accent bg-accent-soft text-accent'
                              : 'border-border bg-surface'
                          )}
                        >
                          <span>
                            {ex.nameZh}
                            <span className="text-muted"> · {ex.nameEn}</span>
                          </span>
                          {on ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5 text-muted" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : null
        )}
      </div>

      {err && <p className="text-xs text-red-600">{err}</p>}
      {ok && (
        <p className="text-xs text-accent inline-flex items-center gap-1">
          <Check className="h-3.5 w-3.5" />
          已儲存並跟住呢套課表
          {!userId && '（本機；登入可上雲）'}
        </p>
      )}

      <Button className="w-full" disabled={busy} onClick={() => void save()}>
        {busy ? '儲存緊…' : '儲存並跟住呢套課表'}
      </Button>
    </Card>
  )
}
