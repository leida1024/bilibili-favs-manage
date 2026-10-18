/**
 * UI 组件工厂
 * 提供创建各种 UI 元素的静态方法
 */

export class UIComponents {
  static createButton(text, clickHandler, className = 'btn') {
    const button = document.createElement('button');
    button.textContent = text;
    button.classList.add('btn');
    button.style.margin = '0px';
    button.style.padding = '0px 0px';
    button.style.fontSize = '14px';
    button.style.width = '150px';
    button.style.height = '40px';
    button.style.marginTop = '5px';
    button.style.marginLeft = '5px';

    if (clickHandler) {
      button.addEventListener('click', clickHandler);
    }

    return button;
  }

  static createOutputTextBox() {
    const editableArea = document.createElement('div');
    editableArea.classList.add('output-text-box');
    editableArea.style.border = '1px solid #ccc';
    editableArea.style.padding = '5px';
    editableArea.style.boxSizing = 'border-box';
    editableArea.style.whiteSpace = 'nowrap';
    editableArea.style.minWidth = '300px';
    editableArea.contentEditable = true;
    editableArea.style.flexGrow = '1';
    editableArea.style.overflow = 'auto';

    editableArea.addEventListener('scroll', function () {
      this.scrollTopEnabled = false;
    });

    return editableArea;
  }

  static createSubDiv(className, floatPos, width, height) {
    const subPanel = document.createElement('div');
    subPanel.style.flexGrow = '1';
    subPanel.style.display = 'flex';
    subPanel.style.border = '1px solid #ccc';

    if (className) subPanel.classList.add(className);
    if (floatPos) subPanel.style.float = floatPos;
    if (width) subPanel.style.width = width;
    if (height) subPanel.style.height = height;

    return subPanel;
  }

  /**
   * 创建下拉选择框
   * @param {Array<string>} options - 选项列表
   * @param {string} defaultValue - 默认值
   * @returns {HTMLSelectElement}
   */
  static createSelect(options, defaultValue = '') {
    const select = document.createElement('select');
    select.style.width = '100%';
    select.style.padding = '5px';
    select.style.fontSize = '14px';
    select.style.border = '1px solid #ccc';
    select.style.borderRadius = '3px';

    // Add empty option if no options provided
    if (options.length === 0) {
      const emptyOption = document.createElement('option');
      emptyOption.value = '';
      emptyOption.textContent = '(无收藏夹)';
      select.appendChild(emptyOption);
      return select;
    }

    for (const option of options) {
      const optionElem = document.createElement('option');
      optionElem.value = option;
      optionElem.textContent = option;
      if (option === defaultValue) {
        optionElem.selected = true;
      }
      select.appendChild(optionElem);
    }

    return select;
  }
}

/**
 * 复选框项组件
 */
let checkboxSequence = 0;

export class CheckboxItem {
  constructor(favName) {
    this.checkboxContainer = this.createCheckboxContainer(favName);
    this.checkbox = this.checkboxContainer.querySelector("input[type='checkbox']");
    this.label = this.checkboxContainer.querySelector('label');
    this.inputText = this.checkboxContainer.querySelector("input[type='text']");
  }

  createCheckboxContainer(favName) {
    const checkboxContainer = document.createElement('div');
    const checkboxDiv = document.createElement('div');
    checkboxDiv.className = 'signal-panel';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `bili-fav-source-${++checkboxSequence}`;

    const label = document.createElement('label');
    label.textContent = favName;
    label.setAttribute('for', checkbox.id);

    const inputText = document.createElement('input');
    inputText.type = 'text';
    inputText.value = favName;
    inputText.setAttribute('aria-label', `目标收藏夹：${favName}`);

    checkboxDiv.appendChild(checkbox);
    checkboxDiv.appendChild(label);
    checkboxDiv.appendChild(inputText);

    checkboxContainer.appendChild(checkboxDiv);

    return checkboxContainer;
  }

  getLabelValue() {
    return this.label.textContent;
  }

  getInputTextValue() {
    return this.inputText.value;
  }

  getCheckboxValue() {
    return this.checkbox.checked;
  }
}
