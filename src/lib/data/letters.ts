import { createClient } from "../supabase/server";
import { isSupabaseConfigured } from "../supabase/env";

export interface LetterType {
  id: string;
  kode: string;
  nama: string;
  deskripsi: string | null;
}

/** Ambil master jenis surat yang aktif untuk form pengajuan. */
export async function getActiveLetterTypes(): Promise<LetterType[]> {
  if (!isSupabaseConfigured()) {
    // Fallback data agar form tetap bisa dirender di kondisi unconfigured.
    return [
      { id: "fallback-sku", kode: "SKU", nama: "Surat Keterangan Usaha", deskripsi: "Syarat pengajuan pinjaman/bantuan UMKM." },
      { id: "fallback-sktm", kode: "SKTM", nama: "Surat Keterangan Tidak Mampu", deskripsi: "Syarat beasiswa atau bantuan sosial." },
      { id: "fallback-domisili", kode: "SKD", nama: "Surat Keterangan Domisili", deskripsi: "Keterangan tempat tinggal sementara." },
    ];
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("letter_types")
      .select("id, kode, nama, deskripsi")
      .eq("is_active", true)
      .order("nama");

    if (error || !data || data.length === 0) {
      return [
        { id: "fallback-sku", kode: "SKU", nama: "Surat Keterangan Usaha", deskripsi: "Syarat pengajuan pinjaman/bantuan UMKM." },
        { id: "fallback-sktm", kode: "SKTM", nama: "Surat Keterangan Tidak Mampu", deskripsi: "Syarat beasiswa atau bantuan sosial." },
        { id: "fallback-domisili", kode: "SKD", nama: "Surat Keterangan Domisili", deskripsi: "Keterangan tempat tinggal sementara." },
      ];
    }

    return data.map((r) => ({
      id: String(r.id),
      kode: String(r.kode),
      nama: String(r.nama),
      deskripsi: r.deskripsi ? String(r.deskripsi) : null,
    }));
  } catch {
    return [];
  }
}