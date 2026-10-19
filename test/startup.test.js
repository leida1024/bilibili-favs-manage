import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { PageLifecycle } from '../src/core/PageLifecycle.js';
import { BilibiliAPI } from '../src/core/BilibiliAPI.js';
import { getPageAdapter } from '../src/core/adapters/index.js';
import { FloatingPanel } from '../src/ui/FloatingPanel.js';
import { FavoriteManager } from '../src/core/FavoriteManager.js';
import { setLoggerPanel } from '../src/utils/logger.js';
import { StateManager } from '../src/core/StateManager.js';

function page(html = '') {
  const dom = new JSDOM(html, { url: 'https://space.bilibili.com/123/favlist?fid=1' });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  setLoggerPanel(null);
  return dom;
}
const legacy = '<div id="fav-createdList-container"><div class="fav-item"><a class="text">源收藏夹</a></div></div>';

test('旧版只读取创建收藏夹，排除导航和订阅；VUI 分组过滤保持有效', () => {
  page(`<a href="/123/favlist">导航</a>${legacy}<div class="fav-item"><a class="text">订阅</a></div>`);
  assert.equal(getPageAdapter().name, '旧版个人空间');
  assert.deepEqual(BilibiliAPI.getAllFavorites().map(el => BilibiliAPI.getFavoriteName(el)), ['源收藏夹']);
  page(`<div class="favlist-aside"><div><span>我创建的收藏夹</span></div>
    <div class="vui_sidebar-item"><div class="vui_sidebar-item-title"><span class="vui_ellipsis">我的</span></div></div>
    <span>我追的合集/收藏夹</span>
    <div class="vui_sidebar-item"><div class="vui_sidebar-item-title"><span class="vui_ellipsis">订阅</span></div></div></div>`);
  assert.equal(getPageAdapter().name, '新版 (VUI)');
  assert.deepEqual(BilibiliAPI.getAllFavorites().map(el => BilibiliAPI.getFavoriteName(el)), ['我的']);
});

test('慢加载超过提示时间仍可启动；同用户切换 fid 不重复启动；SPA 离开重进可恢复', () => {
  page();
  let time = 0, mounts = 0, notices = 0, refreshes = 0, unmounts = 0;
  const lifecycle = new PageLifecycle({ mount: () => mounts++, unmount: () => unmounts++,
    notify: () => notices++, refresh: () => refreshes++, now: () => time });
  lifecycle.tick();
  time = 16000;
  lifecycle.tick(); lifecycle.tick();
  assert.equal(notices, 1);
  document.body.innerHTML = legacy;
  lifecycle.tick(); lifecycle.tick();
  assert.equal(mounts, 1);
  window.history.pushState({}, '', '?fid=2'); lifecycle.tick();
  assert.equal(mounts, 1);
  document.querySelector('a.text').textContent = '新名称'; lifecycle.tick();
  assert.equal(refreshes, 1);
  window.history.pushState({}, '', '/123/video'); lifecycle.tick();
  window.history.pushState({}, '', '/123/favlist'); lifecycle.tick();
  assert.equal(mounts, 2);
  assert.equal(unmounts, 3);
});

test('收藏夹列表异步更新时保留用户勾选和目标名；销毁清理监听', () => {
  page(legacy);
  const panel = new FloatingPanel(new FavoriteManager());
  panel.init();
  panel.favCheckboxItemList[0].checkbox.checked = true;
  panel.favCheckboxItemList[0].inputText.value = '目标';
  document.querySelector('#fav-createdList-container').insertAdjacentHTML('beforeend', '<div class="fav-item"><a class="text">新收藏夹</a></div>');
  panel.refreshFavorites();
  assert.deepEqual(panel.getSelectedTasks(), [{ source: '源收藏夹', target: '目标' }]);
  assert.equal(panel.favCheckboxItemList.length, 2);
  panel.destroy();
  assert.doesNotThrow(() => document.body.dispatchEvent(new window.MouseEvent('mousemove')));
});

