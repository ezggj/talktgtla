import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('rounded-2xl bg-border/55 skeleton-pulse', className)}
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
    <div className={cn('mx-auto space-y-4 pt-2', wide ? 'max-w-2xl' : 'max-w-lg')}>
      <Skeleton className="h-3 w-16 rounded-full" />
      <Skeleton className="h-9 w-48 rounded-2xl" />
      <Skeleton className="h-4 w-72 max-w-full rounded-xl" />
      <div className="pt-2 space-y-3">
        <Skeleton className="h-28 rounded-[20px]" />
        <Skeleton className="h-40 rounded-[20px] opacity-80" />
        <Skeleton className="h-24 rounded-[20px] opacity-60" />
      </div>
    </div>
  )
}
