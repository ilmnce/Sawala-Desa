const fs = require("fs");
const path = require("path");

const sqlDir = path.join(__dirname, "supabase", "migrations");
const files = fs.readdirSync(sqlDir).filter(f => f.endsWith(".sql")).sort();

let out = "-- SALAWA DESA: COMBINED SETUP\n\n";
for (const f of files) {
  out += `-- >>> ${f} <<<\n`;
  out += fs.readFileSync(path.join(sqlDir, f), "utf8");
  out += "\n\n";
}

out += `-- >>> STORAGE BUCKET <<<\n`;
out += `insert into storage.buckets (id, name, public) values ('dokumentasi', 'dokumentasi', true) on conflict (id) do update set public = true;\n`;
out += `drop policy if exists "dokumentasi_public_select" on storage.objects;\n`;
out += `create policy "dokumentasi_public_select" on storage.objects for select using (bucket_id = 'dokumentasi');\n`;
out += `drop policy if exists "dokumentasi_auth_insert" on storage.objects;\n`;
out += `create policy "dokumentasi_auth_insert" on storage.objects for insert to authenticated with check (bucket_id = 'dokumentasi');\n\n`;

out += `-- >>> SEED DATA <<<\n`;
out += `insert into public.letter_types (kode, nama, deskripsi, is_active) values
  ('SKU', 'Surat Keterangan Usaha', 'Syarat pengajuan pinjaman/bantuan UMKM.', true),
  ('SKTM', 'Surat Keterangan Tidak Mampu', 'Syarat beasiswa atau bantuan sosial.', true),
  ('SKD', 'Surat Keterangan Domisili', 'Keterangan tempat tinggal sementara.', true)
on conflict (kode) do update set nama = excluded.nama, is_active = true;\n\n`;

out += `-- Demo users are intentionally not embedded here.\n`;
out += `-- Create accounts through Supabase Auth with unique passwords per environment.\n`;

fs.writeFileSync(path.join(__dirname, "combined-setup.sql"), out);
console.log("Successfully created combined-setup.sql (" + out.length + " bytes)");
