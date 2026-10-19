import { newOperationId } from '../utils/logStore.js';

/** Ephemeral progress; confirmed counts must represent observed outcomes. */
export class OperationState {
  constructor() {
    this.listeners = new Set();
    this.state = { status: 'idle', operationId: '', phase: '', action: '', confirmed: 0, total: null, lastConfirmed: '', detail: '' };
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => this.listeners.delete(listener);
  }

  update(changes) {
    this.state = { ...this.state, ...changes };
    for (const listener of this.listeners) listener({ ...this.state });
  }

  begin(action, total = null, { operationId = newOperationId(), phase = '' } = {}) {
    this.update({ status: 'running', operationId, phase, action, total, confirmed: 0, lastConfirmed: '', detail: '正在准备…' });
  }

  confirm(step) {
    this.update({ confirmed: this.state.confirmed + 1, lastConfirmed: step });
  }

  finish(status, detail) {
    if (!['completed', 'failed', 'interrupted', 'unknown', 'waiting'].includes(status)) throw new Error('Invalid terminal operation status');
    this.update({ status, detail });
  }
}
