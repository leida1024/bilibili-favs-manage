import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { FloatingPanel } from '../src/ui/FloatingPanel.js';
import { InventoryService } from '../src/core/InventoryService.js';
import { BatchOperations } from '../src/core/BatchOperations.js';
import { OperationState } from '../src/core/OperationState.js';
import { CONFIG } from '../src/config/config.js';
import { readFileSync } from 'node:fs';

function fixture(t) {
  const dom = new JSDOM('', { url: 'https://space.bilibili.com/50/favlist' });
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  document.cookie = 'DedeUserID=50';
  let reads = 0, mutations = 0;
  const client = { folders: async () => { reads++; return [{ id: '100', ownerId: '50', kind: 'created', protected: false, available: true, name: 'Fictional folder', count: 2 }]; },
    mutate: async () => { mutations++; return { status: 'confirmed' }; } };
  const manager = { inventory: new InventoryService(client, 0), batchOperations: new BatchOperations(client, () => ({ actor: '50', pageOwner: '50' }), 0), operation: new OperationState(),
    getAllFavoriteNames: () => Array.from({ length: 40 }, (_, i) => `Fictional source ${i}`), batchCopy: async () => {} };
  const panel = new FloatingPanel(manager); panel.init();
  t.after(() => { panel.destroy(); dom.window.close(); });
  return { panel, counts: () => ({ reads, mutations }) };
}

test('copy is the uncluttered default; one source/destination pair, no duplicate review, persistent action', t => {
  const { panel, counts } = fixture(t);
  assert.equal(panel.activeView, 'copy'); assert.equal(panel.inventoryPanel.root.hidden, true); assert.equal(panel.diagnostics.hidden, false);
  assert.equal(panel.statusBox.hidden, true); assert.equal(panel.favCheckboxItemList.length, 40);
  const row = panel.favCheckboxItemList[0];
  assert.deepEqual([...row.checkboxContainer.firstElementChild.children].map(el => el.tagName), ['INPUT', 'LABEL', 'SPAN', 'INPUT']);
  assert.equal(row.label.htmlFor, row.checkbox.id); assert.match(row.inputText.getAttribute('aria-label'), /目标收藏夹/);
  row.checkbox.checked = true; row.inputText.value = 'Edited destination'; panel.updateSelectionReview();
  assert.equal(panel.selectionReview.textContent, '已选 1 / 40 个收藏夹');
  assert.equal(panel.footer.contains(panel.startBatchTransferButton), true);
  assert.equal(panel.content.contains(panel.startBatchTransferButton), false);
  assert.equal(panel.selectionReview.querySelectorAll('p').length, 0);
  assert.deepEqual(counts(), { reads: 0, mutations: 0 });
});

test('switching operations preserves copy edits and independent selections, invalidates confirmation and does no I/O', async t => {
  const { panel, counts } = fixture(t); const item = panel.favCheckboxItemList[0];
  item.checkbox.checked = true; item.inputText.value = 'Keep this edit'; panel.updateSelectionReview();
  panel.showView('manage'); const ui = panel.inventoryPanel; await ui.load();
  assert.equal(ui.list.hidden, true); assert.equal(ui.mutations.root.hidden, false); assert.equal(panel.workspace.hidden, true);
  const m = ui.mutations; m.rows[0].input.checked = true; ui.updateBusy(); m.preview();
  const ticket = m.ticket; assert.ok(ticket);
  panel.showView('statistics');
  assert.equal(m.ticket, null); assert.equal(m.engine.ticket, null); assert.equal(ui.mutations.root.hidden, true); assert.equal(ui.list.hidden, false);
  assert.equal(m.selected().length, 1); assert.equal(ui.selected().length, 0);
  await assert.rejects(m.engine.execute(ticket, { confirmed: true }));
  panel.showView('copy'); assert.deepEqual(panel.getSelectedTasks(), [{ source: 'Fictional source 0', target: 'Keep this edit' }]);
  panel.refreshFavorites(); assert.equal(panel.favCheckboxItemList[0].inputText.value, 'Keep this edit');
  assert.deepEqual(counts(), { reads: 1, mutations: 0 });
});

