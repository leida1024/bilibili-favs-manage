<!-- TRELLIS:START -->
# Trellis Instructions

These instructions are for AI assistants working in this project.

This project is managed by Trellis. The working knowledge you need lives under `.trellis/`:

- `.trellis/workflow.md` — development phases, when to create tasks, skill routing
- `.trellis/spec/` — package- and layer-scoped coding guidelines (read before writing code in a given layer)
- `.trellis/workspace/` — per-developer journals and session traces
- `.trellis/tasks/` — active and archived tasks (PRDs, research, jsonl context)

If a Trellis command is available on your platform (e.g. `/trellis:finish-work`, `/trellis:continue`), prefer it over manual steps. Not every platform exposes every command.

If you're using Codex or another agent-capable tool, additional project-scoped helpers may live in:
- `.agents/skills/` — reusable Trellis skills
- `.codex/agents/` — optional custom subagents

Managed by Trellis. Edits outside this block are preserved; edits inside may be overwritten by a future `trellis update`.

<!-- TRELLIS:END -->

# Project rules

- Work on `develop` (or a feature branch from it). Read `.trellis/README.md`, the current task, and the relevant spec before changing code.
- `master` is the user/release branch and the source of the existing Greasy Fork webhook. Keep its user-facing tree free of Trellis and agent files. Read `.trellis/spec/guides/branch-policy.md` before publishing. Never merge all of `develop` into `master`.
- Keep product changes and development records in separate commits. Task requirements, decisions, research, and verification belong in the owning `.trellis/tasks/` directory; reusable rules belong in `.trellis/spec/`. Keep `docs/` for maintained product documentation.
- Use Codex inline execution. Inspect repository evidence and complete authorized work without repeatedly asking for task, phase, or local-commit approval. Ask only for a blocking choice or an action outside the agreed scope.
- When the user explicitly says “你可以执行” (you may execute), treat the referenced task or handbook scope as execution authorization: inspect evidence, finish planning, activate tasks, implement, verify, fix failures, commit, archive, and record the session without waiting for another request, description, or approval. Resolve routine choices using repository evidence and record assumptions. Do not end with only a plan or “waiting for approval”. Honor explicit planning-only/review boundaries; do not expand authorization to unrelated backlog tasks, releases, or real-account mutations. The detailed contract is in `.trellis/workflow.md`.
- Use the project-specific persistent browser described in `.trellis/spec/guides/browser-testing.md`. The user logged into Bilibili on 2026-10-18 and requested console-style injection of local JS. Do not change Greasy Fork while developing.
- Real collection mutations need explicitly named test objects; use synthetic fixtures for deletion/unsubscribe development. Do not commit browser state, tokens, private collection names, or real-account screenshots.
- Source is plain JavaScript ES modules in `src/`; build with `npm run build`, test with `npm test`. Never hand-edit `dist/`. Preserve existing legacy/VUI support, startup recovery, name normalization, and consume-before-execute state behavior.
