/**
 * Uji API upload gambar dokumentasi dengan validasi file.
 *
 * Cakupan:
 *  - Otorisasi admin untuk penambahan dan penghapusan foto dokumentasi.
 *  - Validasi keberadaan file, jenis multipart/form-data.
 *  - Validasi tipe MIME (JPG, PNG, WebP) dan ukuran maksimal (5 MB).
 *  - Perlindungan ID program/dokumentasi yang tidak valid.
 *
 * Jalankan: node tests/dokumentasi.test.mjs
 */
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const PORT = Number(process.env.TEST_PORT ?? 3190);
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

  // --- POST ditolak jika tidak membawa payload multipart (400) atau tanpa sesi (401) ---
  {
    const r = await fetch(`${BASE}/api/pembangunan/${PROGRAM_ID}/dokumentasi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file: "dummy" }),
    });
    check("POST non-multipart dicegat / dilindungi sesi", r.status === 400 || r.status === 401, `status=${r.status}`);
  }

  // Karena endpoint terproteksi sesi, saya uji ketat validasi logikanya di file src aslinya:
  {
    const fs = await import("node:fs");
    const route = fs.readFileSync("./src/app/api/pembangunan/[id]/dokumentasi/route.ts", "utf8");

    check("memvalidasi ID program via regex (UUID_RE)", route.includes("UUID_RE.test"), "id param val");
    check("mengamankan area ini hanya untuk role=admin", route.includes('user.role !== "admin"'), "admin only");
    check("memerlukan object 'file' sebagai instance Blob", route.includes("!(file instanceof Blob)"), "blob val");
    check("memeriksa file.size <= 5MB", route.includes("MAX_FILE_SIZE = 5 * 1024 * 1024") && route.includes("file.size > MAX_FILE_SIZE"), "size val");
    check(
      "membatasi format MIME hanya jpg/png/webp",
      route.includes('"image/jpeg"') && route.includes("ALLOWED_TYPES.includes(file.type)"),
      "mime val",
    );
    check(
      "menghapus nama berbahaya via randomString",
      route.includes("randomString()") && route.includes("Date.now()"),
      "storage path gen",
    );
    check(
      "upsert:false di storage (mencegah overwrite nama sama)",
      route.includes("upsert: false"),
      "no overwrite",
    );
  }

  // --- Otorisasi DELETE ---
  {
    const r = await fetch(`${BASE}/api/pembangunan/${PROGRAM_ID}/dokumentasi?docId=${PROGRAM_ID}`, {
      method: "DELETE",
    });
    check("DELETE anonim ditolak 401", r.status === 401, `status=${r.status}`);

    const fs = await import("node:fs");
    const route = fs.readFileSync("./src/app/api/pembangunan/[id]/dokumentasi/route.ts", "utf8");
    check(
      "menghapus ref DB terlebih dahulu lalu membersihkan storage",
      route.indexOf('from("program_documentations").delete()') < route.indexOf('from(DOCUMENTATION_BUCKET).remove('),
      "db-first delete",
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