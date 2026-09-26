export const BUDGET_JENIS = ["pendapatan", "belanja", "realisasi"] as const;
export type BudgetJenis = (typeof BUDGET_JENIS)[number];

export const BUDGET_JENIS_LABELS: Record<BudgetJenis, string> = {
  pendapatan: "Pendapatan",
  belanja: "Belanja (Rencana)",
  realisasi: "Realisasi (Pembelanjaan)",
};

export const BUDGET_JENIS_STYLES: Record<BudgetJenis, string> = {
  pendapatan: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  belanja: "bg-sky-50 text-sky-700 ring-sky-200",
  realisasi: "bg-village-50 text-village-700 ring-village-200",
};

export const BUDGET_KATEGORI = [
  "umum",
  "infrastruktur",
  "pendidikan",
  "kesehatan",
  "pemberdayaan",
  "bantuan-sosial",
  "operasional",
] as const;
export type BudgetKategori = (typeof BUDGET_KATEGORI)[number];

export const BUDGET_KATEGORI_LABELS: Record<BudgetKategori, string> = {
  umum: "Lain-lain / Umum",
  infrastruktur: "Infrastruktur Fisik",
  pendidikan: "Pendidikan & PAUD",
  kesehatan: "Kesehatan & Posyandu",
  pemberdayaan: "Pemberdayaan Warga",
  "bantuan-sosial": "Bantuan Sosial (BLT)",
  operasional: "Operasional Desa",
};