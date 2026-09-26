/**
 * Uji proteksi route guard & integritas hak akses.
 *
 * Skenario utama: aplikasi DIKONFIGURASI (env Supabase terisi) tetapi backend
 * tidak dapat dijangkau. Dalam kondisi ini sistem harus gagal-tertutup:
 * halaman terproteksi dialihkan ke /login, tanpa redirect berputar, dan tanpa
 * pernah membocorkan halaman admin/warga ke pengguna anonim.
 *
 * Jalankan: node tests/route-guard.test.mjs
 * (Skrip ini melakukan build dengan env uji, lalu mengembalikan build bersih.)
 */
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const PORT = Number(process.env.TEST_PORT ?? 3198);
const BASE = `http://localhost:${PORT}`;
const results = [];

// URL valid secara format namun menunjuk host yang tidak dapat dijangkau.
const TEST_ENV = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: "https://proyek-uji-tidak-ada.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "kunci-uji-publik-bukan-rahasia",
};

function check(name, pass, detail) {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

function runBuild() {
  return spawnSync("npx next build", { stdio: "ignore", shell: true, env: TEST_ENV });
}

function runCleanBuild() {
  return spawnSync("npx next build", { stdio: "ignore", shell: true, env: process.env });
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

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual", ...options });
  return {
    status: res.status,
    location: res.headers.get("location"),
    text: await res.text().catch(() => ""),
  };
}

async function waitForServer(timeoutMs = 90000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/login`);
      if (res.ok) return true;
    } catch {
      /* belum siap */
    }
    await delay(700);
  }
  return false;
}

let exitCode = 0;

console.log("Menyiapkan build dengan konfigurasi uji...");
const build = runBuild();
if (build.status !== 0) {
  console.error("Build gagal.");
  process.exit(1);
}

const server = spawn(`npx next start -p ${PORT}`, { stdio: "ignore", shell: true, env: TEST_ENV });

try {
  if (!(await waitForServer())) {
    console.error("Server tidak siap.");
    process.exit(1);
  }

  // 1. Halaman warga terproteksi -> dialihkan ke /login.
  {
    const r = await request("/dashboard");
    check(
      "/dashboard anonim dialihkan ke /login",
      r.status >= 300 && r.status < 400 && String(r.location).includes("/login"),
      `status=${r.status} loc=${r.location}`,
    );
  }

  // 2. Area admin terproteksi -> tidak pernah terbuka untuk anonim.
  {
    const r = await request("/admin");
    check(
      "/admin anonim dialihkan ke /login",
      r.status >= 300 && r.status < 400 && String(r.location).includes("/login"),
      `status=${r.status} loc=${r.location}`,
    );
  }

  // 3. Sub-halaman admin juga terproteksi.
  {
    const r = await request("/admin/warga");
    check(
      "/admin/warga anonim dialihkan (bukan 200)",
      r.status !== 200,
      `status=${r.status}`,
    );
  }

  // 4. Halaman profil warga terproteksi.
  {
    const r = await request("/profil");
    check(
      "/profil anonim dialihkan ke /login",
      r.status >= 300 && r.status < 400,
      `status=${r.status}`,
    );
  }

  // 5. Tidak ada kebocoran konten terproteksi pada respons redirect.
  {
    const r = await request("/admin");
    check(
      "respons /admin tidak membocorkan konten panel",
      !r.text.includes("Menu Pengelolaan") && !r.text.includes("Panel Admin Desa"),
      "no leak",
    );
  }

  // 6. Halaman login tetap dapat diakses (tidak ikut terproteksi).
  {
    const r = await request("/login");
    check("/login tetap 200", r.status === 200, `status=${r.status}`);
  }

  // 7. Tidak ada redirect berputar: ikuti rantai redirect sampai selesai.
  {
    let url = `${BASE}/dashboard`;
    let hops = 0;
    let finalStatus = 0;
    let finalPath = "/dashboard";
    while (hops < 6) {
      const res = await fetch(url, { redirect: "manual" });
      finalStatus = res.status;
      if (res.status < 300 || res.status >= 400) break;
      const loc = res.headers.get("location");
      url = loc.startsWith("http") ? loc : `${BASE}${loc}`;
      finalPath = new URL(url).pathname;
      hops += 1;
    }
    check(
      "tidak ada redirect berputar (rantai pendek & berakhir di /login)",
      hops <= 2 && finalPath === "/login" && finalStatus === 200,
      `hops=${hops} final=${finalPath} status=${finalStatus}`,
    );
  }

  // 8. Endpoint API profil menolak anonim dengan 401 (bukan 200/500).
  {
    const r = await request("/api/profil");
    check(
      "/api/profil anonim menolak (401)",
      r.status === 401,
      `status=${r.status}`,
    );
  }

  // 9. Endpoint login tetap berfungsi (tidak dilewatkan sebagai halaman).
  {
    const res = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nik: "123", password: "x" }),
      redirect: "manual",
    });
    check(
      "POST /auth/login tidak dialihkan (validasi tetap jalan)",
      res.status === 400,
      `status=${res.status}`,
    );
  }

  // 10. POST /auth/logout tidak dialihkan oleh aturan halaman.
  {
    const res = await fetch(`${BASE}/auth/logout`, { method: "POST", redirect: "manual" });
    check(
      "POST /auth/logout diproses (bukan redirect ke portal)",
      res.status === 303 || res.status === 307,
      `status=${res.status}`,
    );
  }
} finally {
  stopServer(server);
  console.log("\nMengembalikan build bersih tanpa konfigurasi uji...");
  runCleanBuild();
}

const failed = results.filter((r) => !r.pass);
console.log(`\nRingkasan: ${results.length - failed.length}/${results.length} lulus`);
if (failed.length > 0) {
  console.log("Gagal:", failed.map((f) => f.name).join(", "));
  exitCode = 1;
}
await delay(500);
process.exit(exitCode);