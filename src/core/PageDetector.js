/**
 * 页面类型检测工具
 * 用于判断当前是否在用户自己的收藏夹页面
 */

export class PageDetector {
  /**
   * 获取当前页面的用户 UID
   * @returns {string|null}
   */
  static getCurrentPageUID() {
    const match = window.location.pathname.match(/^\/(\d+)\/favlist(?:\/|$)/);
    return match ? match[1] : null;
  }

  /**
   * 获取登录用户的 UID
   * @returns {string|null}
   */
  static getLoginUserUID() {
    // 方案 1: 从 Cookie 获取
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [key, value] = cookie.trim().split('=');
      if (key === 'DedeUserID') {
        return value;
      }
    }

    // 方案 2: 从页面状态获取（备选）
    if (window.__INITIAL_STATE__?.mid) {
      return String(window.__INITIAL_STATE__.mid);
    }

    return null;
  }

  /**
   * 检测当前页面是否为用户自己的页面
   * @returns {boolean}
   */
  static isOwnPage() {
    const pageUID = this.getCurrentPageUID();
    const loginUID = this.getLoginUserUID();

    if (!pageUID || !loginUID) {
      return false;
    }

    return pageUID === loginUID;
  }

  /**
   * 生成用户自己的收藏夹页面 URL
   * @returns {string|null}
   */
  static getOwnFavListURL() {
    const loginUID = this.getLoginUserUID();
    return loginUID ? `https://space.bilibili.com/${loginUID}/favlist` : null;
  }
}
