import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { watchCopyConfirmation } from '../src/core/adapters/copyConfirmation.js';
import { BilibiliAPI } from '../src/core/BilibiliAPI.js';
import { FavoriteManager } from '../src/core/FavoriteManager.js';
import { StateManager } from '../src/core/StateManager.js';
import { FloatingPanel } from '../src/ui/FloatingPanel.js';
import { setLoggerPanel, setLoggerStore, log } from '../src/utils/logger.js';
import { CONFIG } from '../src/config/config.js';

function realm(t, uid = '50', html = '<div class="favlist-aside"></div>', denied = false) {
  const dom = new JSDOM(html, { url: `https://space.bilibili.com/${uid}/favlist` });
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.localStorage = dom.window.localStorage;
  document.cookie = 'DedeUserID=50';
  if (denied) Object.defineProperty(window, 'sessionStorage', { get() { throw Error('denied'); } });
  t.after(() => { setLoggerPanel(null); setLoggerStore(null); dom.window.close(); });
  return dom;
}
const toast = text => { const node = document.createElement('div'); node.className = 'vui_toast'; node.textContent = text; return node; };

test('six seconds reports waiting; a seven-second platform result confirms and releases all timers', async t => {
  realm(t); t.mock.timers.enable({ apis: ['setTimeout'] });
  let slow = 0, resolved = false;
  const watcher = watchCopyConfirmation('.vui_toast', CONFIG.COPY_CONFIRMATION.TIMEOUT, () => { slow++; }, CONFIG.COPY_CONFIRMATION.SLOW_NOTICE);
  watcher.result.then(() => { resolved = true; });
  t.mock.timers.tick(6000); await Promise.resolve();
  assert.equal(slow, 1); assert.equal(resolved, false);
  t.mock.timers.tick(1000); document.body.append(toast('操作成功'));
  assert.equal((await watcher.result).status, 'confirmed');
  t.mock.timers.tick(30000); assert.equal((await watcher.result).status, 'confirmed'); assert.equal(slow, 1);
});

test('VUI nested wrapper and localized delayed success confirm once beyond the old UI-delay timeout', async t => {
  realm(t);
  const delays = { ...CONFIG.DELAY }, confirmation = { ...CONFIG.COPY_CONFIRMATION };
  Object.keys(CONFIG.DELAY).forEach(key => { CONFIG.DELAY[key] = 0; });
  Object.assign(CONFIG.COPY_CONFIRMATION, { TIMEOUT: 100, SLOW_NOTICE: 5 });
  t.after(() => { Object.assign(CONFIG.DELAY, delays); Object.assign(CONFIG.COPY_CONFIRMATION, confirmation); });
  document.body.insertAdjacentHTML('beforeend', '<div class="vui_dialog--content"><button class="vui_button--blue">确定</button></div>');
  const dialog = document.querySelector('.vui_dialog--content');
  let clicks = 0, source;
  dialog.querySelector('button').onclick = () => {
    clicks++;
    setTimeout(() => { const wrapper = document.createElement('div'); wrapper.className = 'vui_toast--wrapper';
      wrapper.append(toast('earlier unrelated message'), toast('Operation successful')); document.body.append(wrapper);
    }, 25);
  };
  const manager = new FavoriteManager(); manager.getAllFavoriteNames = () => [];
  manager.api = { clickFavorite: async name => { source = name; return true; }, getCurrentFavoriteName: () => source,
    getTotalPages: () => 1, ensureBatchModeActive: async () => true, clickSelectAll: () => true,
    clickCopyButton: async () => true, waitForDialog: async () => dialog, isFavoriteExistInDialog: () => true,
    selectFavoriteInDialog: () => true, clickConfirmButton: value => BilibiliAPI.clickConfirmButton(value),
    get copySubmission() { return BilibiliAPI.copySubmission; } };
  setLoggerStore(manager.logs);
  await manager.batchCopy([{ source: 'A', target: 'Target A' }, { source: 'B', target: 'Target B' }], { skipCrossPage: true });
  assert.equal(clicks, 2); assert.equal(manager.operation.state.confirmed, 2); assert.equal(manager.operation.state.status, 'completed');
  assert.ok(manager.logs.entries.some(entry => entry.message.includes('仍在等待确认')));
});

