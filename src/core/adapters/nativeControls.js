/** Native page controls, separate from HTTP transport and panel UI. */
export const nativeControls = {
  vui: {
    group: '.favlist-aside .vui_collapse_item', heading: '.vui_collapse_item_header',
    row: '.fav-sidebar-item', title: '.vui_ellipsis', click: '.vui_sidebar-item', more: '.fav-collapse-more',
    menu: '.menu-popover', menuItem: '.menu-popover__panel-item',
    detailTitle: '.favlist-info-detail__title-row', data: '.favlist-info-detail__data', owner: '.favlist-info-detail__data a.link',
    cards: '.favlist-main .bili-video-card', duration: '.bili-cover-card__stat',
    dialog: '.vui_dialog--content', confirm: 'button.vui_button--blue',
    pagination: '.vui_pagenation', page: '.vui_pagenation--btn-num', activePage: '[aria-current="page"]',
    next: 'button[aria-label="下一页"]'
  },
  legacy: {
    created: '#fav-createdList-container', subscribed: '#fav-collectedList-container', row: '.fav-item',
    title: 'a.text', click: 'a.text', more: '.more', menu: '.be-dropdown-trigger', menuItem: '.be-dropdown-item',
    detailTitle: '.favInfo-details .fav-name', data: '.favInfo-details', owner: '.favInfo-details a[href*="space.bilibili.com"]',
    cards: '.fav-video-list .small-item', duration: '.length', dialog: '.modal', confirm: '.modal-footer .btn',
    pagination: '.be-pager', page: '.be-pager-item', activePage: '.be-pager-item-active', next: '.be-pager-next'
  }
};
