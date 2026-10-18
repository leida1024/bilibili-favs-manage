# Panel workflow and visual consistency

## Authorization and scope
The user requests ui-ux-pro-max driven rethinking, refactoring, linkage fixes and consistent typography, including deciding whether records need a separate screen. This authorizes planning through implementation, verification and local commits. No remote push, release, Greasy Fork changes or real-account mutations. Existing untracked design skills are user work and excluded.

## Evidence and requirements
- Current records replace the task screen and reset its scroll. Same-tab clicks invalidate confirmation; inventory mode switches clear separate selections; reloading leaves previous mutation outcomes visible; mutation completion can leave an exportable stale statistics report.
- Retain the compact floating utility, adjacent source/target pairs and explicit directly visible help/identity/confirmation details.
- Three task destinations: copy, statistics, management. Records are secondary diagnostics, opened below the task without navigation or losing confirmation/edits/scroll. Only diagnostics are optional; essential operation details remain directly visible.
- One Chinese-friendly local font stack, body/control 14px, secondary 12px, heading 16px; numbers use tabular figures. No font network dependency. Semantic tokens and restrained blue emphasis.
- Preserve independent statistics/management selections across navigation. Leaving management invalidates a destructive ticket but does not silently select anything else. Same-tab clicks do nothing. Scope changes/reload clear old data and confirmation.
- Fixed footer shows current progress, detail, last confirmed step and relevant actions. Records remain accessible while busy; minimize/restore and export modal work with records open.
- User screenshot feedback: static explanation and redundant failure prompts crowd out dynamic lists/records. Consolidate metadata into the heading row and help into one concise paragraph. Present status/count on one line and specific detail/last confirmation together below, retaining full text with natural wrapping. Avoid separate generic warnings that repeat the specific outcome.

## Acceptance
- Regression tests cover records during confirmation/busy, selection and per-view scroll preservation, same-tab idempotence, refresh/scope/mutation stale-state clearing and empty-catalog guidance. No I/O on navigation.
- Fictional browser acceptance covers all three tasks, records open/closed, empty/long/busy/failure, 375px and landscape, keyboard/focus, host typography interference and reduced motion; no horizontal overflow.
- npm test, npm run build and git diff --check pass. Generated output reviewed. Real startup smoke is read-only and bounded; limitations recorded.
- Product and development records committed separately; task archived and journal recorded.

## Non-goals and blockers
No new operation engine, persistent logs, undo promise, dark-theme feature, framework/dependency migration or unrelated backlog. No blocking product questions; user delegates design judgment.
