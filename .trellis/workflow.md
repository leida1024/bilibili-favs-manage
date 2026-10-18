# Development workflow

## Core rules

Work on develop; source and user docs remain conventional. Task PRDs/designs/evidence live together in `.trellis/tasks/`, reusable rules in `.trellis/spec/`, and session references in `.trellis/workspace/`. Read `.trellis/README.md` and `AGENTS.md` first.

A clear development request authorizes task creation, planning, implementation, verification, and local development commits. Honor explicit limits. Do not ask again at phase boundaries. Read-only discussion needs no task. Ask only for missing product decisions or actions outside authorization. Future product ideas are backlog entries until selected; do not call backlog work completed.

Codex uses inline execution, not mandatory sub-agent dispatch. `trellis-brainstorm`, `trellis-before-dev`, `trellis-check`, `trellis-update-spec`, and `trellis-finish-work` are local skills. The workflow and AGENTS.md resolve template prompts for redundant confirmations in favor of the existing user authorization.

## Explicit execution authorization

When the user explicitly says “你可以执行” (you may execute), treat the referenced task, handbook section, or finite task sequence as end-to-end execution authorization. Inspect repository evidence, complete the PRD and required design/implementation plan, activate the task, implement, verify, repair failures, review, commit in coherent batches, archive, and record the session. Do not wait for another request, a description that can be inferred from evidence, or repeated agreement. Do not ask whether to start, continue, or commit at phase boundaries, or stop after presenting only a plan.

Ordinary implementation requests also authorize their necessary steps; the quoted phrase is an explicit trigger, not a required password. Resolve routine, reversible choices from the request, evidence, and documented defaults, and record assumptions. Ask only when investigation leaves a blocking decision, an explicit user review boundary, or an action outside authorization. Name the blocker and its basis, and continue independent work. Tool-enforced approvals still apply; this policy does not bypass them.

Planning-only, handbook-only, and next-session implementation requests stay in planning for product work. Authorization does not automatically cover unrelated backlog, master/Greasy Fork publication, or real-account mutations; follow branch/browser policy. If the user authorizes the whole handbook, complete its finite stages in dependency order without asking between them. If only one task is authorized, finish that scope and report. Recover scope and evidence from task files in a new session rather than relying on conversation memory. Do not start an infinite development loop.

Record the authorization source, scope, exclusions, and remaining blockers in the task PRD. Only an actual user instruction provides new authorization; an elapsed wait never does.

## Phase Index

Plan -> Execute -> Verify and record.

Request routing: read-only requests need no task; create-only requests stay in planning; execution requests (including “你可以执行”) move through all authorized steps without phase approval. Skills: plan → `trellis-brainstorm`; code → `trellis-before-dev`; review → `trellis-check`; reusable knowledge → `trellis-update-spec`; archive/journal → `trellis-finish-work`. Step details use `get_context.py --mode phase --step <X.Y> --platform codex`.

[workflow-state:no_task]
Handle read-only requests directly. For authorized implementation, create/select a task, inspect evidence, write its planning artifacts, and activate it without another phase approval. Read branch/browser policy. Honor explicit user limits.
“你可以执行” authorizes the referenced scope through verified commits and records; do not wait for another request, description, or agreement.
[/workflow-state:no_task]

[workflow-state:task_error]
Inspect the named task and repair malformed metadata from repository evidence without discarding artifacts. Ask only if the true scope/status cannot be recovered; continue independent authorized work.
[/workflow-state:task_error]

## Phase 1: Plan

Use trellis-brainstorm to inspect repository evidence and write a testable prd.md. Lightweight work can be PRD-only. Complex work also needs design.md and implement.md before start. Record authorization, non-goals, dependencies, and acceptance criteria. Ask only for a blocking choice. In inline mode read relevant specs directly; JSONL manifests are optional context references.

[workflow-state:planning]
Complete the PRD; complex tasks also need design and implementation plan. Read project evidence before asking questions. If implementation is already authorized, self-review and run task.py start; planning-only/backlog tasks stay in planning.
“你可以执行” is sufficient execution authorization for its referenced scope; no repeat approval or mandatory interview.
[/workflow-state:planning]

[workflow-state:planning-inline]
Complete planning artifacts and read specs directly through trellis-before-dev. Start within existing implementation authorization; backlog ideas stay in planning. No separate task/phase approval or sub-agent dispatch is required.
On “你可以执行”, resolve routine choices and proceed through execution and finish without waiting for further user description or consent.
[/workflow-state:planning-inline]

#### 1.0 Create or select task

Create/select the task required by the request without task-creation consent. Inspect existing tasks before duplicating them. Record authorization scope in prd.md. Read-only work needs no task.

#### 1.1 Plan from evidence

Use trellis-brainstorm; inspect code, tests, task history, and relevant specs. Finish prd.md and, for complex work, design.md and implement.md. Decide routine implementation details independently. Ask only a concrete blocking question after investigation.

