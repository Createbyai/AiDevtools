<template>
    <div class="tools">
        <a-split :style="{
            height: '100%',
            width: '100%',
            minWidth: '500px',
            border: '1px solid var(--color-border)',
        }" v-model="size" min="50%" :direction="direction">
            <template #first>
                <a-layout class="section">
                    <a-layout-header class="opt-bar">
                        <a-row justify="space-between" align="center">
                            <a-col flex="150px">
                                <div>Console Messages</div>
                            </a-col>
                            <a-col flex="auto">
                                <a-space>
                                    <a-tag size="small" :class="{ active: isAllActive }" :bordered="isAllActive"
                                        @click="toggleAllFilters"><icon-list />全部
                                        <a-badge v-if="messageCounts.total > 0" :count="messageCounts.total"
                                            :dotStyle="{ background: '#1d2129' }" />
                                    </a-tag>
                                    <a-tag size="small" color="red" :class="{ active: activeFilters.error }"
                                        :bordered="activeFilters.error"
                                        @click="toggleFilter('error')"><icon-close-circle />错误
                                        <a-badge v-if="messageCounts.error > 0" :count="messageCounts.error" />
                                    </a-tag>
                                    <a-tag size="small" color="orangered" :class="{ active: activeFilters.warning }"
                                        :bordered="activeFilters.warning" @click="toggleFilter('warning')"><i
                                            class="iconfont icon-warning" style="font-size: 12px;"></i>警告
                                        <a-badge v-if="messageCounts.warning > 0" :count="messageCounts.warning"
                                            :dotStyle="{ background: '#f77234' }" />
                                    </a-tag>
                                    <a-tag size="small" color="arcoblue" :class="{ active: activeFilters.info }"
                                        :bordered="activeFilters.info"
                                        @click="toggleFilter('info')"><icon-info-circle />信息
                                        <a-badge v-if="messageCounts.info > 0" :count="messageCounts.info"
                                            :dotStyle="{ background: '#165dff' }" />
                                    </a-tag>
                                    <a-tag size="small" color="green" :class="{ active: activeFilters.log }"
                                        :bordered="activeFilters.log" @click="toggleFilter('log')"><icon-file />日志
                                        <a-badge v-if="messageCounts.log > 0" :count="messageCounts.log"
                                            :dotStyle="{ background: '#00b42a' }" />
                                    </a-tag>
                                </a-space>
                            </a-col>

                            <a-col flex="120px" class="opt-btn">
                                <a-space>
                                    <icon-delete size="20" strokeWidth="2" @click="clearMessages" />
                                    <icon-layout size="20" strokeWidth="2"
                                        :rotate="direction === 'horizontal' ? '' : '90'" @click="toggleDirection" />
                                    <icon-settings size="20" strokeWidth="2" @click="showSettings" />
                                </a-space>
                            </a-col>
                        </a-row>
                    </a-layout-header>
                    <a-layout-content class="console-msg">
                        <a-list size="small" :bordered="false">
                            <a-list-item v-for="item of filteredMessages" :key="item.id">
                                <a-list-item-meta>
                                    <template #title>
                                        <span :class="`log-title log-title-${item.type}`">{{ item.title }}</span>
                                    </template>
                                    <template #description>
                                        <div v-html="item.desc"></div>
                                    </template>
                                </a-list-item-meta>
                                <template #actions>
                                    <div class="ask-ai" @click="handleAskAI(item)">AI</div>
                                </template>
                            </a-list-item>
                        </a-list>
                    </a-layout-content>
                </a-layout>
            </template>
            <template #second>
                <div class="section">
                    <a-layout style="height: 100%">
                        <a-layout-header class="ai-msg-header">AI Suggestions</a-layout-header>
                        <a-layout-content>
                            <StreamMd ref="mdBox" />
                        </a-layout-content>
                        <a-layout-footer class="chat-input-container">
                            <div class="tools-bar">
                                <a-select v-model="selectedModel" :style="{ width: '160px' }" placeholder="选择模型..."
                                    allow-search :loading="isLoadingModels" @change="handleModelChange" size="mini">
                                    <a-option-group label="自定义模型" v-if="
                                        customModels.length > 0
                                    ">
                                        <a-option v-for="model in customModels" :key="model.uuid" :value="model.id">
                                            <span>{{ model.id }}</span>
                                        </a-option>
                                    </a-option-group>
                                    <a-option-group label="AiHubMix 模型" v-if="
                                        hasAiHubMixApiKey && allModels.filter((m) => m.type === 'aihubmix').length > 0
                                    ">
                                        <a-option v-for="model in allModels.filter(
                                            (m) => m.type === 'aihubmix'
                                        )" :key="model.id" :value="model.id">
                                            <span>{{ model.id }}</span>
                                        </a-option>
                                    </a-option-group>

                                    <template #empty>
                                        <div style="padding: 6px 12px; text-align: center">
                                            <div v-if="isLoadingModels">加载中...</div>
                                            <div v-else-if="!hasAiHubMixApiKey && customModels.length === 0">
                                                未配置任何模型，请先在
                                                <a-button type="text" size="mini" @click="showSettings">设置</a-button>
                                                中配置AiHubMix密钥或添加自定义模型
                                            </div>
                                            <div v-else>没有可用模型</div>
                                        </div>
                                    </template>
                                </a-select>
                            </div>

                            <ChatInput @send="handleSend" :loading="loading" :canAbort="!!abortFn" @abort="handleAbort"
                                :isFirstTokenReceived="isFirstTokenReceived" />
                        </a-layout-footer>
                    </a-layout>
                </div>
            </template>
        </a-split>

        <!-- Settings Modal -->
        <a-modal v-model:visible="settingsVisible" @cancel="cancelSettings" :mask-closable="false" :footer="false"
            width="600px" unmount-on-close title="设置">
            <a-tabs default-active-key="general">
                <a-tab-pane key="general" title="常规设置">
                    <a-form :model="settingsForm" layout="vertical" ref="settingsFormRef">
                        <a-form-item field="model" label="选择模型" validate-trigger="blur" required>
                            <a-select v-model="settingsForm.model" placeholder="请选择模型"
                                @change="updateApiFieldsBasedOnModel">
                                <a-option value="AiHubMix">AiHubMix</a-option>
                                <a-option v-for="model in customModels" :key="model.uuid" :value="model.id">
                                    {{ model.id }}
                                </a-option>
                            </a-select>
                        </a-form-item>
                        <a-form-item field="aihubmixApiKey" label="AiHubMix API密钥" validate-trigger="blur" v-if="
                            settingsForm.model === 'AiHubMix' ||
                            allModels
                                .filter((m) => m.type === 'aihubmix')
                                .some((m) => m.id === settingsForm.model)
                        ">
                            <a-input-password v-model="settingsForm.aihubmixApiKey" placeholder="输入AiHubMix API密钥"
                                allow-clear />
                            <template #help>
                                <div>用于访问AiHubMix模型 (gpt-4o, claude, gemini等)</div>
                            </template>
                        </a-form-item>
                        <div v-if="
                            settingsForm.model !== 'AiHubMix' &&
                            allModels
                                .filter((m) => m.type === 'custom')
                                .some((m) => m.id === settingsForm.model)
                        " class="custom-model-settings">
                            <div class="custom-model-info">
                                <p>
                                    <strong>模型信息：</strong>
                                    此模型的设置保存在模型配置中，请在"模型管理"标签页中编辑详细设置。
                                </p>
                                <a-button type="text" size="small" @click="goToModelEdit">编辑此模型</a-button>
                            </div>
                        </div>
                    </a-form>
                    <div class="settings-footer">
                        <a-space>
                            <a-button @click="cancelSettings">取消</a-button>
                            <a-button type="primary" @click="saveSettingsFromForm">保存</a-button>
                        </a-space>
                    </div>
                </a-tab-pane>
                <a-tab-pane key="models" title="模型管理">
                    <div v-if="!showModelForm">
                        <div class="custom-models-list">
                            <a-empty v-if="customModels.length === 0" description="暂无自定义模型" />
                            <a-list v-else :bordered="false" size="small">
                                <a-list-item v-for="model in customModels" :key="model.uuid">
                                    <div class="model-info">
                                        <div class="model-name">{{ model.id }}</div>
                                        <div class="model-endpoint">{{ model.endpoint }}</div>
                                    </div>
                                    <template #actions>
                                        <a-button type="text" size="small" @click="editModel(model)">编辑</a-button>
                                        <a-button type="text" size="small"
                                            @click="deleteCustomModel(model.uuid)">删除</a-button>
                                    </template>
                                </a-list-item>
                            </a-list>
                        </div>
                        <div class="models-list-footer">
                            <a-button type="primary" @click="showAddModelForm">添加新模型</a-button>
                        </div>
                    </div>
                    <div v-else>
                        <h3>{{ editModelId ? "编辑模型" : "添加新模型" }}</h3>
                        <a-form :model="modelForm" layout="vertical" ref="modelFormRef">
                            <a-form-item field="name" label="模型名称" required validate-trigger="blur">
                                <a-input v-model="modelForm.name" placeholder="输入模型名称" />
                            </a-form-item>
                            <a-form-item field="endpoint" label="API端点" required validate-trigger="blur">
                                <a-input v-model="modelForm.endpoint" placeholder="https://api.example.com" />
                            </a-form-item>
                            <a-form-item field="apiKey" label="API密钥" validate-trigger="blur">
                                <a-input-password v-model="modelForm.apiKey" placeholder="输入API密钥" allow-clear />
                            </a-form-item>
                        </a-form>
                        <div class="model-form-actions">
                            <a-space>
                                <a-button @click="cancelModelForm">取消</a-button>
                                <a-button type="primary" @click="saveModelFromForm">保存</a-button>
                            </a-space>
                        </div>
                    </div>
                </a-tab-pane>
            </a-tabs>
        </a-modal>
    </div>
