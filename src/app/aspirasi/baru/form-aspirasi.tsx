"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";
import { ASPIRATION_CATEGORIES, CATEGORY_LABELS } from "@/lib/aspiration-constants";
import { validasiAspirasi } from "@/lib/aspiration-validation";
import type { AspirationActionState } from "../types";

/** Batas waktu pengiriman (ms) sebelum dianggap gagal koneksi. */
const SUBMIT_TIMEOUT_MS = 15_000;

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-village-500 focus:ring-4 focus:ring-village-500/10";

const JUDUL_MAX = 150;
const DESKRIPSI_MAX = 2000;

export function FormAspirasi() {
  const router = useRouter();
  const [judul, setJudul] = useState("");
  const [kategori, setKategori] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<AspirationActionState>({ ok: false, message: "" });

  // Validasi client real-time; hanya ditampilkan untuk field yang sudah disentuh.
  const validation = useMemo(
    () => validasiAspirasi({ judul, kategori, deskripsi }),
    [judul, kategori, deskripsi],
  );

  const errorFor = (field: string): string | undefined => {
    if (state.fieldErrors?.[field]) return state.fieldErrors[field];
    return touched[field] ? validation.fieldErrors[field] : undefined;
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Tandai semua field sebagai disentuh agar seluruh error klien tampil.
    setTouched({ judul: true, kategori: true, deskripsi: true });

    if (!validation.valid) {
      setState({ ok: false, message: "Periksa kembali data usulan Anda." });
      return;
    }

    setPending(true);
    setState({ ok: false, message: "" });

    // Batalkan pengiriman yang menggantung agar form tidak terkunci.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);

    try {
      const response = await fetch("/api/aspirasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ judul, kategori, deskripsi }),
        signal: controller.signal,
      });

      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        error?: string;
        fieldErrors?: Record<string, string>;
      } | null;

      if (!response.ok) {
        // Error validasi dari server dipetakan kembali ke field terkait.
        setState({
          ok: false,
          message: payload?.error ?? "Gagal mengirim usulan. Coba lagi.",
          fieldErrors: payload?.fieldErrors,
        });
        return;
      }

      setState({
        ok: true,
        message: payload?.message ?? "Usulan aspirasi berhasil dikirim.",
      });
      setJudul("");
      setKategori("");
      setDeskripsi("");
      setTouched({});
      router.refresh();
      router.push("/aspirasi?s=terkirim");
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === "AbortError";
      setState({
        ok: false,
        message: aborted
          ? "Pengiriman memakan waktu terlalu lama. Periksa koneksi lalu coba lagi."
          : "Tidak dapat terhubung ke server. Periksa koneksi Anda.",
      });
    } finally {
      clearTimeout(timeoutId);
      setPending(false);
    }
  }

  const sisaJudul = JUDUL_MAX - judul.length;
  const sisaDeskripsi = DESKRIPSI_MAX - deskripsi.length;

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <label htmlFor="judul" className="block text-sm font-semibold text-slate-700">
            Judul Usulan <span className="text-rose-500">*</span>
          </label>
          <span className={`text-xs ${sisaJudul < 0 ? "text-rose-600" : "text-slate-400"}`}>
            {judul.length}/{JUDUL_MAX}
          </span>
        </div>
        <input
          id="judul"
          name="judul"
          value={judul}
          onChange={(e) => setJudul(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, judul: true }))}
          maxLength={JUDUL_MAX}
          placeholder="Contoh: Perbaikan jalan usaha tani Dusun Salawa"
          aria-invalid={Boolean(errorFor("judul"))}
          aria-describedby={errorFor("judul") ? "judul-error" : "judul-hint"}
          className={inputClass}
        />
        <p id="judul-hint" className="mt-1.5 text-xs text-slate-500">
          Tulis singkat dan jelas agar mudah dipahami perangkat desa.
        </p>
        {errorFor("judul") ? (
          <p id="judul-error" className="mt-1.5 text-xs font-medium text-rose-600" role="alert">
            {errorFor("judul")}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="kategori" className="mb-1.5 block text-sm font-semibold text-slate-700">
          Kategori <span className="text-rose-500">*</span>
        </label>
        <select
          id="kategori"
          name="kategori"
          value={kategori}
          onChange={(e) => {
            setKategori(e.target.value);
            setTouched((t) => ({ ...t, kategori: true }));
          }}
          onBlur={() => setTouched((t) => ({ ...t, kategori: true }))}
          aria-invalid={Boolean(errorFor("kategori"))}
          className={`${inputClass} ${kategori === "" ? "text-slate-400" : ""}`}
        >
          <option value="">Pilih kategori usulan</option>
          {ASPIRATION_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {CATEGORY_LABELS[value]}
            </option>
          ))}
        </select>
        {errorFor("kategori") ? (
          <p className="mt-1.5 text-xs font-medium text-rose-600" role="alert">
            {errorFor("kategori")}
          </p>
        ) : null}
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <label htmlFor="deskripsi" className="block text-sm font-semibold text-slate-700">
            Deskripsi Permasalahan <span className="text-rose-500">*</span>
          </label>
          <span className={`text-xs ${sisaDeskripsi < 0 ? "text-rose-600" : "text-slate-400"}`}>
            {deskripsi.length}/{DESKRIPSI_MAX}
          </span>
        </div>
        <textarea
          id="deskripsi"
          name="deskripsi"
          rows={6}
          value={deskripsi}
          onChange={(e) => setDeskripsi(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, deskripsi: true }))}
          maxLength={DESKRIPSI_MAX}
          placeholder="Jelaskan kondisi saat ini, dampak bagi warga, dan usulan solusinya."
          aria-invalid={Boolean(errorFor("deskripsi"))}
          className={inputClass}
        />
        {errorFor("deskripsi") ? (
          <p className="mt-1.5 text-xs font-medium text-rose-600" role="alert">
            {errorFor("deskripsi")}
          </p>
        ) : null}
      </div>

      {state.message ? (
        <p
          role={state.ok ? "status" : "alert"}
          className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${
            state.ok
              ? "border border-village-200 bg-village-50 text-village-800"
              : "border border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {state.ok ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-village-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-village-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-village-600 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Mengirim usulan...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" aria-hidden="true" />
              Kirim Usulan
            </>
          )}
        </button>
        <Link
          href="/aspirasi"
          className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
        >
          Batal
        </Link>
      </div>
    </form>
  );
}