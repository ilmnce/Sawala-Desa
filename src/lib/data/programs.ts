import { createClient } from "../supabase/server";
import { isSupabaseConfigured } from "../supabase/env";
import type { ProgramStatus, ProgramKategori } from "../program-constants";

export interface ProgramDocumentation {
  id: string;
  judul: string | null;
  keterangan: string | null;
  storagePath: string;
}

export interface DevelopmentProgram {
  id: string;
  nama: string;
  deskripsi: string | null;
  kategori: ProgramKategori;
  lokasi: string | null;
  pelaksana: string | null;
  anggaran: number;
  progress: number;
  status: ProgramStatus;
  tanggalMulai: string | null;
  tanggalSelesai: string | null;
  dokumentasi: ProgramDocumentation[];
  createdAt: string;
}

export interface ProgramMilestone {
  id: string;
  judul: string;
  keterangan: string | null;
  progress: number;
  status: ProgramStatus;
  terjadiPada: string;
}

/** Bentuk baris dokumentasi mentah dari Supabase (snake_case). */
interface RawDocumentation {
  id: unknown;
  judul: unknown;
  keterangan: unknown;
  storage_path: unknown;
}

/** Petakan baris program mentah ke tipe domain (snake_case -> camelCase). */
function mapProgramRow(row: Record<string, unknown>): DevelopmentProgram {
  const documents = (row.program_documentations as RawDocumentation[] | null) ?? [];

  return {
    id: String(row.id),
    nama: String(row.nama ?? ""),
    deskripsi: (row.deskripsi as string | null) ?? null,
    kategori: (row.kategori as ProgramKategori) ?? "fisik",
    lokasi: (row.lokasi as string | null) ?? null,
    pelaksana: (row.pelaksana as string | null) ?? null,
    anggaran: Number(row.anggaran ?? 0),
    progress: Number(row.progress ?? 0),
    status: (row.status as ProgramStatus) ?? "direncanakan",
    tanggalMulai: (row.tanggal_mulai as string | null) ?? null,
    tanggalSelesai: (row.tanggal_selesai as string | null) ?? null,
    dokumentasi: documents.map((d) => ({
      id: String(d.id),
      judul: (d.judul as string | null) ?? null,
      keterangan: (d.keterangan as string | null) ?? null,
      storagePath: String(d.storage_path ?? ""),
    })),
    createdAt: String(row.created_at ?? ""),
  };
}

/** Ambil daftar program pembangunan beserta dokumentasi fotonya. */
export async function getPrograms(options: {
  status?: ProgramStatus | null;
  limit?: number;
} = {}): Promise<DevelopmentProgram[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = createClient();
    let query = supabase
      .from("development_programs")
      .select(
        "id, nama, deskripsi, kategori, lokasi, pelaksana, anggaran, progress, status, tanggal_mulai, tanggal_selesai, created_at, program_documentations(id, judul, keterangan, storage_path)",
      )
      .order("created_at", { ascending: false });

    if (options.status) query = query.eq("status", options.status);
    if (options.limit) query = query.limit(options.limit);

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map(mapProgramRow);
  } catch {
    return [];
  }
}

/**
 * Ambil riwayat milestone sebuah program (terbaru lebih dulu).
 * Mengembalikan array kosong bila tabel belum ada / DB belum dikonfigurasi.
 */
export async function getProgramMilestones(programId: string): Promise<ProgramMilestone[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("program_milestones")
      .select("id, judul, keterangan, progress, status, terjadi_pada")
      .eq("program_id", programId)
      .order("terjadi_pada", { ascending: false });

    if (error || !data) return [];

    return data.map((row) => ({
      id: String(row.id),
      judul: String(row.judul ?? ""),
      keterangan: (row.keterangan as string | null) ?? null,
      progress: Number(row.progress ?? 0),
      status: (row.status as ProgramStatus) ?? "berjalan",
      terjadiPada: String(row.terjadi_pada ?? ""),
    }));
  } catch {
    return [];
  }
}

/** Ambil satu program berdasarkan id (untuk halaman detail). */
export async function getProgramById(id: string): Promise<DevelopmentProgram | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("development_programs")
      .select(
        "id, nama, deskripsi, kategori, lokasi, pelaksana, anggaran, progress, status, tanggal_mulai, tanggal_selesai, created_at, program_documentations(id, judul, keterangan, storage_path)",
      )
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;

    return mapProgramRow(data);
  } catch {
    return null;
  }
}