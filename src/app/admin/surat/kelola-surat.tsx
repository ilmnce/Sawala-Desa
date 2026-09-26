"use client";

import { useMemo, useState, useRef, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  FileSearch,
  Filter,
  Loader2,
  PencilLine,
  Search,
  X,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatTanggal } from "@/lib/format";
import type { RequestStatus, ServiceRequest } from "@/lib/data/requests";

const STATUS_OPTIONS: RequestStatus[] = ["diajukan", "diproses", "disetujui", "ditolak"];
const STATUS_LABELS: Record<RequestStatus, string> = {
  diajukan: "Menunggu Diproses",
  diproses: "Sedang Diproses",
  disetujui: "Disetujui",
  ditolak: "Ditolak / Berkas Kurang",
};

export function KelolaSurat({ items }: { items: ServiceRequest[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "semua">("semua");
  const [selected, setSelected] = useState<ServiceRequest | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchStatus = statusFilter === "semua" || item.status === statusFilter;
      const matchQuery =
        q.length === 0 ||
        item.pemohonNama.toLowerCase().includes(q) ||
        item.pemohonNik.toLowerCase().includes(q) ||
        (item.nomorRegistrasi ?? "").toLowerCase().includes(q) ||
        item.jenisSurat.toLowerCase().includes(q);
      return matchStatus && matchQuery;
    });
  }, [items, query, statusFilter]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari pemohon, NIK, atau no reg..."
            aria-label="Cari pengajuan surat"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-village-500 focus:ring-4 focus:ring-village-500/10"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as RequestStatus | "semua")}
            aria-label="Filter status pengajuan"
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-village-500 focus:bg-white focus:ring-4 focus:ring-village-500/10"
          >
            <option value="semua">Semua Status</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-village-50 text-village-600">
            <FileSearch className="h-6 w-6" aria-hidden="true" />
          </span>
          <h3 className="mt-4 font-semibold text-slate-900">Tidak ada pengajuan surat</h3>
          <p className="mt-1 text-sm text-slate-500">
            {items.length === 0 ? "Belum ada antrean permohonan dari warga." : "Ubah kata kunci pencarian Anda."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[54rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-600">Pemohon</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Jenis Surat</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Registrasi & Waktu</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/60 last:border-0">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-900">{item.pemohonNama}</p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{item.pemohonNik}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-slate-900">{item.jenisSurat}</p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1 max-w-[14rem]" title={item.keperluan}>{item.keperluan}</p>
                    </td>
                    <td className="px-4 py-4">
                      {item.nomorRegistrasi ? (
                        <p className="text-xs font-mono font-medium text-slate-700 bg-slate-100 rounded px-1.5 py-0.5 w-max mb-1">{item.nomorRegistrasi}</p>
                      ) : (
                        <p className="text-xs text-slate-400 mb-1 italic">Belum diregistrasi</p>
                      )}
                      <p className="text-xs text-slate-500">{formatTanggal(item.createdAt)}</p>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelected(item)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-village-300 hover:text-village-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-village-600"
                      >
                        <PencilLine className="h-3.5 w-3.5" aria-hidden="true" />
                        Validasi
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && <ModalValidasiSurat item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function ModalValidasiSurat({ item, onClose }: { item: ServiceRequest; onClose: () => void }) {
  const router = useRouter();
  const [status, setStatus] = useState<RequestStatus>(item.status);
  const [catatan, setCatatan] = useState(item.catatanAdmin ?? "");
  const [nomorReg, setNomorReg] = useState(item.nomorRegistrasi ?? "");
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<{ ok: boolean; message: string; fieldErrors?: Record<string, string> }>({ ok: false, message: "" });

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prevFocus?.focus();
    };
  }, [onClose]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setState({ ok: false, message: "" });
    try {
      const res = await fetch(`/api/pelayanan/${item.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          catatan_admin: catatan,
          nomor_registrasi: nomorReg
        })
      });
      const payload = await res.json();
      if (!res.ok) {
        setState({ ok: false, message: payload?.error ?? "Gagal", fieldErrors: payload?.fieldErrors });
        return;
      }
      setState({ ok: true, message: payload?.message ?? "Tersimpan" });
      setTimeout(() => { onClose(); router.refresh(); }, 800);
    } catch {
      setState({ ok: false, message: "Koneksi terputus." });
    } finally {
      setPending(false);
    }
  }

  const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-village-500 focus:ring-4 focus:ring-village-500/10 disabled:bg-slate-50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} aria-label="Tutup" />
      <div ref={dialogRef} role="dialog" aria-modal="true" className="relative w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl">
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Tutup" className="absolute right-4 top-4 rounded-lg p-2 text-slate-500 hover:bg-slate-100">
          <X className="h-5 w-5" />
        </button>
        <h2 className="font-[var(--font-lora)] text-xl font-semibold text-slate-900 pr-8">Validasi Pengajuan Surat</h2>
        <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm">
          <p className="font-semibold text-slate-800">{item.pemohonNama} <span className="font-normal font-mono text-slate-500 ml-1">({item.pemohonNik})</span></p>
          <p className="mt-2 font-medium text-slate-700">{item.jenisSurat}</p>
          <p className="text-slate-600 italic">&quot;{item.keperluan}&quot;</p>
          {item.keteranganPemohon && <p className="mt-3 text-slate-500 border-t border-slate-200 pt-3 text-xs leading-relaxed">{item.keteranganPemohon}</p>}
        </div>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Status Validasi</label>
            <select value={status} onChange={e => setStatus(e.target.value as RequestStatus)} disabled={pending} className={inputClass}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Nomor Registrasi Surat <span className="text-normal text-slate-400 font-normal">(wajib jika disetujui)</span></label>
            <input value={nomorReg} onChange={e => setNomorReg(e.target.value)} disabled={pending} placeholder="045.2/XX/Desa/2026" className={inputClass} aria-invalid={Boolean(state.fieldErrors?.nomor_registrasi)} />
            {state.fieldErrors?.nomor_registrasi && <p className="mt-1 text-xs text-rose-600" role="alert">{state.fieldErrors.nomor_registrasi}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Catatan Tanggapan <span className="text-normal text-slate-400 font-normal">(wajib jika ditolak)</span></label>
            <textarea value={catatan} onChange={e => setCatatan(e.target.value)} disabled={pending} placeholder="Cantumkan dokumen apa saja yang kurang / kapan surat bisa di ambil..." rows={3} className={inputClass} aria-invalid={Boolean(state.fieldErrors?.catatan_admin)} />
            {state.fieldErrors?.catatan_admin && <p className="mt-1 text-xs text-rose-600" role="alert">{state.fieldErrors.catatan_admin}</p>}
          </div>

          {state.message && (
             <p role={state.ok ? "status" : "alert"} className={`flex items-center gap-2 p-3 text-sm rounded-xl ${state.ok ? 'bg-village-50 text-village-800' : 'bg-rose-50 text-rose-700'}`}>
               {state.ok ? <CheckCircle2 className="w-4 h-4"/> : <AlertCircle className="w-4 h-4"/>}
               {state.message}
             </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
             <button type="button" onClick={onClose} disabled={pending} className="px-4 py-2 text-sm font-semibold rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 transition">Batal</button>
             <button type="submit" disabled={pending} className="flex gap-2 items-center px-5 py-2 text-sm font-semibold rounded-xl text-white bg-village-600 hover:bg-village-700 disabled:opacity-50 transition">
               {pending ? <Loader2 className="w-4 h-4 animate-spin"/> : "Simpan Validasi"}
             </button>
          </div>
        </form>
      </div>
    </div>
  )
}