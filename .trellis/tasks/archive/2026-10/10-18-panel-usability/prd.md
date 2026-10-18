# Simplify the panel around source-to-target copy rows

## Goal

Make copying immediately understandable and comfortable without sacrificing the completed roadmap's safeguards. The user explicitly requested frontend-design, fewer competing controls, useful space, clear explanations and source/target on the same row. Continue the other authorized tasks. Local commits only; no push, release or real mutations.

## Requirements

- Default to copy; separate statistics and management views. Reveal diagnostics/help on demand.
- Align each selected source with its editable destination on one row, with clear column roles and destination ownership. Remove duplicated task list.
- Use the available panel width; one scroll area per view, no nested list scrollbars. Keep the copy action and selection count visible.
- Keep long/empty lists, keyboard controls, narrow screens, busy/error/progress, name normalization, selections across refresh, minimize/resize/dismiss and legacy/VUI startup.
- Switching views makes no network calls or mutations, invalidates destructive previews and never enables replay. Preserve ID-based explicit confirmation/cancellation and local exports.

## Acceptance Criteria

- [x] Fictional desktop/narrow screenshots show a clear same-row source/destination relationship and uncluttered default view.
- [x] Copy action remains reachable with 40 rows; list has no internal scrollbar and other operations are hidden in copy view.
- [x] View switching preserves copy edits, clears destructive previews, and starts no requests. Busy tasks cannot switch operation view; logs remain accessible.
- [x] Existing and focused behavior tests, build and whitespace pass; local-injection smoke and limitations recorded.
- [x] Product/dev commits, archive and journal complete locally; master and remote untouched.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
