# Task 6 — Admin Module — Work Record

**Agent**: full-stack-developer (admin module)
**Task**: Build admin module components (departments CRUD + SLA editing, analytics charts, user role management)

## Files created

All under `/home/z/my-project/src/components/admin/`:

| File | Default export | Purpose |
|---|---|---|
| `admin-shell.tsx` | `AdminShell` | Page header + controlled `<Tabs>` over the three admin sub-views (`admin_departments` / `admin_analytics` / `admin_users`), bound to the nav store. |
| `departments.tsx` | `AdminDepartments` | Table + mobile cards, Add/Edit dialogs (RHF + zod) calling `adminApi.createDepartment` / `adminApi.updateDepartment`. |
| `analytics.tsx` | `AdminAnalytics` | KPI cards + SLA progress + four recharts (trend line, status pie, priority bar, dept horizontal stacked bar) with accessible text-equivalent tables. |
| `users.tsx` | `AdminUsers` | Table + mobile cards, client-side search, Change-role dialog (RHF + Controller-wrapped Selects) calling `adminApi.updateUserRole`. |

## Foundation reused (no edits)
- `lib/types.ts` — `Department`, `User`, `AnalyticsSummary`, `Role`, etc.
- `lib/api.ts` — `adminApi.listDepartments / createDepartment / updateDepartment / analytics / listUsers / updateUserRole`.
- `lib/i18n.ts` — `useTranslations()` → `{ locale, t }`.
- `lib/auth.ts` — `useAuthStore((s) => s.user)` for the current admin (self-edit lockout in Users).
- `lib/nav.ts` — `useNav((s) => s.view)` for active-tab highlighting; `useNav((s) => s.navigate)` for tab switching.
- `lib/format.ts` — `formatDate`, `initials`.
- `components/shared/states.tsx` — `EmptyState`, `ErrorState`.
- shadcn/ui: `tabs`, `dialog`, `table`, `button`, `input`, `label`, `textarea`, `select`, `card`, `badge`, `alert`, `avatar`, `progress`, `skeleton`.
- `recharts`, `lucide-react`, `framer-motion`, `sonner`, `react-hook-form` + `zod`, `@tanstack/react-query`.

## Design / architecture decisions
1. **Shared dialog for create + edit** in departments.tsx — single RHF form, `mode` prop switches title/submit/description visibility. Avoids duplicating form wiring.
2. **`useEffect` re-seeds form defaults** when the dialog opens for a different entity (not `useMemo` — that would run a side-effect during render).
3. **`useWatch({ control, name: "role" })`** instead of RHF `watch("role")` in users.tsx — satisfies the `react-hooks/incompatible-library` rule per React Compiler guidance. Matches the approach taken by the citizen-portal agent.
4. **Zod schema shaped to match `EditValues` exactly** — avoided `z.coerce.number()` + `.default("")` (which would drift the resolver's input/output types from `EditValues`). The SLA `<Input type="number">` instead uses RHF's `valueAsNumber: true` register option.
5. **Admin shell default-falls-back to `admin_analytics`** rather than throwing when `view` isn't an admin view — defensive against being rendered outside its scope.
6. **Update mutation also invalidates `["admin","analytics"]`** because SLA days feed SLA compliance %.
7. **Chart palette** — hardcoded `STATUS_COLORS` / `PRIORITY_COLORS` consts in analytics.tsx keep chart colours on the civic emerald/amber theme. `in_progress` uses teal `#0d9488` (NOT sky blue) to stay safely outside the no-blue rule for charts.
8. **Every chart has a text-equivalent table** (FRONTEND.md §9) — `<TableCaption className="sr-only">` + visible rows for screen-reader parity. TrendTable shows the most recent 7 days; StatusTable/PriorityTable/DepartmentTable show full breakdowns.
9. **Self-edit lockout in Users** — `user.id === currentUser.id` disables the "Change role" button and shows a `ShieldAlert` Alert in the dialog, preventing admins from demoting themselves.

## Lint / typecheck status
- `bun run lint`: **0 errors, 0 warnings** across all 4 admin files.
- `bunx tsc --noEmit`: clean for all `src/components/admin/*`.
- Pre-existing errors elsewhere (`header.tsx`, `auth-forms.tsx`, `mock-data.ts`) are out of scope and left untouched per the task boundary.

## Outstanding (not my scope)
- `header.tsx` imports `initials` from `@/lib/utils` (should be `@/lib/format`) — pre-existing, breaks `/` route compilation until the owning agent fixes it.
- `auth-forms.tsx` has a duplicate `register` identifier and several type mismatches — pre-existing.
- Wiring `<AdminShell />` into `page.tsx` for `role === "admin"` (and mapping the three `admin_*` views to it) is left to the integrator per the task boundary.
