# Development workspace

This directory exists on develop. Root README and docs/ are maintained product documentation.

## Start here

Read the [development handbook](DEVELOPMENT.md), [workflow](workflow.md), [frontend guidelines](spec/frontend/index.md), [branch policy](spec/guides/branch-policy.md) and [dedicated browser policy](spec/guides/browser-testing.md). Then inspect Git state and run python .trellis/scripts/get_context.py and python .trellis/scripts/task.py list.

## Completed local scope

| Order | Archived task | Result |
| --- | --- | --- |
| 0 | [Bootstrap](tasks/archive/2026-10/00-bootstrap-guidelines/) | Dedicated profile and local injection verified |
| 1 | [UI and logs](tasks/archive/2026-10/10-18-ui-and-logs/) | Shared progress, failure feedback and bounded diagnostics |
| 2 | [Statistics](tasks/archive/2026-10/10-18-video-statistics/) | Explicit selected-scope scans and coverage |
| 3 | [Delete](tasks/archive/2026-10/10-18-batch-delete-folders/) | One-use confirmed sequential deletion, synthetic acceptance |
| 4 | [Unsubscribe](tasks/archive/2026-10/10-18-batch-unsubscribe/) | Folder subscriptions with identity safeguards, synthetic acceptance |
| Follow-up | [Panel usability](tasks/archive/2026-10/10-18-panel-usability/) | Adjacent copy pairs, separate task views and one task scroller |

The latest local build 2.2.1 passed 67 tests and build. These changes are not released. No real-account mutations or remote pushes were performed. The latest user instruction prohibits pushing until user review. Remaining live/GM/navigation limits are in the handbook and task verification files.

## Records

- tasks/: requirements, design, research and evidence; completed work under archive/YYYY-MM/.
- spec/: reusable conventions and operation boundaries.
- workspace/leida1024/: concise journals and work-commit references.
- scripts/: Trellis runtime, dedicated browser helper and no-cache fictional preview server.

Trellis uses the local 0.6.0-rc.0 setup. Runtime pointers and browser profiles are ignored or outside Git. Do not change global agent settings automatically.

Previous follow-up: [compact workspace](tasks/archive/2026-10/10-18-compact-workbench/), product commit `4fc2007`, established side logs and shared selection. Current design: [scenario workspace](tasks/archive/2026-10/10-19-scenario-workspace/), product commit `1861bbf`:600×500, about326px left workspace, direct scope buttons and function-owned status/records. Cross-page copy carries task ID and diagnostic snapshot; uncertain submissions are 待核对. Boolean playlist flags normalize correctly:own-space read-only28 folders→27 eligible/1 protected; foreign-space deletion stays disabled. 67 tests/build,75 fictional browser scenarios and visual checks passed. Numeric version2.2.1 is local only; published Greasy Fork remains2.1.2. No real writes or push. GM sandbox and automatic full navigation remain unverified.
