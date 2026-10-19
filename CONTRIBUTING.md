# 贡献与开发指南

修复问题或提交功能前，请先描述可复现的行为。涉及 B 站页面交互时，注明页面版本和测试范围；提交代码时一并更新构建产物。

## 从哪里开始

日常开发以 `develop` 为基线，从它创建功能分支，Pull Request 的目标也选 `develop`：

```bash
git switch develop
git pull --ff-only origin develop
git switch -c fix/short-description
```

外部贡献者先 fork 仓库，将原仓库配置为 `upstream`，从 `upstream/develop` 创建功能分支，再向原仓库的 `develop` 提交 PR。无需修改自己的 GitHub 默认分支。

`master` 是发布分支，目前没有 `main`；向 `master` 推送可能触发 Greasy Fork 自动同步。不要把日常功能 PR 提交到 `master`。普通开发只需要 Node.js 和 Git，不要求安装 Trellis、AI 工具或登录 B 站；使用 AI 助手时再阅读 `AGENTS.md` 和 `.trellis/README.md`。公共开发说明以本文件和 `docs/architecture.md` 为准，任务规划及验证记录放在 `develop` 的 `.trellis/` 中。

## 构建与验证

建议使用 Node.js 22 LTS；本次验证环境为 Node.js 22.19。

```bash
npm ci
npm run build
npm test
```

`npm run dev` 监听源码变化并构建。油猴只能安装构建后的单文件 `dist/BilibiliFavsManage.user.js`，不能直接安装包含 ES 模块导入的 `src/main.js`。

每次可交付的产品迭代递增普通数字版本，例如 `2.2.12` → `2.2.13`，同步更新 `package.json`、锁文件根级与根包版本和 `src/config/config.js`。构建使用配置中的运行时版本，并校验它与包版本相等；面板标题、控制台和 userscript 元数据显示相同版本。先构建再测试，因为测试会检查生成的脚本；提交前运行 `git diff --check`。目前没有配置 lint 或类型检查命令。发布时更新日志和验证范围；本地构建不会自动发布至 Greasy Fork。

PR 请说明触发问题的条件、修改后的行为、运行的检查，以及哪些真实页面/沙箱尚未验证。新旧版页面使用各自适配器；分页等共有逻辑优先复用现有模块。测试默认使用虚构数据，不能为了回归测试操作真实收藏夹。

## 发布与自动同步

仓库地址为 `https://github.com/leida1024/bilibili-favs-manage`，发布分支为 `master`。Greasy Fork 应同步构建产物的 Raw 地址：

```text
https://raw.githubusercontent.com/leida1024/bilibili-favs-manage/master/dist/BilibiliFavsManage.user.js
```

首次配置时，在 Greasy Fork 脚本的「管理」中设置上述代码同步地址，再按照账号中的「设置 Webhook」说明配置 GitHub 仓库的 **Settings → Webhooks**：Payload URL 和 Secret 使用 Greasy Fork 提供的值，Content type 选 `application/json`，监听 `push`，保持 Active。Secret 不要提交进仓库。

同一页面的「默认附加信息」同步地址设为以下 README Raw 地址，格式选择 **Markdown**，代码同步方式保持 **Webhook**，然后点击「更新设置并立即同步」：

```text
https://raw.githubusercontent.com/leida1024/bilibili-favs-manage/master/README.md
```

README 是 GitHub 与 Greasy Fork 介绍的共同来源，安装、使用、联系方式及开发导航只需在这里维护。介绍内引用 `docs/assets/panel-preview.png` 模拟截图；在 Greasy Fork 的编辑页面移除旧截图附件，避免同时展示过时界面。二维码放在介绍末尾，保持缩略尺寸并链接完整大图。

后续发布由维护者单独执行：

1. 在 `develop` 将产品改动与开发工具/记录分开提交。产品包括源码、测试、依赖与构建配置、生成脚本、示例及用户/贡献文档；开发记录和代理配置不进入发布树。
2. 基于 `master` 创建临时发布分支，按依赖顺序 cherry-pick 经审查的产品提交。不要整体合并或 squash `develop`，也不要只复制 `dist/`；源码、测试和构建产物必须可一起复现。
3. 检查发布树不存在 `.trellis/`、`.agents/`、`.codex/`、`.claude/` 和 `AGENTS.md`。检查版本和发布文案，依次执行 `npm ci`、`npm run build`、`npm test`、`git diff --check`，并核对旧版/VUI、沙箱及跨页测试边界。产物应与选定源码一致。
4. 发布审查通过后，将发布分支合入 `master` 并在获得发布授权后推送。检查 GitHub Webhook 的 Recent Deliveries，以及 Greasy Fork 的同步状态、公开页面和脚本版本。将发布修正同步回 `develop`，记录版本及提交对应关系。

