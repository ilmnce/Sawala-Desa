export const POTENTIAL_KATEGORI = [
  "umkm",
  "pertanian",
  "peternakan",
  "keahlian",
] as const;

export type PotentialKategori = (typeof POTENTIAL_KATEGORI)[number];

export const POTENTIAL_KATEGORI_LABELS: Record<PotentialKategori, string> = {
  umkm: "UMKM & Produk Olahan",
  pertanian: "Pertanian & Perkebunan",
  peternakan: "Peternakan & Perikanan",
  keahlian: "Jasa Keahlian Warga",
};