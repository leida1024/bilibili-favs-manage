/**
 * 应用配置
 */

export const CONFIG = {
  // 延迟时间（毫秒）
  DELAY: {
    SHORT: 500,
    MIDDLE: 1000,
    LONG: 2000,
    INPUT_CHAR: 50  // 输入每个字符的延迟
  },

  // 消息类型代码
  MESSAGE_TYPE: {
    ERROR: 0,
    NORMAL: 1,
    START_BATCH: 2,
    START_SINGLE: 3,
    END_SINGLE: 4,
    END_BATCH: 5,
    ONE_PAGE: 6,
    WARN: 7
  },

  // 浮动面板配置
  PANEL: {
    INITIAL_WIDTH: 600,
    INITIAL_HEIGHT: 500,
    INITIAL_TOP: 50,
    INITIAL_LEFT: 50,
    LEFT_WIDTH_PERCENT: '35%',
    RIGHT_WIDTH_PERCENT: '63%',
    MIN_OUTPUT_WIDTH: 300,
    RESIZE_BORDER_SIZE: 15,
    Z_INDEX: 99999
  },

  // 脚本信息
  SCRIPT: {
    VERSION: '2.1.1',
    NAME: 'BiliBili 收藏夹批量管理',
    DESCRIPTION: '适配旧版及新版 VUI 收藏夹页面'
  }
};
