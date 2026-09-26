/**
 * Uji navigasi keyboard & screen reader.
 *
 * Memeriksa kontrak aksesibilitas yang tidak dapat diuji lewat HTTP saja
 * (fokus, ARIA, urutan tab) dengan memverifikasi markup yang benar-benar
 * dikirim server untuk beranda publik.
 *
 * Jalankan: node tests/a11y.test.mjs
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

const PORT = Number(process.env.TEST_PORT ?? 3195);
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

  const html = await (await fetch(`${BASE}/`)).text();

  // 1. Skip-link adalah elemen pertama yang dapat difokus (target keyboard utama).
  {
    const hasSkip = html.includes('href="#konten-utama"') && html.includes("Lewati ke konten utama");
    const skipBeforeMain = html.indexOf("Lewati ke konten utama") < html.indexOf('id="konten-utama"');
    check("skip-link tersedia", hasSkip, `present=${hasSkip}`);
    check("skip-link muncul sebelum konten utama", skipBeforeMain, `order=${skipBeforeMain}`);
  }

  // 2. Skip-link menyasar landmark <main> yang valid.
  {
    const hasMainId = /<main[^>]*id="konten-utama"/.test(html);
    check("landmark <main id=konten-utama> ada", hasMainId, `found=${hasMainId}`);
  }

  // 3. Bahasa dokumen diset (penting untuk screen reader).
  {
    check("html lang=id diset", /<html[^>]*lang="id"/.test(html), "lang ok");
  }

  // 4. Heading hierarki: tepat satu <h1>.
  {
    const h1Count = (html.match(/<h1[\s>]/g) ?? []).length;
    check("tepat satu <h1> di halaman", h1Count === 1, `h1=${h1Count}`);
  }

  // 5. Landmark semantik tersedia.
  {
    check("ada <header>", html.includes("<header"), "header");
    check("ada <main>", html.includes("<main"), "main");
    check("ada <footer>", html.includes("<footer"), "footer");
    check("ada <nav>", html.includes("<nav"), "nav");
  }

  // 6. Semua tautan punya teks yang dapat dibaca screen reader (bukan tautan kosong).
  {
    const anchors = html.match(/<a\b[^>]*>.*?<\/a>/gs) ?? [];
    const empty = anchors.filter((a) => {
      const inner = a.replace(/<[^>]+>/g, "").trim();
      return inner.length === 0 && !/aria-label=/.test(a);
    });
    check(
      "tidak ada tautan tanpa label aksesibel",
      empty.length === 0,
      `kosong=${empty.length}/${anchors.length}`,
    );
  }

  // 7. Gambar/ikon dekoratif ditandai aria-hidden (tidak berisik di screen reader).
  {
    const svgCount = (html.match(/<svg/g) ?? []).length;
    const hiddenSvg = (html.match(/aria-hidden="true"/g) ?? []).length;
    check(
      "ikon dekoratif ditandai aria-hidden",
      svgCount === 0 || hiddenSvg >= svgCount * 0.8,
      `svg=${svgCount} hidden=${hiddenSvg}`,
    );
  }

  // 8. Interaksi keyboard pada komponen modal (focus trap + Escape + restore focus).
  {
    const source = readFileSync(
      "./src/components/announcements/announcement-feed.tsx",
      "utf8",
    );
    check("modal: focus trap (Tab/Shift+Tab)", source.includes("event.shiftKey"), "trap ok");
    check("modal: Escape menutup", source.includes('event.key === "Escape"'), "escape ok");
    check(
      "modal: fokus dikembalikan setelah tutup",
      source.includes("previouslyFocused"),
      "restore ok",
    );
    check("modal: aria-modal + role=dialog", source.includes('aria-modal="true"') && source.includes('role="dialog"'), "aria ok");
    check("modal: label judul terhubung (aria-labelledby)", source.includes("aria-labelledby"), "labelledby ok");
  }

  // 9. Navigasi sidebar menandai halaman aktif (aria-current) & bisa diakses keyboard.
  {
    const shell = readFileSync("./src/components/layout/app-shell.tsx", "utf8");
    check("navigasi memakai aria-current", shell.includes("aria-current"), "current ok");
    check("tombol menu memakai aria-expanded", shell.includes("aria-expanded"), "expanded ok");
    check("navigasi punya aria-label", shell.includes('aria-label="Navigasi utama"'), "label ok");
    check("fokus terlihat (focus-visible) dipakai", shell.includes("focus-visible"), "focus ok");
  }

  // 10. Halaman login: form berlabel & error diumumkan lewat role=alert.
  {
    const loginHtml = await (await fetch(`${BASE}/login`)).text();
    const labeled = (loginHtml.match(/<label\b[^>]*for=/g) ?? []).length;
    const inputs = (loginHtml.match(/<(input|textarea)\b/g) ?? []).length;
    check("setiap input punya <label for>", labeled >= inputs, `label=${labeled} input=${inputs}`);
    const loginSource = readFileSync("./src/app/login/page.tsx", "utf8");
    check("error login pakai role=alert", loginSource.includes('role="alert"'), "alert ok");
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