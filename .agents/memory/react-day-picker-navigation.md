---
name: React Day Picker navigation
description: React Day Picker v9 supports caption-adjacent navigation through its built-in around layout.
---

## Rule
For a month caption with previous and next controls on opposite sides, use `navLayout="around"` and style the previous/next month button class names; do not flatten the default nav wrapper with `display: contents`.

**Why:** In v9, the around layout renders the two buttons as siblings of the month caption inside the month container, while the default navigation element groups both buttons together.

**How to apply:** Keep the month container positioned, center the caption, and position the button class names at the left and right edges with accessible focus styles.