# State and operations

Local UI state lives on `FloatingPanel`, including busy, selection rows, drag/resize, and log scroll behavior. `FavoriteManager` and `CrossPageFlowManager` own operations. `StateManager` persists a JSON cross-page record through GM APIs, with localStorage fallback and a 30-minute expiry.

The current flow is creating -> return to source -> copying. Resume checks that the current page is the expected destination. The saved stage is consumed before performing changes, and the next stage is saved only after confirmed completion. Preserve the failure behavior: refresh must not blindly repeat uncertain folder creation or copying.

`utils/favoriteNames.js` trims leading/trailing whitespace but preserves internal spaces. Normalize all entry paths, including resumed tasks, and reuse an existing normalized-name target. Creation success requires observing the actual target, not just a button click. Do not submit again while the previous result is uncertain.

Future deletion/unsubscribe work must identify objects by stable IDs and ownership/type, preview exact targets, confirm explicitly, stop on uncertain results, and allow cancellation between items. These safeguards are requirements for future tasks; they are not existing shipped capabilities.
