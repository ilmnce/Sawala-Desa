import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Clock,
  Coins,
  FileCheck,
  Landmark,
  MapPin,
  MessageSquare,
  Phone,
  Sparkles,
  Users,
} from "lucide-react";
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
    <div className="min-h-screen bg-[#f8f9fa] text-slate-900 antialiased">
      {/* Aksesibilitas: Skip-link utama */}
      <a
        href="#konten-utama"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-village-700 focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-village-900"
      >
        Lewati ke konten utama
      </a>

      {/* Header Navigasi Publik */}
      <header
        className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md transition-all"
        aria-label="Kepala halaman"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <Link href="/" className="group flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-village-700 text-white shadow-sm transition group-hover:bg-village-800">
              <Landmark className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-extrabold tracking-[-0.02em] text-village-900">
                SAWALA DESA
              </span>
              <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
                Portal Informasi Desa
              </span>
            </span>
          </Link>

          {/* Navigasi Menu Publik */}
          <nav aria-label="Navigasi beranda" className="flex items-center gap-1 sm:gap-2">
            <div className="hidden md:flex items-center gap-1 text-sm font-semibold text-slate-600">
              <Link
                href="/pembangunan"
                className="rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-village-900"
              >
                Pembangunan
              </Link>
              <Link
                href="/potensi"
                className="rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-village-900"
              >
                Potensi UMKM
              </Link>
              <Link
                href="/transparansi"
                className="rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-village-900"
              >
                Transparansi
              </Link>
              <Link
                href="/aspirasi"
                className="rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-village-900"
              >
                Aspirasi
              </Link>
            </div>

            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-village-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-village-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-village-700"
            >
              <span>Masuk Warga</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Konten Utama */}
      <main id="konten-utama" tabIndex={-1} className="mx-auto max-w-6xl px-5 py-8 outline-none sm:px-8 sm:py-10">
        {/* Hero Section Banner */}
        <section
          aria-label="Sambutan Portal Desa"
          className="relative overflow-hidden rounded-3xl border border-village-900/10 bg-gradient-to-br from-village-950 via-village-900 to-village-800 p-6 text-white shadow-soft sm:p-10 lg:p-12"
        >
          {/* Aksen background dekoratif */}
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-village-500/15 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-village-400/10 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative z-10 grid gap-8 lg:grid-cols-12 lg:items-center">
            {/* Kolom Kiri: Heading & CTA */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-village-100 backdrop-blur-md">
                <Landmark className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
                <span>Pemerintah Desa Sawala</span>
                <span className="text-white/40">•</span>
                <span className="text-emerald-200">Pelayanan Terpadu</span>
              </div>

              <h1 className="mt-5 font-[var(--font-lora)] text-3xl font-bold leading-[1.15] tracking-[-0.03em] sm:text-4xl lg:text-5xl text-white">
                Satu pintu informasi & layanan Desa Sawala
              </h1>

              <p className="mt-4 max-w-xl text-base leading-relaxed text-village-100/90 sm:text-lg">
                Pantau progres pembangunan, akses keterbukaan APBDes, sampaikan aspirasi musyawarah,
                dan ajukan permohonan surat administrasi secara mandiri.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-village-900 shadow-md transition hover:bg-village-50 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <span>Masuk ke Portal Warga</span>
                  <ArrowRight className="h-4 w-4 text-village-700" aria-hidden="true" />
                </Link>

                <Link
                  href="/potensi"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 hover:border-white/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <Sparkles className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                  <span>Jelajahi Potensi UMKM</span>
                </Link>
              </div>
            </div>

            {/* Kolom Kanan: Card Ringkasan Layanan Cepat */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-md">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400" />
                    </span>
                    <span className="text-sm font-semibold text-white">Balai Desa Siap Melayani</span>
                  </div>
                  <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                    Online & Kantor
                  </span>
                </div>

                <div className="mt-4 space-y-3.5 text-xs text-village-100/90">
                  <div className="flex items-start gap-3">
                    <Clock className="h-4 w-4 shrink-0 text-emerald-300 mt-0.5" aria-hidden="true" />
                    <div>
                      <p className="font-semibold text-white">Jam Operasional Pelayanan</p>
                      <p className="text-village-200">Senin – Jumat: 08.00 – 15.00 WIB</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 shrink-0 text-emerald-300 mt-0.5" aria-hidden="true" />
                    <div>
                      <p className="font-semibold text-white">Lokasi Kantor Desa</p>
                      <p className="text-village-200">Jl. Raya Utama Sawala No. 01, Kantor Desa</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <FileCheck className="h-4 w-4 shrink-0 text-emerald-300 mt-0.5" aria-hidden="true" />
                    <div>
                      <p className="font-semibold text-white">Pengajuan Surat Mandiri</p>
                      <p className="text-village-200">SKU, SKTM, & SKD langsung dari gawai Anda</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 border-t border-white/10 pt-4">
                  <Link
                    href="/pelayanan"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/20 py-2.5 text-xs font-bold text-emerald-200 transition hover:bg-emerald-500/30"
                  >
                    <span>Ajukan Berkas Administrasi</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section Ringkasan Statistik */}
        <section aria-labelledby="metrik-heading" className="mt-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="metrik-heading" className="text-xl font-bold tracking-tight text-slate-900">
              Ringkasan Desa {tahun}
            </h2>
            <Link
              href="/transparansi"
              className="text-xs font-semibold text-village-700 hover:text-village-900 hover:underline"
            >
              Lihat Detail APBDes →
            </Link>
          </div>

          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Aspirasi Aktif",
                value: formatAngka(metrics.aspirasiAktif),
                desc: "Usulan warga diproses",
                icon: MessageSquare,
                color: "text-emerald-700 bg-emerald-50",
              },
              {
                label: "Program Berjalan",
                value: formatAngka(metrics.proyekBerjalan),
                desc: "Pembangunan infrastruktur",
                icon: Building2,
                color: "text-amber-700 bg-amber-50",
              },
              {
                label: "Belanja APBDes",
                value: formatRupiahRingkas(metrics.anggaranTahunIni),
                desc: "Alokasi anggaran tahun ini",
                icon: Coins,
                color: "text-blue-700 bg-blue-50",
              },
              {
                label: "Warga Terdaftar",
                value: formatAngka(metrics.totalWarga),
                desc: "Akun ber-NIK aktif",
                icon: Users,
                color: "text-purple-700 bg-purple-50",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {item.label}
                  </dt>
                  <span className={`grid h-8 w-8 place-items-center rounded-lg ${item.color}`}>
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>
                <dd className="mt-3 font-[var(--font-lora)] text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  {item.value}
                </dd>
                <p className="mt-1 text-xs text-slate-500">{item.desc}</p>
              </div>
            ))}
          </dl>
        </section>

        {/* Section Layanan & Pintasan Fitur */}
        <section aria-labelledby="layanan-heading" className="mt-14">
          <div className="mb-4">
            <h2 id="layanan-heading" className="text-xl font-bold tracking-tight text-slate-900">
              Layanan & Informasi Unggulan
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Kemudahan akses layanan administrasi desa dan transparansi publik dalam satu genggaman.
            </p>
          </div>
          <ServiceShortcuts />
        </section>

        {/* Section Pengumuman & Agenda */}
        <section aria-labelledby="pengumuman-heading" className="mt-14">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 id="pengumuman-heading" className="text-xl font-bold tracking-tight text-slate-900">
                Pengumuman & Agenda Terbaru
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Informasi penting, musyawarah, dan kegiatan resmi Pemerintah Desa Sawala.
              </p>
            </div>
          </div>
          <AnnouncementFeed items={announcements} infinite />
        </section>
      </main>

      {/* Footer Lengkap Profesional */}
      <footer className="mt-20 border-t border-slate-200 bg-white" aria-label="Kaki halaman">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Identitas Desa */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-village-700 text-white">
                  <Landmark className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="text-base font-extrabold tracking-tight text-village-900">
                  SAWALA DESA
                </span>
              </div>
              <p className="text-xs leading-relaxed text-slate-600">
                Sistem informasi dan portal administrasi publik resmi Pemerintah Desa Sawala. Terbuka,
                akuntabel, dan melayani sepenuh hati.
              </p>
            </div>

            {/* Navigasi Layanan Publik */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Layanan Publik
              </h3>
              <ul className="mt-3 space-y-2 text-xs text-slate-600">
                <li>
                  <Link href="/pelayanan" className="hover:text-village-700 hover:underline">
                    Pengajuan Surat Keterangan
                  </Link>
                </li>
                <li>
                  <Link href="/aspirasi" className="hover:text-village-700 hover:underline">
                    Saluran Aspirasi Warga
                  </Link>
                </li>
                <li>
                  <Link href="/pembangunan" className="hover:text-village-700 hover:underline">
                    Katalog Pembangunan Fisik
                  </Link>
                </li>
                <li>
                  <Link href="/potensi" className="hover:text-village-700 hover:underline">
                    Potensi & UMKM Desa
                  </Link>
                </li>
              </ul>
            </div>

            {/* Transparansi & Akuntabilitas */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Transparansi
              </h3>
              <ul className="mt-3 space-y-2 text-xs text-slate-600">
                <li>
                  <Link href="/transparansi" className="hover:text-village-700 hover:underline">
                    Realisasi APBDes {tahun}
                  </Link>
                </li>
                <li>
                  <Link href="/pembangunan" className="hover:text-village-700 hover:underline">
                    Dokumentasi & Milestone Proyek
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-village-700 hover:underline">
                    Masuk ke Akun Warga
                  </Link>
                </li>
              </ul>
            </div>

            {/* Kontak & Alamat */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Kantor Balai Desa
              </h3>
              <div className="mt-3 space-y-2 text-xs text-slate-600">
                <p className="flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" aria-hidden="true" />
                  <span>Jl. Raya Utama Sawala No. 01, Kantor Desa</span>
                </p>
                <p className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                  <span>Senin – Jumat (08:00 – 15:00 WIB)</span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                  <span>Layanan Warga Terpadu</span>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-slate-200/80 pt-6 text-center text-xs text-slate-500">
            © {tahun} Pemerintah Desa Sawala. Seluruh informasi dikelola perangkat desa.
          </div>
        </div>
      </footer>
    </div>
  );
}
