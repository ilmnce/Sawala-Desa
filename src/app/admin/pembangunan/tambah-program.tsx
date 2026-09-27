"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, Plus, Sparkles, X } from "lucide-react";
import {
  PROGRAM_KATEGORI,
  PROGRAM_KATEGORI_LABELS,
  PROGRAM_STATUSES,
  PROGRAM_STATUS_LABELS,
  progressTone,
  type ProgramKategori,
  type ProgramStatus,
} from "@/lib/program-constants";

export function FormTambahProgram({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [nama, setNama] = useState("");
  const [kategori, setKategori] = useState<ProgramKategori>("fisik");
  const [anggaranStr, setAnggaranStr] = useState("");
  const [status, setStatus] = useState<ProgramStatus>("direncanakan");
  const [progress, setProgress] = useState(0);
  const [lokasi, setLokasi] = useState("");
  const [pelaksana, setPelaksana] = useState("");
  const [deskripsi, setDeskripsi] = useState("");

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState(false);
  const [serverState, setServerState] = useState<{
    ok: boolean;
    message: string;
    fieldErrors?: Record<string, string>;
  }>({ ok: false, message: "" });

  const anggaran = useMemo(() => {
    const num = Number(anggaranStr.replace(/\D/g, ""));
    return Number.isNaN(num) ? 0 : num;
  }, [anggaranStr]);

  const validation = useMemo(() => {
    const f: Record<string, string> = {};
    if (nama.trim().length < 3) f.nama = "Nama program minimal 3 karakter.";
    if (anggaran < 0) f.anggaran = "Anggaran tidak boleh negatif.";
    return { fieldErrors: f, valid: Object.keys(f).length === 0 };
  }, [nama, anggaran]);

  const errorFor = (field: string): string | undefined => {
    if (serverState.fieldErrors?.[field]) return serverState.fieldErrors[field];
    return touched[field] ? validation.fieldErrors[field] : undefined;
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ nama: true, anggaran: true });

    if (!validation.valid) {
      setServerState({ ok: false, message: "Periksa kembali isian form." });
      return;
    }

    setPending(true);
    setServerState({ ok: false, message: "" });

    try {
      const res = await fetch("/api/pembangunan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: nama.trim(),
          kategori,
          anggaran,
          status,
          progress: status === "selesai" ? 100 : progress,
          lokasi: lokasi.trim(),
          pelaksana: pelaksana.trim(),
          deskripsi: deskripsi.trim(),
        }),
      });

      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        setServerState({
          ok: false,
          message: payload?.error ?? "Gagal menyimpan program.",
          fieldErrors: payload?.fieldErrors,
        });
        return;
      }

      router.refresh();
      onSuccess();
    } catch {
      setServerState({ ok: false, message: "Tidak dapat terhubung ke server." });
    } finally {
      setPending(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-village-500 focus:ring-4 focus:ring-village-500/10 disabled:bg-slate-50 disabled:text-slate-500";

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div>
        <label htmlFor="nama" className="mb-1.5 block text-sm font-semibold text-slate-700">
          Nama Program <span className="text-rose-500">*</span>
        </label>
        <input
          id="nama"
          name="nama"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, nama: true }))}
          placeholder="Contoh: Pengaspalan Jalan Poros RW 02"
          aria-invalid={Boolean(errorFor("nama"))}
          className={inputClass}
        />
        {errorFor("nama") ? (
          <p className="mt-1.5 text-xs font-medium text-rose-600" role="alert">
            {errorFor("nama")}
          </p>
        ) : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="kategori" className="mb-1.5 block text-sm font-semibold text-slate-700">
            Kategori Program
          </label>
          <select
            id="kategori"
            value={kategori}
            onChange={(e) => setKategori(e.target.value as ProgramKategori)}
            className={inputClass}
          >
            {PROGRAM_KATEGORI.map((k) => (
              <option key={k} value={k}>{PROGRAM_KATEGORI_LABELS[k]}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="anggaran" className="mb-1.5 block text-sm font-semibold text-slate-700">
            Anggaran (Rp)
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
              Rp
            </span>
            <input
              id="anggaran"
              type="text"
              inputMode="numeric"
              value={anggaranStr}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                setAnggaranStr(val ? new Intl.NumberFormat("id-ID").format(Number(val)) : "");
              }}
              placeholder="0"
              className={`${inputClass} pl-11`}
            />
          </div>
          {errorFor("anggaran") ? (
            <p className="mt-1.5 text-xs font-medium text-rose-600" role="alert">
              {errorFor("anggaran")}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="lokasi" className="mb-1.5 block text-sm font-semibold text-slate-700">
            Lokasi <span className="font-normal text-slate-400">(opsional)</span>
          </label>
          <input
            id="lokasi"
            value={lokasi}
            onChange={(e) => setLokasi(e.target.value)}
            placeholder="Dusun Sawala / Terpusat"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="pelaksana" className="mb-1.5 block text-sm font-semibold text-slate-700">
            Pelaksana <span className="font-normal text-slate-400">(opsional)</span>
          </label>
          <input
            id="pelaksana"
            value={pelaksana}
            onChange={(e) => setPelaksana(e.target.value)}
            placeholder="CV Bina Karya / Swakelola"
            className={inputClass}
          />
        </div>
      </div>

      <div className="rounded-xl border border-village-100 bg-village-50/50 p-4 sm:p-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="status" className="mb-1.5 block text-sm font-semibold text-slate-700">
              Status Awal
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ProgramStatus)}
              className={inputClass}
            >
              {PROGRAM_STATUSES.map((s) => (
                <option key={s} value={s}>{PROGRAM_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="progress" className="text-sm font-semibold text-slate-700">
                Progress Awal
              </label>
              <span className="text-xs font-semibold text-slate-600">
                {status === "selesai" ? 100 : progress}%
              </span>
            </div>
            <input
              id="progress"
              type="range"
              min={0}
              max={100}
              step={5}
              value={status === "selesai" ? 100 : progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              disabled={status === "selesai"}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-village-600 disabled:opacity-50"
            />
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${progressTone(status === "selesai" ? 100 : progress)}`}
                style={{ width: `${status === "selesai" ? 100 : progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="deskripsi" className="mb-1.5 block text-sm font-semibold text-slate-700">
          Deskripsi singkat <span className="font-normal text-slate-400">(opsional)</span>
        </label>
        <textarea
          id="deskripsi"
          rows={3}
          value={deskripsi}
          onChange={(e) => setDeskripsi(e.target.value)}
          placeholder="Ringkasan spesifikasi, tujuan, atau manfaat program."
          className={inputClass}
        />
      </div>

      {serverState.message ? (
        <p
          role={serverState.ok ? "status" : "alert"}
          className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${
            serverState.ok
              ? "border border-village-200 bg-village-50 text-village-800"
              : "border border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {serverState.ok ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          {serverState.message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-village-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-village-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-village-600 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Menyimpan...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Buat Program Baru
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
        >
          Batal
        </button>
      </div>
    </form>
  );
}

export function TombolTambahProgram() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-village-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-village-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-village-600"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Tambah Program
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Tutup popup"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tambah-program-title"
            className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-8"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Tutup"
              className="absolute right-4 top-4 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <h2 id="tambah-program-title" className="pr-10 font-[var(--font-lora)] text-2xl font-semibold text-slate-900">
              Tambah Program Baru
            </h2>
            <p className="mt-1 mb-6 text-sm text-slate-500">
              Program akan langsung tampil di beranda awam setelah disimpan.
            </p>
            <FormTambahProgram onClose={() => setOpen(false)} onSuccess={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}