test('stale, hidden, unrelated, negative success text and dialog disappearance never confirm; cleanup stops later signals', async t => {
  realm(t); const stale = toast('操作成功'); document.body.append(stale);
  const hidden = toast('操作成功'); hidden.hidden = true; document.body.append(hidden);
  const watcher = watchCopyConfirmation('.vui_toast', 35, () => {}, 100);
  const dialog = document.createElement('div'); dialog.className = 'vui_dialog--content'; document.body.append(dialog); dialog.remove();
  document.body.append(document.createElement('aside')); stale.classList.add('unrelated-style');
  document.body.append(toast('未操作成功'));
  const external = document.createElement('div'); external.textContent = '操作成功'; document.body.append(external);
  const panel = document.createElement('div'); panel.className = 'bili-favs-manage-panel'; panel.append(toast('操作成功')); document.body.append(panel);
  assert.equal((await watcher.result).status, 'unknown');
  document.body.append(toast('操作成功')); assert.equal((await watcher.result).status, 'unknown');
  let slow = 0; const stopped = watchCopyConfirmation('.vui_toast', 50, () => { slow++; }, 5);
  stopped.cancel(); assert.equal((await stopped.result).status, 'unknown');
  await new Promise(resolve => setTimeout(resolve, 10)); assert.equal(slow, 0);
});

test('actual legacy Vue toast appears hidden then shows decorated success and continues both copy tasks', async t => {
  realm(t, '50', '<div id="fav-createdList-container"></div><div class="edit-video-modal"><div class="modal-footer"><button class="btn">确定</button></div></div>');
  const delays = { ...CONFIG.DELAY }, confirmation = { ...CONFIG.COPY_CONFIRMATION };
  Object.keys(CONFIG.DELAY).forEach(key => { CONFIG.DELAY[key] = 0; });
  Object.assign(CONFIG.COPY_CONFIRMATION, { TIMEOUT: 100, SLOW_NOTICE: 80 });
  t.after(() => { Object.assign(CONFIG.DELAY, delays); Object.assign(CONFIG.COPY_CONFIRMATION, confirmation); });
  let clicks = 0, source;
  const dialog = document.querySelector('.edit-video-modal');
  dialog.querySelector('button').onclick = () => {
    clicks++;
    // Legacy $toast mounts with v-show=false, appends, then sets show=true.
    const node = document.createElement('div'); node.className = 'be-toast';
    node.style.display = 'none'; node.textContent = '复制成功(ง •̀_•́)ง'; document.body.append(node);
    setTimeout(() => { node.style.display = ''; }, 5);
  };
  const manager = new FavoriteManager();
  manager.api = { clickFavorite: async name => { source = name; return true; }, getCurrentFavoriteName: () => source,
    getTotalPages: () => 1, ensureBatchModeActive: async () => true, clickSelectAll: () => true,
    clickCopyButton: async () => true, waitForDialog: async () => dialog, isFavoriteExistInDialog: () => true,
    selectFavoriteInDialog: () => true, clickConfirmButton: value => BilibiliAPI.clickConfirmButton(value),
    get copySubmission() { return BilibiliAPI.copySubmission; } };
  await manager.batchCopy([{ source: 'A', target: 'Target A' }, { source: 'B', target: 'Target B' }], { skipCrossPage: true });
  assert.equal(clicks, 2); assert.equal(manager.operation.state.confirmed, 2);
  assert.equal(manager.operation.state.status, 'completed');
});

test('reused notification text mutation and explicit platform rejection are observed', async t => {
  realm(t); const reused = toast('处理中'); document.body.append(reused);
  const changed = watchCopyConfirmation('.vui_toast', 100, () => {}, 200);
  reused.firstChild.data = '操作成功！'; assert.equal((await changed.result).status, 'confirmed');
  const wrapper = document.createElement('div'); wrapper.hidden = true; reused.replaceWith(wrapper); wrapper.append(reused);
  const revealed = watchCopyConfirmation('.vui_toast', 100, () => {}, 200);
  wrapper.hidden = false; assert.equal((await revealed.result).status, 'confirmed');
  const failed = watchCopyConfirmation('.vui_toast', 100, () => {}, 200);
  document.body.append(toast('操作失败，请稍后再试')); assert.equal((await failed.result).status, 'failed');
});

