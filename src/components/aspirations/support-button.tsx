"use client";

import { useState } from "react";
import { AlertCircle, Check, Loader2, ThumbsUp } from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface SupportButtonProps {
  aspirationId: string;
  /** Jumlah dukungan awal dari server. */
  initialCount: number;
  /** Apakah pengguna aktif sudah mendukung. */
  initiallySupported: boolean;
  /** Pemilik aspirasi tidak boleh mendukung miliknya sendiri. */
  isOwner: boolean;
}

/**
 * Tombol dukungan aspirasi dengan state optimistik.
 *
 * UI diperbarui seketika saat diklik, lalu dikembalikan (rollback) bila server
 * menolak. Nilai akhir selalu disinkronkan dengan respons server sehingga
 * jumlah dukungan tidak pernah "melayang" dari kondisi database.
 */
export function SupportButton({
  aspirationId,
  initialCount,
  initiallySupported,
  isOwner,
}: SupportButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [supported, setSupported] = useState(initiallySupported);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { toast } = useToast();

  async function toggle() {
    if (isOwner || pending) return;
    setPending(true);

    // Simpan nilai sebelumnya untuk rollback.
    const prevCount = count;
    const prevSupported = supported;

    // 1. Optimistic update.
    const nextSupported = !supported;
    setSupported(nextSupported);
    setCount((c) => c + (nextSupported ? 1 : -1));
    setError(null);

    try {
      const res = await fetch(`/api/aspirasi/${aspirationId}/dukungan`, {
        method: nextSupported ? "POST" : "DELETE",
      });
      const payload = (await res.json()) as {
        dukungan?: number;
        didukung?: boolean;
        error?: string;
      };

      if (!res.ok) {
        // 2. Rollback bila gagal + beri umpan balik lewat toast.
        setSupported(prevSupported);
        setCount(prevCount);
        const message = payload.error ?? "Gagal memproses dukungan.";
        setError(message);
        toast(message, "error");
        return;
      }

      // 3. Sinkronkan dengan nilai otoritatif dari server.
      if (typeof payload.dukungan === "number") setCount(payload.dukungan);
      if (typeof payload.didukung === "boolean") setSupported(payload.didukung);
      toast(nextSupported ? "Dukungan Anda tercatat." : "Dukungan dibatalkan.", "success");
    } catch {
      // 2b. Kegagalan jaringan juga memicu rollback.
      setSupported(prevSupported);
      setCount(prevCount);
      setError("Tidak dapat terhubung ke server.");
      toast("Tidak dapat terhubung ke server.", "error");
    } finally {
      setPending(false);
    }
  }

  const disabled = isOwner || pending;

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-pressed={supported}
        aria-label={
          isOwner
            ? "Anda tidak dapat mendukung aspirasi milik sendiri"
            : supported
              ? `Batalkan dukungan, saat ini ${count} dukungan`
              : `Dukung aspirasi ini, saat ini ${count} dukungan`
        }
        title={isOwner ? "Aspirasi milik Anda" : undefined}
        className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-village-600 disabled:cursor-not-allowed disabled:opacity-60 ${
          supported
            ? "border-village-600 bg-village-600 text-white"
            : "border-slate-200 bg-white text-slate-700 hover:border-village-300 hover:text-village-700"
        }`}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : supported ? (
          <Check className="h-4 w-4" aria-hidden="true" />
        ) : (
          <ThumbsUp className="h-4 w-4" aria-hidden="true" />
        )}
        <span>{supported ? "Didukung" : "Dukung"}</span>
        <span
          className={`rounded-full px-1.5 py-0.5 text-xs ${
            supported ? "bg-white/20" : "bg-slate-100 text-slate-600"
          }`}
        >
          {count}
        </span>
      </button>

      {error ? (
        <p className="flex items-center gap-1.5 text-xs font-medium text-rose-600" role="alert">
          <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  );
}