"use client";

import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Search, Users as UsersIcon, ShieldAlert, Loader2, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

import { useTranslations } from "@/lib/i18n";
import { useAuthStore } from "@/lib/auth";
import { adminApi } from "@/lib/api";
import { formatDate, initials } from "@/lib/format";
import type { Department, Role, User } from "@/lib/types";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// AdminUsers — default export
//
// Lists every platform user in a desktop table / mobile cards. Client-side
// search over name + email. Each row has a "Change role" button that opens a
// dialog with a role <Select> and (for officers) a department <Select>
// populated from the admin departments list. The current admin cannot change
// their own role to avoid locking themselves out.
// ---------------------------------------------------------------------------

const ROLES: Role[] = ["citizen", "officer", "admin"];

const ROLE_BADGE: Record<Role, string> = {
  citizen:
    "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700",
  officer:
    "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900",
  admin:
    "bg-primary/10 text-primary border-primary/30",
};

type RoleFormValues = {
  role: Role;
  department_id: string;
};

export default function AdminUsers() {
  const { t, locale } = useTranslations();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<User | null>(null);

  // Fetch both users and departments — we need dept id → name mapping and the
  // full list to populate the role-change dialog.
  const usersQuery = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const { data, error } = await adminApi.listUsers();
      if (error || !data) throw error ?? new Error("Failed to load");
      return data;
    },
  });

  const deptsQuery = useQuery({
    queryKey: ["admin", "departments"],
    queryFn: async () => {
      const { data, error } = await adminApi.listDepartments();
      if (error || !data) throw error ?? new Error("Failed to load");
      return data;
    },
  });

  const deptNameById = useMemo(() => {
    const map = new Map<string, Department>();
    deptsQuery.data?.forEach((d) => map.set(d.id, d));
    return map;
  }, [deptsQuery.data]);

  // Filter users client-side by name/email.
  const items = useMemo<User[]>(() => {
    if (!usersQuery.data) return [];
    const q = search.trim().toLowerCase();
    const list = q
      ? usersQuery.data.filter((u) =>
          `${u.name} ${u.email}`.toLowerCase().includes(q)
        )
      : [...usersQuery.data];
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [usersQuery.data, search]);

  // --- Role mutation -----------------------------------------------------
  const roleMutation = useMutation({
    mutationFn: async (values: RoleFormValues & { user_id: string }) => {
      const { data, error } = await adminApi.updateUserRole({
        user_id: values.user_id,
        role: values.role,
        department_id: values.role === "officer" ? values.department_id : null,
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
      toast.success(t("admin.roleUpdated"));
      void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "departments"] });
      setEditing(null);
    },
  });

  return (
    <div className="space-y-5">
      {/* Header ------------------------------------------------------------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {t("admin.usersTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("admin.usersSubtitle")}</p>
        </div>
      </div>

      {/* Search bar --------------------------------------------------------- */}
      <div className="space-y-1.5 sm:max-w-sm">
        <Label htmlFor="admin-users-search" className="text-xs text-muted-foreground">
          {t("common.search")}
        </Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            id="admin-users-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("common.search")}
            className="pl-9"
            type="search"
          />
        </div>
      </div>

      {/* Body --------------------------------------------------------------- */}
      {usersQuery.isLoading || deptsQuery.isLoading ? (
        <UsersSkeleton />
      ) : usersQuery.isError ? (
        <ErrorState
          message={(usersQuery.error as Error)?.message ?? t("errors.generic")}
          onRetry={() => void usersQuery.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title={t("common.noResults")}
          description={t("admin.usersSubtitle")}
        />
      ) : (
        <>
          {/* Desktop table --------------------------------------------------- */}
          <Card className="hidden py-0 md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="pl-4">{t("admin.colName")}</TableHead>
                  <TableHead>{t("admin.colRole")}</TableHead>
                  <TableHead>{t("admin.colDept")}</TableHead>
                  <TableHead>{t("admin.colJoined")}</TableHead>
                  <TableHead className="pr-4 text-right">{t("admin.colActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((u, idx) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    locale={locale}
                    deptName={u.department_id ? deptNameById.get(u.department_id)?.name ?? null : null}
                    t={t}
                    index={idx}
                    isSelf={!!currentUser && currentUser.id === u.id}
                    onChangeRole={() => setEditing(u)}
                  />
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile cards ---------------------------------------------------- */}
          <ul className="space-y-3 md:hidden" aria-label={t("admin.usersTitle")}>
            {items.map((u, idx) => (
              <UserCard
                key={u.id}
                user={u}
                locale={locale}
                deptName={u.department_id ? deptNameById.get(u.department_id)?.name ?? null : null}
                t={t}
                index={idx}
                isSelf={!!currentUser && currentUser.id === u.id}
                onChangeRole={() => setEditing(u)}
              />
            ))}
          </ul>
        </>
      )}

      {/* Change role dialog ------------------------------------------------- */}
      <ChangeRoleDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        user={editing}
        departments={deptsQuery.data ?? []}
        isSelf={!!editing && !!currentUser && editing.id === currentUser.id}
        isSubmitting={roleMutation.isPending}
        serverError={
          roleMutation.error
            ? {
                message: (roleMutation.error as Error).message,
                fieldErrors: (roleMutation.error as { fieldErrors?: Record<string, string> })
                  .fieldErrors,
              }
            : null
        }
        t={t}
        onSubmit={(v) => editing && roleMutation.mutate({ ...v, user_id: editing.id })}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row / Card sub-components
// ---------------------------------------------------------------------------
type RowProps = {
  user: User;
  locale: ReturnType<typeof useTranslations>["locale"];
  deptName: string | null;
  t: ReturnType<typeof useTranslations>["t"];
  index: number;
  isSelf: boolean;
  onChangeRole: () => void;
};

function UserRow({ user, locale, deptName, t, index, isSelf, onChangeRole }: RowProps) {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, delay: Math.min(index * 0.02, 0.18) }}
      className="transition-colors hover:bg-primary/5"
    >
      <TableCell className="pl-4 py-3">
        <div className="flex items-center gap-2.5">
          <Avatar className="size-8">
            <AvatarFallback
              style={{ backgroundColor: user.avatar_color ?? "var(--muted)" }}
              className="text-xs font-semibold text-white"
            >
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 line-clamp-1 font-medium text-foreground">
              {user.name}
              {isSelf ? (
                <span className="rounded bg-primary/10 px-1 text-[10px] uppercase tracking-wide text-primary">
                  {t("nav.dashboard")}
                </span>
              ) : null}
            </p>
            <p className="line-clamp-1 text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="py-3">
        <Badge variant="outline" className={cn("capitalize", ROLE_BADGE[user.role])}>
          {user.role}
        </Badge>
      </TableCell>
      <TableCell className="py-3 text-sm text-foreground/80">
        {deptName ?? <span className="text-muted-foreground">—</span>}
      </TableCell>
      <TableCell className="py-3 text-xs text-muted-foreground">
        <time dateTime={user.created_at}>{formatDate(user.created_at, locale)}</time>
      </TableCell>
      <TableCell className="pr-4 py-3 text-right">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={onChangeRole}
          disabled={isSelf}
          title={isSelf ? t("admin.changeRole") : undefined}
        >
          <Pencil className="size-3.5" aria-hidden />
          {t("admin.changeRole")}
        </Button>
      </TableCell>
    </motion.tr>
  );
}

