"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/**
 * Client Supabase untuk komponen browser (Client Components).
 * Membaca/menulis sesi melalui cookie agar konsisten dengan server.
 */
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}