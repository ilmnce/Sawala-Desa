import { MetricsGridSkeleton, Skeleton } from "@/components/ui/skeleton";

/** Fallback saat data statistik dashboard sedang dimuat. */
export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-40 w-full rounded-3xl" />
      <section>
        <Skeleton className="mb-4 h-6 w-56" />
        <MetricsGridSkeleton count={4} />
      </section>
      <section>
        <Skeleton className="mb-4 h-6 w-40" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-2xl" />
          ))}
        </div>
      </section>
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}