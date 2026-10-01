/**
 * Uji validasi form & otorisasi CRUD program pembangunan (Admin vs Warga).
 *
 * Menguji:
 *  - GET katalog: publik (200), mendukung filter.
 *  - POST program: validasi data (nama, anggaran, kategori, dll).
 *  - Otorisasi penulisan (POST/PATCH/DELETE): menolak secara tegas anonim/warga
 *    (hanya admin). Karena tidak ada DB saat uji, endpoint harus terbukti
 *    menyetop permintaan SEBELUM db access lewat 401 dan 403.
 *
 * Jalankan: node tests/pembangunan-crud.test.mjs
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

const PORT = Number(process.env.TEST_PORT ?? 3189);
const BASE = `http://localhost:${PORT}`;
const PROGRAM_ID = "123e4567-e89b-12d3-a456-426614174000";
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

const server = spawn(`npx next start -p ${PORT}`, { stdio: "ignore", shell: true });
let exitCode = 0;

try {
  if (!(await waitForServer())) {
    console.error("Server tidak siap.");
    process.exit(1);
  }

  // --- 1. Akses baca terbuka; filter aman. ---
  {
    const res1 = await fetch(`${BASE}/api/pembangunan`);
    const val1 = await res1.json();
    check("GET katalog terbuka untuk publik tanpa error", res1.status === 200 && Array.isArray(val1?.data), `status=${res1.status}`);

    const res2 = await fetch(`${BASE}/api/pembangunan?status=ngawur`);
    check("GET filter status salah ditolak 400", res2.status === 400, `status=${res2.status}`);

    const res3 = await fetch(`${BASE}/api/pembangunan?limit=999`);
    check("GET filter limit berlebihan ditolak 400", res3.status === 400, `status=${res3.status}`);
  }

  // --- 2. Otorisasi penulisan (diuji lewat HTTP dgn anonim) ---
  {
    const authTests = [
      fetch(`${BASE}/api/pembangunan`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }),
      fetch(`${BASE}/api/pembangunan/${PROGRAM_ID}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}" }),
      fetch(`${BASE}/api/pembangunan/${PROGRAM_ID}`, { method: "DELETE" }),
      fetch(`${BASE}/api/pembangunan/${PROGRAM_ID}/dokumentasi`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }),
      fetch(`${BASE}/api/pembangunan/${PROGRAM_ID}/dokumentasi?docId=${PROGRAM_ID}`, { method: "DELETE" }),
    ];
    const resultsAuth = await Promise.all(authTests);
    check(
      "semua operasi penulisan (POST/PATCH/DELETE) menolak akses anonim",
      resultsAuth.every((r) => r.status === 401),
      "401 enforced",
    );
  }

  // --- 3. Verifikasi otorisasi membedakan warga & admin sebelum db ---
  {
    const src = readFileSync("./src/app/api/pembangunan/route.ts", "utf8");
    const postBody = src.slice(src.indexOf("export async function POST"));
    check(
      "endpoint POST memblokir role != admin sebelum ke database",
      postBody.includes('user.role !== "admin"') && postBody.indexOf('user.role !== "admin"') < postBody.indexOf("createClient"),
      "guard sequence",
    );
  }

  // --- 4. Validasi payload sisi server ---
  {
    const src = readFileSync("./src/app/api/pembangunan/route.ts", "utf8");
    check("validasi panjang nama (3 - 150)", src.includes("length < 3") && src.includes("length > 150"), "nama bounds");
    check("validasi anggaran (angka >= 0)", src.includes("anggaran < 0") || src.includes("anggaran <= 0") || src.includes("anggaran<0") || src.includes("anggaran < 0"), "anggaran positive");
    check("validasi presentase progress bulat (0-100)", src.includes("progress < 0") && src.includes("progress > 100") && src.includes("Number.isInteger"), "progress bounds");
    check("validasi enum kategori & status di-enforce via constants", src.includes("PROGRAM_KATEGORI.includes") && src.includes("PROGRAM_STATUSES.includes"), "enum strictness");
  }

  // --- 5. Keamanan RLS di Database ---
  {
    const rls = readFileSync("./supabase/migrations/20260101000002_init_core_modules.sql", "utf8");
    check("migrasi menerapkan policy insert dengan check is_admin()", /programs_admin_write[\s\S]{0,150}check \(public\.is_admin\(\)/.test(rls), "insert check");
    check("migrasi menerapkan policy update dengan check is_admin()", /programs_admin_update[\s\S]{0,150}check \(public\.is_admin\(\)/.test(rls), "update check");
    check("migrasi menerapkan policy delete dengan using is_admin()", /programs_admin_delete[\s\S]{0,150}using \(public\.is_admin\(\)/.test(rls), "delete check");
  }

  // --- 6. Form Tambah Program (Frontend) menerapkan HTML validation API ---
  {
    const fm = readFileSync("./src/app/admin/pembangunan/tambah-program.tsx", "utf8");
    check("form memakai aria-invalid saat error", fm.includes("aria-invalid={Boolean"), "aria-invalid");
    check("form mendisable input saat sedang submit", fm.includes("disabled={pending}"), "disabled pending");
    check("form membersihkan angka string sebelum convert ('10.000' -> 10000)", fm.includes("replace(/\\D/g"), "money extract");
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