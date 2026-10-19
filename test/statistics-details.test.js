import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { InventoryService } from '../src/core/InventoryService.js';
import { NativeVideoReader } from '../src/core/adapters/NativeVideoReader.js';
import { nativeControls } from '../src/core/adapters/nativeControls.js';
import { WebFolderClient } from '../src/core/WebFolderClient.js';
import { videoDetails } from '../src/ui/VideoDetails.js';
import { BilibiliAPI } from '../src/core/BilibiliAPI.js';
import { FavoriteManager } from '../src/core/FavoriteManager.js';

const folder = { id: '100', ownerId: '50', kind: 'created', name: 'Fictional folder', count: 5 };
const media = (id, extra = {}) => ({ id, type: 2, title: `Fictional video ${id}`, duration: 60, upper: { mid: '90', name: 'Fictional author' }, ...extra });
const page = (id, medias, total = medias.length, more = false) => ({ info: { id, media_count: total }, medias, has_more: more });
function realm(t, html = '') {
  const dom = new JSDOM(html, { url: 'https://space.bilibili.com/50/favlist?fid=100&ftype=create' });
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  document.cookie = 'DedeUserID=50; path=/'; t.after(() => dom.window.close());
}

test('details retain titles, safe links and memberships; aid/BV alias bridge deduplicates and enriches metadata', async () => {
  const bvid = 'BV1xx411c7mD';
  const folders = [folder, { ...folder, id: '101', name: 'Second folder' }];
  const report = await new InventoryService({ videos: async id => id === '100' ? page(id, [media('1', { title: null, duration: null, upper: null })]) :
    page(id, [media(null, { bvid, title: 'Known title' }), media('1', { bvid, title: null, duration: null, upper: null, fav_time: 123 })]) }, 0).scan(folders);
  assert.equal(report.complete, true); assert.equal(report.uniqueVideos, 1); assert.equal(report.duplicateOccurrences, 2);
  const video = report.videos[0]; assert.equal(video.title, 'Known title'); assert.equal(video.duration, 60);
  assert.equal(video.uploaderName, 'Fictional author'); assert.equal(video.url, `https://www.bilibili.com/video/${bvid}`);
  assert.equal(video.occurrences, 3); assert.deepEqual(video.folders.map(f => f.occurrences), [1, 2]);
  assert.equal(report.knownDurationSeconds, 60); assert.equal(report.unknownDurations, 0);
});

test('one unreadable or count-mismatched folder retains partial data and continues other selected folders', async () => {
  const report = await new InventoryService({ videos: async id => {
    if (id === '100') throw Error('Synthetic permission failure');
    return page(id, [media('1'), { type: 99, title: 'Unknown resource' }], 3);
  } }, 0).scan([folder, { ...folder, id: '101' }]);
  assert.equal(report.complete, false); assert.equal(report.folders.length, 2); assert.equal(report.entries, 2);
  assert.match(report.folders[0].issue, /permission/); assert.match(report.folders[1].issue, /标称 3.*读取 2/);
  assert.equal(report.unidentified[0].title, 'Unknown resource'); assert.equal(report.unidentified[0].url, null);
  assert.equal(report.unidentified[0].occurrences, 1);
});

test('one native scan keeps its starting account across folders and captures typed scope', async t => {
  realm(t); const client = new WebFolderClient(); let calls = 0;
  client.videos = async id => { calls++; return page(id, [media('1')]); };
  const report = await new InventoryService(client, 0).scan([folder, { ...folder, id: '101' }], { onPage: () => { document.cookie = 'DedeUserID=60; path=/'; } });
  assert.equal(report.complete, false); assert.equal(calls, 1); assert.match(report.folders[1].issue, /账号或空间/);
  assert.equal(report.scope[0].kind, 'created');
});

test('reader capture failure never strands inventory admission', async () => {
  const service = new InventoryService({ capture: () => { throw Error('Synthetic capture failure'); } });
  await assert.rejects(service.scan([folder]), /capture/); assert.equal(service.running, false);
});

