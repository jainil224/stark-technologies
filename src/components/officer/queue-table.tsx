"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Search,
  Inbox,
  Building2,
  Flame,
  CircleDot,
  ListChecks,
  ChevronRight,
  Sparkles,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

import { useTranslations } from "@/lib/i18n";
import { useNav } from "@/lib/nav";
import { useAuthStore } from "@/lib/auth";
import { officerApi } from "@/lib/api";
import {
  formatRelative,
  priorityConfig,
  priorityOrder,
  statusOrder,
} from "@/lib/format";
import type { Complaint, ComplaintStatus, Priority } from "@/lib/types";
import { StatusBadge, PriorityBadge } from "@/components/shared/badges";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// OfficerQueue — default export
//
// The officer dashboard queue view. Polls the department-scoped queue every
// 20s. Status & priority filters go through the API (the mock enforces dept
// scope server-side); the free-text search is applied client-side over
// title / reference / citizen name. Rows are sorted urgent-first then
// newest. Desktop renders a real <table>; mobile collapses to stacked cards.
// ---------------------------------------------------------------------------

type StatusFilter = "all" | ComplaintStatus;
type PriorityFilter = "all" | Priority;

const OPEN_STATUSES: ComplaintStatus[] = [
  "submitted",
  "under_review",
  "in_progress",
  "reopened",
];

