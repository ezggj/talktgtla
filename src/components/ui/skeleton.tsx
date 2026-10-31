import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-border/45 skeleton-shimmer',
        className
      )}
      aria-hidden
    />
  )
}

export function PageSkeleton({
  wide = false,
}: {
  wide?: boolean
}) {
  return (
    <div
      className={cn('mx-auto space-y-3.5 pt-2 page-skeleton-in', wide ? 'max-w-2xl' : 'max-w-lg')}
      aria-busy="true"
      aria-label="載入中"
    >
      <Skeleton className="h-2.5 w-14 rounded-full" />
      <Skeleton className="h-8 w-40 rounded-2xl" />
      <Skeleton className="h-3.5 w-56 max-w-full rounded-xl opacity-80" />
      <div className="pt-1.5 space-y-3">
        <Skeleton className="h-14 rounded-2xl" />
        <Skeleton className="h-32 rounded-[20px]" />
        <Skeleton className="h-24 rounded-[20px] opacity-75" />
        <Skeleton className="h-20 rounded-[20px] opacity-55" />
      </div>
    </div>
  )
}
