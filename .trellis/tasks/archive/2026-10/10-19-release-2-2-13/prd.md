# Product-only release PR 2.2.13

## Authorization
The user agreed to the explained release workflow: create a release branch from master, select product commits from develop, verify, push that branch and open a PR into master for review. This supersedes the previous no-push instruction only for the release branch. Do not merge the PR, push master/develop, publish manually to Greasy Fork, change webhook configuration or mutate the real account.

## Scope and evidence
- Local and freshly fetched origin/master both point at a5bf35de70204ac234147068c7058a3044dbc2f5.
- Repository default is master. One unrelated open PR exists; leave it alone.
- Existing push webhook is active; most recent recorded delivery returned200. Never expose URL/secret or redeliver events.
- Prior review selected22 ordered product commits; exclude Trellis/agent commits and mixed26f7830.
- Preserve main checkout on develop; assemble release/2.2.13 in an isolated worktree from origin/master with source/release commit mapping.
- Prepare release documentation without claiming Greasy Fork already has the new version; preserve known verification limits.

## Acceptance
- Apply all22 product commits, resolving conflicts from evidence if needed.
- Product source/config/tests/artifact match selected develop product; release-only documentation adjustments reviewed.
- No .trellis/, .agents/, .codex/, .claude/ or AGENTS.md in release tree, no private account artifacts.
- Clean dependency installation, build, complete149-test suite, whitespace and version checks pass; generated artifact reproducible.
- Push release branch without force; PR master base includes feature summary, checks, live-test limits and webhook boundary.
- Master remains at baseline. Develop records remain local, archived/journaled separately with PR URL/head/mapping.

## Exclusions
No merge/auto-merge, master/develop push, branch rename, unrelated PR changes or live mutation testing. Greasy Fork publication is contingent on reviewed merge and successful webhook delivery.
