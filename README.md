# Bilibili 收藏夹批量管理工具

QQ群：[524764959（扫码加入）](#qq-group) · 邮箱：[ljx.1024@outlook.com](mailto:ljx.1024@outlook.com) · [问题反馈](https://github.com/leida1024/bilibili-favs-manage/issues)

批量把自己或他人公开收藏夹的视频复制到自己的收藏夹，适配旧版个人空间与新版 VUI 收藏页。

本地开发版 **2.2.0-dev.1** 提供紧凑工作台、侧边日志、统一搜索与全选、只读统计、收藏夹删除和退订流程，详见 [管理功能与验证范围](docs/management.md)。这些改动尚未发布到 Greasy Fork；删除和退订仅完成合成数据验证。

## 界面预览

![虚构数据预览：紧凑列表与目标名称同行，侧边日志直接显示，三个功能统一搜索和全选](docs/assets/panel-preview.png)

图中收藏夹名称和日志均为模拟数据，由项目的实际面板组件生成。

## 安装

1. 安装并启用 [Tampermonkey（篡改猴）](https://www.tampermonkey.net/)。
2. 从 [Greasy Fork 安装脚本](https://greasyfork.org/zh-CN/scripts/487232)，确认脚本已启用。
3. 登录 B 站，打开要复制的用户空间，进入「收藏」。

**2.1.2 已发布到 Greasy Fork**。旧用户可在 Tampermonkey 中检查更新，或通过上方安装链接更新，然后刷新收藏页。请关闭重复安装的旧脚本。

## 使用

1. 在浮动面板左侧勾选一个或多个「源收藏夹」。
2. 填写对应的「目标收藏夹」名称，默认与源收藏夹同名，并检查任务列表。
3. 点击底部复制按钮，在固定状态区查看进度。本地开发版默认在右侧显示操作记录，窄屏移到底部；标题栏可收起记录。复制、统计和管理均可搜索、全选或取消全选，筛选外已选项仍会执行并有文字提示。
4. 复制他人的收藏夹时，脚本会先前往自己的收藏页，准备目标收藏夹，再返回源页面复制。等待自动跳转和分页完成。

已有同名目标会直接复用；名称首尾空白会被去掉，内部空格保留。失败或创建结果未确认时会停止，请核对目标收藏夹的实际结果后再重试。

面板可以拖动、缩放和最小化；点击「关闭」后，可从 Tampermonkey 的脚本菜单选择「显示收藏夹管理面板」重新打开。

遇到不显示面板、复制失败等问题，请看 [常见问题](https://github.com/leida1024/bilibili-favs-manage/blob/master/docs/troubleshooting.md)。

## 开发与文档

| 你想做什么 | 从这里开始 |
| --- | --- |
| 排查面板不显示、复制失败 | [常见问题](https://github.com/leida1024/bilibili-favs-manage/blob/master/docs/troubleshooting.md) |
| 本地开发、构建脚本、运行测试 | [贡献与开发指南](https://github.com/leida1024/bilibili-favs-manage/blob/master/CONTRIBUTING.md) |
| 发布脚本、配置 GitHub 自动同步 | [开发指南：发布与自动同步](https://github.com/leida1024/bilibili-favs-manage/blob/master/CONTRIBUTING.md#发布与自动同步) |
| 了解启动检测、跨页面创建和复制流程 | [架构与流程](https://github.com/leida1024/bilibili-favs-manage/blob/master/docs/architecture.md) |
| 适配 B 站页面改版 | [开发指南：目录与适配器](https://github.com/leida1024/bilibili-favs-manage/blob/master/CONTRIBUTING.md#目录) |
| 更新模拟截图 | [开发指南：界面预览](https://github.com/leida1024/bilibili-favs-manage/blob/master/CONTRIBUTING.md#界面预览) |
| 查看版本变化 | [更新日志](https://github.com/leida1024/bilibili-favs-manage/blob/master/CHANGELOG.md) |

开发从 `src/` 开始，构建后的可安装脚本在 `dist/`。本项目使用 [MIT License](https://github.com/leida1024/bilibili-favs-manage/blob/master/LICENSE)。

<a name="qq-group"></a>

## 交流群

使用 QQ 扫码加入，或搜索群号 **524764959**。点击图片可查看完整大图。

<a href="docs/assets/qq-group.jpg"><img src="docs/assets/qq-group.jpg" width="180" alt="Bilibili 收藏夹管理 QQ 群二维码，群号 524764959"></a>
