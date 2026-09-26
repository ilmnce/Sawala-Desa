import { requireAdmin } from "@/lib/auth";
import { getServiceRequests } from "@/lib/data/requests";
import { KelolaSurat } from "./kelola-surat";

export const dynamic = "force-dynamic";

export default async function AdminSuratPage() {
  await requireAdmin();
  const items = await getServiceRequests();

  const menunggu = items.filter((i) => i.status === "diajukan").length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-[var(--font-lora)] text-3xl font-semibold tracking-tight text-slate-900">
          Antrean Pelayanan Surat
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Tinjau permohonan administrasi warga lalu keluarkan nomor registrasi resmi saat selesai dicek.
          Update tanggapan yang jelas jika dokumen warga butuh kelengkapan tambahan.
        </p>

        <dl className="mt-4 flex gap-4 text-sm">
          <div className="rounded-xl border border-village-200 bg-village-50 px-4 py-3 flex gap-4 items-center min-w-[200px]">
            <div>
              <dt className="text-xs uppercase font-semibold text-village-700 tracking-wider">Antrean Baru</dt>
              <dd className="font-[var(--font-lora)] text-2xl font-bold text-village-900 mt-1">{menunggu}</dd>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex gap-4 items-center min-w-[200px]">
            <div>
              <dt className="text-xs uppercase font-semibold text-slate-500 tracking-wider">Total Riwayat</dt>
              <dd className="font-[var(--font-lora)] text-2xl font-bold text-slate-900 mt-1">{items.length}</dd>
            </div>
          </div>
        </dl>
      </header>

      <KelolaSurat items={items} />
    </div>
  );
}