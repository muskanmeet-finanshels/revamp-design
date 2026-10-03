# PMS assistant backend handoff

## Contract

The API server is mounted under `/api`, so the effective routes are:

- `GET /api/pms-assistant/status` → `{ ready: boolean, reason: string }`
- `POST /api/pms-assistant/answers` → `{ question: string }` only

The request rejects every property besides `question`. An answer is either
`answered` or `unavailable` and includes an `answer`, exact source `citations`,
and `claims`. Each claim has a `basis` of `recorded` or `inference` and one or
more `citationIds`. Citation IDs use the stable `kind:id` format (for example,
`task:task-123`). Citation objects contain the canonical kind, record ID, title,
and exact excerpt returned by the trusted data adapter.

The response component names are `PmsAssistantAnswer` and
`PmsAssistantStatus`; generated frontend type imports are in
`lib/api-client-react/src/generated/api.schemas.ts`.

## Current availability gate

The production router deliberately uses `adapter: null`. No live identity
provider, PMS data source, or proxy provisioning callback was available for this
implementation. It therefore reports `ready: false` with
`trusted_data_unavailable` and never sends a question to a model. Once a trusted
adapter is wired, the model provider is separately gated by non-empty
`AI_INTEGRATIONS_OPENAI_BASE_URL` and `AI_INTEGRATIONS_OPENAI_API_KEY`; missing
proxy configuration reports `openai_proxy_unavailable` and returns an explicit
unavailable answer. The server uses native `fetch` against the configured
OpenAI-compatible proxy and does not read or manage secrets beyond these
environment variables. A model name can optionally be set through
`AI_INTEGRATIONS_OPENAI_MODEL`.

## Future live wiring gate

Do not enable a production adapter until all of the following are available:

1. An established server authentication middleware whose trusted subject is
   available to the adapter. Never accept identity, tenant, client, project,
   task, or page context from the request body or client headers.
2. A read-only data adapter whose retrieval method applies that authenticated
   subject's authorization to client, project, and task records at query time.
   It must return only relevant, accessible records and include their accessible
   parent client/project records so relationship checks can be performed.
   Additionally, implement the required `canReadRecord(identity, record)` check
   for every individual returned client, project, and task. The service calls
   this per-record defense independently before relationship validation and
   before any model context is constructed.
3. The data adapter must preserve the `clientId` and `projectId` relationships.
   The service rechecks the chain and removes children with missing or foreign
   parents before any model call. Do not bypass this defensive filter.
4. Proxy configuration provisioned through the supported integration flow.
   Until both provider and trusted adapter gates are satisfied, status must
   remain unavailable.

Reuse the shared live record repository delivered by the API-backed storage
work; do not create assistant-owned client/project/task tables or migrate the
fictional browser datasets. Authorization must use the product's effective
read-action scopes (one direct role plus active group-role inheritance, Own /
Reporting Team / All and permitted exceptions). Department or vertical
membership is classification, not a grant. Browser-local role settings are
never proof of identity or authorization.

Wire the live adapter only in the production router construction. `GET status`
checks server-authenticated identity on every request, and all assistant
responses set `Cache-Control: no-store` so a signed-out session does not reuse a
prior ready status or assistant response. Keep test adapters and fixtures in
the focused test file; never export fixtures or install them as runtime
defaults. No storage migration or authentication implementation is part of
this handoff.

The model sees only the authenticated adapter's relationship-validated records.
Question and evidence strings are treated as untrusted prompt data. Model output
is accepted only when it is valid JSON with non-empty cited claims, every
citation ID belongs to the evidence sent to the model, and `answer` is exactly
the claim text joined by spaces. The server builds citation excerpts from the
trusted records rather than trusting model-supplied titles or quotations.
Claims marked `recorded` must be verbatim substrings of at least one cited
excerpt; other explanations or causes must be labeled `inference`. For
irrelevant or insufficient evidence, the model is instructed to explicitly
return `{"status":"unavailable","answer":"","claims":[]}` rather than inventing
a claim. Malformed, uncited, empty-evidence, or provider-error paths return
`status: "unavailable"`. The model request has a 15-second abort timeout.

## Verification

After changing the OpenAPI contract, regenerate types and hooks:

```sh
pnpm --filter @workspace/api-spec run codegen
```

Focused backend coverage:

```sh
pnpm --filter @workspace/api-server run test:pms-assistant
pnpm --filter @workspace/api-server run typecheck
```