/**
 * 事件处理器
 * 处理浮动面板的拖动、缩放和交互事件
 */

export class EventHandlers {
  /**
   * 切换全选状态
   * @param {HTMLElement} selectAllButton - 全选按钮
   * @param {Array} favCheckboxItemList - 复选框项列表
   */
  static toggleSelectAll(selectAllButton, favCheckboxItemList) {
    if (selectAllButton.textContent === '点我全选') {
      for (const chkboxItem of favCheckboxItemList) {
        chkboxItem.checkbox.checked = true;
      }
      selectAllButton.textContent = '点我全部取消';
    } else {
      for (const chkboxItem of favCheckboxItemList) {
        chkboxItem.checkbox.checked = false;
      }
      selectAllButton.textContent = '点我全选';
    }
  }

  /**
   * 切换最小化状态
   * @param {Object} panel - FloatingPanel 实例
   */
  static toggleMinimize(panel) {
    panel.toggleMinimize();
  }

  /**
   * 鼠标松开时结束尺寸修改
   * @param {Object} panel - FloatingPanel 实例
   */
  static stopResizeOnBody(panel) {
    panel.resizeable = false;
  }

  /**
   * 鼠标松开时结束拖动
   * @param {Object} panel - FloatingPanel 实例
   */
  static stopDragOnPanel(panel) {
    panel.isDragging = false;
  }

  /**
   * 鼠标按下事件
   * @param {Object} panel - FloatingPanel 实例
   * @param {MouseEvent} e - 鼠标事件
   */
  static mouseDown(panel, e) {
    if (e.button !== 0 || e.target.closest('button,input,select,textarea,label,summary,a')) return;
    const floP = panel.floatingPanel;
    let d = EventHandlers.getDirection(panel, e);

    // 当位置为四个边和四个角时才开启尺寸修改
    if (d !== '') {
      panel.resizeable = true;
      panel.isDragging = false;
      panel.direction = d;
    } else if (e.target.closest('.bf-header')) {
      // 如果点中了按钮、输入框或输出框，不开启拖动
      if (
        e.target.tagName === 'BUTTON' ||
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'SELECT' ||
        e.target.classList.contains('output-text-box')
      ) {
        // 不开启拖动
      } else {
        panel.isDragging = true;
        panel.offsetX = e.clientX - floP.getBoundingClientRect().left;
        panel.offsetY = e.clientY - floP.getBoundingClientRect().top;
      }
    }
  }

  /**
   * 鼠标移动事件，修改大小
   * @param {Object} panel - FloatingPanel 实例
   * @param {MouseEvent} e - 鼠标事件
   */
  static mouseMove(panel, e) {
    let floP = panel.floatingPanel;
    let d = EventHandlers.getDirection(panel, e);

    // 修改鼠标显示效果
    let cursor = d === '' ? 'default' : d + '-resize';
    floP.style.cursor = cursor;

    if (panel.resizeable) {
      // 当开启尺寸修改时，鼠标移动会修改div尺寸
      const direc = panel.direction;
      let newWidth = floP.offsetWidth;
      let newHeight = floP.offsetHeight;

      let originTop = floP.offsetTop;
      let originLeft = floP.offsetLeft;
      let newTop = originTop;
      let newLeft = originLeft;

      // 左侧和上侧
      if (direc.indexOf('w') !== -1) {
        newWidth -= e.movementX;
        newLeft += e.movementX;
      }
      if (direc.indexOf('n') !== -1) {
        newHeight -= e.movementY;
        newTop += e.movementY;
      }

      // 右侧和底部
      if (direc.indexOf('e') !== -1) {
        newWidth += e.movementX;
      }
      if (direc.indexOf('s') !== -1) {
        newHeight += e.movementY;
      }

      EventHandlers.judgePanelSizeAndUpdate(panel, newLeft, newTop, newWidth, newHeight, originTop, originLeft);
    }
  }

  /**
   * 拖动面板
   * @param {Object} panel - FloatingPanel 实例
   * @param {MouseEvent} e - 鼠标事件
   */
  static dragOnPanel(panel, e) {
    if (panel.isDragging) {
      const floP = panel.floatingPanel;
      let newLeft = e.clientX - panel.offsetX;
      let newTop = e.clientY - panel.offsetY;

      EventHandlers.judgePanelPosAndUpdate(panel, newLeft, newTop);
    }
  }

  /**
   * 获取鼠标所在div的位置
   * @param {Object} panel - FloatingPanel 实例
   * @param {MouseEvent} ev - 鼠标事件
   * @returns {string} 方向字符串
   */
  static getDirection(panel, ev) {
    const floP = panel.floatingPanel;
    let dir = '';

    if (ev.clientX - floP.getBoundingClientRect().left < 15) {
      dir += 'w';
    } else if (floP.getBoundingClientRect().right - ev.clientX < 15) {
      dir += 'e';
    }

    if (ev.clientY - floP.getBoundingClientRect().top < 15) {
      dir += 'n';
    } else if (floP.getBoundingClientRect().bottom - ev.clientY < 15) {
      dir += 's';
    }

    return dir;
  }

  /**
   * 判断并更新面板大小
   * @param {Object} panel - FloatingPanel 实例
   * @param {number} newLeft - 新的左边距
   * @param {number} newTop - 新的上边距
   * @param {number} newWidth - 新的宽度
   * @param {number} newHeight - 新的高度
   * @param {number} originTop - 原始上边距
   * @param {number} originLeft - 原始左边距
   */
  static judgePanelSizeAndUpdate(panel, newLeft, newTop, newWidth, newHeight, originTop, originLeft) {
    const floP = panel.floatingPanel;

    // 获取视口的宽度和高度
    let viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    let viewportHeight = window.innerHeight || document.documentElement.clientHeight;

    // 判断面板是否会跑到屏幕外边
    if (newLeft < 0 || newLeft + newWidth > viewportWidth) {
      return;
    }
    if (newTop < 0 || newTop + newHeight > viewportHeight) {
      return;
    }

    // 确保面板不会变得太小
    if (newWidth < panel.minW) {
      newWidth = panel.minW;
      newLeft = originLeft;
    }

    if (newHeight < panel.minH) {
      newHeight = panel.minH;
      newTop = originTop;
    }

    floP.style.width = newWidth + 'px';
    floP.style.height = newHeight + 'px';
    floP.style.top = newTop + 'px';
    floP.style.left = newLeft + 'px';
  }

  /**
   * 判断并更新面板位置
   * @param {Object} panel - FloatingPanel 实例
   * @param {number} newLeft - 新的左边距
   * @param {number} newTop - 新的上边距
   */
  static judgePanelPosAndUpdate(panel, newLeft, newTop) {
    const floP = panel.floatingPanel;

    // 获取视口的宽度和高度
    let viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    let viewportHeight = window.innerHeight || document.documentElement.clientHeight;

    // 确保面板不会移动到屏幕外边
    newLeft = Math.max(0, Math.min(newLeft, viewportWidth - floP.offsetWidth));
    newTop = Math.max(0, Math.min(newTop, viewportHeight - floP.offsetHeight));

    // 更新面板位置
    floP.style.left = newLeft + 'px';
    floP.style.top = newTop + 'px';
  }
}
