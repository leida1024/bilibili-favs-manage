# Design

Stage 3 authorized for implementation and synthetic mutation tests only; no real target authorization, release or push. Stages 1/2 archived. Reuse validated HTTP identity independent of legacy/VUI DOM.

## Verified platform evidence

Public VUI bundle (URL in archived inventory design): FavSidebarItem removes delete from the first created entry (index0); special kid playlist deletion has a distinct whole-playlist warning. POST /x/v3/fav/folder/del supplies media_ids and platform=web. Handler requires code0 before removing ID from local created list. This is folder deletion, not uploaded-video deletion. Treat contained saved references as lost; no undo promise. Exact downstream subscriber effects are not verified. Exclude all kid/special/default/unknown-owner or foreign entries. Conservatively protect first created entry regardless of label.

## Shared engine

BatchOperations owns a single in-memory one-use preview ticket: immutable action, actor, IDs, names, owners, counts, protection/type. No persistence. Prepare validates eligibility and duplicate IDs. Execute requires explicit confirmation and consumes ticket before awaiting. Recheck actor and fresh complete catalog before every sequential item; renamed/count-changed/retyped/foreign/protected/missing objects stop for a new preview. The catalog's owner must match authenticated user and current space for deletion.

Client supplies a timed POST, form fields and ephemeral platform anti-forgery value; credentials never enter logs/export. Code0 => confirmed acknowledgement; nonzero structured code => failed; HTTP/timeout/network/malformed response => unknown. No retry. Stop failure/unknown, cancel before next item. Abort during a submitted POST yields unknown. Current confirmed results remain visible, untouched items are not_started; busy releases in finally. Reload/destroy clears ticket and cancels pending work. Copy and scans share panel admission.

UI has separate owned-deletion selection, initially empty, exact target preview and a consequences checkbox before a one-use confirm button. No native auto-accepted confirmation dialogs. Disable protected/unavailable objects, show why, list each result, allow export review. No automatic background requests. Synthetic fixtures exercise engine and product confirmation. Live acceptance remains pending designated disposable folders.
