# Local management build

These capabilities are in the local development build. The published Greasy Fork version remains 2.1.2 until a separately reviewed release.

## Copy and diagnostics

The panel opens on **复制收藏夹**. Select sources on the left and edit each destination name alongside it on the right. Destinations belong to your own space: existing normalized-name folders are reused and missing folders are created. Copy preserves the source. The fixed bottom bar shows the selection and starts the copy; a selected empty destination must be filled first. Additional naming and cross-page guidance is under **目标同名或不存在时会怎样？**.

Progress shows confirmed steps and stops when a result cannot be confirmed. Check the destination before submitting again. Open **记录** in the header to filter, clear or review/export local logs; **返回** returns to the current task, including while busy. Export opens an editable review overlay: download explicitly or press Escape to return. Exported names and IDs may identify collections; edit before sharing.

Drag the header, resize from the panel edge, or minimize. **关闭** dismisses the panel; the Tampermonkey menu can reopen it. Closing is disabled during work. Console injection has no menu command; refresh/reinject to reopen.

## Read-only statistics

Open **统计**, choose current-space created folders or your own subscriptions, and click **加载列表（只读）**. Nothing is selected initially. Select only the folders to inspect, then start statistics from the bottom bar. Opening a task view does not start requests. This does not copy, create, delete or unsubscribe. Folder IDs and owners can be expanded in the list.

The summary separates entries, unique video IDs, duplicate occurrences, unavailable markers and unknown identities. Duration is a subtotal of known durations for unique videos; missing values stay unknown. Each folder shows pages, loaded count, expected count and any incomplete reason. Only a completed selected-scope scan is labelled complete. Results are not an atomic snapshot or an account-wide total. Seasons are unsupported. Requests are sequential, paced at 400ms, bounded to 100 pages per folder and 10000 entries in a scan. Cancel stops current/future reads. Export requires a separate review/download action; nothing is uploaded.

## Delete owned folders

Open **管理**, use your own space and load created folders. The deletion list excludes the first/default entry, special playlists, unknown ownership and unavailable entries. Its checkboxes are independent of statistics. Select exact targets, preview names/IDs/owners/counts, read the consequences and tick the agreement before confirmation. Exact identity remains visible in the final review. Switching task views invalidates pending confirmation and clears management selections; copy name edits are preserved. Operation navigation is locked while work is running.

Deletion removes a folder and its saved references; it does not delete uploaded videos. Back up anything needed first. No undo is provided. Each item is revalidated before submission; changed names, counts, ownership or protection stop the batch for a new preview. Items run sequentially. Cancel stops subsequent items, but an already submitted request may still complete.

## Unsubscribe

Load **我的收藏夹订阅** in **管理**. The management section switches to subscription cancellation. Only available folder subscriptions with known other owners are eligible; seasons and unknown owners are excluded. Review and explicitly confirm exact IDs and owners. This cancels your subscription and does not edit the original owner's folder contents.

## Outcomes and limits

Each item is **已确认**, **失败**, **结果未知**, or **未提交**. Confirmed means the platform acknowledged code 0; refresh the platform to verify. Failure or uncertainty stops the batch. Network loss after submission is unknown, with no automatic retry. Refresh never restores a destructive queue; every operation needs a new selection and confirmation.

Live deletion/unsubscribe acceptance has not run: only synthetic targets were used. Live checks cover startup and read-only public inventory. Tampermonkey GM sandbox, automatic cross-page recovery and current legacy-page live behavior remain unverified. Platform API contracts and permissions can change.
