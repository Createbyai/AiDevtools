import { ref, nextTick } from 'vue'
import markdownit from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/default.css'

// 创建防抖函数助手 - 避免频繁渲染引起的性能问题
function debounce(fn, delay = 50) {
    let timer = null
    return function (...args) {
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
            fn.apply(this, args)
            timer = null
        }, delay)
    }
}

/**
 * 合并后的Stream复合函数 - 包含SSE流处理和Markdown渲染功能
 */
export function useStreamMarkdown() {
    // Markdown渲染相关状态
    const streamBuffer = ref('')
    const renderedContent = ref('') // 存储渲染后的HTML字符串
    const isComplete = ref(false)
    const isFirstTokenReceived = ref(false)

    // SSE控制相关变量
    let controller = null
    let aborted = false // 添加一个标记来跟踪是否已中止

    // 初始化 markdown-it
    const md = markdownit({
        html: true,         // 启用HTML标签
        xhtmlOut: true,     // 使用'/'关闭单标签
        breaks: true,       // 转换段落里的'\n'到<br>
        linkify: true,      // 将URL转换为链接
        typographer: true,  // 启用一些语言中立的替换 + 引号美化
        highlight: function (str, lang) {
            if (lang && hljs.getLanguage(lang)) {
                try {
                    return hljs.highlight(str, { language: lang }).value;
                } catch (__) { }
            }
            return '';
        }
    })

    // 检查Markdown完整性的辅助函数
    function checkMarkdownCompleteness(markdown) {
        // 检查未闭合的代码块
        const codeBlockOpenCount = (markdown.match(/```\w*/g) || []).length
        const codeBlockCloseCount = (markdown.match(/```\s*$/gm) || []).length
        return codeBlockOpenCount === codeBlockCloseCount
    }

    // 安全渲染不完整的Markdown
    function safelyRenderIncompleteMarkdown(markdown) {
        if (!markdown || typeof markdown !== 'string') {
            return ''
        }

        // 处理可能不完整的代码块
        let safeMarkdown = markdown

        // 检测未闭合的代码块并临时闭合它们用于渲染
        const codeBlockMatches = safeMarkdown.match(/```\w*[\s\S]*?(?:```|$)/g) || []
        for (const block of codeBlockMatches) {
            if (!block.endsWith('```')) {
                const fixedBlock = block + '\n```'
                // 只在渲染时临时修复，不修改原始缓冲区
                safeMarkdown = safeMarkdown.replace(block, fixedBlock)
            }
        }

        try {
            const renderedHtml = md.render(safeMarkdown)
                .replace(/<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/g,
                    '<pre class="language-$1"><code>$2</code></pre>')
            return renderedHtml
        } catch (e) {
            console.error('[MarkdownRender Error]', e)
            // 最后的后备方案 - 简单转义显示
            return `<div>${escapeHtml(markdown)}</div>`
        }
    }

    // HTML字符转义
    function escapeHtml(text) {
        if (!text || typeof text !== 'string') {
            return ''
        }
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
    }

    // 创建防抖处理的渲染更新函数
    const debouncedRender = debounce(async (markdown) => {
        try {
            // 检查完整性
            const isCompleteMarkdown = checkMarkdownCompleteness(markdown)

            // 智能渲染
            let htmlResult = ''
            if (isCompleteMarkdown) {
                htmlResult = md.render(markdown)
                    .replace(/<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/g,
                        '<pre class="language-$1"><code>$2</code></pre>')
            } else {
                htmlResult = safelyRenderIncompleteMarkdown(markdown)
            }

            // 确保渲染内容是字符串
            renderedContent.value = htmlResult || ''

            await nextTick()
        } catch (err) {
            console.error('防抖渲染错误:', err)
            renderedContent.value = safelyRenderIncompleteMarkdown(markdown) || escapeHtml(markdown) || ''
        }
    }, 30) // 30ms防抖时间，平衡响应性和性能

    // 累积处理流数据 - 改进
    async function processStreamChunk(chunk) {
        // 安全检查
        if (typeof chunk !== 'string') {
            console.warn('接收到非字符串类型的chunk:', typeof chunk, chunk)
            chunk = String(chunk || '')
        }

        // 检测首次收到内容
        if (!isFirstTokenReceived.value && chunk.trim().length > 0) {
            isFirstTokenReceived.value = true
        }

        // 累加到缓冲区
        streamBuffer.value += chunk

        // 使用防抖函数处理渲染
        debouncedRender(streamBuffer.value)

        return renderedContent.value
    }

    // 调试输出缓冲区内容
    function debugStreamBuffer() {
        console.log('[Debug] StreamBuffer:', {
            content: streamBuffer.value,
            length: streamBuffer.value.length,
            firstChars: streamBuffer.value.substring(0, 50)
        })
    }

    // 批量处理多个流数据片段
    async function processStreamChunks(chunks, delay = 0) {
        // console.log('[Debug] 处理流式数据片段:', chunks.length)
        if (!Array.isArray(chunks) || chunks.length === 0) {
            // console.warn('[StreamMarkdown] 收到空的chunks数组')
            return renderedContent.value
        }

        for (let chunk of chunks) {
            await processStreamChunk(chunk)
            if (delay > 0) {
                await new Promise(resolve => setTimeout(resolve, delay))
            }
        }

        // debugStreamBuffer()
        return renderedContent.value
    }

    // 完成处理
    function completeStream() {
        isComplete.value = true

        // 最终渲染优化
        try {
            // 确保有内容可渲染
            if (!streamBuffer.value) {
                console.warn('[StreamMarkdown] 结束时缓冲区为空')
                return {
                    content: '',
                    rendered: ''
                }
            }

            const finalRendered = md.render(streamBuffer.value)
                .replace(/<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/g,
                    '<pre class="language-$1"><code>$2</code></pre>')

            return {
                content: streamBuffer.value,
                rendered: finalRendered || ''
            }
        } catch (err) {
            console.error('最终Markdown渲染错误:', err)
            return {
                content: streamBuffer.value,
                rendered: safelyRenderIncompleteMarkdown(streamBuffer.value) || escapeHtml(streamBuffer.value) || ''
            }
        }
    }

    // 重置
    function resetStream() {
        streamBuffer.value = ''
        renderedContent.value = ''
        isComplete.value = false
        isFirstTokenReceived.value = false
    }

    // ============== SSE流处理功能 ==============
    /**
     * 启动SSE流请求
     * @param {Object} options - 请求选项 
     * @param {string} options.url - API端点URL
     * @param {Object} options.headers - HTTP请求头
     * @param {Object} options.body - 请求体
     */
    const startStream = async ({ url, headers, body, onMessage, onDone, onError }) => {
        if (controller) {
            console.log('[SSE] 清理上一个controller')
            try {
                controller.abort()
            } catch (e) {
                console.error('[SSE] 清理上一个controller失败:', e)
            }
        }

        controller = new AbortController()
        aborted = false
        // 清空之前的缓冲区
        resetStream()
        // 收集所有消息内容
        const allMessages = []

        try {
            console.log('[SSE] 开始请求:', url)

            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
                signal: controller.signal
            })

            if (!response.ok) {
                const errorText = await response.text()
                console.error(`[SSE] HTTP错误: ${response.status}`, errorText)
                onError?.(new Error(`HTTP错误: ${response.status} - ${errorText}`))
                return
            }

            console.log('[SSE] 连接成功，开始处理数据流')
            const reader = response.body.getReader()
            const decoder = new TextDecoder('utf-8')
            let buffer = ''
            let messageCount = 0

            while (!aborted) { // 检查中止标记
                try {
                    const { value, done } = await reader.read()
                    if (done) {
                        console.log('[SSE] 流读取完成')
                        break
                    }

                    // 如果已中止，则不再处理数据
                    if (aborted) {
                        console.log('[SSE] 检测到中止标记，停止处理数据')
                        break
                    }

                    buffer += decoder.decode(value, { stream: true })
                    const lines = buffer.split('\n')
                    buffer = lines.pop()

                    for (const line of lines) {
                        // 再次检查是否已中止
                        if (aborted) {
                            console.log('[SSE] 处理行数据时检测到中止')
                            break
                        }

                        if (!line.trim()) continue
                        if (!line.startsWith('data: ')) {
                            console.log('[SSE] 忽略非data行:', line)
                            continue
                        }

                        const payload = line.slice(6).trim()
                        if (payload === '[DONE]') {
                            console.log('[SSE] 接收到完成标记 [DONE]')
                            completeStream()
                            onDone?.()
                            return
                        }

                        try {
                            const json = JSON.parse(payload)
                            messageCount++

                            // 收集消息内容
                            const delta = json?.choices?.[0]?.delta
                            const content = delta?.content || delta?.reasoning_content
                            if (typeof content === "string") {
                                // 处理Markdown流
                                await processStreamChunk(content)
                                allMessages.push(json) // 保存完整消息对象
                                // 回调外部消息处理
                                onMessage?.(json)
                            }

                            // 只在调试模式下频繁打印
                            if (messageCount % 50 === 0) {
                                console.log(`[SSE] 已接收 ${messageCount} 条消息`)
                            }
                        } catch (err) {
                            console.warn('[SSE] JSON解析错误:', err, '原始数据:', payload)
                            // 尝试容错处理，跳过异常数据
                        }
                    }
                } catch (readError) {
                    // 处理read()过程中可能发生的错误
                    if (readError.name === 'AbortError') {
                        console.log('[SSE] 读取流过程中检测到中止')
                        break
                    } else {
                        console.error('[SSE] 读取流时发生错误:', readError)
                        onError?.(readError)
                        break
                    }
                }
            }

            console.log(`[SSE] 流处理结束，${aborted ? '被中止' : '自然结束'}`)

            // 在流结束时调用completeStream保存当前状态
            completeStream()

            // 如果是因为中止而结束，确保调用onDone
            if (aborted) {
                console.log('[SSE] 因中止而调用onDone')
                onDone?.()
            } else {
                // 正常结束，也调用onDone
                console.log('[SSE] 流自然结束，调用onDone')
                onDone?.()
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('[SSE] 请求被用户中止')
                // 确保在中止错误时也调用onDone
                onDone?.()
                return
            }
            console.error('[SSE] 请求或处理错误:', error)
            onError?.(error)

            // 发生错误时也需要调用onDone来清理状态
            onDone?.()
        }
    }

    /**
     * 中止SSE流请求
     */
    const abortStream = () => {
        console.log('[SSE] 中止请求开始')
        // 先设置中止标记
        aborted = true

        if (controller) {
            try {
                console.log('[SSE] 调用controller.abort()')
                controller.abort()
                console.log('[SSE] controller.abort()调用成功')
            } catch (e) {
                console.error('[SSE] controller.abort()调用失败:', e)
            }
        } else {
            console.log('[SSE] controller为null，无法调用abort')
        }

        // 无论如何，也要完成流的处理
        completeStream()
    }

    /**
     * 用于SSE流的创建函数，返回start和abort方法
     */
    function useSSEStream({ onMessage, onDone, onError }) {
        return {
            start: (options) => startStream({ ...options, onMessage, onDone, onError }),
            abort: abortStream
        }
    }

    return {
        // Markdown渲染相关
        streamBuffer,
        renderedContent,
        isComplete,
        isFirstTokenReceived,
        processStreamChunk,
        processStreamChunks,
        completeStream,
        resetStream,

        // SSE流相关 
        useSSEStream,
        startStream,
        abortStream
    }
} 