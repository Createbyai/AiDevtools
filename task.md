梳理存在问题

当前插件对 AI 模型的使用提供了两种方式：
1、AiHubMix
2、允许用户使用自己添加的模型

使用方式 1、
AiHubMix 本是一个模型平台可以提供各种不同的模型，在用户选择 AiHubMix 时，会从 AiHubMix 提供的模型列表里面选择一个模型，比如 gpt-4o,会赋值给下面请求体的 model 字段。

```js
// 准备请求体
const requestBody = {
  model: modelId,
  messages: messages,
  stream: true,
};
```

使用方式 2、
用户保存到本地的模型信息结构要求如下：

```js
//所有插件设置 key :settings
// value 格式如下：
{
other:"other settings",
customModels:[
{
            "encryptedApiKey": "YOUR_ENCRYPTED_API_KEY_HERE",
            "endpoint": "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
            "id": "deepseek-r1",
            "uuid": "859b5388-027e-44fd-8bf4-9dc346c0d655",
            "type":"custom"
        },
        {
            "encryptedApiKey": "YOUR_ENCRYPTED_API_KEY_HERE",
            "endpoint": "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
            "id": "deepseek-r2",
            "uuid": "859b5388-027e-44fd-8bf4-9dc346c22",
            "type":"custom"
        }
]
}
```

在调用模型 API 的时候优先调用户自定义的,并且保存用户最后选择的模型 id（lastSelectedModel） 这个已经实现

结合上面的分析

在 modelApi 中 API 请求只有两种

1、sendChatToAiHubMix
2、sendChatToCustomApi

- 在当前项目中添加的 deepseek-r1 模型只是自定义添加的一个模型，应该属于 sendChatToCustomApi 范畴，不要单独写一个方法

- 在模型选择器 selectedModel.value 中选择了什么模型就传递什么模型的 id 给上面两个 API 的参数 modelId

- 移除 model.provider 字段

- 保留 方法 sendChatToDeepSeek 不要移除

- 参照 sendChatToDeepSeek 构建 sendChatToCustomApi 方法，调用模型的 API_URL 和 API_KEY，要从本地存储的设置项中读取

- 构建 sendChatToAiHubMix 方法 ，当用户在选择由 AiHubMix 提供的 AI 模型时调用这个方法，

使用 type 字段来判断调用哪个方法

type 字段可选值为 custom 和 aihubmix
