/** Blok skeleton dengan animasi pulse untuk state pemuatan. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} aria-hidden="true" />;
}

/** Skeleton kartu metrik (label, nilai, hint, ikon). */
export function MetricCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-32" />
        </div>
        <Skeleton className="h-11 w-11 rounded-xl" />
      </div>
      <Skeleton className="mt-3 h-3 w-40" />
    </div>
  );
}

/** Skeleton grid metrik untuk halaman dashboard & beranda. */
export function MetricsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, index) => (
        <MetricCardSkeleton key={index} />
      ))}
      <span className="sr-only">Memuat ringkasan statistik desa...</span>
    </div>
  );
}