</template>
<script setup>
import { ref, onMounted, reactive, computed, watch, nextTick } from "vue";
import { Message } from '@arco-design/web-vue';

import StreamMd from "@/components/StreamMd.vue";

import ChatInput from "@/components/ChatInput.vue";
import { modelApi } from "@/services/modelApi";
// 设置相关状态

const settingsVisible = ref(false);
const settingsForm = reactive({
    model: "AiHubMix",
    aihubmixApiKey: "", // AiHubMix专用API密钥
});
const customModels = ref([]);
const showModelForm = ref(false);
const modelForm = reactive({
    name: "",
    endpoint: "",
    apiKey: "",
});
const editModelId = ref("");
const settingsFormRef = ref(null);
const modelFormRef = ref(null);

const mdBox = ref(null);
const loading = ref(false);
const isFirstTokenReceived = ref(false);
const messages = ref([]); // ✅ 多轮上下文保存
let abortFn = null; // ✅ 中止控制句柄




// 显示设置对话框
function showSettings() {
    settingsVisible.value = true;
    // 初始化设置表单
    initializeSettings();
}

// 初始化设置
async function initializeSettings() {
    try {
        console.log("[DEBUG] 开始初始化设置...");

        // 从存储中获取设置
        const settingsData = await getSettings();
        console.log("[DEBUG] 获取到的设置详情:", settingsData);

        if (settingsData) {
            if (settingsData.model) {
                settingsForm.model = settingsData.model;
                console.log("[DEBUG] 设置模型:", settingsData.model);
            }

            // 设置AiHubMix API密钥
            if (settingsData.aihubmixApiKey) {
                try {
                    const decryptedKey = await decryptApiKey(settingsData.aihubmixApiKey);
                    settingsForm.aihubmixApiKey = decryptedKey;
                    console.log("[DEBUG] AiHubMix API密钥解密成功");
                } catch (error) {
                    console.error("[DEBUG] 解密AiHubMix API密钥失败:", error);
                    settingsForm.aihubmixApiKey = "";
                }
            }

            // 向后兼容：如果有旧的全局encryptedApiKey但没有专用aihubmixApiKey
            if (settingsData.encryptedApiKey && !settingsData.aihubmixApiKey) {
                try {
                    const decryptedKey = await decryptApiKey(settingsData.encryptedApiKey);
                    // 仅设置aihubmixApiKey，不再使用apiKey字段
                    settingsForm.aihubmixApiKey = decryptedKey;
                    console.log("[DEBUG] 旧版API密钥解密成功并迁移至AiHubMix密钥");
                } catch (error) {
                    console.error("[DEBUG] 解密旧版API密钥失败:", error);
                }
            }

            // 确保全局customModels与settings中的一致
            if (
                Array.isArray(settingsData.customModels) &&
                settingsData.customModels.length > 0
            ) {
                console.log(
                    "[DEBUG] 从设置中更新自定义模型列表, 数量:",
                    settingsData.customModels.length
                );
                customModels.value = [...settingsData.customModels]; // 使用数组解构避免引用问题
            } else {
                console.log("[DEBUG] 没有找到有效的自定义模型，重置为空数组");
                customModels.value = [];
            }

            // 打印每个自定义模型的详细信息
            customModels.value.forEach((model, index) => {
                console.log(`[DEBUG] 自定义模型[${index}]:`, {
                    id: model.id,
                    uuid: model.uuid,
                    type: model.type || "custom",
                    endpoint: model.endpoint,
                    hasApiKey: !!model.encryptedApiKey,
                });
            });
        } else {
            console.log("[DEBUG] 没有找到设置数据");
            // 初始化为空数组
            customModels.value = [];
        }

        // 根据所选模型更新信息
        updateApiFieldsBasedOnModel();

        console.log(
            "[DEBUG] 初始化设置完成，自定义模型数量:",
            customModels.value.length
        );
    } catch (error) {
        console.error("[DEBUG] 初始化设置失败:", error);
        displayError("加载设置失败: " + error.message);
        // 发生错误时确保自定义模型为空数组
        customModels.value = [];
    }
}

// 取消设置对话框
function cancelSettings() {

    settingsVisible.value = false;

    // 重新加载模型列表，确保任何新添加的模型能显示在下拉列表中
    console.log("[DEBUG] 重新加载模型列表...");
    loadAllModels()
        .then(() => {
            console.log(
                "[DEBUG] 设置对话框关闭后重新加载完成, 自定义模型数量:",
                customModels.value.length
            );
        })
        .catch((error) => {
            console.error("[DEBUG] 重新加载模型失败:", error);
        });
}

// 从表单保存设置
async function saveSettingsFromForm() {
    try {
        // 验证表单
        await settingsFormRef.value.validate();

        // 加密AiHubMix API密钥
        let encryptedAiHubMixApiKey = null;
        if (settingsForm.aihubmixApiKey) {
            encryptedAiHubMixApiKey = await encryptApiKey(
                settingsForm.aihubmixApiKey
            );
        }

        // 准备保存的设置对象
        const settingsToSave = {
            model: settingsForm.model,
            aihubmixApiKey: encryptedAiHubMixApiKey, // 专用AiHubMix API密钥
            customModels: customModels.value,
        };

        // 保存设置
        await saveSettings(settingsToSave);

        displaySuccess("设置已保存");
        settingsVisible.value = false;

        // 重新加载模型列表，确保UI更新
        await loadAllModels();
    } catch (error) {
        console.error("保存设置失败:", error);
        displayError(`保存设置失败: ${error.message}`);
    }
}

// 显示添加模型表单
function showAddModelForm() {
    // 重置表单
    modelForm.name = "";
    modelForm.endpoint = "";
    modelForm.apiKey = "";
    editModelId.value = "";
    showModelForm.value = true;

    console.log("[DEBUG] 显示添加模型表单");
}

// 编辑现有模型
function editModel(model) {
    console.log("[DEBUG] 编辑模型:", model);

    modelForm.name = model.id;
    modelForm.endpoint = model.endpoint;

    // 如果存在加密的API密钥，则解密
    if (model.encryptedApiKey) {
        decryptApiKey(model.encryptedApiKey)
            .then((decryptedKey) => {
                modelForm.apiKey = decryptedKey;
            })
            .catch((error) => {
                console.error("解密模型API密钥失败:", error);
                modelForm.apiKey = "";
            });
    } else {
        modelForm.apiKey = "";
    }

    editModelId.value = model.id;
    showModelForm.value = true;
}

// 取消模型表单
function cancelModelForm() {
    showModelForm.value = false;
}

