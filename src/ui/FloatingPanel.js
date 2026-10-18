/**
 * 浮动面板
 * 管理浮动面板的生命周期和交互
 */

import { UIComponents, CheckboxItem } from './UIComponents.js';
import { EventHandlers } from './EventHandlers.js';
import { PageDetector } from '../core/PageDetector.js';

export class FloatingPanel {
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
