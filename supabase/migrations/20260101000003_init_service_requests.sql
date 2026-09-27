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