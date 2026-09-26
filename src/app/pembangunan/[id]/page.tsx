import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  UserRound,
  Wallet,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getProgramById, getProgramMilestones } from "@/lib/data/programs";
import {
  PROGRAM_KATEGORI_LABELS,
  PROGRAM_STATUS_BADGE_STYLES,
  PROGRAM_STATUS_LABELS,
  progressTone,
} from "@/lib/program-constants";
import { MilestoneTimeline, UpdateProgressButton } from "@/components/development/milestone-timeline";
import { PhotoGallery } from "@/components/development/photo-gallery";
import { AreaUploadDokumentasi, TombolHapusDokumentasi } from "@/components/development/dokumentasi-upload";
import { formatRupiah, formatTanggal } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DetailProgramPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const program = await getProgramById(params.id);

  if (!program) notFound();

  const milestones = await getProgramMilestones(program.id);
  const safeProgress = Math.max(0, Math.min(100, program.progress));

  return (
    <div className="space-y-8">
      <Link
        href="/pembangunan"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-village-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-village-600"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Kembali ke daftar program
      </Link>

      <header className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {PROGRAM_KATEGORI_LABELS[program.kategori] ?? program.kategori}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${PROGRAM_STATUS_BADGE_STYLES[program.status]}`}
          >
            {PROGRAM_STATUS_LABELS[program.status]}
          </span>
        </div>

        <h1 className="mt-4 font-[var(--font-lora)] text-3xl font-semibold leading-snug tracking-tight text-slate-900">
          {program.nama}
        </h1>

        {program.deskripsi ? (
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{program.deskripsi}</p>
        ) : null}

        <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              Lokasi
            </dt>
            <dd className="mt-1 text-sm text-slate-900">{program.lokasi ?? "Belum ditentukan"}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
              <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
              Pelaksana
            </dt>
            <dd className="mt-1 text-sm text-slate-900">{program.pelaksana ?? "Belum ditentukan"}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
              <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
              Anggaran
            </dt>
            <dd className="mt-1 text-sm text-slate-900">{formatRupiah(program.anggaran)}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              Periode
            </dt>
            <dd className="mt-1 text-sm text-slate-900">
              {program.tanggalMulai ? formatTanggal(program.tanggalMulai) : "—"}
              {program.tanggalSelesai ? ` s.d. ${formatTanggal(program.tanggalSelesai)}` : ""}
            </dd>
          </div>
        </dl>

        <div className="mt-7">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-700">Progress Pembangunan</span>
            <span className="font-semibold text-slate-900">{safeProgress}%</span>
          </div>
          <div
            className="h-3 w-full overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuenow={safeProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progress pembangunan ${safeProgress} persen`}
          >
            <div className={`h-full rounded-full ${progressTone(safeProgress)}`} style={{ width: `${safeProgress}%` }} />
          </div>
        </div>

        {user.role === "admin" ? (
          <div className="mt-6">
            <UpdateProgressButton
              programId={program.id}
              programNama={program.nama}
              progressSekarang={safeProgress}
              statusSekarang={program.status}
            />
          </div>
        ) : null}
      </header>

      <section aria-labelledby="dokumentasi-heading">
        <h2 id="dokumentasi-heading" className="mb-4 text-lg font-semibold text-slate-900">
          Dokumentasi Lapangan
        </h2>
        <PhotoGallery items={program.dokumentasi} isAdmin={user.role === "admin"} programId={program.id} />
        {user.role === "admin" ? (
          <div className="mt-8">
            <AreaUploadDokumentasi programId={program.id} />
          </div>
        ) : null}
      </section>

      <section aria-labelledby="timeline-heading">
        <h2 id="timeline-heading" className="mb-4 text-lg font-semibold text-slate-900">
          Riwayat Perkembangan
        </h2>
        <MilestoneTimeline milestones={milestones} />
      </section>
    </div>
  );
}