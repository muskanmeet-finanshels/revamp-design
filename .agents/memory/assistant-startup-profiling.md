---
name: Assistant startup profiling
description: Interpreting assistant launch latency on large server-rendered PMS screens.
---

Measure first-click latency during page initialization separately from reopening latency after client initialization. Do not treat network idle alone as proof that React hydration has finished.

**Why:** Browser profiling of a first assistant click included hydration and repeated filtering of the large Projects dataset, whereas subsequent opens were quick. Isolating only the assistant in a hydration boundary did not remove that cost; optimizing background page work was more useful.

**How to apply:** Use a client-initialization signal for steady-state comparisons, and separately measure early clicks. Keep session checks asynchronous rather than making the launcher wait for authorization. Avoid page-wide scrolling from transcript updates or composer focus. Never retain a previous session's transcript merely to speed up reopening.