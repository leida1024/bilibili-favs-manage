# Verification

- `npm run build`:passed for numeric2.2.6. Source/config/package/lock/generated header agree.
- Full `npm test`:106/106 passed. No lint/typecheck scripts configured.
- `git diff --check`:passed. Reviewed source/generated changes and preserved legacy/VUI adapters, normalization, consume-before-execute and no uncertain retry.
- Baseline red: Settings regression lost the exact row object immediately on a no-op save. Fixed behavior preserves row/report/result nodes, independent selections, search, export and task scroll across all four changed methods and no-op saves, without I/O. New reader is used on next scan/load; busy save does nothing; explicit reload still resets.
- Existing unavailable subscription test now uses actual Settings save: selection survives API writer choice, no old ticket remains, and fresh preview still requires agreement without another read.
- Duplicate typed IDs: same name and equal numeric ID across folder/season remain distinct, type/ID/owner visibly rendered; filtering/hiding/reordering preserves the chosen season, and fresh revalidation in reverse order submits only that synthetic composite identity.
- Copy collision tests: both layout source/destination helpers click nothing on duplicate normalized names; copy bulk selection skips ambiguous sources, busy/reset cannot re-enable them, refresh cannot copy selection to ambiguous rows. A later ambiguous source stops the entire resumed batch before the first copy. Cross-page ambiguous target consumes its handoff and does not create another missing target or save a return stage. Existing API ambiguity and native same-name management tests remain passing.
- Full regression initially exposed incomplete copy mocks that lacked the new source-name preflight contract; updated those fixtures to provide their source catalogs. Isolated progress test now creates its own realm instead of depending on a previous test's document.

## Fictional browser checks

Dedicated named browser, localhost preview only, no real Bilibili account navigation or mutation. Desktop1536px retained two exact selected rows across Settings→API→Management with no ticket, visible duplicate identity lines and no horizontal overflow. Narrow375×812 confirmed row identity text, distinct final preview IDs/types/owners, agreement/confirmation controls and disabled ambiguous copy sources. Screenshots were visually reviewed outside Git. The viewport command returned EOF but subsequent independent DOM evaluation confirmed375px; no behavior claim relies on its success output. Named browser closed cleanly and task-owned preview server stopped.

## Limits

No real writes, remote pushes, master edits or Greasy Fork publication. Existing live legacy/copy/unsubscribe, GM sandbox and full automatic navigation limits remain. Copy is still a name-mapping UI: duplicate names require unique names, and switching to API alone cannot specify a chosen ID. Ordinary verified native same-name management remains supported; unavailable native identity stays restricted with explicit API guidance. No order-based selection or automatic fallback.

Product commit: `4670c41` on develop. Development records/specs/journal are committed separately.
