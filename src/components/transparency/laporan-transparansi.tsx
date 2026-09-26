"use client";

import { useMemo, useState } from "react";
import { formatRupiah, formatRupiahRingkas } from "@/lib/format";
import {
  BUDGET_KATEGORI,
  BUDGET_KATEGORI_LABELS,
  type BudgetKategori,
} from "@/lib/budget-constants";
import type { Budget } from "@/lib/data/budgets";

function ProgressKategori({ label, realisasi, plafond }: { label: string; realisasi: number; plafond: number }) {
  const persen = plafond > 0 ? Math.min(100, Math.round((realisasi / plafond) * 100)) : 0;
  const sisa = Math.max(0, plafond - realisasi);

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <p className="font-semibold text-slate-900">{label}</p>
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          {persen}% serapan
        </span>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-slate-500">Realisasi</span>
          <span className="font-medium text-slate-900">{formatRupiahRingkas(realisasi)}</span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuenow={persen}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full rounded-full bg-village-600 transition-all" style={{ width: `${persen}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
          <span>Plafond: {formatRupiahRingkas(plafond)}</span>
          <span>Sisa: {formatRupiahRingkas(sisa)}</span>
        </div>
      </div>
    </div>
  );
}

export function LaporanTransparansi({ items }: { items: Budget[] }) {
  const years = useMemo(() => {
    const list = items.map((i) => i.tahun);
    const start = new Date().getFullYear();
    const set = new Set([start, ...list]);
    return Array.from(set).sort((a, b) => b - a);
  }, [items]);

  const [tahun, setTahun] = useState<number>(years[0] ?? new Date().getFullYear());

  const dataTahun = useMemo(() => items.filter((i) => i.tahun === tahun), [items, tahun]);

  const ringkasan = useMemo(() => {
    let pendapatan = 0;
    let belanja = 0;
    let realisasi = 0;

    const perKategori: Record<BudgetKategori, { plafond: number; realisasi: number }> = {
      umum: { plafond: 0, realisasi: 0 },
      infrastruktur: { plafond: 0, realisasi: 0 },
      pendidikan: { plafond: 0, realisasi: 0 },
      kesehatan: { plafond: 0, realisasi: 0 },
      pemberdayaan: { plafond: 0, realisasi: 0 },
      "bantuan-sosial": { plafond: 0, realisasi: 0 },
      operasional: { plafond: 0, realisasi: 0 },
    };

    for (const item of dataTahun) {
      if (item.jenis === "pendapatan") pendapatan += item.jumlah;
      if (item.jenis === "belanja") {
        belanja += item.jumlah;
        perKategori[item.kategori].plafond += item.jumlah;
      }
      if (item.jenis === "realisasi") {
        realisasi += item.jumlah;
        perKategori[item.kategori].realisasi += item.jumlah;
      }
    }

    return { pendapatan, belanja, realisasi, perKategori };
  }, [dataTahun]);

  const totalPersen = ringkasan.belanja > 0 ? Math.round((ringkasan.realisasi / ringkasan.belanja) * 100) : 0;
  const sisaKas = ringkasan.pendapatan - ringkasan.realisasi;

  const realisasiLog = useMemo(() => {
    return dataTahun.filter((i) => i.jenis === "realisasi").sort((a, b) => b.jumlah - a.jumlah);
  }, [dataTahun]);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <label htmlFor="pilih-tahun" className="text-sm font-semibold text-slate-700">
          Tahun Laporan:
        </label>
        <select
          id="pilih-tahun"
          value={tahun}
          onChange={(e) => setTahun(Number(e.target.value))}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-village-700 shadow-sm outline-none transition focus:border-village-500 focus:ring-4 focus:ring-village-500/10"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <dt className="text-sm text-slate-500">Total Pendapatan</dt>
          <dd className="mt-1.5 font-[var(--font-lora)] text-2xl font-semibold text-slate-900">
            {formatRupiahRingkas(ringkasan.pendapatan)}
          </dd>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <dt className="text-sm text-slate-500">Plafond Belanja</dt>
          <dd className="mt-1.5 font-[var(--font-lora)] text-2xl font-semibold text-slate-900">
            {formatRupiahRingkas(ringkasan.belanja)}
          </dd>
        </div>
        <div className="rounded-2xl border border-village-200 bg-village-50 p-5 shadow-sm">
          <dt className="text-sm text-village-700">Realisasi Serapan</dt>
          <dd className="mt-1.5 font-[var(--font-lora)] text-2xl font-semibold text-village-900">
            {formatRupiahRingkas(ringkasan.realisasi)}
          </dd>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <dt className="flex items-center justify-between text-sm text-slate-500">
            Sisa Kas / SILPA
          </dt>
          <dd className="mt-1.5 font-[var(--font-lora)] text-2xl font-semibold text-slate-900">
            {formatRupiahRingkas(sisaKas)}
          </dd>
        </div>
      </div>

      <section aria-labelledby="rincian-heading" className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="rincian-heading" className="text-lg font-semibold text-slate-900">
              Rincian Serapan per Bidang
            </h2>
            <p className="mt-1 text-sm text-slate-500">Serapan total mencapai {totalPersen}% dari APBDes.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BUDGET_KATEGORI.map((key) => {
            const data = ringkasan.perKategori[key];
            if (data.plafond === 0 && data.realisasi === 0) return null;
            return <ProgressKategori key={key} label={BUDGET_KATEGORI_LABELS[key]} {...data} />;
          })}
        </div>

        {Object.values(ringkasan.perKategori).every((d) => d.plafond === 0 && d.realisasi === 0) ? (
          <p className="py-8 text-center text-sm text-slate-500">Belum ada rincian alokasi belanja untuk tahun ini.</p>
        ) : null}
      </section>

      <section aria-labelledby="log-heading">
        <h2 id="log-heading" className="mb-4 text-lg font-semibold text-slate-900">
          Catatan Pengeluaran Terbesar
        </h2>
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-left">
                  <th scope="col" className="px-4 py-3 font-semibold text-slate-600">Uraian Transaksi</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-slate-600">Bidang</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold text-slate-600">Nilai Keluar (Rp)</th>
                </tr>
              </thead>
              <tbody>
                {realisasiLog.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                      Belum ada catatan realisasi belanja.
                    </td>
                  </tr>
                ) : (
                  realisasiLog.slice(0, 10).map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                      <td className="px-4 py-3.5 font-medium text-slate-900">{item.uraian}</td>
                      <td className="px-4 py-3.5 text-slate-500">{BUDGET_KATEGORI_LABELS[item.kategori]}</td>
                      <td className="px-4 py-3.5 text-right font-mono font-medium text-slate-700">{formatRupiah(item.jumlah)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}