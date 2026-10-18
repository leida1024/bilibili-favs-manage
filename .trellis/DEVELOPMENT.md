# Development handbook and session handoff

## Goal

Make Bilibili favorites management comfortable to use: the panel should appear reliably, explain what is selected and what will happen, show useful progress, and make failures understandable. Add capabilities in small verified increments. Preserve working copy behavior before expanding the feature set.

This is the single entry point for future development. Task PRDs hold detailed acceptance criteria; workflow/specs hold reusable rules. Do not duplicate this handbook into user-facing docs. It belongs on `develop` only.

## Current state (2026-10-18)

- `develop` was created from release commit `a5bf35d` on `master`. Product source, distribution, root README, and user docs have not been changed in this setup.
- Trellis 0.6.0-rc.0 was initialized for Codex and developer `leida1024`. Project rules, frontend specs, branch/browser policies, and four planning tasks exist.
- English workflow and start/continue/brainstorm/finish skills now recognize existing execution authorization. The reference was `perfxlab-notes`, especially commits `c11eb01`, `38d47b3`, and `cc71746`; no domain-specific policy or private records were copied.
- “你可以执行” (you may execute) authorizes the referenced finite scope through planning, implementation, verification, fixes, commits, and records without repeated start/continue/commit questions. Read [workflow.md](workflow.md) for the full contract. Ordinary implementation requests also authorize their necessary steps.
- A dedicated persistent Chrome profile was opened and the user logged into Bilibili. Use local JS injection; do not update Greasy Fork during development.
- The existing `npm test` run passed all 18 tests; `npm run build` completed successfully before the user paused testing. These are baseline results, not validation of future features.
- A read-only browser check detected the VUI favorites page, no lifecycle, and no pending cross-page operation before injection. The local build was then injected through stdin and the command returned successfully. Panel mounting and interaction were **not inspected afterward**; do not claim browser acceptance passed.
- The helper supports explicit argument arrays and UTF-8 file injection via stdin. This avoids PowerShell flag abbreviation and Windows command-line length problems. Final helper/browser checks remain pending.
- The user explicitly stopped testing in this session to prioritize this handoff. No new feature implementation, real collection mutation, or Greasy Fork change was performed. Bootstrap remains `in_progress`; the four feature tasks remain `planning`.

## Start in a new session

1. Read `AGENTS.md`, this handbook, [workflow.md](workflow.md), [branch policy](spec/guides/branch-policy.md), and [browser testing](spec/guides/browser-testing.md).
2. Inspect `git status`, branch, recent commits, and remote parity. Preserve existing changes; do not assume a previous session finished its push.
3. Run `python .trellis/scripts/get_context.py` and `python .trellis/scripts/task.py list`. Select the task explicitly; a runtime pointer left by another session is not the source of product scope.
4. Use the host session identity. If the CLI has none, set a unique task-specific `TRELLIS_CONTEXT_ID` for this session's task commands; do not reuse a stale session identity or commit runtime pointers.
5. Finish bootstrap checks below before product changes. Then implement the finite stages authorized by the user's new prompt in dependency order. Complete complex task design/implementation plans before `task.py start`.

The user requested implementation in a **new** session. This handbook alone does not activate all backlog tasks. When the new prompt authorizes the full roadmap, proceed between its stages without repeat approvals. Ask only about a genuine blocker that repository evidence, prior instructions, and reasonable defaults cannot resolve. Keep independent work moving.

## Stage 0: Finish the development workspace

Task: `tasks/00-bootstrap-guidelines/` until archived; afterward find it under `tasks/archive/`.

- Review the setup diff, English workflow/skill agreement, phase-step routing, local Markdown targets, and ignored runtime/profile paths.
- Confirm that the public tree still matches `master` and that `master` has no `.trellis/`, `.agents/`, `.codex/`, or `AGENTS.md`. Keep the release unchanged.
- Resume browser validation only after the new session is authorized to execute. Check mounted panel/manager, one panel after repeated injection, and minimize/restore without touching favorites. Refresh before testing changed builds: duplicate injection intentionally reuses the old lifecycle.
- Before injection, check pending cross-page state by presence only. Stop if an unexpected operation is pending; do not resume or delete it blindly.
- Record sanitized results and limitations in the bootstrap task. Mark actual completed checklist items; archive only after acceptance is met. Record work commit hashes in the journal and commit the records.