test('same-tab and diagnostics toggles retain confirmation, edits and task scroll; leaving requires a new preview', async t => {
  const { panel, counts } = fixture(t); const ui = panel.inventoryPanel;
  panel.content.scrollTop = 160;
  panel.showView('statistics'); await ui.load();
  ui.rows[0].input.checked = true; ui.updateBusy(); panel.content.scrollTop = 70;
  panel.showView('manage');
  assert.equal(ui.selected().length, 1);
  const m = ui.mutations; m.rows[0].input.checked = true; ui.updateBusy(); m.preview();
  m.agreement.checked = true; m.updateBusy();
  const ticket = m.ticket; panel.content.scrollTop = 90;
  panel.showView('manage'); assert.equal(m.ticket, ticket); assert.equal(m.confirmButton.disabled, false);
  panel.toggleLogs(); panel.toggleLogs(); assert.equal(panel.activeView, 'manage'); assert.equal(m.ticket, ticket);
  assert.equal(panel.workspace.hidden, true); assert.equal(ui.root.hidden, false);
  assert.equal(panel.content.scrollTop, 90); assert.equal(panel.logsButton.getAttribute('aria-expanded'), 'true');
  panel.followCheckbox.focus(); panel.toggleLogs(); assert.equal(document.activeElement, panel.logsButton);
  assert.equal(m.ticket, ticket); assert.equal(panel.content.scrollTop, 90);
  panel.showView('statistics'); assert.equal(m.ticket, null); assert.equal(ui.selected().length, 1);
  assert.equal(panel.content.scrollTop, 70);
  panel.showView('copy'); assert.equal(panel.content.scrollTop, 160);
  panel.showView('manage'); assert.equal(m.selected().length, 1); assert.equal(m.confirmButton, null);
  assert.equal(panel.content.scrollTop, 90); assert.deepEqual(counts(), { reads: 1, mutations: 0 });
});

test('reload clears previous results immediately; mutation completion invalidates the statistics export and selections', async t => {
  const { panel, counts } = fixture(t); const ui = panel.inventoryPanel; const m = ui.mutations;
  panel.showView('manage'); assert.match(m.list.textContent, /加载列表/);
  await ui.load(); m.results.textContent = 'Previous operation'; ui.report = { complete: true }; ui.result.textContent = 'Previous scan';
  const loading = ui.load();
  assert.equal(m.results.textContent, ''); assert.equal(ui.report, null); assert.equal(ui.result.textContent, '');
  assert.match(ui.list.textContent, /正在读取/); await loading;
  ui.report = { complete: true }; ui.result.textContent = 'Snapshot before deletion'; ui.rows[0].input.checked = true;
  m.rows[0].input.checked = true; ui.updateBusy(); m.preview(); m.agreement.checked = true;
  await m.execute();
  assert.equal(ui.report, null); assert.equal(ui.exportButton.disabled, true); assert.equal(ui.selected().length, 0);
  assert.equal(m.selected().length, 0); assert.equal(m.ticket, null); assert.equal(ui.folders.length, 0);
  assert.match(ui.list.textContent, /重新加载/); assert.match(m.results.textContent, /已确认/);
  panel.showView('statistics'); assert.equal(ui.exportButton.hidden, true);
  assert.equal(counts().mutations, 1);
});

test('diagnostics survive minimize and export modal without changing the task or unlocking the background', t => {
  const { panel } = fixture(t); panel.setBusy(true);
  panel.toggleMinimize(); assert.equal(panel.diagnostics.hidden, true);
  panel.appendLog('Arrival while minimized'); panel.toggleMinimize();
  assert.equal(panel.diagnostics.hidden, false); assert.match(panel.outputTextBox.textContent, /Arrival while minimized/);
  panel.followCheckbox.focus(); panel.reviewExport('{}', 'fictional.json');
  assert.equal(panel.diagnostics.inert, true); assert.equal(panel.header.inert, true);
  panel.exportReview.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(panel.diagnostics.inert, false); assert.equal(document.activeElement, panel.followCheckbox);
  assert.equal(panel.busy, true); assert.equal(panel.activeView, 'copy');
});

