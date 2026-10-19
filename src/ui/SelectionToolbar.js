import { element, button } from './elements.js';

/** Shared, local-only filtering and bulk selection. Hosts own selection side effects. */
export class SelectionToolbar {
  constructor({ rows, busy, change }) {
    this.rows = rows; this.busy = busy; this.change = change;
    this.root = element('div', 'bf-selection-tools');
    const label = element('label', 'bf-search');
    this.search = element('input'); this.search.type = 'search';
    this.search.placeholder = '搜索收藏夹';
    label.append(element('span', 'bf-sr-only', '搜索收藏夹'), this.search);
    this.allButton = button('全选', () => this.toggle(), 'bf-select-all');
    this.count = element('span', 'bf-selection-count');
    this.notice = element('span', 'bf-filter-notice');
    this.notice.hidden = true;
    this.root.append(label, this.allButton, this.count, this.notice);
    this.search.addEventListener('input', () => this.update());
  }

  visibleRows(rows = this.rows()) {
    const query = this.search.value.trim().toLocaleLowerCase();
    return rows.filter(row => row.name.toLocaleLowerCase().includes(query));
  }

  toggle() {
    if (this.busy()) return;
    const rows = this.visibleRows().filter(row => row.eligible);
    if (!rows.length) return;
    const checked = !rows.every(row => row.input.checked);
    for (const row of rows) row.input.checked = checked;
    this.update(); this.change();
  }

  update() {
    const rows = this.rows();
    this.root.dataset.empty = String(!rows.length);
    const visible = new Set(this.visibleRows(rows));
    const eligible = [...visible].filter(row => row.eligible);
    const selected = rows.filter(row => row.eligible && row.input.checked);
    const outside = selected.filter(row => !visible.has(row)).length;
    for (const row of rows) {
      row.node.hidden = !visible.has(row);
      row.node.dataset.selected = String(row.input.checked && row.eligible);
    }
    const all = eligible.length && eligible.every(row => row.input.checked);
    this.allButton.textContent = all ? '取消全选' : '全选';
    this.allButton.setAttribute('aria-label', `${all ? '取消全选' : '全选'}${this.search.value.trim() ? '搜索结果中' : ''}可选收藏夹`);
    this.allButton.disabled = this.busy() || !eligible.length;
    this.search.disabled = this.busy();
    const unavailable = rows.filter(row => !row.eligible).length;
    this.count.textContent = `已选 ${selected.length} / ${rows.length} 个收藏夹${unavailable ? ` · ${unavailable} 个不可选` : ''}`;
    this.notice.hidden = !this.search.value.trim();
    this.notice.textContent = `${visible.size} 个匹配${outside ? ` · 筛选外已选 ${outside} 个，也会执行` : ''}`;
  }
}
