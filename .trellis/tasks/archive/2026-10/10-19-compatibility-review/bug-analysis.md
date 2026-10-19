# Bug analysis: implicit identity and pagination assumptions

1. Root cause: cross-layer contract and fixture gaps (B/D/E). Profile identity is not actor identity, folder count is not necessarily obtainable count, active page is not content readiness, and VUI pager need not contain“共N页”.
2. Why repeated fixes can miss it: click-only fixtures and first-page/one-page samples conceal delayed DOM and layout differences; blindly extending timeouts would not resolve platform count discrepancies. Initial aria-current suspicion was disproven by direct DOM measurement, so no false root cause is retained.
3. Prevention: shared context policy, shared nativePagination, exact route/type guards and consume-before-execute; delayed old/VUI fixtures, two mixed multi-page live scopes, metadata alias tests; executable specs updated.
4. Expansion: both statistics and copy now share page readiness instead of duplicating partial assumptions; one failed read-only scope does not discard other results, but uncertain writes still stop.
5. Capture: frontend state/components/directory/quality guidelines and maintained product architecture updated.
