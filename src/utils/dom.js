/**
 * DOM 操作工具函数
 */

/**
 * 等待指定时间
 * @param {number} ms - 毫秒数
 * @returns {Promise<void>}
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 等待元素出现
 * @param {string} selector - CSS 选择器
 * @param {number} timeout - 超时时间（毫秒）
 * @param {Element} parent - 父元素，默认为 document
 * @returns {Promise<Element|null>}
 */
export async function waitForElement(selector, timeout = 5000, parent = document, visible = false) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const el = Array.from(parent.querySelectorAll(selector)).find(el => !visible || isElementVisible(el));
    if (el) {
      return el;
    }
    await delay(100);
  }
  return null;
}

/**
 * 检查元素及其祖先是否隐藏，排除预渲染但尚未打开的弹窗。
 * @param {Element} element
 * @returns {boolean}
 */
export function isElementVisible(element) {
  for (let current = element; current; current = current.parentElement) {
    const style = window.getComputedStyle(current);
    if (current.hidden || style.display === 'none' || style.visibility === 'hidden') return false;
  }
  return element.isConnected;
}

/**
 * 通过文本内容查找按钮
 * @param {string} text - 按钮文本
 * @param {Element} parent - 父元素，默认为 document
 * @returns {HTMLButtonElement|null}
 */
export function findButtonByText(text, parent = document) {
  const buttons = parent.querySelectorAll('button');
  for (const btn of buttons) {
    if (btn.textContent.trim() === text) {
      return btn;
    }
  }
  return null;
}

/**
 * 检查元素是否存在
 * @param {string} selector - CSS 选择器
 * @param {Element} parent - 父元素，默认为 document
 * @returns {boolean}
 */
export function elementExists(selector, parent = document) {
  return !!parent.querySelector(selector);
}

/**
 * 获取元素文本内容
 * @param {string} selector - CSS 选择器
 * @param {Element} parent - 父元素，默认为 document
 * @returns {string}
 */
export function getElementText(selector, parent = document) {
  const el = parent.querySelector(selector);
  return el ? el.textContent.trim() : '';
}
