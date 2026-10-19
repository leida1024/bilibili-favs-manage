import { stableId, folderKey, pause } from './FolderClient.js';
import { PageDetector } from './PageDetector.js';
import { BilibiliAPI } from './BilibiliAPI.js';
import { subscriptionBindings, legacySubscriptionSource } from './adapters/nativeBindings.js';
import { nativeControls } from './adapters/nativeControls.js';
import { isElementVisible } from '../utils/dom.js';
import { normalizeFavoriteName } from '../utils/favoriteNames.js';

const text = node => node?.textContent.trim() || '';
const numberFrom = value => /^\d+$/.test(value || '') ? Number(value) : null;
export class WebFolderClient {
  constructor() { this.identities = new WeakMap(); this.boundRows = new WeakSet(); this.currentFolder = null; }
  get selectors() { return document.querySelector('.favlist-aside') ? nativeControls.vui : nativeControls.legacy; }
  async wait(check, signal, timeout = 8000) {
    const end = Date.now() + timeout;
    do {
      if (signal?.aborted) throw new DOMException('已取消', 'AbortError');
      const result = check(); if (result) return result;
      await pause(80, signal);
    } while (Date.now() < end);
    throw new Error('网页未显示预期结果；请检查页面或切换操作方式');
  }
  group(kind, required = true) {
    const s = this.selectors;
    const group = s.group ? [...document.querySelectorAll(s.group)].find(node =>
      kind === 'created' ? /^(我|TA)创建的收藏夹$/.test(text(node.querySelector(s.heading))) : /^(我|TA)追的合集\/收藏夹$/.test(text(node.querySelector(s.heading)))) : document.querySelector(s[kind]);
    if (!group && required) throw new Error('网页没有这个列表范围，请在对应空间加载，或选择 API 读取');
    return group;
  }
  async rows(kind, signal) {
    const group = await this.wait(() => this.group(kind, false), signal);
    const s = this.selectors;
    const header = group.querySelector(s.heading || '.favlist-title') || group.closest('.fav-container')?.querySelector('.favlist-title');
    const icon = header?.querySelector('.vui_collapse_item_header_icon');
    const legacyArrow = header?.querySelector('.icon-arrow');
    const legacyFolded = legacyArrow && !legacyArrow.classList.contains('arrow-transform');
    if ((icon && !icon.classList.contains('vui_collapse_item_icon_active')) || legacyFolded) {
      header.click(); await pause(160, signal);
    }
    for (let i = 0; i < 100; i++) {
      if (signal?.aborted) throw new DOMException('已取消', 'AbortError');
      const more = [...group.querySelectorAll(s.more)].find(node => /显示剩余\d+个|加载更多|查看更多/.test(text(node)));
      const source = kind === 'subscribed' && !s.group ? legacySubscriptionSource(group) : null;
      const before = group.querySelectorAll(s.row).length;
      if (source && before > source.count) throw new Error('网页订阅数量变化，请重新加载');
      if (!more && (!source || before === source.count)) return [...group.querySelectorAll(s.row)];
      if (more) more.click();
      else {
        group.scrollTop = group.scrollHeight;
        group.dispatchEvent(new window.Event('scroll'));
        group.dispatchEvent(new window.Event('ps-y-reach-end'));
      }
      await this.wait(() => group.querySelectorAll(s.row).length > before, signal);
    }
    throw new Error('网页展开超过上限，未将部分列表当作完整结果');
  }

