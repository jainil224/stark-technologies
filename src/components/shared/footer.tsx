"use client";

import { useTranslations } from "@/lib/i18n";
import { Megaphone, Heart } from "lucide-react";

export function Footer() {
  const { t } = useTranslations();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border/70 bg-card/40">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 text-center sm:flex-row sm:px-6 sm:text-left">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex size-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Megaphone className="size-3.5" aria-hidden />
          </span>
          <span>{t("footer.rights", { year: String(year) })}</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            {t("footer.builtWith")} <Heart className="size-3 text-rose-500" aria-hidden />
          </span>
        </div>
      </div>
    </footer>
  );
}
