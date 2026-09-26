/** Validasi pengajuan surat, dipakai bersama klien & server. */

export interface LetterRequestInput {
  jenisId: string;
  keperluan: string;
  keterangan: string;
}

export interface LetterValidationResult {
  fieldErrors: Record<string, string>;
  valid: boolean;
  data?: {
    jenisId: string;
    keperluan: string;
    keterangan: string;
  };
}

export function validasiPengajuanSurat(input: LetterRequestInput): LetterValidationResult {
  const jenisId = input.jenisId.trim();
  const keperluan = input.keperluan.trim();
  const keterangan = input.keterangan.trim();
  const fieldErrors: Record<string, string> = {};

  if (!jenisId) {
    fieldErrors.jenisId = "Pilih jenis surat yang dibutuhkan.";
  }

  // Sanitize minimum length & maximum length untuk cegah overposting buffer.
  if (keperluan.length < 5) {
    fieldErrors.keperluan = "Keperluan minimal 5 karakter.";
  } else if (keperluan.length > 150) {
    fieldErrors.keperluan = "Keperluan maksimal 150 karakter.";
  }

  if (keterangan.length > 500) {
    fieldErrors.keterangan = "Keterangan tambahan maksimal 500 karakter.";
  }

  const valid = Object.keys(fieldErrors).length === 0;

  return {
    fieldErrors,
    valid,
    data: valid
      ? { jenisId, keperluan, keterangan }
      : undefined,
  };
}