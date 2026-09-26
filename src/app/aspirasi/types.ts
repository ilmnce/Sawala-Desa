/** Tipe state form aspirasi (bebas "use server" agar dapat diimpor klien). */
export interface AspirationActionState {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
}