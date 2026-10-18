# Design

## Information structure
Copy remains the default and most prominent task. Statistics and management remain separate because their intent and confirmation requirements differ. Records have no primary task or unique input workflow: place a labelled, bounded diagnostics region below the fixed action footer. The header toggles this region with aria-expanded; closing restores trigger focus when needed. Diagnostics have their own reading position; the task keeps one body scroller. This deliberately supersedes the previous full-screen records design, while retaining direct help and identities.

## Visual direction and research
ui-ux-pro-max design-system searches `collection management productivity compact` and narrower `productivity tool dashboard` returned an off-topic marketing landing pattern. That pattern and palette/font suggestions are rejected and not persisted as a design system. Flat-design consistency, hierarchy and focus guidance fit this utility. The html-tailwind typography result confirms using a consistent size scale; implementation remains native JS/CSS, not Tailwind. Navigation searches did not produce a verified state-preservation match after one retry: apply the skill Quick Reference general guidance, backed by repository behavior tests.

Use local Chinese system sans throughout controls, labels and exports. 12/14/16px roles, 400/600 weights, 4/8px spacing, shared semantic colors, borders and focus rings. Blue is for primary task and selection; red is reserved for destructive confirmation/errors. No decorative artwork or external fonts.

## Space allocation after screenshot feedback
Place copy scope metadata next to the heading; one short helper paragraph explains reuse/new targets, normalization, source preservation and cross-space continuity. Statistics omits engineering pacing/page-limit details from the introductory UI; maintained docs retain exact limits. The footer uses status/count followed by specific detail and last-confirmed text on the same flowing line; remove the duplicated generic warning. No truncation or disclosure is used to conceal essential content. At 680px panel width/700px height in the fictional failure scenario with records open, heading/help occupy 54px and status occupies 45px; four complete source rows are visible versus approximately two in the rejected screenshot.

## State boundaries
FloatingPanel owns active task, per-task scroll, minimized state and diagnostics-open state independently. showView is idempotent and has no records pseudo-route. Actual task changes invalidate tickets; inventory mode changes preserve independent checkboxes. Record opening/closing must not call setMode/invalidate. OperationState updates existing footer nodes, without moving focus or scroll.

InventoryPanel owns shared visible catalog/scope and independent statistics/management selections. Explicit scope change or load resets the catalog/report/results and confirmation. Mutation completion invalidates cached scan/report/catalog and gives a reload instruction; no stale export survives. BatchOperations one-use tickets and revalidation remain untouched.

Export overlay makes task, navigation, header, footer and diagnostics inert and restores focus on close. Minimize hides task/navigation/footer/diagnostics and restores their independent state.

## Compatibility and rollback
No persisted data or engine contract changes; old/VUI adapters and startup recovery unchanged. Roll back the product commit and rebuild if needed. Browser preview uses fictional clients; live smoke only startup/navigation/rendering. No full-navigation or GM sandbox guarantee from console injection.
