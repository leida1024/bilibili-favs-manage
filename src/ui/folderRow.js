import { element } from './elements.js';

/** Quiet list row; exact identifiers remain available without overwhelming selection. */
export function folderRow(folder, input, reason = '') {
  const row = element('div', 'bf-folder-item');
  const label = element('label', 'bf-folder-row');
  const text = element('span', 'bf-folder-text');
  text.append(element('strong', '', folder.name), element('small', '', `${folder.count == null ? '数量未知' : `${folder.count} 条内容`}${reason ? `；不可选：${reason}` : ''}`));
  label.append(input, text);
  const details = element('details', 'bf-object-details');
  details.append(element('summary', '', 'ID 与所有者'), element('p', '', `ID ${folder.id}；所有者 ${folder.ownerId || '未知'}`));
  row.append(label, details);
  return row;
}
