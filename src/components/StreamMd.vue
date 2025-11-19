<template>
    <div class="stream-md-container" ref="mdContainerRef" @scroll="onUserScroll" @wheel="onUserWheel">
        <div class="message-wrapper">
            <!-- 历史消息 -->
            <a-card v-for="(msg, index) in messages" :key="index" :class="['message-card', msg.role]" :bordered="false"
                :hoverable="true">
                <template #title>
                    <a-space>
                        <a-avatar :class="`role-${msg.role}`" :size="24">
                            <icon-user v-if="msg.role === 'user'" />
                            <icon-robot v-else />
                        </a-avatar>
                        <a-typography-text :heading="6">
                            {{ msg.role === 'user' ? '用户' : 'AI助手' }}
                        </a-typography-text>
                    </a-space>
                </template>
                <template #extra>
                    <a-tooltip content="复制内容">
                        <a-button type="text" size="mini" @click="copyMessage(msg)"
                            :status="copiedMap[index] ? 'success' : 'normal'">
                            <template #icon>
                                <icon-copy v-if="!copiedMap[index]" />
                                <icon-check v-else />
                            </template>
                            {{ copiedMap[index] ? '已复制' : '复制' }}
                        </a-button>
                    </a-tooltip>
                </template>

                <div class="message-content" v-html="msg.rendered || msg.content" />
            </a-card>

            <!-- 当前正在流式显示的消息 -->
            <a-card v-if="loading" class="message-card assistant streaming" :bordered="false">
                <template #title>
                    <a-space>
                        <a-avatar class="role-assistant" :size="24">
                            <icon-robot />
                        </a-avatar>
                        <a-typography-text :heading="6">AI助手</a-typography-text>
                    </a-space>
                </template>
                <template #extra>
                    <div class="loading-indicator">
                        <a-badge status="processing" :text="loadingText" />
                    </div>
                </template>
                <div class="message-content streaming-content" ref="streamRef"
                    :class="{ 'first-token-received': streamMarkdown.isFirstTokenReceived.value }"
                    v-html="streamContent">
                </div>
                <div v-if="loading && !streamMarkdown.isFirstTokenReceived.value" class="thinking-indicator">
                    <a-spin />
                    <span>正在思考...</span>
                </div>
            </a-card>

            <a-alert v-if="errorMessage" type="error" class="error-message" closable @close="errorMessage = ''">
                {{ errorMessage }}
            </a-alert>
        </div>

        <!-- 滚动到底部按钮 - 当不在底部时显示 -->
        <a-button v-if="!isAtBottom" class="scroll-to-bottom-btn" shape="circle" type="primary" @click="scrollToBottom">
            <template #icon><icon-down /></template>
        </a-button>
    </div>
</template>

<script setup>
import { ref, nextTick, reactive, onMounted, watch, computed } from 'vue'
import { useClipboard } from '@vueuse/core'
import { useStreamMarkdown } from '@/composables/useStreamMarkdown'

const messages = ref([])
const loading = ref(false)
const mdContainerRef = ref(null)
const streamRef = ref(null)
const copiedMap = reactive({})
const errorMessage = ref('')

const streamMarkdown = useStreamMarkdown()
const streamContent = computed(() => streamMarkdown.renderedContent.value || '')

const isAtBottom = ref(true)
let rafScrollTimeout = null;

const loadingText = computed(() => {
    if (!streamMarkdown.isFirstTokenReceived.value) return "正在思考..."
    return "正在回答..."
})

const { copy } = useClipboard()

// 通用复制处理函数
function handleCopyWithFeedback(text, onSuccess, onReset) {
    copy(text).then(() => {
        onSuccess()
        setTimeout(() => {
            onReset()
        }, 1500)
    })
}

function updateScrollState() {
    if (!mdContainerRef.value) return
    const container = mdContainerRef.value
    const scrollThreshold = 5
    isAtBottom.value = container.scrollHeight - container.scrollTop - container.clientHeight < scrollThreshold
}

function onUserScroll() {
    console.log('onUserScroll')
    updateScrollState()
}
function onUserWheel() {
    console.log('onUserWheel')
    updateScrollState()
}

