---
name: Role access model
description: The product decision governing user-role assignment and role permission granularity.
---

Users may have one or more assigned roles when the multiple-role setting is enabled. A role grants or denies access at the module level; individual actions within a module are not independently configurable.

**Why:** This is the agreed access-control model for the Admin experience. Optional multi-role assignment supports organisations that need combined access while keeping permission management module-based.

**How to apply:** User-management flows must switch between single- and multi-role selection based on the multiple-role setting. New or revised role and permission flows must present whole-module enablement only. When converting historical action-level access, preserve a module if it had any granted action.