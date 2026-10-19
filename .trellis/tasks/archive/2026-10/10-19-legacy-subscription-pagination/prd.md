# Legacy subscription pagination regression

## Scope and authorization

User reports2.2.7 native unsubscribe fails before submission with the source-count error when selecting one available and one unavailable subscription. Authorized local diagnose/fix/test/build/commits/archive. Use dedicated browser read-only; no real unsubscribe, private data, remote push or publication. Inline only.

## Evidence / approach

Current legacy rows() sets scrollTop, dispatches scroll, then dispatches ps-y-reach-end. Public be-scrollbar/PerfectScrollbar converts native scroll into ps-y-reach-end, so the script can request the same page twice before collected_params.pn advances. Legacy controller lacks an in-flight guard and Vuex appends every response; duplicate pages make rendered count exceed server total. Prior fixtures used once:true and synchronous loads, masking this. Reproduce before patch. Also distinguish transient Vue source/DOM updates from persistent duplicate identities rather than assuming every mismatch means user modifications.

Use one native reach-end event per serialized page, without synthetic scroll or positioning that triggers another path. Await source/render alignment and actual list progress. Keep exact type/ID validation, no positional guess or dedup-and-mutate, no transport switch/retry, consume-once preview and VUI behavior. Already-corrupted native lists must receive concrete refresh-webpage guidance; a panel-only reload cannot clear platform duplicates.

## Acceptance

- [x] Regression reproduces2.2.7 duplicate native page fetch/count error before fix.
- [x] Legacy asynchronous native scroll translation fetches each page once; mixed available/unavailable selections both complete through panel in API-read/web-write and native-read/web-write combinations.
- [x] Native source/DOM render lag is awaited; persistent duplicate or missing rows stop before mutation with useful diagnostics. No uncertain retry.
- [x] Tests/build/generated review pass; dedicated-browser evidence recorded honestly. Version2.2.8; separate local product/dev commits; archived task/journal.
