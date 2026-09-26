"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Filter, Loader2, PencilLine, Plus, Search, Store, Trash2, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { savePotentialAction, deletePotentialAction, type PotentialActionState } from "./actions";
import { POTENTIAL_KATEGORI, POTENTIAL_KATEGORI_LABELS, type PotentialKategori } from "@/lib/potential-constants";
import type { VillagePotential } from "@/lib/data/potentials";

export function KelolaPotensi({ items }: { items: VillagePotential[] }) {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [kategoriFilter, setKategoriFilter] = useState<PotentialKategori | "semua">("semua");
  const [selected, setSelected] = useState<VillagePotential | null>(null);
  const [isAdd, setIsAdd] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchKategori = kategoriFilter === "semua" || item.kategori === kategoriFilter;
      const matchQuery = q.length === 0 || item.nama.toLowerCase().includes(q) || (item.pemilik ?? "").toLowerCase().includes(q);
      return matchKategori && matchQuery;
    });
  }, [items, query, kategoriFilter]);

  async function hapus(id: string) {
    if (pendingDelete) return;
    if (!confirm("Hapus entri ini secara permanen?")) return;
    setPendingDelete(id);
    const res = await deletePotentialAction(id);
    if (!res.ok) toast(res.message, "error");
    else toast(res.message, "success");
    setPendingDelete(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nama usaha atau pemilik..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-village-500 focus:ring-4 focus:ring-village-500/10" />
        </div>
        <select value={kategoriFilter} onChange={(e) => setKategoriFilter(e.target.value as PotentialKategori | "semua")} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none">
          <option value="semua">Semua Kategori</option>
          {POTENTIAL_KATEGORI.map(k => <option key={k} value={k}>{POTENTIAL_KATEGORI_LABELS[k]}</option>)}
        </select>
        <button onClick={() => setIsAdd(true)} className="inline-flex items-center gap-2 rounded-xl bg-village-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-village-700">
          <Plus className="h-4 w-4" /> Entri Baru
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[50rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-left">
                <th className="px-4 py-3 font-semibold text-slate-600">Nama Usaha / Profil</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Aktor / Pemilik</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Kontak</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Terbit</th>
                <th className="w-24 px-4 py-3 text-right font-semibold text-slate-600">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                  <td className="px-4 py-4"><p className="font-semibold text-slate-900">{item.nama}</p><p className="text-xs text-slate-500">{POTENTIAL_KATEGORI_LABELS[item.kategori]}</p></td>
                  <td className="px-4 py-4 font-medium text-slate-700">{item.pemilik || "-"}</td>
                  <td className="px-4 py-4 text-slate-600 font-mono text-xs">{item.kontak || "-"}</td>
                  <td className="px-4 py-4">{item.isPublished ? <span className="text-emerald-700 bg-emerald-50 px-2 rounded-full ring-1 ring-emerald-200 text-xs font-semibold">Tampil</span> : <span className="text-slate-500 bg-slate-100 px-2 rounded-full ring-1 ring-slate-200 text-xs font-semibold">Draft</span>}</td>
                  <td className="px-4 py-4 text-right flex items-center justify-end gap-2">
                    <button onClick={() => setSelected(item)} className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:text-village-600"><PencilLine className="w-4 h-4"/></button>
                    <button onClick={() => hapus(item.id)} disabled={pendingDelete === item.id} className="p-2 border border-slate-200 rounded-lg text-rose-500 hover:text-rose-600 disabled:opacity-50"><Trash2 className="w-4 h-4"/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {isAdd || selected ? (
        <PotensiModal item={selected} onClose={() => { setIsAdd(false); setSelected(null); }} />
      ) : null}
    </div>
  );
}

function PotensiModal({ item, onClose }: { item: VillagePotential | null; onClose: () => void }) {
  const router = useRouter();
  const [state, setState] = useState<PotentialActionState>({ ok: false, message: "" });
  const [pending, setPending] = useState(false);
  const [kategori, setKategori] = useState<PotentialKategori>(item?.kategori ?? "umkm");
  const [isPublished, setIsPublished] = useState(item ? item.isPublished : true);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (item) formData.set("id", item.id);
    formData.set("is_published", String(isPublished));

    setPending(true);
    const result = await savePotentialAction({ ok: false, message: "" }, formData);
    setState(result);
    setPending(false);
    if (result.ok) setTimeout(() => onClose(), 800);
  }

  const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-village-500 focus:ring-4 focus:ring-village-500/10";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" className="relative w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl">
        <h2 className="font-[var(--font-lora)] text-xl font-semibold text-slate-900 pr-8">{item ? "Edit Profil" : "Tambah Entri Potensi Desa"}</h2>
        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div><label className="mb-1.5 block text-sm font-semibold text-slate-700">Nama Usaha / Keahlian</label><input name="nama" defaultValue={item?.nama} required className={inputClass} /></div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Kategori</label>
            <select name="kategori" value={kategori} onChange={e => setKategori(e.target.value as PotentialKategori)} className={inputClass}>
              {POTENTIAL_KATEGORI.map(k => <option key={k} value={k}>{POTENTIAL_KATEGORI_LABELS[k]}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div><label className="mb-1.5 block text-sm font-semibold text-slate-700">Nama Pemilik</label><input name="pemilik" defaultValue={item?.pemilik ?? ""} className={inputClass} /></div>
             <div><label className="mb-1.5 block text-sm font-semibold text-slate-700">WhatsApp / Telp</label><input name="kontak" defaultValue={item?.kontak ?? ""} className={inputClass} /></div>
          </div>
          <div><label className="mb-1.5 block text-sm font-semibold text-slate-700">Alamat Lapak / Lokasi</label><input name="alamat" defaultValue={item?.alamat ?? ""} className={inputClass} /></div>
          <div><label className="mb-1.5 block text-sm font-semibold text-slate-700">Deskripsi Layanan & Produk</label><textarea name="deskripsi" defaultValue={item?.deskripsi ?? ""} rows={3} className={inputClass} /></div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} className="rounded" /> Terbit & tampil di Publik
          </label>
          {state.message && <p className={`p-2 text-sm rounded ${state.ok ? 'bg-village-50 text-village-800' : 'bg-rose-50 text-rose-700'}`}>{state.message}</p>}
          <div className="flex justify-end gap-3"><button type="submit" disabled={pending} className="px-5 py-2 rounded-xl bg-village-600 text-white font-semibold flex items-center gap-2">{pending ? <Loader2 className="w-4 h-4 animate-spin"/> : "Simpan Etalase"}</button></div>
        </form>
      </div>
    </div>
  )
}