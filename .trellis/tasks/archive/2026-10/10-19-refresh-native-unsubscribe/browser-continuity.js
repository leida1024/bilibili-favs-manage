(async () => {
  if (location.origin !== 'http://127.0.0.1:8766') throw Error('Fictional preview only');
  const p = window.previewPanel, results = [], failures = [];
  const frame = async () => document.body.getBoundingClientRect();
  const rectangle = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
  const near = (a, b) => Object.keys(a).every(k => Math.abs(a[k] - b[k]) < 1);
  const check = (ok, message) => { if (!ok) failures.push(message); };
  p.setBusy(false); p.layout.reset(); await frame();
  for (const [width, height] of [[600, 500], [480, 500], [400, 400]]) {
    p.layout.reset(); p.floatingPanel.style.width = width + 'px'; p.floatingPanel.style.height = height + 'px'; p.recordPanelSize();
    await frame();
    const before = rectangle(p.content), footer = rectangle(p.footer), outer = rectangle(p.floatingPanel);
    p.toggleLogs(); await frame(); const hidden = rectangle(p.content);
    check(near(before, hidden), `${width}: collapse task rectangle`); check(near(footer, rectangle(p.footer)), `${width}: collapse footer`);
    p.toggleLogs(); await frame(); check(near(before, rectangle(p.content)), `${width}: reopen task rectangle`);
    check(near(outer, rectangle(p.floatingPanel)), `${width}: restore outer`);
    results.push({ width, before, hidden, after: rectangle(p.content) });
  }
  p.layout.reset(); p.toggleLogs(); p.floatingPanel.style.width = '400px'; p.recordPanelSize(); await frame();
  const resizedHidden = rectangle(p.content); p.toggleLogs(); await frame();
  check(near(resizedHidden, rectangle(p.content)), 'hidden resize preserved on reopen');
  p.layout.reset(); p.showView('settings'); await frame();
  check(p.activeView === 'settings' && !p.settingsRoot.hidden && p.footer.hidden, 'settings independent panel');
  check(!p.header.inert && !p.exportReview, 'settings does not block title');
  const original = rectangle(p.floatingPanel); p.header.focus();
  p.header.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); await frame();
  check(rectangle(p.floatingPanel).x > original.x, 'settings keyboard move');
  p.header.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true, bubbles: true })); await frame();
  check(rectangle(p.floatingPanel).w > original.w, 'settings keyboard resize');
  check(p.logScope.closest('label').textContent.includes('范围') && p.logFilter.closest('label').textContent.includes('内容'), 'visible record labels');
  check(getComputedStyle(p.logFilter).appearance === 'auto', 'native dropdown affordance');
  p.showView('copy'); p.appendLog('Fictional refresh continuity marker');
  p.layout.reset(); Object.assign(p.floatingPanel.style, { left: '70px', top: '60px', width: '620px', height: '470px' });
  p.recordPanelSize();
  sessionStorage.setItem('fictional-expected-geometry', JSON.stringify(rectangle(p.floatingPanel)));
  return { viewport: [innerWidth, innerHeight], results, failures, refreshPrepared: true };
})()
