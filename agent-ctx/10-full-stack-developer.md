# Task 10 — Analytics enhancement

**Agent:** full-stack-developer (analytics enhancement)
**Task ID:** 10
**Scope:** Enhance `src/components/admin/analytics.tsx` + add i18n keys to `src/messages/{en,hi,mr,ta}.ts` only.

## Context

A VLM (vision model) review identified 4 issues with the existing admin analytics dashboard:
1. KPI cards lack trend context — they show absolute numbers without comparing to the previous period.
2. The "By status" donut chart is misleading (a donut implies parts of a static whole; statuses are dynamic states).
3. Data redundancy — charts are immediately followed by tables with the same numbers.
4. Inconsistent labeling — donut chart vs table show slightly different categories (e.g. "Reopened" in table but not chart).

## Files modified

- `src/components/admin/analytics.tsx` — fully rewritten (~960 lines).
- `src/messages/en.ts` — added 7 new keys under `admin.*`.
- `src/messages/hi.ts` — same 7 new keys.
- `src/messages/mr.ts` — same 7 new keys.
- `src/messages/ta.ts` — same 7 new keys.

## Changes summary

### 1. KPI cards with sparklines + trend badges

Each KPI card now renders:
- Tone-tinted icon (top-left)
- Big number + label
- Bottom row: 14-day sparkline (recharts `<LineChart>` at 40px, no axes/grid/tooltip, `isAnimationActive={false}`) on the left + `<TrendBadge>` pill on the right

Sparkline data source per card:
- **Total complaints** → `data.trend.map((d) => d.filed)` (amber)
- **Open** → cumulative `(filed − resolved)` backlog, clamped at 0 (amber)
- **Resolved** → `data.trend.map((d) => d.resolved)` (emerald)
- **Avg resolution** → flat-line `Array(14).fill(data.avg_resolution_days)` (teal) — no per-day time series in the API

Trend badge: compares the last 7 days vs the previous 7 days for the relevant metric. Direction icon (`TrendingUp`/`TrendingDown`) reflects the actual change; pill tint is emerald when the direction is favorable for that KPI, amber otherwise:
- Total filed-down = favorable (less workload)
- Open backlog-down = favorable (shrinking queue)
- Resolved-up = favorable (more closures)
- Avg resolution = no per-day data → "No prior data" pill

framer-motion entrance animation (opacity + y, staggered 0.05s delay, capped at 0.25s).

### 2. Replaced donut chart with horizontal bar chart

`recharts <BarChart layout="vertical">` with statuses on the Y-axis (translated labels) and counts on the X-axis. Each `<Cell>` coloured per `STATUS_COLORS[status]`. `<LabelList dataKey="count" position="right">` for inline data labels at the end of each bar. Removed the donut entirely.

### 3. Made all text-equivalent tables collapsible

Introduced a `CollapsibleTable` wrapper (shadcn `<Collapsible>` + `<CollapsibleTrigger>` styled as a subtle ghost `<Button>` with `ChevronDown`/`ChevronUp`). Defaults to CLOSED. Trigger label toggles between `t("admin.showTable")` and `t("admin.hideTable")`. The `<Table>` (with its `sr-only <TableCaption>`) sits inside `<CollapsibleContent>` so the caption is always in the DOM for screen readers (FRONTEND.md §9 still satisfied). Applied to all 4 charts (Trend, Status, Priority, Department).

### 4. Fixed labeling inconsistencies

`data.by_status` and `data.by_priority` are now sorted by the canonical `statusOrder` / `priorityOrder` from `@/lib/format` (memoised once per data change). Both the chart and the table iterate the SAME sorted array, so categories match exactly. All 6 statuses (incl. Reopened) and all 4 priorities always appear, even with count 0 — the horizontal bar chart handles zero-length bars cleanly where the donut would silently drop them.

### 5. General polish

- Added "Last updated X ago" timestamp to the analytics header (computed from `useQuery`'s `dataUpdatedAt`, formatted via a local `relativeAgo` helper that accepts an explicit `now` parameter and re-evaluates every 60s via `setInterval`). `RefreshCw` icon + `<time dateTime>` + `aria-live="polite"`.
- Factored out a shared `CHART_TOOLTIP_STYLE` const for consistent subtle tooltips across all charts. All tooltips use `labelFormatter` to translate the Y/X axis category.
- Added data labels (`<LabelList>`) to both the status (position="right") and priority (position="top") bar charts.
- Added `h-full` to ChartCard so the Status/Priority row has equal-height cards.
- Skeleton updated to match the new KPI card layout (icon + number + label + sparkline placeholder) and the new header layout.

## New i18n keys (added to all 4 bundles)

| Key | en | hi | mr | ta |
|---|---|---|---|---|
| `admin.lastUpdated` | `Updated {time}` | `अपडेट किया गया {time}` | `अपडेट केले {time}` | `புதுப்பிக்கப்பட்டது {time}` |
| `admin.showTable` | `Show data table` | `डेटा तालिका दिखाएँ` | `डेटा टेबल दाखवा` | `தரவு அட்டவணையைக் காட்டு` |
| `admin.hideTable` | `Hide data table` | `डेटा तालिका छिपाएँ` | `डेटा टेबल लपवा` | `தரவு அட்டவணையை மறை` |
| `admin.trendUp` | `Up {pct}%` | `{pct}% बढ़ा` | `{pct}% वाढ` | `{pct}% உயர்வு` |
| `admin.trendDown` | `Down {pct}%` | `{pct}% घटा` | `{pct}% घट` | `{pct}% குறைவு` |
| `admin.vsLastWeek` | `vs last week` | `पिछले सप्ताह से` | `मागील आठवड्याशी` | `கடந்த வாரத்துடன்` |
| `admin.noTrend` | `No prior data` | `कोई पिछला डेटा नहीं` | `मागील डेटा नाही` | `முந்தைய தரவு இல்லை` |

## Quality gates

- `bun run lint`: 0 errors, 0 warnings in `src/components/admin/analytics.tsx` and the 4 message bundles.
- `bunx tsc --noEmit`: clean for all modified files. Only pre-existing errors in `examples/` and `skills/` (out of scope) remain.
- `GET /` returns HTTP 200 cleanly; dev.log shows clean compile.

## Decisions worth recording

1. **"Open" trend uses the cumulative (filed − resolved) backlog** rather than the raw daily delta — a single day's net delta is noisy; the cumulative trajectory is what admins actually watch.
2. **"Total complaints" trend treats filed-up as unfavorable** (more workload) — matches the SLA-compliance philosophy on the platform.
3. **"Avg resolution" has no per-day time series in the API**, so per the task brief I render a flat-line sparkline + "No prior data" pill rather than fabricating a fake trend.
4. **60s `setInterval` "now" tick** is needed because the 30s query poll only updates `dataUpdatedAt` when the API actually responds — between polls the "Updated X min ago" label would otherwise drift.
5. **Sorted `by_status`/`by_priority` arrays are memoised once per `data` change** so the chart and the collapsed table don't diverge on order between renders.
6. **All 6 statuses always rendered** (including count-0 ones) — the horizontal bar chart handles zero-length bars cleanly where the donut would silently drop them. This fixes the original "Reopened in table but not chart" inconsistency at the data layer.

## Outstanding (out of scope)

- No foundation files modified.
- No other agent's components modified.
- 4 message bundles received only additive changes (new keys appended under the existing `admin` section).
