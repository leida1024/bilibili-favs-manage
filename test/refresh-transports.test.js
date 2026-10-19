import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { LogStore } from '../src/utils/logStore.js';
import { browserStore, panelPreferences, defaultModes } from '../src/utils/preferences.js';
import { FloatingPanel } from '../src/ui/FloatingPanel.js';
import { EventHandlers } from '../src/ui/EventHandlers.js';
import { FolderClient, normalizeFolder } from '../src/core/FolderClient.js';
import { WebFolderClient } from '../src/core/WebFolderClient.js';
import { TransportClient } from '../src/core/TransportClient.js';
import { ApiCopyFlow } from '../src/core/ApiCopyFlow.js';
import { BatchOperations } from '../src/core/BatchOperations.js';
import { InventoryService } from '../src/core/InventoryService.js';
import { FavoriteManager } from '../src/core/FavoriteManager.js';

function realm(t, html = '') {
  const dom = new JSDOM(html, { url: 'https://space.bilibili.com/50/favlist' });
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  document.cookie = 'DedeUserID=50'; document.cookie = 'bili_jct=synthetic-only';
  t.after(() => dom.window.close()); return dom;
}
const folder = (id = '100', extra = {}) => ({ id, ownerId: '50', name: 'Source', kind: 'created', count: 21, available: true, protected: false, protectionReason: null, ...extra });

test('refresh retains bounded sanitized tab diagnostics, clear persists and corrupt/denied storage is inert', t => {
  realm(t); const storage = browserStore('sessionStorage', 'test-records');
  const first = new LogStore(2, storage); first.add('old'); first.add('token=secret'); first.add('current');
  const restored = new LogStore(2, storage);
  assert.equal(restored.entries.length, 2); assert.equal(restored.dropped, 1); assert.doesNotMatch(restored.export(), /secret/);
  const handoff = first.snapshot();
  assert.equal(restored.context.view, 'system'); restored.clear(); restored.restore(handoff);
  assert.equal(restored.dropped, 0);
  assert.equal(new LogStore(2, storage).entries.length, 0, 'cleared handoff records must not return');
  window.sessionStorage.setItem('test-records', '{bad'); assert.equal(new LogStore(2, storage).entries.length, 0);
  const denied = { read() { throw Error('denied'); }, write() { throw Error('quota'); } };
  const memory = new LogStore(2, denied); memory.add('works'); memory.clear(); assert.equal(memory.entries.length, 0);
  const manager = new FavoriteManager(); manager.logs.add('same account');
  assert.ok(new FavoriteManager().logs.entries.some(x => x.message === 'same account'));
  document.cookie = 'DedeUserID=60'; assert.equal(new FavoriteManager().logs.entries.length, 0);
});

test('tiny panel can be enlarged again through its grip even while the pointer is over documentElement', t => {
  realm(t); const p = new FloatingPanel({ getAllFavoriteNames: () => [] }); p.init(); t.after(() => p.destroy());
  Object.assign(p.floatingPanel.style, { left:'24px', top:'24px', width:'280px', height:'64px' });
  p.floatingPanel.getBoundingClientRect = () => ({ left:24, top:24, width:parseFloat(p.floatingPanel.style.width), height:parseFloat(p.floatingPanel.style.height) });
  p.resizeGrip.dispatchEvent(new window.MouseEvent('mousedown', { button:0, clientX:300, clientY:84, bubbles:true }));
  document.documentElement.dispatchEvent(new window.MouseEvent('mousemove', { clientX:620, clientY:504, bubbles:true }));
  document.documentElement.dispatchEvent(new window.MouseEvent('mouseup', { bubbles:true }));
  assert.equal(p.floatingPanel.style.width, '600px'); assert.equal(p.floatingPanel.style.height, '484px'); assert.equal(p.resizeable, false);
  p.toggleMinimize(); assert.equal(p.minimizeButton.title, '恢复面板');
  assert.equal(p.minimizeButton.getAttribute('aria-label'), p.minimizeButton.title);
  p.toggleMinimize(); assert.equal(p.minimizeButton.title, '最小化'); assert.equal(p.floatingPanel.style.height, '484px');
});

