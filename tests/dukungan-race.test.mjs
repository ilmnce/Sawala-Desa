/**
 * Uji relasi dukungan unik & ketahanan race condition upvote.
 *
 * Yang diverifikasi:
 *  1. Keunikan ditegakkan DATABASE (unique (aspiration_id, user_id) + index
 *     unik parsial pada NIK), bukan hanya oleh logika aplikasi.
 *  2. Penulisan dukungan memakai upsert idempoten, sehingga dua permintaan
 *     bersamaan tidak menghasilkan baris ganda maupun error 500.
 *  3. Endpoint tetap stabil (tidak 500/crash) di bawah lonjakan permintaan
 *     paralel — respons konsisten 401 untuk anonim.
 *  4. Toggle (PATCH) aman dari duplikasi karena constraint yang sama.
 *
 * Catatan: eksekusi INSERT nyata memerlukan Supabase aktif; uji ini
 * memverifikasi jaminan skema + ketahanan endpoint terhadap konkurensi.
 *
 * Jalankan: node tests/dukungan-race.test.mjs
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

const PORT = Number(process.env.TEST_PORT ?? 3192);
const BASE = `http://localhost:${PORT}`;
const ASPIRASI_ID = "123e4567-e89b-12d3-a456-426614174000";
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

const MIGRATION = "./supabase/migrations/20260101000002_init_core_modules.sql";
const ROUTE = "./src/app/api/aspirasi/[id]/dukungan/route.ts";

const server = spawn(`npx next start -p ${PORT}`, { stdio: "ignore", shell: true });
let exitCode = 0;

try {
  if (!(await waitForServer())) {
    console.error("Server tidak siap.");
    process.exit(1);
  }

  // --- 1. Jaminan keunikan di level database ---
  {
    const migration = readFileSync(MIGRATION, "utf8");
    check(
      "constraint unique (aspiration_id, user_id) ada di DB",
      /constraint aspiration_supports_unique unique \(aspiration_id, user_id\)/.test(migration),
      "unique pair",
    );
    check(
      "index unik parsial pada NIK ada di DB",
      /aspiration_supports_nik_unique_idx/.test(migration) && migration.includes("where nik is not null"),
      "unique nik",
    );
    check(
      "NIK terisi otomatis dari profil (trigger)",
      migration.includes("fill_support_nik") && migration.includes("aspiration_supports_fill_nik"),
      "auto nik",
    );
    check(
      "FK cascade ke aspirations (tidak ada baris yatim)",
      /references public\.aspirations \(id\) on delete cascade/.test(migration),
      "fk cascade",
    );
    check(
      "RLS: warga hanya menambah dukungan atas namanya sendiri",
      /supports_insert_self[\s\S]{0,200}user_id = auth\.uid\(\)/.test(migration),
      "rls insert",
    );
    check(
      "RLS: warga hanya menghapus dukungan miliknya",
      /supports_delete_self[\s\S]{0,200}user_id = auth\.uid\(\)/.test(migration),
      "rls delete",
    );
  }

  // --- 2. Idempotensi di level kode ---
  {
    const route = readFileSync(ROUTE, "utf8");
    check(
      "POST memakai upsert (bukan insert polos)",
      route.includes(".upsert("),
      "upsert",
    );
    check(
      "upsert memakai onConflict (aspiration_id,user_id)",
      route.includes('onConflict: "aspiration_id,user_id"'),
      "onConflict",
    );
    check(
      "upsert mengabaikan duplikat (ignoreDuplicates)",
      route.includes("ignoreDuplicates: true"),
      "idempotent",
    );
    check(
      "jumlah dukungan dihitung dari DB (bukan state klien)",
      route.includes("count: \"exact\"") || route.includes('count: "exact"'),
      "server count",
    );
    check(
      "pengusul tidak dapat mendukung aspirasinya sendiri",
      route.includes("pengusul_id") && route.includes("milik sendiri"),
      "owner guard",
    );
  }

  // --- 3. Ketahanan endpoint terhadap permintaan paralel ---
  {
    const N = 20;
    const requests = Array.from({ length: N }, () =>
      fetch(`${BASE}/api/aspirasi/${ASPIRASI_ID}/dukungan`, {
        method: "POST",
        redirect: "manual",
      })
        .then(async (r) => ({ status: r.status }))
        .catch(() => ({ status: 0 })),
    );
    const all = await Promise.all(requests);
    const statuses = all.map((r) => r.status);
    const noCrash = statuses.every((s) => s !== 0 && s !== 500);
    const consistent = new Set(statuses).size === 1;
    check(
      `${N} POST paralel tidak memicu 500/crash`,
      noCrash,
      `status=${[...new Set(statuses)].join(",")}`,
    );
    check(
      "respons paralel konsisten (semua 401 anonim)",
      consistent && statuses[0] === 401,
      `status=${statuses[0]}`,
    );
  }

  // --- 4. Toggle (PATCH) & DELETE paralel tetap aman ---
  {
    const mixed = await Promise.all([
      ...Array.from({ length: 8 }, () =>
        fetch(`${BASE}/api/aspirasi/${ASPIRASI_ID}/dukungan`, { method: "PATCH", redirect: "manual" }).then(
          (r) => r.status,
        ),
      ),
      ...Array.from({ length: 8 }, () =>
        fetch(`${BASE}/api/aspirasi/${ASPIRASI_ID}/dukungan`, { method: "DELETE", redirect: "manual" }).then(
          (r) => r.status,
        ),
      ),
    ]);
    check(
      "PATCH/DELETE paralel tidak memicu 500",
      mixed.every((s) => s !== 500 && s !== 0),
      `status=${[...new Set(mixed)].join(",")}`,
    );
    check(
      "PATCH/DELETE menolak anonim dengan 401",
      mixed.every((s) => s === 401),
      "auth enforced",
    );
  }

  // --- 5. Validasi ID mencegah injeksi/format salah ---
  {
    const bad = await Promise.all([
      fetch(`${BASE}/api/aspirasi/abc/dukungan`, { method: "POST" }),
      fetch(`${BASE}/api/aspirasi/1;DROP%20TABLE/dukungan`, { method: "POST" }),
      fetch(`${BASE}/api/aspirasi/%27%20or%20%271%27%3D%271/dukungan`, { method: "POST" }),
    ]);
    const statuses = bad.map((r) => r.status);
    check(
      "ID tidak valid (termasuk pola injeksi) ditolak 400",
      statuses.every((s) => s === 400),
      `status=${statuses.join(",")}`,
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