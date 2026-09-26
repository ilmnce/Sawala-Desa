"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import NextImage from "next/image";
import { ChevronLeft, ChevronRight, ImageOff, Loader2, X } from "lucide-react";
import { isImagePath, publicStorageUrl } from "@/lib/supabase/storage";
import { TombolHapusDokumentasi } from "./dokumentasi-upload";

export interface GalleryPhoto {
  id: string;
  judul: string | null;
  keterangan: string | null;
  storagePath: string;
}

interface Photo extends GalleryPhoto {
  url: string | null;
  isImage: boolean;
}

/** Ubah data dokumentasi menjadi item galeri (URL + jenis berkas). */
function toPhotos(items: GalleryPhoto[]): Photo[] {
  return items.map((item) => ({
    ...item,
    url: publicStorageUrl(item.storagePath),
    isImage: isImagePath(item.storagePath),
  }));
}

/**
 * Galeri foto responsif dengan modal preview.
 * Mendukung navigasi keyboard (panah kiri/kanan, Escape) dan focus trap.
 */
export function PhotoGallery({
  items,
  isAdmin = false,
  programId,
}: {
  items: GalleryPhoto[];
  isAdmin?: boolean;
  programId?: string;
}) {
  const photos = useMemo(() => toPhotos(items), [items]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Indeks foto yang benar-benar bergambar (untuk navigasi antar slide).
  const imageIndexes = useMemo(
    () => photos.map((p, i) => (p.isImage ? i : -1)).filter((i) => i >= 0),
    [photos],
  );

  const close = useCallback(() => setActiveIndex(null), []);
  const showPrev = useCallback(() => {
    setActiveIndex((current) => {
      if (current === null) return current;
      const pos = imageIndexes.indexOf(current);
      const prevPos = pos <= 0 ? imageIndexes.length - 1 : pos - 1;
      return imageIndexes[prevPos] ?? current;
    });
  }, [imageIndexes]);
  const showNext = useCallback(() => {
    setActiveIndex((current) => {
      if (current === null) return current;
      const pos = imageIndexes.indexOf(current);
      const nextPos = pos === -1 || pos >= imageIndexes.length - 1 ? 0 : pos + 1;
      return imageIndexes[nextPos] ?? current;
    });
  }, [imageIndexes]);

  if (photos.length === 0) {
    return (
      <p className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-10 text-center text-sm text-slate-500">
        <ImageOff className="h-4 w-4" aria-hidden="true" />
        Belum ada foto dokumentasi untuk program ini.
      </p>
    );
  }

  const active = activeIndex !== null ? photos[activeIndex] : null;

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo, index) => {
          const clickable = photo.isImage && photo.url;
          return (
            <li key={photo.id}>
              <div className="group relative block aspect-[4/3] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm transition hover:shadow-md">
                {clickable ? (
                <button
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Perbesar foto: ${photo.judul ?? "dokumentasi"}${photo.keterangan ? ` — ${photo.keterangan}` : ""}`}
                  className="absolute inset-0 h-full w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-village-600"
                >
                  <NextImage
                    src={photo.url!}
                    alt={photo.judul ?? "Foto dokumentasi pembangunan"}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover transition duration-300 group-hover:scale-105"
                    unoptimized
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/70 to-transparent p-2 text-left text-xs font-medium text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                    {photo.judul ?? "Lihat foto"}
                  </span>
                </button>
                ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1 border-dashed border-slate-300 bg-slate-50 p-3 text-center">
                  <ImageOff className="h-5 w-5 text-slate-400" aria-hidden="true" />
                  <p className="text-xs font-medium text-slate-600">{photo.judul ?? "Berkas"}</p>
                  <p className="text-[11px] text-slate-400">Pratinjau tidak tersedia</p>
                </div>
                )}
                {isAdmin && programId ? (
                  <TombolHapusDokumentasi programId={programId} docId={photo.id} />
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {active ? (
        <Lightbox
          photo={active}
          hasMultiple={imageIndexes.length > 1}
          onClose={close}
          onPrev={showPrev}
          onNext={showNext}
        />
      ) : null}
    </>
  );
}

function Lightbox({
  photo,
  hasMultiple,
  onClose,
  onPrev,
  onNext,
}: {
  photo: Photo;
  hasMultiple: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "ArrowLeft" && hasMultiple) {
        onPrev();
        return;
      }
      if (event.key === "ArrowRight" && hasMultiple) {
        onNext();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>("button, [href]");
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
  }, [hasMultiple, onClose, onPrev, onNext]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        aria-label="Tutup pratinjau"
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={photo.judul ?? "Pratinjau foto dokumentasi"}
        className="relative flex max-h-full w-full max-w-5xl flex-col"
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="truncate text-sm font-medium text-white">
            {photo.judul ?? "Foto dokumentasi"}
          </p>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-lg bg-white/10 p-2 text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="relative flex items-center justify-center overflow-hidden rounded-2xl bg-slate-900">
          {loading ? (
            <span className="absolute inset-0 grid place-items-center text-slate-300">
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
              <span className="sr-only">Memuat foto...</span>
            </span>
          ) : null}

          {failed ? (
            <p className="flex flex-col items-center gap-2 px-6 py-16 text-center text-sm text-slate-300">
              <ImageOff className="h-8 w-8" aria-hidden="true" />
              Foto gagal dimuat. Periksa koneksi lalu coba lagi.
            </p>
          ) : (
            <NextImage
              src={photo.url!}
              alt={photo.judul ?? "Foto dokumentasi pembangunan"}
              width={1600}
              height={1200}
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setFailed(true);
              }}
              className="max-h-[75vh] w-auto object-contain"
              unoptimized
            />
          )}

          {hasMultiple ? (
            <>
              <button
                type="button"
                onClick={onPrev}
                aria-label="Foto sebelumnya"
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2.5 text-white transition hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onNext}
                aria-label="Foto berikutnya"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2.5 text-white transition hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </>
          ) : null}
        </div>

        {photo.keterangan ? (
          <p className="mt-2 text-center text-sm text-slate-300">{photo.keterangan}</p>
        ) : null}
      </div>
    </div>
  );
}