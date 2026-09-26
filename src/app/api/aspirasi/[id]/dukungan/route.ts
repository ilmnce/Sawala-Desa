import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCurrentUser } from "@/lib/auth";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST   /api/aspirasi/[id]/dukungan  -> beri dukungan (idempoten: 1x per warga)
 * DELETE /api/aspirasi/[id]/dukungan  -> batalkan dukungan milik sendiri
 * PATCH  /api/aspirasi/[id]/dukungan  -> toggle dukungan warga aktif
 *
 * Keunikan ditegakkan di database lewat `unique (aspiration_id, user_id)`,
 * jadi warga tidak dapat memberikan dukungan ganda meski menekan tombol
 * berkali-kali atau mengirim permintaan paralel.
 *
 * Catatan: identitas warga diambil dari NIK pada sesi (auth.uid() -> users.nik),
 * bukan dari parameter klien, sehingga dukungan selalu tercatat atas nama
 * pemilik akun yang sah.
 */
async function hitungDukungan(
  supabase: ReturnType<typeof createClient>,
  aspirationId: string,
  userId: string,
) {
  const { count } = await supabase
    .from("aspiration_supports")
    .select("id", { count: "exact", head: true })
    .eq("aspiration_id", aspirationId);

  const { data } = await supabase
    .from("aspiration_supports")
    .select("id")
    .eq("aspiration_id", aspirationId)
    .eq("user_id", userId)
    .maybeSingle();

  return { dukungan: count ?? 0, didukung: Boolean(data) };
}

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: "ID aspirasi tidak valid." }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Anda belum masuk atau sesi berakhir." }, { status: 401 });
  }
  if (user.role !== "warga") {
    return NextResponse.json(
      { error: "Hanya akun warga yang dapat memberikan dukungan." },
      { status: 403 },
    );
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database belum dikonfigurasi." }, { status: 503 });
  }

  const supabase = createClient();

  // Pastikan aspirasi ada (menghindari baris yatim).
  const { data: aspirasi } = await supabase
    .from("aspirations")
    .select("id, pengusul_id")
    .eq("id", params.id)
    .maybeSingle();

  if (!aspirasi) {
    return NextResponse.json({ error: "Aspirasi tidak ditemukan." }, { status: 404 });
  }
  if (String(aspirasi.pengusul_id) === user.id) {
    return NextResponse.json(
      { error: "Anda tidak perlu mendukung aspirasi milik sendiri." },
      { status: 400 },
    );
  }

  // Upsert idempoten: constraint unik mencegah duplikasi.
  const { error } = await supabase
    .from("aspiration_supports")
    .upsert(
      { aspiration_id: params.id, user_id: user.id },
      { onConflict: "aspiration_id,user_id", ignoreDuplicates: true },
    );

  if (error) {
    return NextResponse.json({ error: "Gagal menyimpan dukungan. Coba lagi." }, { status: 500 });
  }

  const counters = await hitungDukungan(supabase, params.id, user.id);
  return NextResponse.json(counters, { status: 200 });
}

/**
 * Toggle atomik: satu permintaan membalik status dukungan warga aktif.
 * Berguna untuk tombol UI yang tidak melacak state sebelumnya.
 */
export async function PATCH(
  _request: Request,
  { params }: { params: { id: string } },
) {
  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: "ID aspirasi tidak valid." }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Anda belum masuk atau sesi berakhir." }, { status: 401 });
  }
  if (user.role !== "warga") {
    return NextResponse.json(
      { error: "Hanya akun warga yang dapat memberikan dukungan." },
      { status: 403 },
    );
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database belum dikonfigurasi." }, { status: 503 });
  }

  const supabase = createClient();

  const { data: existing } = await supabase
    .from("aspiration_supports")
    .select("id")
    .eq("aspiration_id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("aspiration_supports")
      .delete()
      .eq("aspiration_id", params.id)
      .eq("user_id", user.id);
    if (error) {
      return NextResponse.json({ error: "Gagal membatalkan dukungan." }, { status: 500 });
    }
  } else {
    // Aspirasi harus ada dan bukan milik sendiri.
    const { data: aspirasi } = await supabase
      .from("aspirations")
      .select("id, pengusul_id")
      .eq("id", params.id)
      .maybeSingle();

    if (!aspirasi) {
      return NextResponse.json({ error: "Aspirasi tidak ditemukan." }, { status: 404 });
    }
    if (String(aspirasi.pengusul_id) === user.id) {
      return NextResponse.json(
        { error: "Anda tidak perlu mendukung aspirasi milik sendiri." },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("aspiration_supports")
      .upsert(
        { aspiration_id: params.id, user_id: user.id },
        { onConflict: "aspiration_id,user_id", ignoreDuplicates: true },
      );
    if (error) {
      return NextResponse.json({ error: "Gagal menyimpan dukungan." }, { status: 500 });
    }
  }

  const counters = await hitungDukungan(supabase, params.id, user.id);
  return NextResponse.json(counters, { status: 200 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: "ID aspirasi tidak valid." }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Anda belum masuk atau sesi berakhir." }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database belum dikonfigurasi." }, { status: 503 });
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("aspiration_supports")
    .delete()
    .eq("aspiration_id", params.id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Gagal membatalkan dukungan. Coba lagi." }, { status: 500 });
  }

  const counters = await hitungDukungan(supabase, params.id, user.id);
  return NextResponse.json(counters, { status: 200 });
}