import { CheckboxItem } from './UIComponents.js';
import { EventHandlers } from './EventHandlers.js';
import { copyBlockReason, currentCopyContext } from '../core/copyContext.js';
import { PageDetector } from '../core/PageDetector.js';
import { OperationState } from '../core/OperationState.js';
import { LogStore } from '../utils/logStore.js';
import { normalizeCopyTasks, duplicateFavoriteNames, normalizeFavoriteName } from '../utils/favoriteNames.js';
import { panelStyles } from './panelStyles.js';
import { element, button } from './elements.js';
import { InventoryPanel } from './InventoryPanel.js';
import { SelectionToolbar } from './SelectionToolbar.js';
import { CONFIG } from '../config/config.js';
import { panelPreferences } from '../utils/preferences.js';
import { PanelLayout } from './PanelLayout.js';
import { helpPanel } from './HelpPanel.js';
export { element, button } from './elements.js';

const statusNames = { idle: '准备就绪', running: '进行中', completed: '已完成', failed: '已停止', interrupted: '已中断', unknown: '待核对', waiting: '等待跳转' };
const logLevels = { info: '信息', warn: '警告', error: '错误', debug: '调试' };

export class FloatingPanel {
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
    this.pauseNoticeButton = button('暂停', () => {
      const paused = this.notice.dataset.paused !== 'true';
      this.notice.dataset.paused = String(paused);
      this.pauseNoticeButton.textContent = paused ? '播放' : '暂停';
      this.pauseNoticeButton.setAttribute('aria-label', paused ? '播放滚动提示' : '暂停滚动提示');
      this.pauseNoticeButton.setAttribute('aria-pressed', String(paused));
    });
    this.pauseNoticeButton.setAttribute('aria-label', '暂停滚动提示');
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
