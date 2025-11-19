// 创建AI助手面板
chrome.devtools.panels.create(
  "AI助手", // 面板标题
  "icons/icon16.svg", // 图标路径
  "panel.html", // 面板HTML页面
  function (panel) {
    // 面板创建完成的回调
    console.log("AI Assistant DevTools panel created");
    panel.onShown.addListener(() => {
      console.log("My Custom Panel is now visible");
    });
    // 注入iframe样式修复
    const style = document.createElement("style");
    style.textContent = `
      body > iframe {
        width: 100% !important;
        height: 100% !important;
        position: absolute !important;
        border: none !important;
        margin: 0 !important;
        padding: 0 !important;
      }
    `;
    document.head.appendChild(style);
    // 建立与背景页的连接
    const port = chrome.runtime.connect({
      name: "devtools-page",
    });

    // 初始化连接
    port.postMessage({
      name: "init",
      tabId: chrome.devtools.inspectedWindow.tabId,
    });

    // 监听来自背景页的消息
    port.onMessage.addListener(function (message) {
      // 将消息转发给panel页面
      if (message.source === "console-interceptor") {
        // 使用 inspectedWindow.eval 将消息传递给面板页面
        chrome.devtools.inspectedWindow.eval(
          `
          // 确保窗口可用
          if (window.postMessage) {
            window.postMessage(${JSON.stringify(message)}, "*");
          }
          `,
          function (result, isException) {
            if (isException) {
              console.error("Error forwarding message to panel:", isException);
            }
          }
        );
      }
    });
  }
);