function UserCard({ user, locale, deptName, t, index, isSelf, onChangeRole }: RowProps) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.2) }}
    >
      <Card className="py-4">
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2.5">
            <Avatar className="size-10">
              <AvatarFallback
                style={{ backgroundColor: user.avatar_color ?? "var(--muted)" }}
                className="text-sm font-semibold text-white"
              >
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="flex items-center gap-1.5 line-clamp-1 font-semibold text-foreground">
                {user.name}
                {isSelf ? (
                  <span className="rounded bg-primary/10 px-1 text-[10px] uppercase tracking-wide text-primary">
                    {t("nav.dashboard")}
                  </span>
                ) : null}
              </h3>
              <p className="line-clamp-1 text-xs text-muted-foreground">{user.email}</p>
            </div>
            <Badge variant="outline" className={cn("capitalize", ROLE_BADGE[user.role])}>
              {user.role}
            </Badge>
          </div>

          <dl className="grid grid-cols-2 gap-2 border-t border-border/60 pt-3 text-xs">
            <div>
              <dt className="text-muted-foreground">{t("admin.colDept")}</dt>
              <dd className="mt-0.5 line-clamp-1 font-medium text-foreground/80">
                {deptName ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("admin.colJoined")}</dt>
              <dd className="mt-0.5 font-medium text-foreground/80">
                <time dateTime={user.created_at}>{formatDate(user.created_at, locale)}</time>
              </dd>
            </div>
          </dl>

          <div className="flex justify-end border-t border-border/60 pt-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={onChangeRole}
              disabled={isSelf}
            >
              <Pencil className="size-3.5" aria-hidden />
              {t("admin.changeRole")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.li>
  );
}

