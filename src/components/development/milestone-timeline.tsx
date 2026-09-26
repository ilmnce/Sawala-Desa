"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, Milestone, PencilLine, X } from "lucide-react";
import {
  PROGRAM_STATUSES,
  PROGRAM_STATUS_BADGE_STYLES,
  PROGRAM_STATUS_LABELS,
  progressTone,
  type ProgramStatus,
} from "@/lib/program-constants";
import type { ProgramMilestone } from "@/lib/data/programs";
import { formatTanggal } from "@/lib/format";

interface Props {
  programId: string;
  programNama: string;
  milestones: ProgramMilestone[];
  progressSekarang: number;
  statusSekarang: ProgramStatus;
}

/** Timeline riwayat milestone program. */
export function MilestoneTimeline({ milestones }: { milestones: ProgramMilestone[] }) {
  if (milestones.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-8 text-center text-sm text-slate-500">
        Belum ada catatan milestone. Riwayat akan muncul setiap kali progress atau status program
        diperbarui perangkat desa.
      </p>
    );
  }

  return (
    <ol className="relative space-y-6 border-l-2 border-slate-200 pl-6">
      {milestones.map((m) => (
        <li key={m.id} className="relative">
          <span
            className={`absolute -left-[1.9rem] grid h-6 w-6 place-items-center rounded-full ring-4 ring-white ${progressTone(m.progress)}`}
            aria-hidden="true"
          >
            <Milestone className="h-3.5 w-3.5 text-white" />
          </span>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-slate-900">{m.judul}</p>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${PROGRAM_STATUS_BADGE_STYLES[m.status]}`}
              >
                {PROGRAM_STATUS_LABELS[m.status]}
              </span>
            </div>
            {m.keterangan ? (
              <p className="mt-1.5 text-sm leading-6 text-slate-600">{m.keterangan}</p>
            ) : null}
            <p className="mt-2 text-xs text-slate-500">
              {formatTanggal(m.terjadiPada)} · progress {m.progress}%
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * Tombol + modal untuk admin memperbarui progress & status program.
 * Perubahan dicatat sebagai milestone oleh trigger database.
 */
export function UpdateProgressButton({
  programId,
  programNama,
  progressSekarang,
  statusSekarang,
}: Pick<Props, "programId" | "programNama" | "progressSekarang" | "statusSekarang">) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-village-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-village-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-village-600"
      >
        <PencilLine className="h-4 w-4" aria-hidden="true" />
        Update Progress
      </button>
      {open ? (
        <UpdateProgressModal
          programId={programId}
          programNama={programNama}
          progressSekarang={progressSekarang}
          statusSekarang={statusSekarang}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function UpdateProgressModal({
  programId,
  programNama,
  progressSekarang,
  statusSekarang,
  onClose,
}: Pick<Props, "programId" | "programNama" | "progressSekarang" | "statusSekarang"> & {
  onClose: () => void;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [progress, setProgress] = useState(progressSekarang);
  const [status, setStatus] = useState<ProgramStatus>(statusSekarang);
  const [judul, setJudul] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/pembangunan/${programId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          progress,
          status,
          judul_milestone: judul.trim() || undefined,
          keterangan_milestone: keterangan.trim() || undefined,
        }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;

      if (!res.ok) {
        setError(payload?.error ?? "Gagal memperbarui progress.");
        return;
      }

      setOk(true);
      router.refresh();
      onClose();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Tutup dialog"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="progress-modal-title"
        className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-7"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="absolute right-4 top-4 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-village-600"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <h2 id="progress-modal-title" className="pr-10 font-[var(--font-lora)] text-xl font-semibold text-slate-900">
          Update Progress Pembangunan
        </h2>
        <p className="mt-1 text-sm text-slate-500">{programNama}</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-5">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="progress" className="text-sm font-semibold text-slate-700">
                Progress (%)
              </label>
              <span className="text-xs font-semibold text-slate-600">{progress}%</span>
            </div>
            <input
              id="progress"
              name="progress"
              type="range"
              min={0}
              max={100}
              step={5}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-village-600"
            />
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${progressTone(progress)}`} style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div>
            <label htmlFor="status" className="mb-1.5 block text-sm font-semibold text-slate-700">
              Status Program
            </label>
            <select
              id="status"
              name="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ProgramStatus)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-village-500 focus:ring-4 focus:ring-village-500/10"
            >
              {PROGRAM_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PROGRAM_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="judul_milestone" className="mb-1.5 block text-sm font-semibold text-slate-700">
              Judul Milestone <span className="font-normal text-slate-400">(opsional)</span>
            </label>
            <input
              id="judul_milestone"
              name="judul_milestone"
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              placeholder="Contoh: Pengecoran jalan tahap 2 selesai"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-village-500 focus:ring-4 focus:ring-village-500/10"
            />
          </div>

          <div>
            <label htmlFor="keterangan_milestone" className="mb-1.5 block text-sm font-semibold text-slate-700">
              Keterangan <span className="font-normal text-slate-400">(opsional)</span>
            </label>
            <textarea
              id="keterangan_milestone"
              name="keterangan_milestone"
              rows={3}
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Catatan tambahan untuk warga mengenai tahapan ini."
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-village-500 focus:ring-4 focus:ring-village-500/10"
            />
          </div>

          {error ? (
            <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
          ) : null}

          {ok ? (
            <p role="status" className="flex items-start gap-2 rounded-xl border border-village-200 bg-village-50 px-4 py-3 text-sm text-village-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              Progress berhasil diperbarui.
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-village-600 px-5 py-3 font-semibold text-white transition hover:bg-village-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-village-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Progress"
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}