import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Client Supabase untuk Server Components, Server Actions, dan Route Handlers.
 * Sesi disimpan pada cookie via adapter Next.js.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Dipanggil dari Server Component: penulisan cookie ditangani middleware.
        }
      },
    },
  });
}