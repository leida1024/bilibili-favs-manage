# Implementation order

1. Replace unconditional Settings catalog reset with confirmation invalidation; keep loaded state. Regression starts red on baseline.
2. Reuse favoriteNames normalization for duplicate detection. Add conditional visible identity rows in shared folder renderer; mark duplicate copy sources and guard name resolution in native/API/cross-page paths.
3. Verify synthetic identity/ordering/copy regressions and Settings continuity, build local2.2.6, full tests, generated and whitespace review. No live mutations; fictional browser check for added row identity text.
4. Document exact behavior, update reusable specs, commit product separately, archive verification and journal locally. No push/publication.
