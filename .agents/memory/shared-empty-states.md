---
name: Shared empty states
description: The canonical empty and filtered-empty presentation for list and table screens.
---

Use the shared `Empty` component for list and table empty states across the app. Use the module’s primary icon when no records exist and a search-oriented icon when search or filters return no matches.

**Why:** Projects established the reusable empty-state treatment, and keeping Tasks, Timesheets, Organisation, and Admin screens on it prevents each module from drifting into different plain-text empty layouts.

**How to apply:** Preserve each screen’s existing action and data behavior, but replace ad hoc empty table rows or dashed message boxes with `Empty`, using a concise title and a helpful description.