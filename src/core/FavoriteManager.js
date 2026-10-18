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
import { normalizeFavoriteName, normalizeCopyTasks } from '../utils/favoriteNames.js';
import { OperationState } from './OperationState.js';

export class FavoriteManager {
  constructor() {
    this.api = BilibiliAPI;
    this.crossPageFlow = new CrossPageFlowManager(this);
    this.operation = new OperationState();
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
