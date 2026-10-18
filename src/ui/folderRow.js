import { element } from './elements.js';

/** Quiet list row; exact identifiers remain available without overwhelming selection. */
export function folderRow(folder, input, reason = '') {
  const row = element('div', 'bf-folder-item');
  const label = element('label', 'bf-folder-row');
  label.append(input, element('span', 'bf-folder-name', folder.name),
    element('span', 'bf-folder-count', folder.count == null ? '数量未知' : `${folder.count} 条`));
  const identity = `ID ${folder.id} / 所有者 ${folder.ownerId || '未知'}`;
  label.title = `${folder.name} · ${identity}`;
  input.setAttribute('aria-label', `${folder.name} · ${identity}${reason ? ` · 不可选：${reason}` : ''}`);
  row.append(label);
  if (reason) row.append(element('span', 'bf-folder-reason', `不可选：${reason}`));
  return row;
}
