import { requireUser } from "@/lib/auth";
import { getPrograms } from "@/lib/data/programs";
import { ProgramCatalog } from "@/components/development/program-catalog";

export const dynamic = "force-dynamic";

export default async function PembangunanPage() {
  await requireUser();
  const items = await getPrograms();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-[var(--font-lora)] text-3xl font-semibold tracking-tight text-slate-900">
          Pembangunan Desa
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Pantau program kerja fisik dan non-fisik desa beserta progress dan dokumentasi lapangan.
        </p>
      </header>

      <ProgramCatalog items={items} />
    </div>
  );
}