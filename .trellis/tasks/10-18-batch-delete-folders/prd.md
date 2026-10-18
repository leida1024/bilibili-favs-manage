# Batch delete owned folders

## Goal

Allow users to remove selected folders they own, with clear consequences and trustworthy per-item results.

## Dependencies

Implement after UI/logs and stable inventory/identity discovery in the statistics work. Inspect actual Bilibili behavior first: ownership, folder IDs, system/default-folder restrictions, and what folder deletion means for contained videos. Document verified semantics; do not infer them from a label.

## Initial requirements

- Only owned, deletable folders can be selected; subscribed and protected/default folders are excluded.
- Preview stable folder IDs, names, counts when known, and the consequences before an explicit confirmation. Start with nothing selected.
- Process sequentially, allow cancellation before the next item, show confirmed/failed/unknown results, and stop on an uncertain result.
- Never retry an uncertain deletion automatically or restore a destructive queue by refreshing. Do not promise undo without a verified platform capability.

## Acceptance criteria

- Synthetic tests exclude foreign/subscribed/protected folders and retain identity with duplicate/changed names.
- Cancellation prevents remaining operations; a timeout/unknown result stops execution without another submission.
- Confirmation and target review are required each time; no deletion occurs on load, scanning, or selecting.
- Real-site mutation tests run only on explicitly designated disposable folders under separate user authorization. Record sanitized outcomes; no user data in fixtures.

## Scope and authorization

Planning entry only. Create design.md and implement.md after inspecting platform semantics. The current request authorizes planning this capability, not deleting any real folders. No bulk video deletion or Greasy Fork release.
