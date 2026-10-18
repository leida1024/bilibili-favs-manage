(async () => {
  if (location.origin !== 'http://127.0.0.1:8766') throw new Error('Fictional preview only');
  const failures = [], results = [];
  const frame = async () => document.body.getBoundingClientRect();
  const assert = (ok, message) => { if (!ok) failures.push(message); };
  const rect = node => node.getBoundingClientRect();
  const scenario = async name => {
    const select = document.querySelector('#scenario'); select.value = name;
    select.dispatchEvent(new Event('change')); await frame(); return window.previewPanel;
  };
  const inspect = (p, label) => {
    const root = rect(p.floatingPanel), body = rect(p.content), footer = rect(p.footer), logs = rect(p.diagnostics);
    assert(root.width <= innerWidth && root.right <= innerWidth + 1 && root.bottom <= innerHeight + 1, label + ': viewport');
    assert(p.floatingPanel.scrollWidth <= p.floatingPanel.clientWidth + 1, label + ': horizontal root');
    assert(p.content.scrollWidth <= p.content.clientWidth + 1, label + ': horizontal content');
    assert(body.height >= 44, label + ': task height ' + body.height);
    assert(footer.height >= 28 && footer.bottom <= root.bottom + 1, label + ': action');
    if (root.width >= 560) assert(logs.left >= body.right - 1 && logs.top < footer.top, label + ': side records');
    else assert(logs.top >= footer.bottom - 1, label + ': bottom records');
    const rows = p.activeView === 'copy' ? p.favCheckboxItemList.map(x => x.checkboxContainer) :
      p.activeView === 'manage' ? p.inventoryPanel.mutations.rows.map(x => x.node) : p.inventoryPanel.rows.map(x => x.node);
    const visible = rows.filter(node => { const r = rect(node); return !node.hidden && r.height > 0 && r.top >= body.top && r.bottom <= body.bottom; }).length;
    for (const node of p.floatingPanel.querySelectorAll('button,input,select')) {
      if (!node.getClientRects().length) continue;
      const box = rect(node); assert(box.left >= root.left - 1 && box.right <= root.right + 1, label + ': control ' + node.tagName);
    }
    return { label, width: root.width, taskWidth: Math.round(body.width), taskHeight: Math.round(body.height), visible };
  };
  window.previewPanel.layout.reset();
  for (const name of ['ready', 'empty', 'dense', 'many', 'running', 'failed', 'completed', 'interrupted']) {
    const p = await scenario(name); results.push(inspect(p, name));
    if (name === 'dense' && innerWidth >= 1024 && innerHeight >= 768)
      assert(results.at(-1).visible >= 7, 'dense: seven complete copy rows');
    if (name === 'empty') assert(getComputedStyle(p.selectionTools.root).display === 'none', 'empty: no empty selection bar');
    if (name === 'running') assert([...p.viewButtons.values()].every(b => b.disabled), 'running: navigation locked');
    p.setBusy(false);
    for (const view of ['statistics', 'manage']) {
      p.showView(view); await p.inventoryPanel.load(); await frame();
      const r = inspect(p, name + '/' + view); results.push(r);
      assert(p.statusBox.hidden, view + ': load status not permanent');
      assert(!p.inventoryPanel.kind.querySelector('select'), view + ': direct scope buttons');
      if (name === 'dense' && view === 'manage' && innerWidth >= 1024 && innerHeight >= 768)
        assert(r.visible >= 7, 'dense: seven complete management rows');
    }
  }
  const p = await scenario('dense');
  p.operation.begin('模拟复制', 40); p.operation.finish('unknown', '虚构：已提交但未观察到成功。请核对目标。');
  await frame(); results.push(inspect(p, 'dense/unknown'));
  assert(p.statusTitle.textContent.includes('待核对'), 'unknown: truthful status');
  p.showView('statistics'); assert(p.statusBox.hidden, 'state: unrelated status hidden');
  assert(!p.outputTextBox.textContent.includes('已提交但未观察'), 'logs: current function');
  p.logScope.value = 'all'; p.renderLogs(); assert(p.outputTextBox.textContent.includes('已提交但未观察'), 'logs: all functions');
  p.showView('copy'); assert(!p.statusBox.hidden, 'state: original result preserved');
  p.toggleLogs(); p.toggleLogs(); assert(!p.diagnostics.hidden, 'records toggle');
  p.logsButton.focus(); p.reviewExport('{}', 'fictional.json');
  assert(p.header.inert && p.content.inert && p.diagnostics.inert, 'modal inert');
  p.exportReview.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert(document.activeElement === p.logsButton, 'modal focus restoration');
  p.toggleMinimize(); p.toggleMinimize(); await frame(); inspect(p, 'restore');
  return { viewport: [innerWidth, innerHeight], results, failures };
})()
