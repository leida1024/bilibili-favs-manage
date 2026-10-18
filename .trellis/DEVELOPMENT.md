# Development handbook and session handoff

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

All finite roadmap stages have implementation and recorded verification. Mutation acceptance is synthetic only; this is not a production-release or real-account mutation acceptance claim. Final usability checks passed 48/48 tests, build and whitespace. See each task verification.md for evidence and limits.

The panel now defaults to copying, with adjacent source and destination cells and a fixed action footer. Statistics and management are separate views; diagnostics open from the header. Ordinary identity details are expandable, but destructive confirmation exposes exact IDs, owners and counts. Switching operation views invalidates confirmation; busy navigation is locked while records remain accessible.

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
