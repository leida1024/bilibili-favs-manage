# Local release selection review

This is a review, not publication authorization. No refs were fetched or pushed.

## Baseline and workflow

- Existing release branch: master; no main ref exists locally.
- master baseline: a5bf35de70204ac234147068c7058a3044dbc2f5
- Locally recorded origin/master: a5bf35de70204ac234147068c7058a3044dbc2f5 (not refreshed from remote).
- Preserve dependency order. Latest features depend on the earlier inventory, transport, identity and pagination changes; cherry-picking only the last four features is not a complete release.
- Product candidates include source, tests, examples, package/lock/build configuration, generated userscript and maintained public documentation.
- Exclude all development-only commits. Mixed commits require path review/splitting, never blind cherry-picking.
- Mixed commit 26f7830 was inspected: its only non-agent path is .gitignore, adding Python skill cache exclusions. Exclude the whole commit; the release product does not require these rules.

## Inspected commits before this task

| Commit | Classification | Subject |
| --- | --- | --- |
| 74352e1 | development only | chore(dev): bootstrap Trellis workflow and development handoff |
| 409bb91 | development only | fix(dev): verify bootstrap and forward browser injection stdin |
| 0644bfd | development only | chore(dev): archive bootstrap and record browser acceptance |
| 5fb6a82 | product candidate | feat(ui): clarify copy progress and bounded diagnostics |
| 43534b5 | development only | chore(dev): archive UI acceptance and preview tooling |
| 28a4c30 | product candidate | feat(stats): scan selected favorites with explicit coverage |
| 07310f3 | development only | chore(dev): archive inventory verification and decisions |
| 0d3a754 | product candidate | feat(folders): add confirmed sequential owned-folder deletion |
| c1258ca | development only | chore(dev): archive deletion safeguards and fixture acceptance |
| 3924eaf | product candidate | feat(subscriptions): add identity-checked batch unsubscribe |
| b88684b | development only | chore(dev): archive subscription safeguards and acceptance |
| 6883422 | product candidate | feat(ui): simplify copy pairs and separate management tasks |
| 981f412 | development only | chore(dev): archive usability evidence and local-only handoff |
| 847ddb2 | product candidate | fix(ui): compact all views and display information directly |
| b826b87 | development only | chore(dev): archive direct-information UI acceptance |
| 7717c06 | product candidate | refactor(ui): keep records beside compact task workflows |
| a376c54 | development only | chore(dev): record panel design decisions and acceptance |
| 618d52f | development only | chore(dev): complete design verification journal |
| 26f7830 | MIXED: inspect individual paths | chore(skills): add UI UX design intelligence and ignore Python caches |
| 82e97ac | development only | chore(skills): add reusable UI styling tools |
| 23b13fa | development only | chore(skills): add brand design system and creative workflows |
| 4fc2007 | product candidate | refactor(ui): restore compact workspace and unify selection controls |
| 3b9f64b | development only | chore(dev): record compact workspace design and acceptance |
| 1861bbf | product candidate | refactor(ui): scope workspace state and preserve cross-page diagnostics |
| 911dc06 | development only | chore(dev): record scenario design and continuity verification |
| bfa3988 | development only | chore(dev): normalize task document endings |
| 944884f | product candidate | feat: persist workspace and separate native and API transports in 2.2.2 |
| 9cc744e | development only | chore(dev): archive 2.2.2 design, verification and tool research |
| 35f0ce9 | development only | chore(dev): finalize completed task references |
| 42830b7 | development only | chore(dev): retain verified task context references |
| 8cdcba3 | product candidate | fix: improve native copy confirmation and record continuity in 2.2.3 |
| 7fbd29e | development only | chore(dev): record and archive copy confirmation fixes |
| bf13d1e | product candidate | fix: recognize legacy copy success and native delete menus in 2.2.4 |
| 7c891f7 | development only | chore(dev): record actual native contracts and disposable live verification |
| f4e3964 | product candidate | fix: support empty legacy creation and unavailable target previews |
| 066a2c1 | development only | docs(dev): record legacy creation and unavailable preview verification |
| 4670c41 | product candidate | fix: retain loaded catalogs and reject ambiguous copy names |
| 2b5c108 | development only | docs(dev): record settings continuity and duplicate identity policy |
| da7eb50 | product candidate | fix: prepare native subscription lists and verify unavailable row identities |
| 2a74671 | development only | docs(dev): record native subscription binding and list preparation verification |
| 1550101 | product candidate | fix: avoid duplicate native legacy subscription page requests |
| 6a1bf39 | development only | docs(dev): capture legacy pagination race reproduction and mixed-batch verification |
| 172051a | product candidate | fix: guard copy context and stale operation entry points |
| 260b1ae | product candidate | feat: add community notice and contextual help panel |
| 594be17 | product candidate | feat: expose video details and harden native statistics paging |
| 41ea877 | product candidate | fix: close review gaps in native paging and operation context |
| b692cd3 | product candidate | docs: describe local guarded copy and detailed statistics |
| 5a9d1bc | development only | docs(dev): record guarded operations help statistics and review acceptance |

