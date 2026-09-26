import { createClient } from "../supabase/server";
import { isSupabaseConfigured } from "../supabase/env";
import type { BudgetJenis, BudgetKategori } from "../budget-constants";

export interface Budget {
  id: string;
  tahun: number;
  jenis: BudgetJenis;
  kategori: BudgetKategori;
  uraian: string;
  jumlah: number;
  programId: string | null;
  createdAt: string;
}

/** Ambil seluruh pos anggaran beserta informasinya. */
export async function getBudgets(tahun?: number): Promise<Budget[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = createClient();
    let query = supabase
      .from("budgets")
      .select("id, tahun, jenis, kategori, uraian, jumlah, program_id, created_at")
      .order("tahun", { ascending: false })
      .order("jenis", { ascending: true })
      .order("kategori", { ascending: true })
      .order("created_at", { ascending: false });

    if (tahun) query = query.eq("tahun", tahun);

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row) => ({
      id: String(row.id),
      tahun: Number(row.tahun),
      jenis: (row.jenis as BudgetJenis) ?? "belanja",
      kategori: (row.kategori as BudgetKategori) ?? "umum",
      uraian: String(row.uraian ?? ""),
      jumlah: Number(row.jumlah ?? 0),
      programId: row.program_id ? String(row.program_id) : null,
      createdAt: String(row.created_at ?? ""),
    }));
  } catch {
    return [];
  }
}