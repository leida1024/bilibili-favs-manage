import { element, button } from './elements.js';
import { PageDetector } from '../core/PageDetector.js';
import { MutationPanel } from './MutationPanel.js';
import { folderRow } from './folderRow.js';

export class InventoryPanel {
  constructor(panel, service) {
    this.panel = panel; this.service = service; this.folders = []; this.rows = [];
    this.mode = 'statistics';
    this.root = element('section', 'bf-inventory');
    this.heading = element('h2', '', '查看收藏夹统计');
    this.intro = element('p', 'bf-intro', '加载列表并勾选收藏夹，查看视频数量、重复项和时长。不会修改收藏。');
    const help = element('p', 'bf-help', '只统计选中范围；缺失信息保留为未知，合集暂不支持。请求间隔 400ms，每夹最多 100 页，总计最多 10000 条；取消或失败会保留部分结果。');
    this.root.append(this.heading, this.intro, help); this.help = help;
    this.kind = element('select'); this.kind.setAttribute('aria-label', '加载范围');
    for (const [value, label] of [['created', '当前空间创建的收藏夹'], ['subscribed', '我的收藏夹订阅']]) {
      const option = element('option', '', label); option.value = value; this.kind.append(option);
    }
    this.loadButton = button('加载列表（只读）', () => this.load());
    this.scanButton = button('统计选中收藏夹', () => this.scan());
    this.cancelButton = button('停止后续操作', () => { this.controller?.abort(); this.updateBusy(); });
    this.exportButton = button('检查并导出统计', () => { if (this.report) panel.reviewExport(JSON.stringify(this.report, null, 2), 'bili-inventory.json'); });
    const tools = element('div', 'bf-tools'); tools.append(this.kind, this.loadButton);
    this.selectionCount = element('p', 'bf-selection-count', '尚未选择收藏夹');
    this.actions = element('div', 'bf-action-bar');
    this.actions.append(this.selectionCount, this.exportButton, this.scanButton, this.cancelButton);
    this.scanButton.classList.add('bf-primary');
    this.list = element('div', 'bf-folder-list');
    this.list.append(element('p', 'bf-empty', '点击“加载列表”，读取当前选择的范围。不会自动扫描。'));
    this.result = element('div', 'bf-inventory-result'); this.result.setAttribute('role', 'status');
    this.root.append(tools, this.list, this.result);
    if (panel.manager.batchOperations) {
      this.mutations = new MutationPanel(this, panel.manager.batchOperations);
      this.root.append(this.mutations.root);
      this.actions.insertBefore(this.mutations.previewButton, this.cancelButton);
    }
    this.kind.addEventListener('change', () => {
      this.folders = []; this.rows = []; this.report = null; this.result.replaceChildren();
      this.list.replaceChildren(element('p', 'bf-empty', '范围已更换，请重新加载列表。'));
      this.mutations?.setCatalog([], this.kind.value); this.mutations?.results.replaceChildren(); this.updateBusy();
      this.panel.operation.update({ status: 'idle', action: '', confirmed: 0, total: null, lastConfirmed: '', detail: '' });
    });
    this.updateBusy();
  }

  setMode(mode) {
    if (this.mode !== mode) {
      this.mutations?.invalidate();
      for (const row of this.rows) row.input.checked = false;
      for (const row of this.mutations?.rows || []) row.input.checked = false;
    }
    this.mode = mode;
    const manage = mode === 'manage';
    this.heading.textContent = manage ? '管理我的收藏夹' : '查看收藏夹统计';
    this.intro.textContent = manage ? '先加载列表，再选择要删除的收藏夹或要取消的订阅。执行前会逐项确认。' : '加载列表并勾选收藏夹，查看视频数量、重复项和时长。不会修改收藏。';
    this.help.hidden = manage;
    this.list.hidden = manage; this.result.hidden = manage;
    if (this.mutations) this.mutations.root.hidden = !manage;
    this.updateBusy();
  }

  updateBusy() {
    const busy = this.panel.busy;
    this.kind.disabled = busy; this.loadButton.disabled = busy;
    this.scanButton.disabled = busy || !this.selected().length;
    this.cancelButton.disabled = !busy || !this.controller || this.controller.signal.aborted;
    this.exportButton.disabled = busy || !this.report;
    const manage = this.mode === 'manage';
    this.scanButton.hidden = manage || busy;
    this.exportButton.hidden = manage || !this.report || busy;
    this.cancelButton.hidden = !this.controller;
    if (this.mutations) this.mutations.previewButton.hidden = !manage || busy;
    const selected = manage ? this.mutations?.selected().length || 0 : this.selected().length;
    this.selectionCount.textContent = busy ? '操作中，请保持页面打开' : `已选 ${selected} 个收藏夹`;
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
      this.folders = []; this.rows = []; this.list.replaceChildren(); this.report = null; this.result.textContent = '';
      this.mutations?.setCatalog([], this.kind.value);
      const kind = this.kind.value;
      const owner = kind === 'created' ? PageDetector.getCurrentPageUID() : PageDetector.getLoginUserUID();
      const folders = await this.service.client.folders(owner, kind, signal);
      if (signal.aborted) return;
      this.folders = folders; this.catalogOwner = owner; this.catalogKind = kind;
      this.mutations?.setCatalog(folders, kind);
      for (const folder of folders) {
        const input = element('input'); input.type = 'checkbox'; input.disabled = folder.kind === 'unsupported';
        input.addEventListener('change', () => this.updateBusy());
        this.list.append(folderRow(folder, input, folder.kind === 'unsupported' ? '合集暂不支持' : '')); this.rows.push({ input, folder });
      }
      if (!folders.length) this.list.append(element('p', 'bf-empty', '这个范围没有可读取的收藏夹。可以更换范围后重新加载。'));
      this.panel.operation.finish('completed', `列表读取完成：${folders.length} 项；尚未选择或扫描。`);
    });
  }

  scan() {
    const folders = this.selected();
    return this.run('只读统计', async signal => {
      this.report = null;
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
