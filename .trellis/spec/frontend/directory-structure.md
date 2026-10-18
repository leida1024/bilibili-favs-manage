# Directory structure

- `src/main.js`: injection entry, lifecycle creation, UI/manager binding, Tampermonkey menu.
- `src/core/PageLifecycle.js`: route/readiness detection, mount/refresh/unmount decisions.
- `src/core/FavoriteManager.js`: operation orchestration; `BilibiliAPI.js`: DOM-driven operations, not an HTTP API client.
- `src/core/adapters/`: legacy/VUI selectors and layout-specific discovery. Add layout support here instead of scattering selectors through UI.
- `src/core/CrossPageFlowManager.js` and `StateManager.js`: persisted cross-navigation flow.
- `src/ui/`: DOM component factories, floating panel, event handlers.
- `src/utils/`: existing shared name normalization, DOM, logging, storage helpers.
- `test/*.test.js`: Node test runner with jsdom fixtures.
- `examples/panel-preview.html`: actual UI with a simulated manager and fictional content.
- `dist/`: tracked Rollup output, generated rather than manually maintained.

Classes use PascalCase filenames; shared helpers use camelCase. Keep the current ES-module layout. Search existing consumers before introducing new utilities or dependencies. Development planning belongs in `.trellis/tasks/`, not new root-level planning documents.

- FolderClient owns HTTP only; WebFolderClient/nativeControls own DOM discovery and operations; neither falls back to the other. TransportClient captures reader/writer choices. ApiCopyFlow owns HTTP copy orchestration independently of the legacy DOM flow.
- PanelLayout owns geometry/collapse persistence. utils/preferences.js validates inert UI preferences; LogStore owns bounded account/tab diagnostics. Never store executable tickets in these stores.
