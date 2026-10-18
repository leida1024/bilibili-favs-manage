# 收藏夹工具基本调研

2026-10-19；额外调研，独立于本轮主线验收。只阅读公开页面及源码，没有安装、运行第三方脚本。GitHub 搜索网页、仓库主分支源码、Greasy Fork 搜索和代码页均实际查看；联网搜索连接器返回错误，Greasy Fork 命令行请求403，改用专用浏览器读取公开页。以下是抽样，并非穷尽。

## 结论

已有不少重叠工具，尤其是视频级分类、移动、删除收藏关系、导出。查看到的业务实现主要直接请求 B 站 API；界面中的拖拽或按钮不意味着底层模拟原生点击。未在这些抽样代码中确认完整的“原生网页操作/API 可分别选择、管理订阅、未知结果不重放”组合。

本项目当前价值在于紧凑的收藏夹级工作流、明确选区和执行结果、独立双通道及诊断连续性。未来视频整理应沿用这些边界，不需要为功能数量复制其他工具的动画、自动任务和复杂配置。

| 工具与实际来源 | 已确认的重叠功能 | 源码实现证据 | 可借鉴与边界 |
| --- | --- | --- | --- |
| [RadiumAg/bilibili-favorites](https://github.com/RadiumAg/bilibili-favorites)；[api.ts](https://github.com/RadiumAg/bilibili-favorites/blob/main/src/utils/api.ts) | 收藏分析、关键词/AI分类、视频多选拖拽移动；代码含移除/添加收藏关系 | `resource/list`、`folder/created/list-all`、`resource/move`、`resource/batch-del`、`resource/deal`；fetch。README 展示扩展侧边栏与左右列表 | 参考视频列表与显式多选、规则预览；其“拖拽移动”底层仍是 API。README 有占位仓库链接，版本徽章不能单独证明维护状态 |
| [Bilibili-AI-Favorites-Organizer](https://github.com/madoka-chann/Bilibili-AI-Favorites-Organizer)；[接口常量](https://github.com/madoka-chann/Bilibili-AI-Favorites-Organizer/blob/main/src/utils/constants/bilibili.ts)、[folders](https://github.com/madoka-chann/Bilibili-AI-Favorites-Organizer/blob/main/src/api/bilibili-folders.ts)、[videos](https://github.com/madoka-chann/Bilibili-AI-Favorites-Organizer/blob/main/src/api/bilibili-videos.ts) | AI分类、跨夹整理、新建、视频移动/移除；README 还描述备份、去重和增量模式 | 独立HTTP层；`folder/add`、`resource/list`、`resource/move`、`resource/batch-del`。README 明说正在重构 | 参考先预览分类再执行、分类置信度与人工调整。备份不等于平台原始状态可无损撤销；README 功能声明未全部运行验证 |
| [Greasy Fork 531672：Bilibili收藏夹自动分类](https://greasyfork.org/zh-CN/scripts/531672)；[代码](https://greasyfork.org/zh-CN/scripts/531672/code) | 按分区分类、创建、复制/移动视频 | 实际代码版本2.2；`GM_xmlhttpRequest`；`folder/add`、`resource/copy`、`resource/move`、`resource/deal`、`resource/batch-deal` | 与未来规则分类直接重叠；应区分分类建议和写入计划。未据此判断其当前真实账号兼容性 |
| [Greasy Fork 595753：收藏夹整夹搬家](https://greasyfork.org/zh-CN/scripts/595753)；[代码](https://greasyfork.org/zh-CN/scripts/595753/code) | 自有收藏夹全部视频移动、顺序选项、预检、分批与停止 | 实际代码版本1.1.0；`folder/created/list-all`、`resource/ids`、`resource/move`、`resource/batch-del` | 搬家是移动视频关系，不是删除整个文件夹，也不等于复制来源保留。其失败拆批/退避策略不能直接用于本项目的未知写入结果 |
| [ayasa520/bilibili-favorites-exporter](https://github.com/ayasa520/bilibili-favorites-exporter)；[content.js](https://github.com/ayasa520/bilibili-favorites-exporter/blob/main/js/content.js) | 收藏夹及合集导出、本地浏览、标题/UP搜索与排序 | `folder/collected/list`分页、`resource/list`、`/x/space/fav/season/list?season_id=...`；MutationObserver 用于挂载入口 | 参考只读快照与后续本地搜索分离；失效信息的第三方补全不能被当作已确认的当前平台内容 |

Greasy Fork 搜索还返回本项目自身 [487232](https://greasyfork.org/zh-CN/scripts/487232)，它是已发布脚本，不计作竞争工具，也未修改发布内容。其他搜索候选包括收藏夹名称展开、失效视频元信息恢复、文字列表等，未进一步审查源码。

## API 资料来源的可用性

- [SocialSisterYi/bilibili-API-collect](https://github.com/SocialSisterYi/bilibili-API-collect) 当前 README 声明弃用/永久关闭及原文档移除，不能把旧教程当作当前接口契约。
- [Nemo2011/bilibili-api](https://github.com/Nemo2011/bilibili-api) 和 [文档](https://nemo2011.github.io/bilibili-api/) 可作索引；实际检查 PyPI `bilibili-api-python` 17.4.2 wheel 内 `data/api/favorite-list.json` 和 `channel-series.json`：有创建、复制、内容枚举等定义。本轮没有安装依赖。
- 第三方定义也会滞后：合集退订参数以当前网站脚本确认的 `season_id` 为准，不能照抄旧 `season`。接口存在不等于账号拥有操作权限，模拟点击同样经由平台请求，不能宣称没有风控风险。

## 后续视频整理路线（未实施）

1. 视频工作区先做明确的收藏夹范围、完整读取、搜索/分区/UP/时长筛选和人工多选；缺失字段标未知。
2. 规则或 AI 只输出建议：每个视频的来源、建议目标和理由；允许人工修改，不自动提交。
3. 独立操作计划区分“添加收藏关系 / 复制 / 移动 / 移除收藏关系”，显示准确影响和目标，禁止用“删视频”混称。
4. 分离计划、执行与结果；继续捕获通道、一次性确认、逐项核对、未知停止。分类方案与诊断可保存，写队列不能因刷新自动重放。

广告条仍待内容与交互决策，本次不插入空白占位或滚动干扰。上述路线不属于2.2.2交付。
