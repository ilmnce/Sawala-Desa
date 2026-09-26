import { requireAdmin } from "@/lib/auth";
import { getAllUsers } from "@/lib/data/users";
import { TombolTambahWarga } from "./form";

export const dynamic = "force-dynamic";

export default async function AdminWargaPage() {
  await requireAdmin();
  const users = await getAllUsers("warga");

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="font-[var(--font-lora)] text-3xl font-semibold tracking-tight text-slate-900">
            Data Warga Desa
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Kelola penduduk yang terdaftar di sistem. Pendaftaran akun baru dilakukan melalui
            registrasi langsung di kantor desa.
          </p>
        </div>
        <TombolTambahWarga />
      </header>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-left">
                <th className="px-4 py-3 font-semibold text-slate-600">NIK</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Nama Lengkap</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Alamat</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Pekerjaan</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">Belum ada warga terdaftar.</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-4 font-mono text-xs text-slate-700">{u.nik}</td>
                    <td className="px-4 py-4 font-semibold text-slate-900">{u.namaLengkap}</td>
                    <td className="px-4 py-4 text-slate-600">{u.alamat ?? "-"}</td>
                    <td className="px-4 py-4 text-slate-600">{u.pekerjaan ?? "-"}</td>
                    <td className="px-4 py-4">
                      {u.isActive ? (
                        <span className="rounded-full bg-village-50 px-2.5 py-1 text-[11px] font-bold text-village-700 ring-1 ring-village-200">Aktif</span>
                      ) : (
                        <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 ring-1 ring-rose-200">Nonaktif</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}