test('unavailable subscribed seasons with unknown owner allow confirmed API unsubscribe but stay unavailable for statistics', async t => {
  realm(t); const target = normalizeFolder({ id:100, type:21, mid:0, upper:{mid:0}, title:'Unavailable fictional season', state:1 }, 'subscribed', 0, true);
  const posts = [], client = new FolderClient(async (url, options) => { posts.push(url); return { ok:true, json:async()=>({code:0}) }; });
  client.folders = async () => [target];
  const engine = new BatchOperations(client, () => ({actor:'50',pageOwner:'50'}), 0);
  const manager = { getAllFavoriteNames:()=>[], inventory:new InventoryService(client,0), batchOperations:engine, modes:{...defaultModes,manage:'api'} };
  const p = new FloatingPanel(manager); p.init(); t.after(()=>p.destroy());
  p.showView('manage'); const ui=p.inventoryPanel; ui.kind.value='subscribed'; await ui.load();
  const m=ui.mutations; assert.equal(m.rows[0].input.disabled,false); assert.match(m.rows[0].node.textContent,/内容已失效/);
  m.rows[0].input.checked=true; m.preview(); assert.match(m.review.textContent,/所有者 未知/);
  m.agreement.checked=true; await m.execute(); assert.equal(posts.length,1); assert.match(posts[0],/season_id=100/);
  p.showView('statistics'); await ui.load(); assert.equal(ui.rows[0].input.disabled,true);
  manager.modes.manage='web'; p.showView('manage'); m.rows[0].input.checked=true; m.preview();
  assert.match(m.review.textContent,/设置.*API/); assert.equal(m.ticket,null); assert.equal(posts.length,1);
});

test('panel geometry/visibility survive recreation; minimized height and invalid preferences are safe', t => {
  realm(t); const manager = { getAllFavoriteNames: () => ['Fictional'] };
  const first = new FloatingPanel(manager); first.init();
  Object.assign(first.floatingPanel.style, { width: '620px', height: '470px', left: '60px', top: '70px' });
  first.toggleMinimize(); first.destroy();
  const second = new FloatingPanel(manager); second.init();
  assert.equal(second.floatingPanel.style.width, '620px'); assert.equal(second.floatingPanel.style.height, '470px');
  second.toggleLogs(); const collapsed = second.floatingPanel.style.width; second.destroy();
  const third = new FloatingPanel(manager); third.init();
  assert.equal(third.logsOpen, false); assert.equal(third.floatingPanel.style.width, collapsed);
  third.toggleLogs(); assert.equal(third.floatingPanel.style.width, '620px'); third.destroy();
  window.localStorage.setItem('bili-favs-panel-v1', JSON.stringify({ version: 1, geometry: { width: -1, height: 10, left: 'bad', top: 0 }, modes: { copy: 'arbitrary' } }));
  assert.equal(panelPreferences().geometry, null); assert.deepEqual(panelPreferences().modes, defaultModes);
});

