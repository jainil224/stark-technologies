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

---
Task ID: 10
Agent: full-stack-developer (analytics enhancement)
Task: Enhance admin analytics — KPI sparklines + trend badges, replace donut with horizontal bar chart, collapsible text tables, fix labeling

Work Log:
- Read worklog + foundation files (types, api, i18n, format, mock-data buildAnalytics for the trend shape), existing analytics.tsx, shadcn collapsible/badge/button components.
- Added 7 new i18n keys to ALL 4 bundles (en/hi/mr/ta) under `admin.*`: `lastUpdated` ("Updated {time}"), `showTable`, `hideTable`, `trendUp` ("Up {pct}%"), `trendDown` ("Down {pct}%"), `vsLastWeek`, `noTrend`.
- Rewrote `src/components/admin/analytics.tsx` from scratch with the following enhancements:
  1. **KPI cards with sparklines + trend badges** — each KPI card now renders: tone-tinted icon (top-left), big number + label, then a bottom row with a 14-day sparkline (recharts `<LineChart>` at 40px height, no axes/grid/tooltip, `isAnimationActive={false}`) on the left and a `<TrendBadge>` pill on the right. Total → filed-volume sparkline (amber) + trend comparing last-7 vs prev-7 days filed (favorable = down). Open → cumulative (filed − resolved) backlog sparkline + trend on the same series (favorable = down). Resolved → resolved-volume sparkline (emerald) + trend (favorable = up). Avg resolution → flat-line sparkline of `data.avg_resolution_days` + "No prior data" badge (no per-day avg available in the API). TrendBadge uses `TrendingUp`/`TrendingDown` icons reflecting the actual change direction, with emerald tint when favorable and amber when unfavorable. framer-motion entrance animation on each card (opacity + y, staggered 0.05s delay).
  2. **Replaced the "By status" donut with a horizontal bar chart** — `recharts <BarChart layout="vertical">` with `YAxis type="category" dataKey="status"` (translated labels) and `XAxis type="number"`. Each `<Cell>` coloured per `STATUS_COLORS[status]` (existing palette). Added a `<LabelList dataKey="count" position="right">` for inline data labels at the end of each bar. Removed the misleading donut entirely.
  3. **Made all text-equivalent tables collapsible** — introduced a `CollapsibleTable` wrapper (shadcn `<Collapsible>` + `<CollapsibleTrigger>` styled as a subtle ghost `<Button>` with `ChevronDown`/`ChevronUp` icons) that defaults to CLOSED. The trigger label toggles between `t("admin.showTable")` and `t("admin.hideTable")`. The existing `<Table>` (with its `sr-only <TableCaption>`) sits inside `<CollapsibleContent>`, so the caption is always present in the DOM for screen readers (FRONTEND.md §9 still satisfied) but the visible rows declutter the main view. Applied to all 4 charts (Trend, Status, Priority, Department).
  4. **Fixed labeling inconsistencies** — sorted `data.by_status` and `data.by_priority` by the canonical `statusOrder` / `priorityOrder` from `@/lib/format` (memoised once per data change) so the chart and the table render the EXACT same set of categories in the EXACT same order. All 6 statuses (incl. Reopened) and all 4 priorities always appear, even with count 0 — the horizontal bar chart handles zero-length bars cleanly where the donut would silently drop them.
  5. **General polish** — added a "Last updated X ago" timestamp to the analytics header (computed from `useQuery`'s `dataUpdatedAt`, formatted via a local `relativeAgo` helper that accepts an explicit `now` parameter and re-evaluates every 60s via a `setInterval` tick so the label stays accurate between the 30s polls). `RefreshCw` icon + `<time dateTime>` element + `aria-live="polite"`. Factored out a shared `CHART_TOOLTIP_STYLE` const for consistent subtle tooltips across all charts. All tooltips now use `labelFormatter` to translate the Y/X axis category and `formatter` to translate the series name. Added data labels to the priority bar chart (`LabelList position="top"`). Added `h-full` to ChartCard so the Status/Priority row has equal-height cards. Skeleton updated to match the new KPI card layout (icon + number + label + sparkline placeholder) and the new header layout.
- Ran `bun run lint`: 0 errors, 0 warnings across `src/components/admin/analytics.tsx` and the 4 message bundles.
- Ran `bunx tsc --noEmit`: clean for all my files. Only pre-existing errors in `examples/` and `skills/` (socket.io-client, image-edit, stock-analysis-skill) remain — out of scope per the task boundary.
- Verified the page compiles and returns HTTP 200 on `GET /` (dev.log shows clean compile).
- Wrote agent work record at `agent-ctx/10-full-stack-developer.md`.

Stage Summary:
- 1 component file rewritten: `src/components/admin/analytics.tsx` (now ~960 lines, was ~623). 4 message bundles edited (en/hi/mr/ta) to add 7 new `admin.*` keys each.
- All VLM-review issues addressed:
  (1) KPI cards now show trend context — each has a 14-day sparkline AND a trend badge comparing last 7 days vs previous 7 days, with green/amber tone reflecting whether the direction is favorable for that KPI (resolved up = good, open down = good, total filed down = good, avg resolution = no per-day data so shows a flat-line sparkline + "No prior data" pill).
  (2) The misleading donut chart was replaced with a horizontal bar chart that correctly shows volumes across dynamic complaint statuses; data labels at the end of each bar.
  (3) All 4 text-equivalent tables are now wrapped in shadcn `<Collapsible>` (default closed) with a subtle "Show data table" / "Hide data table" trigger. The sr-only `<TableCaption>` stays in the DOM for screen readers whether collapsed or not.
  (4) Labeling is now consistent — both chart and table iterate the same statusOrder/priorityOrder-sorted arrays, so categories match exactly (e.g. Reopened appears in both places or neither, never one without the other).
- Civic emerald/saffron palette only — no indigo/blue. Status colours unchanged (in_progress=teal #0d9488). Trend favours emerald (favorable) / amber (unfavorable) per the existing KPI tone mapping.
- Key decisions: (a) "Open" trend uses the cumulative (filed − resolved) backlog sparkline rather than the raw daily delta, because a single day's net delta can be misleadingly noisy while the cumulative trajectory is the metric admins actually care about; (b) "Total complaints" trend treats filed-up as unfavorable (more workload) — this matches the SLA-compliance philosophy on the platform; (c) "Avg resolution" has no per-day time series in the API (`data.avg_resolution_days` is a single aggregate number), so per the task brief I render a flat-line sparkline + a "No prior data" badge rather than fabricating a fake trend; (d) the 60s `setInterval` "now" tick is needed because the 30s query poll only updates `dataUpdatedAt` when the API actually responds — between polls the "Updated X min ago" label would otherwise drift; (e) sorted `by_status`/`by_priority` arrays are memoised once per `data` change so the chart and the collapsed table don't diverge on order between renders.
- No issues encountered that block wiring. No foundation files were modified. The 4 message bundles received only additive changes (new keys appended under the existing `admin` section). Lint + tsc are clean for the modified files.

---
Task ID: 11
Agent: full-stack-developer (complaint detail enhancement)
Task: Enhance complaint detail — attachment image thumbnails + preview dialog, interactive duplicate-group callout with cluster dialog

Work Log:
- Read worklog + foundation files (types, i18n, format, en/hi/mr/ta message bundles, citizen complaint-detail.tsx, officer officer-detail.tsx, shadcn dialog/tooltip/collapsible, shared badges, mock-data for duplicate_count semantics).
- Created `src/components/shared/attachment-preview.tsx` — exports `AttachmentThumbnail`, `AttachmentItem`, `AttachmentPreviewDialog`.
  - `hashHue(filename)` → 0..360 deterministic hue; `gradientFor()` → `linear-gradient(135deg, hsl(hue,65%,70%), hsl(hue,65%,85%))`. Same filename always renders the same colour across thumbnail + dialog.
  - `AttachmentThumbnail` — image attachments render a 64px gradient `<button>` tile with ImageIcon overlay, filename pill at the bottom (truncate), and a hover eye indicator (cursor-pointer, focus-visible ring, aria-label "Preview {filename}"). Non-image attachments render the legacy 36px tinted file-type icon (PDF → rose, other → muted).
  - `AttachmentItem` — full `<li>` row: thumbnail + filename + "{size} · {mime}" + inline collapsible OCR (preserved from the citizen variant; "OCR" pill toggles a `<CollapsibleContent>` beneath the row) + a "Preview" button (Eye icon + `t("officer.detailAttachmentsPreview")`) that opens the dialog. Image thumbnails themselves are also clickable (click → open dialog).
  - `AttachmentPreviewDialog` — full-size Dialog: large aspect-video preview tile (image → larger gradient + ImageIcon + filename; non-image → muted tile + FileText + mime), metadata `<dl>` (Type/Size/Filename — all 3 columns on sm+), and an OCR block that renders the text in a tinted panel or a dashed "No text was extracted" fallback. framer-motion entrance on the image tile.
- Created `src/components/shared/duplicate-cluster-dialog.tsx` — exports `DuplicateClusterCallout`.
  - Replaces the previous static amber info Card with an interactive button-card. Uses `Users` icon (left), the existing `complaint.detailDuplicates` heading + `officer.detailDuplicatesDesc` sub-text (middle), and a "View cluster" label + `ChevronRight` (right). Hover state lifts the amber tint one shade; focus-visible ring is set on the button. `aria-label={t("officer.detailViewCluster")}`.
  - On click opens a shadcn `<Dialog>` showing: a prominent count summary (big `{count}` number + descriptive text), a placeholder list of `count - 1` related complaints (capped at 8 displayed rows), and a production disclaimer note (`officer.detailDuplicatesDialogNote`).
  - `makeFakeRefs(referenceNumber, count)` parses the trailing digits of the current ref (e.g. "GRP-2025-001234") and increments them by 1..count, preserving the zero-pad width ("GRP-2025-001235", "GRP-2025-001236", ...). Falls back to "{ref}-N" if the ref has no trailing digits. Each row shows the fake ref (mono), `t("officer.detailSimilarComplaint")` as the title, and a `StatusBadge` cycling through `["submitted","under_review","in_progress","resolved","under_review","in_progress"]` so the list reads as a realistic mix. Staggered framer-motion entrance per row.
  - `MAX_PLACEHOLDER_ROWS = 8` cap with an "and {count} more" line (`officer.detailDuplicatesMore`) so very large clusters don't render an unbounded list. Demo data has count=4 → 3 rows, well under cap.
- Added 11 new i18n keys to ALL 4 bundles (en/hi/mr/ta) under `officer.*` (between `detailAttachmentsPreview` and `updateStatusTitle`):
  - `detailDuplicatesDialogTitle` — "Duplicate cluster" / "डुप्लिकेट क्लस्टर" / "डुप्लिकेट गट" / "நகல் குழு"
  - `detailDuplicatesDialogDesc` — "These complaints appear to describe the same issue and have been grouped for coordinated resolution." (+ hi/mr/ta translations)
  - `detailDuplicatesDialogNote` — "In production, this view will show the actual related complaints."
  - `detailDuplicatesMore` — "and {count} more"
  - `detailSimilarComplaint` — "Similar complaint" (+ hi/mr/ta)
  - `detailAttachmentPreviewTitle` — "Attachment preview" (+ hi/mr/ta)
  - `detailAttachmentType` / `detailAttachmentSize` / `detailAttachmentFileName` — for the preview dialog metadata grid
  - `detailAttachmentOcr` — "Extracted text"
  - `detailAttachmentNoOcr` — "No text was extracted from this file."
- Modified `src/components/citizen/complaint-detail.tsx`:
  - Removed the now-unused imports (`useState`, `GitBranch`, `ChevronDown`, `ImageIcon`, `File as FileIcon`, `Collapsible`/`CollapsibleContent`/`CollapsibleTrigger`, `formatBytes`, `Attachment` type, `cn`) since the local `AttachmentItem` sub-component was deleted and the duplicate-group callout was replaced.
  - Added imports for `AttachmentItem` from `@/components/shared/attachment-preview` and `DuplicateClusterCallout` from `@/components/shared/duplicate-cluster-dialog`.
  - Replaced the static amber duplicate-group Card with `<DuplicateClusterCallout count={complaint.duplicate_count ?? 0} referenceNumber={complaint.reference_number} />`.
  - The `<AttachmentItem>` rows in the attachments `<ul>` now resolve to the shared component (the local sub-component was deleted).
- Modified `src/components/officer/officer-detail.tsx`:
  - Removed the now-unused imports (`GitBranch`, `ImageIcon`, `File as FileIcon`, `formatBytes`, `Attachment` type, `cn`) and the local `AttachmentItem` sub-component.
  - Added imports for `AttachmentItem` from `@/components/shared/attachment-preview` and `DuplicateClusterCallout` from `@/components/shared/duplicate-cluster-dialog`.
  - Replaced the static amber duplicate-group Card in the main column with `<DuplicateClusterCallout count={complaint.duplicate_count ?? 0} referenceNumber={complaint.reference_number} />`.
  - The `<AttachmentItem>` rows in the attachments `<ul>` now resolve to the shared component.
- Ran `bun run lint`: 0 errors, 0 warnings across all modified files (`src/components/shared/attachment-preview.tsx`, `src/components/shared/duplicate-cluster-dialog.tsx`, `src/components/citizen/complaint-detail.tsx`, `src/components/officer/officer-detail.tsx`, `src/messages/{en,hi,mr,ta}.ts`).
- Ran `bunx tsc --noEmit`: clean for all my files. Only the pre-existing errors in `examples/` (socket.io-client / socket.io module declarations) and `skills/` (image-edit / stock-analysis-skill type mismatches) remain — out of scope per the task boundary.
- Verified `dev.log` shows clean compiles (`✓ Compiled in ...`, `GET / 200`) for the modified files.

Stage Summary:
- 2 new shared component files created: `src/components/shared/attachment-preview.tsx` (~310 lines) and `src/components/shared/duplicate-cluster-dialog.tsx` (~190 lines). 2 detail components refactored to consume them: `src/components/citizen/complaint-detail.tsx` and `src/components/officer/officer-detail.tsx`. 4 message bundles edited (en/hi/mr/ta) to add 11 new `officer.*` keys each.
- All VLM-review issues addressed:
  (1) Attachments now show inline gradient thumbnails for images instead of generic file icons — a pothole photo reads as a coloured preview tile (deterministic per-filename gradient + ImageIcon + filename pill + hover eye), and a "Preview" button on every attachment (image or non-image) opens a Dialog showing the larger preview + filename + size + type + OCR text. Non-image attachments keep the legacy tinted file-type icon in the row but still get the Preview dialog.
  (2) The "Grouped with N similar complaints" callout is now an interactive button-card (Users icon + "View cluster" + chevron, hover lift, focus-visible ring, aria-label). Clicking opens a Dialog showing the cluster size prominently, a placeholder list of `count - 1` related complaint references (derived from the current ref by incrementing trailing digits), each with a cycled StatusBadge, and a production disclaimer note.
- Civic emerald/amber palette preserved — the duplicate callout keeps its amber tint (now with a hover lift and a darker amber "View cluster" label); image thumbnails use HSL gradients derived from the filename (hue 0..360, sat 65%, light 70→85%), which sit pleasantly alongside the existing palette without introducing indigo/blue. Strict TypeScript throughout — types from `@/lib/types`, no `any`.
- Key decisions: (a) shared files over duplication — both detail components are now ~50 lines shorter and behaviour is guaranteed identical across citizen/officer views; (b) the inline collapsible OCR block from the citizen variant was preserved in the shared `AttachmentItem` (rather than only in the dialog) because officers/citizens often want a quick glance at OCR without opening a modal — the dialog remains the "full detail" view; (c) `MAX_PLACEHOLDER_ROWS = 8` cap on the placeholder list with an "and N more" line, so very large clusters don't render unbounded DOM while still feeling complete; (d) `makeFakeRefs` preserves the zero-pad width of the original reference number so the placeholder refs read as legitimate (GRP-2025-001235, not GRP-2025-1235); (e) status cycling uses a fixed `PLACEHOLDER_STATUSES` array (deterministic by index) rather than per-render randomness so the list doesn't reshuffle on re-render.
- No issues encountered that block wiring. No foundation files were modified. The 4 message bundles received only additive changes (new keys inserted under the existing `officer` section, after `detailAttachmentsPreview`). Lint + tsc are clean for the modified files. Dev server compiles cleanly.

---
Task ID: 12
Agent: full-stack-developer (citizen stats dashboard)
Task: Add citizen personal statistics dashboard — KPI cards + status breakdown donut + filing activity bar chart, integrated above complaint list

Work Log:
- Read project context: `worklog.md`, `src/lib/types.ts`, `src/lib/api.ts`, `src/lib/i18n.ts`, `src/lib/format.ts`, `src/messages/en.ts`, the existing `src/components/citizen/complaint-list.tsx`, and `src/components/admin/analytics.tsx` (for KPI-card + chart visual-consistency patterns).
- Added 9 new i18n keys under the `complaint` section of all 4 message bundles (`src/messages/{en,hi,mr,ta}.ts`): `statsTitle`, `statsTotal`, `statsInProgress`, `statsResolved`, `statsAvgResponse`, `statsStatusBreakdown`, `statsFilingActivity`, `statsNoData`, `statsDays`. Keys appended after `value:` in each `complaint` block; verified each bundle's `complaint` section closes cleanly before the `status` block.
- Created `src/components/citizen/complaint-stats.tsx` (~330 lines):
  - Default export `ComplaintStats({ complaints }: { complaints: Complaint[] })`. Returns `null` when `complaints.length === 0` (defers to the list's own empty state).
  - Section header "Your complaint activity" (`complaint.statsTitle`).
  - KPI row (`KpiRow` → `KpiCard`): 4 cards in a responsive grid (`grid-cols-2 lg:grid-cols-4`): Total filed (`FileText`, default tone), Active (`Clock`, amber tint, count of statuses in {submitted, under_review, in_progress}), Resolved (`CheckCircle2`, emerald tint, count of status === resolved), Avg response (`Gauge`, primary tint, mean days between `submitted_at` and `updated_at` for resolved complaints, or "—" when none resolved, formatted via `complaint.statsDays` interpolation). framer-motion staggered entrance (opacity+y, delay = `min(index * 0.05, 0.2)`).
  - Charts row (`grid-cols-1 lg:grid-cols-2`):
    - `StatusBreakdownCard`: recharts `<PieChart>` donut (`innerRadius=42, outerRadius=68, paddingAngle=2`) of complaint counts grouped by status, only statuses with count > 0 are rendered as slices (canonical `statusOrder` from `@/lib/format`). `<Cell>` per slice coloured via a local `STATUS_COLORS` hex map mirroring `statusConfig` (slate/amber/teal/emerald/rose/orange — `in_progress` uses teal `#0d9488` per task spec to stay outside the no-blue rule). `<Legend>` with `iconType="circle"` translating status keys via `t(\`status.\${value}\`)`. `<Tooltip>` with civic-palette styling consistent with admin analytics.
    - `FilingActivityCard`: recharts `<BarChart>` of complaints filed per month for the last 6 months (computed from `submitted_at`, locale-aware short month labels). Bars use `fill="var(--color-primary)"` (civic emerald) with `maxBarSize=36`, rounded top corners. `<Tooltip>` + minimal axes (tick labels only, no grid lines).
  - Both charts render an "Not enough data yet" (`complaint.statsNoData`) message instead of the chart when there is no data (donut: zero slices — can't happen given the top-level guard but defensive; bar chart: zero filings in the last 6 months).
  - Civic emerald/amber palette throughout — no indigo/blue. Strict TypeScript: types from `@/lib/types`, `@/lib/format`, `@/lib/i18n`; no `any`.
- Integrated into `src/components/citizen/complaint-list.tsx`:
  - Added `import ComplaintStats from "./complaint-stats";`.
  - Inserted `{data && data.length > 0 ? <ComplaintStats complaints={data} /> : null}` between the page header and the filter bar (after the header `<div>`, before the filter-bar `<div>`). Passes the raw fetched `data` array (not the filtered `items`), so stats reflect the citizen's full complaint history regardless of the active search/status filter. Hidden during loading / error / empty states (the top-level guard + the component's own `length === 0` short-circuit cover all cases).
- Ran `bun run lint`: 0 errors, 0 warnings.
- Ran `bunx tsc --noEmit`: clean for all my files (`src/components/citizen/complaint-stats.tsx`, `src/components/citizen/complaint-list.tsx`, `src/messages/{en,hi,mr,ta}.ts`). Only the pre-existing errors in `examples/` (socket.io-client / socket.io module declarations) and `skills/` (image-edit / stock-analysis-skill type mismatches) remain — out of scope per the task boundary.
- Verified `dev.log` shows clean compiles (`✓ Compiled in ...`, `GET / 200`) after the new file was added.

Stage Summary:
- 1 new component file created: `src/components/citizen/complaint-stats.tsx` (~330 lines). 1 existing component modified: `src/components/citizen/complaint-list.tsx` (+2 lines: import + conditional render between header and filter bar). 4 message bundles edited (en/hi/mr/ta) to add 9 new `complaint.stats*` keys each.
- Visual decisions: KPI card styling (tone-tinted borders, icon chip, big tabular number, small label) mirrors the admin `KpiCard` for cross-role consistency but is intentionally simpler — no sparkline/trend badge, since a personal citizen dashboard has too few data points for a 14-day sparkline to be meaningful. The donut uses `innerRadius=42/outerRadius=68` to read clearly at 180px height with a 4-status legend underneath. The bar chart uses `var(--color-primary)` (civic emerald) so it adapts to light/dark theme automatically and stays on-brand. `in_progress` uses teal `#0d9488` rather than the `sky-500` in `format.ts statusConfig` to comply with the no-blue rule for chart slices (admin analytics made the same call).
- Avg-response-time KPI: computed as `mean(updated_at − submitted_at)` over resolved complaints, rounded to the nearest integer, rendered via the `complaint.statsDays` interpolation (`"{n} days"` / `"{n} दिन"` / `"{n} दिवस"` / `"{n} நாட்கள்"`) so the unit is localised. Shows "—" when no complaints are resolved yet — a common case for new citizens.
- Key decisions: (a) pass the raw fetched `data` (not the filtered `items`) so the dashboard reflects lifetime activity even when the user applies a status filter or search; (b) the component receives complaints as a prop rather than issuing its own `useQuery` — no duplicate network round-trip and no stale-cache divergence between the stats and the list; (c) only render the stats when `data` exists and is non-empty, so the section never appears above a loading skeleton or an error state; (d) status breakdown drops zero-count statuses from the donut (a single-citizen dashboard typically has 1–3 distinct statuses; empty slices add noise); (e) filing-activity window is fixed at 6 months from "now" so the X-axis is always the same shape and citizens see recent momentum.
- No issues encountered. No foundation files were modified. The 4 message bundles received only additive changes (new keys inserted at the end of the existing `complaint` section). Lint + tsc are clean for the modified files. Dev server compiles cleanly.
