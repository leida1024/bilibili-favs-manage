---
name: trellis-finish-work
description: "Finish authorized work: verify acceptance, commit remaining task changes, archive completed tasks, and record the developer journal without repeat approval prompts."
---

# Finish Work

Read `.trellis/workflow.md` first. Existing execution authorization, including “你可以执行”, covers verification, coherent local commits, archive, and journal. Do not wait for a new request or agreement at these boundaries. Honor explicit user limits and branch/browser policy.

## 1. Inspect evidence

```bash
python .trellis/scripts/get_context.py --mode record
git status --short
```

Check the current task's acceptance criteria and verification evidence. Do not archive incomplete work or confuse a planning backlog item with a finished task. Leave unrelated tasks alone; no cleanup-confirmation prompt is needed.

## 2. Complete work commits

Review actual diffs and commit current-task work in coherent batches (workflow step 3.4). Separate product files from development-only files. Leave unrelated or ambiguous changes untouched and report them. Do not stop with a request for commit permission when already authorized. Do not amend shared history.

## 3. Archive completed tasks

```bash
python .trellis/scripts/task.py archive <task-name>
```

Only archive tasks whose acceptance criteria have been met. In this project `session_auto_commit: false`: the script writes files but does not commit. Review and commit archive changes manually after the work commits. Do not claim the archive script produced a commit automatically.

## 4. Record session

```bash
python .trellis/scripts/add_session.py --title "Session title" --commit "work-hash1,work-hash2" --summary "Verified outcomes and remaining limits"
```

Use work-commit hashes, not archive/journal hashes. Review and commit journal/index changes manually. Keep detailed evidence with its task and only concise references in the journal. Keep private browser/account state outside Git.

## 5. Finish the authorized scope

Push `develop` if authorized; never treat that as permission to publish `master` or Greasy Fork. Verify status and remote parity. Report verified outcomes and blockers. Continue the next task only if it is already part of the user's finite authorized sequence; do not request approval between those tasks or start an unbounded background loop.
