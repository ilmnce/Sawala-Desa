"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Filter,
  Loader2,
  PencilLine,
  Plus,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { saveBudgetAction, deleteBudgetAction, type BudgetActionState } from "./actions";
import {
  BUDGET_JENIS,
  BUDGET_JENIS_LABELS,
  BUDGET_JENIS_STYLES,
  BUDGET_KATEGORI,
  BUDGET_KATEGORI_LABELS,
  type BudgetJenis,
  type BudgetKategori,
} from "@/lib/budget-constants";
import type { Budget } from "@/lib/data/budgets";
import { formatRupiah } from "@/lib/format";

interface Props {
  items: Budget[];
}

export function KelolaAnggaran({ items }: Props) {
  const { toast } = useToast();
  const [tahunFilter, setTahunFilter] = useState<number | "semua">("semua");
  const [jenisFilter, setJenisFilter] = useState<BudgetJenis | "semua">("semua");
  const [selected, setSelected] = useState<Budget | null>(null);
  const [isAdd, setIsAdd] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const tahunTersedia = useMemo(() => {
    const list = items.map((i) => i.tahun);
    return [...new Set(list)].sort((a, b) => b - a);
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchTahun = tahunFilter === "semua" || item.tahun === tahunFilter;
      const matchJenis = jenisFilter === "semua" || item.jenis === jenisFilter;
      return matchTahun && matchJenis;
    });
  }, [items, tahunFilter, jenisFilter]);

  async function hapus(id: string) {
    if (pendingDelete) return;
    if (!confirm("Hapus pos anggaran ini secara permanen?")) return;
    setPendingDelete(id);
    const res = await deleteBudgetAction(id);
    if (!res.ok) toast(res.message, "error");
    else toast(res.message, "success");
    setPendingDelete(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 pr-2 text-sm font-semibold text-slate-500">
          <Filter className="h-4 w-4" aria-hidden="true" />
          Filter:
        </div>
        <select
          value={tahunFilter}
          onChange={(e) =>
            setTahunFilter(e.target.value === "semua" ? "semua" : Number(e.target.value))
          }
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none transition focus:border-village-500 focus:bg-white focus:ring-4 focus:ring-village-500/10"
        >
          <option value="semua">Semua tahun</option>
          {tahunTersedia.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={jenisFilter}
          onChange={(e) => setJenisFilter(e.target.value as BudgetJenis | "semua")}
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none transition focus:border-village-500 focus:bg-white focus:ring-4 focus:ring-village-500/10"
        >
          <option value="semua">Semua jenis transaksi</option>
          {BUDGET_JENIS.map((t) => (
            <option key={t} value={t}>{BUDGET_JENIS_LABELS[t]}</option>
          ))}
        </select>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setIsAdd(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-village-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-village-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-village-600"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Catat Transaksi
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[50rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-left">
                <th scope="col" className="px-4 py-3 font-semibold text-slate-600">Tahun</th>
                <th scope="col" className="px-4 py-3 font-semibold text-slate-600">Jenis</th>
                <th scope="col" className="px-4 py-3 font-semibold text-slate-600">Uraian & Kategori</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold text-slate-600">Nilai (Rp)</th>
                <th scope="col" className="w-24 px-4 py-3 text-right font-semibold text-slate-600">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <Wallet className="mx-auto mb-2 h-8 w-8 text-slate-300" aria-hidden="true" />
                    Belum ada pencatatan anggaran untuk filter ini.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-4 font-medium text-slate-900">{item.tahun}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ring-1 ring-inset ${BUDGET_JENIS_STYLES[item.jenis]}`}>
                        {BUDGET_JENIS_LABELS[item.jenis]}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-900">{item.uraian}</p>
                      <p className="text-xs text-slate-500">{BUDGET_KATEGORI_LABELS[item.kategori]}</p>
                    </td>
                    <td className="px-4 py-4 text-right font-mono font-semibold text-slate-700">
                      {formatRupiah(item.jumlah)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelected(item)}
                          title="Edit"
                          className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-village-300 hover:text-village-700"
                        >
                          <PencilLine className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void hapus(item.id)}
                          disabled={pendingDelete === item.id}
                          title="Hapus"
                          className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-rose-300 hover:text-rose-600 disabled:opacity-50"
                        >
                          {pendingDelete === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                          ) : (
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Menampilkan {filtered.length} transaksi dari total {items.length}. Transaksi ini otomatis
        meringkas statistik transparansi di portal publik.
      </p>

      {isAdd || selected ? (
        <BudgetModal item={selected} onClose={() => { setIsAdd(false); setSelected(null); }} />
      ) : null}
    </div>
  );
}

function BudgetModal({ item, onClose }: { item: Budget | null; onClose: () => void }) {
  const router = useRouter();
  const [state, setState] = useState<BudgetActionState>({ ok: false, message: "" });
  const [pending, setPending] = useState(false);
  const [jumlahStr, setJumlahStr] = useState(item ? new Intl.NumberFormat("id-ID").format(item.jumlah) : "");
  const [jenis, setJenis] = useState<BudgetJenis>(item?.jenis ?? "belanja");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (item) formData.set("id", item.id);

    setPending(true);
    setState({ ok: false, message: "" });
    try {
      const result = await saveBudgetAction(state, formData);
      setState(result);
      if (result.ok) {
        setTimeout(() => onClose(), 800);
      }
    } catch {
      setState({ ok: false, message: "Terjadi kesalahan tak terduga." });
    } finally {
      setPending(false);
    }
  }

  const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-village-500 focus:ring-4 focus:ring-village-500/10";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} aria-label="Tutup" />
      <div role="dialog" aria-modal="true" className="relative w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-8">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-lg p-2 text-slate-500 hover:bg-slate-100">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
        <h2 className="font-[var(--font-lora)] text-2xl font-semibold text-slate-900">
          {item ? "Edit Pencatatan Anggaran" : "Catat Transaksi APBDes"}
        </h2>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="tahun" className="mb-1.5 block text-sm font-semibold text-slate-700">Tahun Anggaran</label>
              <input id="tahun" name="tahun" type="number" defaultValue={item?.tahun ?? new Date().getFullYear()} className={inputClass} />
            </div>
            <div>
              <label htmlFor="jenis" className="mb-1.5 block text-sm font-semibold text-slate-700">Jenis Transaksi</label>
              <select id="jenis" name="jenis" value={jenis} onChange={(e) => setJenis(e.target.value as BudgetJenis)} className={inputClass}>
                {BUDGET_JENIS.map((j) => (
                  <option key={j} value={j}>{BUDGET_JENIS_LABELS[j]}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="kategori" className="mb-1.5 block text-sm font-semibold text-slate-700">Kategori</label>
            <select id="kategori" name="kategori" defaultValue={item?.kategori ?? "umum"} className={inputClass}>
              {BUDGET_KATEGORI.map((k) => (
                <option key={k} value={k}>{BUDGET_KATEGORI_LABELS[k]}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="uraian" className="mb-1.5 block text-sm font-semibold text-slate-700">Uraian / Deskripsi</label>
            <input id="uraian" name="uraian" defaultValue={item?.uraian ?? ""} placeholder="Contoh: Dana Desa Tahap 1" className={inputClass} />
          </div>
          <div>
            <label htmlFor="jumlah" className="mb-1.5 block text-sm font-semibold text-slate-700">Nilai (Rupiah)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">Rp</span>
              <input
                id="jumlah"
                name="jumlah"
                value={jumlahStr}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setJumlahStr(val ? new Intl.NumberFormat("id-ID").format(Number(val)) : "");
                }}
                placeholder="0"
                className={`${inputClass} pl-11`}
              />
            </div>
          </div>
          {state.message ? (
            <p role={state.ok ? "status" : "alert"} className={`flex items-center gap-2 rounded-xl p-3 text-sm ${state.ok ? "bg-village-50 text-village-800" : "bg-rose-50 text-rose-700"}`}>
              {state.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {state.message}
            </p>
          ) : null}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={pending} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-village-600 py-3 font-semibold text-white hover:bg-village-700 disabled:opacity-70">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan Pencatatan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}