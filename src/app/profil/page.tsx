import { KeyRound, UserRound } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { DataDiriForm, GantiPasswordForm } from "./profil-forms";
import { formatTanggal } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const user = await requireUser();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-[var(--font-lora)] text-3xl font-semibold tracking-tight text-slate-900">
          Akun Warga
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Kelola data diri dan keamanan akun Anda. Perubahan langsung tersimpan pada database desa.
        </p>
      </header>

      <section
        aria-labelledby="ringkas-heading"
        className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm"
      >
        <h2 id="ringkas-heading" className="sr-only">
          Ringkasan akun
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Nama</dt>
            <dd className="mt-1 font-semibold text-slate-900">{user.namaLengkap}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">NIK</dt>
            <dd className="mt-1 font-mono text-sm text-slate-900">{user.nik}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Jenis Kelamin</dt>
            <dd className="mt-1 text-slate-900">{user.jenisKelamin ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Tanggal Lahir</dt>
            <dd className="mt-1 text-slate-900">{formatTanggal(user.tanggalLahir)}</dd>
          </div>
        </dl>
      </section>

      <section
        aria-labelledby="data-diri-heading"
        className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-7"
      >
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-village-50 text-village-700">
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="data-diri-heading" className="text-lg font-semibold text-slate-900">
              Data Diri
            </h2>
            <p className="text-sm text-slate-500">Perbarui alamat dan kontak Anda.</p>
          </div>
        </div>
        <DataDiriForm user={user} />
      </section>

      <section
        aria-labelledby="keamanan-heading"
        className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-7"
      >
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700">
            <KeyRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="keamanan-heading" className="text-lg font-semibold text-slate-900">
              Keamanan Akun
            </h2>
            <p className="text-sm text-slate-500">Ganti password secara berkala.</p>
          </div>
        </div>
        <GantiPasswordForm />
      </section>
    </div>
  );
}