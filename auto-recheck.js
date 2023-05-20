// ==UserScript==
// @name         QB自动校验
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       Ambitious
// @match        http://127.0.0.1:12138
// @match        http://localhost:12138
// @icon         https://blog.ambitiousjun.cn/assets/logo.753a5060.jpg

// @require      https://cdn.jsdelivr.net/npm/sweetalert2@11
// @require      https://unpkg.com/dayjs@1.8.21/dayjs.min.js

// @connect      cdn.staticfile.org
// @connect      unpkg.com
// @connect      127.0.0.1
// @connect      localhost
// @grant        GM_addStyle
// ==/UserScript==

(function f() {

  GM_addStyle(`
    .auto-recheck-switch-container {
      width: fit-content;
      background-color: #fff;
      border-radius: 10px;
      box-shadow: 0 2px 12px 0 rgba(0, 0, 0, .1);
      position: fixed;
      z-index: 200;
      right: 10px;
      top: 50vh;
      transform: translateY(-50%);
      font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif,Apple Color Emoji,Segoe UI Emoji;
      display: flex;
      transition: all .3s;
    }

    .auto-recheck-switch-container .left-btn {
      width: 30px;
      transition: all .3s;
      color: #d6d6d6;
      background-color: #fff;
      cursor: pointer;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 22px;
      font-weight: bold;
      border-top-left-radius: 10px;
      border-bottom-left-radius: 10px;
      border-right: 1px solid #eee;
    }

    .auto-recheck-switch-container .left-btn:hover {
      background-color: rgba(0, 0, 0, .05);
      color: #909399;
    }

    .auto-recheck-switch-container .count-down-wrap,
    .auto-recheck-switch-container .success-count {
      font-size: 18px;
      color: #409eff;
      padding: 20px;
      text-align: center;
    }

    .auto-recheck-switch-container .switch-wrap {
      width: 100%;
      padding: 20px;
      display: flex;
      box-sizing: border-box;
    }

    .auto-recheck-switch-container .tip-text {
      flex: 2;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 18px;
      user-select: none;
      transition: all .15s;
      margin-left: 20px;
    }
    .auto-recheck-switch-container .toggler {
      flex: 1;
      margin: 0 auto;
    }

    .auto-recheck-switch-container .toggler input {
      display: none;
    }

    .auto-recheck-switch-container .toggler label {
      display: block;
      position: relative;
      width: 72px;
      height: 36px;
      border: 1px solid #d6d6d6;
      border-radius: 36px;
      background: #e4e8e8;
      cursor: pointer;
    }

    .auto-recheck-switch-container .toggler label::after {
      display: block;
      border-radius: 100%;
      background-color: #d7062a;
      content: '';
      animation-name: toggler-size;
      animation-duration: 0.15s;
      animation-timing-function: ease-out;
      animation-direction: forwards;
      animation-iteration-count: 1;
      animation-play-state: running;
    }

    .auto-recheck-switch-container .toggler label::after, .toggler label .toggler-on, .toggler label .toggler-off {
      position: absolute;
      top: 50%;
      left: 25%;
      width: 26px;
      height: 26px;
      transform: translateY(-50%) translateX(-50%);
      transition: left 0.15s ease-in-out, background-color 0.2s ease-out, width 0.15s ease-in-out, height 0.15s ease-in-out, opacity 0.15s ease-in-out;
    }

    .auto-recheck-switch-container .toggler input:checked + label::after, .toggler input:checked + label .toggler-on, .toggler input:checked + label .toggler-off {
      left: 75%;
    }

    .auto-recheck-switch-container .toggler input:checked + label::after {
      background-color: #50ac5d;
      animation-name: toggler-size2;
    }

    .auto-recheck-switch-container .toggler .toggler-on, .toggler .toggler-off {
      opacity: 1;
      z-index: 2;
    }

    .auto-recheck-switch-container .toggler input:checked + label .toggler-off, .toggler input:not(:checked) + label .toggler-on {
      width: 0;
      height: 0;
      opacity: 0;
    }

    .auto-recheck-switch-container .toggler .path {
      fill: none;
      stroke: #fefefe;
      stroke-width: 7px;
      stroke-linecap: round;
      stroke-miterlimit: 10;
    }

    @keyframes toggler-size {
      0%, 100% {
        width: 26px;
        height: 26px;
      }

      50% {
        width: 20px;
        height: 20px;
      }
    }

    @keyframes toggler-size2 {
      0%, 100% {
        width: 26px;
        height: 26px;
      }

      50% {
        width: 20px;
        height: 20px;
      }
    }
 
  `);

  /**
   * 存放获取过的界面元素
   */
  const doms = {};
  /**
   * 手动记录当前定时器的开关状态
   */
  let timerEnable = false;
  /**
   * 标记 togglerInput 标签是否是由程序触发点击的
   */
  let togglerInputProgramClick = false;
  /**
   * 用户指定的校验间隔
   */
  let timeout = null;
  /**
   * 删除倒计时器
   */
  let removeCountDownTimer = null;
  /**
   * 成功校验次数
   */
  let successCount = 0;

  /**
   * 生成一个弹框
   */
  const getFire = (options) => {
    const fire = Swal.fire(options)
    fire._destroy = () => {
      var container = document.getElementsByClassName('swal2-container')[0];
      container && container.remove()
      console.clear()
    }
    return fire
  }

  /**
   * 往页面中注入弹框库，并让用户输入重新校验时间
   */
  const injectAlertAndGetTimeout = () => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        getFire({
          title: '设置触发间隔',
          text: '请输入重新校验间隔，单位：分钟',
          input: 'text',
          inputAttributes: { autocapitalize: 'off' },
          showCancelButton: true,
          confirmButtonText: '确认',
          cancelButtonText: '取消',
          showLoaderOnConfirm: true,
          icon: 'question',
          inputValue: '10',
          preConfirm: (timeStr) => {
            timeStr = timeStr.trim();
            if (!/^[1-9]\d*$/.test(timeStr)) {
              Swal.showValidationMessage('请输入合法的数字！');
              return false;
            }
            return parseInt(timeStr);
          }
        }).then((res) => {
          if (res.isConfirmed) {
            console.log(res.value)
            return resolve(res.value)
          }
          reject()
        })
      }, 500);
    });
  }

  /**
   * 获取页面上的所有任务列表
   */
  const getTaskItems = () => {
    const items = document.getElementsByClassName('torrentsTableContextMenuTarget') || [];
    if (!items || items.length === 0) {
      return [];
    }
    // 过滤出正在下载中的任务
    const res = [];
    for (let i = 0; i < items.length; i++) {
      const tds = items[i].getElementsByTagName('td');
      let flag = false;
      for (let j = 0; j < tds.length; j++) {
        if (tds[j].innerHTML.indexOf('下载') !== -1) {
          flag = true;
        }
      }
      flag && res.push(items[i]);
    }
    return res
  }

  /**
   * 检查任务列表中的 “校验” 任务，所有任务完成之后重新开始计时
   */
  const checkReCheckFinish = () => {
    const items = document.getElementsByClassName('torrentsTableContextMenuTarget') || [];
    for (let i = 0; i < items.length; i++) {
      let tds = items[i].getElementsByTagName('td');
      for (let j = 0; j < tds.length; j++) {
        if (tds[j].innerHTML.indexOf('校验') !== -1) {
          setTimeout(checkReCheckFinish, 1000);
          return;
        }
      }
    }
    timerEnable && getFire({
      icon: 'success',
      title: '所有任务校验完成，下一次校验开始时间：\n\n\n\n' + dayjs(new Date((new Date().getTime() + timeout * 60 * 1000))).format('YYYY/MM/DD HH:mm:ss'),
      showConfirmButton: false,
      width: '50em',
      timer: 5000,
      timerProgressBar: true
    })
    removeCountDownElement();
    successCount++;
    doms.successCountElm.innerHTML = `已成功校验 ${successCount} 次`;
    timerEnable && startCountDown(timeout)();
  }

  /**
   * 开始强制校验
   */
  const startReCheck = () => {
    const items = getTaskItems();
    if (items.length === 0) {
      timerEnable && getFire({
        icon: 'info',
        title: '任务列表为空或所有任务都以下载完成，定时器关闭',
        showConfirmButton: false,
        width: '48em',
        timer: 1500,
        timerProgressBar: true
      })
      clearTimer();
      return;
    }
    for (let i = 0; i < items.length; i++) {
      items[i].click()
      doms.recheckBtn.click()
    }
    // 取消对最后一项的选择效果
    items[items.length - 1].classList.remove('selected');
    timerEnable && getFire({
      icon: 'info',
      title: '所有下载任务重新开始校验...',
      showConfirmButton: false,
      width: '45em',
      timer: 1500,
      timerProgressBar: true
    })
    setTimeout(checkReCheckFinish, 10000);
  }

  /**
   * 将时间戳转换为 mm:ss
   */
  const formatTimestamp2Str = (millis = 0) => {
    const minutes = Math.floor(millis / 60000);
    const seconds = ((millis % 60000) / 1000).toFixed(0);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * 初始化倒计时文本
   */
  const addCountDownElement = (millis = 0) => {
    // 初始化倒计时文本
    const countDown = document.createElement('div');
    countDown.classList.add('count-down-wrap');
    countDown.innerHTML = `下一次校验时间：${formatTimestamp2Str(millis)}`;
    doms.countDown = countDown;
    // 插入到容器中
    doms.rightWrap.appendChild(countDown);
  }

  /**
   * 移除倒计时文本
   */
  const removeCountDownElement = () => {
    if (doms.countDown) {
      doms.rightWrap.removeChild(doms.countDown);
      doms.countDown = null;
    }
  }

  /**
   * 倒计时 minutes 分钟数，并在界面上显示，倒计时结束之后调用校验函数
   */
  const startCountDown = (minutes = 0) => {
    // 剩余多久时间
    let millis = minutes * 60 * 1000;
    // 获取到计时结束的时间戳
    const to = performance.now() + millis;
    addCountDownElement(millis);
    let timerId = null;
    return function cd() {
      if (millis === 0) {
        // 开始校验
        doms.countDown.innerHTML = '正在校验中';
        startReCheck();
        return;
      }
      // 使用 setTimeout 可能会导致后台计时不准确
      timerId = setTimeout(() => {
        // 计算剩余时间
        millis = to - performance.now();
        if (millis < 0) {
          millis = 0;
        }
        doms.countDown.innerHTML = `下一次校验时间：${formatTimestamp2Str(millis)}`;
        cd();
      }, 1000);
      removeCountDownTimer = () => clearTimeout(timerId);
    }
  }

  /**
   * 添加标签，展示当前成功校验的次数
   */
  const addSuccessCountElement = () => {
    const successCountElm = document.createElement('div');
    successCountElm.classList.add('success-count');
    successCountElm.innerHTML = `已成功校验 ${successCount} 次`;
    doms.successCountElm = successCountElm;
    doms.rightWrap.appendChild(successCountElm);
  }

  /**
   * 删除成功校验次数标签
   */
  const removeSuccessCountElement = () => {
    if (doms.successCountElm) {
      doms.successCountElm.remove();
      doms.successCountElm = null;
    }
  }

  /**
   * 开启自动校验计时
   */
  const startTimer = () => {
    successCount = 0;
    // 弹框输入间隔时间
    injectAlertAndGetTimeout().then((t) => {
      timeout = t;
      const recheckBtn = document.querySelector("a[href='#forceRecheck']");
      if (!recheckBtn) {
        getFire({
          icon: 'error',
          title: '获取不到校验按钮',
          showConfirmButton: false,
          width: '45em',
          timer: 2000,
          timerProgressBar: true
        })
        return;
      }
      doms.recheckBtn = recheckBtn;
      getFire({
        icon: 'success',
        title: '开始计时 ' + timeout + ' 分钟',
        showConfirmButton: false,
        width: '45em',
        timer: 2000,
        timerProgressBar: true
      })
      addSuccessCountElement();
      // 开始计时, TODO: 等写计时器的时候再重写这里的逻辑
      startCountDown(timeout)();
      // 修改提示文本内容
      doms.tipText.innerHTML = '自动校验已开启';
      doms.tipText.style.color = '#50ac5d';
      // 调整开关
      togglerInputProgramClick = true;
      setTimeout(() => doms.togglerInput.click());
      timerEnable = true;
    })
  }

  /**
   * 关闭自动校验计时
   */
  const clearTimer = () => {
    // 修改提示文本内容
    doms.tipText.innerHTML = '自动校验未开启';
    doms.tipText.style.color = '#d7062a';
    // 调整开关
    togglerInputProgramClick = true;
    setTimeout(() => doms.togglerInput.click());
    // 停止计时
    removeCountDownTimer();
    // 删除计时文本
    removeCountDownElement();
    // 删除成功次数文本
    removeSuccessCountElement();
    timerEnable = false;
  }

  const addElement = () => {
    // 核心容器
    const container = document.createElement('div');
    doms.container = container;
    container.classList.add('auto-recheck-switch-container');
    const leftBtn = document.createElement('div');
    leftBtn.classList.add('left-btn');
    leftBtn.innerHTML = '>';
    const rightWrap = document.createElement('div');
    rightWrap.classList.add('right-wrap');
    container.appendChild(leftBtn);
    container.appendChild(rightWrap);
    doms.leftBtn = leftBtn;
    doms.rightWrap = rightWrap;
    // 放入开关元素
    const switchWrap = document.createElement('div')
    doms.switchWrap = switchWrap;
    switchWrap.classList.add('switch-wrap');
    const toggler = document.createElement('div')
    doms.toggler = toggler;
    toggler.classList.add('toggler');
    toggler.innerHTML = `
      <input id="toggler-1" name="toggler-1" type="checkbox" value="1">
      <label for="toggler-1">
          <svg class="toggler-on" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130.2 130.2">
              <polyline class="path check" points="100.2,40.2 51.5,88.8 29.8,67.5"></polyline>
          </svg>
          <svg class="toggler-off" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130.2 130.2">
              <line class="path line" x1="34.4" y1="34.4" x2="95.8" y2="95.8"></line>
              <line class="path line" x1="95.8" y1="34.4" x2="34.4" y2="95.8"></line>
          </svg>
      </label>
    `;
    switchWrap.appendChild(toggler);
    const togglerInput = toggler.querySelector('#toggler-1')
    doms.togglerInput = togglerInput;
    const tipText = document.createElement('div');
    doms.tipText = tipText;
    tipText.classList.add('tip-text');
    tipText.innerHTML = '自动校验未开启';
    tipText.style.color = '#d7062a';
    switchWrap.appendChild(tipText);
    rightWrap.appendChild(switchWrap);
    document.body.appendChild(container);
    // 为开关设置点击监听事件
    togglerInput.addEventListener('click', (e) => {
      if (!togglerInputProgramClick) {
        e.preventDefault();
        !timerEnable && startTimer();
        timerEnable && clearTimer();
      } else {
        togglerInputProgramClick = false;
      }
    })
    let eclipseFlag = false;
    // 为收缩按钮设置点击监听事件
    leftBtn.addEventListener('click', () => {
      if (!eclipseFlag) {
        // 将容器收到屏幕右侧
        leftBtn.innerHTML = '<';
        eclipseFlag = true;
        container.style.right = `${30-container.offsetWidth}px`;
      } else {
        leftBtn.innerHTML = '>';
        eclipseFlag = false;
        container.style.right = `10px`;
      }
    });
  }
  addElement();
})()
