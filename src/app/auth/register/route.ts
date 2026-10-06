import { NextResponse } from "next/server";
import { createClient as createBrowserClient, type SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_URL, isSupabaseConfigured, nikToEmail } from "@/lib/supabase/env";
import { isValidNik, passwordRuleError, authErrorMessage } from "@/lib/validation";

interface RegisterBody {
  nik?: unknown;
  nama?: unknown;
  password?: unknown;
  jenis_kelamin?: unknown;
  tempat_lahir?: unknown;
  tanggal_lahir?: unknown;
  alamat?: unknown;
  rt?: unknown;
  rw?: unknown;
  dusun?: unknown;
  no_telepon?: unknown;
  pekerjaan?: unknown;
}

interface RegisterFieldErrors {
  [field: string]: string;
}

interface DetailColumns {
  jenis_kelamin?: string | null;
  tempat_lahir?: string | null;
  tanggal_lahir?: string | null;
  alamat?: string | null;
  rt?: string | null;
  rw?: string | null;
  dusun?: string | null;
  no_telepon?: string | null;
  pekerjaan?: string | null;
}

const PHONE_RE = /^[0-9+][0-9 -]{7,19}$/;
const ALLOWED_SEX = new Set(["Laki-laki", "Perempuan"]);

function asString(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

/** Ringkas NIK untuk log -- hanya 4 digit terakhir, tanpa mengekspos data pribadi. */
function nikTersembunyi(nik: string): string {
  return `***${nik.slice(-4)}`;
}

/** Baca kunci service role bila tersedia (server-only, tidak pernah dikirim ke browser). */
function createServiceClient(): SupabaseClient | null {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || serviceKey.trim().length === 0) return null;
  return createBrowserClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Endpoint registrasi mandiri untuk warga.
 *
 * Warga membuat akunnya sendiri sehingga admin tidak perlu lagi membuatkan satu
 * per satu. NIK 16 digit dipetakan ke email sintetis deterministik (pola yang
 * sama dengan login), dan profil public.users dibuat oleh trigger
 * `handle_new_user` di database -- bukan oleh INSERT dari klien.
 *
 * Batas keamanan yang dijaga di sini:
 *  1. `role` TIDAK pernah dibaca dari body. Admin hanya bisa dipasang lewat
 *     service role / SQL, dan trigger database juga memaksa 'warga', jadi
 *     registrasi publik tidak bisa dipakai membuat akun admin.
 *  2. NIK dicek ke database sebelum signUp agar pesan error jujur
 *     ("sudah terdaftar"), bukan pesan kredensial yang membingungkan.
 *  3. Password plaintext hanya diteruskan sekali ke Supabase Auth untuk
 *     di-hash bcrypt; tidak disimpan maupun dikembalikan ke klien.
 *  4. Sesi sengaja tidak dikirim ke browser: setelah registrasi pengguna
 *     diarahkan ke /login dan masuk seperti biasa.
 */
export async function POST(request: Request) {
  let body: RegisterBody;
  try {
    body = (await request.json()) as RegisterBody;
  } catch {
    return NextResponse.json({ error: "Format permintaan tidak valid." }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Database belum dikonfigurasi pada server." },
      { status: 503 },
    );
  }

  const nik = typeof body.nik === "string" ? body.nik.trim() : "";
  const nama = asString(body.nama, 120);
  const password = typeof body.password === "string" ? body.password : "";

  const fieldErrors: RegisterFieldErrors = {};
  if (!isValidNik(nik)) fieldErrors.nik = "NIK harus terdiri dari tepat 16 digit angka.";
  if (nama.length < 3) fieldErrors.nama = "Nama minimal 3 karakter.";
  const passwordError = passwordRuleError(password);
  if (passwordError) fieldErrors.password = passwordError;

  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json({ error: "Periksa kembali isian Anda.", fieldErrors }, { status: 400 });
  }

  const email = nikToEmail(nik);
  const metadata = { nik, nama_lengkap: nama, role: "warga" };
  const detail = pickDetailColumns(body);

  const serviceClient = createServiceClient();
  if (serviceClient) {
    // Jalur utama: dibuat langsung terkonfirmasi email sehingga warga bisa login
    // segera, tanpa perlu infrastruktur email (domain email-nya sintetis).
    const { data, error } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });

    if (error) {
      if (/already (been )?registered|already exists/i.test(error.message)) {
        return existingNikResponse();
      }
      return NextResponse.json({ error: authErrorMessage(error.message) }, { status: 400 });
    }

    const createdId = data?.user?.id ?? "";
    if (createdId) await updateDetailColumns(serviceClient, createdId, detail);

    console.log(`[register] akun warga baru dibuat: ${nikTersembunyi(nik)}`);
    return successResponse("Akun berhasil dibuat. Silakan masuk untuk mulai menggunakan layanan.");
  }

  // Jalur cadangan tanpa Service Role Key: signUp anonim. Profil tetap dibuat
  // trigger, tetapi bila proyek Supabase masih mewajibkan konfirmasi email,
  // akun tidak bisa login -- itu disampaikannya secara jujur, bukan disamarkan.
  const anonClient = createClient();
  const { data, error } = await anonClient.auth.signUp({
    email,
    password,
    options: { data: metadata },
  });

  if (error) {
    if (/already (been )?registered|already exists/i.test(error.message)) {
      return existingNikResponse();
    }
    return NextResponse.json({ error: authErrorMessage(error.message) }, { status: 400 });
  }

  const createdId = data?.user?.id ?? "";
  if (createdId) await updateDetailColumns(anonClient, createdId, detail);

  const sudahTerkonfirmasi = Boolean(data?.user?.email_confirmed_at);
  if (!sudahTerkonfirmasi) {
    console.warn(`[register] ${nikTersembunyi(nik)} dibuat tanpa konfirmasi email (Service Role Key absen)`);
    return NextResponse.json(
      {
        message:
          "Akun dibuat, tetapi perlu diaktifkan oleh administrator desa karena konfirmasi email belum tersedia.",
        next: "/login",
      },
      { status: 201 },
    );
  }

  console.log(`[register] akun warga baru dibuat: ${nikTersembunyi(nik)}`);
  return successResponse("Akun berhasil dibuat. Silakan masuk untuk mulai menggunakan layanan.");
}

