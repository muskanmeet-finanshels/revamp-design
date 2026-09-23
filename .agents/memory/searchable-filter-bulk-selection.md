---
name: Searchable filter bulk selection
description: User-approved behavior for Select all in searchable multi-select filters.
---

Select all in searchable multi-select filters should target the currently visible search matches. When all matches are already selected, toggling it off removes only those matches and preserves selections hidden by the search.

**Why:** The user explicitly approved this behavior as the desired pattern for app filters before requesting additional filter fields.

**How to apply:** When adding searchable multi-select filter fields, use the same visible-results selection semantics rather than treating Select all as an unfiltered global action.