test('unavailable subscriptions open a target preview in default web mode and explain the explicit API requirement', async t => {
  realm(t); const manager = new FavoriteManager(); manager.getAllFavoriteNames = () => [];
  Object.assign(manager.modes, { read: 'api', manage: 'web' }); let reads = 0;
  manager.http.fetcher = async (_, options) => {
    assert.notEqual(options.method, 'POST', 'preview must not submit or change transport'); reads++;
    return { ok: true, json: async () => ({ code: 0, data: { count: 2, has_more: false, list: [100, 101].map((id, i) =>
      ({ id, type: i ? 11 : 21, mid: 0, title: 'Unavailable', state: 1, fav_state: 0, media_count: 0 })) } }) };
  };
  const p = new FloatingPanel(manager); p.init(); t.after(() => p.destroy()); p.showView('manage');
  const ui = p.inventoryPanel; ui.kind.value = 'subscribed'; await ui.load(); const m = ui.mutations;
  for (const row of m.rows) { assert.equal(row.input.disabled, false); row.input.click(); }
  assert.equal(m.previewButton.disabled, false); m.previewButton.click();
  assert.match(m.review.textContent, /ID 100/); assert.match(m.review.textContent, /ID 101/);
  assert.match(m.review.textContent, /设置.*API/); assert.equal(m.ticket, null); assert.equal(manager.batchOperations.ticket, null);
  assert.equal(m.confirmButton, null); assert.equal(reads, 1); assert.equal(manager.modes.manage, 'web');
  assert.ok(manager.logs.entries.some(entry => /网页.*失效.*ID/.test(entry.message)));
  [...m.review.querySelectorAll('button')].find(button => button.textContent === '前往设置').click();
  assert.equal(p.activeView, 'settings'); assert.equal(manager.modes.manage, 'web'); assert.equal(reads, 1);
  p.modeChoices.get('manage').value = 'api'; p.saveModesButton.click(); p.showView('manage');
  assert.equal(m.selected().length, 2, 'saving mode preserves the explicit selection without reloading');
  assert.equal(m.ticket, null); m.previewButton.click();
  assert.deepEqual(m.ticket.targets.map(target => target.id), ['100', '101']);
  assert.equal(m.confirmButton.disabled, true); assert.equal(reads, 1);
});

test('resize rejects outside coordinates, header buttons do not drag, title has threshold and keyboard alternative', t => {
  realm(t); const p = new FloatingPanel({ getAllFavoriteNames: () => [] }); p.init(); t.after(() => p.destroy());
  p.floatingPanel.getBoundingClientRect = () => ({ left: 24, top: 24, right: 624, bottom: 524, width: 600, height: 500 });
  assert.equal(EventHandlers.getDirection(p, { clientX: 30, clientY: 20 }), '');
  assert.equal(EventHandlers.getDirection(p, { clientX: 30, clientY: 26 }), 'n');
  const down = target => ({ target, button: 0, clientX: 60, clientY: 45, preventDefault() {} });
  EventHandlers.mouseDown(p, down(p.logsButton)); assert.equal(p.dragStart, undefined);
  EventHandlers.mouseDown(p, down(p.header)); EventHandlers.dragOnPanel(p, { clientX: 61, clientY: 45 }); assert.equal(p.isDragging, undefined);
  EventHandlers.dragOnPanel(p, { clientX: 70, clientY: 45 }); assert.equal(p.isDragging, true);
  p.floatingPanel.style.left = '24px';
  p.floatingPanel.getBoundingClientRect = () => ({ left: parseFloat(p.floatingPanel.style.left), top: 24, width: 600, height: 500 });
  p.header.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  assert.equal(p.floatingPanel.style.left, '34px');
});

test('independent read/write modes are captured in a one-use ticket and never fail over', async () => {
  const calls = []; const target = folder('100', { kind: 'subscribed', ownerId: '90', subscribed: true });
  const make = name => ({ folders: async () => { calls.push(name + '-read'); return [target]; }, mutate: async () => { calls.push(name + '-write'); return { status: 'unknown' }; } });
  const modes = { read: 'api', manage: 'web' }, client = new TransportClient(make('api'), make('web'), modes);
  const engine = new BatchOperations(client, () => ({ actor: '50', pageOwner: '50' }), 0);
  const ticket = engine.prepare('unsubscribe', [target]); modes.manage = 'api'; modes.read = 'web';
  const report = await engine.execute(ticket, { confirmed: true });
  assert.deepEqual(calls, ['api-read', 'web-write']); assert.equal(report.results[0].status, 'unknown');
  await assert.rejects(engine.execute(ticket, { confirmed: true })); assert.equal(calls.length, 2);
});

