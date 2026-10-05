---
name: Assistant transcript lifetime
description: Security constraint for local assistant transcript exports and session-bound evidence.
---

Assistant transcript downloads must obey the same lifetime as the visible source-backed conversation. Invalidate imperative export snapshots synchronously when clearing a conversation for blur, a hidden tab, or lost authorization; do not rely only on a queued React state update.

**Why:** React state updates are asynchronous. A download callback can otherwise still hold authorized excerpts while the visible transcript is waiting to clear. Export must not introduce a second, longer-lived copy of session-bound evidence.

**How to apply:** Future export or share controls must read only the current conversation, clear alongside session changes and resets, and exclude unsent drafts, preference storage, and authorization identifiers. Local downloads are explicit user actions, not automatic persistence or uploads.