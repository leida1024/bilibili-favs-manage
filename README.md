# Bilibili 收藏夹批量管理工具

QQ群：**524764959** · 邮箱：**ljx.1024@outlook.com**

[GitHub 仓库](https://github.com/junxian-li-hpc/bilibili-favs-manage)

批量把自己或他人公开收藏夹的视频复制到自己的收藏夹，适配旧版个人空间与新版 VUI 收藏页。

## 安装

1. 安装并启用 [Tampermonkey（篡改猴）](https://www.tampermonkey.net/)。
2. 从 [Greasy Fork 安装脚本](https://greasyfork.org/zh-CN/scripts/487232-bilibili-%E6%94%B6%E8%97%8F%E5%A4%B9%E6%89%B9%E9%87%8F%E5%A4%8D%E5%88%B6)，确认脚本已启用。
3. 登录 B 站，打开要复制的用户空间，进入「收藏」。

仓库中的 2.1.1 修复版尚未发布到 Greasy Fork。如需立即使用，在 Tampermonkey 中新建脚本，用 [dist/BilibiliFavsManage.user.js](dist/BilibiliFavsManage.user.js) 的全部内容替换编辑器内容并保存，关闭重复安装的旧版本，然后刷新收藏页。

## 使用

1. 在浮动面板左侧勾选「源收藏夹」。
2. 在右侧填写对应的「目标收藏夹」名称，默认与源收藏夹同名。
3. 点击「开始批量复制」，在面板的「输出信息」中查看进度。
4. 复制他人的收藏夹时，脚本会先前往自己的收藏页，准备目标收藏夹，再返回源页面复制。等待自动跳转和分页完成。

面板可以拖动、缩放和最小化；点击「点我销毁」后，可从 Tampermonkey 的脚本菜单选择「显示收藏夹管理面板」重新打开。

遇到不显示面板、复制失败等问题，请看 [常见问题](docs/常见问题.md)。

[开发指南](docs/开发指南.md) · [启用与跨页面流程](docs/启用流程.md) · [更新日志](docs/更新日志.md) · MIT License