test('real subscription shapes use complete membership, preserve season identity, and stop changing/repeated pagination', async t => {
  realm(t); let posts = [], changing = false;
  const client = new FolderClient(async (url, options) => {
    if (options.method === 'POST') { posts.push(url); return { ok: true, json: async () => ({ code: 0 }) }; }
    const pn = Number(new URL(url).searchParams.get('pn'));
    return { ok: true, json: async () => ({ code: 0, data: { count: changing && pn === 2 ? 3 : 2,
      list: [{ id: 100, mid: 90, upper: { mid: 90 }, type: pn === 1 ? 11 : 21, title: 'Same', state: 0, fav_state: 0 }], has_more: pn === 1 } }) };
  });
  const rows = await client.folders('50', 'subscribed', undefined, 0);
  assert.deepEqual(rows.map(x => x.kind), ['subscribed', 'season']); assert.ok(rows.every(x => x.subscribed));
  const engine = new BatchOperations(client, () => ({ actor: '50', pageOwner: '50' }), 0); assert.ok(engine.prepare('unsubscribe', rows));
  await client.mutate('unsubscribe', rows[1]); assert.match(posts[0], /season\/unfav\?season_id=100/);
  changing = true; await assert.rejects(client.folders('50', 'subscribed', undefined, 0), /变化/);
});

test('season statistics normalize missing type/has_more without inventing metadata', async () => {
  let reads = 0;
  const client = new FolderClient(async () => { reads++; return { ok: true, json: async () => ({ code: 0, data: { info: { id: 100, media_count: 31 },
    medias: Array.from({ length: 31 }, (_, n) => ({ id: n + 1, duration: null })) } }) }; });
  const report = await new InventoryService(client, 0).scan([folder('100', { kind: 'season' })]);
  assert.equal(report.complete, true); assert.equal(report.uniqueVideos, 31); assert.equal(report.unknownDurations, 31); assert.equal(reads, 1);
});

function apiFixture() {
  const source = folder(), target = folder('200', { name: 'Target', count: 0 }); const calls = [];
  let targets = [], outcome = { status: 'confirmed' }, context = { actor: '50', pageOwner: '50' };
  const client = { folders: async () => [source, ...targets], videos: async (_, pn) => ({ info: { id: 100, media_count: 21 }, has_more: pn === 1,
    medias: Array.from({ length: pn === 1 ? 20 : 1 }, (_, n) => ({ id: (pn - 1) * 20 + n + 1, type: 2 })) }),
    create: async name => { calls.push('create:' + name); targets = [target]; return outcome; },
    copy: async (_, __, ids) => { calls.push(ids); return outcome; } };
  return { client, calls, source, target, flow: new ApiCopyFlow(client, () => context, 0), setOutcome: value => outcome = value,
    changeActor: () => context = { actor: '60', pageOwner: '50' }, setTargets: value => targets = value };
}

test('API copy snapshots all source pages before creating, uses batches of20 and explicit creator', async () => {
  const f = apiFixture(), progress = [];
  const creator = { create: async name => { f.calls.push('web-creator'); return f.client.create(name); } };
  await f.flow.run([{ source: ' Source ', target: 'Target' }], { creator, onProgress: e => progress.push(e) });
  assert.deepEqual(f.calls.slice(0, 2), ['web-creator', 'create:Target']);
  assert.deepEqual(f.calls.slice(2).map(x => x.length), [20, 1]); assert.equal(progress.at(-1).complete, true);
});

