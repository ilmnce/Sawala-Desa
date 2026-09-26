import { redirect } from "next/navigation";
import { FilePlus2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getActiveLetterTypes } from "@/lib/data/letters";
import { FormPengajuanSurat } from "./form-pengajuan";

export const dynamic = "force-dynamic";

export default async function PelayananBaruPage() {
  const user = await requireUser();
  if (user.role === "admin") redirect("/admin/surat");

  const types = await getActiveLetterTypes();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-village-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-village-700">
          <FilePlus2 className="h-3.5 w-3.5" aria-hidden="true" />
          Layanan Administrasi
        </p>
        <h1 className="font-[var(--font-lora)] text-3xl font-semibold tracking-tight text-slate-900">
          Pengajuan Surat Baru
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Isi formulir pengajuan di bawah ini. Dokumen akan diproses oleh perangkat desa pada jam
          kerja dan Anda dapat memantau statusnya.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-7">
        <FormPengajuanSurat types={types} />
      </section>
    </div>
  );
}