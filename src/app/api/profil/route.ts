import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/profil
 * Mengembalikan data profil pengguna aktif (yang sedang login).
 *
 * Otorisasi bersumber dari sesi server (`getCurrentUser`), bukan parameter
 * klien, sehingga warga tidak dapat meminta profil warga lain. Field sensitif
 * (role internal, kolom mentah database) tidak diteruskan apa adanya.
 */
export async function GET() {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return NextResponse.json(
      { error: "Gagal memuat profil. Coba lagi." },
      { status: 500 },
    );
  }

  if (!user) {
    return NextResponse.json(
      { error: "Anda belum masuk atau sesi berakhir." },
      { status: 401 },
    );
  }

  return NextResponse.json(
    {
      data: {
        id: user.id,
        nik: user.nik,
        nama_lengkap: user.namaLengkap,
        role: user.role,
        jenis_kelamin: user.jenisKelamin,
        tempat_lahir: user.tempatLahir,
        tanggal_lahir: user.tanggalLahir,
        alamat: user.alamat,
        rt: user.rt,
        rw: user.rw,
        dusun: user.dusun,
        no_telepon: user.noTelepon,
        pekerjaan: user.pekerjaan,
        is_active: user.isActive,
      },
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store, private" },
    },
  );
}