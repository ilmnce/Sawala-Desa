import { createClient } from "../supabase/server";
import { isSupabaseConfigured } from "../supabase/env";

export type RequestStatus = "diajukan" | "diproses" | "disetujui" | "ditolak";

export interface ServiceRequest {
  id: string;
  nomorRegistrasi: string | null;
  pemohonId: string;
  pemohonNama: string;
  pemohonNik: string;
  letterTypeId: string | null;
  jenisSurat: string;
  keperluan: string;
  keteranganPemohon: string | null;
  status: RequestStatus;
  catatanAdmin: string | null;
  diprosesOlehId: string | null;
  diprosesOlehNama: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Ambil daftar pengajuan surat beserta identitas pemohon dan pemroses. */
export async function getServiceRequests(options: {
  pemohonId?: string | null;
  status?: RequestStatus | null;
  limit?: number;
} = {}): Promise<ServiceRequest[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = createClient();
    let query = supabase
      .from("service_requests")
      .select(
        "id, nomor_registrasi, pemohon_id, letter_type_id, jenis_surat, keperluan, keterangan_pemohon, status, catatan_admin, diproses_oleh, created_at, updated_at",
      )
      .order("created_at", { ascending: false });

    if (options.pemohonId) query = query.eq("pemohon_id", options.pemohonId);
    if (options.status) query = query.eq("status", options.status);
    if (options.limit) query = query.limit(options.limit);

    const { data, error } = await query;
    if (error || !data) return [];

    // Kumpulkan ID unik pengguna yang terlibat (pemohon & pemroses)
    const userIds = new Set<string>();
    for (const r of data) {
      userIds.add(String(r.pemohon_id));
      if (r.diproses_oleh) userIds.add(String(r.diproses_oleh));
    }
    const ids = Array.from(userIds);

    let usersMap = new Map<string, { nama: string; nik: string }>();
    if (ids.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("id, nama_lengkap, nik")
        .in("id", ids);

      if (users) {
        usersMap = new Map(
          users.map((u) => [String(u.id), { nama: String(u.nama_lengkap ?? ""), nik: String(u.nik ?? "") }]),
        );
      }
    }

    return data.map((row) => {
      const pemohon = usersMap.get(String(row.pemohon_id));
      const pemroses = row.diproses_oleh ? usersMap.get(String(row.diproses_oleh)) : null;

      return {
        id: String(row.id),
        nomorRegistrasi: (row.nomor_registrasi as string | null) ?? null,
        pemohonId: String(row.pemohon_id),
        pemohonNama: pemohon?.nama ?? "Warga Salawa",
        pemohonNik: pemohon?.nik ?? "-",
        letterTypeId: row.letter_type_id ? String(row.letter_type_id) : null,
        jenisSurat: String(row.jenis_surat ?? ""),
        keperluan: String(row.keperluan ?? ""),
        keteranganPemohon: (row.keterangan_pemohon as string | null) ?? null,
        status: (row.status as RequestStatus) ?? "diajukan",
        catatanAdmin: (row.catatan_admin as string | null) ?? null,
        diprosesOlehId: row.diproses_oleh ? String(row.diproses_oleh) : null,
        diprosesOlehNama: pemroses?.nama ?? null,
        createdAt: String(row.created_at ?? ""),
        updatedAt: String(row.updated_at ?? ""),
      };
    });
  } catch {
    return [];
  }
}