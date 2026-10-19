# Release PR verification

## Result
- PR: https://github.com/leida1024/bilibili-favs-manage/pull/4
- Base: master at a5bf35de70204ac234147068c7058a3044dbc2f5.
- Head: release/2.2.13 at27ad23481f328c8702e8a874080b57dc802d1a8a.
- PR is OPEN, ready for review, MERGEABLE/CLEAN, autoMergeRequest=null. No GitHub status checks are configured/reported; local checks below are the validation evidence.
- Only release/2.2.13 was pushed. Read-back GitHub/master and ls-remote both establish unchanged release baseline. No PR merge, master/develop push, tag, manual Greasy Fork sync or real-account write.

## Assembly
-22 product commits cherry-picked in reviewed dependency order, all conflict-free, with -x source provenance. Exact full hashes in commit-mapping.json.
- Final release-only documentation commit27ad234 consolidates2.2.13 notes, removes obsolete fixed online-version assertions, and updates5 screenshots from fictional preview.
- Documentation commit backported locally to develop as f47f3f5, preserving maintained product documentation parity. No code changes beyond selected product commits.
- Before documentation updates, src/test/dist/package/lock/build configuration/examples were byte-identical to selected develop product. Recheck after backport establishes parity for all product paths.
- Release tree has no .trellis/, .agents/, .codex/, .claude/ or AGENTS.md. Public code and tests do not import those directories. Private browser/profile/account state was not staged or pushed.

## Checks
- npm ci passed in isolated sibling worktree, installing76 locked packages.
- npm run build passed; generated userscript unchanged from committed output.
- npm test:149 passed,0 failed/skipped/cancelled;15.48 seconds. Full console output retained only in ignored .trellis/.runtime/.
- git diff --check passed for working diff and complete origin/master..HEAD release diff.
- Package, lock root, lock root package, CONFIG and generated @version are all2.2.13.
- Relative document targets in README, CONTRIBUTING and docs/management exist. README public management link uses GitHub blob URL for Greasy Fork compatibility.
- Five fictional screenshots (copy, loaded statistics list, management list, settings, detailed records) were captured and visually inspected. Local browser verified scrolling control state transitions and returned to enabled copying in the fictional detailed-records capture.
- Dedicated bili-favs-dev browser session closed cleanly; no real Bilibili page used. CLI viewport command reported EOF despite applying1040x700 viewport; actual innerWidth/height and600x500 panel rectangle were verified. This was not treated as product failure or hidden evidence.

## Webhook and limits
- Read-only GitHub hook metadata: enabled push hook to api.greasyfork.org, latest recorded response200. No URL/secret exposed, settings modified or redelivery requested.
- Head-branch push is not a new master release. Successful merge must be followed by webhook delivery and actual Greasy Fork version verification; neither is claimed complete here.
- Current live copy/unsubscribe, legacy page, GM sandbox and automatic full-navigation recovery remain unverified. Existing VUI read-only and explicitly scoped temporary create/delete evidence is documented in the PR, without new live mutations.
