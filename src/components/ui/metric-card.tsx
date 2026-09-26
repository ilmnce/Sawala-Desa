import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "village" | "amber" | "sky" | "rose";
}

const toneStyles: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  village: "bg-village-50 text-village-700",
  amber: "bg-amber-50 text-amber-700",
  sky: "bg-sky-50 text-sky-700",
  rose: "bg-rose-50 text-rose-700",
};

/** Card ringkasan satu metrik statistik desa. */
export function MetricCard({ label, value, hint, icon: Icon, tone = "village" }: MetricCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 truncate font-[var(--font-lora)] text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
        </div>
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${toneStyles[tone]}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      {hint ? <p className="mt-3 text-xs leading-5 text-slate-500">{hint}</p> : null}
    </article>
  );
}