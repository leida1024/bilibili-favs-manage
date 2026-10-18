import { element } from './elements.js';

/** Quiet list row; exact identifiers remain available without overwhelming selection. */
export function folderRow(folder, input, reason = '') {
  const row = element('div', 'bf-folder-item');
  const label = element('label', 'bf-folder-row');
  label.append(input, element('span', 'bf-folder-name', folder.name),
    element('span', 'bf-folder-count', folder.count == null ? '数量未知' : `${folder.count} 条`));
  row.append(label, element('span', 'bf-folder-identity', `ID ${folder.id} / 所有者 ${folder.ownerId || '未知'}`));
  if (reason) row.append(element('span', 'bf-folder-reason', `不可选：${reason}`));
  return row;
}
