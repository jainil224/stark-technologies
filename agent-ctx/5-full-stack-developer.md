# Task 5 — Officer Dashboard — Agent Work Record

**Task ID:** 5
**Agent:** full-stack-developer (officer dashboard)
**Scope:** Build officer dashboard components (queue table with filters, complaint detail with AI-assisted analysis, status update form) — FRONTEND.md §7.3.

## Files created (all under `src/components/officer/`)

1. **`status-update-form.tsx`** — named export `StatusUpdateForm`
   - Props: `{ complaintId, currentStatus, onUpdated? }`.
   - React Hook Form + zod (`@hookform/resolvers/zod`). Schema rebuilt in-component (memoised on `t`) so the locale-specific `officer.updateNoteRequired` message tracks the active locale.
   - Fields: `status` (Radix `<Select>` driven by `<Controller>` so RHF owns the value; options from `statusOrder`) and `note` (`<Textarea>`, min 5 chars, REQUIRED).
   - `useMutation` wrapping `officerApi.updateStatus({ complaint_id, status, note })`. On success: `toast.success(t("officer.updateSuccess"))`, invalidates `["officer","queue"]` and `["complaint", complaintId]`, resets the note (keeps the freshly-current status), calls `onUpdated?.()`.
   - Error rendering: if `error.field_errors.note` is present it shows under the textarea (aria-invalid + role=alert), otherwise renders an `<Alert variant="destructive">` with the message.
   - Submit button shows `Loader2` + `t("common.saving")` while pending; disabled when pending or `!isValid`.

2. **`queue-table.tsx`** — default export `OfficerQueue`
   - `useQuery({ queryKey: ["officer","queue", apiFilters], queryFn: officerApi.listQueue(apiFilters), refetchInterval: 20000 })`. `apiFilters = { status, priority }` with `undefined` for "all" — server-enforced department scope.
   - Filters bar: status `<Select>` (All + `statusOrder`), priority `<Select>` (All + `priorityOrder`), free-text `<Input type="search">` for `t("officer.searchPlaceholder")`.
   - Search is client-side over title / reference / citizen name (per spec).
   - Summary chips: total (ListChecks), urgent (Flame), open (CircleDot). Computed on the API-returned list (post status/priority filter, pre-search) so chips stay stable while the officer types.
   - Department badge in header: prefers `data[0].department_name`, falls back to a generic label (we never display a raw id string).
   - Desktop: shadcn `<Table>` with columns Reference / Complaint (title + truncated desc + citizen) / Priority / Status / AI Category (or "Processing…" spinner) / Submitted (`formatRelative`). Each `<motion.tr>` is `role="button"`, `tabIndex=0`, keyboard-activatable (Enter/Space), navigates to `officer_detail` with `{ complaintId }`.
   - Mobile (`md:hidden`): stacked motion cards with the same data.
   - Sort: `priorityConfig[p].weight` desc, then `submitted_at` desc (urgent first, newest tiebreak).
   - Loading: custom `QueueSkeleton` (6 rows of `<Skeleton>`); Error: `<ErrorState onRetry={refetch} />`; Empty: `<EmptyState icon={Inbox} ...>`.

3. **`officer-detail.tsx`** — default export `OfficerDetail`
   - Props: `{ complaintId }`. `useQuery` against `complaintsApi.getById(complaintId)` with `refetchInterval: 15000`. Query key `["complaint", complaintId]` (singular — matches the invalidation key used by `StatusUpdateForm`).
   - Back button → `navigate("officer_queue")`.
   - Two-column desktop (`lg:grid-cols-3`), single column mobile, motion fade-in.
   - **Main column (lg:col-span-2)**:
     - Header card (reference, title, StatusBadge + PriorityBadge, submitted + last-updated, status description).
     - Raw complaint text card (`description`).
     - Translation card (only if `translated_text`) — tinted `bg-primary/5`.
     - Voice transcript card (only if `is_voice && transcript`).
     - Attachments list (image / pdf / generic icons, size + mime).
     - **AI-assisted analysis panel** — distinct amber-tinted card (`bg-amber-50/50 dark:bg-amber-950/20`), `Brain` icon + explicit "AI-assisted" pill, heading `t("officer.detailAiPanel")`, disclaimer `t("officer.detailAiDisclaimer")`. Shows `ai_category` (with `Sparkles`), `PriorityBadge`, confidence progress bar (uses `ai_category_confidence` and `ai_priority_confidence`), and `ai_summary`. While `ai_category` is absent it shows a "Processing…" state with an animated `Sparkles` pulse.
     - **Duplicate group indicator** — callout card if `duplicate_count > 1`, `GitBranch` icon, `t("officer.detailDuplicatesDesc", { count })`.
   - **Sidebar**:
     - `<StatusUpdateForm complaintId={...} currentStatus={...} />`.
     - Status timeline — reuses `<StatusTimeline history={...} currentStatus={...} />` from `@/components/citizen/status-timeline` (verified export name).
     - Citizen info mini-card (name, submitted date, optional location_address).

## Decisions
- Query keys: queue uses `["officer","queue", apiFilters]`; detail uses singular `["complaint", complaintId]` to match the spec's literal invalidation key (the citizen detail uses the plural `["complaints", complaintId]` — separate keys, no collision, no cross-view staleness issue).
- `StatusUpdateForm` invalidates BOTH the queue and the detail so an officer updating a complaint sees the timeline + queue refresh live without a manual reload.
- Status field is `Controller`-wrapped because Radix Select isn't a native input; RHF owns the value through `field.onChange`.
- Zod schema is `useMemo`-ised on `t` so the localised min-length error message follows the active locale. `t` identity changes per render (closure over `locale`) so the memo is rebuilt only when `locale` actually changes the message function — acceptable cost.
- Department scoping is left to the mock API (it filters by `me.department_id`); no client-side department filter is exposed, per spec.
- AI panel uses amber tint (not primary green) to clearly distinguish AI-generated content from factual complaint data, with a Brain icon and an explicit "AI-assisted" pill, plus a repeated disclaimer footnote.
- Mobile-first: queue table collapses to stacked cards below `md`; detail goes single-column below `lg`.

## Lint / type check
- `bun run lint`: **0 errors, 0 warnings** across all three officer files.
- `bunx tsc --noEmit`: no errors in `src/components/officer/*`. (Pre-existing errors in `auth-forms.tsx` and the `header.tsx` `initials` import issue noted in worklog Task 4 are outside this task's scope.)

## Issues / handoffs
- None blocking. The pre-existing `header.tsx` `initials` import (should be `@/lib/format` not `@/lib/utils`) and `auth-forms.tsx` type mismatches remain owned by their respective agents (per Task 4 worklog).
- If the wiring agent renders `<OfficerQueue />` for `officer_queue` view and `<OfficerDetail complaintId={selectedComplaintId} />` for `officer_detail` view, both views will reconcile automatically thanks to shared query keys + invalidation.
