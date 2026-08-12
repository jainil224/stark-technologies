"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronDown,
  Eye,
  File as FileIcon,
  FileText,
  ImageIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useTranslations } from "@/lib/i18n";
import { formatBytes } from "@/lib/format";
import type { Attachment } from "@/lib/types";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Shared attachment presentation used by both the citizen complaint-detail
// and the officer officer-detail. Replaces the old generic-file-icon rows
// with:
//   - a deterministic-gradient thumbnail for image attachments (so a pothole
//     photo reads as a coloured preview tile rather than a generic file icon),
//   - a "Preview" button on every attachment that opens a Dialog showing the
//     larger preview + filename + size + type + OCR text (when available),
//   - an inline collapsible OCR block preserved from the citizen variant.
// ---------------------------------------------------------------------------

// Deterministic hash → hue (0..360) so each filename gets a stable, pleasant
// gradient tile instead of a generic icon. Same file → same colour across
// renders and across the row thumbnail + dialog preview.
function hashHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}

function gradientFor(filename: string): string {
  const hue = hashHue(filename);
  return `linear-gradient(135deg, hsl(${hue}, 65%, 70%) 0%, hsl(${hue}, 65%, 85%) 100%)`;
}

function isImageAttachment(a: Attachment): boolean {
  return a.mime_type.startsWith("image/");
}

function isPdfAttachment(a: Attachment): boolean {
  return a.mime_type === "application/pdf";
}

// ---------------------------------------------------------------------------
// AttachmentThumbnail — small tile rendered in the row.
// Images: clickable gradient tile with ImageIcon overlay + filename + hover
// eye indicator. Non-images: tinted file-type icon (kept as before).
// ---------------------------------------------------------------------------
export function AttachmentThumbnail({
  attachment,
  onClick,
}: {
  attachment: Attachment;
  onClick?: () => void;
}) {
  const isImage = isImageAttachment(attachment);
  const isPdf = isPdfAttachment(attachment);

  if (isImage) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`Preview ${attachment.filename}`}
        className="group relative size-16 shrink-0 overflow-hidden rounded-md border border-border shadow-sm transition-all hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        style={{ backgroundImage: gradientFor(attachment.filename) }}
      >
        <span className="absolute inset-0 flex items-center justify-center">
          <ImageIcon
            className="size-6 text-foreground/40 transition-transform group-hover:scale-110"
            aria-hidden
          />
        </span>
        <span className="absolute inset-x-0 bottom-0 block truncate bg-black/45 px-1 py-0.5 text-[10px] font-medium text-white">
          {attachment.filename}
        </span>
        <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
          <Eye className="size-3" aria-hidden />
        </span>
      </button>
    );
  }

  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-md",
        isPdf
          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
          : "bg-muted text-muted-foreground"
      )}
      aria-hidden
    >
      {isPdf ? (
        <FileText className="size-4" />
      ) : (
        <FileIcon className="size-4" />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AttachmentItem — full row: thumbnail + metadata + inline OCR + Preview.
// Used inside an `<ul>` of attachments.
// ---------------------------------------------------------------------------
export function AttachmentItem({ attachment }: { attachment: Attachment }) {
  const { t } = useTranslations();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [ocrOpen, setOcrOpen] = useState(false);
  const isImage = isImageAttachment(attachment);
  const hasOcr = Boolean(attachment.ocr_text);

  return (
    <li className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-3">
        <AttachmentThumbnail
          attachment={attachment}
          onClick={isImage ? () => setPreviewOpen(true) : undefined}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {attachment.filename}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatBytes(attachment.size_bytes)} · {attachment.mime_type}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {hasOcr ? (
            <Collapsible open={ocrOpen} onOpenChange={setOcrOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  OCR
                  <ChevronDown
                    className={cn(
                      "size-3.5 transition-transform",
                      ocrOpen && "rotate-180"
                    )}
                    aria-hidden
                  />
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-xs"
            onClick={() => setPreviewOpen(true)}
            aria-label={`Preview ${attachment.filename}`}
          >
            <Eye className="size-3.5" aria-hidden />
            {t("officer.detailAttachmentsPreview")}
          </Button>
        </div>
      </div>

      {hasOcr ? (
        <Collapsible open={ocrOpen} onOpenChange={setOcrOpen}>
          <CollapsibleContent className="mt-2 rounded-md border border-border bg-muted/40 p-2.5 text-xs leading-relaxed text-foreground/80">
            {attachment.ocr_text}
          </CollapsibleContent>
        </Collapsible>
      ) : null}

      <AttachmentPreviewDialog
        attachment={attachment}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </li>
  );
}

// ---------------------------------------------------------------------------
// AttachmentPreviewDialog — full-size preview + metadata + OCR text.
// For images: a larger gradient tile with the filename. For non-images: a
// file-type icon with the mime type. Always shows full metadata + OCR.
// ---------------------------------------------------------------------------
export function AttachmentPreviewDialog({
  attachment,
  open,
  onOpenChange,
}: {
  attachment: Attachment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslations();
  const isImage = isImageAttachment(attachment);
  const hasOcr = Boolean(attachment.ocr_text);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isImage ? (
              <ImageIcon className="size-4 text-primary" aria-hidden />
            ) : (
              <FileText className="size-4 text-primary" aria-hidden />
            )}
            {t("officer.detailAttachmentPreviewTitle")}
          </DialogTitle>
          <DialogDescription className="truncate">
            {attachment.filename}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Large preview tile */}
          {isImage ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg border border-border"
              style={{ backgroundImage: gradientFor(attachment.filename) }}
            >
              <div className="flex flex-col items-center gap-2 text-foreground/50">
                <ImageIcon className="size-12" aria-hidden />
                <span className="text-xs font-medium">
                  {attachment.filename}
                </span>
              </div>
            </motion.div>
          ) : (
            <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-border bg-muted/40">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <FileText className="size-12" aria-hidden />
                <span className="text-xs font-medium">
                  {attachment.mime_type}
                </span>
              </div>
            </div>
          )}

          {/* Metadata grid */}
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
            <div className="space-y-0.5">
              <dt className="text-xs text-muted-foreground">
                {t("officer.detailAttachmentType")}
              </dt>
              <dd className="font-medium text-foreground">
                {attachment.mime_type}
              </dd>
            </div>
            <div className="space-y-0.5">
              <dt className="text-xs text-muted-foreground">
                {t("officer.detailAttachmentSize")}
              </dt>
              <dd className="font-medium text-foreground">
                {formatBytes(attachment.size_bytes)}
              </dd>
            </div>
            <div className="space-y-0.5 sm:col-span-1">
              <dt className="text-xs text-muted-foreground">
                {t("officer.detailAttachmentFileName")}
              </dt>
              <dd
                className="truncate font-medium text-foreground"
                title={attachment.filename}
              >
                {attachment.filename}
              </dd>
            </div>
          </dl>

          {/* OCR text block */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              {t("officer.detailAttachmentOcr")}
            </p>
            {hasOcr ? (
              <p className="rounded-lg bg-muted/50 p-3 text-sm leading-relaxed text-foreground/90">
                {attachment.ocr_text}
              </p>
            ) : (
              <p className="rounded-lg border border-dashed border-border bg-muted/20 p-3 text-xs italic text-muted-foreground">
                {t("officer.detailAttachmentNoOcr")}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
