import { FolderClient, knownCount, stableId, pause } from './FolderClient.js';

export class InventoryService {
  constructor(client = new FolderClient(), pace = 400) { this.client = client; this.pace = pace; this.running = false; }

  async scan(folders, { signal, onPage = () => {}, maxPages = 100, maxEntries = 10000 } = {}) {
    if (this.running) throw new Error('已有扫描正在进行');
    if (!folders.length || folders.some(f => !stableId(f.id) || f.kind === 'unsupported') || new Set(folders.map(f => f.id)).size !== folders.length) throw new Error('请选择有效的收藏夹');
    this.running = true;
    const report = { scope: folders.map(f => ({ id: f.id, ownerId: f.ownerId, name: f.name })), complete: false, cancelled: false, folders: [], entries: 0,
      occurrences: 0, uniqueVideos: 0, duplicateOccurrences: 0, unknownIdentity: 0, unavailable: 0, knownDurationSeconds: 0, unknownDurations: 0, unknownUploaders: 0, videos: [] };
    const videos = new Map();
    let requests = 0;
    try {
      for (const folder of folders) {
        const coverage = { id: folder.id, pages: 0, loaded: 0, expected: null, complete: false, issue: null };
        report.folders.push(coverage);
        const pageSignatures = new Set();
        try {
          for (let pn = 1; pn <= maxPages; pn++) {
            if (requests++) await pause(this.pace, signal);
            if (signal?.aborted) throw new DOMException('已取消', 'AbortError');
            const data = await this.client.videos(folder.id, pn, signal);
            if (signal?.aborted) throw new DOMException('已取消', 'AbortError');
            if (!Array.isArray(data.medias) || typeof data.has_more !== 'boolean' || stableId(data.info?.id) !== folder.id) throw new Error('分页格式或收藏夹身份未确认');
            const signature = JSON.stringify(data.medias.map(v => [v.type, v.id]));
            if (data.medias.length && pageSignatures.has(signature)) throw new Error('分页重复，扫描已停止');
            pageSignatures.add(signature);
            if (report.entries + data.medias.length > maxEntries) throw new Error('达到条目上限');
            coverage.pages++; coverage.loaded += data.medias.length; report.entries += data.medias.length;
            const expected = knownCount(data.info.media_count);
            if (coverage.expected !== null && coverage.expected !== expected) throw new Error('扫描期间数量变化');
            coverage.expected = expected;
            for (const raw of data.medias) {
              if (Number.isInteger(raw.attr) && (raw.attr & 1)) report.unavailable++;
              const id = raw.type === 2 ? stableId(raw.id) : null;
              if (!id) { report.unknownIdentity++; continue; }
              report.occurrences++;
              if (videos.has(id)) continue;
              const duration = knownCount(raw.duration);
              const uploaderId = stableId(raw.upper?.mid);
              videos.set(id, { id, bvid: typeof raw.bvid === 'string' ? raw.bvid : null, duration, uploaderId });
              if (duration === null) report.unknownDurations++; else report.knownDurationSeconds += duration;
              if (!uploaderId) report.unknownUploaders++;
            }
            onPage({ folder, page: pn, loaded: coverage.loaded });
            if (!data.has_more) {
              coverage.complete = expected !== null && coverage.loaded === expected;
              if (!coverage.complete) coverage.issue = '总数未知或数量不符';
              break;
            }
            if (!data.medias.length) throw new Error('分页为空但仍有后续');
            if (pn === maxPages) coverage.issue = '达到分页上限';
          }
        } catch (err) {
          coverage.issue = signal?.aborted ? '已取消' : err.message;
          if (signal?.aborted) report.cancelled = true;
        }
        if (!coverage.complete || signal?.aborted) { if (signal?.aborted) report.cancelled = true; break; }
      }
      report.uniqueVideos = videos.size;
      report.duplicateOccurrences = report.occurrences - videos.size;
      report.videos = [...videos.values()];
      report.complete = !report.cancelled && report.folders.length === folders.length && report.folders.every(f => f.complete);
      return report;
    } finally { this.running = false; }
  }
}
