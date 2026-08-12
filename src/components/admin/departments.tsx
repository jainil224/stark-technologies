"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Plus, Pencil, Building2, Users, CircleDot, Gauge, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { useTranslations } from "@/lib/i18n";
import { adminApi } from "@/lib/api";
import type { Department } from "@/lib/types";
import { EmptyState, ErrorState } from "@/components/shared/states";

// ---------------------------------------------------------------------------
// AdminDepartments — default export
//
// Lists departments in a desktop table (collapses to cards on mobile) with
// two RHF + zod dialogs: create department + edit department (name, head,
// SLA days, description). Mutations invalidate the shared
// `["admin","departments"]` query key and surface a toast on success.
// ---------------------------------------------------------------------------

type EditValues = {
  name: string;
  head_name: string;
  avg_resolution_days: number;
  description: string;
};

type CreateValues = EditValues;

export default function AdminDepartments() {
  const { t } = useTranslations();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin", "departments"],
    queryFn: async () => {
      const { data, error } = await adminApi.listDepartments();
      if (error || !data) throw error ?? new Error("Failed to load");
      return data;
    },
  });

  // --- Create mutation ----------------------------------------------------
  const createMutation = useMutation({
    mutationFn: async (values: CreateValues) => {
      const { data, error } = await adminApi.createDepartment({
        name: values.name,
        description: values.description,
        avg_resolution_days: values.avg_resolution_days,
        head_name: values.head_name.trim() ? values.head_name.trim() : undefined,
      });
      if (error || !data) {
        const err = new Error(error?.message ?? "Create failed") as Error & {
          fieldErrors?: Record<string, string>;
        };
        err.fieldErrors = error?.field_errors;
        throw err;
      }
      return data;
    },
    onSuccess: () => {
      toast.success(t("admin.created"));
      void queryClient.invalidateQueries({ queryKey: ["admin", "departments"] });
      setCreateOpen(false);
    },
  });

  // --- Update mutation ----------------------------------------------------
  const updateMutation = useMutation({
    mutationFn: async (values: EditValues & { id: string }) => {
      const { data, error } = await adminApi.updateDepartment({
        id: values.id,
        name: values.name,
        head_name: values.head_name.trim() ? values.head_name.trim() : undefined,
        avg_resolution_days: values.avg_resolution_days,
      });
      if (error || !data) {
        const err = new Error(error?.message ?? "Update failed") as Error & {
          fieldErrors?: Record<string, string>;
        };
        err.fieldErrors = error?.field_errors;
        throw err;
      }
      return data;
    },
    onSuccess: () => {
      toast.success(t("admin.saved"));
      void queryClient.invalidateQueries({ queryKey: ["admin", "departments"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "analytics"] });
      setEditing(null);
    },
  });

  return (
    <div className="space-y-5">
      {/* Header ------------------------------------------------------------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {t("admin.departmentsTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("admin.departmentsSubtitle")}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-1.5 self-start sm:self-auto">
          <Plus className="size-4" aria-hidden />
          {t("admin.addDepartment")}
        </Button>
      </div>

      {/* Body --------------------------------------------------------------- */}
      {isLoading ? (
        <DepartmentsSkeleton />
      ) : isError ? (
        <ErrorState
          message={(error as Error)?.message ?? t("errors.generic")}
          onRetry={() => void refetch()}
        />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={t("admin.addDepartment")}
          description={t("admin.departmentsSubtitle")}
          actionLabel={t("admin.addDepartment")}
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        <>
          {/* Desktop table --------------------------------------------------- */}
          <Card className="hidden py-0 md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="pl-4">{t("admin.colDepartment")}</TableHead>
                  <TableHead>{t("admin.colHead")}</TableHead>
                  <TableHead className="text-right">{t("admin.colOfficers")}</TableHead>
                  <TableHead className="text-right">{t("admin.colActive")}</TableHead>
                  <TableHead className="text-right">{t("admin.colSla")}</TableHead>
                  <TableHead className="pr-4 text-right">{t("admin.colActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((d, idx) => (
                  <DepartmentRow
                    key={d.id}
                    department={d}
                    t={t}
                    index={idx}
                    onEdit={() => setEditing(d)}
                  />
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile cards ---------------------------------------------------- */}
          <ul className="space-y-3 md:hidden" aria-label={t("admin.departmentsTitle")}>
            {data.map((d, idx) => (
              <DepartmentCard
                key={d.id}
                department={d}
                t={t}
                index={idx}
                onEdit={() => setEditing(d)}
              />
            ))}
          </ul>
        </>
      )}

      {/* Create dialog ------------------------------------------------------ */}
      <DepartmentDialog
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={(v) => createMutation.mutate(v)}
        isSubmitting={createMutation.isPending}
        serverError={
          createMutation.error
            ? {
                message: (createMutation.error as Error).message,
                fieldErrors: (createMutation.error as { fieldErrors?: Record<string, string> })
                  .fieldErrors,
              }
            : null
        }
        t={t}
      />

      {/* Edit dialog -------------------------------------------------------- */}
      <DepartmentDialog
        mode="edit"
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        department={editing}
        onSubmit={(v) => editing && updateMutation.mutate({ ...v, id: editing.id })}
        isSubmitting={updateMutation.isPending}
        serverError={
          updateMutation.error
            ? {
                message: (updateMutation.error as Error).message,
                fieldErrors: (updateMutation.error as { fieldErrors?: Record<string, string> })
                  .fieldErrors,
              }
            : null
        }
        t={t}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row / Card sub-components
// ---------------------------------------------------------------------------
type RowProps = {
  department: Department;
  t: ReturnType<typeof useTranslations>["t"];
  index: number;
  onEdit: () => void;
};

function DepartmentRow({ department, t, index, onEdit }: RowProps) {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, delay: Math.min(index * 0.03, 0.18) }}
      className="transition-colors hover:bg-primary/5"
    >
      <TableCell className="pl-4 py-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="line-clamp-1 font-medium text-foreground">{department.name}</p>
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
              {department.description}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell className="py-3 text-sm text-foreground/80">
        {department.head_name ?? "—"}
      </TableCell>
      <TableCell className="py-3 text-right tabular-nums">
        <span className="inline-flex items-center gap-1 text-sm text-foreground/80">
          <Users className="size-3.5 text-muted-foreground" aria-hidden />
          {department.officer_count}
        </span>
      </TableCell>
      <TableCell className="py-3 text-right tabular-nums">
        <span className="inline-flex items-center gap-1 text-sm text-foreground/80">
          <CircleDot className="size-3.5 text-muted-foreground" aria-hidden />
          {department.active_complaints}
        </span>
      </TableCell>
      <TableCell className="py-3 text-right">
        <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-sm font-medium text-primary">
          <Gauge className="size-3.5" aria-hidden />
          {department.avg_resolution_days}
        </span>
      </TableCell>
      <TableCell className="pr-4 py-3 text-right">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={onEdit}>
          <Pencil className="size-3.5" aria-hidden />
          {t("common.edit")}
        </Button>
      </TableCell>
    </motion.tr>
  );
}

