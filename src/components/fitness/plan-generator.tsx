'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Loader2, Sparkles, Play } from 'lucide-react'
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

  useEffect(() => {
    if (!userId) {
      setLoaded(true)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
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
        setPlanId(data.id)
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : '生成失敗')
    } finally {
      setBusy(false)
    }
  }

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
            <Badge tone="accent">課表生成</Badge>
            <CardTitle className="mt-2 text-xl">一週點練？</CardTitle>
            <CardDesc className="mt-2">
              講你目標同器材，即刻出廣東話課表。之後一掣開波入訓練。
              {!userId && '（登入先會存雲端）'}
            </CardDesc>
          </div>
          <Sparkles className="h-5 w-5 text-accent shrink-0" />
        </div>

        <Field label="目標">
          <ChipRow
            options={GOAL_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
            value={goal}
            onChange={(v) => setGoal(v as PlanGoal)}
          />
        </Field>
        <Field label="經驗">
          <ChipRow
            options={EXP_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
            value={experience}
            onChange={(v) => setExperience(v as PlanExperience)}
          />
        </Field>
        <Field label="一週幾日">
          <ChipRow
            options={[2, 3, 4, 5, 6].map((d) => ({ id: String(d), label: `${d} 日` }))}
            value={String(days)}
            onChange={(v) => setDays(Number(v) as 2 | 3 | 4 | 5 | 6)}
          />
        </Field>
        <Field label="每次幾耐">
          <ChipRow
            options={[30, 45, 60, 75].map((m) => ({ id: String(m), label: `${m} 分` }))}
            value={String(minutes)}
            onChange={(v) => setMinutes(Number(v) as 30 | 45 | 60 | 75)}
          />
        </Field>
        <Field label="器材">
          <ChipRow
            options={EQ_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
            value={equipment}
            onChange={(v) => setEquipment(v as PlanEquipment)}
          />
        </Field>
        <label className="block text-xs text-muted">
          傷患／備註（可選）
          <Input
            className="mt-1.5"
            placeholder="例如：右膝唔好深蹲太深"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        <Button className="w-full" onClick={() => void run()} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {plan ? '重新生成課表' : '生成我嘅課表'}
        </Button>
        {err && <p className="text-xs text-red-600">{err}</p>}

        {plan && (
          <div className="space-y-3 pt-2 border-t border-border">
            <div>
              <div className="font-serif text-lg">{plan.title}</div>
              <p className="text-xs text-muted mt-1 leading-relaxed">{plan.summary}</p>
              {planId && (
                <p className="text-[10px] text-muted mt-1">已存雲端 · {planId.slice(0, 8)}</p>
              )}
            </div>
            {plan.days.map((d) => {
              const qs = d.exercises.map((e) => e.exerciseId).join(',')
              const href = `/train?plan=${encodeURIComponent(plan.title)}&exercises=${encodeURIComponent(qs)}`
              return (
                <motion.div
                  key={`${d.dayIndex}-${d.focus}`}
                  layout
                  className="rounded-2xl border border-border bg-[#fafaf9] p-3.5"
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
                      className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-xs font-medium border border-border bg-surface shadow-soft hover:bg-[#f5f5f4]"
                    >
                      <Play className="h-3.5 w-3.5" />
                      開波
                    </Link>
                  </div>
                  <ul className="space-y-1">
                    {d.exercises.map((e) => (
                      <li
                        key={e.exerciseId + e.nameZh}
                        className="text-xs flex justify-between gap-2 text-muted"
                      >
                        <span className="text-foreground">{e.nameZh}</span>
                        <span className="tabular-nums shrink-0">
                          {e.sets} × {e.reps}
                        </span>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted mb-1.5">{label}</div>
      {children}
    </div>
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
