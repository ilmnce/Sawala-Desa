import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCurrentUser } from "@/lib/auth";
import { PROGRAM_STATUSES, type ProgramStatus } from "@/lib/program-constants";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/pembangunan/[id]
 * Detail satu program (publik — program desa bersifat terbuka).
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: "ID program tidak valid." }, { status: 400 });
  }

  const { getProgramById } = await import("@/lib/data/programs");
  const program = await getProgramById(params.id);

  if (!program) {
    return NextResponse.json({ error: "Program tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json({ data: program }, { status: 200 });
}

/**
 * DELETE /api/pembangunan/[id]
 * Hapus program (khusus admin). Dokumentasi & milestone ikut terhapus
 * lewat ON DELETE CASCADE.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: "ID program tidak valid." }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Anda belum masuk atau sesi berakhir." }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Hanya admin yang boleh menghapus program." }, { status: 403 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database belum dikonfigurasi." }, { status: 503 });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("development_programs")
    .delete()
    .eq("id", params.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Gagal menghapus program. Coba lagi." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Program tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json({ message: "Program berhasil dihapus." }, { status: 200 });
}

/**
 * PATCH /api/pembangunan/[id]
 *
 * Admin memperbarui progress & status sebuah program. Perubahan ini otomatis
 * dicatat sebagai milestone oleh trigger `development_programs_log_milestone`,
 * sehingga timeline warga tetap tersinkron.
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: "ID program tidak valid." }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Anda belum masuk atau sesi berakhir." }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Hanya admin yang boleh memperbarui program pembangunan." },
      { status: 403 },
    );
  }

  let body: {
    progress?: unknown;
    status?: unknown;
    judul_milestone?: unknown;
    keterangan_milestone?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Format permintaan tidak valid." }, { status: 400 });
  }

  const fieldErrors: Record<string, string> = {};

  const progressRaw = body.progress;
  const progress = typeof progressRaw === "number" ? progressRaw : Number(progressRaw);
  if (!Number.isFinite(progress) || !Number.isInteger(progress) || progress < 0 || progress > 100) {
    fieldErrors.progress = "Progress harus bilangan bulat 0-100.";
  }

  const status = typeof body.status === "string" ? body.status : "";
  if (!PROGRAM_STATUSES.includes(status as ProgramStatus)) {
    fieldErrors.status = `Status tidak dikenal. Pilihan: ${PROGRAM_STATUSES.join(", ")}.`;
  }

  const judul =
    typeof body.judul_milestone === "string" ? body.judul_milestone.trim() : "";
  if (judul.length > 150) {
    fieldErrors.judul_milestone = "Judul milestone maksimal 150 karakter.";
  }

  const keterangan =
    typeof body.keterangan_milestone === "string" ? body.keterangan_milestone.trim() : "";
  if (keterangan.length > 500) {
    fieldErrors.keterangan_milestone = "Keterangan maksimal 500 karakter.";
  }

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

  // Status 'selesai' dengan progress < 100 tidak konsisten; selaraskan.
  const finalStatus = status as ProgramStatus;
  const finalProgress = finalStatus === "selesai" ? 100 : progress;

  const { data, error } = await supabase
    .from("development_programs")
    .update({ progress: finalProgress, status: finalStatus })
    .eq("id", params.id)
    .select("id, nama, progress, status")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Gagal memperbarui program. Coba lagi." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Program tidak ditemukan." }, { status: 404 });
  }

  // Milestone khusus (judul/keterangan bikinan admin), bila diisi.
  if (judul) {
    await supabase.from("program_milestones").insert({
      program_id: params.id,
      judul,
      keterangan: keterangan || null,
      progress: finalProgress,
      status: finalStatus,
      dicatat_oleh: user.id,
    });
  }

  return NextResponse.json(
    {
      data: {
        id: data.id,
        nama: data.nama,
        progress: data.progress,
        status: data.status,
      },
      message: "Progress program berhasil diperbarui.",
    },
    { status: 200 },
  );
}