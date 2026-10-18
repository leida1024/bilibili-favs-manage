# Design and research

Authorized Stage 2 implementation, local testing and commits only; no push. Stage 1 is archived.

Public VUI bundle inspected: https://s1.hdslb.com/bfs/static/shanks/fresh-space/assets/index-76bd2e5f.js . Aggregate-only live GETs confirmed created/list-all returns count/list/season and id,fid,mid,attr,title,media_count,is_kid_playlist (9 public sample folders). collected/list returns count/list/has_more with type and upper.mid (11 entries). resource/list returns info/medias/has_more; type2 videos have id,bvid,duration,upper,attr (6 public sample entries). No mutations performed or private values retained. Sidebar entries lack stable IDs.

Add FolderClient for validated, timed platform GETs. Normalize immutable IDs and owner/type/protection separately from names. Discovery is explicit, bounded and paced. Protect first created entry as the platform sidebar removes its delete menu; also protect kid/special entries. Subscribed type21 seasons are unsupported; type11 folders can be scanned.

InventoryService scans only selected folder IDs, sequentially, at 400ms intervals, max100 pages per folder and 10000 entries. Count video identities by type2 aid. Report duplicate occurrences, invalid/unknown identities, known duration subtotal, missing duration/uploader. Require explicit last page and matching coverage before complete. Stop failed/malformed/repeated pages and retain prior coverage. Abort current GET and prevent subsequent requests. Scans are not atomic snapshots.

Separate InventoryPanel consumes manager-owned service and shared busy/progress. Empty initial selection; explicit load, choose, scan, cancel, review local export. No background crawl, telemetry, persistence or changes to DOM copy adapters. Fictional previews inject a synthetic service. Rollback by reverting product commit; no data migration.
