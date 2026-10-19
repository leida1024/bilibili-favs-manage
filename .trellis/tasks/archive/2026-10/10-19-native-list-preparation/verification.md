# Verification — local2.2.7

## Outcome

Corrected legacy collected-container selector and fold direction. Native reads/writes prepare the matching account page's list automatically: await late group, expand native header, load VUI remaining-items controls or legacy scrollbar pages with progress/cancellation/bounds. Native subscription identities use exact VNode DOM bindings or legacy route links, supporting unavailable entries and rejecting duplicates/rebinding without positional guesses. VUI unsubscribe now handles its real final confirmation; legacy stays immediate. Preview retains one-use agreement for unavailable targets. Bound available subscriptions still navigate when scanning videos.

## Checks

- npm run build passed; generated @version/config/package/lock all2.2.7; unsafeWindow grant added for page-owned read-only metadata.
- npm test:121/121 passed.15 new native-subscription cases plus updated preview and realistic confirmation fixtures cover delayed/folded pagination, both layouts, unavailable same-name/type identities, reverse VNode order, last item, rebindings/missing bindings, actor change/cancellation, no progress/caps, API-reader/native-writer one-use panel flow and statistics navigation. Existing106 tests preserved with intentional updated expectations.
- git diff --check passed. Source/generated diff reviewed; no lint/typecheck scripts are configured.

## Dedicated browser evidence

Named project session only; local build console-injected after pending handoff absent/no earlier installation. Read-only native and complete API catalogs each returned229 subscriptions,31 unavailable, matching full ordered type:ID sequence and identity set. All229 rows had exact component bindings. This order parity is evidence only, not a writer identity assumption.

Opened the native menu of one unavailable entry and clicked its native unsubscribe menu **only to open confirmation**, then clicked Cancel. Never clicked final Confirm. Target remained present and total unchanged. After refreshing, local code automatically loaded the initial50 subscription rows to229, all directly bound with zero remaining load controls. Also verified native collapsed group auto-expansion. Website group expansion may update its active folder route; no account navigation or destructive continuation was introduced. No actual subscription was cancelled.

## Limits

Live current VUI/page-realm only. Legacy current account behavior, actual unsubscribe acknowledgement, Tampermonkey unsafeWindow/GM sandbox and automatic cross-page injection recovery remain unverified; legacy structure/contracts are covered by public component evidence and synthetic fixtures. No API POST fallback, real mutations, private content/screenshots committed, remote push, master or Greasy Fork change. Missing native unavailable identity fails before submission with explicit API guidance. Native management requires matching own account page, without new persistent destructive navigation queues.
