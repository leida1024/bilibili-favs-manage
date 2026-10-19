import { PageDetector } from '../core/PageDetector.js';
import { element, button } from './elements.js';
import { eligibility } from '../core/BatchOperations.js';
import { folderRow } from './folderRow.js';
import { SelectionToolbar } from './SelectionToolbar.js';
import { duplicateFavoriteNames, normalizeFavoriteName } from '../utils/favoriteNames.js';

const statuses = { confirmed: '已确认', failed: '失败', unknown: '结果未知', not_started: '未提交' };
const descriptions = {
  delete: { verb: '删除', title: '删除自己创建的收藏夹',
    detail: '删除此收藏夹及其中的收藏关系，无法在此撤销。',
    agreement: '我已检查以上目标，理解删除会移除整个收藏夹及其中收藏关系，且这里无法撤销。' },
  unsubscribe: { verb: '退订', title: '取消我的收藏夹订阅',
    detail: '取消当前账号对此收藏夹或合集的订阅。',
    agreement: '我已检查以上类型、ID 和所有者，确认取消当前账号对这些目标的订阅。' }
};

export class MutationPanel {
  constructor(inventoryUI, engine) {
    this.inventoryUI = inventoryUI; this.panel = inventoryUI.panel; this.engine = engine; this.rows = []; this.action = 'delete';
    this.root = element('section', 'bf-mutations');
    this.heading = element('h2', 'bf-sr-only', descriptions.delete.title);
    this.explanation = element('p', 'bf-muted', descriptions.delete.detail);
    this.root.append(this.heading, this.explanation);
    this.list = element('div', 'bf-folder-list');
    this.previewButton = button('预览删除目标', () => this.preview());
    this.review = element('section', 'bf-mutation-review');
    this.results = element('div'); this.results.setAttribute('role', 'status');
    this.selectionTools = new SelectionToolbar({
      rows: () => this.rows.map(row => ({ ...row, name: row.folder.name, eligible: !row.reason })),
      busy: () => this.panel.busy,
      change: () => { this.invalidate(); this.inventoryUI.updateBusy(); }
    });
    this.root.append(this.selectionTools.root, this.list, this.previewButton, this.review, this.results);
    this.updateBusy();
  }

  invalidate() {
    this.engine.invalidate(); this.ticket = null; this.review.replaceChildren();
    this.agreement = null; this.confirmButton = null; this.updateBusy();
  }

  setCatalog(folders, kind) {
    this.invalidate(); this.rows = []; this.list.replaceChildren();
    if (kind) this.action = kind === 'subscribed' ? 'unsubscribe' : 'delete';
    const description = descriptions[this.action];
    this.heading.textContent = description.title; this.explanation.textContent = description.detail;
    this.previewButton.textContent = `预览${description.verb}目标`;
    const { actor, pageOwner } = this.engine.context();
    if (!folders.length) this.list.append(element('p', 'bf-empty', '加载列表后，在这里选择要管理的收藏夹。默认不会勾选任何项目。'));
    const duplicates = duplicateFavoriteNames(folders.map(folder => folder.name));
    for (const folder of folders) {
      const reason = eligibility(this.action, folder, actor, pageOwner);
      const input = element('input'); input.type = 'checkbox';
      input.addEventListener('change', () => { this.invalidate(); this.inventoryUI.updateBusy(); });
      const node = folderRow(folder, input, reason, duplicates.has(normalizeFavoriteName(folder.name)));
      this.list.append(node); this.rows.push({ folder, input, reason, node });
    }
    this.updateBusy();
  }

  selected() { return this.rows.filter(row => row.input.checked && !row.reason).map(row => row.folder); }

  updateBusy() {
    const busy = this.panel.busy;
    this.selectionTools?.update();
    this.previewButton.disabled = busy || !this.selected().length;
    this.previewButton.hidden = this.inventoryUI.mode !== 'manage' || busy || this.review.childElementCount > 0;
    for (const row of this.rows) row.input.disabled = busy || !!row.reason;
    if (this.confirmButton) this.confirmButton.disabled = busy || !this.agreement?.checked || !this.ticket;
    if (this.agreement) this.agreement.disabled = busy;
  }

