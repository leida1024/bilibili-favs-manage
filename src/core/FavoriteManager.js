/**
 * 收藏夹管理器
 * 负责批量复制收藏夹的核心逻辑
 */

import { BilibiliAPI } from './BilibiliAPI.js';
import { PageDetector } from './PageDetector.js';
import { CrossPageFlowManager } from './CrossPageFlowManager.js';
import { delay } from '../utils/dom.js';
import { log, error, warn } from '../utils/logger.js';
import { CONFIG } from '../config/config.js';
import { normalizeFavoriteName, normalizeCopyTasks, assertUnambiguousFavoriteName } from '../utils/favoriteNames.js';
import { OperationState } from './OperationState.js';
import { InventoryService } from './InventoryService.js';
import { BatchOperations } from './BatchOperations.js';
import { LogStore } from '../utils/logStore.js';
import { browserStore, panelPreferences, validModes } from '../utils/preferences.js';
import { FolderClient, stableId } from './FolderClient.js';
import { WebFolderClient } from './WebFolderClient.js';
import { TransportClient } from './TransportClient.js';
import { assertCopyContext, currentCopyContext } from './copyContext.js';
import { ApiCopyFlow } from './ApiCopyFlow.js';

export class FavoriteManager {
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
