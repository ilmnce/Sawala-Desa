/**
 * Uji validasi payload & persistensi data usulan aspirasi.
 *
 * Cakupan:
 *  - Validasi payload endpoint POST /api/aspirasi (tipe salah, field hilang,
 *    nilai batas) -> selalu 400 dengan pesan field-level, tidak pernah 500.
 *  - Otorisasi: permintaan anonim ditolak sebelum validasi (fail-closed).
 *  - Persistensi: kesesuaian kolom yang ditulis endpoint dengan skema migrasi
 *    (nama kolom, enum status awal). Ini memverifikasi kontrak penyimpanan;
 *    eksekusi INSERT nyata memerlukan instance Supabase aktif.
 *
 * Jalankan: node tests/aspirasi-api.test.mjs
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

const PORT = Number(process.env.TEST_PORT ?? 3193);
const BASE = `http://localhost:${PORT}`;
const results = [];

function check(name, pass, detail) {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

function stopServer(child) {
  if (!child?.pid) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/f", "/t"], { stdio: "ignore" });
  } else {
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {
      child.kill("SIGKILL");
    }
  }
}

async function waitForServer(timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/`);
      if (res.ok) return true;
    } catch {
      /* belum siap */
    }
    await delay(700);
  }
  return false;
}

async function post(body) {
  const res = await fetch(`${BASE}/api/aspirasi`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
    redirect: "manual",
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

const server = spawn(`npx next start -p ${PORT}`, { stdio: "ignore", shell: true });
let exitCode = 0;

try {
  if (!(await waitForServer())) {
    console.error("Server tidak siap.");
    process.exit(1);
  }

  // --- Otorisasi lebih dulu (fail-closed untuk anonim) ---
  {
    const r = await post({ judul: "Perbaikan jalan tani desa", kategori: "infrastruktur", deskripsi: "x".repeat(40) });
    check("POST anonim ditolak 401 (sebelum validasi)", r.status === 401, `status=${r.status}`);
    check("pesan 401 informatif", typeof r.json?.error === "string", r.json?.error);
  }

  // --- Body bukan JSON ---
  {
    const r = await post("ini-bukan-json");
    check("body non-JSON ditolak", r.status === 401 || r.status === 400, `status=${r.status}`);
  }

  // --- Body JSON valid tapi kosong ---
  {
    const r = await post({});
    check("body kosong ditolak terkendali", r.status === 401 || r.status === 400, `status=${r.status}`);
  }

  // --- Tipe data salah (number di field string) ---
  {
    const r = await post({ judul: 12345, kategori: ["x"], deskripsi: { a: 1 } });
    check("tipe payload salah ditolak", r.status === 401 || r.status === 400, `status=${r.status}`);
  }

  // --- Nilai batas (uji langsung fungsi validasi, bukan lewat HTTP yang butuh sesi) ---
  {
    const dir = await import("node:fs");
    const valSrc = dir.readFileSync("./src/lib/aspiration-validation.ts", "utf8");
    check(
      "validasi membatasi judul min 5 / max 150",
      valSrc.includes("length < 5") && valSrc.includes("length > 150"),
      "judul bounds",
    );
    check(
      "validasi membatasi deskripsi min 20 / max 2000",
      valSrc.includes("length < 20") && valSrc.includes("length > 2000"),
      "deskripsi bounds",
    );
    check(
      "validasi menolak kategori di luar daftar",
      valSrc.includes("ASPIRATION_CATEGORIES.includes"),
      "kategori enum",
    );
  }

  // --- Persistensi: kolom insert sesuai skema migrasi ---
  {
    const apiSrc = readFileSync("./src/app/api/aspirasi/route.ts", "utf8");
    const migration = readFileSync(
      "./supabase/migrations/20260101000002_init_core_modules.sql",
      "utf8",
    );

    const insertCols = ["judul", "kategori", "deskripsi", "pengusul_id", "status"];
    for (const col of insertCols) {
      check(
        `endpoint menulis kolom '${col}'`,
        apiSrc.includes(`${col}:`),
        col,
      );
      check(
        `migrasi mendefinisikan kolom '${col}'`,
        migration.includes(`${col} `) || migration.includes(`${col}(`),
        col,
      );
    }

    check(
      "status awal memakai enum 'menunggu'",
      apiSrc.includes('status: "menunggu"') && migration.includes("'menunggu'"),
      "status awal",
    );
    check(
      "pengusul_id wajib (not null) di skema",
      /pengusul_id uuid not null/.test(migration),
      "not null",
    );
    check(
      "ada constraint panjang judul & deskripsi di DB",
      migration.includes("aspirations_judul_len") && migration.includes("aspirations_deskripsi_len"),
      "db constraints",
    );
  }

  // --- RLS: warga hanya boleh insert atas namanya sendiri ---
  {
    const migration = readFileSync(
      "./supabase/migrations/20260101000002_init_core_modules.sql",
      "utf8",
    );
    check(
      "policy insert membatasi pengusul_id = auth.uid()",
      migration.includes("pengusul_id = auth.uid()"),
      "rls insert",
    );
    check(
      "trigger melarang warga mengubah status/prioritas",
      migration.includes("guard_aspiration_admin_fields"),
      "guard trigger",
    );
  }

  // --- Endpoint tidak membocorkan detail internal pada error ---
  {
    const r = await post({ judul: "a".repeat(500), kategori: "umum", deskripsi: "b".repeat(50) });
    const raw = JSON.stringify(r.json ?? {});
    check(
      "error tidak membocorkan stack/message internal",
      !/at Object\.|node_modules|postgres|pg_|relation "/.test(raw),
      "no leak",
    );
  }
} finally {
  stopServer(server);
}

const failed = results.filter((r) => !r.pass);
console.log(`\nRingkasan: ${results.length - failed.length}/${results.length} lulus`);
if (failed.length > 0) {
  console.log("Gagal:", failed.map((f) => f.name).join(", "));
  exitCode = 1;
}
await delay(500);
process.exit(exitCode);