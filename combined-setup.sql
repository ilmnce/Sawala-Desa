-- SAWALA DESA: COMBINED SETUP

-- >>> 20260101000000_init_users.sql <<<
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

-- >>> 20260101000001_init_announcements.sql <<<
-- =============================================================================
-- SAWALA DESA - Migration 0002 : Pengumuman & agenda desa
-- =============================================================================
-- Pengumuman dikelola admin dan ditampilkan kronologis di beranda publik.
-- =============================================================================

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  ringkasan text,
  isi text not null,
  kategori text not null default 'umum',
  is_published boolean not null default true,
  tanggal_mulai date,
  tanggal_selesai date,
  lokasi text,
  penulis_id uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint announcements_judul_len check (char_length(judul) between 3 and 150),
  constraint announcements_kategori_valid check (kategori in ('umum', 'agenda', 'pembangunan', 'layanan', 'anggaran'))
);

comment on table public.announcements is 'Pengumuman & agenda desa yang tampil di beranda publik.';

create index if not exists announcements_published_idx
  on public.announcements (is_published, created_at desc);

drop trigger if exists announcements_set_updated_at on public.announcements;
create trigger announcements_set_updated_at
  before update on public.announcements
  for each row
  execute function public.set_updated_at();

alter table public.announcements enable row level security;

drop policy if exists "announcements_public_read" on public.announcements;
drop policy if exists "announcements_admin_write" on public.announcements;
drop policy if exists "announcements_admin_update" on public.announcements;
drop policy if exists "announcements_admin_delete" on public.announcements;

-- Semua orang (termasuk anonim) boleh membaca pengumuman yang sudah terbit.
create policy "announcements_public_read"
  on public.announcements
  for select
  to anon, authenticated
  using (is_published = true or public.is_admin());

-- Hanya admin yang boleh menulis/mengubah/menghapus.
create policy "announcements_admin_write"
  on public.announcements
  for insert
  to authenticated
  with check (public.is_admin());

create policy "announcements_admin_update"
  on public.announcements
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "announcements_admin_delete"
  on public.announcements
  for delete
  to authenticated
  using (public.is_admin());

-- >>> 20260101000002_init_core_modules.sql <<<
-- =============================================================================
-- SAWALA DESA - Migration 0003 : Entitas inti (aspirasi, pembangunan, anggaran)
-- =============================================================================
-- Tabel-tabel ini menjadi sumber agregasi statistik desa dan dipakai lintas
-- modul (aspirasi, pembangunan, transparansi).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enum
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'aspiration_status') then
    create type public.aspiration_status as enum ('menunggu', 'ditinjau', 'prioritas', 'ditolak', 'terealisasi');
  end if;
  if not exists (select 1 from pg_type where typname = 'program_status') then
    create type public.program_status as enum ('direncanakan', 'berjalan', 'selesai', 'ditunda');
  end if;
  if not exists (select 1 from pg_type where typname = 'budget_jenis') then
    create type public.budget_jenis as enum ('pendapatan', 'belanja', 'realisasi');
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- ASPIRASI WARGA & MUSDES
-- -----------------------------------------------------------------------------
create table if not exists public.aspirations (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  kategori text not null default 'umum',
  deskripsi text not null,
  status public.aspiration_status not null default 'menunggu',
  prioritas boolean not null default false,
  catatan_admin text,
  pengusul_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint aspirations_judul_len check (char_length(judul) between 5 and 150),
  constraint aspirations_deskripsi_len check (char_length(deskripsi) >= 10)
);

comment on table public.aspirations is 'Usulan aspirasi warga untuk Musyawarah Desa.';

create index if not exists aspirations_status_idx on public.aspirations (status, created_at desc);
create index if not exists aspirations_pengusul_idx on public.aspirations (pengusul_id);

drop trigger if exists aspirations_set_updated_at on public.aspirations;
create trigger aspirations_set_updated_at
  before update on public.aspirations
  for each row execute function public.set_updated_at();

