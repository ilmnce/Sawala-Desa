import { createClient } from "../supabase/server";
import { isSupabaseConfigured } from "../supabase/env";
import { mapUserRow } from "../user-mapper";
import type { AppUser } from "../types";

/** Ambil seluruh warga (untuk tabel admin data warga). */
export async function getAllUsers(role?: "warga" | "admin"): Promise<AppUser[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = createClient();
    let query = supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (role) query = query.eq("role", role);

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map(mapUserRow);
  } catch {
    return [];
  }
}