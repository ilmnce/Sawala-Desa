"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "./supabase/client";
import { isSupabaseConfigured } from "./supabase/env";
import { mapUserRow } from "./user-mapper";
import type { AppUser } from "./types";

export type SessionStatus = "loading" | "authenticated" | "anonymous";

interface SessionState {
  status: SessionStatus;
  user: AppUser | null;
}

/**
 * State sesi auth untuk Client Components.
 *
 * Sumber kebenaran tetap cookie sesi Supabase yang dikelola middleware/server.
 * Hook ini membaca sesi di browser, mengambil profil dari tabel `users`, dan
 * mendengarkan perubahan auth (SIGNED_IN / SIGNED_OUT / TOKEN_REFRESHED) supaya
 * UI ikut ter-update tanpa reload penuh.
 */
export function useAuthSession(): SessionState {
  const router = useRouter();
  const [state, setState] = useState<SessionState>({
    status: isSupabaseConfigured() ? "loading" : "anonymous",
    user: null,
  });

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setState({ status: "anonymous", user: null });
      return;
    }

    const supabase = createClient();
    let active = true;

    async function loadProfile(userId: string) {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (!active) return;

      if (error || !data) {
        setState({ status: "anonymous", user: null });
        return;
      }

      const mapped = mapUserRow(data);
      if (!mapped.isActive) {
        await supabase.auth.signOut();
        if (active) setState({ status: "anonymous", user: null });
        return;
      }

      setState({ status: "authenticated", user: mapped });
    }

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!active) return;
        if (data.user) {
          void loadProfile(data.user.id);
        } else {
          setState({ status: "anonymous", user: null });
        }
      })
      .catch(() => {
        if (active) setState({ status: "anonymous", user: null });
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "SIGNED_OUT" || !session?.user) {
        setState({ status: "anonymous", user: null });
        return;
      }
      void loadProfile(session.user.id);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // Segarkan komponen server setelah status auth berubah.
  useEffect(() => {
    if (state.status !== "loading") router.refresh();
  }, [state.status, router]);

  return state;
}

/** Keluar dari sesi lalu arahkan ke halaman login. */
export async function signOutClient(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    await supabase.auth.signOut();
  }
}