-- Dukungan warga: satu baris per (aspirasi, warga) -> vote hanya sekali.
create table if not exists public.aspiration_supports (
  id uuid primary key default gen_random_uuid(),
  aspiration_id uuid not null references public.aspirations (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  -- NIK disimpan agar keunikan tetap terjaga pada tingkat identitas kependudukan,
  -- sejalan dengan aturan "satu dukungan per NIK per aspirasi".
  nik text,
  created_at timestamptz not null default now(),

  -- Satu warga (aktor auth) hanya boleh mendukung satu kali per aspirasi.
  constraint aspiration_supports_unique unique (aspiration_id, user_id)
);

comment on table public.aspiration_supports is 'Dukungan (vote) warga; unique (aspiration_id, user_id) menjamin satu dukungan per warga per aspirasi.';

-- Keunikan tambahan pada tingkat NIK, bila NIK terisi.
create unique index if not exists aspiration_supports_nik_unique_idx
  on public.aspiration_supports (aspiration_id, nik)
  where nik is not null;

create index if not exists aspiration_supports_aspiration_idx on public.aspiration_supports (aspiration_id);

-- Isi kolom NIK otomatis dari profil warga saat dukungan dibuat/diubah.
create or replace function public.fill_support_nik()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.nik is null then
    select u.nik into new.nik from public.users u where u.id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists aspiration_supports_fill_nik on public.aspiration_supports;
create trigger aspiration_supports_fill_nik
  before insert or update on public.aspiration_supports
  for each row execute function public.fill_support_nik();

-- -----------------------------------------------------------------------------
-- PROGRAM PEMBANGUNAN
-- -----------------------------------------------------------------------------
create table if not exists public.development_programs (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  deskripsi text,
  kategori text not null default 'fisik',
  lokasi text,
  pelaksana text,
  anggaran numeric(14, 2) not null default 0,
  progress integer not null default 0,
  status public.program_status not null default 'direncanakan',
  tanggal_mulai date,
  tanggal_selesai date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint development_programs_progress_range check (progress between 0 and 100)
);

comment on table public.development_programs is 'Program kerja pembangunan desa beserta progress fisiknya.';

create index if not exists development_programs_status_idx on public.development_programs (status, created_at desc);

drop trigger if exists development_programs_set_updated_at on public.development_programs;
create trigger development_programs_set_updated_at
  before update on public.development_programs
  for each row execute function public.set_updated_at();

-- Dokumentasi foto program pembangunan.
create table if not exists public.program_documentations (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.development_programs (id) on delete cascade,
  judul text,
  keterangan text,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists program_documentations_program_idx on public.program_documentations (program_id);

-- -----------------------------------------------------------------------------
-- ANGGARAN APBDes
-- -----------------------------------------------------------------------------
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  tahun integer not null,
  jenis public.budget_jenis not null,
  kategori text not null default 'umum',
  uraian text not null,
  jumlah numeric(14, 2) not null default 0,
  program_id uuid references public.development_programs (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint budgets_tahun_range check (tahun between 2000 and 2100),
  constraint budgets_jumlah_positive check (jumlah >= 0)
);

comment on table public.budgets is 'Pos anggaran pendapatan, belanja, dan realisasi APBDes per tahun.';

create index if not exists budgets_tahun_jenis_idx on public.budgets (tahun, jenis);

drop trigger if exists budgets_set_updated_at on public.budgets;
create trigger budgets_set_updated_at
  before update on public.budgets
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------
alter table public.aspirations enable row level security;
alter table public.aspiration_supports enable row level security;
alter table public.development_programs enable row level security;
alter table public.program_documentations enable row level security;
alter table public.budgets enable row level security;

-- ASPIRASI: semua pengguna login boleh membaca (transparansi usulan warga).
drop policy if exists "aspirations_read_all" on public.aspirations;
drop policy if exists "aspirations_insert_self" on public.aspirations;
drop policy if exists "aspirations_update_owner_or_admin" on public.aspirations;
drop policy if exists "aspirations_delete_owner_or_admin" on public.aspirations;

create policy "aspirations_read_all"
  on public.aspirations for select to authenticated using (true);

create policy "aspirations_insert_self"
  on public.aspirations for insert to authenticated
  with check (pengusul_id = auth.uid());

-- Warga hanya boleh mengubah aspirasinya sendiri dan tidak boleh menaikkan
-- status/prioritas (ditegakkan di layer aplikasi + trigger di bawah).
create policy "aspirations_update_owner_or_admin"
  on public.aspirations for update to authenticated
  using (pengusul_id = auth.uid() or public.is_admin())
  with check (pengusul_id = auth.uid() or public.is_admin());

create policy "aspirations_delete_owner_or_admin"
  on public.aspirations for delete to authenticated
  using (public.is_admin());

-- Cegah warga mengubah status/prioritas aspirasi miliknya sendiri.
create or replace function public.guard_aspiration_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    if new.status is distinct from old.status
       or new.prioritas is distinct from old.prioritas
       or new.catatan_admin is distinct from old.catatan_admin then
      raise exception 'Hanya admin yang boleh mengubah status, prioritas, atau catatan aspirasi.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists aspirations_guard_admin_fields on public.aspirations;
create trigger aspirations_guard_admin_fields
  before update on public.aspirations
  for each row execute function public.guard_aspiration_admin_fields();

-- DUKUNGAN: warga hanya boleh menambah/menghapus dukungan miliknya sendiri.
drop policy if exists "supports_read_all" on public.aspiration_supports;
drop policy if exists "supports_insert_self" on public.aspiration_supports;
drop policy if exists "supports_delete_self" on public.aspiration_supports;

create policy "supports_read_all"
  on public.aspiration_supports for select to authenticated using (true);

create policy "supports_insert_self"
  on public.aspiration_supports for insert to authenticated
  with check (user_id = auth.uid());

create policy "supports_delete_self"
  on public.aspiration_supports for delete to authenticated
  using (user_id = auth.uid());

-- PEMBANGUNAN: publik boleh membaca; hanya admin yang mengubah.
drop policy if exists "programs_public_read" on public.development_programs;
drop policy if exists "programs_admin_write" on public.development_programs;
drop policy if exists "programs_admin_update" on public.development_programs;
drop policy if exists "programs_admin_delete" on public.development_programs;

create policy "programs_public_read"
  on public.development_programs for select to anon, authenticated using (true);

create policy "programs_admin_write"
  on public.development_programs for insert to authenticated with check (public.is_admin());

create policy "programs_admin_update"
  on public.development_programs for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "programs_admin_delete"
  on public.development_programs for delete to authenticated using (public.is_admin());

-- DOKUMENTASI: publik boleh membaca; hanya admin yang mengubah.
drop policy if exists "docs_public_read" on public.program_documentations;
drop policy if exists "docs_admin_write" on public.program_documentations;
drop policy if exists "docs_admin_delete" on public.program_documentations;

create policy "docs_public_read"
  on public.program_documentations for select to anon, authenticated using (true);

create policy "docs_admin_write"
  on public.program_documentations for insert to authenticated with check (public.is_admin());

create policy "docs_admin_delete"
  on public.program_documentations for delete to authenticated using (public.is_admin());

-- ANGGARAN: publik boleh membaca (transparansi); hanya admin yang mengubah.
drop policy if exists "budgets_public_read" on public.budgets;
drop policy if exists "budgets_admin_write" on public.budgets;
drop policy if exists "budgets_admin_update" on public.budgets;
drop policy if exists "budgets_admin_delete" on public.budgets;

create policy "budgets_public_read"
  on public.budgets for select to anon, authenticated using (true);

create policy "budgets_admin_write"
  on public.budgets for insert to authenticated with check (public.is_admin());

create policy "budgets_admin_update"
  on public.budgets for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "budgets_admin_delete"
  on public.budgets for delete to authenticated using (public.is_admin());

-- >>> 20260101000003_init_service_requests.sql <<<
-- =============================================================================
-- SAWALA DESA - Migration 0004 : Pengajuan surat & potensi desa
-- =============================================================================
-- Pengajuan surat (pelayanan administrasi) dan direktori potensi desa.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enum
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'request_status') then
    create type public.request_status as enum ('diajukan', 'diproses', 'disetujui', 'ditolak');
  end if;
  if not exists (select 1 from pg_type where typname = 'potential_kategori') then
    create type public.potential_kategori as enum ('umkm', 'pertanian', 'peternakan', 'keahlian');
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- JENIS SURAT (master, dikelola admin)
-- -----------------------------------------------------------------------------
create table if not exists public.letter_types (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique,
  nama text not null,
  deskripsi text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.letter_types is 'Master jenis surat keterangan yang dilayani desa.';

-- -----------------------------------------------------------------------------
-- PENGAJUAN SURAT
-- -----------------------------------------------------------------------------
create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  nomor_registrasi text unique,
  pemohon_id uuid not null references public.users (id) on delete cascade,
  letter_type_id uuid references public.letter_types (id) on delete set null,
  jenis_surat text not null,
  keperluan text not null,
  keterangan_pemohon text,
  status public.request_status not null default 'diajukan',
  catatan_admin text,
  diproses_oleh uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint service_requests_keperluan_len check (char_length(keperluan) >= 5)
);

comment on table public.service_requests is 'Pengajuan surat administrasi warga beserta status prosesnya.';

create index if not exists service_requests_pemohon_idx on public.service_requests (pemohon_id, created_at desc);
create index if not exists service_requests_status_idx on public.service_requests (status, created_at desc);

drop trigger if exists service_requests_set_updated_at on public.service_requests;
create trigger service_requests_set_updated_at
  before update on public.service_requests
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- POTENSI DESA (UMKM, pertanian, peternakan, keahlian)
-- -----------------------------------------------------------------------------
create table if not exists public.village_potentials (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  kategori public.potential_kategori not null,
  deskripsi text,
  pemilik text,
  kontak text,
  alamat text,
  is_published boolean not null default true,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.village_potentials is 'Direktori potensi & komoditas desa (UMKM, pertanian, peternakan, keahlian).';

create index if not exists village_potentials_kategori_idx on public.village_potentials (kategori, created_at desc);

drop trigger if exists village_potentials_set_updated_at on public.village_potentials;
create trigger village_potentials_set_updated_at
  before update on public.village_potentials
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------
alter table public.letter_types enable row level security;
alter table public.service_requests enable row level security;
alter table public.village_potentials enable row level security;

-- JENIS SURAT: publik boleh membaca yang aktif; hanya admin mengelola.
drop policy if exists "letter_types_read" on public.letter_types;
drop policy if exists "letter_types_admin_all" on public.letter_types;

create policy "letter_types_read"
  on public.letter_types for select to anon, authenticated
  using (is_active = true or public.is_admin());

create policy "letter_types_admin_all"
  on public.letter_types for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- PENGAJUAN SURAT: warga hanya melihat miliknya; admin melihat semuanya.
drop policy if exists "requests_select_own_or_admin" on public.service_requests;
drop policy if exists "requests_insert_self" on public.service_requests;
drop policy if exists "requests_update_admin" on public.service_requests;
drop policy if exists "requests_delete_admin" on public.service_requests;

create policy "requests_select_own_or_admin"
  on public.service_requests for select to authenticated
  using (pemohon_id = auth.uid() or public.is_admin());

create policy "requests_insert_self"
  on public.service_requests for insert to authenticated
  with check (pemohon_id = auth.uid() and status = 'diajukan');

create policy "requests_update_admin"
  on public.service_requests for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "requests_delete_admin"
  on public.service_requests for delete to authenticated
  using (public.is_admin());

-- Warga boleh membatalkan pengajuannya sendiri selama masih 'diajukan'.
drop policy if exists "requests_cancel_own" on public.service_requests;
create policy "requests_cancel_own"
  on public.service_requests for update to authenticated
  using (pemohon_id = auth.uid() and status = 'diajukan')
  with check (pemohon_id = auth.uid());

-- Cegah warga mengubah status/nomor registrasi miliknya sendiri.
create or replace function public.guard_request_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    if new.status is distinct from old.status
       or new.nomor_registrasi is distinct from old.nomor_registrasi
       or new.catatan_admin is distinct from old.catatan_admin
       or new.diproses_oleh is distinct from old.diproses_oleh then
      raise exception 'Hanya admin yang boleh mengubah status, nomor registrasi, atau catatan surat.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists service_requests_guard_admin_fields on public.service_requests;
create trigger service_requests_guard_admin_fields
  before update on public.service_requests
  for each row execute function public.guard_request_admin_fields();

-- POTENSI DESA: publik membaca yang terbit; hanya admin mengelola.
drop policy if exists "potentials_read" on public.village_potentials;
drop policy if exists "potentials_admin_write" on public.village_potentials;
drop policy if exists "potentials_admin_update" on public.village_potentials;
drop policy if exists "potentials_admin_delete" on public.village_potentials;

create policy "potentials_read"
  on public.village_potentials for select to anon, authenticated
  using (is_published = true or public.is_admin());

create policy "potentials_admin_write"
  on public.village_potentials for insert to authenticated
  with check (public.is_admin());

create policy "potentials_admin_update"
  on public.village_potentials for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "potentials_admin_delete"
  on public.village_potentials for delete to authenticated
  using (public.is_admin());

-- >>> 20260101000004_init_program_milestones.sql <<<
-- =============================================================================
-- SAWALA DESA - Migration 0005 : Log milestone pembangunan
-- =============================================================================
-- Setiap perubahan progress/status program dicatat sebagai milestone sehingga
-- warga dapat melihat riwayat perkembangan pekerjaan (timeline).
-- =============================================================================

create table if not exists public.program_milestones (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.development_programs (id) on delete cascade,
  judul text not null,
  keterangan text,
  progress integer not null default 0,
  status public.program_status not null default 'berjalan',
  dicatat_oleh uuid references public.users (id) on delete set null,
  terjadi_pada timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint program_milestones_judul_len check (char_length(judul) between 3 and 150),
  constraint program_milestones_progress_range check (progress between 0 and 100)
);

comment on table public.program_milestones is 'Riwayat milestone progress pembangunan; sumber data timeline di halaman detail program.';

create index if not exists program_milestones_program_idx
  on public.program_milestones (program_id, terjadi_pada desc);

-- -----------------------------------------------------------------------------
-- Trigger: catat milestone otomatis setiap progress/status program berubah.
-- -----------------------------------------------------------------------------
create or replace function public.log_program_progress_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.progress is distinct from old.progress or new.status is distinct from old.status then
    insert into public.program_milestones (
      program_id, judul, keterangan, progress, status, dicatat_oleh
    )
    values (
      new.id,
      case
        when new.progress is distinct from old.progress
          then 'Progress diperbarui menjadi ' || new.progress || '%'
        else 'Status diubah menjadi ' || new.status
      end,
      case
        when old.progress is distinct from new.progress
          then 'Sebelumnya ' || old.progress || '% -> ' || new.progress || '%'
        else 'Sebelumnya ' || old.status || ' -> ' || new.status
      end,
      new.progress,
      new.status,
      auth.uid()
    );
  end if;
  return new;
end;
$$;

drop trigger if exists development_programs_log_milestone on public.development_programs;
create trigger development_programs_log_milestone
  after update on public.development_programs
  for each row execute function public.log_program_progress_change();

-- -----------------------------------------------------------------------------
-- RLS: publik membaca timeline; hanya admin menambah/mengubah.
-- -----------------------------------------------------------------------------
alter table public.program_milestones enable row level security;

drop policy if exists "milestones_public_read" on public.program_milestones;
drop policy if exists "milestones_admin_write" on public.program_milestones;
drop policy if exists "milestones_admin_delete" on public.program_milestones;

create policy "milestones_public_read"
  on public.program_milestones for select to anon, authenticated using (true);

create policy "milestones_admin_write"
  on public.program_milestones for insert to authenticated
  with check (public.is_admin());

create policy "milestones_admin_delete"
  on public.program_milestones for delete to authenticated
  using (public.is_admin());

-- >>> STORAGE BUCKET <<<
insert into storage.buckets (id, name, public) values ('dokumentasi', 'dokumentasi', true) on conflict (id) do update set public = true;
drop policy if exists "dokumentasi_public_select" on storage.objects;
create policy "dokumentasi_public_select" on storage.objects for select using (bucket_id = 'dokumentasi');
drop policy if exists "dokumentasi_auth_insert" on storage.objects;
create policy "dokumentasi_auth_insert" on storage.objects for insert to authenticated with check (bucket_id = 'dokumentasi');

-- >>> SEED DATA <<<
insert into public.letter_types (kode, nama, deskripsi, is_active) values
  ('SKU', 'Surat Keterangan Usaha', 'Syarat pengajuan pinjaman/bantuan UMKM.', true),
  ('SKTM', 'Surat Keterangan Tidak Mampu', 'Syarat beasiswa atau bantuan sosial.', true),
  ('SKD', 'Surat Keterangan Domisili', 'Keterangan tempat tinggal sementara.', true)
on conflict (kode) do update set nama = excluded.nama, is_active = true;

-- Demo users are intentionally not embedded here.
-- Create accounts through Supabase Auth with unique passwords per environment.
