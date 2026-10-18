# Batch unsubscribe folders

## Goal

Manage subscriptions to other users' favorites separately from deletion of owned folders.

## Dependencies

Follow UI/logs, stable inventory discovery, and the shared operation-result safeguards developed for batch deletion. Inspect subscription selectors and verified platform semantics on old/VUI pages before design.

## Initial requirements

- Identify subscription targets by stable IDs and owner; do not infer type only from display name or combine them with owned folders.
- Preview exact subscriptions and consequences, with no initial selection and explicit confirmation.
- Process sequentially with cancellation, per-item verified results, and a stop on uncertain status.
- Do not automatically retry an unknown action or resume a destructive stage on refresh.

## Acceptance criteria

- Synthetic fixtures distinguish subscriptions from owned folders, including same-name entries and missing/inaccessible owners.
- Cancel/failure/unknown results prevent further unintended actions; confirmation is required after reload.
- Real-site unsubscribe tests require explicitly designated test subscriptions. Read-only inspection never activates an unsubscribe control.
- No feature changes the contents of the original owner's folder, and the UI explains the verified scope of the action.

## Scope and authorization

Planning entry only; design.md and implement.md are required before activation. The current request does not authorize cancellation of any real subscriptions. No Greasy Fork release.
