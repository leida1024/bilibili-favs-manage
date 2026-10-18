# Components and UI

`FloatingPanel` receives a manager instance. `UIComponents` creates DOM elements and `CheckboxItem` models a source/target row; `EventHandlers` coordinates user interaction. There is no component framework or stylesheet build pipeline.

For example, `FloatingPanel.refreshFavorites()` stores checked state and target text before replacing the list. Preserve this behavior across DOM refreshes and route changes. Keep Bilibili operations in the manager/adapters, not visual factories.

Use textContent/value for externally supplied names and log messages. Keep native buttons/inputs usable with keyboard focus and labels. New UI should use panel-scoped styles and avoid changing Bilibili's global page styles. Preserve drag, resize, minimize, and explicit close behavior unless the task deliberately changes them.

UI design work starts in the fictional preview with empty, long-list, busy, error, and narrow-screen examples. A preview must not invoke the real manager's mutation methods. User documentation screenshots must remain synthetic.

Default to the copy task. Keep each source checkbox/name and editable destination alongside one another at desktop and narrow panel widths; use container queries because the window can be resized independently of the viewport. Keep navigation and action footer outside the single scrolling task body. Lists must not introduce nested scrollbars. Diagnostics use a separate view with one scrolling log body. Keep help and ordinary object identity details expandable; destructive confirmation must always expose exact IDs, owners and counts.

Task switches must preserve copy edits, perform no I/O, and invalidate destructive tickets and selections when changing inventory mode. Busy operation navigation is locked, while diagnostic viewing and return remain available. Export review is a modal overlay with inert background, keyboard focus containment, Escape close and focus restoration. Do not append export text below a long task list.