export default function OfficerQueue() {
  const { t, locale } = useTranslations();
  const navigate = useNav((s) => s.navigate);
  const officer = useAuthStore((s) => s.user);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [search, setSearch] = useState("");

  const apiFilters = {
    status: statusFilter === "all" ? undefined : statusFilter,
    priority: priorityFilter === "all" ? undefined : priorityFilter,
  };

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["officer", "queue", apiFilters],
    queryFn: async () => {
      const { data, error } = await officerApi.listQueue(apiFilters);
      if (error || !data) throw error ?? new Error("Failed to load");
      return data;
    },
    refetchInterval: 20000,
  });

  // Apply client-side search + sort.
  const items = useMemo<Complaint[]>(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    let list = q
      ? data.filter((c) => {
          const hay = `${c.title} ${c.reference_number} ${c.citizen_name}`.toLowerCase();
          return hay.includes(q);
        })
      : [...data];
    list = list.sort((a, b) => {
      const pa = priorityConfig[a.priority].weight;
      const pb = priorityConfig[b.priority].weight;
      if (pb !== pa) return pb - pa;
      return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
    });
    return list;
  }, [data, search]);

  // Summary chips computed on the API-returned list (post status/priority
  // filter, pre-search) so the totals stay stable while the officer types.
  const summary = useMemo(() => {
    const list = data ?? [];
    return {
      total: list.length,
      urgent: list.filter((c) => c.priority === "urgent").length,
      open: list.filter((c) => OPEN_STATUSES.includes(c.status)).length,
    };
  }, [data]);

  // Department label — prefer department_name on the first complaint
  // (carried by the API), fall back to the user's stored department id,
  // finally a generic label so we never render empty.
  const departmentLabel =
    data?.[0]?.department_name ??
    (officer?.department_id
      ? t("nav.dashboard")
      : t("nav.officerQueue"));

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6">
      {/* Header ------------------------------------------------------------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {t("officer.queueTitle")}
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              <Building2 className="size-3" aria-hidden />
              {departmentLabel}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{t("officer.queueSubtitle")}</p>
        </div>
      </div>

      {/* Summary chips ------------------------------------------------------ */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryChip
          icon={ListChecks}
          label={t("officer.queueTitle")}
          value={summary.total}
          tone="default"
        />
        <SummaryChip
          icon={Flame}
          label={t("priority.urgent")}
          value={summary.urgent}
          tone="urgent"
        />
        <SummaryChip
          icon={CircleDot}
          label={t("admin.openComplaints")}
          value={summary.open}
          tone="open"
        />
      </div>

      {/* Filter bar --------------------------------------------------------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="space-y-1.5 sm:w-48">
          <Label htmlFor="officer-status-filter" className="text-xs text-muted-foreground">
            {t("officer.filterStatus")}
          </Label>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger id="officer-status-filter" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              {statusOrder.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`status.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 sm:w-44">
          <Label htmlFor="officer-priority-filter" className="text-xs text-muted-foreground">
            {t("officer.filterPriority")}
          </Label>
          <Select
            value={priorityFilter}
            onValueChange={(v) => setPriorityFilter(v as PriorityFilter)}
          >
            <SelectTrigger id="officer-priority-filter" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              {priorityOrder.map((p) => (
                <SelectItem key={p} value={p}>
                  {t(`priority.${p}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 space-y-1.5">
          <Label htmlFor="officer-search-input" className="text-xs text-muted-foreground">
            {t("common.search")}
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id="officer-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("officer.searchPlaceholder")}
              className="pl-9"
              type="search"
            />
          </div>
        </div>
      </div>

      {/* Body --------------------------------------------------------------- */}
      {isLoading ? (
        <QueueSkeleton />
      ) : isError ? (
        <ErrorState
          message={(error as Error)?.message ?? t("errors.generic")}
          onRetry={() => void refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={t("officer.emptyTitle")}
          description={t("officer.emptyDesc")}
        />
      ) : (
        <>
          {/* Desktop: table -------------------------------------------------- */}
          <Card className="hidden py-0 md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="pl-4">{t("officer.colReference")}</TableHead>
                  <TableHead className="min-w-[16rem]">{t("officer.colTitle")}</TableHead>
                  <TableHead>{t("officer.colPriority")}</TableHead>
                  <TableHead>{t("officer.colStatus")}</TableHead>
                  <TableHead>{t("officer.colAi")}</TableHead>
                  <TableHead className="pr-4 text-right">{t("officer.colSubmitted")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((c, idx) => (
                  <QueueRow
                    key={c.id}
                    complaint={c}
                    locale={locale}
                    t={t}
                    onClick={() => navigate("officer_detail", { complaintId: c.id })}
                    index={idx}
                  />
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile: stacked cards ------------------------------------------- */}
          <ul className="space-y-3 md:hidden" aria-label={t("officer.queueTitle")}>
            {items.map((c, idx) => (
              <QueueCard
                key={c.id}
                complaint={c}
                locale={locale}
                t={t}
                onClick={() => navigate("officer_detail", { complaintId: c.id })}
                index={idx}
              />
            ))}
          </ul>

          {/* Live-polling hint */}
          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" aria-hidden />
            {t("common.processing")}
          </p>
        </>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

type RowProps = {
  complaint: Complaint;
  locale: ReturnType<typeof useTranslations>["locale"];
  t: ReturnType<typeof useTranslations>["t"];
  onClick: () => void;
  index: number;
};

function QueueRow({ complaint, locale, t, onClick, index }: RowProps) {
  const aiPending = !complaint.ai_category;
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, delay: Math.min(index * 0.02, 0.15) }}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`${complaint.reference_number}: ${complaint.title}`}
      className={cn(
        "group cursor-pointer outline-none transition-colors",
        "hover:bg-primary/5 focus-visible:bg-primary/5 focus-visible:ring-[3px] focus-visible:ring-ring/40"
      )}
    >
      <TableCell className="pl-4 py-3">
        <code className="font-mono text-xs text-muted-foreground">
          {complaint.reference_number}
        </code>
      </TableCell>
      <TableCell className="py-3">
        <div className="min-w-0">
          <p className="line-clamp-1 font-medium text-foreground group-hover:text-primary">
            {complaint.title}
          </p>
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {complaint.description}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("officer.citizenInfo")}: <span className="font-medium text-foreground/80">{complaint.citizen_name}</span>
          </p>
        </div>
      </TableCell>
      <TableCell className="py-3">
        <PriorityBadge priority={complaint.priority} />
      </TableCell>
      <TableCell className="py-3">
        <StatusBadge status={complaint.status} />
      </TableCell>
      <TableCell className="py-3">
        {aiPending ? (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" aria-hidden />
            {t("common.processing")}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-primary">
            <Sparkles className="size-3" aria-hidden />
            <span className="font-medium">{complaint.ai_category}</span>
          </span>
        )}
      </TableCell>
      <TableCell className="pr-4 py-3 text-right">
        <time
          dateTime={complaint.submitted_at}
          className="text-xs text-muted-foreground"
        >
          {formatRelative(complaint.submitted_at, locale)}
        </time>
        <ChevronRight
          className="ml-1 inline size-3.5 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </TableCell>
    </motion.tr>
  );
}

function QueueCard({ complaint, locale, t, onClick, index }: RowProps) {
  const aiPending = !complaint.ai_category;
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.2) }}
    >
      <Card
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
        className={cn(
          "group cursor-pointer py-4 outline-none transition-all",
          "hover:border-primary/40 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50"
        )}
        aria-label={`${complaint.reference_number}: ${complaint.title}`}
      >
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <code className="font-mono text-xs text-muted-foreground">
              {complaint.reference_number}
            </code>
            <time
              dateTime={complaint.submitted_at}
              className="text-xs text-muted-foreground"
            >
              {formatRelative(complaint.submitted_at, locale)}
            </time>
          </div>

          <h3 className="line-clamp-2 font-semibold text-foreground group-hover:text-primary">
            {complaint.title}
          </h3>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {complaint.description}
          </p>

          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={complaint.status} />
            <PriorityBadge priority={complaint.priority} />
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2.5 text-xs">
            <span className="truncate text-muted-foreground">
              {t("officer.citizenInfo")}:{" "}
              <span className="font-medium text-foreground/80">
                {complaint.citizen_name}
              </span>
            </span>
            {aiPending ? (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Loader2 className="size-3 animate-spin" aria-hidden />
                {t("common.processing")}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-primary">
                <Sparkles className="size-3" aria-hidden />
                <span className="truncate font-medium">{complaint.ai_category}</span>
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.li>
  );
}

function SummaryChip({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: "default" | "urgent" | "open";
}) {
  const toneClasses =
    tone === "urgent"
      ? "border-rose-200 bg-rose-50/60 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
      : tone === "open"
        ? "border-amber-200 bg-amber-50/60 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"
        : "border-border bg-card text-foreground";
  const iconTone =
    tone === "urgent"
      ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
      : tone === "open"
        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
        : "bg-primary/10 text-primary";
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border px-3.5 py-2.5",
        toneClasses
      )}
    >
      <span className={cn("flex size-8 items-center justify-center rounded-lg", iconTone)}>
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-lg font-semibold leading-none tabular-nums">{value}</p>
        <p className="mt-1 truncate text-[11px] uppercase tracking-wide opacity-80">
          {label}
        </p>
      </div>
    </div>
  );
}

function QueueSkeleton() {
  return (
    <Card className="py-0">
      <div className="divide-y divide-border">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5">
            <Skeleton className="h-3 w-24" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </Card>
  );
}
