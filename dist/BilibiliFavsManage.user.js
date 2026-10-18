// ==UserScript==
// @name         Bilibili 收藏夹批量管理
// @namespace    http://tampermonkey.net/
// @version      2.2.0-dev.1
// @description  批量复制 B 站收藏夹（复选框列表 + 跨页面流程 + 过滤"我追的"）
// @author       leida1024
// @match        https://space.bilibili.com/*
// @run-at       document-start
// @noframes
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
    CREATE_FAV_NAME_INPUT: 'input.add-fav-input',
    TOAST: '.vui_toast',
    NEXT_PAGE_TEXT: ['下一页', 'next', '>']
  };

  const BUTTON_TEXTS = {
    BATCH_OPERATION: '批量操作',
    COPY_TO: '复制至',
    CREATE_NEW: '新建收藏夹',
    CREATE: '创建',
    SUCCESS: '操作成功'
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
    if (globalPanel) {
      globalPanel.appendLog(args.join(' '), globalPanel.normalCode);
    }
  }

  /**
   * 输出错误日志
   * @param {...any} args - 日志内容
   */
  function error(...args) {
    console.error(LOG_PREFIX, ...args);
    if (globalPanel) {
      globalPanel.appendLog(args.join(' '), globalPanel.errorCode);
    }
  }

  /**
   * 输出警告日志
   * @param {...any} args - 日志内容
   */
  function warn(...args) {
    console.warn(LOG_PREFIX, ...args);
    if (globalPanel) {
      globalPanel.appendLog(args.join(' '), globalPanel.warnCode);
    }
  }

  /**
   * 应用配置
   */

  const CONFIG = {
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
      RESIZE_BORDER_SIZE: 15,
      Z_INDEX: 99999
    },

    // 脚本信息
    SCRIPT: {
      VERSION: '2.2.0-dev.1',
      NAME: 'BiliBili 收藏夹批量管理',
      DESCRIPTION: '适配旧版及新版 VUI 收藏夹页面'
    }
  };

  /** 旧版个人空间（带“体验新版”入口）。 */
  const LegacyPageAdapter = {
    name: '旧版个人空间',
    sidebar: '#fav-createdList-container',
    sidebarCreate: null,
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

  /** 在任何跳转或提交前检查整个任务列表；同时兼容旧版本保存的任务。 */
  function normalizeCopyTasks(tasks) {
    return tasks.map(task => {
      const source = normalizeFavoriteName(task.source);
      const target = normalizeFavoriteName(task.target);
      if (!source || !target) throw new Error('源收藏夹和目标收藏夹名称不能为空或仅包含空白');
      return { ...task, source, target };
    });
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
      const pageInfoText = document.querySelector(pageAdapter().pagination)?.textContent || '';
      const match = pageInfoText.match(/共\s*(\d+)\s*页/);
      return match ? parseInt(match[1]) : 1;
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

      log('点击批量操作按钮');
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

      log('全选当前页');
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

      log('点击复制至按钮');
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

      for (const fav of favList) {
        if (fav.name === favName) {
          log(`找到目标收藏夹：[${favName}]`);
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

      log('点击新建收藏夹按钮');
      createBtn.click();
      await delay(CONFIG.DELAY.MIDDLE);
      return true;
    }

    /**
     * 输入收藏夹名称（完整的事件链）
     * @param {string} name - 收藏夹名称
     * @returns {Promise<boolean>} 是否成功
     */
    static async inputFavoriteName(name) {
      name = normalizeFavoriteName(name);
      if (!name) return false;
      const nameInput = Array.from(document.querySelectorAll(SELECTORS.CREATE_FAV_NAME_INPUT)).find(isElementVisible);
      if (!nameInput) {
        error('找不到名称输入框');
        return false;
      }

      log('输入新收藏夹名称:', name);

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
     * @returns {Promise<boolean>} 是否成功
     */
    static async clickCreateButton() {
      const createConfirmBtn = (getPageAdapter()?.createConfirm && document.querySelector(getPageAdapter().createConfirm)) ||
        findButtonByText(BUTTON_TEXTS.CREATE);

      if (!createConfirmBtn || createConfirmBtn.disabled) {
        error('创建按钮不可用');
        return false;
      }

      log('点击创建按钮');
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
    static async createFavoriteViaSidebar(favName) {
      favName = normalizeFavoriteName(favName);
      if (!favName) return false;
      if (this.getAllFavorites().some(item => this.getFavoriteName(item) === favName)) return true;
      const selector = pageAdapter().sidebarCreate;
      const sidebar = selector && document.querySelector(selector);
      if (!sidebar) return null;

      // 文本精确为"新建收藏夹"的叶子元素即入口
      const entry = Array.from(sidebar.querySelectorAll('*')).find(
        el => el.children.length === 0 &&
              el.textContent.trim() === BUTTON_TEXTS.CREATE_NEW
      );
      if (!entry) {
        warn('侧边栏未找到"新建收藏夹"入口');
        return null;
      }

      log('点击左侧边栏[新建收藏夹]');
      const clickable = entry.closest(
        'button, [role="button"], [class*="add"], [class*="create"], [class*="btn"]'
      ) || entry;
      clickable.click();
      await delay(CONFIG.DELAY.SHORT);

      // 等待名称输入框（复用与复制对话框一致的创建组件）
      const input = await waitForElement(SELECTORS.CREATE_FAV_NAME_INPUT, 3000, document, true);
      if (!input) {
        warn('点击"新建收藏夹"后未出现名称输入框');
        return false;
      }

      // 输入名称并点击创建
      if (!await this.inputFavoriteName(favName)) return false;
      if (!await this.clickCreateButton()) return false;

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
      const confirmBtn = dialog.querySelector(pageAdapter().confirm);
      if (!confirmBtn) {
        error('找不到确定按钮');
        return false;
      }

      log('点击确定');
      // Only a newly rendered success message can confirm this submission.
      let confirmed = false;
      const observer = new window.MutationObserver(records => {
        for (const record of records) {
          const nodes = record.type === 'childList' ? [...record.addedNodes] : [record.target];
          for (const node of nodes) {
            const el = node.nodeType === 1 ? node : node.parentElement;
            const toast = el?.closest(SELECTORS.TOAST) || el?.querySelector?.(SELECTORS.TOAST);
            if (toast?.textContent.includes(BUTTON_TEXTS.SUCCESS)) confirmed = true;
          }
        }
      });
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      try { confirmBtn.click(); await delay(CONFIG.DELAY.LONG); }
      finally { observer.disconnect(); }
      if (confirmed) {
        log('✓ 复制成功');
        return true;
      } else {
        warn('复制请求已发送，但未确认结果；已停止，请先检查目标收藏夹');
      }

      return false;
    }

    /**
     * 点击下一页按钮
     * @returns {Promise<boolean>} 是否成功
     */
    static async clickNextPage() {
      const paginationEl = document.querySelector(pageAdapter().pagination);
      if (!paginationEl) {
        log('判断为单页收藏夹');
        return false;
      }

      const allButtons = paginationEl.querySelectorAll(pageAdapter().next);
      let nextBtn = null;

      for (const btn of allButtons) {
        const text = btn.textContent.trim();
        if (SELECTORS.NEXT_PAGE_TEXT.some(t => text === t || text.includes(t))) {
          nextBtn = btn;
          break;
        }
      }

      if (nextBtn && !nextBtn.disabled && !nextBtn.classList.contains('be-pager-disabled')) {
        log('点击下一页');
        nextBtn.click();
        await delay(CONFIG.DELAY.MIDDLE);
        return true;
      } else {
        log('已到最后一页或找不到下一页按钮');
        return false;
      }
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

      for (const favItem of allFavs) {
        const name = this.getFavoriteName(favItem);
        if (name === favName) {
          log(`点击收藏夹：[${favName}]`);
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
        log('批量模式已激活');
        return true;
      }

      log('批量模式已退出，重新进入');
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
          return value;
        }
      }

      // 方案 2: 从页面状态获取（备选）
      if (window.__INITIAL_STATE__?.mid) {
        return String(window.__INITIAL_STATE__.mid);
      }

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
      // 跳转到自己的收藏夹页面
      const ownURL = PageDetector.getOwnFavListURL();
      if (!ownURL) {
        error('无法获取用户自己的收藏夹页面 URL');
        throw new Error('无法确认登录身份，请登录后再复制');
      }

      // 保存状态（缺失对比延后到自己页面执行）
      StateManager.saveState({
        phase: 'creating',
        returnURL: window.location.href,
        tasks: tasks
      });

      log('========================================');
      log('即将跳转到自己的收藏夹页面对比并创建缺失收藏夹');
      log('完成后将自动返回并继续复制');
      log('跳转倒计时: 3 秒...');
      log('========================================');

      await delay(3000);
      window.location.href = ownURL;
    }

    /**
     * 在自己页面批量创建收藏夹
     * @param {Array<string>} favNames - 收藏夹名称列表
     * @returns {Promise<boolean>}
     */
    async batchCreateFavorites(favNames) {
      favNames = [...new Set(favNames.map(normalizeFavoriteName))];
      if (favNames.some(name => !name)) return false;
      log('========================================');
      log('开始批量创建收藏夹');
      log(`共 ${favNames.length} 个: ${favNames.join(', ')}`);
      log('========================================');

      for (let i = 0; i < favNames.length; i++) {
        const favName = favNames[i];
        log(`[${i + 1}/${favNames.length}] 创建收藏夹: ${favName}`);

        const success = await this.createSingleFavorite(favName);
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
    async createSingleFavorite(favName) {
      favName = normalizeFavoriteName(favName);
      if (!favName) return false;
      if (this.manager.getAllFavoriteNames().map(normalizeFavoriteName).includes(favName)) return true;
      // 优先：左侧边栏原生"新建收藏夹"入口（最简，无需批量模式/复制对话框）
      const result = await BilibiliAPI.createFavoriteViaSidebar(favName);
      if (result === true) {
        log(`✓ 创建收藏夹 [${favName}] 成功（侧边栏入口）`);
        return true;
      }
      if (result !== null) return false;

      // 回退：复制对话框内"新建收藏夹"（已验证可用）
      log('侧边栏入口不可用，回退到复制对话框方式创建');
      return await this.createViaCopyDialog(favName);
    }

    /**
     * 通过批量模式复制对话框创建收藏夹（回退方案，已验证可用）
     * @param {string} favName - 收藏夹名称
     * @returns {Promise<boolean>}
     */
    async createViaCopyDialog(favName) {
      // 1. 点击第一个收藏夹（确保有内容可操作）
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
        error('无法进入批量模式');
        return false;
      }

      // 3. 全选当前页视频（否则"复制至"按钮不可用，对话框不会弹出）
      if (!BilibiliAPI.clickSelectAll()) {
        error('无法全选视频，"复制至"将不可用');
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
      const createSuccess = await this.manager.createNewFavorite(dialog, favName);
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

      log('========================================');
      log('检测到跨页面流程状态');
      log(`阶段: ${state.phase}`);
      log('========================================');

      if (state.phase === 'creating') {
        // 当前已在「自己页面」，此时 getAllFavoriteNames() = 自己的收藏夹
        // 在此对比目标名称，找出真正缺失（自己还没有）的收藏夹
        const ownNames = this.manager.getAllFavoriteNames().map(normalizeFavoriteName);
        const missing = state.tasks
          .map(t => t.target)
          .filter((name, index, self) => self.indexOf(name) === index) // 去重
          .filter(name => !ownNames.includes(name)); // 过滤自己已有的

        if (missing.length > 0) {
          log(`检测到 ${missing.length} 个收藏夹需要创建:`, missing.join(', '));
          const success = await this.batchCreateFavorites(missing);
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
        StateManager.saveState({
          ...state,
          phase: 'copying'
        });

        log('========================================');
        log('收藏夹准备完成，返回原页面继续复制');
        log('跳转倒计时: 3 秒...');
        log('========================================');

        await delay(3000);
        window.location.href = state.returnURL;
        this.manager.operation.finish('interrupted', '目标准备完成，等待返回来源页面继续复制。');

        return true;
      } else if (state.phase === 'copying') {
        // 回到原页面，继续复制流程
        log('========================================');
        log('已返回原页面，继续复制流程');
        log('========================================');

        // 执行复制（跳过跨页面检测，避免重复触发跳转）
        await this.manager.batchCopy(state.tasks, { skipCrossPage: true });

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
      this.state = { status: 'idle', action: '', confirmed: 0, total: null, lastConfirmed: '', detail: '选择来源并检查目标后开始。' };
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

    begin(action, total = null) {
      this.update({ status: 'running', action, total, confirmed: 0, lastConfirmed: '', detail: '正在准备，请勿重复提交。' });
    }

    confirm(step) {
      this.update({ confirmed: this.state.confirmed + 1, lastConfirmed: step });
    }

    finish(status, detail) {
      if (!['completed', 'failed', 'interrupted'].includes(status)) throw new Error('Invalid terminal operation status');
      this.update({ status, detail });
    }
  }

  const stableId = value => /^(?:[1-9]\d*)$/.test(String(value)) && Number.isSafeInteger(Number(value)) ? String(value) : null;
  const knownCount = value => Number.isSafeInteger(value) && value >= 0 ? value : null;

  function normalizeFolder(raw, kind, index = 0) {
    const id = stableId(raw.id);
    const ownerId = stableId(raw.upper?.mid ?? raw.mid);
    return Object.freeze({ id, ownerId, kind: kind === 'created' ? 'created' : raw.type === 11 ? 'subscribed' : 'unsupported',
      name: typeof raw.title === 'string' ? raw.title : '（名称未知）', count: knownCount(raw.media_count),
      protected: kind === 'created' && (index === 0 || raw.is_kid_playlist !== 0 || (raw.type !== undefined && raw.type !== 11)),
      available: (kind === 'created' ? raw.state === undefined || raw.state === 0 : raw.state === 0) &&
        !(stableId(raw.mid) && stableId(raw.upper?.mid) && stableId(raw.mid) !== stableId(raw.upper.mid)), subscribed: raw.fav_state === 1 });
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

  class InventoryService {
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
              if (!Array.isArray(data.medias) || data.medias.some(item => !item || typeof item !== 'object') || typeof data.has_more !== 'boolean' || stableId(data.info?.id) !== folder.id) throw new Error('分页格式或收藏夹身份未确认');
              const signature = JSON.stringify(data.medias.map(v => [v.type, v.id]));
              if (data.medias.length && pageSignatures.has(signature)) throw new Error('分页重复，扫描已停止');
              pageSignatures.add(signature);
              if (report.entries + data.medias.length > maxEntries) throw new Error('达到条目上限');
              const expected = knownCount(data.info.media_count);
              if (coverage.expected !== null && coverage.expected !== expected) throw new Error('扫描期间数量变化');
              coverage.expected = expected;
              coverage.pages++; coverage.loaded += data.medias.length; report.entries += data.medias.length;
              for (const raw of data.medias) {
                const unavailable = Number.isInteger(raw.attr) && !!(raw.attr & 1);
                if (unavailable) report.unavailable++;
                const id = raw.type === 2 ? stableId(raw.id) : null;
                if (!id) { report.unknownIdentity++; continue; }
                report.occurrences++;
                if (videos.has(id)) continue;
                const duration = unavailable ? null : knownCount(raw.duration);
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

  function eligibility(action, folder, actor, pageOwner) {
    if (!stableId(actor) || !stableId(folder.id) || !stableId(folder.ownerId)) return '身份未确认';
    if (!folder.available) return '对象不可用';
    if (action === 'unsubscribe') {
      if (folder.kind !== 'subscribed') return '仅支持收藏夹订阅，合集暂不支持';
      if (folder.ownerId === actor) return '不能将自己的收藏夹当作订阅';
      if (folder.subscribed !== true) return '订阅状态未确认';
      return null;
    }
    if (action !== 'delete') return '操作类型不支持';
    if (folder.kind !== 'created') return '不是创建的收藏夹';
    if (folder.ownerId !== actor || pageOwner !== actor) return '只能管理自己空间的收藏夹';
    if (folder.protected !== false) return '默认、特殊或保护状态未知的收藏夹';
    return null;
  }

  class BatchOperations {
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
            const catalog = await this.client.folders(ticket.actor, ticket.action === 'delete' ? 'created' : 'subscribed', signal, this.pace);
            if (signal?.aborted) break;
            const fresh = catalog.find(folder => folder.id === target.id);
            if (!fresh || eligibility(ticket.action, fresh, current.actor, current.pageOwner) ||
              ['id', 'ownerId', 'name', 'count', 'kind', 'protected', 'available', 'subscribed'].some(key => fresh[key] !== target[key])) throw new Error('目标身份、名称、数量或保护状态变化，请重新加载并预览');
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

  /**
   * 收藏夹管理器
   * 负责批量复制收藏夹的核心逻辑
   */


  class FavoriteManager {
    constructor() {
      this.api = BilibiliAPI;
      this.crossPageFlow = new CrossPageFlowManager(this);
      this.operation = new OperationState();
      this.inventory = new InventoryService();
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
      log(`开始复制收藏夹 [${sourceFavName}] 到 [${targetFavName}]`);

      // 1. 点击源收藏夹
      const clickSuccess = await this.api.clickFavorite(sourceFavName);
      if (!clickSuccess) {
        return false;
      }

      await delay(CONFIG.DELAY.SHORT);

      // 2. 获取当前收藏夹信息
      const currentName = this.api.getCurrentFavoriteName();
      if (!currentName) {
        return false;
      }

      const totalPages = this.api.getTotalPages();
      log(`收藏夹 [${currentName}] 共 ${totalPages} 页`);

      // 3. 进入批量操作模式
      const batchSuccess = await this.api.ensureBatchModeActive();
      if (!batchSuccess) {
        error('无法进入批量操作模式');
        return false;
      }

      // 4. 逐页复制
      for (let page = 1; page <= totalPages; page++) {
        log(`正在处理第 ${page}/${totalPages} 页`);
        this.operation.update({ detail: `正在复制第 ${page} 页；页数来自当前页面，${totalPages === 1 ? '未检测到更多分页' : `检测到 ${totalPages} 页`}。` });

        const pageSuccess = await this.copyOnePage(targetFavName);
        if (!pageSuccess) {
          error(`第 ${page} 页复制失败`);
          return false;
        }

        // 如果不是最后一页，点击下一页
        if (page < totalPages) {
          const nextSuccess = await this.api.clickNextPage();
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
    async copyOnePage(targetFavName) {
      targetFavName = normalizeFavoriteName(targetFavName);
      if (!targetFavName) return false;
      // 0. 确保批量模式激活
      const batchActive = await this.api.ensureBatchModeActive();
      if (!batchActive) {
        error('无法进入批量模式');
        return false;
      }

      // 1. 全选
      if (!this.api.clickSelectAll()) {
        return false;
      }
      await delay(CONFIG.DELAY.SHORT);

      // 2. 点击复制按钮
      if (!await this.api.clickCopyButton()) {
        return false;
      }

      // 3. 等待对话框
      let dialog = await this.api.waitForDialog();
      if (!dialog) {
        error('对话框未出现');
        return false;
      }

      // 4. 检查目标收藏夹是否存在
      const exists = this.api.isFavoriteExistInDialog(dialog, targetFavName);

      if (!exists) {
        // 检测页面类型
        const isOwnPage = PageDetector.isOwnPage();

        if (!isOwnPage) {
          error('目标收藏夹不存在且无法在他人页面创建');
          error('请使用批量复制功能，脚本会自动处理跨页面创建');
          // 关闭对话框
          this.api.closeDialog(dialog);
          await delay(CONFIG.DELAY.SHORT);
          return false;
        }

        // 在自己页面，直接创建
        log(`目标收藏夹 [${targetFavName}] 不存在，尝试创建`);
        const createSuccess = await this.createNewFavorite(dialog, targetFavName);
        if (!createSuccess) {
          error('创建收藏夹失败');
          return false;
        }
        // 创建后组件可能重渲染，不能继续操作已脱离页面的旧节点。
        dialog = await this.api.waitForDialog();
        if (!dialog) return false;
      }

      // 5. 选择目标收藏夹
      await delay(CONFIG.DELAY.SHORT);
      if (!this.api.selectFavoriteInDialog(dialog, targetFavName)) {
        return false;
      }

      // 6. 点击确定
      await delay(CONFIG.DELAY.SHORT);
      return await this.api.clickConfirmButton(dialog);
    }

    /**
     * 创建新收藏夹
     * @param {Element} dialog - 对话框元素
     * @param {string} favName - 收藏夹名称
     * @returns {Promise<boolean>} 是否成功
     */
    async createNewFavorite(dialog, favName) {
      favName = normalizeFavoriteName(favName);
      if (!favName) return false;
      if (this.api.isFavoriteExistInDialog(dialog, favName)) return true;
      // 1. 点击新建收藏夹按钮
      if (!await this.api.clickCreateFavoriteButton(dialog)) {
        return false;
      }

      // 2. 输入收藏夹名称
      if (!await this.api.inputFavoriteName(favName)) {
        return false;
      }

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
    async batchCopy(copyList, options = {}) {
      copyList = normalizeCopyTasks(copyList);
      const { skipCrossPage = false } = options;
      this.operation.begin('批量复制', copyList.length);
      try {
      log('开始批量复制，共', copyList.length, '个任务');

      // 检测是否需要跨页面创建收藏夹（copying 阶段恢复时跳过，避免重复触发跳转）
      if (!skipCrossPage) {
        const isOwnPage = PageDetector.isOwnPage();
        if (!isOwnPage) {
          // 在别人页面：option A——只要在他人页面就走跨页面流程，
          // 由「自己页面」阶段再对比并创建缺失的收藏夹
          log('检测到在别人页面，启动跨页面流程...');
          await this.crossPageFlow.startCrossPageFlow(copyList);
          this.operation.finish('interrupted', '已交接跨页面流程。等待目的页面继续；当前页面没有确认复制完成。');
          return { status: 'handoff' }; // A navigation is not a completed copy.
        }
      }

      // 正常复制流程
      for (let i = 0; i < copyList.length; i++) {
        const { source, target } = copyList[i];
        log(`\n[${i + 1}/${copyList.length}] ${source} → ${target}`);

        if (!await this.copyFavorite(source, target)) {
          throw new Error(`收藏夹 [${source}] → [${target}] 复制失败，已停止后续任务，请检查页面结果后重试`);
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
        this.operation.finish('failed', `${err.message} 请先检查页面结果，不要直接重复提交。`);
        throw err;
      }
    }
  }

  /** 在油猴沙箱中轮询路由和真实业务 DOM，不修改网站的 history。 */
  class PageLifecycle {
    constructor({ mount, unmount, refresh, notify, now = Date.now }) {
      Object.assign(this, { mount, unmount, refresh, notify, now });
      this.uid = null;
      this.sidebar = null;
      this.names = '';
      this.startedAt = now();
      this.notified = false;
      this.dismissed = false;
    }

    tick() {
      const uid = PageDetector.getCurrentPageUID();
      if (uid !== this.uid) {
        this.unmount();
        this.uid = uid;
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

  /**
   * 事件处理器
   * 处理浮动面板的拖动、缩放和交互事件
   */

  class EventHandlers {
    /**
     * 切换全选状态
     * @param {HTMLElement} selectAllButton - 全选按钮
     * @param {Array} favCheckboxItemList - 复选框项列表
     */
    static toggleSelectAll(selectAllButton, favCheckboxItemList) {
      if (selectAllButton.textContent === '点我全选') {
        for (const chkboxItem of favCheckboxItemList) {
          chkboxItem.checkbox.checked = true;
        }
        selectAllButton.textContent = '点我全部取消';
      } else {
        for (const chkboxItem of favCheckboxItemList) {
          chkboxItem.checkbox.checked = false;
        }
        selectAllButton.textContent = '点我全选';
      }
    }

    /**
     * 切换最小化状态
     * @param {Object} panel - FloatingPanel 实例
     */
    static toggleMinimize(panel) {
      panel.toggleMinimize();
    }

    /**
     * 鼠标松开时结束尺寸修改
     * @param {Object} panel - FloatingPanel 实例
     */
    static stopResizeOnBody(panel) {
      panel.resizeable = false;
    }

    /**
     * 鼠标松开时结束拖动
     * @param {Object} panel - FloatingPanel 实例
     */
    static stopDragOnPanel(panel) {
      panel.isDragging = false;
    }

    /**
     * 鼠标按下事件
     * @param {Object} panel - FloatingPanel 实例
     * @param {MouseEvent} e - 鼠标事件
     */
    static mouseDown(panel, e) {
      if (e.button !== 0 || e.target.closest('button,input,select,textarea,label,summary,a')) return;
      const floP = panel.floatingPanel;
      let d = EventHandlers.getDirection(panel, e);

      // 当位置为四个边和四个角时才开启尺寸修改
      if (d !== '') {
        panel.resizeable = true;
        panel.isDragging = false;
        panel.direction = d;
      } else if (e.target.closest('.bf-header')) {
        // 如果点中了按钮、输入框或输出框，不开启拖动
        if (
          e.target.tagName === 'BUTTON' ||
          e.target.tagName === 'INPUT' ||
          e.target.tagName === 'SELECT' ||
          e.target.classList.contains('output-text-box')
        ) ; else {
          panel.isDragging = true;
          panel.offsetX = e.clientX - floP.getBoundingClientRect().left;
          panel.offsetY = e.clientY - floP.getBoundingClientRect().top;
        }
      }
    }

    /**
     * 鼠标移动事件，修改大小
     * @param {Object} panel - FloatingPanel 实例
     * @param {MouseEvent} e - 鼠标事件
     */
    static mouseMove(panel, e) {
      let floP = panel.floatingPanel;
      let d = EventHandlers.getDirection(panel, e);

      // 修改鼠标显示效果
      let cursor = d === '' ? 'default' : d + '-resize';
      floP.style.cursor = cursor;

      if (panel.resizeable) {
        // 当开启尺寸修改时，鼠标移动会修改div尺寸
        const direc = panel.direction;
        let newWidth = floP.offsetWidth;
        let newHeight = floP.offsetHeight;

        let originTop = floP.offsetTop;
        let originLeft = floP.offsetLeft;
        let newTop = originTop;
        let newLeft = originLeft;

        // 左侧和上侧
        if (direc.indexOf('w') !== -1) {
          newWidth -= e.movementX;
          newLeft += e.movementX;
        }
        if (direc.indexOf('n') !== -1) {
          newHeight -= e.movementY;
          newTop += e.movementY;
        }

        // 右侧和底部
        if (direc.indexOf('e') !== -1) {
          newWidth += e.movementX;
        }
        if (direc.indexOf('s') !== -1) {
          newHeight += e.movementY;
        }

        EventHandlers.judgePanelSizeAndUpdate(panel, newLeft, newTop, newWidth, newHeight, originTop, originLeft);
      }
    }

    /**
     * 拖动面板
     * @param {Object} panel - FloatingPanel 实例
     * @param {MouseEvent} e - 鼠标事件
     */
    static dragOnPanel(panel, e) {
      if (panel.isDragging) {
        panel.floatingPanel;
        let newLeft = e.clientX - panel.offsetX;
        let newTop = e.clientY - panel.offsetY;

        EventHandlers.judgePanelPosAndUpdate(panel, newLeft, newTop);
      }
    }

    /**
     * 获取鼠标所在div的位置
     * @param {Object} panel - FloatingPanel 实例
     * @param {MouseEvent} ev - 鼠标事件
     * @returns {string} 方向字符串
     */
    static getDirection(panel, ev) {
      const floP = panel.floatingPanel;
      let dir = '';

      if (ev.clientX - floP.getBoundingClientRect().left < 15) {
        dir += 'w';
      } else if (floP.getBoundingClientRect().right - ev.clientX < 15) {
        dir += 'e';
      }

      if (ev.clientY - floP.getBoundingClientRect().top < 15) {
        dir += 'n';
      } else if (floP.getBoundingClientRect().bottom - ev.clientY < 15) {
        dir += 's';
      }

      return dir;
    }

    /**
     * 判断并更新面板大小
     * @param {Object} panel - FloatingPanel 实例
     * @param {number} newLeft - 新的左边距
     * @param {number} newTop - 新的上边距
     * @param {number} newWidth - 新的宽度
     * @param {number} newHeight - 新的高度
     * @param {number} originTop - 原始上边距
     * @param {number} originLeft - 原始左边距
     */
    static judgePanelSizeAndUpdate(panel, newLeft, newTop, newWidth, newHeight, originTop, originLeft) {
      const floP = panel.floatingPanel;

      // 获取视口的宽度和高度
      let viewportWidth = window.innerWidth || document.documentElement.clientWidth;
      let viewportHeight = window.innerHeight || document.documentElement.clientHeight;

      // 判断面板是否会跑到屏幕外边
      if (newLeft < 0 || newLeft + newWidth > viewportWidth) {
        return;
      }
      if (newTop < 0 || newTop + newHeight > viewportHeight) {
        return;
      }

      // 确保面板不会变得太小
      if (newWidth < panel.minW) {
        newWidth = panel.minW;
        newLeft = originLeft;
      }

      if (newHeight < panel.minH) {
        newHeight = panel.minH;
        newTop = originTop;
      }

      floP.style.width = newWidth + 'px';
      floP.style.height = newHeight + 'px';
      floP.style.top = newTop + 'px';
      floP.style.left = newLeft + 'px';
    }

    /**
     * 判断并更新面板位置
     * @param {Object} panel - FloatingPanel 实例
     * @param {number} newLeft - 新的左边距
     * @param {number} newTop - 新的上边距
     */
    static judgePanelPosAndUpdate(panel, newLeft, newTop) {
      const floP = panel.floatingPanel;

      // 获取视口的宽度和高度
      let viewportWidth = window.innerWidth || document.documentElement.clientWidth;
      let viewportHeight = window.innerHeight || document.documentElement.clientHeight;

      // 确保面板不会移动到屏幕外边
      newLeft = Math.max(0, Math.min(newLeft, viewportWidth - floP.offsetWidth));
      newTop = Math.max(0, Math.min(newTop, viewportHeight - floP.offsetHeight));

      // 更新面板位置
      floP.style.left = newLeft + 'px';
      floP.style.top = newTop + 'px';
    }
  }

  /** Export allowlist: timestamps, levels, and sanitized text only. */
  function sanitizeLog(value) {
    return String(value)
      .replace(/https?:\/\/[^\s<>]+/gi, '[URL omitted]')
      .replace(/((?:cookie|authorization|bearer|token|csrf|bili_jct|sessdata|password|secret)\s*[=:]?\s*)[^\s,;]+/gi, '$1[redacted]')
      .slice(0, 2000);
  }

  class LogStore {
    constructor(limit = 500) {
      this.limit = Math.max(1, limit);
      this.entries = [];
      this.dropped = 0;
    }

    add(message, level = 'info') {
      this.entries.push({ time: new Date().toISOString(), level: ['info', 'warn', 'error', 'debug'].includes(level) ? level : 'info', message: sanitizeLog(message) });
      while (this.entries.length > this.limit) { this.entries.shift(); this.dropped++; }
    }

    clear() { this.entries = []; this.dropped = 0; }
    filter(level = 'all') { return this.entries.filter(entry => level === 'all' || entry.level === level); }
    export() { return JSON.stringify({ dropped: this.dropped, entries: this.entries }, null, 2); }
  }

  const panelStyles = `
.bili-favs-manage-panel {
 --bf-font:system-ui,-apple-system,"Segoe UI","Microsoft YaHei UI","PingFang SC","Noto Sans CJK SC",sans-serif;
 --bf-text:14px; --bf-small:12px; --bf-title:15px;
 --bf-ink:#243544; --bf-muted:#526575; --bf-blue:#00789b; --bf-hover:#006581;
 --bf-line:#dce4eb; --bf-control:#8295a5; --bf-surface:#fff; --bf-soft:#f5f7f9; --bf-selected:#edf7fb;
 --bf-danger:#a8382b; --bf-danger-soft:#fff5f2; --bf-success:#236846; --bf-warning:#795200;
 box-sizing:border-box; position:fixed; top:24px; left:24px; width:640px; height:600px;
 max-width:calc(100vw - 16px); max-height:calc(100dvh - 16px); min-width:280px; min-height:64px;
 z-index:99999; background:var(--bf-surface); color:var(--bf-ink); border:1px solid var(--bf-control); border-radius:6px;
 box-shadow:0 4px 20px #20334424; font:400 var(--bf-text)/1.5 var(--bf-font); overflow:hidden; resize:both;
 display:flex; flex-direction:column;
 text-align:left; container-type:inline-size; isolation:isolate; color-scheme:light;
}
.bili-favs-manage-panel .bf-body { display:grid; grid-template-columns:minmax(0,1fr) 220px; grid-template-rows:minmax(0,1fr) auto; flex:1; min-height:0; }
.bili-favs-manage-panel[data-logs-open=false] .bf-body { grid-template-columns:minmax(0,1fr); }
.bili-favs-manage-panel[data-minimized=true] { display:block; resize:none; }
.bili-favs-manage-panel[data-minimized=true] .bf-body { display:none; }
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
.bili-favs-manage-panel .bf-header { display:flex; align-items:center; gap:4px; min-width:0; padding:8px 12px; cursor:move; border-bottom:1px solid var(--bf-line); flex-shrink:0; }
.bili-favs-manage-panel .bf-header strong { min-width:0; font-size:var(--bf-title); }
.bili-favs-manage-panel .bf-version { margin-right:auto; font-size:var(--bf-small); color:var(--bf-muted); }
.bili-favs-manage-panel .bf-header button { font-size:var(--bf-small); min-height:28px; padding:4px 6px; border-color:transparent; background:transparent; flex-shrink:0; }
.bili-favs-manage-panel .bf-header button[aria-expanded=true] { color:var(--bf-blue); background:var(--bf-selected); }
.bili-favs-manage-panel .bf-navigation { display:flex; gap:24px; padding:0 12px; border-bottom:1px solid var(--bf-line); flex-shrink:0; }
.bili-favs-manage-panel .bf-navigation button { border:0; border-bottom:2px solid transparent; border-radius:0; padding:8px 0 6px; background:none; color:var(--bf-muted); }
.bili-favs-manage-panel .bf-navigation button[aria-pressed=true] { color:var(--bf-blue); font-weight:600; border-bottom-color:var(--bf-blue); }
.bili-favs-manage-panel .bf-content { grid-column:1; grid-row:1; overflow-y:auto; overflow-x:hidden; padding:8px 12px; min-height:0; scrollbar-width:thin; scrollbar-color:var(--bf-control) transparent; scroll-padding:8px; }
.bili-favs-manage-panel .bf-muted,.bili-favs-manage-panel .bf-help { color:var(--bf-muted); font-size:var(--bf-small); }
.bili-favs-manage-panel .bf-task-heading p { margin:0; font-size:var(--bf-small); color:var(--bf-muted); }
.bili-favs-manage-panel .bf-task-heading { display:flex; align-items:baseline; flex-wrap:wrap; gap:0 8px; margin-bottom:6px; }
.bili-favs-manage-panel .bf-help { margin:2px 0 8px; }
.bili-favs-manage-panel .bf-selection-tools { display:flex; align-items:center; flex-wrap:wrap; gap:4px 8px; padding:0 0 6px; }
.bili-favs-manage-panel .bf-search { flex:1; min-width:100px; }
.bili-favs-manage-panel input[type=search] { display:block; width:100%; min-width:0; min-height:30px; padding:4px 6px; border:1px solid var(--bf-control); border-radius:4px; background:var(--bf-surface); }
.bili-favs-manage-panel input::placeholder { color:var(--bf-muted); opacity:1; }
.bili-favs-manage-panel .bf-selection-tools button { font-size:var(--bf-small); }
.bili-favs-manage-panel .bf-selection-count { color:var(--bf-muted); font-size:var(--bf-small); font-variant-numeric:tabular-nums; }
.bili-favs-manage-panel .bf-filter-notice { flex-basis:100%; font-size:var(--bf-small); color:var(--bf-warning); }
.bili-favs-manage-panel .bf-copy-columns,.bili-favs-manage-panel .signal-panel { display:grid; grid-template-columns:20px minmax(0,1fr) 12px minmax(0,1fr); align-items:center; gap:6px; }
.bili-favs-manage-panel .bf-copy-columns { padding:4px 0; font-size:var(--bf-small); color:var(--bf-muted); border-bottom:1px solid var(--bf-control); }
.bili-favs-manage-panel .fav-panel { margin:0; }
.bili-favs-manage-panel .signal-panel { padding:3px 0; border-bottom:1px solid var(--bf-line); }
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
.bili-favs-manage-panel .bf-progress-detail { width:100%; color:var(--bf-muted); }
.bili-favs-manage-panel .bf-progress-detail p { display:inline; margin:0; }
.bili-favs-manage-panel .bf-progress-detail p+p::before { content:' · '; }
.bili-favs-manage-panel .bf-tools { display:flex; align-items:center; flex-wrap:wrap; gap:8px; margin:8px 0; }
.bili-favs-manage-panel .bf-tools select { min-width:0; max-width:100%; }
.bili-favs-manage-panel .bf-tools label { display:flex; align-items:center; gap:4px; }
.bili-favs-manage-panel .bf-catalog-tools { margin:0 0 8px; }
.bili-favs-manage-panel .bf-scope-label { flex:1; min-width:0; font-size:var(--bf-small); color:var(--bf-muted); }
.bili-favs-manage-panel .bf-scope-label select { flex:1; }
.bili-favs-manage-panel .bf-empty { padding:20px 8px; text-align:center; color:var(--bf-muted); line-height:1.8; }
.bili-favs-manage-panel .bf-folder-item { border-bottom:1px solid var(--bf-line); padding:6px 0; }
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
.bili-favs-manage-panel .output-text-box { flex:1; overflow:auto; min-height:32px; border-top:1px solid var(--bf-line); font-size:var(--bf-small); line-height:1.5; scrollbar-width:thin; scroll-padding:8px; }
.bili-favs-manage-panel .bf-log-row { display:grid; grid-template-columns:54px minmax(0,1fr); gap:0 6px; padding:6px 0; border-bottom:1px solid var(--bf-line); align-items:baseline; }
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
@container (max-width:579px) {
 .bili-favs-manage-panel .bf-body { grid-template-columns:minmax(0,1fr); grid-template-rows:minmax(0,1fr) auto auto; }
 .bili-favs-manage-panel .bf-diagnostics { grid-column:1; grid-row:3; border-left:0; border-top:1px solid var(--bf-line); height:130px; }
 .bili-favs-manage-panel .bf-record-tools { display:flex; align-items:center; justify-content:space-between; gap:8px; }
 .bili-favs-manage-panel .bf-log-heading .bf-muted { display:none; }
 .bili-favs-manage-panel .bf-diagnostics .bf-tools { margin:0; }
 .bili-favs-manage-panel .bf-log-actions { padding:4px 0 0; }
 .bili-favs-manage-panel .bf-log-row { grid-template-columns:54px 28px minmax(0,1fr); gap:4px; padding:4px 0; }
 .bili-favs-manage-panel .bf-log-message { grid-column:auto; }
 .bili-favs-manage-panel .bf-header { padding:6px; gap:2px; flex-wrap:wrap; }
 .bili-favs-manage-panel .bf-header strong { font-size:14px; }
 .bili-favs-manage-panel .bf-header button { padding:4px; }
 .bili-favs-manage-panel .bf-version { font-size:12px; }
 .bili-favs-manage-panel .bf-content { padding:8px; }
 .bili-favs-manage-panel .bf-footer { padding:6px 8px; }
 @media(max-height:500px) {
  .bili-favs-manage-panel .bf-diagnostics { height:96px; padding:4px 8px; }
  .bili-favs-manage-panel .bf-diagnostics button,.bili-favs-manage-panel .bf-diagnostics select { min-height:24px; padding:2px 6px; }
  .bili-favs-manage-panel .output-text-box { min-height:24px; }
 }
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
  function folderRow(folder, input, reason = '') {
    const row = element('div', 'bf-folder-item');
    const label = element('label', 'bf-folder-row');
    label.append(input, element('span', 'bf-folder-name', folder.name),
      element('span', 'bf-folder-count', folder.count == null ? '数量未知' : `${folder.count} 条`));
    const identity = `ID ${folder.id} / 所有者 ${folder.ownerId || '未知'}`;
    label.title = `${folder.name} · ${identity}`;
    input.setAttribute('aria-label', `${folder.name} · ${identity}${reason ? ` · 不可选：${reason}` : ''}`);
    row.append(label);
    if (reason) row.append(element('span', 'bf-folder-reason', `不可选：${reason}`));
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
      this.count.textContent = `已选 ${selected.length} / ${rows.length} 个收藏夹`;
      this.notice.hidden = !this.search.value.trim();
      this.notice.textContent = `${visible.size} 个匹配${outside ? ` · 筛选外已选 ${outside} 个，也会执行` : ''}`;
    }
  }

  const statuses = { confirmed: '已确认', failed: '失败', unknown: '结果未知', not_started: '未提交' };
  const descriptions = {
    delete: { verb: '删除', title: '删除自己创建的收藏夹',
      detail: '删除收藏夹及收藏关系，无法撤销；原视频保留。',
      agreement: '我已检查以上目标，理解删除会移除整个收藏夹及其中收藏关系，且这里无法撤销。' },
    unsubscribe: { verb: '退订', title: '取消我的收藏夹订阅',
      detail: '取消我的订阅，原作者内容不受影响。',
      agreement: '我已检查以上 ID 和所有者，确认取消当前账号对这些收藏夹的订阅；原作者的内容不受影响。' }
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
      for (const folder of folders) {
        const reason = eligibility(this.action, folder, actor, pageOwner);
        const input = element('input'); input.type = 'checkbox';
        input.addEventListener('change', () => { this.invalidate(); this.inventoryUI.updateBusy(); });
        const node = folderRow(folder, input, reason);
        this.list.append(node); this.rows.push({ folder, input, reason, node });
      }
      this.updateBusy();
    }

    selected() { return this.rows.filter(row => row.input.checked && !row.reason).map(row => row.folder); }

    updateBusy() {
      const busy = this.panel.busy;
      this.selectionTools?.update();
      this.previewButton.disabled = busy || !this.selected().length;
      this.previewButton.hidden = this.inventoryUI.mode !== 'manage' || busy || !!this.ticket;
      for (const row of this.rows) row.input.disabled = busy || !!row.reason;
      if (this.confirmButton) this.confirmButton.disabled = busy || !this.agreement?.checked || !this.ticket;
      if (this.agreement) this.agreement.disabled = busy;
    }

    preview() {
      if (this.panel.busy) return;
      this.invalidate();
      try {
        const description = descriptions[this.action];
        this.ticket = this.engine.prepare(this.action, this.selected());
        this.review.append(element('h3', '', `将${description.verb} ${this.ticket.targets.length} 个收藏夹`));
        this.review.append(element('p', '', description.detail));
        for (const target of this.ticket.targets) this.review.append(element('p', '', `${target.name} · ID ${target.id} · 所有者 ${target.ownerId} · ${target.count ?? '未知'} 条`));
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
          if (result.status === 'confirmed') this.panel.operation.confirm(`ID ${result.id}：平台已确认`);
        } });
        this.inventoryUI.resetCatalog('本次操作后列表需要更新，请重新加载。');
        this.results.replaceChildren(element('p', '', report.complete ? '本次目标均已确认。请刷新平台列表核对。' : report.cancelled ? '已取消后续操作。请核对已提交项目。' : '已停止；请检查下列结果后再决定后续操作。'));
        for (const result of report.results) this.results.append(element('p', '', `${result.name} · ID ${result.id} · ${statuses[result.status]}：${result.detail}`));
        this.results.append(button('检查并导出操作结果', () => this.panel.reviewExport(JSON.stringify(report, null, 2), 'bili-operation.json')));
        this.panel.operation.finish(report.complete ? 'completed' : report.cancelled ? 'interrupted' : 'failed', '本次确认已用完；再次操作须重新加载列表、选择并确认。未知结果请先在平台核对，勿直接重试。');
      });
    }

    destroy() { this.invalidate(); }
  }

  class InventoryPanel {
    constructor(panel, service) {
      this.panel = panel; this.service = service; this.folders = []; this.rows = [];
      this.mode = 'statistics';
      this.root = element('section', 'bf-inventory');
      this.intro = element('p', 'bf-help', '只读统计所选范围，缺失信息记为未知。');
      this.root.append(this.intro);
      this.kind = element('select'); this.kind.setAttribute('aria-label', '加载范围');
      for (const [value, label] of [['created', '当前空间创建'], ['subscribed', '我的订阅']]) {
        const option = element('option', '', label); option.value = value; this.kind.append(option);
      }
      this.loadButton = button('加载列表', () => this.load());
      this.scanButton = button('统计选中收藏夹', () => this.scan());
      this.cancelButton = button('停止后续操作', () => { this.controller?.abort(); this.updateBusy(); });
      this.exportButton = button('检查并导出统计', () => { if (this.report) panel.reviewExport(JSON.stringify(this.report, null, 2), 'bili-inventory.json'); });
      const tools = element('div', 'bf-tools bf-catalog-tools');
      const scopeLabel = element('label', 'bf-scope-label', '列表范围');
      scopeLabel.append(this.kind); tools.append(scopeLabel, this.loadButton);
      this.selectionTools = new SelectionToolbar({
        rows: () => this.rows.map(row => ({ ...row, name: row.folder.name, eligible: row.folder.kind !== 'unsupported' })),
        busy: () => panel.busy, change: () => this.updateBusy()
      });
      this.selectionCount = this.selectionTools.count;
      this.actions = element('div', 'bf-action-bar');
      this.actions.append(this.exportButton, this.scanButton, this.cancelButton);
      this.scanButton.classList.add('bf-primary');
      this.list = element('div', 'bf-folder-list');
      this.list.append(element('p', 'bf-empty', '点击“加载列表”，读取当前选择的范围。不会自动扫描。'));
      this.result = element('div', 'bf-inventory-result'); this.result.setAttribute('role', 'status');
      this.root.append(tools, this.selectionTools.root, this.list, this.result);
      if (panel.manager.batchOperations) {
        this.mutations = new MutationPanel(this, panel.manager.batchOperations);
        this.root.append(this.mutations.root);
        this.actions.insertBefore(this.mutations.previewButton, this.cancelButton);
      }
      this.kind.addEventListener('change', () => {
        this.resetCatalog('范围已更换，请重新加载列表。'); this.updateBusy();
        this.panel.operation.update({ status: 'idle', action: '', confirmed: 0, total: null, lastConfirmed: '', detail: '' });
      });
      this.mutations?.setCatalog([], this.kind.value);
      this.updateBusy();
    }

    resetCatalog(message) {
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
      this.intro.hidden = manage;
      this.selectionTools.root.hidden = manage;
      this.list.hidden = manage; this.result.hidden = manage;
      if (this.mutations) this.mutations.root.hidden = !manage;
      this.updateBusy();
    }

    updateBusy() {
      const busy = this.panel.busy;
      this.kind.disabled = busy; this.loadButton.disabled = busy;
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
      for (const row of this.rows) row.input.disabled = busy || row.folder.kind === 'unsupported';
      this.mutations?.updateBusy();
    }

    selected() { return this.rows.filter(row => row.input.checked).map(row => row.folder); }

    async run(action, work) {
      if (this.panel.busy) return;
      this.controller = new AbortController();
      this.panel.setBusy(true); this.panel.operation.begin(action);
      try { await work(this.controller.signal); }
      catch (err) {
        this.panel.operation.finish(this.controller.signal.aborted ? 'interrupted' : 'failed', this.controller.signal.aborted ? '已取消，请重新选择后开始。' : err.message);
        (this.mode === 'manage' && this.mutations ? this.mutations.results : this.result).textContent = this.panel.operation.state.detail;
      } finally {
        if (this.controller.signal.aborted && this.panel.operation.state.status === 'running') this.panel.operation.finish('interrupted', '已取消，未继续后续请求。');
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
        for (const folder of folders) {
          const input = element('input'); input.type = 'checkbox'; input.disabled = folder.kind === 'unsupported';
          input.addEventListener('change', () => this.updateBusy());
          const node = folderRow(folder, input, folder.kind === 'unsupported' ? '合集暂不支持' : '');
          this.list.append(node); this.rows.push({ input, folder, node });
        }
        if (!folders.length) this.list.append(element('p', 'bf-empty', '这个范围没有可读取的收藏夹。可以更换范围后重新加载。'));
        this.panel.operation.finish('completed', `列表读取完成：${folders.length} 项；尚未选择或扫描。`);
      });
    }

    scan() {
      const folders = this.selected();
      return this.run('只读统计', async signal => {
        this.report = null; this.result.replaceChildren();
        const report = await this.service.scan(folders, { signal, onPage: ({ page, loaded }) => this.panel.operation.confirm(`第 ${page} 页，当前夹已读取 ${loaded} 条`) });
        this.report = report;
        this.result.replaceChildren(element('p', '', `${report.complete ? '完整扫描' : report.cancelled ? '已取消 · 部分结果' : '扫描不完整'}：覆盖 ${report.folders.length}/${report.scope.length} 个收藏夹，读取 ${report.entries} 条。`),
          element('p', '', `唯一视频 ${report.uniqueVideos} · 重复出现 ${report.duplicateOccurrences} · 无法识别 ${report.unknownIdentity} · 失效标记 ${report.unavailable}`),
          element('p', '', `已知时长合计 ${report.knownDurationSeconds} 秒（唯一视频；${report.unknownDurations} 个时长未知）· ${report.unknownUploaders} 个作者未知`));
        for (const f of report.folders) this.result.append(element('p', 'bf-muted', `ID ${f.id}：${f.pages} 页 / ${f.loaded} 条 / 预期 ${f.expected ?? '未知'}${f.issue ? ` · ${f.issue}` : ''}`));
        this.panel.operation.finish(report.complete ? 'completed' : report.cancelled ? 'interrupted' : 'failed', report.complete ? '已读取所选范围；这是读取时的快照，不代表账号全部收藏。' : '仅保留已读取数据；未完成范围不可当作总数。');
      });
    }

    destroy() { this.controller?.abort(); this.mutations?.destroy(); }
  }

  const statusNames = { idle: '准备就绪', running: '进行中', completed: '已完成', failed: '已停止', interrupted: '已中断' };
  const logLevels = { info: '信息', warn: '警告', error: '错误', debug: '调试' };

  class FloatingPanel {
    constructor(manager) {
      this.manager = manager;
      this.operation = manager.operation || new OperationState();
      this.logs = new LogStore();
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
      this.logsOpen = true;
    }

    init() {
      this.favorites = this.manager.getAllFavoriteNames();
      const root = element('section', 'bili-favs-manage-panel floating-panel');
      root.setAttribute('aria-label', '收藏夹管理');
      const style = element('style');
      style.textContent = panelStyles;
      this.floatingPanel = root;
      this.header = element('header', 'bf-header');
      this.header.append(element('strong', '', '收藏夹管理'));
      this.versionLabel = element('span', 'bf-version', `v${CONFIG.SCRIPT.VERSION}`);
      this.header.append(this.versionLabel);
      this.logsButton = button('操作记录', () => this.toggleLogs(), 'bf-quiet');
      this.logsButton.setAttribute('aria-expanded', 'true');
      this.logsButton.setAttribute('aria-label', '收起操作记录');
      this.minimizeButton = button('最小化', () => this.toggleMinimize());
      this.dismissButton = button('关闭', () => { this.onDismiss?.(); this.destroy(); });
      this.header.append(this.logsButton, this.minimizeButton, this.dismissButton);
      this.navigation = element('nav', 'bf-navigation');
      this.navigation.setAttribute('aria-label', '管理功能');
      this.viewButtons = new Map();
      for (const [view, label] of [['copy', '复制收藏夹'], ['statistics', '统计'], ['manage', '管理']]) {
        if (view !== 'copy' && !this.manager.inventory) continue;
        const control = button(label, () => this.showView(view));
        this.viewButtons.set(view, control); this.navigation.append(control);
      }
      this.content = element('div', 'bf-content');
      this.scope = element('p', 'bf-muted');
      this.workspace = element('section', 'bf-workspace');
      const heading = element('div', 'bf-task-heading');
      heading.append(this.scope);
      const help = element('p', 'bf-help', '同名则复用，否则新建；来源保留。');
      heading.append(help);
      this.workspace.append(heading);
      this.leftPanel = element('section', 'bf-sources');
      this.selectionTools = new SelectionToolbar({
        rows: () => this.favCheckboxItemList.map(item => ({ input: item.checkbox, node: item.checkboxContainer, name: item.getLabelValue(), eligible: true })),
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
      this.createDiagnostics();
      this.footer = element('footer', 'bf-footer');
      this.statusBox.append(this.progressDetails);
      this.footer.append(this.statusBox, this.copyActions);
      if (this.inventoryPanel) this.footer.append(this.inventoryPanel.actions);
      this.body = element('div', 'bf-body');
      this.body.append(this.content, this.footer, this.diagnostics);
      root.append(style, this.header, this.navigation, this.body);
      document.body.append(root);
      root.dataset.logsOpen = String(this.logsOpen);
      this.unsubscribe = this.operation.subscribe(state => this.renderOperation(state));
      this.onBodyMove = event => {
        EventHandlers.mouseMove(this, event);
        EventHandlers.dragOnPanel(this, event);
      };
      this.onBodyUp = () => { this.resizeable = false; this.isDragging = false; };
      root.addEventListener('mousedown', event => EventHandlers.mouseDown(this, event));
      document.body.addEventListener('mousemove', this.onBodyMove);
      document.body.addEventListener('mouseup', this.onBodyUp);
      this.onViewportResize = () => this.clampToViewport();
      window.addEventListener('resize', this.onViewportResize);
      this.clampToViewport();
      this.updateSelectionReview();
      this.showPageTypeIndicator();
      this.appendLog('准备就绪。请选择收藏夹。');
      this.renderView();
    }

    showView(view) {
      if (!['copy', 'statistics', 'manage'].includes(view) || this.busy || view === this.activeView) return;
      if ((view === 'statistics' || view === 'manage') && !this.inventoryPanel) return;
      this.viewScroll.set(this.activeView, this.content.scrollTop);
      this.inventoryPanel?.mutations?.invalidate();
      this.activeView = view;
      this.renderView();
      this.content.scrollTop = this.viewScroll.get(view) || 0;
    }

    renderView() {
      const view = this.activeView;
      this.workspace.hidden = view !== 'copy';
      if (this.inventoryPanel) {
        this.inventoryPanel.root.hidden = !['statistics', 'manage'].includes(view);
        if (view === 'statistics' || view === 'manage') this.inventoryPanel.setMode(view);
        this.inventoryPanel.actions.hidden = !['statistics', 'manage'].includes(view);
      }
      this.copyActions.hidden = view !== 'copy';
      this.footer.hidden = !!this.minimized;
      for (const [name, control] of this.viewButtons) control.setAttribute('aria-pressed', String(name === view));
    }

    toggleLogs() {
      this.logsOpen = !this.logsOpen;
      // Opening diagnostics from a minimized window restores the working context.
      if (this.logsOpen && this.minimized) this.toggleMinimize();
      this.diagnostics.hidden = !this.logsOpen;
      this.floatingPanel.dataset.logsOpen = String(this.logsOpen);
      this.logsButton.setAttribute('aria-expanded', String(this.logsOpen));
      this.logsButton.setAttribute('aria-label', this.logsOpen ? '收起操作记录' : '查看操作记录');
      if (this.logsOpen) this.renderLogs();
      else if (this.diagnostics.contains(document.activeElement)) this.logsButton.focus();
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
      this.favCheckboxItemList = this.favorites.map(name => {
        const item = new CheckboxItem(name);
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
        if (old) { item.checkbox.checked = old.checked; item.inputText.value = old.target; }
      }
      this.updateSelectionReview();
      this.showPageTypeIndicator();
    }

    toggleSelectAll() {
      this.selectionTools.toggle();
    }

    getSelectedTasks() {
      return this.favCheckboxItemList.filter(item => item.checkbox.checked).map(item => ({ source: item.getLabelValue(), target: item.inputText.value }));
    }

    updateSelectionReview() {
      const tasks = this.getSelectedTasks();
      const missing = tasks.some(task => !task.target.trim());
      this.selectionTools.update();
      if (missing) this.selectionReview.textContent = '请填好已选来源的目标名称';
      for (const item of this.favCheckboxItemList) {
        item.checkboxContainer.dataset.selected = String(item.checkbox.checked);
        item.inputText.setAttribute('aria-invalid', String(item.checkbox.checked && !item.inputText.value.trim()));
      }
      this.startBatchTransferButton.textContent = this.busy ? '操作中…' : tasks.length ? `复制 ${tasks.length} 个收藏夹` : '开始复制';
      this.startBatchTransferButton.disabled = this.busy || !tasks.length || missing;
    }

    setBusy(busy) {
      this.busy = busy;
      this.floatingPanel?.setAttribute('aria-busy', String(busy));
      this.selectAllButton.disabled = busy || !this.favorites.length;
      this.dismissButton.disabled = busy;
      for (const control of this.viewButtons.values()) control.disabled = busy;
      for (const item of this.favCheckboxItemList) { item.checkbox.disabled = busy; item.inputText.disabled = busy; }
      this.startBatchTransferButton.textContent = busy ? '操作中…' : '开始批量复制';
      this.updateSelectionReview();
      this.inventoryPanel?.updateBusy();
      this.onBusyChange?.(busy);
    }

    renderOperation(state) {
      const transition = `${state.action}:${state.status}`;
      if (state.status !== 'idle' && transition !== this.lastOperationTransition) {
        this.appendLog(`${statusNames[state.status]}：${state.action || '操作'}。${state.detail}`, state.status === 'failed' ? this.errorCode : state.status === 'interrupted' ? this.warnCode : this.normalCode);
      }
      this.lastOperationTransition = transition;
      this.statusBox.hidden = state.status === 'idle';
      this.statusBox.dataset.status = state.status;
      this.progressDetails.hidden = state.status === 'idle';
      this.statusTitle.textContent = `${statusNames[state.status]}${state.action ? ` · ${state.action}` : ''}`;
      this.statusCount.textContent = `已确认 ${state.confirmed}${state.total === null ? ' 项，总数未知' : ` / ${state.total} 项`}`;
      this.statusCount.hidden = state.confirmed === 0 && state.total === null;
      this.progressLast.textContent = `最后确认：${state.lastConfirmed || '尚无已确认步骤'}`;
      this.progressLast.hidden = !state.lastConfirmed;
      this.progressMessage.textContent = state.detail;
      if (this.footer) this.footer.hidden = !!this.minimized;
    }

    async startBatchTransfer() {
      if (this.busy) return;
      try {
        const tasks = normalizeCopyTasks(this.getSelectedTasks());
        if (!tasks.length) throw new Error('请至少选择一个源收藏夹。');
        this.setBusy(true);
        await this.manager.batchCopy(tasks);
      } catch (err) {
        this.operation.finish('failed', `${err.message} 请检查页面结果后再决定是否重试。`);
        this.appendLog(err.message, this.errorCode);
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
      this.logFilter = element('select');
      this.logFilter.setAttribute('aria-label', '日志级别');
      for (const [value, text] of [['all', '全部级别'], ['error', '错误'], ['warn', '警告'], ['info', '信息'], ['debug', '调试']]) {
        const option = element('option', '', text); option.value = value; this.logFilter.append(option);
      }
      this.logFilter.addEventListener('change', () => { this.logScrollTop = 0; this.renderLogs(); });
      this.followCheckbox = element('input'); this.followCheckbox.type = 'checkbox'; this.followCheckbox.checked = true;
      const followLabel = element('label', '', '跟随最新'); followLabel.prepend(this.followCheckbox);
      this.followCheckbox.addEventListener('change', () => { this.scrollTopEnabled = this.followCheckbox.checked; this.renderLogs(); });
      tools.append(this.logFilter, followLabel);
      const actions = element('div', 'bf-log-actions');
      actions.append(button('清空', () => { this.logs.clear(); this.renderLogs(); }), button('导出记录', () => this.reviewExport(this.logs.export(), 'bili-favs-log.json')));
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
      const entries = this.logs.filter(this.logFilter.value);
      this.outputTextBox.replaceChildren(...entries.map(entry => {
        const row = element('div', `bf-log-row bf-log-${entry.level}`);
        row.append(element('time', '', entry.time.slice(11, 19)), element('span', 'bf-log-level', logLevels[entry.level]), element('span', 'bf-log-message', entry.message));
        return row;
      }));
      if (!entries.length) this.outputTextBox.append(element('p', 'bf-empty', this.logs.entries.length ? '此级别没有记录，可切换到全部级别。' : '暂无记录。后续操作会显示在这里。'));
      this.logCount.textContent = `${entries.length} / ${this.logs.entries.length} 条${this.logs.dropped ? ` · 已淘汰 ${this.logs.dropped} 条` : ''}`;
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
        this.content.inert = false; this.navigation.inert = false; this.footer.inert = false; this.header.inert = false; this.diagnostics.inert = false;
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
      this.content.inert = true; this.navigation.inert = true; this.footer.inert = true; this.header.inert = true; this.diagnostics.inert = true;
      area.focus();
    }

    toggleMinimize() {
      this.minimized = !this.minimized;
      this.floatingPanel.dataset.minimized = String(this.minimized);
      this.content.hidden = this.minimized;
      this.navigation.hidden = this.minimized; this.footer.hidden = this.minimized;
      this.diagnostics.hidden = this.minimized || !this.logsOpen;
      this.minimizeButton.textContent = this.minimized ? '恢复面板' : '最小化';
      this.minimizeButton.setAttribute('aria-expanded', String(!this.minimized));
      if (this.minimized) { this.hiddenHeight = this.floatingPanel.style.height; this.floatingPanel.style.height = '64px'; }
      else { this.floatingPanel.style.height = this.hiddenHeight || ''; if (this.logsOpen) this.renderLogs(); this.clampToViewport(); }
    }

    recordPanelSize() { this.clampToViewport(); }

    clampToViewport() {
      if (!this.floatingPanel) return;
      const panel = this.floatingPanel;
      const rect = panel.getBoundingClientRect();
      panel.style.left = Math.max(0, Math.min(rect.left, window.innerWidth - rect.width)) + 'px';
      panel.style.top = Math.max(0, Math.min(rect.top, window.innerHeight - rect.height)) + 'px';
    }

    destroy() {
      this.inventoryPanel?.destroy();
      if (this.operation.state.status === 'running') this.operation.finish('interrupted', '面板已离开当前页面；请检查页面结果，不要直接重复提交。');
      this.unsubscribe?.();
      document.body.removeEventListener('mousemove', this.onBodyMove);
      document.body.removeEventListener('mouseup', this.onBodyUp);
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
          log('恢复跨页面流程失败:', err.message);
          manager.operation.finish('failed', `恢复失败：${err.message}。请检查页面后重试。`);
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
