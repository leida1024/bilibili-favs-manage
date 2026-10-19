import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { FavoriteManager } from '../src/core/FavoriteManager.js';
import { FloatingPanel } from '../src/ui/FloatingPanel.js';

// Markup/events follow the public legacy space bundle and current VUI page.
// In particular mouseenter does not bubble from an arbitrary wrapper/child.
function fixture(t, layout, missingMenu = false) {
  const legacy = layout === 'legacy';
  const dom = new JSDOM(legacy ?
    '<div id="fav-createdList-container"></div><div class="favInfo-details"><a class="fav-name"></a><div class="fav-meta">0个内容</div></div>' :
    '<div class="favlist-aside"><div class="vui_collapse_item"><div class="vui_collapse_item_header">我创建的收藏夹</div></div></div><div class="favlist-info-detail__title-row"></div><div class="favlist-info-detail__data">视频数: 0</div>',
  { url: 'https://space.bilibili.com/50/favlist' });
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.localStorage = dom.window.localStorage;
  globalThis.Node = dom.window.Node;
  document.cookie = 'DedeUserID=50';
  const raw = [100, 101, 102].map((id, i) => ({ id, mid: 50, title: i ? 'Fictional target' : 'Default', media_count: 0, is_kid_playlist: false, state: 0 }));
  const group = document.querySelector(legacy ? '#fav-createdList-container' : '.vui_collapse_item');
  let submissions = 0, finalConfirms = 0, apiReads = 0;
  const dismiss = () => document.querySelectorAll('.be-dropdown-menu, .menu-popover__panel').forEach(n => n.remove());
  document.body.addEventListener('click', dismiss);
  for (const data of raw) {
    const row = document.createElement('div'); row.dataset.id = data.id;
    row.className = legacy ? 'fav-item' : 'fav-sidebar-item';
    row.innerHTML = legacy ?
      '<a class="text"></a><div class="be-dropdown"><div class="be-dropdown-trigger"><i title="更多操作"></i></div></div>' :
      '<div class="vui_sidebar-item"><div class="vui_ellipsis"></div><div class="menu-popover"><i class="more-vertical"></i></div></div>';
    row.querySelector(legacy ? 'a.text' : '.vui_ellipsis').textContent = data.title;
    row.querySelector(legacy ? 'a.text' : '.vui_sidebar-item').onclick = () => {
      window.history.replaceState(null, '', `/50/favlist?fid=${data.id}&ftype=create`);
      document.querySelector(legacy ? '.fav-name' : '.favlist-info-detail__title-row').textContent = data.title;
    };
    row.querySelector(legacy ? '.be-dropdown' : '.more-vertical').addEventListener('mouseenter', () => {
      if (missingMenu) return;
      dismiss();
      const menu = document.createElement('ul'); menu.className = legacy ? 'be-dropdown-menu' : 'menu-popover__panel';
      const item = document.createElement('li'); item.className = legacy ? 'be-dropdown-item' : 'menu-popover__panel-item';
      item.textContent = '删除'; menu.append(item); document.body.append(menu);
      item.onclick = () => {
        submissions++;
        const dialog = document.createElement('div'); dialog.className = legacy ? 'modal-container' : 'vui_dialog--content';
        dialog.innerHTML = legacy ?
          '<div class="modal-wrapper"><div class="modal"><div class="modal-body">确定删除这个收藏夹吗？</div><div class="modal-footer"><a class="btn primary"><span class="btn-content">确定</span></a><a class="btn default">取消</a></div></div></div>' :
          '<p>删除收藏夹</p><button class="vui_button--blue">确定</button><button>取消</button>';
        dialog.querySelector(legacy ? '.primary' : '.vui_button--blue').onclick = () => { finalConfirms++; row.remove(); dialog.remove(); };
        document.body.append(dialog);
      };
    });
    group.append(row);
  }
  const manager = new FavoriteManager(); Object.assign(manager.modes, { read: 'api', manage: 'web' });
  manager.http.fetcher = async (url, options) => {
    assert.notEqual(options.method, 'POST', 'web management must not fall back to an API write'); apiReads++;
    assert.match(url, /folder\/created\/list-all/);
    const list = raw.filter(data => group.querySelector(`[data-id="${data.id}"]`));
    return { ok: true, json: async () => ({ code: 0, data: { count: list.length, list } }) };
  };
  if (missingMenu) {
    const wait = manager.web.wait.bind(manager.web);
    manager.web.wait = (check, signal, timeout) => wait(check, signal, timeout === 2000 ? 40 : timeout);
  }
  const panel = new FloatingPanel(manager); panel.init(); panel.showView('manage');
  t.after(() => { panel.destroy(); dom.window.close(); });
  return { manager, panel, group, counts: () => ({ submissions, finalConfirms, apiReads }) };
}

async function executeTarget(f) {
  await f.panel.inventoryPanel.load();
  const ui = f.panel.inventoryPanel.mutations;
  ui.rows.find(row => row.folder.id === '102').input.checked = true;
  ui.preview(); const ticket = ui.ticket;
  assert.deepEqual(ticket.targets.map(row => row.id), ['102']);
  ui.agreement.checked = true; await ui.execute(); return ticket;
}

for (const layout of ['legacy', 'vui']) {
  test(`${layout} hybrid panel delete opens the actual hover trigger and native confirmation, preserving same-name sibling`, async t => {
    const f = fixture(t, layout), ticket = await executeTarget(f);
    assert.equal(f.panel.operations.manage.state.status, 'completed');
    assert.deepEqual(f.counts(), { submissions: 1, finalConfirms: 1, apiReads: 2 });
    assert.equal(f.group.querySelector('[data-id="102"]'), null);
    assert.ok(f.group.querySelector('[data-id="101"]'));
    assert.ok(f.manager.logs.entries.some(entry => entry.view === 'manage' && /ID 102.*已确认.*网页已移除/.test(entry.message)));
    await assert.rejects(f.manager.batchOperations.execute(ticket, { confirmed: true }), /重新预览/);
    assert.equal(f.counts().finalConfirms, 1);
  });
}

test('missing native delete menu reports the real cause in daily records, export and footer without submitting', async t => {
  const f = fixture(t, 'legacy', true); await executeTarget(f);
  assert.equal(f.panel.operations.manage.state.status, 'failed');
  assert.equal(f.counts().submissions, 0); assert.equal(f.counts().finalConfirms, 0);
  assert.match(f.panel.operations.manage.state.detail, /网页未识别目标的删除菜单/);
  assert.doesNotMatch(f.panel.operations.manage.state.detail, /本次确认已用完/);
  assert.ok(f.manager.logs.filter('normal', 'manage').some(entry => entry.level === 'error' && /ID 102.*删除菜单/.test(entry.message)));
  assert.match(f.manager.logs.export(), /网页未识别目标的删除菜单/);
});
