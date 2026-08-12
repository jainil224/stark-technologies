"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, GitBranch, Info, Users } from "lucide-react";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useTranslations } from "@/lib/i18n";
import type { ComplaintStatus } from "@/lib/types";
import { StatusBadge } from "@/components/shared/badges";

// ---------------------------------------------------------------------------
// Shared duplicate-cluster callout + dialog used by both citizen
// complaint-detail and officer officer-detail. Replaces the previous static
// amber info card with an interactive card that opens a Dialog showing the
// cluster size + a placeholder list of related complaint references.
//
// The mock API has no "list duplicates" endpoint, so the dialog simulates the
// cluster by deriving `count - 1` fake reference numbers from the current
// complaint's reference_number (incrementing the trailing digits) and giving
// each a cycled placeholder status. In production the related complaints would
// come from the API.
// ---------------------------------------------------------------------------

// Cycled to give the placeholder list a realistic mix of statuses.
const PLACEHOLDER_STATUSES: ComplaintStatus[] = [
  "submitted",
  "under_review",
  "in_progress",
  "resolved",
  "under_review",
  "in_progress",
];

// Cap on how many placeholder rows we render so very large clusters don't
// produce an unbounded list. Demo data has count=4 → 3 rows, well under cap.
const MAX_PLACEHOLDER_ROWS = 8;

// Parse the trailing digits of a reference number ("GRP-2025-001234") and
// produce `count` fake refs by incrementing those digits, preserving the
// zero-pad width ("GRP-2025-001235", "GRP-2025-001236", ...). Falls back to
// appending `-1`, `-2`, ... if the reference has no trailing digits.
function makeFakeRefs(referenceNumber: string, count: number): string[] {
  const match = referenceNumber.match(/^(.*?)(\d+)$/);
  const refs: string[] = [];
  if (!match) {
    for (let i = 1; i <= count; i++) refs.push(`${referenceNumber}-${i}`);
    return refs;
  }
  const [, prefix, digitsStr] = match;
  const start = parseInt(digitsStr, 10);
  const padLen = digitsStr.length;
  for (let i = 1; i <= count; i++) {
    refs.push(`${prefix}${String(start + i).padStart(padLen, "0")}`);
  }
  return refs;
}

export function DuplicateClusterCallout({
  count,
  referenceNumber,
}: {
  count: number;
  referenceNumber: string;
}) {
  const { t } = useTranslations();
  const [open, setOpen] = useState(false);

  // Number of OTHER complaints in the cluster (current one excluded).
  const others = Math.max(0, count - 1);
  const displayed = Math.min(others, MAX_PLACEHOLDER_ROWS);
  const refs = makeFakeRefs(referenceNumber, displayed);
  const hidden = Math.max(0, others - displayed);

  return (
    <>
      <Card className="border-amber-300/60 bg-amber-50/50 transition-colors hover:bg-amber-100/60 dark:border-amber-900/60 dark:bg-amber-950/20 dark:hover:bg-amber-950/30">
        <CardContent className="py-5">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={t("officer.detailViewCluster")}
            className="flex w-full items-center gap-3 rounded-md text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Users className="size-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">
                {t("complaint.detailDuplicates", { count })}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {t("officer.detailDuplicatesDesc", { count })}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
              {t("officer.detailViewCluster")}
              <ChevronRight className="size-3.5" aria-hidden />
            </span>
          </button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users
                className="size-4 text-amber-600 dark:text-amber-400"
                aria-hidden
              />
              {t("officer.detailDuplicatesDialogTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("officer.detailDuplicatesDialogDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Prominent count summary */}
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
              <p className="text-3xl font-semibold tabular-nums text-amber-700 dark:text-amber-300">
                {count}
              </p>
              <p className="mt-1 text-sm text-amber-800/80 dark:text-amber-200/80">
                {t("complaint.detailDuplicates", { count })}
              </p>
            </div>

            {/* Placeholder list of related complaints */}
            {displayed > 0 ? (
              <ul
                className="max-h-72 space-y-2 overflow-y-auto pr-1"
                aria-label={t("officer.detailDuplicatesDialogTitle")}
              >
                {refs.map((ref, idx) => {
                  const status =
                    PLACEHOLDER_STATUSES[idx % PLACEHOLDER_STATUSES.length];
                  return (
                    <motion.li
                      key={ref}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, delay: idx * 0.04 }}
                      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <GitBranch className="size-3.5" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs text-muted-foreground">
                          {ref}
                        </p>
                        <p className="truncate text-sm font-medium text-foreground">
                          {t("officer.detailSimilarComplaint")}
                        </p>
                      </div>
                      <StatusBadge status={status} />
                    </motion.li>
                  );
                })}
              </ul>
            ) : null}

            {hidden > 0 ? (
              <p className="text-center text-xs text-muted-foreground">
                {t("officer.detailDuplicatesMore", { count: hidden })}
              </p>
            ) : null}

            <p className="flex items-start gap-1.5 text-[11px] italic text-muted-foreground">
              <Info className="mt-0.5 size-3 shrink-0" aria-hidden />
              {t("officer.detailDuplicatesDialogNote")}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
