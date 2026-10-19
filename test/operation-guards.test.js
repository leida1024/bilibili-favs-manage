import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { FavoriteManager } from '../src/core/FavoriteManager.js';
import { FloatingPanel } from '../src/ui/FloatingPanel.js';
import { PageDetector } from '../src/core/PageDetector.js';
import { PageLifecycle } from '../src/core/PageLifecycle.js';
import { StateManager } from '../src/core/StateManager.js';
import { normalizeCopyTasks } from '../src/utils/favoriteNames.js';
import { ApiCopyFlow } from '../src/core/ApiCopyFlow.js';
import { CONFIG } from '../src/config/config.js';

function realm(t, owner = '60', actor = '50') {
  const dom = new JSDOM('<div class="favlist-aside"><span class="vui_ellipsis">Source</span></div>', { url: `https://space.bilibili.com/${owner}/favlist?fid=100&ftype=create` });
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  if (actor) document.cookie = `DedeUserID=${actor}; path=/`;
  const delays = { ...CONFIG.DELAY }; Object.keys(CONFIG.DELAY).forEach(key => CONFIG.DELAY[key] = 0);
  t.after(() => { Object.assign(CONFIG.DELAY, delays); dom.window.close(); });
}
const tasks = [{ source: 'Source', target: 'Target' }];

for (const [owner, actor, reason] of [['50', '50', /我的空间/], ['60', null, /登录/], ['unsupported', '50', /他人/]]) {
  test(`copy UI and execution reject context ${owner}/${actor}`, async t => {
    realm(t, owner, actor);
    const manager = new FavoriteManager(); manager.getAllFavoriteNames = () => ['Source'];
    manager.api = { clickFavorite: () => assert.fail('must not navigate') };
    const panel = new FloatingPanel(manager); panel.init(); t.after(() => panel.destroy());
    panel.favCheckboxItemList[0].checkbox.checked = true;
    for (const action of [() => panel.updateSelectionReview(), () => { panel.setBusy(true); panel.setBusy(false); }, () => panel.refreshFavorites()]) {
      action(); assert.equal(panel.favCheckboxItemList[0].checkbox.disabled, true);
      assert.equal(panel.favCheckboxItemList[0].inputText.disabled, true); assert.equal(panel.selectAllButton.disabled, true);
      assert.equal(panel.startBatchTransferButton.disabled, true); assert.match(panel.copyHelp.textContent, reason);
    }
    panel.showView('settings'); panel.saveModesButton.click(); panel.showView('copy');
    assert.equal(panel.startBatchTransferButton.disabled, true);
    for (const call of [() => manager.batchCopy(tasks), () => manager.batchCopyWeb(tasks, { skipCrossPage: true }), () => manager.copyFavorite('Source', 'Target'), () => manager.copyOnePage('Target')])
      await assert.rejects(call(), reason);
    const flow = new ApiCopyFlow({ folders: () => assert.fail('no reads') }, () => ({ actor, pageOwner: owner }));
    await assert.rejects(flow.run(tasks), reason);
  });
}

test('visited profile cannot grant login; account change on same route remounts', t => {
  realm(t, '60', null); window.__INITIAL_STATE__ = { mid: 60 };
  assert.equal(PageDetector.getLoginUserUID(), null); assert.equal(PageDetector.getOwnFavListURL(), null);
  document.cookie = 'DedeUserID=invalid; path=/'; assert.equal(PageDetector.getLoginUserUID(), null);
  let mounts = 0, unmounts = 0;
  const lifecycle = new PageLifecycle({ mount: () => mounts++, unmount: () => unmounts++, refresh: () => {}, notify: () => {} });
  document.cookie = 'DedeUserID=50; path=/'; lifecycle.tick(); lifecycle.tick(); assert.equal(mounts, 1);
  document.cookie = 'DedeUserID=70; path=/'; lifecycle.tick(); assert.equal(mounts, 2); assert.equal(unmounts, 2);
});

test('malformed/empty/repeated pairs stop before reads; many-to-one and foreign same-name remain valid', async t => {
  realm(t);
  for (const input of [null, {}, [null], ['bad'], [...tasks, { source: ' Source ', target: 'Target' }]]) assert.throws(() => normalizeCopyTasks(input));
  assert.equal(normalizeCopyTasks([...tasks, { source: 'Other', target: 'Target' }]).length, 2);
  const manager = new FavoriteManager(); manager.getAllFavoriteNames = () => assert.fail('invalid input must precede reads');
  await assert.rejects(manager.batchCopy([]), /选择/); await assert.rejects(manager.batchCopy([...tasks, ...tasks]), /重复/);
  const source = { id: '100', name: 'Same', ownerId: '60', available: true }, target = { ...source, id: '200', ownerId: '50' };
  let copied = 0;
  const client = { folders: async owner => [owner === '60' ? source : target], videos: async () => ({ info: { id: '100', media_count: 1 }, medias: [{ type: 2, id: '1' }], has_more: false }), copy: async () => { copied++; return { status: 'confirmed' }; } };
  await new ApiCopyFlow(client, () => ({ actor: '50', pageOwner: '60' }), 0).run([{ source: 'Same', target: 'Same' }]); assert.equal(copied, 1);
});

test('manager overlap cannot start another copy; lock releases on failure', async t => {
  realm(t); const manager = new FavoriteManager(); let release, calls = 0;
  manager.runBatchCopy = async () => { calls++; await new Promise(resolve => release = resolve); throw Error('fixture failure'); };
  const first = manager.batchCopy(tasks); await assert.rejects(manager.batchCopy(tasks), /已有/); assert.equal(calls, 1);
  release(); await assert.rejects(first, /fixture/); assert.equal(manager.copyRunning, false);
});

for (const drift of ['actor', 'space', 'folder']) {
  test(`native copy never confirms after ${drift} changes while preparing`, async t => {
    realm(t); const manager = new FavoriteManager(); let confirms = 0;
    manager.api = { ensureBatchModeActive: async () => true, clickSelectAll: () => true, clickCopyButton: async () => true,
      waitForDialog: async () => ({}), isFavoriteExistInDialog: () => true, selectFavoriteInDialog: () => {
        if (drift === 'actor') document.cookie = 'DedeUserID=70; path=/';
        else window.history.replaceState(null, '', drift === 'space' ? '/70/favlist?fid=100' : '/60/favlist?fid=101');
        return true;
      }, clickConfirmButton: async () => { confirms++; return true; } };
    await assert.rejects(manager.copyOnePage('Target'), /变化/); assert.equal(confirms, 0);
  });
}

test('source navigation during delayed handoff never saves executable state', async t => {
  realm(t); t.mock.timers.enable({ apis: ['setTimeout'] }); const manager = new FavoriteManager();
  t.mock.method(StateManager, 'saveState', () => assert.fail('changed source must not save'));
  const pending = manager.crossPageFlow.startCrossPageFlow(tasks);
  window.history.replaceState(null, '', '/60/favlist?fid=101'); t.mock.timers.tick(3000); await assert.rejects(pending, /来源页面/);
});

test('foreign native unsubscribe preview explains required route without issuing ticket', t => {
  realm(t); const manager = new FavoriteManager(); manager.getAllFavoriteNames = () => [];
  const panel = new FloatingPanel(manager); panel.init(); t.after(() => panel.destroy()); panel.showView('manage');
  const ui = panel.inventoryPanel; ui.kind.value = 'subscribed'; ui.mutations.action = 'unsubscribe';
  ui.mutations.preview(); assert.equal(ui.mutations.ticket, null); assert.match(ui.mutations.results.textContent, /我的收藏夹页面/);
});
