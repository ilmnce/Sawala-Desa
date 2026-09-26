import Link from "next/link";
import {
  Building2,
  FileText,
  MessageSquare,
  Sprout,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDashboardMetrics } from "@/lib/data/dashboard";
import { MetricCard } from "@/components/ui/metric-card";
import { formatAngka, formatRupiahRingkas } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

const pintasan = [
  { href: "/aspirasi", label: "Ajukan Aspirasi", icon: MessageSquare, desc: "Sampaikan usulan untuk Musdes" },
  { href: "/pelayanan", label: "Ajukan Surat", icon: FileText, desc: "Layanan administrasi mandiri" },
  { href: "/pembangunan", label: "Pantau Pembangunan", icon: Building2, desc: "Progress program desa" },
  { href: "/potensi", label: "Potensi Desa", icon: Sprout, desc: "UMKM, tani, ternak, keahlian" },
];

export default async function DashboardPage() {
  const user = await requireUser();
  const metrics = await getDashboardMetrics();
  const configured = isSupabaseConfigured();
  const persenRealisasi =
    metrics.anggaranTahunIni > 0
      ? Math.round((metrics.realisasiAnggaran / metrics.anggaranTahunIni) * 100)
      : 0;

  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-village-100 bg-gradient-to-br from-village-600 to-village-700 px-6 py-7 text-white sm:px-8">
        <p className="text-sm font-medium text-village-50/90">Selamat datang kembali</p>
        <h1 className="mt-1 font-[var(--font-lora)] text-3xl font-semibold tracking-tight sm:text-4xl">
          {user.namaLengkap}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-village-50/90">
          Ringkasan kondisi desa hari ini. Sampaikan aspirasi, pantau pembangunan, dan akses layanan
          administrasi langsung dari sini.
        </p>
      </header>

      {!configured ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
          Database belum terhubung. Isi <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> dan{" "}
          <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> pada <code className="font-mono">.env.local</code>,
          lalu jalankan migrasi Supabase. Sementara itu metrik ditampilkan sebagai nol.
        </p>
      ) : null}

      <section aria-labelledby="metrik-heading">
        <h2 id="metrik-heading" className="mb-4 text-lg font-semibold text-slate-900">
          Ringkasan Statistik Desa
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Aspirasi Aktif"
            value={formatAngka(metrics.aspirasiAktif)}
            hint="Usulan warga yang sedang diproses"
            icon={MessageSquare}
            tone="amber"
          />
          <MetricCard
            label="Program Berjalan"
            value={formatAngka(metrics.proyekBerjalan)}
            hint={`Rata-rata progress ${metrics.rataProgress}%`}
            icon={Building2}
            tone="sky"
          />
          <MetricCard
            label="Belanja APBDes"
            value={formatRupiahRingkas(metrics.anggaranTahunIni)}
            hint={`Realisasi ${persenRealisasi}%`}
            icon={Wallet}
            tone="village"
          />
          <MetricCard
            label="Warga Terdaftar"
            value={formatAngka(metrics.totalWarga)}
            hint="Akun warga aktif di sistem"
            icon={Users}
            tone="rose"
          />
        </div>
      </section>

      <section aria-labelledby="pintasan-heading">
        <h2 id="pintasan-heading" className="mb-4 text-lg font-semibold text-slate-900">
          Pintasan Layanan
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pintasan.map((item) => (
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

      <section
        aria-labelledby="realisasi-heading"
        className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-village-600" aria-hidden="true" />
          <h2 id="realisasi-heading" className="text-lg font-semibold text-slate-900">
            Realisasi Anggaran {new Date().getFullYear()}
          </h2>
        </div>
        <div className="mt-5">
          <div className="flex items-end justify-between text-sm">
            <span className="text-slate-500">Terealisasi {formatRupiahRingkas(metrics.realisasiAnggaran)}</span>
            <span className="font-semibold text-slate-900">{persenRealisasi}%</span>
          </div>
          <div
            className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuenow={persenRealisasi}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Persentase realisasi anggaran"
          >
            <div
              className="h-full rounded-full bg-village-600 transition-all"
              style={{ width: `${Math.min(persenRealisasi, 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Dari total belanja {formatRupiahRingkas(metrics.anggaranTahunIni)}
          </p>
        </div>
      </section>
    </div>
  );
}