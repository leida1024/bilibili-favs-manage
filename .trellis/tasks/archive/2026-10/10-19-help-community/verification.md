# Verification — help and community

Product commit260b1ae (local2.2.10), header accessibility refinement41ea877.138 tests/build initially;149 at final acceptance.

- Header scrolling QQ524764959 uses existing README number, opens Help; pause/play, hover/focus stop, reduced-motion static; narrow panels hide animated header notice while Help retains the number.
- Fifth normal Help view has concise expandable topics, QQ and explicit feedback links; no I/O when opening, edits/scroll preserved, operation footer hidden, export modal includes notice in inert containment.
- Fictional preview inspected: default600×500 preserves7 complete copy rows, no navigation overflow at280px, Help does not overflow, footer remains hidden. Screenshots stayed in OS temp, fictional only.
- axe-core4.12.1 scoped to panel:0 violations,1 incomplete contrast group; manually checked semantic foreground/background ratios12.59,5.62,5.05 (all≥4.5). Header role=group resolves prohibited-label uncertainty; no claim of full WCAG certification.

No account mutations/publication or automatic external navigation.
