---
name: Next.js 14 in react-vite artifact shell
description: Quirks and decisions for running Next.js 14 inside a Replit react-vite artifact, including version pins and dev-server gotchas.
---

## Rule
This artifact runs Next.js 14 inside a shell originally scaffolded as a react-vite artifact. Do NOT convert it back to Vite.

**Why:** User explicitly chose Next.js 14 when offered a choice.

**How to apply:** Always keep `artifacts/finanshels-ui/package.json` using `next@14.2.35` with `react`/`react-dom` pinned to `18.3.1` and `tailwindcss` pinned to `^3.4.17`. Workspace catalog pins React 19 and Tailwind 4 — those are incompatible.

## Dev server
- Command: `next dev -p $PORT -H 0.0.0.0`
- First compile after a cold restart can take 60–180 s and may trigger the workflow health-check timeout. If `WorkflowsRestart` says it failed, check logs — the server is usually fine; restart once more with a 120 s timeout.
- `allowedDevOrigins` key does not exist in Next.js 14.2.x `experimental` — do not add it.

## Static export
- `output: 'export'` in `next.config.mjs` — build copies `out/` → `dist/public`.
- `images: { unoptimized: true }` required with static export.

## App shell pattern
- `AppShell` → `Sidebar` + `TopBar` (both in `src/components/`)
- Sidebar is 224 px wide, fixed left, dark navy `#082032` bg.
- TopBar is fixed top, `left-56`, white with border-bottom.
- When `auditTrails` prop is non-empty, TopBar renders a sub-bar (height 80px total) vs 48px.

## Screen convention
New screens: `src/screens/<name>/` with `Screen.tsx`, `mock-data.ts`, `index.ts`.
Route: `src/app/<name>/page.tsx` wraps screen in `<AppShell>`.