test('API copy rejects incomplete sources/ambiguous names/self-copy before writes, stops unknown and account changes', async () => {
  const f = apiFixture(); f.client.videos = async () => ({ info: { id: 100, media_count: 2 }, medias: [{ id: 1, type: 2 }], has_more: false });
  await assert.rejects(f.flow.run([{ source: 'Source', target: 'Target' }]), /不完整/); assert.equal(f.calls.length, 0);
  const g = apiFixture(); await assert.rejects(g.flow.run([{ source: 'Source', target: 'Source' }]), /相同/); assert.equal(g.calls.length, 0);
  const h = apiFixture(); h.setTargets([h.target, { ...h.target, id: '201' }]);
  await assert.rejects(h.flow.run([{ source: 'Source', target: 'Target' }]), /同名/); assert.equal(h.calls.length, 0);
  const u = apiFixture(); u.setTargets([u.target]); u.setOutcome({ status: 'unknown', detail: 'lost response' });
  await assert.rejects(u.flow.run([{ source: 'Source', target: 'Target' }]), e => e.outcome === 'unknown'); assert.equal(u.calls.length, 1);
  const c = apiFixture(); c.setTargets([c.target]);
  await assert.rejects(c.flow.run([{ source: 'Source', target: 'Target' }], { onProgress: () => c.changeActor() }), /账号/); assert.equal(c.calls.length, 1);
});

function nativeFixture(t) {
  realm(t, '<div class="favlist-aside"><div class="vui_collapse_item"><div class="vui_collapse_item_header">我追的合集/收藏夹</div><div class="list"></div><div class="fav-collapse-more">显示剩余1个</div></div></div><div class="favlist-info-detail__title-row"></div><div class="favlist-info-detail__data"><a class="link" href="//space.bilibili.com/90">Author</a><span>视频数: 1</span></div>');
  const group = document.querySelector('.vui_collapse_item'), list = group.querySelector('.list'); let submissions = 0;
  const append = id => {
    const row = document.createElement('div'); row.className = 'fav-sidebar-item';
    row.innerHTML = '<div class="vui_sidebar-item"><div class="vui_ellipsis">Same</div><div class="menu-popover"><i class="more-vertical">⋮</i></div></div>';
    row.querySelector('.vui_sidebar-item').addEventListener('click', () => {
      window.history.replaceState(null, '', `/50/favlist?fid=${id}&ftype=collect&ctype=21`);
      document.querySelector('.favlist-info-detail__title-row').textContent = 'Same';
    });
    row.querySelector('.more-vertical').addEventListener('mouseenter', () => {
      document.querySelector('.menu-popover__panel')?.remove();
      const menu = document.createElement('div'); menu.className = 'menu-popover__panel';
      menu.innerHTML = '<div class="menu-popover__panel-item">取消订阅</div>';
      menu.firstChild.addEventListener('click', () => { submissions++; row.remove(); menu.remove(); }); document.body.append(menu);
    }); list.append(row); return row;
  };
  append('100'); group.querySelector('.fav-collapse-more').addEventListener('click', event => { append('101'); event.target.remove(); });
  document.body.addEventListener('click', () => document.querySelector('.menu-popover__panel')?.remove());
  const client = new WebFolderClient();
  return { client, submissions: () => submissions, append };
}

test('native discovery expands remaining rows and resolves duplicate names by route, unsubscribe uses no HTTP', async t => {
  const f = nativeFixture(t); const originalFetch = globalThis.fetch; globalThis.fetch = () => { throw Error('native must not request HTTP'); };
  t.after(() => { globalThis.fetch = originalFetch; });
  const rows = await f.client.folders('50', 'subscribed');
  assert.deepEqual(rows.map(x => x.id), ['100', '101']); assert.ok(rows.every(x => x.kind === 'season'));
  const freshClient = new WebFolderClient();
  const result = await freshClient.mutate('unsubscribe', rows[1]);
  assert.equal(result.status, 'confirmed'); assert.equal(f.submissions(), 1);
  assert.equal(document.querySelectorAll('.fav-sidebar-item').length, 1);
});

