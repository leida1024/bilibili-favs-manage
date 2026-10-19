# Branch and release policy

## Roles

- `master`: source, tests, build outputs, and user documentation. Greasy Fork pulls `dist/BilibiliFavsManage.user.js` and `README.md` from this branch through the existing webhook.
- `develop`: the same product plus `.trellis/`, `.agents/`, `.codex/`, and `AGENTS.md`. Keep ongoing work here or on feature branches based on it.
- Historical `dev`, `api`, and `revert-2-dev` are archived under `archive/<branch>-2026-10-19` tags at their exact original tips. Their remote branch refs were removed under the user's explicit cleanup request; obsolete rollback PR#3 is closed. Keep the archive tags so unique history remains recoverable.

GitHub visibility applies to the whole repository. Development records on a pushed `develop` are public too; never record secrets or personal account contents.

## Commit and release

1. Separate product commits from development-tooling/record commits. Keep shared user docs identical unless they describe a product change.
2. Validate behavior with `npm test` and regenerate the userscript with `npm run build` when source changes. Review source and generated changes together.
3. During development inject local JS into the dedicated browser. Do not update the Greasy Fork script or sync settings.
4. When a release is requested, switch to `master` and cherry-pick only the reviewed product commits. Do not merge `develop`, including with squash, because that brings development-only paths into the release tree.
5. Check `git ls-tree -r --name-only master`: `.trellis/`, `.agents/`, `.codex/`, `.claude/`, and `AGENTS.md` must be absent. Run the public tests/build; verify version metadata and user documentation.
6. Push `master` only for an authorized release. Its push can update the live Greasy Fork code/description. A development push must not be treated as a release.
7. Return to `develop`; record source/release commit hashes in the task. Keep `master` fixes in sync by merging `master` into `develop` (this direction is safe) or cherry-picking its product commits.

The user approved completing the2.2.13 release workflow: PR#4 is merged as master21f2578; Greasy Fork2.2.13 and the exact push delivery are verified. Completed release branch/worktree were removed. The subsequent remote-branch cleanup request authorizes historical archival/ref cleanup and a reviewed fast-forward develop push; it supersedes earlier no-push restrictions for this scope. Future releases still need their own user scope. Use revert commits for mistakes; do not rewrite shared history.

## Branch lifecycle

Keep only master and develop as long-lived active branches. Feature branches start from develop and target develop; release branches start from master and contain selected product commits targeting master. Remove completed temporary branches after verifying merge and synchronization. Inspect open PRs, exact tip objects and unique history before cleanup; branch age or a similar name alone is insufficient.

Preserve unmerged historical work with archive tags before removing its branch ref. Verify remote archival objects first; refuse unexpected tip changes. Archive tags are historical pointers, not product releases. To restore a branch when needed, push its archive tag object back to refs/heads/<original-name>. Never force-update a maintained branch or remove unrelated history during cleanup.
