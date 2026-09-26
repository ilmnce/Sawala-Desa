/** Utilitas format angka & mata uang untuk tampilan. */

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const compact = new Intl.NumberFormat("id-ID", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Format penuh, mis. "Rp1.250.000". */
export function formatRupiah(value: number): string {
  return rupiah.format(Number.isFinite(value) ? value : 0);
}

/** Format ringkas untuk card, mis. "Rp1,2 jt". */
export function formatRupiahRingkas(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "Rp0";
  if (value >= 1_000_000_000) return `Rp${compact.format(value / 1_000_000_000)} miliar`;
  if (value >= 1_000_000) return `Rp${compact.format(value / 1_000_000)} jt`;
  if (value >= 1_000) return `Rp${compact.format(value / 1_000)} rb`;
  return formatRupiah(value);
}

/** Format tanggal Indonesia, mis. "5 Januari 2026". */
export function formatTanggal(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

/** Format angka ribuan biasa. */
export function formatAngka(value: number): string {
  return new Intl.NumberFormat("id-ID").format(Number.isFinite(value) ? value : 0);
}