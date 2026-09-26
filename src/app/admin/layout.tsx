import { requireAdmin } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { RouteGuard } from "@/components/guards/route-guard";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Pertahanan server-side: hanya role admin yang lolos.
  const user = await requireAdmin();

  return (
    <RouteGuard allow="admin">
      <AppShell user={user} variant="admin">
        {children}
      </AppShell>
    </RouteGuard>
  );
}