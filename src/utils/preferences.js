/** Inert UI data only. Failure must never prevent an operation or startup. */
export function browserStore(area, key) {
  return {
    read() { try { return JSON.parse(window[area].getItem(key)); } catch { return null; } },
    write(value) { try { window[area].setItem(key, JSON.stringify(value)); } catch { /* memory-only */ } }
  };
}

export const defaultModes = Object.freeze({ read: 'api', copy: 'web', create: 'web', manage: 'web' });
export function validModes(value) {
  return Object.fromEntries(Object.entries(defaultModes).map(([key, fallback]) =>
    [key, ['api', 'web'].includes(value?.[key]) ? value[key] : fallback]));
}

export function panelPreferences() {
  const store = browserStore('localStorage', 'bili-favs-panel-v1');
  const raw = store.read();
  const geometry = raw?.version === 1 && raw.geometry &&
    ['width', 'height', 'left', 'top'].every(key => Number.isFinite(raw.geometry[key]) && Math.abs(raw.geometry[key]) <= 20000) &&
    raw.geometry.width >= 280 && raw.geometry.height >= 64 ? raw.geometry : null;
  return { store, geometry, logsOpen: raw?.version === 1 ? raw.logsOpen !== false : true,
    layout: raw?.layout === 'bottom' ? 'bottom' : 'side',
    auxiliary: Number.isFinite(raw?.auxiliary) && raw.auxiliary > 0 && raw.auxiliary < 20000 ? raw.auxiliary : 0,
    modes: validModes(raw?.version === 1 ? raw.modes : null) };
}
