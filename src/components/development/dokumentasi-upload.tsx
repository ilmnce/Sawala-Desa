"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, FileImage, HardHat, Loader2, UploadCloud, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export function AreaUploadDokumentasi({ programId }: { programId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [judul, setJudul] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [pending, setPending] = useState(false);

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > 5 * 1024 * 1024) {
      toast("Ukuran file terlalu besar. Maksimal 5 MB.", "error");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type)) {
      toast("Format file tidak didukung. Gunakan JPG, PNG, atau WebP.", "error");
      return;
    }

    setFile(selected);
    if (!judul) {
      // Gunakan nama file sebagai judul default (tanpa ekstensi).
      const name = selected.name.replace(/\.[^/.]+$/, "");
      setJudul(name.length > 150 ? name.slice(0, 150) : name);
    }
  }

  function reset() {
    setFile(null);
    setJudul("");
    setKeterangan("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function upload() {
    if (!file || pending) return;
    setPending(true);

    try {
      const fd = new FormData();
      fd.append("file", file);
      if (judul.trim()) fd.append("judul", judul.trim());
      if (keterangan.trim()) fd.append("keterangan", keterangan.trim());

      const res = await fetch(`/api/pembangunan/${programId}/dokumentasi`, {
        method: "POST",
        body: fd,
        // Jangan set header form-data secara manual; browser akan mengatur boundary-nya
      });

      const payload = (await res.json().catch(() => null)) as { error?: string } | null;

      if (!res.ok) {
        toast(payload?.error ?? "Gagal mengunggah foto.", "error");
        return;
      }

      toast("Foto dokumentasi berhasil ditambahkan.", "success");
      reset();
      router.refresh();
    } catch {
      toast("Tidak dapat terhubung ke server.", "error");
    } finally {
      setPending(false);
    }
  }

  if (file) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3 min-w-0">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-village-50 text-village-700">
              <FileImage className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 truncate">
              <p className="truncate font-semibold text-slate-900">{file.name}</p>
              <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>
          <button
            type="button"
            onClick={reset}
            disabled={pending}
            aria-label="Batalkan pilihan file"
            className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="t-judul" className="mb-1.5 block text-sm font-semibold text-slate-700">
              Judul Foto
            </label>
            <input
              id="t-judul"
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              disabled={pending}
              placeholder="Contoh: Proses pengaspalan RT 01"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-village-500 focus:ring-4 focus:ring-village-500/10 disabled:bg-slate-50"
            />
          </div>
          <div>
            <label htmlFor="t-ket" className="mb-1.5 block text-sm font-semibold text-slate-700">
              Keterangan Singkat
            </label>
            <input
              id="t-ket"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              disabled={pending}
              placeholder="Tambahkan info spesifik lokasi atau kegiatan..."
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-village-500 focus:ring-4 focus:ring-village-500/10 disabled:bg-slate-50"
            />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={upload}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-xl bg-village-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-village-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-village-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <UploadCloud className="h-4 w-4" aria-hidden="true" />
            )}
            {pending ? "Mengunggah..." : "Unggah Foto"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 px-6 py-12 text-center transition-colors hover:border-village-400 hover:bg-village-50/30">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-slate-500 shadow-sm">
        <HardHat className="h-6 w-6" aria-hidden="true" />
      </span>
      <h3 className="mt-4 font-semibold text-slate-900">Tambahkan Dokumentasi Baru</h3>
      <p className="mt-1 text-sm text-slate-500">
        Klik untuk memilih file JPG atau PNG (maks 5 MB).
      </p>

      {/* Input file sembunyi tapi tetap bisa diakses screen reader / keyboard. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFile}
        aria-label="Pilih foto dari perangkat"
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 outline-none focus-visible:ring-4 focus-visible:ring-village-500/30"
      />
    </div>
  );
}

export function TombolHapusDokumentasi({
  programId,
  docId,
}: {
  programId: string;
  docId: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);

  async function hapus() {
    if (pending) return;
    if (!confirm("Hapus foto ini? File tidak bisa dikembalikan.")) return;

    setPending(true);
    try {
      const res = await fetch(`/api/pembangunan/${programId}/dokumentasi?docId=${docId}`, {
        method: "DELETE",
      });
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        toast(payload?.error ?? "Gagal menghapus foto.", "error");
        return;
      }
      toast("Foto berhasil dihapus.", "success");
      router.refresh();
    } catch {
      toast("Tidak dapat terhubung ke server.", "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={hapus}
      disabled={pending}
      aria-label="Hapus foto ini"
      title="Hapus dokumentasi"
      className="absolute right-2 top-2 rounded-lg bg-white/80 p-2 text-rose-600 opacity-0 shadow-sm backdrop-blur-sm transition focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-50"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <AlertCircle className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}