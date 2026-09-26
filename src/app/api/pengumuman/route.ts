import { NextResponse } from "next/server";
import {
  ANNOUNCEMENT_MAX_PER_PAGE,
  getAnnouncementsPage,
  type AnnouncementCategory,
} from "@/lib/data/announcements";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const VALID_CATEGORIES: AnnouncementCategory[] = [
  "umum",
  "agenda",
  "pembangunan",
  "layanan",
  "anggaran",
];

/**
 * GET /api/pengumuman?page=1&per_page=6&kategori=agenda&drafts=1
 *
 * Feed pengumuman terbit untuk publik. Draft hanya disertakan bila pemohon
 * adalah admin yang terautentikasi.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);

  const pageRaw = url.searchParams.get("page") ?? "1";
  const perPageRaw = url.searchParams.get("per_page") ?? "6";
  const kategoriRaw = url.searchParams.get("kategori");
  const draftsRaw = url.searchParams.get("drafts");

  const page = Number(pageRaw);
  const perPage = Number(perPageRaw);

  if (!Number.isInteger(page) || page < 1) {
    return NextResponse.json({ error: "Parameter page harus bilangan bulat >= 1." }, { status: 400 });
  }
  if (!Number.isInteger(perPage) || perPage < 1 || perPage > ANNOUNCEMENT_MAX_PER_PAGE) {
    return NextResponse.json(
      { error: `Parameter per_page harus antara 1 dan ${ANNOUNCEMENT_MAX_PER_PAGE}.` },
      { status: 400 },
    );
  }

  let kategori: AnnouncementCategory | null = null;
  if (kategoriRaw) {
    if (!VALID_CATEGORIES.includes(kategoriRaw as AnnouncementCategory)) {
      return NextResponse.json(
        { error: `Kategori tidak dikenal. Pilihan: ${VALID_CATEGORIES.join(", ")}.` },
        { status: 400 },
      );
    }
    kategori = kategoriRaw as AnnouncementCategory;
  }

  // Draft hanya untuk admin — dicek dari sesi server, bukan dari klien.
  let includeDrafts = false;
  if (draftsRaw === "1" || draftsRaw === "true") {
    const user = await getCurrentUser();
    includeDrafts = user?.role === "admin";
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        data: [],
        meta: { page, per_page: perPage, total: 0, total_pages: 0, has_next: false },
        configured: false,
      },
      { status: 200 },
    );
  }

  try {
    const result = await getAnnouncementsPage({ page, perPage, kategori, includeDrafts });
    return NextResponse.json(
      {
        data: result.items,
        meta: {
          page: result.page,
          per_page: result.perPage,
          total: result.total,
          total_pages: result.totalPages,
          has_next: result.hasNext,
        },
        configured: true,
      },
      { status: 200, headers: { "Cache-Control": "public, max-age=0, s-maxage=30" } },
    );
  } catch {
    return NextResponse.json({ error: "Gagal memuat pengumuman. Coba lagi." }, { status: 500 });
  }
}