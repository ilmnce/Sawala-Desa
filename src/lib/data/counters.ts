import { createClient } from "../supabase/server";
import { isSupabaseConfigured } from "../supabase/env";
import type { AppUser } from "../types";

export interface UserCounters {
  /** Aspirasi milik pengguna yang masih berjalan (belum final). */
  aspirasiAktif: number;
  /** Aspirasi milik pengguna yang sudah terealisasi. */
  aspirasiTerealisasi: number;
  /** Pengajuan surat milik pengguna yang masih diproses. */
  suratDiproses: number;
  /** Pengajuan surat milik pengguna yang sudah disetujui. */
  suratDisetujui: number;
  /** Pengajuan surat milik pengguna yang ditolak (perlu tindak lanjut). */
  suratDitolak: number;
  /** Total badge "perlu perhatian" untuk ditampilkan di navigasi. */
  perluPerhatian: number;
}

const EMPTY: UserCounters = {
  aspirasiAktif: 0,
  aspirasiTerealisasi: 0,
  suratDiproses: 0,
  suratDisetujui: 0,
  suratDitolak: 0,
  perluPerhatian: 0,
};

export interface AdminCounters {
  aspirasiMenunggu: number;
  aspirasiPrioritas: number;
  suratMasuk: number;
  totalWarga: number;
  perluPerhatian: number;
}

const EMPTY_ADMIN: AdminCounters = {
  aspirasiMenunggu: 0,
  aspirasiPrioritas: 0,
  suratMasuk: 0,
  totalWarga: 0,
  perluPerhatian: 0,
};

/** Hitung counter untuk warga berdasarkan data miliknya sendiri (difilter user_id). */
export async function getUserCounters(user: AppUser): Promise<UserCounters> {
  if (!isSupabaseConfigured()) return { ...EMPTY };

  const supabase = createClient();
  const counters: UserCounters = { ...EMPTY };

  try {
    const { data } = await supabase
      .from("aspirations")
      .select("status")
      .eq("pengusul_id", user.id);
    if (data) {
      counters.aspirasiAktif = data.filter((r) =>
        ["menunggu", "ditinjau", "prioritas"].includes(String(r.status)),
      ).length;
      counters.aspirasiTerealisasi = data.filter((r) => r.status === "terealisasi").length;
    }
  } catch {
    /* tabel belum tersedia */
  }

  try {
    const { data } = await supabase
      .from("service_requests")
      .select("status")
      .eq("pemohon_id", user.id);
    if (data) {
      counters.suratDiproses = data.filter((r) =>
        ["diajukan", "diproses"].includes(String(r.status)),
      ).length;
      counters.suratDisetujui = data.filter((r) => r.status === "disetujui").length;
      counters.suratDitolak = data.filter((r) => r.status === "ditolak").length;
    }
  } catch {
    /* tabel belum tersedia */
  }

  // Badge "perlu perhatian": berkas yang sedang diproses + yang ditolak.
  counters.perluPerhatian = counters.suratDiproses + counters.suratDitolak;
  return counters;
}

/** Hitung counter antrean kerja untuk admin. */
export async function getAdminCounters(): Promise<AdminCounters> {
  if (!isSupabaseConfigured()) return { ...EMPTY_ADMIN };

  const supabase = createClient();
  const counters: AdminCounters = { ...EMPTY_ADMIN };

  try {
    const { data } = await supabase.from("aspirations").select("status, prioritas");
    if (data) {
      counters.aspirasiMenunggu = data.filter((r) => r.status === "menunggu").length;
      counters.aspirasiPrioritas = data.filter((r) => r.prioritas === true).length;
    }
  } catch {
    /* tabel belum tersedia */
  }

  try {
    const { data } = await supabase.from("service_requests").select("status");
    if (data) {
      counters.suratMasuk = data.filter((r) =>
        ["diajukan", "diproses"].includes(String(r.status)),
      ).length;
    }
  } catch {
    /* tabel belum tersedia */
  }

  try {
    const { count } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("role", "warga");
    counters.totalWarga = count ?? 0;
  } catch {
    /* tabel belum tersedia */
  }

  counters.perluPerhatian = counters.aspirasiMenunggu + counters.suratMasuk;
  return counters;
}