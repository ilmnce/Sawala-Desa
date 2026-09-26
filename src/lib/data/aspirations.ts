import { createClient } from "../supabase/server";
import { isSupabaseConfigured } from "../supabase/env";
import type { AspirationStatus } from "../types";

// Konstanta dipusatkan di modul bebas-server agar dapat dipakai komponen klien.
export {
  ASPIRATION_CATEGORIES,
  CATEGORY_LABELS,
  ASPIRATION_STATUS_LABELS,
  type AspirationCategory,
} from "../aspiration-constants";

export interface Aspiration {
  id: string;
  judul: string;
  kategori: string;
  deskripsi: string;
  status: AspirationStatus;
  prioritas: boolean;
  catatanAdmin: string | null;
  pengusulId: string;
  pengusulNama: string;
  dukungan: number;
  didukung: boolean;
  createdAt: string;
}

/** Ambil daftar aspirasi beserta jumlah dukungan dan status dukungan pengguna aktif. */
export async function getAspirations(options: {
  userId?: string | null;
  status?: AspirationStatus | null;
  prioritasOnly?: boolean;
  limit?: number;
} = {}): Promise<Aspiration[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = createClient();
    let query = supabase
      .from("aspirations")
      .select(
        "id, judul, kategori, deskripsi, status, prioritas, catatan_admin, pengusul_id, created_at, aspiration_supports(id, user_id)",
      )
      .order("created_at", { ascending: false });

    if (options.status) query = query.eq("status", options.status);
    if (options.prioritasOnly) query = query.eq("prioritas", true);
    if (options.limit) query = query.limit(options.limit);

    const { data, error } = await query;
    if (error || !data) return [];

    // Nama pengusul diambil terpisah agar tidak bergantung pada join RLS.
    const pengusulIds = Array.from(new Set(data.map((row) => String(row.pengusul_id))));
    const { data: users } = await supabase
      .from("users")
      .select("id, nama_lengkap")
      .in("id", pengusulIds.length > 0 ? pengusulIds : ["00000000-0000-0000-0000-000000000000"]);

    const namaById = new Map((users ?? []).map((u) => [String(u.id), String(u.nama_lengkap ?? "")]));

    return data.map((row) => {
      const supports = (row.aspiration_supports as { id: string; user_id: string }[] | null) ?? [];
      return {
        id: String(row.id),
        judul: String(row.judul ?? ""),
        kategori: String(row.kategori ?? "umum"),
        deskripsi: String(row.deskripsi ?? ""),
        status: (row.status as AspirationStatus) ?? "menunggu",
        prioritas: row.prioritas === true,
        catatanAdmin: (row.catatan_admin as string | null) ?? null,
        pengusulId: String(row.pengusul_id),
        pengusulNama: namaById.get(String(row.pengusul_id)) ?? "Warga Salawa",
        dukungan: supports.length,
        didukung: options.userId ? supports.some((s) => String(s.user_id) === options.userId) : false,
        createdAt: String(row.created_at ?? ""),
      };
    });
  } catch {
    return [];
  }
}