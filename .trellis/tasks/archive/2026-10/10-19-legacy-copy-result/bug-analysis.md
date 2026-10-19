# Bug Analysis: successful legacy copy stalls and native deletion stops

## 1. Root Cause Category

- E, implicit assumption: legacy success and hover handlers were assumed to resemble VUI or generic click controls.
- B, cross-layer contract: native protection discovery diverged from the API identity; terminal feedback dropped the item cause.
- D, test coverage gap: invented `.be-message`/generic success and click-only menu fixtures passed while actual legacy/VUI components failed.

## 2. Why Fixes Failed

1. Strict result confirmation replaced historical unconditional continuation without validating legacy's exact signal.
2. Increasing the timeout to six/thirty seconds and testing VUI translations could not repair a missing `.be-toast` selector plus decorated text.
3. Isolated synthetic deletion tests modeled wrapper clicks rather than native hover; the generic consumed-confirmation footer concealed the actual native discovery failure.

## 3. Prevention Mechanisms

| Priority | Mechanism | Action | Status |
| --- | --- | --- | --- |
| P0 | Regression | Real legacy hidden→visible toast across two tasks | Done; failed before fix |
| P0 | Integration | Both layouts' real hover/dialog through hybrid management panel | Done |
| P0 | Runtime evidence | Per-item cause in ordinary records/export/footer | Done |
| P1 | Live verification | Two authorized disposable create/delete cycles with original ID-set comparison | Done on VUI |
| P1 | Specs | Actual selectors/events and fixture provenance/timeout diagnosis contract | Done |

## 4. Systematic Expansion

The shared native menu path also supports unsubscribe, so existing synthetic interruption/account-change/unsubscribe checks were retained and updated to actual VUI hover. No live subscription mutation was performed. Use each layout's source/component contract before changing shared deadlines, selectors or safeguards.

## 5. Knowledge Capture

- Updated frontend state-management and quality specs; task research records public assets and old/new behavior.
- No `src/templates/markdown/spec/` exists in this product; there is no template counterpart to sync.
- Legacy live, GM sandbox and automatic navigation remain explicit limits rather than inferred from fixtures.
