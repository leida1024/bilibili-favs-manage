# Verification

- npm test: 24/24 passed; npm run build and git diff --check passed. No lint/typecheck configured.
- Reviewed source-to-operation-to-panel flow and recovery finally paths. Copy confirmation now requires a new success-toast mutation; preexisting success does not confirm another submission. Unknown submissions stop.
- Fictional preview: seven scenarios, desktop 1365x900 and narrow 390x844 visually checked. Scoped single-column narrow layout, native keyboard controls, long/empty lists, selection preservation, minimize/restore and log scrolling/export are covered by browser inspection and focused fixtures. Drag/resize code reviewed; exhaustive pointer/device coverage remains unverified.
- Dedicated-profile local injection: mounted manager/panel, one panel after repeat injection, minimize/restore, no real mutations. Console page realm only: Tampermonkey GM sandbox and full-navigation automatic recovery remain unverified.
- Screenshots outside repository, fictional data only. No push, master/Greasy Fork unchanged.
