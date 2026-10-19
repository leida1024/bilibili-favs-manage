# Root causes and implementation evidence

## Empty legacy folders

Public platform assets (not account data):
- https://s1.hdslb.com/bfs/static/jinkela/space/12.space.d525618dfa1c1daa27addac6609189fa610fec82.js
- https://s1.hdslb.com/bfs/static/jinkela/space/11.space.d525618dfa1c1daa27addac6609189fa610fec82.js

Chunk12 renders `#fav-createdList-container .nav-title.nav-add` with 新建收藏夹; handleAddFav opens the independent chunk11 Edit component. Its visible `.edit-media-list .edit-mask` contains `#media-list-name.name-input` and `.submit-btn` with text 提 交. These differ from copy-dialog `input.add-fav-input` and `.fav-add-btn`. LegacyPageAdapter previously declared sidebarCreate=null, unnecessarily forcing the content-dependent alternative.

Adapter-specific form selectors scope the exact visible input and submit. Reject a preexisting visible Edit form to avoid editing another folder. Existing names reuse normalization; newly submitted folders still require observed sidebar confirmation. False after an attempted sidebar path stops later work, while null alone permits the documented video-dependent fallback. VUI keeps its existing creation path.

## Unavailable subscription preview

The original button was enabled and dispatched preview(), but the default webpage writer branch threw before rendering any target. Its reason appeared only in results below the list. This looked unresponsive. Availability is separate from authenticated subscription membership; native unavailable rows cannot establish stable IDs for writes.

Render the verified target preview first. For unavailable targets in webpage mode, immediately invalidate its temporary engine ticket, keep only informational review and visible Settings/back actions, and omit executable confirmation. The user must explicitly choose API, save, reload, select and preview again. Preserve unsupported identity exclusion and no automatic transport switching. No real unsubscribe was attempted.