  async openMenu(node, signal) {
    const s = this.selectors, menu = node.querySelector(s.menu);
    if (!menu) return [];
    this.closeMenu();
    // Both layouts use non-bubbling mouseenter on their actual trigger. A
    // click on the wrapper neither opens a hover popover nor proves ownership.
    await this.wait(() => ![...document.querySelectorAll(s.menuItem)].some(isElementVisible), signal, 2000);
    this.activeMenu = menu;
    node.dispatchEvent(new window.MouseEvent('mouseenter'));
    node.dispatchEvent(new window.MouseEvent('mouseover', { bubbles: true }));
    menu.dispatchEvent(new window.MouseEvent('mouseenter'));
    menu.dispatchEvent(new window.MouseEvent('mouseover', { bubbles: true }));
    await this.wait(() => [...document.querySelectorAll(s.menuItem)].some(isElementVisible), signal, 2000);
    return [...document.querySelectorAll(s.menuItem)].filter(isElementVisible);
  }
  closeMenu() {
    this.activeMenu?.dispatchEvent(new window.MouseEvent('mouseleave'));
    this.activeMenu = null;
    document.body.click();
  }
  async inspect(node, kind, index, signal, bindings) {
    const s = this.selectors, name = normalizeFavoriteName(text(node.querySelector(s.title)));
    if (!name) throw new Error('网页条目缺少名称');
    if (kind === 'subscribed') {
      const bound = (bindings || subscriptionBindings([node], this.group(kind), !s.group)).get(node);
      if (bound) {
        const folder = Object.freeze({ ...bound, name,
          available: bound.available && !node.matches('.favInvalid') && !node.querySelector('[class*="--disabled"]') });
        this.identities.set(node, folder); this.boundRows.add(node); return folder;
      }
      if (this.boundRows.has(node)) throw new Error('网页条目绑定已变化，未提交');
    }
    if (node.matches('.favInvalid') || node.querySelector('[class*="--disabled"]'))
      throw new Error('网页无法核对失效条目的 ID；可在设置中选择 API 后重新预览，未提交');
    const old = this.identities.get(node);
    if (old && old.name === name) return Object.freeze({ ...old, available: !node.querySelector('[class*="--disabled"]') });
    const pageOwner = PageDetector.getCurrentPageUID();
    node.querySelector(s.click)?.click();
    await pause(160, signal);
    await this.wait(() => normalizeFavoriteName(text(document.querySelector(s.detailTitle))) === name, signal);
    const url = new URL(window.location.href), id = stableId(url.searchParams.get('fid'));
    const type = kind === 'created' ? 'created' : url.searchParams.get('ctype') === '21' ? 'season' : url.searchParams.get('ctype') === '11' ? 'subscribed' : 'unsupported';
    if (!id || PageDetector.getCurrentPageUID() !== pageOwner ||
      (kind === 'created' ? url.searchParams.get('ftype') !== 'create' : url.searchParams.get('ftype') !== 'collect')) throw new Error('网页未确认条目身份，停止读取');
    const ownerLink = document.querySelector(s.owner)?.getAttribute('href') || '';
    const ownerId = kind === 'created' ? pageOwner : stableId(ownerLink.match(/space\.bilibili\.com\/(\d+)/)?.[1]);
    const count = numberFrom(text(document.querySelector(s.data)).match(/视频数\s*[:：]\s*(\d+)/)?.[1]);
    let protectionReason = kind === 'created' ? index === 0 ? 'default' : 'unknown' : null;
    if (kind === 'created' && index > 0) {
      const items = await this.openMenu(node, signal).catch(() => []);
      if (items.some(item => text(item) === '删除')) protectionReason = null;
      this.closeMenu();
    }
    const folder = Object.freeze({ id, ownerId, kind: type, name, count, identityConflict: false, protectionReason, protected: protectionReason !== null,
      available: !node.querySelector('[class*="--disabled"]'), subscribed: kind === 'subscribed' });
    this.identities.set(node, folder); return folder;
  }
  async folders(owner, kind, signal, pace, revalidateTarget) {
    if (owner !== PageDetector.getCurrentPageUID()) throw new Error('网页方式需要先打开对应账号的收藏夹页面');
    const rows = await this.rows(kind, signal), result = [];
    const bindings = kind === 'subscribed' ? subscriptionBindings(rows, this.group(kind), !this.selectors.group) : null;
    for (let index = 0; index < rows.length; index++) {
      if (revalidateTarget && folderKey(this.identities.get(rows[index]) || {}) === folderKey(revalidateTarget)) this.identities.delete(rows[index]);
      result.push(await this.inspect(rows[index], kind, index, signal, bindings));
    }
    const identified = result.filter(row => row.id);
    if (new Set(identified.map(folderKey)).size !== identified.length) throw new Error('网页条目身份重复，请重新加载');
    return result;
  }
  async select(folder, signal) {
    const kind = folder.kind === 'created' ? 'created' : 'subscribed';
    const rows = await this.rows(kind, signal);
    const bindings = kind === 'subscribed' ? subscriptionBindings(rows, this.group(kind), !this.selectors.group) : new Map();
    const keys = [...bindings.values()].map(folderKey);
    if (new Set(keys).size !== keys.length) throw new Error('网页条目身份重复，未提交');
    let node = rows.find(row => folderKey(bindings.get(row) || {}) === folderKey(folder)) || rows.find(row => folderKey(this.identities.get(row) || {}) === folderKey(folder));
    if (!node) {
      const matches = rows.filter(row => normalizeFavoriteName(text(row.querySelector(this.selectors.title))) === folder.name);
      for (const candidate of matches) {
        const resolved = await this.inspect(candidate, kind, rows.indexOf(candidate), signal);
        if (folderKey(resolved) === folderKey(folder)) {
          if (node) throw new Error('网页身份重复，未提交');
          node = candidate;
        }
      }
      if (!node) throw new Error('网页目标缺失或同名身份不明确，未提交');
    }
    // Re-read the exact row binding (or route/details fallback) before acting.
    this.identities.delete(node);
    const fresh = await this.inspect(node, kind, rows.indexOf(node), signal);
    if (['id', 'kind', 'name'].some(key => folder[key] !== fresh[key]) || fresh.identityConflict ||
      (folder.ownerId && fresh.ownerId && folder.ownerId !== fresh.ownerId)) throw new Error('网页目标身份变化，未提交');
    if (kind === 'created' && fresh.protectionReason === 'unknown') throw new Error('网页未识别目标的删除菜单；请检查页面或切换操作方式，未提交');
    if ((kind === 'created' && !fresh.available) || (folder.count !== null && fresh.count !== null && folder.count !== fresh.count) ||
      (kind === 'created' && fresh.protected !== folder.protected)) throw new Error('网页目标数量或保护状态变化，未提交');
    return node;
  }
  async mutate(action, folder, signal) {
    if (!['delete', 'unsubscribe'].includes(action)) return { status: 'failed', detail: '操作类型不支持，未提交' };
    let submitted = false;
    try {
      const actor = PageDetector.getLoginUserUID(), pageOwner = PageDetector.getCurrentPageUID();
      const node = await this.select(folder, signal);
      const group = this.group(action === 'delete' ? 'created' : 'subscribed');
      const originalRows = [...group.querySelectorAll(this.selectors.row)];
      const sameName = row => normalizeFavoriteName(text(row.querySelector(this.selectors.title))) === folder.name;
      const originalMatches = originalRows.filter(sameName).length;
      if (action === 'delete' && (actor !== folder.ownerId || pageOwner !== actor || folder.kind !== 'created' || folder.protected)) throw new Error('删除归属或保护状态未确认');
      if (action === 'unsubscribe' && (!actor || pageOwner !== actor || !['subscribed', 'season'].includes(folder.kind) || actor === folder.ownerId || !folder.subscribed)) throw new Error('订阅身份未确认');
      const items = await this.openMenu(node, signal), label = action === 'delete' ? '删除' : '取消订阅';
      const choices = items.filter(item => text(item) === label);
      if (choices.length !== 1 || PageDetector.getLoginUserUID() !== actor || PageDetector.getCurrentPageUID() !== pageOwner) throw new Error('网页操作入口或账号变化');
      if (signal?.aborted) return { status: 'not_started', detail: '已取消，未提交' };
      const boundIdentity = this.identities.get(node);
      const verifyBinding = () => {
        const bound = subscriptionBindings([node], group, !this.selectors.group).get(node);
        return node.isConnected && (bound ? ['id', 'kind', 'ownerId'].every(key => bound[key] === boundIdentity[key]) &&
          normalizeFavoriteName(bound.name) === boundIdentity.name && !bound.identityConflict : !this.boundRows.has(node));
      };
      if (!verifyBinding()) throw new Error('网页目标身份变化，未提交');
      submitted = true; // Menu entries can submit immediately; never click twice.
      choices[0].click();
      if (action === 'delete' || this.selectors.group) {
        const dialog = await this.wait(() => [...document.querySelectorAll(this.selectors.dialog)].find(node => isElementVisible(node) && (action === 'delete' ? /删除/.test(text(node)) : /取消订阅/.test(text(node)))), signal);
        const controls = [...dialog.querySelectorAll('button, .btn')].filter(node => isElementVisible(node) && /^(确定|确认|删除|确认删除)$/.test(text(node)));
        if (controls.length !== 1 || PageDetector.getLoginUserUID() !== actor || PageDetector.getCurrentPageUID() !== pageOwner || !verifyBinding() ||
          (action === 'delete' && new URL(window.location.href).searchParams.get('fid') !== folder.id)) throw new Error('网页确认或目标身份变化，请检查页面');
        if (signal?.aborted) throw new Error('已停止，请检查网页中的待确认操作');
        controls[0].click();
      }
      await this.wait(() => {
        if (PageDetector.getLoginUserUID() !== actor || PageDetector.getCurrentPageUID() !== pageOwner) return false;
        if (!group.isConnected) {
          const source = legacySubscriptionSource(group);
          return action === 'unsubscribe' && originalRows.length === 1 && source?.count === 0 && source.list.length === 0;
        }
        const rows = [...group.querySelectorAll(this.selectors.row)];
        return !node.isConnected && rows.length === originalRows.length - 1 && rows.filter(sameName).length === originalMatches - 1;
      }, signal);
      return { status: 'confirmed', detail: '网页已移除刚才核对的目标条目' };
    } catch (error) {
      return { status: submitted ? 'unknown' : signal?.aborted ? 'not_started' : 'failed', detail: `${submitted ? '已触发网页操作，结果待核对，勿直接重试' : '未提交'}：${error.message}` };
    } finally { this.closeMenu(); }
  }
  async create(name, signal) {
    if (!PageDetector.isOwnPage()) return { status: 'failed', detail: '网页创建需在我的空间进行；可选择 API 创建' };
    if (signal?.aborted) return { status: 'not_started', detail: '已取消' };
    const actor = PageDetector.getLoginUserUID();
    const result = await BilibiliAPI.createFavoriteViaSidebar(name, () => !signal?.aborted && PageDetector.getLoginUserUID() === actor && PageDetector.isOwnPage());
    return result === true ? { status: 'confirmed', detail: '网页已显示目标收藏夹' } : { status: result === null ? 'failed' : 'unknown', detail: '网页创建未确认，请检查页面；没有切换方式重试' };
  }
  async videos(id, pn, signal, folder) {
    if (!folder || folder.id !== id) throw new Error('网页统计缺少目标身份');
    const s = this.selectors;
    if (pn === 1) {
      const node = await this.select(folder, signal);
      if (this.boundRows.has(node)) {
        node.querySelector(s.click)?.click();
        await this.wait(() => new URL(window.location.href).searchParams.get('fid') === folder.id &&
          normalizeFavoriteName(text(document.querySelector(s.detailTitle))) === folder.name, signal);
        await pause(160, signal);
      }
      this.currentFolder = folderKey(folder);
    }
    if (this.currentFolder !== folderKey(folder)) throw new Error('网页统计目标变化');
    const pager = document.querySelector(s.pagination);
    const current = Number(text(pager?.querySelector(s.activePage))) || 1;
    if (pn !== current) {
      const signature = () => [...document.querySelectorAll(s.cards)].map(card => card.querySelector('a[href*="/video/"]')?.getAttribute('href')).join('|');
      const before = signature();
      const button = [...(pager?.querySelectorAll(s.page) || [])].find(node => text(node) === String(pn));
      if (!button) throw new Error('网页页码入口未识别，统计不完整');
      button.click();
      await this.wait(() => Number(text(document.querySelector(s.pagination)?.querySelector(s.activePage))) === pn && signature() !== before, signal);
    }
    const medias = [...document.querySelectorAll(s.cards)].map(card => {
      const href = card.querySelector('a[href*="/video/"]')?.getAttribute('href') || '';
      const durationText = [...card.querySelectorAll(s.duration)].map(text).find(t => /^\d{1,3}:\d{2}(?::\d{2})?$/.test(t));
      const duration = durationText ? durationText.split(':').reduce((a, n) => a * 60 + Number(n), 0) : null;
      const author = card.querySelector('a[href*="space.bilibili.com"]')?.getAttribute('href')?.match(/space\.bilibili\.com\/(\d+)/)?.[1];
      return { type: 2, id: stableId(href.match(/\/av(\d+)/)?.[1]), bvid: href.match(/BV[0-9A-Za-z]{10}/)?.[0] || null, duration, upper: { mid: author } };
    });
    const next = pager?.querySelector(s.next);
    if (!medias.length && folder.count !== 0) throw new Error('网页视频条目未识别，不能将空页当成统计结果');
    return { info: { id, media_count: folder.count }, medias,
      has_more: !!next && !next.disabled && !/disabled/.test(next.className) };
  }
}
