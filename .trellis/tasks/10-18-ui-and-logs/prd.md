# Panel UI and operation logs

## Goal

Make it clear what is selected, what will happen, what is running, and what failed. This is the first planned product increment; no implementation has shipped in this bootstrap task.

## Evidence and dependencies

Current UI is direct DOM in src/ui; FloatingPanel combines selection, controls, and an append-only output box. utils/logger.js forwards formatted strings to one global panel and logs to console; there is no structured event store. Preserve old/VUI adapter compatibility, selections across refresh, drag/resize/minimize/dismiss, and single-operation busy protection.

Inspect these consumers before designing a shared progress/log model. Build/review the fictional preview first. Requires the development workspace/bootstrap task to be complete.

## Initial requirements

- Separate source selection, target review, action controls, progress, and diagnostic details visually.
- State which folder/page is active and whether the operation is running, completed, failed, or interrupted; do not invent totals unavailable to the current DOM.
- Add log levels/filtering, bounded retention, clear/export controls, and explicit follow-latest behavior without losing failure details. Export must omit credentials and let users review collection identifiers before sharing.
- Present long names, empty sources, narrow viewports, and busy/error states clearly. Keep native keyboard-operable controls.
- Do not change copy semantics as part of cosmetic work; necessary progress plumbing gets focused behavior tests.

## Acceptance criteria

- A synthetic preview covers empty, long-list, running, failure, and complete states without real-account calls.
- Existing regression tests pass; tests cover new state/log behavior and bounded retention/export sanitization where implemented.
- A slow/failed task reports its last confirmed step and does not remain stuck in busy state.
- Resizing and refreshing preserve the selected sources/target edits; logs remain readable without forced scrolling while the user reads earlier entries.
- Local-injection smoke checks are recorded separately from Tampermonkey/cross-page compatibility checks.

## Scope and authorization

This task is a prioritized planning entry. Complete design.md and implement.md before activation when selected for implementation. Default approach is to keep plain JS and reuse the existing components; a framework rewrite is out of scope. No Greasy Fork release or real collection mutations are authorized by this PRD.
