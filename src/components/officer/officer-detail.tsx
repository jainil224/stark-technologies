"use client";

import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  FileText,
  Languages,
  Mic,
  Paperclip,
  Sparkles,
  Brain,
  User,
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

import { useTranslations } from "@/lib/i18n";
import { useNav } from "@/lib/nav";
import { complaintsApi } from "@/lib/api";
import {
  formatDate,
  formatDateTime,
} from "@/lib/format";
import { StatusBadge, PriorityBadge } from "@/components/shared/badges";
import { CardSkeleton, ErrorState } from "@/components/shared/states";
import { AttachmentItem } from "@/components/shared/attachment-preview";
import { DuplicateClusterCallout } from "@/components/shared/duplicate-cluster-dialog";
import { StatusTimeline } from "@/components/citizen/status-timeline";
import { StatusUpdateForm } from "./status-update-form";

// ---------------------------------------------------------------------------
// OfficerDetail — default export
//
// Officer-side complaint view. Two-column on desktop: main column shows the
// complaint facts (header, raw text, optional translation/transcript,
// attachments) plus the AI-assisted analysis panel and duplicate-group
// callout; sidebar holds the StatusUpdateForm, the status timeline, and a
// compact citizen-info card. Polls every 15s so AI fields land without a
// manual refresh.
// ---------------------------------------------------------------------------

export default function OfficerDetail({ complaintId }: { complaintId: string }) {
  const { t, locale } = useTranslations();
  const navigate = useNav((s) => s.navigate);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["complaint", complaintId],
    queryFn: async () => {
      const { data, error } = await complaintsApi.getById(complaintId);
      if (error || !data) throw error ?? new Error("Failed to load");
      return data;
    },
    refetchInterval: 15000,
  });

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <BackButton onClick={() => navigate("officer_queue")} label={t("nav.back")} />
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
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <BackButton onClick={() => navigate("officer_queue")} label={t("nav.back")} />
        <ErrorState
          message={(error as Error)?.message ?? t("errors.notFound")}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  const complaint = data;
  const aiPending = !complaint.ai_category;
  const aiConfidence = complaint.ai_category_confidence ?? 0;
  const aiPriorityConfidence = complaint.ai_priority_confidence ?? 0;
  const hasAttachments = complaint.attachments.length > 0;
  const hasDuplicates = (complaint.duplicate_count ?? 0) > 1;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <BackButton onClick={() => navigate("officer_queue")} label={t("nav.back")} />

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
              </div>

              <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                <p className="flex items-center gap-1.5">
                  <CalendarClock className="size-3.5" aria-hidden />
                  {t("officer.submittedAt")}:{" "}
                  <span className="font-medium text-foreground/80">
                    {formatDate(complaint.submitted_at, locale)}
                  </span>
                </p>
                <p className="flex items-center gap-1.5">
                  <CalendarClock className="size-3.5" aria-hidden />
                  {t("officer.lastUpdated")}:{" "}
                  <span className="font-medium text-foreground/80">
                    {formatDateTime(complaint.updated_at, locale)}
                  </span>
                </p>
              </div>

              <p className="text-sm text-muted-foreground">
                {t(`statusDesc.${complaint.status}`)}
              </p>
            </CardContent>
          </Card>

          {/* Raw complaint text */}
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

          {/* Translation (if AI translated) */}
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

          {/* AI-assisted analysis panel — visually distinct from facts */}
          <Card className="py-5 border-amber-300/60 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex size-6 items-center justify-center rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  <Brain className="size-3.5" aria-hidden />
                </span>
                {t("officer.detailAiPanel")}
                <span className="rounded-full border border-amber-300/70 bg-amber-100/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:border-amber-800/70 dark:bg-amber-900/40 dark:text-amber-300">
                  AI-assisted
                </span>
              </CardTitle>
              <CardDescription>{t("officer.detailAiDisclaimer")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {aiPending ? (
                <div
                  className="flex items-center gap-2 rounded-lg border border-dashed border-amber-300/70 bg-amber-100/40 px-3 py-4 text-sm text-amber-700 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-300"
                  role="status"
                  aria-live="polite"
                >
                  <Sparkles className="size-4 animate-pulse" aria-hidden />
                  {t("common.processing")}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <AiField label={t("officer.detailAiCategory")}>
                      <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                        <Sparkles className="size-3.5 text-amber-600 dark:text-amber-400" aria-hidden />
                        {complaint.ai_category}
                      </span>
                    </AiField>
                    <AiField label={t("officer.detailAiPriority")}>
                      <PriorityBadge priority={complaint.priority} />
                    </AiField>
                  </div>

                  <div className="space-y-2.5">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {t("officer.detailAiCategoryConfidence")}
                        </span>
                        <span className="font-medium tabular-nums text-foreground">
                          {Math.round(aiConfidence * 100)}%
                        </span>
                      </div>
                      <Progress
                        value={Math.round(aiConfidence * 100)}
                        className="h-1.5"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {t("officer.detailAiPriorityConfidence")}
                        </span>
                        <span className="font-medium tabular-nums text-foreground">
                          {Math.round(aiPriorityConfidence * 100)}%
                        </span>
                      </div>
                      <Progress
                        value={Math.round(aiPriorityConfidence * 100)}
                        className="h-1.5"
                      />
                    </div>
                  </div>

                  {complaint.ai_summary ? (
                    <AiField label={t("officer.detailAiSummary")}>
                      <p className="rounded-lg bg-amber-100/40 p-3 text-sm leading-relaxed text-foreground/90 dark:bg-amber-900/20">
                        {complaint.ai_summary}
                      </p>
                    </AiField>
                  ) : null}

                  <p className="text-[11px] italic text-muted-foreground">
                    {t("officer.detailAiDisclaimer")}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Duplicate group — interactive callout, opens cluster dialog */}
          {hasDuplicates ? (
            <DuplicateClusterCallout
              count={complaint.duplicate_count ?? 0}
              referenceNumber={complaint.reference_number}
            />
          ) : null}
        </div>

        {/* SIDEBAR -------------------------------------------------- */}
        <aside className="space-y-4">
          {/* Status update form */}
          <StatusUpdateForm
            complaintId={complaint.id}
            currentStatus={complaint.status}
          />

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

          {/* Citizen info mini-card */}
          <Card className="py-5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="size-4 text-primary" aria-hidden />
                {t("officer.citizenInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                {complaint.citizen_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("officer.submittedAt")}: {formatDate(complaint.submitted_at, locale)}
              </p>
              {complaint.location_address ? (
                <p className="text-xs text-muted-foreground">
                  {complaint.location_address}
                </p>
              ) : null}
            </CardContent>
          </Card>
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

function AiField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}
