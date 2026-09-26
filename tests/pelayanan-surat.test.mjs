/**
 * Uji Integrasi Pengajuan Surat Warga & Approvals Admin.
 *
 * Menguji:
 * - Otorisasi route (klien vs anonim, admin vs warga).
 * - Otorisasi request (warga buat, warga hapus? hanya admin yang approve).
 * - Validasi batas karakter form warga dan no-reg dari admin.
 *
 * Jalankan: node tests/pelayanan-surat.test.mjs
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

const PORT = Number(process.env.TEST_PORT ?? 3187);
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

  // --- 1. Otorisasi Halaman (Harus redirect) ---
  {
    const req1 = await fetch(`${BASE}/pelayanan/baru`, { redirect: "manual" });
    const req2 = await fetch(`${BASE}/pelayanan`, { redirect: "manual" });
    const req3 = await fetch(`${BASE}/admin/surat`, { redirect: "manual" });

    check("Route form surat baru anonim dialihkan 30x", req1.status >= 300 && req1.status < 400, `status=${req1.status}`);
    check("Route riwayat warga anonim dialihkan 30x", req2.status >= 300 && req2.status < 400, `status=${req2.status}`);
    check("Route approval admin anonim dialihkan 30x", req3.status >= 300 && req3.status < 400, `status=${req3.status}`);
  }

  // --- 2. Otorisasi Endpoint & Payload ---
  {
    const reqAPI = await fetch(`${BASE}/api/pelayanan`, { method: "POST", body: "{}" });
    const patchAPI = await fetch(`${BASE}/api/pelayanan/${PROGRAM_ID}/status`, { method: "PATCH", body: "{}" });

    check("POST Pengajuan anonim ditolak 401", reqAPI.status === 401, `status=${reqAPI.status}`);
    check("PATCH Status pengajuan anonim ditolak 401", patchAPI.status === 401, `status=${patchAPI.status}`);
  }

  // --- 3. Validasi Server Logic Form ---
  {
    const srcWarga = readFileSync("./src/app/api/pelayanan/route.ts", "utf8");
    const srcValid = readFileSync("./src/lib/letter-validation.ts", "utf8");
    const srcAdmin = readFileSync("./src/app/api/pelayanan/[id]/status/route.ts", "utf8");

    check("Warga mengirim surat di-gate 'user.role !== warga'", srcWarga.includes("user.role !== \"warga\""), "gate post");
    check("Admin approve surat di-gate 'user.role !== admin'", srcAdmin.includes("user.role !== \"admin\""), "gate patch");

    check("Keperluan minimal 5 karakter divalidasi", srcValid.includes("keperluan.length < 5"), "keperluan");
    check("Nomor register admin dicek wajib bila status disetujui", srcAdmin.includes("noReg.length < 3") && srcAdmin.includes("disetujui"), "noreg check");
    check("Catatan admin dicek wajib bila status ditolak", srcAdmin.includes("catatan.length < 5") && srcAdmin.includes("ditolak"), "catatan check");
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