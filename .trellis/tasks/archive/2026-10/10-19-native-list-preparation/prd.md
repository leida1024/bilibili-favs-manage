# Prepare native lists and support identified unavailable subscriptions

## Authorization and scope

User requests automatic list preparation instead of the native missing-range failure and asks to try unavailable native unsubscribe using list order. Implement/verify/commit locally. Read-only live account inspection and reversible menu/confirmation checks are in scope. No actual live unsubscribe/deletion without a designated disposable test object, no push/master/Greasy Fork change. Current task does not persist destructive selections or add cross-account execution handoffs.

## Evidence

Legacy actual public chunk12 uses `#fav-list-container` for collected rows, with `a.text` href containing fid/ftype=collect/ctype even on `.favInvalid` entries. Existing adapter points at nonexistent `#fav-collectedList-container`. Legacy scrollbar emits `ps-y-reach-end` and loads until collectedList.count.

Current VUI renders FavSidebarItem with props {index,type,item}; item retains raw ID/type/state on unavailable entries. Production DOM lacks per-row __vueParentComponent but the page root _vnode component tree can map each component.el to its exact native row. Read-only live checks:229 fully expanded rows, all exact component bindings,31 unavailable. Complete API count/type:ID sequence matches native order and identity set. Use direct row bindings, not positional guessing.

VUI unsubscribe opens a native confirmation dialog. Existing mutate handles only deletion dialogs; immediate-unsubscribe fixtures concealed this. Legacy unsubscribe submits immediately and must keep its existing single-click behavior.

## Requirements / design

- Correct legacy subscribed selector and await late group mounting. Expand collapsed groups and load VUI more/legacy native scrollbar pages completely with cancellation/limits and progress; never submit against an incomplete unknown identity snapshot.
- Add a bounded read-only adapter for VUI component item data and legacy route-link identities. Validate row scope, rendered name, supported type, stable ID and membership. No framework business methods invoked; real mutation remains native mouse/menu/confirm clicks. Prefer sandbox page-document access via unsafeWindow when available.
- Native subscribed reading uses bound metadata when available, including unavailable entries; unsupported/unbound rows remain excluded or fail descriptively. Existing route-based fallback stays for ordinary fixtures/layouts.
- Select/revalidate by exact composite ID and rendered row, not same-name ordinal. Recheck identity/account/space after opening menu and before final confirm. Support actual VUI unsubscribe confirmation and legacy immediate submission, stop without retry on uncertainty.
- Remove the blanket unavailable-web preview rejection. Both methods may preview; webpage confirmation explains automatic list/identity checks, failure to obtain bindings is a concrete item reason with explicit API choice (no automatic transport switch).
- Freshly read/revalidate every selected native identity at execution. Preserve one-use confirmations, settings continuity, version parity and legacy/VUI copy/delete behavior.

## Acceptance

- [x] Legacy real #fav-list-container plus disabled href fixture can identify/unsubscribe the exact item without video navigation or API POST; pagination loads complete source.
- [x] VUI disabled same-name rows use component.el/ID/type, surviving order differences; row reassignment/duplicate identity or unavailable binding fails before mutation.
- [x] Delayed mounting/collapse/more pages, cancellation and loading limits covered. Missing loading is prepared automatically on the current matching account page.
- [x] Actual VUI confirmation simulated; exactly one menu/final click, cancel/account/identity changes prevent confirmation; failure/unknown retained and no retry.
- [x] Native unavailable UI preview/agreement works. Full tests/build/diff/generated review pass. Live verification is read-only/reversible only and honestly limited; separate product/dev commits and archive.
