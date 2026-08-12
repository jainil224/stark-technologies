# Task 12 — Citizen Statistics Dashboard

**Agent:** full-stack-developer (citizen stats dashboard)
**Task ID:** 12
**Scope:** Create `src/components/citizen/complaint-stats.tsx` + integrate into `src/components/citizen/complaint-list.tsx` + add i18n keys to `src/messages/{en,hi,mr,ta}.ts` only.

## Context

The JanSunwai platform already has a working citizen complaint list (`complaint-list.tsx`) that fetches the citizen's complaints via `complaintsApi.listMine()` and renders a header, filter bar, and card grid. Task 12 adds a personal statistics summary above the filter bar so citizens see their lifetime activity (totals, status breakdown, filing momentum) at a glance. This mirrors the admin analytics dashboard's visual language (KPI cards + recharts visualisations) but is scoped to a single citizen's complaints and is intentionally lighter — no 14-day sparklines or week-over-week trend badges, since a personal dataset is too small for those to be meaningful.

## Files modified

- `src/components/citizen/complaint-stats.tsx` — **NEW** (~330 lines).
- `src/components/citizen/complaint-list.tsx` — added import + conditional render between header and filter bar (+2 LOC).
- `src/messages/en.ts` — 9 new keys under `complaint.*`.
- `src/messages/hi.ts` — same 9 new keys.
- `src/messages/mr.ts` — same 9 new keys.
- `src/messages/ta.ts` — same 9 new keys.

## Foundation files consulted (read-only)

`worklog.md`, `src/lib/types.ts`, `src/lib/api.ts`, `src/lib/i18n.ts`, `src/lib/format.ts`, `src/components/admin/analytics.tsx` (KPI-card + chart styling patterns), `src/components/ui/card.tsx`, `src/app/globals.css` (confirmed `--color-primary` → emerald `oklch(0.45 0.11 165)`).

## New i18n keys (all 4 bundles)

| key | en | hi | mr | ta |
|---|---|---|---|---|
| `complaint.statsTitle` | Your complaint activity | आपकी शिकायत गतिविधि | तुमची तक्रार गतिविधी | உங்கள் முறை செயல்பாடு |
| `complaint.statsTotal` | Total filed | कुल दर्ज | एकूण नोंदवल्या | மொத்தம் பதிவு |
| `complaint.statsInProgress` | Active | सक्रिय | सक्रिय | செயலில் |
| `complaint.statsResolved` | Resolved | हल | सोडवल्या | தீர்க்கப்பட்ட |
| `complaint.statsAvgResponse` | Avg response | औसत प्रतिक्रिया | सरासरी प्रतिसाद | சராசரி பதில் |
| `complaint.statsStatusBreakdown` | By status | स्थिति अनुसार | स्थितीनुसार | நிலை வாரியாக |
| `complaint.statsFilingActivity` | Filing activity | दर्ज गतिविधि | नोंद गतिविधी | பதிவு செயல்பாடு |
| `complaint.statsNoData` | Not enough data yet | अभी पर्याप्त डेटा नहीं | अजून पुरेसा डेटा नाही | இன்னும் போதுமான தரவு இல்லை |
| `complaint.statsDays` | days | दिन | दिवस | நாட்கள் |

## Component design — `ComplaintStats`

### Props & guard
- `{ complaints: Complaint[] }` — receives the already-fetched list (no separate `useQuery`).
- Returns `null` when `complaints.length === 0` — defers to the list's own `EmptyState`.

### Layout
1. Section header "Your complaint activity" (`complaint.statsTitle`, `text-sm font-semibold uppercase tracking-wide text-muted-foreground`).
2. KPI row — `grid-cols-2 lg:grid-cols-4 gap-3`:
   - **Total filed** — `complaints.length`, `FileText` icon, default tone.
   - **Active** — count of statuses ∈ {submitted, under_review, in_progress}, `Clock` icon, amber tint.
   - **Resolved** — count of status === resolved, `CheckCircle2` icon, emerald tint.
   - **Avg response** — `mean(updated_at − submitted_at)` over resolved complaints, rounded, rendered via `complaint.statsDays` interpolation; "—" when none resolved. `Gauge` icon, primary tint.
