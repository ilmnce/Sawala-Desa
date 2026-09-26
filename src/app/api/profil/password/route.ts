import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, nikToEmail } from "@/lib/supabase/env";
import { getCurrentUser } from "@/lib/auth";
import { validasiGantiPassword } from "@/lib/password";

/**
 * PUT /api/profil/password
 * Mengganti password pengguna aktif.
 *
 * Alur: wajib punya sesi -> validasi input -> verifikasi password lama ke
 * Supabase Auth -> baru perbarui. Password tidak pernah di-log atau
 * dikembalikan dalam respons.
 */
export async function PUT(request: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json(
      { error: "Anda belum masuk atau sesi berakhir." },
      { status: 401 },
    );
  }

  let body: { password_lama?: unknown; password_baru?: unknown; konfirmasi?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Format permintaan tidak valid." }, { status: 400 });
  }

  const passwordLama = typeof body.password_lama === "string" ? body.password_lama : "";
  const passwordBaru = typeof body.password_baru === "string" ? body.password_baru : "";
  const konfirmasi = typeof body.konfirmasi === "string" ? body.konfirmasi : "";

  const { fieldErrors } = validasiGantiPassword({ passwordLama, passwordBaru, konfirmasi });
  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json(
      { error: "Periksa kembali data yang diisi.", fieldErrors },
      { status: 400 },
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database belum dikonfigurasi." }, { status: 503 });
  }

  const supabase = createClient();

  // Verifikasi password lama — mencegah penggantian kredensial pada sesi terbajak.
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: nikToEmail(current.nik),
    password: passwordLama,
  });

  if (verifyError) {
    return NextResponse.json(
      { error: "Password lama salah.", fieldErrors: { password_lama: "Password lama tidak cocok." } },
      { status: 401 },
    );
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: passwordBaru });
  if (updateError) {
    return NextResponse.json({ error: "Gagal mengganti password. Coba lagi." }, { status: 400 });
  }

  return NextResponse.json({ message: "Password berhasil diganti." }, { status: 200 });
}