// 保存模型表单
async function saveModelFromForm() {
    try {
        // 验证表单
        await modelFormRef.value.validate();

        // 获取模型名称（用作id）
        const modelId = modelForm.name.trim();

        // 如果是编辑现有模型，使用原来的uuid；否则生成新的uuid
        const modelUuid = editModelId.value
            ? customModels.value.find((m) => m.id === editModelId.value)?.uuid
            : generateUUID();

        // 加密API密钥
        let encryptedApiKey = null;
        if (modelForm.apiKey) {
            encryptedApiKey = await encryptApiKey(modelForm.apiKey);
        }

        // 检查模型名称(id)唯一性
        const modelIdConflict = customModels.value.some(
            (m) =>
                (!editModelId.value || m.id !== editModelId.value) && m.id === modelId
        );

        if (modelIdConflict) {
            displayError(`模型名称"${modelId}"已被使用，请选择其他名称`);
            return;
        }

        console.log("[DEBUG] 准备保存模型:", {
            id: modelId,
            uuid: modelUuid,
            endpoint: modelForm.endpoint,
            hasApiKey: !!modelForm.apiKey,
        });

        // 创建新模型对象
        const modelData = {
            id: modelId,
            uuid: modelUuid,
            endpoint: modelForm.endpoint,
            encryptedApiKey,
            type: "custom", // 明确标记为自定义模型
        };

        console.log("[DEBUG] 保存前的自定义模型列表:", customModels.value);

        // 确保customModels是数组
        if (!Array.isArray(customModels.value)) {
            console.warn("[DEBUG] customModels不是数组，重置为空数组");
            customModels.value = [];
        }

        // 更新或添加模型
        if (editModelId.value) {
            // 更新现有模型
            const modelIndex = customModels.value.findIndex(
                (m) => m.id === editModelId.value
            );
            if (modelIndex >= 0) {
                customModels.value[modelIndex] = modelData;
                console.log(
                    "[DEBUG] 更新模型成功, 更新后的模型:",
                    customModels.value[modelIndex]
                );
            } else {
                console.warn("[DEBUG] 无法找到要更新的模型:", editModelId.value);
                // 如果找不到要更新的模型，直接添加为新模型
                customModels.value.unshift(modelData);
            }
        } else {
            // 添加新模型 - 添加到数组前面而不是尾部
            customModels.value.unshift(modelData); // 使用unshift代替push，使新模型显示在列表前部
            console.log("[DEBUG] 添加新模型成功:", modelData);
        }

        console.log("[DEBUG] 更新后的自定义模型列表:", customModels.value);
        console.log(
            "[DEBUG] customModels是否为数组:",
            Array.isArray(customModels.value)
        );

        // 获取当前设置
        const currentSettings = await getSettings();
        console.log("[DEBUG] 获取到的当前设置:", currentSettings);

        // 准备新的设置对象，确保结构正确
        const settingsToSave = {
            model: modelId, // 选择当前添加/编辑的模型
            apiEndpoint: settingsForm.apiEndpoint,
            encryptedApiKey: settingsForm.encryptedApiKey,
            customModels: [...customModels.value], // 使用数组解构创建新数组
        };

        console.log("[DEBUG] 准备保存的设置:", settingsToSave);
        console.log(
            "[DEBUG] 准备保存的customModels是否为数组:",
            Array.isArray(settingsToSave.customModels)
        );
        console.log(
            "[DEBUG] 准备保存的自定义模型数量:",
            settingsToSave.customModels.length
        );

        // 保存设置以更新自定义模型列表
        try {
            await saveSettings(settingsToSave);
            console.log(
                "[DEBUG] 设置已保存，自定义模型数量:",
                customModels.value.length
            );
        } catch (settingsError) {
            console.error("[DEBUG] 保存设置失败:", settingsError);
            displayError(`保存设置失败: ${settingsError.message}`);
            return;
        }

        // 无论之前是否有选择的模型，都选择当前编辑/新增的模型
        console.log("[DEBUG] 选择模型:", modelId);
        selectModel(modelId);

        // 验证模型是否被正确选择
        console.log("[DEBUG] 当前选择的模型:", selectedModel.value);

        // 显示成功消息
        displaySuccess(editModelId.value ? "模型已更新" : "模型已添加");

        // 关闭表单
        showModelForm.value = false;
    } catch (error) {
        console.error("[DEBUG] 保存模型失败:", error);
        displayError(`保存模型失败: ${error.message}`);
    }
}

// 删除自定义模型
async function deleteCustomModel(modelUuid) {
    try {
        const modelToDelete = customModels.value.find((m) => m.uuid === modelUuid);
        if (!modelToDelete) {
            displayError("找不到要删除的模型");
            return;
        }

        // 确认是否删除
        if (!confirm(`确定要删除模型"${modelToDelete.id}"吗？`)) {
            return;
        }

        console.log("[DEBUG] 删除模型:", modelToDelete);

        // 从列表中删除模型
        customModels.value = customModels.value.filter((m) => m.uuid !== modelUuid);

        // 更新设置
        await saveSettings({
            encryptedApiKey: settingsForm.encryptedApiKey,
            apiEndpoint: settingsForm.apiEndpoint,
            model: settingsForm.model,
            customModels: customModels.value,
        });

        // 如果当前选中的模型被删除，重新选择一个可用模型
        if (selectedModel.value === modelToDelete.id) {
            if (customModels.value.length > 0) {
                selectedModel.value = customModels.value[0].id;
                console.log(
                    "[DEBUG] 选中模型被删除，自动选择第一个自定义模型:",
                    selectedModel.value
                );
            } else if (aiHubMixModels.value.length > 0) {
                selectedModel.value = aiHubMixModels.value[0].id;
                console.log(
                    "[DEBUG] 选中模型被删除，自动选择第一个AiHubMix模型:",
                    selectedModel.value
                );
            } else {
                selectedModel.value = "";
                console.log("[DEBUG] 选中模型被删除，无可用模型");
            }
        }

        console.log("[DEBUG] 删除后的自定义模型列表:", customModels.value);
        console.log("[DEBUG] 当前选中的模型:", selectedModel.value);

        displaySuccess("模型已删除");
    } catch (error) {
        console.error("删除模型失败:", error);
        displayError(`删除模型失败: ${error.message}`);
    }
}

// 根据所选模型更新API字段
function updateApiFieldsBasedOnModel() {
    const selectedModelId = settingsForm.model;
    console.log("[DEBUG] 选择的模型:", selectedModelId);

    // 仅记录日志，不再需要修改任何API字段
    // 所有API配置现在保存在各自的模型对象中
    const model = allModels.value.find((m) => m.id === selectedModelId);

    if (model) {
        console.log("[DEBUG] 找到所选模型:", {
            id: model.id,
            type: model.type,
            provider: model.provider,
        });
    } else {
        console.log("[DEBUG] 未找到对应的模型，可能是AiHubMix总选项");
    }
}

// 显示成功消息
function displaySuccess(message) {
    // 使用Arco Design的Message组件
    Message.success({
        content: message,
        duration: 2000
    });
}

// 显示错误消息
function displayError(message) {
    // 使用Arco Design的Message组件
    Message.error({
        content: message,
        duration: 3000
    });
}

// 显示警告消息
function displayWarning(message) {
    Message.warning({
        content: message,
        duration: 2500
    });
}

// 显示普通信息
function displayInfo(message) {
    Message.info({
        content: message,
        duration: 2000
    });
}



// 深拷贝对象，避免引用问题
function deepClone(obj) {
    if (obj === null || typeof obj !== "object") {
        return obj;
    }

    // 处理数组
    if (Array.isArray(obj)) {
        return obj.map((item) => deepClone(item));
    }

    // 处理普通对象
    const copy = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            copy[key] = deepClone(obj[key]);
        }
    }

    return copy;
}

// 保存设置
async function saveSettings(settings) {
    return modelApi.saveSettings(settings);
}

// 加密API密钥
async function encryptApiKey(apiKey) {
    // 简单的Base64编码，实际应用中应使用更安全的加密方法
    return btoa(apiKey);
}

// 解密API密钥
async function decryptApiKey(encrypted) {
    // 简单的Base64解码，实际应用中应使用更安全的解密方法
    return atob(encrypted);
}

const size = ref(0.5);
const direction = ref("horizontal");
const data = reactive([]); // 清空初始数据，将由控制台消息填充
let isDebuggerAttached = false;
let tabId = null;

// 筛选状态
const filterState = reactive({
    error: true,
    warning: true,
    info: true,
    log: true,
});

// 仅保留activeFilters
const activeFilters = reactive({
    error: false,
    warning: false,
    info: false,
    log: false
});

// 是否有任何激活的过滤器
const hasActiveFilters = computed(() => {
    return activeFilters.error || activeFilters.warning ||
        activeFilters.info || activeFilters.log;
});

// 切换单个过滤器 - 简化版本
function toggleFilter(type) {
    // 如果当前类型已激活，则关闭所有过滤器
    if (activeFilters[type]) {
        Object.keys(activeFilters).forEach(key => activeFilters[key] = false);
    } else {
        // 否则，关闭所有其他过滤器，只激活当前过滤器
        Object.keys(activeFilters).forEach(key => activeFilters[key] = false);
        activeFilters[type] = true;
    }
}

// 切换全部过滤器
function toggleAllFilters() {
    // 如果有任何激活的过滤器，则关闭所有
    if (hasActiveFilters.value) {
        Object.keys(activeFilters).forEach(key => activeFilters[key] = false);
    }
    // 全部标签只用于"显示所有"，不需要全选所有过滤器
}

// 是否激活"全部"选项
const isAllActive = computed(() => {
    return !hasActiveFilters.value;
});

// 过滤消息
const filteredMessages = computed(() => {
    // 如果没有激活的过滤器，显示所有消息
    if (!hasActiveFilters.value) {
        return data;
    }

    // 否则只显示激活过滤器对应的消息
    return data.filter((message) => {
        return activeFilters[message.type];
    });
});

