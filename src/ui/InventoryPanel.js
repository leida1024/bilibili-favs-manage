import { element, button } from './elements.js';
import { PageDetector } from '../core/PageDetector.js';
import { MutationPanel } from './MutationPanel.js';

export class InventoryPanel {
  constructor(panel, service) {
    this.panel = panel; this.service = service; this.folders = []; this.rows = [];
    this.root = element('details', 'bf-diagnostics bf-inventory');
    this.root.append(element('summary', '', '只读统计与收藏夹管理'));
    this.root.append(element('p', 'bf-muted', '主动加载列表后选择收藏夹。仅扫描所选内容，每次请求间隔 400ms；每夹最多 100 页，总计最多 10000 条。扫描期间列表可能变化。合集暂不支持。'));
    this.kind = element('select'); this.kind.setAttribute('aria-label', '加载范围');
    for (const [value, label] of [['created', '当前空间创建的收藏夹'], ['subscribed', '我的收藏夹订阅']]) {
      const option = element('option', '', label); option.value = value; this.kind.append(option);
    }
    this.loadButton = button('加载列表（只读）', () => this.load());
    this.scanButton = button('统计选中收藏夹', () => this.scan());
    this.cancelButton = button('取消后续请求', () => this.controller?.abort());
    this.exportButton = button('检查并导出统计', () => { if (this.report) panel.reviewExport(JSON.stringify(this.report, null, 2), 'bili-inventory.json'); });
    const tools = element('div', 'bf-tools'); tools.append(this.kind, this.loadButton, this.scanButton, this.cancelButton, this.exportButton);
    this.list = element('div', 'bf-selection');
    this.result = element('div'); this.result.setAttribute('role', 'status');
    this.root.append(tools, this.list, this.result);
    if (panel.manager.batchOperations) {
      this.mutations = new MutationPanel(this, panel.manager.batchOperations);
      this.root.append(this.mutations.root);
    }
    this.kind.addEventListener('change', () => {
      this.folders = []; this.rows = []; this.list.replaceChildren(); this.mutations?.setCatalog([], this.kind.value); this.updateBusy();
    });
    this.updateBusy();
  }

  updateBusy() {
    const busy = this.panel.busy;
    this.kind.disabled = busy; this.loadButton.disabled = busy;
    this.scanButton.disabled = busy || !this.selected().length;
    this.cancelButton.disabled = !busy || !this.controller || this.controller.signal.aborted;
    this.exportButton.disabled = busy || !this.report;
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
      this.result.textContent = this.panel.operation.state.detail;
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
        const label = element('label', 'bf-folder-row');
        const input = element('input'); input.type = 'checkbox'; input.disabled = folder.kind === 'unsupported';
        input.addEventListener('change', () => this.updateBusy());
        label.append(input, element('span', '', `${folder.name} · ID ${folder.id} · 所有者 ${folder.ownerId || '未知'} · ${folder.count ?? '未知'} 条${folder.protected ? ' · 受保护' : ''}${folder.kind === 'unsupported' ? ' · 类型暂不支持' : ''}`));
        this.list.append(label); this.rows.push({ input, folder });
      }
      this.result.textContent = `列表读取完成：${folders.length} 项；尚未选择或扫描。`;
      this.panel.operation.finish('completed', this.result.textContent);
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
