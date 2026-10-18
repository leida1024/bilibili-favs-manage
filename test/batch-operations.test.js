import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { BatchOperations, eligibility } from '../src/core/BatchOperations.js';
import { FolderClient } from '../src/core/FolderClient.js';
import { InventoryService } from '../src/core/InventoryService.js';
import { OperationState } from '../src/core/OperationState.js';
import { FloatingPanel } from '../src/ui/FloatingPanel.js';

const target = (id, extra = {}) => ({ id: String(id), ownerId: '50', name: 'Same fictional name', count: 2, kind: 'created', protected: false, available: true, ...extra });
function fixture(mutate = async () => ({ status: 'confirmed', detail: 'fixture confirmed' })) {
  let context = { actor: '50', pageOwner: '50' };
  const catalog = [target(100), target(101), target(102)];
  const calls = [];
  const client = { folders: async () => catalog, mutate: async (action, item, signal) => { calls.push(item.id); return mutate(action, item, signal); } };
  const engine = new BatchOperations(client, () => context, 0);
  return { engine, catalog, calls, client, setContext: next => { context = next; } };
}

test('delete eligibility rejects foreign/subscribed/default/special/unknown and duplicate targets', () => {
  const { engine } = fixture();
  for (const extra of [{ ownerId: '90' }, { ownerId: null }, { id: null }, { kind: 'subscribed' }, { protected: true }, { protected: undefined }, { available: false }]) {
    assert.throws(() => engine.prepare('delete', [target(100, extra)]));
  }
  assert.throws(() => engine.prepare('delete', [target(100), target(100)]));
  assert.ok(eligibility('delete', target(100), '50', '90'));
});

test('same names retain exact IDs; immutable one-use ticket requires explicit confirmation', async () => {
  const { engine, catalog, calls } = fixture();
  const ticket = engine.prepare('delete', catalog.slice(0, 2));
  assert.equal(Object.isFrozen(ticket.targets[0]), true);
  await assert.rejects(engine.execute(ticket)); assert.deepEqual(calls, []);
  const report = await engine.execute(ticket, { confirmed: true });
  assert.deepEqual(calls, ['100', '101']); assert.equal(report.complete, true);
  await assert.rejects(engine.execute(ticket, { confirmed: true }));
  assert.deepEqual(calls, ['100', '101']);
});

test('fresh identity/name/count/protection changes stop before submitting', async () => {
  for (const extra of [{ name: 'Renamed' }, { count: 3 }, { protected: true }, { ownerId: '90' }, { kind: 'subscribed' }]) {
    const { engine, catalog, calls } = fixture();
    const ticket = engine.prepare('delete', [catalog[0]]);
    Object.assign(catalog[0], extra);
    const report = await engine.execute(ticket, { confirmed: true });
    assert.deepEqual(calls, []); assert.equal(report.results[0].status, 'failed');
  }
});

test('account change during revalidation prevents submission', async () => {
  const f = fixture(); const ticket = f.engine.prepare('delete', [f.catalog[0]]);
  f.client.folders = async () => { f.setContext({ actor: '90', pageOwner: '50' }); return f.catalog; };
  const report = await f.engine.execute(ticket, { confirmed: true });
  assert.deepEqual(f.calls, []); assert.equal(report.results[0].status, 'failed');
});

test('failure/unknown/malformed/thrown submit stop the queue and cannot replay', async () => {
  for (const response of [{ status: 'failed' }, { status: 'unknown' }, {}, null, 'throw']) {
    const f = fixture(async () => { if (response === 'throw') throw new Error('fixture timeout'); return response; });
    const ticket = f.engine.prepare('delete', f.catalog);
    const report = await f.engine.execute(ticket, { confirmed: true });
    assert.equal(f.calls.length, 1); assert.notEqual(report.results[0].status, 'confirmed');
    assert.equal(report.results[1].status, 'not_started'); assert.equal(f.engine.running, false);
    await assert.rejects(f.engine.execute(ticket, { confirmed: true }));
  }
});

test('cancel between items preserves confirmed result; abort during submit is unknown', async () => {
  const controller = new AbortController(); const f = fixture();
  const report = await f.engine.execute(f.engine.prepare('delete', f.catalog), { confirmed: true, signal: controller.signal, onResult: () => controller.abort() });
  assert.deepEqual(f.calls, ['100']); assert.equal(report.cancelled, true);
  assert.equal(report.results[0].status, 'confirmed'); assert.equal(report.results[1].status, 'not_started');
  const c = new AbortController();
  const during = fixture(async () => { c.abort(); throw new Error('aborted'); });
  const unknown = await during.engine.execute(during.engine.prepare('delete', during.catalog), { confirmed: true, signal: c.signal });
  assert.equal(unknown.results[0].status, 'unknown'); assert.equal(during.calls.length, 1);
});

test('synthetic POST transport reports acknowledgement/rejection/uncertainty and never retries', async t => {
  const dom = new JSDOM('', { url: 'https://space.bilibili.com/50/favlist' });
  globalThis.document = dom.window.document; document.cookie = 'bili_jct=synthetic-only'; t.after(() => dom.window.close());
  for (const [response, expected] of [[{ code: 0 }, 'confirmed'], [{ code: -403 }, 'failed'], [{}, 'unknown'], [null, 'unknown']]) {
    let calls = 0;
    const client = new FolderClient(async (url, options) => {
      calls++; assert.match(url, /folder\/del$/); assert.equal(options.method, 'POST');
      assert.equal(options.body.get('media_ids'), '100'); assert.equal(options.body.get('csrf'), 'synthetic-only');
      return { ok: true, json: async () => response };
    });
    const result = await client.mutate('delete', target(100));
    assert.equal(result.status, expected); assert.equal(calls, 1);
    assert.doesNotMatch(JSON.stringify(result), /synthetic-only/);
  }
});

test('product requires distinct mutation selection, preview and agreement; refresh drops tickets', async t => {
  const dom = new JSDOM('', { url: 'https://space.bilibili.com/50/favlist' });
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  const f = fixture();
  const inventory = new InventoryService(f.client, 0);
  const panel = new FloatingPanel({ inventory, batchOperations: f.engine, operation: new OperationState(), getAllFavoriteNames: () => [] }); panel.init();
  t.after(() => { panel.destroy(); dom.window.close(); });
  await panel.inventoryPanel.load(); const ui = panel.inventoryPanel.mutations;
  assert.equal(ui.selected().length, 0); assert.equal(ui.previewButton.disabled, true);
  await ui.execute(); assert.deepEqual(f.calls, []);
  ui.rows[0].input.checked = true; ui.updateBusy(); ui.preview();
  assert.equal(ui.confirmButton.disabled, true); await ui.execute(); assert.deepEqual(f.calls, []);
  ui.agreement.checked = true; ui.updateBusy(); await ui.execute();
  assert.deepEqual(f.calls, ['100']); assert.equal(panel.busy, false); assert.match(ui.results.textContent, /已确认/);
  assert.equal(panel.inventoryPanel.operation.state.total, 1, 'selected target count is known before submission');
  assert.equal(f.engine.ticket, null); assert.equal(ui.rows.length, 0);
  const freshPanel = new FloatingPanel({ inventory, batchOperations: new BatchOperations(f.client, () => ({ actor: '50', pageOwner: '50' }), 0), getAllFavoriteNames: () => [] });
  freshPanel.init(); assert.equal(freshPanel.inventoryPanel.mutations.selected().length, 0); freshPanel.destroy();
});
