import { createClient } from "../supabase/server";
import { isSupabaseConfigured } from "../supabase/env";

export type AnnouncementCategory = "umum" | "agenda" | "pembangunan" | "layanan" | "anggaran";

export interface Announcement {
  id: string;
  judul: string;
  ringkasan: string | null;
  isi: string;
  kategori: AnnouncementCategory;
  tanggalMulai: string | null;
  tanggalSelesai: string | null;
  lokasi: string | null;
  createdAt: string;
}

function mapRow(row: Record<string, unknown>): Announcement {
  return {
    id: String(row.id),
    judul: String(row.judul ?? ""),
    ringkasan: (row.ringkasan as string | null) ?? null,
    isi: String(row.isi ?? ""),
    kategori: (row.kategori as AnnouncementCategory) ?? "umum",
    tanggalMulai: (row.tanggal_mulai as string | null) ?? null,
    tanggalSelesai: (row.tanggal_selesai as string | null) ?? null,
    lokasi: (row.lokasi as string | null) ?? null,
    createdAt: String(row.created_at ?? ""),
  };
}

/**
 * Ambil pengumuman terbit terbaru untuk beranda.
 * Mengembalikan array kosong (bukan error) bila DB belum dikonfigurasi atau
 * tabel belum tersedia, agar beranda tetap dapat dirender.
 */
export async function getLatestAnnouncements(limit = 6): Promise<Announcement[]> {
  const { items } = await getAnnouncementsPage({ page: 1, perPage: limit });
  return items;
}

export interface AnnouncementPage {
  items: Announcement[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  hasNext: boolean;
}

export interface AnnouncementQuery {
  page?: number;
  perPage?: number;
  kategori?: AnnouncementCategory | null;
  /** Bila true (khusus admin), ikut menampilkan pengumuman yang belum terbit. */
  includeDrafts?: boolean;
}

/** Batas aman agar permintaan tidak menarik seluruh tabel sekaligus. */
export const ANNOUNCEMENT_MAX_PER_PAGE = 50;

/**
 * Ambil feed pengumuman terbit dengan pagination.
 * Query dibatasi rentang yang valid dan mengembalikan metadata halaman.
 */
export async function getAnnouncementsPage(query: AnnouncementQuery = {}): Promise<AnnouncementPage> {
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const perPage = Math.min(
    ANNOUNCEMENT_MAX_PER_PAGE,
    Math.max(1, Math.floor(query.perPage ?? 6)),
  );

  const empty: AnnouncementPage = {
    items: [],
    total: 0,
    page,
    perPage,
    totalPages: 0,
    hasNext: false,
  };

  if (!isSupabaseConfigured()) return empty;

  try {
    const supabase = createClient();
    let builder = supabase
      .from("announcements")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (!query.includeDrafts) {
      builder = builder.eq("is_published", true);
    }
    if (query.kategori) {
      builder = builder.eq("kategori", query.kategori);
    }

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    const { data, error, count } = await builder.range(from, to);

    if (error || !data) return empty;

    const total = count ?? data.length;
    const totalPages = Math.ceil(total / perPage);

    return {
      items: data.map(mapRow),
      total,
      page,
      perPage,
      totalPages,
      hasNext: page < totalPages,
    };
  } catch {
    return empty;
  }
}