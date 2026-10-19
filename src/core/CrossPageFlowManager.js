/**
 * 跨页面流程管理器
 * 处理跨页面创建收藏夹的完整流程
 */

import { StateManager } from './StateManager.js';
import { PageDetector } from './PageDetector.js';
import { BilibiliAPI } from './BilibiliAPI.js';
import { delay } from '../utils/dom.js';
import { log, error } from '../utils/logger.js';
import { CONFIG } from '../config/config.js';
import { normalizeFavoriteName, normalizeCopyTasks } from '../utils/favoriteNames.js';
import { newOperationId } from '../utils/logStore.js';

export class CrossPageFlowManager {
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
    const actorId = PageDetector.getLoginUserUID();
    if (!ownURL) {
      error('无法获取用户自己的收藏夹页面 URL');
      throw new Error('无法确认登录身份，请登录后再复制');
    }

    this.manager.operation.update({ phase: 'creating', detail: '即将前往我的空间，检查并准备目标收藏夹。' });
    this.manager.logs.setContext({ view: 'copy', operationId: this.manager.operation.state.operationId, phase: 'creating' });
    log('3 秒后前往我的空间准备目标，随后返回来源继续复制。');
    await delay(3000);
    if (PageDetector.getLoginUserUID() !== actorId) throw new Error('登录账号已变化，跨页任务未交接。');
    this.manager.operation.finish('waiting', '已交接跨页任务，等待目的页面继续。');
    StateManager.saveState({
      phase: 'creating', returnURL: window.location.href, tasks, actorId,
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
  async batchCreateFavorites(favNames) {
    favNames = [...new Set(favNames.map(normalizeFavoriteName))];
    if (favNames.some(name => !name)) return false;
    log('开始批量创建收藏夹');
    log(`共 ${favNames.length} 个: ${favNames.join(', ')}`);

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

    // Only a missing sidebar entry permits the copy-dialog alternative.
    log('未找到左侧“新建收藏夹”，尝试通过复制弹窗新建（需要可选视频）');
    return await this.createViaCopyDialog(favName);
  }

  /**
   * 通过批量模式复制对话框创建收藏夹（需可选视频的备用入口）
   * @param {string} favName - 收藏夹名称
   * @returns {Promise<boolean>}
   */
  async createViaCopyDialog(favName) {
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
    const operationId = typeof state.operationId === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(state.operationId) ? state.operationId : newOperationId();
    this.manager.logs.restore(state.journal);
    this.manager.operation.begin('批量复制', state.tasks.length, { operationId, phase: state.phase });
    this.manager.logs.setContext({ view: 'copy', operationId, phase: state.phase });
    log(state.phase === 'creating' ? '已到达我的空间，继续准备目标。' : '已返回来源空间，继续复制。');

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
      log('目标准备完成，3 秒后返回来源空间继续复制。');
      await delay(3000);
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
