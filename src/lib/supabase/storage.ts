import { SUPABASE_URL } from "./env";

/** Bucket penyimpanan foto dokumentasi pembangunan. */
export const DOCUMENTATION_BUCKET = "dokumentasi";

/**
 * URL publik untuk objek di Supabase Storage.
 *
 * Catatan: mengasumsikan bucket `dokumentasi` bersifat public-read (foto
 * lapangan memang untuk konsumsi publik). Bila bucket disetel privat, ganti
 * fungsi ini dengan pembuatan signed URL di server.
 */
export function publicStorageUrl(storagePath: string): string | null {
  const path = storagePath.trim();
  if (!path) return null;
  if (!SUPABASE_URL) return null;

  // Path yang sudah berupa URL absolut (mis. dari CDN) diteruskan apa adanya.
  if (/^https?:\/\//i.test(path)) return path;

  const clean = path.replace(/^\/+/, "");
  return `${SUPABASE_URL}/storage/v1/object/public/${DOCUMENTATION_BUCKET}/${clean}`;
}

/** Apakah sebuah path menunjuk ke berkas gambar yang dapat ditampilkan. */
export function isImagePath(storagePath: string): boolean {
  return /\.(jpe?g|png|webp|gif|avif)$/i.test(storagePath.trim());
}