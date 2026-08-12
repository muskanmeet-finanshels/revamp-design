---
name: React 18 web build isolation
description: How to keep the React 18 Next web artifact type-safe in the mixed React 18/19 workspace.
---

The Finanshels Next 14 web artifact uses React 18, while the mobile and preview artifacts use React 19. Its tsconfig must resolve `react` and `react-dom` through the web artifact's local React 18 type packages; otherwise Next's production type-check can combine React 19 declarations from the workspace root with React 18 declarations and fail on incompatible `ReactNode` and JSX component types.

**Why:** pnpm's workspace peer resolution can expose the React 19 `@types` packages to Next-generated declarations even when the web package's runtime and direct type dependencies are React 18.

**How to apply:** When changing the web artifact's React, Next, or workspace dependency graph, run its exact production build and preserve the artifact-local React 18 path mappings unless the web stack is intentionally upgraded.