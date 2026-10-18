import { CheckboxItem } from './UIComponents.js';
import { EventHandlers } from './EventHandlers.js';
import { PageDetector } from '../core/PageDetector.js';
import { OperationState } from '../core/OperationState.js';
import { LogStore } from '../utils/logStore.js';
import { normalizeCopyTasks } from '../utils/favoriteNames.js';
import { panelStyles } from './panelStyles.js';
import { element, button } from './elements.js';
import { InventoryPanel } from './InventoryPanel.js';
export { element, button } from './elements.js';

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
    this.activeView = 'copy';
    this.previousView = 'copy';
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
    this.logsButton = button('记录', () => this.showView(this.activeView === 'logs' ? this.previousView : 'logs'), 'bf-quiet');
    this.logsButton.setAttribute('aria-label', '查看操作记录');
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
    this.workspace.append(element('h2', '', '复制到我的收藏夹'), element('p', 'bf-intro', '勾选来源，在同一行填写目标名称。复制后，来源内容仍会保留。'), this.scope);
    const help = element('details', 'bf-help');
    help.append(element('summary', '', '目标同名或不存在时会怎样？'), element('p', '', '在我的空间中，已有同名收藏夹会直接复用，不存在的会新建。名称首尾空白会去掉，内部空格保留。从他人空间复制时，需要跳转到我的空间准备目标，再返回继续；请保持页面打开。'));
    this.workspace.append(help);
    this.leftPanel = element('section', 'bf-sources');
    this.selectAllButton = button('全选', () => this.toggleSelectAll());
    const columns = element('div', 'bf-copy-columns');
    this.sourceColumn = element('span', '', '来源收藏夹');
    columns.append(this.selectAllButton, this.sourceColumn, element('span', 'bf-direction', ''), element('span', '', '目标收藏夹（我的）'));
    this.leftPanel.append(columns, this.createFavPanel());
    this.selectionReview = element('p', 'bf-selection-count');
    this.startBatchTransferButton = button('开始批量复制', () => this.startBatchTransfer(), 'bf-primary');
    this.copyActions = element('div', 'bf-action-bar');
    this.copyActions.append(this.selectionReview, this.startBatchTransferButton);
    this.workspace.append(this.leftPanel);
    this.content.append(this.workspace);
    this.statusBox = element('section', 'bf-status');
    this.statusBox.setAttribute('role', 'status');
    this.statusBox.setAttribute('aria-live', 'polite');
    if (this.manager.inventory) {
      this.inventoryPanel = new InventoryPanel(this, this.manager.inventory);
      this.content.append(this.inventoryPanel.root);
    }
    this.createDiagnostics();
    this.footer = element('footer', 'bf-footer');
    this.footer.append(this.statusBox, this.copyActions);
    if (this.inventoryPanel) this.footer.append(this.inventoryPanel.actions);
    root.append(style, this.header, this.navigation, this.content, this.footer);
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
    this.showView('copy');
  }

  showView(view) {
    if (!['copy', 'statistics', 'manage', 'logs'].includes(view) || (this.busy && view !== 'logs' && view !== this.previousView && view !== this.activeView)) return;
    if ((view === 'statistics' || view === 'manage') && !this.inventoryPanel) return;
    if (view === 'logs') { if (this.activeView !== 'logs') this.previousView = this.activeView; }
    else {
      if (view !== this.previousView || this.activeView !== 'logs') this.inventoryPanel?.mutations?.invalidate();
      this.previousView = view;
    }
    this.activeView = view;
    this.workspace.hidden = view !== 'copy';
    if (this.inventoryPanel) {
      this.inventoryPanel.root.hidden = !['statistics', 'manage'].includes(view);
      if (view === 'statistics' || view === 'manage') this.inventoryPanel.setMode(view);
      this.inventoryPanel.actions.hidden = !['statistics', 'manage'].includes(view);
    }
    this.diagnostics.hidden = view !== 'logs';
    this.copyActions.hidden = view !== 'copy';
    this.content.classList.toggle('bf-show-logs', view === 'logs');
    this.content.scrollTop = 0;
    for (const [name, control] of this.viewButtons) control.setAttribute('aria-pressed', String(name === (view === 'logs' ? this.previousView : view)));
    this.logsButton.textContent = view === 'logs' ? '返回' : '记录';
    this.logsButton.setAttribute('aria-label', view === 'logs' ? '返回当前功能' : '查看操作记录');
    if (view === 'logs') this.renderLogs();
  }

  showPageTypeIndicator() {
    const pageUID = PageDetector.getCurrentPageUID();
    const loginUID = PageDetector.getLoginUserUID();
    this.scope.textContent = !pageUID ? '虚构数据预览，不连接真实账号。' :
      `来源：${pageUID === loginUID ? '我的空间' : '当前浏览的空间'}已加载的创建收藏夹。目标：${loginUID ? '我的空间' : '登录后可复制到我的空间'}。`;
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
    const checked = !this.favCheckboxItemList.every(item => item.checkbox.checked);
    this.favCheckboxItemList.forEach(item => { item.checkbox.checked = checked; });
    this.updateSelectionReview();
  }

  getSelectedTasks() {
    return this.favCheckboxItemList.filter(item => item.checkbox.checked).map(item => ({ source: item.getLabelValue(), target: item.inputText.value }));
  }

  updateSelectionReview() {
    const tasks = this.getSelectedTasks();
    const missing = tasks.some(task => !task.target.trim());
    this.selectionReview.textContent = missing ? '请填好已选来源的目标名称' : `已选 ${tasks.length} / ${this.favorites.length} 个收藏夹`;
    for (const item of this.favCheckboxItemList) {
      item.checkboxContainer.dataset.selected = String(item.checkbox.checked);
      item.inputText.setAttribute('aria-invalid', String(item.checkbox.checked && !item.inputText.value.trim()));
    }
    this.selectAllButton.textContent = tasks.length && tasks.length === this.favorites.length ? '清除' : '全选';
    this.selectAllButton.setAttribute('aria-label', tasks.length && tasks.length === this.favorites.length ? '取消全选来源' : '全选来源收藏夹');
    this.startBatchTransferButton.textContent = this.busy ? '操作中…' : tasks.length ? `复制 ${tasks.length} 个收藏夹` : '开始复制';
    this.startBatchTransferButton.disabled = this.busy || !tasks.length || missing;
  }

  setBusy(busy) {
    this.busy = busy;
    this.floatingPanel?.setAttribute('aria-busy', String(busy));
    this.selectAllButton.disabled = busy;
    this.dismissButton.disabled = busy;
    for (const control of this.viewButtons.values()) control.disabled = busy;
    for (const item of this.favCheckboxItemList) { item.checkbox.disabled = busy; item.inputText.disabled = busy; }
    this.startBatchTransferButton.textContent = busy ? '操作中…' : '开始批量复制';
    this.updateSelectionReview();
    this.inventoryPanel?.updateBusy();
    this.onBusyChange?.(busy);
  }

  renderOperation(state) {
    this.statusBox.hidden = state.status === 'idle';
    this.statusBox.dataset.status = state.status;
    const details = element('details', 'bf-progress-detail');
    details.append(element('summary', '', '查看进度详情'), element('p', '', `最后确认：${state.lastConfirmed || '尚无已确认步骤'}`), element('p', '', state.detail));
    this.statusBox.replaceChildren(element('strong', '', `${statusNames[state.status]}${state.action ? `：${state.action}` : ''}`),
      element('span', '', `已确认 ${state.confirmed}${state.total === null ? ' 项，总数未知' : ` / ${state.total} 项`}`));
    if (state.status === 'failed' || state.status === 'interrupted') this.statusBox.append(element('p', 'bf-status-message', state.detail));
    this.statusBox.append(details);
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
    details.append(element('h2', '', '操作记录'));
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
    section.setAttribute('role', 'dialog'); section.setAttribute('aria-label', '导出前检查'); section.setAttribute('aria-modal', 'true');
    section.append(element('h3', '', '导出前检查'), element('p', '', '仅下载到本机，不会上传。内容可能含收藏夹名称、ID 和作者信息；分享前请自行删去。'));
    const area = element('textarea'); area.value = text; area.setAttribute('aria-label', '可编辑的导出内容');
    const previousFocus = document.activeElement;
    const close = () => {
      section.remove(); this.exportReview = null;
      this.content.inert = false; this.navigation.inert = false; this.footer.inert = false; this.header.inert = false;
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
    this.content.inert = true; this.navigation.inert = true; this.footer.inert = true; this.header.inert = true;
    area.focus();
  }

  toggleMinimize() {
    this.minimized = !this.minimized;
    this.content.hidden = this.minimized;
    this.navigation.hidden = this.minimized; this.footer.hidden = this.minimized;
    this.minimizeButton.textContent = this.minimized ? '恢复面板' : '最小化';
    this.minimizeButton.setAttribute('aria-expanded', String(!this.minimized));
    if (this.minimized) { this.hiddenHeight = this.floatingPanel.style.height; this.floatingPanel.style.height = '64px'; }
    else { this.floatingPanel.style.height = this.hiddenHeight || '640px'; this.clampToViewport(); }
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
