# Publication design

Use gh PR merge with explicit reviewed head SHA and normal merge strategy. A merge commit retains the22 cherry-picks and documentation history. Remote master changes only through the reviewed PR. Inspect delivery metadata and selected safe push fields; never print full webhook payload/config.

Fetch public Greasy Fork JSON and code endpoints read-only, compare userscript metadata/source with released artifact, and inspect public description. Use existing project browser only if public HTTP endpoints cannot establish user-facing state.

Once publication is established, fetch master and fast-forward local master; merge master into develop so release history is recorded and future development preserves product parity. Resolve only actual conflicts from identical selected product changes. Keep developmental files in develop; no wholesale develop-to-master merge.
