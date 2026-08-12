"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/lib/auth";
import { useNav } from "@/lib/nav";
import { useTranslations } from "@/lib/i18n";
import { useI18nStore, SUPPORTED_LANGUAGES } from "@/lib/i18n";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Lock, User, Phone, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { t } = useTranslations();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const navigate = useNav((s) => s.navigate);
  const goHome = useNav((s) => s.goHome);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const demoAccounts = [
    { label: "Citizen — Priya", email: "priya@example.com" },
    { label: "Officer — Karan (PWD)", email: "karan.officer@example.com" },
    { label: "Officer — Lakshmi (Water)", email: "lakshmi.officer@example.com" },
    { label: "Admin — Aditya", email: "aditya.admin@example.com" },
  ];

  async function onSubmit(values: LoginValues) {
    setServerError(null);
    const res = await login(values.email, values.password);
    if (!res.ok) {
      setServerError(res.error ?? t("auth.invalidCredentials"));
      return;
    }
    // Re-read the freshly-set user from the store to route correctly.
    const user = useAuthStore.getState().user;
    toast.success(t("toast.welcome", { name: user?.name?.split(" ")[0] ?? "" }));
    goHome(user?.role ?? null);
  }

  function fillDemo(email: string) {
    setValue("email", email);
    setValue("password", "demo1234");
  }

  return (
    <Card className="w-full border-border/70 shadow-xl shadow-primary/5">
      <CardHeader className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="size-4" aria-hidden />
          </span>
          <CardTitle className="text-xl">{t("auth.loginTitle")}</CardTitle>
        </div>
        <CardDescription>{t("auth.loginSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {serverError ? (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="email">{t("auth.emailLabel")}</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder={t("auth.emailPlaceholder")}
                className={cn("pl-9", errors.email && "border-destructive focus-visible:ring-destructive")}
                {...register("email")}
              />
            </div>
            {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">{t("auth.passwordLabel")}</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder={t("auth.passwordPlaceholder")}
                className={cn("pl-9", errors.password && "border-destructive focus-visible:ring-destructive")}
                {...register("password")}
              />
            </div>
            {errors.password ? <p className="text-xs text-destructive">{errors.password.message}</p> : null}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? t("auth.loggingIn") : t("auth.loginSubmit")}
            {!isLoading ? <ArrowRight className="ml-1 size-4" aria-hidden /> : null}
          </Button>
        </form>

        <div className="mt-5 rounded-xl border border-dashed border-border bg-muted/40 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">{t("auth.demoAccounts")}</p>
          <div className="flex flex-col gap-1.5">
            {demoAccounts.map((d) => (
              <button
                key={d.email}
                type="button"
                onClick={() => fillDemo(d.email)}
                className="flex items-center justify-between rounded-lg border border-border/60 bg-card px-3 py-1.5 text-left text-xs transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <span className="font-medium text-foreground">{d.label}</span>
                <span className="text-muted-foreground">{d.email}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">Any password works in demo mode.</p>
        </div>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {t("auth.noAccount")}{" "}
          <button onClick={() => navigate("register")} className="font-medium text-primary hover:underline">
            {t("auth.signUpLink")}
          </button>
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

const registerSchema = z.object({
  name: z.string().min(2, "Enter your full name"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional(),
  password: z.string().min(6, "At least 6 characters"),
  role: z.enum(["citizen", "officer"]),
  preferred_language: z.enum(["en", "hi", "mr", "ta"]),
});
type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const { t } = useTranslations();
  const locale = useI18nStore((s) => s.locale);
  const registerUser = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);
  const navigate = useNav((s) => s.navigate);
  const goHome = useNav((s) => s.goHome);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", phone: "", password: "", role: "citizen", preferred_language: locale },
  });

  const role = useWatch({ control, name: "role" });

  async function onSubmit(values: RegisterValues) {
    setServerError(null);
    setFieldErrors({});
    const res = await registerUser(values);
    if (!res.ok) {
      setServerError(res.error ?? t("errors.generic"));
      if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      return;
    }
    const user = useAuthStore.getState().user;
    toast.success(t("toast.welcome", { name: user?.name?.split(" ")[0] ?? "" }));
    goHome(user?.role ?? null);
  }

  return (
    <Card className="w-full border-border/70 shadow-xl shadow-primary/5">
      <CardHeader className="space-y-1.5">
        <CardTitle className="text-xl">{t("auth.registerTitle")}</CardTitle>
        <CardDescription>{t("auth.registerSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {serverError ? (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          ) : null}

          {/* Role selection */}
          <div className="space-y-1.5">
            <Label>{t("auth.roleLabel")}</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["citizen", "officer"] as const).map((r) => {
                const active = role === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setValue("role", r, { shouldValidate: true })}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-all",
                      active
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border bg-card hover:border-primary/40"
                    )}
                    aria-pressed={active}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{t(`auth.role${r === "citizen" ? "Citizen" : "Officer"}`)}</span>
                      <span
                        className={cn(
                          "size-4 rounded-full border-2",
                          active ? "border-primary bg-primary" : "border-muted-foreground/40"
                        )}
                        aria-hidden
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t(`auth.role${r === "citizen" ? "Citizen" : "Officer"}Desc`)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">{t("auth.nameLabel")}</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  id="name"
                  placeholder={t("auth.namePlaceholder")}
                  className={cn("pl-9", (errors.name || fieldErrors.name) && "border-destructive")}
                  {...register("name")}
                />
              </div>
              {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">
                {t("auth.phoneLabel")}{" "}
                <span className="text-xs font-normal text-muted-foreground">({t("common.optional")})</span>
              </Label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input id="phone" placeholder={t("auth.phonePlaceholder")} className="pl-9" {...register("phone")} />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reg-email">{t("auth.emailLabel")}</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                id="reg-email"
                type="email"
                autoComplete="email"
                placeholder={t("auth.emailPlaceholder")}
                className={cn("pl-9", (errors.email || fieldErrors.email) && "border-destructive")}
                {...register("email")}
              />
            </div>
            {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
            {fieldErrors.email ? <p className="text-xs text-destructive">{fieldErrors.email}</p> : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="reg-password">{t("auth.passwordLabel")}</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  id="reg-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder={t("auth.passwordPlaceholder")}
                  className={cn("pl-9", errors.password && "border-destructive")}
                  {...register("password")}
                />
              </div>
              {errors.password ? <p className="text-xs text-destructive">{errors.password.message}</p> : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lang">{t("auth.languageLabel")}</Label>
              <Select
                defaultValue={locale}
                onValueChange={(v) => setValue("preferred_language", v as RegisterValues["preferred_language"])}
              >
                <SelectTrigger id="lang" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <SelectItem key={l.code} value={l.code}>
                      {l.nativeLabel} — {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? t("common.submitting") : t("auth.registerSubmit")}
            {!isLoading ? <ArrowRight className="ml-1 size-4" aria-hidden /> : null}
          </Button>

          <p className="text-center text-xs text-muted-foreground">{t("auth.adminNote")}</p>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {t("auth.haveAccount")}{" "}
          <button onClick={() => navigate("login")} className="font-medium text-primary hover:underline">
            {t("auth.signInLink")}
          </button>
        </p>
      </CardContent>
    </Card>
  );
}
