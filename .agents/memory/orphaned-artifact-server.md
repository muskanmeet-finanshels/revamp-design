---
name: Orphaned artifact server
description: Distinguish an orphaned service holding an artifact port from an application routing bug.
---

A managed web workflow can report `EADDRINUSE` and finish while an earlier child server remains alive on the injected port. In that state, a preview error can look like a missing route even though the application routes themselves still work.

**Why:** Restarting the managed workflow did not release an older server process, so a new instance could not bind its configured port.

**How to apply:** Before changing routes or artifact configuration, check workflow logs and identify the process that owns the configured port. If it is an orphan of the same service, stop that process and restart the existing managed workflow. Verify the proxied app routes afterward.