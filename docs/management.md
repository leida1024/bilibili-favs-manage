# Local management build

These capabilities are in the local development build. The published Greasy Fork version remains 2.1.2 until a separately reviewed release.

## Copy and diagnostics

Choose source folders, edit targets below each source, and review the source → target pairs before starting. Copy preserves the source and reuses normalized-name targets. Progress shows confirmed steps and stops when a result cannot be confirmed. Check the destination before submitting again. Open **诊断记录** to filter, clear or review/export local logs. Exported names and IDs may still identify collections; edit before sharing.

Drag the header, resize from the panel edge, or minimize. **关闭** dismisses the panel; the Tampermonkey menu can reopen it. Closing is disabled during work. Console injection has no menu command; refresh/reinject to reopen.

## Read-only statistics

Open **只读统计与收藏夹管理**, choose current-space created folders or your own subscriptions, and click **加载列表（只读）**. Nothing is selected initially. Select only the folders to inspect, then start statistics. This does not copy, create, delete or unsubscribe.

The summary separates entries, unique video IDs, duplicate occurrences, unavailable markers and unknown identities. Duration is a subtotal of known durations for unique videos; missing values stay unknown. Each folder shows pages, loaded count, expected count and any incomplete reason. Only a completed selected-scope scan is labelled complete. Results are not an atomic snapshot or an account-wide total. Seasons are unsupported. Requests are sequential, paced at 400ms, bounded to 100 pages per folder and 10000 entries in a scan. Cancel stops current/future reads. Export requires a separate review/download action; nothing is uploaded.

## Delete owned folders

Use your own space and load created folders. The separate deletion list excludes the first/default entry, special playlists, unknown ownership and unavailable entries. Its checkboxes are independent of statistics. Select exact targets, preview names/IDs/owners/counts, read the consequences and tick the agreement before confirmation.

Deletion removes a folder and its saved references; it does not delete uploaded videos. Back up anything needed first. No undo is provided. Each item is revalidated before submission; changed names, counts, ownership or protection stop the batch for a new preview. Items run sequentially. Cancel stops subsequent items, but an already submitted request may still complete.

## Unsubscribe

Load **我的收藏夹订阅**. The management section switches to subscription cancellation. Only available folder subscriptions with known other owners are eligible; seasons and unknown owners are excluded. Review and explicitly confirm exact IDs and owners. This cancels your subscription and does not edit the original owner's folder contents.

## Outcomes and limits

Each item is **已确认**, **失败**, **结果未知**, or **未提交**. Confirmed means the platform acknowledged code 0; refresh the platform to verify. Failure or uncertainty stops the batch. Network loss after submission is unknown, with no automatic retry. Refresh never restores a destructive queue; every operation needs a new selection and confirmation.

Live deletion/unsubscribe acceptance has not run: only synthetic targets were used. Live checks cover startup and read-only public inventory. Tampermonkey GM sandbox, automatic cross-page recovery and current legacy-page live behavior remain unverified. Platform API contracts and permissions can change.
