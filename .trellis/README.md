# Development workspace

This directory exists on `develop`. The root README and `docs/` remain the user manual and maintained product references.

## Start here

Read the [development handbook and session handoff](DEVELOPMENT.md) for the current state, remaining work, staged acceptance criteria, and a copyable execution prompt.

1. Read [workflow.md](workflow.md) and [branch policy](spec/guides/branch-policy.md).
2. Run `python .trellis/scripts/get_context.py` and `python .trellis/scripts/task.py list`.
3. Continue the relevant task; requirements and evidence stay with that task. Read [frontend guidelines](spec/frontend/index.md) before implementation.
4. Use the [dedicated browser](spec/guides/browser-testing.md) for console-style local injection. Do not publish development builds to Greasy Fork.

## Roadmap

| Order | Task | Intended outcome |
| --- | --- | --- |
| 1 | [UI and logs](tasks/10-18-ui-and-logs/prd.md) | Clearer controls, progress, failure messages, and diagnostic logs |
| 2 | [Video statistics](tasks/10-18-video-statistics/prd.md) | Read-only summaries with explicit scope and completeness |
| 3 | [Batch delete](tasks/10-18-batch-delete-folders/prd.md) | Owned-folder deletion with preview, confirmation, cancellation, and verified results |
| 4 | [Batch unsubscribe](tasks/10-18-batch-unsubscribe/prd.md) | Separate subscription management with the same operation safeguards |

These are planned increments, not shipped capabilities. UI/logs come first; inventory and stable object identity should precede destructive actions. Each task needs its own evidence-based design before activation. User-visible requests authorize normal planning, implementation, tests, and development commits; this does not authorize arbitrary changes to the user's real collections or automatic release to `master`.

## Records

- `tasks/`: PRDs, designs, implementation plans, research, and validation; completed tasks move to `tasks/archive/YYYY-MM/`.
- `spec/`: reusable project conventions and operation boundaries.
- `workspace/leida1024/`: journal and task/commit references; do not duplicate task contents here.
- `scripts/`: Trellis runtime plus the local `browser.ps1` convenience entry point.

Trellis was initialized with the locally installed `@mindfoldhq/trellis` 0.6.0-rc.0, matching the reference project. No reference project's history or runtime identity was copied. Hooks are optional: if the host has not approved the generated Codex hook, read this entry point and invoke the Python scripts directly; do not modify global Codex settings automatically.
