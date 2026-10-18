import { normalizeCopyTasks, normalizeFavoriteName } from '../utils/favoriteNames.js';
import { stableId, pause } from './FolderClient.js';

const fail = (detail, outcome = 'failed') => { const error = new Error(detail); error.outcome = outcome; throw error; };
export class ApiCopyFlow {
  constructor(client, context, pace = 400) { this.client = client; this.context = context; this.pace = pace; this.running = false; }
  check(expected, signal) {
    if (signal?.aborted) fail('已停止后续复制', 'interrupted');
    const current = this.context();
    if (!stableId(current.actor) || current.actor !== expected.actor || current.pageOwner !== expected.pageOwner) fail('账号或来源空间变化，已停止');
  }
  require(result) { if (result?.status !== 'confirmed') fail(result?.detail || '结果未识别', result?.status === 'unknown' ? 'unknown' : 'failed'); }
  resolve(rows, name, required = true) {
    const found = rows.filter(row => normalizeFavoriteName(row.name) === name);
    if (found.length > 1) fail(`同名收藏夹身份不明确：${name}`);
    if (!found.length && required) fail(`未找到收藏夹：${name}`);
    return found[0];
  }
  async resources(folder, signal) {
    const ids = [], seen = new Set(); let expected = null;
    for (let pn = 1; pn <= 500; pn++) {
      if (pn > 1) await pause(this.pace, signal);
      const page = await this.client.videos(folder.id, pn, signal, folder);
      if (!Array.isArray(page.medias) || stableId(page.info?.id) !== folder.id || typeof page.has_more !== 'boolean' ||
        !Number.isSafeInteger(page.info.media_count) || page.info.media_count < 0 || (expected !== null && expected !== page.info.media_count)) fail('来源分页身份或数量变化，未继续复制');
      expected = page.info.media_count;
      for (const raw of page.medias) {
        const id = raw.type === 2 ? stableId(raw.id) : null;
        if (!id || seen.has(id) || (Number.isInteger(raw.attr) && (raw.attr & 1))) fail('来源含失效、重复或不支持的资源，请先检查');
        ids.push(id); seen.add(id);
      }
      if (!page.has_more) {
        if (ids.length !== expected) fail('来源列表不完整，未继续复制');
        return ids;
      }
      if (!page.medias.length) break;
    }
    fail('来源分页未完整读取');
  }
  async prepareTargets(names, expected, creator, signal) {
    let rows = await this.client.folders(expected.actor, 'created', signal, this.pace);
    const targets = new Map();
    // Resolve all ambiguous names before creating anything.
    for (const name of names) this.resolve(rows, name, false);
    for (const name of names) {
      this.check(expected, signal);
      let target = this.resolve(rows, name, false);
      if (!target) {
        const result = await creator.create(name, signal); this.require(result);
        await pause(this.pace, signal); this.check(expected, signal);
        try { rows = await this.client.folders(expected.actor, 'created', signal, this.pace); }
        catch { fail('创建已获响应，但未能核对目标列表；请检查，勿直接重试', 'unknown'); }
        target = this.resolve(rows, name, false);
        if (!target) fail('创建已提交，但尚未在目标列表核对到结果；请检查，勿直接重试', 'unknown');
      }
      if (!stableId(target.id) || target.ownerId !== expected.actor || !target.available) fail('目标身份或可用性未确认');
      targets.set(name, target);
    }
    return targets;
  }
  async run(tasks, { creator = this.client, signal, onProgress = () => {} } = {}) {
    if (this.running) fail('已有 API 复制任务');
    tasks = normalizeCopyTasks(tasks);
    if (!tasks.length) fail('请选择来源');
    const expected = this.context(); this.check(expected, signal); this.running = true;
    try {
      const sources = await this.client.folders(expected.pageOwner, 'created', signal, this.pace);
      const snapshots = [];
      for (const task of tasks) {
        this.check(expected, signal); const source = this.resolve(sources, task.source);
        if (!source.available || !stableId(source.id) || source.ownerId !== expected.pageOwner) fail('来源身份或可用性未确认');
        if (expected.actor === expected.pageOwner && task.source === task.target) fail('来源与目标相同，未提交');
        snapshots.push({ task, source, ids: await this.resources(source, signal) });
      }
      const targets = await this.prepareTargets([...new Set(tasks.map(task => task.target))], expected, creator, signal);
      for (const { task, source, ids } of snapshots) {
        const target = targets.get(task.target);
        if (source.id === target.id) fail('来源与目标 ID 相同，未提交');
        for (let offset = 0; offset < ids.length; offset += 20) {
          await pause(this.pace, signal); this.check(expected, signal);
          const fresh = await this.client.folders(expected.actor, 'created', signal, this.pace);
          const current = fresh.find(row => row.id === target.id);
          if (!current || current.ownerId !== target.ownerId || current.name !== target.name || !current.available) fail('目标身份变化，已停止');
          this.check(expected, signal);
          this.require(await this.client.copy(source, target, ids.slice(offset, offset + 20), expected.actor, signal));
          onProgress({ task, copied: Math.min(ids.length, offset + 20), total: ids.length });
        }
        onProgress({ task, complete: true, total: ids.length });
      }
      return { status: 'completed' };
    } finally { this.running = false; }
  }
}