test('busy locks operation navigation but permits logs and return; empty selected target cannot submit', t => {
  const { panel } = fixture(t); const item = panel.favCheckboxItemList[0];
  item.checkbox.checked = true; item.inputText.value = ' '; panel.updateSelectionReview();
  assert.equal(panel.startBatchTransferButton.disabled, true); assert.equal(item.inputText.getAttribute('aria-invalid'), 'true');
  item.inputText.value = 'Valid'; panel.updateSelectionReview(); assert.equal(panel.startBatchTransferButton.disabled, false);
  panel.setBusy(true); panel.showView('manage'); assert.equal(panel.activeView, 'copy');
  panel.logsButton.click(); assert.equal(panel.activeView, 'copy'); assert.equal(panel.diagnostics.hidden, true);
  panel.logsButton.click(); assert.equal(panel.activeView, 'copy'); assert.equal(panel.diagnostics.hidden, false); assert.equal(panel.busy, true);
  panel.setBusy(false); panel.showView('manage'); assert.equal(panel.activeView, 'manage');
});

test('export opens focused review without growing the task list; Escape restores previous focus', t => {
  const { panel } = fixture(t); panel.logsButton.focus();
  panel.reviewExport('{"fictional":true}', 'fixture.json');
  const review = panel.exportReview;
  assert.equal(panel.content.contains(review), false); assert.equal(review.getAttribute('role'), 'dialog'); assert.equal(panel.content.inert, true);
  assert.equal(document.activeElement, review.querySelector('textarea'));
  review.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(panel.exportReview, null); assert.equal(panel.content.inert, false); assert.equal(document.activeElement, panel.logsButton);
});

test('help and progress are directly visible without disclosure; progress updates retain nodes and focus', t => {
  const { panel } = fixture(t);
  assert.equal(panel.floatingPanel.querySelectorAll('details,summary').length, 0);
  assert.match(panel.workspace.querySelector('.bf-help').textContent, /同名则复用/);
  panel.operation.begin('Fictional read');
  const progress = panel.progressDetails;
  panel.logsButton.focus();
  panel.operation.confirm('First confirmed page');
  assert.equal(panel.progressDetails, progress); assert.equal(progress.hidden, false);
  assert.match(progress.textContent, /First confirmed page/);
  assert.equal(panel.content.contains(progress), false); assert.equal(panel.footer.contains(progress), true);
  assert.equal(document.activeElement, panel.logsButton);
  panel.operation.finish('failed', 'Fictional failure reason');
  assert.match(progress.textContent, /Fictional failure reason/);
  assert.equal(progress.hidden, false);
});

test('records preserve reading position across navigation and hidden arrivals; filters have explicit empty guidance', t => {
  const { panel } = fixture(t);
  panel.followCheckbox.checked = false; panel.followCheckbox.dispatchEvent(new window.Event('change'));
  panel.outputTextBox.scrollTop = 80; panel.outputTextBox.dispatchEvent(new window.Event('scroll'));
  panel.toggleLogs();
  const row = panel.outputTextBox.firstElementChild; panel.appendLog('Hidden fictional arrival');
  assert.equal(panel.outputTextBox.firstElementChild, row);
  panel.toggleLogs(); assert.equal(panel.outputTextBox.scrollTop, 80);
  assert.match(panel.outputTextBox.textContent, /Hidden fictional arrival/);
  panel.logFilter.value = 'error'; panel.logFilter.dispatchEvent(new window.Event('change'));
  assert.match(panel.outputTextBox.textContent, /此级别没有当前范围的记录/);
  panel.logs.clear(); panel.renderLogs(); assert.match(panel.outputTextBox.textContent, /暂无记录/);
});

