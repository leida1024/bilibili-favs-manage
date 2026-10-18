(async () => {
  if (location.origin !== 'http://127.0.0.1:8766') throw new Error('Fictional preview only');
  const failures = [], results = [];
  const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const assert = (ok, message) => { if (!ok) failures.push(message); };
  const rect = node => node.getBoundingClientRect();
  const selectScenario = async name => {
    const select = document.querySelector('#scenario'); select.value = name;
    select.dispatchEvent(new Event('change')); await frame(); return window.previewPanel;
  };
  const inspect = (panel, label) => {
    const root = rect(panel.floatingPanel), body = rect(panel.content), footer = rect(panel.footer), logs = rect(panel.diagnostics);
    assert(root.width <= innerWidth && root.right <= innerWidth + 1 && root.bottom <= innerHeight + 1, `${label}: viewport containment`);
    assert(panel.floatingPanel.scrollWidth <= panel.floatingPanel.clientWidth + 1, `${label}: root horizontal overflow`);
    assert(panel.content.scrollWidth <= panel.content.clientWidth + 1, `${label}: content horizontal overflow`);
    assert(body.height >= 44, `${label}: readable task viewport ${body.height}`);
    assert(footer.height > 24 && footer.bottom <= root.bottom + 1, `${label}: action footer reachable`);
    if (root.width >= 580) assert(logs.left >= body.right - 1 && logs.top < footer.top, `${label}: side logs`);
    else assert(logs.top >= footer.bottom - 1 && logs.height <= 131, `${label}: narrow logs below footer`);
    const visible = panel.favCheckboxItemList.filter(item => {
      const row = rect(item.checkboxContainer); return row.top >= body.top && row.bottom <= body.bottom;
    }).length;
    for (const node of panel.floatingPanel.querySelectorAll('button,input,select')) {
      if (node.closest('[hidden]')) continue;
      const box = rect(node);
      assert(box.left >= root.left && box.right <= root.right + 1, `${label}: control fits ${node.tagName}`);
    }
    return { label, taskHeight: Math.round(body.height), visibleCopyRows: visible, width: root.width, logs: root.width >= 580 ? 'side' : 'bottom' };
  };
  for (const scenario of ['ready', 'empty', 'dense', 'many', 'running', 'failed', 'completed', 'interrupted']) {
    const panel = await selectScenario(scenario);
    const entry = inspect(panel, scenario); results.push(entry);
    if (scenario === 'dense' && innerHeight >= 768 && innerWidth >= 1024) assert(entry.visibleCopyRows >= 9, 'dense: at least nine full rows');
    if (scenario === 'running') {
      assert([...panel.viewButtons.values()].every(node => node.disabled), 'busy navigation locked');
      assert(panel.selectionTools.search.disabled && panel.selectAllButton.disabled, 'busy selection locked');
    }
    panel.setBusy(false);
    for (const view of ['statistics', 'manage']) {
      panel.showView(view); await panel.inventoryPanel.load(); await frame();
      results.push(inspect(panel, `${scenario}/${view}`));
    }
  }
  const panel = await selectScenario('dense');
  panel.toggleLogs(); await frame(); assert(panel.diagnostics.hidden, 'logs close');
  const closedTaskHeight = rect(panel.content).height;
  panel.toggleLogs(); await frame();
  if (innerWidth >= 1024) assert(rect(panel.content).height === closedTaskHeight, 'side logs do not consume task height');
  panel.operation.begin('模拟复制', 40); panel.operation.confirm('虚构确认'); panel.operation.finish('failed', '虚构失败，请检查页面结果。');
  await frame(); const failedDense = inspect(panel, 'dense/failed'); results.push(failedDense);
  if (innerWidth >= 1024 && innerHeight >= 768) assert(failedDense.visibleCopyRows >= 7, 'dense failure retains at least seven rows');
  panel.logsButton.focus(); panel.reviewExport('{}', 'fictional.json');
  assert(panel.header.inert && panel.content.inert && panel.diagnostics.inert, 'export background inert');
  panel.exportReview.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert(document.activeElement === panel.logsButton, 'export focus restoration');
  panel.toggleMinimize(); panel.toggleMinimize(); await frame();
  assert(!panel.diagnostics.hidden && !panel.content.hidden, 'minimize restores records and task');
  if (innerWidth >= 1024) {
    panel.floatingPanel.style.width = '400px'; await frame();
    assert(rect(panel.diagnostics).top >= rect(panel.footer).bottom - 1, 'manual narrow width relocates logs');
    assert(panel.content.scrollWidth <= panel.content.clientWidth + 1, 'manual width no horizontal overflow');
    panel.floatingPanel.style.width = '';
  }
  return { viewport: [innerWidth, innerHeight], results, failures };
})()
