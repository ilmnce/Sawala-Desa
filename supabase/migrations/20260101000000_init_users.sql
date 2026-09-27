-- =============================================================================
-- SAWALA DESA - Migration 0001 : Tabel users (warga & admin)
-- =============================================================================
-- Konteks keamanan:
--   * Kredensial (password) TIDAK disimpan di public.users. Password dikelola
--     oleh Supabase Auth (`auth.users`) dalam bentuk hash bcrypt, sehingga tidak
--     pernah tersimpan sebagai plaintext.
--   * `public.users` adalah tabel profil kependudukan yang menyimpan NIK 16
--     digit, identitas warga, dan role. Auth NIK dipetakan ke akun auth melalui
--     email sintetis deterministik "<nik>@warga.sawaladesa.local" (dibuat di
--     layer aplikasi), sehingga NIK tetap menjadi identitas login warga.
--   * Baris profil otomatis dibuat saat akun auth baru terdaftar (trigger),
--     memakai NIK dari metadata pendaftaran.
-- =============================================================================

-- gen_random_uuid() untuk default primary key.
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Enum role pengguna
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('warga', 'admin');
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- Tabel public.users
-- -----------------------------------------------------------------------------
create table if not exists public.users (
  -- id selaras dengan auth.users.id => satu akun auth satu profil.
  id uuid primary key references auth.users (id) on delete cascade,

  -- NIK 16 digit, unik, tidak boleh null (identitas login warga).
  nik text not null,

  nama_lengkap text not null,
  role public.user_role not null default 'warga',

  jenis_kelamin text,
  tempat_lahir text,
  tanggal_lahir date,
  alamat text,
  rt text,
  rw text,
  dusun text,
  no_telepon text,
  pekerjaan text,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint users_nik_format check (nik ~ '^[0-9]{16}$')
);

comment on table public.users is 'Profil warga & admin Sawala Desa. Kredensial dikelola Supabase Auth (auth.users), bukan di sini.';
comment on column public.users.nik is 'Nomor Induk Kependudukan, 16 digit angka, unik per warga.';

-- Satu NIK hanya boleh dimiliki satu akun (case-insensitive via lower()).
create unique index if not exists users_nik_unique_idx on public.users (lower(nik));
create index if not exists users_role_idx on public.users (role);

-- -----------------------------------------------------------------------------
-- Trigger updated_at
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
  before update on public.users
  for each row
  execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Helper: cek apakah pengguna yang login berperan admin.
-- SECURITY DEFINER agar tidak memicu rekursi RLS saat dipakai di policy.
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'admin'
      and u.is_active
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon;

-- -----------------------------------------------------------------------------
-- Trigger: buat profil public.users otomatis saat akun auth baru terdaftar.
-- NIK diambil dari metadata pendaftaran (raw_user_meta_data->>'nik').
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
  v_role public.user_role;
begin
  v_nik := nullif(trim(coalesce(new.raw_user_meta_data ->> 'nik', '')), '');
  v_nama := nullif(trim(coalesce(new.raw_user_meta_data ->> 'nama_lengkap', '')), '');

  -- Role hanya boleh diisi admin; default warga.
  begin
    v_role := coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'warga');
  exception when others then
    v_role := 'warga';
  end;

  -- Tanpa NIK valid, profil tidak dibuat; akun auth tetap ada namun belum aktif.
  if v_nik is null or v_nik !~ '^[0-9]{16}$' then
    return new;
  end if;

  insert into public.users (id, nik, nama_lengkap, role)
  values (
    new.id,
    v_nik,
    coalesce(v_nama, 'Warga Sawala'),
    case when v_role = 'admin' then 'admin' else 'warga' end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.users enable row level security;

-- Bersihkan policy lama agar migrasi idempotent.
drop policy if exists "users_select_self" on public.users;
drop policy if exists "users_update_self" on public.users;
drop policy if exists "users_admin_select_all" on public.users;
drop policy if exists "users_admin_update_all" on public.users;

-- Warga: hanya boleh membaca profil miliknya sendiri.
create policy "users_select_self"
  on public.users
  for select
  to authenticated
  using (id = auth.uid());

-- Warga: hanya boleh memperbarui profilnya sendiri.
create policy "users_update_self"
  on public.users
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Admin: boleh membaca seluruh data warga.
create policy "users_admin_select_all"
  on public.users
  for select
  to authenticated
  using (public.is_admin());

-- Admin: boleh memperbarui seluruh data warga.
create policy "users_admin_update_all"
  on public.users
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Catatan: pembuatan profil warga dilakukan oleh trigger security definer
-- (handle_new_user) dan oleh admin via service role, sehingga INSERT tidak
-- dibuka untuk role authenticated agar warga tidak bisa memalsukan baris profil.