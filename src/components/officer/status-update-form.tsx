"use client";

import { useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { useTranslations } from "@/lib/i18n";
import { officerApi } from "@/lib/api";
import { statusOrder } from "@/lib/format";
import type { ComplaintStatus } from "@/lib/types";

// ---------------------------------------------------------------------------
// StatusUpdateForm
//
// Officer-facing form for moving a complaint through its lifecycle. Uses
// react-hook-form + zod. The note is ALWAYS required (min 5 chars) — it is
// visible to the citizen and forms the audit trail entry in status_history.
//
// On success we invalidate the officer queue and the open complaint detail
// queries so both views reconcile against the freshly-updated record.
// ---------------------------------------------------------------------------

type StatusUpdateFormProps = {
  complaintId: string;
  currentStatus: ComplaintStatus;
  onUpdated?: () => void;
};

type FormValues = {
  status: ComplaintStatus;
  note: string;
};

export function StatusUpdateForm({
  complaintId,
  currentStatus,
  onUpdated,
}: StatusUpdateFormProps) {
  const { t } = useTranslations();
  const queryClient = useQueryClient();

  // Build the zod schema inside render so the `t(...)` message stays in sync
  // with the active locale. Schemas are cheap to construct.
  const schema = useMemo(
    () =>
      z.object({
        status: z.enum(
          statusOrder as [ComplaintStatus, ...ComplaintStatus[]]
        ),
        note: z
          .string()
          .trim()
          .min(5, t("officer.updateNoteRequired")),
      }),
    [t]
  );

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      status: currentStatus,
      note: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { data, error } = await officerApi.updateStatus({
        complaint_id: complaintId,
        status: values.status,
        note: values.note,
      });
      if (error || !data) {
        // Re-throw with the ApiError attached so the onError handler can
        // surface field_errors where present.
        const err = new Error(error?.message ?? "Update failed") as Error & {
          fieldErrors?: Record<string, string>;
        };
        err.fieldErrors = error?.field_errors;
        throw err;
      }
      return data;
    },
    onSuccess: () => {
      toast.success(t("officer.updateSuccess"));
      // Reconcile both the queue and the open detail view.
      void queryClient.invalidateQueries({ queryKey: ["officer", "queue"] });
      void queryClient.invalidateQueries({
        queryKey: ["complaint", complaintId],
      });
      // Reset the note but keep the (now current) status selected.
      reset({ status: currentStatus, note: "" });
      onUpdated?.();
    },
    onError: () => {
      // Field-level + form-level error rendering is handled below from the
      // mutation.error reference, so we intentionally do not toast here.
    },
  });

  const fieldNoteError =
    (mutation.error as { fieldErrors?: Record<string, string> } | null)
      ?.fieldErrors?.note ?? errors.note?.message;
  const formLevelError = mutation.error
    ? !(
        mutation.error as { fieldErrors?: Record<string, string> }
      ).fieldErrors?.note
      ? (mutation.error as Error).message
      : null
    : null;

  const isSubmitting = mutation.isPending;

  return (
    <Card className="py-5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("officer.updateStatusTitle")}</CardTitle>
        <CardDescription>{t("statusDesc." + currentStatus)}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
          className="space-y-4"
          noValidate
        >
          {/* Status */}
          <div className="space-y-1.5">
            <Label htmlFor={`status-${complaintId}`} className="text-xs text-muted-foreground">
              {t("officer.updateStatusLabel")}
            </Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => field.onChange(v as ComplaintStatus)}
                >
                  <SelectTrigger
                    id={`status-${complaintId}`}
                    className="w-full"
                    aria-label={t("officer.updateStatusLabel")}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOrder.map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(`status.${s}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <Label htmlFor={`note-${complaintId}`} className="text-xs text-muted-foreground">
                {t("officer.updateNoteLabel")}
              </Label>
              <span className="text-[11px] font-medium uppercase tracking-wide text-rose-600 dark:text-rose-400">
                {t("common.required")}
              </span>
            </div>
            <Textarea
              id={`note-${complaintId}`}
              {...register("note")}
              placeholder={t("officer.updateNotePlaceholder")}
              rows={4}
              aria-invalid={fieldNoteError ? true : undefined}
              aria-describedby={
                fieldNoteError ? `note-error-${complaintId}` : undefined
              }
              className="resize-y"
            />
            {fieldNoteError ? (
              <p
                id={`note-error-${complaintId}`}
                role="alert"
                className="text-xs font-medium text-destructive"
              >
                {fieldNoteError}
              </p>
            ) : null}
          </div>

          {/* Form-level error (non-field) */}
          {formLevelError ? (
            <Alert variant="destructive">
              <AlertDescription>{formLevelError}</AlertDescription>
            </Alert>
          ) : null}

          <Button
            type="submit"
            disabled={isSubmitting || !isValid}
            className="w-full gap-1.5"
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Send className="size-4" aria-hidden />
            )}
            {isSubmitting ? t("common.saving") : t("officer.updateSubmit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
