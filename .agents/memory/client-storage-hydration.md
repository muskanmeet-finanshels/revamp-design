---
name: Client storage hydration
description: Rendering rule for browser-persisted state in server-rendered screens
---

Browser-persisted state must not be read during the initial render of a server-rendered screen. Render a deterministic seed/default on both server and client, then merge localStorage values in an effect after mount.

**Why:** Reading localStorage in a state initializer can make the first client render differ from the server HTML, causing hydration warnings or visible error toasts when persisted records and mock data evolve.

**How to apply:** Use an effect to load and merge persisted state, and delay persistence until that hydration merge has completed.