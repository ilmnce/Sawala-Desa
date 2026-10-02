"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Landmark, Loader2, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isValidNik } from "@/lib/validation";
import { useAuthSession } from "@/lib/auth-client";

/** Baca parameter `next` dari URL tanpa memaksa halaman keluar dari prerender. */
function getNextParam(): string | null {
  if (typeof window === "undefined") return null;
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") ? next : null;
}

export default function LoginPage() {
  const router = useRouter();
  const session = useAuthSession();
  const [nik, setNik] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Bila sudah punya sesi aktif, langsung arahkan ke portal sesuai role.
  useEffect(() => {
    if (session.status === "authenticated" && session.user) {
      router.replace(session.user.role === "admin" ? "/admin" : "/dashboard");
    }
  }, [session.status, session.user, router]);

  function handleNikChange(value: string) {
    setNik(value.replace(/\D/g, "").slice(0, 16));
    if (error) setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (session.status === "loading") {
      return;
    }

    if (!isValidNik(nik)) {
      setError("NIK harus terdiri dari tepat 16 digit angka.");
      return;
    }

    if (!password) {
      setError("Masukkan password akun Anda.");
      return;
    }

    if (!isSupabaseConfigured()) {
      setError("Database belum dikonfigurasi. Hubungi administrator sistem desa.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nik, password }),
      });

      const payload = (await response.json()) as {
        error?: string;
        user?: { role: "warga" | "admin" };
        redirectTo?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "Gagal masuk. Coba lagi.");
        return;
      }

      const isAdmin = payload.user?.role === "admin";
      const fallback = isAdmin ? "/admin" : "/dashboard";
      const next = getNextParam();
      // Hormati `next` hanya bila tujuannya memang boleh diakses role tersebut.
      const nextAllowed = next !== null && (isAdmin || !next.startsWith("/admin"));
      const target = nextAllowed ? (next as string) : payload.redirectTo ?? fallback;

      router.replace(target);
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-sand">
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(#287a4b_0.7px,transparent_0.7px)] [background-size:22px_22px]" />
      <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-village-100 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-24 h-72 w-72 rounded-full bg-amber-100/70 blur-3xl" />

      <div className="relative mx-auto grid min-h-screen max-w-7xl items-stretch lg:grid-cols-[1.08fr_0.92fr]">
        <section className="hidden flex-col justify-between px-12 py-10 lg:flex xl:px-20 xl:py-14">
          <Brand />

          <div className="max-w-xl pb-8">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-village-500/20 bg-white/60 px-4 py-2 text-sm font-semibold text-village-700 backdrop-blur">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Portal resmi pelayanan warga
            </p>
            <h1 className="font-[var(--font-lora)] text-5xl font-semibold leading-[1.12] tracking-[-0.035em] text-village-900 xl:text-6xl">
              Desa terhubung,
              <span className="block text-village-600">layanan lebih dekat.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600">
              Ajukan layanan, sampaikan aspirasi, dan pantau pembangunan desa di wilayah Kabupaten Pandeglang melalui satu ruang digital yang aman dan transparan.
            </p>
          </div>

          <p className="text-sm text-slate-500">© 2026 Program Sawala Desa — Kabupaten Pandeglang</p>
        </section>

        <section className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-8 lg:bg-white/45 lg:px-12 lg:backdrop-blur-sm">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <Brand />
            </div>

            <div className="rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-soft backdrop-blur-xl sm:p-9 lg:border-slate-200/70">
              <div className="mb-8">
                <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-village-600">Selamat datang</p>
                <h2 className="font-[var(--font-lora)] text-3xl font-semibold tracking-tight text-slate-900">Masuk ke akun warga</h2>
                <p className="mt-3 leading-6 text-slate-500">Gunakan NIK dan password yang telah terdaftar.</p>
              </div>

              {session.status === "loading" ? (
                <p className="mb-5 inline-flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600" role="status">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Memeriksa sesi akun...
                </p>
              ) : null}

              <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                <div>
                  <label htmlFor="nik" className="mb-2 block text-sm font-semibold text-slate-700">
                    Nomor Induk Kependudukan
                  </label>
                  <div className="group relative">
                    <UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-village-600" aria-hidden="true" />
                    <input
                      id="nik"
                      name="nik"
                      type="text"
                      inputMode="numeric"
                      autoComplete="username"
                      value={nik}
                      onChange={(event) => handleNikChange(event.target.value)}
                      placeholder="Masukkan 16 digit NIK"
                      aria-describedby={error ? "login-error" : "nik-hint"}
                      aria-invalid={Boolean(error && nik.length !== 16)}
                      className="h-[3.25rem] w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-village-500 focus:ring-4 focus:ring-village-500/10"
                    />
                  </div>
                  <p id="nik-hint" className="mt-2 text-xs text-slate-500">
                    {nik.length}/16 digit
                  </p>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                      Password
                    </label>
                    <button type="button" className="text-sm font-semibold text-village-600 transition hover:text-village-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-village-500">
                      Lupa password?
                    </button>
                  </div>
                  <div className="group relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-village-600" aria-hidden="true" />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        if (error) setError("");
                      }}
                      placeholder="Masukkan password"
                      aria-describedby={error ? "login-error" : undefined}
                      className="h-[3.25rem] w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-12 pr-12 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-village-500 focus:ring-4 focus:ring-village-500/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      className="absolute right-3 top-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-village-500"
                      aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
                    </button>
                  </div>
                </div>

                {error ? (
                  <p id="login-error" role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-village-600 px-5 py-3.5 font-semibold text-white shadow-lg shadow-village-600/20 transition hover:bg-village-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-village-600 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      Masuk ke SAWALA DESA
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-7 flex items-start gap-3 rounded-xl bg-village-50 px-4 py-3.5 text-sm leading-5 text-village-900">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-village-600" aria-hidden="true" />
                <p>Data Anda dilindungi. Jangan berikan NIK dan password kepada siapa pun.</p>
              </div>
            </div>

            <p className="mt-6 text-center text-sm text-slate-500">
              Belum memiliki akun? <span className="font-semibold text-slate-700">Hubungi kantor desa.</span>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <img src="/logo-sawala.svg" alt="Logo Sawala Desa" className="h-11 w-11 drop-shadow-md" />
      <span>
        <span className="block text-lg font-extrabold leading-5 tracking-[-0.02em] text-village-900">SAWALA DESA</span>
        <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Melayani sepenuh hati</span>
      </span>
    </div>
  );
}
