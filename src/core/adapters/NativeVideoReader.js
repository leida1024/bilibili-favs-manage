import { PageDetector } from '../PageDetector.js';
import { folderKey, stableId, knownCount, pause } from '../FolderClient.js';
import { normalizeFavoriteName } from '../../utils/favoriteNames.js';

const text = node => node?.textContent.trim() || '';
const enabled = node => node && !node.disabled && node.getAttribute('aria-disabled') !== 'true' && !/disabled/.test(node.className);

/** Reads only the page's native cards and pagination; never requests HTTP. */
export class NativeVideoReader {
  constructor(client) { this.client = client; }
  page() {
    return Number(text(document.querySelector(this.client.selectors.pagination)?.querySelector(this.client.selectors.activePage))) || 1;
  }
  cards() { return [...document.querySelectorAll(this.client.selectors.cards)]; }
  signature() { return this.cards().map(card => card.querySelector('a[href*="/video/"]')?.getAttribute('href') || text(card)).join('|'); }
  check(folder) {
    const url = new URL(window.location.href);
    if (!this.context || this.context.key !== folderKey(folder) || PageDetector.getLoginUserUID() !== this.context.actor ||
      PageDetector.getCurrentPageUID() !== this.context.pageOwner || url.searchParams.get('fid') !== folder.id ||
      url.searchParams.get('ftype') !== (folder.kind === 'created' ? 'create' : 'collect') ||
      (folder.kind !== 'created' && url.searchParams.get('ctype') !== (folder.kind === 'season' ? '21' : '11')))
      throw new Error('账号、空间或网页统计目标已变化，请重新选择后统计');
    const search = document.querySelector(this.client.selectors.search);
    if (search?.value.trim()) throw new Error('网页正在筛选视频，请清空页面搜索后重新统计');
  }
  async settle(folder, pn, signal, before = null) {
    let signature = null, stableSince = Date.now();
    await this.client.wait(() => {
      this.check(folder);
      const s = this.client.selectors;
      if (this.page() !== pn || normalizeFavoriteName(text(document.querySelector(s.detailTitle))) !== normalizeFavoriteName(folder.name)) return false;
      if (s.loading && document.querySelector(s.loading)) return false;
      const current = this.signature();
      if (before && current === before.signature && before.first?.isConnected) return false;
      if (current !== signature) { signature = current; stableSince = Date.now(); return false; }
      return Date.now() - stableSince >= 240;
    }, signal);
  }
  async read(id, pn, signal, folder) {
    if (!folder || folder.id !== id || !Number.isSafeInteger(pn) || pn < 1) throw new Error('网页统计缺少目标身份或页码无效');
    if (pn === 1) {
      this.context = { actor: PageDetector.getLoginUserUID(), pageOwner: PageDetector.getCurrentPageUID(), key: folderKey(folder) };
      const oldId = new URL(window.location.href).searchParams.get('fid');
      const before = { first: this.cards()[0], signature: this.signature() };
      const node = await this.client.select(folder, signal);
      if (this.client.boundRows.has(node)) node.querySelector(this.client.selectors.click)?.click();
      await this.client.wait(() => new URL(window.location.href).searchParams.get('fid') === id, signal);
      this.check(folder);
      await this.settle(folder, oldId !== id ? 1 : this.page(), signal, oldId !== id ? before : null);
    } else this.check(folder);
    let current = this.page();
    if (pn !== current) {
      if (pn !== 1 && pn !== current + 1) throw new Error('网页统计页码未连续推进，请重新开始统计');
      const s = this.client.selectors, pager = document.querySelector(s.pagination);
      const button = [...(pager?.querySelectorAll(s.page) || [])].find(node => text(node) === String(pn)) || (pn === current + 1 ? pager?.querySelector(s.next) : null);
      if (!enabled(button)) throw new Error('网页页码入口不可用，统计不完整');
      const before = { first: this.cards()[0], signature: this.signature() };
      button.click(); await this.settle(folder, pn, signal, before);
      current = this.page();
    }
    this.check(folder);
    if (current !== pn) throw new Error('网页当前页与统计页不一致');
    // Re-check after a microtask boundary before reading the final card set.
    await pause(0, signal); this.check(folder);
    const s = this.client.selectors;
    const medias = this.cards().map(card => {
      const link = card.querySelector('a[href*="/video/"]'), href = link?.getAttribute('href') || '';
      const titleNode = card.querySelector(s.videoTitle);
      const title = titleNode?.getAttribute('title') || text(titleNode) || null;
      const unavailable = /^(已失效视频|失效视频|视频已失效)$/.test(title || '') || !!card.querySelector(s.unavailable);
      const durationText = [...card.querySelectorAll(s.duration)].map(text).find(t => /^\d{1,3}:\d{2}(?::\d{2})?$/.test(t));
      const duration = unavailable || !durationText ? null : durationText.split(':').reduce((a, n) => a * 60 + Number(n), 0);
      const author = card.querySelector(s.videoAuthor);
      const authorName = (text(author?.querySelector('[title]')) || text(author)).replace(/\s*·\s*收藏于.*$/, '').trim() || null;
      return { type: 2, id: stableId(href.match(/\/av(\d+)/)?.[1]), bvid: href.match(/BV[0-9A-Za-z]{10}/)?.[0] || null,
        title, duration, attr: unavailable ? 1 : undefined, upper: { mid: stableId(author?.getAttribute('href')?.match(/space\.bilibili\.com\/(\d+)/)?.[1]), name: authorName } };
    });
    const countText = text(document.querySelector(s.data)).match(/视频数\s*[:：]\s*(\d+)/)?.[1];
    const count = countText === undefined ? knownCount(folder.count) : knownCount(Number(countText));
    const next = document.querySelector(s.pagination)?.querySelector(s.next);
    if (!medias.length && count !== 0) throw new Error('网页未展示视频条目，请检查空页或权限；已读取结果保留');
    return { info: { id, media_count: count }, medias, has_more: !!enabled(next) };
  }
}
