'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Flame, Loader2, MapPin, Plus, RefreshCw, Users } from 'lucide-react'
import { Card, CardDesc, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { springSoft, springSnappy } from '@/components/motion/presets'
import { useUser } from '@/lib/auth/use-user'
import {
  MEETUP_FOCUSES,
  featuredMeetupGyms,
  filterMeetupsByArea,
  formatMeetupSlot,
  getMeetupGuestId,
  loadMeetupDisplayName,
  meetupAreaCounts,
  meetupSlotPresets,
  popularMeetupBranches,
  saveMeetupDisplayName,
  type GymMeetup,
} from '@/lib/fitness/meetups'
import { cn } from '@/lib/utils'

type JoinsMap = Record<string, { display_name: string; joined_at: string }[]>

export function MeetupBoard({ className }: { className?: string }) {
  const reduce = useReducedMotion()
  const { user } = useUser()
  const [meetups, setMeetups] = useState<GymMeetup[]>([])
  const [joins, setJoins] = useState<JoinsMap>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [composer, setComposer] = useState(false)
  const [filterArea, setFilterArea] = useState<string | null>(null)

  const gyms = useMemo(() => featuredMeetupGyms(), [])
  const hotBranches = useMemo(() => popularMeetupBranches(12), [])
  const [hostName, setHostName] = useState('')
  const [gymId, setGymId] = useState(gyms[0]?.id || '247-fitness')
  const selectedGym = gyms.find((g) => g.id === gymId) || gyms[0]
  const [area, setArea] = useState(selectedGym?.areas[0] || '旺角')
  const [focus, setFocus] = useState<string>('全身')
  const [slotAt, setSlotAt] = useState(() => meetupSlotPresets()[0]?.iso || '')
  const [note, setNote] = useState('')
  const presets = useMemo(() => meetupSlotPresets(), [meetups.length, composer])

  const areaCounts = useMemo(() => meetupAreaCounts(meetups), [meetups])
  const countByArea = useMemo(() => {
    const m = new Map<string, number>()
    for (const row of areaCounts) m.set(row.area, (m.get(row.area) || 0) + row.count)
    return m
  }, [areaCounts])

  const filtered = useMemo(
    () => filterMeetupsByArea(meetups, filterArea),
    [meetups, filterArea]
  )

  /** Chips: hot branches + any live areas not in the preferred list */
  const branchChips = useMemo(() => {
    const seen = new Set<string>()
    const out: { area: string; count: number; hot: boolean }[] = []
    for (const b of hotBranches) {
      seen.add(b)
      out.push({ area: b, count: countByArea.get(b) || 0, hot: (countByArea.get(b) || 0) > 0 })
    }
    for (const row of areaCounts) {
      if (seen.has(row.area)) continue
      seen.add(row.area)
      out.push({ area: row.area, count: row.count, hot: true })
    }
    return out
  }, [hotBranches, countByArea, areaCounts])

  const liveTotal = meetups.filter((m) => m.status === 'open').length

  const showToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2600)
  }

  const openComposerForBranch = (branch: string) => {
    setGymId('247-fitness')
    setArea(branch)
    setFilterArea(branch)
    setComposer(true)
    setError(null)
  }

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/meetups', { cache: 'no-store' })
      const data = await res.json()
      setMeetups((data.meetups || []) as GymMeetup[])
      setJoins((data.joins || {}) as JoinsMap)
    } catch {
      setError('載入唔到開台板——稍後再試')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setHostName(loadMeetupDisplayName() || '')
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!selectedGym) return
    if (!selectedGym.areas.includes(area)) {
      setArea(selectedGym.areas[0] || '')
    }
  }, [gymId, selectedGym, area])

  const createMeetup = async () => {
    const name = hostName.trim()
    if (!name) {
      setError('寫低花名先至開台')
      return
    }
    if (!selectedGym || !area || !slotAt) {
      setError('揀齊健身房、分店、時段')
      return
    }
    saveMeetupDisplayName(name)
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/meetups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostName: name,
          gymId: selectedGym.id,
          gymName: selectedGym.nameZh,
          area,
          slotAt,
          focus,
          note: note.trim() || undefined,
          guestId: getMeetupGuestId(),
          userId: user?.id || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '開台失敗')
        return
      }
      setComposer(false)
      setNote('')
      setFilterArea(area)
      showToast('開咗台——等人入嚟凑')
      await refresh()
    } catch {
      setError('開台失敗，請再試')
    } finally {
      setBusy(false)
    }
  }

  const joinMeetup = async (m: GymMeetup) => {
    const name = hostName.trim() || loadMeetupDisplayName()
    if (!name) {
      setComposer(true)
      setError('寫低花名先至入台')
      return
    }
    saveMeetupDisplayName(name)
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/meetups/${m.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: name,
          guestId: getMeetupGuestId(),
          userId: user?.id || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '入台失敗')
        return
      }
      showToast(`已入台 · ${m.area} ${m.focus}`)
      await refresh()
    } catch {
      setError('入台失敗，請再試')
    } finally {
      setBusy(false)
    }
  }

  const renderMeetupList = (list: GymMeetup[]) => (
    <ul className="space-y-2.5">
      {list.map((m) => {
        const people = joins[m.id] || []
        return (
          <li key={m.id}>
            <motion.div
              layout
              whileTap={reduce ? undefined : { scale: 0.99 }}
              transition={springSnappy}
            >
              <Card className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <Badge tone="accent">{m.focus}</Badge>
                      <Badge tone="muted">{formatMeetupSlot(m.slot_at)}</Badge>
                    </div>
                    <div className="font-medium text-sm truncate">
                      {m.gym_name} · {m.area}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-muted">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">主理：{m.host_name}</span>
                    </div>
                    {m.note && (
                      <p className="mt-1.5 text-[12px] text-muted leading-relaxed">{m.note}</p>
                    )}
                    {people.length > 0 && (
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
                        <Users className="h-3 w-3" />
                        <span className="truncate">
                          {people.map((p) => p.display_name).join('、')}
                          {m.join_count > people.length ? ` 等 ${m.join_count} 人` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    <span className="text-[11px] tabular-nums text-muted">{m.join_count} 人</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => void joinMeetup(m)}
                    >
                      入台
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          </li>
        )
      })}
    </ul>
  )

  return (
    <div className={cn('space-y-3', className)}>
      <Card className="py-4">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div>
            <CardTitle className="text-lg leading-snug">開台凑局</CardTitle>
            <CardDesc className="mt-1">
              揀分店睇邊度有人開台——街坊凑埋練同一部位。
            </CardDesc>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => void refresh()}
              className="rounded-full p-2 border border-border text-muted hover:text-foreground touch-manipulation"
              aria-label="刷新"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            </button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setComposer((v) => !v)
                setError(null)
              }}
              className="gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              {composer ? '收埋' : '開台'}
            </Button>
          </div>
        </div>

        {/* 現場感：分店 chips */}
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between gap-2 px-0.5">
            <div className="flex items-center gap-1 text-[11px] font-medium text-muted">
              <Flame className="h-3 w-3 text-accent" />
              會所現場
              {liveTotal > 0 && (
                <span className="tabular-nums text-accent">· {liveTotal} 台開緊</span>
              )}
            </div>
            {filterArea && (
              <button
                type="button"
                className="text-[11px] text-accent touch-manipulation"
                onClick={() => setFilterArea(null)}
              >
                睇全部
              </button>
            )}
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            <button
              type="button"
              onClick={() => setFilterArea(null)}
              className={cn(
                'shrink-0 rounded-full px-3 py-1.5 text-[11px] border touch-manipulation',
                filterArea === null
                  ? 'border-accent bg-accent-soft text-accent font-semibold'
                  : 'border-border text-muted hover:text-foreground'
              )}
            >
              全部{liveTotal > 0 ? ` ${liveTotal}` : ''}
            </button>
            {branchChips.map((chip) => (
              <button
                key={chip.area}
                type="button"
                onClick={() => setFilterArea(chip.area)}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1.5 text-[11px] border touch-manipulation inline-flex items-center gap-1',
                  filterArea === chip.area
                    ? 'border-accent bg-accent-soft text-accent font-semibold'
                    : chip.hot
                      ? 'border-accent/40 text-foreground hover:border-accent hover:bg-accent-soft/50'
                      : 'border-border text-muted hover:text-foreground'
                )}
              >
                {chip.area}
                {chip.count > 0 && (
                  <span className="tabular-nums text-accent font-semibold">{chip.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence initial={false}>
          {composer && (
            <motion.div
              key="composer"
              initial={reduce ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={reduce ? undefined : { opacity: 0, height: 0 }}
              transition={springSoft}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-3 rounded-2xl border border-border bg-background p-3.5">
                <div>
                  <label className="text-[11px] text-muted mb-1 block">花名（傾偈都可以匿名）</label>
                  <Input
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value.slice(0, 24))}
                    placeholder="例如：小西灣阿強"
                    maxLength={24}
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted mb-1.5 block">健身房</label>
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                    {gyms.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setGymId(g.id)}
                        className={cn(
                          'shrink-0 rounded-full px-3 py-1.5 text-xs border touch-manipulation',
                          gymId === g.id
                            ? 'border-accent bg-accent-soft text-accent font-semibold'
                            : 'border-border text-muted hover:text-foreground'
                        )}
                      >
                        {g.nameZh}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-muted mb-1.5 block">分店／地區</label>
                  <div className="flex gap-1.5 flex-wrap max-h-28 overflow-y-auto">
                    {(selectedGym?.areas || []).slice(0, 40).map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setArea(a)}
                        className={cn(
                          'rounded-full px-2.5 py-1 text-[11px] border touch-manipulation',
                          area === a
                            ? 'border-accent bg-accent-soft text-accent'
                            : 'border-border text-muted hover:text-foreground'
                        )}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-muted mb-1.5 block">時段</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {presets.map((p) => (
                      <button
                        key={p.iso}
                        type="button"
                        onClick={() => setSlotAt(p.iso)}
                        className={cn(
                          'rounded-full px-2.5 py-1 text-[11px] border touch-manipulation',
                          slotAt === p.iso
                            ? 'border-accent bg-accent-soft text-accent'
                            : 'border-border text-muted hover:text-foreground'
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-muted mb-1.5 block">想練</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {MEETUP_FOCUSES.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFocus(f)}
                        className={cn(
                          'rounded-full px-2.5 py-1 text-[11px] border touch-manipulation',
                          focus === f
                            ? 'border-accent bg-accent-soft text-accent'
                            : 'border-border text-muted hover:text-foreground'
                        )}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-muted mb-1 block">備註（可選）</label>
                  <Input
                    value={note}
                    onChange={(e) => setNote(e.target.value.slice(0, 120))}
                    placeholder="例如：新手友好／等一個人 spotting"
                    maxLength={120}
                  />
                </div>
                <Button type="button" onClick={() => void createMeetup()} disabled={busy} className="w-full">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : '確認開台'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
      </Card>

      {loading && meetups.length === 0 ? (
        <Card className="py-8 flex items-center justify-center text-muted text-sm gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          載入開台板…
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="py-5">
          <div className="text-center mb-4 px-1">
            <div
              className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft text-lg"
              aria-hidden
            >
              🤝
            </div>
            <h3 className="font-serif text-lg tracking-tight">
              {filterArea ? `呢間而家未有人開台—你開先？` : '而家未有人開台'}
            </h3>
            <p className="mt-2 mx-auto max-w-sm text-sm text-muted leading-relaxed">
              {filterArea
                ? `${filterArea} 暫時冇開緊嘅台。你寫低時段，街坊就睇到入嚟凑。`
                : '你做第一個——撳下面熱門分店，寫低時段等人凑同一部位。'}
            </p>
          </div>
          {!filterArea && (
            <>
              <div className="mb-1.5 px-0.5 text-[11px] font-medium text-muted">附近／熱門 247 分店</div>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {hotBranches.map((branch) => (
                  <button
                    key={branch}
                    type="button"
                    onClick={() => openComposerForBranch(branch)}
                    className="rounded-full px-3 py-1.5 text-[11px] border border-border text-foreground hover:border-accent hover:bg-accent-soft hover:text-accent touch-manipulation transition"
                  >
                    {branch}
                  </button>
                ))}
              </div>
            </>
          )}
          <Button
            type="button"
            className="w-full"
            onClick={() => {
              if (filterArea) {
                openComposerForBranch(filterArea)
              } else {
                setComposer(true)
                setError(null)
              }
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            {filterArea ? `喺${filterArea}開台` : '我開台'}
          </Button>
        </Card>
      ) : (
        renderMeetupList(filtered)
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="above-nav-gap fixed left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#0f766e] text-white text-sm px-4 py-2 shadow-lg"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
