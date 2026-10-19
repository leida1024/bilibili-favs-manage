import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { FolderClient, normalizeFolder } from '../src/core/FolderClient.js';
import { eligibility } from '../src/core/BatchOperations.js';
import { FloatingPanel } from '../src/ui/FloatingPanel.js';
import { FavoriteManager } from '../src/core/FavoriteManager.js';
import { OperationState } from '../src/core/OperationState.js';
import { StateManager } from '../src/core/StateManager.js';
import { BilibiliAPI } from '../src/core/BilibiliAPI.js';
import { LogStore } from '../src/utils/logStore.js';
import { setLoggerPanel, setLoggerStore } from '../src/utils/logger.js';
import { CONFIG } from '../src/config/config.js';

function realm(t, uid = '50') {
  const dom = new JSDOM('<div id="fav-createdList-container"></div>', { url: `https://space.bilibili.com/${uid}/favlist` });
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.localStorage = dom.window.localStorage;
  document.cookie = 'DedeUserID=50';
  t.after(() => { setLoggerPanel(null); setLoggerStore(null); dom.window.close(); });
  return dom;
}

test('actual API boolean shape keeps ordinary folders selectable and all unsafe shapes protected', async () => {
  const rows = Array.from({ length: 28 }, (_, i) => ({ id: 100 + i, fid: i + 10, mid: 50, attr: 2,
    title: `Fictional ${i}`, fav_state: 0, media_count: i, is_kid_playlist: false, kid_playlist_desc: '' }));
  const client = new FolderClient(async () => ({ ok: true, json: async () => ({ code: 0, data: { count: rows.length, list: rows } }) }));
  const folders = await client.folders('50', 'created');
  assert.equal(folders.filter(f => !eligibility('delete', f, '50', '50')).length, 27);
  assert.ok(eligibility('delete', folders[0], '50', '50'));
  for (const flag of [false, 0]) assert.equal(normalizeFolder({ ...rows[1], is_kid_playlist: flag }, 'created', 1).protected, false);
  for (const flag of [true, 1, undefined, null, '0', 'false', 2])
    assert.equal(normalizeFolder({ ...rows[1], is_kid_playlist: flag }, 'created', 1).protected, true);
  assert.ok(eligibility('delete', folders[1], '90', '50'));
});

test('functional states and default records follow the selected screen; catalog load does not leave a footer', async t => {
  realm(t);
  const manager = new FavoriteManager(); manager.getAllFavoriteNames = () => ['Fictional'];
  manager.inventory.client.folders = async () => [];
  const panel = new FloatingPanel(manager); panel.init(); t.after(() => panel.destroy());
  manager.operation.begin('复制', 1); manager.operation.finish('unknown', '检查目标后再决定');
  const copyId = manager.operation.state.operationId;
  panel.showView('statistics');
  assert.equal(panel.statusBox.hidden, true); assert.doesNotMatch(panel.outputTextBox.textContent, /检查目标/);
  await panel.inventoryPanel.load();
  assert.equal(panel.statusBox.hidden, true);
  assert.equal(panel.inventoryPanel.kind.querySelector('select'), null);
  assert.equal(panel.inventoryPanel.scopeButtons.get('created').textContent, '当前空间');
  panel.showView('manage');
  assert.equal(panel.statusBox.hidden, true);
  assert.equal(panel.inventoryPanel.scopeButtons.get('created').textContent, '删除收藏夹');
  panel.logScope.value = 'all'; panel.renderLogs(); assert.match(panel.outputTextBox.textContent, /检查目标/);
  panel.showView('copy');
  assert.equal(panel.operation.state.operationId, copyId); assert.equal(panel.statusTitle.textContent, '待核对 · 复制');
  assert.match(panel.progressMessage.textContent, /检查目标/);
});

test('catalog invalidation clears obsolete statistics status without erasing a running management operation', t => {
  realm(t); const manager = new FavoriteManager(); manager.getAllFavoriteNames = () => [];
  const panel = new FloatingPanel(manager); panel.init(); t.after(() => panel.destroy());
  panel.showView('statistics'); panel.operation.begin('统计'); panel.operation.finish('completed', '旧快照');
  panel.showView('manage'); panel.operation.begin('删除');
  panel.inventoryPanel.resetCatalog('重新加载');
  assert.equal(panel.operations.statistics.state.status, 'idle');
  assert.equal(panel.operations.manage.state.status, 'running');
  assert.equal(panel.operations.copy.state.status, 'idle');
});

test('copy submission uncertainty reaches the UI once with its page and stops all remaining folders', async t => {
  realm(t);
  const old = { ...CONFIG.DELAY }; for (const key of Object.keys(CONFIG.DELAY)) CONFIG.DELAY[key] = 0;
  t.after(() => Object.assign(CONFIG.DELAY, old));
  const manager = new FavoriteManager(); manager.getAllFavoriteNames = () => ['Source A', 'Source B'];
  let submissions = 0;
  manager.api = {
    clickFavorite: async () => true, getCurrentFavoriteName: () => 'Source A', getTotalPages: () => 2,
    ensureBatchModeActive: async () => true, clickSelectAll: () => true, clickCopyButton: async () => true,
    waitForDialog: async () => ({}), isFavoriteExistInDialog: () => true, selectFavoriteInDialog: () => true,
    copySubmission: { status: 'unknown', detail: '已提交但未确认。' },
    clickConfirmButton: async () => { submissions++; return false; }
  };
  const panel = new FloatingPanel(manager); panel.init(); setLoggerPanel(panel);
  t.after(() => panel.destroy());
  for (const row of panel.favCheckboxItemList) row.checkbox.checked = true;
  panel.updateSelectionReview(); await panel.startBatchTransfer();
  assert.equal(submissions, 1); assert.equal(panel.busy, false);
  assert.equal(manager.operation.state.status, 'unknown'); assert.equal(manager.operation.state.confirmed, 0);
  assert.match(panel.progressMessage.textContent, /确认复制结果（第 1 页）/);
  assert.doesNotMatch(panel.progressMessage.textContent, /恢复失败|复制失败/);
  assert.equal(manager.logs.entries.filter(e => e.message.startsWith('待核对：')).length, 1);
});

