---
name: TypeScript 7 config and React 19 types
description: Migration constraints for the Expo and React 19 workspace artifacts.
---

TypeScript 7 no longer supports `baseUrl`; keep Expo path aliases project-relative and omit `baseUrl` from mobile tsconfig files.

**Why:** TypeScript 7 turns the TypeScript 6 deprecation into a hard configuration error, even when the alias target already works from the project root.

**How to apply:** Before evaluating TypeScript 7, remove legacy `baseUrl` settings and keep `moduleResolution` on Expo's supported `bundler` mode. Align React 19 type packages with the Expo runtime line so packages do not load duplicate `Ref` definitions.