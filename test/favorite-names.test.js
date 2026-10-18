import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { BilibiliAPI } from '../src/core/BilibiliAPI.js';
import { FavoriteManager } from '../src/core/FavoriteManager.js';
import { StateManager } from '../src/core/StateManager.js';
import { PageDetector } from '../src/core/PageDetector.js';
import { CONFIG } from '../src/config/config.js';

function page(t, html) {
  const dom = new JSDOM(html, { url: 'https://space.bilibili.com/123/favlist' });
  for (const key of ['window', 'document', 'Node', 'Event', 'KeyboardEvent']) {
    globalThis[key] = key === 'window' ? dom.window : dom.window[key];
  }
  const delays = { ...CONFIG.DELAY };
  for (const key of Object.keys(CONFIG.DELAY)) CONFIG.DELAY[key] = 0;
  t.after(() => { Object.assign(CONFIG.DELAY, delays); dom.window.close(); });
  return dom;
}

const legacy = '<div id="fav-createdList-container"></div>';
const row = name => `<div class="target-favitem"><span class="fav-name">${name}</span><input class="fav-select" type="radio"></div>`;

for (const vui of [false, true]) {
  test(`${vui ? '新版' : '旧版'}：目标名首尾空白不触发重建，内部连续空格仍区分`, t => {
    page(t, vui
      ? '<div class="favlist-aside"></div><div class="vui_dialog--content fav-modify-modal-content"><div class="modify-fav-item"><span class="modify-fav-item__title">学习  资料</span><input type="radio" class="vui_radio--input-original"></div></div>'
      : `${legacy}<div class="edit-video-modal">${row('学习  资料')}</div>`);
    const dialog = document.querySelector(vui ? '.vui_dialog--content' : '.edit-video-modal');
    assert.equal(BilibiliAPI.isFavoriteExistInDialog(dialog, ' \u3000学习  资料\u00a0'), true);
    assert.equal(BilibiliAPI.selectFavoriteInDialog(dialog, ' 学习  资料 '), true);
    assert.equal(dialog.querySelector('input').checked, true);
    assert.equal(BilibiliAPI.isFavoriteExistInDialog(dialog, '学习 资料'), false);
  });
}

test('创建入口复用已存在的名称；空白名称不会点击新建', async t => {
  page(t, `${legacy}<div class="edit-video-modal">${row('学习 资料')}<button class="fake-fav-input"></button></div>`);
  let clicks = 0;
  document.querySelector('button').onclick = () => clicks++;
  const manager = new FavoriteManager();
  const dialog = document.querySelector('.edit-video-modal');
  assert.equal(await manager.createNewFavorite(dialog, ' 学习 资料 '), true);
  assert.equal(await manager.createNewFavorite(dialog, ' \u3000 '), false);
  assert.equal(clicks, 0);
});

test('新建只提交一次，等待异步更新后的真实列表再返回成功', async t => {
  page(t, `${legacy}<div class="edit-video-modal"><button class="fake-fav-input"></button><input class="add-fav-input"><button class="fav-add-btn"></button></div>`);
  let submits = 0, submittedName;
  document.querySelector('.fav-add-btn').onclick = () => {
    submits++;
    submittedName = document.querySelector('.add-fav-input').value;
    setTimeout(() => {
      const old = document.querySelector('.edit-video-modal');
      old.outerHTML = `<div class="edit-video-modal">${row('学习  资料')}</div>`;
    }, 20);
  };
  const manager = new FavoriteManager();
  assert.equal(await manager.createNewFavorite(document.querySelector('.edit-video-modal'), ' 学习  资料 '), true);
  assert.equal(BilibiliAPI.isFavoriteExistInDialog(document.querySelector('.edit-video-modal'), '学习  资料'), true);
  assert.equal(submits, 1);
  assert.equal(submittedName, '学习  资料');
});

test('实际复制复用含空格的目标，不打开新建表单', async t => {
  page(t, `${legacy}<div class="edit-video-modal">${row('学习 资料')}<button class="fake-fav-input"></button><div class="modal-footer"><button class="btn">确定</button></div></div>`);
  const manager = new FavoriteManager();
  t.mock.method(BilibiliAPI, 'ensureBatchModeActive', async () => true);
  t.mock.method(BilibiliAPI, 'clickSelectAll', () => true);
  t.mock.method(BilibiliAPI, 'clickCopyButton', async () => true);
  let creates = 0, copies = 0;
  document.querySelector('.fake-fav-input').onclick = () => creates++;
  document.querySelector('.btn').onclick = () => {
    copies++;
    const toast = document.createElement('div'); toast.className = 'vui_toast'; toast.textContent = '操作成功'; document.body.append(toast);
  };
  assert.equal(await manager.copyOnePage(' 学习 资料 '), true);
  assert.equal(creates, 0);
  assert.equal(copies, 1);
  assert.equal(document.querySelector('input').checked, true);
});

