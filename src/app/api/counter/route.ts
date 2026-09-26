import { NextResponse } from "next/server";
import { getAdminCounters, getUserCounters } from "@/lib/data/counters";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * GET /api/counter
 *
 * Counter badge status aktif untuk pengguna yang sedang login.
 * - Warga menerima counter berkas miliknya sendiri (difilter user_id di server).
 * - Admin menerima counter antrean kerja desa.
 *
 * Nilai selalu dihitung dari sesi server, sehingga tidak dapat diminta untuk
 * pengguna lain.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Anda belum masuk atau sesi berakhir." },
      { status: 401 },
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ data: null, configured: false }, { status: 200 });
  }

  try {
    if (user.role === "admin") {
      const data = await getAdminCounters();
      return NextResponse.json(
        { data: { role: "admin", ...data }, configured: true },
        { status: 200, headers: { "Cache-Control": "no-store, private" } },
      );
    }

    const data = await getUserCounters(user);
    return NextResponse.json(
      { data: { role: "warga", ...data }, configured: true },
      { status: 200, headers: { "Cache-Control": "no-store, private" } },
    );
  } catch {
    return NextResponse.json({ error: "Gagal menghitung counter. Coba lagi." }, { status: 500 });
  }
}