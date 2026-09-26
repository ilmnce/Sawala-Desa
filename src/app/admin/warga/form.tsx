"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, Plus, X } from "lucide-react";
import { tambahWargaAction, type WargaActionState } from "./actions";

export function TombolTambahWarga() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, setState] = useState<WargaActionState>({ ok: false, message: "" });
  const [pending, setPending] = useState(false);
  const [nik, setNik] = useState("");
  const [nama, setNama] = useState("");
  const [pass, setPass] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setState({ ok: false, message: "" });

    const fd = new FormData();
    fd.set("nik", nik);
    fd.set("nama", nama);
    fd.set("password", pass);

    try {
      const res = await tambahWargaAction(state, fd);
      setState(res);
      if (res.ok) {
        setNik(""); setNama(""); setPass("");
        setTimeout(() => setOpen(false), 1200);
      }
    } catch {
       setState({ ok: false, message: "Koneksi terputus."});
    } finally {
      setPending(false);
    }
  }

  const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-village-500 focus:ring-4 focus:ring-village-500/10";

  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-village-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-village-700">
        <Plus className="h-4 w-4" aria-hidden="true" />
        Daftarkan Warga
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div role="dialog" aria-modal="true" className="relative w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl">
            <button onClick={() => setOpen(false)} className="absolute right-4 top-4 rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5"/></button>
            <h2 className="font-[var(--font-lora)] text-xl font-semibold text-slate-900 pr-8">Daftarkan Warga Baru</h2>
            <p className="text-sm text-slate-500 mt-1">Akun yang didaftarkan dapat langsung digunakaan warga untuk login.</p>

            <form onSubmit={onSubmit} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">NIK (16 Digit)</label>
                <input value={nik} onChange={e => setNik(e.target.value.replace(/\D/g, "").slice(0,16))} placeholder="Ketik 16 angka NIK..." className={inputClass} />
                {state.fieldErrors?.nik && <p className="mt-1 text-xs text-rose-600" role="alert">{state.fieldErrors.nik}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Nama Lengkap Sesuai KTP</label>
                <input value={nama} onChange={e => setNama(e.target.value)} placeholder="Contoh: Budi Santoso" className={inputClass} />
                {state.fieldErrors?.nama && <p className="mt-1 text-xs text-rose-600" role="alert">{state.fieldErrors.nama}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Password Awal <span className="text-normal font-normal text-slate-400">(sarankan warga untuk diubah kelak)</span></label>
                <input type="password" value={pass} onChange={e => setPass(e.target.value)} className={inputClass} />
                {state.fieldErrors?.password && <p className="mt-1 text-xs text-rose-600" role="alert">{state.fieldErrors.password}</p>}
              </div>

               {state.message && (
                 <p role={state.ok ? "status" : "alert"} className={`flex items-center gap-2 p-3 text-sm rounded-xl ${state.ok ? 'bg-village-50 text-village-800' : 'bg-rose-50 text-rose-700'}`}>
                   {state.ok ? <CheckCircle2 className="w-4 h-4"/> : <AlertCircle className="w-4 h-4"/>}
                   {state.message}
                 </p>
               )}

              <button type="submit" disabled={pending} className="w-full flex items-center justify-center gap-2 rounded-xl bg-village-600 py-3 text-sm font-semibold text-white transition hover:bg-village-700 disabled:opacity-50">
                  {pending ? <Loader2 className="w-4 h-4 animate-spin"/> : "Buat Akun"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}