---
name: Workspace package repair
description: Environment-specific dependency restoration constraints for this pnpm workspace.
---

When verification encounters missing package links, prefer the repository’s existing pnpm lockfile and offline install. Do not use the generic environment package installer for this workspace.

**Why:** The generic installer can add unrelated root dependencies, create an npm lockfile, alter environment configuration, and leave artifact symlinks pointing at a different package store.

**How to apply:** Restore any installer side effects first, then run `pnpm install --offline --frozen-lockfile --ignore-scripts` from the workspace root before restarting artifact workflows.