"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthSession } from "@/lib/auth-client";
import { homePathForRole } from "@/lib/routes";
import type { UserRole } from "@/lib/types";

interface RouteGuardProps {
  /** Role yang diizinkan membuka halaman ini. */
  allow: UserRole;
  children: React.ReactNode;
}

/**
 * Guard client-side untuk mencegah kedipan konten terproteksi.
 *
 * Middleware server tetap menjadi pertahanan utama; guard ini adalah lapisan
 * UX: menahan render sampai sesi diketahui, lalu mengarahkan pengguna yang
 * belum login atau salah role ke portal yang benar.
 */
export function RouteGuard({ allow, children }: RouteGuardProps) {
  const router = useRouter();
  const session = useAuthSession();

  useEffect(() => {
    if (session.status === "loading") return;

    if (session.status === "anonymous") {
      const next =
        typeof window !== "undefined" ? window.location.pathname + window.location.search : null;
      const target = next ? `/login?next=${encodeURIComponent(next)}` : "/login";
      router.replace(target);
      return;
    }

    if (session.user && session.user.role !== allow) {
      router.replace(homePathForRole(session.user.role));
    }
  }, [session.status, session.user, allow, router]);

  if (session.status === "loading") {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f7f6f1]">
        <p className="inline-flex items-center gap-2 text-sm text-slate-500" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Memuat sesi...
        </p>
      </div>
    );
  }

  if (session.status === "anonymous" || !session.user || session.user.role !== allow) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f7f6f1]">
        <p className="text-sm text-slate-500" role="status">
          Mengalihkan ke halaman yang sesuai...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}