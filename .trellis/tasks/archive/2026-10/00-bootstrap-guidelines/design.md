# Bootstrap design

Create develop from master a5bf35d. Keep the full product tree unchanged. Install the existing locally available Trellis 0.6.0-rc.0 templates for Codex only; customize local workflow for inline work and persistent user authorization, and populate actual JavaScript/DOM conventions rather than React placeholders.

Keep tools/specs/tasks/records in development-only paths. Product-only cherry-picks from develop to master preserve the user tree; merging master back into develop keeps release fixes aligned. Never merge develop wholesale into master.

Use a persistent Chrome directory outside the repository with a dedicated agent-browser session and fixed flags through browser.ps1. The user logs in directly. Inject the local Rollup IIFE with eval, equivalent to DevTools console execution. This operates in the page realm, has no GM APIs, and must be reinjected after full navigation. Test only rendering/read-only conditions.

Backlog tasks stay in planning until selected and designed. Existing creation/replay safeguards become baseline specs; new destructive actions require stable identity, preview, confirmation, cancellation, and uncertain-result handling.

Rollback is reverting development setup commits or switching to master. No product/release changes or profile deletion are necessary.
