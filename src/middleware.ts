import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { getRoleFromRequest } from "@/lib/supabase/role";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { homePathForRole } from "@/lib/routes";

const AUTH_ENTRY_PATHS = ["/login", "/lupa-password"];
/** Endpoint auth harus selalu dilewatkan (login/logout/callback tidak boleh dialihkan). */
const AUTH_ENDPOINT_PREFIX = "/auth/";
const ADMIN_PREFIX = "/admin";

function isPublic(pathname: string) {
  if (pathname === "/" || AUTH_ENTRY_PATHS.includes(pathname)) return true;
  if (pathname === "/register") return true;
  if (pathname === "/potensi" || pathname.startsWith("/potensi/")) return true;
  if (pathname === "/pembangunan" || pathname.startsWith("/pembangunan/")) return true;
  if (pathname === "/transparansi" || pathname.startsWith("/transparansi/")) return true;
  return false;
}

/** Endpoint API & auth: jangan pernah dialihkan oleh aturan halaman. */
function isAlwaysAllowed(pathname: string) {
  return pathname.startsWith(AUTH_ENDPOINT_PREFIX) || pathname.startsWith("/api/");
}

/**
 * Middleware auth & otorisasi role:
 *  1. Menyegarkan sesi Supabase lalu membaca pengguna aktif.
 *  2. Menolak akses halaman terproteksi tanpa sesi -> /login?next=<tujuan>.
 *  3. Mengarahkan pengguna yang sudah login menjauh dari /login ke portalnya.
 *  4. Membatasi seluruh prefix /admin khusus role admin.
 *  5. Gagal-tertutup: bila profil tidak dapat dibaca, pengguna dianggap anonim
 *     (tidak ada redirect berputar).
 */
export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Endpoint auth/API tidak pernah dialihkan — hanya sesinya yang disegarkan.
  if (isAlwaysAllowed(pathname)) return response;

  // Tanpa konfigurasi database, middleware tidak memaksakan aturan apa pun.
  if (!isSupabaseConfigured()) return response;

  const isAdminArea = pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`);

  if (!user) {
    if (isPublic(pathname) || pathname === "/") {
      return response;
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const role = await getRoleFromRequest(request, user.id);

  // Profil tidak terbaca / nonaktif: perlakukan sebagai anonim, sekali saja.
  if (!role) {
    if (isPublic(pathname) || pathname === "/") {
      return response;
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const home = homePathForRole(role);

  // Area admin hanya untuk role admin (mencegah redirect berputar).
  if (isAdminArea && role !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = home;
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Admin yang membuka area warga diarahkan ke panel admin.
  if (!isAdminArea && role === "admin" && pathname !== home) {
    const url = request.nextUrl.clone();
    url.pathname = home;
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Pengguna sudah login tidak perlu melihat halaman login / landing page.
  if (AUTH_ENTRY_PATHS.includes(pathname) || pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = home;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};