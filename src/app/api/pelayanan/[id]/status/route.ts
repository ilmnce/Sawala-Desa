import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCurrentUser } from "@/lib/auth";
import type { RequestStatus } from "@/lib/data/requests";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_STATUSES: RequestStatus[] = ["diajukan", "diproses", "disetujui", "ditolak"];

/**
 * PATCH /api/pelayanan/[id]/status
 *
 * Update status permohonan surat oleh admin.
 * Admin dapat memvalidasi form, mengisi keterangan / alasan penolakan,
 * serta nomor_registrasi surat resmi. Aksi ini dicatat siapa pemrosesnya
 * (diproses_oleh).
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: "ID pengajuan tidak valid." }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Anda belum masuk atau sesi berakhir." }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Hanya admin yang boleh memperbarui status pengajuan surat." },
      { status: 403 },
    );
  }

  let body: {
    status?: unknown;
    catatan_admin?: unknown;
    nomor_registrasi?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Format permintaan tidak valid." }, { status: 400 });
  }

  const fieldErrors: Record<string, string> = {};

  const status = typeof body.status === "string" ? body.status : "";
  if (!VALID_STATUSES.includes(status as RequestStatus)) {
    fieldErrors.status = `Status tidak dikenal. Pilihan: ${VALID_STATUSES.join(", ")}.`;
  }

  const catatan = typeof body.catatan_admin === "string" ? body.catatan_admin.trim() : "";
  if (catatan && catatan.length > 500) {
    fieldErrors.catatan_admin = "Catatan admin maksimal 500 karakter.";
  }

  // Wajib catatan jika menolak
  if (status === "ditolak" && (!catatan || catatan.length < 5)) {
    fieldErrors.catatan_admin = "Alasan penolakan / syarat berkas minimal wajib diisi (5 karakter).";
  }

  const noReg = typeof body.nomor_registrasi === "string" ? body.nomor_registrasi.trim() : "";
  if (noReg && noReg.length > 50) {
    fieldErrors.nomor_registrasi = "Nomor registrasi maksimal 50 karakter.";
  }
  // Wajib noReg jika disetujui
  if (status === "disetujui" && (!noReg || noReg.length < 3)) {
    fieldErrors.nomor_registrasi = "Nomor surat registrasi wajib diisi sebelum disetujui.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json(
      { error: "Periksa kembali isian Anda.", fieldErrors },
      { status: 400 },
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database belum dikonfigurasi." }, { status: 503 });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("service_requests")
    .update({
      status,
      catatan_admin: catatan || null,
      nomor_registrasi: noReg || null,
      diproses_oleh: user.id,
    })
    .eq("id", params.id)
    .select("id, status")
    .maybeSingle();

  if (error) {
    // Supabase menolak duplicate via constraint unik nomor_registrasi bila sudah dipakai
    if (error.code === '23505') {
       return NextResponse.json({ error: "Nomor registrasi tersebut sudah digunakan surat lain." }, { status: 409 });
    }
    return NextResponse.json({ error: "Gagal memperbarui status pengajuan." }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Data pengajuan tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json(
    { message: "Status pengajuan berhasil diperbarui." },
    { status: 200 }
  );
}