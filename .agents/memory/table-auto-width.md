---
name: Table auto-width layout
description: Correct Tailwind class combo for drag-and-drop tables that must fill their container without a fixed colgroup.
---

## Rule
All tables with `table-auto` (i.e. drag-and-drop column reordering) must use:

```
w-full min-w-[Xpx] table-auto
```

**Never** use `w-max min-w-[Xpx] table-auto`.

**Why:** `w-max` sets `width: max-content`, so the table only takes up as much horizontal space as its columns need. When the scroll container is wider than the content, blank white space appears to the right of the last column. This is visually broken and has been flagged as a bug twice.

**How to apply:** Whenever adding `table-auto` to a `<Table>` inside an `overflow-x-auto` scroll wrapper, always pair it with `w-full`. Use `min-w-[Xpx]` to set the threshold below which horizontal scroll kicks in.

Current table class patterns in use:
- Projects: `w-full min-w-[1500px] table-auto`
- Tasks: `w-full min-w-[1220px] table-auto`
- Timesheets (both tabs): `w-full min-w-[900px] table-auto`