Do not rerun broad baseline tests just because a session changed. Run relevant checks when edits or unresolved concerns justify them. Console injection has no GM APIs and loses code after a full navigation; it does not prove Tampermonkey sandbox or automatic cross-page recovery.

## Stage 1: UI and logs

Task: [UI and logs PRD](tasks/10-18-ui-and-logs/prd.md).

Make the current operation understandable before adding more operations:

- Separate source selection, target review, action controls, progress, and diagnostic details. Explain copy behavior and the current page/scope using only verified information.
- Design a shared operation/log model from actual consumers. Keep plain JavaScript and existing component boundaries; avoid a framework rewrite.
- Show idle, running, completed, failed, and interrupted states; always release busy state. Report the last confirmed step and useful next action. Never invent a known total.
- Provide useful log levels/filtering, bounded retention, clear/export controls, and follow-latest behavior that respects a user reading older entries. Let users review exported identifiers and omit credentials.
- Keep keyboard controls, long names, empty lists, narrow viewports, drag/resize/minimize/dismiss, selection preservation, and legacy/VUI compatibility working.
- Build the fictional preview first. Cover empty, many/long names, running, partial failure, and completion with synthetic data; screenshots must use fictional favorites.

Acceptance: the task PRD's criteria are met, current regression tests pass, new operation/log behavior has focused tests, and the local-injection smoke result is recorded with its limitations. Keep existing copy semantics; document necessary plumbing changes in the design.

## Stage 2: Read-only inventory and video statistics

Task: [Video statistics PRD](tasks/10-18-video-statistics/prd.md). Depends on UI/logs.

- First investigate stable folder/video IDs, ownership/subscription type, legacy/VUI pagination, and available metadata. The existing `BilibiliAPI` automates DOM; do not assume an HTTP API abstraction already exists.
- Define an explicit MVP from reliably available fields: scope, unique videos, duplicates, and duration/uploader when obtainable. Keep missing values unknown rather than zero.
- Clearly distinguish a current-page sample from a complete scan. Show incomplete/failed pages, unavailable videos, cancellation, and coverage limits.
- Pace requests/pagination, avoid account-wide background crawling, and provide an explicit local export action without telemetry or cloud upload.
- Prefer an inventory/identity layer reusable by later management operations. Decide its contract in the design before implementing destructive features.

Acceptance: synthetic multi-page fixtures prove counts, stable-ID deduplication, missing/invalid data, partial failures, and cancellation. Live inspection is read-only and records aggregate results only.

## Stage 3: Batch delete owned folders

Task: [Batch delete PRD](tasks/10-18-batch-delete-folders/prd.md). Depends on reliable UI/results and stable identity discovery.

- Verify Bilibili's actual deletion semantics, protected/default-folder behavior, ownership, and effects on contained favorites before designing controls.
- Separate owned/deletable folders from subscriptions and protected entries. Start with nothing selected; identify targets by stable IDs even when names repeat or change.
- Preview exact targets and consequences, then require an explicit confirmation in the product. Execute sequentially, allow cancellation before the next item, and show confirmed/failed/unknown results per item.
- Stop on an uncertain result. Never automatically retry an unknown deletion or restore a destructive queue on reload. Do not promise undo without verified platform support.

Acceptance: synthetic tests cover exclusions, identity, confirmation, cancellation, failures, and unknown outcomes. A new agent may implement and test this with fixtures under roadmap authorization. Real deletion tests require separately designated disposable folders and explicit authorization; lacking those targets must not block fixture development or unrelated work.

## Stage 4: Batch unsubscribe

