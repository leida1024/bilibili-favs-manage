import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { BatchOperations } from '../src/core/BatchOperations.js';
import { FolderClient, normalizeFolder } from '../src/core/FolderClient.js';
import { InventoryService } from '../src/core/InventoryService.js';
import { FloatingPanel } from '../src/ui/FloatingPanel.js';

const subscription = (id, extra = {}) => ({ id: String(id), ownerId: '90', kind: 'subscribed', name: 'Same fictional name', count: 2, protected: false, available: true, subscribed: true, ...extra });
function fixture(outcome = { status: 'confirmed' }) {
  const catalog = [subscription(100), subscription(101, { ownerId: '91' })]; const calls = [];
  const client = {
    folders: async (actor, kind) => { assert.equal(actor, '50'); assert.equal(kind, 'subscribed'); return catalog; },
    mutate: async (action, target) => { assert.equal(action, 'unsubscribe'); calls.push([target.id, target.ownerId]); return outcome; }
  };
  const engine = new BatchOperations(client, () => ({ actor: '50', pageOwner: '50' }), 0);
  return { engine, catalog, calls, client };
}

test('subscription eligibility rejects owned, unsupported, conflicting and unconfirmed subscriptions', () => {
  const { engine } = fixture();
  for (const extra of [{ kind: 'created' }, { kind: 'unsupported' }, { identityConflict: true }, { ownerId: '50' }, { subscribed: false }, { subscribed: undefined }]) {
    assert.throws(() => engine.prepare('unsubscribe', [subscription(100, extra)]));
  }
  const normalized = normalizeFolder({ id: 100, type: 11, mid: 90, upper: { mid: 91 }, state: 0, fav_state: 1 }, 'subscribed');
  assert.equal(normalized.available, false);
  assert.equal(normalizeFolder({ id: 100, type: 11, mid: 90, fav_state: 1 }, 'subscribed').available, false);
});

test('same-name subscriptions retain both folder and owner identity with no owned deletion', async () => {
  const { engine, catalog, calls } = fixture();
  const ticket = engine.prepare('unsubscribe', catalog);
  await assert.rejects(engine.execute(ticket)); assert.equal(calls.length, 0);
  const report = await engine.execute(ticket, { confirmed: true });
  assert.equal(report.complete, true); assert.deepEqual(calls, [['100', '90'], ['101', '91']]);
  await assert.rejects(engine.execute(ticket, { confirmed: true }));
});

test('subscription owner/type/status changes after preview stop without submitting', async () => {
  for (const extra of [{ ownerId: '91' }, { ownerId: null }, { kind: 'unsupported' }, { subscribed: false }, { available: false }]) {
    const f = fixture(); const ticket = f.engine.prepare('unsubscribe', [f.catalog[0]]);
    Object.assign(f.catalog[0], extra);
    const report = await f.engine.execute(ticket, { confirmed: true });
    assert.equal(report.results[0].status, 'failed'); assert.equal(f.calls.length, 0);
  }
});

test('subscription failure/unknown stop; cancellation prevents remaining items and admission is released', async () => {
  for (const status of ['failed', 'unknown']) {
    const f = fixture({ status });
    const report = await f.engine.execute(f.engine.prepare('unsubscribe', f.catalog), { confirmed: true });
    assert.equal(f.calls.length, 1); assert.equal(report.results[1].status, 'not_started'); assert.equal(f.engine.running, false);
  }
  const f = fixture(); const controller = new AbortController();
  const report = await f.engine.execute(f.engine.prepare('unsubscribe', f.catalog), { confirmed: true, signal: controller.signal, onResult: () => controller.abort() });
  assert.equal(report.cancelled, true); assert.equal(f.calls.length, 1);
});

test('subscription discovery paginates with distinct seasons; transport uses media ID and never retries network uncertainty', async t => {
  const dom = new JSDOM('', { url: 'https://space.bilibili.com/50/favlist' });
  globalThis.document = dom.window.document; document.cookie = 'bili_jct=synthetic-only'; t.after(() => dom.window.close());
  let getCalls = 0, postCalls = 0;
  const client = new FolderClient(async (url, options) => {
    if (options.method === 'POST') {
      postCalls++; assert.match(url, /folder\/unfav\?media_id=100$/);
      assert.equal(options.body.has('media_ids'), false); throw new Error('synthetic network loss');
    }
    getCalls++; const pn = new URL(url).searchParams.get('pn');
    return { ok: true, json: async () => ({ code: 0, data: { count: 2, list: [{ id: Number(pn), type: pn === '1' ? 11 : 21, mid: 90, state: 0, fav_state: 1 }], has_more: pn === '1' } }) };
  });
  const folders = await client.folders('50', 'subscribed', undefined, 0);
  assert.equal(getCalls, 2); assert.deepEqual(folders.map(f => f.kind), ['subscribed', 'season']);
  assert.equal((await client.mutate('unsubscribe', subscription(100))).status, 'unknown'); assert.equal(postCalls, 1);
});

test('switching scope drops old preview; product unsubscribe needs new independent selection/confirmation', async t => {
  const dom = new JSDOM('', { url: 'https://space.bilibili.com/50/favlist' });
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  document.cookie = 'DedeUserID=50';
  const f = fixture(); const panel = new FloatingPanel({ inventory: new InventoryService(f.client, 0), batchOperations: f.engine, getAllFavoriteNames: () => [] }); panel.init();
  t.after(() => { panel.destroy(); dom.window.close(); });
  const ui = panel.inventoryPanel; ui.kind.value = 'subscribed'; ui.kind.dispatchEvent(new window.Event('change'));
  await ui.load(); const m = ui.mutations;
  assert.equal(m.action, 'unsubscribe'); assert.equal(m.selected().length, 0); assert.equal(ui.selected().length, 0);
  m.rows[0].input.checked = true; m.updateBusy(); m.preview();
  assert.match(m.review.textContent, /所有者 90/); assert.match(m.review.textContent, /取消当前账号/);
  assert.equal(m.confirmButton.disabled, true);
  m.agreement.checked = true; await m.execute();
  assert.deepEqual(f.calls, [['100', '90']]); assert.equal(panel.busy, false); assert.equal(f.engine.ticket, null);
  ui.kind.value = 'created'; ui.kind.dispatchEvent(new window.Event('change'));
  assert.equal(m.action, 'delete'); assert.equal(m.selected().length, 0); assert.equal(m.ticket, null);
});
