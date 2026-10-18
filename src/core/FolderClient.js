export const stableId = value => /^(?:[1-9]\d*)$/.test(String(value)) && Number.isSafeInteger(Number(value)) ? String(value) : null;
export const knownCount = value => Number.isSafeInteger(value) && value >= 0 ? value : null;

export function normalizeFolder(raw, kind, index = 0) {
  const id = stableId(raw.id);
  const ownerId = stableId(raw.upper?.mid ?? raw.mid);
  return Object.freeze({ id, ownerId, kind: kind === 'created' ? 'created' : raw.type === 11 ? 'subscribed' : 'unsupported',
    name: typeof raw.title === 'string' ? raw.title : '（名称未知）', count: knownCount(raw.media_count),
    protected: kind === 'created' && (index === 0 || raw.is_kid_playlist !== 0 || (raw.type !== undefined && raw.type !== 11)),
    available: raw.state === undefined || raw.state === 0, subscribed: raw.fav_state === 1 });
}

export function pause(ms, signal) {
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(new DOMException('已取消', 'AbortError')); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, ms);
    if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, { once: true });
  });
}

export class FolderClient {
  constructor(fetcher = (...args) => fetch(...args)) { this.fetcher = fetcher; }

  async request(path, params, signal) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(abort, 15000);
    try {
      const response = await this.fetcher(`https://api.bilibili.com${path}?${new URLSearchParams(params)}`, { credentials: 'include', signal: controller.signal });
      if (!response.ok) throw new Error(`读取失败 HTTP ${response.status}`);
      const json = await response.json();
      if (json.code !== 0 || !json.data || typeof json.data !== 'object') throw new Error(`读取失败（平台代码 ${Number.isInteger(json.code) ? json.code : '未知'}）`);
      return json.data;
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
  }

  async folders(ownerId, kind, signal, pace = 400) {
    if (!stableId(ownerId) || !['created', 'subscribed'].includes(kind)) throw new Error('收藏夹范围无效');
    if (kind === 'created') {
      const data = await this.request('/x/v3/fav/folder/created/list-all', { up_mid: ownerId }, signal);
      if (!Array.isArray(data.list) || data.list.length !== data.count) throw new Error('收藏夹列表不完整，请稍后重新加载');
      return this.normalizeList(data.list, kind);
    }
    const rows = [];
    for (let pn = 1; pn <= 100; pn++) {
      if (pn > 1) await pause(pace, signal);
      const data = await this.request('/x/v3/fav/folder/collected/list', { up_mid: ownerId, pn, ps: 20, platform: 'web' }, signal);
      if (!Array.isArray(data.list) || typeof data.has_more !== 'boolean') throw new Error('订阅列表格式未识别');
      rows.push(...data.list);
      if (!data.has_more) {
        if (rows.length !== data.count) throw new Error('订阅列表变化或不完整，请重新加载');
        return this.normalizeList(rows, kind);
      }
      if (!data.list.length) break;
    }
    throw new Error('订阅列表超过读取上限或分页未推进');
  }

  normalizeList(rows, kind) {
    const result = rows.map((row, index) => normalizeFolder(row, kind, index));
    if (result.some(row => !row.id) || new Set(result.map(row => row.id)).size !== result.length) throw new Error('收藏夹身份缺失或重复');
    return result;
  }

  videos(folderId, pn, signal) {
    if (!stableId(folderId)) throw new Error('收藏夹 ID 无效');
    return this.request('/x/v3/fav/resource/list', { media_id: folderId, pn, ps: 20, platform: 'web' }, signal);
  }
}
