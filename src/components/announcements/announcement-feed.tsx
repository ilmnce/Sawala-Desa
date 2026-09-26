"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CalendarDays, ChevronRight, Loader2, MapPin, Megaphone, RotateCw, X } from "lucide-react";
import type { Announcement, AnnouncementCategory } from "@/lib/data/announcements";
import { formatTanggal } from "@/lib/format";

const categoryStyles: Record<AnnouncementCategory, string> = {
  umum: "bg-slate-100 text-slate-700 ring-slate-200",
  agenda: "bg-sky-50 text-sky-700 ring-sky-200",
  pembangunan: "bg-amber-50 text-amber-700 ring-amber-200",
  layanan: "bg-village-50 text-village-700 ring-village-200",
  anggaran: "bg-violet-50 text-violet-700 ring-violet-200",
};

const categoryLabels: Record<AnnouncementCategory, string> = {
  umum: "Umum",
  agenda: "Agenda",
  pembangunan: "Pembangunan",
  layanan: "Layanan",
  anggaran: "Anggaran",
};

/** Batas waktu permintaan feed (ms) sebelum dianggap timeout. */
const REQUEST_TIMEOUT_MS = 10_000;

function CategoryTag({ kategori }: { kategori: AnnouncementCategory }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${categoryStyles[kategori]}`}
    >
      {categoryLabels[kategori]}
    </span>
  );
}

/** Kartu ringkas satu pengumuman; klik membuka modal detail. */
function AnnouncementCard({
  item,
  onOpen,
}: {
  item: Announcement;
  onOpen: (item: Announcement) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="flex h-full w-full flex-col rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-sm transition hover:border-village-200 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-village-600"
      aria-haspopup="dialog"
    >
      <div className="flex items-center justify-between gap-3">
        <CategoryTag kategori={item.kategori} />
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
          {formatTanggal(item.createdAt)}
        </span>
      </div>

      <h3 className="mt-4 line-clamp-2 font-semibold leading-snug text-slate-900">{item.judul}</h3>
      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-slate-500">
        {item.ringkasan ?? item.isi.slice(0, 160)}
      </p>

      {item.lokasi ? (
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-500">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          {item.lokasi}
        </p>
      ) : null}

      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-village-700">
        Baca detail
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </span>
    </button>
  );
}

/** Modal detail pengumuman dengan focus trap sederhana & Escape untuk menutup. */
function AnnouncementModal({
  item,
  onClose,
}: {
  item: Announcement | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!item) return;

    // Simpan elemen yang fokus sebelumnya untuk dikembalikan saat modal ditutup.
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Tutup detail pengumuman"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcement-modal-title"
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-8"
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
          <CategoryTag kategori={item.kategori} />
          <h2
            id="announcement-modal-title"
            className="mt-4 font-[var(--font-lora)] text-2xl font-semibold leading-snug text-slate-900"
          >
            {item.judul}
          </h2>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              {formatTanggal(item.createdAt)}
            </span>
            {item.lokasi ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                {item.lokasi}
              </span>
            ) : null}
          </div>

          {item.tanggalMulai ? (
            <p className="mt-4 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-800">
              Pelaksanaan: {formatTanggal(item.tanggalMulai)}
              {item.tanggalSelesai ? ` s.d. ${formatTanggal(item.tanggalSelesai)}` : ""}
            </p>
          ) : null}
        </div>

        <div className="mt-6 whitespace-pre-line text-sm leading-7 text-slate-700">{item.isi}</div>
      </div>
    </div>
  );
}

interface FeedResponse {
  data?: Announcement[];
  meta?: { page: number; total_pages: number; has_next: boolean };
  error?: string;
}

/** Feed pengumuman + infinite scroll + state error, dengan modal detail. */
export function AnnouncementFeed({
  items,
  /** Aktifkan pemuatan bertahap dari /api/pengumuman (mis. di beranda). */
  infinite = false,
  includeDrafts = false,
}: {
  items: Announcement[];
  infinite?: boolean;
  includeDrafts?: boolean;
}) {
  const [selected, setSelected] = useState<Announcement | null>(null);
  const [list, setList] = useState<Announcement[]>(items);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Sinkronkan bila data awal dari server berubah (mis. setelah refresh).
  useEffect(() => {
    setList(items);
    setPage(1);
    setError(null);
  }, [items]);

  const loadMore = useCallback(
    async (targetPage: number) => {
      if (loading) return;
      setLoading(true);
      setError(null);

      // Batas waktu agar permintaan yang menggantung tidak membekukan feed.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const params = new URLSearchParams({ page: String(targetPage), per_page: "6" });
        if (includeDrafts) params.set("drafts", "1");

        const res = await fetch(`/api/pengumuman?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await res.json()) as FeedResponse;

        if (!res.ok) {
          setError(payload.error ?? "Gagal memuat pengumuman.");
          return;
        }

        const incoming = payload.data ?? [];
        setList((prev) => {
          const known = new Set(prev.map((a) => a.id));
          return [...prev, ...incoming.filter((a) => !known.has(a.id))];
        });
        setPage(targetPage);
        setHasNext(Boolean(payload.meta?.has_next));
      } catch (err) {
        // AbortError = timeout, bukan kegagalan jaringan biasa.
        const aborted = err instanceof DOMException && err.name === "AbortError";
        setError(
          aborted
            ? "Permintaan memakan waktu terlalu lama. Periksa koneksi lalu coba lagi."
            : "Tidak dapat terhubung ke server. Periksa koneksi Anda.",
        );
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    },
    [loading, includeDrafts],
  );

  // Muat halaman pertama sekali saat infinite aktif, untuk mengetahui ada/tiadanya lanjutan.
  useEffect(() => {
    if (!infinite) return;
    void loadMore(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [infinite]);

  // Amati sentinel di bawah daftar; muat halaman berikutnya saat terlihat.
  useEffect(() => {
    if (!infinite || !hasNext) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loading && !error) {
          void loadMore(page + 1);
        }
      },
      { rootMargin: "240px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [infinite, hasNext, loading, error, page, loadMore]);

  if (list.length === 0 && !loading && !error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-village-50 text-village-600">
          <Megaphone className="h-6 w-6" aria-hidden="true" />
        </span>
        <h3 className="mt-4 font-semibold text-slate-900">Belum ada pengumuman</h3>
        <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
          Pengumuman dan agenda desa terbaru akan tampil di sini setelah dipublikasikan perangkat desa.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((item) => (
          <AnnouncementCard key={item.id} item={item} onOpen={setSelected} />
        ))}
      </div>

      {error ? (
        <div
          role="alert"
          className="mt-5 flex flex-col items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-6 text-center sm:flex-row sm:justify-between sm:text-left"
        >
          <p className="flex items-start gap-2 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
          <button
            type="button"
            onClick={() => void loadMore(page + 1)}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
          >
            <RotateCw className="h-4 w-4" aria-hidden="true" />
            Coba lagi
          </button>
        </div>
      ) : null}

      {infinite ? (
        <div ref={sentinelRef} className="mt-6 flex h-10 items-center justify-center" aria-live="polite">
          {loading ? (
            <span className="inline-flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Memuat pengumuman lain...
            </span>
          ) : !hasNext && list.length > 0 ? (
            <span className="text-sm text-slate-400">Semua pengumuman telah ditampilkan.</span>
          ) : null}
        </div>
      ) : null}

      <AnnouncementModal item={selected} onClose={() => setSelected(null)} />
    </>
  );
}