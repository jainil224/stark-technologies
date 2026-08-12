"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CheckCircle2, ListChecks, FilePlus2, Loader2, Hash } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { useTranslations } from "@/lib/i18n";
import { useNav } from "@/lib/nav";
import { complaintsApi } from "@/lib/api";

// ---------------------------------------------------------------------------
// SubmittedConfirmation — default export
//
// Reads `lastSubmittedId` from the nav store. If present, fetches the freshly
// created complaint so we can display its reference number. Otherwise we
// show a generic confirmation and route back to the list.
// ---------------------------------------------------------------------------
export default function SubmittedConfirmation() {
  const { t } = useTranslations();
  const navigate = useNav((s) => s.navigate);
  const lastSubmittedId = useNav((s) => s.lastSubmittedId);

  const { data, isLoading } = useQuery({
    queryKey: ["complaints", lastSubmittedId ?? "none"],
    queryFn: async () => {
      if (!lastSubmittedId) return null;
      const { data, error } = await complaintsApi.getById(lastSubmittedId);
      if (error || !data) return null;
      return data;
    },
    enabled: !!lastSubmittedId,
    // Re-fetch once shortly after mount so AI classification fields populate.
    refetchInterval: (query) => (query.state.data?.ai_category ? false : 4000),
  });

  // Safety net: if there's nothing to confirm, bounce to the list view.
  useEffect(() => {
    if (!lastSubmittedId) {
      navigate("complaint_list");
    }
  }, [lastSubmittedId, navigate]);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center justify-center py-10">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.32, ease: "easeOut" }}
        className="w-full"
      >
        <Card className="overflow-hidden border-border/70 shadow-xl shadow-primary/10">
          {/* Confetti-ish celebratory header */}
          <div className="relative flex flex-col items-center gap-3 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent px-6 pt-10 pb-6 text-center">
            <Confetti />
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 14, delay: 0.15 }}
              className="flex size-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
            >
              <CheckCircle2 className="size-9" aria-hidden />
            </motion.div>

            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {t("complaint.submittedTitle")}
            </h1>
            <p className="mx-auto max-w-md text-sm text-muted-foreground text-balance">
              {t("complaint.submittedDesc")}
            </p>
          </div>

          <CardContent className="space-y-5 pt-2">
            {/* Reference number */}
            <div className="rounded-xl border border-border bg-muted/40 p-4 text-center">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("complaint.submittedReference")}
              </p>
              {isLoading && !data ? (
                <div className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {t("common.loading")}
                </div>
              ) : data ? (
                <p className="mt-1.5 flex items-center justify-center gap-1.5 font-mono text-lg font-semibold tracking-wide text-foreground">
                  <Hash className="size-4 text-primary" aria-hidden />
                  {data.reference_number}
                </p>
              ) : (
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {t("common.processing")}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button
                onClick={() => navigate("complaint_list")}
                className="gap-1.5"
              >
                <ListChecks className="size-4" aria-hidden />
                {t("complaint.viewMyComplaints")}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("complaint_new")}
                className="gap-1.5"
              >
                <FilePlus2 className="size-4" aria-hidden />
                {t("complaint.fileAnother")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tiny celebratory confetti rendered with framer-motion. Kept tasteful — a
// handful of soft emerald/saffron dots that drift upward and fade out.
// ---------------------------------------------------------------------------
function Confetti() {
  const dots = Array.from({ length: 14 });
  const colors = ["bg-primary", "bg-amber-500", "bg-emerald-500", "bg-teal-400"];
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      {dots.map((_, i) => {
        const left = (i * 7 + 6) % 100;
        const delay = (i % 7) * 0.08;
        const color = colors[i % colors.length];
        const sizePx = 6 + (i % 3) * 3;
        return (
          <motion.span
            key={i}
            className={`absolute rounded-full ${color}`}
            style={{
              left: `${left}%`,
              top: "40%",
              width: sizePx,
              height: sizePx,
            }}
            initial={{ y: 0, opacity: 0, scale: 0.4 }}
            animate={{
              y: [0, -60 - (i % 4) * 20, -120 - (i % 3) * 30],
              opacity: [0, 1, 0],
              scale: [0.4, 1, 0.6],
              x: [(i % 2 === 0 ? -1 : 1) * 6, (i % 2 === 0 ? 1 : -1) * 14, 0],
            }}
            transition={{ duration: 1.6, delay, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}
