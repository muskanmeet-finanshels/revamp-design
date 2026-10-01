# Finanshels UI

Frontend implementation system for converting provided UI wireframes/designs into production-ready screens for Finanshels (UAE accounting/compliance brand).

## Run & Operate

- `artifacts/finanshels-ui: web` workflow — Next.js 14 dev server (`next dev -p $PORT`)
- `pnpm --filter @workspace/finanshels-ui run typecheck` — typecheck the frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-server run dev` — shared API server (unused so far)

## Stack

- **Next.js 14 (app router, `output: 'export'` static build)** — user explicitly required Next.js, not Vite
- React 18.3 (pinned; workspace catalog is React 19, do not switch this package to catalog react)
- TypeScript, Tailwind CSS 3.4 (pinned; catalog tailwind is v4 — this package must stay on 3.4)
- shadcn/ui-style components + Radix UI + lucide-react
- Fonts via next/font: Poppins (UI), JetBrains Mono (code)

## Where things live

- `artifacts/finanshels-ui/` — the Next.js app
  - `src/app/` — routes (root page is the design-system reference)
  - `src/components/ui/` — shared design-system components (shadcn-style)
  - `src/screens/` — one folder per screen built from a wireframe (see its README)
  - `tailwind.config.ts` — Tier 1 primitive palette + typography scale tokens
  - `src/app/globals.css` — Tier 2 semantic tokens (shadcn CSS variables)
  - `public/finanshels-logo.png` — brand logo
- `attached_assets/` — user-provided brand references (logo, palette, typography specs)

## Architecture decisions

- Two-tier color tokens per user's palette spec: Tier 1 primitives (navy/orange/gray scales) in Tailwind config; components must reference Tier 2 semantic roles (primary/brand, secondary, muted, accent, success, error, info) only.
- Typography scale tokens (`text-display-hero` … `text-overline`, `text-metric-lg`) defined in Tailwind `fontSize` matching the provided spec.
- Static export (`output: 'export'`) so the artifact's static production serve works; build copies `out/` → `dist/public`.

## Product

- Wireframe-to-screen conversion workflow: user supplies wireframes/screenshots; agent builds exact matching screens from reusable components, prop-driven, with mock data only for preview.

## User preferences

- Use Next.js 14 — explicitly rejected Vite.
- Do NOT invent screens, dashboards, layouts, or examples — only build screens from user-provided references.
- Match provided designs as closely as possible (spacing, typography, colors, borders, responsive behavior).
- Show informational helper text through an "i" icon with a hover tooltip, except keep download-dialog header descriptions as visible text.
- Downloads start with the table's selected columns and order; allow drag-and-drop reordering in the modal without changing the table.
- Projects downloads initially show the applied view filters. Changing the export filter applies it independently across All Status, ignoring the view's tab and search; describe the result as "Showing X of Y", where Y is the unfiltered All Status count, excluding archived projects.
- Each screen: own folder, reusable, props for changing data, no hardcoded business logic, mock data for preview only.

## Gotchas

- Next.js first compile can exceed the workflow health-check window; if a restart "fails" right after dependency changes, check logs — the server is often fine, just restart again.
- Keep `react`/`tailwindcss` pinned in `artifacts/finanshels-ui/package.json` (not `catalog:`).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