function copyMessage(msg) {
    const textToCopy = msg.rendered ? stripHtml(msg.rendered) : msg.content
    const index = messages.value.findIndex(m => m === msg)

    handleCopyWithFeedback(
        textToCopy,
        () => { copiedMap[index] = true },
        () => { copiedMap[index] = false }
    )
}

function stripHtml(html) {
    const temp = document.createElement('div')
    temp.innerHTML = html
    return temp.textContent || temp.innerText || ''
}

function scrollToBottom() {
    if (rafScrollTimeout) cancelAnimationFrame(rafScrollTimeout);

    rafScrollTimeout = requestAnimationFrame(() => {
        if (mdContainerRef.value) {
            mdContainerRef.value.scrollTo({ top: mdContainerRef.value.scrollHeight, behavior: 'auto' })
            isAtBottom.value = true
        }
        rafScrollTimeout = null;
    });
}

onMounted(() => {

})

watch(messages, () => {
    nextTick(() => {
        if (isAtBottom.value) scrollToBottom()
        setupCodeBlockCopy()
    })
}, { deep: true })

watch(() => streamMarkdown.renderedContent.value, () => {
    nextTick(() => {
        if (isAtBottom.value) scrollToBottom()
        setupCodeBlockCopy()
    })
})

function addUserMessage(text) {
    messages.value.push({ role: 'user', content: text, rendered: null })
    scrollToBottom()
}

async function addMarkdownChunks(chunks, delay = 0) {
    if (!loading.value) {
        loading.value = true
        streamMarkdown.resetStream()
        errorMessage.value = ''
    }
    if (isAtBottom.value) scrollToBottom();
    await nextTick()

    try {
        await streamMarkdown.processStreamChunks(chunks, delay)
        nextTick(() => {
            if (isAtBottom.value) scrollToBottom()
            setupCodeBlockCopy()
        })
    } catch (err) {
        console.error('[StreamMd] 处理流数据错误:', err)
        showErrorMessage('处理流数据时发生错误。')
    }
}

function endStream() {
    if (loading.value) {
        try {
            const final = streamMarkdown.completeStream()
            messages.value.push({ role: 'assistant', content: final.content, rendered: final.rendered })
        } catch (err) {
            console.error('[Error] Final render error:', err)
            showErrorMessage('渲染最终消息时发生错误。')
        } finally {
            loading.value = false
            streamMarkdown.resetStream()
            if (isAtBottom.value) nextTick(scrollToBottom)
        }
    }
}

function showErrorMessage(message) {
    errorMessage.value = message
    if (isAtBottom.value) nextTick(scrollToBottom)
}

function setupCodeBlockCopy() {
    nextTick(() => {
        const codeBlocks = document.querySelectorAll('.message-content pre')
        codeBlocks.forEach((block) => {
            if (block.querySelector('.code-copy-btn')) return
            const copyBtn = document.createElement('button')
            copyBtn.className = 'code-copy-btn'
            copyBtn.innerHTML = '<i class="code-copy-icon"></i>'
            copyBtn.title = '复制代码'
            Object.assign(copyBtn.style, {
                position: 'absolute', top: '8px', right: '8px',
                background: 'var(--color-fill-3)', border: 'none',
                borderRadius: '4px', padding: '4px 8px', cursor: 'pointer',
                opacity: '0', transition: 'opacity 0.2s'
            })
            copyBtn.addEventListener('click', () => {
                const codeElement = block.querySelector('code')
                if (codeElement) {
                    handleCopyWithFeedback(
                        codeElement.textContent || '',
                        () => {
                            copyBtn.innerHTML = '<i class="code-check-icon"></i>'
                            copyBtn.title = '已复制!'
                        },
                        () => {
                            copyBtn.innerHTML = '<i class="code-copy-icon"></i>'
                            copyBtn.title = '复制代码'
                        }
                    )
                }
            })
            block.style.position = 'relative'
            block.addEventListener('mouseenter', () => copyBtn.style.opacity = '1')
            block.addEventListener('mouseleave', () => copyBtn.style.opacity = '0')
            block.appendChild(copyBtn)
        })
    })
}

