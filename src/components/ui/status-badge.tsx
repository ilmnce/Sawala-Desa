const styles: Record<string, string> = {
  menunggu: "bg-amber-50 text-amber-700 ring-amber-200",
  ditinjau: "bg-sky-50 text-sky-700 ring-sky-200",
  prioritas: "bg-violet-50 text-violet-700 ring-violet-200",
  ditolak: "bg-rose-50 text-rose-700 ring-rose-200",
  terealisasi: "bg-village-50 text-village-700 ring-village-200",
  diajukan: "bg-amber-50 text-amber-700 ring-amber-200",
  diproses: "bg-sky-50 text-sky-700 ring-sky-200",
  disetujui: "bg-village-50 text-village-700 ring-village-200",
  selesai: "bg-village-50 text-village-700 ring-village-200",
};

const labels: Record<string, string> = {
  menunggu: "Menunggu",
  ditinjau: "Ditinjau",
  prioritas: "Prioritas Musdes",
  ditolak: "Ditolak",
  terealisasi: "Terealisasi",
  diajukan: "Diajukan",
  diproses: "Diproses",
  disetujui: "Disetujui",
  selesai: "Selesai",
};

/** Badge status dengan label Bahasa Indonesia. */
export function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase();
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
        styles[key] ?? "bg-slate-100 text-slate-600 ring-slate-200"
      }`}
    >
      {labels[key] ?? status}
    </span>
  );
}