import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { OperationState } from '../src/core/OperationState.js';
import { LogStore } from '../src/utils/logStore.js';
import { FloatingPanel } from '../src/ui/FloatingPanel.js';
import { FavoriteManager } from '../src/core/FavoriteManager.js';
import { CONFIG } from '../src/config/config.js';
import { BilibiliAPI } from '../src/core/BilibiliAPI.js';

function panelFixture(t, batchCopy = async () => {}) {
  const dom = new JSDOM('', { url: 'https://example.test/' });
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  const manager = { operation: new OperationState(), getAllFavoriteNames: () => ['虚构课程'], batchCopy };
  const panel = new FloatingPanel(manager); panel.init();
  t.after(() => { panel.destroy(); dom.window.close(); });
  return { panel, manager };
}

test('log retention, level filtering, truncation and export omit credentials/URLs', () => {
  const store = new LogStore(3);
  store.add('discard');
  store.add('token=abc bili_jct=def SESSDATA=ghi https://example.test/?secret=abc', 'error');
  store.add('x'.repeat(3000), 'debug'); store.add('last');
  const exported = store.export();
  assert.equal(store.dropped, 1); assert.equal(store.entries.length, 3);
  assert.equal(store.filter('error').length, 1);
  assert.equal(store.entries[1].message.length, 2000);
  assert.doesNotMatch(exported, /abc|def|ghi|https:/);
  assert.deepEqual(Object.keys(JSON.parse(exported).entries[0]), ['time', 'level', 'message']);
  store.clear(); assert.equal(store.entries.length, 0);
});

test('operation reports last confirmed step on failure, unknown total stays unknown, unsubscribe cleans up', () => {
  const model = new OperationState(); const snapshots = [];
  const off = model.subscribe(state => snapshots.push(state));
  model.begin('扫描'); assert.equal(model.state.total, null);
  model.confirm('第一步'); model.finish('failed', '第二步未确认');
  assert.equal(model.state.confirmed, 1); assert.equal(model.state.lastConfirmed, '第一步');
  const count = snapshots.length; off(); model.begin('其他'); assert.equal(snapshots.length, count);
});

test('failed copy releases busy and preserves source/target; repeated clicks cannot overlap', async t => {
  let reject, calls = 0;
  const { panel } = panelFixture(t, () => { calls++; return new Promise((_, fail) => { reject = fail; }); });
  const item = panel.favCheckboxItemList[0]; item.checkbox.checked = true; item.inputText.value = '虚构目标';
  panel.updateSelectionReview();
  const running = panel.startBatchTransfer();
  await panel.startBatchTransfer(); assert.equal(calls, 1);
  assert.equal(panel.busy, true); assert.equal(item.inputText.disabled, true);
  reject(new Error('第二项未确认')); await running;
  assert.equal(panel.busy, false); assert.equal(panel.startBatchTransferButton.disabled, false);
  assert.equal(panel.operation.state.status, 'failed');
  panel.refreshFavorites(); assert.deepEqual(panel.getSelectedTasks(), [{ source: '虚构课程', target: '虚构目标' }]);
});

test('reading earlier logs disables follow; filters/clear and export review work without downloading', t => {
  const { panel } = panelFixture(t);
  panel.toggleLogs();
  Object.defineProperties(panel.outputTextBox, { scrollHeight: { value: 1000 }, clientHeight: { value: 100 } });
  panel.outputTextBox.scrollTop = 50;
  panel.outputTextBox.dispatchEvent(new window.Event('scroll'));
  panel.appendLog('虚构错误', panel.errorCode);
  assert.equal(panel.outputTextBox.scrollTop, 50); assert.equal(panel.followCheckbox.checked, false);
  panel.logFilter.value = 'error'; panel.renderLogs(); assert.equal(panel.outputTextBox.children.length, 1);
  panel.reviewExport(panel.logs.export(), 'test.json');
  assert.match(panel.exportReview.querySelector('textarea').value, /虚构错误/);
  panel.toggleMinimize(); assert.equal(panel.content.hidden, true);
  panel.toggleMinimize(); assert.equal(panel.content.hidden, false);
});

test('copy progress stops at last successful folder and never calls later items', async t => {
  const manager = new FavoriteManager(); let calls = 0;
  t.mock.method(manager, 'copyFavorite', async () => ++calls === 1);
  const old = CONFIG.DELAY.MIDDLE; CONFIG.DELAY.MIDDLE = 0; t.after(() => { CONFIG.DELAY.MIDDLE = old; });
  await assert.rejects(manager.batchCopy([{ source: 'A', target: 'B' }, { source: 'C', target: 'D' }, { source: 'E', target: 'F' }], { skipCrossPage: true }));
  assert.equal(calls, 2); assert.equal(manager.operation.state.confirmed, 1);
  assert.equal(manager.operation.state.lastConfirmed, 'A → B'); assert.equal(manager.operation.state.status, 'failed');
});

test('copy submit without observed success is uncertain and must not confirm completion', async t => {
  const { panel } = panelFixture(t);
  document.body.insertAdjacentHTML('beforeend', '<div id="fav-createdList-container"></div><div class="modal-footer"><button class="btn">确定</button></div>');
  const old = CONFIG.DELAY.LONG; CONFIG.DELAY.LONG = 0; t.after(() => { CONFIG.DELAY.LONG = old; });
  let calls = 0; document.querySelector('.btn').onclick = () => calls++;
  document.body.insertAdjacentHTML('beforeend', '<div class="vui_toast">操作成功</div>');
  assert.equal(await BilibiliAPI.clickConfirmButton(document.body), false);
  assert.equal(calls, 1); assert.equal(panel.operation.state.confirmed, 0);
});
