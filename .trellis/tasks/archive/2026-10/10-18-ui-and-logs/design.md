# Design

## Evidence and authorization

The 2026-10-18 request selects Stages 0–4 through local implementation, verification, commits, archives, and journals. The later instruction forbids remote pushes. No release or real-account mutations are authorized. Bootstrap completed with verified panel injection.

FloatingPanel currently mixes form and logs; append-only DOM logs are unbounded and the output element's scroll listener writes state to the wrong object. Copy reports no structured results and cross-page handoff can be mistaken for completion. Keep existing DOM adapters and consume-before-execute persistence.

## Contracts

- OperationState is an in-memory observable snapshot: status (idle/running/completed/failed/interrupted), action, confirmed count, nullable total, last confirmed step, detail. Single operation admission stays with the panel/manager; no destructive queue is persisted.
- FavoriteManager owns the model. Copy progress advances only after confirmed folder completion. Page detail is informational; cross-page handoff becomes interrupted/waiting rather than completed. Missing identity/navigation failures fail visibly. Resume remains governed by CrossPageFlowManager and StateManager.
- LogStore retains at most 500 timestamped level/message entries, truncates oversized messages, redacts credential-like values/URLs, filters by level, and exports only its allowlisted fields. A read-only local export preview warns that folder names/IDs can remain; downloading requires an explicit action.
- FloatingPanel retains source/target rows and busy guard. Add scoped CSS, header, copy explanation, selection review, operation status, collapsible diagnostics and export review. Controls remain native and labeled. Narrow viewport uses a single-column layout, bounded to the viewport; header is the drag handle. Minimize hides content, restore clamps bounds; close does not misrepresent in-flight cancellation.

## Compatibility and rollback

Plain JS/DOM only, no new dependencies. Preserve old/VUI source discovery, target normalization, existing creation/recovery contracts, refresh selection, and logger forwarding. UI factory text uses textContent. Revert the product commit to roll back; no persisted data migration.

## Preview first

Use actual FloatingPanel with a fictional manager and scenario controls for empty, many/long names, running, partial failure, completed, and interrupted. No Bilibili entry point or network mutation code is invoked. Browser evidence/screenshots use this preview only.
