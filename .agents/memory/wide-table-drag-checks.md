---
name: Wide table drag checks
description: Browser checks for drag-reordering columns in horizontally scrolling tables.
---

When automating a header drag in a horizontally scrolling table, set a viewport wide enough for both endpoints to be visible before dragging.

**Why:** A browser drag from an offscreen header to another header can auto-scroll the table mid-drag and drop on an unintended column, despite the requested locator pair being correct.

**How to apply:** For Playwright column-reorder checks, make both source and destination visible at the same time and assert the resulting header sequence rather than merely checking that it changed.