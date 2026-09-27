/**
 * Sawala Desa - Operasi Kalkulasi Anggaran
 */

import { createClient } from "../supabase/server";
import { isSupabaseConfigured } from "../supabase/env";
import type { BudgetKategori } from "../budget-constants";

/**
 * Validasi apakah nominal realisasi baru akan melebihi pagu (belanja yang
 * direncanakan) untuk tahun dan kategori yang sama.
 * Mencegah over-budget pada sistem pencatatan.
 *
 * Mengembalikan array fieldErrors bila melebihi pagu, null bila aman.
 */
export async function overBudgetCheck(
  tahun: number,
  kategori: BudgetKategori,
  jumlahBaru: number,
  excludeId: string | null = null,
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("budgets")
      .select("id, jenis, jumlah")
      .eq("tahun", tahun)
      .eq("kategori", kategori)
      .in("jenis", ["belanja", "realisasi"]);

    if (error || !data) return null;

    let totalPagu = 0;
    let totalRealisasiAwal = 0;

    for (const r of data) {
      if (r.jenis === "belanja") {
        totalPagu += Number(r.jumlah);
      } else if (r.jenis === "realisasi") {
        // Jika kita sedang mengedit row exisiting, exclude jumlah asalnya
        if (r.id !== excludeId) {
          totalRealisasiAwal += Number(r.jumlah);
        }
      }
    }

    if (totalRealisasiAwal + jumlahBaru > totalPagu) {
      const sisa = Math.max(0, totalPagu - totalRealisasiAwal);
      const rpPagu = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(totalPagu);
      const rpSisa = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(sisa);
      return `Realisasi melebihi pagu. Plafond kategori ini: ${rpPagu}, sisa saat ini: ${rpSisa}.`;
    }

    return null;
  } catch {
    return null;
  }
}