test('新建提交后列表未出现目标，返回失败而非宣告成功', async t => {
  page(t, `${legacy}<div class="edit-video-modal"><button class="fake-fav-input"></button><input class="add-fav-input"><button class="fav-add-btn"></button></div>`);
  const wait = BilibiliAPI.waitForFavorite.bind(BilibiliAPI);
  t.mock.method(BilibiliAPI, 'waitForFavorite', (name, inDialog) => wait(name, inDialog, 25));
  let submits = 0;
  document.querySelector('.fav-add-btn').onclick = () => submits++;
  assert.equal(await new FavoriteManager().createNewFavorite(document.querySelector('.edit-video-modal'), '学习 资料'), false);
  assert.equal(submits, 1);
});

test('新版侧栏新建等待列表更新；旧版缺少侧栏入口时允许回退', async t => {
  page(t, '<div class="favlist-aside"><span>我创建的收藏夹</span><button>新建收藏夹</button></div><input class="add-fav-input"><button id="submit">创建</button>');
  let submits = 0;
  document.querySelector('#submit').onclick = () => {
    submits++;
    setTimeout(() => document.querySelector('.favlist-aside').insertAdjacentHTML('beforeend', '<div class="vui_sidebar-item"><div class="vui_sidebar-item-title"><span class="vui_ellipsis">学习 资料</span></div></div>'), 20);
  };
  assert.equal(await BilibiliAPI.createFavoriteViaSidebar(' 学习 资料 '), true);
  assert.equal(submits, 1);
  assert.equal(await BilibiliAPI.createFavoriteViaSidebar('学习 资料'), true);
  assert.equal(submits, 1);
  document.body.innerHTML = legacy;
  assert.equal(await BilibiliAPI.createFavoriteViaSidebar('学习 资料'), null);
  const manager = new FavoriteManager();
  let fallbacks = 0;
  t.mock.method(manager.crossPageFlow, 'createViaCopyDialog', async () => { fallbacks++; return true; });
  assert.equal(await manager.crossPageFlow.createSingleFavorite('学习 资料'), true);
  assert.equal(fallbacks, 1);
});

test('跨页准备时对首尾空白去重，已存在目标不会再次新建', async t => {
  page(t, legacy);
  t.mock.method(PageDetector, 'isOwnPage', () => true);
  t.mock.method(StateManager, 'loadState', () => ({ phase: 'creating', returnURL: window.location.href,
    tasks: [{ source: '源', target: ' 学习 资料 ' }, { source: '源2', target: '新 目标 ' }, { source: '源3', target: ' 新 目标' }] }));
  let cleared = 0, saved;
  t.mock.method(StateManager, 'clearState', () => cleared++);
  t.mock.method(StateManager, 'saveState', state => { saved = state; });
  const manager = new FavoriteManager();
  t.mock.method(manager, 'getAllFavoriteNames', () => ['学习 资料']);
  t.mock.method(manager.crossPageFlow, 'batchCreateFavorites', async names => {
    assert.deepEqual(names, ['新 目标']);
    assert.equal(cleared, 1, '执行前消费状态，刷新不能自动重放');
    return true;
  });
  assert.equal(await manager.crossPageFlow.resumeFlow(), true);
  assert.deepEqual(saved.tasks.map(task => task.target), ['学习 资料', '新 目标', '新 目标']);
});

test('侧栏已尝试但未确认成功时停止，不换入口再次提交', async t => {
  page(t, legacy);
  t.mock.method(BilibiliAPI, 'createFavoriteViaSidebar', async () => false);
  const manager = new FavoriteManager();
  t.mock.method(manager.crossPageFlow, 'createViaCopyDialog', async () => assert.fail('不能重复提交'));
  assert.equal(await manager.crossPageFlow.createSingleFavorite('新 目标'), false);
});

test('批量任务预先拒绝空名称，失败后停止后续任务', async t => {
  page(t, legacy);
  const manager = new FavoriteManager();
  let calls = 0;
  t.mock.method(manager, 'copyFavorite', async (source, target) => {
    calls++;
    assert.equal(target, '学习 资料');
    return false;
  });
  await assert.rejects(manager.batchCopy([{ source: '源', target: '学习 资料' }, { source: '源2', target: ' \u3000 ' }], { skipCrossPage: true }), /名称/);
  assert.equal(calls, 0);
  await assert.rejects(manager.batchCopy([{ source: '源', target: ' 学习 资料 ' }, { source: '源2', target: '学习 资料' }], { skipCrossPage: true }), /失败/);
  assert.equal(calls, 1);
});

test('恢复复制抛错也不保留状态，刷新不会重新执行', async t => {
  page(t, legacy);
  let pending = { phase: 'copying', returnURL: window.location.href, tasks: [{ source: '源', target: '目标' }] };
  t.mock.method(StateManager, 'loadState', () => pending);
  t.mock.method(StateManager, 'clearState', () => { pending = null; });
  const manager = new FavoriteManager();
  let calls = 0;
  t.mock.method(manager, 'batchCopy', async () => { calls++; throw new Error('失败'); });
  await assert.rejects(manager.crossPageFlow.resumeFlow(), /失败/);
  assert.equal(await manager.crossPageFlow.resumeFlow(), false);
  assert.equal(calls, 1);
});
