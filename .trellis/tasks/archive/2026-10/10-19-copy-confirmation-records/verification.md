# Verification — 2.2.3

2026-10-19, develop, inline implementation and trellis-check. Local delivery only.

## Findings and interpretation

The supplied confirmation-to-stop interval is six seconds, exactly the old `DELAY.LONG * 3` deadline. That proves the stop came from missing confirmation, not a returned platform failure. It does not prove whether this historical submission was slow, localized, or missed for another DOM reason.

Read-only public asset `https://s1.hdslb.com/bfs/static/shanks/fresh-space/assets/index-76bd2e5f.js` still renders `.vui_toast` inside `.vui_toast--wrapper`, calling operation_success after copy code0. It includes Chinese and other localized success strings now covered. No evidence that the current VUI toast class disappeared. Public asset was inspected outside the repository; no account payloads saved.

The original task-only journal could omit other-function/general records; it was also captured before the countdown and before the waiting transition. Both boundaries are now covered. The specific historical sidebar entry's disappearance was not independently reproduced; its fallback branch is now explicitly retained across two synthetic realms, even with denied sessionStorage. Filtering and retention eviction are separately explained to the user.

## Automated acceptance

- Final `npm run build` succeeded and `npm test` passed89/89,0 failures/skips. Package, lock root, CONFIG, generated header and panel all2.2.3.
- New fake-clock case:6s reports waiting and remains pending;7s success confirms. A delayed/localized nested VUI wrapper confirms two successive folders once each. Existing name-normalization and legacy fixtures continue passing.
- Stale visible success, hidden success, negative success text, unrelated DOM text, script logs and dialog disappearance do not confirm. Text changes, ancestor visibility changes and multiple messages are handled. Explicit platform failure returns failed; timeout remains unknown. Cancel/terminal cleanup prevents late timer actions. No HTTP or transport fallback added.
- Cross-page test exercises the sidebar-fallback branch, other-function records, both countdown tails and waiting records without sessionStorage; same operation ID, no duplicate sidebar log, state consumed before create/copy, second resume does nothing. Account mismatch clears before restore or mutation. Existing clear/tombstone/bounds/malformed/storage-denial tests pass.
- Daily/details choice, hidden counts, unfiltered export and reading-position behavior pass. No lint/type-check command configured. `git diff --check` passes.
- Initial verification exposed the pre-existing generated-file line-ending mismatch (fixed by required build) and a legacy fixture emitting VUI notifications; kept shared VUI support in the legacy adapter instead of weakening compatibility. A test still using animation delay for its deadline was updated to the independent confirmation configuration.

## Browser acceptance

Project `bili-favs-dev` session via browser.ps1, agent-browser core guide. Fictional preview only for interactive operations/screenshots.

- Existing archived browser-regression script:25 scenarios each at1536×730 and390×844, failures=[] in both. Includes empty/dense/long lists, running/failed/completed/interrupted/unknown, function switching, modal focus and geometry. Desktop dense complete visible rows:copy7/statistics8/manage7.
- Current task `browser-records.js`:both viewport sizes failures=[]. Two content modes; daily fallback visible; debug and other function hidden with explicit count; details includes click and context; all-function records preserved; unfiltered export3 entries; no horizontal overflow; filters/actions/scroll region in bounds.
- Visual review of desktop and narrow screenshots; final docs/assets/panel-records.png is an element screenshot of fictional data,600×500. No real-account screenshots committed.
- Read-only real VUI page:before injection pending=false,installed=false,busy=false. Injected local dist; afterward one panel,v2.2.3,two content options,pending=false,running=false,horizontalOverflow=false. No mutation buttons clicked.
- CLI viewport commands returned EOF even though actual viewport changed correctly; offline quick doctor reported0 failures. ffmpeg warning affects recording only; no recording used.

## Limits and review

Reviewed UI filters -> LogStore/export; flow -> identity -> full diagnostic snapshot -> restore -> consume -> operation; adapter -> native watcher -> outcome -> manager status. Generated diff matches source. No real copy/create/delete/unsubscribe, Tampermonkey sandbox, automatic full-navigation execution or current legacy live mutation verification. Platform success acknowledges the submission; it is not independent target membership reconciliation. Storage denial still cannot guarantee arbitrary manual-refresh retention without a saved handoff.

Product commit `8cdcba3`. No remote push, master changes or Greasy Fork changes. Product and development records are separate local commits; final references in the journal. Named browser session closed cleanly after verification; other sessions untouched.
