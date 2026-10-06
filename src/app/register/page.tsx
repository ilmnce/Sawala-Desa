"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Eye,
  EyeOff,
  House,
  KeyRound,
  Loader2,
  MapPin,
  ShieldCheck,
  UserRound,
  UserRoundPlus,
} from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isValidNik, MIN_PASSWORD_LENGTH } from "@/lib/validation";

type Step = 1 | 2;

const PHONE_RE = /^[0-9+][0-9 -]{7,19}$/;
const SEX_OPTIONS = ["Laki-laki", "Perempuan"] as const;

/** Kriteria password yang diperiksa satu per satu untuk indikator progres. */
function passwordChecks(password: string) {
  return [
    { label: `${MIN_PASSWORD_LENGTH} karakter ke atas`, ok: password.length >= MIN_PASSWORD_LENGTH },
    { label: "Ada huruf", ok: /[A-Za-z]/.test(password) },
    { label: "Ada angka", ok: /[0-9]/.test(password) },
  ];
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  const [nik, setNik] = useState("");
  const [nama, setNama] = useState("");
  const [jenisKelamin, setJenisKelamin] = useState("");
  const [tempatLahir, setTempatLahir] = useState("");
  const [tanggalLahir, setTanggalLahir] = useState("");
  const [alamat, setAlamat] = useState("");
  const [rt, setRt] = useState("");
  const [rw, setRw] = useState("");
  const [dusun, setDusun] = useState("");
  const [noTelepon, setNoTelepon] = useState("");
  const [pekerjaan, setPekerjaan] = useState("");

  const [password, setPassword] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  function clearError() {
    if (error) setError("");
    if (success) setSuccess("");
  }

  function digits(value: string, max = 16) {
    return value.replace(/\D/g, "").slice(0, max);
  }

  async function handleIdentitas(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearError();

    const nextErrors: Record<string, string> = {};
    if (!isValidNik(nik)) nextErrors.nik = "NIK harus terdiri dari tepat 16 digit angka.";
    if (nama.trim().length < 3) nextErrors.nama = "Nama minimal 3 karakter.";
    if (!jenisKelamin) nextErrors.jenis_kelamin = "Pilih jenis kelamin Anda.";
    if (rt && !/^[0-9]{1,3}$/.test(rt)) nextErrors.rt = "RT berupa angka 1-3 digit.";
    if (rw && !/^[0-9]{1,3}$/.test(rw)) nextErrors.rw = "RW berupa angka 1-3 digit.";
    if (noTelepon && !PHONE_RE.test(noTelepon)) nextErrors.no_telepon = "Nomor telepon tidak valid.";

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setError("Periksa kembali isian Anda.");
      return;
    }

    setFieldErrors({});
    setStep(2);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearError();

    const nextErrors: Record<string, string> = {};
    if (password.length < MIN_PASSWORD_LENGTH) {
      nextErrors.password = `Password minimal ${MIN_PASSWORD_LENGTH} karakter.`;
    } else if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      nextErrors.password = "Password harus memuat huruf dan angka.";
    }
    if (konfirmasi !== password) nextErrors.konfirmasi = "Konfirmasi password tidak sama.";

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors({ ...fieldErrors, ...nextErrors });
      setError("Periksa kembali isian Anda.");
      return;
    }

    if (!isSupabaseConfigured()) {
      setError("Database belum dikonfigurasi. Hubungi administrator sistem desa.");
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      const response = await fetch("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nik,
          nama: nama.trim(),
          password,
          jenis_kelamin: jenisKelamin || undefined,
          tempat_lahir: tempatLahir.trim() || undefined,
          tanggal_lahir: tanggalLahir || undefined,
          alamat: alamat.trim() || undefined,
          rt: rt || undefined,
          rw: rw || undefined,
          dusun: dusun.trim() || undefined,
          no_telepon: noTelepon.trim() || undefined,
          pekerjaan: pekerjaan.trim() || undefined,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        message?: string;
        next?: string;
        fieldErrors?: Record<string, string>;
      };

      if (!response.ok) {
        if (payload.fieldErrors) setFieldErrors(payload.fieldErrors);
        setError(payload.error ?? "Gagal membuat akun. Coba lagi.");
        return;
      }

      setSuccess(payload.message ?? "Akun berhasil dibuat. Silakan masuk untuk melanjutkan.");
      setTimeout(() => router.push(payload.next ?? "/login"), 1800);
    } catch {
      setError("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
    } finally {
      setLoading(false);
    }
  }

  const checks = passwordChecks(password);
  const passwordValid = checks.every((check) => check.ok);

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
              Daftar sendiri, langsung digunakan
            </p>
            <h1 className="font-[var(--font-lora)] text-5xl font-semibold leading-[1.12] tracking-[-0.035em] text-village-900 xl:text-6xl">
              Satu akun,
              <span className="block text-village-600">semua layanan desa.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600">
              Warga membuat akunnya sendiri tanpa perlu meminta bantuan perangkat desa.
              Lengkapi data sesuai KTP, lalu masuk untuk mengajukan layanan, menyampaikan aspirasi,
              dan memantaunya kapan saja.
            </p>

            <ul className="mt-8 space-y-3 text-sm leading-6 text-slate-600">
              <li className="flex items-start gap-3">
                <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-village-600" aria-hidden="true" />
                <span>Verifikasi langsung setelah mendaftar — tanpa menunggu konfirmasi email.</span>
              </li>
              <li className="flex items-start gap-3">
                <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-village-600" aria-hidden="true" />
                <span>NIK menjadi identitas masuk Anda, sama seperti saat login.</span>
              </li>
              <li className="flex items-start gap-3">
                <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-village-600" aria-hidden="true" />
                <span>Data yang sudah terisi tetap bisa Anda lengkapi kembali lewat halaman Profil.</span>
              </li>
            </ul>
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
                <div className="mb-5 flex items-center gap-2" aria-hidden="true">
                  <span
                    className={`h-1.5 rounded-full transition-all ${step === 1 ? "w-10 bg-village-600" : "w-5 bg-village-600/40"}`}
                  />
                  <span
                    className={`h-1.5 rounded-full transition-all ${step === 2 ? "w-10 bg-village-600" : "w-5 bg-village-600/25"}`}
                  />
                </div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-village-600">
                  {step === 1 ? "Langkah 1 dari 2" : "Langkah 2 dari 2"}
                </p>
                <h2 className="font-[var(--font-lora)] text-3xl font-semibold tracking-tight text-slate-900">
                  {step === 1 ? "Data diri Anda" : "Buat password Anda"}
                </h2>
                <p className="mt-3 leading-6 text-slate-500">
                  {step === 1
                    ? "Isi sesuai KTP. Hanya NIK, nama, dan jenis kelamin yang wajib."
                    : "Password ini dipakai bersama NIK untuk masuk ke akun Anda."}
                </p>
              </div>

              {step === 1 ? (
                <form className="space-y-4" onSubmit={handleIdentitas} noValidate>
                  <div>
                    <label htmlFor="nik" className="mb-2 block text-sm font-semibold text-slate-700">
                      Nomor Induk Kependudukan
                    </label>
                    <div className="group relative">
                      <UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-village-600" aria-hidden="true" />
                      <input
                        id="nik"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        value={nik}
                        onChange={(event) => {
                          setNik(digits(event.target.value));
                          clearError();
                          if (fieldErrors.nik) setFieldErrors((previous) => ({ ...previous, nik: "" }));
                        }}
                        placeholder="16 digit NIK"
                        aria-describedby={fieldErrors.nik || nik ? "nik-hint" : undefined}
                        aria-invalid={Boolean(fieldErrors.nik)}
                        className={`h-[3.25rem] w-full rounded-xl border bg-white py-3.5 pl-12 pr-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
                          fieldErrors.nik
                            ? "border-red-300 focus:border-red-400 focus:ring-red-400/10"
                            : "border-slate-200 focus:border-village-500 focus:ring-village-500/10"
                        }`}
                      />
                    </div>
                    {fieldErrors.nik ? (
                      <p className="mt-2 text-xs font-medium text-red-600" role="alert">{fieldErrors.nik}</p>
                    ) : (
                      <p id="nik-hint" className="mt-2 text-xs text-slate-500">{nik.length}/16 digit</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="nama" className="mb-2 block text-sm font-semibold text-slate-700">
                      Nama Lengkap
                    </label>
                    <div className="group relative">
                      <UserRoundPlus className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-village-600" aria-hidden="true" />
                      <input
                        id="nama"
                        type="text"
                        autoComplete="name"
                        value={nama}
                        onChange={(event) => {
                          setNama(event.target.value);
                          clearError();
                          if (fieldErrors.nama) setFieldErrors((previous) => ({ ...previous, nama: "" }));
                        }}
                        placeholder="Sesuai KTP"
                        aria-invalid={Boolean(fieldErrors.nama)}
                        className={`h-[3.25rem] w-full rounded-xl border bg-white py-3.5 pl-12 pr-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
                          fieldErrors.nama
                            ? "border-red-300 focus:border-red-400 focus:ring-red-400/10"
                            : "border-slate-200 focus:border-village-500 focus:ring-village-500/10"
                        }`}
                      />
                    </div>
                    {fieldErrors.nama ? (
                      <p className="mt-2 text-xs font-medium text-red-600" role="alert">{fieldErrors.nama}</p>
                    ) : null}
                  </div>

                  <fieldset>
                    <legend className="mb-2 block text-sm font-semibold text-slate-700">Jenis Kelamin</legend>
                    <div className="grid grid-cols-2 gap-3">
                      {SEX_OPTIONS.map((option) => (
                        <label
                          key={option}
                          className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition ${
                            jenisKelamin === option
                              ? "border-village-500 bg-village-50 text-village-800"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                          }`}
                        >
                          <input
                            type="radio"
                            name="jenis_kelamin"
                            value={option}
                            checked={jenisKelamin === option}
                            onChange={() => {
                              setJenisKelamin(option);
                              clearError();
                              if (fieldErrors.jenis_kelamin) {
                                setFieldErrors((previous) => ({ ...previous, jenis_kelamin: "" }));
                              }
                            }}
                            className="sr-only"
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                    {fieldErrors.jenis_kelamin ? (
                      <p className="mt-2 text-xs font-medium text-red-600" role="alert">{fieldErrors.jenis_kelamin}</p>
                    ) : null}
                  </fieldset>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="tempat_lahir" className="mb-2 block text-sm font-semibold text-slate-700">
                        Tempat Lahir
                      </label>
                      <input
                        id="tempat_lahir"
                        type="text"
                        autoComplete="off"
                        value={tempatLahir}
                        onChange={(event) => setTempatLahir(event.target.value)}
                        placeholder="Opsional"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-village-500 focus:ring-4 focus:ring-village-500/10"
                      />
                    </div>
                    <div>
                      <label htmlFor="tanggal_lahir" className="mb-2 block text-sm font-semibold text-slate-700">
                        Tanggal Lahir
                      </label>
                      <div className="group relative">
                        <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                        <input
                          id="tanggal_lahir"
                          type="date"
                          value={tanggalLahir}
                          onChange={(event) => setTanggalLahir(event.target.value)}
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-2.5 text-sm text-slate-900 outline-none transition focus:border-village-500 focus:ring-4 focus:ring-village-500/10"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="alamat" className="mb-2 block text-sm font-semibold text-slate-700">
                      Alamat <span className="font-normal text-slate-400">(opsional)</span>
                    </label>
                    <div className="group relative">
                      <House className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-village-600" aria-hidden="true" />
                      <input
                        id="alamat"
                        type="text"
                        autoComplete="street-address"
                        value={alamat}
                        onChange={(event) => setAlamat(event.target.value)}
                        placeholder="Alamat lengkap tempat tinggal"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-12 pr-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-village-500 focus:ring-4 focus:ring-village-500/10"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label htmlFor="rt" className="mb-2 block text-sm font-semibold text-slate-700">RT</label>
                      <input
                        id="rt"
                        type="text"
                        inputMode="numeric"
                        value={rt}
                        onChange={(event) => {
                          setRt(digits(event.target.value, 3));
                          if (fieldErrors.rt) setFieldErrors((previous) => ({ ...previous, rt: "" }));
                        }}
                        placeholder="00"
                        aria-invalid={Boolean(fieldErrors.rt)}
                        className={`h-11 w-full rounded-xl border bg-white px-3.5 text-sm outline-none transition placeholder:text-slate-400 focus:ring-4 ${
                          fieldErrors.rt
                            ? "border-red-300 focus:border-red-400 focus:ring-red-400/10"
                            : "border-slate-200 focus:border-village-500 focus:ring-village-500/10"
                        }`}
                      />
                      {fieldErrors.rt ? (
                        <p className="mt-1 text-xs font-medium text-red-600" role="alert">{fieldErrors.rt}</p>
                      ) : null}
                    </div>
                    <div>
                      <label htmlFor="rw" className="mb-2 block text-sm font-semibold text-slate-700">RW</label>
                      <input
                        id="rw"
                        type="text"
                        inputMode="numeric"
                        value={rw}
                        onChange={(event) => {
                          setRw(digits(event.target.value, 3));
                          if (fieldErrors.rw) setFieldErrors((previous) => ({ ...previous, rw: "" }));
                        }}
                        placeholder="00"
                        aria-invalid={Boolean(fieldErrors.rw)}
                        className={`h-11 w-full rounded-xl border bg-white px-3.5 text-sm outline-none transition placeholder:text-slate-400 focus:ring-4 ${
                          fieldErrors.rw
                            ? "border-red-300 focus:border-red-400 focus:ring-red-400/10"
                            : "border-slate-200 focus:border-village-500 focus:ring-village-500/10"
                        }`}
                      />
                      {fieldErrors.rw ? (
                        <p className="mt-1 text-xs font-medium text-red-600" role="alert">{fieldErrors.rw}</p>
                      ) : null}
                    </div>
                    <div>
                      <label htmlFor="dusun" className="mb-2 block text-sm font-semibold text-slate-700">Dusun</label>
                      <input
                        id="dusun"
                        type="text"
                        value={dusun}
                        onChange={(event) => setDusun(event.target.value)}
                        placeholder="Opsional"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-village-500 focus:ring-4 focus:ring-village-500/10"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="no_telepon" className="mb-2 block text-sm font-semibold text-slate-700">
                        No. Telepon
                      </label>
                      <input
                        id="no_telepon"
                        type="tel"
                        autoComplete="tel"
                        value={noTelepon}
                        onChange={(event) => {
                          setNoTelepon(event.target.value);
                          if (fieldErrors.no_telepon) setFieldErrors((previous) => ({ ...previous, no_telepon: "" }));
                        }}
                        placeholder="08xxxxxxxxxx"
                        aria-invalid={Boolean(fieldErrors.no_telepon)}
                        className={`h-11 w-full rounded-xl border bg-white px-3.5 text-sm outline-none transition placeholder:text-slate-400 focus:ring-4 ${
                          fieldErrors.no_telepon
                            ? "border-red-300 focus:border-red-400 focus:ring-red-400/10"
                            : "border-slate-200 focus:border-village-500 focus:ring-village-500/10"
                        }`}
                      />
                      {fieldErrors.no_telepon ? (
                        <p className="mt-1 text-xs font-medium text-red-600" role="alert">{fieldErrors.no_telepon}</p>
                      ) : null}
                    </div>
                    <div>
                      <label htmlFor="pekerjaan" className="mb-2 block text-sm font-semibold text-slate-700">
                        Pekerjaan
                      </label>
                      <input
                        id="pekerjaan"
                        type="text"
                        autoComplete="off"
                        value={pekerjaan}
                        onChange={(event) => setPekerjaan(event.target.value)}
                        placeholder="Opsional"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-village-500 focus:ring-4 focus:ring-village-500/10"
                      />
                    </div>
                  </div>

                  {error ? (
                    <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                      {error}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={loading}
                    className="group flex w-full items-center justify-center gap-2 rounded-xl bg-village-600 px-5 py-3.5 font-semibold text-white shadow-lg shadow-village-600/20 transition hover:bg-village-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-village-600 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Lanjut buat password
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </button>
                </form>
              ) : (
                <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                  <div>
                    <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">
                      Password Baru
                    </label>
                    <div className="group relative">
                      <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-village-600" aria-hidden="true" />
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={password}
                        onChange={(event) => {
                          setPassword(event.target.value);
                          clearError();
                          if (fieldErrors.password) setFieldErrors((previous) => ({ ...previous, password: "" }));
                        }}
                        placeholder={`Minimal ${MIN_PASSWORD_LENGTH} karakter, huruf dan angka`}
                        aria-describedby={fieldErrors.password ? "password-error" : "password-checks"}
                        aria-invalid={Boolean(fieldErrors.password)}
                        className={`h-[3.25rem] w-full rounded-xl border bg-white py-3.5 pl-12 pr-12 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
                          fieldErrors.password
                            ? "border-red-300 focus:border-red-400 focus:ring-red-400/10"
                            : "border-slate-200 focus:border-village-500 focus:ring-village-500/10"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((visible) => !visible)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-village-500"
                        aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
                      </button>
                    </div>
                    <ul id="password-checks" className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
                      {checks.map((check) => (
                        <li
                          key={check.label}
                          className={`flex items-center gap-1.5 text-xs ${check.ok ? "text-village-700" : "text-slate-400"}`}
                        >
                          <MapPin
                            className={`h-3.5 w-3.5 ${check.ok ? "text-village-600" : "text-slate-300"}`}
                            aria-hidden="true"
                          />
                          {check.label}
                        </li>
                      ))}
                    </ul>
                    {fieldErrors.password ? (
                      <p id="password-error" className="mt-2 text-xs font-medium text-red-600" role="alert">{fieldErrors.password}</p>
                    ) : null}
                  </div>

                  <div>
                    <label htmlFor="konfirmasi" className="mb-2 block text-sm font-semibold text-slate-700">
                      Konfirmasi Password
                    </label>
                    <div className="group relative">
                      <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-village-600" aria-hidden="true" />
                      <input
                        id="konfirmasi"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={konfirmasi}
                        onChange={(event) => {
                          setKonfirmasi(event.target.value);
                          clearError();
                          if (fieldErrors.konfirmasi) setFieldErrors((previous) => ({ ...previous, konfirmasi: "" }));
                        }}
                        placeholder="Ulangi password di atas"
                        aria-describedby={fieldErrors.konfirmasi ? "konfirmasi-error" : undefined}
                        aria-invalid={Boolean(fieldErrors.konfirmasi)}
                        className={`h-[3.25rem] w-full rounded-xl border bg-white py-3.5 pl-12 pr-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
                          fieldErrors.konfirmasi
                            ? "border-red-300 focus:border-red-400 focus:ring-red-400/10"
                            : "border-slate-200 focus:border-village-500 focus:ring-village-500/10"
                        }`}
                      />
                    </div>
                    {fieldErrors.konfirmasi ? (
                      <p id="konfirmasi-error" className="mt-2 text-xs font-medium text-red-600" role="alert">{fieldErrors.konfirmasi}</p>
                    ) : null}
                  </div>

                  {error ? (
                    <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                      {error}
                    </p>
                  ) : null}

                  {success ? (
                    <p role="status" className="flex items-start gap-2 rounded-xl border border-village-200 bg-village-50 px-4 py-3 text-sm font-medium text-village-800">
                      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-village-600" aria-hidden="true" />
                      {success}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={loading || !passwordValid}
                    className="group flex w-full items-center justify-center gap-2 rounded-xl bg-village-600 px-5 py-3.5 font-semibold text-white shadow-lg shadow-village-600/20 transition hover:bg-village-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-village-600 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                        Membuat akun...
                      </>
                    ) : (
                      <>
                        Buat Akun Saya
                        <UserRoundPlus className="h-5 w-5" aria-hidden="true" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-village-600 disabled:opacity-60"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Kembali ke data diri
                  </button>
                </form>
              )}

              <div className="mt-7 flex items-start gap-3 rounded-xl bg-village-50 px-4 py-3.5 text-sm leading-5 text-village-900">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-village-600" aria-hidden="true" />
                <p>Data Anda dilindungi. Jangan berikan NIK dan password kepada siapa pun.</p>
              </div>
            </div>

            <p className="mt-6 text-center text-sm text-slate-500">
              Sudah punya akun?{" "}
              <Link
                href="/login"
                className="font-semibold text-village-700 transition hover:text-village-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-village-500"
              >
                Masuk di sini
              </Link>
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
        <span className="block text-lg font-extrabold leading-5 tracking-[-0.02em] text-village-900">
          SAWALA DESA
        </span>
        <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
          Melayani sepenuh hati
        </span>
      </span>
    </div>
  );
}