// 消息计数
const messageCounts = computed(() => {
    return {
        total: data.length,
        error: data.filter((message) => message.type === "error").length,
        warning: data.filter((message) => message.type === "warning").length,
        info: data.filter((message) => message.type === "info").length,
        log: data.filter((message) => message.type === "log").length,
    };
});

// 清空消息列表
function clearMessages() {
    data.length = 0;
}

// 初始化控制台监听器
function initConsoleListener() {
    // 获取当前标签页ID
    tabId = chrome.devtools.inspectedWindow.tabId;

    if (!tabId) {
        console.error("[DEBUG] 无法获取当前标签页ID");
        console.warn("[DEBUG] 无法获取标签页ID，控制台监听功能可能无法工作");
        return;
    }

    console.log("[DEBUG] 获取到当前标签页ID:", tabId);

    // 使用CDP方法初始化控制台监听
    initCDPConsoleListener(tabId);
}

// 使用Chrome DevTools Protocol初始化控制台监听
function initCDPConsoleListener(tabId) {
    console.log("[DEBUG] 使用CDP初始化控制台监听, tabId:", tabId);

    // 先尝试分离任何可能已存在的调试器
    try {
        chrome.debugger.detach({ tabId }, function () {
            console.log("[DEBUG] 已尝试分离可能存在的旧调试器会话");
            // 忽略任何错误，因为可能本来就没有附加的调试器
            attachDebugger(tabId);
        });
    } catch (e) {
        console.log("[DEBUG] 分离旧调试器会话时出错，继续尝试连接新会话:", e);
        attachDebugger(tabId);
    }

    // 注册面板关闭时的清理操作
    if (chrome.devtools && chrome.devtools.panels) {
        // 当面板被隐藏时，尝试分离调试器
        chrome.devtools.panels.onHidden &&
            chrome.devtools.panels.onHidden.addListener(function () {
                console.log("[DEBUG] 面板被隐藏，尝试分离调试器");
                try {
                    chrome.debugger.detach({ tabId });
                } catch (e) {
                    console.log("[DEBUG] 面板隐藏时分离调试器失败:", e);
                }
            });
    }
}

// 尝试附加调试器
function attachDebugger(tabId) {
    // 附加调试器
    chrome.debugger.attach({ tabId }, "1.3", function () {
        if (chrome.runtime.lastError) {
            console.error("[DEBUG] 调试器附加失败:", chrome.runtime.lastError);
            console.warn("[DEBUG] 调试器附加失败，控制台监听功能无法正常工作");
            return;
        }
        console.log("[DEBUG] 调试器附加成功");
        isDebuggerAttached = true;
        setupDebuggerCommands(tabId);
    });
}

// 设置调试器命令和监听器
function setupDebuggerCommands(tabId) {
    // 启用Console域和Runtime域（Runtime域用于捕获未捕获的异常）
    chrome.debugger.sendCommand({ tabId }, "Console.enable", {}, function () {
        if (chrome.runtime.lastError) {
            console.error("[DEBUG] Console.enable 失败:", chrome.runtime.lastError);
            console.warn("[DEBUG] 控制台域启用失败，控制台监听功能可能受限");
            return;
        }
        console.log("[DEBUG] CDP Console.enable 成功");
    });

    chrome.debugger.sendCommand({ tabId }, "Runtime.enable", {}, function () {
        if (chrome.runtime.lastError) {
            console.error("[DEBUG] Runtime.enable 失败:", chrome.runtime.lastError);
        } else {
            console.log("[DEBUG] CDP Runtime.enable 成功");
        }
    });

    // 设置异常处理
    chrome.debugger.sendCommand(
        { tabId },
        "Runtime.setAsyncCallStackDepth",
        { maxDepth: 10 },
        function () {
            if (chrome.runtime.lastError) {
                console.error(
                    "[DEBUG] Runtime.setAsyncCallStackDepth 失败:",
                    chrome.runtime.lastError
                );
            }
        }
    );

    // 先启用Debugger域
    chrome.debugger.sendCommand({ tabId }, "Debugger.enable", {}, function () {
        if (chrome.runtime.lastError) {
            console.warn("[DEBUG] Debugger.enable 失败:", chrome.runtime.lastError);
            return;
        }

        // 然后设置正确的异常处理策略
        chrome.debugger.sendCommand(
            { tabId },
            "Debugger.setPauseOnExceptions",  // 修正：使用Debugger域的方法
            { state: "none" },
            function () {
                if (chrome.runtime.lastError) {
                    console.warn("[DEBUG] Debugger.setPauseOnExceptions 失败:",
                        chrome.runtime.lastError.message);
                } else {
                    console.log("[DEBUG] 已设置不暂停异常执行");
                }
            }
        );
    });

    // 启用Log域以捕获log.entryAdded事件
    chrome.debugger.sendCommand({ tabId }, "Log.enable", {}, function () {
        if (chrome.runtime.lastError) {
            console.log("[DEBUG] 启用Log域失败，继续使用其他域");
        } else {
            console.log("[DEBUG] Log域已启用");
        }
    });

    // 设置消息事件监听器 - 处理所有CDP事件类型
    chrome.debugger.onEvent.addListener(function (debuggeeId, method, params) {
        // 确保只处理当前标签页的事件
        if (debuggeeId.tabId !== tabId) return;

        // 处理控制台消息
        if (method === "Console.messageAdded") {
            handleCDPConsoleMessage(params.message);
        }
        // 处理消息组
        else if (method === "Console.messageRepeatCountUpdated") {
            console.log("[DEBUG] 消息重复次数更新:", params);
        }
        // 处理运行时异常
        else if (method === "Runtime.exceptionThrown") {
            const exception = params.exceptionDetails;
            console.log("[DEBUG] 捕获到运行时异常:", exception);

            // 从异常中提取所有有用信息
            const text = exception.exception
                ? exception.exception.description ||
                exception.exception.value ||
                exception.text
                : exception.text;

            const messageData = {
                id: Date.now(),
                type: "error", // 运行时异常始终是错误类型
                message: text || "未知错误",
                url: exception.url || "unknown",
                line: exception.lineNumber?.toString() || "0",
                column: exception.columnNumber?.toString() || "0",
                functionName: exception.functionName || "",
                stack: exception.stackTrace
                    ? JSON.stringify(exception.stackTrace)
                    : null,
                timestamp: Date.now(),
                source: "exception", // 标记消息来源
            };

            // 使用公共方法处理消息，包括去重和过滤
            processConsoleMessage(messageData);
        }
        // 处理控制台API调用（很重要！这是捕获console.error等的关键）
        else if (method === "Runtime.consoleAPICalled") {
            // 打印原始的 consoleAPI 调用消息

            console.log("类型:", params.type);
            console.log("参数:", params.args);
            console.log("堆栈:", params.stackTrace);
            console.log("执行上下文:", params.executionContextId);
            console.log("时间戳:", params.timestamp);
            console.groupEnd();

            // 确定消息类型
            let type = "log";
            switch (params.type) {
                case "error":
                    type = "error";
                    break;
                case "warning":
                case "warn":
                    type = "warning";
                    break;
                case "info":
                    type = "info";
                    break;
                case "debug":
                case "log":
                default:
                    type = "log";
            }

            // 获取实际输出的消息内容
            let messageText = "";
            if (params.args && params.args.length > 0) {
                // 提取每个参数的值
                messageText = params.args
                    .map((arg) => {
                        try {
                            if (!arg || !arg.type) {
                                return "[unknown]";
                            } else if (arg.type === "string" && arg.value !== undefined) {
                                return arg.value;
                            } else if (arg.type === "number" || arg.type === "boolean") {
                                return String(arg.value);
                            } else if (arg.type === "undefined") {
                                return "undefined";
                            } else if (arg.type === "null") {
                                return "null";
                            } else if (arg.type === "object" && arg.preview) {
                                // 尝试获取对象的更好表示
                                if (arg.preview.properties) {
                                    const objPreview = {};
                                    arg.preview.properties.forEach((prop) => {
                                        objPreview[prop.name] = prop.value;
                                    });
                                    return JSON.stringify(objPreview, null, 2);
                                } else {
                                    return arg.preview.description || JSON.stringify(arg.preview);
                                }
                            } else if (arg.description) {
                                return arg.description;
                            } else {
                                return `[${arg.type}]`;
                            }
                        } catch (err) {
                            console.error("[DEBUG] 格式化参数时出错:", err);
                            return "[格式化错误]";
                        }
                    })
                    .join(" ");
            }

            // 获取调用栈信息
            let url = "unknown";
            let line = "0";
            let column = "0";
            let functionName = "";

            if (
                params.stackTrace &&
                params.stackTrace.callFrames &&
                params.stackTrace.callFrames.length > 0
            ) {
                const topFrame = params.stackTrace.callFrames[0];
                url = topFrame.url || "unknown";
                line = topFrame.lineNumber?.toString() || "0";
                column = topFrame.columnNumber?.toString() || "0";
                functionName = topFrame.functionName || "";
            }

            const messageData = {
                id: Date.now(),
                type: type,
                message: messageText,
                url: url,
                line: line,
                column: column,
                functionName: functionName,
                stack: params.stackTrace ? JSON.stringify(params.stackTrace) : null,
                timestamp: Date.now(),
                source: "consoleAPI", // 标记消息来源
            };

            // 使用公共方法处理消息，包括去重和过滤
            processConsoleMessage(messageData);
        }
        // 处理Log条目添加事件
        else if (method === "Log.entryAdded" && params && params.entry) {
            const entry = params.entry;

            const messageData = {
                id: Date.now(),
                type: entry.level || "log",
                message: entry.text || "[空日志条目]",
                url: entry.url || "unknown",
                line: entry.line?.toString() || "0",
                column: entry.column?.toString() || "0",
                functionName: "",
                stack: null,
                timestamp: Date.now(),
                source: "logEntry", // 标记消息来源
            };

            // 使用公共方法处理消息，包括去重和过滤
            processConsoleMessage(messageData);
        }
    });


}

