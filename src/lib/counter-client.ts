"use client";

import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured } from "./supabase/env";
import type { UserRole } from "./types";

export interface WargaCounterState {
  aspirasiAktif: number;
  suratDiproses: number;
  suratDitolak: number;
  perluPerhatian: number;
}

export interface AdminCounterState {
  aspirasiMenunggu: number;
  aspirasiPrioritas: number;
  suratMasuk: number;
  totalWarga: number;
  perluPerhatian: number;
}

interface CounterResponse {
  data?: Record<string, number | string> | null;
  error?: string;
  configured?: boolean;
}

/**
 * Ambil counter badge status aktif dari /api/counter.
 * Counter tidak pernah dihitung di klien — server yang menentukan angkanya
 * berdasarkan sesi, sehingga badge mencerminkan data milik pengguna sendiri.
 */
export function useCounters() {
  const [warga, setWarga] = useState<WargaCounterState | null>(null);
  const [admin, setAdmin] = useState<AdminCounterState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/counter", { cache: "no-store" });
      if (res.status === 401) {
        setWarga(null);
        setAdmin(null);
        return;
      }
      const payload = (await res.json()) as CounterResponse;
      if (!res.ok || !payload.data) {
        setError(payload.error ?? "Gagal memuat counter.");
        return;
      }

      const d = payload.data;
      if (d.role === "admin") {
        setAdmin({
          aspirasiMenunggu: Number(d.aspirasiMenunggu ?? 0),
          aspirasiPrioritas: Number(d.aspirasiPrioritas ?? 0),
          suratMasuk: Number(d.suratMasuk ?? 0),
          totalWarga: Number(d.totalWarga ?? 0),
          perluPerhatian: Number(d.perluPerhatian ?? 0),
        });
      } else {
        setWarga({
          aspirasiAktif: Number(d.aspirasiAktif ?? 0),
          suratDiproses: Number(d.suratDiproses ?? 0),
          suratDitolak: Number(d.suratDitolak ?? 0),
          perluPerhatian: Number(d.perluPerhatian ?? 0),
        });
      }
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    // Segarkan saat tab kembali aktif, agar badge tetap relevan.
    function onVisible() {
      if (document.visibilityState === "visible") void refresh();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  /** Jumlah badge untuk sebuah tujuan navigasi, berdasarkan role. */
  const badgeFor = useCallback(
    (href: string, role: UserRole): number => {
      if (role === "admin") {
        if (href === "/admin/aspirasi") return admin?.aspirasiMenunggu ?? 0;
        if (href === "/admin/surat") return admin?.suratMasuk ?? 0;
        if (href === "/admin/warga") return admin?.totalWarga ?? 0;
        return 0;
      }
      if (href === "/aspirasi") return warga?.aspirasiAktif ?? 0;
      if (href === "/pelayanan") return warga?.perluPerhatian ?? 0;
      return 0;
    },
    [warga, admin],
  );

  return { warga, admin, loading, error, refresh, badgeFor };
}