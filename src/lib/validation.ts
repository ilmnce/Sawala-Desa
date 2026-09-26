/** Validasi bersama untuk form warga & admin. */

export function isValidNik(nik: string): boolean {
  return /^[0-9]{16}$/.test(nik.trim());
}

export interface FieldErrors {
  [field: string]: string | undefined;
}

export function required(value: string, label: string): string | undefined {
  return value.trim().length === 0 ? `${label} wajib diisi.` : undefined;
}

export function minLength(value: string, length: number, label: string): string | undefined {
  return value.trim().length < length ? `${label} minimal ${length} karakter.` : undefined;
}

/** Ringkas error Supabase Auth menjadi pesan Bahasa Indonesia yang jelas. */
export function authErrorMessage(message: string): string {
  const lowered = message.toLowerCase();
  if (lowered.includes("invalid login credentials")) {
    return "NIK atau password salah. Periksa kembali data Anda.";
  }
  if (lowered.includes("email not confirmed")) {
    return "Akun belum diverifikasi. Hubungi kantor desa.";
  }
  if (lowered.includes("too many requests") || lowered.includes("rate limit")) {
    return "Terlalu banyak percobaan. Coba lagi beberapa saat.";
  }
  if (lowered.includes("failed to fetch") || lowered.includes("network")) {
    return "Tidak dapat terhubung ke server. Periksa koneksi Anda.";
  }
  if (lowered.includes("user already registered")) {
    return "NIK sudah terdaftar. Gunakan NIK lain atau masuk ke akun Anda.";
  }
  return "Terjadi kesalahan saat memproses permintaan. Coba lagi.";
}