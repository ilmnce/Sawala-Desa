/**
 * Konfigurasi lingkungan Supabase.
 *
 * Aplikasi memakai Supabase (PostgreSQL + Auth + Storage) sebagai satu-satunya
 * sumber data. Bila variabel lingkungan belum diisi (mis. saat pertama kali
 * setup), helper `isSupabaseConfigured()` bernilai false dan halaman akan
 * menampilkan status "belum dikonfigurasi" alih-alih error tak terkendali.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Domain email sintetis untuk memetakan NIK 16 digit ke akun Supabase Auth. */
export const NIK_EMAIL_DOMAIN = "warga.salawadesa.local";

export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL.trim().length > 0 && SUPABASE_ANON_KEY.trim().length > 0;
}

/** Ubah NIK menjadi email sintetis deterministik untuk Supabase Auth. */
export function nikToEmail(nik: string): string {
  return `${nik.trim()}@${NIK_EMAIL_DOMAIN}`;
}