"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireAdmin } from "@/lib/auth";
import { isValidNik } from "@/lib/validation";

export interface WargaActionState {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Menambahkan warga baru ke database menggunakan Service Role Key agar login auth
 * tidak perlu diintervensi sisi user public (Admin mendaftarkan by Service Role).
 */
export async function tambahWargaAction(
  _prev: WargaActionState,
  formData: FormData,
): Promise<WargaActionState> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, message: "Database belum dikonfigurasi penuh (Service Role Key absen)." };
  }
  await requireAdmin();

  const nik = String(formData.get("nik") ?? "").trim();
  const nama = String(formData.get("nama") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  const fieldErrors: Record<string, string> = {};

  if (!isValidNik(nik)) fieldErrors.nik = "NIK harus persis 16 digit angka.";
  if (nama.length < 3) fieldErrors.nama = "Nama minimal 3 karakter.";
  if (password.length < 8) fieldErrors.password = "Password minimal 8 karakter.";

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Periksa kembali isian Anda.", fieldErrors };
  }

  // Buat client dengan service_role key untuk admin creation privileges
  const adminAuthClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const syntheticEmail = `${nik}@warga.salawadesa.local`;

  // Pembuatan Auth Users ini akan men-trigger handle_new_user yang kita buat di Migration 1
  const { data, error } = await adminAuthClient.auth.admin.createUser({
    email: syntheticEmail,
    password: password,
    email_confirm: true,
    user_metadata: {
      nik,
      nama_lengkap: nama,
      role: "warga"
    }
  });

  if (error) {
    if (error.message.includes("already exists")) {
       return { ok: false, message: "NIK ini sudah terdaftar sebelumnya." }
    }
    return { ok: false, message: "Gagal mendaftarkan warga. Coba lagi." };
  }

  revalidatePath("/admin/warga");
  return { ok: true, message: "Warga berhasil ditambahkan ke sistem." };
}