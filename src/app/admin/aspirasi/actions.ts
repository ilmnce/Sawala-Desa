"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireAdmin } from "@/lib/auth";
import type { AspirationStatus } from "@/lib/types";

const VALID_STATUS: AspirationStatus[] = [
  "menunggu",
  "ditinjau",
  "prioritas",
  "ditolak",
  "terealisasi",
];

export interface AdminAspirationActionState {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Perbarui status / prioritas / catatan aspirasi oleh admin.
 * Otorisasi diperiksa ulang di server (requireAdmin) dan di database
 * (trigger guard_aspiration_admin_fields), sehingga warga tidak dapat
 * menembus jalur ini.
 */
export async function updateStatusAspirasiAction(
  _prev: AdminAspirationActionState,
  formData: FormData,
): Promise<AdminAspirationActionState> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Database belum dikonfigurasi." };
  }

  // Melempar redirect bila bukan admin.
  await requireAdmin();

  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const prioritasRaw = String(formData.get("prioritas") ?? "");
  const catatan = String(formData.get("catatan_admin") ?? "").trim();

  const fieldErrors: Record<string, string> = {};
  if (!id) fieldErrors.id = "ID aspirasi tidak sah.";
  if (!VALID_STATUS.includes(status as AspirationStatus)) {
    fieldErrors.status = "Status tidak dikenal.";
  }
  if (catatan.length > 500) {
    fieldErrors.catatan_admin = "Catatan maksimal 500 karakter.";
  }
  if (status === "ditolak" && catatan.length < 5) {
    fieldErrors.catatan_admin = "Sertakan alasan penolakan minimal 5 karakter.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Periksa kembali data yang diisi.", fieldErrors };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("aspirations")
    .update({
      status,
      prioritas: prioritasRaw === "on" || prioritasRaw === "true",
      catatan_admin: catatan || null,
    })
    .eq("id", id);

  if (error) {
    return { ok: false, message: "Gagal memperbarui aspirasi. Coba lagi." };
  }

  revalidatePath("/admin/aspirasi");
  revalidatePath("/aspirasi");
  revalidatePath("/dashboard");
  return { ok: true, message: "Status aspirasi berhasil diperbarui." };
}