// 处理CDP控制台消息的辅助函数
function handleCDPConsoleMessage(consoleMessage, isHistorical = false) {
    /*
        console.log(
            `[DEBUG] 处理${isHistorical ? "历史" : "新"}CDP控制台消息:`,
            consoleMessage
        );
    
        // 以表格形式打印原始CDP消息
        console.group("[原始CDP消息]");
        console.table({
            level: consoleMessage.level,
            text: consoleMessage.text,
            url: consoleMessage.url,
            line: consoleMessage.line,
            column: consoleMessage.column,
            source: consoleMessage.source,
            timestamp: new Date().toISOString(),
        });
        console.groupEnd();
    */
    // 将CDP消息类型映射到我们的消息类型
    let messageType = "log";
    switch (consoleMessage.level) {
        case "error":
        case "assert":
            messageType = "error";
            break;
        case "warning":
            messageType = "warning";
            break;
        case "info":
            messageType = "info";
            break;
        case "debug":
        case "log":
        default:
            messageType = "log";
    }

    // 从源位置或URL中获取文件信息
    let url = "unknown";
    let line = "0";
    let column = "0";

    if (consoleMessage.url) {
        url = consoleMessage.url;
        line = consoleMessage.line?.toString() || "0";
        column = consoleMessage.column?.toString() || "0";
    } else if (
        consoleMessage.stackTrace &&
        consoleMessage.stackTrace.callFrames &&
        consoleMessage.stackTrace.callFrames.length > 0
    ) {
        const frame = consoleMessage.stackTrace.callFrames[0];
        url = frame.url || "unknown";
        line = frame.lineNumber?.toString() || "0";
        column = frame.columnNumber?.toString() || "0";
    }

    // 提取函数名
    let functionName = "";
    if (
        consoleMessage.stackTrace &&
        consoleMessage.stackTrace.callFrames &&
        consoleMessage.stackTrace.callFrames.length > 0
    ) {
        functionName = consoleMessage.stackTrace.callFrames[0].functionName || "";
    }

    // 创建我们自己格式的消息数据
    const messageData = {
        id: Date.now() + (isHistorical ? Math.random() : 0),
        type: messageType,
        message: consoleMessage.text || "",
        url: url,
        line: line,
        column: column,
        functionName: functionName,
        stack: consoleMessage.stackTrace
            ? JSON.stringify(consoleMessage.stackTrace)
            : null,
        timestamp: isHistorical ? Date.now() - Math.random() * 1000 : Date.now(),
        source: "consoleMessage", // 标记消息来源
    };

    console.log("[DEBUG] Console.messageAdded 转换为消息:", messageData);

    // 使用公共方法处理消息，包括去重和过滤
    processConsoleMessage(messageData);
}

// 消息处理公共方法，包括去重和过滤
function processConsoleMessage(messageData) {
    console.log("[DEBUG] 开始处理控制台消息:", messageData);

    // 检查消息是否为空
    if (!messageData || !messageData.message) {
        console.warn("[DEBUG] 收到空消息或消息内容为空:", messageData);
        return;
    }

    // 过滤掉来自扩展本身的消息
    if (
        messageData.url &&
        (messageData.url.includes("chrome-extension://") ||
            messageData.url.includes("chrome-devtools://"))
    ) {
        console.log("[DEBUG] 过滤掉扩展自身的消息:", messageData);
        return;
    }

    // 根据消息类型和过滤设置判断
    switch (messageData.type) {
        case "error":
            if (!filterState.error) return;
            break;
        case "warning":
            if (!filterState.warning) return;
            break;
        case "info":
            if (!filterState.info) return;
            break;
        case "log":
            if (!filterState.log) return;
            break;
    }

    // 格式化消息对象
    const formattedMessage = {
        title: messageData.type.charAt(0).toUpperCase() + messageData.type.slice(1),
        desc: convertUrlsToLinks(messageData.message),
        type: messageData.type,
        url: messageData.url,
        line: messageData.line,
        column: messageData.column,
        functionName: messageData.functionName,
        stack: messageData.stack,
        timestamp: messageData.timestamp || Date.now(),
        id: messageData.id || Date.now() + Math.random(),
        source: messageData.source,
    };

    console.log("[DEBUG] 格式化后的消息:", formattedMessage);

    // 检查消息是否已存在（去重）
    const isDuplicate = data.some((item) => {
        if (item.id === formattedMessage.id) return true;

        // 内容、URL和行号相同，且时间接近的消息视为重复
        if (
            item.desc === formattedMessage.desc &&
            item.url === formattedMessage.url &&
            item.line === formattedMessage.line &&
            Math.abs(item.timestamp - formattedMessage.timestamp) < 200
        ) {
            // 200ms时间窗口
            return true;
        }

        return false;
    });

    if (isDuplicate) {
        console.log("[DEBUG] 消息重复，跳过处理:", formattedMessage);
        return;
    }

    // 添加到消息列表
    data.unshift(formattedMessage);
    /*
        console.log("[DEBUG] 消息已添加到data数组，当前data长度:", data.length);
        console.log("[DEBUG] 当前消息计数:", {
            total: data.length,
            error: data.filter((message) => message.type === "error").length,
            warning: data.filter((message) => message.type === "warning").length,
            info: data.filter((message) => message.type === "info").length,
            log: data.filter((message) => message.type === "log").length,
        });
    
        // 打印完整的原始消息
        console.group("[全部原始消息]");
        console.table(messageData);
        console.groupEnd();
    
        // 打印当前处理后的全部消息
        console.group("[全部处理后的消息]");
        console.table(
            data.map((msg) => ({
                type: msg.type,
                message:
                    msg.desc.replace(/<[^>]*>/g, "").substring(0, 50) +
                    (msg.desc.length > 50 ? "..." : ""),
                url: msg.url,
                line: msg.line,
                timestamp: new Date(msg.timestamp).toLocaleTimeString(),
            }))
        );
        console.groupEnd();
    */
    // 限制消息数量
    if (data.length > 100) {
        data.pop();
        console.log("[DEBUG] 超出消息限制，移除最旧的消息");
    }
}

// 将文本中的URL转换为HTML链接
function convertUrlsToLinks(text) {
    if (!text) return "";

    // 先对HTML特殊字符进行转义
    const escapedText = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    // 匹配URL并转换为链接
    return escapedText.replace(
        /(https?:\/\/[^\s<>"']+|localhost:[0-9]+[^\s<>"']*|file:\/\/\/[^\s<>"']+)/g,
        '<a href="$1" target="_blank" style="color:var(--color-primary);text-decoration:underline;">$1</a>'
    );
}

const toggleDirection = () => {
    direction.value =
        direction.value === "horizontal" ? "vertical" : "horizontal";
};

// 添加AI咨询相关的状态
const suggestions = ref([]);
const isAiResponding = ref(false);
const messageContent = ref(null);
let abortController = null;

