# Lifecycle and event handling

There are no React hooks. This file covers page lifecycle and browser event rules.

`src/main.js` guards `window.__biliFavsLifecycle`, uses a 500 ms interval and pageshow, and delegates route/DOM readiness to `PageLifecycle.tick()`. It does not wait for window load or patch the website's history. Initial readiness may be late; timeout notices must not permanently stop later detection.

Preserve one panel on the same user's folder changes, remove it when leaving favorites, and respect explicit dismissal. A destroyed panel is reopened only through an explicit action. Clear panel/logger references on unmount; assign window proxies to null instead of deleting their properties because the userscript sandbox can reject delete.

Put layout differences in `core/adapters/`. Poll only the state needed, do not repeatedly reset the user's form or start operations while discovering the DOM. New event listeners and timers need a defined owner and cleanup path.
