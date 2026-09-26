import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCurrentUser } from "@/lib/auth";
import { validasiAspirasi } from "@/lib/aspiration-validation";
import { getAspirations } from "@/lib/data/aspirations";
import type { AspirationStatus } from "@/lib/types";

const VALID_STATUS: AspirationStatus[] = [
  "menunggu",
  "ditinjau",
  "prioritas",
  "ditolak",
  "terealisasi",
];

/**
 * GET /api/aspirasi?status=menunggu&prioritas=1&limit=20
 * Daftar aspirasi (butuh login — transparansi internal warga & admin).
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Anda belum masuk atau sesi berakhir." }, { status: 401 });
  }

  const url = new URL(request.url);
  const statusRaw = url.searchParams.get("status");
  const prioritasRaw = url.searchParams.get("prioritas");
  const limitRaw = url.searchParams.get("limit");

  let status: AspirationStatus | null = null;
  if (statusRaw) {
    if (!VALID_STATUS.includes(statusRaw as AspirationStatus)) {
      return NextResponse.json({ error: "Status tidak dikenal." }, { status: 400 });
    }
    status = statusRaw as AspirationStatus;
  }

  let limit: number | undefined;
  if (limitRaw) {
    const parsed = Number(limitRaw);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
      return NextResponse.json({ error: "Parameter limit harus 1-100." }, { status: 400 });
    }
    limit = parsed;
  }

  const items = await getAspirations({
    userId: user.id,
    status,
    prioritasOnly: prioritasRaw === "1" || prioritasRaw === "true",
    limit,
  });

  return NextResponse.json(
    { data: items, meta: { total: items.length } },
    { status: 200, headers: { "Cache-Control": "no-store, private" } },
  );
}

/**
 * POST /api/aspirasi
 * Membuat usulan aspirasi baru atas nama warga yang login.
 * `pengusul_id` selalu diambil dari sesi — klien tidak dapat mengaku sebagai warga lain.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Anda belum masuk atau sesi berakhir." }, { status: 401 });
  }
  if (user.role !== "warga") {
    return NextResponse.json(
      { error: "Hanya akun warga yang dapat mengajukan aspirasi." },
      { status: 403 },
    );
  }

  let body: { judul?: unknown; kategori?: unknown; deskripsi?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Format permintaan tidak valid." }, { status: 400 });
  }

  const { valid, fieldErrors, data } = validasiAspirasi({
    judul: typeof body.judul === "string" ? body.judul : "",
    kategori: typeof body.kategori === "string" ? body.kategori : "",
    deskripsi: typeof body.deskripsi === "string" ? body.deskripsi : "",
  });

  if (!valid || !data) {
    return NextResponse.json(
      { error: "Periksa kembali data usulan Anda.", fieldErrors },
      { status: 400 },
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database belum dikonfigurasi." }, { status: 503 });
  }

  const supabase = createClient();
  const { data: created, error } = await supabase
    .from("aspirations")
    .insert({
      judul: data.judul,
      kategori: data.kategori,
      deskripsi: data.deskripsi,
      pengusul_id: user.id,
      status: "menunggu",
    })
    .select("id, judul, status")
    .single();

  if (error || !created) {
    return NextResponse.json({ error: "Gagal menyimpan usulan. Coba lagi." }, { status: 500 });
  }

  return NextResponse.json(
    {
      data: {
        id: created.id,
        judul: created.judul,
        status: created.status,
      },
      message: "Usulan aspirasi berhasil dikirim dan sedang menunggu peninjauan.",
    },
    { status: 201 },
  );
}