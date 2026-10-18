import { FavoriteManager } from './core/FavoriteManager.js';
import { PageLifecycle } from './core/PageLifecycle.js';
import { FloatingPanel } from './ui/FloatingPanel.js';
import { log, setLoggerPanel, setLoggerStore } from './utils/logger.js';
import { CONFIG } from './config/config.js';

// SPA 重复注入时只保留一个生命周期。
if (!window.__biliFavsLifecycle) {
  let panel = null;
  let notice = null;

  function unmount() {
    panel?.destroy();
    panel = null;
    notice?.remove();
    notice = null;
    setLoggerPanel(null);
    setLoggerStore(null);
    // Tampermonkey 的 Window 代理可能拒绝 delete；赋空值同样能释放引用。
    window.BiliFavPanel = null;
    window.BiliFavManager = null;
  }

  const lifecycle = new PageLifecycle({
    unmount,
    mount() {
      notice?.remove();
      notice = null;
      const manager = new FavoriteManager();
      setLoggerStore(manager.logs);
      if (!manager.initialize()) return;
      panel = new FloatingPanel(manager);
      panel.onDismiss = () => { lifecycle.dismissed = true; };
      setLoggerPanel(panel);
      panel.init();
      window.BiliFavManager = manager;
      window.BiliFavPanel = panel;
      log(`脚本已就绪 v${CONFIG.SCRIPT.VERSION}`);

      const mountedPanel = panel;
      mountedPanel.setBusy(true);
      manager.crossPageFlow.resumeFlow().catch(err => {
        if (!['failed', 'unknown'].includes(manager.operation.state.status))
          manager.operation.finish('failed', err.message);
      }).finally(() => { if (mountedPanel.floatingPanel) mountedPanel.setBusy(false); });
    },
    refresh() {
      if (panel?.busy) return false;
      panel?.refreshFavorites();
    },
    notify(message) {
      notice = document.createElement('div');
      notice.id = 'bili-favs-status';
      notice.setAttribute('role', 'status');
      notice.style.cssText = 'position:fixed;top:20px;right:20px;z-index:99999;background:white;color:#333;padding:16px;border:1px solid #00a1d6;max-width:360px;';
      notice.textContent = `B站收藏夹批量管理：${message}`;
      document.body.appendChild(notice);
    }
  });
  window.__biliFavsLifecycle = lifecycle;

  const checkPage = () => {
    try { lifecycle.tick(); }
    catch (err) { console.error('[BiliBili Favs] 初始化失败:', err); }
  };
  // 轮询可跨油猴隔离环境观察路由，也可处理 load 之后才挂载的收藏夹。
  // 切换同一用户的收藏夹时保留面板，不打断任务。
  window.setInterval(checkPage, 500);
  window.addEventListener('pageshow', checkPage);
  checkPage();

  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('显示收藏夹管理面板', () => lifecycle.reopen());
  }
}
