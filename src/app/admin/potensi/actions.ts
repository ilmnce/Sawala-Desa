"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireAdmin } from "@/lib/auth";
import { POTENTIAL_KATEGORI, type PotentialKategori } from "@/lib/potential-constants";

export interface PotentialActionState {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
}

export async function savePotentialAction(
  _prev: PotentialActionState,
  formData: FormData,
): Promise<PotentialActionState> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Database belum dikonfigurasi." };
  }
  const user = await requireAdmin();

  const id = formData.get("id") as string | null;
  const nama = String(formData.get("nama") ?? "").trim();
  const kategori = formData.get("kategori") as PotentialKategori;
  const pemilik = String(formData.get("pemilik") ?? "").trim();
  const kontak = String(formData.get("kontak") ?? "").trim();
  const alamat = String(formData.get("alamat") ?? "").trim();
  const deskripsi = String(formData.get("deskripsi") ?? "").trim();
  const isPublished = formData.get("is_published") === "true";

  const fieldErrors: Record<string, string> = {};

  if (nama.length < 3) fieldErrors.nama = "Nama entri minimal 3 karakter.";
  if (!POTENTIAL_KATEGORI.includes(kategori)) fieldErrors.kategori = "Kategori tidak valid.";
  if (deskripsi.length > 500) fieldErrors.deskripsi = "Deskripsi maksimal 500 karakter.";

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Periksa kembali data yang diisi.", fieldErrors };
  }

  const supabase = createClient();
  const payload = {
    nama,
    kategori,
    pemilik: pemilik || null,
    kontak: kontak || null,
    alamat: alamat || null,
    deskripsi: deskripsi || null,
    is_published: isPublished,
    created_by: user.id
  };

  const { error } = id
    ? await supabase.from("village_potentials").update(payload).eq("id", id)
    : await supabase.from("village_potentials").insert(payload);

  if (error) {
    return { ok: false, message: "Gagal menyimpan data potensi. Coba lagi." };
  }

  revalidatePath("/admin/potensi");
  revalidatePath("/potensi");
  revalidatePath("/dashboard");
  return { ok: true, message: `Data potensi berhasil ${id ? "diperbarui" : "ditambahkan"}.` };
}

export async function deletePotentialAction(id: string): Promise<PotentialActionState> {
  if (!isSupabaseConfigured()) return { ok: false, message: "Database belum dikonfigurasi." };
  await requireAdmin();

  const supabase = createClient();
  const { error } = await supabase.from("village_potentials").delete().eq("id", id);
  if (error) return { ok: false, message: "Gagal menghapus entri potensi." };

  revalidatePath("/admin/potensi");
  revalidatePath("/potensi");
  return { ok: true, message: "Entri terhapus." };
}