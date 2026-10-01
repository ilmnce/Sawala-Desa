import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  FileText,
  MessageSquare,
  ShieldCheck,
  Sprout,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Shortcut {
  /** Tujuan setelah pengguna login (deep link) atau langsung untuk publik. */
  next: string;
  label: string;
  desc: string;
  badge?: string;
  icon: LucideIcon;
  /** Butuh login => arahkan ke /login?next=... */
  auth: boolean;
}

/**
 * Pintasan layanan warga. Layanan yang memerlukan akun diarahkan ke /login
 * sambil membawa tujuan asal, sehingga warga mendarat langsung di halaman yang
 * dimaksud setelah berhasil masuk.
 */
const LAYANAN: Shortcut[] = [
  {
    next: "/pelayanan",
    label: "Ajukan Surat Online",
    desc: "Keterangan usaha (SKU), domisili (SKD), tidak mampu (SKTM).",
    badge: "Layanan Warga",
    icon: FileText,
    auth: true,
  },
  {
    next: "/aspirasi",
    label: "Sampaikan Aspirasi",
    desc: "Usulan pembangunan & fasilitas desa, didukung bersama warga.",
    badge: "Partisipasi",
    icon: MessageSquare,
    auth: true,
  },
  {
    next: "/pelayanan",
    label: "Cek Status Pengajuan",
    desc: "Pantau proses verifikasi dan riwayat berkas administrasi Anda.",
    badge: "Pelacakan",
    icon: ShieldCheck,
    auth: true,
  },
  {
    next: "/pembangunan",
    label: "Pantau Pembangunan",
    desc: "Dokumentasi & progress fisik program infrastruktur desa.",
    badge: "Publik & Terbuka",
    icon: Building2,
    auth: false,
  },
  {
    next: "/transparansi",
    label: "Transparansi APBDes",
    desc: "Rincian alokasi belanja, pendapatan, dan realisasi anggaran desa.",
    badge: "Akuntabilitas",
    icon: Wallet,
    auth: false,
  },
  {
    next: "/potensi",
    label: "Katalog Potensi & UMKM",
    desc: "Dukung produk UMKM lokal, pertanian, dan keahlian warga desa.",
    badge: "Ekonomi Desa",
    icon: Sprout,
    auth: false,
  },
];

function hrefFor(shortcut: Shortcut): string {
  return shortcut.auth ? `/login?next=${encodeURIComponent(shortcut.next)}` : shortcut.next;
}

export function ServiceShortcuts() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {LAYANAN.map((item) => (
        <Link
          key={`${item.next}-${item.label}`}
          href={hrefFor(item)}
          className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-village-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-village-600"
        >
          <div>
            <div className="flex items-start justify-between gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-village-50 text-village-700 transition-colors duration-200 group-hover:bg-village-600 group-hover:text-white">
                <item.icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <div className="flex items-center gap-2">
                {item.badge && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 group-hover:bg-village-50 group-hover:text-village-700">
                    {item.badge}
                  </span>
                )}
                <ArrowUpRight
                  className="h-5 w-5 shrink-0 text-slate-300 transition-colors group-hover:text-village-600"
                  aria-hidden="true"
                />
              </div>
            </div>
            <p className="mt-4 text-base font-bold tracking-tight text-slate-900 group-hover:text-village-700">
              {item.label}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{item.desc}</p>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-village-700">
            <span>{item.auth ? "Masuk untuk akses" : "Lihat selengkapnya"}</span>
            <span aria-hidden="true">→</span>
          </div>
        </Link>
      ))}
    </div>
  );
}