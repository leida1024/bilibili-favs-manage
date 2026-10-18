# Design and review

Compact Bilibili utility with horizontal rows throughout. Tokens: paper #FFFFFF, ink #203344, secondary #526879, blue #007FA8, selection #EAF7FC, caution #AA4332. Local Microsoft YaHei UI/PingFang SC; 12px metadata,14px controls,16px headings. Left alignment, no remote assets or animation.

Rejected: fixed800x640 and three-level folder rows. Chosen: content-sized680px width,620px height cap; [checkbox name | count | ID/owner] and [time | level | message] rows. Narrow metadata wraps without truncation. Manual dimensions remain explicit.

Latest user correction explicitly rejects all content expand/collapse controls. It supersedes the initial disclosure proposal. Help, IDs/owners and active progress are directly displayed; persistent progress nodes update without focus/scroll changes. No disclosure button or native details element remains. Records share the main content scroller with sticky tools; save/restore reading position when follow is off and skip hidden rerenders. Scope changes clear report/result/selection/ticket and stale feedback. Confirmation hides duplicate preview until abandon.

Review: compact density comes from alignment and concise content, never hidden information. Remove duplicate list completion text and meaningless zero-confirmed placeholders. API/engine contracts unchanged; product revert is rollback, no migration.
