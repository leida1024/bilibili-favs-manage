import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { BilibiliAPI } from '../src/core/BilibiliAPI.js';
import { FavoriteManager } from '../src/core/FavoriteManager.js';
import { StateManager } from '../src/core/StateManager.js';
import { CONFIG } from '../src/config/config.js';

// Legacy favorites chunk12 renders .nav-add, which opens chunk11's Edit form.
// This independent form does not use the copy modal's input or 新建 button.
function emptyOwnSpace(t, { confirm = true, beforeOpen = () => {} } = {}) {
  const dom = new JSDOM('<div id="fav-createdList-container"><div class="nav-title nav-add"><span class="icon icon-add" title="创建收藏夹"></span><span class="text">新建收藏夹</span></div><div class="fav-item"><a class="text">Empty default</a><span class="num">0</span></div></div><div class="favInfo-details"><a class="fav-name">Empty default</a><div class="fav-meta">0个内容</div></div><div class="edit-video-modal" style="display:none"><input class="add-fav-input"><div class="fav-add-btn">新建</div></div><button id="unrelated">创建</button><div class="edit-media-list"><div class="edit-mask" style="display:none"><div class="edit-board no-cover"><div class="head">收藏夹信息</div><div class="edit-info"><label for="media-list-name">名称：</label><input class="name-input" id="media-list-name" placeholder="收藏夹名称" maxlength="20"><div class="submit-btn">提 交</div></div></div></div></div>',
    { url: 'https://space.bilibili.com/123/favlist' });
  for (const key of ['window', 'document', 'Node', 'Event', 'KeyboardEvent']) globalThis[key] = key === 'window' ? dom.window : dom.window[key];
  globalThis.localStorage = dom.window.localStorage; document.cookie = 'DedeUserID=123';
  const delays = { ...CONFIG.DELAY }; Object.keys(CONFIG.DELAY).forEach(key => { CONFIG.DELAY[key] = 0; });
  t.after(() => { Object.assign(CONFIG.DELAY, delays); dom.window.close(); });
  let opens = 0, submissions = 0, wrongSubmissions = 0, title = '';
  const form = document.querySelector('.edit-mask');
  document.querySelector('.nav-add').onclick = () => { beforeOpen(); opens++; title = ''; form.querySelector('input').value = ''; form.style.display = ''; };
  form.querySelector('input').addEventListener('input', event => { title = event.target.value; });
  form.querySelector('.submit-btn').onclick = () => {
    submissions++; assert.ok(title, 'native v-model received input events');
    if (confirm) setTimeout(() => {
      const row = document.createElement('div'); row.className = 'fav-item';
      const link = document.createElement('a'); link.className = 'text'; link.textContent = title;
      row.append(link); document.querySelector('#fav-createdList-container').append(row); form.style.display = 'none';
    }, 10);
  };
  document.querySelector('.fav-add-btn').onclick = document.querySelector('#unrelated').onclick = () => { wrongSubmissions++; };
  t.mock.method(BilibiliAPI, 'clickCopyButton', async () => assert.fail('empty page must not need copy controls'));
  t.mock.method(BilibiliAPI, 'clickSelectAll', () => assert.fail('empty page has no video to select'));
  return { manager: new FavoriteManager(), counts: () => ({ opens, submissions, wrongSubmissions }) };
}

test('legacy empty-own-space preparation creates both targets directly and reuses normalized existing names', async t => {
  const f = emptyOwnSpace(t);
  t.mock.method(f.manager.crossPageFlow, 'createViaCopyDialog', async () => assert.fail('sidebar creation must not fall back'));
  assert.equal(await f.manager.crossPageFlow.batchCreateFavorites([' First target ', 'Second target']), true);
  assert.deepEqual(f.counts(), { opens: 2, submissions: 2, wrongSubmissions: 0 });
  assert.equal(await f.manager.crossPageFlow.createSingleFavorite(' First target '), true);
  assert.equal(f.counts().submissions, 2);
  assert.deepEqual(f.manager.getAllFavoriteNames(), ['Empty default', 'First target', 'Second target']);
});

test('legacy webpage creator uses the independent visible form and a denied guard cannot submit', async t => {
  const f = emptyOwnSpace(t);
  assert.equal((await f.manager.web.create(' Web target ')).status, 'confirmed');
  assert.equal(await BilibiliAPI.createFavoriteViaSidebar('Guarded target', () => false), false);
  assert.deepEqual(f.counts(), { opens: 1, submissions: 1, wrongSubmissions: 0 });
});

test('an already open legacy Edit form cannot be mistaken for a fresh creation form', async t => {
  const f = emptyOwnSpace(t); document.querySelector('.edit-mask').style.display = '';
  assert.equal(await BilibiliAPI.createFavoriteViaSidebar('Do not edit'), false);
  assert.deepEqual(f.counts(), { opens: 0, submissions: 0, wrongSubmissions: 0 });
});

test('unconfirmed legacy sidebar submission stops later creations without switching to copy dialog', async t => {
  const f = emptyOwnSpace(t, { confirm: false }), wait = BilibiliAPI.waitForFavorite.bind(BilibiliAPI);
  t.mock.method(BilibiliAPI, 'waitForFavorite', (name, inDialog) => wait(name, inDialog, 25));
  t.mock.method(f.manager.crossPageFlow, 'createViaCopyDialog', async () => assert.fail('uncertain create must not submit again'));
  assert.equal(await f.manager.crossPageFlow.batchCreateFavorites(['First target', 'Second target']), false);
  assert.deepEqual(f.counts(), { opens: 1, submissions: 1, wrongSubmissions: 0 });
});

test('empty-space resumed preparation consumes its handoff before opening sidebar creation', async t => {
  let pending = { phase: 'creating', actorId: '123', returnURL: 'https://space.bilibili.com/456/favlist', tasks: [{ source: 'Source', target: 'New target' }] }, saved;
  const f = emptyOwnSpace(t, { beforeOpen: () => assert.equal(pending, null) });
  t.mock.method(StateManager, 'loadState', () => pending);
  t.mock.method(StateManager, 'clearState', () => { pending = null; });
  t.mock.method(StateManager, 'saveState', value => { saved = value; });
  t.mock.method(f.manager.crossPageFlow, 'createViaCopyDialog', async () => assert.fail('empty preparation uses the sidebar'));
  assert.equal(await f.manager.crossPageFlow.resumeFlow(), true);
  assert.equal(saved.phase, 'copying'); assert.equal(f.manager.operation.state.status, 'waiting');
  assert.deepEqual(f.counts(), { opens: 1, submissions: 1, wrongSubmissions: 0 });
});
