# Local2.2.8 verification

## Red reproduction

Added a legacy scrollbar fixture with asynchronous page responses and native scroll→ps-y-reach-end translation, deliberately without an in-flight guard like the public controller. Against2.2.7, `node --test --test-name-pattern="legacy native scrollbar translation" test/native-subscriptions.test.js` fails with exactly `网页订阅数量变化，请重新加载`: explicit scroll and explicit reach-end enqueue the same page twice and append duplicates. This reproduces the reported pre-submission failure without using private target data.

## Fix and acceptance

Native paging now dispatches only one reach-end event per serialized page, leaving scrollTop unchanged. It waits for Vue source/DOM row alignment, then checks completeness/progress. Existing duplicated native identities stop with explicit whole-page refresh guidance; no DOM/source deduplication or destructive retry. Counts in genuine total mismatch diagnostics aid diagnosis. Both API-reader/native-writer and native-reader/native-writer panel regressions select one available and one unavailable item, submit exactly twice sequentially, confirm both, load the next page exactly once and reject consumed ticket replay. Source/DOM lag and existing corrupted cache are covered.

- 20 native subscription tests pass (5 new regressions).
- npm run build passed with version2.2.8 in source/package/lock/header.
- Full npm test:126/126 passed; git diff --check passed. Source/generated diff reviewed. No lint/typecheck scripts configured.

## Browser evidence and limits

User reported logging in; dedicated project browser own page confirmed current VUI, not legacy. With no pending handoff/earlier installation, console-injected local2.2.8. Native automatically loaded50→229 subscriptions,31 unavailable. Complete native/API ordered type:ID parity holds. Exact native selection resolved one available and one unavailable row. No menu/final confirmation or real mutation was clicked. Closed only the named project session after use.

Legacy behavior is supported by public legacy controller/scrollbar/Vuex evidence and synthetic red→green reproduction; no current legacy live unsubscribe is claimed. GM sandbox and real unsubscribe acknowledgement remain unverified. If2.2.7 already corrupted the native cache, updating must be followed by whole-webpage refresh; catalog reload alone cannot clear that external cache. No user collection names/IDs/screenshots/tokens committed. No remote push/master/Greasy Fork change.
