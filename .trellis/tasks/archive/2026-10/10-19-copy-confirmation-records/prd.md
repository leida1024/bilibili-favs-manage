# Fix native copy confirmation and simplify persistent records

## Goal

Fix native copies stopping after successful submission, simplify record filters and retain history across navigation. User requests implementation; local verification/commits/archive authorized. No push, release, Greasy Fork update or real collection mutations.

## Requirements

- Native confirmation currently expires after exactly six seconds, matching the supplied timestamps. It only recognizes Chinese 操作成功 in .vui_toast. Read-only current public bundle still uses this class, and includes translated success texts. Exact cause of this historical miss remains unproven.
- Use a bounded 30-second confirmation window independent of animation delays, and fresh platform notifications. Preserve unknown-stop/no-retry behavior and legacy/VUI support.
- Replace six content filters with 日常记录 / 排查详情. Clearly explain hidden records and preserve unfiltered export.
- Handoffs currently save only the operation snapshot before a three-second wait and log waiting after navigation. Retain bounded full diagnostic history just before navigation, including waiting, with stable task identity, merge/dedup and clear protection.

## Acceptance Criteria

- [x] Delayed/localized/current VUI and legacy success signals confirm once; stale/hidden/unrelated messages and dialog closure do not. Explicit platform rejection stops; missing confirmation remains unknown. Cleanup verified.
- [x] Two record content modes, visible explanation/count of hidden records, full export, preserved scope and scroll/focus behavior.
- [x] Synthetic actual sidebar fallback survives own/source handoffs with denied session storage, no duplicates/replay; clear remains authoritative.
- [x] Build/tests, desktop/narrow synthetic browser review and read-only startup pass. Numeric 2.2.3, maintained docs and separate product/dev commits, archive/journal.

## Notes

- Supplied private collection name/IDs are not recorded. No disposable test objects were designated.
- UX dataset query and one narrower retry returned unrelated heading guidance; use skill's general forms/feedback checklist, not that result.
- Existing dist modification has no content diff (line endings only); regenerate exclusively through build. Exact historical sidebar loss is not yet reproduced; cover vulnerable snapshot boundaries without claiming otherwise.
