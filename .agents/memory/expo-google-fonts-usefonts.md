---
name: Expo Google Fonts useFonts quirk
description: Freshly added @expo-google-fonts packages break React in this pnpm workspace when their re-exported useFonts is used.
---

In this pnpm workspace, importing `useFonts` from a freshly `pnpm add`-ed `@expo-google-fonts/*` package (e.g. poppins) causes an "Invalid hook call / Cannot read properties of null (reading 'useState')" crash — the package resolves its own expo-font/react instance under Metro.

**Why:** pnpm strict node_modules give the newly added font package a different expo-font resolution than the scaffold's, bundling two React copies.

**How to apply:** Import only the font asset constants from `@expo-google-fonts/*` and import `useFonts` from `expo-font` directly.