test('scope reset clears stale statistics and tickets; preview action returns on abandon; management errors stay visible', async t => {
  const { panel, counts } = fixture(t); const ui = panel.inventoryPanel;
  panel.showView('manage'); await ui.load();
  assert.equal(ui.mutations.list.querySelectorAll('details').length, 0);
  assert.match(ui.mutations.rows[0].input.getAttribute('aria-label'), /ID 100 \/ 所有者 50/);
  const m = ui.mutations; m.rows[0].input.checked = true; ui.updateBusy(); m.preview();
  assert.equal(m.previewButton.hidden, true); assert.ok(m.ticket);
  m.invalidate(); assert.equal(m.previewButton.hidden, false); assert.equal(m.ticket, null);
  ui.report = { complete: true }; ui.result.textContent = 'Stale statistics'; m.results.textContent = 'Previous result';
  ui.kind.value = 'subscribed'; ui.kind.dispatchEvent(new window.Event('change'));
  assert.equal(ui.report, null); assert.equal(ui.result.textContent, ''); assert.equal(m.results.textContent, '');
  assert.equal(ui.exportButton.disabled, true); assert.equal(ui.selected().length, 0);
  assert.deepEqual(counts(), { reads: 1, mutations: 0 });
  await ui.run('Fictional failure', async () => { throw new Error('Visible management failure'); });
  assert.match(panel.progressMessage.textContent, /Visible management failure/);
  assert.equal(m.results.textContent, '', 'failure is shown once in the current task status');
  assert.equal(panel.busy, false);
});

test('minimize restores automatic or manual dimensions without resetting them on task switches', t => {
  const { panel } = fixture(t);
  panel.toggleMinimize(); panel.toggleMinimize(); assert.equal(panel.floatingPanel.style.height, '');
  panel.floatingPanel.style.width = '610px'; panel.floatingPanel.style.height = '480px';
  panel.showView('statistics'); panel.toggleMinimize(); panel.toggleMinimize();
  assert.equal(panel.floatingPanel.style.width, '610px'); assert.equal(panel.floatingPanel.style.height, '480px');
});

test('records include operation lifecycle outcomes without duplicating each progress update', t => {
  const { panel } = fixture(t);
  panel.operation.begin('Fictional scan');
  panel.operation.confirm('First page'); panel.operation.confirm('Second page');
  panel.operation.finish('failed', 'Fictional network failure'); panel.toggleLogs();
  const entries = panel.logs.entries.filter(entry => entry.message.includes('Fictional scan'));
  assert.equal(entries.length, 2); assert.equal(entries[1].level, 'error');
  assert.match(entries[1].message, /Fictional network failure/);
  assert.match(panel.outputTextBox.textContent, /Fictional network failure/);
});

test('failed or cancelled catalog load leaves recovery guidance instead of a permanent loading state', async t => {
  const { panel } = fixture(t); const ui = panel.inventoryPanel; panel.showView('statistics');
  ui.service.client.folders = async () => { throw new Error('Fictional connection error'); };
  await ui.load();
  assert.doesNotMatch(ui.list.textContent, /正在读取/); assert.match(ui.list.textContent, /重新加载/);
  assert.match(panel.progressMessage.textContent, /Fictional connection error/); assert.equal(panel.busy, false);
  ui.service.client.folders = async () => { ui.controller.abort(); return []; };
  await ui.load();
  assert.match(ui.list.textContent, /已停止读取/); assert.equal(panel.operation.state.status, 'interrupted');
  assert.equal(ui.loadButton.disabled, false); assert.equal(ui.exportButton.disabled, true);
});

