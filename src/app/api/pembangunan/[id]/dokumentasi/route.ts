import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { DOCUMENTATION_BUCKET } from "@/lib/supabase/storage";
import { getCurrentUser } from "@/lib/auth";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Pembangkit nama acak sederhana untuk mencegah benturan nama file. */
function randomString(length = 8) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length })
    .map(() => chars.charAt(Math.floor(Math.random() * chars.length)))
    .join("");
}

/**
 * POST /api/pembangunan/[id]/dokumentasi
 *
 * Mengunggah foto dokumentasi pembangunan baru.
 * Berlaku khusus bagi admin; file diunggah ke Supabase Storage, diregistrasikan
 * di tabel `program_documentations`.
 */
export async function POST(
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
      { error: "Hanya admin yang boleh mengunggah dokumentasi." },
      { status: 403 },
    );
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database belum dikonfigurasi." }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Format permintaan tidak valid. Pastikan memakai form-data." },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  const judul = formData.get("judul");
  const keterangan = formData.get("keterangan");

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "File foto wajib disertakan." }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Ukuran file terlalu besar. Maksimal 5 MB." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Format file tidak didukung. Gunakan JPG, PNG, atau WebP." },
      { status: 400 },
    );
  }

  // Bersihkan input teks.
  const cleanJudul = typeof judul === "string" ? judul.trim() : "";
  const cleanKeterangan = typeof keterangan === "string" ? keterangan.trim() : "";

  if (cleanJudul && cleanJudul.length > 150) {
    return NextResponse.json({ error: "Judul foto terlalu panjang." }, { status: 400 });
  }
  if (cleanKeterangan && cleanKeterangan.length > 500) {
    return NextResponse.json({ error: "Keterangan foto terlalu panjang." }, { status: 400 });
  }

  const supabase = createClient();

  // Pastikan program ada.
  const { data: program } = await supabase
    .from("development_programs")
    .select("id")
    .eq("id", params.id)
    .maybeSingle();

  if (!program) {
    return NextResponse.json({ error: "Program tidak ditemukan." }, { status: 404 });
  }

  // Unggah ke storage.
  const ext = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
  const storagePath = `program/${params.id}/${Date.now()}-${randomString()}.${ext}`;

  // Supabase-js menerima Blob di browser maupun node.
  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTATION_BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: "Gagal mengunggah foto ke penyimpanan." }, { status: 500 });
  }

  // Daftarkan di database agar tampil di galeri.
  const { error: dbError } = await supabase.from("program_documentations").insert({
    program_id: params.id,
    judul: cleanJudul || null,
    keterangan: cleanKeterangan || null,
    storage_path: storagePath,
  });

  if (dbError) {
    // Upaya pembersihan bila insert DB gagal.
    await supabase.storage.from(DOCUMENTATION_BUCKET).remove([storagePath]);
    return NextResponse.json({ error: "Gagal menyimpan referensi dokumentasi." }, { status: 500 });
  }

  return NextResponse.json({ message: "Foto dokumentasi berhasil diunggah." }, { status: 201 });
}

/**
 * DELETE /api/pembangunan/[id]/dokumentasi
 * Menghapus foto dari galeri (membuang referensi DB & objek storage).
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: "ID program tidak valid." }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database belum dikonfigurasi." }, { status: 503 });
  }

  const url = new URL(request.url);
  const docId = url.searchParams.get("docId");

  if (!docId || !UUID_RE.test(docId)) {
    return NextResponse.json({ error: "ID dokumentasi tidak valid." }, { status: 400 });
  }

  const supabase = createClient();

  // Ambil path storage sebelum dihapus.
  const { data: doc } = await supabase
    .from("program_documentations")
    .select("storage_path")
    .eq("id", docId)
    .eq("program_id", params.id)
    .maybeSingle();

  if (!doc) {
    return NextResponse.json({ error: "Dokumentasi tidak ditemukan." }, { status: 404 });
  }

  // Hapus referensi dari database (storage tidak perlu cascade secara atomik,
  // tapi kita harus pastikan baris data terhapus lebih dulu).
  const { error } = await supabase
    .from("program_documentations")
    .delete()
    .eq("id", docId);

  if (error) {
    return NextResponse.json({ error: "Gagal menghapus dokumentasi." }, { status: 500 });
  }

  // Usahakan menghapus file dari storage (abaikan log error bila storage gagal).
  await supabase.storage.from(DOCUMENTATION_BUCKET).remove([doc.storage_path]);

  return NextResponse.json({ message: "Dokumentasi berhasil dihapus." }, { status: 200 });
}