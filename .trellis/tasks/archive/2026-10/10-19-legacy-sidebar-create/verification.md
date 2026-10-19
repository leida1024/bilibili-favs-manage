# Verification

- Local version 2.2.5; `npm run build` passed before the full suite. Source/config/package/lock/generated header versions agree.
- `npm test`:99/99 passed. No lint/typecheck scripts configured. Full output kept outside Git in the temporary test log.
- `git diff --check`:passed.
- Baseline red: empty legacy fixture fell into the forbidden copy-dialog fallback; unavailable checkbox/button regression rendered an empty review. Both passed after the fixes.
- Five new independent-form regressions cover no video/batch/copy controls, two single submissions, normalized reuse, native input events, hidden stale/unrelated traps, guard denial, already-open Edit form, uncertainty without alternate submission, webpage creator and consumed cross-page handoff before opening.
- Actual checkbox/preview clicks cover both unavailable subscription types with confirmed membership, visible exact IDs/settings guidance, no UI/engine ticket, no confirmation, no POST or automatic writer switch. Settings works; explicit API save/reload resets selection, and fresh selection/preview requires agreement.
- Fictional localhost browser checks at desktop and375px:Settings action visible/focused within the task scroller, no horizontal overflow, informational preview without tickets. No real-account content used in screenshots or records.

## Limits and review

No real-account mutations in this iteration. Earlier2.2.4 disposable VUI create/delete evidence remains historical. The dedicated browser serves VUI; actual legacy page behavior remains for the user's legacy test. Public-component/jsdom coverage is not live legacy acceptance. Live copy/unsubscribe, Tampermonkey GM sandbox and automatic navigation remain unverified.

Reviewed source/generated changes: scoped adapter discovery, null-only fallback, guard-before-open/submit, observed new target, no uncertainty retry; preview separates readable targets from executable confirmation. VUI/copy-dialog regressions remain passing. No master change, push or Greasy Fork publication. Product and development records committed separately.

Product commit: `f4e3964` on develop. Named browser closed cleanly and task-owned localhost preview server stopped after checks.
