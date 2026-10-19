import { warn } from '../../utils/logger.js';

/** 新版 VUI 收藏夹页。 */
export const VuiPageAdapter = {
  name: '新版 (VUI)',
  notification: '.vui_toast',
  sidebar: '.favlist-aside',
  sidebarCreate: '.favlist-aside',
  item: '.vui_sidebar-item',
  title: '.vui_sidebar-item-title .vui_ellipsis',
  itemLink: null,
  currentTitle: '.favlist-info-detail__title-row',
  batchButton: '.vui_button.favlist-info-batch',
  selectAll: '.vui_checkbox',
  selectedAll: '.vui_checkbox--checked, input:checked',
  copyButton: null,
  dialog: '.vui_dialog--content.fav-modify-modal-content',
  dialogItem: '.modify-fav-item',
  dialogTitle: '.modify-fav-item__title',
  radio: 'input[type="radio"].vui_radio--input-original',
  createButton: '.modify-fav-add',
  createConfirm: null,
  confirm: 'button.vui_button--blue',
  cancel: 'button:not(.vui_button--blue)',
  pagination: '.vui_pagenation',
  next: 'button',
  getFavorites() {
    const sidebar = document.querySelector(this.sidebar);
    if (!sidebar) return [];
    const items = Array.from(sidebar.querySelectorAll(this.item));
    const marker = text => Array.from(sidebar.querySelectorAll('*')).filter(
      el => el.textContent.trim() === text && !el.querySelector(this.item)
    ).pop();
    const follows = (a, b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    const start = marker('我创建的收藏夹') || marker('TA创建的收藏夹');
    if (!start) {
      warn('未找到创建分组标记，使用侧栏收藏夹列表');
      return items;
    }
    const end = ['我追的合集/收藏夹', '其他收藏', 'TA追的合集/收藏夹']
      .map(marker).filter(el => el && follows(start, el))
      .sort((a, b) => follows(a, b) ? -1 : 1)[0];
    return items.filter(item => follows(start, item) && (!end || follows(item, end)));
  }
};
