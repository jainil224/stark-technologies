# JanSunwai — AI-Powered Citizen Grievance Platform — Worklog

## Project Status (current)

A single-route Next.js 16 App Router implementation of the FRONTEND.md spec
(AI-Powered Multilingual Citizen Grievance Platform). Built frontend-only
with an in-memory mock API layer that follows the `{ success, data, error }`
envelope. Role-gated views (citizen / officer / admin) are modelled as an
in-app navigation store since the sandbox only exposes the `/` route.

## Tech & architecture decisions
- **Stack**: Next.js 16 + TS, Tailwind v4, shadcn/ui, TanStack Query, Zustand,
  react-hook-form + zod, recharts, next-themes, sonner, lucide-react.
- **i18n**: custom lightweight provider modelled on next-intl's `useTranslations`
  API, with 4 full bundles (en/hi/mr/ta) + English fallback. Avoids locale-
  segment routing (single-route constraint). Messages live in `src/messages/*.ts`.
- **Theme**: emerald/saffron civic palette (no indigo/blue). Light + dark.
- **Auth**: Zustand store; access token in memory, restore-session flag
  persisted; silent refresh via `authApi.me()` on boot.
- **Mock API**: `src/lib/api.ts` — envelope-aware, simulated latency, async
  AI classification that lands ~2s after complaint creation.

## Completed
- Foundation: `lib/types.ts`, `lib/mock-data.ts`, `lib/api.ts`, `lib/i18n.ts`,
  `lib/auth.ts`, `lib/nav.ts`, `lib/query-client.ts`, `lib/format.ts`.
- Message bundles: `messages/en.ts`, `hi.ts`, `mr.ts`, `ta.ts` (full coverage).
- Theme: civic emerald/amber palette in `globals.css`, custom scrollbar, grid bg.
- Layout + Providers: TanStack Query, next-themes, Sonner, session restore.

## In progress
- Shared shell (Header, LanguageSwitcher, Footer, badges, states).
- Auth (landing, login, register).
- Citizen portal, officer dashboard, admin module.

## Unresolved / next
- Dispatch subagents for citizen/officer/admin feature components in parallel.
- Wire all views into `src/app/page.tsx` with role-gating.
- Accessibility + sticky footer audit.
- Agent-browser self-verification.

---
Task ID: 4
Agent: full-stack-developer (citizen portal)
Task: Build citizen portal components (complaint form with voice/text/attachments, list, detail with timeline, submitted confirmation)

Work Log:
- Read worklog + foundation files (types, api, i18n, auth, nav, format, en messages, shared badges/states, shadcn/ui samples).
- Created `src/components/citizen/voice-recorder.tsx` — MediaRecorder-based recorder with simulated ASR (1.2s delay), aria-live announcements, animated waveform + elapsed timer, feature-detection fallback, full cleanup on unmount.
- Created `src/components/citizen/complaint-form.tsx` — RHF + zod form with text/voice toggle, transcript review/edit step that never auto-submits, drag-and-drop attachments (type/size validation, simulated progress), opt-in geolocation with idle/capturing/captured/denied states, department select with auto-route + 6 manual options, useMutation → complaintsApi.create with field-level server error rendering, toast + navigate to complaint_submitted on success.
- Created `src/components/citizen/complaint-list.tsx` — useQuery with 20s polling, status filter + client-side search, responsive 1/2-col card grid, AI-category spinner while pending, sorted by priority weight desc then date desc, empty/loading/error states via shared components.
- Created `src/components/citizen/status-timeline.tsx` — vertical `<ol>` timeline with colored dots, connecting line, latest-entry highlight, actor/role/timestamp.
- Created `src/components/citizen/complaint-detail.tsx` — two-column desktop layout: main column with header, original text, optional translation/transcript cards, attachments with collapsible OCR text, status timeline; sidebar with AI classification (with processing fallback), estimated resolution date, location card, duplicate-group indicator. 15s polling so AI fields land without manual refresh.
- Created `src/components/citizen/submitted-confirmation.tsx` — green check + spring animation + tasteful confetti burst, prominent reference number, view-my-complaints / file-another buttons, fallback to list view when no submittedId.
- Ran `bun run lint`: clean (0 errors, 0 warnings) across all 6 citizen files. Ran `bunx tsc --noEmit`: clean for citizen files (pre-existing errors in `auth-forms.tsx` and `header.tsx` left untouched per task scope).
- Wrote agent work record at `agent-ctx/4-full-stack-developer.md`.