// 处理AI咨询请求
async function handleAskAI(message) {
    // console.log("[DEBUG] 请求分析消息数据:", message);

    try {
        // 检查模型选择
        if (!selectedModel.value) {
            // 如果没有选择模型，尝试选择一个可用的模型
            if (aiHubMixModels.value.length > 0) {
                selectedModel.value = aiHubMixModels.value[0].id;
                console.log("[DEBUG] 自动选择第一个可用模型:", selectedModel.value);
            } else if (customModels.value.length > 0) {
                selectedModel.value = customModels.value[0].id;
                console.log("[DEBUG] 自动选择第一个自定义模型:", selectedModel.value);
            } else {
                displayError("没有可用的模型，请添加一个模型");
                showSettings();
                return;
            }
        }

        // 检查API设置
        const settings = await getSettings();
        const modelId = selectedModel.value;

        // 查找所选模型
        const model = allModels.value.find((m) => m.id === modelId);
        if (!model) {
            displayError(`未找到ID为 ${modelId} 的模型配置`);
            return;
        }

        // 检查API密钥和端点
        let hasValidApiConfig = false;

        console.log("[DEBUG] 模型ID:", modelId);
        // console.log("[DEBUG] 所选模型信息:", model);
        // console.log("[DEBUG] 当前设置:", settings);

        if (model.type === "aihubmix") {
            // AiHubMix模型需要检查是否有API密钥
            if (settings && settings.aihubmixApiKey) {
                hasValidApiConfig = true;
                console.log("[DEBUG] AiHubMix模型有有效API密钥");
            } else {
                console.log("[DEBUG] AiHubMix模型缺少API密钥");
            }
        } else if (model.type === "custom") {
            // 自定义模型
            if (model.endpoint) {
                // 一些自定义API可能不需要API密钥，所以只要有端点就认为配置有效
                hasValidApiConfig = true;
                console.log("[DEBUG] 自定义模型有有效端点:", model.endpoint);
            } else {
                console.log("[DEBUG] 自定义模型缺少有效端点");
            }
        } else {
            console.log("[DEBUG] 未知的模型类型:", model.type);
        }

        // console.log("[DEBUG] 配置有效性:", hasValidApiConfig);

        if (!hasValidApiConfig) {
            displayError("请先在设置中配置有效的API密钥或端点");
            // 自动打开设置对话框
            showSettings();
            return;
        }

        // 构建提示信息
        let prompt = `分析这个${message.type === "error"
            ? "错误"
            : message.type === "warning"
                ? "警告"
                : "消息"
            }：\n`;
        prompt += `消息: ${message.desc.replace(/<[^>]*>/g, "")}\n`;

        if (message.url && message.line) {
            prompt += `位置: ${message.url}:${message.line}${message.column ? ":" + message.column : ""
                }\n`;
        }

        if (message.functionName) {
            prompt += `函数: ${message.functionName}\n`;
        }

        if (message.stack) {
            try {
                const stack = JSON.parse(message.stack);
                prompt += `堆栈: ${JSON.stringify(stack, null, 2)}\n`;
            } catch (e) {
                prompt += `堆栈: ${message.stack}\n`;
            }
        }

        prompt += "\n请提供这个问题的原因分析和可能的解决方案。";

        // 重置会话历史，开始新的对话
        messages.value = [
            {
                role: "system",
                content: "你是一个专业的编程助手，擅长分析和解决JavaScript/前端错误。",
            },
        ];

        // 清空建议列表，开始新的对话
        suggestions.value = [];

        // 使用handleSend处理消息
        await handleSend(prompt);
    } catch (error) {
        console.error("[DEBUG] 处理AI请求失败:", error);
        displayError(`处理AI请求失败: ${error.message}`);
    }
}

// 废弃displayUserMessage函数
// 废弃requestStreamingChatResponse函数

// AiHubMix模型相关状态
const aiHubMixModels = ref([]);
const selectedModel = ref("");
const isLoadingModels = ref(false);

// 统一模型数据结构的计算属性
const allModels = computed(() => [
    ...aiHubMixModels.value.map((model) => ({
        ...model,
        type: model.type || "aihubmix",
        endpoint: "https://api.aihubmix.com/v1/chat/completions",
        provider: "aihubmix",
    })),
    ...customModels.value.map((model) => ({
        ...model,
        type: model.type || "custom",
        provider: "custom",
    })),
]);

// 判断是否有AiHubMix API密钥配置
const hasAiHubMixApiKey = computed(() => {
    // 从设置中获取最新状态
    return !!settings.value?.aihubmixApiKey;
});

// 存储设置对象的响应式引用
const settings = ref({});

// 获取设置
async function getSettings() {
    try {
        const settingsData = await modelApi.getSettings();
        settings.value = settingsData;
        return settingsData;
    } catch (error) {
        console.error("[DEBUG] 获取设置失败:", error);
        return {};
    }
}

// 获取AiHubMix模型列表
async function fetchAiHubMixModels() {
    try {
        isLoadingModels.value = true;
        console.log("开始获取AiHubMix模型列表...");

        // 检查本地缓存
        const cachedData = localStorage.getItem("aiHubMixModels");
        if (cachedData) {
            const parsedData = JSON.parse(cachedData);
            // 检查缓存是否过期（24小时）
            if (
                parsedData.timestamp &&
                Date.now() - parsedData.timestamp < 24 * 60 * 60 * 1000
            ) {
                console.log(
                    "使用本地缓存的模型数据，缓存时间:",
                    new Date(parsedData.timestamp).toLocaleString()
                );
                aiHubMixModels.value = parsedData.models;
                return parsedData.models;
            } else {
                console.log("本地缓存已过期，将重新获取");
            }
        } else {
            console.log("未找到本地缓存，将从API获取");
        }

        // 模拟一些数据用于测试
        const mockModels = [
            { id: "gpt-4o", type: "aihubmix", available: true },
            { id: "claude-3-opus", type: "aihubmix", available: true },
            { id: "claude-3-sonnet", type: "aihubmix", available: true },
            { id: "gemini-pro", type: "aihubmix", available: true },
            { id: "gpt-4-turbo", type: "aihubmix", available: true },
            { id: "gpt-3.5-turbo", type: "aihubmix", available: true },
        ];

        // 获取新数据 (尝试实际API调用，如果失败则使用模拟数据)
        try {
            console.log("正在从API获取模型数据...");
            const response = await fetch("https://aihubmix.com/v1/models");
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const models = data.data || [];
            console.log("从API成功获取到模型数据:", models);

            // 更新本地状态
            aiHubMixModels.value = models;

            // 保存到本地存储
            localStorage.setItem(
                "aiHubMixModels",
                JSON.stringify({
                    models: models,
                    timestamp: Date.now(),
                })
            );

            return models;
        } catch (apiError) {
            console.warn("API请求失败，使用模拟数据:", apiError);

            // 使用模拟数据
            aiHubMixModels.value = mockModels;

            // 保存模拟数据到本地存储
            localStorage.setItem(
                "aiHubMixModels",
                JSON.stringify({
                    models: mockModels,
                    timestamp: Date.now(),
                })
            );

            return mockModels;
        }
    } catch (error) {
        console.error("获取AiHubMix模型列表失败:", error);

        // 尝试使用模拟数据
        const mockModels = [
            { id: "gpt-4o", type: "aihubmix", available: true },
            { id: "claude-3-opus", type: "aihubmix", available: true },
            { id: "claude-3-sonnet", type: "aihubmix", available: true },
            { id: "gemini-pro", type: "aihubmix", available: true },
        ];

        aiHubMixModels.value = mockModels;
        return mockModels;
    } finally {
        isLoadingModels.value = false;
        // console.log("模型获取过程完成，当前模型列表:", aiHubMixModels.value);
    }
}

// 选择模型
function selectModel(modelId) {
    console.log("[DEBUG] 设置选中模型:", modelId);

    // 设置当前选中的模型ID
    selectedModel.value = modelId;

    // 保存选择到本地存储
    const modelData = {
        id: modelId,
        timestamp: Date.now(),
    };

    localStorage.setItem("lastSelectedModel", JSON.stringify(modelData));
    console.log("[DEBUG] 已保存选择的模型到localStorage:", modelData);

    // 确保同时更新设置中的model字段，以防下次打开设置时保持一致
    if (modelId) {
        settingsForm.model = modelId;
        // 更新API字段
        updateApiFieldsBasedOnModel();

        // 持久化保存设置
        saveSettings({
            encryptedApiKey: settingsForm.encryptedApiKey,
            apiEndpoint: settingsForm.apiEndpoint,
            model: modelId,
            customModels: customModels.value,
        })
            .then(() => {
                console.log("[DEBUG] 已持久化保存模型选择:", modelId);
            })
            .catch((error) => {
                console.error("[DEBUG] 保存模型选择到设置失败:", error);
            });
    }
}

// 处理模型选择变化
function handleModelChange(value) {
    console.log("模型选择已更改为:", value);
    if (value) {
        // 查找所选模型
        const model = allModels.value.find((m) => m.id === value);
        if (!model) {
            displayError(`未找到ID为 ${value} 的模型配置`);
            return;
        }

        // 检查模型配置
        if (!isModelConfigured(model)) {
            displayError(`模型 "${model.id}" 配置不完整，即将打开设置面板`);
            setTimeout(() => {
                showSettings(); // 延迟显示设置，让错误消息先显示
            }, 1000);
        }

        selectModel(value);
    }
}
function generateUUID() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
        (
            c ^
            (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
        ).toString(16)
    );
}

// 监听模型选择变化
watch(selectedModel, (newModel) => {
    if (newModel) {
        console.log("[DEBUG] 选择的模型已变更为:", newModel);
    }
});

