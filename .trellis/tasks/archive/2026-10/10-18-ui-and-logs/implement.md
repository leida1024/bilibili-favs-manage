# Implementation plan

- [x] Inspect component, logger, manager, cross-page flow, startup tests and relevant specs; complete internal design review.
- [x] Expand fictional preview scenarios before production wiring.
- [x] Add focused operation/log models and behavior tests.
- [x] Rework panel layout, selection review, diagnostics/export, keyboard controls and viewport behavior.
- [x] Wire confirmed copy progress, recovery/handoff status, and busy cleanup without changing copy targets or replay rules.
- [x] Run npm test and npm run build; review generated output and whitespace.
- [x] Inspect synthetic desktop/narrow preview and local-injection rendering. Record console/GM/full-navigation limits.
- [x] Commit product separately, record evidence, archive only when acceptance is satisfied, and journal locally. No push.

Risk areas: FloatingPanel lifecycle cleanup, manager false-success paths, CrossPageFlowManager handoff, generated bundle used by startup tests. Review snapshots through source → manager → model → UI and error/finally paths. No real mutation testing.
