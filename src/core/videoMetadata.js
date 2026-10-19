import { stableId, knownCount } from './FolderClient.js';

const label = value => typeof value === 'string' && value.trim() ? value.trim() : null;
export function videoMetadata(raw) {
  const id = raw.type === 2 ? stableId(raw.id) : null;
  const bvid = raw.type === 2 && /^BV[0-9A-Za-z]{10}$/.test(raw.bvid) ? raw.bvid : null;
  const unavailable = Number.isInteger(raw.attr) ? !!(raw.attr & 1) : null;
  return { id, bvid, title: label(raw.title), url: bvid ? `https://www.bilibili.com/video/${bvid}` : id ? `https://www.bilibili.com/video/av${id}` : null,
    duration: unavailable ? null : knownCount(raw.duration), uploaderId: stableId(raw.upper?.mid), uploaderName: label(raw.upper?.name),
    unavailable, publishedAt: knownCount(raw.pubtime), occurrences: 0, folders: [] };
}
