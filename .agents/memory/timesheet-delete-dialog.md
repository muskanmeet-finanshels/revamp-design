---
name: Timesheet delete dialog
description: Keep time-entry deletion confirmations consistent with the app-wide compact delete dialog.
---

Time-entry delete confirmation should use the same compact modal treatment as other app delete dialogs rather than a large, custom confirmation panel.

**Why:** The oversized treatment was visually inconsistent with the rest of the product and was explicitly rejected.

**How to apply:** Reuse the standard small red alert icon, compact typography, narrow modal width, and equal Cancel/Delete actions for future time-entry delete changes.