// ---------------------------------------------------------------------------
// ChangeRoleDialog (RHF + Controller-wrapped Selects)
// ---------------------------------------------------------------------------
type ChangeRoleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  departments: Department[];
  isSelf: boolean;
  isSubmitting: boolean;
  serverError: { message: string; fieldErrors?: Record<string, string> } | null;
  t: ReturnType<typeof useTranslations>["t"];
  onSubmit: (values: RoleFormValues) => void;
};

function ChangeRoleDialog({
  open,
  onOpenChange,
  user,
  departments,
  isSelf,
  isSubmitting,
  serverError,
  t,
  onSubmit,
}: ChangeRoleDialogProps) {
  const { control, handleSubmit, reset } = useForm<RoleFormValues>({
    defaultValues: {
      role: user?.role ?? "citizen",
      department_id: user?.department_id ?? "",
    },
  });

  // Re-seed defaults whenever the dialog targets a different user.
  useEffect(() => {
    if (open && user) {
      reset({
        role: user.role,
        department_id: user.department_id ?? departments[0]?.id ?? "",
      });
    }
  }, [open, user, departments, reset]);

  // `useWatch` (subscription-based) instead of RHF's `watch()` to satisfy the
  // react-hooks/incompatible-library rule per the React Compiler guidance.
  const selectedRole = useWatch({ control, name: "role" });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("admin.changeRole")}</DialogTitle>
          <DialogDescription>
            {user ? `${user.name} · ${user.email}` : t("admin.usersSubtitle")}
          </DialogDescription>
        </DialogHeader>

        {isSelf ? (
          <Alert>
            <ShieldAlert className="size-4" aria-hidden />
            <AlertDescription>
              {t("auth.adminNote")}
            </AlertDescription>
          </Alert>
        ) : null}

        <form
          onSubmit={handleSubmit((v) => onSubmit(v))}
          className="space-y-4"
          noValidate
        >
          {/* Role */}
          <div className="space-y-1.5">
            <Label htmlFor="role-select" className="text-xs text-muted-foreground">
              {t("admin.colRole")}
            </Label>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => field.onChange(v as Role)}
                  disabled={isSelf}
                >
                  <SelectTrigger id="role-select" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r} className="capitalize">
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Department (officers only) */}
          {selectedRole === "officer" ? (
            <div className="space-y-1.5">
              <Label htmlFor="dept-select" className="text-xs text-muted-foreground">
                {t("admin.assignDept")}
              </Label>
              <Controller
                control={control}
                name="department_id"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSelf || departments.length === 0}
                  >
                    <SelectTrigger id="dept-select" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          ) : null}

          {/* Server error */}
          {serverError ? (
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
            <Button type="submit" disabled={isSubmitting || isSelf} className="gap-1.5">
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              {isSubmitting ? t("common.saving") : t("common.save")}
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
function UsersSkeleton() {
  return (
    <Card className="py-0">
      <div className="divide-y divide-border">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-2/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-24 rounded-md" />
          </div>
        ))}
      </div>
    </Card>
  );
}
