import { stableId, pause } from './FolderClient.js';

export function eligibility(action, folder, actor, pageOwner) {
  if (!stableId(actor) || !stableId(folder.id) || !stableId(folder.ownerId)) return '身份未确认';
  if (!folder.available) return '对象不可用';
  if (action !== 'delete') return '操作类型不支持';
  if (folder.kind !== 'created') return '不是创建的收藏夹';
  if (folder.ownerId !== actor || pageOwner !== actor) return '只能管理自己空间的收藏夹';
  if (folder.protected !== false) return '默认、特殊或保护状态未知的收藏夹';
  return null;
}

export class BatchOperations {
  constructor(client, context, pace = 400) { this.client = client; this.context = context; this.pace = pace; this.running = false; this.ticket = null; }

  invalidate() { this.ticket = null; }

  prepare(action, folders) {
    this.invalidate();
    const { actor, pageOwner } = this.context();
    if (this.running || !folders.length || new Set(folders.map(f => f.id)).size !== folders.length) throw new Error('请选择有效且不重复的目标');
    for (const folder of folders) {
      const reason = eligibility(action, folder, actor, pageOwner);
      if (reason) throw new Error(reason);
    }
    this.ticket = Object.freeze({ action, actor, pageOwner, targets: Object.freeze(folders.map(folder => Object.freeze({ ...folder }))) });
    return this.ticket;
  }

  async execute(ticket, { confirmed = false, signal, onResult = () => {} } = {}) {
    if (!confirmed || !ticket || ticket !== this.ticket || this.running) throw new Error('请重新预览并明确确认本次目标');
    this.invalidate(); // Consume BEFORE any await or submission. Never persist/replay.
    this.running = true;
    const results = ticket.targets.map(target => ({ id: target.id, ownerId: target.ownerId, name: target.name, status: 'not_started', detail: '尚未提交' }));
    try {
      for (let index = 0; index < ticket.targets.length; index++) {
        if (signal?.aborted) break;
        const target = ticket.targets[index];
        let result;
        let submitted = false;
        try {
          if (index) await pause(this.pace, signal);
          const current = this.context();
          if (current.actor !== ticket.actor || current.pageOwner !== ticket.pageOwner) throw new Error('当前账号或空间变化，请重新预览');
          const catalog = await this.client.folders(ticket.actor, 'created', signal, this.pace);
          if (signal?.aborted) break;
          const fresh = catalog.find(folder => folder.id === target.id);
          if (!fresh || eligibility(ticket.action, fresh, current.actor, current.pageOwner) ||
            ['id', 'ownerId', 'name', 'count', 'kind', 'protected', 'available'].some(key => fresh[key] !== target[key])) throw new Error('目标身份、名称、数量或保护状态变化，请重新加载并预览');
          const latest = this.context();
          if (latest.actor !== ticket.actor || latest.pageOwner !== ticket.pageOwner) throw new Error('账号或空间变化，未提交');
          if (signal?.aborted) break;
          submitted = true;
          result = await this.client.mutate(ticket.action, target, signal);
          if (!['confirmed', 'failed', 'unknown', 'not_started'].includes(result?.status)) result = { status: 'unknown', detail: '结果未识别，已停止；请检查平台' };
        } catch (err) {
          if (!submitted && signal?.aborted) break;
          result = submitted ? { status: 'unknown', detail: '提交后未获得明确结果，请检查平台，勿直接重试' } : { status: 'failed', detail: `未提交：${err.message}` };
        }
        Object.assign(results[index], result); onResult({ ...results[index] }, index);
        if (result.status !== 'confirmed') break;
      }
      return { action: ticket.action, cancelled: !!signal?.aborted, results, complete: results.every(result => result.status === 'confirmed') };
    } finally { this.running = false; }
  }
}
