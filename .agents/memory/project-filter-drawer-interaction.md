---
name: Project filter drawer interaction
description: Browser interaction caveats for the Projects filter drawer's portaled multi-select menus.
---

When automating the Projects filter drawer, selecting an option by clicking its text may not update the filter; interact with the custom checkbox control and assert that Apply Filter becomes enabled. At the default browser viewport, a dropdown lower in the scrollable drawer can render its fixed-position portal outside the viewport.

**Why:** A browser check stalled first on an offscreen client menu option, then on a disabled Apply Filter after clicking status option text. Targeting an upper menu and its checkbox completed the flow.

**How to apply:** Favor a visible upper filter in browser checks until the lower dropdown positioning is corrected; verify state before applying rather than relying on a click to mean selection.