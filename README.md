# JanSunwai — AI-Powered Multilingual Citizen Grievance Platform

> File grievances with government departments by text or voice, in your language. AI auto-classifies, prioritises, and routes every complaint — and tracks it to resolution.

A production-ready **Next.js 16** frontend implementing a complete civic grievance management platform with three role-gated surfaces (Citizen Portal, Officer Dashboard, Admin Module), four-language i18n, voice input, and AI-assisted routing.

---

## ✨ Features

### Three role-gated surfaces, all in one app

- **Citizen Portal** — file complaints by text **or voice** (with transcript review), drag-and-drop attachments, opt-in geolocation, track status with a live timeline.
- **Officer Dashboard** — department-scoped complaint queue with filters/search, AI-assisted analysis panel (clearly labelled as AI-generated), status updates with required notes.
- **Admin Module** — departments CRUD with SLA editing, analytics dashboard with charts + accessible text tables, user role management with self-edit lockout.

### Highlights

- 🎙️ **Voice or text input** — `MediaRecorder`-based capture with an explicit transcript review/edit step that **never auto-submits**.
- 🌐 **Multilingual** — full UI translations in English, हिन्दी, मराठी, தமிழ் with English fallback. Preference persists across sessions.
- 🤖 **AI-assisted routing** — complaints are auto-classified (category + priority + confidence + summary) ~2s after submission; AI fields are visually distinguished from facts.
- 📊 **Analytics** — KPI cards with sparklines + trend badges, status/priority/department charts, filing-activity trend. Every chart has a collapsible text-equivalent table for accessibility.
- 📈 **Personal stats dashboard** — citizens see their own complaint activity (KPIs + status breakdown + filing trend) above their complaint list.
- 🔁 **Real-time-ish updates** — 15–20s polling on lists and detail views so status changes and AI results land without manual refresh.
- ♿ **Accessibility (WCAG AA)** — semantic HTML, keyboard-navigable tables, `aria-live` recording announcements, chart text equivalents, visible focus states.
- 📱 **Responsive** — mobile-first; tables become stacked cards on small screens.
- 🌗 **Light/dark theme** — civic emerald/saffron palette (no indigo/blue).

---

## 🛠️ Tech Stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 16** (App Router, single-route) |
| Language | **TypeScript 5** (strict) |
| Styling | **Tailwind CSS 4** + **shadcn/ui** (New York) |
| Server state | **TanStack Query** |
| Client state | **Zustand** (auth, nav, i18n) |
| Forms | **react-hook-form** + **zod** |
| Charts | **recharts** |
| Animations | **framer-motion** |
| i18n | Custom lightweight provider (next-intl-compatible API) with 4 bundles |
| Icons | **lucide-react** |
| Toasts | **sonner** |
| Theme | **next-themes** |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 20+** (or **Bun** — this repo uses Bun)
- A GitHub PAT if you want to deploy from CI

### Installation

```bash
# clone
git clone https://github.com/jainil224/stark-technologies.git
cd stark-technologies

# install deps (bun or npm/pnpm/yarn all work)
bun install
# or: npm install

# set up env
cp .env.example .env

# start the dev server
bun run dev
# or: npm run dev
```

Open **http://localhost:3000** in your browser.

### Demo Accounts

The app ships with a mock API layer (no backend required). Any password works for these demo accounts:

| Role | Email | What you'll see |
|---|---|---|
| 👤 Citizen | `priya@example.com` | File & track complaints, personal stats dashboard |
| 🛡️ Officer (PWD) | `karan.officer@example.com` | Public Works Department queue + detail |
| 🛡️ Officer (Water) | `lakshmi.officer@example.com` | Water Supply department queue |
| ⚙️ Admin | `aditya.admin@example.com` | Departments CRUD, analytics, user roles |

You can also click the **"Continue as Citizen / Officer / Admin"** buttons on the landing page for one-click demo login.

---

