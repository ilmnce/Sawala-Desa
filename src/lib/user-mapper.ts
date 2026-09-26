import type { AppUser, UserRole } from "./types";

/** Petakan baris tabel public.users (snake_case) ke tipe domain AppUser. */
export function mapUserRow(row: Record<string, unknown>): AppUser {
  return {
    id: String(row.id),
    nik: String(row.nik ?? ""),
    namaLengkap: String(row.nama_lengkap ?? ""),
    role: (row.role as UserRole) ?? "warga",
    jenisKelamin: (row.jenis_kelamin as string | null) ?? null,
    tempatLahir: (row.tempat_lahir as string | null) ?? null,
    tanggalLahir: (row.tanggal_lahir as string | null) ?? null,
    alamat: (row.alamat as string | null) ?? null,
    rt: (row.rt as string | null) ?? null,
    rw: (row.rw as string | null) ?? null,
    dusun: (row.dusun as string | null) ?? null,
    noTelepon: (row.no_telepon as string | null) ?? null,
    pekerjaan: (row.pekerjaan as string | null) ?? null,
    isActive: row.is_active !== false,
  };
}