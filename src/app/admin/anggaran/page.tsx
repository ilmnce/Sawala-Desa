import { requireAdmin } from "@/lib/auth";
import { getBudgets } from "@/lib/data/budgets";
import { KelolaAnggaran } from "./kelola-anggaran";
import { formatRupiahRingkas } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminAnggaranPage() {
  await requireAdmin();
  const items = await getBudgets();

  const tahunIni = new Date().getFullYear();
  const dataTahunIni = items.filter((i) => i.tahun === tahunIni);

  const pendapatan = dataTahunIni.filter((i) => i.jenis === "pendapatan").reduce((s, i) => s + i.jumlah, 0);
  const belanja = dataTahunIni.filter((i) => i.jenis === "belanja").reduce((s, i) => s + i.jumlah, 0);
  const realisasi = dataTahunIni.filter((i) => i.jenis === "realisasi").reduce((s, i) => s + i.jumlah, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-[var(--font-lora)] text-3xl font-semibold tracking-tight text-slate-900">
          Kelola Transparansi APBDes
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Pencatatan pendapatan, rencana belanja, dan realisasi anggaran desa. Data ini langsung
          mempengaruhi statistik keterbukaan informasi di halaman publik untuk dibaca warga.
        </p>

        <dl className="mt-5 flex flex-wrap gap-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
            <dt className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Pendapatan {tahunIni}</dt>
            <dd className="mt-1 font-mono text-xl font-bold text-emerald-900">{formatRupiahRingkas(pendapatan)}</dd>
          </div>
          <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4">
            <dt className="text-xs font-semibold uppercase tracking-wider text-sky-700">Rencana Belanja {tahunIni}</dt>
            <dd className="mt-1 font-mono text-xl font-bold text-sky-900">{formatRupiahRingkas(belanja)}</dd>
          </div>
          <div className="rounded-2xl border border-village-200 bg-village-50/50 p-4">
            <dt className="text-xs font-semibold uppercase tracking-wider text-village-700">Realisasi {tahunIni}</dt>
            <dd className="mt-1 font-mono text-xl font-bold text-village-900">{formatRupiahRingkas(realisasi)}</dd>
          </div>
        </dl>
      </header>

      <KelolaAnggaran items={items} />
    </div>
  );
}