"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Inbox,
  MapPin,
  Sparkles,
  ChevronRight,
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

import { useTranslations } from "@/lib/i18n";
import { useNav } from "@/lib/nav";
import { complaintsApi } from "@/lib/api";
import {
  formatRelative,
  priorityConfig,
  statusOrder,
} from "@/lib/format";
import type { Complaint, ComplaintStatus } from "@/lib/types";
import { StatusBadge, PriorityBadge } from "@/components/shared/badges";
import { EmptyState, ErrorState, CardSkeleton } from "@/components/shared/states";
import ComplaintStats from "./complaint-stats";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// ComplaintList — default export
//
// Lists the current citizen's complaints. Polls every 20s so newly-routed
// AI classification fields appear without a manual refresh.
// ---------------------------------------------------------------------------
export default function ComplaintList() {
  const { t, locale } = useTranslations();
  const navigate = useNav((s) => s.navigate);

  const [statusFilter, setStatusFilter] = useState<"all" | ComplaintStatus>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["complaints", "mine"],
    queryFn: async () => {
      const { data, error } = await complaintsApi.listMine();
      if (error || !data) throw error ?? new Error("Failed to load");
      return data;
    },
    refetchInterval: 20000,
  });

  // Filter + sort client-side.
  const items = useMemo<Complaint[]>(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    let list = data.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (q) {
        const hay = `${c.title} ${c.reference_number} ${c.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    list = list.sort((a, b) => {
      // Priority weight desc, then submitted_at desc.
      const pa = priorityConfig[a.priority].weight;
      const pb = priorityConfig[b.priority].weight;
      if (pb !== pa) return pb - pa;
      return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
    });
    return list;
  }, [data, statusFilter, search]);

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      {/* Header ------------------------------------------------------------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("complaint.listTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("complaint.listSubtitle")}</p>
        </div>
        <Button onClick={() => navigate("complaint_new")} className="gap-1.5 self-start sm:self-auto">
          <Plus className="size-4" aria-hidden />
          {t("nav.fileComplaint")}
        </Button>
      </div>

      {/* Personal statistics dashboard ------------------------------ */}
      {data && data.length > 0 ? <ComplaintStats complaints={data} /> : null}

      {/* Filter bar --------------------------------------------------------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="space-y-1.5 sm:w-56">
          <Label htmlFor="status-filter" className="text-xs text-muted-foreground">
            {t("complaint.filterStatus")}
          </Label>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as "all" | ComplaintStatus)}
          >
            <SelectTrigger id="status-filter" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("complaint.filterAll")}</SelectItem>
              {statusOrder.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`status.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 space-y-1.5">
          <Label htmlFor="search-input" className="text-xs text-muted-foreground">
            {t("common.search")}
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id="search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("complaint.searchPlaceholder")}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Body --------------------------------------------------------------- */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : isError ? (
        <ErrorState
          message={(error as Error)?.message ?? t("errors.generic")}
          onRetry={() => void refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={t("complaint.emptyTitle")}
          description={t("complaint.emptyDesc")}
          actionLabel={t("complaint.emptyCta")}
          onAction={() => navigate("complaint_new")}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2" aria-label={t("complaint.listTitle")}>
          {items.map((c, idx) => (
            <ComplaintCard
              key={c.id}
              complaint={c}
              locale={locale}
              t={t}
              onClick={() => navigate("complaint_detail", { complaintId: c.id })}
              index={idx}
            />
          ))}
        </ul>
      )}

      {/* Live-polling indicator */}
      {data && data.length > 0 ? (
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" aria-hidden />
          {t("common.processing")}
        </p>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// ComplaintCard sub-component
// ---------------------------------------------------------------------------
type ComplaintCardProps = {
  complaint: Complaint;
  locale: ReturnType<typeof useTranslations>["locale"];
  t: ReturnType<typeof useTranslations>["t"];
  onClick: () => void;
  index: number;
};

function ComplaintCard({ complaint, locale, t, onClick, index }: ComplaintCardProps) {
  const aiPending = !complaint.ai_category;
  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.04, 0.24) }}
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
          "group cursor-pointer py-5 outline-none transition-all hover:border-primary/40 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50"
        )}
        aria-label={`${complaint.reference_number}: ${complaint.title}`}
      >
        <CardContent className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <code className="font-mono text-xs text-muted-foreground">
              {complaint.reference_number}
            </code>
            <div className="flex items-center gap-1.5">
              <StatusBadge status={complaint.status} />
              <PriorityBadge priority={complaint.priority} />
            </div>
          </div>

          <div>
            <h3 className="line-clamp-1 font-semibold text-foreground group-hover:text-primary">
              {complaint.title}
            </h3>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {complaint.description}
            </p>
          </div>

          {/* AI category line */}
          {aiPending ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" aria-hidden />
              {t("common.processing")}
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-xs text-primary">
              <Sparkles className="size-3" aria-hidden />
              <span className="font-medium">{complaint.ai_category}</span>
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="rounded-md bg-muted px-1.5 py-0.5 font-medium text-foreground/80">
                {complaint.department_name}
              </span>
            </span>
            <span className="flex items-center gap-2">
              {complaint.location_lat != null ? (
                <span className="flex items-center gap-0.5" title={complaint.location_address ?? ""}>
                  <MapPin className="size-3" aria-hidden />
                </span>
              ) : null}
              <time dateTime={complaint.submitted_at}>
                {formatRelative(complaint.submitted_at, locale)}
              </time>
              <ChevronRight className="size-3.5 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.li>
  );
}
