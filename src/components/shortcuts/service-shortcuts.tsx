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
  /** Tujuan setelah pengguna login (deep link). */
  next: string;
  label: string;
  desc: string;
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
    label: "Ajukan Surat",
    desc: "Keterangan usaha, domisili, tidak mampu, dan lainnya.",
    icon: FileText,
    auth: true,
  },
  {
    next: "/aspirasi",
    label: "Sampaikan Aspirasi",
    desc: "Usulan warga untuk Musyawarah Desa, didukung bersama.",
    icon: MessageSquare,
    auth: true,
  },
  {
    next: "/pelayanan",
    label: "Cek Status Pengajuan",
    desc: "Pantau proses dan riwayat berkas administrasi Anda.",
    icon: ShieldCheck,
    auth: true,
  },
  {
    next: "/pembangunan",
    label: "Pantau Pembangunan",
    desc: "Progress fisik program desa beserta dokumentasinya.",
    icon: Building2,
    auth: true,
  },
  {
    next: "/transparansi",
    label: "Transparansi APBDes",
    desc: "Anggaran, realisasi, dan biaya per program desa.",
    icon: Wallet,
    auth: true,
  },
  {
    next: "/potensi",
    label: "Potensi Desa",
    desc: "UMKM, pertanian, peternakan, dan keahlian warga.",
    icon: Sprout,
    auth: true,
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
          className="group relative flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:border-village-200 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-village-600"
        >
          <div className="flex items-start justify-between gap-4">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-village-50 text-village-700 transition group-hover:bg-village-600 group-hover:text-white">
              <item.icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <ArrowUpRight
              className="h-5 w-5 shrink-0 text-slate-300 transition group-hover:text-village-600"
              aria-hidden="true"
            />
          </div>
          <p className="mt-4 font-semibold text-slate-900">{item.label}</p>
          <p className="mt-1 text-sm leading-5 text-slate-500">{item.desc}</p>
        </Link>
      ))}
    </div>
  );
}