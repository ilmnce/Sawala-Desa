"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  BookUser,
  Building2,
  FileText,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Sprout,
  Wallet,
  X,
} from "lucide-react";
import type { AppUser } from "@/lib/types";
import { signOutClient } from "@/lib/auth-client";
import { useCounters } from "@/lib/counter-client";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const wargaNav: NavItem[] = [
  { href: "/dashboard", label: "Beranda", icon: LayoutDashboard },
  { href: "/aspirasi", label: "Aspirasi & Musdes", icon: MessageSquare },
  { href: "/pembangunan", label: "Pembangunan", icon: Building2 },
  { href: "/transparansi", label: "Transparansi", icon: Wallet },
  { href: "/potensi", label: "Potensi Desa", icon: Sprout },
  { href: "/pelayanan", label: "Pelayanan Surat", icon: FileText },
  { href: "/profil", label: "Akun Saya", icon: BookUser },
];

const adminNav: NavItem[] = [
  { href: "/admin", label: "Dashboard Admin", icon: LayoutDashboard },
  { href: "/admin/warga", label: "Data Warga", icon: BookUser },
  { href: "/admin/aspirasi", label: "Kelola Aspirasi", icon: MessageSquare },
  { href: "/admin/pembangunan", label: "Kelola Pembangunan", icon: Building2 },
  { href: "/admin/anggaran", label: "Anggaran APBDes", icon: Wallet },
  { href: "/admin/potensi", label: "Kelola Potensi", icon: Sprout },
  { href: "/admin/surat", label: "Antrean Surat", icon: FileText },
];

/** Kerangka navigasi utama untuk warga dan admin. */
export function AppShell({
  user,
  variant = "warga",
  children,
}: {
  user: AppUser;
  variant?: "warga" | "admin";
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const nav = variant === "admin" ? adminNav : wargaNav;
  const homeHref = variant === "admin" ? "/admin" : "/dashboard";
  const counters = useCounters();
  const role = variant === "admin" ? "admin" : "warga";

  async function handleLogout() {
    try {
      await signOutClient();
    } finally {
      await fetch("/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    }
  }

  const isActive = (href: string) =>
    pathname === href || (href !== homeHref && pathname.startsWith(`${href}/`));

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <Link href={homeHref} className="flex items-center gap-3 px-5 py-5" onClick={() => setOpen(false)}>
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-village-600 text-white">
          <Landmark className="h-5 w-5" aria-hidden="true" />
        </span>
        <span>
          <span className="block text-sm font-extrabold tracking-[-0.02em] text-village-900">SAWALA DESA</span>
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
            {variant === "admin" ? "Panel Admin" : "Portal Warga"}
          </span>
        </span>
      </Link>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {nav.map((item) => {
          const active = isActive(item.href);
          const badge = counters.badgeFor(item.href, role);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-village-600 ${
                active
                  ? "bg-village-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-village-50 hover:text-village-700"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="flex-1 truncate">{item.label}</span>
              {badge > 0 ? (
                <span
                  className={`inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                    active ? "bg-white/20 text-white" : "bg-village-100 text-village-700"
                  }`}
                  aria-label={`${badge} item perlu perhatian`}
                >
                  {badge > 99 ? "99+" : badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className="mb-2 rounded-xl bg-slate-50 px-3 py-2.5">
          <p className="truncate text-sm font-semibold text-slate-800">{user.namaLengkap}</p>
          <p className="truncate text-xs text-slate-500">NIK {user.nik}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Keluar
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f7f6f1]">
      {/* Lewati navigasi: penting untuk pengguna keyboard & screen reader. */}
      <a
        href="#konten-utama"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-village-700 focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-village-900"
      >
        Lewati ke konten utama
      </a>

      {/* Sidebar desktop */}
      <aside aria-label="Navigasi utama" className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white lg:block">
        {SidebarContent}
      </aside>

      {/* Drawer mobile */}
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Tutup menu"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setOpen(false)}
          />
          <aside
            aria-label="Navigasi utama"
            className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl"
          >
            <button
              type="button"
              aria-label="Tutup menu"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            {SidebarContent}
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/85 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Buka menu navigasi"
            aria-expanded={open}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <span className="font-extrabold tracking-[-0.02em] text-village-900">SAWALA DESA</span>
        </header>

        <main
          id="konten-utama"
          tabIndex={-1}
          className="mx-auto max-w-6xl px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}