function DepartmentCard({ department, t, index, onEdit }: RowProps) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.04, 0.24) }}
    >
      <Card className="py-4">
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-foreground">{department.name}</h3>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                {department.description}
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-2 border-t border-border/60 pt-3 text-xs">
            <div>
              <dt className="text-muted-foreground">{t("admin.colHead")}</dt>
              <dd className="mt-0.5 font-medium text-foreground/80">
                {department.head_name ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("admin.colSla")}</dt>
              <dd className="mt-0.5 font-medium text-primary">
                {department.avg_resolution_days} {t("admin.colSla").toLowerCase()}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("admin.colOfficers")}</dt>
              <dd className="mt-0.5 inline-flex items-center gap-1 font-medium text-foreground/80">
                <Users className="size-3" aria-hidden />
                {department.officer_count}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("admin.colActive")}</dt>
              <dd className="mt-0.5 inline-flex items-center gap-1 font-medium text-foreground/80">
                <CircleDot className="size-3" aria-hidden />
                {department.active_complaints}
              </dd>
            </div>
          </dl>

          <div className="flex justify-end border-t border-border/60 pt-3">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={onEdit}>
              <Pencil className="size-3.5" aria-hidden />
              {t("common.edit")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.li>
  );
}

// ---------------------------------------------------------------------------
// DepartmentDialog — shared by Create + Edit (RHF + zod)
// ---------------------------------------------------------------------------
type DialogProps = {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department?: Department | null;
  onSubmit: (values: EditValues) => void;
  isSubmitting: boolean;
  serverError: { message: string; fieldErrors?: Record<string, string> } | null;
  t: ReturnType<typeof useTranslations>["t"];
};

