import { createClient } from "../supabase/server";
import { isSupabaseConfigured } from "../supabase/env";

export interface DesaStatistics {
  tahun: number;
  aspirasi: {
    total: number;
    aktif: number;
    prioritas: number;
    terealisasi: number;
    totalDukungan: number;
  };
  pembangunan: {
    total: number;
    berjalan: number;
    selesai: number;
    rataProgress: number;
    totalAnggaranProgram: number;
  };
  anggaran: {
    pendapatan: number;
    belanja: number;
    realisasi: number;
    persenRealisasi: number;
    sisaAlokasi: number;
  };
  warga: {
    total: number;
    aktif: number;
  };
}

const EMPTY: DesaStatistics = {
  tahun: new Date().getFullYear(),
  aspirasi: { total: 0, aktif: 0, prioritas: 0, terealisasi: 0, totalDukungan: 0 },
  pembangunan: { total: 0, berjalan: 0, selesai: 0, rataProgress: 0, totalAnggaranProgram: 0 },
  anggaran: { pendapatan: 0, belanja: 0, realisasi: 0, persenRealisasi: 0, sisaAlokasi: 0 },
  warga: { total: 0, aktif: 0 },
};

const STATUS_AKTIF = ["menunggu", "ditinjau", "prioritas"];

/**
 * Agregasi statistik capaian desa dari seluruh modul inti.
 * Setiap blok dibungkus try/catch agar satu tabel yang belum dimigrasi tidak
 * menjatuhkan seluruh laporan.
 */
export async function getDesaStatistics(tahun = new Date().getFullYear()): Promise<DesaStatistics> {
  if (!isSupabaseConfigured()) return { ...EMPTY, tahun };

  const supabase = createClient();
  const stats: DesaStatistics = structuredClone({ ...EMPTY, tahun });

  // --- Aspirasi ---
  try {
    const { data } = await supabase.from("aspirations").select("id, status, prioritas");
    if (data) {
      stats.aspirasi.total = data.length;
      stats.aspirasi.aktif = data.filter((r) => STATUS_AKTIF.includes(String(r.status))).length;
      stats.aspirasi.prioritas = data.filter((r) => r.prioritas === true).length;
      stats.aspirasi.terealisasi = data.filter((r) => r.status === "terealisasi").length;
    }
  } catch {
    /* tabel belum tersedia */
  }

  try {
    const { count } = await supabase
      .from("aspiration_supports")
      .select("id", { count: "exact", head: true });
    stats.aspirasi.totalDukungan = count ?? 0;
  } catch {
    /* tabel belum tersedia */
  }

  // --- Pembangunan ---
  try {
    const { data } = await supabase
      .from("development_programs")
      .select("status, progress, anggaran");
    if (data) {
      stats.pembangunan.total = data.length;
      stats.pembangunan.berjalan = data.filter((r) => r.status === "berjalan").length;
      stats.pembangunan.selesai = data.filter((r) => r.status === "selesai").length;
      stats.pembangunan.totalAnggaranProgram = data.reduce(
        (sum, r) => sum + Number(r.anggaran ?? 0),
        0,
      );
      if (data.length > 0) {
        stats.pembangunan.rataProgress = Math.round(
          data.reduce((sum, r) => sum + Number(r.progress ?? 0), 0) / data.length,
        );
      }
    }
  } catch {
    /* tabel belum tersedia */
  }

  // --- Anggaran ---
  try {
    const { data } = await supabase
      .from("budgets")
      .select("jenis, jumlah")
      .eq("tahun", tahun);
    if (data) {
      stats.anggaran.pendapatan = data
        .filter((r) => r.jenis === "pendapatan")
        .reduce((s, r) => s + Number(r.jumlah ?? 0), 0);
      stats.anggaran.belanja = data
        .filter((r) => r.jenis === "belanja")
        .reduce((s, r) => s + Number(r.jumlah ?? 0), 0);
      stats.anggaran.realisasi = data
        .filter((r) => r.jenis === "realisasi")
        .reduce((s, r) => s + Number(r.jumlah ?? 0), 0);
      stats.anggaran.persenRealisasi =
        stats.anggaran.belanja > 0
          ? Math.round((stats.anggaran.realisasi / stats.anggaran.belanja) * 100)
          : 0;
      stats.anggaran.sisaAlokasi = Math.max(stats.anggaran.belanja - stats.anggaran.realisasi, 0);
    }
  } catch {
    /* tabel belum tersedia */
  }

  // --- Warga ---
  try {
    const { data } = await supabase.from("users").select("is_active").eq("role", "warga");
    if (data) {
      stats.warga.total = data.length;
      stats.warga.aktif = data.filter((r) => r.is_active !== false).length;
    }
  } catch {
    /* tabel belum tersedia */
  }

  return stats;
}