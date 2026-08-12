"use client";

import { useCallback, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Mic,
  Type,
  Upload,
  X,
  MapPin,
  Loader2,
  ArrowRight,
  CheckCircle2,
  Paperclip,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Progress } from "@/components/ui/progress";

import { useTranslations } from "@/lib/i18n";
import { useNav } from "@/lib/nav";
import { complaintsApi } from "@/lib/api";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { VoiceRecorder } from "./voice-recorder";

// ---------------------------------------------------------------------------
// Department options.
// Hardcoded locally as a const (per task spec). In production these would
// come from a /departments endpoint.
// ---------------------------------------------------------------------------
const DEPARTMENTS: { id: string; labelKey: string; label: string }[] = [
  { id: "dept_pwk", labelKey: "dept.pwk", label: "Public Works (Roads, Bridges, Footpaths)" },
  { id: "dept_water", labelKey: "dept.water", label: "Water Supply & Sanitation" },
  { id: "dept_elec", labelKey: "dept.elec", label: "Electricity & Street Lighting" },
  { id: "dept_health", labelKey: "dept.health", label: "Health & Family Welfare" },
  { id: "dept_edu", labelKey: "dept.edu", label: "Education & Schools" },
  { id: "dept_transport", labelKey: "dept.transport", label: "Transport & Traffic" },
];

const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
];
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

// ---------------------------------------------------------------------------
// Form schema + types
// ---------------------------------------------------------------------------
const complaintSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  department_id: z.string(),
  is_voice: z.boolean(),
  transcript: z.string().optional(),
});
type ComplaintValues = z.infer<typeof complaintSchema>;

type AttachmentDraft = {
  _uid: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  progress: number; // simulated upload progress 0-100
};

type LocationState =
  | { kind: "idle" }
  | { kind: "capturing" }
  | { kind: "captured"; lat: number; lng: number; address: string }
  | { kind: "denied" };

type VoiceStage = "prompt" | "review" | "confirmed";

