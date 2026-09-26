import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCurrentUser } from "@/lib/auth";
import { ASPIRATION_STATUS_LABELS } from "@/lib/aspiration-constants";
import type { AspirationStatus } from "@/lib/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VALID_STATUS = Object.keys(ASPIRATION_STATUS_LABELS) as AspirationStatus[];

/**
 * PATCH /api/aspirasi/[id]/status
 *
 * Mengubah status, prioritas Musdes, dan catatan verifikasi sebuah aspirasi.
 * Hanya admin; warga yang mencoba akan ditolak 403. Trigger database
 * `guard_aspiration_admin_fields` menjadi lapisan pertahanan kedua.
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: "ID aspirasi tidak valid." }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Anda belum masuk atau sesi berakhir." }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Hanya admin yang boleh mengubah status aspirasi." },
      { status: 403 },
    );
  }

  let body: { status?: unknown; prioritas?: unknown; catatan_admin?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Format permintaan tidak valid." }, { status: 400 });
  }

  const status = typeof body.status === "string" ? body.status : "";
  const prioritas = typeof body.prioritas === "boolean" ? body.prioritas : undefined;
  const catatan =
    typeof body.catatan_admin === "string" ? body.catatan_admin.trim() : undefined;

  const fieldErrors: Record<string, string> = {};
  if (!VALID_STATUS.includes(status as AspirationStatus)) {
    fieldErrors.status = `Status tidak dikenal. Pilihan: ${VALID_STATUS.join(", ")}.`;
  }
  if (catatan !== undefined && catatan.length > 500) {
    fieldErrors.catatan_admin = "Catatan maksimal 500 karakter.";
  }
  if (status === "ditolak" && (catatan === undefined || catatan.length < 5)) {
    fieldErrors.catatan_admin = "Sertakan alasan penolakan minimal 5 karakter.";
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

  const update: Record<string, unknown> = { status };
  if (prioritas !== undefined) update.prioritas = prioritas;
  if (catatan !== undefined) update.catatan_admin = catatan || null;

  const { data, error } = await supabase
    .from("aspirations")
    .update(update)
    .eq("id", params.id)
    .select("id, status, prioritas, catatan_admin")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Gagal memperbarui aspirasi. Coba lagi." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Aspirasi tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json(
    {
      data: {
        id: data.id,
        status: data.status,
        prioritas: data.prioritas,
        catatan_admin: data.catatan_admin,
      },
      message: "Status aspirasi berhasil diperbarui.",
    },
    { status: 200 },
  );
}