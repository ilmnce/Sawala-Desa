import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCurrentUser } from "@/lib/auth";
import { getPrograms } from "@/lib/data/programs";
import {
  PROGRAM_KATEGORI,
  PROGRAM_STATUSES,
  type ProgramKategori,
  type ProgramStatus,
} from "@/lib/program-constants";

/**
 * GET /api/pembangunan?status=berjalan&kategori=fisik&limit=20
 * Katalog program pembangunan (publik).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const statusRaw = url.searchParams.get("status");
  const limitRaw = url.searchParams.get("limit");

  let status: ProgramStatus | null = null;
  if (statusRaw) {
    if (!PROGRAM_STATUSES.includes(statusRaw as ProgramStatus)) {
      return NextResponse.json({ error: "Status tidak dikenal." }, { status: 400 });
    }
    status = statusRaw as ProgramStatus;
  }

  let limit: number | undefined;
  if (limitRaw) {
    const parsed = Number(limitRaw);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
      return NextResponse.json({ error: "Parameter limit harus 1-100." }, { status: 400 });
    }
    limit = parsed;
  }

  const items = await getPrograms({ status, limit });
  return NextResponse.json(
    { data: items, meta: { total: items.length } },
    { status: 200, headers: { "Cache-Control": "public, max-age=0, s-maxage=30" } },
  );
}

/**
 * POST /api/pembangunan
 * Tambah program baru (khusus admin).
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Anda belum masuk atau sesi berakhir." }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Hanya admin yang boleh menambah program pembangunan." },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Format permintaan tidak valid." }, { status: 400 });
  }

  const fieldErrors: Record<string, string> = {};

  const nama = typeof body.nama === "string" ? body.nama.trim() : "";
  if (nama.length < 3) fieldErrors.nama = "Nama program minimal 3 karakter.";
  else if (nama.length > 150) fieldErrors.nama = "Nama program maksimal 150 karakter.";

  const kategori = typeof body.kategori === "string" ? body.kategori : "fisik";
  if (!PROGRAM_KATEGORI.includes(kategori as ProgramKategori)) {
    fieldErrors.kategori = `Kategori tidak dikenal. Pilihan: ${PROGRAM_KATEGORI.join(", ")}.`;
  }

  const status = typeof body.status === "string" ? body.status : "direncanakan";
  if (!PROGRAM_STATUSES.includes(status as ProgramStatus)) {
    fieldErrors.status = `Status tidak dikenal. Pilihan: ${PROGRAM_STATUSES.join(", ")}.`;
  }

  const progressRaw = body.progress ?? 0;
  const progress = typeof progressRaw === "number" ? progressRaw : Number(progressRaw);
  if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
    fieldErrors.progress = "Progress harus bilangan bulat 0-100.";
  }

  const anggaranRaw = body.anggaran ?? 0;
  const anggaran = typeof anggaranRaw === "number" ? anggaranRaw : Number(anggaranRaw);
  if (!Number.isFinite(anggaran) || anggaran < 0) {
    fieldErrors.anggaran = "Anggaran harus angka >= 0.";
  }

  const deskripsi = typeof body.deskripsi === "string" ? body.deskripsi.trim() : "";
  if (deskripsi.length > 2000) fieldErrors.deskripsi = "Deskripsi maksimal 2000 karakter.";

  const lokasi = typeof body.lokasi === "string" ? body.lokasi.trim() : "";
  const pelaksana = typeof body.pelaksana === "string" ? body.pelaksana.trim() : "";

  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json(
      { error: "Periksa kembali data yang diisi.", fieldErrors },
      { status: 400 },
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database belum dikonfigurasi." }, { status: 503 });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("development_programs")
    .insert({
      nama,
      deskripsi: deskripsi || null,
      kategori,
      lokasi: lokasi || null,
      pelaksana: pelaksana || null,
      anggaran,
      progress: status === "selesai" ? 100 : progress,
      status,
    })
    .select("id, nama, status, progress")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Gagal menyimpan program. Coba lagi." }, { status: 500 });
  }

  return NextResponse.json(
    { data, message: "Program pembangunan berhasil ditambahkan." },
    { status: 201 },
  );
}