function DepartmentDialog({
  mode,
  open,
  onOpenChange,
  department,
  onSubmit,
  isSubmitting,
  serverError,
  t,
}: DialogProps) {
  // The zod schema is rebuilt per-render so min-length messages track locale.
  // Input and output types intentionally match `EditValues` so the resolver
  // type-checks against `useForm<EditValues>` without coercion drift.
  const schema = useMemo(
    () =>
      z.object({
        name: z.string().trim().min(1, t("common.required")),
        head_name: z.string().trim(),
        avg_resolution_days: z.number().int().min(1).max(365),
        description: z.string().trim(),
      }),
    [t]
  );

  const defaultValues: EditValues = {
    name: department?.name ?? "",
    head_name: department?.head_name ?? "",
    avg_resolution_days: department?.avg_resolution_days ?? 7,
    description: department?.description ?? "",
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues,
  });

  // Sync form defaults whenever the dialog opens for a different department.
  // Using `key` on the form wrapper would also work, but resetting here keeps
  // the dialog mount/unmount animation intact.
  useEffect(() => {
    if (open) {
      reset({
        name: department?.name ?? "",
        head_name: department?.head_name ?? "",
        avg_resolution_days: department?.avg_resolution_days ?? 7,
        description: department?.description ?? "",
      });
    }
  }, [open, department, reset]);

  const title =
    mode === "create" ? t("admin.addDepartment") : t("admin.editDepartment");
  const submitLabel = mode === "create" ? t("admin.create") : t("admin.save");
  const description = t("admin.departmentsSubtitle");

  const nameError =
    serverError?.fieldErrors?.name ?? errors.name?.message ?? undefined;
  const slaError = errors.avg_resolution_days?.message ?? undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((v) => onSubmit(v))}
          className="space-y-4"
          noValidate
        >
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="dept-name" className="text-xs text-muted-foreground">
              {t("admin.deptNameLabel")}
              <span className="ml-1 text-rose-600 dark:text-rose-400">*</span>
            </Label>
            <Input
              id="dept-name"
              {...register("name")}
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? "dept-name-error" : undefined}
            />
            {nameError ? (
              <p id="dept-name-error" role="alert" className="text-xs font-medium text-destructive">
                {nameError}
              </p>
            ) : null}
          </div>

          {/* Head name */}
          <div className="space-y-1.5">
            <Label htmlFor="dept-head" className="text-xs text-muted-foreground">
              {t("admin.deptHeadLabel")}
              <span className="ml-1 text-muted-foreground/70">({t("common.optional")})</span>
            </Label>
            <Input id="dept-head" {...register("head_name")} />
          </div>

          {/* SLA */}
          <div className="space-y-1.5">
            <Label htmlFor="dept-sla" className="text-xs text-muted-foreground">
              {t("admin.deptSlaLabel")}
              <span className="ml-1 text-rose-600 dark:text-rose-400">*</span>
            </Label>
            <Input
              id="dept-sla"
              type="number"
              min={1}
              max={365}
              step={1}
              {...register("avg_resolution_days", { valueAsNumber: true })}
              aria-invalid={slaError ? true : undefined}
              aria-describedby={slaError ? "dept-sla-error" : undefined}
            />
            {slaError ? (
              <p id="dept-sla-error" role="alert" className="text-xs font-medium text-destructive">
                {slaError}
              </p>
            ) : null}
          </div>

          {/* Description (create-only — update API doesn't accept it) */}
          {mode === "create" ? (
            <div className="space-y-1.5">
              <Label htmlFor="dept-desc" className="text-xs text-muted-foreground">
                {t("admin.deptDescLabel")}
              </Label>
              <Textarea
                id="dept-desc"
                rows={3}
                {...register("description")}
                className="resize-y"
              />
            </div>
          ) : null}

          {/* Form-level error */}
          {serverError && !serverError.fieldErrors?.name ? (
            <Alert variant="destructive">
              <AlertDescription>{serverError.message}</AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-1.5">
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              {isSubmitting ? t("common.saving") : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
function DepartmentsSkeleton() {
  return (
    <Card className="py-0">
      <div className="divide-y divide-border">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5">
            <Skeleton className="size-8 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-2/5" />
              <Skeleton className="h-3 w-3/4" />
            </div>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-5 w-16 rounded-md" />
            <Skeleton className="h-7 w-16 rounded-md" />
          </div>
        ))}
      </div>
    </Card>
  );
}
