import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { WebFolderClient } from '../src/core/WebFolderClient.js';
import { FavoriteManager } from '../src/core/FavoriteManager.js';
import { FloatingPanel } from '../src/ui/FloatingPanel.js';

function fixture(t, layout = 'vui', { delayed = false, paginated = false, single = false, fault } = {}) {
  const legacy = layout === 'legacy';
  const dom = new JSDOM('<div id="app"></div>', { url: 'https://space.bilibili.com/50/favlist' });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage, Node: dom.window.Node });
  document.cookie = 'DedeUserID=50';
  const data = (single ? [100] : [100, 101]).map((id, index) => ({ id, type: index ? 21 : 11, mid: 0,
    title: 'Fictional unavailable', media_count: 0, state: 1 }));
  const source = { count: data.length, list: paginated ? data.slice(0, 1) : [...data] };
  const app = document.querySelector('#app'), vnodes = []; app._vnode = { children: vnodes };
  const aside = document.createElement('div'); aside.className = legacy ? 'fav-container' : 'favlist-aside';
  aside.innerHTML = legacy ? '<div class="favlist-title"><i class="icon-arrow"></i></div><div id="fav-list-container"></div>' :
    '<div class="vui_collapse_item"><div class="vui_collapse_item_header">我追的合集/收藏夹<i class="vui_collapse_item_header_icon"></i></div></div>';
  const group = aside.querySelector(legacy ? '#fav-list-container' : '.vui_collapse_item');
  if (legacy) group.__vue__ = { $parent: { collectedList: source } };
  let menuClicks = 0, finalClicks = 0, navigations = 0, expansions = 0, loads = 0;
  const remove = row => {
    const index = source.list.findIndex(item => String(item.id) === row.dataset.id);
    source.list.splice(index, 1); source.count--; row.remove();
    if (legacy && single) aside.remove();
  };
  const add = item => {
    const row = document.createElement('div'); row.dataset.id = item.id;
    row.className = legacy ? 'fav-item favInvalid' : 'fav-sidebar-item';
    row.innerHTML = legacy ? `<a class="text" href="/50/favlist?fid=${item.id}&ftype=collect&ctype=${item.type}"></a><div class="be-dropdown"></div>` :
      '<div class="vui_sidebar-item vui_sidebar-item--disabled"><div class="vui_ellipsis"></div><div class="menu-popover"><i class="more-vertical"></i></div></div>';
    row.querySelector(legacy ? 'a.text' : '.vui_ellipsis').textContent = item.title;
    row.querySelector(legacy ? 'a.text' : '.vui_sidebar-item').onclick = event => { event.preventDefault(); navigations++; };
    const vnode = { el: row, component: { type: { __name: 'FavSidebarItem' }, props: { item, type: 'collect', index: 999 } } };
    vnodes.unshift(vnode); // Deliberately opposite to DOM order. Index is not identity.
    row.querySelector(legacy ? '.be-dropdown' : '.more-vertical').onmouseenter = () => {
      document.querySelectorAll('.be-dropdown-item,.menu-popover__panel-item').forEach(node => node.remove());
      const menu = document.createElement('div'); menu.className = legacy ? 'be-dropdown-item' : 'menu-popover__panel-item';
      menu.textContent = '取消订阅';
      menu.onclick = () => {
        menuClicks++;
        if (legacy) { remove(row); return; }
        const dialog = document.createElement('div'); dialog.className = 'vui_dialog--content';
        dialog.innerHTML = '<p>确定取消订阅吗？</p><button>取消</button><button class="vui_button--blue">确定</button>';
        dialog.querySelector('.vui_button--blue').onclick = () => { finalClicks++; remove(row); dialog.remove(); };
        document.body.append(dialog);
        if (fault === 'actor') document.cookie = 'DedeUserID=60';
        if (fault === 'identity') vnode.component.props.item = { ...item, id: 999 };
        if (fault === 'unbind') vnodes.splice(vnodes.indexOf(vnode), 1);
        if (fault === 'cancel') controller.abort();
      };
      document.body.append(menu);
      if (fault === 'before-menu') vnode.component.props.item = { ...item, id: 999 };
    };
    group.append(row); return row;
  };
  const header = aside.querySelector(legacy ? '.favlist-title' : '.vui_collapse_item_header');
  header.onclick = () => {
    expansions++;
    header.querySelector('i').className = legacy ? 'icon-arrow arrow-transform' : 'vui_collapse_item_header_icon vui_collapse_item_icon_active';
  };
  source.list.forEach(add);
  if (paginated) {
    const load = () => { loads++; source.list.push(data[1]); add(data[1]); };
    if (legacy) group.addEventListener('ps-y-reach-end', load, { once: true });
    else {
      const more = document.createElement('div'); more.className = 'fav-collapse-more'; more.textContent = '显示剩余1个';
      more.onclick = () => { load(); more.remove(); }; group.append(more);
    }
  }
  document.body.onclick = () => document.querySelectorAll('.be-dropdown-item,.menu-popover__panel-item').forEach(node => node.remove());
  const controller = new AbortController(), client = new WebFolderClient();
  if (delayed) setTimeout(() => app.append(aside), 40); else app.append(aside);
  t.after(() => dom.window.close());
  return { client, source, group, controller, data, vnodes, counts: () => ({ menuClicks, finalClicks, navigations, expansions, loads }) };
}

