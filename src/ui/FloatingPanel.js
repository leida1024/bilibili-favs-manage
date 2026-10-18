import { CheckboxItem } from './UIComponents.js';
import { EventHandlers } from './EventHandlers.js';
import { PageDetector } from '../core/PageDetector.js';
import { OperationState } from '../core/OperationState.js';
import { LogStore } from '../utils/logStore.js';
import { normalizeCopyTasks } from '../utils/favoriteNames.js';
import { panelStyles } from './panelStyles.js';

export function element(tag, className = '', text = '') {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

export function button(text, action, className = '') {
  const node = element('button', className, text);
  node.type = 'button';
  node.addEventListener('click', action);
  return node;
}

const statusNames = { idle: '准备就绪', running: '进行中', completed: '已完成', failed: '已停止 · 请检查', interrupted: '已中断 / 等待继续' };

export class FloatingPanel {
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
    this.minimizeButton = button('最小化', () => this.toggleMinimize());
    this.dismissButton = button('关闭', () => { this.onDismiss?.(); this.destroy(); });
    this.header.append(this.minimizeButton, this.dismissButton);
    this.content = element('div', 'bf-content');
    this.scope = element('p', 'bf-muted');
    this.content.append(this.scope);
    this.workspace = element('div', 'bf-workspace');
    this.leftPanel = element('section', 'bf-sources');
    this.leftPanel.append(element('h3', '', '1. 选择来源与目标'));
    this.leftPanel.append(element('p', 'bf-muted', '复制会保留源收藏；同名目标会复用，缺少的目标会新建。跨页复制可能需要自动跳转。'));
    this.selectAllButton = button('全选来源', () => this.toggleSelectAll());
    this.leftPanel.append(this.selectAllButton, this.createFavPanel());
    this.rightPanel = element('section', 'bf-review');
    this.rightPanel.append(element('h3', '', '2. 检查复制任务'));
    this.selectionReview = element('div', 'bf-selection');
    this.rightPanel.append(this.selectionReview);
    this.startBatchTransferButton = button('开始批量复制', () => this.startBatchTransfer(), 'bf-primary');
    this.rightPanel.append(this.startBatchTransferButton);
    this.workspace.append(this.leftPanel, this.rightPanel);
    this.content.append(this.workspace);
    this.statusBox = element('section', 'bf-status');
    this.statusBox.setAttribute('role', 'status');
    this.statusBox.setAttribute('aria-live', 'polite');
    this.content.append(this.statusBox);
    this.createDiagnostics();
    root.append(style, this.header, this.content);
    document.body.append(root);
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
    this.appendLog('面板已就绪。诊断记录仅保存在当前页面，最多 500 条。');
  }

  showPageTypeIndicator() {
    const pageUID = PageDetector.getCurrentPageUID();
    const loginUID = PageDetector.getLoginUserUID();
    this.scope.textContent = !pageUID ? '虚构数据预览 · 不连接真实账号' :
      `当前空间：${!loginUID ? '身份未确认' : pageUID === loginUID ? '我的空间' : '他人空间'} · 来源为页面已加载的创建收藏夹，未包含订阅。`;
  }

  createFavPanel() {
    const list = element('div', 'fav-panel');
    this.favCheckboxItemList = this.favorites.map(name => {
      const item = new CheckboxItem(name);
      item.checkboxContainer.addEventListener('input', () => this.updateSelectionReview());
      list.append(item.checkboxContainer);
      return item;
    });
    if (!this.favorites.length) list.append(element('p', 'bf-muted', '尚未发现来源。请等待侧栏加载，或切换到支持的收藏夹页。'));
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
    const checked = !this.favCheckboxItemList.every(item => item.checkbox.checked);
    this.favCheckboxItemList.forEach(item => { item.checkbox.checked = checked; });
    this.updateSelectionReview();
  }

  getSelectedTasks() {
    return this.favCheckboxItemList.filter(item => item.checkbox.checked).map(item => ({ source: item.getLabelValue(), target: item.inputText.value }));
  }

  updateSelectionReview() {
    const tasks = this.getSelectedTasks();
    this.selectionReview.replaceChildren(element('p', '', `已选择 ${tasks.length} 个来源`));
    for (const task of tasks) this.selectionReview.append(element('p', '', `${task.source} → ${task.target.trim() || '（请填写目标名称）'}`));
    this.selectAllButton.textContent = tasks.length && tasks.length === this.favorites.length ? '取消全选' : '全选来源';
    this.startBatchTransferButton.disabled = this.busy || !tasks.length;
  }

  setBusy(busy) {
    this.busy = busy;
    this.floatingPanel?.setAttribute('aria-busy', String(busy));
    this.selectAllButton.disabled = busy;
    this.dismissButton.disabled = busy;
    for (const item of this.favCheckboxItemList) { item.checkbox.disabled = busy; item.inputText.disabled = busy; }
    this.startBatchTransferButton.textContent = busy ? '操作中…' : '开始批量复制';
    this.updateSelectionReview();
    this.onBusyChange?.(busy);
  }

  renderOperation(state) {
    this.statusBox.dataset.status = state.status;
    this.statusBox.replaceChildren(element('strong', '', `${statusNames[state.status]}${state.action ? ` · ${state.action}` : ''}`),
      element('p', '', `已确认 ${state.confirmed}${state.total === null ? ' 项（总数未知）' : ` / ${state.total} 项`}`),
      element('p', '', `最后确认：${state.lastConfirmed || '尚无已确认步骤'}`), element('p', '', state.detail));
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
    const details = element('details', 'bf-diagnostics');
    details.append(element('summary', '', '诊断记录'));
    const tools = element('div', 'bf-tools');
    this.logFilter = element('select');
    this.logFilter.setAttribute('aria-label', '日志级别');
    for (const [value, text] of [['all', '全部级别'], ['error', '错误'], ['warn', '警告'], ['info', '信息'], ['debug', '调试']]) {
      const option = element('option', '', text); option.value = value; this.logFilter.append(option);
    }
    this.logFilter.addEventListener('change', () => this.renderLogs());
    this.followCheckbox = element('input'); this.followCheckbox.type = 'checkbox'; this.followCheckbox.checked = true;
    const followLabel = element('label', '', '跟随最新'); followLabel.prepend(this.followCheckbox);
    this.followCheckbox.addEventListener('change', () => { this.scrollTopEnabled = this.followCheckbox.checked; this.renderLogs(); });
    tools.append(this.logFilter, followLabel, button('清空', () => { this.logs.clear(); this.renderLogs(); }), button('检查并导出', () => this.reviewExport(this.logs.export(), 'bili-favs-log.json')));
    this.logCount = element('p', 'bf-muted');
    this.outputTextBox = element('div', 'output-text-box');
    this.outputTextBox.tabIndex = 0;
    this.outputTextBox.setAttribute('aria-label', '诊断记录内容');
    this.outputTextBox.addEventListener('scroll', () => {
      if (this.outputTextBox.scrollHeight - this.outputTextBox.clientHeight - this.outputTextBox.scrollTop > 24) {
        this.scrollTopEnabled = false; this.followCheckbox.checked = false;
      }
    });
    details.append(tools, this.logCount, this.outputTextBox);
    this.content.append(details);
  }

  appendLog(message, type = this.normalCode) {
    this.logs.add(message, type === this.errorCode ? 'error' : type === this.warnCode ? 'warn' : type === this.debugCode ? 'debug' : 'info');
    if (this.outputTextBox) this.renderLogs();
  }

  renderLogs() {
    const top = this.outputTextBox.scrollTop;
    this.outputTextBox.replaceChildren(...this.logs.filter(this.logFilter.value).map(entry => {
      const row = element('div', `bf-log-${entry.level}`, `${entry.time.slice(11, 19)} [${entry.level}] ${entry.message}`);
      return row;
    }));
    this.logCount.textContent = `保留 ${this.logs.entries.length} 条 · 已淘汰 ${this.logs.dropped} 条`;
    this.outputTextBox.scrollTop = this.scrollTopEnabled ? this.outputTextBox.scrollHeight : top;
  }

  reviewExport(text, filename) {
    this.exportReview?.remove();
    const section = element('section', 'bf-export');
    section.append(element('h3', '', '导出前检查'), element('p', '', '仅下载到本机，不会上传。内容可能含收藏夹名称、ID 和作者信息；分享前请自行删去。'));
    const area = element('textarea'); area.value = text; area.setAttribute('aria-label', '可编辑的导出内容');
    section.append(area, button('下载此内容', () => {
      const url = URL.createObjectURL(new Blob([area.value], { type: 'application/json' }));
      const link = element('a'); link.href = url; link.download = filename; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }), button('关闭预览', () => section.remove()));
    this.content.append(section); this.exportReview = section; area.focus();
  }

  toggleMinimize() {
    this.minimized = !this.minimized;
    this.content.hidden = this.minimized;
    this.minimizeButton.textContent = this.minimized ? '恢复面板' : '最小化';
    this.minimizeButton.setAttribute('aria-expanded', String(!this.minimized));
    if (this.minimized) { this.hiddenHeight = this.floatingPanel.style.height; this.floatingPanel.style.height = '64px'; }
    else { this.floatingPanel.style.height = this.hiddenHeight || '680px'; this.clampToViewport(); }
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
    if (this.operation.state.status === 'running') this.operation.finish('interrupted', '面板已离开当前页面；请检查页面结果，不要直接重复提交。');
    this.unsubscribe?.();
    document.body.removeEventListener('mousemove', this.onBodyMove);
    document.body.removeEventListener('mouseup', this.onBodyUp);
    window.removeEventListener('resize', this.onViewportResize);
    this.floatingPanel?.remove();
    this.floatingPanel = null;
  }
}
