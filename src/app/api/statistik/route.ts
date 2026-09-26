import { NextResponse } from "next/server";
import { getDesaStatistics } from "@/lib/data/statistics";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * GET /api/statistik?tahun=2026
 *
 * Agregasi statistik capaian desa (aspirasi, pembangunan, anggaran, warga).
 * Data ini bersifat publik (transparansi desa), sehingga tidak memerlukan
 * autentikasi — namun hanya angka agregat yang dibuka, bukan data pribadi.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tahunParam = url.searchParams.get("tahun");
  const tahunBerjalan = new Date().getFullYear();

  let tahun = tahunBerjalan;
  if (tahunParam !== null) {
    const parsed = Number(tahunParam);
    if (!Number.isInteger(parsed) || parsed < 2000 || parsed > 2100) {
      return NextResponse.json(
        { error: "Parameter tahun tidak valid. Gunakan tahun antara 2000 dan 2100." },
        { status: 400 },
      );
    }
    tahun = parsed;
  }

  try {
    const stats = await getDesaStatistics(tahun);
    return NextResponse.json(
      { data: stats, configured: isSupabaseConfigured() },
      {
        status: 200,
        // Statistik dapat berubah kapan saja dari input admin; jangan di-cache lama.
        headers: { "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=60" },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Gagal menghitung statistik desa. Coba lagi." },
      { status: 500 },
    );
  }
}