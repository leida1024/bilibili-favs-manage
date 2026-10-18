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

The local build passed 52 tests and build. These changes are not released. No real-account mutations or remote pushes were performed. The latest user instruction prohibits pushing until user review. Remaining live/GM/navigation limits are in the handbook and task verification files.

## Records

- tasks/: requirements, design, research and evidence; completed work under archive/YYYY-MM/.
- spec/: reusable conventions and operation boundaries.
- workspace/leida1024/: concise journals and work-commit references.
- scripts/: Trellis runtime, dedicated browser helper and no-cache fictional preview server.

Trellis uses the local 0.6.0-rc.0 setup. Runtime pointers and browser profiles are ignored or outside Git. Do not change global agent settings automatically.

Latest follow-up: [compact direct-information UI](tasks/archive/2026-10/10-18-panel-density/) removes content disclosures and updates all task views.
