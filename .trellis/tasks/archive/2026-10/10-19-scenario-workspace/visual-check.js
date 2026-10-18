(() => {
  if (location.origin !== 'http://127.0.0.1:8766') throw new Error('Fictional preview only');
  const panel = window.previewPanel;
  const host = document.createElement('style'); host.textContent = 'label,input,select,button { font:19px Georgia; }'; document.head.append(host);
  const style = getComputedStyle(panel.floatingPanel);
  const luminance = color => {
    const hex = color.trim().slice(1);
    const rgb = (hex.length === 3 ? [...hex].map(c => c + c) : hex.match(/../g)).map(c => parseInt(c, 16) / 255);
    const [r, g, b] = rgb.map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
    return .2126 * r + .7152 * g + .0722 * b;
  };
  const pairs = [['ink', 'surface'], ['muted', 'surface'], ['muted', 'soft'], ['blue', 'surface'], ['surface', 'blue'], ['danger', 'surface'], ['danger', 'danger-soft'], ['success', 'surface'], ['warning', 'soft'], ['control', 'surface'], ['blue', 'selected']];
  const contrast = pairs.map(([foreground, background]) => {
    const a = luminance(style.getPropertyValue('--bf-' + foreground));
    const b = luminance(style.getPropertyValue('--bf-' + background));
    const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    return { pair: `${foreground}/${background}`, ratio: +ratio.toFixed(2), minimum: foreground === 'control' ? 3 : 4.5 };
  });
  const typography = [...panel.floatingPanel.querySelectorAll('label,input,button,select')].filter(node => !node.closest('[hidden]')).map(node => ({ element: node.tagName, font: getComputedStyle(node).fontFamily }));
  const result = { contrast, contrastPass: contrast.every(pair => pair.ratio >= pair.minimum),
    hostileHostFontPass: typography.every(item => item.font === style.fontFamily),
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    transition: getComputedStyle(panel.logsButton).transitionDuration,
    colorScheme: style.colorScheme };
  host.remove(); return result;
})()
