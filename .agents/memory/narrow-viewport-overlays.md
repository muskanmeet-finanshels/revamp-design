---
name: Narrow viewport overlay checks
description: A responsive verification constraint for floating panels over scrollable PMS pages.
---

Verify floating overlays in a narrow desktop-browser viewport with a visible page scrollbar, not only an emulated mobile browser.

**Why:** A phone-width desktop viewport can have a narrower layout area than its viewport-unit width. Mobile emulation often hides this discrepancy, so an overlay can look correct there but clip when the user resizes the desktop preview.

**How to apply:** Check the full panel bounds, header controls, and composer against the usable viewport after layout settles. Include coexistence with other floating controls and test both their expanded and minimized states.

With `scrollbar-gutter: stable`, headless Chromium can report root `clientWidth` equal to `innerWidth` even when a classic scrollbar reserves layout space.

**Why:** A scrollbar-bearing desktop check falsely reported no scrollbar although the root's layout rectangle excluded a 16px gutter.

**How to apply:** Assert that the root layout rectangle is narrower than the window, and compare overlay bounds against the smaller of that rectangle's right edge and root `clientWidth`. Do not use `innerWidth - clientWidth` alone to detect the scrollbar.