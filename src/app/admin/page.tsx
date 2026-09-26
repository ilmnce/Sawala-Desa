import Link from "next/link";
import { BookUser, Building2, FileText, MessageSquare, Sprout, Wallet } from "lucide-react";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const kelola = [
  { href: "/admin/warga", label: "Data Warga", desc: "Kelola akun & profil warga desa", icon: BookUser },
  { href: "/admin/aspirasi", label: "Aspirasi Warga", desc: "Proses & tetapkan status usulan", icon: MessageSquare },
  { href: "/admin/pembangunan", label: "Pembangunan", desc: "Program, progress, dokumentasi", icon: Building2 },
  { href: "/admin/anggaran", label: "Anggaran APBDes", desc: "Pos belanja & realisasi dana", icon: Wallet },
  { href: "/admin/potensi", label: "Potensi Desa", desc: "UMKM, pertanian, peternakan", icon: Sprout },
  { href: "/admin/surat", label: "Antrean Surat", desc: "Verifikasi pengajuan warga", icon: FileText },
];

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();

  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-village-100 bg-gradient-to-br from-village-700 to-village-900 px-6 py-7 text-white sm:px-8">
        <p className="text-sm font-medium text-village-50/80">Panel Admin Desa</p>
        <h1 className="mt-1 font-[var(--font-lora)] text-3xl font-semibold tracking-tight sm:text-4xl">
          Selamat bertugas, {admin.namaLengkap}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-village-50/85">
          Kelola data warga, proses aspirasi, perbarui pembangunan, dan verifikasi pengajuan surat
          dari satu tempat.
        </p>
      </header>

      <section aria-labelledby="kelola-heading">
        <h2 id="kelola-heading" className="mb-4 text-lg font-semibold text-slate-900">
          Menu Pengelolaan
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kelola.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:border-village-200 hover:shadow-md"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-village-50 text-village-700 transition group-hover:bg-village-600 group-hover:text-white">
                <item.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="mt-4 font-semibold text-slate-900">{item.label}</p>
              <p className="mt-1 text-sm leading-5 text-slate-500">{item.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}