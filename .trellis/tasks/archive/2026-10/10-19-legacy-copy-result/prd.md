# Fix legacy copy confirmation and native folder deletion

## Goal

Fix successful legacy copies being reported unknown and diagnose native folder deletion with disposable live objects. Deliver local 2.2.4 without publishing.

## Requirements

- Recognize the actual legacy `.be-toast` success text `复制成功(ง •̀_•́)ง`; preserve single submission and stop on explicit failure/unknown.
- Verify native management selectors/events against the legacy public application and available live layout. Keep API-read/web-write identity checks and consume-before-execute.
- Put the real per-target error in operation records/footer rather than reporting only that confirmation was consumed.
- Preserve the prior simplified records controls and both navigation handoff histories.
- Authorization: user requested continued repairs and explicitly authorized creating new folders then deleting those for real-account validation. Only folders named `BFM临时验证-20261019-…` created in this session may be deleted; preserve existing objects. No live copy/subscription mutations, push, master or Greasy Fork publication.

## Acceptance Criteria

- [x] Realistic legacy toast fixture continues two copy tasks with one click each; negative/stale/hidden signals still cannot confirm.
- [x] Native delete tests use actual legacy hover and confirmation markup, including hybrid API-read/web-write and failure diagnostics.
- [x] Two disposable create/delete live cycles succeeded and cleanup was independently verified; exact layout/realm and remaining legacy live limits recorded in verification.md.
- [x] Full build/tests and diff checks pass; product and development records are separate commit batches.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