#### 1.2 Research

Research only unresolved choices needed for the task; save relevant evidence in the task. Do not turn adequate requirements into an open-ended interview.

#### 1.3 Load context

Codex inline: read relevant specs directly via trellis-before-dev; JSONL manifests are optional. Do not require sub-agent dispatch. Do not enable global settings automatically.

#### 1.4 Activate task

Self-review artifacts. If execution was requested, including “你可以执行”, run task.py start with the current session identity immediately. Only planning-only requests or an explicit outstanding user review boundary stay in planning. No new start approval is needed.

#### 1.5 Planning completion

Check testable acceptance criteria, dependencies, compatibility, and rollback where relevant. Continue to Phase 2 under existing authorization.

## Phase 2: Execute

Run `python .trellis/scripts/task.py start <task>` from a session with an identity. Hosts usually supply it; for a standalone CLI use an explicit task-specific TRELLIS_CONTEXT_ID for commands in that session. Never commit runtime pointers. Read trellis-before-dev and relevant specs; implement in small coherent changes. Use the dedicated browser and console injection, not Greasy Fork updates.

[workflow-state:in_progress]
Implement inline, self-check with trellis-check, verify behavior, update reusable specs, and commit task changes in separate product/dev batches. Existing authorization persists. Follow live-operation and release boundaries. Then archive the completed task and record the session.
“你可以执行” requires continued work through the authorized scope; do not stop to request phase/commit approval.
[/workflow-state:in_progress]

[workflow-state:in_progress-inline]
Implement inline from the task artifacts/specs. Review the actual diff and relevant outcomes, update reusable specs, and commit product changes separately from Trellis records. No repeat local-commit approval is needed. Archive and journal after completion. Do not release development code to Greasy Fork.
Keep working after internal reviews; do not wait for another request/description/agreement when execution is already authorized.
[/workflow-state:in_progress-inline]

#### 2.1 Implement inline

Read trellis-before-dev and task artifacts. Implement in coherent steps, preserve compatibility, use synthetic fixtures first, and test with console injection in the project browser. Keep working within scope without reapproval.

#### 2.2 Review and repair

Use trellis-check against the real diff and acceptance criteria. Fix failures and rerun relevant checks until acceptance is met or a concrete blocker remains. Keep product behavior and development records in separate commits.

## Phase 3: Verify and record

1. Use trellis-check against task acceptance criteria and the actual diff. Source changes require npm test and npm run build; docs/tooling changes get focused command/link checks. Record limits honestly.
2. Use trellis-update-spec only for reusable rules; keep task evidence with the task.
3. Review status and diff; commit authorized task changes by topic. Do not stage unrelated changes. Product and dev-only changes must never share a release commit.
4. Use trellis-finish-work: archive the completed task, record journal references to work commits, then commit archive/journal changes. session_auto_commit is false so each diff can be reviewed.
5. Push develop when within the agreed work. Master publication is separate; follow spec/guides/branch-policy.md. Report results and remaining scope.

[workflow-state:completed]
Keep completed tasks archived and journals concise. Report verified outcomes and limits. Select the next authorized task when asked to continue; do not start an unattended infinite development loop.
If a finite sequence was explicitly authorized, continue to its next task without asking again; otherwise report completion of the selected scope.
[/workflow-state:completed]

#### 3.1 Verify quality

Run checks proportionate to the actual change. Source changes require npm test and npm run build; docs/tooling get focused command/link checks. Record reproducible outcomes and limitations in the task.

#### 3.2 Update reusable specs

Use trellis-update-spec for rules learned from evidence. Keep task-specific results in the task, not shared specs.

#### 3.3 Final review

Inspect git status and actual staged diff; exclude runtime, browser data, secrets, private screenshots, and unrelated work. Verify branch and release boundaries.

#### 3.4 Commit authorized work

Make coherent local commits without a new approval prompt. Separate product commits from development/tooling records. Push develop when authorized; master/Greasy Fork publication follows branch policy and explicit release scope.

#### 3.5 Archive and journal

Use trellis-finish-work. Archive only tasks whose acceptance criteria are met; record the work commit hashes, evidence, and unresolved limits. With session_auto_commit=false, review and commit archive/journal changes manually. Report outcomes, then continue only a next task already covered by the finite authorization.

## Commands

```text
python .trellis/scripts/get_context.py
python .trellis/scripts/task.py list
python .trellis/scripts/task.py create "Title" --slug name
python .trellis/scripts/task.py start <task>
python .trellis/scripts/task.py archive <task>
python .trellis/scripts/add_session.py --title "Title" --commit "hash" --summary "Summary"
```

Developer identity is local in `.trellis/.developer`; runtime is ignored in `.trellis/.runtime/`. No global Codex settings or hooks are changed automatically. If hook injection is unavailable, read these files and invoke the same scripts manually.
