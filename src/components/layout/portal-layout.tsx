import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { AppShell } from "./app-shell";
import { RouteGuard } from "@/components/guards/route-guard";

/**
 * Kerangka halaman portal warga (server-side guard + shell + guard klien).
 * Dipakai oleh layout tiap segmen area warga agar tidak menduplikasi logika
 * otorisasi di banyak tempat.
 */
export async function PortalLayout({ children }: { children: React.ReactNode }) {
  // Pertahanan server: wajib login dan bukan admin (admin punya portal sendiri).
  const user = await requireUser();
  if (user.role === "admin") redirect("/admin");

  return (
    <RouteGuard allow="warga">
      <AppShell user={user}>{children}</AppShell>
    </RouteGuard>
  );
}