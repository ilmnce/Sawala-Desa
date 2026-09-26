"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowDownWideNarrow,
  CheckCircle2,
  Loader2,
  MessageSquare,
  PencilLine,
  Search,
  Star,
  X,
} from "lucide-react";
import { updateStatusAspirasiAction, type AdminAspirationActionState } from "./actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { CATEGORY_LABELS, ASPIRATION_STATUS_LABELS } from "@/lib/aspiration-constants";
import type { Aspiration } from "@/lib/data/aspirations";
import type { AspirationStatus } from "@/lib/types";
import { formatTanggal } from "@/lib/format";

const STATUS_OPTIONS: AspirationStatus[] = [
  "menunggu",
  "ditinjau",
  "prioritas",
  "ditolak",
  "terealisasi",
];

interface Props {
  items: Aspiration[];
}

export function KelolaAspirasi({ items }: Props) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AspirationStatus | "semua">("semua");
  const [prioritasOnly, setPrioritasOnly] = useState(false);
  const [sortByDukungan, setSortByDukungan] = useState(false);
  const [selected, setSelected] = useState<Aspiration | null>(null);

  // Sinkronkan filter ke query string agar dapat di-bookmark/dibagikan dan
  // bertahan saat halaman dimuat ulang (mis. dari tautan notifikasi admin).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    if (status && (status === "semua" || STATUS_OPTIONS.includes(status as AspirationStatus))) {
      setStatusFilter(status as AspirationStatus | "semua");
    }
    if (params.get("prioritas") === "1") setPrioritasOnly(true);
    if (params.get("urut") === "dukungan") setSortByDukungan(true);
    const q = params.get("q");
    if (q) setQuery(q);
    // Hanya sekali saat mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function syncUrl(next: {
    status?: AspirationStatus | "semua";
    prioritas?: boolean;
    urut?: boolean;
    q?: string;
  }) {
    const params = new URLSearchParams(window.location.search);
    const status = next.status ?? statusFilter;
    const prio = next.prioritas ?? prioritasOnly;
    const urut = next.urut ?? sortByDukungan;
    const search = next.q ?? query;

    if (status === "semua") params.delete("status");
    else params.set("status", status);

    if (prio) params.set("prioritas", "1");
    else params.delete("prioritas");

    if (urut) params.set("urut", "dukungan");
    else params.delete("urut");

    if (search.trim()) params.set("q", search.trim());
    else params.delete("q");

    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = items.filter((item) => {
      const matchStatus = statusFilter === "semua" || item.status === statusFilter;
      const matchPrioritas = !prioritasOnly || item.prioritas;
      const matchQuery =
        q.length === 0 ||
        item.judul.toLowerCase().includes(q) ||
        item.pengusulNama.toLowerCase().includes(q);
      return matchStatus && matchPrioritas && matchQuery;
    });
    if (sortByDukungan) {
      list = [...list].sort((a, b) => b.dukungan - a.dukungan);
    }
    return list;
  }, [items, query, statusFilter, prioritasOnly, sortByDukungan]);

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
            onChange={(e) => {
              setQuery(e.target.value);
              syncUrl({ q: e.target.value });
            }}
            placeholder="Cari judul usulan atau nama pengusul..."
            aria-label="Cari aspirasi"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-village-500 focus:ring-4 focus:ring-village-500/10"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            const value = e.target.value as AspirationStatus | "semua";
            setStatusFilter(value);
            syncUrl({ status: value });
          }}
          aria-label="Filter status aspirasi"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-village-500 focus:ring-4 focus:ring-village-500/10"
        >
          <option value="semua">Semua status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {ASPIRATION_STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => {
            const next = !prioritasOnly;
            setPrioritasOnly(next);
            syncUrl({ prioritas: next });
          }}
          aria-pressed={prioritasOnly}
          className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ${
            prioritasOnly
              ? "border-violet-600 bg-violet-50 text-violet-700"
              : "border-slate-200 bg-white text-slate-600 hover:border-violet-300"
          }`}
        >
          <Star className="h-4 w-4" aria-hidden="true" />
          Hanya prioritas
        </button>

        <button
          type="button"
          onClick={() => {
            const next = !sortByDukungan;
            setSortByDukungan(next);
            syncUrl({ urut: next });
          }}
          aria-pressed={sortByDukungan}
          className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-village-600 ${
            sortByDukungan
              ? "border-village-600 bg-village-50 text-village-700"
              : "border-slate-200 bg-white text-slate-600 hover:border-village-300"
          }`}
        >
          <ArrowDownWideNarrow className="h-4 w-4" aria-hidden="true" />
          Dukungan terbanyak
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-village-50 text-village-600">
            <MessageSquare className="h-6 w-6" aria-hidden="true" />
          </span>
          <h3 className="mt-4 font-semibold text-slate-900">Tidak ada aspirasi yang cocok</h3>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            Ubah kata kunci pencarian atau filter status untuk melihat usulan lainnya.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] border-collapse text-sm">
              <caption className="sr-only">Daftar aspirasi warga yang perlu diproses</caption>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-left">
                  <th scope="col" className="px-4 py-3 font-semibold text-slate-600">Usulan</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-slate-600">Kategori</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <Star className="h-3.5 w-3.5" aria-hidden="true" />
                      Dukungan
                    </span>
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-4">
                      <p className="font-medium text-slate-900">{item.judul}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {item.pengusulNama} · {formatTanggal(item.createdAt)}
                      </p>
                      {item.prioritas ? (
                        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700 ring-1 ring-inset ring-violet-200">
                          <Star className="h-3 w-3" aria-hidden="true" />
                          Prioritas Musdes
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {CATEGORY_LABELS[item.kategori] ?? item.kategori}
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-village-50 px-2 py-1 text-xs font-semibold text-village-700">
                        {item.dukungan}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelected(item)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-village-300 hover:text-village-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-village-600"
                      >
                        <PencilLine className="h-3.5 w-3.5" aria-hidden="true" />
                        Proses
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-500" aria-live="polite">
        Menampilkan {filtered.length} dari {items.length} aspirasi.
      </p>

      <UpdateStatusModal item={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

/** Modal untuk mengubah status, prioritas, dan catatan aspirasi. */
function UpdateStatusModal({
  item,
  onClose,
}: {
  item: Aspiration | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [state, setState] = useState<AdminAspirationActionState>({ ok: false, message: "" });
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!item) return;
    setState({ ok: false, message: "" });

    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      previouslyFocused?.focus?.();
    };
  }, [item, onClose]);

  if (!item) return null;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (item) formData.set("id", item.id);

    setPending(true);
    try {
      const result = await updateStatusAspirasiAction({ ok: false, message: "" }, formData);
      setState(result);
      if (result.ok) {
        router.refresh();
        onClose();
      }
    } catch {
      setState({ ok: false, message: "Terjadi kesalahan tak terduga. Coba lagi." });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Tutup dialog"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="status-modal-title"
        className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-7"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="absolute right-4 top-4 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-village-600"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="pr-10">
          <h2 id="status-modal-title" className="font-[var(--font-lora)] text-xl font-semibold text-slate-900">
            Proses Aspirasi
          </h2>
          <p className="mt-1 text-sm text-slate-500">{item.judul}</p>
          <p className="mt-0.5 text-xs text-slate-400">
            Pengusul: {item.pengusulNama} · {item.dukungan} dukungan
          </p>
        </div>

        <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          {item.deskripsi}
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-5">
          <div>
            <label htmlFor="status" className="mb-1.5 block text-sm font-semibold text-slate-700">
              Status Usulan
            </label>
            <select
              id="status"
              name="status"
              defaultValue={item.status}
              aria-invalid={Boolean(state.fieldErrors?.status)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-village-500 focus:ring-4 focus:ring-village-500/10"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {ASPIRATION_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            {state.fieldErrors?.status ? (
              <p className="mt-1.5 text-xs font-medium text-rose-600" role="alert">
                {state.fieldErrors.status}
              </p>
            ) : null}
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4">
            <input
              id="prioritas"
              name="prioritas"
              type="checkbox"
              defaultChecked={item.prioritas}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
            />
            <label htmlFor="prioritas" className="text-sm leading-5 text-violet-900">
              <span className="font-semibold">Tetapkan sebagai prioritas Musdes</span>
              <span className="mt-0.5 block text-violet-700">
                Usulan prioritas tampil menonjol pada daftar warga dan agenda Musyawarah Desa.
              </span>
            </label>
          </div>

          <div>
            <label htmlFor="catatan_admin" className="mb-1.5 block text-sm font-semibold text-slate-700">
              Catatan Verifikasi
            </label>
            <textarea
              id="catatan_admin"
              name="catatan_admin"
              rows={3}
              defaultValue={item.catatanAdmin ?? ""}
              placeholder="Catatan ini dapat dibaca pengusul, mis. alasan penolakan atau rencana tindak lanjut."
              aria-invalid={Boolean(state.fieldErrors?.catatan_admin)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-village-500 focus:ring-4 focus:ring-village-500/10"
            />
            {state.fieldErrors?.catatan_admin ? (
              <p className="mt-1.5 text-xs font-medium text-rose-600" role="alert">
                {state.fieldErrors.catatan_admin}
              </p>
            ) : null}
          </div>

          {state.message ? (
            <p
              role={state.ok ? "status" : "alert"}
              className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${
                state.ok
                  ? "border border-village-200 bg-village-50 text-village-800"
                  : "border border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {state.ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              ) : (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              )}
              {state.message}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-village-600 px-5 py-3 font-semibold text-white transition hover:bg-village-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-village-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Perubahan"
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}