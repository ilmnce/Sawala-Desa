import { getPotentials } from "@/lib/data/potentials";
import { PotentialCatalog } from "@/components/potentials/potential-catalog";

export const dynamic = "force-dynamic";

export default async function PotensiDesaPage() {
  const items = await getPotentials();

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
      <header className="mb-8 max-w-3xl">
        <h1 className="font-[var(--font-lora)] text-3xl font-semibold tracking-tight text-slate-900">
          Potensi & Etalase Desa
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Kenali lebih dekat berbagai produk UMKM unggulan, hasil bumi pertanian dan peternakan,
          hingga layanan jasa dari warga asli desa. Dukung pergerakan ekonomi lokal!
        </p>
      </header>

      <PotentialCatalog items={items} />
    </div>
  );
}