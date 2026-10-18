# 实施与验证

1. 新建共享 SelectionToolbar；三任务接入搜索、匹配批选、计数、禁选、忙碌锁定及票据失效。
2. 重构根布局为左任务/右默认日志，收窄窗口、提高列表容量、简化重复内容；精确身份保留于可访问名称及确认。
3. 同步 2.2.0-dev.1，构建使用运行时版本，更新用户文档和虚构预览（40短名/长名）。
4. 更新有意改变的旧断言，新增真实批选/筛选/票据/版本回归；npm test + npm run build。
5. 专属浏览器验证桌面/窄屏/横屏/长表/错误/日志/导出/键盘。检查实际行数与坐标，修复发现；只读实际页面注入不触发写请求。
6. trellis-check 审查；更新复用规范，产品/记录分开本地提交；archive/journal。禁止 push。

风险文件：FloatingPanel 的根布局/最小化/导出、InventoryPanel.updateBusy/resetCatalog、MutationPanel.invalidate/preview。不得改核心操作引擎。代码前已阅读 frontend 指定 specs 与两个 thinking guide；本设计已自审，无需新阶段批准。
