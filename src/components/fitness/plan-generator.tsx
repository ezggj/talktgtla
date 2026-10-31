'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Check, Loader2, Sparkles, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardDesc, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { springSnappy } from '@/components/motion/presets'
import { createClient } from '@/lib/supabase/client'
import {
  EQ_OPTIONS,
  EXP_OPTIONS,
  GOAL_OPTIONS,
  generatePlan,
  type GeneratedPlan,
  type PlanEquipment,
  type PlanExperience,
  type PlanGoal,
  type PlanInputs,
} from '@/lib/fitness/plan-generator'
import { cn } from '@/lib/utils'
import { ExerciseHowTo } from '@/components/fitness/exercise-howto'
import { loadSessions } from '@/lib/fitness/storage'
import { computePlanWeekProgress } from '@/lib/fitness/plan-progress'
import {
  loadLocalGeneratedPlan,
  saveLocalGeneratedPlan,
} from '@/lib/fitness/saved-plans'
import {
  evaluateFitnessAchievements,
  unlockFitnessAchievements,
  loadFitnessUnlocked,
} from '@/lib/fitness/achievements'
import { WeeklyPresets } from '@/components/fitness/weekly-presets'
import { CustomPlanBuilder } from '@/components/fitness/custom-plan-builder'
import { setFollowingPlan, hydrateActivePlanFromCloud, loadActivePlan } from '@/lib/fitness/plan-store'

type Props = {
  userId: string | null
}

