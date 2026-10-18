# State and operations

Local UI state lives on `FloatingPanel`, including busy, selection rows, drag/resize, and log scroll behavior. `FavoriteManager` and `CrossPageFlowManager` own operations. `StateManager` persists a JSON cross-page record through GM APIs, with localStorage fallback and a 30-minute expiry.

The current flow is creating -> return to source -> copying. Resume checks that the current page is the expected destination. The saved stage is consumed before performing changes, and the next stage is saved only after confirmed completion. Preserve the failure behavior: refresh must not blindly repeat uncertain folder creation or copying.

`utils/favoriteNames.js` trims leading/trailing whitespace but preserves internal spaces. Normalize all entry paths, including resumed tasks, and reuse an existing normalized-name target. Creation success requires observing the actual target, not just a button click. Do not submit again while the previous result is uncertain.

## Inventory and destructive operations

`FolderClient.folders(ownerId, kind, signal)` validates complete enumeration and returns normalized immutable identities. `InventoryService.scan(folders, options)` returns explicit selected-scope coverage; unknown metadata stays null. Unsupported seasons never become folder subscriptions. Null lists count as empty only with explicit zero totals and no further pages.

`BatchOperations.prepare(action, folders)` creates a one-use in-memory ticket with actor, scope and immutable targets. `execute(ticket, {confirmed, signal, onResult})` consumes it before awaiting, revalidates the complete catalog before every item and submits sequentially. Nothing is persisted. Good: same-name IDs remain distinct; base: platform code0 acknowledges a confirmed item; bad: changed identity/name/count/type/protection stops before submitting. Missing owner/actor, foreign/default/special folders and unavailable subscription states are ineligible.

Confirmed/failed/unknown/not_started are separate outcomes. A lost/malformed response after submission is unknown, even on cancellation; stop with no retries. Cancellation before submission leaves the item not_started. A refresh must require a fresh selection and preview. Test these boundaries with synthetic clients, including account changes during revalidation; never default to real mutations. Copy retains its separate consume-before-execute cross-page record.
