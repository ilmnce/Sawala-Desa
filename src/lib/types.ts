/** Tipe domain bersama untuk SALAWA DESA. */

export type UserRole = "warga" | "admin";

export interface AppUser {
  id: string;
  nik: string;
  namaLengkap: string;
  role: UserRole;
  jenisKelamin?: string | null;
  tempatLahir?: string | null;
  tanggalLahir?: string | null;
  alamat?: string | null;
  rt?: string | null;
  rw?: string | null;
  dusun?: string | null;
  noTelepon?: string | null;
  pekerjaan?: string | null;
  isActive: boolean;
}

export type AspirationStatus =
  | "menunggu"
  | "ditinjau"
  | "prioritas"
  | "ditolak"
  | "terealisasi";

export interface DashboardMetrics {
  aspirasiAktif: number;
  proyekBerjalan: number;
  rataProgress: number;
  anggaranTahunIni: number;
  realisasiAnggaran: number;
  totalWarga: number;
}