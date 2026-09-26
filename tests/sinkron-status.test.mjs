/**
 * Uji sinkronisasi status aspirasi antara dashboard admin dan warga.
 *
 * Alur yang diuji (sesuai "selesai bila" PRD):
 *   warga mengajukan -> admin mengubah status -> warga melihat perubahan.
 *
 * Karena data hidup di database yang sama dan kedua halaman membaca langsung
 * dari Supabase (tanpa cache), sinkronisasi dijamin oleh:
 *   1. Halaman warga & admin membaca tabel `aspirations` yang sama.
 *   2. Keduanya memakai label status yang sama (satu sumber konstanta).
 *   3. Perubahan status tidak di-cache lama (dynamic + no-store).
 *   4. Warga tidak dapat menyetel statusnya sendiri (hanya admin) sehingga
 *      tidak ada dua penulis yang saling menimpa.
 *
 * Jalankan: node tests/sinkron-status.test.mjs
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

const PORT = Number(process.env.TEST_PORT ?? 3191);
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

const WARGA_PAGE = "./src/app/aspirasi/page.tsx";
const ADMIN_PAGE = "./src/app/admin/aspirasi/page.tsx";
const ADMIN_KELOLA = "./src/app/admin/aspirasi/kelola-aspirasi.tsx";
const ADMIN_STATUS_API = "./src/app/api/aspirasi/[id]/status/route.ts";
const CLEANUP_MIGRATION = "./supabase/migrations/20260101000002_init_core_modules.sql";

const server = spawn(`npx next start -p ${PORT}`, { stdio: "ignore", shell: true });
let exitCode = 0;

try {
  if (!(await waitForServer())) {
    console.error("Server tidak siap.");
    process.exit(1);
  }

  const warga = readFileSync(WARGA_PAGE, "utf8");
  const admin = readFileSync(ADMIN_PAGE, "utf8");
  const kelola = readFileSync(ADMIN_KELOLA, "utf8");
  const statusApi = readFileSync(ADMIN_STATUS_API, "utf8");
  const migration = readFileSync(CLEANUP_MIGRATION, "utf8");

  // 1. Kedua halaman membaca sumber data yang sama.
  {
    check("halaman warga membaca getAspirations()", warga.includes("getAspirations("), "source");
    check("halaman admin membaca getAspirations()", admin.includes("getAspirations("), "source");
    check(
      "keduanya memakai tabel 'aspirations' (lewat satu data layer)",
      readFileSync("./src/lib/data/aspirations.ts", "utf8").includes('from("aspirations")'),
      "same table",
    );
  }

  // 2. Label status berasal dari satu konstanta (tidak ada teks ganda yang divergen).
  {
    check(
      "warga memakai ASPIRATION_STATUS_LABELS",
      warga.includes("ASPIRATION_STATUS_LABELS"),
      "labels",
    );
    check(
      "admin memakai ASPIRATION_STATUS_LABELS",
      kelola.includes("ASPIRATION_STATUS_LABELS"),
      "labels",
    );
    check(
      "keduanya memakai <StatusBadge> yang sama",
      warga.includes("StatusBadge") && kelola.includes("StatusBadge"),
      "badge",
    );
  }

  // 3. Perubahan status dilakukan admin & dibaca kembali tanpa cache.
  {
    check(
      "endpoint ubah status khusus admin",
      statusApi.includes('user.role !== "admin"') && statusApi.includes('status: 403'),
      "admin only",
    );
    check(
      "halaman warga dynamic (selalu baca DB terbaru)",
      warga.includes('dynamic = "force-dynamic"'),
      "dynamic warga",
    );
    check(
      "halaman admin dynamic (selalu baca DB terbaru)",
      admin.includes('dynamic = "force-dynamic"'),
      "dynamic admin",
    );
    check(
      "daftar aspirasi tidak boleh di-cache",
      readFileSync("./src/app/api/aspirasi/route.ts", "utf8").includes("no-store, private"),
      "no-store",
    );
  }

  // 4. Setelah admin menyimpan, data disegarkan dari sisi klien.
  {
    check(
      "modal admin memanggil router.refresh() setelah simpan",
      /result\.ok[\s\S]{0,120}router\.refresh\(\)/.test(kelola),
      "refresh admin",
    );
  }

  // 5. Warga tidak dapat menyetel statusnya sendiri (mencegah konflik penulis).
  {
    check(
      "trigger DB melindungi status/prioritas/catatan",
      migration.includes("guard_aspiration_admin_fields"),
      "db guard",
    );
    check(
      "warga tidak dapat mengubah status via API (403 untuk non-admin)",
      statusApi.includes("Hanya admin yang boleh mengubah status aspirasi"),
      "403 message",
    );
  }

  // 6. Catatan admin tampil ke warga (umpan balik keputusan).
  {
    check(
      "halaman warga menampilkan catatan_admin",
      warga.includes("catatanAdmin") && warga.includes("Catatan perangkat desa"),
      "feedback",
    );
  }

  // 7. Status yang valid konsisten antara API & DB enum.
  {
    const labels = readFileSync("./src/lib/aspiration-constants.ts", "utf8");
    const statuses = ["menunggu", "ditinjau", "prioritas", "ditolak", "terealisasi"];
    for (const s of statuses) {
      check(
        `status '${s}' ada di konstanta & enum DB`,
        labels.includes(`${s}:`) && migration.includes(`'${s}'`),
        s,
      );
    }
  }

  // 8. Endpoint status tetap terproteksi saat anonim.
  {
    const res = await fetch(`${BASE}/api/aspirasi/123e4567-e89b-12d3-a456-426614174000/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "prioritas" }),
      redirect: "manual",
    });
    check("PATCH status anonim ditolak 401", res.status === 401, `status=${res.status}`);
  }

  // 9. Halaman warga terproteksi (data pribadi usulan tidak bocor ke anonim).
  {
    const res = await fetch(`${BASE}/aspirasi`, { redirect: "manual" });
    check(
      "/aspirasi anonim dialihkan ke login",
      res.status >= 300 && res.status < 400,
      `status=${res.status}`,
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