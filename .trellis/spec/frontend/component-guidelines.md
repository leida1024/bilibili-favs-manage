# Components and UI

`FloatingPanel` receives a manager instance. `UIComponents` creates DOM elements and `CheckboxItem` models a source/target row; `EventHandlers` coordinates user interaction. There is no component framework or stylesheet build pipeline.

For example, `FloatingPanel.refreshFavorites()` stores checked state and target text before replacing the list. Preserve this behavior across DOM refreshes and route changes. Keep Bilibili operations in the manager/adapters, not visual factories.

Use textContent/value for externally supplied names and log messages. Keep native buttons/inputs usable with keyboard focus and labels. New UI should use panel-scoped styles and avoid changing Bilibili's global page styles. Preserve drag, resize, minimize, and explicit close behavior unless the task deliberately changes them.

UI design work starts in the fictional preview with empty, long-list, busy, error, and narrow-screen examples. A preview must not invoke the real manager's mutation methods. User documentation screenshots must remain synthetic.