// ---------------------------------------------------------------------------
// ComplaintForm — default export
// ---------------------------------------------------------------------------
export default function ComplaintForm() {
  const { t } = useTranslations();
  const navigate = useNav((s) => s.navigate);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setValue,
    control,
    trigger,
    formState: { errors },
  } = useForm<ComplaintValues>({
    resolver: zodResolver(complaintSchema),
    defaultValues: {
      title: "",
      description: "",
      department_id: "auto",
      is_voice: false,
      transcript: "",
    },
  });

  // useWatch (rather than useForm's `watch`) plays nicely with React Compiler
  // memoization — see https://react-hook-form.com/docs/useWatch
  const isVoice = useWatch({ control, name: "is_voice" });
  const description = useWatch({ control, name: "description" });

  // Local (non-RHF) state for attachments, location, voice review flow.
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [location, setLocation] = useState<LocationState>({ kind: "idle" });
  const [voiceStage, setVoiceStage] = useState<VoiceStage>("prompt");
  const [reviewTranscript, setReviewTranscript] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragDepthRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  // --- Mutation --------------------------------------------------------------
  const mutation = useMutation({
    mutationFn: async (values: ComplaintValues) => {
      const { data, error } = await complaintsApi.create({
        title: values.title,
        description: values.description,
        department_id: values.department_id === "auto" ? undefined : values.department_id,
        is_voice: values.is_voice,
        transcript: values.is_voice ? values.transcript : undefined,
        attachments: attachments.map(({ filename, mime_type, size_bytes }) => ({
          filename,
          mime_type,
          size_bytes,
        })),
        location_lat: location.kind === "captured" ? location.lat : undefined,
        location_lng: location.kind === "captured" ? location.lng : undefined,
        location_address: location.kind === "captured" ? location.address : undefined,
      });
      if (error || !data) throw error ?? new Error("Submission failed");
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      toast.success(t("toast.complaintSubmitted"));
      navigate("complaint_submitted", { submittedId: data.id });
    },
    onError: (err: unknown) => {
      const e = err as { message?: string; field_errors?: Record<string, string> } | null;
      setServerError(e?.message ?? t("errors.generic"));
      setFieldErrors(e?.field_errors ?? {});
    },
  });

  // --- Voice flow ------------------------------------------------------------
  const onTranscript = useCallback(
    (text: string) => {
      setReviewTranscript(text);
      setValue("transcript", text, { shouldValidate: false });
      setVoiceStage("review");
    },
    [setValue]
  );

  const resetVoice = useCallback(() => {
    setReviewTranscript("");
    setValue("transcript", "", { shouldValidate: false });
    setVoiceStage("prompt");
  }, [setValue]);

  const useTranscript = useCallback(async () => {
    setValue("transcript", reviewTranscript, { shouldValidate: false });
    setValue("description", reviewTranscript, { shouldValidate: true });
    setVoiceStage("confirmed");
    await trigger("description");
  }, [reviewTranscript, setValue, trigger]);

  const switchMode = (mode: "text" | "voice") => {
    setServerError(null);
    setFieldErrors({});
    if (mode === "text") {
      setValue("is_voice", false, { shouldValidate: false });
      resetVoice();
    } else {
      setValue("is_voice", true, { shouldValidate: false });
    }
  };

  // --- Attachments -----------------------------------------------------------
  const addFiles = useCallback(
    (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      for (const file of files) {
        if (!ALLOWED_MIME.includes(file.type)) {
          toast.error(t("toast.attachmentBadType", { name: file.name }));
          continue;
        }
        if (file.size > MAX_FILE_BYTES) {
          toast.error(t("toast.attachmentTooBig", { name: file.name }));
          continue;
        }
        // Track this draft by a unique client id so the simulated progress
        // timer updates the right row even if duplicates are added.
        const uid = `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const draft: AttachmentDraft = {
          _uid: uid,
          filename: file.name,
          mime_type: file.type,
          size_bytes: file.size,
          progress: 0,
        };
        setAttachments((cur) => [...cur, draft]);
        let pct = 0;
        const interval = setInterval(() => {
          pct = Math.min(100, pct + 18 + Math.random() * 12);
          setAttachments((cur) =>
            cur.map((a) => (a._uid === uid ? { ...a, progress: pct } : a))
          );
          if (pct >= 100) clearInterval(interval);
        }, 220);
      }
    },
    [t]
  );

  const removeAttachment = (index: number) => {
    setAttachments((cur) => cur.filter((_, i) => i !== index));
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(e.target.files);
    // Reset so picking the same file twice still fires a change event.
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const onDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current += 1;
    setIsDragging(true);
  };
  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current -= 1;
    if (dragDepthRef.current <= 0) setIsDragging(false);
  };

  // --- Location --------------------------------------------------------------
  const captureLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error(t("complaint.locationDenied"));
      return;
    }
    setLocation({ kind: "capturing" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Math.round(pos.coords.latitude * 100) / 100;
        const lng = Math.round(pos.coords.longitude * 100) / 100;
        setLocation({
          kind: "captured",
          lat,
          lng,
          address: `Lat ${lat}, Lng ${lng}`,
        });
      },
      () => {
        setLocation({ kind: "denied" });
        toast.error(t("complaint.locationDenied"));
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  };

  // --- Submit gating ---------------------------------------------------------
  const voiceBlocking =
    isVoice && (voiceStage === "prompt" || voiceStage === "review");
  const submitDisabled = mutation.isPending || voiceBlocking;

  async function onSubmit(values: ComplaintValues) {
    setServerError(null);
    setFieldErrors({});
    // Double-check voice gating (should be redundant with disabled prop).
    if (voiceBlocking) return;
    mutation.mutate(values);
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Card className="border-border/70 shadow-lg shadow-primary/5">
        <CardHeader className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4" aria-hidden />
            </span>
            <CardTitle className="text-xl">{t("complaint.newTitle")}</CardTitle>
          </div>
          <CardDescription>{t("complaint.newSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
            {serverError ? (
              <Alert variant="destructive">
                <AlertTitle>{t("errors.somethingWentWrong")}</AlertTitle>
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            ) : null}

            {/* Input mode toggle ------------------------------------------------- */}
            <div className="space-y-2">
              <Label>{t("complaint.inputModeLabel")}</Label>
              <ToggleGroup
                type="single"
                value={isVoice ? "voice" : "text"}
                onValueChange={(v) => {
                  if (v === "voice") switchMode("voice");
                  else if (v === "text") switchMode("text");
                }}
                variant="outline"
                className="grid w-full grid-cols-2 gap-1 rounded-xl bg-muted/50 p-1"
              >
                <ToggleGroupItem
                  value="text"
                  className="gap-1.5 rounded-lg py-2.5 data-[state=on]:bg-background data-[state=on]:shadow-sm data-[state=on]:text-primary"
                  aria-label={t("complaint.textMode")}
                >
                  <Type className="size-4" aria-hidden />
                  {t("complaint.textMode")}
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="voice"
                  className="gap-1.5 rounded-lg py-2.5 data-[state=on]:bg-background data-[state=on]:shadow-sm data-[state=on]:text-primary"
                  aria-label={t("complaint.voiceMode")}
                >
                  <Mic className="size-4" aria-hidden />
                  {t("complaint.voiceMode")}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Voice recorder OR transcript review ---------------------------------- */}
            <AnimatePresence mode="wait" initial={false}>
              {isVoice ? (
                <motion.div
                  key="voice-block"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  {voiceStage === "prompt" ? (
                    <div className="space-y-2">
                      <VoiceRecorder onTranscript={onTranscript} onReset={resetVoice} />
                    </div>
                  ) : voiceStage === "review" ? (
                    <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
                      <div className="flex items-start gap-2">
                        <Mic className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                        <div>
                          <p className="text-sm font-medium text-foreground">{t("complaint.voiceReview")}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{t("complaint.voiceReviewHint")}</p>
                        </div>
                      </div>
                      <Textarea
                        value={reviewTranscript}
                        onChange={(e) => setReviewTranscript(e.target.value)}
                        rows={5}
                        aria-label={t("complaint.voiceReview")}
                        className="bg-background"
                      />
                      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={resetVoice}
                          className="gap-1.5"
                        >
                          {t("complaint.voiceRetake")}
                        </Button>
                        <Button
                          type="button"
                          onClick={useTranscript}
                          className="gap-1.5"
                          disabled={!reviewTranscript.trim()}
                        >
                          <CheckCircle2 className="size-4" aria-hidden />
                          {t("complaint.voiceUse")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                        <div>
                          <p className="text-sm font-medium text-foreground">{t("complaint.voiceUse")}</p>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {reviewTranscript}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={resetVoice}
                        className="shrink-0 text-muted-foreground"
                      >
                        {t("complaint.voiceRetake")}
                      </Button>
                    </div>
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>

            {/* Title -------------------------------------------------------------- */}
            <div className="space-y-1.5">
              <Label htmlFor="title">
                {t("complaint.titleLabel")}{" "}
                <span className="text-xs font-normal text-muted-foreground">({t("common.required")})</span>
              </Label>
              <Input
                id="title"
                placeholder={t("complaint.titlePlaceholder")}
                className={cn((errors.title || fieldErrors.title) && "border-destructive")}
                {...register("title")}
              />
              {errors.title ? (
                <p className="text-xs text-destructive">{errors.title.message}</p>
              ) : null}
              {fieldErrors.title ? (
                <p className="text-xs text-destructive">{fieldErrors.title}</p>
              ) : null}
            </div>

            {/* Description (text mode OR voice-confirmed summary) -------------------- */}
            {/* In voice mode, hide the description field while recording/reviewing
                the transcript — the transcript review block above replaces it.
                Once the user clicks "Use this transcript", we surface the
                populated description so they can fine-tune before submitting. */}
            {(!isVoice || voiceStage === "confirmed") && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="description">
                    {t("complaint.descriptionLabel")}{" "}
                    <span className="text-xs font-normal text-muted-foreground">({t("common.required")})</span>
                  </Label>
                  <span
                    className={cn(
                      "text-[11px] tabular-nums text-muted-foreground",
                      (description?.length ?? 0) < 20 && (description?.length ?? 0) > 0 && "text-amber-600 dark:text-amber-400"
                    )}
                    aria-live="polite"
                  >
                    {(description?.length ?? 0)} chars
                  </span>
                </div>
                {isVoice ? (
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setValue("description", e.target.value, { shouldValidate: true })}
                    placeholder={t("complaint.descriptionPlaceholder")}
                    rows={6}
                    className={cn("resize-y", errors.description && "border-destructive")}
                  />
                ) : (
                  <Textarea
                    id="description"
                    placeholder={t("complaint.descriptionPlaceholder")}
                    rows={6}
                    className={cn("resize-y", errors.description && "border-destructive")}
                    {...register("description")}
                  />
                )}
                {errors.description ? (
                  <p className="text-xs text-destructive">{errors.description.message}</p>
                ) : null}
                {fieldErrors.description ? (
                  <p className="text-xs text-destructive">{fieldErrors.description}</p>
                ) : null}
              </div>
            )}

            {/* Department --------------------------------------------------------- */}
            <div className="space-y-1.5">
              <Label htmlFor="department">
                {t("complaint.departmentLabel")}{" "}
                <span className="text-xs font-normal text-muted-foreground">({t("common.optional")})</span>
              </Label>
              <Select
                defaultValue="auto"
                onValueChange={(v) => setValue("department_id", v, { shouldValidate: false })}
              >
                <SelectTrigger id="department" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">{t("complaint.departmentAuto")}</SelectItem>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t("complaint.departmentHint")}</p>
            </div>

            {/* Attachments -------------------------------------------------------- */}
            <div className="space-y-2">
              <Label htmlFor="file-input">{t("complaint.attachmentsLabel")}</Label>
              <p className="text-xs text-muted-foreground">{t("complaint.attachmentsHint")}</p>

              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragEnter={onDragEnter}
                onDragLeave={onDragLeave}
                aria-label={t("complaint.attachmentsDrop")}
                className={cn(
                  "group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-10 text-center transition-all outline-none hover:scale-[1.01] hover:shadow-sm focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  isDragging
                    ? "scale-[1.02] border-primary bg-primary/8 shadow-sm"
                    : "border-border bg-muted/30 hover:border-primary/50 hover:bg-primary/5"
                )}
              >
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  <Upload className="size-5" aria-hidden />
                </div>
                <p className="text-sm font-medium text-foreground">{t("complaint.attachmentsDrop")}</p>
                <p className="text-xs text-muted-foreground">PDF, JPG, PNG, WEBP, HEIC — max 10 MB</p>
                <input
                  id="file-input"
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,image/*,application/pdf"
                  onChange={onFileInputChange}
                  className="sr-only"
                />
              </div>

              {attachments.length > 0 ? (
                <ul className="space-y-2" aria-label={t("complaint.attachmentsLabel")}>
                  {attachments.map((a, i) => (
                    <li
                      key={`${a.filename}-${i}`}
                      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Paperclip className="size-4" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium text-foreground">{a.filename}</p>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {formatBytes(a.size_bytes)}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <Progress value={a.progress} className="h-1.5" />
                          <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                            {Math.round(a.progress)}%
                          </span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeAttachment(i)}
                        aria-label={`${t("common.delete")} ${a.filename}`}
                      >
                        <X className="size-4" aria-hidden />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            {/* Location ----------------------------------------------------------- */}
            <div className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-4">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <MapPin className="size-3.5" aria-hidden />
                </span>
                <Label className="text-sm font-medium">{t("complaint.locationLabel")}</Label>
                <span className="text-[11px] font-normal text-muted-foreground">({t("common.optional")})</span>
              </div>
              <p className="text-xs text-muted-foreground">{t("complaint.locationHint")}</p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={captureLocation}
                  disabled={location.kind === "capturing"}
                  className="gap-1.5"
                >
                  {location.kind === "capturing" ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <MapPin className="size-4" aria-hidden />
                  )}
                  {location.kind === "capturing"
                    ? t("complaint.locationCapturing")
                    : location.kind === "captured"
                      ? t("complaint.locationCapture")
                      : t("complaint.locationCapture")}
                </Button>
                {location.kind === "captured" ? (
                  <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                    <CheckCircle2 className="size-3.5" aria-hidden />
                    {t("complaint.locationCaptured")}: {location.address}
                  </div>
                ) : location.kind === "denied" ? (
                  <p className="text-xs text-destructive">{t("complaint.locationDenied")}</p>
                ) : null}
              </div>
            </div>

            {/* Submit ------------------------------------------------------------- */}
            <div className="space-y-2 pt-2">
              {voiceBlocking ? (
                <p className="text-xs text-amber-600 dark:text-amber-400" role="status" aria-live="polite">
                  {voiceStage === "prompt"
                    ? t("complaint.voiceRecord") + " — " + t("common.required")
                    : t("complaint.voiceReviewHint")}
                </p>
              ) : null}
              <Button
                type="submit"
                size="lg"
                disabled={submitDisabled}
                className="w-full gap-2"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    {t("common.submitting")}
                  </>
                ) : (
                  <>
                    <FileText className="size-4" aria-hidden />
                    {t("complaint.submit")}
                    <ArrowRight className="size-4" aria-hidden />
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
