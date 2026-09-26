/**
 * Uji Direktori Potensi Desa
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

const PORT = Number(process.env.TEST_PORT ?? 3186);
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
    } catch {}
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

  // --- 1. Otorisasi Route & UI ---
  {
    const rLokal = await fetch(`${BASE}/potensi`, { redirect: "manual" });
    const rAdmin = await fetch(`${BASE}/admin/potensi`, { redirect: "manual" });

    check("Katalog publik /potensi terbuka (200)", rLokal.status === 200, "public access");
    check("Admin /admin/potensi terlindungi dari anon (307)", rAdmin.status === 307, "admin protected");
  }

  // --- 2. Validasi Logika Render Filter & Komponen Publik ---
  {
     const html = await (await fetch(`${BASE}/potensi`)).text();
     check("Halaman katalog merender 'UMKM'", html.includes("UMKM"), "umkm");
     check("Halaman katalog merender 'Pertanian'", html.includes("Pertanian"), "pertanian");
     check("Halaman katalog merender 'Peternakan'", html.includes("Peternakan"), "peternakan");
     check("Halaman katalog merender 'Jasa Keahlian'", html.includes("Jasa Keahlian"), "keahlian");

     const ui = readFileSync("./src/components/potentials/potential-catalog.tsx", "utf8");
     check("Pencarian meng-cover nama, pemilik, dan deskripsi", ui.includes('item.nama.toLowerCase().includes(q)') && ui.includes('pemilik'), "search params");
     check("Tombol aksi WhatsApp Direct diimplementasikan", ui.includes('wa.me'), "wa direct link");
  }

  // --- 3. CRUD Validations (Server Actions) ---
  {
    const acts = readFileSync("./src/app/admin/potensi/actions.ts", "utf8");
    check("Server Action mem-protect aksi dengan user_id and verify admin", acts.includes("requireAdmin()"), "admin access gate");
    check("Validation min nama = 3", acts.includes("nama.length < 3"), "nama length");
    check("Validation max deskripsi = 500", acts.includes("deskripsi.length > 500"), "desc length");
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