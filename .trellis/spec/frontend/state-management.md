# State and operations

Local UI state lives on `FloatingPanel`, including busy, selection rows, drag/resize, and log scroll behavior. `FavoriteManager` and `CrossPageFlowManager` own operations. `StateManager` persists a JSON cross-page record through GM APIs, with localStorage fallback and a 30-minute expiry.

## Scenario:diagnostic continuity without replay

1. **Trigger**:cross-page copy recreates the page realm; diagnostic records must remain correlated.
2. **Signatures**:`OperationState.begin(action,total,{operationId,phase})`; `LogStore.snapshot(operationId?)`, `restore(snapshot)`, `filter(level,view)`.
3. **Contract**:flow state optionally adds operationId (1–80 ASCII identifier characters) and journal (schemaVersion2,dropped,entries). Entries allow only id,time,level,view,operationId,phase,message. Views are copy/statistics/manage/system. Snapshots include only the handing-off task; new tasks get new IDs, resumed tasks keep IDs. At most500 entries, each message ≤2000 characters. Local UI time and ISO export time must refer to the same instant.
4. **Validation/errors**:invalid journal schema or entries are ignored; accepted messages are sanitized. Invalid/missing task ID gets a new ID for legacy compatibility. Diagnostic restoration cannot execute changes. Verify expected page, consume execution record before side effects, and save the next phase only after confirmed target preparation. Submitted copy without a fresh success signal is unknown/待核对, normal handoff is waiting/等待跳转, never a false completion.
5. **Cases**:good—same task ordered records merge by event ID; base—legacy flow without journal still resumes; bad—another function's terminal result appears in current footer, or an unconfirmed submit is described as a definite failure.
6. **Tests**:recreate page realms through both handoffs, preserve ID/messages without duplicates, assert state absent at submission, unknown stops remaining items, refresh cannot replay; malformed records and bound retention; current/all view filtering and task state restoration.
7. **Wrong/correct**:wrong—resume catch prepends another generic recovery/retry message. Correct—business layer owns terminal result; entry catches finish only an otherwise unreported error. Wrong—persist log history as a replay queue. Correct—journal is inert diagnostic data attached to the existing one-use handoff.

LogStore continuously persists sanitized snapshots to sessionStorage under `bili-favs-records-v2:<actor-or-guest>`; handoffs additionally carry the current task snapshot. Refresh retains diagnostics in the current tab/account when browser storage is available. Storage failure degrades to memory; console injection does not verify GM full navigation.

The current flow is creating -> return to source -> copying. Resume checks that the current page is the expected destination. The saved stage is consumed before performing changes, and the next stage is saved only after confirmed completion. Preserve the failure behavior: refresh must not blindly repeat uncertain folder creation or copying.

`utils/favoriteNames.js` trims leading/trailing whitespace but preserves internal spaces. Normalize all entry paths, including resumed tasks, and reuse an existing normalized-name target. Creation success requires observing the actual target, not just a button click. Do not submit again while the previous result is uncertain.

## Inventory and destructive operations

`FolderClient.folders(ownerId, kind, signal)` validates complete enumeration and returns normalized immutable identities. `InventoryService.scan(folders, options)` returns explicit selected-scope coverage; unknown metadata stays null. Type11 folder subscriptions and type21 seasons remain distinct composite identities (`kind:id`); unsupported types never become either supported type. Season content returns one complete list irrespective of pn/ps; count mismatch stays incomplete. Null lists count as empty only with explicit zero totals and no further pages.

`BatchOperations.prepare(action, folders)` creates a one-use in-memory ticket with actor, scope and immutable targets. `execute(ticket, {confirmed, signal, onResult})` consumes it before awaiting, revalidates the complete catalog before every item and submits sequentially. Nothing is persisted. Good: same-name IDs remain distinct; base: platform code0 acknowledges a confirmed item; bad: changed identity/name/count/type/protection stops before submitting. Deletion requires known actor/owner, own space, available content and unprotected ordinary folders. Unsubscribe requires known actor, stable ID, supported type and confirmed subscription membership; unavailable content and missing author do not negate that membership. Known self-owned and conflicting identities remain ineligible. Preserve missing authors as null, never invent them.

Confirmed/failed/unknown/not_started are separate outcomes. A lost/malformed response after submission is unknown, even on cancellation; stop with no retries. Cancellation before submission leaves the item not_started. A refresh must require a fresh selection and preview. Test these boundaries with synthetic clients, including account changes during revalidation; never default to real mutations. Copy retains its separate consume-before-execute cross-page record.


## Scenario: refresh continuity and independent transports

1. Trigger: refresh, reopen, change transport settings, or confirm a management batch.
2. Signatures: browserStore(area,key), panelPreferences(), TransportClient.capture(), WebFolderClient.folders(owner,kind,signal,pace,revalidateTarget), ApiCopyFlow.run(tasks,{creator,signal,onProgress}).
3. Contract: localStorage `bili-favs-panel-v1` contains version1, numeric geometry(width≥280,height≥64), logsOpen, layout(side/bottom), auxiliary size and modes(read/copy/create/manage:api/web). Defaults API reads and web writes. Log schema2 adds clearedAt;500 entries and2000-character sanitized messages. Copy handoffs retain their original DOM path. Capture reader/writer once per scan/ticket; API copy always reads complete API source snapshots and uses the selected creator. At most20 resources per copy request.
4. Errors: reject corrupt/denied preferences without failing startup; never restore selections, running state or tickets. Clear tombstones prevent older handoff entries/dropped counters returning. Incomplete catalogs, changing totals, duplicate IDs, account/space/target changes or unknown outcomes stop. No cross-transport retry.
5. Cases: good—same-tab refresh restores logs/geometry but no execution; base—legacy handoff still resumes once; bad—changing manage after preview changes an issued ticket, or replacing unknown native submission with an API retry.
6. Tests: clear/restore/corrupt/denied stores; account isolation; real refresh geometry readiness; captured hybrid modes; native no-HTTP unsubscribe/delete, cancellation and final-confirmation actor change; incomplete API copy sources, duplicate names, self-copy and unknown creation verification.
7. Wrong/correct: wrong—require content availability/author ID for all unsubscribe targets. Correct—confirmed collected-list membership plus stable supported identity permits API unsubscribe, even state1/mid0. Native unavailable rows expose no stable ID: fail before submission with explicit Settings→API guidance; never guess among identical names.
