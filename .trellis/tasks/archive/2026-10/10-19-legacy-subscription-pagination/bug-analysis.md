# Bug analysis: duplicate native pagination

## 1. Root cause category

E (implicit assumption) and D (test gap). The script assumed setting scrollTop/dispatching scroll and dispatching ps-y-reach-end were independent harmless actions. PerfectScrollbar translates scroll into reach-end; legacy controller requests a page without an in-flight guard, and Vuex appends every successful response.

## 2. Why the previous fix failed

The previous selector/identity fix identified correct native objects but introduced two pagination triggers. Its legacy fixture used a synchronous handler with once:true, so a duplicate event could not issue duplicate requests. Live VUI load-more verification did not establish legacy scrollbar correctness. The count check then exposed a script-created corrupt list as an apparent user data change.

## 3. Prevention mechanisms

| Priority | Mechanism | Result |
| --- | --- | --- |
| P0 | One native trigger per awaited page | Removed scroll positioning/dispatch; retained reach-end only |
| P0 | Realistic event translation and async responses | Red test reproduced exact reported error; now green |
| P0 | Mixed-selection panel flow | Both readers/native writer confirm normal and unavailable in one ticket |
| P1 | Source-to-DOM alignment | Wait for rendering before count checks; regression included |
| P1 | Corrupted cache diagnosis | Duplicate identities stop before submission with whole-page refresh guidance |

## 4. Systematic expansion

VUI load-more has one click trigger and remains covered by full suite/live read-only parity. Legacy item confirmation also reads rendered DOM; preserve count-change wait instead of treating clicks as success. Tests for event-driven native controls must model event translation/repeated listeners and asynchronous updates, without invented once guards that conceal platform races. Do not repair native duplicates by positional matching or mutation-method calls.

## 5. Knowledge capture

Updated frontend state/quality specs with the single-trigger and source/render contracts; captured task-specific evidence here and in verification.md. No src/templates/markdown/spec tree exists in this product, so template sync is inapplicable. Development records committed separately from product changes.
