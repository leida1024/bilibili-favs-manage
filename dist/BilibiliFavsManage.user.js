// ==UserScript==
// @name         Bilibili 收藏夹批量管理
// @namespace    http://tampermonkey.net/
// @version      2.2.13
// @description  批量复制 B 站收藏夹（复选框列表 + 跨页面流程 + 过滤"我追的"）
// @author       leida1024
// @match        https://space.bilibili.com/*
// @run-at       document-start
// @noframes
// @grant        unsafeWindow
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  /** 两版页面共用的输入框、提示和按钮文字；差异位于 core/adapters/。 */
  const SELECTORS = {
    CREATE_FAV_NAME_INPUT: 'input.add-fav-input'};

  const BUTTON_TEXTS = {
    BATCH_OPERATION: '批量操作',
    COPY_TO: '复制至',
    CREATE_NEW: '新建收藏夹',
    CREATE: '创建'
  };

  /**
   * DOM 操作工具函数
   */

  /**
   * 等待指定时间
   * @param {number} ms - 毫秒数
   * @returns {Promise<void>}
   */
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 等待元素出现
   * @param {string} selector - CSS 选择器
   * @param {number} timeout - 超时时间（毫秒）
   * @param {Element} parent - 父元素，默认为 document
   * @returns {Promise<Element|null>}
   */
  async function waitForElement(selector, timeout = 5000, parent = document, visible = false) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const el = Array.from(parent.querySelectorAll(selector)).find(el => !visible || isElementVisible(el));
      if (el) {
        return el;
      }
      await delay(100);
    }
    return null;
  }

  /**
   * 检查元素及其祖先是否隐藏，排除预渲染但尚未打开的弹窗。
   * @param {Element} element
   * @returns {boolean}
   */
  function isElementVisible(element) {
    for (let current = element; current; current = current.parentElement) {
      const style = window.getComputedStyle(current);
      if (current.hidden || style.display === 'none' || style.visibility === 'hidden') return false;
    }
    return element.isConnected;
  }

  /**
   * 通过文本内容查找按钮
   * @param {string} text - 按钮文本
   * @param {Element} parent - 父元素，默认为 document
   * @returns {HTMLButtonElement|null}
   */
  function findButtonByText(text, parent = document) {
    const buttons = parent.querySelectorAll('button');
    for (const btn of buttons) {
      if (btn.textContent.trim() === text) {
        return btn;
      }
    }
    return null;
  }

  /**
   * 获取元素文本内容
   * @param {string} selector - CSS 选择器
   * @param {Element} parent - 父元素，默认为 document
   * @returns {string}
   */
  function getElementText(selector, parent = document) {
    const el = parent.querySelector(selector);
    return el ? el.textContent.trim() : '';
  }

  /**
   * 日志工具
   * 支持同时输出到控制台和浮动面板
   */

  const LOG_PREFIX = '[BiliBili Favs]';

  // 全局面板引用（由 FloatingPanel 设置）
  let globalPanel = null;
  let globalStore = null;

  function setLoggerStore(store) { globalStore = store; }

  function record(args, level) {
    const message = args.map(value => value instanceof Error ? value.message : String(value)).join(' ');
    if (globalPanel) {
      globalPanel.appendLog(message, { info: globalPanel.normalCode, error: globalPanel.errorCode, warn: globalPanel.warnCode, debug: globalPanel.debugCode }[level]);
    } else globalStore?.add(message, level);
  }

  /**
   * 设置全局面板引用
   * @param {Object} panel - FloatingPanel 实例
   */
  function setLoggerPanel(panel) {
    globalPanel = panel;
  }

  /**
   * 输出普通日志
   * @param {...any} args - 日志内容
   */
  function log(...args) {
    console.log(LOG_PREFIX, ...args);
    record(args, 'info');
  }

  /**
   * 输出错误日志
   * @param {...any} args - 日志内容
   */
  function error(...args) {
    console.error(LOG_PREFIX, ...args);
    record(args, 'error');
  }

  /**
   * 输出警告日志
   * @param {...any} args - 日志内容
   */
  function warn(...args) {
    console.warn(LOG_PREFIX, ...args);
    record(args, 'warn');
  }

  /**
   * 输出调试日志
   * @param {...any} args - 日志内容
   */
  function debug(...args) {
    console.debug(LOG_PREFIX, ...args);
    record(args, 'debug');
  }

  /**
   * 应用配置
   */

  const CONFIG = {
    COPY_CONFIRMATION: { TIMEOUT: 30000, SLOW_NOTICE: 6000 },
    // 延迟时间（毫秒）
    DELAY: {
      SHORT: 500,
      MIDDLE: 1000,
      LONG: 2000,
      INPUT_CHAR: 50  // 输入每个字符的延迟
    },

    // 消息类型代码
    MESSAGE_TYPE: {
      ERROR: 0,
      NORMAL: 1,
      START_BATCH: 2,
      START_SINGLE: 3,
      END_SINGLE: 4,
      END_BATCH: 5,
      ONE_PAGE: 6,
      WARN: 7
    },

    // 浮动面板配置
    PANEL: {
      INITIAL_WIDTH: 600,
      INITIAL_HEIGHT: 500,
      INITIAL_TOP: 50,
      INITIAL_LEFT: 50,
      LEFT_WIDTH_PERCENT: '35%',
      RIGHT_WIDTH_PERCENT: '63%',
      MIN_OUTPUT_WIDTH: 300,
      RESIZE_BORDER_SIZE: 4,
      Z_INDEX: 99999
    },

    // 脚本信息
    SCRIPT: {
      VERSION: '2.2.13',
      NAME: 'BiliBili 收藏夹批量管理',
      DESCRIPTION: '适配旧版及新版 VUI 收藏夹页面'
    }
  };

  /** Native page controls, separate from HTTP transport and panel UI. */
  const nativeControls = {
    vui: {
      group: '.favlist-aside .vui_collapse_item', heading: '.vui_collapse_item_header',
      row: '.fav-sidebar-item', title: '.vui_ellipsis', click: '.vui_sidebar-item', more: '.fav-collapse-more',
      menu: '.menu-popover .more-vertical', menuItem: '.menu-popover__panel-item',
      detailTitle: '.favlist-info-detail__title-row', data: '.favlist-info-detail__data', owner: '.favlist-info-detail__data a.link',
      cards: '.favlist-main .bili-video-card', duration: '.bili-cover-card__stat',
      videoTitle: '.bili-video-card__title', videoAuthor: 'a.bili-video-card__author', unavailable: '.bili-video-card__title--disabled',
      search: '.fav-list-header-filter__search input, input.fav-list-header-filter__search', loading: '.favlist-main .vui_loading',
      dialog: '.vui_dialog--content', confirm: 'button.vui_button--blue',
      pagination: '.vui_pagenation', page: '.vui_pagenation--btn-num', activePage: '[aria-current="page"], .vui_button--active',
      next: 'button[aria-label="下一页"]'
    },
    legacy: {
      created: '#fav-createdList-container', subscribed: '#fav-list-container', row: '.fav-item',
      title: 'a.text', click: 'a.text', more: '.more', menu: '.be-dropdown', menuItem: '.be-dropdown-item',
      detailTitle: '.favInfo-details .fav-name', data: '.favInfo-details', owner: '.favInfo-details a[href*="space.bilibili.com"]',
      cards: '.fav-video-list .small-item', duration: '.length', dialog: '.modal', confirm: '.modal-footer .btn',
      videoTitle: 'a.title', videoAuthor: 'a.up-name, a[href*="space.bilibili.com"]', unavailable: '.disabled, .invalid',
      search: '.fav-search input', loading: '.fav-video-list .loading',
      pagination: '.be-pager', page: '.be-pager-item', activePage: '.be-pager-item-active', next: '.be-pager-next'
    }
  };

  /** 旧版个人空间（带“体验新版”入口）。 */
  const LegacyPageAdapter = {
    name: '旧版个人空间',
    nativeControls: nativeControls.legacy,
    notification: '.be-toast, .vui_toast, .bili-message, .bili-toast, .be-message, .toast-text',
    sidebar: '#fav-createdList-container',
    sidebarCreate: '#fav-createdList-container',
    sidebarCreateForm: {
      dialog: '.edit-media-list .edit-mask', input: '#media-list-name', confirm: '.submit-btn'
    },
    item: '.fav-item',
    title: 'a.text',
    itemLink: 'a.text',
    currentTitle: '.favInfo-details .fav-name',
    batchButton: '.fav-header .do-batch',
    selectAll: '.fav-action-bottom li:has(i[class*="icon-selece-all"])',
    selectedAll: '.icon-selece-all-active',
    copyButton: '.fav-action-bottom li:has(.icon-copy)',
    dialog: '.edit-video-modal',
    dialogItem: '.target-favitem',
    dialogTitle: '.fav-name',
    radio: '.fav-select',
    createButton: '.fake-fav-input',
    createConfirm: '.edit-video-modal .fav-add-btn',
    confirm: '.modal-footer .btn',
    cancel: '.modal-header-close',
    pagination: '.be-pager',
    next: '.be-pager-next',
    getFavorites() {
      return Array.from(document.querySelectorAll(`${this.sidebar} ${this.item}`));
    }
  };

  /** 新版 VUI 收藏夹页。 */
  const VuiPageAdapter = {
    name: '新版 (VUI)',
    nativeControls: nativeControls.vui,
    notification: '.vui_toast',
    sidebar: '.favlist-aside',
    sidebarCreate: '.favlist-aside',
    item: '.vui_sidebar-item',
    title: '.vui_sidebar-item-title .vui_ellipsis',
    itemLink: null,
    currentTitle: '.favlist-info-detail__title-row',
    batchButton: '.vui_button.favlist-info-batch',
    selectAll: '.vui_checkbox',
    selectedAll: '.vui_checkbox--checked, input:checked',
    copyButton: null,
    dialog: '.vui_dialog--content.fav-modify-modal-content',
    dialogItem: '.modify-fav-item',
    dialogTitle: '.modify-fav-item__title',
    radio: 'input[type="radio"].vui_radio--input-original',
    createButton: '.modify-fav-add',
    createConfirm: null,
    confirm: 'button.vui_button--blue',
    cancel: 'button:not(.vui_button--blue)',
    pagination: '.vui_pagenation',
    next: 'button',
    getFavorites() {
      const sidebar = document.querySelector(this.sidebar);
      if (!sidebar) return [];
      const items = Array.from(sidebar.querySelectorAll(this.item));
      const marker = text => Array.from(sidebar.querySelectorAll('*')).filter(
        el => el.textContent.trim() === text && !el.querySelector(this.item)
      ).pop();
      const follows = (a, b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
      const start = marker('我创建的收藏夹') || marker('TA创建的收藏夹');
      if (!start) {
        warn('未找到创建分组标记，使用侧栏收藏夹列表');
        return items;
      }
      const end = ['我追的合集/收藏夹', '其他收藏', 'TA追的合集/收藏夹']
        .map(marker).filter(el => el && follows(start, el))
        .sort((a, b) => follows(a, b) ? -1 : 1)[0];
      return items.filter(item => follows(start, item) && (!end || follows(item, end)));
    }
  };

  const PAGE_ADAPTERS = [VuiPageAdapter, LegacyPageAdapter];

  function getPageAdapter() {
    return PAGE_ADAPTERS.find(adapter => document.querySelector(adapter.sidebar)) || null;
  }

  /** 与页面显示一致地去掉首尾空白，保留名称内部的空格及连续空格。 */
  function normalizeFavoriteName(name) {
    return typeof name === 'string' ? name.trim() : '';
  }

  /** Display names are not identities; report collisions after the usual normalization. */
  function duplicateFavoriteNames(names) {
    const seen = new Set(), duplicates = new Set();
    for (const value of names) {
      const name = normalizeFavoriteName(value);
      if (name && seen.has(name)) duplicates.add(name);
      seen.add(name);
    }
    return duplicates;
  }

  /** Name-based copy cannot infer an intended ID, regardless of transport. */
  function assertUnambiguousFavoriteName(names, name) {
    if (duplicateFavoriteNames(names).has(normalizeFavoriteName(name)))
      throw new Error(`同名收藏夹 [${normalizeFavoriteName(name)}] 无法按名称确定复制对象，请先将相关收藏夹改为不同名称；不会按顺序选择或自动切换方式。`);
  }

  /** 在任何跳转或提交前检查整个任务列表；同时兼容旧版本保存的任务。 */
  function normalizeCopyTasks(tasks) {
    if (!Array.isArray(tasks)) throw new Error('复制任务必须是列表');
    const seen = new Set();
    return tasks.map(task => {
      if (!task || typeof task !== 'object' || Array.isArray(task)) throw new Error('复制任务格式无效');
      const source = normalizeFavoriteName(task.source);
      const target = normalizeFavoriteName(task.target);
      if (!source || !target) throw new Error('源收藏夹和目标收藏夹名称不能为空或仅包含空白');
      const pair = JSON.stringify([source, target]);
      if (seen.has(pair)) throw new Error('存在重复的来源与目标任务，请移除重复项');
      seen.add(pair);
      return { ...task, source, target };
    });
  }

  // Exact legacy $toast text and operation-success translations in the public
  // space bundles. Match the whole message: negative text containing “成功” must
  // never confirm a copy.
  const successTexts = new Set([
    '操作成功', '复制成功', '复制成功(ง •̀_•́)ง', 'Operation successful', '操作が成功しました', 'نجحت العملية',
    'Operación exitosa', 'Operasi berhasil', 'Operasi berjaya', 'Operação bem-sucedida',
    'Операция успешна', 'ดำเนินการสำเร็จ', 'İşlem başarılı', 'Thao tác thành công'
  ]);
  const messageOf = node => node.textContent.trim().replace(/[!！。.]+$/u, '').trim();

  /** Observe only notifications changed by the single pending native submission. */
  function watchCopyConfirmation(selector, timeout, onSlow, slowNotice) {
    const baseline = new Map([...document.querySelectorAll(selector)].map(node =>
      [node, { text: messageOf(node), visible: isElementVisible(node) }]));
    let settle, timer, slowTimer, done = false;
    const result = new Promise(resolve => { settle = resolve; });
    const finish = outcome => {
      if (done) return;
      done = true;
      observer.disconnect(); clearTimeout(timer); clearTimeout(slowTimer);
      settle(outcome);
    };
    const observer = new window.MutationObserver(records => {
      const candidates = new Set();
      for (const record of records) {
        const nodes = record.type === 'childList' ? [record.target, ...record.addedNodes] : [record.target];
        for (const node of nodes) {
          const el = node.nodeType === 1 ? node : node.parentElement;
          const parent = el?.closest(selector);
          if (parent) candidates.add(parent);
          // A whole wrapper may be inserted after its descendants are populated.
          if (record.type === 'attributes' || (record.type === 'childList' && node !== record.target))
            el?.querySelectorAll?.(selector).forEach(item => candidates.add(item));
        }
      }
      for (const node of candidates) {
        if (node.closest('.bili-favs-manage-panel, [aria-hidden="true"]') || !isElementVisible(node)) continue;
        const text = messageOf(node), before = baseline.get(node);
        if (before?.visible && before.text === text) continue;
        if (successTexts.has(text)) { finish({ status: 'confirmed', detail: '已观察到平台成功提示' }); return; }
        if (/失败|稍后再试|过于频繁|权限不足|无权限|\b(?:failed|error)\b/iu.test(text)) {
          finish({ status: 'failed', detail: `平台提示：${text}` }); return;
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ['class', 'style', 'hidden', 'aria-hidden'] });
    timer = setTimeout(() => finish({ status: 'unknown', detail: '复制已提交，但等待平台确认超时；内容可能已复制，请先核对目标收藏夹。' }), timeout);
    slowTimer = setTimeout(onSlow, slowNotice);
    return { result, cancel: () => finish({ status: 'unknown', detail: '复制提交过程已中断，请先核对目标收藏夹。' }) };
  }

  const stableId = value => /^(?:[1-9]\d*)$/.test(String(value)) && Number.isSafeInteger(Number(value)) ? String(value) : null;
  const knownCount = value => Number.isSafeInteger(value) && value >= 0 ? value : null;
  const folderKey = folder => `${folder.kind}:${folder.id}`;

  function normalizeFolder(raw, kind, index = 0, membership = false) {
    const id = stableId(raw.id);
    const ownerId = stableId(raw.upper?.mid ?? raw.mid);
    const protectionReason = kind !== 'created' ? null : index === 0 ? 'default' :
      [true, 1].includes(raw.is_kid_playlist) || (raw.type !== undefined && raw.type !== 11) ? 'special' :
        [false, 0].includes(raw.is_kid_playlist) ? null : 'unknown';
    return Object.freeze({ id, ownerId, kind: kind === 'created' ? 'created' : raw.type === 11 ? 'subscribed' : raw.type === 21 ? 'season' : 'unsupported',
      identityConflict: !!(stableId(raw.mid) && stableId(raw.upper?.mid) && stableId(raw.mid) !== stableId(raw.upper.mid)),
      name: typeof raw.title === 'string' ? raw.title : '（名称未知）', count: knownCount(raw.media_count),
      // Current API uses booleans; older responses used 0/1. Missing stays protected.
      protected: protectionReason !== null, protectionReason,
      available: (kind === 'created' ? raw.state === undefined || raw.state === 0 : raw.state === 0) &&
        !(stableId(raw.mid) && stableId(raw.upper?.mid) && stableId(raw.mid) !== stableId(raw.upper.mid)), subscribed: membership || raw.fav_state === 1 });
  }

  function pause(ms, signal) {
    return new Promise((resolve, reject) => {
      const abort = () => { clearTimeout(timer); reject(new DOMException('已取消', 'AbortError')); };
      const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, ms);
      if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, { once: true });
    });
  }

  class FolderClient {
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
      const path = action === 'delete' ? '/x/v3/fav/folder/del' : folder.kind === 'season' ?
        `/x/v3/fav/season/unfav?${new URLSearchParams({ season_id: folder.id, platform: 'web' })}` : `/x/v3/fav/folder/unfav?${new URLSearchParams({ media_id: folder.id })}`;
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
      let expected = null;
      for (let pn = 1; pn <= 100; pn++) {
        if (pn > 1) await pause(pace, signal);
        const data = await this.request('/x/v3/fav/folder/collected/list', { up_mid: ownerId, pn, ps: 20, platform: 'web' }, signal);
        if (data.count === 0 && data.list === null && data.has_more === false) data.list = [];
        if (!Array.isArray(data.list) || typeof data.has_more !== 'boolean') throw new Error('订阅列表格式未识别');
        if (knownCount(data.count) === null || (expected !== null && expected !== data.count)) throw new Error('订阅总数未知或读取期间变化');
        expected = data.count;
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
      const result = rows.map((row, index) => normalizeFolder(row, kind, index, kind === 'subscribed'));
      if (result.some(row => !row.id) || new Set(result.map(folderKey)).size !== result.length) throw new Error('收藏夹身份缺失或重复');
      return result;
    }

    async videos(folderId, pn, signal, folder) {
      if (!stableId(folderId)) throw new Error('收藏夹 ID 无效');
      if (folder?.kind === 'season') {
        if (pn !== 1) throw new Error('合集列表未完整返回，不重复请求同一完整列表');
        const data = await this.request('/x/space/fav/season/list', { season_id: folderId, pn, ps: 20 }, signal);
        const count = knownCount(data.info?.media_count);
        if (!Array.isArray(data.medias) || count === null || stableId(data.info?.id) !== folderId) throw new Error('合集分页格式未识别');
        // This endpoint returns the whole season and ignores pn/ps; count mismatch stays partial.
        return { ...data, medias: data.medias.map(row => ({ ...row, type: 2 })), has_more: false };
      }
      const data = await this.request('/x/v3/fav/resource/list', { media_id: folderId, pn, ps: 20, platform: 'web' }, signal);
      if (data.medias === null && data.info?.media_count === 0 && data.has_more === false) data.medias = [];
      return data;
    }

    async post(path, values, signal) {
      if (signal?.aborted) return { status: 'not_started', detail: '已取消，未提交' };
      const csrf = document.cookie.split(';').map(x => x.trim()).find(x => x.startsWith('bili_jct='))?.slice(9);
      if (!csrf) return { status: 'failed', detail: '登录校验缺失，未提交' };
      try {
        const json = await this.fetchJSON(path, { method: 'POST', body: new URLSearchParams({ ...values, csrf, platform: 'web' }) }, signal);
        if (!Number.isInteger(json?.code)) return { status: 'unknown', detail: '响应未识别，请核对结果，勿直接重试' };
        return json.code === 0 ? { status: 'confirmed', detail: '平台已确认', data: json.data } : { status: 'failed', detail: `平台拒绝（代码 ${json.code}）` };
      } catch { return { status: 'unknown', detail: '提交后结果未知，请核对结果，勿直接重试' }; }
    }
    create(name, signal) { return this.post('/x/v3/fav/folder/add', { title: name, intro: '', privacy: '1', cover: '' }, signal); }
    copy(source, target, resources, actor, signal) {
      if (!stableId(source.id) || !stableId(target.id) || !stableId(actor) || !resources.length || resources.length > 20 || resources.some(id => !stableId(id)))
        return Promise.resolve({ status: 'failed', detail: '复制身份或批次无效，未提交' });
      return this.post('/x/v3/fav/resource/copy', { src_media_id: source.id, tar_media_id: target.id, mid: actor, resources: resources.map(id => `${id}:2`).join(',') }, signal);
    }
  }

  const text$2 = node => node?.textContent.trim() || '';
  const nativeControlEnabled = node => !!node && !node.disabled && node.getAttribute('aria-disabled') !== 'true' && !/disabled/.test(node.className);
  const currentNativePage = selectors => Number(text$2(document.querySelector(selectors.pagination)?.querySelector(selectors.activePage))) || 1;
  function nativePageSnapshot(selectors) {
    const cards = [...document.querySelectorAll(selectors.cards)];
    return { first: cards[0], signature: cards.map(card => card.querySelector('a[href*="/video/"]')?.getAttribute('href') || text$2(card)).join('|') };
  }
  function nativePageCount(selectors) {
    const pager = document.querySelector(selectors.pagination);
    if (!pager) return 1;
    const explicit = text$2(pager).match(/共\s*(\d+)\s*页/);
    const numbers = [...pager.querySelectorAll(selectors.page)].map(node => Number(text$2(node))).filter(n => Number.isSafeInteger(n) && n > 0);
    const count = explicit ? Number(explicit[1]) : Math.max(0, ...numbers);
    if (!Number.isSafeInteger(count) || count < currentNativePage(selectors)) throw new Error('网页总页数未识别，未将部分内容当作完整任务');
    return count;
  }
  async function waitNativePage(selectors, pn, { guard = () => {}, ready = () => true, before, signal, wait } = {}) {
    let signature = null, stableSince = Date.now();
    const check = () => {
      if (signal?.aborted) throw new DOMException('已取消', 'AbortError');
      guard();
      if (currentNativePage(selectors) !== pn || !ready() || (selectors.loading && document.querySelector(selectors.loading))) return false;
      const current = nativePageSnapshot(selectors).signature;
      if (before && current === before.signature && before.first?.isConnected) return false;
      if (current !== signature) { signature = current; stableSince = Date.now(); return false; }
      return Date.now() - stableSince >= 240;
    };
    if (wait) return wait(check, signal);
    const deadline = Date.now() + 8000;
    do { if (check()) return; await pause(80, signal); } while (Date.now() < deadline);
    throw new Error('网页翻页后内容未确认，已停止后续操作');
  }
  async function goNativePage(selectors, pn, options = {}) {
    if (options.signal?.aborted) throw new DOMException('已取消', 'AbortError');
    options.guard?.();
    const current = currentNativePage(selectors);
    if (current === pn) return waitNativePage(selectors, pn, options);
    if (pn !== 1 && pn !== current + 1) throw new Error('网页页码未连续推进，请重新开始');
    const pager = document.querySelector(selectors.pagination);
    const button = [...(pager?.querySelectorAll(selectors.page) || [])].find(node => text$2(node) === String(pn)) || (pn === current + 1 ? pager?.querySelector(selectors.next) : null);
    if (!nativeControlEnabled(button)) throw new Error('网页页码入口不可用，未继续处理');
    const before = nativePageSnapshot(selectors);
    button.click();
    await waitNativePage(selectors, pn, { ...options, before });
  }

  /**
   * B 站收藏夹页面 API 封装
   * 封装所有与 B 站页面 DOM 交互的操作
   */


  const pageAdapter = () => getPageAdapter() || VuiPageAdapter;

  class BilibiliAPI {
    /**
     * 检测页面版本
     * @returns {boolean} 是否为支持的页面版本
     */
    static detectPageVersion() {
      const adapter = getPageAdapter();
      log('页面版本:', adapter?.name || '未知版本');
      return !!adapter;
    }

    static getAllFavorites() {
      return this.getCreatedFavorites();
    }

    static getCreatedFavorites() {
      return getPageAdapter()?.getFavorites() || [];
    }

    /**
     * 从收藏夹项中提取名称
     * @param {Element} favItem - 收藏夹项元素
     * @returns {string} 收藏夹名称
     */
    static getFavoriteName(favItem) {
      const titleEl = favItem.querySelector(pageAdapter().title);
      return normalizeFavoriteName(titleEl?.textContent);
    }

    /**
     * 获取当前收藏夹名称
     * @returns {string|null} 当前收藏夹名称，如果找不到则返回 null
     */
    static getCurrentFavoriteName() {
      const titleEl = document.querySelector(pageAdapter().currentTitle);
      if (!titleEl) {
        error('无法获取当前收藏夹名称');
        return null;
      }
      return normalizeFavoriteName(titleEl.textContent);
    }

    /**
     * 获取总页数
     * @returns {number} 总页数
     */
    static getTotalPages() {
      return nativePageCount(pageAdapter().nativeControls);
    }

    static getCopyPageSnapshot() { return nativePageSnapshot(pageAdapter().nativeControls); }

    static async prepareCopyPages(guard, before) {
      await goNativePage(pageAdapter().nativeControls, 1, { guard, before });
      return this.getTotalPages();
    }

    /**
     * 点击批量操作按钮
     * @returns {Promise<boolean>} 是否成功
     */
    static async clickBatchOperationButton() {
      const button = document.querySelector(pageAdapter().batchButton);
      if (!button || button.textContent.trim() !== BUTTON_TEXTS.BATCH_OPERATION) {
        error('找不到批量操作按钮或按钮文本不匹配');
        return false;
      }

      debug('点击批量操作按钮');
      button.click();
      await delay(CONFIG.DELAY.SHORT);
      return true;
    }

    /**
     * 点击全选按钮
     * @returns {boolean} 是否成功
     */
    static clickSelectAll() {
      const checkbox = Array.from(document.querySelectorAll(pageAdapter().selectAll)).find(isElementVisible);
      if (!checkbox) {
        error('找不到全选按钮');
        return false;
      }

      debug('全选当前页');
      const selected = checkbox.matches(pageAdapter().selectedAll) ||
        checkbox.querySelector(pageAdapter().selectedAll);
      if (!selected) checkbox.click();
      return true;
    }

    /**
     * 点击复制按钮
     * @returns {Promise<boolean>} 是否成功
     */
    static async clickCopyButton() {
      const copyBtn = (getPageAdapter()?.copyButton && document.querySelector(getPageAdapter().copyButton)) ||
        findButtonByText(BUTTON_TEXTS.COPY_TO);
      if (!copyBtn) {
        error('找不到复制至按钮');
        return false;
      }

      debug('点击复制至按钮');
      copyBtn.click();
      await delay(CONFIG.DELAY.SHORT);
      return true;
    }

    /**
     * 等待对话框出现
     * @returns {Promise<Element|null>} 对话框元素
     */
    static async waitForDialog() {
      return await waitForElement(pageAdapter().dialog, 3000, document, true);
    }

    /**
     * 获取对话框中的收藏夹列表
     * @param {Element} dialog - 对话框元素
     * @returns {Array<{element: Element, name: string}>} 收藏夹列表
     */
    static getFavoriteListInDialog(dialog) {
      const items = dialog.querySelectorAll(pageAdapter().dialogItem);
      return Array.from(items).map(item => ({
        element: item,
        name: getElementText(pageAdapter().dialogTitle, item)
      }));
    }

    /**
     * 在对话框中选择收藏夹
     * @param {Element} dialog - 对话框元素
     * @param {string} favName - 收藏夹名称
     * @returns {boolean} 是否成功
     */
    static selectFavoriteInDialog(dialog, favName) {
      favName = normalizeFavoriteName(favName);
      if (!favName) return false;
      const favList = this.getFavoriteListInDialog(dialog);
      assertUnambiguousFavoriteName(favList.map(fav => fav.name), favName);

      for (const fav of favList) {
        if (fav.name === favName) {
          debug(`找到目标收藏夹：[${favName}]`);
          const radio = fav.element.querySelector(pageAdapter().radio);
          if (radio) {
            radio.click();
            return true;
          }
        }
      }

      warn(`未找到收藏夹 [${favName}]`);
      return false;
    }

    /**
     * 点击新建收藏夹按钮
     * @param {Element} dialog - 对话框元素
     * @returns {Promise<boolean>} 是否成功
     */
    static async clickCreateFavoriteButton(dialog) {
      const createBtn = dialog.querySelector(pageAdapter().createButton);
      if (!createBtn) {
        error('找不到新建收藏夹按钮');
        return false;
      }

      debug('点击新建收藏夹按钮');
      createBtn.click();
      await delay(CONFIG.DELAY.MIDDLE);
      return true;
    }

    /**
     * 输入收藏夹名称（完整的事件链）
     * @param {string} name - 收藏夹名称
     * @param {HTMLInputElement|null} input - 已核对的表单输入框；省略时使用复制弹窗输入框
     * @returns {Promise<boolean>} 是否成功
     */
    static async inputFavoriteName(name, input = null) {
      name = normalizeFavoriteName(name);
      if (!name) return false;
      const nameInput = input || Array.from(document.querySelectorAll(SELECTORS.CREATE_FAV_NAME_INPUT)).find(isElementVisible);
      if (!nameInput || !isElementVisible(nameInput)) {
        error('找不到名称输入框');
        return false;
      }

      debug('输入新收藏夹名称:', name);

      // 模拟真实输入
      nameInput.focus();
      nameInput.value = '';
      nameInput.dispatchEvent(new Event('focus', { bubbles: true }));

      for (let i = 0; i < name.length; i++) {
        const char = name[i];
        nameInput.value += char;
        nameInput.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        nameInput.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
        await delay(CONFIG.DELAY.INPUT_CHAR);
      }

      nameInput.dispatchEvent(new Event('change', { bubbles: true }));
      nameInput.dispatchEvent(new Event('blur', { bubbles: true }));

      await delay(CONFIG.DELAY.SHORT);
      return true;
    }

    /**
     * 点击创建按钮
     * @param {Element|null} button - 已核对的表单提交按钮；省略时使用原创建入口
     * @returns {Promise<boolean>} 是否成功
     */
    static async clickCreateButton(button = null) {
      const createConfirmBtn = button || (getPageAdapter()?.createConfirm && document.querySelector(getPageAdapter().createConfirm)) ||
        findButtonByText(BUTTON_TEXTS.CREATE);

      if (!createConfirmBtn || !isElementVisible(createConfirmBtn) || createConfirmBtn.disabled || createConfirmBtn.getAttribute('aria-disabled') === 'true') {
        error('创建按钮不可用');
        return false;
      }

      debug('点击创建按钮');
      createConfirmBtn.click();
      await delay(CONFIG.DELAY.MIDDLE);
      return true;
    }

    /**
     * 通过左侧边栏原生"新建收藏夹"入口创建收藏夹
     * 仅入口不存在时返回 null，允许调用方使用复制对话框。
     * 一旦尝试打开入口，失败或结果未确认均返回 false，禁止再次提交。
     * @param {string} favName - 收藏夹名称
     * @returns {Promise<boolean|null>}
     */
    static async createFavoriteViaSidebar(favName, guard = () => true) {
      favName = normalizeFavoriteName(favName);
      if (!favName) return false;
      assertUnambiguousFavoriteName(this.getAllFavorites().map(item => this.getFavoriteName(item)), favName);
      if (this.getAllFavorites().some(item => this.getFavoriteName(item) === favName)) return true;
      const adapter = pageAdapter(), selector = adapter.sidebarCreate;
      const sidebar = selector && document.querySelector(selector);
      if (!sidebar) return null;

      // 文本精确为"新建收藏夹"的叶子元素即入口
      const entry = Array.from(sidebar.querySelectorAll('*')).find(
        el => el.children.length === 0 &&
              el.textContent.trim() === BUTTON_TEXTS.CREATE_NEW && isElementVisible(el)
      );
      if (!entry) {
        warn('侧边栏未找到"新建收藏夹"入口');
        return null;
      }

      const form = adapter.sidebarCreateForm;
      if (form && [...document.querySelectorAll(form.dialog)].some(isElementVisible)) {
        warn('已有收藏夹编辑窗口，请先关闭后重新开始；尚未提交');
        return false;
      }
      if (!guard()) return false;

      debug('点击左侧边栏[新建收藏夹]');
      const clickable = entry.closest(
        'button, [role="button"], [class*="add"], [class*="create"], [class*="btn"]'
      ) || entry;
      clickable.click();
      await delay(CONFIG.DELAY.SHORT);

      // Legacy opens an independent Edit form; its controls differ from the
      // copy dialog. Scope both controls to that visible form before submitting.
      const parent = form ? await waitForElement(form.dialog, 3000, document, true) : document;
      const input = parent && await waitForElement(form?.input || SELECTORS.CREATE_FAV_NAME_INPUT, 3000, parent, true);
      if (!input) {
        warn('点击"新建收藏夹"后未出现名称输入框');
        return false;
      }

      // 输入名称并点击创建
      if (!await this.inputFavoriteName(favName, input)) return false;
      if (!guard()) return false;
      let submit = null;
      if (form) {
        const controls = [...parent.querySelectorAll(form.confirm)].filter(isElementVisible);
        if (controls.length !== 1) { error('新建表单的提交按钮未确认，已停止'); return false; }
        submit = controls[0];
      }
      if (!await this.clickCreateButton(submit)) return false;

      const confirmed = await this.waitForFavorite(favName);
      if (!confirmed) error(`未确认收藏夹 [${favName}] 创建成功，已停止，请检查页面结果`);
      return confirmed;
    }

    /** 等待列表确认创建结果；每次重新查找弹窗，兼容组件整体重渲染。 */
    static async waitForFavorite(favName, inDialog = false, timeout = 5000) {
      favName = normalizeFavoriteName(favName);
      if (!favName) return false;
      const deadline = Date.now() + timeout;
      do {
        if (inDialog) {
          const dialog = Array.from(document.querySelectorAll(pageAdapter().dialog)).find(isElementVisible);
          if (dialog && this.isFavoriteExistInDialog(dialog, favName)) return true;
        } else if (this.getAllFavorites().some(item => this.getFavoriteName(item) === favName)) {
          return true;
        }
        if (Date.now() >= deadline) return false;
        await delay(100);
      } while (true);
    }

    static closeDialog(dialog) {
      dialog.querySelector(pageAdapter().cancel)?.click();
    }

    /**
     * 点击确定按钮
     * @param {Element} dialog - 对话框元素
     * @returns {Promise<boolean>} 是否成功
     */
    static async clickConfirmButton(dialog) {
      this.copySubmission = { status: 'not_started', detail: '尚未提交复制' };
      const confirmBtn = dialog.querySelector(pageAdapter().confirm);
      if (!confirmBtn || confirmBtn.disabled) {
        error('找不到确定按钮');
        return false;
      }

      debug('点击确定');
      const watcher = watchCopyConfirmation(pageAdapter().notification, CONFIG.COPY_CONFIRMATION.TIMEOUT,
        () => log('已提交复制，平台响应较慢，仍在等待确认，请勿重复点击。'), CONFIG.COPY_CONFIRMATION.SLOW_NOTICE);
      this.copySubmission = { status: 'unknown', detail: '复制已提交，正在等待平台确认。' };
      try {
        confirmBtn.click();
        this.copySubmission = await watcher.result;
      } catch (err) {
        err.outcome = 'unknown'; throw err;
      } finally { watcher.cancel(); }
      if (this.copySubmission.status === 'confirmed') {
        log('✓ 复制成功');
        return true;
      } else if (this.copySubmission.status === 'failed') {
        error(this.copySubmission.detail);
      } else {
        warn(this.copySubmission.detail);
      }

      return false;
    }

    /**
     * 点击下一页按钮
     * @returns {Promise<boolean>} 是否成功
     */
    static async clickNextPage(guard = () => {}) {
      const controls = pageAdapter().nativeControls;
      const next = document.querySelector(controls.pagination)?.querySelector(controls.next);
      if (!nativeControlEnabled(next)) { log('已到最后一页或找不到下一页按钮'); return false; }
      log('点击下一页');
      await goNativePage(controls, currentNativePage(controls) + 1, { guard });
      return true;
    }

    /**
     * 点击指定的收藏夹
     * @param {string} favName - 收藏夹名称
     * @returns {Promise<boolean>} 是否成功
     */
    static async clickFavorite(favName) {
      favName = normalizeFavoriteName(favName);
      if (!favName) return false;
      const allFavs = this.getAllFavorites();
      assertUnambiguousFavoriteName(allFavs.map(fav => this.getFavoriteName(fav)), favName);

      for (const favItem of allFavs) {
        const name = this.getFavoriteName(favItem);
        if (name === favName) {
          debug(`点击收藏夹：[${favName}]`);
          const link = pageAdapter().itemLink;
          (link ? favItem.querySelector(link) || favItem : favItem).click();
          await delay(CONFIG.DELAY.SHORT);
          return true;
        }
      }

      error(`找不到收藏夹：[${favName}]`);
      return false;
    }

    /**
     * 检查批量模式是否激活
     * @returns {boolean}
     */
    static isBatchModeActive() {
      return Array.from(document.querySelectorAll(pageAdapter().selectAll)).some(isElementVisible);
    }

    /**
     * 确保批量模式激活
     * @returns {Promise<boolean>}
     */
    static async ensureBatchModeActive() {
      if (this.isBatchModeActive()) {
        debug('批量模式已激活');
        return true;
      }

      debug('批量模式已退出，重新进入');
      return await this.clickBatchOperationButton();
    }

    /**
     * 检查目标收藏夹是否存在（在对话框中）
     * @param {Element} dialog - 对话框
     * @param {string} favName - 收藏夹名称
     * @returns {boolean}
     */
    static isFavoriteExistInDialog(dialog, favName) {
      favName = normalizeFavoriteName(favName);
      if (!favName) return false;
      const favList = this.getFavoriteListInDialog(dialog);
      return favList.some(fav => fav.name === favName);
    }
  }

  /**
   * 页面类型检测工具
   * 用于判断当前是否在用户自己的收藏夹页面
   */

  class PageDetector {
    /**
     * 获取当前页面的用户 UID
     * @returns {string|null}
     */
    static getCurrentPageUID() {
      const match = window.location.pathname.match(/^\/(\d+)\/favlist(?:\/|$)/);
      return match ? match[1] : null;
    }

    /**
     * 获取登录用户的 UID
     * @returns {string|null}
     */
    static getLoginUserUID() {
      // 方案 1: 从 Cookie 获取
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [key, value] = cookie.trim().split('=');
        if (key === 'DedeUserID') {
          return stableId(value);
        }
      }

      // __INITIAL_STATE__.mid identifies the visited profile, not the actor.
      return null;
    }

    /**
     * 检测当前页面是否为用户自己的页面
     * @returns {boolean}
     */
    static isOwnPage() {
      const pageUID = this.getCurrentPageUID();
      const loginUID = this.getLoginUserUID();

      if (!pageUID || !loginUID) {
        return false;
      }

      return pageUID === loginUID;
    }

    /**
     * 生成用户自己的收藏夹页面 URL
     * @returns {string|null}
     */
    static getOwnFavListURL() {
      const loginUID = this.getLoginUserUID();
      return loginUID ? `https://space.bilibili.com/${loginUID}/favlist` : null;
    }
  }

  /**
   * 跨页面状态管理器
   * 使用 GM_setValue/GM_getValue 持久化状态
   */

  const STATE_KEY = 'bilibili_fav_cross_page_state';
  const STATE_EXPIRE_TIME = 30 * 60 * 1000; // 30 分钟

  class StateManager {
    /**
     * 保存跨页面状态
     * @param {Object} state - 状态对象
     */
    static saveState(state) {
      const data = {
        ...state,
        timestamp: Date.now()
      };

      // 如果 GM_setValue 可用，使用 GM API；否则使用 localStorage
      if (typeof GM_setValue !== 'undefined') {
        GM_setValue(STATE_KEY, JSON.stringify(data));
      } else {
        localStorage.setItem(STATE_KEY, JSON.stringify(data));
      }
    }

    /**
     * 加载跨页面状态
     * @returns {Object|null}
     */
    static loadState() {
      let dataStr = null;

      // 尝试从 GM API 读取
      if (typeof GM_getValue !== 'undefined') {
        dataStr = GM_getValue(STATE_KEY, null);
      } else {
        dataStr = localStorage.getItem(STATE_KEY);
      }

      if (!dataStr) return null;

      try {
        const state = JSON.parse(dataStr);

        // 检查是否过期
        if (Date.now() - state.timestamp > STATE_EXPIRE_TIME) {
          this.clearState();
          return null;
        }

        return state;
      } catch (e) {
        console.error('[StateManager] 解析状态失败:', e);
        return null;
      }
    }

    /**
     * 清除跨页面状态
     */
    static clearState() {
      if (typeof GM_deleteValue !== 'undefined') {
        GM_deleteValue(STATE_KEY);
      } else {
        localStorage.removeItem(STATE_KEY);
      }
    }

    /**
     * 检查状态是否存在
     * @returns {boolean}
     */
    static hasState() {
      return this.loadState() !== null;
    }
  }

  const currentCopyContext = () => ({ actor: PageDetector.getLoginUserUID(), pageOwner: PageDetector.getCurrentPageUID() });

  function copyBlockReason({ actor, pageOwner }) {
    if (!stableId(actor)) return '请先登录 B 站，再复制他人的收藏夹。';
    if (!stableId(pageOwner)) return '请打开他人的收藏夹页面后复制。';
    if (actor === pageOwner) return '当前是我的空间；复制请前往他人的收藏夹页面，统计和管理可正常使用。';
    return '';
  }

  function assertCopyContext(expected = currentCopyContext(), current = currentCopyContext()) {
    const reason = copyBlockReason(current);
    if (reason) throw new Error(reason);
    if (current.actor !== expected.actor || current.pageOwner !== expected.pageOwner)
      throw new Error('账号或来源空间已变化，未继续复制。请重新选择任务。');
    return expected;
  }

  /** Structured diagnostics only: never interpreted as executable state. */
  function sanitizeLog(value) {
    return String(value)
      .replace(/https?:\/\/[^\s<>]+/gi, '[URL omitted]')
      .replace(/((?:cookie|authorization|bearer|token|csrf|bili_jct|sessdata|password|secret)\s*[=:]?\s*)[^\s,;]+/gi, '$1[redacted]')
      .slice(0, 2000);
  }

  const newOperationId = () => globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const identifier = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value) ? value : '';
  const views = ['copy', 'statistics', 'manage', 'system'];
  const contextOf = context => ({
    view: views.includes(context?.view) ? context.view : 'system',
    operationId: identifier(context?.operationId),
    phase: identifier(context?.phase)
  });

  class LogStore {
    constructor(limit = 500, storage = null) {
      this.limit = Math.max(1, limit);
      this.entries = [];
      this.dropped = 0;
      this.clearedAt = 0;
      this.context = contextOf();
      this.storage = storage;
      try { if (storage) this.restore(storage.read()); } catch { /* memory-only */ }
    }

    setContext(context) { this.context = contextOf(context); }

    add(message, level = 'info', context = this.context) {
      this.entries.push({ id: newOperationId(), time: new Date(Math.max(Date.now(), this.clearedAt + 1)).toISOString(),
        level: ['info', 'warn', 'error', 'debug'].includes(level) ? level : 'info',
        ...contextOf(context), message: sanitizeLog(message).trim() });
      this.trim();
      this.persist();
    }

    trim() {
      while (this.entries.length > this.limit) { this.entries.shift(); this.dropped++; }
    }

    persist() { try { this.storage?.write(this.snapshot()); } catch { /* diagnostics stay usable */ } }
    clear() { this.entries = []; this.dropped = 0; this.clearedAt = Date.now(); this.persist(); }
    filter(level = 'all', view = 'all') {
      return this.entries.filter(entry => (level === 'all' || (level === 'normal' ? entry.level !== 'debug' : entry.level === level)) &&
        (view === 'all' || entry.view === view || entry.view === 'system'));
    }
    snapshot(operationId) {
      return { schemaVersion: 2, dropped: this.dropped, clearedAt: this.clearedAt,
        entries: this.entries.filter(entry => !operationId || entry.operationId === operationId).map(entry => ({ ...entry })) };
    }
    restore(snapshot) {
      if (snapshot?.schemaVersion !== 2 || !Array.isArray(snapshot.entries)) return;
      const clearedAt = Number.isSafeInteger(snapshot.clearedAt) && snapshot.clearedAt >= 0 && snapshot.clearedAt <= Date.now() ? snapshot.clearedAt : 0;
      if (clearedAt > this.clearedAt) this.dropped = 0;
      this.clearedAt = Math.max(this.clearedAt, clearedAt);
      const entries = new Map(this.entries.filter(entry => Date.parse(entry.time) > this.clearedAt).map(entry => [entry.id, entry]));
      for (const raw of snapshot.entries.slice(-this.limit)) {
        if (!identifier(raw?.id) || typeof raw.time !== 'string' || !Number.isFinite(Date.parse(raw.time)) ||
            typeof raw.message !== 'string' || !['info', 'warn', 'error', 'debug'].includes(raw.level) || Date.parse(raw.time) <= this.clearedAt) continue;
        entries.set(raw.id, { id: raw.id, time: new Date(raw.time).toISOString(), level: raw.level,
          ...contextOf(raw), message: sanitizeLog(raw.message) });
      }
      this.entries = [...entries.values()].sort((a, b) => a.time.localeCompare(b.time));
      if (clearedAt === this.clearedAt) this.dropped = Math.max(this.dropped, Number.isSafeInteger(snapshot.dropped) && snapshot.dropped >= 0 ? snapshot.dropped : 0);
      this.trim();
      this.persist();
    }
    export() { return JSON.stringify(this.snapshot(), null, 2); }
  }

  /**
   * 跨页面流程管理器
   * 处理跨页面创建收藏夹的完整流程
   */


  class CrossPageFlowManager {
    constructor(manager) {
      this.manager = manager;
    }

    /**
     * 开始跨页面流程：保存状态并跳转到自己页面
     *
     * 注意：此时处于「他人页面」，无法在此判断「自己」缺哪些收藏夹
     * （`getAllFavoriteNames()` 此处取到的是对方的收藏夹）。因此本方法
     * 不做缺失对比，缺失对比延后到 `resumeFlow()` 的 creating 阶段（自己页面）。
     * @param {Array<{source: string, target: string}>} tasks - 复制任务列表
     * @returns {Promise<void>}
     */
    async startCrossPageFlow(tasks) {
      tasks = normalizeCopyTasks(tasks);
      if (!tasks.length) throw new Error('请至少选择一个来源收藏夹');
      const expected = assertCopyContext();
      const returnURL = window.location.href;
      // 跳转到自己的收藏夹页面
      const ownURL = PageDetector.getOwnFavListURL();
      const actorId = PageDetector.getLoginUserUID();
      if (!ownURL) {
        error('无法获取用户自己的收藏夹页面 URL');
        throw new Error('无法确认登录身份，请登录后再复制');
      }

      this.manager.operation.update({ phase: 'creating', detail: '即将前往我的空间，检查并准备目标收藏夹。' });
      this.manager.logs.setContext({ view: 'copy', operationId: this.manager.operation.state.operationId, phase: 'creating' });
      log('3 秒后前往我的空间准备目标，随后返回来源继续复制。');
      await delay(3000);
      assertCopyContext(expected);
      if (window.location.href !== returnURL) throw new Error('来源页面已变化，跨页任务未交接。');
      this.manager.operation.finish('waiting', '已交接跨页任务，等待目的页面继续。');
      StateManager.saveState({
        phase: 'creating', returnURL, tasks, actorId,
        operationId: this.manager.operation.state.operationId,
        journal: this.manager.logs.snapshot()
      });

      window.location.href = ownURL;
    }

    /**
     * 在自己页面批量创建收藏夹
     * @param {Array<string>} favNames - 收藏夹名称列表
     * @returns {Promise<boolean>}
     */
    async batchCreateFavorites(favNames, check = () => {}) {
      favNames = [...new Set(favNames.map(normalizeFavoriteName))];
      if (favNames.some(name => !name)) return false;
      log('开始批量创建收藏夹');
      log(`共 ${favNames.length} 个: ${favNames.join(', ')}`);

      for (let i = 0; i < favNames.length; i++) {
        const favName = favNames[i];
        log(`[${i + 1}/${favNames.length}] 创建收藏夹: ${favName}`);

        check();
        const success = await this.createSingleFavorite(favName, check);
        check();
        if (!success) {
          error(`创建收藏夹 [${favName}] 失败`);
          return false;
        }

        // 创建间隔延迟
        if (i < favNames.length - 1) {
          await delay(CONFIG.DELAY.MIDDLE);
        }
      }

      log('✓ 批量创建完成!');
      return true;
    }

    /**
     * 创建单个收藏夹：仅侧栏入口不存在时回退，结果未确认时停止。
     * @param {string} favName - 收藏夹名称
     * @returns {Promise<boolean>}
     */
    async createSingleFavorite(favName, check = () => {}) {
      favName = normalizeFavoriteName(favName);
      if (!favName) return false;
      assertUnambiguousFavoriteName(this.manager.getAllFavoriteNames(), favName);
      if (this.manager.getAllFavoriteNames().map(normalizeFavoriteName).includes(favName)) return true;
      // 优先：左侧边栏原生"新建收藏夹"入口（最简，无需批量模式/复制对话框）
      const result = await BilibiliAPI.createFavoriteViaSidebar(favName, () => { check(); return true; });
      if (result === true) {
        log(`✓ 创建收藏夹 [${favName}] 成功（侧边栏入口）`);
        return true;
      }
      if (result !== null) return false;

      // Only a missing sidebar entry permits the copy-dialog alternative.
      log('未找到左侧“新建收藏夹”，尝试通过复制弹窗新建（需要可选视频）');
      return await this.createViaCopyDialog(favName, check);
    }

    /**
     * 通过批量模式复制对话框创建收藏夹（需可选视频的备用入口）
     * @param {string} favName - 收藏夹名称
     * @returns {Promise<boolean>}
     */
    async createViaCopyDialog(favName, check = () => {}) {
      // 1. 打开第一个收藏夹；空收藏夹可能没有可选视频。
      const allFavs = BilibiliAPI.getAllFavorites();
      if (allFavs.length === 0) {
        error('找不到任何收藏夹');
        return false;
      }

      await BilibiliAPI.clickFavorite(BilibiliAPI.getFavoriteName(allFavs[0]));
      await delay(CONFIG.DELAY.MIDDLE);

      // 2. 进入批量操作模式
      const batchSuccess = await BilibiliAPI.ensureBatchModeActive();
      if (!batchSuccess) {
        error('当前收藏夹无法进入批量模式。复制弹窗新建需要可选视频；请先在自己的空间手动新建目标收藏夹，再重新开始。');
        return false;
      }

      // 3. 全选当前页视频（否则"复制至"按钮不可用，对话框不会弹出）
      if (!BilibiliAPI.clickSelectAll()) {
        error('当前页没有可选视频，无法通过复制弹窗新建。请先在自己的空间手动新建目标收藏夹，再重新开始。');
        return false;
      }
      await delay(CONFIG.DELAY.SHORT);

      // 4. 点击复制按钮打开对话框
      if (!await BilibiliAPI.clickCopyButton()) {
        return false;
      }

      // 4. 等待对话框
      const dialog = await BilibiliAPI.waitForDialog();
      if (!dialog) {
        error('对话框未出现');
        return false;
      }

      // 5. 创建新收藏夹
      const createSuccess = await this.manager.createNewFavorite(dialog, favName, check);
      if (!createSuccess) {
        // 关闭对话框
        BilibiliAPI.closeDialog(dialog);
        return false;
      }

      // 6. 关闭对话框
      await delay(CONFIG.DELAY.SHORT);
      const currentDialog = await BilibiliAPI.waitForDialog();
      if (currentDialog) BilibiliAPI.closeDialog(currentDialog);
      await delay(CONFIG.DELAY.SHORT);

      return true;
    }

    /**
     * 恢复跨页面流程（页面加载时调用）
     * @returns {Promise<boolean>} 是否处理了跨页面流程
     */
    async resumeFlow() {
      const state = StateManager.loadState();
      if (!state) {
        return false; // 没有跨页面状态
      }
      if (state.actorId && state.actorId !== PageDetector.getLoginUserUID()) {
        StateManager.clearState();
        this.manager.operation.finish('failed', '登录账号已变化，跨页任务已停止。请使用原账号重新选择任务。');
        return true;
      }

      // 脚本会在空间站内导航后重新挂载，只有任务预期的页面才能恢复。
      if (state.phase === 'creating' && !PageDetector.isOwnPage()) return false;
      if (state.phase === 'copying') {
        const returnURL = new URL(state.returnURL, window.location.origin);
        if (returnURL.origin !== window.location.origin ||
            returnURL.pathname !== window.location.pathname) return false;
      }
      if (!['creating', 'copying'].includes(state.phase)) return false;

      // 执行前消费任务：失败、刷新或异常退出不能自动重放创建/复制请求。
      // 只有创建全部确认成功后才保存下一阶段。
      StateManager.clearState();
      state.tasks = normalizeCopyTasks(state.tasks);
      if (!state.tasks.length) throw new Error('跨页任务为空，已清除；请重新选择来源收藏夹。');
      const operationId = typeof state.operationId === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(state.operationId) ? state.operationId : newOperationId();
      this.manager.logs.restore(state.journal);
      this.manager.operation.begin('批量复制', state.tasks.length, { operationId, phase: state.phase });
      this.manager.logs.setContext({ view: 'copy', operationId, phase: state.phase });
      log(state.phase === 'creating' ? '已到达我的空间，继续准备目标。' : '已返回来源空间，继续复制。');

      if (state.phase === 'creating') {
        const actor = PageDetector.getLoginUserUID();
        const check = () => {
          if (PageDetector.getLoginUserUID() !== actor || !PageDetector.isOwnPage())
            throw new Error('账号或目标准备页面已变化，跨页任务已停止。');
        };
        // 当前已在「自己页面」，此时 getAllFavoriteNames() = 自己的收藏夹
        // 在此对比目标名称，找出真正缺失（自己还没有）的收藏夹
        const ownNames = this.manager.getAllFavoriteNames().map(normalizeFavoriteName);
        for (const task of state.tasks) assertUnambiguousFavoriteName(ownNames, task.target);
        const missing = state.tasks
          .map(t => t.target)
          .filter((name, index, self) => self.indexOf(name) === index) // 去重
          .filter(name => !ownNames.includes(name)); // 过滤自己已有的

        if (missing.length > 0) {
          log(`检测到 ${missing.length} 个收藏夹需要创建:`, missing.join(', '));
          const success = await this.batchCreateFavorites(missing, check);
          if (!success) {
            error('收藏夹创建失败，请手动创建后重试');
            StateManager.clearState();
            this.manager.operation.finish('failed', '创建未确认，流程已停止。请检查页面结果后手动重试。');
            return true;
          }
        } else {
          log('所有目标收藏夹均已存在，无需创建');
        }

        // 更新状态：准备返回复制
        log('目标准备完成，3 秒后返回来源空间继续复制。');
        await delay(3000);
        check();
        this.manager.operation.finish('waiting', '目标准备完成，等待返回来源页面继续复制。');
        StateManager.saveState({ ...state, operationId, phase: 'copying',
          journal: this.manager.logs.snapshot() });

        window.location.href = state.returnURL;

        return true;
      } else if (state.phase === 'copying') {
        // 回到原页面，继续复制流程
        // 执行复制（跳过跨页面检测，避免重复触发跳转）
        await this.manager.batchCopy(state.tasks, { skipCrossPage: true, operationId });

        // 复制完成后清除状态
        StateManager.clearState();

        return true;
      }

      return false;
    }
  }

  /** Ephemeral progress; confirmed counts must represent observed outcomes. */
  class OperationState {
    constructor() {
      this.listeners = new Set();
      this.state = { status: 'idle', operationId: '', phase: '', action: '', confirmed: 0, total: null, lastConfirmed: '', detail: '' };
    }

    subscribe(listener) {
      this.listeners.add(listener);
      listener({ ...this.state });
      return () => this.listeners.delete(listener);
    }

    update(changes) {
      this.state = { ...this.state, ...changes };
      for (const listener of this.listeners) listener({ ...this.state });
    }

    begin(action, total = null, { operationId = newOperationId(), phase = '' } = {}) {
      this.update({ status: 'running', operationId, phase, action, total, confirmed: 0, lastConfirmed: '', detail: '正在准备…' });
    }

    confirm(step) {
      this.update({ confirmed: this.state.confirmed + 1, lastConfirmed: step });
    }

    finish(status, detail) {
      if (!['completed', 'failed', 'interrupted', 'unknown', 'waiting'].includes(status)) throw new Error('Invalid terminal operation status');
      this.update({ status, detail });
    }
  }

  const label = value => typeof value === 'string' && value.trim() ? value.trim() : null;
  function mergeVideoMetadata(target, source) {
    for (const key of ['id', 'bvid', 'title', 'url', 'duration', 'uploaderId', 'uploaderName', 'publishedAt', 'unavailable'])
      if (target[key] === null && source[key] !== null) target[key] = source[key];
  }
  function videoMetadata(raw) {
    const id = raw.type === 2 ? stableId(raw.id) : null;
    const bvid = raw.type === 2 && /^BV[0-9A-Za-z]{10}$/.test(raw.bvid) ? raw.bvid : null;
    const unavailable = Number.isInteger(raw.attr) ? !!(raw.attr & 1) : null;
    return { id, bvid, title: label(raw.title), url: bvid ? `https://www.bilibili.com/video/${bvid}` : id ? `https://www.bilibili.com/video/av${id}` : null,
      duration: unavailable ? null : knownCount(raw.duration), uploaderId: stableId(raw.upper?.mid), uploaderName: label(raw.upper?.name),
      unavailable, publishedAt: knownCount(raw.pubtime), occurrences: 0, folders: [] };
  }

  class InventoryService {
    constructor(client = new FolderClient(), pace = 400) { this.client = client; this.pace = pace; this.running = false; }

    async scan(folders, { signal, onPage = () => {}, maxPages = 500, maxEntries = 10000 } = {}) {
      if (this.running) throw new Error('已有扫描正在进行');
      if (!folders.length || folders.some(f => !stableId(f.id) || f.kind === 'unsupported') || new Set(folders.map(folderKey)).size !== folders.length) throw new Error('请选择有效的收藏夹');
      const client = this.client.capture?.() || this.client;
      this.running = true;
      const report = { scope: folders.map(f => ({ id: f.id, kind: f.kind, ownerId: f.ownerId, name: f.name })), complete: false, cancelled: false, folders: [], entries: 0,
        occurrences: 0, uniqueVideos: 0, duplicateOccurrences: 0, unknownIdentity: 0, unavailable: 0, knownDurationSeconds: 0, unknownDurations: 0, unknownUploaders: 0, videos: [], unidentified: [] };
      const videos = new Set(), aliases = new Map();
      let requests = 0;
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
                if (!metadata.id && !metadata.bvid) { report.unknownIdentity++; metadata.occurrences = 1; metadata.folders.push(membership); report.unidentified.push(metadata); continue; }
                report.occurrences++;
                const byId = metadata.id && aliases.get(`av:${metadata.id}`), byBV = metadata.bvid && aliases.get(metadata.bvid);
                if (byId && byBV && byId !== byBV) {
                  mergeVideoMetadata(byId, byBV);
                  byId.occurrences += byBV.occurrences;
                  for (const entry of byBV.folders) {
                    const old = byId.folders.find(f => folderKey(f) === folderKey(entry));
                    if (old) old.occurrences += entry.occurrences; else byId.folders.push(entry);
                  }
                  for (const [key, value] of aliases) if (value === byBV) aliases.set(key, byId);
                  videos.delete(byBV);
                }
                const video = byId || byBV || metadata;
                mergeVideoMetadata(video, metadata);
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

  function eligibility(action, folder, actor, pageOwner) {
    if (!stableId(actor) || !stableId(folder.id)) return '身份未确认';
    if (folder.identityConflict) return '身份信息冲突';
    if (action === 'unsubscribe') {
      if (!['subscribed', 'season'].includes(folder.kind)) return '订阅类型未识别';
      if (folder.ownerId === actor) return '不能将自己的收藏夹当作订阅';
      if (folder.subscribed !== true) return '订阅状态未确认';
      return null;
    }
    if (action !== 'delete') return '操作类型不支持';
    if (!stableId(folder.ownerId)) return '所有者未确认';
    if (!folder.available) return '对象不可用';
    if (folder.kind !== 'created') return '不是创建的收藏夹';
    if (folder.ownerId !== actor || pageOwner !== actor) return '只能管理自己空间的收藏夹';
    if (folder.protected !== false) return { default: '默认收藏夹', special: '特殊收藏夹', unknown: '保护状态未确认' }[folder.protectionReason] || '默认、特殊或保护状态未确认';
    return null;
  }

  class BatchOperations {
    constructor(client, context, pace = 400) { this.client = client; this.context = context; this.pace = pace; this.running = false; this.ticket = null; }

    invalidate() { this.ticket = null; }

    prepare(action, folders) {
      this.invalidate();
      const { actor, pageOwner } = this.context();
      if (this.running || !folders.length || new Set(folders.map(folderKey)).size !== folders.length) throw new Error('请选择有效且不重复的目标');
      for (const folder of folders) {
        const reason = eligibility(action, folder, actor, pageOwner);
        if (reason) throw new Error(reason);
      }
      this.ticket = Object.freeze({ action, actor, pageOwner, transport: this.client.capture?.(), targets: Object.freeze(folders.map(folder => Object.freeze({ ...folder }))) });
      return this.ticket;
    }

    async execute(ticket, { confirmed = false, signal, onResult = () => {} } = {}) {
      if (!confirmed || !ticket || ticket !== this.ticket || this.running) throw new Error('请重新预览并明确确认本次目标');
      this.invalidate(); // Consume BEFORE any await or submission. Never persist/replay.
      this.running = true;
      const results = ticket.targets.map(target => ({ id: target.id, kind: target.kind, ownerId: target.ownerId, name: target.name, status: 'not_started', detail: '尚未提交' }));
      const client = ticket.transport || this.client;
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
            const catalog = await client.folders(ticket.actor, ticket.action === 'delete' ? 'created' : 'subscribed', signal, this.pace, target);
            if (signal?.aborted) break;
            const fresh = catalog.find(folder => folder.id === target.id && folder.kind === target.kind);
            if (!fresh || eligibility(ticket.action, fresh, current.actor, current.pageOwner) ||
              ['id', 'ownerId', 'name', 'count', 'kind', 'protected', 'protectionReason', 'available', 'subscribed', 'identityConflict'].some(key => fresh[key] !== target[key])) throw new Error('目标身份、名称、数量或保护状态变化，请重新加载并预览');
            const latest = this.context();
            if (latest.actor !== ticket.actor || latest.pageOwner !== ticket.pageOwner) throw new Error('账号或空间变化，未提交');
            if (signal?.aborted) break;
            submitted = true;
            result = await client.mutate(ticket.action, target, signal);
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

  /** Inert UI data only. Failure must never prevent an operation or startup. */
  function browserStore(area, key) {
    return {
      read() { try { return JSON.parse(window[area].getItem(key)); } catch { return null; } },
      write(value) { try { window[area].setItem(key, JSON.stringify(value)); } catch { /* memory-only */ } }
    };
  }

  const defaultModes = Object.freeze({ read: 'api', copy: 'web', create: 'web', manage: 'web' });
  function validModes(value) {
    return Object.fromEntries(Object.entries(defaultModes).map(([key, fallback]) =>
      [key, ['api', 'web'].includes(value?.[key]) ? value[key] : fallback]));
  }

  function panelPreferences() {
    const store = browserStore('localStorage', 'bili-favs-panel-v1');
    const raw = store.read();
    const geometry = raw?.version === 1 && raw.geometry &&
      ['width', 'height', 'left', 'top'].every(key => Number.isFinite(raw.geometry[key]) && Math.abs(raw.geometry[key]) <= 20000) &&
      raw.geometry.width >= 280 && raw.geometry.height >= 64 ? raw.geometry : null;
    return { store, geometry, logsOpen: raw?.version === 1 ? raw.logsOpen !== false : true,
      layout: raw?.layout === 'bottom' ? 'bottom' : 'side',
      auxiliary: Number.isFinite(raw?.auxiliary) && raw.auxiliary > 0 && raw.auxiliary < 20000 ? raw.auxiliary : 0,
      modes: validModes(raw?.version === 1 ? raw.modes : null) };
  }

  // Read page-owned component data only. Mutation always goes through native UI.
  function pageDocument() {
    return typeof unsafeWindow !== 'undefined' ? unsafeWindow.document : document;
  }

  function legacySubscriptionSource(group) {
    const pageGroup = pageDocument().getElementById(group.id) || group;
    let vm = pageGroup?.__vue__;
    for (let depth = 0; vm && depth < 8; depth++, vm = vm.$parent) {
      const source = vm.collectedList;
      if (Array.isArray(source?.list) && Number.isSafeInteger(source.count) && source.count >= 0) return source;
    }
    return null;
  }

  function subscriptionBindings(rows, group, legacy) {
    const bindings = new Map();
    if (legacy) {
      const source = legacySubscriptionSource(group);
      for (const row of rows) {
        const href = row.querySelector('a.text')?.getAttribute('href');
        if (!href) continue;
        const url = new URL(href, window.location.href);
        const id = stableId(url.searchParams.get('fid')), type = Number(url.searchParams.get('ctype'));
        if (url.origin !== window.location.origin || url.pathname.split('/')[1] !== window.location.pathname.split('/')[1] || url.searchParams.get('ftype') !== 'collect' || !id || ![11, 21].includes(type)) continue;
        const raw = source?.list.find(item => stableId(item.id) === id && item.type === type);
        const title = row.querySelector('a.text').textContent.trim();
        if (raw && normalizeFavoriteName(raw.title) !== normalizeFavoriteName(title)) throw new Error('网页条目名称与绑定身份不一致，未提交');
        bindings.set(row, normalizeFolder(raw || { id, type, title, state: row.classList.contains('favInvalid') ? 1 : 0 }, 'subscribed', 0, true));
      }
      return bindings;
    }
    const wanted = new Set(rows), seen = new Set(), stack = [pageDocument().querySelector('#app')?._vnode];
    while (stack.length && seen.size < 30000) {
      const vnode = stack.pop();
      if (!vnode || typeof vnode !== 'object' || seen.has(vnode)) continue;
      seen.add(vnode);
      const component = vnode.component;
      if (component?.type?.__name === 'FavSidebarItem') {
        const row = wanted.has(vnode.el) ? vnode.el : rows.find(node => vnode.el && node.isSameNode(vnode.el));
        if (!row) continue;
        const { item, type } = component.props || {};
        if (type !== 'collect' || !item || !stableId(item.id) || ![11, 21].includes(item.type)) continue;
        const title = row.querySelector('.vui_ellipsis')?.textContent.trim();
        if (normalizeFavoriteName(item.title) !== normalizeFavoriteName(title)) throw new Error('网页条目名称与绑定身份不一致，未提交');
        if (bindings.has(row)) throw new Error('网页条目绑定重复，未提交');
        bindings.set(row, normalizeFolder(item, 'subscribed', 0, true));
      }
      if (component?.subTree) stack.push(component.subTree);
      if (Array.isArray(vnode.children)) stack.push(...vnode.children);
      if (vnode.suspense?.activeBranch) stack.push(vnode.suspense.activeBranch);
    }
    if (stack.length) throw new Error('网页组件读取超过上限，未提交');
    return bindings;
  }

  const text$1 = node => node?.textContent.trim() || '';

  /** Reads only the page's native cards and pagination; never requests HTTP. */
  class NativeVideoReader {
    constructor(client) { this.client = client; }
    page() { return currentNativePage(this.client.selectors); }
    cards() { return [...document.querySelectorAll(this.client.selectors.cards)]; }
    signature() { return nativePageSnapshot(this.client.selectors).signature; }
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
    options(folder, signal, before) {
      return { guard: () => this.check(folder), signal, before,
        ready: () => normalizeFavoriteName(text$1(document.querySelector(this.client.selectors.detailTitle))) === normalizeFavoriteName(folder.name),
        wait: (check, signal) => this.client.wait(check, signal) };
    }
    settle(folder, pn, signal, before = null) {
      return waitNativePage(this.client.selectors, pn, this.options(folder, signal, before));
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
        await goNativePage(this.client.selectors, pn, this.options(folder, signal));
        current = this.page();
      }
      this.check(folder);
      if (current !== pn) throw new Error('网页当前页与统计页不一致');
      // Re-check after an asynchronous boundary before reading the final card set.
      await pause(0, signal); this.check(folder);
      const s = this.client.selectors;
      const medias = this.cards().map(card => {
        const link = card.querySelector('a[href*="/video/"]'), href = link?.getAttribute('href') || '';
        const titleNode = card.querySelector(s.videoTitle);
        const title = titleNode?.getAttribute('title') || text$1(titleNode) || null;
        const unavailable = /^(已失效视频|失效视频|视频已失效)$/.test(title || '') || !!card.querySelector(s.unavailable);
        const durationText = [...card.querySelectorAll(s.duration)].map(text$1).find(t => /^\d{1,3}:\d{2}(?::\d{2})?$/.test(t));
        const duration = unavailable || !durationText ? null : durationText.split(':').reduce((a, n) => a * 60 + Number(n), 0);
        const author = card.querySelector(s.videoAuthor);
        const authorName = (text$1(author?.querySelector('[title]')) || text$1(author)).replace(/\s*·\s*收藏于.*$/, '').trim() || null;
        return { type: 2, id: stableId(href.match(/\/av(\d+)/)?.[1]), bvid: href.match(/BV[0-9A-Za-z]{10}/)?.[0] || null,
          title, duration, attr: unavailable ? 1 : undefined, upper: { mid: stableId(author?.getAttribute('href')?.match(/space\.bilibili\.com\/(\d+)/)?.[1]), name: authorName } };
      });
      const countText = text$1(document.querySelector(s.data)).match(/视频数\s*[:：]\s*(\d+)/)?.[1];
      const count = countText === undefined ? knownCount(folder.count) : knownCount(Number(countText));
      const next = document.querySelector(s.pagination)?.querySelector(s.next);
      if (!medias.length && count !== 0) throw new Error('网页未展示视频条目，请检查空页或权限；已读取结果保留');
      return { info: { id, media_count: count }, medias, has_more: nativeControlEnabled(next) };
    }
  }

  const text = node => node?.textContent.trim() || '';
  const numberFrom = value => /^\d+$/.test(value || '') ? Number(value) : null;
  class WebFolderClient {
    constructor() { this.identities = new WeakMap(); this.boundRows = new WeakSet(); this.videoReader = new NativeVideoReader(this); }
    get selectors() { return document.querySelector('.favlist-aside') ? nativeControls.vui : nativeControls.legacy; }
    capture() {
      const actor = PageDetector.getLoginUserUID(), owner = PageDetector.getCurrentPageUID();
      const check = () => {
        if (actor !== PageDetector.getLoginUserUID() || owner !== PageDetector.getCurrentPageUID())
          throw new Error('账号或空间已变化，网页读取已停止；请重新加载列表');
      };
      const read = method => async (...args) => { check(); const data = await this[method](...args); check(); return data; };
      return { folders: read('folders'), videos: read('videos'), mutate: (...args) => this.mutate(...args) };
    }
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
        // Vue updates the source before rendering the corresponding DOM rows.
        // Await that render rather than treating a normal update as a changed list.
        const { source, rows } = await this.wait(() => {
          const source = kind === 'subscribed' && !s.group ? legacySubscriptionSource(group) : null;
          const rows = [...group.querySelectorAll(s.row)];
          return !source || rows.length === source.list.length ? { source, rows } : null;
        }, signal);
        const before = rows.length;
        if (source && new Set(source.list.map(item => `${item.type}:${item.id}`)).size !== source.list.length)
          throw new Error(`网页重复加载了订阅条目（${before} 条）；请刷新整个网页后重新加载，尚未退订`);
        if (source && before > source.count)
          throw new Error(`网页订阅总数尚未同步（列表 ${before} 条，总数 ${source.count} 条）；请刷新整个网页后重新加载，尚未退订`);
        if (!more && (!source || before === source.count)) return rows;
        if (more) more.click();
        else {
          // PerfectScrollbar already translates scrolling into this event. Using
          // both paths starts concurrent requests for the same native page.
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
    videos(id, pn, signal, folder) { return this.videoReader.read(id, pn, signal, folder); }
  }

  /** Capture choices once; no retry/fallback between HTTP and native actions. */
  class TransportClient {
    constructor(api, web, modes) { this.api = api; this.web = web; this.modes = modes; }
    capture() {
      const read = this[this.modes.read], write = this[this.modes.manage];
      const reader = read.capture?.() || read;
      return { folders: (...args) => reader.folders(...args), videos: (...args) => reader.videos(...args), mutate: (...args) => write.mutate(...args) };
    }
    folders(...args) { return this.capture().folders(...args); }
    videos(...args) { return this.capture().videos(...args); }
  }

  const fail = (detail, outcome = 'failed') => { const error = new Error(detail); error.outcome = outcome; throw error; };
  class ApiCopyFlow {
    constructor(client, context, pace = 400) { this.client = client; this.context = context; this.pace = pace; this.running = false; }
    check(expected, signal) {
      if (signal?.aborted) fail('已停止后续复制', 'interrupted');
      const current = this.context();
      assertCopyContext(expected, current);
      if (!stableId(current.actor) || current.actor !== expected.actor || current.pageOwner !== expected.pageOwner) fail('账号或来源空间变化，已停止');
    }
    require(result) { if (result?.status !== 'confirmed') fail(result?.detail || '结果未识别', result?.status === 'unknown' ? 'unknown' : 'failed'); }
    resolve(rows, name, required = true) {
      const found = rows.filter(row => normalizeFavoriteName(row.name) === name);
      assertUnambiguousFavoriteName(rows.map(row => row.name), name);
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

  /**
   * 收藏夹管理器
   * 负责批量复制收藏夹的核心逻辑
   */


  class FavoriteManager {
    constructor() {
      this.api = BilibiliAPI;
      this.crossPageFlow = new CrossPageFlowManager(this);
      this.operation = new OperationState();
      this.logs = new LogStore(500, browserStore('sessionStorage', `bili-favs-records-v2:${PageDetector.getLoginUserUID() || 'guest'}`));
      this.modes = panelPreferences().modes;
      this.http = new FolderClient(); this.web = new WebFolderClient();
      this.transport = new TransportClient(this.http, this.web, this.modes);
      this.inventory = new InventoryService(this.transport);
      this.apiCopy = new ApiCopyFlow(this.http, () => ({ actor: PageDetector.getLoginUserUID(), pageOwner: PageDetector.getCurrentPageUID() }));
      this.batchOperations = new BatchOperations(this.inventory.client, () => ({ actor: PageDetector.getLoginUserUID(), pageOwner: PageDetector.getCurrentPageUID() }));
    }

    /**
     * 初始化：检测页面版本
     * @returns {boolean} 是否为支持的页面版本
     */
    initialize() {
      log('脚本版本:', CONFIG.SCRIPT.VERSION);
      return this.api.detectPageVersion();
    }

    /**
     * 获取所有收藏夹名称列表
     * @returns {Array<string>} 收藏夹名称数组
     */
    getAllFavoriteNames() {
      const favorites = this.api.getAllFavorites();
      const names = [];

      for (const fav of favorites) {
        const name = this.api.getFavoriteName(fav);
        if (name) {
          names.push(name);
        }
      }

      return names;
    }

    /**
     * 复制单个收藏夹
     * @param {string} sourceFavName - 源收藏夹名称
     * @param {string} targetFavName - 目标收藏夹名称
     * @returns {Promise<boolean>} 是否成功
     */
    async copyFavorite(sourceFavName, targetFavName) {
      sourceFavName = normalizeFavoriteName(sourceFavName);
      targetFavName = normalizeFavoriteName(targetFavName);
      if (!sourceFavName || !targetFavName) return false;
      const expected = assertCopyContext(this.batchContext || currentCopyContext());
      log(`开始复制收藏夹 [${sourceFavName}] 到 [${targetFavName}]`);
      this.copyStep = '打开来源收藏夹';

      // 1. 点击源收藏夹
      const oldId = new URL(window.location.href).searchParams.get('fid');
      const before = this.api.getCopyPageSnapshot?.();
      const clickSuccess = await this.api.clickFavorite(sourceFavName);
      if (!clickSuccess) {
        return false;
      }

      await delay(CONFIG.DELAY.SHORT);

      assertCopyContext(expected);
      const fid = stableId(new URL(window.location.href).searchParams.get('fid'));
      if (!fid || new URL(window.location.href).searchParams.get('ftype') !== 'create')
        throw new Error('来源收藏夹 ID 或创建类型未确认，未提交复制');

      // 2. 获取当前收藏夹信息
      const currentName = this.api.getCurrentFavoriteName();
      if (normalizeFavoriteName(currentName || '') !== sourceFavName) {
        error('来源收藏夹未切换到预期名称，未提交复制');
        return false;
      }

      const check = () => {
        assertCopyContext(expected);
        const url = new URL(window.location.href);
        if (url.searchParams.get('fid') !== fid || url.searchParams.get('ftype') !== 'create') throw new Error('来源收藏夹已变化，未继续复制');
      };
      const totalPages = this.api.prepareCopyPages ? await this.api.prepareCopyPages(check, oldId !== fid ? before : null) : this.api.getTotalPages();
      log(`收藏夹 [${currentName}] 共 ${totalPages} 页`);

      // 3. 进入批量操作模式
      this.copyStep = '进入批量模式';
      const batchSuccess = await this.api.ensureBatchModeActive();
      if (!batchSuccess) {
        error('无法进入批量操作模式');
        return false;
      }

      // 4. 逐页复制
      for (let page = 1; page <= totalPages; page++) {
        log(`正在处理第 ${page}/${totalPages} 页`);
        this.copyPage = page;
        this.operation.update({ detail: `正在复制第 ${page} / ${totalPages} 页。` });

        const pageSuccess = await this.copyOnePage(targetFavName, { ...expected, fid });
        if (!pageSuccess) {
          return false;
        }

        // 如果不是最后一页，点击下一页
        if (page < totalPages) {
          this.copyStep = '前往下一页';
          const nextSuccess = await this.api.clickNextPage(check);
          if (!nextSuccess) {
            warn(`无法跳转到第 ${page + 1} 页`);
            return false;
          }
        }
      }

      log(`✓ 收藏夹 [${sourceFavName}] 复制完成`);
      return true;
    }

    /**
     * 复制当前页的视频
     * @param {string} targetFavName - 目标收藏夹名称
     * @returns {Promise<boolean>} 是否成功
     */
    async copyOnePage(targetFavName, expected) {
      expected ||= { ...currentCopyContext(), fid: stableId(new URL(window.location.href).searchParams.get('fid')) };
      const check = () => {
        assertCopyContext(expected);
        const url = new URL(window.location.href);
        if (!expected.fid || url.searchParams.get('fid') !== expected.fid || url.searchParams.get('ftype') !== 'create')
          throw new Error('来源收藏夹已变化或 ID 未确认，未继续复制');
      };
      check();
      targetFavName = normalizeFavoriteName(targetFavName);
      if (!targetFavName) return false;
      this.copyStep = '进入批量模式';
      // 0. 确保批量模式激活
      const batchActive = await this.api.ensureBatchModeActive();
      if (!batchActive) {
        error('无法进入批量模式');
        return false;
      }

      // 1. 全选
      check();
      this.copyStep = '选择当前页视频';
      if (!this.api.clickSelectAll()) {
        return false;
      }
      await delay(CONFIG.DELAY.SHORT);

      // 2. 点击复制按钮
      this.copyStep = '打开复制对话框';
      if (!await this.api.clickCopyButton()) {
        return false;
      }

      // 3. 等待对话框
      const dialog = await this.api.waitForDialog();
      if (!dialog) {
        error('对话框未出现');
        return false;
      }

      // 4. 检查目标收藏夹是否存在
      const exists = this.api.isFavoriteExistInDialog(dialog, targetFavName);

      if (!exists) {
        error('目标收藏夹不存在，请使用批量复制准备目标后重试');
        this.api.closeDialog(dialog);
        return false;
      }

      // 5. 选择目标收藏夹
      await delay(CONFIG.DELAY.SHORT);
      check();
      this.copyStep = '选择目标收藏夹';
      if (!this.api.selectFavoriteInDialog(dialog, targetFavName)) {
        return false;
      }

      // 6. 点击确定
      await delay(CONFIG.DELAY.SHORT);
      check();
      this.copyStep = '确认复制结果';
      const confirmed = await this.api.clickConfirmButton(dialog);
      if (!confirmed && this.api.copySubmission?.status === 'unknown') {
        const err = new Error(this.api.copySubmission.detail);
        err.outcome = 'unknown'; throw err;
      }
      if (!confirmed && this.api.copySubmission?.status === 'failed')
        throw new Error(this.api.copySubmission.detail);
      return confirmed;
    }

    /**
     * 创建新收藏夹
     * @param {Element} dialog - 对话框元素
     * @param {string} favName - 收藏夹名称
     * @returns {Promise<boolean>} 是否成功
     */
    async createNewFavorite(dialog, favName, check = () => {}) {
      favName = normalizeFavoriteName(favName);
      if (!favName) return false;
      if (this.api.isFavoriteExistInDialog(dialog, favName)) return true;
      check();
      // 1. 点击新建收藏夹按钮
      if (!await this.api.clickCreateFavoriteButton(dialog)) {
        return false;
      }

      // 2. 输入收藏夹名称
      if (!await this.api.inputFavoriteName(favName)) {
        return false;
      }

      check();
      // 3. 点击创建按钮
      if (!await this.api.clickCreateButton()) {
        return false;
      }

      const confirmed = await this.api.waitForFavorite(favName, true);
      if (confirmed) log(`✓ 创建收藏夹 [${favName}] 成功`);
      else error(`未确认收藏夹 [${favName}] 创建成功，已停止，请检查页面结果`);
      return confirmed;
    }

    /**
     * 批量复制收藏夹
     * @param {Array<{source: string, target: string}>} copyList - 复制列表
     * @param {Object} [options] - 选项
     * @param {boolean} [options.skipCrossPage=false] - 跳过跨页面检测，直接进入复制循环
     * @returns {Promise<void>}
     */
    async guardedCopy(copyList, work) {
      copyList = normalizeCopyTasks(copyList);
      if (!copyList.length) throw new Error('请至少选择一个来源收藏夹');
      if (this.copyRunning) throw new Error('已有复制任务正在进行');
      this.batchContext = assertCopyContext();
      this.copyRunning = true;
      try { return await work(copyList); }
      finally { this.copyRunning = false; this.batchContext = null; }
    }

    batchCopy(copyList, options = {}) {
      return this.guardedCopy(copyList, tasks => this.runBatchCopy(tasks, options));
    }

    batchCopyWeb(copyList, options = {}) {
      return this.guardedCopy(copyList, tasks => this.runBatchCopyWeb(tasks, options));
    }

    async runBatchCopy(copyList, options = {}) {
      assertCopyContext(this.batchContext || currentCopyContext());
      // A saved webpage handoff must never change execution transport on refresh.
      if (options.skipCrossPage || options.operationId) return this.runBatchCopyWeb(copyList, options);
      const modes = validModes(this.modes);
      copyList = normalizeCopyTasks(copyList);
      if (modes.copy === 'web') {
        const names = this.getAllFavoriteNames();
        for (const task of copyList) assertUnambiguousFavoriteName(names, task.source);
      }
      if (modes.copy === 'web' && modes.create === 'web') return this.runBatchCopyWeb(copyList, options);
      this.operation.begin(`批量复制（${modes.copy === 'api' ? 'API' : '网页'}）`, copyList.length, { phase: 'copying' });
      this.logs.setContext({ view: 'copy', operationId: this.operation.state.operationId, phase: 'copying' });
      log(`本次方式：复制 ${modes.copy}，创建 ${modes.create}；不会自动切换或重试。`);
      try {
        const creator = modes.create === 'api' ? this.http : this.web;
        if (modes.copy === 'api') {
          await this.apiCopy.run(copyList, { creator, onProgress: event => {
            if (event.complete) this.operation.confirm(`${event.task.source} → ${event.task.target}`);
            else this.operation.update({ detail: `当前收藏夹已确认 ${event.copied} / ${event.total} 条（API）。` });
          } });
          this.operation.finish('completed', '所选任务已获得平台确认，请核对目标收藏夹。');
          return { status: 'completed' };
        }
        const expected = this.apiCopy.context();
        await this.apiCopy.prepareTargets([...new Set(copyList.map(task => task.target))], expected, creator);
        return await this.runBatchCopyWeb(copyList, { skipCrossPage: true, operationId: this.operation.state.operationId });
      } catch (error) {
        if (!['failed', 'unknown'].includes(this.operation.state.status)) this.operation.finish(error.outcome === 'unknown' ? 'unknown' : 'failed', error.message);
        throw error;
      }
    }

    async runBatchCopyWeb(copyList, options = {}) {
      assertCopyContext(this.batchContext || currentCopyContext());
      copyList = normalizeCopyTasks(copyList);
      const { skipCrossPage = false } = options;
      if (!options.operationId || this.operation.state.operationId !== options.operationId || this.operation.state.status !== 'running')
        this.operation.begin('批量复制', copyList.length, { operationId: options.operationId, phase: 'copying' });
      this.logs.setContext({ view: 'copy', operationId: this.operation.state.operationId, phase: this.operation.state.phase });
      try {
      const names = this.getAllFavoriteNames();
      for (const task of copyList) {
        assertUnambiguousFavoriteName(names, task.source);
      }
      log('开始批量复制，共', copyList.length, '个任务');

      // 检测是否需要跨页面创建收藏夹（copying 阶段恢复时跳过，避免重复触发跳转）
      if (!skipCrossPage) {
        const isOwnPage = PageDetector.isOwnPage();
        if (!isOwnPage) {
          // 在别人页面：option A——只要在他人页面就走跨页面流程，
          // 由「自己页面」阶段再对比并创建缺失的收藏夹
          log('检测到在别人页面，启动跨页面流程...');
          await this.crossPageFlow.startCrossPageFlow(copyList);
          return { status: 'handoff' }; // A navigation is not a completed copy.
        }
      }

      // 正常复制流程
      for (let i = 0; i < copyList.length; i++) {
        const { source, target } = copyList[i];
        this.copyStep = '开始当前收藏夹'; this.copyPage = null;
        log(`[${i + 1}/${copyList.length}] ${source} → ${target}`);

        if (!await this.copyFavorite(source, target)) {
          throw new Error(`复制失败：${source} → ${target}；步骤：${this.copyStep}${this.copyPage ? `（第 ${this.copyPage} 页）` : ''}。后续任务未执行，请先核对页面结果。`);
        }
        this.operation.confirm(`${source} → ${target}`);

        // 任务间延迟
        if (i < copyList.length - 1) {
          await delay(CONFIG.DELAY.MIDDLE);
        }
      }

      log('\n批量复制完成！');
      this.operation.finish('completed', '所选任务已完成。可检查目标收藏夹。');
      return { status: 'completed' };
      } catch (err) {
        const unknown = err.outcome === 'unknown';
        const detail = unknown ? `${err.message} 步骤：${this.copyStep}${this.copyPage ? `（第 ${this.copyPage} 页）` : ''}；后续任务已停止，请先核对目标，勿直接重试。` : err.message;
        this.operation.finish(unknown ? 'unknown' : 'failed', detail);
        throw err;
      }
    }
  }

  /** 在油猴沙箱中轮询路由和真实业务 DOM，不修改网站的 history。 */
  class PageLifecycle {
    constructor({ mount, unmount, refresh, notify, now = Date.now }) {
      Object.assign(this, { mount, unmount, refresh, notify, now });
      this.uid = null;
      this.actor = null;
      this.sidebar = null;
      this.names = '';
      this.startedAt = now();
      this.notified = false;
      this.dismissed = false;
    }

    tick() {
      const uid = PageDetector.getCurrentPageUID();
      const actor = PageDetector.getLoginUserUID();
      if (uid !== this.uid || actor !== this.actor) {
        this.unmount();
        this.uid = uid;
        this.actor = actor;
        this.sidebar = null;
        this.names = '';
        this.startedAt = this.now();
        this.notified = false;
        this.dismissed = false;
      }
      if (!uid || !document.body || this.dismissed) return;
      const adapter = getPageAdapter();
      const sidebar = adapter && document.querySelector(adapter.sidebar);
      if (!sidebar) {
        if (!this.notified && this.now() - this.startedAt >= 15000) {
          this.notify('收藏夹仍未加载，或当前界面暂不支持。脚本会继续等待；可刷新页面重试。');
          this.notified = true;
        }
        return;
      }
      const names = Array.from(sidebar.querySelectorAll(adapter.title))
        .map(el => el.textContent.trim()).join('\n');
      if (!this.sidebar) this.mount();
      else if (sidebar !== this.sidebar || names !== this.names) {
        if (this.refresh() === false) return;
      }
      this.sidebar = sidebar;
      this.names = names;
    }

    reopen() {
      this.unmount();
      this.sidebar = null;
      this.dismissed = false;
      this.notified = false;
      this.tick();
    }
  }

  /**
   * UI 组件工厂
   * 提供创建各种 UI 元素的静态方法
   */


  /**
   * 复选框项组件
   */
  let checkboxSequence = 0;

  class CheckboxItem {
    constructor(favName) {
      this.checkboxContainer = this.createCheckboxContainer(favName);
      this.checkbox = this.checkboxContainer.querySelector("input[type='checkbox']");
      this.label = this.checkboxContainer.querySelector('label');
      this.inputText = this.checkboxContainer.querySelector("input[type='text']");
    }

    createCheckboxContainer(favName) {
      const checkboxContainer = document.createElement('div');
      const checkboxDiv = document.createElement('div');
      checkboxDiv.className = 'signal-panel';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `bili-fav-source-${++checkboxSequence}`;

      const label = document.createElement('label');
      label.textContent = favName;
      label.setAttribute('for', checkbox.id);

      const inputText = document.createElement('input');
      inputText.type = 'text';
      inputText.value = favName;
      inputText.setAttribute('aria-label', `目标收藏夹：${favName}`);

      checkboxDiv.appendChild(checkbox);
      checkboxDiv.appendChild(label);
      const direction = document.createElement('span');
      direction.className = 'bf-direction';
      direction.textContent = '→';
      direction.setAttribute('aria-hidden', 'true');
      checkboxDiv.appendChild(direction);
      checkboxDiv.appendChild(inputText);

      checkboxContainer.appendChild(checkboxDiv);

      return checkboxContainer;
    }

    getLabelValue() {
      return this.label.textContent;
    }

    getInputTextValue() {
      return this.inputText.value;
    }

    getCheckboxValue() {
      return this.checkbox.checked;
    }
  }

  /** Title dragging and thin, in-bounds resizing; one owner for both gestures. */
  class EventHandlers {
    static mouseDown(panel, e) {
      if (e.button !== 0 || e.target.closest('button,input,select,textarea,label,summary,a') || panel.exportReview) return;
      const d = this.getDirection(panel, e), r = panel.floatingPanel.getBoundingClientRect();
      if (d && !panel.minimized) {
        panel.resizeable = true; panel.direction = d;
        panel.resizeStart = { x:e.clientX, y:e.clientY, ...this.rectangle(r) };
      } else if (!d && e.target.closest('.bf-header')) {
        panel.dragStart = { x:e.clientX, y:e.clientY, ...this.rectangle(r) };
      } else return;
      e.preventDefault();
    }
    static rectangle(r) { return { left:r.left, top:r.top, width:r.width, height:r.height }; }
    static getDirection(panel, e) {
      const r = panel.floatingPanel.getBoundingClientRect(), x = e.clientX-r.left, y = e.clientY-r.top;
      if (x<0 || y<0 || x>r.width || y>r.height || panel.minimized) return '';
      if (e.target?.closest('.bf-resize-grip')) return 'se';
      const edge = CONFIG.PANEL.RESIZE_BORDER_SIZE;
      return (y<=edge?'n':y>=r.height-edge?'s':'')+(x<=edge?'w':x>=r.width-edge?'e':'');
    }
    static mouseMove(panel, e) {
      const d = this.getDirection(panel,e);
      panel.floatingPanel.style.cursor = d ? d+'-resize' : '';
      panel.header.style.cursor = d ? d+'-resize' : '';
      if (!panel.resizeable) return;
      const s=panel.resizeStart, dir=panel.direction, dx=e.clientX-s.x, dy=e.clientY-s.y;
      const w=Math.max(panel.minW,s.width+(dir.includes('w')?-dx:dir.includes('e')?dx:0));
      const h=Math.max(panel.minH,s.height+(dir.includes('n')?-dy:dir.includes('s')?dy:0));
      this.judgePanelSizeAndUpdate(panel,dir.includes('w')?s.left+s.width-w:s.left,dir.includes('n')?s.top+s.height-h:s.top,w,h);
    }
    static dragOnPanel(panel,e) {
      const s=panel.dragStart;
      if (!s || panel.resizeable) return;
      if (!panel.isDragging && Math.hypot(e.clientX-s.x,e.clientY-s.y)<3) return;
      panel.isDragging=true;
      this.judgePanelPosAndUpdate(panel,s.left+e.clientX-s.x,s.top+e.clientY-s.y);
    }
    static judgePanelSizeAndUpdate(panel,left,top,width,height) {
      Object.assign(panel.floatingPanel.style,{left:Math.max(0,left)+'px',top:Math.max(0,top)+'px',width:Math.max(panel.minW,width)+'px',height:Math.max(panel.minH,height)+'px'});
      panel.clampToViewport();
    }
    static judgePanelPosAndUpdate(panel,left,top) {
      Object.assign(panel.floatingPanel.style,{left:left+'px',top:top+'px'}); panel.clampToViewport();
    }
  }

  const panelStyles = `
.bili-favs-manage-panel {
 --bf-font:system-ui,-apple-system,"Segoe UI","Microsoft YaHei UI","PingFang SC","Noto Sans CJK SC",sans-serif;
 --bf-text:14px; --bf-small:12px; --bf-title:15px;
 --bf-ink:#243544; --bf-muted:#526575; --bf-blue:#00789b; --bf-hover:#006581;
 --bf-line:#dce4eb; --bf-control:#8295a5; --bf-surface:#fff; --bf-soft:#f5f7f9; --bf-selected:#edf7fb;
 --bf-danger:#a8382b; --bf-danger-soft:#fff5f2; --bf-success:#236846; --bf-warning:#795200;
 box-sizing:border-box; position:fixed; top:24px; left:24px; width:${CONFIG.PANEL.INITIAL_WIDTH}px; height:${CONFIG.PANEL.INITIAL_HEIGHT}px;
 max-width:calc(100vw - 16px); max-height:calc(100dvh - 16px); min-width:280px; min-height:64px;
 z-index:99999; background:var(--bf-surface); color:var(--bf-ink); border:1px solid var(--bf-control); border-radius:6px;
 box-shadow:0 4px 20px #20334424; font:400 var(--bf-text)/1.5 var(--bf-font); overflow:hidden; resize:none;
 display:flex; flex-direction:column;
 text-align:left; container-type:inline-size; isolation:isolate; color-scheme:light;
}
.bili-favs-manage-panel .bf-body { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,var(--bf-record-width,272px)); grid-template-rows:minmax(0,1fr) auto; flex:1; min-height:0; }
.bili-favs-manage-panel[data-logs-open=false] .bf-body { grid-template-columns:minmax(0,1fr); }
.bili-favs-manage-panel[data-minimized=true] { display:block; resize:none; }
.bili-favs-manage-panel[data-minimized=true] .bf-body { display:none; }
.bili-favs-manage-panel .bf-resize-grip { position:absolute; right:0; bottom:0; width:14px; height:14px; z-index:3; cursor:se-resize; background:repeating-linear-gradient(135deg,transparent 0 3px,var(--bf-control) 3px 4px); clip-path:polygon(100% 0,100% 100%,0 100%); }
.bili-favs-manage-panel[data-minimized=true] .bf-resize-grip { display:none; }
.bili-favs-manage-panel * { box-sizing:border-box; font-family:inherit; letter-spacing:normal; }
.bili-favs-manage-panel [hidden] { display:none !important; }
.bili-favs-manage-panel h2,.bili-favs-manage-panel h3 { color:var(--bf-ink); font:600 var(--bf-title)/1.5 var(--bf-font); margin:0 0 8px; }
.bili-favs-manage-panel strong { font-weight:600; }
.bili-favs-manage-panel p { margin:4px 0; overflow-wrap:anywhere; }
.bili-favs-manage-panel label { color:inherit; font:inherit; }
.bili-favs-manage-panel button,.bili-favs-manage-panel select,.bili-favs-manage-panel input,.bili-favs-manage-panel textarea { font:inherit; color:var(--bf-ink); }
.bili-favs-manage-panel button,.bili-favs-manage-panel select { width:auto; min-height:30px; margin:0; padding:4px 8px; border:1px solid var(--bf-control); border-radius:4px; background:var(--bf-surface); cursor:pointer; line-height:1.4; transition:background-color 120ms ease,border-color 120ms ease; }
.bili-favs-manage-panel button:hover:not(:disabled) { border-color:var(--bf-blue); background:var(--bf-selected); }
.bili-favs-manage-panel button:active:not(:disabled) { background:var(--bf-line); }
.bili-favs-manage-panel button:disabled { opacity:.5; cursor:default; }
.bili-favs-manage-panel :focus-visible { outline:3px solid var(--bf-blue); outline-offset:1px; }
.bili-favs-manage-panel .bf-sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip-path:inset(50%); white-space:nowrap; border:0; }
.bili-favs-manage-panel .bf-header { display:flex; align-items:center; gap:2px; min-width:0; padding:6px; cursor:move; border-bottom:1px solid var(--bf-line); flex-shrink:0; }
.bili-favs-manage-panel .bf-header strong { min-width:0; font-size:var(--bf-title); }
.bili-favs-manage-panel .bf-version { margin-right:auto; font-size:var(--bf-small); color:var(--bf-muted); }
.bili-favs-manage-panel .bf-header button { font-size:var(--bf-small); min-height:28px; padding:4px; border-color:transparent; background:transparent; flex-shrink:0; }
.bili-favs-manage-panel .bf-header button[aria-expanded=true] { color:var(--bf-blue); background:var(--bf-selected); }
.bili-favs-manage-panel .bf-navigation { display:flex; gap:18px; padding:0 12px; border-bottom:1px solid var(--bf-line); flex-shrink:0; }
.bili-favs-manage-panel .bf-notice { display:flex; align-items:center; flex:1; min-width:0; gap:2px; margin:0 4px; }
.bili-favs-manage-panel .bf-notice-window { flex:1; min-width:0; overflow:hidden; }
.bili-favs-manage-panel .bf-notice button { min-height:24px; padding:2px 4px; font-size:var(--bf-small); border-color:transparent; background:transparent; }
.bili-favs-manage-panel .bf-notice-text { white-space:nowrap; animation:bf-notice-scroll 18s linear infinite; }
.bili-favs-manage-panel .bf-notice:hover .bf-notice-text,.bili-favs-manage-panel .bf-notice:focus-within .bf-notice-text,.bili-favs-manage-panel .bf-notice[data-paused=true] .bf-notice-text { animation-play-state:paused; }
.bili-favs-manage-panel .bf-notice:focus-within .bf-notice-text { transform:none; animation:none; white-space:normal; text-align:left; }
.bili-favs-manage-panel .bf-help-panel details { border-bottom:1px solid var(--bf-line); padding:8px 0; }
.bili-favs-manage-panel .bf-help-panel summary { cursor:pointer; font-weight:600; }
.bili-favs-manage-panel .bf-help-panel h3 { margin-top:12px; }
.bili-favs-manage-panel .bf-video-details { margin-top:12px; border-top:1px solid var(--bf-line); padding-top:8px; }
.bili-favs-manage-panel .bf-video-details summary { cursor:pointer; font-weight:600; }
.bili-favs-manage-panel .bf-video-list { padding-left:24px; margin:8px 0; }
.bili-favs-manage-panel .bf-video-list li { padding:6px 0; overflow-wrap:anywhere; border-bottom:1px solid var(--bf-line); }
.bili-favs-manage-panel a { color:var(--bf-blue); text-decoration:underline; }
@keyframes bf-notice-scroll { 0%,20% { transform:translateX(0); } 75% { transform:translateX(-40%); } 100% { transform:translateX(0); } }
@container (max-width:420px) { .bili-favs-manage-panel .bf-notice { display:none; } .bili-favs-manage-panel .bf-navigation { gap:12px; padding:0 8px; } }
@media (prefers-reduced-motion:reduce) { .bili-favs-manage-panel .bf-notice .bf-notice-text { animation:none; white-space:normal; text-align:left; } }
.bili-favs-manage-panel .bf-navigation button { border:0; border-bottom:2px solid transparent; border-radius:0; padding:8px 0 6px; background:none; color:var(--bf-muted); }
.bili-favs-manage-panel .bf-navigation button[aria-pressed=true] { color:var(--bf-blue); font-weight:600; border-bottom-color:var(--bf-blue); }
.bili-favs-manage-panel .bf-content { grid-column:1; grid-row:1; overflow-y:auto; overflow-x:hidden; padding:8px 12px; min-height:0; scrollbar-width:thin; scrollbar-color:var(--bf-control) transparent; scroll-padding:8px; }
.bili-favs-manage-panel .bf-muted,.bili-favs-manage-panel .bf-help { color:var(--bf-muted); font-size:var(--bf-small); }
.bili-favs-manage-panel .bf-task-heading p { margin:0; font-size:var(--bf-small); color:var(--bf-muted); }
.bili-favs-manage-panel .bf-task-heading { display:flex; align-items:baseline; flex-wrap:wrap; gap:0 8px; margin-bottom:6px; }
.bili-favs-manage-panel .bf-help { margin:2px 0 8px; }
.bili-favs-manage-panel .bf-selection-tools { display:flex; align-items:center; flex-wrap:wrap; gap:4px 8px; padding:0 0 6px; }
.bili-favs-manage-panel .bf-selection-tools[data-empty=true] { display:none; }
.bili-favs-manage-panel .bf-search { flex:1; min-width:100px; }
.bili-favs-manage-panel input[type=search] { display:block; width:100%; min-width:0; min-height:30px; padding:4px 6px; border:1px solid var(--bf-control); border-radius:4px; background:var(--bf-surface); }
.bili-favs-manage-panel input::placeholder { color:var(--bf-muted); opacity:1; }
.bili-favs-manage-panel .bf-selection-tools button { font-size:var(--bf-small); }
.bili-favs-manage-panel .bf-selection-count { flex-basis:100%; color:var(--bf-muted); font-size:var(--bf-small); font-variant-numeric:tabular-nums; }
.bili-favs-manage-panel .bf-filter-notice { flex-basis:100%; font-size:var(--bf-small); color:var(--bf-warning); }
.bili-favs-manage-panel .bf-copy-columns,.bili-favs-manage-panel .signal-panel { display:grid; grid-template-columns:20px minmax(0,1fr) 12px minmax(0,1fr); align-items:center; gap:6px; }
.bili-favs-manage-panel .bf-copy-columns { padding:4px 0; font-size:var(--bf-small); color:var(--bf-muted); border-bottom:1px solid var(--bf-control); }
.bili-favs-manage-panel .fav-panel { margin:0; }
.bili-favs-manage-panel .signal-panel { padding:2px 0; border-bottom:1px solid var(--bf-line); }
.bili-favs-manage-panel [data-selected=true] { background:var(--bf-selected); }
.bili-favs-manage-panel .signal-panel label { overflow-wrap:anywhere; min-width:0; cursor:pointer; }
.bili-favs-manage-panel .bf-direction { text-align:center; color:var(--bf-muted); }
.bili-favs-manage-panel input[type=text] { width:100%; min-width:0; min-height:30px; padding:4px 6px; border:1px solid var(--bf-control); border-radius:4px; background:var(--bf-surface); }
.bili-favs-manage-panel input[aria-invalid=true] { border-color:var(--bf-danger); }
.bili-favs-manage-panel input[type=checkbox] { accent-color:var(--bf-blue); width:17px; height:17px; margin:3px 0; flex-shrink:0; cursor:pointer; }
.bili-favs-manage-panel .signal-panel input[type=checkbox] { justify-self:center; }
.bili-favs-manage-panel .bf-footer { grid-column:1; grid-row:2; border-top:1px solid var(--bf-line); background:var(--bf-surface); padding:8px 12px; max-height:35dvh; overflow:auto; }
.bili-favs-manage-panel .bf-action-bar { display:flex; align-items:center; justify-content:flex-end; gap:8px; flex-wrap:wrap; }
.bili-favs-manage-panel .bf-primary { background:var(--bf-blue); border-color:var(--bf-blue); color:var(--bf-surface); font-weight:600; }
.bili-favs-manage-panel .bf-primary:hover:not(:disabled) { background:var(--bf-hover); color:var(--bf-surface); }
.bili-favs-manage-panel .bf-danger { background:var(--bf-danger); border-color:var(--bf-danger); color:var(--bf-surface); }
.bili-favs-manage-panel .bf-danger:hover:not(:disabled) { color:var(--bf-danger); border-color:var(--bf-danger); background:var(--bf-danger-soft); }
.bili-favs-manage-panel .bf-status { display:flex; align-items:center; flex-wrap:wrap; gap:2px 8px; padding:0 0 4px; margin-bottom:4px; font-size:var(--bf-small); }
.bili-favs-manage-panel .bf-status>span { color:var(--bf-muted); font-variant-numeric:tabular-nums; }
.bili-favs-manage-panel .bf-status[data-status=failed] strong,.bili-favs-manage-panel .bf-status[data-status=interrupted] strong { color:var(--bf-danger); }
.bili-favs-manage-panel .bf-status[data-status=completed] strong { color:var(--bf-success); }
.bili-favs-manage-panel .bf-status[data-status=unknown] strong { color:var(--bf-warning); }
.bili-favs-manage-panel .bf-progress-detail { width:100%; color:var(--bf-muted); }
.bili-favs-manage-panel .bf-progress-detail p { display:inline; margin:0; }
.bili-favs-manage-panel .bf-progress-detail p+p::before { content:' · '; }
.bili-favs-manage-panel .bf-tools { display:flex; align-items:center; flex-wrap:wrap; gap:8px; margin:8px 0; }
.bili-favs-manage-panel .bf-tools select { min-width:0; max-width:100%; }
.bili-favs-manage-panel .bf-tools label { display:flex; align-items:center; gap:4px; }
.bili-favs-manage-panel .bf-catalog-tools { margin:0 0 8px; }
.bili-favs-manage-panel .bf-scope-switch { display:flex; gap:0; flex:1; min-width:0; }
.bili-favs-manage-panel .bf-scope-switch button { flex:1; border-radius:0; font-size:var(--bf-small); padding:4px 6px; }
.bili-favs-manage-panel .bf-scope-switch button+button { margin-left:-1px; }
.bili-favs-manage-panel .bf-scope-switch button:first-child { border-radius:4px 0 0 4px; }
.bili-favs-manage-panel .bf-scope-switch button:last-child { border-radius:0 4px 4px 0; }
.bili-favs-manage-panel .bf-scope-switch button[aria-pressed=true] { background:var(--bf-selected); color:var(--bf-blue); border-color:var(--bf-blue); position:relative; font-weight:600; }
.bili-favs-manage-panel .bf-catalog-tools>button { font-size:var(--bf-small); }
.bili-favs-manage-panel .bf-empty { padding:20px 8px; text-align:center; color:var(--bf-muted); line-height:1.8; }
.bili-favs-manage-panel .bf-folder-item { border-bottom:1px solid var(--bf-line); padding:3px 0; }
.bili-favs-manage-panel .bf-folder-row { display:flex; align-items:flex-start; gap:8px; overflow-wrap:anywhere; min-width:0; }
.bili-favs-manage-panel .bf-folder-item>.bf-folder-row { display:grid; grid-template-columns:20px minmax(0,1fr) max-content; align-items:center; cursor:pointer; min-height:24px; }
.bili-favs-manage-panel .bf-folder-name { min-width:0; overflow-wrap:anywhere; }
.bili-favs-manage-panel .bf-folder-count { font-size:var(--bf-small); color:var(--bf-muted); text-align:right; font-variant-numeric:tabular-nums; }
.bili-favs-manage-panel .bf-folder-reason { display:block; margin-left:28px; font-size:var(--bf-small); color:var(--bf-warning); overflow-wrap:anywhere; }
.bili-favs-manage-panel .bf-inventory-result:not(:empty) { margin-top:12px; padding:8px 0; border-top:1px solid var(--bf-line); }
.bili-favs-manage-panel .bf-mutation-review:not(:empty) { border-left:3px solid var(--bf-danger); padding:8px; margin:12px 0; background:var(--bf-danger-soft); }
.bili-favs-manage-panel .bf-diagnostics { grid-column:2; grid-row:1/3; border-left:1px solid var(--bf-line); background:var(--bf-soft); padding:8px; display:flex; flex-direction:column; min-height:0; min-width:0; }
.bili-favs-manage-panel .bf-log-heading { display:flex; align-items:baseline; justify-content:space-between; gap:4px; flex-wrap:wrap; }
.bili-favs-manage-panel .bf-log-heading h2 { font-size:var(--bf-text); margin:0; }
.bili-favs-manage-panel .bf-diagnostics .bf-tools { margin:4px 0 6px; gap:4px 8px; font-size:var(--bf-small); }
.bili-favs-manage-panel .bf-diagnostics button,.bili-favs-manage-panel .bf-diagnostics select { font-size:var(--bf-small); min-height:28px; padding:4px 6px; }
.bili-favs-manage-panel .bf-diagnostics label { gap:4px; }
.bili-favs-manage-panel .bf-log-filter select { appearance:auto; background-image:none; min-width:90px; flex:1; }
.bili-favs-manage-panel .bf-log-filter { flex:1; min-width:110px; }
.bili-favs-manage-panel .output-text-box { flex:1; overflow:auto; min-height:32px; border-top:1px solid var(--bf-line); font-size:var(--bf-small); line-height:1.5; scrollbar-width:thin; scroll-padding:8px; }
.bili-favs-manage-panel .bf-log-row { display:grid; grid-template-columns:54px 28px minmax(0,1fr); gap:0 6px; padding:5px 0; border-bottom:1px solid var(--bf-line); align-items:baseline; }
.bili-favs-manage-panel .bf-log-context { color:var(--bf-muted); font-size:var(--bf-small); text-align:right; overflow-wrap:anywhere; }
.bili-favs-manage-panel .bf-log-help { margin:4px 0; }
.bili-favs-manage-panel .bf-log-row time { color:var(--bf-muted); font-variant-numeric:tabular-nums; }
.bili-favs-manage-panel .bf-log-level { font-weight:600; }
.bili-favs-manage-panel .bf-log-message { grid-column:1/-1; white-space:pre-wrap; overflow-wrap:anywhere; min-width:0; }
.bili-favs-manage-panel .bf-log-error { color:var(--bf-danger); }
.bili-favs-manage-panel .bf-log-warn { color:var(--bf-warning); }
.bili-favs-manage-panel .bf-log-debug { color:var(--bf-muted); }
.bili-favs-manage-panel .bf-log-actions { display:flex; gap:8px; padding-top:6px; }
.bili-favs-manage-panel .bf-export { position:absolute; inset:0; background:var(--bf-surface); z-index:2; padding:16px; display:flex; align-content:flex-start; flex-wrap:wrap; gap:12px; overflow:auto; }
.bili-favs-manage-panel .bf-export h3,.bili-favs-manage-panel .bf-export p { width:100%; }
.bili-favs-manage-panel textarea { display:block; width:100%; height:55%; min-height:140px; resize:vertical; padding:8px; margin:0; border:1px solid var(--bf-control); background:var(--bf-surface); }
.bili-favs-manage-panel .bf-settings { display:grid; gap:10px; }
.bili-favs-manage-panel .bf-setting-row { width:100%; display:flex; align-items:center; justify-content:space-between; gap:8px; }
.bili-favs-manage-panel .bf-navigation button[data-settings=true] { margin-left:auto; }
 .bili-favs-manage-panel[data-records-layout=bottom] .bf-body { grid-template-columns:minmax(0,1fr); grid-template-rows:minmax(0,1fr) auto auto; }
 .bili-favs-manage-panel[data-records-layout=bottom] .bf-diagnostics { grid-column:1; grid-row:3; border-left:0; border-top:1px solid var(--bf-line); height:var(--bf-record-height,130px); }
 .bili-favs-manage-panel[data-records-layout=bottom] .bf-record-tools { display:block; }
 .bili-favs-manage-panel[data-records-layout=bottom] .bf-log-heading .bf-muted { font-size:var(--bf-small); }
 .bili-favs-manage-panel[data-records-layout=bottom] .bf-diagnostics .bf-tools { margin:0; }
 .bili-favs-manage-panel[data-records-layout=bottom] .bf-log-actions { padding:4px 0 0; }
 .bili-favs-manage-panel[data-records-layout=bottom] .bf-log-row { grid-template-columns:54px 28px minmax(0,1fr); gap:4px; padding:4px 0; }
 .bili-favs-manage-panel[data-records-layout=bottom] .bf-log-context { grid-column:1/-1; text-align:left; }
 .bili-favs-manage-panel[data-records-layout=bottom] .bf-log-row:has(.bf-log-context) .bf-log-message { grid-column:1/-1; }
 .bili-favs-manage-panel[data-records-layout=bottom] .bf-log-message { grid-column:auto; }
 .bili-favs-manage-panel[data-records-layout=bottom] .bf-header { padding:6px; gap:2px; flex-wrap:wrap; }
 .bili-favs-manage-panel[data-records-layout=bottom] .bf-header strong { font-size:14px; }
 .bili-favs-manage-panel[data-records-layout=bottom] .bf-header button { padding:4px; }
 .bili-favs-manage-panel[data-records-layout=bottom] .bf-version { font-size:12px; }
 .bili-favs-manage-panel[data-records-layout=bottom] .bf-content { padding:8px; }
 .bili-favs-manage-panel[data-records-layout=bottom] .bf-footer { padding:6px 8px; }
 @media(max-height:500px) {
  .bili-favs-manage-panel[data-records-layout=bottom] .bf-diagnostics { height:var(--bf-record-height,130px); padding:4px 8px; }
  .bili-favs-manage-panel[data-records-layout=bottom] .bf-diagnostics button,.bili-favs-manage-panel[data-records-layout=bottom] .bf-diagnostics select { min-height:24px; padding:2px 6px; }
  .bili-favs-manage-panel[data-records-layout=bottom] .output-text-box { min-height:24px; }
 }
@media(max-width:595px) { .bili-favs-manage-panel { top:8px; left:8px; } }
@media(max-height:500px) {
 .bili-favs-manage-panel .bf-header { padding-top:4px; padding-bottom:4px; }
 .bili-favs-manage-panel .bf-navigation button { padding-top:4px; padding-bottom:4px; }
 .bili-favs-manage-panel .bf-footer { max-height:28dvh; }
 .bili-favs-manage-panel .bf-diagnostics { max-height:none; }
}
@media(prefers-reduced-motion:reduce) {
 .bili-favs-manage-panel button,.bili-favs-manage-panel select { transition:none; }
 .bili-favs-manage-panel * { scroll-behavior:auto; }
}
`;

  function element(tag, className = '', text = '') {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = text;
    return node;
  }

  function button(text, action, className = '') {
    const node = element('button', className, text);
    node.type = 'button';
    node.addEventListener('click', action);
    return node;
  }

  /** Quiet list row; exact identifiers remain available without overwhelming selection. */
  function folderRow(folder, input, reason = '', duplicate = false) {
    const row = element('div', 'bf-folder-item');
    const label = element('label', 'bf-folder-row');
    label.append(input, element('span', 'bf-folder-name', folder.name),
      element('span', 'bf-folder-count', folder.count == null ? '数量未知' : `${folder.count} 条`));
    const identity = `${folder.kind === 'season' ? '合集' : '收藏夹'} / ID ${folder.id || '未知'} / 所有者 ${folder.ownerId || '未知'}`;
    label.title = `${folder.name} · ${identity}`;
    input.setAttribute('aria-label', `${folder.name} · ${identity}${reason ? ` · 不可选：${reason}` : ''}`);
    row.append(label);
    if (duplicate) row.append(element('span', 'bf-folder-reason', `同名 · ${identity}`));
    if (reason) row.append(element('span', 'bf-folder-reason', `不可选：${reason}`));
    else if (folder.available === false) row.append(element('span', 'bf-folder-reason', '内容已失效，可取消订阅'));
    return row;
  }

  /** Shared, local-only filtering and bulk selection. Hosts own selection side effects. */
  class SelectionToolbar {
    constructor({ rows, busy, change }) {
      this.rows = rows; this.busy = busy; this.change = change;
      this.root = element('div', 'bf-selection-tools');
      const label = element('label', 'bf-search');
      this.search = element('input'); this.search.type = 'search';
      this.search.placeholder = '搜索收藏夹';
      label.append(element('span', 'bf-sr-only', '搜索收藏夹'), this.search);
      this.allButton = button('全选', () => this.toggle(), 'bf-select-all');
      this.count = element('span', 'bf-selection-count');
      this.notice = element('span', 'bf-filter-notice');
      this.notice.hidden = true;
      this.root.append(label, this.allButton, this.count, this.notice);
      this.search.addEventListener('input', () => this.update());
    }

    visibleRows(rows = this.rows()) {
      const query = this.search.value.trim().toLocaleLowerCase();
      return rows.filter(row => row.name.toLocaleLowerCase().includes(query));
    }

    toggle() {
      if (this.busy()) return;
      const rows = this.visibleRows().filter(row => row.eligible);
      if (!rows.length) return;
      const checked = !rows.every(row => row.input.checked);
      for (const row of rows) row.input.checked = checked;
      this.update(); this.change();
    }

    update() {
      const rows = this.rows();
      this.root.dataset.empty = String(!rows.length);
      const visible = new Set(this.visibleRows(rows));
      const eligible = [...visible].filter(row => row.eligible);
      const selected = rows.filter(row => row.eligible && row.input.checked);
      const outside = selected.filter(row => !visible.has(row)).length;
      for (const row of rows) {
        row.node.hidden = !visible.has(row);
        row.node.dataset.selected = String(row.input.checked && row.eligible);
      }
      const all = eligible.length && eligible.every(row => row.input.checked);
      this.allButton.textContent = all ? '取消全选' : '全选';
      this.allButton.setAttribute('aria-label', `${all ? '取消全选' : '全选'}${this.search.value.trim() ? '搜索结果中' : ''}可选收藏夹`);
      this.allButton.disabled = this.busy() || !eligible.length;
      this.search.disabled = this.busy();
      const unavailable = rows.filter(row => !row.eligible).length;
      this.count.textContent = `已选 ${selected.length} / ${rows.length} 个收藏夹${unavailable ? ` · ${unavailable} 个不可选` : ''}`;
      this.notice.hidden = !this.search.value.trim();
      this.notice.textContent = `${visible.size} 个匹配${outside ? ` · 筛选外已选 ${outside} 个，也会执行` : ''}`;
    }
  }

  const statuses = { confirmed: '已确认', failed: '失败', unknown: '结果未知', not_started: '未提交' };
  const descriptions = {
    delete: { verb: '删除', title: '删除自己创建的收藏夹',
      detail: '删除此收藏夹及其中的收藏关系，无法在此撤销。',
      agreement: '我已检查以上目标，理解删除会移除整个收藏夹及其中收藏关系，且这里无法撤销。' },
    unsubscribe: { verb: '退订', title: '取消我的收藏夹订阅',
      detail: '取消当前账号对此收藏夹或合集的订阅。',
      agreement: '我已检查以上类型、ID 和所有者，确认取消当前账号对这些目标的订阅。' }
  };

  class MutationPanel {
    constructor(inventoryUI, engine) {
      this.inventoryUI = inventoryUI; this.panel = inventoryUI.panel; this.engine = engine; this.rows = []; this.action = 'delete';
      this.root = element('section', 'bf-mutations');
      this.heading = element('h2', 'bf-sr-only', descriptions.delete.title);
      this.explanation = element('p', 'bf-muted', descriptions.delete.detail);
      this.root.append(this.heading, this.explanation);
      this.list = element('div', 'bf-folder-list');
      this.previewButton = button('预览删除目标', () => this.preview());
      this.review = element('section', 'bf-mutation-review');
      this.results = element('div'); this.results.setAttribute('role', 'status');
      this.selectionTools = new SelectionToolbar({
        rows: () => this.rows.map(row => ({ ...row, name: row.folder.name, eligible: !row.reason })),
        busy: () => this.panel.busy,
        change: () => { this.invalidate(); this.inventoryUI.updateBusy(); }
      });
      this.root.append(this.selectionTools.root, this.list, this.previewButton, this.review, this.results);
      this.updateBusy();
    }

    invalidate() {
      this.engine.invalidate(); this.ticket = null; this.review.replaceChildren();
      this.agreement = null; this.confirmButton = null; this.updateBusy();
    }

    setCatalog(folders, kind) {
      this.invalidate(); this.rows = []; this.list.replaceChildren();
      if (kind) this.action = kind === 'subscribed' ? 'unsubscribe' : 'delete';
      const description = descriptions[this.action];
      this.heading.textContent = description.title; this.explanation.textContent = description.detail;
      this.previewButton.textContent = `预览${description.verb}目标`;
      const { actor, pageOwner } = this.engine.context();
      if (!folders.length) this.list.append(element('p', 'bf-empty', '加载列表后，在这里选择要管理的收藏夹。默认不会勾选任何项目。'));
      const duplicates = duplicateFavoriteNames(folders.map(folder => folder.name));
      for (const folder of folders) {
        const reason = eligibility(this.action, folder, actor, pageOwner);
        const input = element('input'); input.type = 'checkbox';
        input.addEventListener('change', () => { this.invalidate(); this.inventoryUI.updateBusy(); });
        const node = folderRow(folder, input, reason, duplicates.has(normalizeFavoriteName(folder.name)));
        this.list.append(node); this.rows.push({ folder, input, reason, node });
      }
      this.updateBusy();
    }

    selected() { return this.rows.filter(row => row.input.checked && !row.reason).map(row => row.folder); }

    updateBusy() {
      const busy = this.panel.busy;
      this.selectionTools?.update();
      this.previewButton.disabled = busy || !this.selected().length;
      this.previewButton.hidden = this.inventoryUI.mode !== 'manage' || busy || this.review.childElementCount > 0;
      for (const row of this.rows) row.input.disabled = busy || !!row.reason;
      if (this.confirmButton) this.confirmButton.disabled = busy || !this.agreement?.checked || !this.ticket;
      if (this.agreement) this.agreement.disabled = busy;
    }

    preview() {
      if (this.panel.busy) return;
      this.invalidate();
      this.results.replaceChildren();
      try {
        if (this.action === 'unsubscribe' && this.panel.manager.modes?.manage === 'web' && !PageDetector.isOwnPage())
          throw new Error('网页退订请先打开我的收藏夹页面，再加载“我的订阅”；也可在设置中明确选择 API。');
        const description = descriptions[this.action];
        this.ticket = this.engine.prepare(this.action, this.selected());
        const mode = this.panel.manager.modes?.manage;
        this.review.append(element('h3', '', `将${description.verb} ${this.ticket.targets.length} 项${mode ? `（${mode === 'api' ? 'API' : '网页'}）` : ''}`));
        this.review.append(element('p', '', description.detail));
        for (const target of this.ticket.targets) this.review.append(element('p', '', `${target.name} · ${target.kind === 'season' ? '合集' : '收藏夹'} · ID ${target.id} · 所有者 ${target.ownerId || '未知'} · ${target.count ?? '未知'} 条${target.available === false ? ' · 内容已失效' : ''}`));
        if (mode === 'web') this.review.append(element('p', 'bf-muted', '将自动展开并加载网页列表，核对每项 ID 后操作；失效条目也会尝试核对。'));
        this.agreement = element('input'); this.agreement.type = 'checkbox';
        const label = element('label', 'bf-folder-row'); label.append(this.agreement, element('span', '', description.agreement));
        this.agreement.addEventListener('change', () => this.updateBusy());
        this.confirmButton = button(`确认${description.verb}以上目标`, () => this.execute());
        this.confirmButton.classList.add('bf-danger');
        const actions = element('div', 'bf-tools'); actions.append(this.confirmButton, button('放弃本次操作', () => { this.invalidate(); this.previewButton.focus(); }));
        this.review.append(label, actions);
        this.review.scrollIntoView?.({ block: 'nearest', behavior: 'instant' });
        this.updateBusy(); this.agreement.focus();
      } catch (err) { this.results.textContent = err.message; }
    }

    execute() {
      if (this.panel.busy || !this.ticket || !this.agreement?.checked) return;
      const ticket = this.ticket; this.ticket = null; this.review.replaceChildren();
      return this.inventoryUI.run(`${descriptions[ticket.action].verb}收藏夹`, async signal => {
        const report = await this.engine.execute(ticket, { confirmed: true, signal, onResult: result => {
          if (result.status === 'confirmed') this.inventoryUI.operation.confirm(`ID ${result.id}：平台已确认`);
          this.panel.appendLog(`${descriptions[ticket.action].verb} [${result.name}] · ID ${result.id} · ${statuses[result.status]}：${result.detail}`,
            result.status === 'confirmed' ? this.panel.normalCode : result.status === 'failed' ? this.panel.errorCode : this.panel.warnCode);
        } });
        this.inventoryUI.resetCatalog('本次操作后列表需要更新，请重新加载。');
        this.results.replaceChildren(element('p', '', report.complete ? '本次目标均已确认。请刷新平台列表核对。' : report.cancelled ? '已取消后续操作。请核对已提交项目。' : '已停止；请检查下列结果后再决定后续操作。'));
        for (const result of report.results) this.results.append(element('p', '', `${result.name} · ID ${result.id} · ${statuses[result.status]}：${result.detail}`));
        this.results.append(button('检查并导出操作结果', () => this.panel.reviewExport(JSON.stringify(report, null, 2), 'bili-operation.json')));
        const stopped = report.results.find(result => ['failed', 'unknown'].includes(result.status));
        this.inventoryUI.operation.finish(report.complete ? 'completed' : report.cancelled ? 'interrupted' : report.results.some(result => result.status === 'unknown') ? 'unknown' : 'failed',
          report.complete ? '已完成；再次操作请重新加载、选择并确认。' :
            `${stopped ? `${stopped.name}：${stopped.detail}` : '已取消后续操作。'} 请核对结果，再重新加载和确认。`);
      }, ticket.action, ticket.targets.length);
    }

    destroy() { this.invalidate(); }
  }

  /** Paged local view: exports keep every retained item; DOM stays bounded. */
  function videoDetails(report) {
    const root = element('details', 'bf-video-details');
    const videos = [...report.videos, ...(report.unidentified || [])];
    root.append(element('summary', '', `视频明细（${videos.length} 项）`));
    const label = element('label', 'bf-search', '搜索视频或作者');
    const search = element('input'); search.type = 'search'; label.append(search);
    const list = element('ol', 'bf-video-list'), count = element('span', 'bf-muted');
    let page = 0;
    const previous = button('上一页', () => { page--; render(); });
    const next = button('下一页', () => { page++; render(); });
    const tools = element('div', 'bf-tools'); tools.append(previous, count, next);
    const render = () => {
      const query = search.value.trim().toLocaleLowerCase();
      const matches = videos.filter(v => [v.title, v.uploaderName, v.id, v.bvid, ...v.folders.map(f => f.name)].some(value => String(value || '').toLocaleLowerCase().includes(query)));
      const pages = Math.max(1, Math.ceil(matches.length / 50)); page = Math.max(0, Math.min(page, pages - 1));
      count.textContent = `${matches.length} 项 · ${page + 1}/${pages} 页`; previous.disabled = page === 0; next.disabled = page + 1 === pages;
      list.replaceChildren(); list.start = page * 50 + 1;
      for (const video of matches.slice(page * 50, (page + 1) * 50)) {
        const row = element('li');
        const title = element(video.url ? 'a' : 'span', '', video.title || '（视频名称未知）');
        if (video.url) { title.href = video.url; title.target = '_blank'; title.rel = 'noopener noreferrer'; }
        row.append(title, element('p', 'bf-muted', `${video.uploaderName || '作者未知'} · ${video.duration === null ? '时长未知' : `${video.duration} 秒`}${video.unavailable ? ' · 已失效' : ''} · 出现 ${video.occurrences || 1} 次`),
          element('p', 'bf-muted', `所在收藏夹：${video.folders.map(f => f.name).join('、')}`));
        list.append(row);
      }
      if (!matches.length) list.append(element('li', 'bf-muted', '没有匹配的视频。'));
    };
    search.addEventListener('input', () => { page = 0; render(); });
    root.addEventListener('toggle', () => { if (root.open && !list.children.length) render(); });
    root.append(label, list, tools);
    return root;
  }

  class InventoryPanel {
    constructor(panel, service) {
      this.panel = panel; this.service = service; this.folders = []; this.rows = [];
      this.mode = 'statistics';
      this.root = element('section', 'bf-inventory');
      this.kind = element('div', 'bf-scope-switch'); this.kind.setAttribute('role', 'group'); this.kind.setAttribute('aria-label', '列表范围');
      this.kind.value = 'created'; this.scopeButtons = new Map();
      for (const [value, label] of [['created', '当前空间创建'], ['subscribed', '我的订阅']]) {
        const control = button(label, () => {
          if (panel.busy || this.kind.value === value) return;
          this.kind.value = value; this.kind.dispatchEvent(new window.Event('change'));
        });
        this.scopeButtons.set(value, control); this.kind.append(control);
      }
      this.loadButton = button('加载列表', () => this.load());
      this.scanButton = button('统计选中收藏夹', () => this.scan());
      this.cancelButton = button('停止后续操作', () => { this.controller?.abort(); this.updateBusy(); });
      this.exportButton = button('检查并导出统计', () => { if (this.report) panel.reviewExport(JSON.stringify(this.report, null, 2), 'bili-inventory.json'); });
      const tools = element('div', 'bf-tools bf-catalog-tools');
      tools.append(this.kind, this.loadButton);
      this.selectionTools = new SelectionToolbar({
        rows: () => this.rows.map(row => ({ ...row, name: row.folder.name, eligible: row.folder.kind !== 'unsupported' && row.folder.available !== false })),
        busy: () => panel.busy, change: () => this.updateBusy()
      });
      this.selectionCount = this.selectionTools.count;
      this.actions = element('div', 'bf-action-bar');
      this.actions.append(this.exportButton, this.scanButton, this.cancelButton);
      this.scanButton.classList.add('bf-primary');
      this.list = element('div', 'bf-folder-list');
      this.list.append(element('p', 'bf-empty', '加载列表后，选择需要统计的收藏夹。'));
      this.result = element('div', 'bf-inventory-result'); this.result.setAttribute('role', 'status');
      this.root.append(tools, this.selectionTools.root, this.list, this.result);
      if (panel.manager.batchOperations) {
        this.mutations = new MutationPanel(this, panel.manager.batchOperations);
        this.root.append(this.mutations.root);
        this.actions.insertBefore(this.mutations.previewButton, this.cancelButton);
      }
      this.kind.addEventListener('change', () => {
        this.resetCatalog('范围已更换，请重新加载列表。'); this.updateBusy();
        this.operation.update({ status: 'idle', action: '', confirmed: 0, total: null, lastConfirmed: '', detail: '' });
      });
      this.mutations?.setCatalog([], this.kind.value);
      this.updateBusy();
    }

    get operation() { return this.panel.operations[this.mode]; }

    resetCatalog(message) {
      for (const view of ['statistics', 'manage']) {
        const operation = this.panel.operations[view];
        if (operation.state.status !== 'running')
          operation.update({ status: 'idle', action: '', detail: '', confirmed: 0, total: null, lastConfirmed: '' });
      }
      this.panel.viewScroll.delete('statistics'); this.panel.viewScroll.delete('manage');
      if (this.panel.activeView !== 'copy') this.panel.content.scrollTop = 0;
      this.folders = []; this.rows = []; this.report = null; this.result.replaceChildren();
      this.catalogOwner = null; this.catalogKind = null;
      this.list.replaceChildren(element('p', 'bf-empty', message));
      this.mutations?.setCatalog([], this.kind.value); this.mutations?.results.replaceChildren();
    }

    setMode(mode) {
      if (this.mode !== mode) {
        this.mutations?.invalidate();
      }
      this.mode = mode;
      const manage = mode === 'manage';
      this.selectionTools.root.hidden = manage;
      this.list.hidden = manage; this.result.hidden = manage;
      if (this.mutations) this.mutations.root.hidden = !manage;
      this.updateBusy();
    }

    updateBusy() {
      const busy = this.panel.busy;
      this.kind.disabled = busy; this.loadButton.disabled = busy;
      for (const [kind, control] of this.scopeButtons) {
        control.disabled = busy; control.setAttribute('aria-pressed', String(this.kind.value === kind));
        control.textContent = this.mode === 'manage' ? kind === 'created' ? '删除收藏夹' : '取消订阅' : kind === 'created' ? '当前空间' : '我的订阅';
      }
      this.loadButton.textContent = busy ? '操作中…' : this.folders.length ? '重新加载' : '加载列表';
      this.scanButton.disabled = busy || !this.selected().length;
      this.cancelButton.disabled = !busy || !this.controller || this.controller.signal.aborted;
      this.exportButton.disabled = busy || !this.report;
      const manage = this.mode === 'manage';
      this.scanButton.hidden = manage || busy;
      this.exportButton.hidden = manage || !this.report || busy;
      this.cancelButton.hidden = !this.controller;
      if (this.mutations) this.mutations.previewButton.hidden = !manage || busy;
      this.selectionTools.update();
      for (const row of this.rows) row.input.disabled = busy || row.folder.kind === 'unsupported' || row.folder.available === false;
      this.mutations?.updateBusy();
    }

    selected() { return this.rows.filter(row => row.input.checked && row.folder.kind !== 'unsupported' && row.folder.available !== false).map(row => row.folder); }

    async run(action, work, phase = '', total = null) {
      if (this.panel.busy) return;
      this.controller = new AbortController();
      const modes = this.panel.manager.modes;
      const mode = modes?.[phase === 'delete' || phase === 'unsubscribe' ? 'manage' : 'read'];
      this.panel.setBusy(true); this.operation.begin(mode ? `${action}（${mode === 'api' ? 'API' : '网页'}）` : action, total, { phase });
      try { await work(this.controller.signal); }
      catch (err) {
        this.operation.finish(this.controller.signal.aborted ? 'interrupted' : 'failed', this.controller.signal.aborted ? '已取消，可以重新加载或选择。' : err.message);
      } finally {
        if (this.controller.signal.aborted && this.operation.state.status === 'running') this.operation.finish('interrupted', '已取消，未继续后续请求。');
        this.controller = null; this.panel.setBusy(false);
      }
    }

    load() {
      return this.run('读取收藏夹列表', async signal => {
        this.resetCatalog('正在读取列表，请稍候…');
        const kind = this.kind.value;
        const owner = kind === 'created' ? PageDetector.getCurrentPageUID() : PageDetector.getLoginUserUID();
        let folders;
        try { folders = await this.service.client.folders(owner, kind, signal); }
        catch (err) {
          this.list.replaceChildren(element('p', 'bf-empty', signal.aborted ? '已停止读取，可以重新加载列表。' : '列表未能加载，请检查下方原因后重新加载。'));
          throw err;
        }
        if (signal.aborted) {
          this.list.replaceChildren(element('p', 'bf-empty', '已停止读取，可以重新加载列表。'));
          return;
        }
        this.list.replaceChildren();
        this.folders = folders; this.catalogOwner = owner; this.catalogKind = kind;
        this.mutations?.setCatalog(folders, kind);
        const duplicates = duplicateFavoriteNames(folders.map(folder => folder.name));
        for (const folder of folders) {
          const input = element('input'); input.type = 'checkbox'; input.disabled = folder.kind === 'unsupported';
          input.addEventListener('change', () => this.updateBusy());
          const node = folderRow(folder, input, folder.kind === 'unsupported' ? '类型未识别' : folder.available === false ? '内容已失效，无法统计' : '', duplicates.has(normalizeFavoriteName(folder.name)));
          this.list.append(node); this.rows.push({ input, folder, node });
        }
        if (!folders.length) this.list.append(element('p', 'bf-empty', '这个范围没有可读取的收藏夹。可以更换范围后重新加载。'));
        this.operation.finish('completed', `已读取 ${folders.length} 个收藏夹。`);
        this.operation.update({ status: 'idle' });
      }, 'loading');
    }

    scan() {
      const folders = this.selected();
      return this.run('只读统计', async signal => {
        this.report = null; this.result.replaceChildren();
        const report = await this.service.scan(folders, { signal, onPage: ({ page, loaded }) => this.operation.confirm(`第 ${page} 页，当前夹已读取 ${loaded} 条`) });
        this.report = report;
        this.result.replaceChildren(element('p', '', `${report.complete ? '完整扫描' : report.cancelled ? '已取消 · 部分结果' : '扫描不完整'}：覆盖 ${report.folders.length}/${report.scope.length} 个收藏夹，读取 ${report.entries} 条。`),
          element('p', '', `唯一视频 ${report.uniqueVideos} · 重复出现 ${report.duplicateOccurrences} · 无法识别 ${report.unknownIdentity} · 失效标记 ${report.unavailable}`),
          element('p', '', `已知时长合计 ${report.knownDurationSeconds} 秒（唯一视频；${report.unknownDurations} 个时长未知）· ${report.unknownUploaders} 个作者未知`));
        for (const f of report.folders) this.result.append(element('p', 'bf-muted', `${f.name}：${f.pages} 页 / 读取 ${f.loaded} 条 / 平台标称 ${f.expected ?? '未知'}${f.issue ? ` · ${f.issue}` : ''}`));
        this.result.append(videoDetails(report));
        const issues = report.folders.filter(f => f.issue).map(f => `${f.name}：${f.issue}`);
        this.operation.finish(report.complete ? 'completed' : 'interrupted', report.complete ? '所选范围统计完成，缺失信息记为未知。' :
          `${report.cancelled ? '已停止。' : '统计不完整。'}已保留视频明细，可检查并导出。${issues.join('；')}`);
      }, 'scanning');
    }

    destroy() { this.controller?.abort(); this.mutations?.destroy(); }
  }

  /** Geometry is UI state; never restores execution state. */
  class PanelLayout {
    constructor(panel, preferences) { this.panel = panel; this.preferences = preferences; this.auxiliary = preferences.auxiliary; }
    get root() { return this.panel.floatingPanel; }
    restore() {
      const { geometry, layout } = this.preferences;
      if (geometry) for (const key of ['width', 'height', 'left', 'top']) this.root.style[key] = `${geometry[key]}px`;
      this.root.dataset.recordsLayout = this.panel.logsOpen ? this.orientation() : layout;
      if (this.auxiliary) this.root.style.setProperty(layout === 'bottom' ? '--bf-record-height' : '--bf-record-width', `${this.auxiliary}px`);
      this.clamp();
    }
    rect() {
      const r = this.root.getBoundingClientRect();
      return { width: r.width || parseFloat(this.root.style.width) || CONFIG.PANEL.INITIAL_WIDTH,
        height: r.height || parseFloat(this.root.style.height) || CONFIG.PANEL.INITIAL_HEIGHT,
        left: r.width ? r.left : parseFloat(this.root.style.left) || 24,
        top: r.height ? r.top : parseFloat(this.root.style.top) || 24 };
    }
    orientation() { return this.rect().width < 560 ? 'bottom' : 'side'; }
    clamp() {
      const r = this.rect();
      const width = Math.min(r.width, Math.max(280, window.innerWidth - 16));
      const height = Math.min(r.height, Math.max(64, window.innerHeight - 16));
      if (r.width !== width) this.root.style.width = `${width}px`;
      if (r.height !== height) this.root.style.height = `${height}px`;
      this.root.style.left = `${Math.max(0, Math.min(r.left, window.innerWidth - width))}px`;
      this.root.style.top = `${Math.max(0, Math.min(r.top, window.innerHeight - height))}px`;
      if (this.panel.logsOpen) this.root.dataset.recordsLayout = this.orientation();
    }
    toggle(willOpen) {
      const r = this.rect();
      const side = this.root.dataset.recordsLayout !== 'bottom';
      if (!willOpen) {
        const pane = this.panel.diagnostics.getBoundingClientRect();
        this.auxiliary = side ? pane.width || (r.width - 2) / 2.2 : pane.height || 130;
      }
      const key = side ? 'width' : 'height';
      if (willOpen) this.root.style.setProperty(side ? '--bf-record-width' : '--bf-record-height', `${this.auxiliary}px`);
      this.root.style[key] = `${Math.max(side ? 280 : 64, r[key] + (willOpen ? 1 : -1) * this.auxiliary)}px`;
    }
    save() {
      if (!this.root) return;
      const geometry = this.rect();
      if (this.panel.minimized) geometry.height = parseFloat(this.panel.hiddenHeight) || CONFIG.PANEL.INITIAL_HEIGHT;
      this.preferences.store.write({ version: 1, geometry, logsOpen: this.panel.logsOpen,
        layout: this.root.dataset.recordsLayout, auxiliary: this.auxiliary,
        modes: this.panel.manager.modes || this.preferences.modes });
    }
    reset() {
      const p = this.panel;
      if (p.minimized) p.toggleMinimize();
      if (!p.logsOpen) p.toggleLogs();
      this.auxiliary = 0;
      this.root.style.removeProperty('--bf-record-width'); this.root.style.removeProperty('--bf-record-height');
      Object.assign(this.root.style, { width: `${CONFIG.PANEL.INITIAL_WIDTH}px`, height: `${CONFIG.PANEL.INITIAL_HEIGHT}px`, left: '24px', top: '24px' });
      this.clamp(); this.save();
    }
  }

  function helpPanel() {
    const root = element('section', 'bf-help-panel');
    root.setAttribute('aria-label', '帮助');
    root.append(element('h2', '', '使用帮助'));
    const topics = [
      ['复制收藏夹', '先登录，再打开他人的收藏夹页面。勾选来源并填写目标名，内容会复制到自己账号，来源保留。同名目标会复用；若有多个同名收藏夹，请先改名。网页创建会先跳转到自己的空间，再返回继续复制。'],
      ['统计与视频明细', '选择“当前空间”或“我的订阅”，加载列表后勾选收藏夹再统计。只读取选中范围，可查看视频明细并导出。结果显示覆盖页数；“扫描不完整”只代表已读取的部分。'],
      ['网页操作和 API', '在“设置”选择方式。网页读取会打开收藏夹并逐页查看，请等待完成，期间避免手动切换。API 读取直接请求 B 站接口；权限和接口变化都可能导致失败。保存设置保留已加载的列表，新任务使用新方式。'],
      ['删除与取消订阅', '删除仅适用于自己创建的非默认、非特殊收藏夹；取消订阅不会删除原作者内容。先选择、预览并核对具体 ID，再勾选确认。网页退订需在自己的收藏夹页面进行；失效条目也需确认身份。'],
      ['遇到停止或待核对', '“待核对”表示可能已经提交，请先检查 B 站目标结果，避免重复操作。普通停止会说明原因。打开“记录”，选择“排查详情”查看按钮步骤；导出包含全部保留记录，发给他人前请检查内容。']
    ];
    for (const [title, text] of topics) {
      const details = element('details'); details.append(element('summary', '', title), element('p', '', text)); root.append(details);
    }
    root.append(element('h3', '', '交流与反馈'), element('p', '', 'QQ 群：524764959（在 QQ 搜索群号加入）'));
    for (const [label, href] of [['项目说明与入群二维码', 'https://github.com/leida1024/bilibili-favs-manage#qq-group'], ['反馈问题', 'https://github.com/leida1024/bilibili-favs-manage/issues']]) {
      const link = element('a', '', label); link.href = href; link.target = '_blank'; link.rel = 'noopener noreferrer';
      const line = element('p'); line.append(link); root.append(line);
    }
    return root;
  }

  const statusNames = { idle: '准备就绪', running: '进行中', completed: '已完成', failed: '已停止', interrupted: '已中断', unknown: '待核对', waiting: '等待跳转' };
  const logLevels = { info: '信息', warn: '警告', error: '错误', debug: '调试' };

  class FloatingPanel {
    constructor(manager) {
      this.manager = manager;
      this.operations = { copy: manager.operation || new OperationState(), statistics: new OperationState(), manage: new OperationState() };
      this.logs = manager.logs || new LogStore();
      this.operationTransitions = new Map();
      this.errorCode = 0;
      this.normalCode = 1;
      this.warnCode = 7;
      this.debugCode = 8;
      this.favCheckboxItemList = [];
      this.busy = false;
      this.scrollTopEnabled = true;
      this.minW = 280;
      this.minH = 64;
      this.activeView = 'copy';
      this.viewScroll = new Map();
      this.preferences = panelPreferences();
      this.logsOpen = this.preferences.logsOpen;
      this.layout = new PanelLayout(this, this.preferences);
    }

    get operation() { return this.operations[this.activeView] || this.operations.copy; }

    init() {
      this.favorites = this.manager.getAllFavoriteNames();
      const root = element('section', 'bili-favs-manage-panel floating-panel');
      root.setAttribute('aria-label', '收藏夹管理');
      const style = element('style');
      style.textContent = panelStyles;
      this.floatingPanel = root;
      this.header = element('header', 'bf-header');
      this.header.setAttribute('role', 'group');
      this.header.tabIndex = 0;
      this.header.title = '拖动标题移动；聚焦标题后方向键移动，Shift + 方向键调整大小';
      this.header.setAttribute('aria-label', this.header.title);
      this.header.addEventListener('keydown', event => {
        if (event.target !== this.header || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
        event.preventDefault(); const r = this.layout.rect();
        const dx = event.key === 'ArrowLeft' ? -10 : event.key === 'ArrowRight' ? 10 : 0;
        const dy = event.key === 'ArrowUp' ? -10 : event.key === 'ArrowDown' ? 10 : 0;
        if (event.shiftKey && !this.minimized) EventHandlers.judgePanelSizeAndUpdate(this, r.left, r.top, r.width + dx, r.height + dy);
        else EventHandlers.judgePanelPosAndUpdate(this, r.left + dx, r.top + dy);
        this.layout.save();
      });
      this.header.append(element('strong', '', '收藏夹管理'));
      this.versionLabel = element('span', 'bf-version', `v${CONFIG.SCRIPT.VERSION}`);
      this.header.append(this.versionLabel);
      this.logsButton = button('记录', () => this.toggleLogs(), 'bf-quiet');
      this.logsButton.setAttribute('aria-expanded', String(this.logsOpen));
      this.logsButton.setAttribute('aria-label', this.logsOpen ? '收起操作记录' : '查看操作记录');
      this.minimizeButton = button('−', () => this.toggleMinimize());
      this.minimizeButton.setAttribute('aria-label', '最小化'); this.minimizeButton.title = '最小化';
      this.dismissButton = button('×', () => { this.onDismiss?.(); this.destroy(); });
      this.dismissButton.setAttribute('aria-label', '关闭'); this.dismissButton.title = '关闭';
      this.header.append(this.logsButton, this.minimizeButton, this.dismissButton);
      this.notice = element('aside', 'bf-notice');
      this.notice.setAttribute('aria-label', '交流与帮助');
      const noticeWindow = element('div', 'bf-notice-window');
      const noticeText = button('QQ 群 524764959 · 使用帮助与问题反馈 → 帮助', () => this.showView('help'), 'bf-notice-text');
      noticeWindow.append(noticeText);
      this.pauseNoticeButton = button('停止滚动', () => {
        const paused = this.notice.dataset.paused !== 'true';
        this.notice.dataset.paused = String(paused);
        this.pauseNoticeButton.textContent = paused ? '继续滚动' : '停止滚动';
        this.pauseNoticeButton.setAttribute('aria-label', paused ? '继续滚动顶部提示' : '停止滚动顶部提示');
        this.pauseNoticeButton.setAttribute('aria-pressed', String(paused));
      });
      this.pauseNoticeButton.setAttribute('aria-label', '停止滚动顶部提示');
      this.pauseNoticeButton.setAttribute('aria-pressed', 'false');
      this.notice.append(noticeWindow, this.pauseNoticeButton);
      this.header.insertBefore(this.notice, this.logsButton);
      this.navigation = element('nav', 'bf-navigation');
      this.navigation.setAttribute('aria-label', '管理功能');
      this.viewButtons = new Map();
      for (const [view, label] of [['copy', '复制收藏夹'], ['statistics', '统计'], ['manage', '管理']]) {
        if (view !== 'copy' && !this.manager.inventory) continue;
        const control = button(label, () => this.showView(view));
        this.viewButtons.set(view, control); this.navigation.append(control);
      }
      if (this.manager.modes) {
        this.modeButton = button('设置', () => this.showView('settings'));
        this.modeButton.dataset.settings = 'true';
        this.viewButtons.set('settings', this.modeButton);
        this.navigation.append(this.modeButton);
      }
      const helpButton = button('帮助', () => this.showView('help'));
      this.viewButtons.set('help', helpButton); this.navigation.append(helpButton);
      this.content = element('div', 'bf-content');
      this.scope = element('p', 'bf-sr-only');
      this.workspace = element('section', 'bf-workspace');
      const heading = element('div', 'bf-task-heading');
      heading.append(this.scope);
      const help = element('p', 'bf-help', '同名则复用，否则新建；来源保留。');
      this.copyHelp = help;
      heading.append(help);
      this.workspace.append(heading);
      this.leftPanel = element('section', 'bf-sources');
      this.selectionTools = new SelectionToolbar({
        rows: () => this.favCheckboxItemList.map(item => ({ input: item.checkbox, node: item.checkboxContainer, name: item.getLabelValue(), eligible: !item.ambiguous && !copyBlockReason(currentCopyContext()) })),
        busy: () => this.busy, change: () => this.updateSelectionReview()
      });
      this.selectionTools.search.addEventListener('input', () => this.updateSelectionReview());
      this.selectAllButton = this.selectionTools.allButton;
      const columns = element('div', 'bf-copy-columns');
      this.sourceColumn = element('span', '', '来源收藏夹');
      columns.append(element('span'), this.sourceColumn, element('span', 'bf-direction', ''), element('span', '', '目标（我的收藏夹）'));
      this.leftPanel.append(this.selectionTools.root, columns, this.createFavPanel());
      this.selectionReview = this.selectionTools.count;
      this.startBatchTransferButton = button('开始批量复制', () => this.startBatchTransfer(), 'bf-primary');
      this.copyActions = element('div', 'bf-action-bar');
      this.copyActions.append(this.startBatchTransferButton);
      this.workspace.append(this.leftPanel);
      this.content.append(this.workspace);
      this.statusBox = element('section', 'bf-status');
      this.statusBox.setAttribute('role', 'status');
      this.statusBox.setAttribute('aria-live', 'polite');
      this.statusTitle = element('strong');
      this.statusCount = element('span');
      this.progressDetails = element('section', 'bf-progress-detail');
      this.progressDetails.hidden = true;
      this.progressLast = element('p'); this.progressMessage = element('p');
      this.progressDetails.append(this.progressMessage, this.progressLast);
      this.statusBox.append(this.statusTitle, this.statusCount);
      if (this.manager.inventory) {
        this.inventoryPanel = new InventoryPanel(this, this.manager.inventory);
        this.content.append(this.inventoryPanel.root);
      }
      if (this.manager.modes) { this.createSettingsPanel(); this.content.append(this.settingsRoot); }
      this.helpRoot = helpPanel(); this.content.append(this.helpRoot);
      this.createDiagnostics();
      this.footer = element('footer', 'bf-footer');
      this.statusBox.append(this.progressDetails);
      this.footer.append(this.statusBox, this.copyActions);
      if (this.inventoryPanel) this.footer.append(this.inventoryPanel.actions);
      this.body = element('div', 'bf-body');
      this.body.append(this.content, this.footer, this.diagnostics);
      this.resizeGrip = element('span', 'bf-resize-grip');
      this.resizeGrip.setAttribute('aria-hidden', 'true');
      this.resizeGrip.title = '拖动调整大小';
      root.append(style, this.header, this.navigation, this.body, this.resizeGrip);
      document.body.append(root);
      root.dataset.logsOpen = String(this.logsOpen);
      this.unsubscribes = Object.entries(this.operations).map(([view, operation]) =>
        operation.subscribe(state => this.onOperation(view, state)));
      this.onBodyMove = event => {
        EventHandlers.mouseMove(this, event);
        EventHandlers.dragOnPanel(this, event);
      };
      this.onBodyUp = () => { this.resizeable = false; this.isDragging = false; this.dragStart = null; this.layout.save(); };
      root.addEventListener('mousedown', event => EventHandlers.mouseDown(this, event));
      document.addEventListener('mousemove', this.onBodyMove);
      document.addEventListener('mouseup', this.onBodyUp);
      window.addEventListener('blur', this.onBodyUp);
      this.onViewportResize = () => { this.clampToViewport(); this.layout.save(); };
      window.addEventListener('resize', this.onViewportResize);
      this.layout.restore();
      this.updateSelectionReview();
      this.showPageTypeIndicator();
      this.renderView();
    }

    showView(view) {
      if (!['copy', 'statistics', 'manage', 'settings', 'help'].includes(view) || this.busy || view === this.activeView) return;
      if ((view === 'statistics' || view === 'manage') && !this.inventoryPanel) return;
      if (view === 'settings' && !this.settingsRoot) return;
      this.viewScroll.set(this.activeView, this.content.scrollTop);
      this.inventoryPanel?.mutations?.invalidate();
      this.activeView = view;
      this.renderView();
      this.content.scrollTop = this.viewScroll.get(view) || 0;
    }

    renderView() {
      const view = this.activeView;
      this.updateModeSummary();
      this.workspace.hidden = view !== 'copy';
      if (this.settingsRoot) this.settingsRoot.hidden = view !== 'settings';
      this.helpRoot.hidden = view !== 'help';
      if (this.inventoryPanel) {
        this.inventoryPanel.root.hidden = !['statistics', 'manage'].includes(view);
        if (view === 'statistics' || view === 'manage') this.inventoryPanel.setMode(view);
        this.inventoryPanel.actions.hidden = !['statistics', 'manage'].includes(view);
      }
      this.copyActions.hidden = view !== 'copy';
      this.renderOperation(this.operation.state);
      if (this.outputTextBox && this.logsOpen && !this.minimized) this.renderLogs();
      this.footer.hidden = !!this.minimized || ['settings', 'help'].includes(view);
      for (const [name, control] of this.viewButtons) control.setAttribute('aria-pressed', String(name === view));
    }

    toggleLogs() {
      if (this.minimized) this.toggleMinimize();
      this.layout.toggle(!this.logsOpen);
      this.logsOpen = !this.logsOpen;
      // Opening diagnostics from a minimized window restores the working context.
      if (this.logsOpen && this.minimized) this.toggleMinimize();
      this.diagnostics.hidden = !this.logsOpen;
      this.floatingPanel.dataset.logsOpen = String(this.logsOpen);
      this.logsButton.setAttribute('aria-expanded', String(this.logsOpen));
      this.logsButton.setAttribute('aria-label', this.logsOpen ? '收起操作记录' : '查看操作记录');
      if (this.logsOpen) this.renderLogs();
      else if (this.diagnostics.contains(document.activeElement)) this.logsButton.focus();
      this.clampToViewport(); this.layout.save();
    }

    showPageTypeIndicator() {
      const pageUID = PageDetector.getCurrentPageUID();
      const loginUID = PageDetector.getLoginUserUID();
      this.scope.textContent = !pageUID ? '当前空间 → 我的收藏夹' :
        `${pageUID === loginUID ? '我的空间' : '当前空间'} → ${loginUID ? '我的空间' : '请先登录'}`;
      this.sourceColumn.textContent = pageUID && pageUID === loginUID ? '来源（我的空间）' : '来源（当前空间）';
    }

    createFavPanel() {
      const list = element('div', 'fav-panel');
      const duplicates = duplicateFavoriteNames(this.favorites);
      this.favCheckboxItemList = this.favorites.map(name => {
        const item = new CheckboxItem(name);
        item.ambiguous = duplicates.has(normalizeFavoriteName(name));
        if (item.ambiguous) {
          item.checkbox.disabled = true; item.inputText.disabled = true;
          const reason = '同名来源：当前复制按名称匹配，请先改为不同名称；API 也不能代替你决定具体对象。';
          item.checkboxContainer.append(element('span', 'bf-folder-reason', reason));
          item.checkbox.setAttribute('aria-label', `${name} · 不可选：${reason}`);
        }
        item.checkboxContainer.addEventListener('input', () => this.updateSelectionReview());
        list.append(item.checkboxContainer);
        return item;
      });
      if (!this.favorites.length) list.append(element('div', 'bf-empty', '还没有读到来源收藏夹。请等待页面侧栏加载；列表出现后会自动更新。'));
      return list;
    }

    refreshFavorites() {
      if (this.busy) return;
      const previous = new Map(this.favCheckboxItemList.map(item => [item.getLabelValue(), { checked: item.checkbox.checked, target: item.inputText.value }]));
      this.favorites = this.manager.getAllFavoriteNames();
      this.leftPanel.querySelector('.fav-panel').replaceWith(this.createFavPanel());
      for (const item of this.favCheckboxItemList) {
        const old = previous.get(item.getLabelValue());
        if (old && !item.ambiguous) { item.checkbox.checked = old.checked; item.inputText.value = old.target; }
      }
      this.updateSelectionReview();
      this.showPageTypeIndicator();
    }

    toggleSelectAll() {
      this.selectionTools.toggle();
    }

    getSelectedTasks() {
      return this.favCheckboxItemList.filter(item => item.checkbox.checked && !item.ambiguous).map(item => ({ source: item.getLabelValue(), target: item.inputText.value }));
    }

    updateSelectionReview() {
      const blocked = !!copyBlockReason(currentCopyContext());
      const tasks = this.getSelectedTasks();
      const missing = tasks.some(task => !task.target.trim());
      this.selectionTools.update();
      if (missing) this.selectionReview.textContent = '请填好已选来源的目标名称';
      for (const item of this.favCheckboxItemList) {
        item.checkbox.disabled = this.busy || blocked || item.ambiguous;
        item.inputText.disabled = this.busy || blocked || item.ambiguous;
        item.checkboxContainer.dataset.selected = String(item.checkbox.checked);
        item.inputText.setAttribute('aria-invalid', String(item.checkbox.checked && !item.inputText.value.trim()));
      }
      this.startBatchTransferButton.textContent = this.busy ? '操作中…' : tasks.length ? `复制 ${tasks.length} 个收藏夹` : '开始复制';
      this.startBatchTransferButton.disabled = this.busy || blocked || !tasks.length || missing;
      this.updateModeSummary();
    }

    setBusy(busy) {
      this.busy = busy;
      this.floatingPanel?.setAttribute('aria-busy', String(busy));
      this.selectAllButton.disabled = busy || !this.favorites.length;
      this.dismissButton.disabled = busy;
      if (this.modeButton) this.modeButton.disabled = busy;
      for (const control of this.viewButtons.values()) control.disabled = busy;
      for (const item of this.favCheckboxItemList) { item.checkbox.disabled = busy || item.ambiguous; item.inputText.disabled = busy || item.ambiguous; }
      this.startBatchTransferButton.textContent = busy ? '操作中…' : '开始批量复制';
      this.updateSelectionReview();
      this.inventoryPanel?.updateBusy();
      this.onBusyChange?.(busy);
    }

    onOperation(view, state) {
      const transition = `${state.operationId}:${state.phase}:${state.status}`;
      if (state.status !== 'idle') {
        this.logs.setContext({ view, operationId: state.operationId, phase: state.phase });
        if (transition !== this.operationTransitions.get(view)) {
          this.appendLog(`${statusNames[state.status]}：${state.action || '操作'}。${state.detail}`,
            state.status === 'failed' ? this.errorCode : ['interrupted', 'unknown'].includes(state.status) ? this.warnCode : this.normalCode);
        }
      }
      this.operationTransitions.set(view, transition);
      if (view === this.activeView) this.renderOperation(state);
    }

    renderOperation(state) {
      this.statusBox.hidden = state.status === 'idle';
      this.statusBox.dataset.status = state.status;
      this.progressDetails.hidden = state.status === 'idle';
      this.statusTitle.textContent = `${statusNames[state.status]}${state.action ? ` · ${state.action}` : ''}`;
      this.statusCount.textContent = `已确认 ${state.confirmed}${state.total === null ? ' 项，总数未知' : ` / ${state.total} 项`}`;
      this.statusCount.hidden = state.confirmed === 0 && state.total === null;
      this.progressLast.textContent = `最后确认：${state.lastConfirmed || '尚无已确认步骤'}`;
      this.progressLast.hidden = !state.lastConfirmed;
      this.progressMessage.textContent = state.detail;
      if (this.footer) this.footer.hidden = !!this.minimized || ['settings', 'help'].includes(this.activeView);
    }

    async startBatchTransfer() {
      if (this.busy) return;
      try {
        const reason = copyBlockReason(currentCopyContext());
        if (reason) throw new Error(reason);
        const tasks = normalizeCopyTasks(this.getSelectedTasks());
        if (!tasks.length) throw new Error('请至少选择一个源收藏夹。');
        this.setBusy(true);
        await this.manager.batchCopy(tasks);
      } catch (err) {
        if (!['failed', 'unknown'].includes(this.operation.state.status))
          this.operation.finish(err.outcome === 'unknown' ? 'unknown' : 'failed', err.message);
      } finally { this.setBusy(false); }
    }

    createDiagnostics() {
      const details = element('section', 'bf-diagnostics');
      this.diagnostics = details;
      details.hidden = !this.logsOpen;
      details.id = 'bili-favs-records';
      details.setAttribute('aria-label', '操作记录');
      this.logsButton.setAttribute('aria-controls', details.id);
      const title = element('div', 'bf-log-heading');
      this.logCount = element('span', 'bf-muted');
      title.append(element('h2', '', '操作记录'), this.logCount);
      const recordTools = element('div', 'bf-record-tools');
      recordTools.append(title);
      const tools = element('div', 'bf-tools');
      this.logScope = element('select'); this.logScope.setAttribute('aria-label', '记录范围');
      for (const [value, text] of [['current', '复制功能'], ['all', '全部功能']]) {
        const option = element('option', '', text); option.value = value; this.logScope.append(option);
      }
      this.logScope.addEventListener('change', () => { this.logScrollTop = 0; this.renderLogs(); });
      this.logFilter = element('select');
      this.logFilter.setAttribute('aria-label', '记录内容');
      for (const [value, text] of [['normal', '日常记录'], ['all', '排查详情']]) {
        const option = element('option', '', text); option.value = value; this.logFilter.append(option);
      }
      this.logFilter.addEventListener('change', () => { this.logScrollTop = 0; this.renderLogs(); });
      this.logHelp = element('p', 'bf-log-help bf-muted');
      this.logHelp.id = 'bili-favs-record-help';
      this.logFilter.title = '日常记录显示进度、结果和异常；排查详情包含按钮点击。筛选不删除记录，导出包含全部记录。';
      this.logFilter.setAttribute('aria-describedby', this.logHelp.id);
      this.followCheckbox = element('input'); this.followCheckbox.type = 'checkbox'; this.followCheckbox.checked = true;
      const followLabel = element('label', '', '跟随最新'); followLabel.prepend(this.followCheckbox);
      this.followCheckbox.addEventListener('change', () => { this.scrollTopEnabled = this.followCheckbox.checked; this.renderLogs(); });
      const scopeLabel = element('label', 'bf-log-filter', '范围'); scopeLabel.append(this.logScope);
      const contentLabel = element('label', 'bf-log-filter', '内容'); contentLabel.append(this.logFilter);
      tools.append(scopeLabel, contentLabel);
      const actions = element('div', 'bf-log-actions');
      actions.append(button('清空', () => { this.logs.clear(); this.renderLogs(); }), button('导出记录', () => this.reviewExport(this.logs.export(), 'bili-favs-log.json')), followLabel);
      this.outputTextBox = element('div', 'output-text-box');
      this.outputTextBox.tabIndex = 0;
      this.outputTextBox.setAttribute('role', 'region');
      this.outputTextBox.setAttribute('aria-label', '诊断记录内容');
      this.outputTextBox.addEventListener('scroll', () => {
        if (this.outputTextBox.scrollHeight - this.outputTextBox.clientHeight - this.outputTextBox.scrollTop > 24) {
          this.scrollTopEnabled = false; this.followCheckbox.checked = false;
        }
        this.logScrollTop = this.outputTextBox.scrollTop;
      });
      recordTools.append(tools);
      details.append(recordTools, this.outputTextBox, actions);
    }

    appendLog(message, type = this.normalCode) {
      this.logs.add(message, type === this.errorCode ? 'error' : type === this.warnCode ? 'warn' : type === this.debugCode ? 'debug' : 'info');
      if (this.outputTextBox && this.logsOpen && !this.minimized) this.renderLogs();
    }

    renderLogs() {
      const top = this.logScrollTop || 0;
      const detailed = this.logFilter.value === 'all';
      const entries = this.logs.filter(this.logFilter.value, this.logScope.value === 'all' ? 'all' : this.activeView);
      this.outputTextBox.replaceChildren(...entries.map(entry => {
        const row = element('div', `bf-log-row bf-log-${entry.level}`);
        const time = element('time', '', new Date(entry.time).toLocaleTimeString('zh-CN', { hour12: false }));
        time.dateTime = entry.time; time.title = new Date(entry.time).toLocaleString('zh-CN');
        const phaseNames = { creating: '准备目标', copying: '复制', loading: '读取列表', scanning: '统计', delete: '删除', unsubscribe: '退订' };
        const viewNames = { copy: '复制', statistics: '统计', manage: '管理', system: '系统' };
        const context = element('span', 'bf-log-context', entry.operationId ? `${viewNames[entry.view]} #${entry.operationId.slice(-6)} ${phaseNames[entry.phase] || entry.phase}` : viewNames[entry.view]);
        row.append(time, element('span', 'bf-log-level', logLevels[entry.level]));
        if (detailed) row.append(context);
        row.append(element('span', 'bf-log-message', entry.message));
        return row;
      }));
      this.outputTextBox.prepend(this.logHelp);
      if (!entries.length) this.outputTextBox.append(element('p', 'bf-empty', this.logs.entries.length ? '当前筛选下暂无记录。可查看全部功能或排查详情。' : '暂无记录。后续操作会显示在这里。'));
      const hidden = this.logs.entries.length - entries.length;
      this.logCount.textContent = `${entries.length} 条${hidden ? ` · 筛选隐藏 ${hidden} 条` : ''}`;
      this.logCount.title = `筛选不删除记录。导出包含全部 ${this.logs.entries.length} 条记录。`;
      this.logHelp.textContent = `${detailed ? '含按钮点击等技术细节。' : '按钮细节见“排查详情”。'}导出包含全部记录。${this.logs.dropped ? `仅保留最近 ${this.logs.limit} 条，已移除更早的 ${this.logs.dropped} 条。` : ''}`;
      this.outputTextBox.scrollTop = this.scrollTopEnabled ? this.outputTextBox.scrollHeight : top;
    }

    reviewExport(text, filename) {
      this.exportReview?.remove();
      const section = element('section', 'bf-export');
      section.setAttribute('role', 'dialog'); section.setAttribute('aria-label', '导出前检查'); section.setAttribute('aria-modal', 'true');
      section.append(element('h3', '', '导出前检查'), element('p', '', '仅下载到本机，不会上传。内容可能含收藏夹名称、ID 和作者信息；分享前请自行删去。'));
      const area = element('textarea'); area.value = text; area.setAttribute('aria-label', '可编辑的导出内容');
      const previousFocus = document.activeElement;
      const close = () => {
        section.remove(); this.exportReview = null;
        this.notice.inert = false; this.content.inert = false; this.navigation.inert = false; this.footer.inert = false; this.header.inert = false; this.diagnostics.inert = false;
        previousFocus?.focus();
      };
      section.append(area, button('下载此内容', () => {
        const url = URL.createObjectURL(new Blob([area.value], { type: 'application/json' }));
        const link = element('a'); link.href = url; link.download = filename; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }), button('关闭预览', close));
      section.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.preventDefault(); close(); }
        if (event.key === 'Tab') {
          const focusable = [...section.querySelectorAll('textarea,button')];
          if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable.at(-1).focus(); }
          else if (!event.shiftKey && document.activeElement === focusable.at(-1)) { event.preventDefault(); focusable[0].focus(); }
        }
      });
      this.floatingPanel.append(section); this.exportReview = section;
      this.notice.inert = true; this.content.inert = true; this.navigation.inert = true; this.footer.inert = true; this.header.inert = true; this.diagnostics.inert = true;
      area.focus();
    }

    updateModeSummary() {
      const reason = copyBlockReason(currentCopyContext());
      this.copyHelp.textContent = reason || '同名则复用，否则新建；来源保留。';
      if (!this.manager.modes) return;
      const name = value => value === 'api' ? 'API' : '网页';
      const modes = this.manager.modes;
      this.copyHelp.textContent = reason || `${name(modes.copy)}复制 · ${name(modes.create)}创建 · 来源保留`;
      this.modeButton.title = `读取/统计：${name(modes.read)}；复制：${name(modes.copy)}；创建：${name(modes.create)}；删除/退订：${name(modes.manage)}`;
      this.modeButton.setAttribute('aria-label', `设置。${this.modeButton.title}`);
      if (this.logScope) this.logScope.options[0].textContent = ({ copy: '复制功能', statistics: '统计功能', manage: '管理功能', settings: '设置', help: '帮助' })[this.activeView];
    }

    showModeSettings() { this.showView('settings'); }

    createSettingsPanel() {
      const root = element('section', 'bf-settings'); this.settingsRoot = root; root.hidden = true;
      root.setAttribute('aria-label', '设置');
      root.append(element('h2', '', '操作方式'),
        element('p', 'bf-muted', '网页方式操作页面按钮，较慢且依赖页面结构；API 直接请求 B 站网页接口，接口和权限可能变化。两种方式均使用当前登录账号。'),
        element('p', 'bf-muted', '结果不明时停止，不自动切换或重试。API 复制也会读取来源；API 新建目标默认为私密。网页读取会依次查看条目，请勿同时操作页面。'));
      this.modeChoices = new Map();
      for (const [key, title] of [['read', '列表读取与统计'], ['copy', '复制内容'], ['create', '创建目标收藏夹'], ['manage', '删除与取消订阅']]) {
        const label = element('label', 'bf-setting-row', title), select = element('select');
        select.setAttribute('aria-label', title);
        for (const [value, title] of [['web', '网页操作'], ['api', 'API']]) { const option = element('option', '', title); option.value = value; select.append(option); }
        select.value = this.manager.modes[key]; label.append(select); root.append(label); this.modeChoices.set(key, select);
      }
      this.settingsStatus = element('p', 'bf-muted'); this.settingsStatus.setAttribute('role', 'status');
      const controls = element('div', 'bf-tools');
      this.saveModesButton = button('保存设置', () => {
        if (this.busy) return;
        for (const [key, control] of this.modeChoices) this.manager.modes[key] = control.value;
        this.inventoryPanel?.mutations?.invalidate();
        this.updateModeSummary(); this.layout.save(); this.settingsStatus.textContent = '已保存。已加载的列表和统计结果保留；新任务使用以上设置，管理操作需重新预览。';
        this.logs.add(this.modeButton.title, 'info', { view: 'system', phase: 'settings' }); this.renderLogs();
      }, 'bf-primary');
      controls.append(this.saveModesButton, button('恢复默认位置和大小', () => this.layout.reset()));
      root.append(controls, this.settingsStatus);
    }

    toggleMinimize() {
      this.minimized = !this.minimized;
      this.floatingPanel.dataset.minimized = String(this.minimized);
      this.content.hidden = this.minimized;
      this.navigation.hidden = this.minimized; this.notice.hidden = this.minimized; this.footer.hidden = this.minimized || ['settings', 'help'].includes(this.activeView);
      this.diagnostics.hidden = this.minimized || !this.logsOpen;
      this.minimizeButton.textContent = this.minimized ? '□' : '−';
      this.minimizeButton.setAttribute('aria-label', this.minimized ? '恢复面板' : '最小化');
      this.minimizeButton.title = this.minimized ? '恢复面板' : '最小化';
      this.minimizeButton.setAttribute('aria-expanded', String(!this.minimized));
      if (this.minimized) { this.hiddenHeight = this.floatingPanel.style.height; this.floatingPanel.style.height = '64px'; }
      else { this.floatingPanel.style.height = this.hiddenHeight || ''; if (this.logsOpen) this.renderLogs(); this.clampToViewport(); }
      this.layout.save();
    }

    recordPanelSize() { this.clampToViewport(); this.layout.save(); }

    clampToViewport() {
      if (this.floatingPanel) this.layout.clamp();
    }

    destroy() {
      if (this.floatingPanel) this.layout.save();
      this.inventoryPanel?.destroy();
      if (this.operation.state.status === 'running') this.operation.finish('interrupted', '面板已离开当前页面；请检查页面结果，不要直接重复提交。');
      this.unsubscribes?.forEach(unsubscribe => unsubscribe());
      document.removeEventListener('mousemove', this.onBodyMove);
      document.removeEventListener('mouseup', this.onBodyUp);
      window.removeEventListener('blur', this.onBodyUp);
      window.removeEventListener('resize', this.onViewportResize);
      this.floatingPanel?.remove();
      this.floatingPanel = null;
    }
  }

  // SPA 重复注入时只保留一个生命周期。
  if (!window.__biliFavsLifecycle) {
    let panel = null;
    let notice = null;

    function unmount() {
      panel?.destroy();
      panel = null;
      notice?.remove();
      notice = null;
      setLoggerPanel(null);
      setLoggerStore(null);
      // Tampermonkey 的 Window 代理可能拒绝 delete；赋空值同样能释放引用。
      window.BiliFavPanel = null;
      window.BiliFavManager = null;
    }

    const lifecycle = new PageLifecycle({
      unmount,
      mount() {
        notice?.remove();
        notice = null;
        const manager = new FavoriteManager();
        setLoggerStore(manager.logs);
        if (!manager.initialize()) return;
        panel = new FloatingPanel(manager);
        panel.onDismiss = () => { lifecycle.dismissed = true; };
        setLoggerPanel(panel);
        panel.init();
        window.BiliFavManager = manager;
        window.BiliFavPanel = panel;
        log(`脚本已就绪 v${CONFIG.SCRIPT.VERSION}`);

        const mountedPanel = panel;
        mountedPanel.setBusy(true);
        manager.crossPageFlow.resumeFlow().catch(err => {
          if (!['failed', 'unknown'].includes(manager.operation.state.status))
            manager.operation.finish('failed', err.message);
        }).finally(() => { if (mountedPanel.floatingPanel) mountedPanel.setBusy(false); });
      },
      refresh() {
        if (panel?.busy) return false;
        panel?.refreshFavorites();
      },
      notify(message) {
        notice = document.createElement('div');
        notice.id = 'bili-favs-status';
        notice.setAttribute('role', 'status');
        notice.style.cssText = 'position:fixed;top:20px;right:20px;z-index:99999;background:white;color:#333;padding:16px;border:1px solid #00a1d6;max-width:360px;';
        notice.textContent = `B站收藏夹批量管理：${message}`;
        document.body.appendChild(notice);
      }
    });
    window.__biliFavsLifecycle = lifecycle;

    const checkPage = () => {
      try { lifecycle.tick(); }
      catch (err) { console.error('[BiliBili Favs] 初始化失败:', err); }
    };
    // 轮询可跨油猴隔离环境观察路由，也可处理 load 之后才挂载的收藏夹。
    // 切换同一用户的收藏夹时保留面板，不打断任务。
    window.setInterval(checkPage, 500);
    window.addEventListener('pageshow', checkPage);
    checkPage();

    if (typeof GM_registerMenuCommand === 'function') {
      GM_registerMenuCommand('显示收藏夹管理面板', () => lifecycle.reopen());
    }
  }

})();
