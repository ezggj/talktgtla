'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2,
  Clock,
  ExternalLink,
  MapPin,
  Scale,
  Search,
  X,
} from 'lucide-react'
import { Card, CardDesc, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { springSnappy } from '@/components/motion/presets'
import { cn } from '@/lib/utils'
import {
  DEFAULT_GYM_FILTERS,
  EQUIPMENT_FOCUS,
  filterGyms,
  formatGymAreas,
  formatMonthlyRange,
  gymById,
  PRICE_BAND_HINT,
  PRICE_BAND_LABEL,
  REGION_OPTIONS,
  type GymFilters,
  type GymPriceBand,
  type GymRegion,
  type HkGym,
  type EquipmentFocusId,
} from '@/lib/fitness/hk-gyms'

const MAX_COMPARE = 3

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium border transition-colors touch-manipulation',
        active
          ? 'bg-accent text-white border-accent shadow-soft'
          : 'bg-surface text-muted border-border hover:text-foreground hover:bg-[#f5f5f4]'
      )}
    >
      {children}
    </button>
  )
}

function GymCard({
  gym,
  selected,
  onToggle,
  disabled,
}: {
  gym: HkGym
  selected: boolean
  onToggle: () => void
  disabled?: boolean
}) {
  return (
    <motion.div layout transition={springSnappy}>
      <Card
        className={cn(
          'py-4 transition-shadow',
          selected && 'ring-2 ring-accent/40 border-accent/30 shadow-soft'
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <CardTitle className="text-base">{gym.nameZh}</CardTitle>
              {gym.featured && <Badge tone="accent">旗艦</Badge>}
              {gym.is24h && <Badge tone="accent">24 小時</Badge>}
              <Badge tone="muted">{PRICE_BAND_LABEL[gym.priceBand]}</Badge>
            </div>
            <p className="text-[11px] text-muted">{gym.name}</p>
            {gym.branchNote && (
              <p className="mt-1 text-[11px] font-medium text-accent/90">{gym.branchNote}</p>
            )}
          </div>
          <Button
            size="sm"
            variant={selected ? 'default' : 'secondary'}
            disabled={!selected && disabled}
            onClick={onToggle}
            className="shrink-0"
            title={!selected && disabled ? `最多對比 ${MAX_COMPARE} 間` : undefined}
          >
            {selected ? '已揀' : disabled ? '滿咗' : '對比'}
          </Button>
        </div>

        <div className="mt-3 space-y-2 text-[12px] leading-relaxed">
          <div className="flex gap-2 text-muted">
            <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-accent" />
            <span>{formatGymAreas(gym, 8)}</span>
          </div>
          <div className="flex gap-2">
            <Scale className="h-3.5 w-3.5 shrink-0 mt-0.5 text-accent" />
            <span>
              <span className="font-medium tabular-nums text-foreground">
                {formatMonthlyRange(gym)}
              </span>
              <span className="text-muted"> · 大約／參考</span>
            </span>
          </div>
          <div className="flex gap-2 text-muted">
            <Building2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-accent" />
            <span>{gym.equipment}</span>
          </div>
          <p className="text-muted pl-5">{gym.vibe}</p>
        </div>

        {gym.link && (
          <a
            href={gym.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
          >
            官網睇下
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </Card>
    </motion.div>
  )
}

function CompareTable({ gyms, onRemove }: { gyms: HkGym[]; onRemove: (id: string) => void }) {
  if (gyms.length === 0) return null

  const rows: { label: string; cell: (g: HkGym) => React.ReactNode }[] = [
    {
      label: '月費（大約／參考）',
      cell: (g) => (
        <span className="tabular-nums font-medium">{formatMonthlyRange(g)}</span>
      ),
    },
    {
      label: '價位',
      cell: (g) => PRICE_BAND_LABEL[g.priceBand],
    },
    {
      label: '24 小時',
      cell: (g) => (g.is24h ? '✓ 有' : '× 冇'),
    },
    {
      label: '地區',
      cell: (g) => formatGymAreas(g, 4),
    },
    {
      label: '分店',
      cell: (g) => g.branchNote ?? '—',
    },
    {
      label: '器材',
      cell: (g) => g.equipment,
    },
    {
      label: '氣氛',
      cell: (g) => g.vibe,
    },
  ]

  return (
    <Card className="py-4 overflow-hidden">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-accent" />
          <CardTitle className="text-lg">並排睇下</CardTitle>
          <Badge tone="muted">
            {gyms.length}/{MAX_COMPARE}
          </Badge>
        </div>
        <Button size="sm" variant="ghost" onClick={() => gyms.forEach((g) => onRemove(g.id))}>
          清空
        </Button>
      </div>

      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full min-w-[280px] text-left border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 bg-surface z-[1] p-2 text-[10px] text-muted font-medium w-20">
                項目
              </th>
              {gyms.map((g) => (
                <th key={g.id} className="p-2 align-bottom min-w-[120px]">
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-sm font-medium leading-snug">{g.nameZh}</span>
                    <button
                      type="button"
                      aria-label={`移除 ${g.nameZh}`}
                      onClick={() => onRemove(g.id)}
                      className="shrink-0 rounded-lg p-1 text-muted hover:bg-black/[0.04] hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {g.is24h && (
                    <Badge tone="accent" className="mt-1">
                      24h
                    </Badge>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-border/80">
                <th className="sticky left-0 bg-surface z-[1] p-2 text-[10px] text-muted font-medium align-top">
                  {row.label}
                </th>
                {gyms.map((g) => (
                  <td
                    key={g.id}
                    className="p-2 text-[11px] text-foreground/90 leading-relaxed align-top"
                  >
                    {row.cell(g)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {gyms.length === 1 && (
        <p className="mt-3 text-[11px] text-muted">再揀多 1–2 間，並排會清楚啲。</p>
      )}
    </Card>
  )
}

export function HkGymCompare() {
  const [filters, setFilters] = useState<GymFilters>(DEFAULT_GYM_FILTERS)
  const [selected, setSelected] = useState<string[]>([])

  const filtered = useMemo(() => filterGyms(filters), [filters])
  const compareResolved = useMemo(
    () => selected.map((id) => gymById(id)).filter((g): g is HkGym => !!g),
    [selected]
  )

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= MAX_COMPARE) return prev
      return [...prev, id]
    })
  }

  const setRegion = (r: GymRegion | '全部') => setFilters((f) => ({ ...f, region: r }))
  const setPrice = (p: GymPriceBand | '全部') => setFilters((f) => ({ ...f, priceBand: p }))
  const setEquip = (e: EquipmentFocusId | '全部') => setFilters((f) => ({ ...f, equipment: e }))

  const scrollToCompare = () => {
    document.getElementById('gym-compare-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="space-y-5">
      <Card className="py-4">
        <div className="flex items-center gap-2 mb-1">
          <Search className="h-4 w-4 text-accent" />
          <CardTitle className="text-lg">先篩一篩</CardTitle>
        </div>
        <CardDesc className="text-[12px] mb-3">
          月費係大約區間——簽約前同會所確認，呢度淨係幫你收窄選擇。
        </CardDesc>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
          <Input
            className="pl-9"
            placeholder="搜名、地區、氣氛…"
            value={filters.query}
            onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
          />
        </div>

        <div className="space-y-2.5">
          <div>
            <div className="text-[10px] text-muted mb-1.5 tracking-wider">地區</div>
            <div className="flex flex-wrap gap-1.5">
              <Chip active={filters.region === '全部'} onClick={() => setRegion('全部')}>
                全部
              </Chip>
              {REGION_OPTIONS.map((r) => (
                <Chip key={r} active={filters.region === r} onClick={() => setRegion(r)}>
                  {r}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] text-muted mb-1.5 tracking-wider">價錢區間</div>
            <div className="flex flex-wrap gap-1.5">
              <Chip active={filters.priceBand === '全部'} onClick={() => setPrice('全部')}>
                全部
              </Chip>
              {(['budget', 'mid', 'premium'] as GymPriceBand[]).map((p) => (
                <Chip key={p} active={filters.priceBand === p} onClick={() => setPrice(p)}>
                  {PRICE_BAND_LABEL[p]}
                  <span className="opacity-70 ml-1 hidden sm:inline">{PRICE_BAND_HINT[p]}</span>
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] text-muted mb-1.5 tracking-wider">器材重點</div>
            <div className="flex flex-wrap gap-1.5">
              <Chip active={filters.equipment === '全部'} onClick={() => setEquip('全部')}>
                全部
              </Chip>
              {EQUIPMENT_FOCUS.map((e) => (
                <Chip
                  key={e.id}
                  active={filters.equipment === e.id}
                  onClick={() => setEquip(e.id)}
                >
                  {e.label}
                </Chip>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Chip
              active={filters.only24h}
              onClick={() => setFilters((f) => ({ ...f, only24h: !f.only24h }))}
            >
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                只要 24 小時
              </span>
            </Chip>
            {(filters.region !== '全部' ||
              filters.priceBand !== '全部' ||
              filters.equipment !== '全部' ||
              filters.only24h ||
              filters.query) && (
              <Button size="sm" variant="ghost" onClick={() => setFilters(DEFAULT_GYM_FILTERS)}>
                重設
              </Button>
            )}
          </div>
        </div>
      </Card>

      <div id="gym-compare-panel">
        <AnimatePresence mode="popLayout">
          {compareResolved.length > 0 && (
            <motion.div
              key="compare"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={springSnappy}
            >
              <CompareTable
                gyms={compareResolved}
                onRemove={(id) => setSelected((s) => s.filter((x) => x !== id))}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted">
          {filtered.length} 間 · 最多對比 {MAX_COMPARE} 間
        </p>
        {selected.length > 0 && (
          <p className="text-[11px] text-accent font-medium">已揀 {selected.length}</p>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          compact
          emoji="🏋️"
          title="冇夾到"
          description="放寬地區或者價錢再試；又或者清晒篩選。"
          actionLabel="重設篩選"
          onAction={() => setFilters(DEFAULT_GYM_FILTERS)}
        />
      ) : (
        <div className="space-y-3">
          {filtered.some((g) => g.featured) &&
            filters.region === '全部' &&
            filters.priceBand === '全部' &&
            filters.equipment === '全部' &&
            !filters.only24h &&
            !filters.query.trim() && (
              <p className="text-[11px] text-muted px-0.5">
                置頂：<span className="text-foreground font-medium">247 Fitness</span>
                （140+ 分店 · 12個月約 $550）同{' '}
                <span className="text-foreground font-medium">EFX24</span>
                （12個月約 $538）——再向下睇其他選擇。
              </p>
            )}
          {filtered.map((g) => (
            <GymCard
              key={g.id}
              gym={g}
              selected={selected.includes(g.id)}
              disabled={selected.length >= MAX_COMPARE}
              onToggle={() => toggle(g.id)}
            />
          ))}
        </div>
      )}

      {selected.length > 0 ? <div className="h-16 md:hidden" aria-hidden /> : null}

      <p className="text-[10px] text-muted text-center leading-relaxed px-2 pb-2">
        月費、分店同開放時間會變——呢度係靜態整理（對齊公開官網／消委會等大約數），僅供參考，唔構成報價或建議。簽約前請向會所確認最新條款、按金同隱藏收費。
      </p>

      <AnimatePresence>
        {selected.length > 0 && (
          <motion.div
            className="fixed above-nav-gap inset-x-0 z-30 px-4 pointer-events-none md:hidden"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={springSnappy}
          >
            <button
              type="button"
              onClick={scrollToCompare}
              className="pointer-events-auto mx-auto flex max-w-lg w-full items-center justify-between gap-3 rounded-2xl border border-border bg-foreground text-background px-4 py-3 text-sm shadow-hover touch-manipulation"
            >
              <span className="font-medium">
                已揀 {selected.length} 間 · 睇並排
              </span>
              <Scale className="h-4 w-4 shrink-0 opacity-80" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
