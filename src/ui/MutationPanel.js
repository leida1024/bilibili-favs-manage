import { element, button } from './elements.js';
import { eligibility } from '../core/BatchOperations.js';

const statuses = { confirmed: '已确认', failed: '失败', unknown: '结果未知', not_started: '未提交' };

export class MutationPanel {
  constructor(inventoryUI, engine) {
    this.inventoryUI = inventoryUI; this.panel = inventoryUI.panel; this.engine = engine; this.rows = [];
    this.root = element('section', 'bf-diagnostics bf-mutations');
    this.root.append(element('h3', '', '删除自己创建的收藏夹'));
    this.root.append(element('p', 'bf-muted', '与统计分开勾选。默认/特殊收藏夹不可选。删除会移除收藏夹及其中的收藏关系，请自行备份；这里不提供撤销。不会删除原作者上传的视频。'));
    this.list = element('div', 'bf-selection');
    this.previewButton = button('预览删除目标', () => this.preview());
    this.review = element('section');
    this.results = element('div'); this.results.setAttribute('role', 'status');
    this.root.append(this.list, this.previewButton, this.review, this.results);
    this.updateBusy();
  }

  invalidate() { this.engine.invalidate(); this.ticket = null; this.review.replaceChildren(); }

  setCatalog(folders) {
    this.invalidate(); this.rows = []; this.list.replaceChildren();
    const { actor, pageOwner } = this.engine.context();
    for (const folder of folders) {
      const reason = eligibility('delete', folder, actor, pageOwner);
      const input = element('input'); input.type = 'checkbox';
      const label = element('label', 'bf-folder-row');
      label.append(input, element('span', '', `${folder.name} · ID ${folder.id} · 所有者 ${folder.ownerId || '未知'} · ${folder.count ?? '未知'} 条${reason ? ` · 不可选：${reason}` : ''}`));
      input.addEventListener('change', () => { this.invalidate(); this.updateBusy(); });
      this.list.append(label); this.rows.push({ folder, input, reason });
    }
    this.updateBusy();
  }

  selected() { return this.rows.filter(row => row.input.checked && !row.reason).map(row => row.folder); }

  updateBusy() {
    const busy = this.panel.busy;
    this.previewButton.disabled = busy || !this.selected().length;
    for (const row of this.rows) row.input.disabled = busy || !!row.reason;
    if (this.confirmButton) this.confirmButton.disabled = busy || !this.agreement?.checked || !this.ticket;
    if (this.agreement) this.agreement.disabled = busy;
  }

  preview() {
    if (this.panel.busy) return;
    this.invalidate();
    try {
      this.ticket = this.engine.prepare('delete', this.selected());
      this.review.append(element('h3', '', `将删除 ${this.ticket.targets.length} 个收藏夹`));
      for (const target of this.ticket.targets) this.review.append(element('p', '', `${target.name} · ID ${target.id} · 所有者 ${target.ownerId} · ${target.count ?? '未知'} 条`));
      this.agreement = element('input'); this.agreement.type = 'checkbox';
      const label = element('label', 'bf-folder-row'); label.append(this.agreement, element('span', '', '我已检查以上目标，理解删除会移除整个收藏夹及其中收藏关系，且这里无法撤销。'));
      this.agreement.addEventListener('change', () => this.updateBusy());
      this.confirmButton = button('确认删除以上目标', () => this.execute());
      this.review.append(label, this.confirmButton, button('放弃本次操作', () => this.invalidate()));
      this.updateBusy(); this.agreement.focus();
    } catch (err) { this.results.textContent = err.message; }
  }

  execute() {
    if (this.panel.busy || !this.ticket || !this.agreement?.checked) return;
    const ticket = this.ticket; this.ticket = null; this.review.replaceChildren();
    return this.inventoryUI.run('删除收藏夹', async signal => {
      const report = await this.engine.execute(ticket, { confirmed: true, signal, onResult: result => {
        if (result.status === 'confirmed') this.panel.operation.confirm(`ID ${result.id}：平台已确认`);
      } });
      this.results.replaceChildren(element('p', '', report.complete ? '本次目标均已确认。请刷新平台列表核对。' : report.cancelled ? '已取消后续操作。请核对已提交项目。' : '已停止；请检查下列结果后再决定后续操作。'));
      for (const result of report.results) this.results.append(element('p', '', `${result.name} · ID ${result.id} · ${statuses[result.status]}：${result.detail}`));
      this.results.append(button('检查并导出操作结果', () => this.panel.reviewExport(JSON.stringify(report, null, 2), 'bili-operation.json')));
      this.panel.operation.finish(report.complete ? 'completed' : report.cancelled ? 'interrupted' : 'failed', '本次确认已用完；再次操作须重新加载列表、选择并确认。未知结果请先在平台核对，勿直接重试。');
      this.setCatalog([]); this.inventoryUI.folders = []; this.inventoryUI.rows = []; this.inventoryUI.list.replaceChildren();
    });
  }

  destroy() { this.invalidate(); }
}
