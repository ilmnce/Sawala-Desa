import Link from "next/link";
import { ArrowRight, Landmark } from "lucide-react";
import { AnnouncementFeed } from "@/components/announcements/announcement-feed";
import { ServiceShortcuts } from "@/components/shortcuts/service-shortcuts";
import { getLatestAnnouncements } from "@/lib/data/announcements";
import { getDashboardMetrics } from "@/lib/data/dashboard";
import { formatAngka, formatRupiahRingkas } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function BerandaPage() {
  const [announcements, metrics] = await Promise.all([
    getLatestAnnouncements(6),
    getDashboardMetrics(),
  ]);

  const tahun = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-[#f7f6f1]">
      <a
        href="#konten-utama"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-village-700 focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-village-900"
      >
        Lewati ke konten utama
      </a>

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur" aria-label="Kepala halaman">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-village-600 text-white">
              <Landmark className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-extrabold tracking-[-0.02em] text-village-900">SAWALA DESA</span>
              <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
                Portal Informasi Desa
              </span>
            </span>
          </Link>
          <nav aria-label="Navigasi beranda" className="flex items-center gap-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-village-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-village-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-village-600"
            >
              Masuk Warga
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </nav>
        </div>
      </header>

      <main id="konten-utama" tabIndex={-1} className="mx-auto max-w-6xl px-5 py-10 outline-none sm:px-8">
        <section className="rounded-3xl border border-village-100 bg-gradient-to-br from-village-600 to-village-800 px-6 py-10 text-white sm:px-10 sm:py-14">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur">
            <Landmark className="h-4 w-4" aria-hidden="true" />
            Pemerintah Desa Sawala
          </p>
          <h1 className="mt-6 max-w-3xl font-[var(--font-lora)] text-4xl font-semibold leading-[1.1] tracking-[-0.035em] sm:text-5xl">
            Satu pintu informasi & layanan Desa Sawala
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-village-50/90 sm:text-lg">
            Pantau pembangunan, baca pengumuman terbaru, dan akses layanan administrasi desa
            langsung dari mana saja.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-village-700 shadow-sm transition hover:bg-village-50"
            >
              Masuk ke Portal Warga
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section aria-labelledby="metrik-heading" className="mt-10">
          <h2 id="metrik-heading" className="mb-4 text-lg font-semibold text-slate-900">
            Ringkasan Desa {tahun}
          </h2>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Aspirasi Aktif", value: formatAngka(metrics.aspirasiAktif) },
              { label: "Program Berjalan", value: formatAngka(metrics.proyekBerjalan) },
              { label: "Belanja APBDes", value: formatRupiahRingkas(metrics.anggaranTahunIni) },
              { label: "Warga Terdaftar", value: formatAngka(metrics.totalWarga) },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <dt className="text-sm font-medium text-slate-500">{item.label}</dt>
                <dd className="mt-2 font-[var(--font-lora)] text-2xl font-semibold tracking-tight text-slate-900">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="pengumuman-heading" className="mt-10">
          <div className="mb-4 flex items-end justify-between gap-4">
            <h2 id="pengumuman-heading" className="text-lg font-semibold text-slate-900">
              Pengumuman & Agenda Terbaru
            </h2>
          </div>
          <AnnouncementFeed items={announcements} infinite />
        </section>

        <section aria-labelledby="layanan-heading" className="mt-10">
          <h2 id="layanan-heading" className="mb-1 text-lg font-semibold text-slate-900">
            Layanan & Informasi
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            Pilih layanan yang Anda butuhkan — Anda akan diarahkan untuk masuk lebih dulu.
          </p>
          <ServiceShortcuts />
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-8 text-sm text-slate-500 sm:px-8">
          © {tahun} Pemerintah Desa Sawala. Seluruh informasi dikelola perangkat desa.
        </div>
      </footer>
    </div>
  );
}