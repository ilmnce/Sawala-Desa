import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";
import type { UserRole } from "../types";

/**
 * Ambil role pengguna langsung dari cookie permintaan (read-only).
 * Dipakai middleware; sengaja tidak memutasi cookie karena penyegaran sesi
 * sudah ditangani `updateSession`.
 */
export async function getRoleFromRequest(
  request: NextRequest,
  userId: string,
): Promise<UserRole | null> {
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: () => undefined,
    },
  });

  const { data, error } = await supabase
    .from("users")
    .select("role, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data || data.is_active === false) return null;
  return (data.role as UserRole) ?? "warga";
}