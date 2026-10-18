// ==UserScript==
// @name         Bilibili 收藏夹批量管理
// @namespace    http://tampermonkey.net/
// @version      2.1.2
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

    // 脚本信息
    SCRIPT: {
      VERSION: '2.1.2'}
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
      confirmBtn.click();
      await delay(CONFIG.DELAY.LONG);

      // 检查是否有成功提示
      const toast = document.querySelector(SELECTORS.TOAST);
      if (toast && toast.textContent.includes(BUTTON_TEXTS.SUCCESS)) {
        log('✓ 复制成功');
      } else {
        log('复制请求已发送，请检查结果');
      }

      return true;
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
        return;
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

  /**
   * 收藏夹管理器
   * 负责批量复制收藏夹的核心逻辑
   */


  class FavoriteManager {
    constructor() {
      this.api = BilibiliAPI;
      this.crossPageFlow = new CrossPageFlowManager(this);
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
            break;
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
      log('开始批量复制，共', copyList.length, '个任务');

      // 检测是否需要跨页面创建收藏夹（copying 阶段恢复时跳过，避免重复触发跳转）
      if (!skipCrossPage) {
        const isOwnPage = PageDetector.isOwnPage();
        if (!isOwnPage) {
          // 在别人页面：option A——只要在他人页面就走跨页面流程，
          // 由「自己页面」阶段再对比并创建缺失的收藏夹
          log('检测到在别人页面，启动跨页面流程...');
          await this.crossPageFlow.startCrossPageFlow(copyList);
          return; // 跳转后中断当前流程
        }
      }

      // 正常复制流程
      for (let i = 0; i < copyList.length; i++) {
        const { source, target } = copyList[i];
        log(`\n[${i + 1}/${copyList.length}] ${source} → ${target}`);

        if (!await this.copyFavorite(source, target)) {
          throw new Error(`收藏夹 [${source}] → [${target}] 复制失败，已停止后续任务，请检查页面结果后重试`);
        }

        // 任务间延迟
        if (i < copyList.length - 1) {
          await delay(CONFIG.DELAY.MIDDLE);
        }
      }

      log('\n批量复制完成！');
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

  class UIComponents {
    static createButton(text, clickHandler, className = 'btn') {
      const button = document.createElement('button');
      button.textContent = text;
      button.classList.add('btn');
      button.style.margin = '0px';
      button.style.padding = '0px 0px';
      button.style.fontSize = '14px';
      button.style.width = '150px';
      button.style.height = '40px';
      button.style.marginTop = '5px';
      button.style.marginLeft = '5px';

      if (clickHandler) {
        button.addEventListener('click', clickHandler);
      }

      return button;
    }

    static createOutputTextBox() {
      const editableArea = document.createElement('div');
      editableArea.classList.add('output-text-box');
      editableArea.style.border = '1px solid #ccc';
      editableArea.style.padding = '5px';
      editableArea.style.boxSizing = 'border-box';
      editableArea.style.whiteSpace = 'nowrap';
      editableArea.style.minWidth = '300px';
      editableArea.contentEditable = true;
      editableArea.style.flexGrow = '1';
      editableArea.style.overflow = 'auto';

      editableArea.addEventListener('scroll', function () {
        this.scrollTopEnabled = false;
      });

      return editableArea;
    }

    static createSubDiv(className, floatPos, width, height) {
      const subPanel = document.createElement('div');
      subPanel.style.flexGrow = '1';
      subPanel.style.display = 'flex';
      subPanel.style.border = '1px solid #ccc';

      if (className) subPanel.classList.add(className);
      if (floatPos) subPanel.style.float = floatPos;
      if (width) subPanel.style.width = width;
      if (height) subPanel.style.height = height;

      return subPanel;
    }

    /**
     * 创建下拉选择框
     * @param {Array<string>} options - 选项列表
     * @param {string} defaultValue - 默认值
     * @returns {HTMLSelectElement}
     */
    static createSelect(options, defaultValue = '') {
      const select = document.createElement('select');
      select.style.width = '100%';
      select.style.padding = '5px';
      select.style.fontSize = '14px';
      select.style.border = '1px solid #ccc';
      select.style.borderRadius = '3px';

      // Add empty option if no options provided
      if (options.length === 0) {
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '(无收藏夹)';
        select.appendChild(emptyOption);
        return select;
      }

      for (const option of options) {
        const optionElem = document.createElement('option');
        optionElem.value = option;
        optionElem.textContent = option;
        if (option === defaultValue) {
          optionElem.selected = true;
        }
        select.appendChild(optionElem);
      }

      return select;
    }
  }

  /**
   * 复选框项组件
   */
  class CheckboxItem {
    constructor(favName) {
      this.checkboxContainer = this.createCheckboxContainer(favName);
      this.checkbox = this.checkboxContainer.querySelector("input[type='checkbox']");
      this.label = this.checkboxContainer.querySelector('label');
      this.inputText = this.checkboxContainer.querySelector("input[type='text']");
    }

    createCheckboxContainer(favName) {
      const checkboxContainer = document.createElement('div');
      const checkboxDiv = UIComponents.createSubDiv('signal-panel');
      checkboxDiv.style.justifyContent = 'space-between';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `checkbox-${favName}`;

      const label = document.createElement('label');
      label.textContent = favName;
      label.setAttribute('for', `checkbox-${favName}`);

      const inputText = document.createElement('input');
      inputText.type = 'text';
      inputText.value = favName;
      inputText.style.textAlign = 'center';

      checkboxDiv.appendChild(checkbox);
      checkboxDiv.appendChild(label);
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
      const floP = panel.floatingPanel;

      if (panel.minimizeButton.textContent === '点我最小化') {
        panel.recordHiddenPanelSize();
        panel.minimizeButton.textContent = '点我打开面板';
        floP.style.width = panel.minW + 'px';
        floP.style.height = panel.minH + 'px';
      } else {
        panel.minimizeButton.textContent = '点我最小化';
        floP.style.width = Math.max(panel.hiddenWidth, floP.offsetWidth, panel.originFPW) + 'px';
        floP.style.height = Math.max(panel.hiddenHeight, floP.offsetHeight, panel.originFPH) + 'px';
      }
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
      const floP = panel.floatingPanel;
      let d = EventHandlers.getDirection(panel, e);

      // 当位置为四个边和四个角时才开启尺寸修改
      if (d !== '') {
        panel.resizeable = true;
        panel.isDragging = false;
        panel.direction = d;
      } else {
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

  /**
   * 浮动面板
   * 管理浮动面板的生命周期和交互
   */


  class FloatingPanel {
    constructor(manager) {
      this.manager = manager; // FavoriteManager 实例

      // 延迟时间
      this.delayTimeShort = 500;
      this.delayTimeMiddle = 1000;
      this.delayTimeLong = 2000;

      // 消息类型
      this.errorCode = 0;
      this.normalCode = 1;
      this.startBatchCode = 2;
      this.startSingleCode = 3;
      this.endSingleCode = 4;
      this.endBatchCode = 5;
      this.onePageCode = 6;
      this.warnCode = 7;

      // 面板宽度比例
      this.leftWidth = '35%';
      this.rightWidth = '63%';

      // 状态变量
      this.isDragging = false;
      this.resizeable = false;
      this.scrollTopEnabled = true;

      // UI 元素
      this.panel = null;
      this.floatingPanel = null;
      this.leftPanel = null;
      this.rightPanel = null;
      this.outputTextBox = null;
      // 已移除 sourceSelect 和 targetSelect（改用复选框列表）
      this.favCheckboxItemList = [];  // 新增：复选框项列表

      // 按钮
      this.selectAllButton = null;
      this.minimizeButton = null;
      this.startBatchTransferButton = null;

      // 收藏夹列表
      this.favorites = [];
      this.busy = false;
    }

    /**
     * 初始化并显示面板
     */
    init() {
      // 先获取收藏夹数据（不触发 log）
      this.favorites = this.manager.getAllFavoriteNames();

      // 创建面板（此时 outputTextBox 被初始化）
      this.floatingPanel = this.createFloatingPanel();
      document.body.appendChild(this.floatingPanel);
      this.recordPanelSize();

      // 现在可以安全地使用 log
      this.appendLog('浮动面板已创建', this.normalCode);
      this.showPageTypeIndicator();
    }

    /**
     * 加载收藏夹列表
     */
    loadFavorites() {
      this.favorites = this.manager.getAllFavoriteNames();
    }

    refreshFavorites() {
      const selections = new Map(this.favCheckboxItemList.map(item => [item.getLabelValue(), {
        checked: item.getCheckboxValue(), target: item.getInputTextValue()
      }]));
      this.loadFavorites();
      this.leftPanel.querySelector('.fav-panel')?.remove();
      this.leftPanel.appendChild(this.createFavPanel());
      for (const item of this.favCheckboxItemList) {
        const previous = selections.get(item.getLabelValue());
        if (previous) {
          item.checkbox.checked = previous.checked;
          item.inputText.value = previous.target;
        }
      }
      this.selectAllButton.textContent = '点我全选';
    }

    /**
     * 显示页面类型指示器
     */
    showPageTypeIndicator() {
      const isOwnPage = PageDetector.isOwnPage();
      const pageType = isOwnPage ? '我的收藏夹' : '他人的收藏夹';
      const color = isOwnPage ? '#00a000' : '#ff8800';
      this.appendLog(`当前页面: ${pageType}`, this.normalCode);

      // 更新标题颜色
      const titleElements = this.floatingPanel.querySelectorAll('h3');
      for (const title of titleElements) {
        if (title.textContent === '输出信息') {
          title.style.color = color;
        }
      }
    }

    /**
     * 创建左侧面板
     */
    createLeftPanel() {
      const leftPanel = UIComponents.createSubDiv('left-panel', 'left');
      leftPanel.style.flexGrow = '0';
      leftPanel.style.backgroundColor = '#f5f5f5';
      leftPanel.style.flexDirection = 'column';

      // 创建按钮面板
      const btnPanel = this.createButtonPanel();
      leftPanel.appendChild(btnPanel);

      // 创建收藏夹面板（复选框列表）
      const favPanel = this.createFavPanel();
      leftPanel.appendChild(favPanel);

      return leftPanel;
    }

    /**
     * 创建右侧面板
     */
    createRightPanel() {
      const textContainer = document.createElement('div');
      const textDiv = UIComponents.createSubDiv('div');

      const hintText = document.createElement('h3');
      hintText.style.fontWeight = 'bold';
      hintText.textContent = '输出信息';

      textDiv.appendChild(hintText);
      textContainer.appendChild(textDiv);

      this.outputTextBox = UIComponents.createOutputTextBox();
      this.outputTextBox.style.backgroundColor = '#fff';

      const rightPanel = UIComponents.createSubDiv('right-panel', 'right');
      rightPanel.style.backgroundColor = '#fafafa';
      rightPanel.style.overflowX = 'hidden';
      rightPanel.style.flexDirection = 'column';
      rightPanel.appendChild(textContainer);
      rightPanel.appendChild(this.outputTextBox);

      return rightPanel;
    }

    /**
     * 创建按钮面板
     */
    createButtonPanel() {
      const btnPanel = document.createElement('div');
      btnPanel.className = 'btn-panel';
      btnPanel.style.display = 'flex';
      btnPanel.style.border = '1px solid #ccc';
      btnPanel.style.backgroundColor = '#e8e8e8';
      btnPanel.style.flexDirection = 'column';

      // 全选按钮
      this.selectAllButton = UIComponents.createButton('点我全选', () => {
        this.toggleSelectAll();
      });

      const startBatchTransferButton = UIComponents.createButton('开始批量复制', () => {
        this.startBatchTransfer();
      });

      this.minimizeButton = UIComponents.createButton('点我最小化', () => {
        EventHandlers.toggleMinimize(this);
      });

      const destroyButton = UIComponents.createButton('点我销毁', () => {
        this.onDismiss?.();
        this.destroy();
      });

      btnPanel.appendChild(this.selectAllButton);
      btnPanel.appendChild(startBatchTransferButton);
      btnPanel.appendChild(this.minimizeButton);
      btnPanel.appendChild(destroyButton);

      this.startBatchTransferButton = startBatchTransferButton;

      return btnPanel;
    }

    /**
     * 切换全选状态
     */
    toggleSelectAll() {
      if (this.selectAllButton.textContent === '点我全选') {
        for (const item of this.favCheckboxItemList) {
          item.checkbox.checked = true;
        }
        this.selectAllButton.textContent = '点我全部取消';
      } else {
        for (const item of this.favCheckboxItemList) {
          item.checkbox.checked = false;
        }
        this.selectAllButton.textContent = '点我全选';
      }
    }

    /**
     * 创建收藏夹面板（复选框列表）
     */
    createFavPanel() {
      const favPanel = document.createElement('div');
      favPanel.className = 'fav-panel';
      favPanel.style.display = 'flex';
      favPanel.style.flexDirection = 'column';
      favPanel.style.padding = '10px';
      favPanel.style.border = '1px solid #ccc';
      favPanel.style.backgroundColor = '#fff';
      favPanel.style.flexGrow = '1';
      favPanel.style.overflow = 'auto';

      // 标题行
      const titleRow = document.createElement('div');
      titleRow.style.display = 'flex';
      titleRow.style.justifyContent = 'space-between';
      titleRow.style.marginBottom = '10px';

      const srcTitle = document.createElement('h4');
      srcTitle.textContent = '源收藏夹';
      srcTitle.style.margin = '0';
      srcTitle.style.fontWeight = 'bold';

      const dstTitle = document.createElement('h4');
      dstTitle.textContent = '目标收藏夹';
      dstTitle.style.margin = '0';
      dstTitle.style.fontWeight = 'bold';

      titleRow.appendChild(srcTitle);
      titleRow.appendChild(dstTitle);
      favPanel.appendChild(titleRow);

      // 创建复选框项列表
      this.favCheckboxItemList = this.createFavCheckboxItems();
      for (const item of this.favCheckboxItemList) {
        favPanel.appendChild(item.checkboxContainer);
      }

      return favPanel;
    }

    /**
     * 创建复选框项列表
     */
    createFavCheckboxItems() {
      const items = [];
      for (const favName of this.favorites) {
        const checkboxItem = new CheckboxItem(favName);
        items.push(checkboxItem);
      }
      return items;
    }

    /**
     * 获取选中的复制任务列表
     * @returns {Array<{source: string, target: string}>}
     */
    getSelectedTasks() {
      const tasks = [];
      for (const item of this.favCheckboxItemList) {
        if (item.getCheckboxValue()) {
          tasks.push({
            source: item.getLabelValue(),
            target: item.getInputTextValue()
          });
        }
      }
      return tasks;
    }

    /**
     * 创建浮动面板
     */
    createFloatingPanel() {
      const floP = document.createElement('div');
      floP.classList.add('floating-panel');
      floP.classList.add('bili-favs-manage-panel');
      floP.style.position = 'fixed';
      floP.style.top = '50px';
      floP.style.left = '50px';
      floP.style.width = '600px';
      floP.style.height = '500px';
      floP.style.backgroundColor = '#ffffff';
      floP.style.border = '2px solid #ccc';
      floP.style.borderRadius = '5px';
      floP.style.padding = '0px';
      floP.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
      floP.style.zIndex = '99999';
      floP.style.display = 'flex';

      // 创建左右面板
      this.leftPanel = this.createLeftPanel();
      this.rightPanel = this.createRightPanel();

      floP.appendChild(this.leftPanel);
      floP.appendChild(this.rightPanel);

      // 绑定事件
      floP.addEventListener('mousedown', (e) => EventHandlers.mouseDown(this, e));
      floP.addEventListener('mouseup', () => EventHandlers.stopDragOnPanel(this));
      floP.addEventListener('mousemove', (e) => EventHandlers.dragOnPanel(this, e));

      this.onBodyMove = (e) => EventHandlers.mouseMove(this, e);
      this.onBodyUp = () => {
        EventHandlers.stopResizeOnBody(this);
        EventHandlers.stopDragOnPanel(this);
      };
      document.body.addEventListener('mousemove', this.onBodyMove);
      document.body.addEventListener('mouseup', this.onBodyUp);

      return floP;
    }

    /**
     * 记录面板大小
     */
    recordPanelSize() {
      const fPW = this.floatingPanel.offsetWidth;
      const fPH = this.floatingPanel.offsetHeight;

      if (this.originFPW === undefined) {
        this.originRPW = this.rightPanel.offsetWidth;
        this.originRPH = this.rightPanel.offsetHeight;

        this.originFPW = fPW;
        this.originFPH = fPH;

        this.minW = this.leftPanel.offsetWidth;
        this.minH = this.floatingPanel.querySelector('.btn-panel').offsetHeight;
      }

      this.floatingPanel.style.width = fPW + 'px';
      this.floatingPanel.style.height = fPH + 'px';
    }

    /**
     * 记录隐藏前的面板大小
     */
    recordHiddenPanelSize() {
      this.hiddenWidth = this.floatingPanel.offsetWidth;
      this.hiddenHeight = this.floatingPanel.offsetHeight;
    }

    /**
     * 开始批量复制
     */
    async startBatchTransfer() {
      if (this.busy) return;
      // 获取选中的复制任务
      const tasks = this.getSelectedTasks();

      if (tasks.length === 0) {
        this.appendLog('错误: 请至少勾选一个源收藏夹', this.errorCode);
        return;
      }

      this.appendLog(`开始批量复制，共 ${tasks.length} 个任务`, this.startBatchCode);

      // 禁用按钮
      this.busy = true;
      this.startBatchTransferButton.disabled = true;
      this.selectAllButton.disabled = true;
      this.startBatchTransferButton.textContent = '复制中...';

      try {
        // 调用 FavoriteManager 的批量复制方法
        await this.manager.batchCopy(tasks);
        this.appendLog('✓ 批量复制完成!', this.endBatchCode);
      } catch (err) {
        this.appendLog(`✗ 批量复制出错: ${err.message}`, this.errorCode);
        console.error(err);
      } finally {
        this.busy = false;
        // 恢复按钮
        this.startBatchTransferButton.disabled = false;
        this.selectAllButton.disabled = false;
        this.startBatchTransferButton.textContent = '开始批量复制';
      }
    }

    /**
     * 输出日志到面板
     */
    appendLog(info, type = this.normalCode) {
      // 如果 outputTextBox 还未初始化，使用控制台输出
      if (!this.outputTextBox) {
        console.log(`[BiliBili Favs] ${info}`);
        return;
      }

      this.appendInfoToTextarea(this.outputTextBox, info, type);
    }

    /**
     * 将信息追加到文本区域
     */
    appendInfoToTextarea(textarea, info, type = this.normalCode) {
      // 防御性检查
      if (!textarea) {
        console.log(`[BiliBili Favs] ${info}`);
        return;
      }

      let currentDate = new Date();
      let timezoneOffset = currentDate.getTimezoneOffset();
      let timezoneOffsetMilliseconds = timezoneOffset * 60 * 1000;
      let userCurrentDate = new Date(currentDate.getTime() - timezoneOffsetMilliseconds);
      let formattedDate = userCurrentDate.toISOString().replace(/T/, ' ').replace(/\..+/, '');

      let textColor;
      let brCnt = 1;

      switch (type) {
        case this.errorCode:
          textColor = 'red';
          break;
        case this.normalCode:
          textColor = 'black';
          break;
        case this.endBatchCode:
          brCnt++;
        case this.startBatchCode:
          brCnt++;
          textColor = 'blue';
          break;
        case this.endSingleCode:
          brCnt++;
        case this.startSingleCode:
          textColor = 'green';
          break;
        case this.onePageCode:
          textColor = 'purple';
          info += '--------------';
          break;
        case this.warnCode:
          textColor = 'orange';
          break;
        default:
          textColor = 'black';
          break;
      }

      const span = document.createElement('span');
      span.style.color = textColor;
      span.textContent = formattedDate + ': ' + info;

      textarea.appendChild(span);
      for (let i = 0; i < brCnt; i++) {
        textarea.appendChild(document.createElement('br'));
      }

      // 自动滚动到底部
      if (this.scrollTopEnabled) {
        textarea.scrollTop = textarea.scrollHeight;
      }
    }

    /**
     * 销毁面板
     */
    destroy() {
      document.body.removeEventListener('mousemove', this.onBodyMove);
      document.body.removeEventListener('mouseup', this.onBodyUp);
      if (this.floatingPanel) {
        this.floatingPanel.remove();
        this.floatingPanel = null;
      }
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
        mountedPanel.busy = true;
        manager.crossPageFlow.resumeFlow().catch(err => {
          log('恢复跨页面流程失败:', err.message);
        }).finally(() => { mountedPanel.busy = false; });
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
