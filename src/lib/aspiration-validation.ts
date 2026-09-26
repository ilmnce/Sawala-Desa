import { ASPIRATION_CATEGORIES, type AspirationCategory } from "./aspiration-constants";

/** Validasi form aspirasi, dipakai bersama klien & server. */

export interface AspirationInput {
  judul: string;
  kategori: string;
  deskripsi: string;
}

export interface AspirationValidationResult {
  fieldErrors: Record<string, string>;
  valid: boolean;
  data?: {
    judul: string;
    kategori: AspirationCategory;
    deskripsi: string;
  };
}

export function validasiAspirasi(input: AspirationInput): AspirationValidationResult {
  const judul = input.judul.trim();
  const deskripsi = input.deskripsi.trim();
  const kategori = input.kategori.trim();
  const fieldErrors: Record<string, string> = {};

  if (judul.length < 5) {
    fieldErrors.judul = "Judul usulan minimal 5 karakter.";
  } else if (judul.length > 150) {
    fieldErrors.judul = "Judul usulan maksimal 150 karakter.";
  }

  if (deskripsi.length < 20) {
    fieldErrors.deskripsi = "Jelaskan permasalahan minimal 20 karakter agar dapat dipahami perangkat desa.";
  } else if (deskripsi.length > 2000) {
    fieldErrors.deskripsi = "Deskripsi maksimal 2000 karakter.";
  }

  if (!ASPIRATION_CATEGORIES.includes(kategori as AspirationCategory)) {
    fieldErrors.kategori = "Pilih kategori yang tersedia.";
  }

  const valid = Object.keys(fieldErrors).length === 0;

  return {
    fieldErrors,
    valid,
    data: valid
      ? { judul, kategori: kategori as AspirationCategory, deskripsi }
      : undefined,
  };
}