(async () => {
  if (location.origin !== 'http://127.0.0.1:8766') throw new Error('Fictional preview only');
  const results = [];
  const scenario = document.querySelector('#scenario');
  const host = document.createElement('style');
  host.textContent = 'button,input,select,textarea,label { font-family:Georgia; font-size:19px; }';
  document.head.append(host);
  const check = label => {
    const p = window.previewPanel, root = p.floatingPanel, rect = root.getBoundingClientRect();
    const visible = [...root.querySelectorAll('*')].filter(el => el.getBoundingClientRect().width && el.getBoundingClientRect().height);
    const outside = visible.filter(el => {
      const r = el.getBoundingClientRect();
      return r.left < rect.left - 1 || r.right > rect.right + 1;
    });
    const fonts = new Set(visible.filter(el => /^(BUTTON|INPUT|SELECT|TEXTAREA|LABEL|H2|H3|TIME)$/.test(el.tagName)).map(el => getComputedStyle(el).fontFamily));
    const footer = p.footer.getBoundingClientRect(), logs = p.diagnostics.getBoundingClientRect();
    const ok = outside.length === 0 && fonts.size === 1 && rect.bottom <= innerHeight + 1 && rect.right <= innerWidth + 1 &&
      (p.minimized || (footer.top >= rect.top && footer.bottom <= rect.bottom + 1 && p.content.clientHeight >= 48)) &&
      (!p.logsOpen || (logs.bottom <= rect.bottom + 1 && p.outputTextBox.clientHeight >= 24));
    results.push({ label, ok, outside: outside.map(el => el.className || el.tagName), fontFamilies: fonts.size,
      bodyHeight: p.content.clientHeight, recordHeight: p.outputTextBox.clientHeight, panelHeight: Math.round(rect.height) });
  };
  for (const name of ['ready', 'empty', 'many', 'running', 'failed', 'completed', 'interrupted']) {
    scenario.value = name; scenario.dispatchEvent(new Event('change'));
    const p = window.previewPanel;
    check(name); p.toggleLogs(); check(name + '-records');
    p.toggleMinimize(); p.toggleMinimize(); check(name + '-restored');
  }
  scenario.value = 'ready'; scenario.dispatchEvent(new Event('change'));
  const p = window.previewPanel; p.showView('manage');
  check('manage-empty'); await p.inventoryPanel.load(); check('manage-loaded');
  p.inventoryPanel.mutations.rows[1].input.checked = true; p.inventoryPanel.updateBusy(); p.inventoryPanel.mutations.preview();
  check('manage-confirm'); p.toggleLogs(); check('manage-confirm-records');
  p.showView('statistics'); check('statistics-loaded-records');
  p.inventoryPanel.kind.value = 'subscribed'; p.inventoryPanel.kind.dispatchEvent(new Event('change'));
  await p.inventoryPanel.load(); check('subscriptions');
  host.remove();
  return { viewport: [innerWidth, innerHeight], pass: results.every(r => r.ok), checks: results.length, failures: results.filter(r => !r.ok) };
})();
