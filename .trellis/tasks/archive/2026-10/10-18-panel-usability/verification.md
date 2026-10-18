# Verification

48/48 npm tests passed; generated build and git diff --check passed. Four focused UI tests cover the paired row/default task and fixed footer, copy-edit preservation and no-I/O mode switching, ticket invalidation, busy navigation with diagnostic return, empty target blocking, and export focus/Escape. Existing legacy/VUI copy, normalization, lifecycle, inventory and mutation tests remain passing. No lint or typecheck is configured.

Fictional browser preview inspected at 1280x900 and 390x844. Desktop five-row copy fits without scrolling. Narrow source/destination columns remain adjacent with no overlap or horizontal overflow. Forty long names scroll in the task body only, with copy count/action visible at the bottom. Empty, running, failed, completed and interrupted scenarios preserve footer visibility and avoid horizontal overflow. The README image contains fictional data only and was visually inspected before cropping around the panel.

Synthetic statistics read two entries and reported complete selected-scope coverage. Management preview exposed exact ID 101, owner 50 and count, focused agreement and disabled confirmation until agreement. No real transport was used. Header drag and corner resize changed bounds; export Tab containment, Escape close and focus return passed browser event checks. Minimize/restore passed. These are browser DOM/event checks, not physical touch or screen-reader acceptance.

Final built userscript was locally injected after refresh on the existing dedicated public VUI page, following a presence-only pending-state check. Aggregate result: one panel, nine source rows, copy visible, other task views hidden, minimize/restore working, no pending cross-page state. No real copy, deletion or unsubscribe was submitted.

Limits: no real mutation targets were authorized. Live deletion/unsubscribe, Tampermonkey GM sandbox, current legacy-page live behavior and automatic full-navigation recovery remain unverified. Console injection alone cannot verify those. No master/Greasy Fork changes or pushes.