export function PlanGenerator({ userId }: Props) {
  const [goal, setGoal] = useState<PlanGoal>('hypertrophy')
  const [experience, setExperience] = useState<PlanExperience>('beginner')
  const [days, setDays] = useState<2 | 3 | 4 | 5 | 6>(3)
  const [minutes, setMinutes] = useState<30 | 45 | 60 | 75>(45)
  const [equipment, setEquipment] = useState<PlanEquipment>('gym')
  const [notes, setNotes] = useState('')
  const [plan, setPlan] = useState<GeneratedPlan | null>(null)
  const [planId, setPlanId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [step, setStep] = useState(0)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const activeFirst = loadActivePlan()
        if (activeFirst?.plan?.days?.length) {
          setPlan(activeFirst.plan)
          setPlanId(activeFirst.cloudId ?? activeFirst.id)
          const inp = (activeFirst.inputs || {}) as Partial<PlanInputs>
          if (inp.goal) setGoal(inp.goal)
          if (inp.experience) setExperience(inp.experience)
          if (inp.daysPerWeek) setDays(inp.daysPerWeek)
          if (inp.sessionMinutes) setMinutes(inp.sessionMinutes)
          if (inp.equipment) setEquipment(inp.equipment)
          if (inp.notes) setNotes(inp.notes)
          if (!cancelled) setLoaded(true)
          return
        }
        if (userId) {
          const supabase = createClient()
          const { data } = await supabase
            .from('workout_plans')
            .select('id, plan, inputs')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (cancelled) return
          if (data?.plan) {
            setPlan(data.plan as GeneratedPlan)
            setPlanId(data.id)
            const inp = data.inputs as Partial<PlanInputs>
            if (inp.goal) setGoal(inp.goal)
            if (inp.experience) setExperience(inp.experience)
            if (inp.daysPerWeek) setDays(inp.daysPerWeek)
            if (inp.sessionMinutes) setMinutes(inp.sessionMinutes)
            if (inp.equipment) setEquipment(inp.equipment)
            if (inp.notes) setNotes(inp.notes)
            saveLocalGeneratedPlan(data.plan as GeneratedPlan, data.inputs as Partial<PlanInputs>)
            return
          }
        }
        const active = loadActivePlan()
        const local = active?.plan
          ? { plan: active.plan, inputs: active.inputs as Partial<PlanInputs> | undefined }
          : loadLocalGeneratedPlan()
        if (cancelled) return
        if (local?.plan) {
          setPlan(local.plan)
          if (active?.cloudId || active?.id) setPlanId(active.cloudId ?? active.id)
          const inp = local.inputs || {}
          if (inp.goal) setGoal(inp.goal)
          if (inp.experience) setExperience(inp.experience)
          if (inp.daysPerWeek) setDays(inp.daysPerWeek)
          if (inp.sessionMinutes) setMinutes(inp.sessionMinutes)
          if (inp.equipment) setEquipment(inp.equipment)
          if (inp.notes) setNotes(inp.notes)
        } else if (userId) {
          const supabase = createClient()
          const hydrated = await hydrateActivePlanFromCloud(supabase, userId)
          if (cancelled || !hydrated?.plan) return
          setPlan(hydrated.plan)
          setPlanId(hydrated.cloudId ?? hydrated.id)
        }
      } finally {
        if (!cancelled) setLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId])

  const run = async () => {
    setErr(null)
    setBusy(true)
    try {
      const inputs: PlanInputs = {
        goal,
        experience,
        daysPerWeek: days,
        sessionMinutes: minutes,
        equipment,
        notes: notes.trim() || undefined,
      }
      const generated = generatePlan(inputs)
      setPlan(generated)
      saveLocalGeneratedPlan(generated, inputs)

      let cloudId: string | undefined
      if (userId) {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('workout_plans')
          .insert({
            user_id: userId,
            inputs,
            plan: generated,
            title: generated.title,
          })
          .select('id')
          .single()
        if (error) throw error
        cloudId = data.id
        setPlanId(data.id)
      }
      const meta = setFollowingPlan(generated, {
        source: 'generator',
        inputs,
        cloudId,
      })
      if (!cloudId) setPlanId(meta.id)
      setEditing(false)
      setStep(0)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '出唔到課表，試多次')
    } finally {
      setBusy(false)
    }
  }

  const steps = [
    {
      label: '目標',
      hint: '想變成點？揀一個就得，之後可以改。',
    },
    {
      label: '經驗',
      hint: '照實講。新手課表會少啲動作、多啲休息。',
    },
    {
      label: '一週幾日',
      hint: '寫你真係去到嘅日數，唔好寫理想。',
    },
    {
      label: '每次幾耐',
      hint: '連熱身計。趕時間就揀 30 或 45。',
    },
    {
      label: '器材',
      hint: '場地決定動作。屋企練就唔好揀健身房。',
    },
  ] as const
  const showWizard = !plan || editing
  const choiceLine = `${GOAL_OPTIONS.find((o) => o.id === goal)?.label ?? ''} · ${
    EXP_OPTIONS.find((o) => o.id === experience)?.label ?? ''
  } · 一週 ${days} 日 · ${minutes} 分 · ${EQ_OPTIONS.find((o) => o.id === equipment)?.label ?? ''}`

  if (!loaded) {
    return (
      <Card>
        <div className="h-6 w-40 rounded-xl bg-border skeleton-pulse mb-3" />
        <div className="h-24 rounded-2xl bg-border/60 skeleton-pulse" />
      </Card>
    )
  }

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--accent-soft),_transparent_55%)] pointer-events-none" />
      <div className="relative space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Badge tone="accent">課表</Badge>
            <CardTitle className="mt-2 text-xl">一星期點練？</CardTitle>
            <CardDesc className="mt-2">
              答五步，出一星期課表，撳開波就去練。
            </CardDesc>
          </div>
          <Sparkles className="h-5 w-5 text-accent shrink-0" />
        </div>

        {showWizard ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold text-accent">
                第 {step + 1} / {steps.length} 步 · {steps[step].label}
              </p>
              <div className="flex gap-1" aria-hidden>
                {steps.map((s, i) => (
                  <span
                    key={s.label}
                    className={cn(
                      'h-1.5 w-5 rounded-full',
                      i <= step ? 'bg-accent' : 'bg-border'
                    )}
                  />
                ))}
              </div>
            </div>
            <p className="text-sm text-muted leading-relaxed">{steps[step].hint}</p>

            {step === 0 && (
              <ChipRow
                options={GOAL_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
                value={goal}
                onChange={(v) => setGoal(v as PlanGoal)}
              />
            )}
            {step === 1 && (
              <ChipRow
                options={EXP_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
                value={experience}
                onChange={(v) => setExperience(v as PlanExperience)}
              />
            )}
            {step === 2 && (
              <ChipRow
                options={[2, 3, 4, 5, 6].map((d) => ({ id: String(d), label: `${d} 日` }))}
                value={String(days)}
                onChange={(v) => setDays(Number(v) as 2 | 3 | 4 | 5 | 6)}
              />
            )}
            {step === 3 && (
              <ChipRow
                options={[30, 45, 60, 75].map((m) => ({ id: String(m), label: `${m} 分` }))}
                value={String(minutes)}
                onChange={(v) => setMinutes(Number(v) as 30 | 45 | 60 | 75)}
              />
            )}
            {step === 4 && (
              <div className="space-y-3">
                <ChipRow
                  options={EQ_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
                  value={equipment}
                  onChange={(v) => setEquipment(v as PlanEquipment)}
                />
                <label className="block text-xs text-muted">
                  傷患／備註（唔填都得）
                  <Input
                    className="mt-1.5"
                    placeholder="例如：右膝唔好深蹲太深"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </label>
                <p className="rounded-2xl bg-surface-muted px-3 py-2 text-[12px] leading-relaxed text-muted">
                  而家係：{choiceLine}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                disabled={step === 0 && !plan}
                onClick={() => {
                  if (step === 0 && plan) {
                    setEditing(false)
                    setErr(null)
                    return
                  }
                  setStep((s) => Math.max(0, s - 1))
                }}
              >
                {step === 0 && plan ? '返去課表' : '上一步'}
              </Button>
              {step < steps.length - 1 ? (
                <Button className="flex-[1.4]" onClick={() => setStep((s) => s + 1)}>
                  下一步
                </Button>
              ) : (
                <Button className="flex-[1.4]" onClick={() => void run()} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {plan ? '重新出一套' : '出我嘅課表'}
                </Button>
              )}
            </div>
            {err && <p className="text-xs text-red-600">{err}</p>}
          </div>
        ) : (
          plan && (
            <Button
              variant="soft"
              className="w-full"
              onClick={() => {
                setEditing(true)
                setStep(0)
                setErr(null)
              }}
            >
              改答案 · 重新出
            </Button>
          )
        )}

        {plan && (
          <div className="space-y-3 pt-2 border-t border-border">
            <PlanWeekProgress plan={plan} />
            <div>
              <div className="font-serif text-lg">{plan.title}</div>
              <p className="text-xs text-muted mt-1 leading-relaxed">{plan.summary}</p>
              <p className="text-[11px] text-muted mt-1">每日右邊「開波」會帶晒動作去訓練頁，唔使再揀一次。</p>
              <p className="text-[10px] text-muted mt-1">
                {planId ? '已同步去你個帳戶' : '已留喺呢部機。登入先可以喺第部機睇返。'}
              </p>
            </div>
            {plan.days.map((d) => {
              const qs = d.exercises.map((e) => e.exerciseId).join(',')
              const href = `/train?plan=${encodeURIComponent(plan.title)}&exercises=${encodeURIComponent(qs)}`
              return (
                <motion.div
                  key={`${d.dayIndex}-${d.focus}`}
                  layout
                  className="rounded-2xl border border-border bg-surface-muted p-3.5"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div>
                      <div className="text-sm font-medium">
                        {d.nameZh} · {d.focus}
                      </div>
                      <div className="text-[11px] text-muted">{d.exercises.length} 個動作</div>
                    </div>
                    <Link
                      href={href}
                      className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-xs font-semibold bg-accent text-white shadow-soft hover:bg-[#0d6a63] transition-colors"
                    >
                      <Play className="h-3.5 w-3.5" />
                      開波
                    </Link>
                  </div>
                  <ul className="space-y-2">
                    {d.exercises.map((e) => (
                      <li key={e.exerciseId + e.nameZh} className="text-xs">
                        <div className="flex justify-between gap-2 text-muted">
                          <span className="text-foreground font-medium">{e.nameZh}</span>
                          <span className="tabular-nums shrink-0">
                            {e.sets} × {e.reps}
                          </span>
                        </div>
                        <div className="mt-1">
                          <ExerciseHowTo exerciseId={e.exerciseId} exerciseName={e.nameZh} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </Card>
  )
}

function ChipRow({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <motion.button
          key={o.id}
          type="button"
          whileTap={{ scale: 0.97 }}
          transition={springSnappy}
          onClick={() => onChange(o.id)}
          className={cn(
            'rounded-full px-3 py-1.5 text-xs font-medium border transition',
            value === o.id
              ? 'bg-accent text-white border-accent'
              : 'bg-surface border-border text-muted hover:text-foreground'
          )}
        >
          {o.label}
        </motion.button>
      ))}
    </div>
  )
}



function PlanWeekProgress({ plan }: { plan: GeneratedPlan }) {
  const [progress, setProgress] = useState<ReturnType<typeof computePlanWeekProgress> | null>(null)

  useEffect(() => {
    const sessions = loadSessions()
    setProgress(computePlanWeekProgress(plan, sessions))
  }, [plan])

  useEffect(() => {
    if (!progress || progress.total <= 0) return
    const ratio = progress.doneCount / progress.total
    const newly = evaluateFitnessAchievements({
      sessions: loadSessions(),
      meals: [],
      prs: {},
      planDoneRatio: ratio,
      already: loadFitnessUnlocked(),
    })
    if (newly.length) unlockFitnessAchievements(newly)
  }, [progress])

  if (!progress) {
    return <div className="h-16 rounded-2xl bg-border/50 skeleton-pulse mb-1" aria-hidden />
  }

  const next = progress.nextIncomplete
  const nextHref = next
    ? `/train?plan=${encodeURIComponent(plan.title)}&exercises=${encodeURIComponent(
        next.day.exercises.map((e) => e.exerciseId).join(',')
      )}`
    : null

  return (
    <div className="rounded-2xl border border-border bg-surface p-3.5 mb-1">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="text-xs font-medium text-muted">呢個星期進度</div>
        <Badge tone={progress.doneCount > 0 ? 'accent' : 'muted'}>
          {progress.doneCount}/{progress.total} 日
        </Badge>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {progress.days.map((d) => (
          <span
            key={d.day.dayIndex}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium border',
              d.done
                ? 'bg-accent-soft text-accent border-accent/25'
                : d.isToday
                  ? 'bg-[#FEF3C7] text-[#92400E] border-[#F59E0B]/30'
                  : 'bg-surface-muted text-muted border-border'
            )}
            title={d.slotDate}
          >
            {d.done ? <Check className="h-3 w-3" /> : null}
            {d.day.nameZh.replace('星期', '')}
          </span>
        ))}
      </div>
      {nextHref && next && (
        <Link
          href={nextHref}
          className="inline-flex w-full items-center justify-center gap-1.5 h-10 rounded-xl text-xs font-semibold bg-accent text-white shadow-soft hover:bg-[#0d6a63] transition-colors"
        >
          <Play className="h-3.5 w-3.5" />
          {next.isToday ? '開波 · 今日課表' : `繼續 · ${next.day.nameZh}`}
        </Link>
      )}
      {!next && progress.doneCount > 0 && (
        <p className="text-[11px] text-accent text-center">呢個星期課表全部打卡 ✓</p>
      )}
    </div>
  )
}