Stage Summary:
- 6 files created under `src/components/citizen/`: voice-recorder.tsx, complaint-form.tsx, complaint-list.tsx, status-timeline.tsx, complaint-detail.tsx, submitted-confirmation.tsx.
- All foundation APIs/hooks/types reused as instructed (no modifications to lib files or page.tsx). Civic emerald/saffron palette only — no indigo/blue. Mobile-first responsive layouts. Every form field has Label + error text + focus state. Semantic HTML (`form`, `ol`, `button`, `section`, `aside`) and `aria-live` regions on dynamic recorder/processing states.
- Key decisions: used `useWatch` instead of RHF `watch` to satisfy `react-hooks/incompatible-library` rule; voice submit is gated behind an explicit "Use this transcript" review step (never auto-submits); department list hardcoded locally as instructed; voice recorder returns a placeholder transcript (no real ASR in mock layer) with a code comment pointing to where the production ASR call would land.
- No issues encountered that block wiring. Outstanding (not my scope): `header.tsx` imports `initials` from `@/lib/utils` (should be `@/lib/format`); `auth-forms.tsx` has duplicate `register` identifier and several type mismatches — both predate this task and were left for the owning agents.

---
Task ID: 5
Agent: full-stack-developer (officer dashboard)
Task: Build officer dashboard components (queue table with filters, complaint detail with AI fields, status update form)

