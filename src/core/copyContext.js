import { stableId } from './FolderClient.js';
import { PageDetector } from './PageDetector.js';

export const currentCopyContext = () => ({ actor: PageDetector.getLoginUserUID(), pageOwner: PageDetector.getCurrentPageUID() });

export function copyBlockReason({ actor, pageOwner }) {
  if (!stableId(actor)) return '请先登录 B 站，再复制他人的收藏夹。';
  if (!stableId(pageOwner)) return '请打开他人的收藏夹页面后复制。';
  if (actor === pageOwner) return '当前是我的空间；复制请前往他人的收藏夹页面，统计和管理可正常使用。';
  return '';
}

export function assertCopyContext(expected = currentCopyContext(), current = currentCopyContext()) {
  const reason = copyBlockReason(current);
  if (reason) throw new Error(reason);
  if (current.actor !== expected.actor || current.pageOwner !== expected.pageOwner)
    throw new Error('账号或来源空间已变化，未继续复制。请重新选择任务。');
  return expected;
}
