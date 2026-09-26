"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";
import type { LetterType } from "@/lib/data/letters";

import { validasiPengajuanSurat } from "@/lib/letter-validation";

interface RequestState {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
}

export function FormPengajuanSurat({ types }: { types: LetterType[] }) {
  const router = useRouter();
  const [jenisId, setJenisId] = useState("");
  const [keperluan, setKeperluan] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<RequestState>({ ok: false, message: "" });
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const terpilih = useMemo(() => types.find((t) => t.id === jenisId), [types, jenisId]);

  const validation = useMemo(() => validasiPengajuanSurat({ jenisId, keperluan, keterangan }), [jenisId, keperluan, keterangan]);

  const errorFor = (f: string) => {
    if (state.fieldErrors?.[f]) return state.fieldErrors[f];
    return touched[f] ? validation.fieldErrors[f] : undefined;
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ jenisId: true, keperluan: true, keterangan: true });

    if (!validation.valid) {
      setState({ ok: false, message: "Periksa kembali kelengkapan form." });
      return;
    }

    setPending(true);
    setState({ ok: false, message: "" });

    try {
      const res = await fetch("/api/pelayanan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          letter_type_id: jenisId,
          jenis_surat: terpilih?.nama ?? "",
          keperluan: keperluan.trim(),
          keterangan_pemohon: keterangan.trim(),
        }),
      });

      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        setState({
          ok: false,
          message: payload?.error ?? "Gagal mengajukan surat.",
          fieldErrors: payload?.fieldErrors,
        });
        return;
      }

      router.refresh();
      router.push("/pelayanan?s=terkirim");
    } catch {
      setState({ ok: false, message: "Tidak dapat terhubung ke server." });
    } finally {
      setPending(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-village-500 focus:ring-4 focus:ring-village-500/10 disabled:bg-slate-50 disabled:text-slate-400";

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <div>
        <label htmlFor="jenis" className="mb-1.5 block text-sm font-semibold text-slate-700">
          Jenis Surat <span className="text-rose-500">*</span>
        </label>
        <select
          id="jenis"
          value={jenisId}
          onChange={(e) => {
            setJenisId(e.target.value);
            setTouched((t) => ({ ...t, jenisId: true }));
          }}
          aria-invalid={Boolean(errorFor("jenisId"))}
          disabled={pending}
          className={`${inputClass} ${jenisId === "" ? "text-slate-400" : ""}`}
        >
          <option value="">-- Pilih jenis layanan surat --</option>
          {types.map((t) => (
            <option key={t.id} value={t.id}>{t.nama}</option>
          ))}
        </select>
        {terpilih?.deskripsi ? (
          <p className="mt-2 text-xs leading-5 text-slate-500">Info: {terpilih.deskripsi}</p>
        ) : null}
        {errorFor("jenisId") ? (
          <p className="mt-1.5 text-xs font-medium text-rose-600" role="alert">
            {errorFor("jenisId")}
          </p>
        ) : null}
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="keperluan" className="block text-sm font-semibold text-slate-700">
            Tujuan / Keperluan <span className="text-rose-500">*</span>
          </label>
          <span className={`text-xs ${keperluan.length > 150 ? "text-rose-600" : "text-slate-400"}`}>
            {keperluan.length}/150
          </span>
        </div>
        <input
          id="keperluan"
          value={keperluan}
          onChange={(e) => setKeperluan(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, keperluan: true }))}
          disabled={pending}
          placeholder="Contoh: Mengurus beasiswa anak sekolah"
          aria-invalid={Boolean(errorFor("keperluan"))}
          className={inputClass}
        />
        {errorFor("keperluan") ? (
          <p className="mt-1.5 text-xs font-medium text-rose-600" role="alert">
            {errorFor("keperluan")}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="keterangan" className="mb-1.5 block text-sm font-semibold text-slate-700">
          Keterangan Tambahan / Lampiran <span className="font-normal text-slate-400">(opsional)</span>
        </label>
        <textarea
          id="keterangan"
          rows={3}
          value={keterangan}
          onChange={(e) => setKeterangan(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, keterangan: true }))}
          disabled={pending}
          placeholder="Tuliskan kelengkapan metadata dokumen seperti Nomor NIB bila relevan..."
          aria-invalid={Boolean(errorFor("keterangan"))}
          className={inputClass}
        />
        {errorFor("keterangan") ? (
          <p className="mt-1.5 text-xs font-medium text-rose-600" role="alert">
            {errorFor("keterangan")}
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

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-village-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-village-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-village-600 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Mengirim...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" aria-hidden="true" />
              Ajukan Surat
            </>
          )}
        </button>
        <Link
          href="/pelayanan"
          className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
        >
          Batal
        </Link>
      </div>
    </form>
  );
}