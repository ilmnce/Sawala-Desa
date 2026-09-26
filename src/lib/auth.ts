import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { isSupabaseConfigured } from "./supabase/env";
import { mapUserRow } from "./user-mapper";
import type { AppUser } from "./types";

/**
 * Ambil profil pengguna yang sedang login dari tabel public.users.
 * Mengembalikan null bila belum login, belum dikonfigurasi, atau profil tidak ada.
 */
export async function getCurrentUser(): Promise<AppUser | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) return null;

  const mapped = mapUserRow(data);
  if (!mapped.isActive) return null;

  return mapped;
}

/** Wajib login. Alihkan ke /login bila belum terautentikasi. */
export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Wajib login sebagai admin. Warga biasa dialihkan ke dashboard warga. */
export async function requireAdmin(): Promise<AppUser> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}