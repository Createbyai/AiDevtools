// 统一的模型API服务
import { useStreamMarkdown } from "@/composables/useStreamMarkdown";

/**
 * 模型配置
 * @typedef {Object} Model
 * @property {string} id - 模型ID
 * @property {string} uuid - 唯一标识符
 * @property {string} type - 模型类型 (如 'aihubmix', 'custom')
 * @property {string} [endpoint] - API端点
 * @property {string} [encryptedApiKey] - 加密后的API密钥
 * @property {boolean} [configured] - 是否已配置
 */

/**
 * 存储相关的方法
 */
const storage = {
    /**
     * 获取设置
     * @returns {Promise<Object>} 设置对象
     */
    async getSettings() {
        return new Promise((resolve) => {
            console.log("[ModelAPI] 尝试从存储中获取设置...");

            chrome.storage.local.get("settings", (result) => {
                console.log("[ModelAPI] 从存储获取到的原始数据:", result);
                if (chrome.runtime.lastError) {
                    console.error("[ModelAPI] 读取设置时出错:", chrome.runtime.lastError);
                    resolve({});
                    return;
                }

                if (!result || !result.settings) {
                    console.log("[ModelAPI] 未找到设置数据，返回默认设置");
                    resolve({
                        customModels: [],
                    });
                    return;
                }

                // 复制设置对象，避免修改原始对象
                const settings = { ...result.settings };

                // 确保customModels是数组
                if (settings.customModels && !Array.isArray(settings.customModels)) {
                    console.warn("[ModelAPI] customModels不是数组，将转换为数组");
                    settings.customModels = this.convertCustomModelsToArray(settings.customModels);
                } else if (!settings.customModels) {
                    settings.customModels = [];
                }

                console.log("[ModelAPI] 成功获取设置数据:", settings);
                resolve(settings);
            });
        });
    },

    /**
     * 保存设置
     * @param {Object} settings - 设置对象
     * @returns {Promise<boolean>} 是否保存成功
     */
    async saveSettings(settings) {
        return new Promise((resolve, reject) => {
            console.log("[ModelAPI] 尝试保存设置:", settings);

            // 深拷贝设置对象，避免引用问题
            const settingsToSave = JSON.parse(JSON.stringify(settings));

            // 确保customModels是数组
            if (settingsToSave.customModels && !Array.isArray(settingsToSave.customModels)) {
                console.warn("[ModelAPI] customModels不是数组，尝试转换");
                settingsToSave.customModels = this.convertCustomModelsToArray(settingsToSave.customModels);
            }

            console.log("[ModelAPI] 最终保存的设置:", JSON.stringify(settingsToSave));

            // 使用local存储
            chrome.storage.local.set({ settings: settingsToSave }, () => {
                if (chrome.runtime.lastError) {
                    console.error("[ModelAPI] 保存设置时出错:", chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                    return;
                }
                console.log("[ModelAPI] 设置保存成功");
                resolve(true);
            });
        });
    },

    /**
     * 将customModels对象转换为数组
     * @param {Object|any} customModels - customModels对象或其他值
     * @returns {Array} 模型数组
     */
    convertCustomModelsToArray(customModels) {
        if (typeof customModels === "object" && !Array.isArray(customModels)) {
            try {
                return Object.values(customModels)
                    .filter(model => model && typeof model === "object")
                    .map(model => ({
                        ...model,
                        type: model.type || "custom",
                        uuid: model.uuid || this.generateUUID()
                    }));
            } catch (error) {
                console.error("[ModelAPI] 转换customModels失败:", error);
                return [];
            }
        }
        return [];
    },

    /**
     * 生成UUID
     * @returns {string} UUID
     */
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    },

    /**
     * 解密API密钥
     * @param {string} encryptedApiKey - 加密后的API密钥
     * @returns {Promise<string>} 解密后的API密钥
     */
    async decryptApiKey(encryptedApiKey) {
        try {
            // 使用Base64解码
            if (!encryptedApiKey) {
                return "";
            }

            // console.log("[DEBUG] 解密前API密钥:", encryptedApiKey);

            // 尝试解码Base64字符串
            const result = atob(encryptedApiKey);
            // console.log("[DEBUG] 解密后API密钥:", result);
            return result;
        } catch (error) {
            console.error("[ModelAPI] 解密API密钥失败：", error);
            // 如果解密失败，返回原始字符串，避免阻止程序运行
            return encryptedApiKey;
        }
    }
};

/**
 * API请求相关方法
 */
