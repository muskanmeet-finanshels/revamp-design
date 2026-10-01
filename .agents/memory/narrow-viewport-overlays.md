---
name: Narrow viewport overlay checks
description: A responsive verification constraint for floating panels over scrollable PMS pages.
---

Verify floating overlays in a narrow desktop-browser viewport with a visible page scrollbar, not only an emulated mobile browser.

**Why:** A phone-width desktop viewport can have a narrower layout area than its viewport-unit width. Mobile emulation often hides this discrepancy, so an overlay can look correct there but clip when the user resizes the desktop preview.

**How to apply:** Check the full panel bounds, header controls, and composer against the usable viewport after layout settles. Include coexistence with other floating controls and test both their expanded and minimized states.