这里按提交挑选，是因为本项目约定两个分支的目录范围不同。通常团队使用一致的仓库目录树，通过短期功能分支与 PR 合入主干，必要时创建发布分支；无需为采用某种流程而改名分支。若未来把开发工具也纳入发布分支，或将开发记录移到其他位置，再评估统一合并流程。将 `master` 改名为 `main` 还需同步 Raw 地址、Webhook、文档链接和分支保护，应另作迁移。

Webhook 根据推送中变更的文件分别更新内容：`dist/BilibiliFavsManage.user.js` 变更时同步脚本，`README.md` 变更时同步介绍。只修改文档无需增加脚本版本号；仅更新同名图片时，页面仍引用同一地址，图片缓存可能延迟刷新。用户端仍按脚本管理器的更新检查周期获取新版。GitHub 用户名或仓库名改变后，也要更新 Git 远程地址、README 中的文档链接，以及 Greasy Fork 的代码和附加信息同步地址。

README 中的文档链接使用 GitHub 的完整 `blob/master/` 地址，避免 Greasy Fork 将它们解析为 Raw 文本；图片保留相对路径，由 Greasy Fork 根据同步地址解析。更改介绍后，除检查 Webhook 返回状态外，还应打开公开页面核对文案、图片加载、二维码尺寸和开发文档链接。

## 目录

```text
src/
  main.js                       入口、面板挂载和油猴菜单
  config/                       公共配置与共享选择器
  core/
    adapters/
      LegacyPageAdapter.js      旧版个人空间适配
      VuiPageAdapter.js          新版 VUI 适配
      index.js                  识别适配器
    PageLifecycle.js            SPA 路由、慢加载和侧栏更新检测
    BilibiliAPI.js              共用 DOM 操作
    FavoriteManager.js         批量复制业务
    CrossPageFlowManager.js     跨页面创建和返回复制
    PageDetector.js             页面 UID 与归属检测
    StateManager.js             跨页面状态保存
  ui/                           面板、组件和交互
  utils/                        DOM、日志、存储工具
test/                           启动、名称匹配与任务流程回归测试
examples/panel-preview.html     模拟数据面板预览
docs/
  architecture.md              架构与流程
  troubleshooting.md           使用排错
  assets/                      README 截图与群二维码
dist/                           可安装的油猴脚本
README.md                       用户手册与文档导航
CONTRIBUTING.md                 开发与贡献说明
CHANGELOG.md                    版本历史
```

改版时先确认页面属于哪套界面，再修改对应适配器，避免把两版选择器混在业务流程里。完整流程见 [架构与流程](docs/architecture.md)。

## 测试范围

自动测试覆盖两版收藏列表识别、慢加载、SPA 路由切换、列表刷新时保留选择、全选幂等、隐藏弹窗、重复注入和无关页面不恢复跨页面任务；名称与流程测试覆盖首尾空白、内部连续空格、复用已有目标、异步新建确认、弹窗重渲染、跨页去重、失败停止及状态不重放。

最近的新版 VUI 真实账号只读验证包含收藏夹/订阅列表、两个收藏夹逐页统计与 API 的视频标识和时长对照，以及大收藏夹总页数识别。此前仅对明确授权的临时测试夹验证了新建/删除并清理。真实复制、退订、旧版当前页面、油猴 GM 沙箱和自动跨页恢复仍未完整验证；模拟测试或控制台注入不能代替这些验证。详细边界见 [管理功能与验证范围](docs/management.md)。固定操作延迟不能保证网络慢或网站改版时一定成功。

真实写操作必须由账号持有人明确指定测试对象；删除/退订开发先用合成夹具。截图与提交记录只用虚构数据，不提交浏览器配置、令牌、私有收藏名称或真实账号截图。

## 界面预览

README 的截图来自 [examples/panel-preview.html](examples/panel-preview.html)，复用 `FloatingPanel` 组件，收藏夹、目标名称和日志均为虚构数据。预览页使用模拟 manager，点击开始按钮只输出演示日志。

在仓库根目录启动静态服务（首次运行会下载 `http-server`）：

```bash
npx --yes http-server . -a 127.0.0.1 -p 4173 -c-1
```

打开 `http://127.0.0.1:4173/examples/panel-preview.html`，将浏览器视口设置为 1040 × 700，页面渲染完成后截图，保存到 `docs/assets/panel-preview.png`。截图只包含这个本地预览页即可。

## 控制台调试

入口会在脚本环境中挂载 `window.BiliFavManager` 和 `window.BiliFavPanel`。若油猴使用隔离沙箱，网页主环境的控制台可能无法直接访问它们；日常使用以浮动面板为准。

```javascript
BiliFavManager.getAllFavoriteNames()
await BiliFavManager.copyFavorite('源收藏夹', '目标收藏夹')
await BiliFavManager.batchCopy([{ source: '源收藏夹', target: '目标收藏夹' }])
```

后两条会执行真实操作。跨页面状态存储于油猴存储或 localStorage 中，排错时请保留页面 URL、脚本版本及面板/控制台错误。
