import { isElementVisible } from '../../utils/dom.js';

// Operation-success translations in Bilibili's public space bundle. Match the
// whole message: negative text containing “成功” must never confirm a copy.
const successTexts = new Set([
  '操作成功', '复制成功', 'Operation successful', '操作が成功しました', 'نجحت العملية',
  'Operación exitosa', 'Operasi berhasil', 'Operasi berjaya', 'Operação bem-sucedida',
  'Операция успешна', 'ดำเนินการสำเร็จ', 'İşlem başarılı', 'Thao tác thành công'
]);
const messageOf = node => node.textContent.trim().replace(/[!！。.]+$/u, '').trim();

/** Observe only notifications changed by the single pending native submission. */
export function watchCopyConfirmation(selector, timeout, onSlow, slowNotice) {
  const baseline = new Map([...document.querySelectorAll(selector)].map(node =>
    [node, { text: messageOf(node), visible: isElementVisible(node) }]));
  let settle, timer, slowTimer, done = false;
  const result = new Promise(resolve => { settle = resolve; });
  const finish = outcome => {
    if (done) return;
    done = true;
    observer.disconnect(); clearTimeout(timer); clearTimeout(slowTimer);
    settle(outcome);
  };
  const observer = new window.MutationObserver(records => {
    const candidates = new Set();
    for (const record of records) {
      const nodes = record.type === 'childList' ? [record.target, ...record.addedNodes] : [record.target];
      for (const node of nodes) {
        const el = node.nodeType === 1 ? node : node.parentElement;
        const parent = el?.closest(selector);
        if (parent) candidates.add(parent);
        // A whole wrapper may be inserted after its descendants are populated.
        if (record.type === 'attributes' || (record.type === 'childList' && node !== record.target))
          el?.querySelectorAll?.(selector).forEach(item => candidates.add(item));
      }
    }
    for (const node of candidates) {
      if (node.closest('.bili-favs-manage-panel, [aria-hidden="true"]') || !isElementVisible(node)) continue;
      const text = messageOf(node), before = baseline.get(node);
      if (before?.visible && before.text === text) continue;
      if (successTexts.has(text)) { finish({ status: 'confirmed', detail: '已观察到平台成功提示' }); return; }
      if (/失败|稍后再试|过于频繁|权限不足|无权限|\b(?:failed|error)\b/iu.test(text)) {
        finish({ status: 'failed', detail: `平台提示：${text}` }); return;
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true,
    attributes: true, attributeFilter: ['class', 'style', 'hidden', 'aria-hidden'] });
  timer = setTimeout(() => finish({ status: 'unknown', detail: '复制已提交，但等待平台确认超时；内容可能已复制，请先核对目标收藏夹。' }), timeout);
  if (slowNotice < timeout) slowTimer = setTimeout(onSlow, slowNotice);
  return { result, cancel: () => finish({ status: 'unknown', detail: '复制提交过程已中断，请先核对目标收藏夹。' }) };
}
