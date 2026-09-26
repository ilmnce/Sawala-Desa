import Link from "next/link";
import { MessageSquare, Plus, Star } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getAspirations } from "@/lib/data/aspirations";
import { CATEGORY_LABELS, ASPIRATION_STATUS_LABELS } from "@/lib/aspiration-constants";
import { StatusBadge } from "@/components/ui/status-badge";
import { SupportButton } from "@/components/aspirations/support-button";
import { formatTanggal } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * Daftar aspirasi untuk warga.
 * Dua bagian: usulan milik sendiri (dengan status terkini) dan usulan warga lain
 * yang dapat didukung. Status di sini dibaca langsung dari database, sehingga
 * perubahan yang dilakukan admin langsung terlihat setelah halaman dimuat ulang.
 */
export default async function AspirasiPage() {
  const user = await requireUser();
  const semua = await getAspirations({ userId: user.id });

  const milikSaya = semua.filter((a) => a.pengusulId === user.id);
  const dariWargaLain = semua.filter((a) => a.pengusulId !== user.id);
  const prioritas = semua.filter((a) => a.prioritas);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-[var(--font-lora)] text-3xl font-semibold tracking-tight text-slate-900">
            Aspirasi & Musdes
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Sampaikan usulan untuk Musyawarah Desa, dukung usulan warga lain, dan pantau status
            usulan Anda.
          </p>
        </div>
        <Link
          href="/aspirasi/baru"
          className="inline-flex items-center gap-2 rounded-xl bg-village-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-village-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-village-600"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Ajukan Usulan
        </Link>
      </header>

      {prioritas.length > 0 ? (
        <section aria-labelledby="prioritas-heading">
          <h2 id="prioritas-heading" className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Star className="h-5 w-5 text-violet-600" aria-hidden="true" />
            Agenda Prioritas Musdes
          </h2>
          <div className="grid gap-3">
            {prioritas.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-violet-200 bg-violet-50/60 p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
                    Prioritas
                  </span>
                  <StatusBadge status={item.status} />
                </div>
                <h3 className="mt-3 font-semibold text-slate-900">{item.judul}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{item.deskripsi}</p>
                <p className="mt-3 text-xs text-slate-500">
                  {item.pengusulNama} · {CATEGORY_LABELS[item.kategori] ?? item.kategori}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="saya-heading">
        <h2 id="saya-heading" className="mb-3 text-lg font-semibold text-slate-900">
          Usulan Saya {milikSaya.length > 0 ? `(${milikSaya.length})` : ""}
        </h2>

        {milikSaya.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-village-50 text-village-600">
              <MessageSquare className="h-6 w-6" aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-semibold text-slate-900">Anda belum mengajukan usulan</h3>
            <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
              Usulan Anda akan tampil di sini beserta status terkini dari perangkat desa.
            </p>
            <Link
              href="/aspirasi/baru"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-village-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-village-700"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Ajukan Usulan Pertama
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {milikSaya.map((item) => (
              <article
                key={item.id}
                className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-slate-500">
                    {CATEGORY_LABELS[item.kategori] ?? item.kategori} · {formatTanggal(item.createdAt)}
                  </span>
                  <StatusBadge status={item.status} />
                </div>
                <h3 className="mt-3 font-semibold text-slate-900">{item.judul}</h3>
                <p className="mt-1 line-clamp-3 flex-1 text-sm leading-6 text-slate-600">
                  {item.deskripsi}
                </p>

                <p className="mt-3 text-xs font-medium text-slate-500">
                  {item.dukungan} warga mendukung
                </p>

                {item.catatanAdmin ? (
                  <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Catatan perangkat desa
                    </p>
                    {item.catatanAdmin}
                  </div>
                ) : null}

                <p className="mt-4 text-xs text-slate-400" aria-live="polite">
                  Status saat ini: {ASPIRATION_STATUS_LABELS[item.status] ?? item.status}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="lain-heading">
        <h2 id="lain-heading" className="mb-3 text-lg font-semibold text-slate-900">
          Usulan Warga Lain
        </h2>

        {dariWargaLain.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-8 text-center text-sm text-slate-500">
            Belum ada usulan dari warga lain. Jadilah yang pertama mengusulkan!
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {dariWargaLain.map((item) => (
              <article
                key={item.id}
                className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-slate-500">
                    {CATEGORY_LABELS[item.kategori] ?? item.kategori} · {formatTanggal(item.createdAt)}
                  </span>
                  <StatusBadge status={item.status} />
                </div>
                <h3 className="mt-3 font-semibold text-slate-900">{item.judul}</h3>
                <p className="mt-1 line-clamp-3 flex-1 text-sm leading-6 text-slate-600">
                  {item.deskripsi}
                </p>
                <p className="mt-3 text-xs text-slate-500">Diusulkan oleh {item.pengusulNama}</p>
                <div className="mt-4">
                  <SupportButton
                    aspirationId={item.id}
                    initialCount={item.dukungan}
                    initiallySupported={item.didukung}
                    isOwner={false}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}