3. Charts row — `grid-cols-1 lg:grid-cols-2 gap-4`:
   - **Status breakdown** — recharts `<PieChart>` donut (`innerRadius=42, outerRadius=68, paddingAngle=2`). Only statuses with count > 0 are rendered as slices (canonical `statusOrder` from `@/lib/format`). `<Cell>` per slice coloured via a local `STATUS_COLORS` hex map mirroring `statusConfig` (slate/amber/teal/emerald/rose/orange). `in_progress` uses teal `#0d9488` per task spec (not the `sky-500` from `format.ts`) to comply with the no-blue rule. `<Legend>` with `iconType="circle"` translating status keys via `t(\`status.\${value}\`)`.
   - **Filing activity** — recharts `<BarChart>` of complaints filed per month for the last 6 months (computed from `submitted_at`, locale-aware short month labels). Bars use `fill="var(--color-primary)"` (civic emerald) with `maxBarSize=36`, rounded top corners. Both charts: 180px height, civic-palette `<Tooltip>` styling mirrored from admin analytics.

### Animations
framer-motion staggered entrance on the 4 KPI cards (opacity 0→1, y 8→0, delay = `min(index * 0.05, 0.2)`, `easeOut`).

### Empty chart states
Both charts render the `complaint.statsNoData` message instead of the chart when there is no data (donut: defensive — can't happen given the top-level guard; bar chart: zero filings in the last 6 months, e.g. a citizen who filed only older complaints).

## Integration into `complaint-list.tsx`

- Added `import ComplaintStats from "./complaint-stats";`.
- Inserted `{data && data.length > 0 ? <ComplaintStats complaints={data} /> : null}` between the page header `<div>` and the filter-bar `<div>`.
- Passes the **raw fetched `data`** (not the filtered `items`) so the dashboard reflects lifetime activity even when a status filter or search is active.
- Hidden during loading / error / empty states — the top-level guard (`data && data.length > 0`) plus the component's own `length === 0` short-circuit cover every case.

## Validation

- `bun run lint` → 0 errors, 0 warnings.
- `bunx tsc --noEmit` → clean for all my files. Only the pre-existing errors in `examples/` (socket.io module declarations) and `skills/` (image-edit / stock-analysis-skill type mismatches) remain — out of scope.
- `dev.log` → clean compiles (`✓ Compiled in ...`, `GET / 200`) after the new file was added.

## Key decisions

- **Props over separate query** — the list already fetches `complaintsApi.listMine()`; issuing a second query in the stats component would duplicate the network round-trip and risk stale-cache divergence. Passing the array as a prop keeps a single source of truth.
- **Raw `data` not filtered `items`** — the dashboard should reflect the citizen's lifetime activity regardless of the active search/status filter; the filter only narrows the card grid below.
- **Donut drops zero-count statuses** — a single-citizen dashboard typically has 1–3 distinct statuses; empty slices add visual noise. The legend mirrors the rendered slices.
- **`in_progress` → teal `#0d9488`** — the `format.ts statusConfig` uses `sky-500` (blue-ish) for `in_progress` dots/badges, but the task spec + the no-blue rule require teal for chart slices. Admin analytics made the same call.
- **Avg response via `complaint.statsDays` interpolation** — localises the unit ("days" / "दिन" / "दिवस" / "நாட்கள்") rather than hard-coding English.
- **No sparkline/trend badge on KPI cards** — admin analytics' 14-day sparkline assumes a high-volume dataset; a personal citizen dashboard has too few data points for a sparkline to be meaningful. Kept the cards clean: icon + number + label.
- **`var(--color-primary)` for bar fill** — theme-aware (emerald in light, lighter emerald in dark) and on-brand; recharts renders this fine since SVG `fill` accepts any CSS color value.

No issues encountered. No foundation files modified. The 4 message bundles received only additive changes. Lint + tsc clean. Dev server compiles cleanly.
