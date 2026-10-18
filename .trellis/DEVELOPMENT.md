# Development handbook and session handoff

## Current UI contract (supersedes historical layout notes below)

The user rejected the prior wide/cluttered interface and requested side logs, more visible folders, consistent selection in all three tasks, and real development versions. [Compact workspace task](tasks/archive/2026-10/10-18-compact-workbench/) owns the top-level design and final evidence. Product commit `4fc2007`, version `2.2.0-dev.1`: 640×600, default side logs, narrow-panel bottom logs, shared search/all/cancel/count toolbar, concise name/count rows and exact final destructive review. Desktop shows 10 full short-name copy rows, 8 under failure; 125 fictional cases and 60 tests/build passed. Read-only live injection: one panel, nine source rows, correct version/side logs/no overflow and minimize/navigation/reinjection passed. No real writes or push.

The side log/default sizing and contextual identity design replace the content-sized/bottom hidden-record layout described in older sections. Preserve selection/ticket/reset contracts. Advance dev.N for each reviewable product iteration; keep package/lock/runtime/build/header equal. Online stays 2.1.2 until an explicit release. Existing no-push and real-mutation boundaries remain in force.

## Goal and authorization

Make Bilibili favorites management comfortable and reliable. Work on develop; keep master and Greasy Fork unchanged. The user authorized Stage 0 followed by Stages 1–4 and the frontend-design usability follow-up, including local implementation, verification, fixes, commits, archives and journals. The latest instruction explicitly prohibits ALL remote pushes until user acceptance. It supersedes earlier push authorization. Do not request repeated phase or local-commit approval.

## Verified local state (2026-10-18)

| Scope | Product/work commit | Evidence |
| --- | --- | --- |
| Stage 0: dedicated browser and injection | 409bb91 | [Bootstrap archive](tasks/archive/2026-10/00-bootstrap-guidelines/) |
| Stage 1: operation progress and bounded diagnostics | 5fb6a82 | [UI/log archive](tasks/archive/2026-10/10-18-ui-and-logs/) |
| Stage 2: selected-scope read-only statistics | 28a4c30 | [Inventory archive](tasks/archive/2026-10/10-18-video-statistics/) |
| Stage 3: confirmed owned-folder deletion | 0d3a754 | [Deletion archive](tasks/archive/2026-10/10-18-batch-delete-folders/) |
| Stage 4: confirmed folder unsubscribe | 3924eaf | [Subscription archive](tasks/archive/2026-10/10-18-batch-unsubscribe/) |
| Usability: adjacent copy pairs and separate task views | 6883422 | [Usability archive](tasks/archive/2026-10/10-18-panel-usability/) |

All finite roadmap stages have implementation and recorded verification. Mutation acceptance is synthetic only; this is not a production-release or real-account mutation acceptance claim. Final usability checks passed 52/52 tests, build and whitespace. See each task verification.md for evidence and limits.

The panel defaults to copying, with adjacent source and destination cells and a fixed action footer. Statistics and management are separate tasks; optional records open below the task from the header, preserving the workspace. Help, identity and essential progress display directly. Copy metadata shares the heading row and help is one paragraph; status/count and specific detail/last confirmation are compact, without repeated generic reminders. Loaded rows align names, counts and identity; records align time, level and message in a separate bounded scroller. The compact window follows content height. Task changes preserve independent selections/scroll and invalidate confirmation; same-tab clicks and records keep confirmation. Busy navigation is locked while records remain accessible. Scope/reload/mutation reset invalidates stale reports/exports.

Read-only public smoke found nine folders and completed a selected six-video scan in Stage 2. Final local-injection smoke mounted one panel with nine source rows, default copy view, working minimize/restore and no pending cross-page state. No real copy, delete or unsubscribe was submitted. No push occurred.

## Resume and review

1. Read AGENTS.md, this handbook, [workflow](workflow.md), [frontend specs](spec/frontend/index.md), [branch policy](spec/guides/branch-policy.md) and [browser policy](spec/guides/browser-testing.md).
2. Inspect local branch/status/log; do not fetch or push just to refresh parity. Tracking-ref comparisons describe the last known remote state only.
3. Run python .trellis/scripts/get_context.py and python .trellis/scripts/task.py list. Completed scope is archived, not a backlog to reactivate. Runtime pointers are not product scope.
4. Review the usability screenshot in docs/assets/panel-preview.png and run the fictional preview with python .trellis/scripts/preview.py at http://127.0.0.1:8766/examples/panel-preview.html. It uses synthetic clients.
5. New source changes require npm test and npm run build; never hand-edit dist. Keep product and development records in separate commits.

## Preserved safeguards

Keep legacy/VUI adapters, normalized names including internal spaces, one page lifecycle, startup recovery and consume-before-execute state. Copy success requires a newly observed success mutation. Inventory scans are explicit, selected-scope, paced and bounded; unknown fields stay unknown and partial coverage is labelled.

Deletion and unsubscribe use separate selections, exact stable identities, explicit preview/agreement, one-use tickets and fresh identity revalidation before every sequential submission. Failure or uncertain submission stops the batch. No automatic retry, persisted destructive queue or undo promise. Folder subscriptions are supported; season subscriptions remain excluded.

## Browser workflow and remaining limits

Use only the existing dedicated bili-favs-dev session through .trellis/scripts/browser.ps1. Profile: %USERPROFILE%/.agent-browser/profiles/bilibili-favs-manage, outside Git. Read the agent-browser skill and browser policy before control. Inspect tabs before selecting. Keep fictional-only scripts guarded to the localhost origin.

Before local injection, check pending cross-page state by presence only. Stop for unexpected pending state; never print, delete or resume it blindly. Refresh before changed builds, then inject dist/BilibiliFavsManage.user.js through the helper. Repeated injection reuses the existing lifecycle. Close only the named session cleanly when finished.

Real mutations still require explicitly designated disposable folders/subscriptions. Until then use synthetic fixtures. Never commit browser state, tokens, private names or real-account screenshots. Live mutation behavior, Tampermonkey GM sandbox, current legacy-page live behavior and automatic full-navigation recovery remain unverified. Console injection cannot establish those guarantees.

## Completion and release boundary

The current deliverable is local and awaiting user review. Archives contain design, implementation and sanitized verification; the journal references work commits. No remote publication is authorized. Do not change master, release metadata or Greasy Fork.

A future explicit release request requires reviewed product-only cherry-picks onto master, release checks and separate push authorization. Never merge all of develop into master. The master baseline for this work is a5bf35de70204ac234147068c7058a3044dbc2f5.

The latest design follow-up is recorded in [the panel-design-rethink archive](tasks/archive/2026-10/10-18-panel-design-rethink/), product commit `7717c06`. It supersedes the earlier full-screen-records structure and incorporates the user's screenshot feedback about static help/status crowding out lists. Final checks:57/57 tests, build,81 fictional browser cases across desktop/375px/landscape,contrast/reduced-motion/keyboard review. Read-only real startup:one panel,nine source rows,uniform font,no horizontal overflow,records/task coexistence,minimize/restore and navigation passed. No real mutations or remote pushes. See task verification for exact limits.
