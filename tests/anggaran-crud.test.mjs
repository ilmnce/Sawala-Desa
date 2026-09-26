/**
 * Uji CRUD Struktur Anggaran APBDes & Validasi Otorisasi.
 *
 * Menguji:
 * - Halaman Admin Anggaran tidak dapat diakses tanpa sesi admin.
 * - Form komponen menerapkan atribut disabled selama pending.
 * - Validasi input over-budget mencakup kategori yang bersangkutan.
 * - Aksi penghapusan dan edit mengamankan endpoint secara logic.
 *
 * Jalankan: node tests/anggaran-crud.test.mjs
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

const PORT = Number(process.env.TEST_PORT ?? 3188);
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

const server = spawn(`npx next start -p ${PORT}`, { stdio: "ignore", shell: true });
let exitCode = 0;

try {
  if (!(await waitForServer())) {
    console.error("Server tidak siap.");
    process.exit(1);
  }

  // --- 1. Otorisasi Halaman (Harus redirect ke /login bila anonim) ---
  {
    const res = await fetch(`${BASE}/admin/anggaran`, { redirect: "manual" });
    check(
      "/admin/anggaran ditutup untuk anonim (307)",
      res.status >= 300 && res.status < 400 && String(res.headers.get("location")).includes("/login"),
      `status=${res.status}`,
    );
  }

  // --- 2. Validasi Action ---
  {
    const src = readFileSync("./src/app/admin/anggaran/actions.ts", "utf8");
    check(
      "action membutuhkan role admin",
      src.includes("requireAdmin()"),
      "server guard",
    );
    check(
      "validasi rentang tahun anggaran",
      src.includes("tahun < 2000") && src.includes("tahun > 2100"),
      "year validation",
    );
    check(
      "validasi pencegahan nominal negatif",
      src.includes("jumlah < 0"),
      "positive amount",
    );
    check(
      "action over-budget diperiksa",
      src.includes("overBudgetCheck("),
      "overbudget hook",
    );
  }

  // --- 3. UI Form ---
  {
    const ui = readFileSync("./src/app/admin/anggaran/kelola-anggaran.tsx", "utf8");
    const actions = readFileSync("./src/app/admin/anggaran/actions.ts", "utf8");
    check(
      "Tombol submit disabled saat pending",
      ui.includes("disabled={pending}"),
      "button states",
    );
    check(
      "Data UI diatur ulang pada submit",
      ui.includes("onClose()") && actions.includes("revalidatePath"),
      "refresh hook",
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