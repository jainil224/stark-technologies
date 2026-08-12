"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  Sparkles,
  CalendarClock,
  GitBranch,
  Mic,
  Languages,
  FileText,
  Paperclip,
  ChevronDown,
  Loader2,
  ImageIcon,
  File as FileIcon,
  Building2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { useTranslations } from "@/lib/i18n";
import { useNav } from "@/lib/nav";
import { complaintsApi } from "@/lib/api";
import {
  formatBytes,
  formatDate,
  formatDateTime,
} from "@/lib/format";
import type { Attachment } from "@/lib/types";
import { StatusBadge, PriorityBadge } from "@/components/shared/badges";
import { CardSkeleton, ErrorState } from "@/components/shared/states";
import { StatusTimeline } from "./status-timeline";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// ComplaintDetail — default export
// ---------------------------------------------------------------------------

export default function ComplaintDetail({ complaintId }: { complaintId: string }) {
  const { t, locale } = useTranslations();
  const navigate = useNav((s) => s.navigate);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["complaints", complaintId],
    queryFn: async () => {
      const { data, error } = await complaintsApi.getById(complaintId);
      if (error || !data) throw error ?? new Error("Failed to load");
      return data;
    },
    refetchInterval: 15000,
  });

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <BackButton onClick={() => navigate("complaint_list")} label={t("complaint.detailBack")} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <CardSkeleton />
            <CardSkeleton />
          </div>
          <div className="space-y-4">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <BackButton onClick={() => navigate("complaint_list")} label={t("complaint.detailBack")} />
        <ErrorState
          message={(error as Error)?.message ?? t("errors.notFound")}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  const complaint = data;
  const aiPending = !complaint.ai_category;
  const confidence = complaint.ai_category_confidence ?? 0;
  const priorityConfidence = complaint.ai_priority_confidence ?? 0;
  const hasAttachments = complaint.attachments.length > 0;
  const hasLocation =
    complaint.location_lat != null && complaint.location_lng != null;
  const hasDuplicates = (complaint.duplicate_count ?? 0) > 1;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <BackButton onClick={() => navigate("complaint_list")} label={t("complaint.detailBack")} />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        {/* MAIN COLUMN ----------------------------------------------- */}
        <div className="space-y-4 lg:col-span-2">
          {/* Header */}
          <Card className="py-5">
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <code className="font-mono">{complaint.reference_number}</code>
                <span className="text-muted-foreground/60">·</span>
                <span className="flex items-center gap-1">
                  <Building2 className="size-3" aria-hidden />
                  {complaint.department_name}
                </span>
              </div>

              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {complaint.title}
              </h1>

              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={complaint.status} />
                <PriorityBadge priority={complaint.priority} />
                <span className="text-xs text-muted-foreground">
                  {t("officer.submittedAt")}: {formatDate(complaint.submitted_at, locale)}
                </span>
              </div>

              <p className="text-sm text-muted-foreground">
                {t(`statusDesc.${complaint.status}`)}
              </p>
            </CardContent>
          </Card>

          {/* Original description */}
          <Card className="py-5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4 text-primary" aria-hidden />
                {t("complaint.detailOriginal")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {complaint.description}
              </p>
            </CardContent>
          </Card>

          {/* Translation */}
          {complaint.translated_text ? (
            <Card className="py-5 border-primary/30 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Languages className="size-4 text-primary" aria-hidden />
                  {t("complaint.detailTranslated")}
                </CardTitle>
                <CardDescription>{t("common.poweredBy")}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                  {complaint.translated_text}
                </p>
              </CardContent>
            </Card>
          ) : null}

          {/* Voice transcript */}
          {complaint.is_voice && complaint.transcript ? (
            <Card className="py-5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Mic className="size-4 text-primary" aria-hidden />
                  {t("complaint.detailTranscript")}
                </CardTitle>
                <CardDescription>{t("complaint.voiceReviewHint")}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                  {complaint.transcript}
                </p>
              </CardContent>
            </Card>
          ) : null}

          {/* Attachments */}
          <Card className="py-5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Paperclip className="size-4 text-primary" aria-hidden />
                {t("complaint.detailAttachments")}
                {hasAttachments ? (
                  <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    {complaint.attachments.length}
                  </span>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hasAttachments ? (
                <ul className="space-y-2">
                  {complaint.attachments.map((a) => (
                    <AttachmentItem key={a.id} attachment={a} />
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("complaint.detailNoAttachments")}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Status timeline */}
          <Card className="py-5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarClock className="size-4 text-primary" aria-hidden />
                {t("complaint.detailTimeline")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StatusTimeline
                history={complaint.status_history}
                currentStatus={complaint.status}
              />
            </CardContent>
          </Card>
        </div>

        {/* SIDEBAR -------------------------------------------------- */}
        <aside className="space-y-4">
          {/* AI classification */}
          <Card className="py-5 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="size-4 text-primary" aria-hidden />
                {t("complaint.detailAiClassification")}
              </CardTitle>
              <CardDescription>{t("officer.detailAiDisclaimer")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {aiPending ? (
                <div
                  className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-3 py-4 text-sm text-muted-foreground"
                  role="status"
                  aria-live="polite"
                >
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {t("common.processing")}
                </div>
              ) : (
                <>
                  <Field label={t("officer.detailAiCategory")}>
                    <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <Sparkles className="size-3.5 text-primary" aria-hidden />
                      {complaint.ai_category}
                    </span>
                  </Field>

                  <Field label={t("officer.detailAiPriority")}>
                    <PriorityBadge priority={complaint.priority} />
                  </Field>

                  <div className="space-y-2.5">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{t("officer.detailAiCategoryConfidence")}</span>
                        <span className="font-medium tabular-nums text-foreground">
                          {Math.round(confidence * 100)}%
                        </span>
                      </div>
                      <Progress value={Math.round(confidence * 100)} className="h-1.5" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{t("officer.detailAiPriorityConfidence")}</span>
                        <span className="font-medium tabular-nums text-foreground">
                          {Math.round(priorityConfidence * 100)}%
                        </span>
                      </div>
                      <Progress value={Math.round(priorityConfidence * 100)} className="h-1.5" />
                    </div>
                  </div>

                  {complaint.ai_summary ? (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">
                        {t("complaint.detailAiSummary")}
                      </p>
                      <p className="rounded-lg bg-muted/50 p-3 text-sm text-foreground/90">
                        {complaint.ai_summary}
                      </p>
                    </div>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>

          {/* Estimated resolution */}
          {complaint.estimated_resolution_date ? (
            <Card className="py-5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarClock className="size-4 text-primary" aria-hidden />
                  {t("complaint.detailEstimated")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold text-foreground">
                  {formatDate(complaint.estimated_resolution_date, locale)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("officer.lastUpdated")}: {formatDateTime(complaint.updated_at, locale)}
                </p>
              </CardContent>
            </Card>
          ) : null}

          {/* Location */}
          {hasLocation ? (
            <Card className="py-5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="size-4 text-primary" aria-hidden />
                  {t("complaint.detailLocation")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {complaint.location_address ?? `Lat ${complaint.location_lat}, Lng ${complaint.location_lng}`}
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  {complaint.location_lat?.toFixed(4)}, {complaint.location_lng?.toFixed(4)}
                </p>
              </CardContent>
            </Card>
          ) : null}

          {/* Duplicate group */}
          {hasDuplicates ? (
            <Card className="py-5 border-amber-300/60 bg-amber-50/50 dark:border-amber-900/60 dark:bg-amber-950/20">
              <CardContent className="flex items-start gap-3 py-0">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <GitBranch className="size-4" aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {t("complaint.detailDuplicates", { count: complaint.duplicate_count ?? 0 })}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t("officer.detailDuplicatesDesc", { count: complaint.duplicate_count ?? 0 })}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </aside>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="gap-1.5 text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden />
      {label}
    </Button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function AttachmentItem({ attachment }: { attachment: Attachment }) {
  const isImage = attachment.mime_type.startsWith("image/");
  const isPdf = attachment.mime_type === "application/pdf";
  const [open, setOpen] = useState(false);

  return (
    <li className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-md",
            isImage
              ? "bg-primary/10 text-primary"
              : isPdf
                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                : "bg-muted text-muted-foreground"
          )}
        >
          {isImage ? (
            <ImageIcon className="size-4" aria-hidden />
          ) : isPdf ? (
            <FileText className="size-4" aria-hidden />
          ) : (
            <FileIcon className="size-4" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{attachment.filename}</p>
          <p className="text-xs text-muted-foreground">
            {formatBytes(attachment.size_bytes)} · {attachment.mime_type}
          </p>
        </div>
        {attachment.ocr_text ? (
          <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                OCR
                <ChevronDown
                  className={cn("size-3.5 transition-transform", open && "rotate-180")}
                  aria-hidden
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 rounded-md border border-border bg-muted/40 p-2.5 text-xs leading-relaxed text-foreground/80">
              {attachment.ocr_text}
            </CollapsibleContent>
          </Collapsible>
        ) : null}
      </div>
    </li>
  );
}
