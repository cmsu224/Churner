// Skeleton loaders shown while Gist data is loading.
export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-raised rounded-lg ${className}`} aria-hidden="true" />
}

// A page-level skeleton: header bar + a few panel blocks.
export function PageSkeleton() {
  return (
    <div className="p-4 max-w-5xl mx-auto space-y-4" role="status" aria-label="Loading data">
      <Skeleton className="h-7 w-40" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-40" />
      <Skeleton className="h-24" />
    </div>
  )
}
