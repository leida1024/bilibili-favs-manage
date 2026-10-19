import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { FolderClient, normalizeFolder } from '../src/core/FolderClient.js';
import { InventoryService } from '../src/core/InventoryService.js';
import { FloatingPanel } from '../src/ui/FloatingPanel.js';
import { OperationState } from '../src/core/OperationState.js';

const folder = { id: '100', ownerId: '50', kind: 'created', name: 'Fictional folder' };
const page = (medias, more = false, count = medias.length) => ({ info: { id: 100, media_count: count }, medias, has_more: more });
const video = (id, extra = {}) => ({ id, type: 2, duration: 60, upper: { mid: 90 }, ...extra });

test('inventory deduplicates multi-page identities and preserves unknown metadata', async () => {
  const pages = [page([video(1), video(2, { duration: null, upper: null, attr: 1 })], true, 4), page([video(1), { type: 99 }], false, 4)];
  const scan = new InventoryService({ videos: async (_, pn) => pages[pn - 1] }, 0);
  const report = await scan.scan([folder]);
  assert.equal(report.complete, true); assert.equal(report.entries, 4);
  assert.equal(report.uniqueVideos, 2); assert.equal(report.duplicateOccurrences, 1);
  assert.equal(report.unknownIdentity, 1); assert.equal(report.unavailable, 1);
  assert.equal(report.knownDurationSeconds, 60); assert.equal(report.unknownDurations, 1);
  assert.equal(report.unknownUploaders, 1); assert.equal(report.videos[1].duration, null);
});

test('failed, repeated, changing and limited pages retain explicitly partial coverage', async () => {
  for (const second of [() => { throw new Error('fixture offline'); }, () => page([video(1)], false, 2), () => page([video(2)], false, 3)]) {
    const scan = new InventoryService({ videos: async (_, pn) => pn === 1 ? page([video(1)], true, 2) : second() }, 0);
    const report = await scan.scan([folder]);
    assert.equal(report.complete, false); assert.ok(report.folders[0].issue); assert.ok(report.entries >= 1);
  }
  const scan = new InventoryService({ videos: async () => page([video(1)], true, 2) }, 0);
  assert.equal((await scan.scan([folder], { maxPages: 1 })).complete, false);
  assert.equal((await scan.scan([folder], { maxEntries: 0 })).entries, 0);
});

test('cancel prevents next request and releases scan admission', async () => {
  const controller = new AbortController(); let calls = 0;
  const scan = new InventoryService({ videos: async () => { calls++; return page([video(1)], true, 2); } }, 0);
  const report = await scan.scan([folder], { signal: controller.signal, onPage: () => controller.abort() });
  assert.equal(calls, 1); assert.equal(report.cancelled, true); assert.equal(scan.running, false);
  assert.equal(report.uniqueVideos, 1);
});

test('explicit zero-count null lists are empty; unknown totals and mismatched identity stay incomplete', async () => {
  let data = { count: 0, list: null, has_more: false };
  const client = new FolderClient(async () => ({ ok: true, json: async () => ({ code: 0, data }) }));
  assert.deepEqual(await client.folders('50', 'created'), []);
  assert.deepEqual(await client.folders('50', 'subscribed'), []);
  data = { info: { id: 100, media_count: 0 }, medias: null, has_more: false };
  const empty = await new InventoryService(client, 0).scan([folder]);
  assert.equal(empty.complete, true); assert.equal(empty.uniqueVideos, 0);
  data = { info: { id: 100 }, medias: [], has_more: false };
  assert.equal((await new InventoryService(client, 0).scan([folder])).complete, false);
  data = { info: { id: 101, media_count: 0 }, medias: [], has_more: false };
  assert.match((await new InventoryService(client, 0).scan([folder])).folders[0].issue, /身份/);
});

test('client normalizes IDs, excludes unknown types, rejects incomplete and duplicate discovery', async () => {
  assert.equal(normalizeFolder({ id: 1, mid: 2, title: 'same', is_kid_playlist: 0 }, 'created').protected, true);
  assert.equal(normalizeFolder({ id: 2, mid: 2, title: 'same', is_kid_playlist: 0 }, 'created', 1).protected, false);
  assert.equal(normalizeFolder({ id: 1, upper: { mid: 2 }, type: 21 }, 'subscribed').kind, 'season');
  assert.equal(normalizeFolder({ id: 1, upper: { mid: 2 }, type: 99 }, 'subscribed').kind, 'unsupported');
  let data = { count: 2, list: [{ id: 1 }] };
  const client = new FolderClient(async (url, options) => {
    assert.equal(options.credentials, 'include'); assert.equal(options.method, undefined);
    assert.match(url, /created\/list-all/);
    return { ok: true, json: async () => ({ code: 0, data }) };
  });
  await assert.rejects(client.folders('50', 'created'), /不完整/);
  data = { count: 2, list: [{ id: 1 }, { id: 1 }] };
  await assert.rejects(client.folders('50', 'created'), /重复/);
});

test('explicit UI load starts with no selection; scan/export are local and busy prevents overlap', async t => {
  const dom = new JSDOM('', { url: 'https://space.bilibili.com/50/favlist' });
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  let calls = 0;
  const inventory = new InventoryService({ folders: async () => { calls++; return [folder]; }, videos: async () => page([video(1)]) }, 0);
  const panel = new FloatingPanel({ inventory, operation: new OperationState(), getAllFavoriteNames: () => [] }); panel.init();
  t.after(() => { panel.destroy(); dom.window.close(); });
  const ui = panel.inventoryPanel;
  assert.equal(calls, 0); assert.equal(ui.scanButton.disabled, true);
  await ui.load(); assert.equal(ui.selected().length, 0);
  ui.rows[0].input.checked = true; ui.updateBusy();
  await ui.scan(); assert.equal(ui.report.uniqueVideos, 1); assert.equal(panel.busy, false);
  ui.exportButton.click(); assert.match(panel.exportReview.querySelector('textarea').value, /uniqueVideos/);
});
