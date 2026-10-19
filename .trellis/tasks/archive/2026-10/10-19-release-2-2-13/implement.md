# Execution

1. Inspect fetched baseline, permissions, open PRs and safe webhook status.
2. Activate task; isolated worktree release/2.2.13 from origin/master.
3. Apply22 product commits; retain source/release mapping, inspect every result.
4. Refresh release docs, compare other product files to develop, check excluded paths and versions.
5. npm ci, npm run build, npm test, git diff --check and artifact reproducibility. Commit reviewed docs.
6. Push only release/2.2.13; create PR to master; verify PR/head/base, mergeability/checks and unchanged master.
7. Record evidence, archive/journal and separate local development commit. Report PR/publication boundary.