defineExpose({
    addUserMessage,
    addMarkdownChunks,
    endStream,
    showErrorMessage,
    streamMarkdown
})
</script>

<style>
/* 新增复制按钮图标样式 */
.code-copy-icon {
    display: inline-block;
    width: 16px;
    height: 16px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23333' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='9' y='9' width='13' height='13' rx='2' ry='2'%3E%3C/rect%3E%3Cpath d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'%3E%3C/path%3E%3C/svg%3E");
}

.code-check-icon {
    display: inline-block;
    width: 16px;
    height: 16px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2300b42a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E");
}
</style>

<style scoped>
.stream-md-container {
    height: 100%;
    overflow-y: auto;
    background-color: var(--color-fill-2);
    display: flex;
    flex-direction: column;
    scrollbar-width: thin;
    scrollbar-color: var(--color-text-3) transparent;
    position: relative;
}

.stream-md-container::-webkit-scrollbar {
    width: 6px;
}

.stream-md-container::-webkit-scrollbar-track {
    background: transparent;
}

.stream-md-container::-webkit-scrollbar-thumb {
    background-color: var(--color-text-3);
    border-radius: 6px;
}

.message-wrapper {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-height: min-content;
    box-sizing: border-box;
}

.message-card {
    width: 100%;
    transition: all 0.2s;
}

.message-card.user {
    background-color: var(--color-fill-1);
}

.message-card.assistant {
    background-color: var(--color-bg-2);
}

/* .message-card.streaming {
    border-left: 3px solid var(--color-primary-light-4);
} */

.role-user {
    background-color: var(--color-primary-light-4);
}

.role-assistant {
    background-color: var(--color-success-light-4);
}

:deep(.arco-card-size-medium .arco-card-body) {
    padding: 0;
}

.message-content {
    padding: 8px;
    line-height: 1.6;
    word-wrap: break-word;
}

.message-content :deep(pre) {
    background-color: var(--color-neutral-2);
    padding: 12px;
    border-radius: 4px;
    overflow-x: auto;
    margin: 1em 0;
    position: relative;
    transition: all 0.2s;
}

.message-content :deep(pre:hover) {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.message-content :deep(.hljs) {
    background-color: transparent !important;
    padding: 0;
    border-radius: 0;
}

.message-content :deep(code) {
    font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
    background-color: var(--color-neutral-2);
    padding: 2px 4px;
    border-radius: 4px;

}

.message-content :deep(p) {
    margin: 8px 0;
}

.message-content :deep(ul, ol) {
    padding-left: 24px;

}

.message-content :deep(a) {
    color: var(--color-primary);
    text-decoration: none;
}

.message-content :deep(a:hover) {
    text-decoration: underline;
}

.message-content :deep(blockquote) {
    border-left: 4px solid var(--color-neutral-4);
    margin: 1em 0;
    padding: 0.5em 1em;
    background-color: var(--color-neutral-1);
}

.message-content :deep(table) {
    border-collapse: collapse;
    margin: 1em 0;
    width: 100%;
}

.message-content :deep(th, td) {
    border: 1px solid var(--color-neutral-4);
    padding: 0.5em;
}

.message-content :deep(th) {
    background-color: var(--color-neutral-2);
}

.message-content :deep(img) {
    max-width: 100%;

}

.streaming-content {
    min-height: 24px;
}

.thinking-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
    padding: 12px;
    border-radius: 4px;
    background-color: var(--color-fill-1);
    justify-content: center;
}

.first-token-received {
    animation: fadeIn 0.3s ease-in;
}

.error-message {
    margin-top: 8px;
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

/* 滚动到底部按钮样式 */
.scroll-to-bottom-btn {
    position: fixed;
    bottom: 140px;
    right: 24px;
    z-index: 100;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    opacity: 0.9;
    transition: opacity 0.3s, transform 0.3s;
}

.scroll-to-bottom-btn:hover {
    opacity: 1;
    transform: translateY(-3px);
}
</style>
