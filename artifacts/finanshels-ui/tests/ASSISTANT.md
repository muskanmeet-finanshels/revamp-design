# Focused assistant browser regressions

Start the managed `artifacts/finanshels-ui: web` workflow, then run from the workspace root:

```sh
pnpm --filter @pms-revamp/finanshels-ui run test:pms-assistant-browser
```

The dedicated config reuses the managed server at `http://127.0.0.1:18749`.
It never starts a second Next process or shares a new process with `.next-dev`.
For an already running isolated server, set `PMS_ASSISTANT_BASE_URL` to its URL.
Allow up to three minutes for the first `/projects` compilation on a cold server.
Chromium uses `CHROMIUM_PATH` if specified, otherwise the existing workspace
binary or Playwright's installed browser.

Each test gets a fresh Playwright browser context/storage. Only assistant
`status` and `answers` requests are intercepted. Opaque session/permission keys
and evidence are test-only server contracts, not real users, production
fixtures, browser-supplied authority, or enabled auth/data/AI adapters.
Every answer request is checked to contain only `question`.

Coverage includes portfolio/demo separation, input/chip submission, keyboard
focus, classic scrollbar bounds, ranked successful intents, non-learning
failures, independent resets, bounded per-namespace restoration, aborted late
answers on session/permission/visibility changes, failed status verification,
and denied/corrupt/oversized/expired storage. No chat transcripts are persisted.

These checks supplement the API/preference unit tests:

```sh
pnpm --filter @pms-revamp/finanshels-ui run test:pms-assistant
```

They do not validate real authentication, source permissions, or live adapters.