# Engineering review and acceptance

Scope: all four authorized tasks and their cross-layer effects, inline review. Product commits172051a,260b1ae,594be17,41ea877. Final local version2.2.12,149/149 tests, Rollup build and diff whitespace pass. Source/build version parity verified by tests. No ESLint/type-check scripts exist; neither is claimed.

| Severity | Verified finding | Correction and evidence |
| --- | --- | --- |
| P1 | Native VUI copying recognized only text“共N页”, treating a numeric pager as one page; same-folder starts could begin in the middle | nativePagination shared by copy/statistics reads last number, resets to1 and awaits actual changed stable cards. Legacy/VUI fixtures copy1/2/3 once each; real VUI152-page recognition read only. |
| P1 | Actor inferred from visited-profile mid; UI-only copy eligibility and stale contexts could cross awaits | Numeric cookie actor, own/guest restrictions at UI/core/API, lifecycle actor tracking, manager lock and source/fid/type guards; regressions plus own-page live disabling. |
| P1 | New per-folder native statistics context could accept another actor at the next folder | Captured native reader checks original actor/space before and after each read; typed scope retained; regression changes actor between folders. |
| P2 | Empty saved handoff could navigate again; countdown drift could save stale source | Consume then reject empty state, capture URL before delay, recheck both handoffs; empty/first/return drift tests. |
| P2 | Alias bridge discarded richer BV-only metadata; unidentified occurrences exported0 | merge known fields before joining memberships; occurrences1; dedicated regressions. |
| P2 | Platform totals differ from actual returned content; blanket failure hid useful results | Explicit advertised/read coverage, continued independent read-only folders, paged details and export. Live API/native parity demonstrates mismatch is platform-visible. |
| P2 | Header label on a context-dependent implicit role | Explicit group role and repeated scoped axe run.0 violations,1 incomplete contrast check manually reviewed; no certification claim. |

## Boundaries and retained structure

LegacyPageAdapter/VuiPageAdapter own copying/form markup and point to nativeControls. nativeBindings owns exact sidebar identity. nativePagination owns shared DOM pagination/readiness. NativeVideoReader owns webpage content metadata, WebFolderClient native discovery/actions, FolderClient HTTP, TransportClient captures chosen reader/writer. UI renders text/known safe generated links and invokes services; no layout selectors added to UI. Existing single lifecycle, cleanup, name normalization, one-use confirmation, consume-before-execute, default protection, unknown outcome stop/no retry and no silent transport switch remain.

## Verification limitations

See statistics-details verification for sanitized live scope. Real writes deliberately not exercised. No live legacy/GM sandbox certification; no push/release. New DOM detail lists bounded50; reports bounded10000 records/500 pages. Anonymous public reads remain possible; copying requires confirmed actor. All task artifacts/specs remain separate from product commits.

Maintained README, management limits and local changelog synchronized in product documentation commit b692cd3. Published version remains2.1.2; no publication occurred.
