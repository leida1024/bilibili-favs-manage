# Components and UI

`FloatingPanel` receives a manager instance. `UIComponents` creates DOM elements and `CheckboxItem` models a source/target row; `EventHandlers` coordinates user interaction. There is no component framework or stylesheet build pipeline.

For example, `FloatingPanel.refreshFavorites()` stores checked state and target text before replacing the list. Preserve this behavior across DOM refreshes and route changes. Keep Bilibili operations in the manager/adapters, not visual factories.

Use textContent/value for externally supplied names and log messages. Keep native buttons/inputs usable with keyboard focus and labels. New UI should use panel-scoped styles and avoid changing Bilibili's global page styles. Preserve drag, resize, minimize, and explicit close behavior unless the task deliberately changes them.

UI design work starts in the fictional preview with empty, long-list, busy, error, and narrow-screen examples. A preview must not invoke the real manager's mutation methods. User documentation screenshots must remain synthetic.

Default to copy, with adjacent source and destination. Dimensions come from CONFIG.PANEL:600×500, bounded by the viewport. Records default to272px, leaving about326px workspace. PanelLayout owns validated geometry and records orientation; below560px expanded width records move below the footer. Hiding records removes their right/bottom auxiliary space while preserving the task/footer rectangles and current orientation. Reopening after a hidden resize preserves the new workspace size, subject to viewport limits. Navigation/actions stay outside the single task scroller. Minimize saves expanded geometry and restores it; tooltip, icon and accessible name must agree. Records filters show visible 范围/内容 labels and native arrows; keep their heading, filters, content and actions inside the pane on narrow screens.

The user rejected clutter, repeated help, redundant titles, and expanding prose. List rows prioritize names/counts/unavailable reasons; IDs/owners belong in native name tooltips and accessible checkbox names, and must be directly visible in final destructive confirmation together with exact counts and consequences. Keep help to one contextual line. Diagnostics use the header's `aria-expanded` button without hiding essential operation information. Progress details use persistent footer nodes; updates must not recreate controls, steal focus or force task scrolling. Idle operation content is absent; active/terminal details must be visible without a click.

`InventoryPanel.resetCatalog(message)` clears report/result/catalog/selection/ticket and stale task scroll on scope changes, explicit reload and mutation completion. Scope change resets operation feedback; completed mutation results remain visible after reset. No stale statistics export may survive a mutation. Failed/cancelled load must replace loading text with recovery guidance. Confirmation hides the redundant preview action; abandoning invalidates the ticket, restores the preview action and focuses it. Records preserve their own scroll when follow is disabled and skip hidden/minimized rerenders. Operation lifecycle transitions are recorded once, not on every progress count. Test these transitions, not just first-open screenshots.

`FloatingPanel.showView(view)` only accepts copy/statistics/manage/settings, performs no I/O and is idempotent for the active view. Settings is a normal fourth navigation panel with no I/O on opening, no modal inertness and no operation footer. Actual task switches preserve copy edits, independent statistics/management selections and per-task scroll, while invalidating destructive tickets. `toggleLogs()` changes only diagnostics visibility; it must not call setMode/invalidate or reset task scroll. Busy operation navigation is locked, while records remain accessible. Export review is a modal overlay with inert task/header/footer/navigation/diagnostics, keyboard focus containment, Escape close and focus restoration. Do not append export text below a long task list.

Use scoped `--bf-font`, `--bf-text` (14px), `--bf-small` (12px), `--bf-title` (15px) and semantic color tokens. All labels, form controls, export text and records inherit the local Chinese-friendly system sans stack. Avoid external font loading or a second monospace family. Verify against hostile host form/label font rules and reduced-motion. Essential text pairs need 4.5:1 contrast; visible control boundaries/focus need 3:1. Disabled controls are checked for semantic disabling rather than normal contrast.

Prioritize lists over static prose. Copy column headings identify scope; redundant scope summary is screen-reader-only. Keep one concise help line. Status/count share a line; detail and last confirmation flow below. Never wrap the same failure at UI, resume and core layers. Preserve full wrapping names/consequences. Count complete visible rows at default size:at least7 short copy rows and7 management rows. Reduced-motion rules match control specificity and yield `0s`.

Three OperationState instances belong to copy/statistics/manage. Subscribe once per owner; rendering a hidden view's state must not change the visible footer. Successful catalog loading records completion then returns to idle. Resetting the shared catalog also clears obsolete statistics/management status, preserving a currently running operation. Current-function records are the default; normal level omits debug click traces, while all/debug remain available. Log time is displayed locally, exported as ISO.

Scope is a pair of native buttons with aria-pressed and a named group, never a select. Statistics labels are 当前空间/我的订阅; management labels are 删除收藏夹/取消订阅. Same-scope click is idempotent, switches reset the shared snapshot and tickets, and busy prevents changes. Zero rows hide search/count/all controls. Count reports ineligible rows separately; filtering never silently removes selected targets from execution.

## Shared selection contract

`SelectionToolbar({rows, busy, change})` reads `{input, node, name, eligible}` rows. All three tasks use this component. Search changes row visibility, preserving nodes/edits/selection; bulk toggle affects only matching eligible rows. Count all selected eligible rows and explicitly warn about selected rows outside the filter, which remain in the execution scope. `change()` owns operation side effects: management invalidates its ticket before updating controls. Search alone never invalidates the ticket or performs I/O. Zero eligible matches disables bulk selection; busy disables search and selection, including programmatic toggle. Rebuild/reset must call `update()` against the new rows.

Do not create a `Set` from one `rows()` call and compare objects from a second projection: copy rows are recreated on each call. Pass a single snapshot into `visibleRows(rows)` inside update. Tests must select/deselect through filters, preserve hidden edits, skip protected/unsupported objects and invalidate management tickets. Desktop dense-list acceptance counts complete row rectangles, rather than rounding a partially clipped row as visible.


## Resize recovery contract

1. Trigger: user shrinks to280×64, then enlarges again, including on Settings.
2. Signatures: EventHandlers.mouseDown/mouseMove/dragOnPanel; PanelLayout.clamp/save.
3. Contract:4px in-bounds edges plus a visible14px bottom-right grip; no native CSS resize. Listen for move/up on document, and release/save on window blur. Title dragging excludes controls, requires3px movement and has a keyboard alternative.
4. Errors: reject outside edge coordinates and non-primary buttons; clamp to viewport; storage failures leave the UI usable. Minimized windows cannot resize.
5. Cases: good—shrink then enlarge with actual mouse; base—title arrows move/Shift+arrows resize; bad—body-only listeners stop receiving moves over documentElement, or child controls obscure the only resize hit area.
6. Tests: documentElement move/up grows the smallest panel; actual browser mouse verifies Settings resizing; minimize/restore checks title and aria-label; collapse/reopen checks task and footer rectangles at600/480/400px.
7. Wrong/correct: wrong—enable both CSS resize and custom gesture tracking. Correct—one gesture owner and an explicit reachable grip.
