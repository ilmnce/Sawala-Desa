"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireAdmin } from "@/lib/auth";
import { BUDGET_JENIS, BUDGET_KATEGORI, type BudgetJenis, type BudgetKategori } from "@/lib/budget-constants";
import { overBudgetCheck } from "@/lib/data/budget-validation";

export interface BudgetActionState {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
}

export async function saveBudgetAction(
  _prev: BudgetActionState,
  formData: FormData,
): Promise<BudgetActionState> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Database belum dikonfigurasi." };
  }
  await requireAdmin();

  const id = formData.get("id") as string | null;
  const tahunRaw = formData.get("tahun") as string;
  const jenis = formData.get("jenis") as BudgetJenis;
  const kategori = formData.get("kategori") as BudgetKategori;
  const uraian = formData.get("uraian") as string;
  const jumlahRaw = formData.get("jumlah") as string;

  const fieldErrors: Record<string, string> = {};

  const tahun = Number(tahunRaw);
  if (!Number.isInteger(tahun) || tahun < 2000 || tahun > 2100) {
    fieldErrors.tahun = "Tahun harus berupa 4 digit angka (mis. 2026).";
  }
  if (!BUDGET_JENIS.includes(jenis)) fieldErrors.jenis = "Jenis tidak dikenal.";
  if (!BUDGET_KATEGORI.includes(kategori)) fieldErrors.kategori = "Kategori tidak dikenal.";
  if (!uraian || uraian.trim().length < 3) fieldErrors.uraian = "Uraian minimal 3 karakter.";

  const jumlah = Number(jumlahRaw.replace(/\D/g, ""));
  if (Number.isNaN(jumlah) || jumlah < 0) {
    fieldErrors.jumlah = "Jumlah tidak valid.";
  }

  // Validasi over-budget. Hanya diperiksa saat jenis == realisasi.
  if (jenis === "realisasi" && jumlah > 0) {
    const errorMsg = await overBudgetCheck(tahun, kategori, jumlah, id);
    if (errorMsg) fieldErrors.jumlah = errorMsg;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Periksa kembali data yang diisi.", fieldErrors };
  }

  const supabase = createClient();
  const payload = { tahun, jenis, kategori, uraian: uraian.trim(), jumlah };

  const { error } = id
    ? await supabase.from("budgets").update(payload).eq("id", id)
    : await supabase.from("budgets").insert(payload);

  if (error) {
    return { ok: false, message: "Gagal menyimpan data anggaran. Coba lagi." };
  }

  revalidatePath("/admin/anggaran");
  revalidatePath("/transparansi");
  revalidatePath("/dashboard");
  return { ok: true, message: `Pos anggaran berhasil ${id ? "diperbarui" : "ditambahkan"}.` };
}

export async function deleteBudgetAction(id: string): Promise<BudgetActionState> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Database belum dikonfigurasi." };
  }
  await requireAdmin();

  const supabase = createClient();
  const { error } = await supabase.from("budgets").delete().eq("id", id);
  if (error) {
    return { ok: false, message: "Gagal menghapus pos anggaran." };
  }

  revalidatePath("/admin/anggaran");
  return { ok: true, message: "Pos anggaran berhasil dihapus." };
}