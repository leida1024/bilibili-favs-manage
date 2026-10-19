/** Structured diagnostics only: never interpreted as executable state. */
export function sanitizeLog(value) {
  return String(value)
    .replace(/https?:\/\/[^\s<>]+/gi, '[URL omitted]')
    .replace(/((?:cookie|authorization|bearer|token|csrf|bili_jct|sessdata|password|secret)\s*[=:]?\s*)[^\s,;]+/gi, '$1[redacted]')
    .slice(0, 2000);
}

export const newOperationId = () => globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const identifier = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value) ? value : '';
const views = ['copy', 'statistics', 'manage', 'system'];
const contextOf = context => ({
  view: views.includes(context?.view) ? context.view : 'system',
  operationId: identifier(context?.operationId),
  phase: identifier(context?.phase)
});

export class LogStore {
  constructor(limit = 500, storage = null) {
    this.limit = Math.max(1, limit);
    this.entries = [];
    this.dropped = 0;
    this.clearedAt = 0;
    this.context = contextOf();
    this.storage = storage;
    try { if (storage) this.restore(storage.read()); } catch { /* memory-only */ }
  }

  setContext(context) { this.context = contextOf(context); }

  add(message, level = 'info', context = this.context) {
    this.entries.push({ id: newOperationId(), time: new Date(Math.max(Date.now(), this.clearedAt + 1)).toISOString(),
      level: ['info', 'warn', 'error', 'debug'].includes(level) ? level : 'info',
      ...contextOf(context), message: sanitizeLog(message).trim() });
    this.trim();
    this.persist();
  }

  trim() {
    while (this.entries.length > this.limit) { this.entries.shift(); this.dropped++; }
  }

  persist() { try { this.storage?.write(this.snapshot()); } catch { /* diagnostics stay usable */ } }
  clear() { this.entries = []; this.dropped = 0; this.clearedAt = Date.now(); this.persist(); }
  filter(level = 'all', view = 'all') {
    return this.entries.filter(entry => (level === 'all' || (level === 'normal' ? entry.level !== 'debug' : entry.level === level)) &&
      (view === 'all' || entry.view === view || entry.view === 'system'));
  }
  snapshot(operationId) {
    return { schemaVersion: 2, dropped: this.dropped, clearedAt: this.clearedAt,
      entries: this.entries.filter(entry => !operationId || entry.operationId === operationId).map(entry => ({ ...entry })) };
  }
  restore(snapshot) {
    if (snapshot?.schemaVersion !== 2 || !Array.isArray(snapshot.entries)) return;
    const clearedAt = Number.isSafeInteger(snapshot.clearedAt) && snapshot.clearedAt >= 0 && snapshot.clearedAt <= Date.now() ? snapshot.clearedAt : 0;
    if (clearedAt > this.clearedAt) this.dropped = 0;
    this.clearedAt = Math.max(this.clearedAt, clearedAt);
    const entries = new Map(this.entries.filter(entry => Date.parse(entry.time) > this.clearedAt).map(entry => [entry.id, entry]));
    for (const raw of snapshot.entries.slice(-this.limit)) {
      if (!identifier(raw?.id) || typeof raw.time !== 'string' || !Number.isFinite(Date.parse(raw.time)) ||
          typeof raw.message !== 'string' || !['info', 'warn', 'error', 'debug'].includes(raw.level) || Date.parse(raw.time) <= this.clearedAt) continue;
      entries.set(raw.id, { id: raw.id, time: new Date(raw.time).toISOString(), level: raw.level,
        ...contextOf(raw), message: sanitizeLog(raw.message) });
    }
    this.entries = [...entries.values()].sort((a, b) => a.time.localeCompare(b.time));
    if (clearedAt === this.clearedAt) this.dropped = Math.max(this.dropped, Number.isSafeInteger(snapshot.dropped) && snapshot.dropped >= 0 ? snapshot.dropped : 0);
    this.trim();
    this.persist();
  }
  export() { return JSON.stringify(this.snapshot(), null, 2); }
}
