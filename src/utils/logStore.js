/** Export allowlist: timestamps, levels, and sanitized text only. */
export function sanitizeLog(value) {
  return String(value)
    .replace(/https?:\/\/[^\s<>]+/gi, '[URL omitted]')
    .replace(/((?:cookie|authorization|bearer|token|csrf|bili_jct|sessdata|password|secret)\s*[=:]?\s*)[^\s,;]+/gi, '$1[redacted]')
    .slice(0, 2000);
}

export class LogStore {
  constructor(limit = 500) {
    this.limit = Math.max(1, limit);
    this.entries = [];
    this.dropped = 0;
  }

  add(message, level = 'info') {
    this.entries.push({ time: new Date().toISOString(), level: ['info', 'warn', 'error', 'debug'].includes(level) ? level : 'info', message: sanitizeLog(message) });
    while (this.entries.length > this.limit) { this.entries.shift(); this.dropped++; }
  }

  clear() { this.entries = []; this.dropped = 0; }
  filter(level = 'all') { return this.entries.filter(entry => level === 'all' || entry.level === level); }
  export() { return JSON.stringify({ dropped: this.dropped, entries: this.entries }, null, 2); }
}