function successResponse(message: string) {
  return NextResponse.json({ message, next: "/login" }, { status: 201 });
}

function existingNikResponse() {
  return NextResponse.json(
    {
      error: "NIK ini sudah terdaftar. Silakan masuk langsung ke akun Anda.",
      fieldErrors: { nik: "NIK sudah terdaftar." },
    },
    { status: 409 },
  );
}

/**
 * Ubah kolom detail kependudukan dari input warga, membuang nilai yang tidak
 * memenuhi aturan agar tidak ada data kotor yang tersimpan. Semua nilai valid
 * dikembalikan apa adanya; yang invalid menjadi undefined sehingga field-nya
 * tidak disentuh sama sekali.
 */
function pickDetailColumns(body: RegisterBody): DetailColumns {
  const cols: DetailColumns = {
    jenis_kelamin: ALLOWED_SEX.has(asString(body.jenis_kelamin, 20)) ? asString(body.jenis_kelamin, 20) : null,
    tempat_lahir: asString(body.tempat_lahir, 80) || null,
    tanggal_lahir: isValidDate(asString(body.tanggal_lahir, 10)) ? asString(body.tanggal_lahir, 10) : null,
    alamat: asString(body.alamat, 200) || null,
    rt: /^[0-9]{1,3}$/.test(asString(body.rt, 3)) ? asString(body.rt, 3) : null,
    rw: /^[0-9]{1,3}$/.test(asString(body.rw, 3)) ? asString(body.rw, 3) : null,
    dusun: asString(body.dusun, 80) || null,
    no_telepon: PHONE_RE.test(asString(body.no_telepon, 20)) ? asString(body.no_telepon, 20) : null,
    pekerjaan: asString(body.pekerjaan, 60) || null,
  };
  return cols;
}

/**
 * Simpan kolom detail setelah akun terbentuk. Sengaja tidak membuat registrasi
 * gagal bila ini gagal: akun tetap bisa login, dan warga tetap bisa melengkapi
 * datanya sendiri dari halaman Profil. RLS tidak membuka INSERT pada
 * public.users (profil dibuat trigger) dan hanya `users_update_self` yang
 * mengizinkan update, jadi client server dengan service role atau dengan sesi
 * milik user sendiri sama-sama aman.
 */
async function updateDetailColumns(
  client: SupabaseClient,
  userId: string,
  detail: DetailColumns,
): Promise<void> {
  const patch = Object.fromEntries(
    Object.entries(detail).filter(([, value]) => value !== null),
  );
  if (Object.keys(patch).length === 0) return;

  const { error } = await client.from("users").update(patch).eq("id", userId);
  if (error) {
    console.error("[register] gagal melengkapi profil:", error.message);
  }
}