const api = {
    /**
     * 发送聊天到AiHubMix API
     * @param {Array} messages - 消息历史数组
     * @param {string} modelId - 模型ID
     * @param {Object} options - 配置选项
     * @param {Function} options.onMessage - 处理消息回调
     * @param {Function} options.onDone - 完成回调
     * @param {Function} options.onError - 错误回调
     * @returns {Object} - 包含abort函数的对象
     */
    async sendChatToAiHubMix(messages, modelId, { onMessage, onDone, onError }) {
        try {
            // 获取AiHubMix配置
            const settings = await storage.getSettings();
            let API_KEY = "";

            if (settings.aihubmixApiKey) {
                try {
                    API_KEY = await storage.decryptApiKey(settings.aihubmixApiKey);
                } catch (error) {
                    console.error("[ModelAPI] 解密AiHubMix API密钥失败:", error);
                    onError?.(new Error("AiHubMix API密钥解密失败"));
                    return {
                        abort: () => {
                            console.log("[ModelAPI] AiHubMix 执行空的abort函数");
                            onDone?.();
                        }
                    };
                }
            } else {
                console.error("[ModelAPI] 未配置AiHubMix API密钥");
                onError?.(new Error("未配置AiHubMix API密钥"));
                return {
                    abort: () => {
                        console.log("[ModelAPI] AiHubMix 执行空的abort函数");
                        onDone?.();
                    }
                };
            }

            const API_URL = "https://api.aihubmix.com/v1/chat/completions";

            // 使用新的合并后的组合式函数
            const streamMarkdown = useStreamMarkdown();
            const { start, abort } = streamMarkdown.useSSEStream({
                onMessage(json) {
                    const delta = json?.choices?.[0]?.delta;
                    const content = delta?.content;
                    if (typeof content === "string") {
                        // 不再在每条消息时打印
                        // console.log("[ModelAPI] AiHubMix API 收到数据:", content.slice(0, 50));
                        onMessage?.(content);
                    }
                },
                onDone() {
                    console.log("[ModelAPI] AiHubMix API Stream complete.");
                    onDone?.();
                },
                onError(err) {
                    console.warn("[ModelAPI] AiHubMix API 解析错误", err);
                    onError?.(err);
                },
            });

            // 启动请求
            start({
                url: API_URL,
                headers: {
                    Authorization: `Bearer ${API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: {
                    model: modelId,
                    messages,
                    stream: true,
                    stream_options: { include_usage: true },
                },
            });

            console.log("[DEBUG] AiHubMix返回abort函数");
            return { abort };
        } catch (error) {
            console.error("[ModelAPI] AiHubMix API请求失败:", error);
            onError?.(error);
            return {
                abort: () => {
                    console.log("[ModelAPI] AiHubMix 执行空的abort函数");
                    onDone?.();
                }
            };
        }
    },

    /**
     * 
     * 
     * 发送聊天到自定义API
     * @param {Array} messages - 消息历史数组
     * @param {Model} model - 模型配置
     * @param {Object} callbacks - 回调函数
     * @returns {Object} - 包含abort函数的对象
     */
    async sendChatToCustomApi(messages, model, { onMessage, onDone, onError }) {
        try {
            if (!model.endpoint) {
                const error = new Error("自定义模型缺少API端点配置");
                console.error("[ModelAPI]", error);
                onError?.(error);
                return {
                    abort: () => {
                        console.log("[ModelAPI] 自定义API 执行空的abort函数");
                        onDone?.();
                    }
                };
            }

            let API_KEY = "";
            if (model.encryptedApiKey) {
                try {
                    API_KEY = await storage.decryptApiKey(model.encryptedApiKey);
                } catch (error) {
                    console.error("[ModelAPI] 解密API密钥失败:", error);
                    onError?.(new Error("API密钥解密失败"));
                    return {
                        abort: () => {
                            console.log("[ModelAPI] 自定义API 执行空的abort函数");
                            onDone?.();
                        }
                    };
                }
            }

            // 使用新的合并后的组合式函数
            const streamMarkdown = useStreamMarkdown();
            const { start, abort } = streamMarkdown.useSSEStream({
                onMessage(json) {
                    const delta = json?.choices?.[0]?.delta;
                    const content = delta?.content || delta?.reasoning_content;
                    if (typeof content === "string") {
                        // 不再实时打印每条消息
                        // console.log("[ModelAPI] 自定义API 收到数据:", content.slice(0, 50));
                        onMessage?.(content);
                    }
                },
                onDone() {
                    console.log("[ModelAPI] 自定义API Stream complete.");
                    onDone?.();
                },
                onError(err) {
                    console.warn("[ModelAPI] 自定义API 解析错误", err);
                    onError?.(err);
                },
            });

            // 构建请求头
            const headers = {
                "Content-Type": "application/json"
            };

            // 如果有API密钥，添加到请求头
            if (API_KEY) {
                headers.Authorization = `Bearer ${API_KEY}`;
            }

            // 启动请求
            start({
                url: model.endpoint,
                headers,
                body: {
                    model: model.id,
                    messages,
                    stream: true,
                    stream_options: { include_usage: true },
                },
            });

            console.log("[DEBUG] 自定义API返回abort函数");
            return { abort };
        } catch (error) {
            console.error("[ModelAPI] 自定义API发送失败:", error);
            onError?.(error);
            return {
                abort: () => {
                    console.log("[ModelAPI] 自定义API 执行空的abort函数");
                    onDone?.();
                }
            };
        }
    },

    /**
     * 统一的发送聊天消息接口
     * @param {Array} messages - 消息历史数组
     * @param {string} modelId - 模型ID
     * @param {Object} callbacks - 回调函数
     * @returns {Object} - 包含abort函数的对象
     */
    async sendChat(messages, modelId, callbacks) {
        try {
            // 获取所有模型
            const settings = await storage.getSettings();
            const models = settings.customModels || [];
            console.log('[ModelAPI] 开始发送聊天请求，模型ID:', modelId);

            // 查找选定的模型
            const model = models.find(m => m.id === modelId);

            let result = null;

            // 如果找不到模型，假定是AiHubMix模型
            if (!model) {
                console.log("[ModelAPI] 未找到自定义模型，使用AiHubMix API");
                result = await this.sendChatToAiHubMix(messages, modelId, callbacks);
                console.log("[ModelAPI] AiHubMix API返回abort函数:", !!result?.abort);
            }
            // 根据模型类型选择不同的API
            else if (model.type === 'aihubmix') {
                console.log("[ModelAPI] 使用AiHubMix API");
                result = await this.sendChatToAiHubMix(messages, modelId, callbacks);
                console.log("[ModelAPI] AiHubMix API返回abort函数:", !!result?.abort);
            } else {
                console.log("[ModelAPI] 使用自定义API");
                result = await this.sendChatToCustomApi(messages, model, callbacks);
                console.log("[ModelAPI] 自定义API返回abort函数:", !!result?.abort);
            }

            // 确保有一个可用的abort函数，即使result为null或undefined
            if (!result || typeof result.abort !== 'function') {
                console.warn("[ModelAPI] API没有返回有效的abort函数，创建一个空函数");
                return {
                    abort: () => {
                        console.log("[ModelAPI] 执行空的abort函数");
                        callbacks.onDone?.();
                    }
                };
            }

            // 返回带有abort函数的对象
            return {
                abort: () => {
                    console.log("[ModelAPI] 执行API返回的abort函数");
                    try {
                        result.abort();
                    } catch (e) {
                        console.error("[ModelAPI] 执行abort函数失败:", e);
                    }
                    // 确保无论如何都调用onDone
                    callbacks.onDone?.();
                }
            };
        } catch (error) {
            console.error("[ModelAPI] 发送聊天消息失败:", error);
            callbacks.onError?.(error);
            // 返回一个简单的abort函数，与demo一致
            return {
                abort: () => {
                    console.log("[ModelAPI] 执行错误状态下的abort函数");
                    callbacks.onDone?.();
                }
            };
        }
    }
};

/**
 * 模型管理相关方法
 */
const modelManager = {
    /**
     * 获取所有自定义模型
     * @returns {Promise<Array<Model>>} 模型数组
     */
    async getCustomModels() {
        const settings = await storage.getSettings();
        return settings.customModels || [];
    },

    /**
     * 添加或更新模型
     * @param {Model} model - 模型配置
     * @returns {Promise<boolean>} 是否成功
     */
    async saveModel(model) {
        try {
            // 确保模型有UUID
            if (!model.uuid) {
                model.uuid = storage.generateUUID();
            }

            const settings = await storage.getSettings();
            const models = settings.customModels || [];

            // 查找是否已存在
            const index = models.findIndex(m => m.uuid === model.uuid);

            if (index >= 0) {
                // 更新现有模型
                models[index] = { ...models[index], ...model };
            } else {
                // 添加新模型
                models.unshift(model);
            }

            settings.customModels = models;
            await storage.saveSettings(settings);
            return true;
        } catch (error) {
            console.error("[ModelAPI] 保存模型失败:", error);
            return false;
        }
    },

    /**
     * 删除模型
     * @param {string} uuid - 模型UUID
     * @returns {Promise<boolean>} 是否成功
     */
    async deleteModel(uuid) {
        try {
            const settings = await storage.getSettings();
            const models = settings.customModels || [];

            // 过滤掉要删除的模型
            settings.customModels = models.filter(m => m.uuid !== uuid);

            await storage.saveSettings(settings);
            return true;
        } catch (error) {
            console.error("[ModelAPI] 删除模型失败:", error);
            return false;
        }
    },

    /**
     * 检查模型是否配置完整
     * @param {Model} model - 模型配置
     * @returns {boolean} 是否配置完整
     */
    isModelConfigured(model) {
        if (!model) return false;

        // AiHubMix模型需要apiKey
        if (model.type === 'aihubmix') {
            return !!model.encryptedApiKey;
        }

        // 自定义模型需要endpoint和apiKey
        return !!model.endpoint && !!model.encryptedApiKey;
    }
};

// 导出统一的模型API
export const modelApi = {
    ...storage,
    ...api,
    ...modelManager
};

// 为了向后兼容，导出常用方法
export const {
    getSettings,
    saveSettings,
    sendChatToAiHubMix,
    sendChatToCustomApi,
    getCustomModels,
    saveModel,
    deleteModel,
    isModelConfigured,
    decryptApiKey
} = modelApi; 