// 加载所有模型信息
async function loadAllModels() {
    try {
        console.log("[DEBUG] 开始加载所有模型信息");

        // 获取设置，加载自定义模型
        const settingsData = await getSettings();
        console.log("[DEBUG] 获取到的设置:", settingsData);

        if (
            settingsData &&
            settingsData.customModels &&
            Array.isArray(settingsData.customModels)
        ) {
            console.log(
                "[DEBUG] 从settings中找到自定义模型, 数量:",
                settingsData.customModels.length
            );

            // 迁移旧版模型数据结构到新版（添加uuid字段，使用id代替name）
            const migratedModels = settingsData.customModels.map((model) => {
                if (!model.uuid || !model.type) {
                    // 为旧模型添加uuid和type字段
                    const migratedModel = {
                        id: model.name || model.id, // 旧版本可能用name作为显示名称
                        uuid: model.uuid || generateUUID(),
                        type: "custom", // 明确标记为自定义模型
                        endpoint: model.endpoint,
                        encryptedApiKey: model.encryptedApiKey,
                    };
                    console.log("[DEBUG] 迁移旧版模型:", model, " -> ", migratedModel);
                    return migratedModel;
                }
                return model;
            });

            // 确保所有模型都有必要的字段
            const validModels = migratedModels.filter(
                (model) => model && model.id && model.uuid && model.endpoint
            );
            if (validModels.length !== migratedModels.length) {
                console.warn(
                    "[DEBUG] 过滤掉了无效的模型, 过滤前:",
                    migratedModels.length,
                    "过滤后:",
                    validModels.length
                );
            }

            customModels.value = validModels;
            console.log(
                "[DEBUG] 已加载自定义模型列表, 长度:",
                customModels.value.length
            );

            // 打印每个自定义模型的详细信息
            customModels.value.forEach((model, index) => {
                console.log(`[DEBUG] 自定义模型[${index}]:`, {
                    id: model.id,
                    uuid: model.uuid,
                    endpoint: model.endpoint,
                    hasApiKey: !!model.encryptedApiKey,
                });
            });
        } else {
            console.log("[DEBUG] 没有找到自定义模型或为空");
            // 初始化为空数组而不是undefined
            customModels.value = [];
        }

        // 获取AiHubMix模型
        await fetchAiHubMixModels();
        // console.log("[DEBUG] 获取到的AiHubMix模型列表:", aiHubMixModels.value);

        // 确保有选择的模型
        if (!selectedModel.value) {
            // 首先尝试从localStorage恢复
            const lastSelectedModelJSON = localStorage.getItem("lastSelectedModel");
            if (lastSelectedModelJSON) {
                try {
                    const lastModel = JSON.parse(lastSelectedModelJSON);
                    if (lastModel && lastModel.id) {
                        // 检查模型是否在已知模型列表中
                        const inAiHubMix = aiHubMixModels.value.some(
                            (m) => m.id === lastModel.id
                        );
                        const inCustom = customModels.value.some(
                            (m) => m.id === lastModel.id
                        );

                        console.log("[DEBUG] 上次选择的模型:", {
                            id: lastModel.id,
                        });
                        console.log("[DEBUG] 模型在AiHubMix列表中:", inAiHubMix);
                        console.log("[DEBUG] 模型在自定义列表中:", inCustom);

                        if (inAiHubMix || inCustom) {
                            selectedModel.value = lastModel.id;
                            console.log("[DEBUG] 已恢复上次选择的模型:", lastModel.id);
                            return;
                        }
                    }
                } catch (e) {
                    console.error("[DEBUG] 解析上次模型选择失败:", e);
                }
            }

            // 如果没有上次选择或无效，默认选择一个可用模型
            if (customModels.value.length > 0) {
                // 优先选择自定义模型
                selectedModel.value = customModels.value[0].id;
                console.log("[DEBUG] 默认选择第一个自定义模型:", selectedModel.value);
            } else if (aiHubMixModels.value.length > 0) {
                selectedModel.value = aiHubMixModels.value[0].id;
                console.log("[DEBUG] 默认选择第一个AiHubMix模型:", selectedModel.value);
            }
        }

        console.log("[DEBUG] 最终选择的模型:", selectedModel.value);
        console.log(
            "[DEBUG] 最终的自定义模型列表:",
            customModels.value.map((m) => ({ id: m.id, uuid: m.uuid }))
        );
        console.log("[DEBUG] 最终的AiHubMix模型列表:", aiHubMixModels.value);
    } catch (error) {
        console.error("[DEBUG] 加载模型信息失败:", error);
        // 确保清空状态
        customModels.value = [];
    }
}

// 监听自定义模型变化
watch(
    customModels,
    (newModels) => {
        console.log("[DEBUG] 自定义模型列表变化:", newModels);
        // 如果没有选择模型但有可用的自定义模型，自动选择第一个
        if (!selectedModel.value && newModels.length > 0) {
            selectedModel.value = newModels[0].id;
            console.log("[DEBUG] 自动选择第一个自定义模型:", selectedModel.value);
        }
    },
    { deep: true }
);

onMounted(() => {
    console.log("[DEBUG] 组件挂载，准备初始化...");

    // 初始化控制台监听器
    initConsoleListener();

    // 立即清除所有本地存储，以防之前的数据格式有问题
    console.log("[DEBUG] 检查本地存储数据格式...");
    chrome.storage.local.get(null, (allData) => {
        console.log("[DEBUG] 当前本地存储数据:", allData);

        // 如果存在settings且customModels不是数组，尝试修复
        if (
            allData.settings &&
            allData.settings.customModels &&
            !Array.isArray(allData.settings.customModels)
        ) {
            console.log("[DEBUG] 发现customModels不是数组格式，尝试修复");

            try {
                // 将对象转换为数组
                if (typeof allData.settings.customModels === "object") {
                    const modelsArray = Object.values(allData.settings.customModels)
                        .filter(
                            (model) =>
                                model && typeof model === "object" && model.id && model.endpoint
                        )
                        .map((model) => ({
                            ...model,
                            type: model.type || "custom", // 确保有type字段
                            uuid: model.uuid || generateUUID(), // 确保有uuid字段
                        }));

                    console.log("[DEBUG] 转换后的模型数组:", modelsArray);
                    allData.settings.customModels = modelsArray;

                    // 保存修复后的数据
                    chrome.storage.local.set({ settings: allData.settings }, () => {
                        console.log("[DEBUG] 已修复存储中的customModels格式");
                        loadAllModels(); // 加载修复后的数据
                    });
                    return; // 避免下面的loadAllModels被执行
                }
            } catch (error) {
                console.error("[DEBUG] 修复存储数据失败:", error);
                // 如果修复失败，清除存储重新开始
                chrome.storage.local.clear(() => {
                    console.log("[DEBUG] 已清除所有本地存储");
                    loadAllModels();
                });
                return; // 避免下面的loadAllModels被执行
            }
        }

        // 正常加载模型信息
        loadAllModels();
    });
});

// 检查模型是否正确配置
function isModelConfigured(model) {
    return modelApi.isModelConfigured(model);
}

// 跳转到模型编辑页面
function goToModelEdit() {
    // 获取当前选中的模型
    const modelId = settingsForm.model;
    const model = customModels.value.find((m) => m.id === modelId);

    if (model) {
        // 关闭设置模态框
        settingsVisible.value = false;

        // 稍微延迟，确保设置模态框完全关闭
        setTimeout(() => {
            // 打开模型表单并编辑当前模型
            editModel(model);
        }, 300);
    } else {
        displayError(`找不到ID为 ${modelId} 的模型配置`);
    }
}


