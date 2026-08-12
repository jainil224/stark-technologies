"use client";

import { useTranslations } from "@/lib/i18n";
import { useNav } from "@/lib/nav";
import { useAuthStore } from "@/lib/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  Megaphone,
  Mic,
  Languages,
  Activity,
  GitBranch,
  ArrowRight,
  FileText,
  Brain,
  ClipboardCheck,
  LineChart,
  ShieldCheck,
  Users,
  Building2,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Clock,
  type LucideIcon,
} from "lucide-react";

export function LandingPage() {
  const { t } = useTranslations();
  const navigate = useNav((s) => s.navigate);
  const goHome = useNav((s) => s.goHome);
  const login = useAuthStore((s) => s.login);

  async function demoLogin(email: string) {
    const res = await login(email, "demo1234");
    if (res.ok) {
      const user = useAuthStore.getState().user;
      toast.success(t("toast.welcome", { name: user?.name?.split(" ")[0] ?? "" }));
      goHome(user?.role ?? null);
    }
  }

  const steps: { icon: LucideIcon; title: string; desc: string }[] = [
    { icon: FileText, title: t("landing.step1Title"), desc: t("landing.step1Desc") },
    { icon: Brain, title: t("landing.step2Title"), desc: t("landing.step2Desc") },
    { icon: ClipboardCheck, title: t("landing.step3Title"), desc: t("landing.step3Desc") },
    { icon: Activity, title: t("landing.step4Title"), desc: t("landing.step4Desc") },
  ];

  const features: { icon: LucideIcon; title: string; desc: string }[] = [
    { icon: Mic, title: t("landing.feature1Title"), desc: t("landing.feature1Desc") },
    { icon: Languages, title: t("landing.feature2Title"), desc: t("landing.feature2Desc") },
    { icon: Activity, title: t("landing.feature3Title"), desc: t("landing.feature3Desc") },
    { icon: GitBranch, title: t("landing.feature4Title"), desc: t("landing.feature4Desc") },
  ];

  const stats = [
    { value: "2,840+", label: t("landing.statComplaints"), trend: "+12%", icon: CheckCircle2 },
    { value: "4", label: t("landing.statLanguages"), icon: Languages },
    { value: "12", label: t("landing.statDepartments"), icon: Building2 },
    { value: "7.4", label: t("landing.statAvgResolution"), trend: "-1.2d", icon: Clock },
  ];

  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
    }),
  };

  return (
    <div className="flex-1">
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Mesh gradient background — layered radial blooms for depth. */}
        <div className="absolute inset-0 bg-grid opacity-30" aria-hidden />
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(60rem 40rem at 50% -10%, color-mix(in oklch, var(--primary) 18%, transparent), transparent 60%)," +
              "radial-gradient(40rem 30rem at 90% 10%, color-mix(in oklch, #d97706 14%, transparent), transparent 55%)," +
              "radial-gradient(36rem 30rem at 5% 30%, color-mix(in oklch, var(--primary) 10%, transparent), transparent 60%)",
          }}
        />
        {/* Subtle topographic dot pattern overlay. */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          aria-hidden
          style={{
            backgroundImage:
              "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-16 sm:px-6 sm:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-medium text-primary shadow-sm"
            >
              <Sparkles className="size-3.5" aria-hidden />
              {t("landing.badge")}
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="mt-6 text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl"
            >
              {t("landing.heroTitle")}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12 }}
              className="mx-auto mt-5 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg"
            >
              {t("landing.heroSubtitle")}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <Button
                size="lg"
                className="w-full rounded-full shadow-lg shadow-primary/20 transition-transform active:scale-95 sm:w-auto"
                onClick={() => navigate("complaint_new")}
              >
                <Megaphone className="mr-1.5 size-4" aria-hidden />
                {t("landing.ctaFile")}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full rounded-full transition-transform active:scale-95 sm:w-auto"
                onClick={() => navigate("login")}
              >
                {t("landing.ctaLogin")}
                <ArrowRight className="ml-1.5 size-4" aria-hidden />
              </Button>
            </motion.div>
          </div>

          {/* Stats with trend indicators */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="mx-auto mt-20 grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-4"
          >
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                custom={i}
                variants={fadeUp}
                className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-5 text-center shadow-sm backdrop-blur transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-md"
              >
                <span className="absolute -right-6 -top-6 size-16 rounded-full bg-primary/5 transition-transform group-hover:scale-150" aria-hidden />
                <div className="relative">
                  <div className="mx-auto mb-2 flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <s.icon className="size-4" aria-hidden />
                  </div>
                  <div className="text-2xl font-bold tabular-nums text-foreground sm:text-3xl">{s.value}</div>
                  <div className="mt-1 text-xs text-muted-foreground sm:text-sm">{s.label}</div>
                  {s.trend ? (
                    <div
                      className={cn(
                        "mt-1.5 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                        s.trend.startsWith("-")
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                      )}
                    >
                      <TrendingUp className={cn("size-2.5", s.trend.startsWith("-") && "rotate-180")} aria-hidden />
                      {s.trend}
                    </div>
                  ) : null}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6" aria-labelledby="steps-title">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">{t("landing.stepsTitle")}</span>
          <h2 id="steps-title" className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{t("landing.stepsTitle")}</h2>
          <p className="mt-3 text-muted-foreground">{t("landing.stepsSubtitle")}</p>
        </div>
        <ol className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <motion.li
              key={s.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              custom={i}
              variants={fadeUp}
            >
              <Card className="group relative h-full overflow-hidden border-border/60 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg">
                <CardContent className="flex h-full flex-col gap-3 p-6">
                  <div className="flex items-center justify-between">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <s.icon className="size-5" aria-hidden />
                    </span>
                    <span className="text-4xl font-bold tabular-nums text-muted-foreground/15 transition-colors group-hover:text-primary/20">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                </CardContent>
              </Card>
            </motion.li>
          ))}
        </ol>
      </section>

      {/* Features */}
      <section className="border-y border-border/60 bg-card/40" aria-labelledby="features-title">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">{t("landing.featuresTitle")}</span>
            <h2 id="features-title" className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{t("landing.featuresTitle")}</h2>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                custom={i}
                variants={fadeUp}
                className="group flex gap-4 rounded-2xl border border-border/60 bg-background p-6 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <f.icon className="size-5" aria-hidden />
                </span>
                <div>
                  <h3 className="text-base font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo accounts */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6" aria-labelledby="demo-title">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-amber-500/5 p-8 shadow-sm sm:p-12"
        >
          <div className="absolute -right-20 -top-20 size-64 rounded-full bg-primary/8 blur-3xl" aria-hidden />
          <div className="absolute -bottom-20 -left-20 size-64 rounded-full bg-amber-400/8 blur-3xl" aria-hidden />

          <div className="relative mx-auto max-w-2xl text-center">
            <h2 id="demo-title" className="text-2xl font-bold tracking-tight sm:text-3xl">{t("landing.demoTitle")}</h2>
            <p className="mt-3 text-muted-foreground">{t("landing.demoSubtitle")}</p>
          </div>
          <div className="relative mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { role: t("landing.demoCitizen"), email: "priya@example.com", icon: Users, tint: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
              { role: t("landing.demoOfficer"), email: "karan.officer@example.com", icon: ShieldCheck, tint: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/40" },
              { role: t("landing.demoAdmin"), email: "daksh.admin@example.com", icon: Building2, tint: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/40" },
            ].map((d, i) => (
              <motion.button
                key={d.email}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                onClick={() => demoLogin(d.email)}
                className="group flex flex-col items-start gap-3 rounded-2xl border border-border/70 bg-card p-6 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl"
              >
                <span className={cn("flex size-12 items-center justify-center rounded-xl", d.bg, d.tint)}>
                  <d.icon className="size-6" aria-hidden />
                </span>
                <div>
                  <div className="text-sm font-semibold">{d.role}</div>
                  <div className="text-xs text-muted-foreground">{d.email}</div>
                </div>
                <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-all group-hover:opacity-100">
                  {t("common.confirm")}
                  <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </motion.button>
            ))}
          </div>
          <p className="relative mt-8 text-center text-xs text-muted-foreground">
            {t("app.poweredBy")} · {t("app.name")}
          </p>
        </motion.div>
      </section>
    </div>
  );
}
