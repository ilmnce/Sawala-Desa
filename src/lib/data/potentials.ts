import { createClient } from "../supabase/server";
import { isSupabaseConfigured } from "../supabase/env";
import type { PotentialKategori } from "../potential-constants";

export interface VillagePotential {
  id: string;
  nama: string;
  kategori: PotentialKategori;
  deskripsi: string | null;
  pemilik: string | null;
  kontak: string | null;
  alamat: string | null;
  isPublished: boolean;
  createdAt: string;
}

export async function getPotentials(options: {
  kategori?: PotentialKategori | null;
  limit?: number;
  includeDrafts?: boolean;
} = {}): Promise<VillagePotential[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = createClient();
    let query = supabase
      .from("village_potentials")
      .select("*")
      .order("created_at", { ascending: false });

    if (!options.includeDrafts) {
      query = query.eq("is_published", true);
    }
    if (options.kategori) {
      query = query.eq("kategori", options.kategori);
    }
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row) => ({
      id: String(row.id),
      nama: String(row.nama ?? ""),
      kategori: (row.kategori as PotentialKategori) ?? "umkm",
      deskripsi: (row.deskripsi as string | null) ?? null,
      pemilik: (row.pemilik as string | null) ?? null,
      kontak: (row.kontak as string | null) ?? null,
      alamat: (row.alamat as string | null) ?? null,
      isPublished: Boolean(row.is_published ?? true),
      createdAt: String(row.created_at ?? ""),
    }));
  } catch {
    return [];
  }
}