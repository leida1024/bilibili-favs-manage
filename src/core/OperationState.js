/** Ephemeral progress; confirmed counts must represent observed outcomes. */
export class OperationState {
  constructor() {
    this.listeners = new Set();
    this.state = { status: 'idle', action: '', confirmed: 0, total: null, lastConfirmed: '', detail: '选择来源并检查目标后开始。' };
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

  begin(action, total = null) {
    this.update({ status: 'running', action, total, confirmed: 0, lastConfirmed: '', detail: '正在准备，请勿重复提交。' });
  }

  confirm(step) {
    this.update({ confirmed: this.state.confirmed + 1, lastConfirmed: step });
  }

  finish(status, detail) {
    if (!['completed', 'failed', 'interrupted'].includes(status)) throw new Error('Invalid terminal operation status');
    this.update({ status, detail });
  }
}
