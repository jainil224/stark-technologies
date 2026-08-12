"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User } from "./types";
import { authApi } from "./api";

// ---------------------------------------------------------------------------
// Auth store + useAuth hook (FRONTEND.md Section 5).
//
// Tokens: the access token lives in memory (this store). The mock backend
// also returns a refresh token; in a real deployment that would be set as an
// httpOnly cookie by the backend, so we deliberately do NOT persist it in
// localStorage here. We DO persist a "restore session" flag so that on reload
// we can call /api/auth/me (which would read the httpOnly refresh cookie in a
// real backend) to silently restore the user — matching the silent-refresh
// pattern in the spec.
// ---------------------------------------------------------------------------

type AuthState = {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;     // true while a session-restore attempt is in flight
  initialized: boolean;   // false until the first restore attempt completes
  _restore: boolean;      // persisted flag: should we try to restore on boot

  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (input: {
    name: string;
    email: string;
    password: string;
    role: "citizen" | "officer";
    phone?: string;
    preferred_language?: User["preferred_language"];
  }) => Promise<{ ok: boolean; error?: string; fieldErrors?: Record<string, string> }>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  setUser: (u: User | null) => void;
  setPreferredLanguage: (lang: User["preferred_language"]) => Promise<void>;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: false,
      initialized: false,
      _restore: false,

      login: async (email, password) => {
        set({ isLoading: true });
        const { data, error } = await authApi.login({ email, password });
        set({ isLoading: false });
        if (error || !data) {
          return { ok: false, error: error?.message ?? "Login failed" };
        }
        set({ user: data.user, accessToken: data.tokens.access_token, _restore: true });
        return { ok: true };
      },

      register: async (input) => {
        set({ isLoading: true });
        const { data, error } = await authApi.register(input);
        set({ isLoading: false });
        if (error || !data) {
          return { ok: false, error: error?.message, fieldErrors: error?.field_errors };
        }
        set({ user: data.user, accessToken: data.tokens.access_token, _restore: true });
        return { ok: true };
      },

      logout: async () => {
        await authApi.logout();
        set({ user: null, accessToken: null, _restore: false });
      },

      restoreSession: async () => {
        // Only attempt restore if a previous session opted in.
        if (!get()._restore) {
          set({ initialized: true });
          return;
        }
        set({ isLoading: true });
        const { data } = await authApi.me();
        if (data) {
          set({ user: data, accessToken: `mock_access_${data.id}`, isLoading: false, initialized: true });
        } else {
          set({ user: null, accessToken: null, isLoading: false, initialized: true, _restore: false });
        }
      },

      setUser: (user) => set({ user }),

      setPreferredLanguage: async (lang) => {
        const user = get().user;
        if (!user) return;
        set({ user: { ...user, preferred_language: lang } });
        await authApi.updateProfile({ preferred_language: lang });
      },
    }),
    {
      name: "grievance-auth",
      storage: createJSONStorage(() => localStorage),
      // Only persist the restore flag — never the token or user object.
      partialize: (s) => ({ _restore: s._restore }) as AuthState,
    }
  )
);

// Convenience hook alias matching the spec's naming.
export function useAuth() {
  return useAuthStore();
}
