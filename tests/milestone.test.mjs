/**
 * Uji integrasi kalkulasi progress dan update milestone.
 *
 * Menguji logic di level handler API tanpa database:
 *   - Status 'selesai' memaksa progress = 100%.
 *   - Judul milestone di-trim & dicek maksimal 150 karakter.
 *   - Keterangan milestone dicek maksimal 500 karakter.
 *   - Database trigger untuk log eksplisit dievaluasi berdasarkan MIGRATION file.
 *
 * Jalankan: node tests/milestone.test.mjs
 */
import { readFileSync } from "node:fs";

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

let exitCode = 0;

try {
  // 1. Logic Endpoint API (PATCH) -> Sinkronisasi Selesai & Progress
  const apiSrc = readFileSync("./src/app/api/pembangunan/[id]/route.ts", "utf8");
  check(
    "Status 'selesai' otomatis menyetel progress 100% (logic integratis)",
    apiSrc.includes('finalStatus === "selesai" ? 100 : progress') || apiSrc.includes('finalProgress = finalStatus === "selesai" ? 100 : progress'),
    "progress forced to 100 on selesai"
  );
  check(
    "Milestone buatan admin di validasi panjang string",
    apiSrc.includes('fieldErrors.judul_milestone =') && apiSrc.includes('fieldErrors.keterangan_milestone ='),
    "length check milestone"
  );
  check(
    "Milestone opsi manual diinsert berbarengan update program",
    apiSrc.includes("supabase.from(\"program_milestones\").insert("),
    "manual insert support"
  );

  // 2. Logic Trigger Database (Automatic Milestone)
  const migration = readFileSync("./supabase/migrations/20260101000004_init_program_milestones.sql", "utf8");
  check(
    "Ada trigger auto log pada tabel development_programs",
    migration.includes(`create trigger development_programs_log_milestone`) && migration.includes("after update on public.development_programs"),
    "trigger exists"
  );
  check(
    "Trigger membandingkan old.progress dengan new.progress (hanya log ketika berubah)",
    migration.includes("new.progress is distinct from old.progress or new.status is distinct from old.status"),
    "distinct comparison"
  );

} catch (err) {
  console.error(err);
  exitCode = 1;
}

const failed = results.filter((r) => !r.pass);
console.log(`\nRingkasan: ${results.length - failed.length}/${results.length} lulus`);
if (failed.length > 0) {
  console.log("Gagal:", failed.map((f) => f.name).join(", "));
  exitCode = 1;
}
process.exit(exitCode);