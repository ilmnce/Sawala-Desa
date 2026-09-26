import { getBudgets } from "@/lib/data/budgets";
import { LaporanTransparansi } from "@/components/transparency/laporan-transparansi";

export const dynamic = "force-dynamic";

export default async function TransparansiPage() {
  const items = await getBudgets();

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
      <header className="mb-8 max-w-3xl">
        <h1 className="font-[var(--font-lora)] text-3xl font-semibold tracking-tight text-slate-900">
          Transparansi Anggaran
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Wujud keterbukaan tata kelola keuangan Pemerintah Desa. Seluruh catatan APBDes mulai dari
          pendapatan, rencana belanja, hingga realisasi dapat diakses publik.
        </p>
      </header>

      <LaporanTransparansi items={items} />
    </div>
  );
}