## Ordered product selection before this task

```text
5fb6a82 28a4c30 0d3a754 3924eaf 6883422 847ddb2 7717c06
4fc2007 1861bbf 944884f 8cdcba3 bf13d1e f4e3964 4670c41
da7eb50 1550101 172051a 260b1ae 594be17 41ea877 b692cd3
```

These are candidates for the complete developed product, not an assertion that each intermediate build should be published. Append this task's product commit **0eb73bd** (2.2.13):22 product candidates total. No cherry-picks have been performed; conflict-free application and release-tree verification remain to be established.

## Product path groups in candidates

- CHANGELOG.md
- CONTRIBUTING.md
- README.md
- dist/BilibiliFavsManage.user.js
- docs/architecture.md
- docs/assets/panel-inventory.png
- docs/assets/panel-management.png
- docs/assets/panel-preview.png
- docs/assets/panel-records.png
- docs/assets/panel-settings.png
- docs/management.md
- examples/panel-preview.html
- package-lock.json
- package.json
- rollup.config.js
- src/config/config.js
- src/config/selectors.js
- src/core/ApiCopyFlow.js
- src/core/BatchOperations.js
- src/core/BilibiliAPI.js
- src/core/CrossPageFlowManager.js
- src/core/FavoriteManager.js
- src/core/FolderClient.js
- src/core/InventoryService.js
- src/core/OperationState.js
- src/core/PageDetector.js
- src/core/PageLifecycle.js
- src/core/TransportClient.js
- src/core/WebFolderClient.js
- src/core/adapters/LegacyPageAdapter.js
- src/core/adapters/NativeVideoReader.js
- src/core/adapters/VuiPageAdapter.js
- src/core/adapters/copyConfirmation.js
- src/core/adapters/nativeBindings.js
- src/core/adapters/nativeControls.js
- src/core/adapters/nativePagination.js
- src/core/copyContext.js
- src/core/videoMetadata.js
- src/main.js
- src/ui/EventHandlers.js
- src/ui/FloatingPanel.js
- src/ui/HelpPanel.js
- src/ui/InventoryPanel.js
- src/ui/MutationPanel.js
- src/ui/PanelLayout.js
- src/ui/SelectionToolbar.js
- src/ui/UIComponents.js
- src/ui/VideoDetails.js
- src/ui/elements.js
- src/ui/folderRow.js
- src/ui/panelStyles.js
- src/utils/favoriteNames.js
- src/utils/logStore.js
- src/utils/logger.js
- src/utils/preferences.js
- test/batch-operations.test.js
- test/copy-confirmation.test.js
- test/favorite-names.test.js
- test/inventory.test.js
- test/legacy-sidebar-create.test.js
- test/native-management.test.js
- test/native-subscriptions.test.js
- test/operation-guards.test.js
- test/operation-ui.test.js
- test/panel-usability.test.js
- test/refresh-transports.test.js
- test/startup.test.js
- test/statistics-details.test.js
- test/unsubscribe.test.js
- test/workspace-continuity.test.js

## Release checks still required

- Add the reviewed 2.2.13 wording/contributor documentation product commit from this task.
- Assemble selected product commits on a temporary branch/worktree based on master only after release preparation is requested; do not merge develop.
- Ensure the release tree excludes .trellis, .agents, .codex, .claude and AGENTS.md; tests/build must not depend on them.
- Run npm ci, npm run build, npm test and git diff --check in that clean release tree; review generated output and version parity.
- Replace local/unpublished README/changelog statements only when a release is actually approved, and consolidate the release notes for changes since the published baseline.
- Current full live copy/unsubscribe, legacy current page, GM sandbox and automatic full-navigation recovery have not been established by the latest read-only VUI checks. Keep these limits visible; no invented acceptance.
- Inspect/update the fictional product screenshot if it no longer depicts the release UI.
- Recheck current remote refs and webhook/repository settings before an authorized push; do not rename master to main implicitly.
- After authorized publication, record release/source commit mapping and bring release fixes back to develop.