test('旧版全选保持幂等；隐藏的预渲染对话框不能当成已打开', async () => {
  page(`${legacy}<div class="fav-action-bottom"><li><i class="icon-selece-all-active"></i></li></div>
    <div class="edit-video-modal" style="display:none"></div>`);
  let clicks = 0;
  document.querySelector('li').addEventListener('click', () => clicks++);
  BilibiliAPI.clickSelectAll(); BilibiliAPI.clickSelectAll();
  assert.equal(clicks, 0);
  const dialog = document.querySelector('.edit-video-modal');
  const waiting = BilibiliAPI.waitForDialog();
  setTimeout(() => { dialog.style.display = ''; }, 10);
  assert.equal(await waiting, dialog);
});

test('构建产物可在 document 未完成、load 未触发时创建唯一面板', async () => {
  const dom = new JSDOM(legacy, { url: 'https://space.bilibili.com/123/favlist', runScripts: 'outside-only' });
  const bundle = readFileSync(new URL('../dist/BilibiliFavsManage.user.js', import.meta.url), 'utf8');
  assert.match(bundle, /@run-at\s+document-start/);
  dom.window.GM_getValue = () => null;
  dom.window.eval(bundle);
  dom.window.eval(bundle);
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(dom.window.document.querySelectorAll('.bili-favs-manage-panel').length, 1);
  dom.window.close();
});

test('跨页面状态不会在无关用户的收藏页恢复', async () => {
  page(legacy);
  document.cookie = 'DedeUserID=456';
  const originalLoad = StateManager.loadState;
  const manager = new FavoriteManager();
  manager.batchCopy = () => { throw new Error('不应在此页面执行复制'); };
  manager.crossPageFlow.batchCreateFavorites = () => { throw new Error('不应在此页面创建'); };
  try {
    StateManager.loadState = () => ({ phase: 'creating', tasks: [{ source: '源', target: '目标' }] });
    assert.equal(await manager.crossPageFlow.resumeFlow(), false);
    StateManager.loadState = () => ({ phase: 'copying', returnURL: 'https://space.bilibili.com/789/favlist', tasks: [] });
    assert.equal(await manager.crossPageFlow.resumeFlow(), false);
  } finally {
    StateManager.loadState = originalLoad;
  }
});

test('油猴 Window 代理拒绝删除属性时仍能启动、离开和重新打开面板', async () => {
  const dom = new JSDOM(legacy, { url: 'https://space.bilibili.com/123/favlist' });
  dom.window.document.body.remove();
  const bundle = readFileSync(new URL('../dist/BilibiliFavsManage.user.js', import.meta.url), 'utf8');
  const errors = [];
  const sandbox = new Proxy(dom.window, {
    deleteProperty() { return false; },
    get(target, key) {
      if (key === 'setInterval') return () => 0;
      if (key === 'addEventListener') return target.addEventListener.bind(target);
      return Reflect.get(target, key);
    },
    set(target, key, value) { return Reflect.set(target, key, value); }
  });
  const run = new Function('window', 'document', 'GM_getValue', 'console', bundle);
  try {
    run(sandbox, dom.window.document, () => null, { log() {}, error: (...args) => errors.push(args) });
    assert.deepEqual(errors, []);
    assert.equal(dom.window.document.querySelectorAll('.bili-favs-manage-panel').length, 0);
    const body = dom.window.document.createElement('body');
    body.innerHTML = legacy;
    dom.window.document.documentElement.appendChild(body);
    sandbox.__biliFavsLifecycle.tick();
    assert.equal(dom.window.document.querySelectorAll('.bili-favs-manage-panel').length, 1);
    dom.window.history.pushState({}, '', '/123/video');
    sandbox.__biliFavsLifecycle.tick();
    assert.equal(dom.window.document.querySelectorAll('.bili-favs-manage-panel').length, 0);
    assert.equal(sandbox.BiliFavPanel, null);
    dom.window.history.pushState({}, '', '/123/favlist');
    sandbox.__biliFavsLifecycle.tick();
    assert.equal(dom.window.document.querySelectorAll('.bili-favs-manage-panel').length, 1);
    sandbox.__biliFavsLifecycle.reopen();
    assert.equal(dom.window.document.querySelectorAll('.bili-favs-manage-panel').length, 1);
    await Promise.resolve();
  } finally {
    sandbox.BiliFavPanel?.destroy();
    dom.window.close();
  }
});
