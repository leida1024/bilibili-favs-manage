# Defensive operation boundaries

User authorizes disabling copying on own space and an audit/fix of similarly unreasonable operations. Implement and commit locally through verification; no release/remote push/account mutations. Inline only.

## Requirements

- Copy means another user's created folders → own account. On own space disable source checkboxes, target fields, select-all and start, with one concise visible reason. Keep statistics/management/settings usable. Missing login/unsupported page also blocks copy; never infer actor from visited-profile __INITIAL_STATE__.mid.
- Enforce boundary again in manager/API flow/native page-copy entry, with stable actor/source context and a same-folder ID check across awaited native preparation and immediately before confirm. Empty/malformed/exact duplicate task pairs fail before I/O. Preserve distinct sources to one destination and same names across different accounts.
- Prevent overlapping manager copy calls. Recheck actor/source after delays and before native handoff saves/navigation; keep own-space target-preparation resume (it is creation, not copying) and consume-before-execute.
- Account change on same route refreshes lifecycle/context and invalidates stale account panel/tickets/log ownership. Unavailable/default/foreign deletion rules already enforced remain. Web unsubscribe in a foreign space should explain own-page requirement before issuing a preview ticket; API method may still manage own subscriptions.
- Retain editing/settings continuity and native/API choice; do not auto-switch/retry unknown results. No new browser mutations or blanket warnings.

## Acceptance

- [x] Own/no-login/invalid-page copy UI disabled, reason visible, busy/settings/refresh cannot re-enable. Foreign logged-in normal copying remains available.
- [x] Direct copy bypass, repeated identical tasks, empty tasks and concurrent manager calls are rejected before writes; valid cross-account same-name pairs and many-to-one remain valid.
- [x] Native page/actor/folder changes during await stop before confirm; source/actor change during handoff delay prevents saving/navigation. Own target preparation still resumes.
- [x] Profile UID fallback never grants login; same-route account changes remount/invalidate. Foreign native unsubscribe preview is blocked with actionable reason without transport switch.
- [x] Meaningful tests/full build/generated review; local2.2.9, separate product/development commits, archive/journal. Fictional preview and live own-page read-only checks only where available.

Acceptance completed; evidence and practical limits are in verification.md.
