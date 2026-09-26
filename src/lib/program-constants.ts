/** Konstanta program pembangunan (aman untuk komponen klien). */

export const PROGRAM_STATUSES = ["direncanakan", "berjalan", "selesai", "ditunda"] as const;
export type ProgramStatus = (typeof PROGRAM_STATUSES)[number];

export const PROGRAM_STATUS_LABELS: Record<ProgramStatus, string> = {
  direncanakan: "Direncanakan",
  berjalan: "Berjalan",
  selesai: "Selesai",
  ditunda: "Ditunda",
};

export const PROGRAM_KATEGORI = ["fisik", "non-fisik", "pemberdayaan"] as const;
export type ProgramKategori = (typeof PROGRAM_KATEGORI)[number];

export const PROGRAM_KATEGORI_LABELS: Record<ProgramKategori, string> = {
  fisik: "Fisik",
  "non-fisik": "Non-Fisik",
  pemberdayaan: "Pemberdayaan",
};

export const PROGRAM_STATUS_BADGE_STYLES: Record<ProgramStatus, string> = {
  direncanakan: "bg-slate-100 text-slate-700 ring-slate-200",
  berjalan: "bg-sky-50 text-sky-700 ring-sky-200",
  selesai: "bg-village-50 text-village-700 ring-village-200",
  ditunda: "bg-amber-50 text-amber-700 ring-amber-200",
};

/** Warna progress bar sesuai tahapan pekerjaan. */
export function progressTone(persen: number): string {
  if (persen >= 100) return "bg-village-600";
  if (persen >= 60) return "bg-sky-500";
  if (persen >= 30) return "bg-amber-500";
  return "bg-rose-500";
}