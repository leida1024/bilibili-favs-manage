import { FolderClient, knownCount, stableId, pause, folderKey } from './FolderClient.js';
import { videoMetadata } from './videoMetadata.js';

export class InventoryService {
  constructor(client = new FolderClient(), pace = 400) { this.client = client; this.pace = pace; this.running = false; }

  async scan(folders, { signal, onPage = () => {}, maxPages = 500, maxEntries = 10000 } = {}) {
    if (this.running) throw new Error('已有扫描正在进行');
    if (!folders.length || folders.some(f => !stableId(f.id) || f.kind === 'unsupported') || new Set(folders.map(folderKey)).size !== folders.length) throw new Error('请选择有效的收藏夹');
    this.running = true;
    const report = { scope: folders.map(f => ({ id: f.id, ownerId: f.ownerId, name: f.name })), complete: false, cancelled: false, folders: [], entries: 0,
      occurrences: 0, uniqueVideos: 0, duplicateOccurrences: 0, unknownIdentity: 0, unavailable: 0, knownDurationSeconds: 0, unknownDurations: 0, unknownUploaders: 0, videos: [], unidentified: [] };
    const videos = new Set(), aliases = new Map();
    let requests = 0;
    const client = this.client.capture?.() || this.client;
    try {
      for (const folder of folders) {
        const coverage = { id: folder.id, kind: folder.kind, name: folder.name, pages: 0, loaded: 0, expected: null, complete: false, issue: null };
        report.folders.push(coverage);
        const pageSignatures = new Set();
        try {
          for (let pn = 1; pn <= maxPages; pn++) {
            if (requests++) await pause(this.pace, signal);
            if (signal?.aborted) throw new DOMException('已取消', 'AbortError');
            const data = await client.videos(folder.id, pn, signal, folder);
            if (signal?.aborted) throw new DOMException('已取消', 'AbortError');
            if (!Array.isArray(data.medias) || data.medias.some(item => !item || typeof item !== 'object') || typeof data.has_more !== 'boolean' || stableId(data.info?.id) !== folder.id) throw new Error('分页格式或收藏夹身份未确认');
            const signature = JSON.stringify(data.medias.map(v => [v.type, v.id, v.bvid]));
            if (data.medias.length && pageSignatures.has(signature)) throw new Error('分页重复，扫描已停止');
            pageSignatures.add(signature);
            if (report.entries + data.medias.length > maxEntries) throw new Error('达到条目上限');
            const expected = knownCount(data.info.media_count);
            if (coverage.expected !== null && coverage.expected !== expected) throw new Error('扫描期间数量变化');
            coverage.expected = expected;
            coverage.pages++; coverage.loaded += data.medias.length; report.entries += data.medias.length;
            for (const raw of data.medias) {
              const metadata = videoMetadata(raw);
              if (metadata.unavailable) report.unavailable++;
              const membership = { id: folder.id, kind: folder.kind, ownerId: folder.ownerId, name: folder.name, occurrences: 1, collectedAt: knownCount(raw.fav_time) };
              if (!metadata.id && !metadata.bvid) { report.unknownIdentity++; metadata.folders.push(membership); report.unidentified.push(metadata); continue; }
              report.occurrences++;
              const byId = metadata.id && aliases.get(`av:${metadata.id}`), byBV = metadata.bvid && aliases.get(metadata.bvid);
              if (byId && byBV && byId !== byBV) {
                byId.occurrences += byBV.occurrences;
                for (const entry of byBV.folders) {
                  const old = byId.folders.find(f => folderKey(f) === folderKey(entry));
                  if (old) old.occurrences += entry.occurrences; else byId.folders.push(entry);
                }
                for (const [key, value] of aliases) if (value === byBV) aliases.set(key, byId);
                videos.delete(byBV);
              }
              const video = byId || byBV || metadata;
              for (const key of ['id', 'bvid', 'title', 'url', 'duration', 'uploaderId', 'uploaderName', 'publishedAt', 'unavailable'])
                if (video[key] === null && metadata[key] !== null) video[key] = metadata[key];
              if (metadata.bvid) video.url = metadata.url;
              if (metadata.id) aliases.set(`av:${metadata.id}`, video);
              if (metadata.bvid) aliases.set(metadata.bvid, video);
              video.occurrences++;
              const existing = video.folders.find(f => folderKey(f) === folderKey(folder));
              if (existing) existing.occurrences++; else video.folders.push(membership);
              videos.add(video);
            }
            onPage({ folder, page: pn, loaded: coverage.loaded });
            if (!data.has_more) {
              coverage.complete = expected !== null && coverage.loaded === expected;
              if (!coverage.complete) coverage.issue = expected === null ? `平台总数未知；已读取 ${coverage.loaded} 条` : `平台标称 ${expected} 条，实际读取 ${coverage.loaded} 条；可能含隐藏或暂不可获取内容`;
              break;
            }
            if (!data.medias.length) throw new Error('分页为空但仍有后续');
            if (pn === maxPages) coverage.issue = '达到分页上限';
          }
        } catch (err) {
          coverage.issue = signal?.aborted ? '已取消' : err.message;
          if (signal?.aborted) report.cancelled = true;
        }
        if (signal?.aborted || report.entries >= maxEntries) { if (signal?.aborted) report.cancelled = true; break; }
      }
      report.uniqueVideos = videos.size;
      report.duplicateOccurrences = report.occurrences - videos.size;
      report.videos = [...videos];
      for (const video of videos) {
        if (video.duration === null) report.unknownDurations++; else report.knownDurationSeconds += video.duration;
        if (!video.uploaderId) report.unknownUploaders++;
      }
      report.complete = !report.cancelled && report.folders.length === folders.length && report.folders.every(f => f.complete);
      return report;
    } finally { this.running = false; }
  }
}
