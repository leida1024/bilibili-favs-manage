export const stableId = value => /^(?:[1-9]\d*)$/.test(String(value)) && Number.isSafeInteger(Number(value)) ? String(value) : null;
export const knownCount = value => Number.isSafeInteger(value) && value >= 0 ? value : null;

export function normalizeFolder(raw, kind, index = 0) {
  const id = stableId(raw.id);
  const ownerId = stableId(raw.upper?.mid ?? raw.mid);
  const protectionReason = kind !== 'created' ? null : index === 0 ? 'default' :
    [true, 1].includes(raw.is_kid_playlist) || (raw.type !== undefined && raw.type !== 11) ? 'special' :
      [false, 0].includes(raw.is_kid_playlist) ? null : 'unknown';
  return Object.freeze({ id, ownerId, kind: kind === 'created' ? 'created' : raw.type === 11 ? 'subscribed' : 'unsupported',
    name: typeof raw.title === 'string' ? raw.title : '（名称未知）', count: knownCount(raw.media_count),
    // Current API uses booleans; older responses used 0/1. Missing stays protected.
    protected: protectionReason !== null, protectionReason,
    available: (kind === 'created' ? raw.state === undefined || raw.state === 0 : raw.state === 0) &&
      !(stableId(raw.mid) && stableId(raw.upper?.mid) && stableId(raw.mid) !== stableId(raw.upper.mid)), subscribed: raw.fav_state === 1 });
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
    const json = await this.fetchJSON(`${path}?${new URLSearchParams(params)}`, {}, signal);
    if (json.code !== 0 || !json.data || typeof json.data !== 'object') throw new Error(`读取失败（平台代码 ${Number.isInteger(json.code) ? json.code : '未知'}）`);
    return json.data;
  }

  async fetchJSON(path, options, signal) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(abort, 15000);
    try {
      const response = await this.fetcher(`https://api.bilibili.com${path}`, { ...options, credentials: 'include', signal: controller.signal });
      if (!response.ok) throw new Error(`读取失败 HTTP ${response.status}`);
      return await response.json();
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
  }

  async mutate(action, folder, signal) {
    if (!['delete', 'unsubscribe'].includes(action) || !stableId(folder.id)) return { status: 'failed', detail: '操作或 ID 无效，未提交' };
    if (signal?.aborted) return { status: 'not_started', detail: '取消，未提交' };
    const token = document.cookie.split(';').map(part => part.trim()).find(part => part.startsWith('bili_jct='))?.slice(9);
    if (!token) return { status: 'failed', detail: '登录校验缺失，未提交；请重新登录后检查' };
    const body = new URLSearchParams({ platform: 'web', csrf: token });
    if (action === 'delete') body.set('media_ids', folder.id);
    const path = action === 'delete' ? '/x/v3/fav/folder/del' : `/x/v3/fav/folder/unfav?${new URLSearchParams({ media_id: folder.id })}`;
    try {
      const json = await this.fetchJSON(path, { method: 'POST', body }, signal);
      if (!json || !Number.isInteger(json.code)) return { status: 'unknown', detail: '响应未识别；请检查平台结果，勿直接重试' };
      return json.code === 0 ? { status: 'confirmed', detail: '平台已确认成功' } : { status: 'failed', detail: `平台拒绝（代码 ${json.code}），已停止` };
    } catch { return { status: 'unknown', detail: '请求后未取得明确结果；请检查平台，勿直接重试' }; }
  }

  async folders(ownerId, kind, signal, pace = 400) {
    if (!stableId(ownerId) || !['created', 'subscribed'].includes(kind)) throw new Error('收藏夹范围无效');
    if (kind === 'created') {
      const data = await this.request('/x/v3/fav/folder/created/list-all', { up_mid: ownerId }, signal);
      if (data.count === 0 && data.list === null) data.list = [];
      if (!Array.isArray(data.list) || data.list.length !== data.count) throw new Error('收藏夹列表不完整，请稍后重新加载');
      return this.normalizeList(data.list, kind);
    }
    const rows = [];
    for (let pn = 1; pn <= 100; pn++) {
      if (pn > 1) await pause(pace, signal);
      const data = await this.request('/x/v3/fav/folder/collected/list', { up_mid: ownerId, pn, ps: 20, platform: 'web' }, signal);
      if (data.count === 0 && data.list === null && data.has_more === false) data.list = [];
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

  async videos(folderId, pn, signal) {
    if (!stableId(folderId)) throw new Error('收藏夹 ID 无效');
    const data = await this.request('/x/v3/fav/resource/list', { media_id: folderId, pn, ps: 20, platform: 'web' }, signal);
    if (data.medias === null && data.info?.media_count === 0 && data.has_more === false) data.medias = [];
    return data;
  }
}
