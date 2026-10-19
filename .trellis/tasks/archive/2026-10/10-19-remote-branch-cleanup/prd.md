# Organize remote branches

## Authorization
User asks to inspect and organize the many remote branches and decide which should remain. Scope: preserve master/release and develop/development roles; archive historical branches before removing their branch refs, close obsolete associated rollback PR, and update stale remote develop after reviewing pending content. This explicit cleanup request supersedes the earlier restriction against historical-ref removal during initial setup. Never discard unique history or change master product content.

## Evidence and decisions
- Remote heads: master, develop, api, dev, revert-2-dev. Completed release/2.2.13 already removed after verified publication.
- master21f2578 is published2.2.13. Local develop includes master and all approved development work; origin/develop74352e1 is a strict ancestor, lagging77 commits at task start.
- api81c3166 is a June27 stashed experimental direction explicitly marked for reference;26 unique commits relative to maintained branches.
- dev4b73bcba is June27 historical work, PR#2 was merged historically but its exact history is not an ancestor of current master/develop;26 unique commits.
- revert-2-dev da7570e is a June27 rollback proposal, associated open PR#3 targets an obsolete June merge;28 unique commits. Do not merge it into current release.
- Preserve each exact tip under archive/<branch>-2026-10-19 lightweight tags before deleting obsolete branch refs. Verify remote tags first. Archive tags retain all ancestors and allow restoring the branch.

## Acceptance
- Remote active heads exactly master/develop. Master remains21f2578 and Greasy Fork publication unaffected.
- Three archive tags resolve to exact original tips; remote history is retained before normal non-force branch deletion. Close obsolete PR#3 without unrelated messages or PR changes.
- Pending develop objects reviewed for high-confidence secrets and known private test markers; browser/runtime artifacts excluded. Fast-forward only, no forced update. Remote develop matches reviewed local commit.
- Update branch lifecycle guidance and local task/journal records, then verify live remote refs and associated PR states. No source changes or unnecessary tests.

## Exclusions
No master rename, branch-protection/settings changes, new features, real Bilibili writes, merging old experiments, new version release or deleting history.