test('native confirm propagates a platform rejection after one click without waiting for timeout', async t => {
  realm(t, '50', '<div class="favlist-aside"></div><div class="vui_dialog--content"><button class="vui_button--blue">确定</button></div>');
  let clicks = 0;
  document.querySelector('button').onclick = () => { clicks++; document.body.append(toast('操作失败，请稍后再试')); };
  assert.equal(await BilibiliAPI.clickConfirmButton(document.querySelector('.vui_dialog--content')), false);
  assert.equal(BilibiliAPI.copySubmission.status, 'failed'); assert.match(BilibiliAPI.copySubmission.detail, /平台提示/);
  assert.equal(clicks, 1);
});

test('cross-page account change discards the handoff before restoring private records or running mutations', async t => {
  realm(t); document.cookie = 'DedeUserID=60';
  let consumed = false, writes = 0;
  t.mock.method(StateManager, 'loadState', () => ({ actorId: '50', phase: 'creating', journal: { schemaVersion: 2, entries: [] } }));
  t.mock.method(StateManager, 'clearState', () => { consumed = true; });
  const manager = new FavoriteManager();
  t.mock.method(manager.logs, 'restore', () => { throw Error('must not restore another account'); });
  manager.crossPageFlow.batchCreateFavorites = async () => { writes++; };
  assert.equal(await manager.crossPageFlow.resumeFlow(), true); assert.equal(consumed, true);
  assert.equal(writes, 0); assert.equal(manager.operation.state.status, 'failed');
});

test('both navigation snapshots retain actual sidebar fallback, other-function and tail records without session storage or replay', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let pending;
  t.mock.method(StateManager, 'saveState', state => { pending = JSON.parse(JSON.stringify(state)); });
  t.mock.method(StateManager, 'loadState', () => pending);
  t.mock.method(StateManager, 'clearState', () => { pending = null; });
  function mount(uid, names) {
    realm(t, uid, '<div id="fav-createdList-container"></div>', true);
    const manager = new FavoriteManager(); manager.getAllFavoriteNames = () => names;
    const panel = new FloatingPanel(manager); panel.init(); setLoggerPanel(panel); setLoggerStore(manager.logs);
    t.after(() => panel.destroy()); return { manager, panel };
  }
  const origin = mount('90', ['Fictional source']);
  origin.manager.logs.add('Other function record', 'info', { view: 'manage', operationId: 'other' });
  origin.manager.operation.begin('批量复制', 1, { phase: 'copying' });
  const outgoing = origin.manager.crossPageFlow.startCrossPageFlow([{ source: 'Fictional source', target: 'Fictional target' }]);
  log('During first navigation countdown'); t.mock.timers.tick(3000); await outgoing;
  assert.ok(pending.journal.entries.some(entry => entry.message === 'During first navigation countdown'));
  assert.ok(pending.journal.entries.some(entry => entry.message === 'Other function record'));
  assert.ok(pending.journal.entries.some(entry => entry.message.startsWith('等待跳转：')));
  const operationId = pending.operationId; origin.panel.destroy();
  const own = mount('50', []);
  t.mock.method(BilibiliAPI, 'createFavoriteViaSidebar', async () => null);
  let creations = 0;
  own.manager.crossPageFlow.createViaCopyDialog = async () => { creations++; assert.equal(pending, null); return true; };
  const preparing = own.manager.crossPageFlow.resumeFlow();
  // Flush the async sidebar/fallback chain until it reaches the return delay.
  for (let i = 0; i < 15; i++) await Promise.resolve();
  log('During return navigation countdown'); t.mock.timers.tick(3000); await preparing;
  assert.equal(creations, 1); assert.equal(pending.operationId, operationId);
  assert.ok(pending.journal.entries.some(entry => entry.message.includes('侧边栏入口不可用')));
  assert.ok(pending.journal.entries.some(entry => entry.message === 'During return navigation countdown'));
  own.panel.destroy();
  const source = mount('90', ['Fictional source']); let copies = 0;
  source.manager.copyFavorite = async () => { copies++; assert.equal(pending, null); return true; };
  await source.manager.crossPageFlow.resumeFlow();
  assert.equal(source.manager.operation.state.status, 'completed'); assert.equal(source.manager.operation.state.operationId, operationId);
  assert.equal(source.manager.logs.entries.filter(entry => entry.message.includes('侧边栏入口不可用')).length, 1);
  assert.ok(source.manager.logs.entries.some(entry => entry.message === 'Other function record'));
  assert.equal(await source.manager.crossPageFlow.resumeFlow(), false); assert.equal(copies, 1);
});