for (const layout of ['legacy', 'vui']) {
  test(`${layout} reads native pages from a middle page, awaits cards after active-page update and follows next`, async t => {
    const vui = layout === 'vui', s = nativeControls[layout];
    realm(t, vui ? '<div class="favlist-info-detail__title-row">Fictional folder</div><div class="favlist-info-detail__data">视频数: 5</div><div class="favlist-main"><div class="items"></div><div class="vui_pagenation"></div></div>' :
      '<div class="favInfo-details"><span class="fav-name">Fictional folder</span>视频数: 5</div><div class="fav-video-list"></div><div class="be-pager"></div>');
    const container = document.querySelector(vui ? '.items' : '.fav-video-list'), pager = document.querySelector(s.pagination);
    let current = 2; const clicks = [];
    const renderCards = pn => {
      container.innerHTML = Array.from({ length: pn === 3 ? 1 : 2 }, (_, i) => {
        const id = (pn - 1) * 2 + i + 1;
        return vui ? `<div class="bili-video-card"><a href="/video/av${id}"></a><div class="bili-video-card__title" title="Fictional video ${id}"></div><span class="bili-cover-card__stat">01:00</span><a class="bili-video-card__author" href="//space.bilibili.com/90"><span></span><span title="Fictional author · 收藏于昨天">Fictional author · 收藏于昨天</span></a></div>` :
          `<div class="small-item"><a class="title" href="/video/av${id}" title="Fictional video ${id}"></a><span class="length">01:00</span><a class="up-name" href="//space.bilibili.com/90">Fictional author</a></div>`;
      }).join('');
    };
    const renderPager = () => {
      pager.innerHTML = vui ? `<button class="vui_pagenation--btn-num">1</button><button class="vui_button--active">${current}</button><button aria-label="下一页" ${current === 3 ? 'disabled' : ''}>下一页</button>` :
        `<button class="be-pager-item">1</button><button class="be-pager-item-active">${current}</button><button class="be-pager-next" ${current === 3 ? 'disabled' : ''}>下一页</button>`;
      pager.querySelector(s.page).onclick = () => navigate(1);
      pager.querySelector(s.next).onclick = () => navigate(current + 1);
    };
    const navigate = pn => { clicks.push(pn); current = pn; renderPager(); setTimeout(() => renderCards(pn), 120); };
    renderCards(2); renderPager();
    const client = new WebFolderClient();
    Object.defineProperty(client, 'selectors', { value: s }); client.select = async () => document.createElement('div');
    const report = await new InventoryService(client, 0).scan([folder]);
    assert.equal(report.complete, true); assert.equal(report.entries, 5); assert.deepEqual(clicks, [1, 2, 3]);
    assert.deepEqual(report.videos.map(v => v.id), ['1', '2', '3', '4', '5']); assert.equal(report.videos[0].title, 'Fictional video 1');
    assert.equal(report.knownDurationSeconds, 300); assert.equal(report.videos[0].uploaderName, 'Fictional author');

    // The same native pagination contract also protects multi-page copy.
    const sidebar = document.createElement('div');
    if (vui) sidebar.className = 'favlist-aside'; else sidebar.id = 'fav-createdList-container';
    document.body.append(sidebar); current = 2; renderCards(2); renderPager(); clicks.length = 0;
    if (vui) {
      const last = document.createElement('button'); last.className = 'vui_pagenation--btn-num'; last.textContent = '3'; last.onclick = () => navigate(3); pager.append(last);
    } else pager.append(document.createTextNode('共 3 页'));
    assert.equal(BilibiliAPI.getTotalPages(), 3, 'numeric VUI pages must not collapse to one');
    // Each subsequent pager render includes the last numeric page / total.
    pager.addEventListener('click', () => {
      if (vui) { const last = document.createElement('button'); last.className = 'vui_pagenation--btn-num'; last.textContent = '3'; last.onclick = () => navigate(3); pager.append(last); }
      else if (!pager.textContent.includes('共')) pager.append(document.createTextNode('共 3 页'));
    });
    window.history.replaceState(null, '', '/60/favlist?fid=100&ftype=create');
    const manager = new FavoriteManager(), copiedPages = [];
    manager.api = { clickFavorite: async () => true, getCurrentFavoriteName: () => folder.name, ensureBatchModeActive: async () => true,
      getCopyPageSnapshot: () => BilibiliAPI.getCopyPageSnapshot(), prepareCopyPages: (...args) => BilibiliAPI.prepareCopyPages(...args),
      clickNextPage: guard => BilibiliAPI.clickNextPage(guard) };
    manager.copyOnePage = async () => { copiedPages.push(current); return true; };
    assert.equal(await manager.copyFavorite(folder.name, 'Target'), true);
    assert.deepEqual(copiedPages, [1, 2, 3]); assert.deepEqual(clicks, [1, 2, 3]);
  });
}

test('native reader rejects manual account/folder/search changes and aborts while awaiting cards', async t => {
  realm(t); const client = new WebFolderClient(), reader = new NativeVideoReader(client);
  reader.context = { actor: '50', pageOwner: '50', key: 'created:100' };
  document.cookie = 'DedeUserID=60; path=/'; assert.throws(() => reader.check(folder), /变化/);
  document.cookie = 'DedeUserID=50; path=/'; window.history.replaceState(null, '', '?fid=101&ftype=create'); assert.throws(() => reader.check(folder), /变化/);
  window.history.replaceState(null, '', '?fid=100&ftype=create');
  const controller = new AbortController(); controller.abort();
  await assert.rejects(reader.settle(folder, 1, controller.signal), { name: 'AbortError' });
});

test('local video details use bounded pages, searchable text and safe DOM rendering', t => {
  realm(t);
  const videos = Array.from({ length: 51 }, (_, i) => ({ id: String(i + 1), title: i ? `Fictional ${i}` : '<img onerror="bad">', url: null, uploaderName: 'Author', duration: null, folders: [folder], occurrences: 1 }));
  const details = videoDetails({ videos }); document.body.append(details); details.open = true; details.dispatchEvent(new window.Event('toggle'));
  assert.equal(details.querySelectorAll('li').length, 50); assert.equal(details.querySelector('img'), null);
  [...details.querySelectorAll('button')].find(b => b.textContent === '下一页').click(); assert.equal(details.querySelectorAll('li').length, 1);
  const search = details.querySelector('input'); search.value = '<img'; search.dispatchEvent(new window.Event('input'));
  assert.equal(details.querySelectorAll('li').length, 1); assert.match(details.querySelector('li').textContent, /<img/);
});
