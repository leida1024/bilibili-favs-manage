/**
 * 日志工具
 * 支持同时输出到控制台和浮动面板
 */

const LOG_PREFIX = '[BiliBili Favs]';

// 全局面板引用（由 FloatingPanel 设置）
let globalPanel = null;

/**
 * 设置全局面板引用
 * @param {Object} panel - FloatingPanel 实例
 */
export function setLoggerPanel(panel) {
  globalPanel = panel;
}

/**
 * 输出普通日志
 * @param {...any} args - 日志内容
 */
export function log(...args) {
  console.log(LOG_PREFIX, ...args);
  if (globalPanel) {
    globalPanel.appendLog(args.join(' '), globalPanel.normalCode);
  }
}

/**
 * 输出错误日志
 * @param {...any} args - 日志内容
 */
export function error(...args) {
  console.error(LOG_PREFIX, ...args);
  if (globalPanel) {
    globalPanel.appendLog(args.join(' '), globalPanel.errorCode);
  }
}

/**
 * 输出警告日志
 * @param {...any} args - 日志内容
 */
export function warn(...args) {
  console.warn(LOG_PREFIX, ...args);
  if (globalPanel) {
    globalPanel.appendLog(args.join(' '), globalPanel.warnCode);
  }
}

/**
 * 输出调试日志
 * @param {...any} args - 日志内容
 */
export function debug(...args) {
  console.debug(LOG_PREFIX, ...args);
  globalPanel?.appendLog(args.join(' '), globalPanel.debugCode);
}

/**
 * 格式化当前时间
 * @returns {string} 格式化的时间字符串 YYYY-MM-DD HH:mm:ss
 */
export function formatTime() {
  const currentDate = new Date();
  const timezoneOffset = currentDate.getTimezoneOffset();
  const timezoneOffsetMilliseconds = timezoneOffset * 60 * 1000;
  const userCurrentDate = new Date(currentDate.getTime() - timezoneOffsetMilliseconds);
  return userCurrentDate.toISOString().replace(/T/, ' ').replace(/\..+/, '');
}