test('copy search preserves edits and hidden selection, bulk selection only affects matching rows', t => {
  const { panel, counts } = fixture(t); const tools = panel.selectionTools;
  const first = panel.favCheckboxItemList[0]; first.checkbox.checked = true; first.inputText.value = 'Edited'; panel.updateSelectionReview();
  tools.search.value = 'source 2'; tools.search.dispatchEvent(new window.Event('input'));
  assert.match(tools.notice.textContent, /筛选外已选 1 个，也会执行/);
  tools.allButton.click();
  assert.equal(panel.getSelectedTasks().length, 12); // 2,20-29 plus hidden 0
  assert.equal(first.inputText.value, 'Edited'); assert.equal(first.checkboxContainer.hidden, true);
  tools.allButton.click(); assert.deepEqual(panel.getSelectedTasks(), [{ source: 'Fictional source 0', target: 'Edited' }]);
  panel.refreshFavorites(); assert.equal(panel.favCheckboxItemList[0].checkboxContainer.hidden, true);
  panel.favCheckboxItemList[0].inputText.value = ' '; panel.updateSelectionReview();
  tools.allButton.click();
  assert.match(panel.selectionReview.textContent, /请填好/);
  tools.search.value = 'no matches'; tools.search.dispatchEvent(new window.Event('input'));
  assert.equal(tools.allButton.disabled, true); assert.match(tools.notice.textContent, /0 个匹配/);
  assert.match(panel.selectionReview.textContent, /请填好/); assert.equal(panel.startBatchTransferButton.disabled, true);
  tools.search.value = ''; tools.search.dispatchEvent(new window.Event('input'));
  assert.equal(panel.favCheckboxItemList[0].checkboxContainer.hidden, false);
  panel.setBusy(true); const before = panel.getSelectedTasks(); panel.toggleSelectAll();
  assert.deepEqual(panel.getSelectedTasks(), before); assert.equal(tools.search.disabled, true);
  assert.deepEqual(counts(), { reads: 0, mutations: 0 });
});

test('statistics and management share filtered selection semantics, exclude ineligible rows and invalidate tickets', async t => {
  const { panel, counts } = fixture(t); const ui = panel.inventoryPanel;
  ui.service.client.folders = async () => [
    { id: '100', name: 'Alpha', ownerId: '50', kind: 'created', count: 2, protected: false, available: true },
    { id: '101', name: 'Beta', ownerId: '50', kind: 'created', count: 3, protected: false, available: true },
    { id: '102', name: 'Protected', ownerId: '50', kind: 'created', protected: true, available: true },
    { id: '103', name: 'Season', ownerId: '50', kind: 'unsupported', available: true }
  ];
  panel.showView('statistics'); await ui.load(); ui.selectionTools.allButton.click();
  assert.deepEqual(ui.selected().map(f => f.id), ['100', '101', '102']);
  assert.equal(ui.rows[3].input.checked, false);
  panel.showView('manage'); const m = ui.mutations; m.selectionTools.allButton.click();
  assert.deepEqual(m.selected().map(f => f.id), ['100', '101']);
  assert.equal(m.rows[2].input.checked, false); assert.equal(m.rows[3].input.checked, false);
  m.preview(); const ticket = m.ticket; assert.ok(ticket);
  assert.match(m.review.textContent, /无法撤销/); assert.match(m.review.textContent, /ID 100 · 所有者 50 · 2 条/);
  m.selectionTools.search.value = 'Alpha'; m.selectionTools.search.dispatchEvent(new window.Event('input'));
  assert.equal(m.ticket, ticket); assert.match(m.selectionTools.notice.textContent, /筛选外已选 1/);
  m.selectionTools.allButton.click(); assert.equal(m.ticket, null);
  assert.deepEqual(m.selected().map(f => f.id), ['101']);
  await assert.rejects(m.engine.execute(ticket, { confirmed: true }));
  panel.setBusy(true); m.selectionTools.toggle();
  assert.deepEqual(m.selected().map(f => f.id), ['101']); assert.equal(m.selectionTools.search.disabled, true);
  panel.setBusy(false); panel.showView('statistics'); assert.equal(ui.selected().length, 3);
  ui.kind.value = 'subscribed'; ui.kind.dispatchEvent(new window.Event('change'));
  assert.equal(ui.selectionTools.allButton.disabled, true); assert.equal(m.selectionTools.allButton.disabled, true);
  assert.equal(counts().mutations, 0);
});

test('development version is visible and matches package, lock, runtime and generated userscript', t => {
  const { panel } = fixture(t);
  const read = name => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
  const pkg = JSON.parse(read('package.json')); const lock = JSON.parse(read('package-lock.json'));
  assert.equal(pkg.version, CONFIG.SCRIPT.VERSION); assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[''].version, pkg.version);
  assert.equal(panel.versionLabel.textContent, `v${pkg.version}`);
  assert.ok(read('dist/BilibiliFavsManage.user.js').includes(`// @version      ${pkg.version}\n`));
});
