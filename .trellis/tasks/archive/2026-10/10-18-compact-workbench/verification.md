# 验证与交付

## 最终结果
产品提交：`4fc2007`（refactor(ui): restore compact workspace and unify selection controls）。

本地版本 2.2.0-dev.1。640×600 紧凑面板，桌面默认侧边日志；容器低于580px时日志移到底部，极低高度下日志缩到96px。复制/统计/管理共用搜索、匹配范围内的全选/取消全选和总选择计数。搜索保留编辑和筛选外选择，并提示执行范围。管理批选跳过保护/不支持项并使票据失效；最终确认完整展示身份和后果。

顶层设计见 design.md；最终截图 docs/assets/panel-preview.png、panel-inventory.png、panel-records.png 已打开视觉检查，全部为虚构数据。主列表去掉常驻 ID/所有者和重复标题/整段说明，确认仍直接显示必要信息。未更改业务引擎、持久化或适配器。

## 自动化
- npm run build 通过；metadata @version、标题、运行时、package/lock 均为 2.2.0-dev.1。
- npm test **60/60** 通过，含三项新增回归：复制搜索/批选与隐藏编辑、统计/管理资格与一次性票据、完整版本一致性。搜索/批选也不得覆盖空目标名称错误。
- git diff --check 通过；无配置的 lint/typecheck，不声称执行。
- 原 legacy/VUI、启动恢复、归一化、consume-before-execute、未知结果停止、不自动重试测试继续通过。

## 浏览器验收
使用专属 bili-favs-dev，经项目 browser.ps1 操作；虚构预览不加载生产入口。可重跑 browser-check.js（只允许 localhost origin），详细 browser-results.json 是最终5种视口×25场景，**125场景无失败**。包括空/长名/40短名、忙碌/失败/完成/中断、三任务、日志收放、导出、最小化恢复和手工缩窄。

| 视口 | 默认短名称完整行 | 失败后完整行 | 日志 |
| --- | ---: | ---: | --- |
| 1440×900 | 10 | 8 | 侧边 |
| 1024×768 | 10 | 8 | 侧边 |
| 375×812 | 6 | 5 | 底部 |
| 812×375 | 3 | 2 | 侧边 |
| 375×375 | 1 | 0 | 底部96px |

极低高度失败状态需要滚动任务到列表，或用标题栏收起日志获得空间；所有动作可达。没有将部分裁切的行计作完整行。侧边日志收放不减少任务高度；手工缩到400px会正确重排，无横向溢出。

CLI 的 viewport 命令会返回 EOF，但 Chromium 已完成调整；每次以实际 innerWidth/innerHeight 验证尺寸。此工具行为也见前次归档；doctor --offline --quick 无失败。未操作其他 browser session。

visual-check.js/visual-results.json：11对功能色全部通过（正文最低4.64:1，控制边框3.09:1），外部 Georgia/19px 样式未污染面板字体，reduced-motion下transition为0s，明确采用light color-scheme，不宣称实现暗色主题。

Axe4.12.1：复制和加载统计均0violations。复制有1项manual review（装饰箭头字符）；统计有1项manual review（已选背景上的数量，axe称背景被遮挡）。已视觉检查无实际重叠；数量使用同一已验证的muted色，浅蓝selected底比soft更亮，满足4.5:1。没有把manual项说成零incomplete。

实际键盘 Enter 收放日志不切任务；Enter 打开日志导出时焦点到textarea；Shift+Tab环绕到关闭按钮、Tab回textarea；Escape关闭并恢复导出触发器焦点。管理虚构目录批选39个可选目标（保护项跳过），预览完整ID/所有者，焦点到协议，不执行提交。

## 实页只读烟测
在现有授权空间页注入前，仅查presence：无pending state/lifecycle/panel。注入最终dist后：一个面板，9个来源，not busy，版本v2.2.0-dev.1，640×600，侧边日志默认可见，无横向溢出。日志收放、最小化恢复、统计/管理/复制导航和三个选择工具栏正常。没有点击加载、扫描、复制、删除或退订。重复注入仍一个面板，pending保持false。只输出聚合数据，无真实账号截图、名称、token或存储内容。

专属浏览器已正常close以落盘，未关闭其他session。Tampermonkey GM沙箱、真实破坏操作、自动跨页恢复和当前legacy实页仍未实测；既有合成合同通过。没有push、master修改或Greasy Fork操作。

## 审查
trellis-check 已对任务验收及实际diff执行主会话审查：无新依赖，无跨层协议变化；SelectionToolbar复用在三个任务，host回调保留管理invalidate及复制错误。修复了行对象投影不能跨次Set比较、错误提示不能被批选/过滤的通用计数覆盖、根容器不能查询自身这三处实现问题。规格已同步为本次明确用户要求，覆盖旧的底部隐藏日志/常驻身份串约束。

验收完成，产品与开发记录分离提交，任务归档并记录journal。没有遗留实现阻塞。
