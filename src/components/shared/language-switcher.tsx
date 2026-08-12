"use client";

import { useI18nStore, SUPPORTED_LANGUAGES } from "@/lib/i18n";
import { useAuthStore } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Check, Globe } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ align = "end" }: { align?: "start" | "end" }) {
  const locale = useI18nStore((s) => s.locale);
  const setLocale = useI18nStore((s) => s.setLocale);
  const user = useAuthStore((s) => s.user);
  const setPreferredLanguage = useAuthStore((s) => s.setPreferredLanguage);

  const current = SUPPORTED_LANGUAGES.find((l) => l.code === locale) ?? SUPPORTED_LANGUAGES[0];

  async function handleSelect(code: typeof locale) {
    setLocale(code);
    if (user) await setPreferredLanguage(code);
    const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code);
    toast.success("Language", { description: `Switched to ${lang?.nativeLabel}` });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 rounded-full border border-border/60 bg-card/50 px-3"
          aria-label="Change language"
        >
          <Globe className="size-4 text-primary" aria-hidden />
          <span className="text-sm font-medium">{current.nativeLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-48">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Language / भाषा / மொழி</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SUPPORTED_LANGUAGES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => handleSelect(l.code)}
            className={cn("flex items-center justify-between gap-2", locale === l.code && "bg-accent")}
          >
            <span className="flex flex-col">
              <span className="text-sm font-medium">{l.nativeLabel}</span>
              <span className="text-xs text-muted-foreground">{l.label}</span>
            </span>
            {locale === l.code ? <Check className="size-4 text-primary" aria-hidden /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