test('native cancellation never submits, missing success is unknown and never retries', async t => {
  const f = nativeFixture(t), rows = await f.client.folders('50', 'subscribed');
  const controller = new AbortController(); controller.abort();
  assert.equal((await f.client.mutate('unsubscribe', rows[0], controller.signal)).status, 'not_started'); assert.equal(f.submissions(), 0);
  const wait = f.client.wait.bind(f.client); let submitted = false;
  f.client.wait = async (check, signal, timeout) => {
    if (submitted) throw Error('synthetic lost result');
    return wait(check, signal, timeout);
  };
  document.body.addEventListener('click', event => { if (event.target.matches('.menu-popover__panel-item')) submitted = true; });
  const result = await f.client.mutate('unsubscribe', rows[0]); assert.equal(result.status, 'unknown'); assert.equal(f.submissions(), 1);
});

test('native delete checks final confirmation and account again; unknown actions never click', async t => {
  realm(t, '<div class="favlist-aside"><div class="vui_collapse_item"><div class="vui_collapse_item_header">我创建的收藏夹</div><div class="fav-sidebar-item">Default</div><div class="fav-sidebar-item" id="target"><div class="vui_sidebar-item"><div class="vui_ellipsis">Source</div><div class="menu-popover"><i class="more-vertical">Menu</i></div></div></div></div></div><div class="favlist-info-detail__title-row">Source</div><div class="favlist-info-detail__data">视频数: 21</div>');
  let submitted=0, switchActor=false;
  const row=document.querySelector('#target');
  row.querySelector('.vui_sidebar-item').onclick=()=>window.history.replaceState(null,'','/50/favlist?fid=100&ftype=create');
  row.querySelector('.more-vertical').onmouseenter=()=>{
    document.querySelector('.menu-popover__panel-item')?.remove();
    const item=document.createElement('div'); item.className='menu-popover__panel-item'; item.textContent='删除';
    item.onclick=()=>{const dialog=document.createElement('div');dialog.className='vui_dialog--content';dialog.innerHTML='<p>删除收藏夹</p><button>确认删除</button>';
      dialog.querySelector('button').onclick=()=>{submitted++;row.remove();dialog.remove();};document.body.append(dialog);if(switchActor)document.cookie='DedeUserID=60';};
    document.body.append(item);
  };
  document.body.addEventListener('click', () => document.querySelector('.menu-popover__panel-item')?.remove());
  const client=new WebFolderClient();
  assert.equal((await client.mutate('invalid',folder())).status,'failed'); assert.equal(submitted,0);
  switchActor=true; assert.equal((await client.mutate('delete',folder())).status,'unknown'); assert.equal(submitted,0);
  document.querySelector('.vui_dialog--content')?.remove(); document.cookie='DedeUserID=50'; switchActor=false;
  assert.equal((await client.mutate('delete',folder())).status,'confirmed'); assert.equal(submitted,1);
});

test('settings are an independent panel, retain dragging/resizing and persist without triggering requests', t => {
  realm(t); const manager = new FavoriteManager(); manager.getAllFavoriteNames = () => [];
  const p = new FloatingPanel(manager); p.init(); t.after(() => p.destroy());
  p.showModeSettings(); const settings = p.settingsRoot;
  assert.equal(p.activeView, 'settings'); assert.equal(p.footer.hidden, true); assert.equal(p.header.inert, undefined);
  assert.equal(settings.querySelectorAll('select').length, 4);
  settings.querySelector('select[aria-label="复制内容"]').value = 'api'; p.saveModesButton.click();
  assert.equal(manager.modes.copy, 'api'); assert.equal(manager.modes.create, 'web');
  assert.equal(panelPreferences().modes.copy, 'api'); assert.equal(p.exportReview, undefined);
  assert.equal(p.logScope.closest('label').firstChild.textContent, '范围');
  assert.equal(p.logFilter.closest('label').firstChild.textContent, '内容');
  p.showView('copy'); p.setBusy(true); p.showModeSettings(); assert.equal(p.activeView, 'copy');
});

