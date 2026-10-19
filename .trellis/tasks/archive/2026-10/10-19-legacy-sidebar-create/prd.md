# Fix empty legacy creation and unavailable subscription preview

## Goal

Create target folders directly through the legacy sidebar even when the current/all own folders are empty. Deliver local2.2.5 without relying on selecting a video.

## Requirements

- Adapt the actual legacy `#fav-createdList-container .nav-add` entry and independent `.edit-media-list .edit-mask` form (`#media-list-name`, `.submit-btn`, text 提 交), based on public legacy favorites/chunk11 components.
- Scope form input/submit to the opened visible creation form; hidden copy controls and unrelated forms must never be submitted. Keep VUI and copy-dialog creation compatible.
- Reuse normalized existing names; observe a new sidebar target before declaring success. After opening/submitting sidebar creation, failure stops instead of switching entry points and creating again.
- Explain any genuinely missing-sidebar fallback accurately, including its video-selection requirement and actionable empty-page failure.
- Follow-up: user reports unavailable subscriptions cannot open “预览退订目标”. Keep membership-confirmed unavailable targets selectable and previewable. If native management cannot verify their ID, show the exact preview plus a visible explanation/settings action, issue no executable ticket, and require explicit API choice/reload/confirmation. Never silently switch transports or mutate a real subscription.
- User's follow-up identifies an actual bug in the ongoing repair scope; implement/test/commit locally without further phase approval. No remote push/publication. No live copy/deletion/subscription required for this focused fix; prior live legacy limits remain explicit.

## Acceptance Criteria

- [x] Realistic legacy independent-form fixture creates two targets with no video cards/batch/copy buttons, single submission per target, normalized name reuse.
- [x] Hidden stale controls, missing/unconfirmed result and denied guard cannot produce duplicate submission/fallback. Web creator and consumed cross-page preparation use the sidebar path.
- [x] Real checkbox/button clicks preview unavailable subscriptions under default web management; the ID list and Settings→API guidance are visible, no confirmation ticket/write is possible until explicit supported mode/reload/preview. API confirmation remains available after fresh selection.
- [x] Existing VUI/copy-dialog tests, complete build/tests and diff checks pass. Record local version and remaining legacy live limits; separate product/dev commits and archive.

## Notes

- Lightweight adapter/shared-helper repair. Add optional adapter sidebarCreateForm selectors, pass the exact visible input/submit to shared helpers, preserve null-only fallback contract. Test fixtures follow legacy chunk11/12 already referenced in the previous task research.
- Verify targeted empty-page tests, then build before full tests, inspect generated diff and record evidence. Synthetic fixtures establish legacy behavior; do not claim legacy live acceptance.
