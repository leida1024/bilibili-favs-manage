# Refresh continuity and native unsubscribe

## Goal

Deliver 2.2.2: refresh continuity, predictable panel geometry and independent user-selected webpage/API operation paths. Latest user explicitly includes earlier fixes and dual flows. Local implementation/commits authorized; no push, Greasy Fork changes or real-account writes.

## Requirements

- Keep last500 sanitized diagnostics across refresh in the current tab/account, without persisting executable tickets/selections.
- Persist panel position, expanded size and records visibility; hide records by shrinking right/bottom edge, preserving task dimensions/scroll; thin in-bounds resize edges and title-only dragging.
- Separate API and webpage modules, with independent choices for catalog/statistics, copy, creation and management; explicit disclosure, busy locking, no automatic fallback/retry after submission.
- Complete API paging and native load-more discovery. Handle folder subscriptions and seasons distinctly. Unknown identities remain ineligible.
- Preserve legacy/VUI, name normalization and consume-before-execute recovery. All three functions keep shared selection and own status/logs.
- Future advertising strip is deferred pending content; no marquee placeholder.
- Settings is a fourth normal panel; visible record filter labels/arrows. Correct destructive copy; minimize tooltip and smallest-size resize recovery.
- Unavailable subscribed content remains eligible for exact-ID API unsubscribe; missing author stays unknown. Native invalid rows without exposed IDs explain explicit API choice, never guess same-name targets. Keep statistics availability checks separate.
- Bounded GitHub/Greasy Fork competitor research is an additional artifact; video-level classification/filter/CRUD remains roadmap.

## Acceptance Criteria

- [x] Refresh/clear/malformed/denied-storage coverage; geometry survives refresh/minimize and viewport changes.
- [x] Side/bottom collapse preserves task rectangle/selection; drag boundaries and controls do not conflict.
- [x] Independent modes captured per task, no HTTP in native transport, no automatic fallback.
- [x] Live read-only subscription parity, no names/IDs/screenshots committed.
- [x] Synthetic confirmed/failed/unknown/cancellation/account-change coverage for both paths, full build/tests and fictional browser checks.
- [x] Numeric2.2.2, maintained docs, separate local product/dev commits, archive/journal, no push.

## Notes

Live evidence: API230 entries (229 type21 seasons,1 type11 folder). Web initially50+remaining180, expanded230; name multisets match (198 unique), not proof of all ID equality. Collected-list folder fav_state0 requires membership-based subscription evidence. No blocking product questions. Latest follow-up: all230 pass API unsubscribe preflight, including32 unavailable/unknown-owner entries; no writes.

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
