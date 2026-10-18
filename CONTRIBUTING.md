# 贡献与开发指南

修复问题或提交功能前，请先描述可复现的行为。涉及 B 站页面交互时，注明页面版本和测试范围；提交代码时一并更新构建产物。

## 构建与验证

建议使用 Node.js 22 LTS；本次验证环境为 Node.js 22.19。

```bash
npm ci
npm run build
npm test
```

`npm run dev` 监听源码变化并构建。油猴只能安装构建后的单文件 `dist/BilibiliFavsManage.user.js`，不能直接安装包含 ES 模块导入的 `src/main.js`。

构建版本来自 `package.json`，发布时同步更新 `src/config/config.js` 的日志版本、锁文件和更新日志，再重新构建。构建不会自动发布至 Greasy Fork。

## 发布与自动同步

仓库地址为 `https://github.com/leida1024/bilibili-favs-manage`，发布分支为 `master`。Greasy Fork 应同步构建产物的 Raw 地址：

```text
https://raw.githubusercontent.com/leida1024/bilibili-favs-manage/master/dist/BilibiliFavsManage.user.js
```

首次配置时，在 Greasy Fork 脚本的「管理」中设置上述代码同步地址，再按照账号中的「设置 Webhook」说明配置 GitHub 仓库的 **Settings → Webhooks**：Payload URL 和 Secret 使用 Greasy Fork 提供的值，Content type 选 `application/json`，监听 `push`，保持 Active。Secret 不要提交进仓库。

后续发布：

1. 更新版本号和更新日志，执行 `npm test` 与 `npm run build`。
2. 将源码及 `dist/BilibiliFavsManage.user.js` 一起提交并推送到 `master`。
3. 检查 GitHub Webhook 的 Recent Deliveries，以及 Greasy Fork 的同步状态和脚本版本。

Webhook 仅在推送包含脚本文件变更时同步代码；只修改文档无需增加脚本版本号。用户端仍按脚本管理器的更新检查周期获取新版。GitHub 用户名或仓库名改变后，也要更新 Git 远程地址和 Greasy Fork 的同步地址。

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

实际 Chrome 验证了旧版收藏页面板启动、创建收藏夹列表识别和打开复制弹窗；未提交真实新建或复制操作。新版完整复制、跨页面创建、空收藏夹和大收藏夹分页仍需在测试账号中手动验证。固定操作延迟不能保证网络慢或网站改版时一定成功。

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
