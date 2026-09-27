/**
 * Uji form input aspirasi & validasi.
 *
 * Menjalankan server produksi lalu memeriksa:
 *  - Halaman /aspirasi/baru terproteksi (butuh login).
 *  - Aturan validasi (judul, kategori, deskripsi) berperilaku konsisten.
 *  - Form merender field wajib dengan label & attribute aksesibilitas.
 *
 * Jalankan: node tests/aspirasi-form.test.mjs
 */
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PORT = Number(process.env.TEST_PORT ?? 3194);
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

/** Uji logika validasi langsung dengan mengompilasi modul TS-nya. */
function runValidationUnitTests() {
  const dir = mkdtempSync(join(tmpdir(), "sawala-val-"));
  try {
    const compiled = spawnSync(
      "npx tsc src/lib/aspiration-validation.ts src/lib/aspiration-constants.ts " +
        `--outDir ${dir} --module commonjs --target es2019 --skipLibCheck --moduleResolution node`,
      { shell: true, stdio: "ignore" },
    );
    if (compiled.status !== 0) return null;

    writeFileSync(
      join(dir, "run.cjs"),
      `
const { validasiAspirasi } = require('./aspiration-validation.js');
const cases = [
  ['judul pendek', {judul:'ab', kategori:'umum', deskripsi:'x'.repeat(30)}, ['judul']],
  ['judul kosong', {judul:'', kategori:'umum', deskripsi:'x'.repeat(30)}, ['judul']],
  ['deskripsi pendek', {judul:'Usulan baik', kategori:'umum', deskripsi:'singkat'}, ['deskripsi']],
  ['kategori kosong', {judul:'Usulan baik', kategori:'', deskripsi:'x'.repeat(30)}, ['kategori']],
  ['kategori tidak dikenal', {judul:'Usulan baik', kategori:'ngawur', deskripsi:'x'.repeat(30)}, ['kategori']],
  ['semua kosong', {judul:'', kategori:'', deskripsi:''}, ['judul','kategori','deskripsi']],
  ['valid', {judul:'Perbaikan jalan tani', kategori:'infrastruktur', deskripsi:'Jalan rusak sepanjang 2 km menghambat angkutan hasil panen warga.'}, []],
];
let pass=0, fail=0;
for (const [name, input, want] of cases) {
  const r = validasiAspirasi(input);
  const got = Object.keys(r.fieldErrors).sort();
  const ok = JSON.stringify(got) === JSON.stringify([...want].sort()) && r.valid === (want.length===0);
  console.log((ok?'PASS':'FAIL') + '  ' + name + '  got=[' + got + '] want=[' + want + ']');
  ok?pass++:fail++;
}
// Nilai dikembalikan ter-trim (tidak ada spasi berlebih).
const trimmed = validasiAspirasi({judul:'  Usulan Jalan  ', kategori:'umum', deskripsi:'  '.padEnd(0)+'Deskripsi cukup panjang untuk lolos validasi.  '});
console.log((trimmed.data?.judul === 'Usulan Jalan' ? 'PASS' : 'FAIL') + '  nilai ter-trim');
if (trimmed.data?.judul === 'Usulan Jalan') pass++; else fail++;
console.log('UNIT ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
`,
    );

    const run = spawnSync("node", [join(dir, "run.cjs")], { encoding: "utf8" });
    return { output: run.stdout ?? "", ok: run.status === 0 };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const server = spawn(`npx next start -p ${PORT}`, { stdio: "ignore", shell: true });
let exitCode = 0;

try {
  if (!(await waitForServer())) {
    console.error("Server tidak siap.");
    process.exit(1);
  }

  // 1. Halaman form terproteksi untuk anonim.
  {
    const res = await fetch(`${BASE}/aspirasi/baru`, { redirect: "manual" });
    check(
      "/aspirasi/baru anonim dialihkan ke login",
      res.status >= 300 && res.status < 400 && String(res.headers.get("location")).includes("/login"),
      `status=${res.status}`,
    );
  }

  // 2. Unit test validasi (logika nyata dari source).
  {
    const unit = runValidationUnitTests();
    if (!unit) {
      check("unit test validasi dapat dijalankan", false, "kompilasi gagal");
    } else {
      process.stdout.write(unit.output);
      const passed = (unit.output.match(/^PASS/gm) ?? []).length;
      check("semua kasus unit validasi lulus", unit.ok, `${passed} kasus`);
      check(
        "validasi menolak input kosong (judul+kategori+deskripsi)",
        unit.output.includes("PASS  semua kosong"),
        "semua kosong",
      );
      check(
        "validasi menerima input lengkap yang sah",
        unit.output.includes("PASS  valid"),
        "valid",
      );
      check("nilai dikembalikan ter-trim", unit.output.includes("PASS  nilai ter-trim"), "trim");
    }
  }

  // 3. Form markup aksesibel (diuji lewat source karena halaman butuh login).
  {
    const fs = await import("node:fs");
    const src = fs.readFileSync("./src/app/aspirasi/baru/form-aspirasi.tsx", "utf8");
    check("field judul berlabel", src.includes('htmlFor="judul"'), "judul label");
    check("field kategori berlabel", src.includes('htmlFor="kategori"'), "kategori label");
    check("field deskripsi berlabel", src.includes('htmlFor="deskripsi"'), "deskripsi label");
    check("error diumumkan (role=alert)", src.includes('role="alert"'), "alert");
    check("aria-invalid dipakai", src.includes("aria-invalid"), "aria-invalid");
    check("counter karakter tersedia", src.includes("JUDUL_MAX") && src.includes("DESKRIPSI_MAX"), "counter");
  }

  // 4. Endpoint API memvalidasi ulang (tidak percaya klien) & form memanggilnya.
  {
    const fs = await import("node:fs");
    const api = fs.readFileSync("./src/app/api/aspirasi/route.ts", "utf8");
    const form = fs.readFileSync("./src/app/aspirasi/baru/form-aspirasi.tsx", "utf8");

    check("endpoint memvalidasi ulang", api.includes("validasiAspirasi("), "revalidate");
    check("endpoint membatasi ke role warga", api.includes('user.role !== "warga"'), "role gate");
    check("endpoint memaksa status 'menunggu'", api.includes('status: "menunggu"'), "status forced");
    check("endpoint mengambil pengusul dari sesi", api.includes("pengusul_id: user.id"), "session owner");
    check(
      "form memanggil endpoint /api/aspirasi",
      form.includes('fetch("/api/aspirasi"'),
      "wired",
    );
    check(
      "form memakai timeout (AbortController)",
      form.includes("AbortController"),
      "timeout",
    );
    check(
      "form memetakan fieldErrors dari server",
      form.includes("payload?.fieldErrors"),
      "field errors",
    );
  }
} finally {
  stopServer(server);
}

const failed = results.filter((r) => !r.pass);
console.log(`\nRingkasan tes HTTP/markup: ${results.length - failed.length}/${results.length} lulus`);
if (failed.length > 0) {
  console.log("Gagal:", failed.map((f) => f.name).join(", "));
  exitCode = 1;
}
await delay(500);
process.exit(exitCode);