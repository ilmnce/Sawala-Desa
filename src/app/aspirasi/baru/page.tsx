import { redirect } from "next/navigation";
import { MessageSquarePlus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { FormAspirasi } from "./form-aspirasi";

export const dynamic = "force-dynamic";

export default async function AspirasiBaruPage() {
  const user = await requireUser();
  if (user.role === "admin") redirect("/admin/aspirasi");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-village-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-village-700">
          <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden="true" />
          Musdes Digital
        </p>
        <h1 className="font-[var(--font-lora)] text-3xl font-semibold tracking-tight text-slate-900">
          Ajukan Usulan Aspirasi
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Usulan Anda akan masuk ke daftar Musyawarah Desa dan dapat didukung warga lain. Statusnya
          dapat Anda pantau kapan saja.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-7">
        <FormAspirasi />
      </section>
    </div>
  );
}