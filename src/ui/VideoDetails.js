import { element, button } from './elements.js';

/** Paged local view: exports keep every retained item; DOM stays bounded. */
export function videoDetails(report) {
  const root = element('details', 'bf-video-details');
  const videos = [...report.videos, ...(report.unidentified || [])];
  root.append(element('summary', '', `视频明细（${videos.length} 项）`));
  const label = element('label', 'bf-search', '搜索视频或作者');
  const search = element('input'); search.type = 'search'; label.append(search);
  const list = element('ol', 'bf-video-list'), count = element('span', 'bf-muted');
  let page = 0;
  const previous = button('上一页', () => { page--; render(); });
  const next = button('下一页', () => { page++; render(); });
  const tools = element('div', 'bf-tools'); tools.append(previous, count, next);
  const render = () => {
    const query = search.value.trim().toLocaleLowerCase();
    const matches = videos.filter(v => [v.title, v.uploaderName, v.id, v.bvid, ...v.folders.map(f => f.name)].some(value => String(value || '').toLocaleLowerCase().includes(query)));
    const pages = Math.max(1, Math.ceil(matches.length / 50)); page = Math.max(0, Math.min(page, pages - 1));
    count.textContent = `${matches.length} 项 · ${page + 1}/${pages} 页`; previous.disabled = page === 0; next.disabled = page + 1 === pages;
    list.replaceChildren(); list.start = page * 50 + 1;
    for (const video of matches.slice(page * 50, (page + 1) * 50)) {
      const row = element('li');
      const title = element(video.url ? 'a' : 'span', '', video.title || '（视频名称未知）');
      if (video.url) { title.href = video.url; title.target = '_blank'; title.rel = 'noopener noreferrer'; }
      row.append(title, element('p', 'bf-muted', `${video.uploaderName || '作者未知'} · ${video.duration === null ? '时长未知' : `${video.duration} 秒`}${video.unavailable ? ' · 已失效' : ''} · 出现 ${video.occurrences || 1} 次`),
        element('p', 'bf-muted', `所在收藏夹：${video.folders.map(f => f.name).join('、')}`));
      list.append(row);
    }
    if (!matches.length) list.append(element('li', 'bf-muted', '没有匹配的视频。'));
  };
  search.addEventListener('input', () => { page = 0; render(); });
  root.addEventListener('toggle', () => { if (root.open && !list.children.length) render(); });
  root.append(label, list, tools);
  return root;
}
