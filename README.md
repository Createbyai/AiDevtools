# AI Devtools 助手

一个强大的 Chrome DevTools 扩展，用于捕获和分析浏览器控制台消息，并通过 AI 提供智能的问题诊断和解决方案。

## 📋 项目简介

AI Devtools 助手是一个 Chrome 浏览器扩展，它能够实时捕获浏览器控制台中的错误、警告、信息和日志消息，并利用 AI 技术对这些消息进行智能分析，为开发者提供问题原因分析和解决方案建议。

## ✨ 主要功能

### 1. 控制台消息捕获
- **实时监听**：使用 Chrome DevTools Protocol (CDP) 实时捕获控制台消息
- **消息分类**：自动分类为错误、警告、信息和日志四种类型
- **消息过滤**：支持按类型筛选查看消息
- **消息去重**：自动过滤重复消息，避免信息冗余
- **详细信息**：显示消息的 URL、行号、列号、函数名和堆栈信息

### 2. AI 智能分析
- **一键分析**：点击消息旁的 "AI" 按钮，快速获取问题分析
- **多模型支持**：
  - **AiHubMix 模型**：支持 gpt-4o、claude-3-opus、claude-3-sonnet、gemini-pro 等多种模型
  - **自定义模型**：支持添加自己的 AI 模型 API（如 DeepSeek、通义千问等）
- **流式响应**：实时流式显示 AI 回复，提供更好的交互体验
- **Markdown 渲染**：支持完整的 Markdown 格式，包括代码高亮、表格、列表等
- **多轮对话**：支持上下文对话，可以继续追问相关问题

### 3. 用户界面
- **分屏布局**：左右或上下分屏显示控制台消息和 AI 建议
- **响应式设计**：支持水平/垂直布局切换
- **消息统计**：实时显示各类消息的数量统计
- **代码复制**：支持一键复制消息内容和代码块

![UI](./ui.png)

### 4. 模型管理
- **模型配置**：支持配置 AiHubMix API 密钥
- **自定义模型**：可以添加、编辑、删除自定义模型
- **模型选择**：快速切换不同的 AI 模型
- **配置加密**：API 密钥使用 Base64 编码存储（建议后续升级为更安全的加密方式）

## 🚀 安装与使用

### 安装步骤

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd AiDevtools
   ```

2. **安装依赖**
   ```bash
   pnpm install
   # 或
   npm install
   ```

3. **构建项目**
   ```bash
   pnpm build
   # 或
   npm run build
   ```

4. **加载扩展**
   - 打开 Chrome 浏览器
   - 访问 `chrome://extensions/`
   - 开启"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择项目的 `dist` 目录

5. **使用扩展**
   - 打开任意网页
   - 按 `F12` 打开开发者工具
   - 在 DevTools 面板中找到 "AI Devtools 助手" 标签页
   - 开始使用！

### 配置 AI 模型

1. **配置 AiHubMix 模型**
   - 点击设置图标（⚙️）
   - 在"常规设置"标签页中选择模型
   - 输入 AiHubMix API 密钥
   - 保存设置

2. **添加自定义模型**
   - 点击设置图标（⚙️）
   - 切换到"模型管理"标签页
   - 点击"添加新模型"
   - 填写模型信息：
     - 模型名称（如：deepseek-r1）
     - API 端点（如：https://api.example.com/v1/chat/completions）
     - API 密钥（可选）
   - 保存模型

## 🛠️ 开发指南

### 项目结构

```
AiDevtools/
├── src/                    # 源代码目录
│   ├── components/        # Vue 组件
│   │   ├── ChatInput.vue  # 聊天输入组件
│   │   └── StreamMd.vue   # 流式 Markdown 显示组件
│   ├── composables/       # 组合式函数
│   │   └── useStreamMarkdown.js  # Markdown 流式处理
│   ├── services/          # 服务层
│   │   └── modelApi.js    # 模型 API 服务
│   ├── assets/            # 静态资源
│   ├── icons/             # 扩展图标
│   ├── background.js     # 后台脚本
│   ├── devtools.html      # DevTools 页面入口
│   ├── devtools.js        # DevTools 脚本
│   └── manifest.json      # 扩展清单文件
├── dist/                  # 构建输出目录
├── panel.html             # 面板 HTML 入口
├── Panel.vue              # 主面板组件
├── vite.config.js         # Vite 配置
└── package.json           # 项目配置
```

### 技术栈