test('diagnostic snapshots merge across realms in order, reject malformed entries and never include other tasks', () => {
  const a = new LogStore(3); a.setContext({ view: 'copy', operationId: 'task-a', phase: 'creating' });
  a.add('before'); a.add('handoff');
  a.add('unrelated', 'info', { view: 'manage', operationId: 'task-b' });
  const saved = JSON.parse(JSON.stringify(a.snapshot('task-a')));
  const b = new LogStore(3); b.restore(saved); b.restore(saved);
  assert.equal(b.entries.length, 2); assert.deepEqual(b.entries.map(e => e.message), ['before', 'handoff']);
  b.setContext({ view: 'copy', operationId: 'task-a', phase: 'copying' }); b.add('after');
  assert.deepEqual(b.entries.map(e => e.message), ['before', 'handoff', 'after']);
  b.restore({ schemaVersion: 2, entries: [null, { id: 'bad', time: 'invalid', level: 'info', message: 'bad' }] });
  assert.equal(b.entries.length, 3); assert.doesNotMatch(b.export(), /unrelated|invalid/);
  b.add('bounded'); assert.equal(b.entries.length, 3); assert.equal(b.dropped, 1);
});

test('cross-page handoffs preserve task identity and records, consume before execute, and stop uncertain copying once', async t => {
  realm(t, '90');
  let pending, consumed = 0;
  t.mock.method(StateManager, 'saveState', value => { pending = JSON.parse(JSON.stringify(value)); });
  t.mock.method(StateManager, 'loadState', () => pending);
  t.mock.method(StateManager, 'clearState', () => { pending = null; consumed++; });
  const start = new FavoriteManager(); start.operation.begin('批量复制', 1, { phase: 'copying' });
  setLoggerStore(start.logs);
  start.logs.setContext({ view: 'copy', operationId: start.operation.state.operationId, phase: 'copying' }); start.logs.add('origin');
  await start.crossPageFlow.startCrossPageFlow([{ source: 'Fictional source', target: 'Fictional target' }]);
  const id = pending.operationId;
  assert.equal(id, start.operation.state.operationId);
  assert.ok(pending.journal.entries.some(e => e.message === 'origin'));
  realm(t, '50');
  const prepare = new FavoriteManager(); setLoggerStore(prepare.logs);
  prepare.getAllFavoriteNames = () => ['Fictional target'];
  await prepare.crossPageFlow.resumeFlow();
  assert.equal(prepare.operation.state.status, 'waiting', 'ordinary handoff is not an interruption');
  assert.equal(consumed, 1); assert.equal(pending.operationId, id); assert.equal(pending.phase, 'copying');
  assert.ok(pending.journal.entries.some(e => e.message.includes('目标准备完成')));
  realm(t, '90');
  const copy = new FavoriteManager(); copy.getAllFavoriteNames = () => [];
  setLoggerStore(copy.logs);
  const panel = new FloatingPanel(copy); panel.init(); setLoggerPanel(panel);
  t.after(() => panel.destroy());
  let calls = 0;
  copy.copyFavorite = async () => {
    calls++; assert.equal(pending, null, 'consume before submission');
    copy.copyStep = '确认复制结果'; copy.copyPage = 1;
    const err = new Error('复制已提交，但未观察到平台成功提示。'); err.outcome = 'unknown'; throw err;
  };
  await assert.rejects(copy.crossPageFlow.resumeFlow());
  assert.equal(copy.operation.state.status, 'unknown'); assert.equal(copy.operation.state.operationId, id);
  assert.equal(copy.operation.state.confirmed, 0); assert.match(panel.progressMessage.textContent, /第 1 页/);
  assert.doesNotMatch(panel.progressMessage.textContent, /恢复失败|请检查页面后重试/);
  assert.equal(copy.logs.entries.filter(e => e.message.startsWith('待核对：')).length, 1);
  assert.equal(copy.logs.entries.filter(e => e.message === 'origin').length, 1);
  assert.equal(await copy.crossPageFlow.resumeFlow(), false); assert.equal(calls, 1);
});

test('copy result watcher accepts fresh delayed confirmation and ignores a stale success message', async t => {
  realm(t);
  const old = CONFIG.COPY_CONFIRMATION.TIMEOUT; CONFIG.COPY_CONFIRMATION.TIMEOUT = 60;
  t.after(() => { CONFIG.COPY_CONFIRMATION.TIMEOUT = old; });
  document.body.insertAdjacentHTML('beforeend', '<div class="be-message">操作成功</div><div class="modal-footer"><button class="btn">确定</button></div>');
  let submissions = 0;
  const confirm = document.querySelector('.btn');
  confirm.onclick = () => { submissions++; };
  assert.equal(await BilibiliAPI.clickConfirmButton(document.body), false);
  assert.equal(BilibiliAPI.copySubmission.status, 'unknown');
  confirm.onclick = () => { submissions++; setTimeout(() => {
    const toast = document.createElement('div'); toast.className = 'be-message'; toast.textContent = '操作成功'; document.body.append(toast);
  }, 30); };
  assert.equal(await BilibiliAPI.clickConfirmButton(document.body), true);
  assert.equal(BilibiliAPI.copySubmission.status, 'confirmed'); assert.equal(submissions, 2);
});
