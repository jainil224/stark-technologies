"use client";

import { useTranslations } from "@/lib/i18n";
import { formatDateTime } from "@/lib/format";
import { statusConfig } from "@/lib/format";
import type { StatusHistoryEntry, ComplaintStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// StatusTimeline
//
// A vertical timeline built from a complaint's `status_history`. Entries are
// sorted oldest → newest. The latest entry is highlighted. Each entry shows
// the status dot/label, the actor's note, the actor's name + role, and the
// timestamp.
// ---------------------------------------------------------------------------
export function StatusTimeline({
  history,
  currentStatus,
}: {
  history: StatusHistoryEntry[];
  currentStatus: ComplaintStatus;
}) {
  const { t, locale } = useTranslations();
  if (!history.length) return null;

  // Sort oldest → newest by created_at (defensive — mock already in order).
  const sorted = [...history].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <ol className="relative" aria-label={t("complaint.detailTimeline")}>
      {/* Vertical connecting line */}
      <span
        className="absolute left-[7px] top-2 bottom-2 w-px bg-border"
        aria-hidden
      />
      {sorted.map((entry, idx) => {
        const isLatest = idx === sorted.length - 1;
        const cfg = statusConfig[entry.status];
        return (
          <li
            key={entry.id}
            className={cn(
              "relative pl-7 pb-6 last:pb-0",
              isLatest && "pr-0"
            )}
          >
            {/* Dot */}
            <span
              className={cn(
                "absolute left-0 top-1.5 flex size-3.5 items-center justify-center rounded-full ring-4 ring-background",
                cfg.label,
                isLatest && "size-4 ring-4 ring-background ring-offset-2 ring-offset-primary/20"
              )}
              aria-hidden
            >
              {isLatest ? (
                <span className="size-1.5 rounded-full bg-white" />
              ) : null}
            </span>

            <div
              className={cn(
                "rounded-xl border bg-card p-3.5 transition-colors",
                isLatest
                  ? "border-primary/40 bg-primary/5 shadow-sm"
                  : "border-border"
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
                      cfg.badge
                    )}
                  >
                    <span className={cn("size-1.5 rounded-full", cfg.dot)} aria-hidden />
                    {t(`status.${entry.status}`)}
                  </span>
                </div>
                <time
                  className="text-xs text-muted-foreground"
                  dateTime={entry.created_at}
                >
                  {formatDateTime(entry.created_at, locale)}
                </time>
              </div>

              {entry.note ? (
                <p className="mt-2 text-sm text-foreground/90">{entry.note}</p>
              ) : null}

              <p className="mt-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground/70">{entry.actor_name}</span>
                <span className="mx-1.5 text-muted-foreground/60">·</span>
                <span className="capitalize">{entry.actor_role}</span>
                {entry.status === currentStatus ? (
                  <>
                    <span className="mx-1.5 text-muted-foreground/60">·</span>
                    <span className="italic">{t("statusDesc." + entry.status)}</span>
                  </>
                ) : null}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