test('saving transport settings preserves loaded snapshots, selections, filters and reports without I/O', async t => {
  realm(t); const manager = new FavoriteManager(); manager.getAllFavoriteNames = () => [];
  Object.assign(manager.modes, defaultModes); let apiReads = 0, webReads = 0, apiScans = 0, webScans = 0;
  const targets = [folder('100', { count: 0 }), folder('101', { name: 'Other', count: 0 })];
  manager.http.folders = async () => { apiReads++; return targets; };
  manager.web.folders = async () => { webReads++; return targets; };
  const emptyPage = id => ({ info: { id, media_count: 0 }, medias: [], has_more: false });
  manager.http.videos = async id => { apiScans++; return emptyPage(id); };
  manager.web.videos = async id => { webScans++; return emptyPage(id); };
  const p = new FloatingPanel(manager); p.init(); t.after(() => p.destroy()); p.showView('statistics');
  const ui = p.inventoryPanel, m = ui.mutations; await ui.load(); ui.rows[0].input.click(); await ui.scan();
  m.rows[1].input.click(); ui.selectionTools.search.value = 'Source'; m.selectionTools.search.value = 'Other';
  const report = ui.report, result = ui.result.firstChild, row = ui.rows[0], managed = m.rows[1];
  p.content.scrollTop = 83; p.showModeSettings();
  for (const key of [null, 'copy', 'create', 'manage', 'read']) {
    if (key) p.modeChoices.get(key).value = key === 'read' ? 'web' : 'api';
    p.saveModesButton.click();
    assert.equal(ui.rows[0], row); assert.equal(m.rows[1], managed); assert.equal(ui.folders, targets);
    assert.equal(row.input.checked, true); assert.equal(managed.input.checked, true);
    assert.equal(ui.selectionTools.search.value, 'Source'); assert.equal(m.selectionTools.search.value, 'Other');
    assert.equal(ui.report, report); assert.equal(ui.result.firstChild, result);
    assert.equal(p.viewScroll.get('statistics'), 83); assert.equal(ui.exportButton.disabled, false);
    assert.equal(apiReads, 1); assert.equal(webReads, 0); assert.equal(apiScans, 1); assert.equal(webScans, 0);
  }
  p.showView('manage'); m.previewButton.click();
  assert.equal(m.ticket.transport.mutate instanceof Function, true);
  const ticket = m.ticket; p.saveModesButton.click();
  assert.equal(m.ticket, null); assert.equal(manager.batchOperations.ticket, null);
  await assert.rejects(manager.batchOperations.execute(ticket, { confirmed: true }), /重新预览/);
  p.showView('statistics'); await ui.scan(); assert.equal(webScans, 1); assert.equal(apiScans, 1);
  await ui.load(); assert.equal(webReads, 1); assert.equal(apiReads, 1);
  assert.equal(ui.report, null); assert.equal(ui.selected().length, 0, 'explicit reload still resets the snapshot');
  p.showModeSettings(); p.setBusy(true); p.modeChoices.get('read').value = 'api'; p.saveModesButton.click();
  assert.equal(manager.modes.read, 'web'); p.setBusy(false);
});

