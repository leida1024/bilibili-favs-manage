# Quality and verification

## Commands

- `npm test`: Node test runner, `test/startup.test.js` and `test/favorite-names.test.js` with jsdom fixtures.
- `npm run build`: Rollup regenerates the distributed userscript.
- `git diff --check`: whitespace check before commit.

No lint/typecheck script is currently configured; do not claim otherwise. Add focused behavior tests when changes affect startup, names, state replay, batch progress, or failure handling. Avoid implementation-mirroring tests for documentation or simple cosmetic changes.

## Review

Preserve legacy/VUI layout support, asynchronous readiness, SPA entry, dismissal, sandbox compatibility, normalized names, target reuse, and no uncertain automatic replay. Tests must observe outcomes, not simply call the same helper twice. Use temporary/synthetic data. Do not mutate real collections as part of the default test suite.

Native regression fixtures must reproduce the specific layout's public component markup, exact messages and real event target/bubbling behavior. A VUI success translation does not establish legacy compatibility. A click-only mock cannot establish hover-menu compatibility. For hybrid transport bugs, cover panel→captured API reader→native writer as well as isolated adapters. If a timeout persists, establish the real result signal before increasing the deadline. Keep per-item failure causes visible in records/footer so production evidence can identify the failing layer.

Use `examples/panel-preview.html` for visual acceptance with fictional data. Record exactly which live checks ran, which realm was used, and what remains unverified. Avoid screenshots of the user's favorites. Never log credentials, full storage, request authorization, or webhook secrets.

Product changes and dev records are separate commits. Follow the branch policy before touching master or Greasy Fork. Documentation-only Trellis setup does not require rewriting build outputs or bumping the script version.

Each reviewable product iteration advances an ordinary numeric version (e.g. `2.2.1`, then `2.2.2`). The user explicitly rejects dev.N suffixes. Publication remains separate. Keep `package.json`, the lockfile root package and `CONFIG.SCRIPT.VERSION` equal. Rollup fails on a mismatch; the panel and generated `@version` show the same value. Build before complete tests, since startup/version tests inspect dist. Published version statements must identify the actual Greasy Fork release.

Native subscription fixtures must model legacy #fav-list-container/href IDs and scrollbar events plus VUI FavSidebarItem VNode props bound to DOM rows. VUI unsubscribe requires an actual final confirmation fixture; immediate removal on menu click covers legacy only. Include same-name unavailable rows with reversed component order, delayed mount/loading, rebindings and bound statistics navigation. A disappeared load-more button alone is not pagination progress.

Legacy scrollbar fixtures must translate scroll→reach-end, allow repeated events, and append asynchronous responses without an invented in-flight/once guard. Prove one request per page, not only eventual item count. Cover one available plus one unavailable target through a single panel batch for both readers/native writer, Vue source/DOM lag, and a preexisting duplicated native cache. Record a failing regression against old code before fixing event races; VUI live success does not establish legacy pagination compatibility.

Native pagination acceptance must include a VUI numeric pager with no“共N页”, a starting middle page and a page indicator that updates before video cards. Verify both copy orchestration and statistics through the shared pagination helper; numeric buttons in fixtures must perform real page navigation. A cloned same-page dataset cannot prove readiness. Compare advertised counts with actual API AND native totals before attributing mismatch to a reader. Author fixtures must include real nested/empty spans and name/date labels. Record corrected hypotheses alongside final evidence. No lint/type-check command exists; report only configured checks. Automated accessibility incompletes require explicit manual review/limits, not a blanket certification claim.
