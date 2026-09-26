"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, CalendarRange, MapPin, Search, Wallet } from "lucide-react";
import {
  PROGRAM_KATEGORI_LABELS,
  PROGRAM_STATUSES,
  PROGRAM_STATUS_BADGE_STYLES,
  PROGRAM_STATUS_LABELS,
  progressTone,
  type ProgramKategori,
  type ProgramStatus,
} from "@/lib/program-constants";
import type { DevelopmentProgram } from "@/lib/data/programs";
import { formatRupiahRingkas, formatTanggal } from "@/lib/format";

function ProgressBar({ value }: { value: number }) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={safe}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progress pembangunan ${safe} persen`}
      >
        <div className={`h-full rounded-full ${progressTone(safe)}`} style={{ width: `${safe}%` }} />
      </div>
      <span className="w-10 shrink-0 text-right text-xs font-semibold text-slate-600">{safe}%</span>
    </div>
  );
}

function StatusChip({ status }: { status: ProgramStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${PROGRAM_STATUS_BADGE_STYLES[status]}`}
    >
      {PROGRAM_STATUS_LABELS[status]}
    </span>
  );
}

/** Katalog program kerja dengan pencarian & filter status. */
export function ProgramCatalog({ items }: { items: DevelopmentProgram[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProgramStatus | "semua">("semua");
  const [kategoriFilter, setKategoriFilter] = useState<ProgramKategori | "semua">("semua");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchStatus = statusFilter === "semua" || item.status === statusFilter;
      const matchKategori = kategoriFilter === "semua" || item.kategori === kategoriFilter;
      const matchQuery =
        q.length === 0 ||
        item.nama.toLowerCase().includes(q) ||
        (item.lokasi ?? "").toLowerCase().includes(q) ||
        (item.pelaksana ?? "").toLowerCase().includes(q);
      return matchStatus && matchKategori && matchQuery;
    });
  }, [items, query, statusFilter, kategoriFilter]);

  const ringkasan = useMemo(() => {
    if (items.length === 0) return { rata: 0, totalAnggaran: 0 };
    return {
      rata: Math.round(items.reduce((s, i) => s + i.progress, 0) / items.length),
      totalAnggaran: items.reduce((s, i) => s + i.anggaran, 0),
    };
  }, [items]);

  return (
    <div className="space-y-5">
      <dl className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <dt className="text-sm text-slate-500">Total Program</dt>
          <dd className="mt-1.5 font-[var(--font-lora)] text-2xl font-semibold text-slate-900">
            {items.length}
          </dd>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <dt className="text-sm text-slate-500">Rata-rata Progress</dt>
          <dd className="mt-1.5 font-[var(--font-lora)] text-2xl font-semibold text-slate-900">
            {ringkasan.rata}%
          </dd>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <dt className="text-sm text-slate-500">Total Anggaran Program</dt>
          <dd className="mt-1.5 font-[var(--font-lora)] text-2xl font-semibold text-slate-900">
            {formatRupiahRingkas(ringkasan.totalAnggaran)}
          </dd>
        </div>
      </dl>

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
            placeholder="Cari nama program, lokasi, atau pelaksana..."
            aria-label="Cari program pembangunan"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-village-500 focus:ring-4 focus:ring-village-500/10"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ProgramStatus | "semua")}
          aria-label="Filter status program"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-village-500 focus:ring-4 focus:ring-village-500/10"
        >
          <option value="semua">Semua status</option>
          {PROGRAM_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PROGRAM_STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        <select
          value={kategoriFilter}
          onChange={(e) => setKategoriFilter(e.target.value as ProgramKategori | "semua")}
          aria-label="Filter kategori program"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-village-500 focus:ring-4 focus:ring-village-500/10"
        >
          <option value="semua">Semua kategori</option>
          {Object.entries(PROGRAM_KATEGORI_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-village-50 text-village-600">
            <Building2 className="h-6 w-6" aria-hidden="true" />
          </span>
          <h3 className="mt-4 font-semibold text-slate-900">
            {items.length === 0 ? "Belum ada program pembangunan" : "Tidak ada program yang cocok"}
          </h3>
          <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
            {items.length === 0
              ? "Program kerja desa akan tampil di sini setelah ditambahkan perangkat desa."
              : "Ubah kata kunci atau filter untuk melihat program lainnya."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {PROGRAM_KATEGORI_LABELS[item.kategori] ?? item.kategori}
                </span>
                <StatusChip status={item.status} />
              </div>

              <h3 className="mt-3 font-semibold leading-snug text-slate-900">{item.nama}</h3>
              {item.deskripsi ? (
                <p className="mt-1.5 line-clamp-2 flex-1 text-sm leading-6 text-slate-500">
                  {item.deskripsi}
                </p>
              ) : (
                <div className="flex-1" />
              )}

              <dl className="mt-4 space-y-2 text-xs text-slate-500">
                {item.lokasi ? (
                  <div className="flex items-center gap-1.5">
                    <dt className="sr-only">Lokasi</dt>
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    <dd>{item.lokasi}</dd>
                  </div>
                ) : null}
                <div className="flex items-center gap-1.5">
                  <dt className="sr-only">Anggaran</dt>
                  <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
                  <dd>{formatRupiahRingkas(item.anggaran)}</dd>
                </div>
                <div className="flex items-center gap-1.5">
                  <dt className="sr-only">Tanggal</dt>
                  <CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />
                  <dd>
                    {item.tanggalMulai ? formatTanggal(item.tanggalMulai) : "Belum dijadwalkan"}
                    {item.tanggalSelesai ? ` — ${formatTanggal(item.tanggalSelesai)}` : ""}
                  </dd>
                </div>
              </dl>

              <div className="mt-4">
                <ProgressBar value={item.progress} />
              </div>

              <Link
                href={`/pembangunan/${item.id}`}
                className="mt-4 inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-village-300 hover:text-village-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-village-600"
              >
                Lihat Detail
              </Link>
            </article>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-500" aria-live="polite">
        Menampilkan {filtered.length} dari {items.length} program.
      </p>
    </div>
  );
}