for (const layout of ['legacy', 'vui']) {
  test(`${layout} prepares delayed collapsed paginated subscription list and removes exact unavailable same-name identity`, async t => {
    const f = fixture(t, layout, { delayed: true, paginated: true });
    const rows = await f.client.folders('50', 'subscribed');
    assert.deepEqual(rows.map(row => [row.id, row.kind, row.available]), [['100', 'subscribed', false], ['101', 'season', false]]);
    assert.equal((await f.client.mutate('unsubscribe', rows[1])).status, 'confirmed');
    assert.ok(f.group.querySelector('[data-id="100"]')); assert.equal(f.group.querySelector('[data-id="101"]'), null);
    assert.deepEqual(f.counts(), { menuClicks: 1, finalClicks: layout === 'legacy' ? 0 : 1, navigations: 0, expansions: 1, loads: 1 });
  });
  test(`${layout} last subscription removal is confirmed`, async t => {
    const f = fixture(t, layout, { single: true }), [row] = await f.client.folders('50', 'subscribed');
    assert.equal((await f.client.mutate('unsubscribe', row)).status, 'confirmed');
    assert.equal(f.source.count, 0);
  });
}

for (const fault of ['actor', 'identity', 'unbind', 'cancel', 'before-menu']) {
  test(`native unavailable unsubscribe ${fault} prevents final submission and never retries`, async t => {
    const f = fixture(t, 'vui', { fault }), rows = await f.client.folders('50', 'subscribed');
    const result = await f.client.mutate('unsubscribe', rows[1], f.controller.signal);
    assert.equal(result.status, fault === 'before-menu' ? 'failed' : 'unknown');
    assert.equal(f.counts().menuClicks, fault === 'before-menu' ? 0 : 1);
    assert.equal(f.counts().finalClicks, 0); assert.equal(f.source.count, 2);
  });
}

test('duplicate component identities and unavailable missing bindings fail without clicking', async t => {
  const f = fixture(t);
  const rows = await f.client.folders('50', 'subscribed');
  f.vnodes[0].component.props.item = f.data[0];
  const result = await new WebFolderClient().mutate('unsubscribe', rows[0]);
  assert.equal(result.status, 'failed'); assert.match(result.detail, /身份重复/);
  document.querySelector('#app')._vnode = null;
  await assert.rejects(new WebFolderClient().folders('50', 'subscribed'), /API/);
  assert.equal(f.counts().menuClicks, 0);
});

