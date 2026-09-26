/**
 * Uji rendering data metrik & fallback skeleton.
 *
 * Memverifikasi bahwa:
 *  - /api/statistik mengembalikan struktur metrik lengkap dengan nilai aman
 *    (0) ketika database belum tersedia — bukan error/crash.
 *  - Dashboard tidak membocorkan metrik ke pengguna anonim.
 *  - Skeleton fallback (loading.tsx) ikut ter-build.
 *
 * Jalankan: node tests/metrics.test.mjs
 */
import { spawn } from "node:child_process";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

const PORT = Number(process.env.TEST_PORT ?? 3197);
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

  // 1. Struktur metrik lengkap & aman saat DB belum tersedia.
  {
    const res = await fetch(`${BASE}/api/statistik`);
    const body = await res.json();
    check("GET /api/statistik 200", res.status === 200, `status=${res.status}`);

    const d = body?.data ?? {};
    const hasAll =
      typeof d.aspirasi?.aktif === "number" &&
      typeof d.pembangunan?.berjalan === "number" &&
      typeof d.pembangunan?.rataProgress === "number" &&
      typeof d.anggaran?.belanja === "number" &&
      typeof d.anggaran?.realisasi === "number" &&
      typeof d.warga?.total === "number";
    check("semua field metrik ada & bertipe angka", hasAll, "structure ok");

    const zeroSafe =
      d.aspirasi?.aktif === 0 &&
      d.pembangunan?.berjalan === 0 &&
      d.anggaran?.belanja === 0 &&
      d.warga?.total === 0;
    check("fallback nilai aman 0 (bukan null/NaN)", zeroSafe, `aktif=${d.aspirasi?.aktif}`);
  }

  // 2. persenRealisasi tidak NaN saat belanja 0 (pembagian nol).
  {
    const res = await fetch(`${BASE}/api/statistik?tahun=2026`);
    const body = await res.json();
    const persen = body?.data?.anggaran?.persenRealisasi;
    check("persenRealisasi aman saat belanja 0", persen === 0 && !Number.isNaN(persen), `persen=${persen}`);
  }

  // 3. rataProgress integer 0..100 (tidak NaN).
  {
    const res = await fetch(`${BASE}/api/statistik`);
    const body = await res.json();
    const p = body?.data?.pembangunan?.rataProgress;
    check("rataProgress bilangan bulat 0..100", Number.isInteger(p) && p >= 0 && p <= 100, `rata=${p}`);
  }

  // 4. Dashboard anonim tetap terproteksi (metrik tidak bocor).
  {
    const res = await fetch(`${BASE}/dashboard`, { redirect: "manual" });
    check("dashboard anonim dialihkan (metrik tidak bocor)", res.status >= 300 && res.status < 400, `status=${res.status}`);
  }

  // 5. Beranda publik menampilkan metrik ringkasan.
  {
    const res = await fetch(`${BASE}/`);
    const html = await res.text();
    check(
      "beranda menampilkan blok metrik desa",
      html.includes("Ringkasan Desa") && html.includes("Program Berjalan"),
      "markup ok",
    );
  }

  // 6. Skeleton fallback dashboard ikut ter-build.
  // Catatan: nama komponen diminifikasi webpack, jadi penanda yang andal adalah
  // kelas animasi (animate-pulse) DAN teks aksesibilitas yang tetap literal.
  {
    const dashboardChunk = ".next/server/app/dashboard/page.js";
    const built = existsSync(dashboardChunk) ? readFileSync(dashboardChunk, "utf8") : "";
    const hasPulse = built.includes("animate-pulse");
    const hasA11yText = built.includes("Memuat ringkasan statistik desa");
    check(
      "skeleton fallback (loading.tsx) ter-build",
      hasPulse && hasA11yText,
      `pulse=${hasPulse} a11y=${hasA11yText}`,
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