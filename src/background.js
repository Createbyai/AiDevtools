// This background script is needed for the extension structure
// but doesn't need to contain any specific functionality for this example 

// 存储API密钥的配置
let config = {
  apiKey: '',
  apiEndpoint: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-3.5-turbo'
};

// DevTools 连接对象
let devToolsConnections = {};

// 初始化时从storage加载配置
chrome.storage.local.get(['encryptedApiKey', 'apiEndpoint', 'model'], async (result) => {
  if (result.apiEndpoint) config.apiEndpoint = result.apiEndpoint;
  if (result.model) config.model = result.model;
});

// 监听 DevTools 页面的连接
chrome.runtime.onConnect.addListener(function (port) {
  // 只处理来自 devtools 页面的连接
  if (port.name !== 'devtools-page') {
    return;
  }

  // 为每个DevTools实例分配一个临时ID
  const extensionListener = function (message) {
    if (message.name === 'init') {
      // 新连接，保存连接对象
      devToolsConnections[message.tabId] = port;
      console.log('DevTools for tab', message.tabId, 'connected');

      // 删除已断开连接的端口
      port.onDisconnect.addListener(function () {
        delete devToolsConnections[message.tabId];
        console.log('DevTools for tab', message.tabId, 'disconnected');
      });
    }
  };

  // 监听来自DevTools的消息
  port.onMessage.addListener(extensionListener);

  // 初始化时发送一条空消息
  port.postMessage({ type: 'connected' });
}); 