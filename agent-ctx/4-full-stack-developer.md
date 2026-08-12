# Task 4 — Citizen Portal (full-stack-developer agent)

## Scope
Built the citizen-facing feature components for the JanSunwai platform under
`src/components/citizen/`. No changes to `page.tsx`, `layout.tsx`, or any
foundation lib files.

## Files created
- `src/components/citizen/voice-recorder.tsx`
  - Named export `VoiceRecorder({ onTranscript, onReset })`.
  - Uses `MediaRecorder` + `navigator.mediaDevices.getUserMedia`.
  - Records → "transcribing…" (1.2s simulated ASR delay) → calls
    `onTranscript` with a placeholder sample complaint text.
  - `aria-live="polite"` region announces state. Animated bars + elapsed
    timer. "Record again" button.
  - Feature-detects `MediaRecorder` / `getUserMedia`; renders a friendly
    fallback message if unsupported.
  - Cleans up stream + MediaRecorder + timers on unmount.
- `src/components/citizen/complaint-form.tsx`
  - Default export `ComplaintForm`. RHF + zod schema.
  - Text/Voice toggle (`ToggleGroup`).
  - Voice flow: prompt → review (editable Textarea pre-filled with transcript
    + `voiceReviewHint`) → confirmed (description populated, editable).
    Submit is disabled while voice flow is incomplete with a visible hint.
  - Drag-and-drop attachment zone with simulated upload progress, file-type
    + size validation (max 10 MB; jpeg/png/webp/heic/pdf), per-file remove.
  - Opt-in geolocation capture with idle/capturing/captured/denied states.
  - Department `<Select>` with `auto` + 6 hardcoded departments.
  - `useMutation` → `complaintsApi.create`; on success: toast + navigate to
    `complaint_submitted` with `submittedId`. Field-level + generic server
    error rendering via `<Alert variant="destructive">`.
  - `useWatch` used (not RHF `watch`) for React-Compiler friendliness.
- `src/components/citizen/complaint-list.tsx`
  - Default export `ComplaintList`. `useQuery` with `refetchInterval: 20000`.
  - Status filter `<Select>` + search `<Input>`.
  - Responsive 1-col (mobile) / 2-col (desktop) card grid. Cards show
    reference, title, truncated description, StatusBadge, PriorityBadge,
    department, relative time, AI category line (with spinner while pending).
  - Sorted by priority weight desc then submitted_at desc.
  - Loading: 3 `<CardSkeleton />`. Error: `<ErrorState onRetry={refetch} />`.
    Empty: `<EmptyState>` with CTA to file a complaint.
- `src/components/citizen/status-timeline.tsx`
  - Named export `StatusTimeline({ history, currentStatus })`.
  - Vertical `<ol>` timeline with connecting line, dots colored per
    `statusConfig`, latest entry highlighted, actor + role + timestamp.
- `src/components/citizen/complaint-detail.tsx`
  - Default export `ComplaintDetail({ complaintId })`. `useQuery` with
    `refetchInterval: 15000`.
  - Back button → `complaint_list`.
  - Two-column desktop layout. Main: header, original description, optional
    translation card, optional voice transcript card, attachments list
    (with collapsible OCR text), status timeline. Sidebar: AI classification
    card (category/priority/confidence progress/summary) with "Processing…"
    fallback while AI fields are pending, estimated resolution date card,
    location card, duplicate-group indicator (amber).
- `src/components/citizen/submitted-confirmation.tsx`
  - Default export `SubmittedConfirmation`. Reads `lastSubmittedId` from nav.
  - Fetches the complaint (with refetchInterval until AI fields arrive).
  - Green check icon + spring animation + tasteful confetti burst
    (framer-motion). Reference number prominently displayed. Buttons:
    "View My Complaints" + "File another".
  - Falls back to `complaint_list` if no submittedId.

## Lint / type status
- `bun run lint` is clean (0 errors, 0 warnings) across all 6 citizen files.
- `bunx tsc --noEmit` is clean for citizen files (other modules have
  unrelated errors I left untouched per task instructions).

## Reused foundation
- `useTranslations` / i18n keys from `messages/en.ts` (`complaint.*`,
  `status.*`, `statusDesc.*`, `priority.*`, `common.*`, `toast.*`,
  `errors.*`, `officer.*` for shared labels).
- `complaintsApi.{create,listMine,getById}` from `src/lib/api.ts`.
- `useNav((s) => s.navigate)` from `src/lib/nav.ts` with views
  `complaint_new`, `complaint_list`, `complaint_detail`, `complaint_submitted`.
- `useNav((s) => s.lastSubmittedId)` for the confirmation view.
- `formatRelative`, `formatDate`, `formatDateTime`, `formatBytes`,
  `priorityConfig`, `statusConfig`, `statusOrder` from `src/lib/format.ts`.
- `<StatusBadge>` / `<PriorityBadge>` from `src/components/shared/badges.tsx`.
- `<LoadingState>`, `<EmptyState>`, `<ErrorState>`, `<CardSkeleton>` from
  `src/components/shared/states.tsx`.
- shadcn/ui: button, card, input, textarea, label, select, alert, progress,
  collapsible, toggle-group.

## Notes / decisions
- Department list is hardcoded locally as instructed; the mock API also
  auto-routes when `department_id === undefined` (we pass `undefined` when
  the user picks `auto`).
- Voice recorder uses a placeholder transcript (no real ASR in mock layer);
  a comment points to where the ASR call would land in production.
- Voice submit gating: while `voiceStage` is `prompt` or `review`, the
  submit button is disabled and a visible hint explains why.
- Used `useWatch` instead of `watch` to satisfy the `react-hooks/incompatible-
  library` lint rule (RHF watch cannot be safely memoized by React Compiler).
- All visible copy flows through `t(...)`; locale-aware date formatting via
  `formatRelative` / `formatDateTime` / `formatDate` with `locale` from
  `useTranslations()`.
- Civic emerald/saffron palette only — no indigo/blue. Tailwind theme
  variables (`bg-primary`, `text-primary-foreground`, etc.) used throughout.
