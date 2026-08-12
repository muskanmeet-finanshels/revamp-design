---
name: Radix menu scroll lock
description: Radix modal menus can shift fixed app-shell content when opening.
---

## Rule
For dropdowns used in the fixed Finanshels app shell, disable Radix modal scroll locking when opening the menu.

**Why:** Radix modal behavior can lock the body scrollbar, changing the viewport width and making the fixed TopBar contents visibly jump.

**How to apply:** Use the non-modal mode on Status, Sort, and similar filter controls when the menu should not alter the surrounding app-shell layout.