Task: [Batch unsubscribe PRD](tasks/10-18-batch-unsubscribe/prd.md). Depends on stable subscription identity and shared operation safeguards.

- Keep subscriptions separate from owned-folder deletion. Verify actual legacy/VUI controls and platform semantics; use stable IDs and owner identity, not labels alone.
- Preview consequences and targets, require confirmation, execute sequentially, allow cancellation, and stop on unknown results. No automatic destructive replay on refresh.
- Explain that the action manages the user's subscription; do not claim unsupported behavior concerning the owner's content.

Acceptance: synthetic fixtures cover same-name objects, ownership/type distinctions, unavailable owners, cancellation, failure, and uncertain results. Real unsubscribe tests require explicitly designated test subscriptions and authorization; otherwise document that live acceptance remains pending.

## Browser workflow

Use the agent-browser skill and the existing project helper. Do not reconnect the default browser or start replacement profiles.

```powershell
& ./.trellis/scripts/browser.ps1 -BrowserArgs @('tab')
# Only open/navigate when needed; preserve the user's logged-in window.
& ./.trellis/scripts/browser.ps1 -BrowserArgs @('open', 'https://www.bilibili.com/')
npm run build
& ./.trellis/scripts/browser.ps1 -ScriptPath './dist/BilibiliFavsManage.user.js'
```

Session: `bili-favs-dev`. Profile: `%USERPROFILE%\.agent-browser\profiles\bilibili-favs-manage`, outside Git. The helper consistently uses installed Chrome, this profile/session, and headed mode. Login can expire; persistence does not guarantee permanent authentication. See the browser policy for short aggregate checks and injection limits.

On the real account, limit checks to startup, navigation, rendering, and read-only information unless specific mutation targets were authorized. Do not commit browser state, tokens, private names, or real-account screenshots. Do not modify Greasy Fork, sync settings, or install development builds there.

## Completion and release

For each authorized task, save evidence in its task directory, run checks appropriate to the change, review diffs, fix failures, and commit coherent changes. Source edits require `npm test` and `npm run build`; never hand-edit `dist/`. Keep product changes and Trellis/development records in separate commits. Preserve startup recovery, name normalization (including spaces), legacy/VUI support, and consume-before-execute behavior.

Archive only completed tasks; record concise journal references to work commits. `session_auto_commit: false` means archive/session scripts do not commit for you. Inspect and commit their output explicitly. A task with unverified live-only criteria must retain that limitation rather than being labeled fully accepted.

Local development commits and pushing `develop` are authorized for this workspace; check new prompt limits. Keep the user-facing `master` ordinary: release only on explicit release instruction, cherry-pick reviewed product commits, and never merge all of `develop` into `master`. A master push can trigger live Greasy Fork updates. Report release exclusions and the final development commit/status honestly.

## Copyable new-session prompt

```text
Work in C:\myfile\Proj\01-self-proj\bilibili-favs-manage on develop.
Read AGENTS.md and .trellis/DEVELOPMENT.md, then the referenced workflow,
policies, specs, and task artifacts. 你可以执行 (you may execute).

Finish Stage 0, then implement Stages 1-4 in dependency order. This is a finite
authorization for planning, designs, implementation, relevant tests, fixes,
review, coherent commits, task archives, journals, and pushing develop.
Do not wait for another request, description, planning approval, or permission
at phase/task boundaries. Resolve routine choices from evidence and record
assumptions. Ask only for a genuine blocker outside existing authorization;
continue independent work while that decision is pending.

Use the existing dedicated browser profile and console-style local JS injection.
Use fictional data for previews and synthetic fixtures for mutation workflows.
Do not change master or Greasy Fork, publish a release, or modify my real
favorites/subscriptions without specifically authorized test targets. Treat
missing live mutation authorization as a live-test limit, not a reason to stop
the rest of the roadmap. Keep all development documents in English.

Prioritize a reliable, comfortable user experience and preserve working copy
behavior. Report verified outcomes, remaining limits, commits, and Git status.
```
