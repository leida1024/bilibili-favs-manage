import { pause } from '../FolderClient.js';

const text = node => node?.textContent.trim() || '';
export const nativeControlEnabled = node => !!node && !node.disabled && node.getAttribute('aria-disabled') !== 'true' && !/disabled/.test(node.className);
export const currentNativePage = selectors => Number(text(document.querySelector(selectors.pagination)?.querySelector(selectors.activePage))) || 1;
export function nativePageSnapshot(selectors) {
  const cards = [...document.querySelectorAll(selectors.cards)];
  return { first: cards[0], signature: cards.map(card => card.querySelector('a[href*="/video/"]')?.getAttribute('href') || text(card)).join('|') };
}
export function nativePageCount(selectors) {
  const pager = document.querySelector(selectors.pagination);
  if (!pager) return 1;
  const explicit = text(pager).match(/共\s*(\d+)\s*页/);
  const numbers = [...pager.querySelectorAll(selectors.page)].map(node => Number(text(node))).filter(n => Number.isSafeInteger(n) && n > 0);
  const count = explicit ? Number(explicit[1]) : Math.max(0, ...numbers);
  if (!Number.isSafeInteger(count) || count < currentNativePage(selectors)) throw new Error('网页总页数未识别，未将部分内容当作完整任务');
  return count;
}
export async function waitNativePage(selectors, pn, { guard = () => {}, ready = () => true, before, signal, wait } = {}) {
  let signature = null, stableSince = Date.now();
  const check = () => {
    if (signal?.aborted) throw new DOMException('已取消', 'AbortError');
    guard();
    if (currentNativePage(selectors) !== pn || !ready() || (selectors.loading && document.querySelector(selectors.loading))) return false;
    const current = nativePageSnapshot(selectors).signature;
    if (before && current === before.signature && before.first?.isConnected) return false;
    if (current !== signature) { signature = current; stableSince = Date.now(); return false; }
    return Date.now() - stableSince >= 240;
  };
  if (wait) return wait(check, signal);
  const deadline = Date.now() + 8000;
  do { if (check()) return; await pause(80, signal); } while (Date.now() < deadline);
  throw new Error('网页翻页后内容未确认，已停止后续操作');
}
export async function goNativePage(selectors, pn, options = {}) {
  if (options.signal?.aborted) throw new DOMException('已取消', 'AbortError');
  options.guard?.();
  const current = currentNativePage(selectors);
  if (current === pn) return waitNativePage(selectors, pn, options);
  if (pn !== 1 && pn !== current + 1) throw new Error('网页页码未连续推进，请重新开始');
  const pager = document.querySelector(selectors.pagination);
  const button = [...(pager?.querySelectorAll(selectors.page) || [])].find(node => text(node) === String(pn)) || (pn === current + 1 ? pager?.querySelector(selectors.next) : null);
  if (!nativeControlEnabled(button)) throw new Error('网页页码入口不可用，未继续处理');
  const before = nativePageSnapshot(selectors);
  button.click();
  await waitNativePage(selectors, pn, { ...options, before });
}
