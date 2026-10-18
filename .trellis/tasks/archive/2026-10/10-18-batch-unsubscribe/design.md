# Design

Stage 4 implementation and synthetic testing authorized. Local commits only, no push; real subscriptions have no authorized test targets. Stages 1–3 archived.

Public VUI bundle defines Wi.FAVLIST=11 and Wi.COLLECT=21. Sidebar cancellation dispatches folders to media-ID /x/v3/fav/folder/unfav and seasons to /x/v3/fav/season/unfav. Folder handler checks code0 then removes only that ID from collected list. Implement type11 folders only; type21 seasons remain explicitly unsupported. This manages the current user's subscription, not the owner's original content. No live POST verification.

Extend the Stage 3 one-use engine with action unsubscribe and catalog kind subscribed. Eligibility requires valid authenticated actor and owner IDs, a different owner, known available type11 subscription and confirmed fav_state. Reject owner/type/availability ambiguity and conflicting owner metadata. Re-read the actor's own complete subscription list before every mutation and match immutable preview identity/name/count/type/subscription status. Keep the same sequential cancellation, no retry/replay, unknown-stop and per-item outcomes.

UI switches management mode explicitly with loaded catalog scope. Independent empty selection for subscriptions, exact ID/owner/count preview and agreement explaining that only this account's subscription is cancelled. Switching scope/loading invalidates prior preview. No mixing subscriptions with owned deletion. Reuse shared results/cancel/export without hiding uncertain outcomes. Synthetic same-name/wrong-owner/missing-owner/changed-type/cancel/failure/unknown/UI tests plus read-only aggregate smoke. Rollback by reverting product commit; no persistence migration.
