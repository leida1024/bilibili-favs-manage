/**
 * B 站收藏夹页面 API 封装
 * 封装所有与 B 站页面 DOM 交互的操作
 */

import { SELECTORS, BUTTON_TEXTS } from '../config/selectors.js';
import { delay, waitForElement, findButtonByText, getElementText, isElementVisible } from '../utils/dom.js';
import { log, error, warn, debug } from '../utils/logger.js';
import { CONFIG } from '../config/config.js';
import { getPageAdapter } from './adapters/index.js';
import { VuiPageAdapter } from './adapters/VuiPageAdapter.js';
import { normalizeFavoriteName } from '../utils/favoriteNames.js';

const pageAdapter = () => getPageAdapter() || VuiPageAdapter;

export class BilibiliAPI {
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
   * @returns {Promise<boolean>} 是否成功
   */
  static async clickCreateButton() {
    const createConfirmBtn = (getPageAdapter()?.createConfirm && document.querySelector(getPageAdapter().createConfirm)) ||
      findButtonByText(BUTTON_TEXTS.CREATE);

    if (!createConfirmBtn || createConfirmBtn.disabled) {
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

    debug('点击左侧边栏[新建收藏夹]');
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
    if (!guard()) return false;
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
    this.copySubmission = { status: 'not_started', detail: '尚未提交复制' };
    const confirmBtn = dialog.querySelector(pageAdapter().confirm);
    if (!confirmBtn || confirmBtn.disabled) {
      error('找不到确定按钮');
      return false;
    }

    debug('点击确定');
    // Only a newly rendered success message can confirm this submission.
    let confirmed = false, finish;
    const result = new Promise(resolve => { finish = resolve; });
    const observer = new window.MutationObserver(records => {
      for (const record of records) {
        const nodes = record.type === 'childList' ? [...record.addedNodes] : [record.target];
        for (const node of nodes) {
          const el = node.nodeType === 1 ? node : node.parentElement;
          const toast = el?.closest(SELECTORS.TOAST) || el?.querySelector?.(SELECTORS.TOAST);
          if (toast?.textContent.includes(BUTTON_TEXTS.SUCCESS)) { confirmed = true; finish(); }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    let timer;
    this.copySubmission = { status: 'unknown', detail: '复制已提交，但未观察到平台成功提示。' };
    try {
      confirmBtn.click();
      await Promise.race([result, new Promise(resolve => { timer = setTimeout(resolve, CONFIG.DELAY.LONG * 3); })]);
    } catch (err) {
      err.outcome = 'unknown'; throw err;
    } finally { observer.disconnect(); clearTimeout(timer); }
    if (confirmed) {
      this.copySubmission = { status: 'confirmed', detail: '已观察到平台成功提示' };
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
      debug('判断为单页收藏夹');
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
