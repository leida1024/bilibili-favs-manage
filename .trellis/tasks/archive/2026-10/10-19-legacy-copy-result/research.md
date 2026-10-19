# Platform evidence and reproduction

Public, unauthenticated assets inspected on 2026-10-19:

- Legacy index: https://s1.hdslb.com/bfs/static/jinkela/space/index.html
- Legacy runtime: https://s1.hdslb.com/bfs/static/jinkela/space/space.d525618dfa1c1daa27addac6609189fa610fec82.js
- Legacy favorites: https://s1.hdslb.com/bfs/static/jinkela/space/12.space.d525618dfa1c1daa27addac6609189fa610fec82.js
- Actual live VUI runtime: https://s1.hdslb.com/bfs/static/shanks/fresh-space/assets/index-76bd2e5f.js

Legacy `copyVideo(...).then` calls `$toast("复制成功(ง •̀_•́)ง")`, closes the modal and clears selected videos. `$toast` mounts `.be-toast` with show=false, appends it, sets show=true and hides after two seconds. 2.2.3 omitted both the selector and exact decorated success text. Extending six seconds to thirty could never recognize this result.

Historical copy: commit80c60d1 clicked confirmation, waited the long UI delay (about two seconds), optionally inspected toast, then returned true even without a result. Commit5fb6a82 required an observed result; the missing legacy adaptation introduced the user's stall. This iteration corrects recognition while preserving fresh-result/no-replay behavior.

Legacy folder menu uses `be-dropdown trigger="hover"`. The component's mouseenter listener belongs to `.be-dropdown`; the inner `.be-dropdown-trigger` has no corresponding listener and mouseenter does not bubble. `$confirm` renders `.modal-container > .modal-wrapper > .modal` and `.modal-footer` with an `a.btn.primary` containing 确定. Existing dialog selector was valid; it did not need replacement.

VUI MenuPopover passes hover handling to its trigger-slot node, the `.more-vertical` icon; the `.menu-popover` wrapper does not open it. Native hover visibly exposed 编辑信息/删除. Synthetic mouseenter on the wrapper did not. Fix selectors for both layouts and dismiss/wait previous menus before entering the next.

Live baseline reproduction used a newly created empty temporary folder through the management panel's default API-read/web-write path. It stopped before mutation with `网页目标数量或保护状态变化，未提交`. API count0/protected=false matched native count0, but native protection was unknown because menu discovery timed out. The terminal log only said `本次确认已用完`, hiding this cause. The one-use confirmation itself was functioning correctly.

Ordinary own-space navigation served VUI. Legacy `/v/` route returned an error page; no authenticated legacy app was forced or substituted. Legacy live mutation remains unverified. No account identifiers, private names, credentials or screenshots are included here.
