import { normalizeFolder, stableId } from '../FolderClient.js';
import { normalizeFavoriteName } from '../../utils/favoriteNames.js';

// Read page-owned component data only. Mutation always goes through native UI.
function pageDocument() {
  return typeof unsafeWindow !== 'undefined' ? unsafeWindow.document : document;
}

export function legacySubscriptionSource(group) {
  const pageGroup = pageDocument().getElementById(group.id) || group;
  let vm = pageGroup?.__vue__;
  for (let depth = 0; vm && depth < 8; depth++, vm = vm.$parent) {
    const source = vm.collectedList;
    if (Array.isArray(source?.list) && Number.isSafeInteger(source.count) && source.count >= 0) return source;
  }
  return null;
}

export function subscriptionBindings(rows, group, legacy) {
  const bindings = new Map();
  if (legacy) {
    const source = legacySubscriptionSource(group);
    for (const row of rows) {
      const href = row.querySelector('a.text')?.getAttribute('href');
      if (!href) continue;
      const url = new URL(href, window.location.href);
      const id = stableId(url.searchParams.get('fid')), type = Number(url.searchParams.get('ctype'));
      if (url.origin !== window.location.origin || url.pathname.split('/')[1] !== window.location.pathname.split('/')[1] || url.searchParams.get('ftype') !== 'collect' || !id || ![11, 21].includes(type)) continue;
      const raw = source?.list.find(item => stableId(item.id) === id && item.type === type);
      const title = row.querySelector('a.text').textContent.trim();
      if (raw && normalizeFavoriteName(raw.title) !== normalizeFavoriteName(title)) throw new Error('网页条目名称与绑定身份不一致，未提交');
      bindings.set(row, normalizeFolder(raw || { id, type, title, state: row.classList.contains('favInvalid') ? 1 : 0 }, 'subscribed', 0, true));
    }
    return bindings;
  }
  const wanted = new Set(rows), seen = new Set(), stack = [pageDocument().querySelector('#app')?._vnode];
  while (stack.length && seen.size < 30000) {
    const vnode = stack.pop();
    if (!vnode || typeof vnode !== 'object' || seen.has(vnode)) continue;
    seen.add(vnode);
    const component = vnode.component;
    if (component?.type?.__name === 'FavSidebarItem') {
      const row = wanted.has(vnode.el) ? vnode.el : rows.find(node => vnode.el && node.isSameNode(vnode.el));
      if (!row) continue;
      const { item, type } = component.props || {};
      if (type !== 'collect' || !item || !stableId(item.id) || ![11, 21].includes(item.type)) continue;
      const title = row.querySelector('.vui_ellipsis')?.textContent.trim();
      if (normalizeFavoriteName(item.title) !== normalizeFavoriteName(title)) throw new Error('网页条目名称与绑定身份不一致，未提交');
      if (bindings.has(row)) throw new Error('网页条目绑定重复，未提交');
      bindings.set(row, normalizeFolder(item, 'subscribed', 0, true));
    }
    if (component?.subTree) stack.push(component.subTree);
    if (Array.isArray(vnode.children)) stack.push(...vnode.children);
    if (vnode.suspense?.activeBranch) stack.push(vnode.suspense.activeBranch);
  }
  if (stack.length) throw new Error('网页组件读取超过上限，未提交');
  return bindings;
}