  preview() {
    if (this.panel.busy) return;
    this.invalidate();
    this.results.replaceChildren();
    try {
      if (this.action === 'unsubscribe' && this.panel.manager.modes?.manage === 'web' && !PageDetector.isOwnPage())
        throw new Error('网页退订请先打开我的收藏夹页面，再加载“我的订阅”；也可在设置中明确选择 API。');
      const description = descriptions[this.action];
      this.ticket = this.engine.prepare(this.action, this.selected());
      const mode = this.panel.manager.modes?.manage;
      this.review.append(element('h3', '', `将${description.verb} ${this.ticket.targets.length} 项${mode ? `（${mode === 'api' ? 'API' : '网页'}）` : ''}`));
      this.review.append(element('p', '', description.detail));
      for (const target of this.ticket.targets) this.review.append(element('p', '', `${target.name} · ${target.kind === 'season' ? '合集' : '收藏夹'} · ID ${target.id} · 所有者 ${target.ownerId || '未知'} · ${target.count ?? '未知'} 条${target.available === false ? ' · 内容已失效' : ''}`));
      if (mode === 'web') this.review.append(element('p', 'bf-muted', '将自动展开并加载网页列表，核对每项 ID 后操作；失效条目也会尝试核对。'));
      this.agreement = element('input'); this.agreement.type = 'checkbox';
      const label = element('label', 'bf-folder-row'); label.append(this.agreement, element('span', '', description.agreement));
      this.agreement.addEventListener('change', () => this.updateBusy());
      this.confirmButton = button(`确认${description.verb}以上目标`, () => this.execute());
      this.confirmButton.classList.add('bf-danger');
      const actions = element('div', 'bf-tools'); actions.append(this.confirmButton, button('放弃本次操作', () => { this.invalidate(); this.previewButton.focus(); }));
      this.review.append(label, actions);
      this.review.scrollIntoView?.({ block: 'nearest', behavior: 'instant' });
      this.updateBusy(); this.agreement.focus();
    } catch (err) { this.results.textContent = err.message; }
  }

  execute() {
    if (this.panel.busy || !this.ticket || !this.agreement?.checked) return;
    const ticket = this.ticket; this.ticket = null; this.review.replaceChildren();
    return this.inventoryUI.run(`${descriptions[ticket.action].verb}收藏夹`, async signal => {
      const report = await this.engine.execute(ticket, { confirmed: true, signal, onResult: result => {
        if (result.status === 'confirmed') this.inventoryUI.operation.confirm(`ID ${result.id}：平台已确认`);
        this.panel.appendLog(`${descriptions[ticket.action].verb} [${result.name}] · ID ${result.id} · ${statuses[result.status]}：${result.detail}`,
          result.status === 'confirmed' ? this.panel.normalCode : result.status === 'failed' ? this.panel.errorCode : this.panel.warnCode);
      } });
      this.inventoryUI.resetCatalog('本次操作后列表需要更新，请重新加载。');
      this.results.replaceChildren(element('p', '', report.complete ? '本次目标均已确认。请刷新平台列表核对。' : report.cancelled ? '已取消后续操作。请核对已提交项目。' : '已停止；请检查下列结果后再决定后续操作。'));
      for (const result of report.results) this.results.append(element('p', '', `${result.name} · ID ${result.id} · ${statuses[result.status]}：${result.detail}`));
      this.results.append(button('检查并导出操作结果', () => this.panel.reviewExport(JSON.stringify(report, null, 2), 'bili-operation.json')));
      const stopped = report.results.find(result => ['failed', 'unknown'].includes(result.status));
      this.inventoryUI.operation.finish(report.complete ? 'completed' : report.cancelled ? 'interrupted' : report.results.some(result => result.status === 'unknown') ? 'unknown' : 'failed',
        report.complete ? '已完成；再次操作请重新加载、选择并确认。' :
          `${stopped ? `${stopped.name}：${stopped.detail}` : '已取消后续操作。'} 请核对结果，再重新加载和确认。`);
    }, ticket.action, ticket.targets.length);
  }

  destroy() { this.invalidate(); }
}
