import { CONFIG } from '../config/config.js';

/** Geometry is UI state; never restores execution state. */
export class PanelLayout {
  constructor(panel, preferences) { this.panel = panel; this.preferences = preferences; this.auxiliary = preferences.auxiliary; }
  get root() { return this.panel.floatingPanel; }
  restore() {
    const { geometry, layout } = this.preferences;
    if (geometry) for (const key of ['width', 'height', 'left', 'top']) this.root.style[key] = `${geometry[key]}px`;
    this.root.dataset.recordsLayout = this.panel.logsOpen ? this.orientation() : layout;
    if (this.auxiliary) this.root.style.setProperty(layout === 'bottom' ? '--bf-record-height' : '--bf-record-width', `${this.auxiliary}px`);
    this.clamp();
  }
  rect() {
    const r = this.root.getBoundingClientRect();
    return { width: r.width || parseFloat(this.root.style.width) || CONFIG.PANEL.INITIAL_WIDTH,
      height: r.height || parseFloat(this.root.style.height) || CONFIG.PANEL.INITIAL_HEIGHT,
      left: r.width ? r.left : parseFloat(this.root.style.left) || 24,
      top: r.height ? r.top : parseFloat(this.root.style.top) || 24 };
  }
  orientation() { return this.rect().width < 560 ? 'bottom' : 'side'; }
  clamp() {
    const r = this.rect();
    const width = Math.min(r.width, Math.max(280, window.innerWidth - 16));
    const height = Math.min(r.height, Math.max(64, window.innerHeight - 16));
    if (r.width !== width) this.root.style.width = `${width}px`;
    if (r.height !== height) this.root.style.height = `${height}px`;
    this.root.style.left = `${Math.max(0, Math.min(r.left, window.innerWidth - width))}px`;
    this.root.style.top = `${Math.max(0, Math.min(r.top, window.innerHeight - height))}px`;
    if (this.panel.logsOpen) this.root.dataset.recordsLayout = this.orientation();
  }
  toggle(willOpen) {
    const r = this.rect();
    const side = this.root.dataset.recordsLayout !== 'bottom';
    if (!willOpen) {
      const pane = this.panel.diagnostics.getBoundingClientRect();
      this.auxiliary = side ? pane.width || (r.width - 2) / 2.2 : pane.height || 130;
    }
    const key = side ? 'width' : 'height';
    if (willOpen) this.root.style.setProperty(side ? '--bf-record-width' : '--bf-record-height', `${this.auxiliary}px`);
    this.root.style[key] = `${Math.max(side ? 280 : 64, r[key] + (willOpen ? 1 : -1) * this.auxiliary)}px`;
  }
  save() {
    if (!this.root) return;
    const geometry = this.rect();
    if (this.panel.minimized) geometry.height = parseFloat(this.panel.hiddenHeight) || CONFIG.PANEL.INITIAL_HEIGHT;
    this.preferences.store.write({ version: 1, geometry, logsOpen: this.panel.logsOpen,
      layout: this.root.dataset.recordsLayout, auxiliary: this.auxiliary,
      modes: this.panel.manager.modes || this.preferences.modes });
  }
  reset() {
    const p = this.panel;
    if (p.minimized) p.toggleMinimize();
    if (!p.logsOpen) p.toggleLogs();
    this.auxiliary = 0;
    this.root.style.removeProperty('--bf-record-width'); this.root.style.removeProperty('--bf-record-height');
    Object.assign(this.root.style, { width: `${CONFIG.PANEL.INITIAL_WIDTH}px`, height: `${CONFIG.PANEL.INITIAL_HEIGHT}px`, left: '24px', top: '24px' });
    this.clamp(); this.save();
  }
}
