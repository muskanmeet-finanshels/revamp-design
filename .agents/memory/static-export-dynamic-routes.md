---
name: Static export dynamic routes
description: How to add dynamic Next.js routes in this output:'export' app — generateStaticParams + client-side URL param reading pattern.
---

## Rule
Any `[param]` route under `src/app/` **must** export `generateStaticParams()` or the dev server and export build both throw a 500 with "missing exported function generateStaticParams".

## How to apply
1. Export `generateStaticParams` from the page file listing all known IDs (e.g. project IDs 1-52).
2. Never read `searchParams` server-side in these pages — `output: 'export'` has no server runtime, so accessing `searchParams` in a server component throws "dynamic = error" at runtime.
3. Instead, read query-string values **client-side** after mount via `useEffect + new URLSearchParams(window.location.search)`.
4. Read path params via `useParams()` from `next/navigation` inside the `'use client'` screen component.

**Why:** The app is configured with `output: 'export'` in `next.config.mjs`, which produces a fully static site. There is no Node.js runtime to handle per-request rendering, so any server-side dynamic access fails.

## Example skeleton
```ts
// page.tsx (server component — no 'use client')
export function generateStaticParams() {
  return Array.from({ length: 52 }, (_, i) => ({ id: String(i + 1) }));
}
export default function Page() {
  return <AppShell ...><Screen /></AppShell>;
}

// Screen.tsx ('use client')
export function Screen() {
  const params = useParams();          // path param
  const [from, setFrom] = useState('grid');
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setFrom(sp.get('from') === 'list' ? 'list' : 'grid');
  }, []);
}
```
