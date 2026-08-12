import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Locale } from "./types";
import { en } from "../messages/en";
import { hi } from "../messages/hi";
import { mr } from "../messages/mr";
import { ta } from "../messages/ta";

// ---------------------------------------------------------------------------
// Lightweight i18n modelled on the next-intl API (useTranslations → t()).
//
// We ship a single-route app, so we avoid locale-segment routing and instead
// drive locale through a persisted store + a React context. The `t()`
// function supports dot-path keys and {placeholder} interpolation, matching
// the spirit of next-intl so migrating to it later is a drop-in change.
// ---------------------------------------------------------------------------

export const SUPPORTED_LANGUAGES: { code: Locale; label: string; nativeLabel: string }[] = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "mr", label: "Marathi", nativeLabel: "मराठी" },
  { code: "ta", label: "Tamil", nativeLabel: "தமிழ்" },
];

export const messageBundles: Record<Locale, Record<string, unknown>> = {
  en,
  hi,
  mr,
  ta,
};

type I18nState = {
  locale: Locale;
  setLocale: (l: Locale) => void;
};

export const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      locale: "en",
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: "grievance-locale",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Resolve a dot-path key against a nested message bundle, with English
// fallback per FRONTEND.md Rule 5.
function resolve(bundle: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split(".");
  let cur: unknown = bundle;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return typeof cur === "string" ? cur : undefined;
}

export function translate(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  let value = resolve(messageBundles[locale], key) ?? resolve(en, key) ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      value = value.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return value;
}

// Hook used by components — reads the current locale from the store.
export function useTranslations() {
  const locale = useI18nStore((s) => s.locale);
  return {
    locale,
    t: (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars),
  };
}
