"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusConfig, priorityConfig } from "@/lib/format";
import { useTranslations } from "@/lib/i18n";
import type { ComplaintStatus, Priority } from "@/lib/types";

export function StatusBadge({ status, className }: { status: ComplaintStatus; className?: string }) {
  const { t } = useTranslations();
  const cfg = statusConfig[status];
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 font-medium border", cfg.badge, className)}
    >
      <span className={cn("size-1.5 rounded-full", cfg.dot)} aria-hidden />
      {t(`status.${status}`)}
    </Badge>
  );
}

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  const { t } = useTranslations();
  const cfg = priorityConfig[priority];
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 font-medium border capitalize", cfg.badge, className)}
    >
      <span className={cn("size-1.5 rounded-full", cfg.dot)} aria-hidden />
      {t(`priority.${priority}`)}
    </Badge>
  );
}
