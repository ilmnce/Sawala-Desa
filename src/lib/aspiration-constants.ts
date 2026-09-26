/**
 * Konstanta aspirasi yang aman diimpor oleh komponen klien.
 * Dipisah dari `data/aspirations.ts` (modul server) agar bundel klien tidak
 * ikut menarik dependensi server-only seperti `next/headers`.
 */

export const ASPIRATION_CATEGORIES = [
  "infrastruktur",
  "pertanian",
  "kesehatan",
  "pendidikan",
  "ekonomi",
  "lingkungan",
  "sosial",
  "umum",
] as const;

export type AspirationCategory = (typeof ASPIRATION_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<string, string> = {
  infrastruktur: "Infrastruktur",
  pertanian: "Pertanian",
  kesehatan: "Kesehatan",
  pendidikan: "Pendidikan",
  ekonomi: "Ekonomi & UMKM",
  lingkungan: "Lingkungan",
  sosial: "Sosial",
  umum: "Umum",
};

export const ASPIRATION_STATUS_LABELS: Record<string, string> = {
  menunggu: "Menunggu",
  ditinjau: "Ditinjau",
  prioritas: "Prioritas Musdes",
  ditolak: "Ditolak",
  terealisasi: "Terealisasi",
};