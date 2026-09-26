import { requireAdmin } from "@/lib/auth";
import { getPotentials } from "@/lib/data/potentials";
import { KelolaPotensi } from "./kelola-potensi";

export const dynamic = "force-dynamic";

export default async function AdminPotensiPage() {
  await requireAdmin();
  const items = await getPotentials({ includeDrafts: true });

  const totalUmkm = items.filter((i) => i.kategori === "umkm").length;
  const totalTani = items.filter((i) => i.kategori === "pertanian").length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-[var(--font-lora)] text-3xl font-semibold tracking-tight text-slate-900">
          Kelola Etalase & Potensi Desa
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Tambahkan profil pelapak lokal, UKM, jasa keahlian, hingga hasil bumi untuk dikenalkan di
          katalog digital.
        </p>

        <dl className="mt-4 flex gap-4 text-sm">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex gap-4 items-center">
             <div><dt className="text-xs uppercase font-semibold text-slate-500 tracking-wider">Total Entri</dt><dd className="font-bold text-lg text-slate-900 mt-1">{items.length}</dd></div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex gap-4 items-center">
             <div><dt className="text-xs uppercase font-semibold text-slate-500 tracking-wider">UMKM</dt><dd className="font-bold text-lg text-slate-900 mt-1">{totalUmkm}</dd></div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex gap-4 items-center">
             <div><dt className="text-xs uppercase font-semibold text-slate-500 tracking-wider">Tani/Ternak</dt><dd className="font-bold text-lg text-slate-900 mt-1">{totalTani}</dd></div>
          </div>
        </dl>
      </header>
      <KelolaPotensi items={items} />
    </div>
  );
}