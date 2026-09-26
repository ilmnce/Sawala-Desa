import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCurrentUser } from "@/lib/auth";
import { validasiPengajuanSurat } from "@/lib/letter-validation";

/**
 * POST /api/pelayanan
 * Mengirimkan pengajuan surat atas nama pengguna yang login.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Anda belum masuk atau sesi berakhir." }, { status: 401 });
  }
  if (user.role !== "warga") {
    return NextResponse.json({ error: "Hanya akun warga yang dapat mengajukan surat." }, { status: 403 });
  }

  let body: {
    letter_type_id?: unknown;
    jenis_surat?: unknown;
    keperluan?: unknown;
    keterangan_pemohon?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Format permintaan tidak valid." }, { status: 400 });
  }

  const { valid, fieldErrors, data } = validasiPengajuanSurat({
    jenisId: typeof body.letter_type_id === "string" ? body.letter_type_id : "",
    keperluan: typeof body.keperluan === "string" ? body.keperluan : "",
    keterangan: typeof body.keterangan_pemohon === "string" ? body.keterangan_pemohon : "",
  });

  if (!valid || !data) {
    return NextResponse.json(
      { error: "Periksa kembali data pengajuan Anda.", fieldErrors },
      { status: 400 }
    );
  }

  const jenisSurat = typeof body.jenis_surat === "string" ? body.jenis_surat.trim() : "";
  if (!jenisSurat) {
    return NextResponse.json(
      { error: "Kesalahan payload.", fieldErrors: { jenisId: "Nama jenis surat tidak terlampir dari antarmuka." } },
      { status: 400 }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database belum dikonfigurasi." }, { status: 503 });
  }

  const supabase = createClient();
  const { data: created, error } = await supabase
    .from("service_requests")
    .insert({
      pemohon_id: user.id,
      letter_type_id: data.jenisId,
      jenis_surat: jenisSurat,
      keperluan: data.keperluan,
      keterangan_pemohon: data.keterangan || null,
      status: "diajukan",
    })
    .select("id, status")
    .single();

  if (error || !created) {
    return NextResponse.json({ error: "Gagal menyimpan pengajuan. Coba lagi." }, { status: 500 });
  }

  return NextResponse.json(
    {
      data: created,
      message: "Pengajuan surat berhasil dikirim dan sedang menunggu pengecekan perangkat desa.",
    },
    { status: 201 },
  );
}