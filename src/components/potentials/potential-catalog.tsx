"use client";

import { useMemo, useState } from "react";
import { MessageCircle, MapPin, Phone, Search, Store } from "lucide-react";
import {
  POTENTIAL_KATEGORI,
  POTENTIAL_KATEGORI_LABELS,
  type PotentialKategori,
} from "@/lib/potential-constants";
import type { VillagePotential } from "@/lib/data/potentials";
import { useToast } from "@/components/ui/toast";

export function PotentialCatalog({ items }: { items: VillagePotential[] }) {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [kategoriFilter, setKategoriFilter] = useState<PotentialKategori | "semua">("semua");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchKategori = kategoriFilter === "semua" || item.kategori === kategoriFilter;
      const matchQuery =
        q.length === 0 ||
        item.nama.toLowerCase().includes(q) ||
        (item.pemilik ?? "").toLowerCase().includes(q) ||
        (item.deskripsi ?? "").toLowerCase().includes(q);
      return matchKategori && matchQuery;
    });
  }, [items, query, kategoriFilter]);

  function waLink(phone: string, name: string) {
    const clean = phone.replace(/[^0-9]/g, "");
    const final = clean.startsWith("0") ? `62${clean.slice(1)}` : clean;
    return `https://wa.me/${final}?text=Halo,%20saya%20melihat%20profil%20${encodeURIComponent(name)}%20di%20Portal%20Desa.%20Bisa%20dibantu?`;
  }

  return (
    <div className="space-y-6">
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
            placeholder="Cari nama usaha, pemilik, atau kata kunci..."
            aria-label="Cari potensi desa"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-village-500 focus:ring-4 focus:ring-village-500/10"
          />
        </div>

        <select
          value={kategoriFilter}
          onChange={(e) => setKategoriFilter(e.target.value as PotentialKategori | "semua")}
          aria-label="Filter kategori"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-village-500 focus:ring-4 focus:ring-village-500/10"
        >
          <option value="semua">Semua Kategori</option>
          {POTENTIAL_KATEGORI.map((key) => (
            <option key={key} value={key}>{POTENTIAL_KATEGORI_LABELS[key]}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-village-50 text-village-600">
            <Store className="h-6 w-6" aria-hidden="true" />
          </span>
          <h3 className="mt-4 font-semibold text-slate-900">
            {items.length === 0 ? "Belum ada etalase" : "Tidak ada yang cocok"}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {items.length === 0
              ? "Etalase komoditas desa akan tampil setelah diisi oleh perangkat desa."
              : "Coba ubah kata kunci atau filter kategori."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-3">
                <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  {POTENTIAL_KATEGORI_LABELS[item.kategori] ?? item.kategori}
                </span>
              </div>
              <h3 className="font-semibold leading-snug text-slate-900">{item.nama}</h3>
              {item.pemilik ? (
                <p className="mt-0.5 text-xs text-slate-500">Oleh {item.pemilik}</p>
              ) : null}

              {item.deskripsi ? (
                <p className="mt-3 line-clamp-3 flex-1 text-sm leading-6 text-slate-600">
                  {item.deskripsi}
                </p>
              ) : (
                <div className="flex-1" />
              )}

              <dl className="mt-5 space-y-2.5 border-t border-slate-100 pt-4">
                {item.kontak ? (
                  <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                    <div className="flex items-center gap-2 truncate">
                      <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <dd className="truncate">{item.kontak}</dd>
                    </div>
                    <a
                      href={waLink(item.kontak!, item.nama)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Hubungi ${item.pemilik ?? item.nama} via WhatsApp`}
                      className="shrink-0 rounded flex items-center gap-1.5 p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 font-semibold text-[11px]"
                    >
                      <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" /> WA
                    </a>
                  </div>
                ) : null}

                {item.alamat ? (
                  <div className="flex items-start gap-2 text-xs text-slate-500">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <dd className="line-clamp-2">{item.alamat}</dd>
                  </div>
                ) : null}
              </dl>
            </article>
          ))}
        </div>
      )}

      {filtered.length > 0 ? (
        <p className="text-xs text-slate-500" aria-live="polite">
          Menampilkan {filtered.length} dari {items.length} profil.
        </p>
      ) : null}
    </div>
  );
}