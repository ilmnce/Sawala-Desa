"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, nikToEmail } from "@/lib/supabase/env";
import { getCurrentUser } from "@/lib/auth";
import { validasiGantiPassword } from "@/lib/password";

export interface ActionState {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
}

const PHONE_RE = /^[0-9+][0-9 -]{7,19}$/;

/**
 * Perbarui profil warga yang sedang login.
 * NIK, nama, dan role tidak dapat diubah warga (dikelola admin/perangkat desa).
 */
export async function updateProfilAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Database belum dikonfigurasi." };
  }

  const current = await getCurrentUser();
  if (!current) {
    return { ok: false, message: "Sesi Anda berakhir. Silakan masuk kembali." };
  }

  const fieldErrors: Record<string, string> = {};
  const alamat = String(formData.get("alamat") ?? "").trim();
  const rt = String(formData.get("rt") ?? "").trim();
  const rw = String(formData.get("rw") ?? "").trim();
  const dusun = String(formData.get("dusun") ?? "").trim();
  const noTelepon = String(formData.get("no_telepon") ?? "").trim();
  const pekerjaan = String(formData.get("pekerjaan") ?? "").trim();

  if (alamat.length > 200) fieldErrors.alamat = "Alamat maksimal 200 karakter.";
  if (rt && !/^[0-9]{1,3}$/.test(rt)) fieldErrors.rt = "RT berupa angka 1-3 digit.";
  if (rw && !/^[0-9]{1,3}$/.test(rw)) fieldErrors.rw = "RW berupa angka 1-3 digit.";
  if (noTelepon && !PHONE_RE.test(noTelepon)) fieldErrors.no_telepon = "Nomor telepon tidak valid.";
  if (pekerjaan.length > 60) fieldErrors.pekerjaan = "Pekerjaan maksimal 60 karakter.";

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Periksa kembali data yang diisi.", fieldErrors };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("users")
    .update({
      alamat: alamat || null,
      rt: rt || null,
      rw: rw || null,
      dusun: dusun || null,
      no_telepon: noTelepon || null,
      pekerjaan: pekerjaan || null,
    })
    .eq("id", current.id);

  if (error) {
    return { ok: false, message: "Gagal menyimpan profil. Coba lagi." };
  }

  revalidatePath("/profil");
  revalidatePath("/dashboard");
  return { ok: true, message: "Profil berhasil diperbarui." };
}

/**
 * Ganti password warga.
 * Password lama diverifikasi ulang ke Supabase Auth sebelum perubahan agar
 * sesi yang dibajak tidak dapat mengganti kredensial.
 */
export async function gantiPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Database belum dikonfigurasi." };
  }

  const current = await getCurrentUser();
  if (!current) {
    return { ok: false, message: "Sesi Anda berakhir. Silakan masuk kembali." };
  }

  const passwordLama = String(formData.get("password_lama") ?? "");
  const passwordBaru = String(formData.get("password_baru") ?? "");
  const konfirmasi = String(formData.get("konfirmasi") ?? "");

  const { fieldErrors } = validasiGantiPassword({ passwordLama, passwordBaru, konfirmasi });

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Periksa kembali data yang diisi.", fieldErrors };
  }

  const supabase = createClient();

  // Verifikasi password lama.
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: nikToEmail(current.nik),
    password: passwordLama,
  });

  if (verifyError) {
    return {
      ok: false,
      message: "Password lama salah.",
      fieldErrors: { password_lama: "Password lama tidak cocok." },
    };
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: passwordBaru });

  if (updateError) {
    return { ok: false, message: "Gagal mengganti password. Coba lagi." };
  }

  return { ok: true, message: "Password berhasil diganti." };
}