import { getDesaStatistics } from "./statistics";
import type { DashboardMetrics } from "../types";

/**
 * Metrik ringkas untuk beranda & dashboard.
 * Diturunkan dari agregasi statistik desa yang sama dengan /api/statistik,
 * sehingga angka di seluruh aplikasi selalu konsisten.
 */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const stats = await getDesaStatistics();

  return {
    aspirasiAktif: stats.aspirasi.aktif,
    proyekBerjalan: stats.pembangunan.berjalan,
    rataProgress: stats.pembangunan.rataProgress,
    anggaranTahunIni: stats.anggaran.belanja,
    realisasiAnggaran: stats.anggaran.realisasi,
    totalWarga: stats.warga.total,
  };
}