/**
 * Uji fungsional login NIK & penanganan error.
 *
 * Menjalankan server produksi Next.js, lalu menguji endpoint /auth/login dan
 * perilaku middleware terhadap berbagai input. Jalankan dengan:
 *   node tests/login.test.mjs
 *
 * Uji ini fokus pada kontrak HTTP (status + pesan) dan tidak memerlukan
 * database: skenario "Supabase belum dikonfigurasi" diuji secara eksplisit,
 * sementara jalur kredensial valid memerlukan instance Supabase aktif.
 */
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const PORT = Number(process.env.TEST_PORT ?? 3199);
const BASE = `http://localhost:${PORT}`;
const results = [];

function check(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual", ...options });
  let body = null;
  const type = res.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    body = await res.json().catch(() => null);
  } else {
    body = await res.text().catch(() => null);
  }
  return { status: res.status, body, headers: res.headers };
}

async function waitForServer(timeoutMs = 60000) {
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

const server = spawn(`npx next start -p ${PORT}`, {
  stdio: "ignore",
  shell: true,
});

/** Hentikan server beserta seluruh proses anaknya (penting di Windows). */
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

let exitCode = 0;
try {
  const ready = await waitForServer();
  if (!ready) {
    console.error("Server tidak siap dalam batas waktu.");
    process.exit(1);
  }

  // 1. NIK bukan 16 digit -> 400 dengan pesan jelas.
  {
    const r = await request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nik: "123", password: "rahasia123" }),
    });
    check("NIK < 16 digit ditolak (400)", r.status === 400, `status=${r.status}`);
    check(
      "pesan error NIK informatif",
      typeof r.body?.error === "string" && /16 digit/i.test(r.body.error),
      r.body?.error,
    );
  }

  // 2. NIK berisi huruf -> 400 (server memakai validasi ketat).
  {
    const r = await request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nik: "12345678901234ab", password: "rahasia123" }),
    });
    check("NIK berisi huruf ditolak (400)", r.status === 400, `status=${r.status}`);
  }

  // 3. Password kosong -> 400.
  {
    const r = await request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nik: "1234567890123456", password: "" }),
    });
    check("password kosong ditolak (400)", r.status === 400, `status=${r.status}`);
    check(
      "pesan error password informatif",
      typeof r.body?.error === "string" && /password/i.test(r.body.error),
      r.body?.error,
    );
  }

  // 4. Body bukan JSON -> 400 tanpa crash.
  {
    const r = await request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "bukan-json",
    });
    check("body tidak valid ditolak (400)", r.status === 400, `status=${r.status}`);
  }

  // 5. Field hilang (tanpa password) -> 400, bukan 500.
  {
    const r = await request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nik: "1234567890123456" }),
    });
    check("field password hilang ditangani (400)", r.status === 400, `status=${r.status}`);
  }

  // 6. NIK + password valid, tanpa konfigurasi DB -> 503 (pesan, bukan crash).
  {
    const r = await request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nik: "1234567890123456", password: "rahasia123" }),
    });
    check(
      "kredensial valid tanpa DB -> 503 terkendali",
      r.status === 503,
      `status=${r.status}`,
    );
  }

  // 7. Method salah -> 405.
  {
    const r = await request("/auth/login", { method: "GET" });
    check("GET /auth/login ditolak (405)", r.status === 405, `status=${r.status}`);
  }

  // 8. Tidak ada kebocoran password di respons.
  {
    const r = await request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nik: "1234567890123456", password: "rahasia123" }),
    });
    const raw = JSON.stringify(r.body ?? "");
    check("password tidak tercermin di respons", !raw.includes("rahasia123"), "no leak");
  }

  // 9. Halaman login dapat diakses & termuat.
  {
    const r = await request("/login");
    check("/login dapat diakses (200)", r.status === 200, `status=${r.status}`);
    check(
      "form login ter-render di HTML",
      typeof r.body === "string" && r.body.includes("Nomor Induk Kependudukan"),
      "markup ok",
    );
  }

  // 10. Halaman terproteksi tanpa sesi -> diarahkan ke /login.
  {
    const r = await request("/dashboard");
    check(
      "/dashboard tanpa sesi dialihkan (3xx -> login)",
      r.status >= 300 && r.status < 400 && String(r.headers.get("location")).includes("/login"),
      `status=${r.status}`,
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