## 📂 Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout + providers
│   ├── page.tsx            # Single-route shell with role-gated view router
│   └── globals.css         # Theme (civic emerald/saffron palette)
├── components/
│   ├── admin/              # AdminShell, Departments, Analytics, Users
│   ├── auth/               # LandingPage, LoginForm, RegisterForm
│   ├── citizen/            # ComplaintForm, ComplaintList, ComplaintDetail,
│   │                       # ComplaintStats, VoiceRecorder, StatusTimeline,
│   │                       # SubmittedConfirmation
│   ├── officer/            # OfficerQueue, OfficerDetail, StatusUpdateForm
│   ├── shared/             # Header, Footer, LanguageSwitcher, ThemeToggle,
│   │                       # badges, states, AttachmentPreview,
│   │                       # DuplicateClusterDialog
│   └── ui/                 # shadcn/ui primitives
├── lib/
│   ├── api.ts              # Typed mock API client ({success,data,error} envelope)
│   ├── auth.ts             # useAuth Zustand store (in-memory token + restore)
│   ├── format.ts           # statusConfig, priorityConfig, date/byte formatters
│   ├── i18n.ts             # useTranslations hook + locale store
│   ├── mock-data.ts        # In-memory dataset (departments, users, complaints)
│   ├── nav.ts              # Role-gated in-app view router (single-route)
│   ├── query-client.ts     # TanStack Query client factory
│   └── types.ts            # Domain types (User, Complaint, Department, …)
└── messages/
    ├── en.ts               # English bundle (source of truth)
    ├── hi.ts               # हिन्दी
    ├── mr.ts               # मराठी
    └── ta.ts               # தமிழ்
```

---

## 🧱 Architecture Notes

- **Single-route App Router** — per sandbox constraints, only `/` is exposed. Role-gated "pages" are modelled as views in a Zustand nav store. The `page.tsx` shell enforces role-based access with redirects + toasts on cross-role access.
- **Mock API envelope** — every endpoint returns `{ success, data, error }`. The client unwraps to `{ data, error }`. Swapping in a real `fetch` against `NEXT_PUBLIC_API_BASE_URL` only changes the body of `request()`; the public API stays identical.
- **Async AI classification** — on complaint creation, AI fields (`ai_category`, `ai_priority_confidence`, `ai_summary`) land ~2s later. The UI shows a "Processing…" state and polls so the fields appear without a manual refresh.
- **Auth** — access token in memory (Zustand); a restore-session flag is persisted so `/api/auth/me` is called on boot for silent refresh. In a real deployment the refresh token would be an httpOnly cookie set by the backend.
- **i18n** — custom provider modelled on next-intl's `useTranslations()` API, with dot-path keys + `{placeholder}` interpolation + English fallback. Avoids locale-segment routing (single-route constraint). Migrating to next-intl is a drop-in change.

---

## 🔍 Validation

```bash
bun run lint     # ESLint — 0 errors, 0 warnings
bunx tsc --noEmit  # TypeScript strict — clean
```

End-to-end flows verified via **agent-browser** across all three roles (citizen submit → list → detail; officer queue → detail → status update; admin departments/analytics/users).

---

## 📝 Scripts

| Command | Description |
|---|---|
| `bun run dev` | Start dev server on port 3000 |
| `bun run build` | Production build (standalone output) |
| `bun run start` | Start production server |
| `bun run lint` | ESLint check |
| `bun run db:push` | Push Prisma schema to SQLite |
| `bun run db:generate` | Generate Prisma client |

---

## 🌍 Supported Languages

| Code | Language | Native label |
|---|---|---|
| `en` | English | English |
| `hi` | Hindi | हिन्दी |
| `mr` | Marathi | मराठी |
| `ta` | Tamil | தமிழ் |

Driven by a `SUPPORTED_LANGUAGES` config — adding a language is a config + one message-bundle change, not a code change.

---

## 📄 License

This is a demo project for public grievance management. © JanSunwai Civic Platform.
