# Threat Model

## Project Overview

A static UI artifact system for Finanshels (UAE accounting/compliance brand). The primary artifact is a Next.js 14 app (`output: 'export'`) that renders wireframe-converted screens with mock data only — no live backend, no authentication, no database. Secondary artifacts include an Expo-based mobile app and a standalone static file server (`artifacts/mobile/server/serve.js`) that serves the compiled Expo build over HTTP. The API server artifact (`artifacts/api-server`) exists but is described as unused so far.

The project is **not deployed** (deployment info confirmed no active deployment). All artifacts are frontend/static with no sensitive business logic or production data.

## Assets

- **Source code and design IP** — screen implementations converted from proprietary Finanshels wireframes. No user data is stored or processed.
- **Static build artifacts** — compiled JS/CSS bundles served by the mobile server. No secrets embedded.
- **Mobile server process** — the Node.js HTTP server in `artifacts/mobile/server/serve.js` is the only runtime component with file-system access.

There are no user credentials, PII, payment data, or application secrets in this project at present.

## Trust Boundaries

- **HTTP client → mobile static server** — the only server-side trust boundary. The `serve.js` server accepts HTTP requests and serves files from `artifacts/mobile/static-build/`. The server has no authentication; it is a public static file host.
- **Build-time → runtime** — `app.json` is read at startup to extract the app name; this is a one-time trusted read, not a runtime input.

## Scan Anchors

- **Only runtime server:** `artifacts/mobile/server/serve.js` — Node.js HTTP server, no auth, serves static files.
- **Static frontends (no server-side logic):** `artifacts/finanshels-ui/` (Next.js static export), `artifacts/mockup-sandbox/` (design canvas).
- **Unused:** `artifacts/api-server/` — described as unused; low priority.
- **Dev-only:** `scripts/`, `babel.config.js`, Metro config — build tooling, not production-reachable.
- **No authentication surface, no database, no secrets in code.**

## Threat Categories

### Information Disclosure

The `serveStaticFile` function in `serve.js` is the only path where user-controlled input reaches the file system. It is protected by three layers: `path.normalize()`, a regex stripping leading `../` sequences, and a `filePath.startsWith(STATIC_ROOT)` boundary check. Node.js `path.join()` does not allow absolute-path overrides in subsequent arguments, so the boundary check is sound. No path traversal is currently possible.

The `serveManifest` function accepts a `platform` value from the `expo-platform` request header but strictly validates it to `'ios'` or `'android'` before using it in a path join — no traversal possible.

### Denial of Service

The static server has no rate limiting, no request size caps, and no timeouts. An attacker could send high request volume. Impact is bounded to the mobile preview server; the static Next.js app is not affected. Given the non-deployed status this is low priority.

### Elevation of Privilege

No authentication, no roles, no admin surfaces. Not applicable at current scope.

### Spoofing / Tampering / Repudiation

All data is static and mock-only. No user state, sessions, or mutable records exist. Not applicable at current scope.
