import { requireAdmin } from "@/lib/auth";
import { getAspirations } from "@/lib/data/aspirations";
import { KelolaAspirasi } from "./kelola-aspirasi";

export const dynamic = "force-dynamic";

export default async function AdminAspirasiPage() {
  await requireAdmin();
  const items = await getAspirations();

  const menunggu = items.filter((i) => i.status === "menunggu").length;
  const prioritas = items.filter((i) => i.prioritas).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-[var(--font-lora)] text-3xl font-semibold tracking-tight text-slate-900">
          Kelola Aspirasi Warga
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Tinjau usulan warga, tetapkan prioritas Musyawarah Desa, dan perbarui status yang akan
          langsung tersinkron ke dashboard warga.
        </p>
        <dl className="mt-4 flex flex-wrap gap-3 text-sm">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2">
            <dt className="text-xs text-slate-500">Total usulan</dt>
            <dd className="font-semibold text-slate-900">{items.length}</dd>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2">
            <dt className="text-xs text-amber-700">Menunggu diproses</dt>
            <dd className="font-semibold text-amber-800">{menunggu}</dd>
          </div>
          <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2">
            <dt className="text-xs text-violet-700">Prioritas Musdes</dt>
            <dd className="font-semibold text-violet-800">{prioritas}</dd>
          </div>
        </dl>
      </header>

      <KelolaAspirasi items={items} />
    </div>
  );
}