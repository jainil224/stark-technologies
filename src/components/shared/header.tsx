"use client";

import Link from "next/link";
import { useTranslations } from "@/lib/i18n";
import { useI18nStore } from "@/lib/i18n";
import { useNav, type View } from "@/lib/nav";
import { useAuthStore } from "@/lib/auth";
import { LanguageSwitcher } from "./language-switcher";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "./theme-toggle";
import {
  Megaphone,
  FilePlus2,
  ListChecks,
  ClipboardList,
  ShieldCheck,
  Building2,
  BarChart3,
  Users,
  LogOut,
  Menu,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";
import { useState } from "react";

interface NavItem {
  view: View;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

function navItemsForRole(role: string | undefined): NavItem[] {
  if (role === "citizen") {
    return [
      { view: "complaint_new", label: "fileComplaint", icon: FilePlus2 },
      { view: "complaint_list", label: "myComplaints", icon: ListChecks },
    ];
  }
  if (role === "officer") {
    return [{ view: "officer_queue", label: "officerQueue", icon: ClipboardList }];
  }
  if (role === "admin") {
    return [
      { view: "admin_departments", label: "departments", icon: Building2 },
      { view: "admin_analytics", label: "analytics", icon: BarChart3 },
      { view: "admin_users", label: "users", icon: Users },
    ];
  }
  return [];
}

export function Header() {
  const { t } = useTranslations();
  const locale = useI18nStore((s) => s.locale);
  const navigate = useNav((s) => s.navigate);
  const goHome = useNav((s) => s.goHome);
  const view = useNav((s) => s.view);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = navItemsForRole(user?.role);

  function handleNav(v: View) {
    navigate(v);
    setMobileOpen(false);
  }

  async function handleLogout() {
    await logout();
    navigate("landing");
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        {/* Brand */}
        <button
          onClick={() => goHome(user?.role ?? null)}
          className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t("app.name")}
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Megaphone className="size-5" aria-hidden />
          </span>
          <span className="hidden flex-col items-start leading-none sm:flex">
            <span className="text-base font-bold tracking-tight text-foreground">{t("app.name")}</span>
            <span className="text-[11px] text-muted-foreground">{t("app.tagline")}</span>
          </span>
        </button>

        {/* Desktop nav */}
        {items.length > 0 ? (
          <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Primary">
            {items.map((item) => {
              const active = view === item.view;
              return (
                <button
                  key={item.view}
                  onClick={() => handleNav(item.view)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="size-4" aria-hidden />
                  {t(`nav.${item.label}`)}
                </button>
              );
            })}
          </nav>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 rounded-full pl-1.5 pr-3">
                  <Avatar className="size-7 border border-border">
                    <AvatarFallback
                      className="text-xs font-semibold text-primary-foreground"
                      style={{ backgroundColor: user.avatar_color ?? "var(--primary)" }}
                    >
                      {initials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium sm:inline">{user.name.split(" ")[0]}</span>
                  <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold">{user.name}</span>
                  <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
                  <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium capitalize text-primary">
                    <ShieldCheck className="size-3" aria-hidden />
                    {user.role}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="gap-2 text-destructive focus:text-destructive">
                  <LogOut className="size-4" aria-hidden />
                  {t("nav.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="hidden rounded-full sm:inline-flex"
                onClick={() => navigate("login")}
              >
                {t("nav.login")}
              </Button>
              <Button size="sm" className="rounded-full" onClick={() => navigate("register")}>
                {t("nav.register")}
              </Button>
            </>
          )}

          {/* Mobile menu */}
          {items.length > 0 ? (
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden rounded-full" aria-label="Open menu">
                  <Menu className="size-5" aria-hidden />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Megaphone className="size-4 text-primary" aria-hidden />
                    {t("nav.dashboard")}
                  </SheetTitle>
                </SheetHeader>
                <nav className="mt-4 flex flex-col gap-1" aria-label="Mobile">
                  {items.map((item) => (
                    <button
                      key={item.view}
                      onClick={() => handleNav(item.view)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                        view === item.view
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-accent"
                      )}
                    >
                      <item.icon className="size-4" aria-hidden />
                      {t(`nav.${item.label}`)}
                    </button>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          ) : null}
        </div>
      </div>
    </header>
  );
}