test('duplicate typed identities are visible and selection survives filtering and row order changes', async t => {
  realm(t); const manager = new FavoriteManager(); manager.getAllFavoriteNames = () => [];
  Object.assign(manager.modes, { read: 'api', manage: 'api' });
  const targets = ['subscribed', 'season'].map((kind, i) => folder('100', { kind, ownerId: String(90 + i), name: 'Same name', subscribed: true, count: 0 }));
  let reads = 0; const writes = [], scans = [];
  manager.http.folders = async () => ++reads % 2 ? targets : [...targets].reverse();
  manager.http.videos = async (id, pn, signal, target) => { scans.push(target.kind); return { info: { id, media_count: 0 }, medias: [], has_more: false }; };
  manager.http.mutate = async (action, target) => { writes.push(`${target.kind}:${target.id}`); return { status: 'confirmed', detail: 'Synthetic confirmation' }; };
  const p = new FloatingPanel(manager); p.init(); t.after(() => p.destroy()); p.showView('statistics');
  const ui = p.inventoryPanel; ui.kind.value = 'subscribed'; await ui.load();
  for (const row of [...ui.rows, ...ui.mutations.rows]) assert.match(row.node.textContent, /同名.*ID 100.*所有者/);
  ui.rows.find(row => row.folder.kind === 'subscribed').input.click(); await ui.scan();
  assert.deepEqual(scans, ['subscribed']); p.showView('manage'); const m = ui.mutations;
  const selected = m.rows.find(row => row.folder.kind === 'season'); selected.input.click();
  m.list.prepend(selected.node); m.selectionTools.search.value = 'missing'; m.selectionTools.search.dispatchEvent(new window.Event('input'));
  assert.equal(selected.input.checked, true); assert.equal(selected.node.hidden, true);
  m.previewButton.click(); assert.deepEqual(m.ticket.targets.map(target => `${target.kind}:${target.id}`), ['season:100']);
  assert.match(m.review.textContent, /合集.*ID 100.*所有者 91/);
  m.agreement.checked = true; await m.execute();
  assert.deepEqual(writes, ['season:100']); assert.equal(reads, 2);
});

test('copy source collisions are explained and excluded from bulk selection even after refresh or busy transitions', t => {
  realm(t); let names = ['Same', 'Other'];
  const manager = { getAllFavoriteNames: () => names };
  const p = new FloatingPanel(manager); p.init(); t.after(() => p.destroy());
  p.favCheckboxItemList[0].checkbox.click(); names = ['Same', ' Same ', 'Other']; p.refreshFavorites();
  for (const item of p.favCheckboxItemList.slice(0, 2)) {
    assert.equal(item.checkbox.disabled, true); assert.equal(item.checkbox.checked, false);
    assert.match(item.checkboxContainer.textContent, /同名来源.*改为不同名称/);
  }
  p.toggleSelectAll(); assert.deepEqual(p.getSelectedTasks(), [{ source: 'Other', target: 'Other' }]);
  p.setBusy(true); p.setBusy(false); assert.equal(p.favCheckboxItemList[0].checkbox.disabled, true);
  names = ['Renamed', 'Same', 'Other']; p.refreshFavorites();
  assert.equal(p.favCheckboxItemList[0].checkbox.disabled, false);
});

test('HTTP creation/copy use correct private-folder/resource bodies, unknown creation verification never repeats', async t => {
  realm(t); const calls = [];
  const client = new FolderClient(async (url, options) => { calls.push({ url, body: Object.fromEntries(options.body) }); return { ok: true, json: async () => ({ code: 0, data: { id: 200 } }) }; });
  assert.equal((await client.create('Fictional')).status, 'confirmed');
  await client.copy(folder(), folder('200'), ['1', '2'], '50');
  assert.equal(calls[0].body.privacy, '1'); assert.equal(calls[0].body.title, 'Fictional');
  assert.equal(calls[1].body.resources, '1:2,2:2'); assert.equal(calls[1].body.mid, '50');
  const f = apiFixture(); const original = f.client.folders; let created = false;
  f.client.create = async () => { created = true; f.calls.push('create'); return { status: 'confirmed' }; };
  f.client.folders = async (...args) => { if (created) throw Error('lost verification'); return original(...args); };
  await assert.rejects(f.flow.run([{ source: 'Source', target: 'Target' }]), e => e.outcome === 'unknown'); assert.deepEqual(f.calls, ['create']);
  const c = apiFixture(); const controller = new AbortController(); controller.abort();
  await assert.rejects(c.flow.run([{ source: 'Source', target: 'Target' }], { signal: controller.signal })); assert.equal(c.calls.length, 0);
});