test('waiting for missing native list can be cancelled before any click', async t => {
  fixture(t); document.querySelector('.favlist-aside').remove();
  const controller = new AbortController(), client = new WebFolderClient();
  const loading = client.folders('50', 'subscribed', controller.signal); controller.abort();
  await assert.rejects(loading, error => error.name === 'AbortError');
});

test('native pagination limit never returns a partial list as complete', async t => {
  const f = fixture(t);
  const more = document.createElement('div'); more.className = 'fav-collapse-more'; more.textContent = '显示剩余1个';
  // An endlessly growing page must still hit the bound rather than hang.
  more.onclick = () => {
    const row = document.createElement('div'); row.className = 'fav-sidebar-item'; f.group.append(row);
  };
  f.group.append(more);
  await assert.rejects(f.client.folders('50', 'subscribed'), /超过上限/);
  assert.equal(f.counts().menuClicks, 0);
});

test('API-read web-write panel previews unavailable targets, consumes one ticket and clicks native final confirmation', async t => {
  const f = fixture(t, 'vui', { paginated: true }), manager = new FavoriteManager();
  Object.assign(manager.modes, { read: 'api', manage: 'web' }); let reads = 0;
  manager.http.fetcher = async (_, options) => {
    assert.notEqual(options.method, 'POST'); reads++;
    return { ok: true, json: async () => ({ code: 0, data: { count: f.data.length, has_more: false, list: f.data } }) };
  };
  const panel = new FloatingPanel(manager); panel.init(); panel.showView('manage'); t.after(() => panel.destroy());
  const inventory = panel.inventoryPanel; inventory.kind.value = 'subscribed'; await inventory.load();
  const ui = inventory.mutations; ui.rows[1].input.click(); ui.preview(); const ticket = ui.ticket;
  assert.deepEqual(ticket.targets.map(row => row.id), ['101']); assert.match(ui.review.textContent, /内容已失效/);
  ui.agreement.checked = true; await ui.execute();
  assert.equal(panel.operations.manage.state.status, 'completed'); assert.equal(reads, 2);
  assert.equal(f.counts().menuClicks, 1); assert.equal(f.counts().finalClicks, 1); assert.equal(f.counts().navigations, 0);
  await assert.rejects(manager.batchOperations.execute(ticket, { confirmed: true }), /重新预览/);
});


test('replacement loading controls alone cannot confirm pagination progress', async t => {
  const f = fixture(t);
  const more = document.createElement('div'); more.className = 'fav-collapse-more'; more.textContent = '显示剩余1个';
  more.onclick = () => more.remove(); f.group.append(more);
  const wait = f.client.wait.bind(f.client); f.client.wait = (check, signal) => wait(check, signal, 40);
  await assert.rejects(f.client.folders('50', 'subscribed'), /网页未显示预期结果/);
  assert.equal(f.counts().menuClicks, 0);
});

test('bound available subscriptions still navigate to their videos when scanning statistics', async t => {
  const f = fixture(t), item = f.data[1]; item.state = 0;
  const row = f.group.querySelector('[data-id="101"]'); row.querySelector('.vui_sidebar-item').className = 'vui_sidebar-item';
  document.body.insertAdjacentHTML('beforeend', '<div class="favlist-info-detail__title-row"></div>');
  row.querySelector('.vui_sidebar-item').onclick = () => {
    window.history.replaceState(null, '', '/50/favlist?fid=101&ftype=collect&ctype=21');
    document.querySelector('.favlist-info-detail__title-row').textContent = item.title;
  };
  const folders = await f.client.folders('50', 'subscribed');
  assert.equal(new URL(window.location.href).searchParams.get('fid'), null);
  const page = await f.client.videos('101', 1, undefined, folders[1]);
  assert.equal(new URL(window.location.href).searchParams.get('fid'), '101');
  assert.equal(page.info.id, '101'); assert.equal(page.has_more, false); assert.deepEqual(page.medias, []);
});
