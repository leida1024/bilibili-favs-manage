import { nativeControls } from './nativeControls.js';

/** 旧版个人空间（带“体验新版”入口）。 */
export const LegacyPageAdapter = {
  name: '旧版个人空间',
  nativeControls: nativeControls.legacy,
  notification: '.be-toast, .vui_toast, .bili-message, .bili-toast, .be-message, .toast-text',
  sidebar: '#fav-createdList-container',
  sidebarCreate: '#fav-createdList-container',
  sidebarCreateForm: {
    dialog: '.edit-media-list .edit-mask', input: '#media-list-name', confirm: '.submit-btn'
  },
  item: '.fav-item',
  title: 'a.text',
  itemLink: 'a.text',
  currentTitle: '.favInfo-details .fav-name',
  batchButton: '.fav-header .do-batch',
  selectAll: '.fav-action-bottom li:has(i[class*="icon-selece-all"])',
  selectedAll: '.icon-selece-all-active',
  copyButton: '.fav-action-bottom li:has(.icon-copy)',
  dialog: '.edit-video-modal',
  dialogItem: '.target-favitem',
  dialogTitle: '.fav-name',
  radio: '.fav-select',
  createButton: '.fake-fav-input',
  createConfirm: '.edit-video-modal .fav-add-btn',
  confirm: '.modal-footer .btn',
  cancel: '.modal-header-close',
  pagination: '.be-pager',
  next: '.be-pager-next',
  getFavorites() {
    return Array.from(document.querySelectorAll(`${this.sidebar} ${this.item}`));
  }
};
