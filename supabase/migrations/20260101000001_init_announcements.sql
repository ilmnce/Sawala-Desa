-- =============================================================================
-- SALAWA DESA - Migration 0002 : Pengumuman & agenda desa
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