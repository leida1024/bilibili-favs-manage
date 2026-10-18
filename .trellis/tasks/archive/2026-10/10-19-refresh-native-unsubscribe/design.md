# Scenario and transport design

On opening, retain the dense three-function workspace and add Settings as a fourth ordinary navigation panel. Defaults: API reads, webpage copy/create/management. Independent selectors allow hybrid workflows; each operation captures its choices and never falls back after uncertainty. Settings is not a modal and keeps dragging/resizing available.

Diagnostics: validated LogStore snapshots in account-scoped sessionStorage;500 entries, sanitized messages. Refresh and same-origin navigation retain current-tab records. Clear persists. Geometry and mode preferences use versioned validated localStorage. Denied/quota/corrupt storage degrades to memory. Never restore tickets, selections or running operations. Existing cross-page state remains consumed before effects.

Geometry: records are auxiliary. Hide subtracts their width/height from outer dimensions, preserving task rectangle/scroll and layout orientation. Reopen restores within viewport. Title-only drag, movement threshold,4px in-bounds resize band; remove competing CSS resize. Keyboard title arrows move/Shift+arrows resize; settings offers reset.

FolderClient owns HTTP only. WebFolderClient owns DOM discovery/native writes only. Transport facade selects one path; shared InventoryService and BatchOperations retain validation and confirmation. API copy orchestrator is separate from existing DOM copy. Read choices also control statistics pages; missing metadata remains unknown.

Native subscription items have no stable DOM IDs: expand all rows, click to read route IDs and details, reject ambiguous identities. Native menu can submit immediately, so consume confirmation before click and require fresh success/disappearance. Legacy unknown markup fails before submission. Seasons use separate identity/type and endpoint; no folder deletion of seasons.

API copy: enumerate and validate full source snapshots before writes; reject ambiguous names/self-copy; create/reuse targets via selected creation path; bounded sequential batches, revalidate actor/target, stop on rejection/uncertainty. DOM copy remains independently available; cross-page recovery explicitly stays DOM regardless of settings changes.

No real write tests authorized. Fixture/browser acceptance must be distinguished from live/GM validation. API private contracts may change. Future advertisement strip has no content yet and stays backlog; no moving distraction is inserted.

## 用户场景与自主设计决策

工业界通常会将此类重构记录为需求说明、信息架构/任务流程、组件与交互规范、架构决策、验收场景。本任务以 PRD、本文、实现计划和验证记录形成同样的闭环；避免只留截图或口头约定。

| 自主追问 | 选定答案与理由 |
| --- | --- |
| 用户打开后首先想完成什么？ | 延续现有主用途，直接展示复制任务；已保存的尺寸/位置恢复，首次仍600×500。看到来源、目标、选择范围与主按钮，不展示实施细节或介绍长文。 |
| 用户有200多个订阅时如何相信列表？ | 用户主动加载，读取完整目录；API验证分页总数，网页展开全部。明确未知与不可用原因，不把首屏50项当成全部。 |
| 三个业务界面哪里应相同？ | 搜索、全选/取消全选、已选计数、忙时禁用、筛选外已选提示一致；每项任务的选择与结果独立。 |
| 状态是否应常驻左下角？ | 空闲时不占位，只有当前功能的执行/终态显示；成功加载目录写记录后回到空闲。设置没有业务状态栏。 |
| 如何知道记录筛选可以点击？ | 使用“范围”“内容”可见标签、原生下拉箭头；默认显示当前功能的操作与结果，详细调试可显式选择。窄屏把跟随最新放到记录操作行。 |
| 刷新后恢复什么？ | 恢复无执行能力的诊断与界面偏好；选择、运行状态与破坏操作票据不恢复。清空有时间戳，旧交接记录不能复活。 |
| 收起右侧记录时其他区域如何处理？ | 本项目按用户明确偏好缩短外围右边界，保留工作区与底部动作矩形。底置记录同理缩短底边；视口限制优先。 |
| 设置应如何打开？ | 第四个普通导航面板，各用途独立选择API/网页；保存后新任务使用新设置。禁用忙时切换，不用阻挡拖拽的弹窗。 |
| 失效合集为什么应允许退订？ | 内容失效不等于订阅关系失效。API中存在于当前账号完整订阅目录，且ID和类型确定，就能定位退订；作者未知如实显示。统计仍禁选失效内容。 |
| 失效条目的网页也有退订入口，为什么不能直接点？ | 实测悬浮菜单有入口，但32项同名且网页没有稳定ID。不能把API的某个ID猜配到同名行；网页方式提交前提示显式选择API，不自动切换。 |
| 删除文案如何准确？ | “删除此收藏夹及其中的收藏关系，无法在此撤销。”说明实际移除对象，不承诺“原视频保留”。最终确认展示类型、ID、已知所有者与数量。 |
| 窗口缩到很小还能恢复吗？ | 一个缩放机制：4px内边缘+可见14px右下角拖拽柄；document级移动/释放，避免body范围外丢事件；标题方向键也可调整。最小化按钮图标、悬浮提示和辅助名称同步为恢复。 |

## 四个界面

- **复制收藏夹**：首屏为紧凑的来源/目标相邻列表、搜索与统一选择工具，主按钮固定在当前任务下方；详细事件在侧边记录。目标复用/新建仅保留一行说明，长名称可换行。
- **统计**：当前空间/我的订阅为两个直接按钮，主动加载、主动勾选、主动统计。显示所选范围覆盖率、唯一/重复/未知和已知时长小计；未完整读取不得称全部统计。
- **管理**：删除收藏夹/取消订阅直接切换，独立选择；不可选项说明具体原因。预览列出准确影响后再勾选确认，一次性票据逐项复核。失效内容可API退订，默认/特殊/归属不明的创建收藏夹仍禁止删除。
- **设置**：列表与统计、复制内容、创建目标、删除与退订四项选择；明确默认值及新任务生效规则。保存与恢复默认布局在正常滚动区内，不阻挡窗口手势。

## 模块边界与后续

UI只投影选择和结果；InventoryService/BatchOperations组织任务；FolderClient与WebFolderClient分别持有HTTP/DOM契约，TransportClient捕获选择；ApiCopyFlow不混入旧网页复制恢复逻辑。未来视频分类先产生可编辑计划，再由独立执行器处理收藏关系；本次不开发此路线。额外工具调研见[基本调研](research/competitors.md)。
