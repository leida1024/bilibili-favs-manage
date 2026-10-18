(() => {
  if (location.origin !== 'http://127.0.0.1:8766') throw new Error('Fictional preview only');
  const scenario = document.querySelector('#scenario');
  scenario.value = 'failed'; scenario.dispatchEvent(new Event('change'));
  const p = window.previewPanel; p.toggleLogs();
  const style = getComputedStyle(p.floatingPanel);
  const luminance = color => {
    const hex = color.trim().slice(1);
    const values = (hex.length === 3 ? [...hex].map(c => c + c) : hex.match(/../g)).map(c => parseInt(c, 16) / 255);
    const [r, g, b] = values.map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
    return .2126 * r + .7152 * g + .0722 * b;
  };
  const pairs = [['ink', 'surface'], ['muted', 'surface'], ['muted', 'soft'], ['blue', 'surface'], ['surface', 'blue'], ['danger', 'surface'], ['danger', 'danger-soft'], ['success', 'surface'], ['warning', 'soft'], ['control', 'surface'], ['blue', 'selected']];
  const contrast = pairs.map(([foreground, background]) => {
    const a = luminance(style.getPropertyValue('--bf-' + foreground));
    const b = luminance(style.getPropertyValue('--bf-' + background));
    return { pair: foreground + '/' + background, ratio: +((Math.max(a, b) + .05) / (Math.min(a, b) + .05)).toFixed(2), minimum: foreground === 'control' ? 3 : 4.5 };
  });
  const controls = [p.logsButton, p.minimizeButton, p.dismissButton, ...p.viewButtons.values(), p.startBatchTransferButton, p.logFilter, p.followCheckbox];
  return { contrast, contrastPass: contrast.every(r => r.ratio >= r.minimum),
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    transition: getComputedStyle(p.logsButton).transitionDuration,
    controls: controls.map(el => ({ text: el.getAttribute('aria-label') || el.textContent, height: +el.getBoundingClientRect().height.toFixed(1) })),
    typography: ['h2', 'label', 'input[type=text]', 'button', '.bf-log-message'].map(s => ({ selector: s, size: getComputedStyle(p.floatingPanel.querySelector(s)).fontSize, family: getComputedStyle(p.floatingPanel.querySelector(s)).fontFamily })) };
})();
