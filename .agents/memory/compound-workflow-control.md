---
name: Compound workflow control
description: Difference between schema-valid compound workflow configuration and workflows exposed by runtime control tools.
---

A schema-valid compound workflow in `.replit` is not necessarily available to the runtime workflow tools. Use the registered managed artifact service names for Run/restart control rather than assuming a compound wrapper is addressable.

**Why:** A validated compound wrapper referencing existing managed services failed when restarted, while querying the wrapper reported “not found.” Restarting each managed artifact service directly succeeded; the services themselves had no startup code errors.

**How to apply:** Check the registered workflow names before choosing a Run target or restarting a wrapper. Keep existing managed artifact services and their injected routing/port settings; do not create duplicate shell servers to work around a missing wrapper.