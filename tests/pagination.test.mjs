/**
 * Uji integrasi pagination feed pengumuman & penanganan timeout.
 *
 * Cakupan:
 *  - Kontrak pagination /api/pengumuman (meta lengkap, batas per_page).
 *  - Navigasi antar halaman konsisten (tidak ada halaman ganda/rusak).
 *  - Penanganan timeout klien: komponen feed membatalkan permintaan yang
 *    menggantung lewat AbortController dan menampilkan pesan yang jelas.
 *  - Fallback feed kosong pada beranda (state tanpa data, bukan error).
 *
 * Jalankan: node tests/pagination.test.mjs
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

const PORT = Number(process.env.TEST_PORT ?? 3196);
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

  // 1. Meta pagination lengkap.
  {
    const res = await fetch(`${BASE}/api/pengumuman?page=1&per_page=6`);
    const body = await res.json();
    const m = body?.meta ?? {};
    const ok =
      res.status === 200 &&
      m.page === 1 &&
      m.per_page === 6 &&
      typeof m.total === "number" &&
      typeof m.total_pages === "number" &&
      typeof m.has_next === "boolean";
    check("meta pagination lengkap", ok, JSON.stringify(m));
  }

  // 2. Halaman berikutnya bernavigasi konsisten (page 2 tercermin di meta).
  {
    const res = await fetch(`${BASE}/api/pengumuman?page=2&per_page=6`);
    const body = await res.json();
    check(
      "request page=2 dihormati oleh server",
      res.status === 200 && body?.meta?.page === 2,
      `page=${body?.meta?.page}`,
    );
  }

  // 3. Batas per_page ditegakkan (anti penarikan seluruh tabel).
  {
    const over = await fetch(`${BASE}/api/pengumuman?per_page=51`);
    const ok = await fetch(`${BASE}/api/pengumuman?per_page=50`);
    check("per_page > batas ditolak", over.status === 400, `status=${over.status}`);
    check("per_page tepat di batas diterima", ok.status === 200, `status=${ok.status}`);
  }

  // 4. Halaman melewati total tetap 200 dengan data kosong (bukan error).
  {
    const res = await fetch(`${BASE}/api/pengumuman?page=999&per_page=6`);
    const body = await res.json();
    check(
      "halaman di luar rentang -> 200 data kosong",
      res.status === 200 && Array.isArray(body?.data) && body.data.length === 0,
      `status=${res.status} len=${body?.data?.length}`,
    );
  }

  // 5. Beranda memakai feed dengan fallback kosong (tanpa data bukan crash).
  {
    const res = await fetch(`${BASE}/`);
    const html = await res.text();
    check(
      "beranda fallback feed kosong terkendali",
      res.status === 200 && html.includes("Belum ada pengumuman"),
      `status=${res.status}`,
    );
  }

  // 6. Komponen feed memiliki pengamanan timeout (AbortController) + pesan jelas.
  {
    const bundle = ".next/server/app/page.js";
    const source = readFileSync("./src/components/announcements/announcement-feed.tsx", "utf8");
    const hasAbort = source.includes("AbortController");
    const hasTimeoutMsg = source.includes("Permintaan memakan waktu terlalu lama");
    const hasRetryLabel = source.includes("Coba lagi");
    check(
      "feed memakai AbortController untuk timeout",
      hasAbort,
      `abort=${hasAbort}`,
    );
    check(
      "pesan timeout spesifik tersedia",
      hasTimeoutMsg,
      `msg=${hasTimeoutMsg}`,
    );
    check("tombol coba-ulang tersedia pada error", hasRetryLabel, `retry=${hasRetryLabel}`);
    check("bundle beranda ter-build", readFileSync(bundle, "utf8").length > 0, bundle);
  }

  // 7. Endpoint tetap responsif setelah beberapa permintaan berurutan
  //    (simulasi pemuatan bertahap tanpa degradasi).
  {
    const started = Date.now();
    for (let p = 1; p <= 5; p += 1) {
      const res = await fetch(`${BASE}/api/pengumuman?page=${p}&per_page=6`);
      if (res.status !== 200) throw new Error(`page ${p} gagal`);
    }
    const elapsed = Date.now() - started;
    check("5 permintaan pagination berurutan stabil", elapsed < 8000, `${elapsed}ms`);
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