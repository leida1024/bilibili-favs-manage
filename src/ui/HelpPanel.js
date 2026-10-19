import { element } from './elements.js';

export function helpPanel() {
  const root = element('section', 'bf-help-panel');
  root.setAttribute('aria-label', '帮助');
  root.append(element('h2', '', '使用帮助'));
  const topics = [
    ['复制收藏夹', '先登录，再打开他人的收藏夹页面。勾选来源并填写目标名，内容会复制到自己账号，来源保留。同名目标会复用；若有多个同名收藏夹，请先改名。网页创建会先跳转到自己的空间，再返回继续复制。'],
    ['统计与视频明细', '选择“当前空间”或“我的订阅”，加载列表后勾选收藏夹再统计。只读取选中范围，可查看视频明细并导出。结果显示覆盖页数；“扫描不完整”只代表已读取的部分。'],
    ['网页操作和 API', '在“设置”选择方式。网页读取会打开收藏夹并逐页查看，请等待完成，期间避免手动切换。API 读取直接请求 B 站接口；权限和接口变化都可能导致失败。保存设置保留已加载的列表，新任务使用新方式。'],
    ['删除与取消订阅', '删除仅适用于自己创建的非默认、非特殊收藏夹；取消订阅不会删除原作者内容。先选择、预览并核对具体 ID，再勾选确认。网页退订需在自己的收藏夹页面进行；失效条目也需确认身份。'],
    ['遇到停止或待核对', '“待核对”表示可能已经提交，请先检查 B 站目标结果，避免重复操作。普通停止会说明原因。打开“记录”，选择“排查详情”查看按钮步骤；导出包含全部保留记录，发给他人前请检查内容。']
  ];
  for (const [title, text] of topics) {
    const details = element('details'); details.append(element('summary', '', title), element('p', '', text)); root.append(details);
  }
  root.append(element('h3', '', '交流与反馈'), element('p', '', 'QQ 群：524764959（在 QQ 搜索群号加入）'));
  for (const [label, href] of [['项目说明与入群二维码', 'https://github.com/leida1024/bilibili-favs-manage#qq-group'], ['反馈问题', 'https://github.com/leida1024/bilibili-favs-manage/issues']]) {
    const link = element('a', '', label); link.href = href; link.target = '_blank'; link.rel = 'noopener noreferrer';
    const line = element('p'); line.append(link); root.append(line);
  }
  return root;
}
