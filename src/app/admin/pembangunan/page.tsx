import { requireAdmin } from "@/lib/auth";
import { getPrograms } from "@/lib/data/programs";
import { ProgramCatalog } from "@/components/development/program-catalog";
import { TombolTambahProgram } from "./tambah-program";

export const dynamic = "force-dynamic";

export default async function AdminPembangunanPage() {
  await requireAdmin();
  const items = await getPrograms();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-[var(--font-lora)] text-3xl font-semibold tracking-tight text-slate-900">
            Kelola Pembangunan
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Tambahkan program kerja desa, perbarui progress secara berkala, dan dokumentasikan hasil
            di lapangan untuk transparansi publik.
          </p>
        </div>
        <TombolTambahProgram />
      </header>

      <ProgramCatalog items={items} />
    </div>
  );
}