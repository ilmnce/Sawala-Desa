"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { gantiPasswordAction, updateProfilAction, type ActionState } from "./actions";
import type { AppUser } from "@/lib/types";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 text-xs font-medium text-rose-600" role="alert">
      {message}
    </p>
  );
}

function StatusMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;
  const isOk = state.ok;
  return (
    <p
      role={isOk ? "status" : "alert"}
      aria-live={isOk ? "polite" : "assertive"}
      className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${
        isOk
          ? "border border-village-200 bg-village-50 text-village-800"
          : "border border-rose-200 bg-rose-50 text-rose-700"
      }`}
    >
      {isOk ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      ) : (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      {state.message}
    </p>
  );
}

function SubmitButton({ pending, label, pendingLabel }: { pending: boolean; label: string; pendingLabel: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-village-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-village-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-village-600 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        label
      )}
    </button>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-village-500 focus:ring-4 focus:ring-village-500/10";

/** Handler bersama: jalankan server action dengan FormData & kelola state. */
function useFormAction(
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>,
) {
  const router = useRouter();
  const [state, setState] = useState<ActionState>({ ok: false, message: "" });
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Setelah gagal, fokuskan field pertama yang bermasalah agar mudah diperbaiki.
  useEffect(() => {
    const errors = state.fieldErrors;
    if (!errors || Object.keys(errors).length === 0) return;

    const firstField = Object.keys(errors)[0];
    const element = formRef.current?.elements.namedItem(firstField);
    if (element instanceof HTMLElement) {
      element.focus();
      element.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [state]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPending(true);
    try {
      const result = await action(state, formData);
      setState(result);
      // Sinkronkan data server (mis. ringkasan profil) setelah simpan berhasil.
      if (result.ok) router.refresh();
    } catch {
      setState({ ok: false, message: "Terjadi kesalahan tak terduga. Coba lagi." });
    } finally {
      setPending(false);
    }
  }

  return { state, pending, onSubmit, formRef };
}

export function DataDiriForm({ user }: { user: AppUser }) {
  const { state, pending, onSubmit, formRef } = useFormAction(updateProfilAction);

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="nik" className="mb-1.5 block text-sm font-semibold text-slate-700">
            NIK
          </label>
          <input id="nik" name="nik" value={user.nik} readOnly disabled className={`${inputClass} bg-slate-50 text-slate-500`} />
          <p className="mt-1.5 text-xs text-slate-500">NIK dikelola perangkat desa.</p>
        </div>
        <div>
          <label htmlFor="nama" className="mb-1.5 block text-sm font-semibold text-slate-700">
            Nama Lengkap
          </label>
          <input id="nama" name="nama" value={user.namaLengkap} readOnly disabled className={`${inputClass} bg-slate-50 text-slate-500`} />
          <p className="mt-1.5 text-xs text-slate-500">Perubahan nama diajukan ke kantor desa.</p>
        </div>
      </div>

      <div>
        <label htmlFor="alamat" className="mb-1.5 block text-sm font-semibold text-slate-700">
          Alamat
        </label>
        <textarea
          id="alamat"
          name="alamat"
          rows={3}
          defaultValue={user.alamat ?? ""}
          placeholder="Contoh: Jl. Poros Desa, Dusun Salawa"
          aria-invalid={Boolean(state.fieldErrors?.alamat)}
          className={inputClass}
        />
        <FieldError message={state.fieldErrors?.alamat} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="rt" className="mb-1.5 block text-sm font-semibold text-slate-700">RT</label>
          <input id="rt" name="rt" inputMode="numeric" defaultValue={user.rt ?? ""} placeholder="001" aria-invalid={Boolean(state.fieldErrors?.rt)} className={inputClass} />
          <FieldError message={state.fieldErrors?.rt} />
        </div>
        <div>
          <label htmlFor="rw" className="mb-1.5 block text-sm font-semibold text-slate-700">RW</label>
          <input id="rw" name="rw" inputMode="numeric" defaultValue={user.rw ?? ""} placeholder="002" aria-invalid={Boolean(state.fieldErrors?.rw)} className={inputClass} />
          <FieldError message={state.fieldErrors?.rw} />
        </div>
        <div>
          <label htmlFor="dusun" className="mb-1.5 block text-sm font-semibold text-slate-700">Dusun</label>
          <input id="dusun" name="dusun" defaultValue={user.dusun ?? ""} placeholder="Salawa" className={inputClass} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="no_telepon" className="mb-1.5 block text-sm font-semibold text-slate-700">
            Nomor Telepon
          </label>
          <input
            id="no_telepon"
            name="no_telepon"
            inputMode="tel"
            defaultValue={user.noTelepon ?? ""}
            placeholder="0812xxxxxxx"
            aria-invalid={Boolean(state.fieldErrors?.no_telepon)}
            className={inputClass}
          />
          <FieldError message={state.fieldErrors?.no_telepon} />
        </div>
        <div>
          <label htmlFor="pekerjaan" className="mb-1.5 block text-sm font-semibold text-slate-700">
            Pekerjaan
          </label>
          <input
            id="pekerjaan"
            name="pekerjaan"
            defaultValue={user.pekerjaan ?? ""}
            placeholder="Petani / Pedagang / dst."
            aria-invalid={Boolean(state.fieldErrors?.pekerjaan)}
            className={inputClass}
          />
          <FieldError message={state.fieldErrors?.pekerjaan} />
        </div>
      </div>

      <StatusMessage state={state} />

      <SubmitButton pending={pending} label="Simpan Perubahan" pendingLabel="Menyimpan..." />
    </form>
  );
}

export function GantiPasswordForm() {
  const { state, pending, onSubmit, formRef } = useFormAction(gantiPasswordAction);

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-5" noValidate>
      <div>
        <label htmlFor="password_lama" className="mb-1.5 block text-sm font-semibold text-slate-700">
          Password Lama
        </label>
        <input
          id="password_lama"
          name="password_lama"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(state.fieldErrors?.password_lama)}
          className={inputClass}
        />
        <FieldError message={state.fieldErrors?.password_lama} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="password_baru" className="mb-1.5 block text-sm font-semibold text-slate-700">
            Password Baru
          </label>
          <input
            id="password_baru"
            name="password_baru"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(state.fieldErrors?.password_baru)}
            className={inputClass}
          />
          <FieldError message={state.fieldErrors?.password_baru} />
        </div>
        <div>
          <label htmlFor="konfirmasi" className="mb-1.5 block text-sm font-semibold text-slate-700">
            Konfirmasi Password Baru
          </label>
          <input
            id="konfirmasi"
            name="konfirmasi"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(state.fieldErrors?.konfirmasi)}
            className={inputClass}
          />
          <FieldError message={state.fieldErrors?.konfirmasi} />
        </div>
      </div>

      <p className="text-xs leading-5 text-slate-500">
        Gunakan minimal 8 karakter dan hindari data yang mudah ditebak.
      </p>

      <StatusMessage state={state} />

      <SubmitButton pending={pending} label="Ganti Password" pendingLabel="Menyimpan..." />
    </form>
  );
}