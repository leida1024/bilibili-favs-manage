# Branch and release policy

## Roles

- `master`: source, tests, build outputs, and user documentation. Greasy Fork pulls `dist/BilibiliFavsManage.user.js` and `README.md` from this branch through the existing webhook.
- `develop`: the same product plus `.trellis/`, `.agents/`, `.codex/`, and `AGENTS.md`. Keep ongoing work here or on feature branches based on it.
- Historical remote `dev`, `api`, and `revert-2-dev` branches are not the new workflow. Do not remove or overwrite them as part of setup.

GitHub visibility applies to the whole repository. Development records on a pushed `develop` are public too; never record secrets or personal account contents.

## Commit and release

1. Separate product commits from development-tooling/record commits. Keep shared user docs identical unless they describe a product change.
2. Validate behavior with `npm test` and regenerate the userscript with `npm run build` when source changes. Review source and generated changes together.
3. During development inject local JS into the dedicated browser. Do not update the Greasy Fork script or sync settings.
4. When a release is requested, switch to `master` and cherry-pick only the reviewed product commits. Do not merge `develop`, including with squash, because that brings development-only paths into the release tree.
5. Check `git ls-tree -r --name-only master`: `.trellis/`, `.agents/`, `.codex/`, `.claude/`, and `AGENTS.md` must be absent. Run the public tests/build; verify version metadata and user documentation.
6. Push `master` only for an authorized release. Its push can update the live Greasy Fork code/description. A development push must not be treated as a release.
7. Return to `develop`; record source/release commit hashes in the task. Keep `master` fixes in sync by merging `master` into `develop` (this direction is safe) or cherry-picking its product commits.

The latest user instruction permits local development commits and explicitly prohibits remote pushes until the user reviews the results. Do not push `develop` or any other ref. Earlier roadmap push authorization is superseded. New features are not automatically released to users. Use revert commits for mistakes; do not rewrite shared history.
