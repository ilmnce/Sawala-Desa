/** Validasi ganti password yang dipakai bersama server action & route handler. */

export interface PasswordInput {
  passwordLama: string;
  passwordBaru: string;
  konfirmasi: string;
}

export interface PasswordValidation {
  fieldErrors: Record<string, string>;
}

export function validasiGantiPassword(input: PasswordInput): PasswordValidation {
  const fieldErrors: Record<string, string> = {};

  if (input.passwordLama.length === 0) {
    fieldErrors.password_lama = "Password lama wajib diisi.";
  }
  if (input.passwordBaru.length < 8) {
    fieldErrors.password_baru = "Password baru minimal 8 karakter.";
  } else if (!/[A-Za-z]/.test(input.passwordBaru) || !/[0-9]/.test(input.passwordBaru)) {
    fieldErrors.password_baru = "Password baru harus memuat huruf dan angka.";
  }
  if (input.passwordBaru !== input.konfirmasi) {
    fieldErrors.konfirmasi = "Konfirmasi password tidak sama.";
  }
  if (
    input.passwordBaru.length > 0 &&
    input.passwordLama.length > 0 &&
    input.passwordBaru === input.passwordLama
  ) {
    fieldErrors.password_baru = "Password baru harus berbeda dari password lama.";
  }

  return { fieldErrors };
}