---
name: Workspace package repair
description: Environment-specific dependency restoration constraints for this pnpm workspace.
---

When verification encounters missing package links, prefer the repository’s existing pnpm lockfile and offline install. Do not use the generic environment package installer for this workspace.

**Why:** The generic installer can add unrelated root dependencies, create an npm lockfile, alter environment configuration, and leave artifact symlinks pointing at a different package store.

**How to apply:** Restore any installer side effects first, then run `pnpm install --offline --frozen-lockfile --ignore-scripts` from the workspace root before restarting artifact workflows.

Post-merge setup is a separate case: allow its dependency install to reconcile a changed manifest with an older lockfile. Incoming task merges can leave these out of sync, and a frozen install blocks workflow reconciliation before the merged code can run.

**Why:** A merged task was blocked by a stale root lockfile specifier even though the application code change did not touch dependencies.

**How to apply:** Keep ordinary package-link repair frozen/offline, but let the post-merge script use a non-frozen install and commit its reconciled lockfile when needed.