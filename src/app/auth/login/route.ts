import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, nikToEmail } from "@/lib/supabase/env";
import { isValidNik } from "@/lib/validation";
import { mapUserRow } from "@/lib/user-mapper";

interface LoginBody {
  nik?: unknown;
  password?: unknown;
}

/**
 * Endpoint login berbasis NIK.
 *
 * Verifikasi kredensial dilakukan Supabase Auth terhadap hash bcrypt yang
 * tersimpan di `auth.users.encrypted_password`. Password plaintext tidak pernah
 * disimpan maupun di-log; ia hanya diteruskan sekali ke Supabase lalu dibuang.
 *
 * NIK 16 digit dipetakan ke email sintetis deterministik agar dapat memakai
 * alur email+password Supabase, tanpa mengubah skema hash.
 */
export async function POST(request: Request) {
  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: "Format permintaan tidak valid." }, { status: 400 });
  }

  const nik = typeof body.nik === "string" ? body.nik.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!isValidNik(nik)) {
    return NextResponse.json(
      { error: "NIK harus terdiri dari tepat 16 digit angka." },
      { status: 400 },
    );
  }

  if (password.length === 0) {
    return NextResponse.json({ error: "Password wajib diisi." }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Database belum dikonfigurasi pada server." },
      { status: 503 },
    );
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: nikToEmail(nik),
    password,
  });

  if (error || !data.user) {
    // Pesan generik demi keamanan: jangan bedakan NIK salah vs password salah.
    return NextResponse.json(
      { error: "NIK atau password salah." },
      { status: 401 },
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "Profil pengguna tidak ditemukan. Hubungi kantor desa." },
      { status: 403 },
    );
  }

  const mapped = mapUserRow(profile);

  if (!mapped.isActive) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "Akun Anda dinonaktifkan. Hubungi kantor desa." },
      { status: 403 },
    );
  }

  return NextResponse.json({
    user: {
      id: mapped.id,
      nik: mapped.nik,
      namaLengkap: mapped.namaLengkap,
      role: mapped.role,
    },
    redirectTo: mapped.role === "admin" ? "/admin" : "/dashboard",
  });
}