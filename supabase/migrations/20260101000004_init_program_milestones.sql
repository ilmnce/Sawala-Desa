-- =============================================================================
-- SALAWA DESA - Migration 0005 : Log milestone pembangunan
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