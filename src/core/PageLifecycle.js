import { PageDetector } from './PageDetector.js';
import { getPageAdapter } from './adapters/index.js';

/** 在油猴沙箱中轮询路由和真实业务 DOM，不修改网站的 history。 */
export class PageLifecycle {
  constructor({ mount, unmount, refresh, notify, now = Date.now }) {
    Object.assign(this, { mount, unmount, refresh, notify, now });
    this.uid = null;
    this.actor = null;
    this.sidebar = null;
    this.names = '';
    this.startedAt = now();
    this.notified = false;
    this.dismissed = false;
  }

  tick() {
    const uid = PageDetector.getCurrentPageUID();
    const actor = PageDetector.getLoginUserUID();
    if (uid !== this.uid || actor !== this.actor) {
      this.unmount();
      this.uid = uid;
      this.actor = actor;
      this.sidebar = null;
      this.names = '';
      this.startedAt = this.now();
      this.notified = false;
      this.dismissed = false;
    }
    if (!uid || !document.body || this.dismissed) return;
    const adapter = getPageAdapter();
    const sidebar = adapter && document.querySelector(adapter.sidebar);
    if (!sidebar) {
      if (!this.notified && this.now() - this.startedAt >= 15000) {
        this.notify('收藏夹仍未加载，或当前界面暂不支持。脚本会继续等待；可刷新页面重试。');
        this.notified = true;
      }
      return;
    }
    const names = Array.from(sidebar.querySelectorAll(adapter.title))
      .map(el => el.textContent.trim()).join('\n');
    if (!this.sidebar) this.mount();
    else if (sidebar !== this.sidebar || names !== this.names) {
      if (this.refresh() === false) return;
    }
    this.sidebar = sidebar;
    this.names = names;
  }

  reopen() {
    this.unmount();
    this.sidebar = null;
    this.dismissed = false;
    this.notified = false;
    this.tick();
  }
}
