/**
 * Uji logic kalkulasi over-budget Check
 */

import { overBudgetCheck } from "./src/lib/data/budget-validation.js";

// Karena tidak ada DB saat pengujian, minimal kita membuktikan bahwa ketika DB tidak di config (isSupabaseConfigured() false),
// function fallback mengembalikan null (fail-open dengan aman / tidak crash)
async function run() {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";
    const res = await overBudgetCheck(2026, "umum", 1000);
    console.log("Mock check pass: ", res === null);
}

run();