Work Log:
- Read worklog + foundation files (types, api, i18n, auth, nav, format, en messages, shared badges/states, citizen status-timeline + complaint-detail for visual consistency, shadcn ui select/table/card/alert/textarea/label/input).
- Created `src/components/officer/status-update-form.tsx` — named export `StatusUpdateForm`. RHF + zod (Controller-wrapped Radix Select for status, Textarea for required min-5-char note). useMutation against `officerApi.updateStatus`; on success: sonner toast, invalidates `["officer","queue"]` + `["complaint", complaintId]`, resets note, calls `onUpdated`. Errors: `field_errors.note` rendered under textarea with aria-invalid/role=alert; otherwise `<Alert variant="destructive">`. Submit disabled while pending or invalid.
- Created `src/components/officer/queue-table.tsx` — default export `OfficerQueue`. useQuery(`["officer","queue", apiFilters]`, 20s poll) of `officerApi.listQueue`; status & priority filters sent to API (server-enforced dept scope), search is client-side over title/reference/citizen. Summary chips (total / urgent / open) computed on API list. Department badge in header (prefers first complaint's `department_name`). Desktop: shadcn `<Table>` with row-as-button (`tabIndex=0`, Enter/Space activate) → navigate `officer_detail`. Mobile: stacked motion cards. Sort: priority weight desc → submitted_at desc. Loading: custom QueueSkeleton. Error: `<ErrorState onRetry>`. Empty: `<EmptyState icon={Inbox}>`.
- Created `src/components/officer/officer-detail.tsx` — default export `OfficerDetail`. useQuery(`["complaint", complaintId]`, 15s poll) of `complaintsApi.getById`. Back button → `officer_queue`. Two-column desktop / single-column mobile. Main: header card (ref, title, badges, submitted/updated, status desc), raw text card, optional translation + voice transcript cards, attachments list, AI-assisted analysis panel (amber-tinted, Brain icon, "AI-assisted" pill, ai_category/PriorityBadge/confidence progress/ai_summary, Processing… state while pending, repeated disclaimer), duplicate-group callout (GitBranch) if duplicate_count>1. Sidebar: `<StatusUpdateForm>`, reused `<StatusTimeline>` from `@/components/citizen/status-timeline`, citizen-info mini-card.
- Ran `bun run lint`: 0 errors, 0 warnings across all 3 officer files. Ran `bunx tsc --noEmit`: no errors in `src/components/officer/*` (pre-existing errors in auth-forms.tsx and header.tsx `initials` import left untouched per task scope).
- Wrote agent work record at `agent-ctx/5-full-stack-developer.md`.

Stage Summary:
- 3 files created under `src/components/officer/`: status-update-form.tsx (named `StatusUpdateForm`), queue-table.tsx (default `OfficerQueue`), officer-detail.tsx (default `OfficerDetail`).
- All foundation APIs/hooks/types/i18n reused as instructed (no modifications to lib files, page.tsx, layout.tsx, or other agents' components). Civic emerald/saffron palette only — no indigo/blue; AI panel uses amber tint to distinguish AI-generated content from facts. Mobile-first responsive (table → stacked cards below md; detail 3-col → 1-col below lg). Semantic HTML (`table/thead/tbody/tr/th scope`, `form`, `label`, `button`, `aside`) and keyboard-navigable rows with visible focus rings.
- Key decisions: singular query key `["complaint", complaintId]` for officer detail matches the spec's literal invalidation key; queue uses `["officer","queue", apiFilters]` so filter changes refetch; StatusUpdateForm invalidates both so an officer's update surfaces in the queue and the open detail view without a manual reload; AI-assisted panel uses Brain icon + amber tint + explicit "AI-assisted" pill + repeated disclaimer footnote to clearly separate AI-generated suggestions from factual complaint data; zod schema rebuilt in-component (memoised on `t`) so the locale-specific min-length error message tracks the active locale.
- No issues encountered that block wiring. Outstanding (not my scope): `header.tsx` imports `initials` from `@/lib/utils` (should be `@/lib/format`); `auth-forms.tsx` has several type mismatches — both predate this task and remain owned by their respective agents.

---
Task ID: 6
Agent: full-stack-developer (admin module)
Task: Build admin module components (departments CRUD + SLA editing, analytics charts, user role management)

Work Log:
- Read worklog + foundation files (types, api, i18n, auth, nav, format, en messages, shared badges/states, shadcn ui samples: tabs/dialog/table/avatar/badge/progress/skeleton/alert, citizen complaint-list + officer queue-table for visual consistency, officer status-update-form for the RHF+zod mutation pattern).
- Created `src/components/admin/admin-shell.tsx` — default export `AdminShell`. Renders a page header (`nav.adminConsole`) + a controlled shadcn `<Tabs>` whose `value` is bound to `useNav((s) => s.view)` and `onValueChange` calls `navigate(view as View)`. Tabs cover `admin_departments` / `admin_analytics` / `admin_users` with the i18n labels `admin.tabsDepartments`/`tabsAnalytics`/`tabsUsers`. Renders the matching child (`AdminDepartments` / `AdminAnalytics` / `AdminUsers`) below the tabs. Falls back to `admin_analytics` (the spec's default admin landing view) if rendered outside any known admin view.
- Created `src/components/admin/departments.tsx` — default export `AdminDepartments`. `useQuery(["admin","departments"])` against `adminApi.listDepartments`. Desktop `<Table>` (Department with Building2 icon + name + description, Head, Officers, Active, SLA days shown in a primary pill with a Gauge icon, Edit button) and mobile stacked cards. Add + Edit go through a single shared `<DepartmentDialog>` (RHF + zod, mode-aware title/submit label). Create sends `{name, description, avg_resolution_days, head_name?}` to `adminApi.createDepartment`; Edit sends `{id, name, head_name?, avg_resolution_days}` to `adminApi.updateDepartment`. Both mutations invalidate `["admin","departments"]` (and analytics for updates since SLA feeds compliance) and toast `admin.created`/`admin.saved`. Server `field_errors.name` rendered inline; form-level errors rendered in a destructive Alert. Loading skeleton + ErrorState + EmptyState. `useEffect` re-seeds form defaults when the dialog opens for a different department.
- Created `src/components/admin/analytics.tsx` — default export `AdminAnalytics`. `useQuery(["admin","analytics"], 30s poll)` against `adminApi.analytics`. KPI cards row (4): total complaints, open, resolved, avg resolution days — tone-tinted (default/open-amber/resolved-emerald/sla-primary) with lucide icons (FileText/Clock/CheckCircle2/Gauge). SLA compliance card with `<Progress>`. Four recharts wrapped in `ResponsiveContainer` (fixed heights): trend `<LineChart>` (filed amber + resolved emerald over the 14-day `data.trend`), by-status `<PieChart>` donut (status hex palette per the spec mapping — in_progress uses teal #0d9488 NOT sky blue), by-priority `<BarChart>` (priority hex palette), by-department horizontal stacked `<BarChart>` (resolved emerald + open amber). Every chart has a sibling text-equivalent `<Table>` with a `sr-only` `<TableCaption>` for screen readers (TrendTable shows the most recent 7 days; StatusTable/PriorityTable/DepartmentTable show full breakdowns). Tooltip + Legend labels localised via `t("status.X")` / `t("priority.X")`. Hardcoded `STATUS_COLORS`/`PRIORITY_COLORS`/`TREND_FILED`/`TREND_RESOLVED` consts keep chart palette on the civic emerald/amber theme — no indigo/blue brand colours. Loading: AnalyticsSkeleton; Error: ErrorState.
- Created `src/components/admin/users.tsx` — default export `AdminUsers`. `useQuery(["admin","users"])` + `useQuery(["admin","departments"])` (needed for dept id→name mapping + role-change dialog dropdown). Desktop `<Table>` and mobile cards: avatar (AvatarFallback with user.avatar_color + `initials(name)`), name + email + "self" tag if `user.id === currentUser.id`, role Badge (capitalised, role-tinted), Department (mapped to name, falls back to "—"), Joined (`formatDate(created_at, locale)`), Change-role button (disabled when isSelf to avoid lockout). Client-side search over name+email. Change-role dialog uses RHF + Controller-wrapped Radix Selects: role select (citizen/officer/admin) + conditional department select (officers only, populated from the departments query). Mutation calls `adminApi.updateUserRole({user_id, role, department_id})` (department_id sent only for officer; null otherwise), toasts `admin.roleUpdated`, invalidates `["admin","users"]` + `["admin","departments"]` (officer counts shift on role change). Self-edit shows a ShieldAlert Alert and disables the submit button.
- Ran `bun run lint`: 0 errors, 0 warnings across all 4 admin files. Initially hit two warnings: an unused `eslint-disable` directive (removed by listing `[open, department, reset]` as proper effect deps) and `react-hooks/incompatible-library` on RHF `watch()` — fixed by switching to `useWatch({ control, name: "role" })` (subscription-based) per the React Compiler guidance and prior agents' notes.
- Ran `bunx tsc --noEmit`: clean for all `src/components/admin/*` (initial schema/resolver type drift from `z.coerce.number()` + `.default("")` was fixed by tightening the zod schema so input/output types match `EditValues` exactly, and using `valueAsNumber: true` on the SLA input register instead). Pre-existing errors in `auth-forms.tsx`, `header.tsx` (`initials` import), and `mock-data.ts` are out of scope and left untouched per the task boundary.
- Wrote agent work record at `agent-ctx/6-full-stack-developer.md`.

Stage Summary:
- 4 files created under `src/components/admin/`: admin-shell.tsx (default `AdminShell`), departments.tsx (default `AdminDepartments`), analytics.tsx (default `AdminAnalytics`), users.tsx (default `AdminUsers`).
- All foundation APIs/hooks/types/i18n reused as instructed (no modifications to lib files, page.tsx, layout.tsx, or other agents' components). Civic emerald/saffron palette only — no indigo/blue brand colours; chart status/priority colours follow the spec mapping (in_progress=teal #0d9488, not sky blue, to stay safely outside the no-blue rule for charts). Mobile-first responsive: admin shell tabs are full-width on mobile; departments/users tables collapse to stacked cards below `md`; analytics grid collapses 4→2 KPI columns on mobile and 2→1 chart cards.
- Semantic HTML throughout: `section`/`header`/`form`/`label`/`button`/`table`/`thead`/`tbody`/`tr`/`th scope`/`td`/`dl`/`dt`/`dd`/`time`/`caption`. Every analytics chart has a `<TableCaption className="sr-only">` + visible rows for screen-reader parity (FRONTEND.md §9). All form fields have associated `<Label htmlFor>` + `aria-invalid`/`aria-describedby` on errors. Tables use `tabular-nums` for aligned numeric columns. Department SLA cell uses a primary-tinted pill so the editable column stands out.
- Key decisions: (1) shared `<DepartmentDialog>` for both create + edit (mode prop switches title/submit/description-visibility) — avoids duplicating RHF wiring; (2) `useEffect` re-seeds form defaults when the dialog opens for a different entity rather than `useMemo` (which would run during render and is a side-effect); (3) `useWatch` instead of RHF `watch()` to satisfy the React Compiler rule (matches the citizen-portal agent's approach); (4) zod schema intentionally avoids `z.coerce.number()` + `.default("")` so the resolver's input/output types match `EditValues` exactly — the SLA `<Input type="number">` instead uses RHF's `valueAsNumber: true` register option; (5) admin shell default-falls-back to `admin_analytics` (the spec's default admin landing view) rather than throwing when `view` isn't an admin view; (6) update mutation also invalidates `["admin","analytics"]` because SLA days feed SLA compliance %.
- No issues encountered that block wiring. Outstanding (not my scope): `header.tsx` imports `initials` from `@/lib/utils` (should be `@/lib/format`) — pre-existing, breaks `/` route compilation until the owning agent fixes it; `auth-forms.tsx` has duplicate `register` identifier and several type mismatches — both predate this task and remain owned by their respective agents. Wiring my `<AdminShell />` into `page.tsx` for `role === "admin"` (and mapping the three `admin_*` views to it) is left to the integrator per the task boundary.

---
Task ID: 7-9
Agent: orchestrator (integration + self-verification)
Task: Wire all feature views into page.tsx with role-gating; fix foundation issues flagged by subagents; agent-browser self-verification; create recurring review cron job.

Work Log:
- Fixed `auth-forms.tsx`: renamed shadowed `register` (auth store) → `registerUser`; switched RHF `watch()` → `useWatch()` to satisfy react-hooks/incompatible-library rule.
- Fixed `header.tsx`: `initials` now imported from `@/lib/format` (was wrongly from `@/lib/utils`).
- Fixed `mock-data.ts`: typed `trend` array as `AnalyticsSummary["trend"]` to resolve `never[]` inference.
- Wired `src/app/page.tsx`: single renderView() switch over all 11 views (landing, login, register, complaint_new/list/detail/submitted, officer_queue/detail, admin_departments/analytics/users). Role-gating effect enforces: unauthenticated → login; authed on public views → role home; cross-role access → redirect + toast; detail views without selectedId → list/queue.
- Agent-browser verification (all passed):
  - Landing: hero, 4 steps, 4 features, 3 demo-account cards render.
  - Citizen (Priya) demo login → My Complaints (4 cards) → complaint detail (reference, status/priority badges, original + Hindi translation, attachment w/ OCR, full 3-entry status timeline).
  - Filed a new complaint (title + description) → "Complaint submitted" confirmation + toast; the new complaint appeared in the officer's PWD queue (auto-routed).
  - Officer (Karan) demo login → Department Queue (3 PWD-scoped complaints, status/priority filters, search, table on desktop) → officer detail (AI-assisted analysis panel clearly labeled "AI-ASSISTED" with 94% confidence bar + summary + disclaimer, duplicate-group callout "4 complaints", status-update form in sidebar).
  - Admin (Aditya) demo login → Admin Console tabs: Analytics (4 recharts: trend line, status donut, priority bar, dept stacked bar — 14 SVG elements / 4 containers — each with accessible text table), Departments (CRUD table + Add), Users (role table + self-edit lockout: Aditya's Change-role disabled).
  - Language switcher: Hindi translates entire UI (नेवि, शीर्षक, कॉलम) and persists across navigation.
  - Sticky footer: verified — on a 1000px viewport the footer sits at the viewport bottom (footerTop=927, viewportHeight=1000, footerAtViewportBottom=true, gapAboveFooter=0); on long pages it is pushed down naturally.
  - No console errors, no page errors. `bun run lint` clean. `tsc --noEmit` clean (excluding pre-existing examples/skills dirs).

Stage Summary:
- All 8 phased build objectives (F0–F7 equivalent) are functionally complete and browser-verified.
- Foundation + 3 parallel feature modules (citizen / officer / admin) integrated into a single role-gated page shell.
- 4-language i18n (en/hi/mr/ta) with English fallback, persisted preference.
- Mock API envelope + async AI classification (lands ~2s after submit) + optimistic UX + 15–20s polling.
- Accessibility: semantic HTML, aria-live for recording, chart text-equivalents, keyboard-navigable table rows, visible focus.
- Sticky footer, responsive (mobile cards / desktop tables), light/dark theme, emerald/saffron civic palette (no indigo/blue).
- Created recurring webDevReview cron job (every 15 min) to continue QA + feature expansion.
