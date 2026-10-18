# Verification — 2026-10-18

## Delivered behavior
Product commit: `7717c06` (`refactor(ui): keep records beside compact task workflows`).

- Copy/statistics/management remain the three task destinations. Records open below the fixed action footer, keep the task visible and preserve confirmation/edits/selection/scroll. Busy navigation stays locked; records/minimize remain usable. Export makes all background regions inert and restores focus.
- Same-tab navigation is idempotent. Actual task changes invalidate destructive tickets while preserving independent statistics/management selections. Scope change/reload clears old report/results/catalog/selection; mutation completion clears cached statistics export. Failed/cancelled load shows recovery guidance.
- One local system font stack with 12/14/16px type roles, semantic color tokens and tabular numbers. No framework or runtime dependency added. Reduced-motion is verified with computed `transitionDuration: 0s`.
- User screenshot feedback was incorporated: scope sits beside heading; one concise static helper; failure status/count followed by specific detail and last-confirmed text. Repeated generic warning removed. In the 680px by 700px fictional failure-plus-records case, heading/help = 54px, status = 45px, record viewport = 95px and four complete source rows are visible. The rejected screenshot showed approximately two.

## Automated checks
- `npm run build`: passed; generated userscript diff reviewed, metadata/version unchanged.
- `npm test`: **57/57 passed** after the final source changes, including built-artifact startup checks and existing legacy/VUI/name/recovery/batch safeguards.
- Five new behavioral regressions cover same-tab/records during confirmation and per-view scroll, reload/mutation stale report clearing, minimized records/export modal, operation lifecycle logs, failed/cancelled catalog recovery. Existing records/navigation expectations updated.
- `git diff --check`: passed. No configured lint or type-check scripts.

## Fictional browser acceptance
Named project Chrome session through `.trellis/scripts/browser.ps1`, localhost no-cache preview. No production entry point or real mutation clients are used in the preview.

- Reproducible task-local `browser-check.js`: **27 cases at each of 1440×1000, 375×812 and 812×375** after final layout changes. Empty, 40 long names, running, failed, completed, interrupted, records open/closed/restored, management empty/loaded/confirmation, statistics and subscriptions. No horizontal overflow, controls/panel inside viewport; all cases passed. Source/target stay adjacent on narrow screens.
- Adversarial host CSS sets form controls and labels to Georgia/19px; all tested panel controls/labels/headings still resolve to one panel font family. Help/identity/confirmation details remain directly visible and naturally wrap.
- `visual-final.js`: all 11 checked semantic color pairs pass. Text contrast minimum among measured pairs 4.64:1; control boundary/surface 3.09:1. Reduced motion matches and computed button transition is 0s. UI remains light under its explicit color-scheme; no dark-theme feature is claimed.
- Axe 4.12.1 on final loaded statistics: **0 violations, 0 incomplete, 24 passes**. Records/failure audit: 0 violations; decorative arrow contrast required manual review (aria-hidden decorative glyphs). Functional text/background pairs were separately measured above. An earlier generic labelled log container was given a region role to resolve the ARIA review item.
- Actual keyboard controls: Enter toggles records without changing task; export focuses textarea; Shift+Tab wraps to last button, Tab wraps back; Escape closes and returns focus to export trigger. Existing focus visibility is retained.
- Visual QA opened and inspected the final synthetic copy, inventory and failure-plus-records images. Updated `docs/assets/panel-preview.png`, `panel-inventory.png`, `panel-records.png` contain fictional content only.
- Installed CLI reports EOF for viewport-setting commands even when Chromium applies the resize. Each matrix returns the actual `innerWidth/innerHeight`, confirming all requested dimensions; not treated as a failed layout check or ignored without evidence.

## Read-only live smoke
Before injection, aggregate check showed no pending local cross-page state, no lifecycle and no panel. Injected the final generated build into the already authorized public favorites page in the dedicated persistent profile. Output was aggregate only; no screenshots/private names/tokens were recorded.

Observed one panel, nine source rows, not busy, default copy task, same resolved input/button font, no horizontal overflow. Opening records kept copy workspace visible. Minimize/restore retained records. Statistics/management navigation rendered and returned to copy without loading lists or mutating collections. Pending state remained absent. Closed only the named project browser session cleanly to flush the persistent profile.

No copy, deletion or unsubscribe was submitted on a real account. Tampermonkey GM sandbox, automatic full-navigation recovery and current legacy-page live behavior remain unverified. Existing synthetic safeguards continue to pass. No push, master change, release or Greasy Fork modification occurred. Seven existing untracked skill directories were excluded from staging.

## Completion
Acceptance met. Product and development records are separate commits. The task is ready to archive and journal with product commit `7717c06`; no outstanding implementation blocker.
