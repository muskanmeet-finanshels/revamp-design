# Screens

Each screen built from a provided wireframe/design gets its own folder here:

```
src/screens/
  client-overview/
    ClientOverviewScreen.tsx   # the screen component (props-driven)
    mock-data.ts               # preview-only mock data
    index.ts                   # re-export
```

Rules:

- Screens are composed from the shared design system in `src/components/ui`
  (plus any composite components added to `src/components/`).
- Screens accept props wherever data changes — no hardcoded business logic.
- Mock data lives beside the screen and is used only for preview.
- A route under `src/app/<route>/page.tsx` renders the screen with its mock data.
- Reference only Tier 2 semantic tokens (brand, primary, muted, success, error, info)
  — never Tier 1 primitives (navy-900, orange-500, ...) directly.
