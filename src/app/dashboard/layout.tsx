import { PortalLayout } from "@/components/layout/portal-layout";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <PortalLayout>{children}</PortalLayout>;
}