-- =============================================================================
-- SAWALA DESA - Migration 0005 : Registrasi warga mandiri
-- =============================================================================
-- Konteks: klien meminta akun warga dibuat oleh warga sendiri dari halaman
-- publik (/register), bukan lagi selalu oleh admin.
--
-- Dua hal yang harus berubah di level database:
--
--  1) Proteksi privilege escalation.
--     Trigger handle_new_user (migrasi 0001) membaca role dari
--     raw_user_meta_data->>'role'. Nilai itu dikontrol oleh klien browser
--     pada jalur registrasi publik, jadi bila trigger mempercayainya, siapa
--     saja bisa mendaftar menjadi admin. Versi ini memaksa role baru menjadi
--     'warga'. Kenaikan privilege admin tetap hanya via service role / SQL.
--
--  2) Baris profil hanya dibuat oleh trigger -- client TIDAK boleh INSERT.
--     Registrasi memakai anon key, sedangkan RLS tidak membuka INSERT pada
--     public.users. Jadi update kolom detail (RT/RW, alamat, telepon, ...)
--     dijalankan endpoint server dengan service role, tepat setelah akun auth
--     terbentuk dan trigger sempat membuat baris profilnya.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- handle_new_user versi aman untuk pendaftaran publik
-- -----------------------------------------------------------------------------
-- Perilaku lama dipertahankan semaksimal mungkin:
--   * NIK tetap wajib 16 digit dari metadata, tanpa NIK tidak ada profil.
--   * Nama diambil dari metadata dengan fallback 'Warga Sawala'.
--   * on conflict (id) do nothing tetap idempotent.
-- Satu-satunya perubahan: role selalu 'warga'.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nik text;
  v_nama text;
begin
  v_nik := nullif(trim(coalesce(new.raw_user_meta_data ->> 'nik', '')), '');
  v_nama := nullif(trim(coalesce(new.raw_user_meta_data ->> 'nama_lengkap', '')), '');

  -- Tanpa NIK valid, profil tidak dibuat; akun auth tetap ada namun belum aktif.
  if v_nik is null or v_nik !~ '^[0-9]{16}$' then
    return new;
  end if;

  insert into public.users (id, nik, nama_lengkap, role)
  values (new.id, v_nik, coalesce(v_nama, 'Warga Sawala'), 'warga')
  on conflict (id) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Membuat profil public.users saat akun auth baru terdaftar. Role selalu "warga" -- nilai metadata "role" sengaja diabaikan agar registrasi publik tidak bisa menjadi admin.';

-- Trigger on_auth_user_created (migrasi 0001) memanggil fungsi ini dan tidak
-- perlu dibuat ulang. Jika belum ada (mis. dijalankan terpisah), buat di sini.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
