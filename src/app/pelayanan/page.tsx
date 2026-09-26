import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getServiceRequests } from "@/lib/data/requests";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatTanggal } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PelayananPage() {
  const user = await requireUser();
  const requests = await getServiceRequests({ pemohonId: user.id });

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-[var(--font-lora)] text-3xl font-semibold tracking-tight text-slate-900">
            Layanan Administrasi
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Silakan ajukan surat yang Anda butuhkan dan lihat status pengecekan dari perangkat desa
            di bawah ini.
          </p>
        </div>
        <Link
          href="/pelayanan/baru"
          className="inline-flex items-center gap-2 rounded-xl bg-village-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-village-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-village-600"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Ajukan Surat Baru
        </Link>
      </header>

      <section aria-labelledby="riwayat-heading">
        <h2 id="riwayat-heading" className="sr-only">Riwayat Pengajuan Surat</h2>

        {requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-village-50 text-village-600">
              <FileText className="h-6 w-6" aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-semibold text-slate-900">Belum ada pengajuan surat</h3>
            <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
              Ajukan surat pertama Anda. Notifikasi proses akan tampil di sini.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {requests.map((item) => (
              <article
                key={item.id}
                className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                    {formatTanggal(item.createdAt)}
                  </span>
                  <StatusBadge status={item.status} />
                </div>

                <div className="mt-4 grow">
                  <p className="text-xs uppercase tracking-wide text-village-600 font-semibold mb-1">
                    {item.jenisSurat}
                  </p>
                  <h3 className="font-semibold text-slate-900">{item.keperluan}</h3>
                  {item.nomorRegistrasi ? (
                    <p className="mt-2 inline-flex rounded-lg bg-slate-50 px-2.5 py-1 font-mono text-xs font-medium text-slate-600">
                      No: {item.nomorRegistrasi}
                    </p>
                  ) : null}
                </div>

                {item.catatanAdmin ? (
                  <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Tanggapan Desa
                    </p>
                    {item.catatanAdmin}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}