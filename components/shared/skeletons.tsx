import { Skeleton } from '@/components/ui/skeleton'

export function KpiCardSkeleton() {
  return (
    <div className="glass-card p-5 space-y-3">
      <Skeleton className="h-3 w-24 bg-black/10" />
      <Skeleton className="h-8 w-32 bg-black/10" />
      <Skeleton className="h-3 w-20 bg-black/10" />
    </div>
  )
}

export function TableRowSkeleton({ cols = 6 }: { cols?: number }) {
  return (
    <tr className="border-b border-black/10">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full bg-black/10" />
        </td>
      ))}
    </tr>
  )
}

export function CardSkeleton() {
  return (
    <div className="glass-card p-6 space-y-4">
      <Skeleton className="h-5 w-40 bg-black/10" />
      <Skeleton className="h-4 w-full bg-black/10" />
      <Skeleton className="h-4 w-3/4 bg-black/10" />
      <Skeleton className="h-4 w-1/2 bg-black/10" />
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
      </div>
      <div className="glass-card p-6">
        <Skeleton className="h-6 w-40 bg-black/10 mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full bg-black/10" />
          ))}
        </div>
      </div>
    </div>
  )
}
