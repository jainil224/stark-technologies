"use client";

import { useEffect, useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster as SonnerToaster } from "sonner";
import { makeQueryClient } from "@/lib/query-client";
import { useAuthStore } from "@/lib/auth";
import { useI18nStore } from "@/lib/i18n";

// ---------------------------------------------------------------------------
// Root providers: TanStack Query, next-themes (light/dark), Sonner toasts,
// plus a one-shot session restore + locale sync on boot.
// ---------------------------------------------------------------------------

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient());
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const authUser = useAuthStore((s) => s.user);
  const locale = useI18nStore((s) => s.locale);
  const setLocale = useI18nStore((s) => s.setLocale);
  const setPreferredLanguage = useAuthStore((s) => s.setPreferredLanguage);

  // Restore session once on mount (silent refresh pattern, FRONTEND.md §5).
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // Keep the i18n locale in sync with the user's saved preference, and
  // persist preference changes back to the profile once logged in.
  useEffect(() => {
    if (authUser && authUser.preferred_language && authUser.preferred_language !== locale) {
      setLocale(authUser.preferred_language);
    }
  }, [authUser, locale, setLocale]);

  // When the user switches language while logged in, persist it.
  useEffect(() => {
    if (authUser && authUser.preferred_language !== locale) {
      void setPreferredLanguage(locale);
    }
  }, [locale, authUser, setPreferredLanguage]);

  // Reflect current locale on the <html> element for screen readers / fonts.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
        {children}
        <SonnerToaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast: "rounded-xl border shadow-lg",
            },
          }}
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
