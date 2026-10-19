# Notice wording and contributor/release handoff

## Authorization and scope
User requests unambiguous notice scrolling controls, then a review of which changes belong on the release branch and whether contributor manuals need updates. Authorized: source wording, existing assertions, version/build, contributor documentation, local commits and task records. No push, branch rename, release, webhook edits or real-account writes.

## Evidence and decisions
- Actual release branch is master, not main; Greasy Fork consumes its dist and README.
- Current develop version is 2.2.12; advance ordinary numeric components to 2.2.13.
- Use 停止滚动 / 继续滚动 and accessible labels naming the top notice; retain aria-pressed and animation logic.
- CONTRIBUTING contains obsolete dev.N version guidance, stale validation scope and no feature-branch/PR base instructions. Correct these and document product-only release selection.
- Lightweight UI/documentation task; no architecture changes or sub-agents needed.

## Acceptance
- Both scrolling button states explicitly name scrolling, with matching accessible names; existing behavior remains.
- Package/lock/config/generated version equals 2.2.13; current product docs reflect it.
- Contributors can start from develop, build/test without Trellis or an account, and understand legacy/VUI and privacy constraints.
- Recorded master..develop product commit candidates are inspected by touched paths, ordered with dependencies, and separated from development records. Unverified release boundaries and necessary release checks remain explicit.
- Build, complete tests and diff checks pass; product and development records commit separately; archive/journal complete.

## Exclusions
No publication readiness claim, actual release candidate branch, real mutations, unrelated feature work or migration from master to main.
