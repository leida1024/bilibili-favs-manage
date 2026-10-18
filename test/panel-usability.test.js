import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { FloatingPanel } from '../src/ui/FloatingPanel.js';
import { InventoryService } from '../src/core/InventoryService.js';
import { BatchOperations } from '../src/core/BatchOperations.js';
import { OperationState } from '../src/core/OperationState.js';

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
  assert.equal(panel.activeView, 'copy'); assert.equal(panel.inventoryPanel.root.hidden, true); assert.equal(panel.diagnostics.hidden, true);
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

test('switching operations preserves copy edits, separates lists, clears pending destructive confirmation and does no I/O', async t => {
  const { panel, counts } = fixture(t); const item = panel.favCheckboxItemList[0];
  item.checkbox.checked = true; item.inputText.value = 'Keep this edit'; panel.updateSelectionReview();
  panel.showView('manage'); const ui = panel.inventoryPanel; await ui.load();
  assert.equal(ui.list.hidden, true); assert.equal(ui.mutations.root.hidden, false); assert.equal(panel.workspace.hidden, true);
  const m = ui.mutations; m.rows[0].input.checked = true; ui.updateBusy(); m.preview();
  const ticket = m.ticket; assert.ok(ticket);
  panel.showView('statistics');
  assert.equal(m.ticket, null); assert.equal(m.engine.ticket, null); assert.equal(ui.mutations.root.hidden, true); assert.equal(ui.list.hidden, false);
  assert.equal(m.selected().length, 0); assert.equal(ui.selected().length, 0);
  await assert.rejects(m.engine.execute(ticket, { confirmed: true }));
  panel.showView('copy'); assert.deepEqual(panel.getSelectedTasks(), [{ source: 'Fictional source 0', target: 'Keep this edit' }]);
  panel.refreshFavorites(); assert.equal(panel.favCheckboxItemList[0].inputText.value, 'Keep this edit');
  assert.deepEqual(counts(), { reads: 1, mutations: 0 });
});

test('busy locks operation navigation but permits logs and return; empty selected target cannot submit', t => {
  const { panel } = fixture(t); const item = panel.favCheckboxItemList[0];
  item.checkbox.checked = true; item.inputText.value = ' '; panel.updateSelectionReview();
  assert.equal(panel.startBatchTransferButton.disabled, true); assert.equal(item.inputText.getAttribute('aria-invalid'), 'true');
  item.inputText.value = 'Valid'; panel.updateSelectionReview(); assert.equal(panel.startBatchTransferButton.disabled, false);
  panel.setBusy(true); panel.showView('manage'); assert.equal(panel.activeView, 'copy');
  panel.logsButton.click(); assert.equal(panel.activeView, 'logs'); assert.equal(panel.diagnostics.hidden, false);
  panel.logsButton.click(); assert.equal(panel.activeView, 'copy'); assert.equal(panel.busy, true);
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
