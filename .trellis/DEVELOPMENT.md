# Development handbook and session handoff

Release preparation complete: [PR#4](https://github.com/leida1024/bilibili-favs-manage/pull/4), release/2.2.13→master, head27ad234.22 ordered product cherry-picks applied conflict-free; release notes and5 fictional screenshots refreshed. Isolated dependency installation, reproducible build and149 tests passed. Product docs backported to local develop as f47f3f5. Only release branch push/PR was authorized and executed; master remains a5bf35d, no auto-merge, no online-version claim. [Release task](tasks/archive/2026-10/10-19-release-2-2-13/) owns full mapping/evidence. Further merge/publication requires user instruction, then actual webhook/Greasy Fork verification.

Latest local follow-up:2.2.13, [notice/release handoff](tasks/archive/2026-10/10-19-notice-release-handoff/). Top notice uses explicit scrolling labels. Public CONTRIBUTING now documents develop-based feature branches/PRs, ordinary numeric versions, current verification limits and product-only release selection. The task records21 earlier product candidates in dependency order,26 development-only commits and one excluded skills/cache mixed commit, plus this task's product commit. Build and149 tests passed; no live browser check, branch modification, push or release. The actual release branch is master, not main. Release-tree application/testing and publication wording remain future release work.

Previous local follow-up:2.2.12 completed operation defenses, QQ notice/Help, detailed statistics/native paging and engineering review. See README and the archived operation-guards, help-community, statistics-details and compatibility-review tasks for acceptance. VUI read-only native/API comparisons passed; live legacy, GM sandbox and automatic cross-page recovery remain unverified.

Previous local follow-up:2.2.6, [settings/identity task](tasks/archive/2026-10/10-19-settings-catalog-continuity/). Saving any method retains read catalogs/selections/filters/reports/export/scroll and invalidates only management confirmation. Same-name management/statistics rows show type/ID/owner; name-based copy rejects ambiguity before native selection or cross-page creation.106 tests/build and fictional desktop/375px browser checks passed. No live mutations, push or release; prior live limits remain.

Previous local follow-up:2.2.5, [empty-legacy/preview task](tasks/archive/2026-10/10-19-legacy-sidebar-create/). Legacy creation uses the independent sidebar Edit form even without videos, rejecting already-open forms and uncertain resubmission. Unavailable subscriptions open a visible target/ID preview; webpage mode shows Settings→API guidance with no executable ticket.99 tests/build passed plus desktop/375px fictional browser checks. No real mutations this iteration, no push/release; live legacy remains unverified.

Previous local follow-up:2.2.4, [legacy-copy-result task](tasks/archive/2026-10/10-19-legacy-copy-result/). Legacy copy's actual `.be-toast`/decorated success message was missing, so longer waits could not help. Native deletion opened the wrong hover element in both layouts; API ordinary-folder metadata then conflicted with native unknown protection. Fixed those adapters without weakening identity/protection checks. Per-item reasons now reach ordinary records/export/footer.93 tests/build passed. Two explicitly authorized disposable create/delete cycles passed on VUI console injection; independent API catalogs confirmed temporary absence and original ID sets unchanged. No push/release. Legacy live copy/deletion, live unsubscribe, GM sandbox and automatic navigation remain unverified.

## Current UI contract (supersedes historical layout notes below)

The user requested autonomous scenario questions/answers, documented system design and execution. [Scenario workspace task](tasks/archive/2026-10/10-19-scenario-workspace/) owns current evidence, glossary and wireframes. Product commit `1861bbf`, numeric version `2.2.1`:600×500, about326px left workspace, default side records, direct scope/action buttons, common search/all/count toolbar, function-owned status and current-function logs. Cross-page handoffs retain task ID and bounded diagnostics; unknown submissions are 待核对. 67 tests/build,75 fictional browser scenarios and visual checks passed. Own-space read-only28 folders→27 eligible/1 protected; foreign-space deletion stays disabled. No real writes, push or publication.

This replaces earlier dimensions and shared-footer feedback. Preserve selection/ticket/reset and consume-before-execute contracts. Use ordinary numeric versions for each reviewable product iteration; the user rejects dev.N. Keep package/lock/runtime/build/header equal. Online stays2.1.2 until explicit release. Existing no-push and scoped real-mutation boundaries remain; see the latest evidence above for the limited VUI create/delete acceptance.

## Goal and authorization

Make Bilibili favorites management comfortable and reliable. Work on develop; keep master and Greasy Fork unchanged until publication is requested. The user authorized Stage 0 followed by Stages 1–4 and the frontend-design usability follow-up, including local implementation, verification, fixes, commits, archives and journals. The earlier no-push instruction was superseded only for the approved2.2.13 release branch push and PR#4; develop/master pushes and merging/publication remain outside this completed scope. Do not request repeated phase or local-commit approval.

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

Real mutations require explicitly designated disposable folders/subscriptions. The 2026-10-19 user request authorized new temporary folders followed by their deletion; two such VUI cycles were verified and cleaned up. This does not authorize deleting existing folders or testing unrelated subscriptions/copy writes. Never commit browser state, tokens, private names or real-account screenshots. Live copy/unsubscribe, Tampermonkey GM sandbox, current legacy-page live behavior and automatic full-navigation recovery remain unverified. Console injection cannot establish those guarantees.

## Completion and release boundary

The current deliverable is PR#4 awaiting user review; develop records remain local. Archives contain design, implementation and sanitized verification; the journal references work commits. Only release/2.2.13 has been pushed, not master/develop. Greasy Fork publication has not been performed or verified.

The product-only release branch and its checks are ready. A future user instruction to merge/publish should operate on the reviewed PR head, recheck current base/head and then verify webhook delivery and actual Greasy Fork version. Never merge all of develop into master. Master remains at a5bf35de70204ac234147068c7058a3044dbc2f5.

The latest design follow-up is recorded in [the panel-design-rethink archive](tasks/archive/2026-10/10-18-panel-design-rethink/), product commit `7717c06`. It supersedes the earlier full-screen-records structure and incorporates the user's screenshot feedback about static help/status crowding out lists. Final checks:57/57 tests, build,81 fictional browser cases across desktop/375px/landscape,contrast/reduced-motion/keyboard review. Read-only real startup:one panel,nine source rows,uniform font,no horizontal overflow,records/task coexistence,minimize/restore and navigation passed. No real mutations or remote pushes. See task verification for exact limits.