async function handleSend(userText) {
    console.log("[DEBUG] 发送消息开始");

    // 先清空上一次请求的中止函数
    if (abortFn) {
        console.log("[DEBUG] 清理上一次请求的abortFn");
        try {
            abortFn();
        } catch (e) {
            console.error("[DEBUG] 清理上一次请求的abortFn失败:", e);
        }
        abortFn = null;
    }

    mdBox.value.addUserMessage(userText);
    messages.value.push({ role: "user", content: userText });

    loading.value = true;
    isFirstTokenReceived.value = false;

    // 告知StreamMd组件重置首个令牌状态
    if (mdBox.value?.streamMarkdown) {
        mdBox.value.streamMarkdown.isFirstTokenReceived.value = false;
    }

    try {
        console.log("[DEBUG] 调用API发送消息");
        const result = await modelApi.sendChat(messages.value, selectedModel.value, {
            onMessage(content) {
                // 检测首次收到有意义的内容
                if (!isFirstTokenReceived.value && content.trim().length > 0) {
                    isFirstTokenReceived.value = true;
                    // 同步给StreamMd组件
                    if (mdBox.value?.streamMarkdown) {
                        mdBox.value.streamMarkdown.isFirstTokenReceived.value = true;
                    }
                }

                // 将接收到的内容交给StreamMd处理，确保是字符串
                if (content !== undefined && content !== null) {
                    mdBox.value.addMarkdownChunks([String(content)], 0);
                }
            },
            onDone() {
                console.log("[DEBUG] API请求完成");
                finishResponse();

                // 保存AI的回复到上下文
                try {
                    // 通过暴露的接口获取流缓冲区内容
                    const streamMarkdownInstance = mdBox.value.streamMarkdown;
                    if (streamMarkdownInstance && streamMarkdownInstance.streamBuffer) {
                        const content = streamMarkdownInstance.streamBuffer.value;
                        if (content && content.trim()) {
                            messages.value.push({ role: "assistant", content });
                            console.log("[Debug] 成功保存AI回复到上下文", content.length);
                        }
                    }
                } catch (err) {
                    console.error("[Error] 无法保存AI回复到上下文", err);
                }
            },
            onError(err) {
                console.warn("[DEBUG] API错误:", err);
                finishResponse();

                // 显示错误消息
                mdBox.value.showErrorMessage(err.message || "请求失败，请稍后重试");
            }
        });

        // 检查abort函数是否存在
        if (result && typeof result.abort === 'function') {
            console.log("[DEBUG] API请求已发送，成功获取abort函数");
            abortFn = result.abort;
        } else {
            console.warn("[DEBUG] API请求已发送，但未获取到有效的abort函数");
            // 创建一个空的abort函数，避免后续调用时出错
            abortFn = () => {
                console.log("[DEBUG] 调用空的abort函数");
                mdBox.value.endStream();
                loading.value = false;
                isFirstTokenReceived.value = false;
            };
        }
    } catch (error) {
        console.error("[DEBUG] 发送请求发生异常:", error);
        finishResponse();
        mdBox.value.showErrorMessage("发送请求失败: " + (error.message || "未知错误"));
    }
}

// 提取共用的结束响应逻辑 - 与demo完全一致
function finishResponse() {
    console.log("[DEBUG] 执行finishResponse");
    mdBox.value.endStream();
    loading.value = false;
    isFirstTokenReceived.value = false;
    abortFn = null;
}

// 监控首个令牌状态变化
watch(isFirstTokenReceived, (newValue) => {
    // 仅当状态变更为true时同步到StreamMd组件
    if (newValue && mdBox.value?.streamMarkdown) {
        mdBox.value.streamMarkdown.isFirstTokenReceived.value = true;
    }
});

// 优化中止处理 - 与demo完全一致
function handleAbort() {
    console.log("[DEBUG] 中止请求开始");

    // 先检查abortFn是否存在
    if (!abortFn) {
        console.log("[DEBUG] 警告: abortFn不存在，无法中止请求");
        // 即便如此，也要更新UI状态
        loading.value = false;
        isFirstTokenReceived.value = false;
        return;
    }

    try {
        // 调用中止函数
        console.log("[DEBUG] 调用abortFn");
        abortFn();
        console.log("[DEBUG] abortFn调用成功");
    } catch (error) {
        console.error("[DEBUG] 调用abortFn出错:", error);
    }

    // 无论如何，立即更新UI状态
    console.log("[DEBUG] 更新UI状态");
    mdBox.value?.endStream();
    loading.value = false;
    isFirstTokenReceived.value = false;
    abortFn = null;
}



</script>


<style scoped>
.tools {
    height: 100vh;
}

.arco-layout {
    height: 100%;
}

.tools :deep(.arco-layout-sider) {
    overflow: hidden;
    min-width: 300px;
    max-width: 50%;
}

.tools :deep(.arco-layout-content) {
    overflow: hidden;
    background-color: #fff;
}

:deep(.active) {
    border: 1px solid var(--color-border-2);
    background-color: rgba(var(--primary-6), 0.1);
}

/* 操作按钮样式 */
.opt-btn :deep(svg) {
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: background-color 0.2s ease;
}

.opt-btn :deep(svg:hover) {
    background-color: var(--color-fill-3);
}

/* 消息计数样式 */
:deep(.arco-tag .arco-badge) {
    margin-left: 4px;
}

/* 筛选标签样式 */
:deep(.arco-tag) {
    cursor: pointer;
    transition: all 0.2s ease;
}

/* 标签悬停样式 - 使用原有颜色添加透明度 */
:deep(.arco-tag:hover) {
    opacity: 0.85;
}

/* 徽章样式 */
:deep(.arco-badge-number) {
    font-size: 10px;
    height: 12px;
    min-width: 12px;
    padding: 0 2px;
    border-radius: 8px;
    line-height: 12px;
    font-weight: normal;
    border: none;
    box-shadow: none;
    color: #fff;
}


.suggestions-container {
    height: 100%;
    overflow-y: auto;
}

.suggestion-item {
    margin-bottom: 16px;
    padding: 12px;
    background-color: var(--color-fill-2);
    border-radius: 4px;
}

.suggestion-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.message-content {
    white-space: pre-wrap;
}

.ai-response {
    margin-top: 16px;
}

:deep(.cursor-blink) {
    display: inline-block !important;
    width: 6px !important;
    height: 15px !important;
    background-color: #06f !important;
    margin-left: 2px !important;
    animation: blink 1s step-start infinite !important;
    vertical-align: text-bottom !important;
}

@keyframes blink {
    50% {
        opacity: 0;
    }
}

.ask-ai {
    color: #fff;
    background: radial-gradient(495.98% 195.09% at 144.79% 10.71%, #ff8a01 0, #b051b9 22.37%, #672bff 45.54%, #06f 99.99%);
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 4px;
}

/* 设置对话框样式 */
.settings-footer {
    display: flex;
    justify-content: flex-end;
    margin-top: 24px;
}

.custom-models-list {
    margin-bottom: 20px;
}

.model-info {
    display: flex;
    flex-direction: column;
}

.model-name {
    font-weight: 500;
    margin-bottom: 4px;
}

.model-endpoint {
    font-size: 12px;
    color: var(--color-text-3);
}

.models-list-footer {
    display: flex;
    justify-content: center;
    margin-top: 16px;
}

.model-form-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 24px;
}

:deep(.arco-modal-header) {
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 16px;
}

:deep(.arco-tabs-header) {
    margin-bottom: 16px;
}

:deep(.arco-tabs-content) {
    padding: 0 16px;
}

:deep(.arco-modal-body) {
    padding: 16px 20px;
}

/* 模型选择器样式 */
.tools-bar {
    display: flex;
    align-items: center;
    position: relative;
}

/* 日志类型标题颜色样式 - 对应opt-bar中的标签颜色 */
.log-title {
    font-weight: 600;
    transition: color 0.2s ease;
}

.log-title-error {
    color: rgb(var(--red-6));
    /* 对应 color="red" */
}

.log-title-warning {
    color: rgb(var(--orangered-6));
    /* 对应 color="orangered" */
}

.log-title-info {
    color: rgb(var(--arcoblue-6));
    /* 对应 color="arcoblue" */
}

.log-title-log {
    color: rgb(var(--green-6));
    /* 对应 color="green" */
}

/* 悬停效果增强 */
:deep(.arco-list-item:hover) .log-title-error {
    color: rgb(var(--red-7));
}

:deep(.arco-list-item:hover) .log-title-warning {
    color: rgb(var(--orangered-7));
}

:deep(.arco-list-item:hover) .log-title-info {
    color: rgb(var(--arcoblue-7));
}

:deep(.arco-list-item:hover) .log-title-log {
    color: rgb(var(--green-7));
}

:deep(.arco-select-view-single) {
    border-radius: 4px;
    border-color: var(--color-border-2);
    background-color: var(--color-fill-1);
}

:deep(.arco-select-view-single:hover) {
    border-color: var(--color-border-3);
    background-color: var(--color-fill-2);
}

:deep(.arco-select-view-single.arco-select-view-focused) {
    border-color: rgb(var(--primary-6));
    background-color: var(--color-bg-1);
    box-shadow: 0 0 0 2px rgba(var(--primary-6), 0.2);
}

:deep(.arco-select-popup) {
    max-height: 300px;
    border-radius: 4px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

:deep(.arco-select-option) {
    padding: 6px 12px;
    transition: background-color 0.2s ease;
}

:deep(.arco-select-option:hover) {
    background-color: var(--color-fill-2);
}

:deep(.arco-select-option-active) {
    background-color: rgba(var(--primary-6), 0.1);
    color: rgb(var(--primary-6));
}

:deep(.arco-select-option-disabled) {
    opacity: 0.6;
    cursor: not-allowed;
}

:deep(.arco-select-group-title) {
    font-weight: 500;
    color: var(--color-text-2);
    padding: 5px 12px;
    font-size: 12px;
    background-color: var(--color-fill-1);
    border-top: 1px solid var(--color-border-1);
    border-bottom: 1px solid var(--color-border-1);
    margin-top: 4px;
}
</style>
