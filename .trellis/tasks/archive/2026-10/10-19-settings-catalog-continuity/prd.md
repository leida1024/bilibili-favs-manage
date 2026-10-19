# Preserve loaded catalogs and make duplicate identities explicit

## Goal and authorization

User continues the repair, reporting that changing Settings unexpectedly erases loaded management/statistics directories. Fix this locally and explain why unavailable native unsubscribe is restricted. No live writes, remote push or release. Subsequent user steering authorizes consistent duplicate-name treatment across copy/statistics/management, with implementation choices delegated to the agent.

## Evidence and design

FloatingPanel.saveModesButton unconditionally calls InventoryPanel.resetCatalog even for unrelated copy/create changes or identical settings. Catalogs/reports are read snapshots, not executable authority. BatchOperations.prepare captures transports; execute freshly enumerates and revalidates each target. Saving settings should retain loaded rows, separate selections, search, report/results, and task scroll, while invalidating any existing destructive confirmation. New previews/scans/loads use the newly saved choices; changing Settings performs no I/O. Existing reload/scope/mutation resets remain.

Unavailable native rows expose no stable identity to WebFolderClient.inspect. Manual native unsubscribe exists, but automation cannot correlate same-name unavailable rows to selected API IDs. Keep that limitation explicit; do not claim the platform forbids native clicks.

## Acceptance

- [x] Save identical or any read/copy/create/manage setting without erasing catalog, selections, search, statistics report/export or task scroll; no implicit reads/writes.
- [x] Old confirmation invalidated; fresh preview captures saved mode. Existing ID-confirmed unavailable selections can proceed to API preview without reloading. If the original reader never obtained identity, an explicit API load is still necessary.
- [x] New scan/load uses saved reader; future mutations retain fresh revalidation. Busy prevents settings save. Scope/reload/mutation reset coverage stays passing.
- [x] Focused regressions, build before full tests, generated review, diff checks, separate product/dev commits and archive. Local numeric2.2.6; no browser account mutation needed.

## Validation plan

Use actual Settings save and navigation controls in jsdom. Cover persistent existing nodes/results and captured transport identities, stale-ticket rejection, and newly chosen read calls. Existing native management tests prove ordinary native unsubscribe is supported. Reuse prior layout verification: this fix removes a reset and adjusts guidance, adding no layout controls.

## Follow-up scope: duplicate identity design

- Use existing kind:id for statistics and management; show type/ID inline only on same-name rows, retain exact preview IDs and native route checks. Reordering and filtering cannot change selected row identities.
- A duplicate name does not itself require API: existing native route-based resolution supports identified normal entries. Unavailable native entries still require explicit API because the page exposes no matching stable identity. Do not infer identities from order or silently change writer.
- Copy currently exposes source/target names, not an ID picker. It cannot infer intent from name alone even with API. Mark ambiguous source rows as unavailable with a specific rename instruction; protect direct native source/destination resolution and cross-page target preparation against duplicate names before any submission. API copy retains its existing ambiguity rejection, with actionable guidance. Unambiguous names keep working; different sources may still intentionally share one unique target.
- Add regression coverage for same-name typed/ID rows, reorder/selection continuity and native/API copy rejection without clicking/writing. Product docs must explain the actual supported behavior rather than promise an ID picker.

- [x] Follow-up duplicate identity rows, selection/order behavior, both native copy layouts and cross-page preflight are regression-tested; API ambiguity rejection and ordinary same-name native management remain passing.
