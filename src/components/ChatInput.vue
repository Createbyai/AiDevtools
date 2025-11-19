<template>
  <div class="chat-input-wrap">
    <textarea v-model="text" :disabled="loading"
      :placeholder="loading ? (isFirstTokenReceived ? '回答中...' : '思考中...') : '请输入问题...'" rows="1"
      @keydown.enter.prevent="handleEnterKey"></textarea>
    <button title="发送消息" @click="handleAction" :class="{ 'loading': loading }" :disabled="!canInteract">
      <icon-send v-if="!loading" />
      <icon-record-stop v-else />
    </button>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted, computed } from 'vue'

const emit = defineEmits(['send', 'abort'])
const props = defineProps({
  loading: Boolean,
  canAbort: Boolean,
  isFirstTokenReceived: Boolean
})

const text = ref('')

// 计算按钮是否可交互
const canInteract = computed(() => {
  // 如果正在加载中，则按钮始终可交互（用于中止操作）
  if (props.loading) {
    return true
  } else {
    // 非加载状态时，只有在文本框有内容时才可交互
    return text.value.trim() !== ''
  }
})

function handleEnterKey(e) {
  // 只有按下Enter且没有按Shift时才发送
  if (!e.shiftKey && !props.loading) {
    send()
  }
}

function handleAction() {
  if (props.loading) {
    // 在加载状态下，点击按钮始终触发中止事件
    emit('abort')
  } else if (text.value.trim()) {
    // 非加载状态，且输入框有内容时发送消息
    send()
  }
}

function send() {
  if (!text.value.trim() || props.loading) return

  emit('send', text.value)
  text.value = ''

  // 焦点回到输入框
  nextTick(() => {
    document.querySelector('textarea')?.focus()
  })
}

// 添加快捷键支持
function handleKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    send()
  }
}

// 添加全局快捷键监听
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

// 组件卸载时移除事件监听
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.chat-input-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  gap: 8px;
  margin-top: 8px;
  border-top: 1px solid var(--color-border);
  background-color: var(--color-bg-2);
}

textarea {
  flex: 1;
  resize: none;
  padding: 8px;
  font-family: inherit;
  border: 1px solid var(--color-border-2);
  border-radius: 4px;
  background-color: var(--color-background);
  color: var(--color-text-primary);
  height: 50px;
  /* 输入框高度，保留一些内边距的空间 */
  overflow-y: auto;
  /* 允许垂直滚动 */
  box-sizing: border-box;
  /* 确保内边距不增加总高度 */
  line-height: 1.5;
  /* 添加行高 */
  margin: 0;
  /* 移除默认外边距 */
}

textarea:focus {
  outline: none;
  border-color: rgb(var(--primary-5));
  border-style: solid;
  border-width: 1px;
  background-color: var(--color-bg-2);
  box-sizing: border-box;
}

button {
  height: 50px;
  /* 与输入框高度一致 */
  width: 50px;
  /* 固定宽度 */
  padding: 0;
  /* 移除内边距 */
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ff8a01 0%, #b051b9 50%, #672bff 100%);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  flex-shrink: 0;
  /* 防止按钮被压缩 */
}

button i {
  font-size: 16px;
  /* 调整图标大小 */
}

/* 移除未使用的样式类 */
button:hover {
  opacity: 0.9;
}

button:disabled {
  background-color: rgb(var(--arcoblue-1));
  color: var(--color-neutral-4);
  cursor: not-allowed;
  opacity: 0.7;
}

/* 添加加载状态下的按钮样式 */
button.loading:not(:disabled) {
  background: linear-gradient(135deg, #ff8a01 0%, #b051b9 50%, #672bff 100%);
  opacity: 1;
  cursor: pointer;
}
</style>