- **Vue 3**：使用 Composition API 构建用户界面
- **Vite**：快速的前端构建工具
- **Arco Design Vue**：企业级 UI 组件库
- **Chrome Extension API**：Chrome 扩展开发 API
- **Chrome DevTools Protocol (CDP)**：用于捕获控制台消息
- **Markdown-it**：Markdown 解析器
- **Highlight.js**：代码高亮

### 开发命令

```bash
# 开发模式（监听文件变化）
pnpm watch

# 构建生产版本
pnpm build

# 构建并打包扩展
pnpm build:extension
```

### 核心功能实现

#### 1. 控制台消息捕获

使用 Chrome DevTools Protocol 的 `Console.enable`、`Runtime.enable` 和 `Debugger.enable` 来捕获：
- `Console.messageAdded`：控制台消息
- `Runtime.consoleAPICalled`：console API 调用（console.error、console.warn 等）
- `Runtime.exceptionThrown`：运行时异常

#### 2. AI 流式响应

使用 Server-Sent Events (SSE) 实现流式响应：
- 实时接收 AI 返回的文本片段
- 使用 `useStreamMarkdown` 组合式函数处理流式数据
- 支持中止请求功能

#### 3. 模型 API 统一管理

`modelApi.js` 提供统一的模型 API 接口：
- `sendChatToAiHubMix`：发送请求到 AiHubMix API
- `sendChatToCustomApi`：发送请求到自定义 API
- `sendChat`：统一的发送接口，根据模型类型自动选择

## ⚠️ 已知问题与不足

### 1. 安全性问题
- **API 密钥加密**：当前使用 Base64 编码存储 API 密钥，安全性较低，建议升级为更安全的加密方式（如使用 Web Crypto API）
- **密钥管理**：API 密钥存储在本地，如果设备被他人访问可能存在泄露风险

### 2. 功能限制
- **消息数量限制**：当前最多保存 100 条消息，超出后会自动删除最旧的消息
- **历史消息**：刷新页面后，之前捕获的消息会丢失（未持久化存储）
- **多标签页支持**：每个标签页的 DevTools 面板独立，无法跨标签页查看消息

### 3. 性能问题
- **大量消息**：当页面产生大量控制台消息时，可能会影响扩展性能
- **内存占用**：长时间使用可能会占用较多内存

### 4. 兼容性问题
- **浏览器支持**：仅支持 Chrome/Edge 等基于 Chromium 的浏览器
- **CDP 限制**：某些特殊页面（如 chrome:// 页面）可能无法使用 CDP 功能

### 5. 用户体验
- **错误提示**：部分错误提示信息可能不够详细
- **模型配置**：首次使用需要手动配置模型，缺少引导流程
- **国际化**：目前仅支持中文界面

### 6. 代码质量
- **代码注释**：部分复杂逻辑缺少详细注释
- **错误处理**：部分错误处理可能不够完善
- **类型检查**：未使用 TypeScript，缺少类型检查

## 🔮 未来改进方向

1. **安全性增强**
   - 使用 Web Crypto API 加密 API 密钥
   - 添加密钥导入/导出功能
   - 支持密钥过期提醒

2. **功能扩展**
   - 支持消息持久化存储
   - 添加消息搜索功能
   - 支持消息导出（JSON/CSV）
   - 添加消息统计图表

3. **性能优化**
   - 实现虚拟滚动，支持大量消息
   - 优化消息去重算法
   - 添加消息分页加载

4. **用户体验**
   - 添加首次使用引导
   - 支持暗色主题
   - 添加国际化支持（i18n）
   - 优化错误提示信息

5. **代码质量**
   - 迁移到 TypeScript
   - 添加单元测试
   - 完善代码注释
   - 优化代码结构

## 🤖 AI 辅助开发说明

本项目完全由 AI 辅助开发完成。在开发过程中，AI 帮助完成了：

- **项目架构设计**：整体项目结构和技术选型
- **核心功能实现**：控制台消息捕获、AI 集成、流式响应等
- **UI 组件开发**：使用 Vue 3 和 Arco Design 构建用户界面
- **问题解决**：调试和修复各种技术问题
- **代码优化**：性能优化和代码重构

这展示了 AI 在软件开发中的强大辅助能力，能够帮助开发者快速构建功能完整的应用程序。

## 📝 许可证

本项目采用 MIT 许可证。

## 🙏 致谢

- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Vite](https://vitejs.dev/) - 下一代前端构建工具
- [Arco Design](https://arco.design/) - 企业级设计语言和组件库
- [AiHubMix](https://aihubmix.com/) - AI 模型聚合平台

---

**注意**：本项目仅供学习和研究使用。使用 AI 模型 API 时，请注意遵守相关服务的使用条款和隐私政策。

