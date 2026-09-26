-- =============================================================================
-- SALAWA DESA - Migration 0003 : Entitas inti (aspirasi, pembangunan, anggaran)
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