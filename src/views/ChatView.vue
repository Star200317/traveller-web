<template>
  <div class="chat-container">
    <!-- 左侧会话列表 -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo">
          <div class="logo-icon">🌍</div>
          <span class="logo-text">旅小智</span>
        </div>
        <el-button 
          type="primary" 
          @click="newConversation" 
          :icon="Plus" 
          class="new-chat-btn"
          size="small"
        >
          新对话
        </el-button>
      </div>
      
      <div class="conv-list">
        <div
          v-for="(conv, index) in conversations"
          :key="conv.id"
          class="conv-item"
          :class="{ active: currentConvId === conv.id }"
          :style="{ animationDelay: `${index * 0.05}s` }"
          @click="switchConversation(conv.id)"
        >
          <el-icon class="conv-icon"><ChatDotRound /></el-icon>
          <span class="conv-title">{{ conv.title }}</span>
          <el-icon class="del-icon" @click.stop="deleteConversation(conv.id)"><Delete /></el-icon>
        </div>
      </div>
      
      <div class="sidebar-footer">
        <div class="footer-links">
          <div class="footer-link" @click="$router.push('/profile')">
            <el-icon><User /></el-icon>
            <span>个人中心</span>
          </div>
        </div>
        <div class="user-info" @click="$router.push('/profile')">
          <el-avatar :size="32" :src="userStore.userInfo?.avatar" />
          <span>{{ userStore.userInfo?.username || '游客' }}</span>
        </div>
      </div>
    </aside>

    <!-- 右侧对话区 -->
    <main class="chat-main">
      <!-- 顶部标题栏 -->
      <div class="chat-header">
        <div class="header-title">
          <el-icon><Compass /></el-icon>
          <span>AI 旅游向导</span>
        </div>
        <div class="header-actions">
          <el-button text :icon="Location" @click="goToGenerate">生成计划</el-button>
        </div>
      </div>

      <!-- 消息列表 -->
      <div class="message-list" ref="msgListRef">
        <!-- 欢迎消息 -->
        <div v-if="messages.length === 0 && !streaming" class="welcome-section">
          <div class="welcome-card">
            <div class="welcome-icon">✈️</div>
            <h2>想去哪里旅行？</h2>
            <p>告诉我你的目的地、时间、预算，我来帮你规划完美行程</p>
            <div class="quick-prompts">
              <div 
                v-for="prompt in quickPrompts" 
                :key="prompt"
                class="prompt-tag"
                @click="usePrompt(prompt)"
              >
                {{ prompt }}
              </div>
            </div>
          </div>
        </div>

        <!-- 消息内容 -->
        <template v-else>
          <div 
            v-for="(msg, index) in messages" 
            :key="msg.id" 
            class="message-item" 
            :class="[msg.role, { fade: index === messages.length - 1 }]"
          >
            <div class="message-wrapper">
              <div class="avatar">
                <div v-if="msg.role === 'user'" class="user-avatar">
                  <el-avatar :size="40" :src="userStore.userInfo?.avatar" />
                </div>
                <div v-else class="ai-avatar">
                  <div class="ai-icon">🤖</div>
                </div>
              </div>
              <div class="message-content">
                <div class="message-header">
                  <span class="sender-name">{{ msg.role === 'user' ? '我' : '旅小智' }}</span>
                  <span class="message-time">{{ formatTime(msg.createTime) }}</span>
                </div>
                <div class="bubble" v-html="renderMarkdown(msg.content)" />
              </div>
            </div>
          </div>
        </template>

        <!-- 流式输出中的消息 -->
        <div v-if="streaming" class="message-item assistant streaming">
          <div class="message-wrapper">
            <div class="avatar">
              <div class="ai-avatar">
                <div class="ai-icon">🤖</div>
              </div>
            </div>
            <div class="message-content">
              <div class="message-header">
                <span class="sender-name">旅小智</span>
                <span class="typing-indicator" v-if="!isPlanOutput">
                  <span></span><span></span><span></span>
                </span>
              </div>

              <!-- 普通对话：继续流式显示 -->
              <div v-if="!isPlanOutput" class="bubble" v-html="renderMarkdown(streamBuffer)" />

              <!-- 行程计划输出：显示加载动画，完成后一次性渲染 -->
              <div v-else class="bubble plan-loading-bubble">
                <div class="plan-loading">
                  <div class="plan-loading-icon">✈️</div>
                  <div class="plan-loading-text">
                    <span class="plan-loading-title">正在为您规划行程</span>
                    <span class="plan-loading-hint">{{ planLoadingHint }}</span>
                  </div>
                  <div class="plan-loading-dots">
                    <span></span><span></span><span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 地图预览（内嵌） -->
        <Transition name="map-fade">
          <div v-if="currentMapData" class="embedded-map" ref="embeddedMapRef">
            <div class="map-header">
              <span class="map-title">📍 旅游路线图</span>
              <el-button type="primary" link @click="openFullMap">查看完整地图</el-button>
            </div>
            <div class="map-preview">
              <MapView :mapData="currentMapData" :ready="mapReady" />
            </div>
          </div>
        </Transition>
      </div>

      <!-- 输入框 -->
      <div class="input-area">
        <div class="input-wrapper">
          <el-input
            v-model="inputText"
            type="textarea"
            :rows="2"
            resize="none"
            placeholder="告诉我你的旅行计划，比如：我想去西安玩5天，预算3000元..."
            @keydown.enter.prevent="handleEnter"
            :disabled="streaming"
            class="chat-input"
          />
          <div class="input-actions">
            <div class="input-left">
              <span class="hint">按 Enter 发送，Shift + Enter 换行</span>
            </div>
            <div class="input-right">
              <el-button 
                type="primary" 
                @click="sendMessage" 
                :loading="streaming"
                :disabled="!inputText.trim()"
                class="send-btn"
                :icon="Promotion"
              >
                发送
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch, computed } from 'vue'
import { Plus, Delete, ChatDotRound, Compass, Promotion, Location, User } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { marked } from 'marked'

// 配置marked支持GFM表格
marked.setOptions({
  gfm: true,  // 启用GitHub Flavored Markdown（包含表格支持）
  breaks: true,  // 支持GFM换行
  tables: true   // 显式启用表格支持
})
import { useUserStore } from '@/stores/user'
import request from '@/utils/request'
import MapView from '@/components/MapView.vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const userStore = useUserStore()
const conversations = ref([])
const currentConvId = ref(null)
const messages = ref([])
const inputText = ref('')
const streaming = ref(false)
const streamBuffer = ref('')
const msgListRef = ref(null)
const currentMapData = ref(null)
const embeddedMapRef = ref(null)  // 内嵌地图容器引用
const mapReady = ref(false)        // 地图容器是否已就绪（尺寸>0）

// 行程计划块输出相关
const isPlanOutput = computed(() => detectPlanOutput(streamBuffer.value))
const planLoadingHint = ref('正在搜索景点和美食推荐...')

const quickPrompts = [
  '帮我规划一个厦门三日游',
  '北京5天4晚，预算5000元',
  '推荐适合带孩子的旅游目的地',
  '西安有哪些必去的景点？'
]

onMounted(async () => {
  await loadConversations()
  if (conversations.value.length > 0) {
    await switchConversation(conversations.value[0].id)
  }
})

async function loadConversations() {
  conversations.value = await request.get('/chat/conversations')
}

async function newConversation() {
  const conv = await request.post('/chat/conversation/new', {})
  conversations.value.unshift(conv)
  await switchConversation(conv.id)
}

async function switchConversation(convId) {
  currentConvId.value = convId
  messages.value = await request.get(`/chat/conversation/${convId}/messages`)
  currentMapData.value = null
  scrollToBottom()
}

async function deleteConversation(convId) {
  try {
    await ElMessageBox.confirm('确定要删除这个对话吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    await request.delete(`/chat/conversation/${convId}`)
    conversations.value = conversations.value.filter(c => c.id !== convId)
    if (currentConvId.value === convId) {
      currentConvId.value = null
      messages.value = []
    }
    ElMessage.success('对话已删除')
  } catch (err) {
    ElMessage.error('删除失败：' + (err.message || err))
  }
}

function handleEnter(e) {
  if (e.shiftKey) {
    return
  }
  sendMessage()
}

function usePrompt(prompt) {
  inputText.value = prompt
  sendMessage()
}

async function sendMessage() {
  if (!inputText.value.trim() || streaming.value) return
  if (!currentConvId.value) await newConversation()

  const userMsg = { role: 'user', content: inputText.value, id: Date.now() }
  messages.value.push(userMsg)
  const query = inputText.value
  inputText.value = ''
  scrollToBottom()

  streaming.value = true
  streamBuffer.value = ''
  startPlanLoadingHints()  // 启动行程加载提示（如果是计划输出会显示）

  await fetchWithRetry(query)
}

async function fetchWithRetry(query, maxRetries = 3) {
  let lastError = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const url = `/api/chat/stream/${currentConvId.value}?message=${encodeURIComponent(query)}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let sseBuffer = '' // SSE缓冲区

      while (true) {
        const { done, value } = await reader.read()
        
        // 解码当前chunk
        sseBuffer += decoder.decode(value, { stream: !done })
        
        if (done) {
          // 流结束，处理剩余缓冲区
          processSSEBuffer(sseBuffer)
          break
        }
        
        // 按SSE协议分割消息（以\n\n分隔）
        const messages = sseBuffer.split('\n\n')
        // 最后一段可能不完整，保留到下次
        sseBuffer = messages.pop() || ''
        
        // 处理所有完整的SSE消息
        for (const msg of messages) {
          processSSEMessage(msg)
        }
        
        scrollToBottom()
      }

      // 流式完成，保存消息
      stopPlanLoadingHints()  // 停止加载提示
      messages.value.push({ role: 'assistant', content: streamBuffer.value, id: Date.now() })
      streamBuffer.value = ''
      streaming.value = false
      scrollToBottom()
      checkMapData()
      return // 成功，直接返回

    } catch (error) {
      lastError = error
      console.error(`[Chat] 第 ${attempt + 1} 次请求失败:`, error)

      if (attempt < maxRetries - 1) {
        const waitTime = (attempt + 1) * 2000 // 2s, 4s, 6s
        // 显示重试提示
        streamBuffer.value += `\n\n⚡ 网络不稳定，第 ${attempt + 2} 次重试中...\n`
        scrollToBottom()
        await new Promise(resolve => setTimeout(resolve, waitTime))
        // 清掉重试提示
        streamBuffer.value = streamBuffer.value.replace(/\n\n⚡.*重试中\.\.\.\n$/, '')
      }
    }
  }

  // 所有重试都失败
  stopPlanLoadingHints()  // 停止加载提示
  const errorMsg = lastError?.message || '网络错误'
  messages.value.push({
    role: 'assistant',
    content: `❌ 网络连接失败：${errorMsg}\n\n请检查网络后重试，或稍后再试。如果问题持续存在，可能是 DashScope 服务繁忙。`,
    id: Date.now()
  })
  streamBuffer.value = ''
  streaming.value = false
  scrollToBottom()
}

// 处理SSE消息（解析data:前缀）
function processSSEMessage(msg) {
  const trimmed = msg.trim()
  if (!trimmed || trimmed === ':heartbeat') return

  // 解析SSE格式：data: 真实内容
  if (trimmed.startsWith('data:')) {
    let data = trimmed.slice(5).trim() // 去掉"data:"前缀

    // SSE可能有多行data字段，需要拼接（处理多行data拼接情况）
    if (data.includes('\ndata:')) {
      data = data.split('\ndata:').join('\n')
    }

    // 跳过[DONE]结束标记
    if (data === '[DONE]') return

    // 追加到流缓冲区
    streamBuffer.value += data
  } else if (trimmed && !trimmed.startsWith('id:') && !trimmed.startsWith('event:') && !trimmed.startsWith('retry:')) {
    // 兼容：有些SSE实现不严格带data:前缀，直接追加内容（排除其他SSE字段）
    streamBuffer.value += trimmed
  }
}

/**
 * 清理流式文本中的残留 SSE 协议字符
 * 解决 TCP 分片导致 data: 等前缀泄漏到渲染内容的问题
 */
function cleanStreamText(text) {
  if (!text) return ''
  // 1. 移除行首/行中残留的 data: 前缀（带空格或不带空格）
  let cleaned = text.replace(/\bdata:\s*/g, '')
  // 2. 移除可能的 [DONE] 标记残留
  cleaned = cleaned.replace(/\[DONE\]/g, '')
  // 3. 清理多余的空行（连续2个以上换行变成1个）
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')
  return cleaned
}

/**
 * 修复流式传输中的不完整 Markdown 表格
 * 流式过程中表格可能缺少表头、分隔符或最后一行，
 * 导致 marked() 无法解析而显示为原始 pipe 文本。
 * 此函数检测并临时补全表格结构，使渲染正确。
 */
function repairStreamingTables(text) {
  if (!text) return ''

  const lines = text.split('\n')

  // 检测是否存在表格语法（至少有 | 符号的行）
  const hasTableSyntax = lines.some(line => line.includes('|') && line.trim().startsWith('|'))

  if (!hasTableSyntax) return text

  const result = []
  let inTable = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const isTableRow = line.trim().startsWith('|') && line.includes('|')

    if (isTableRow) {
      if (!inTable) {
        // 新表格开始，检查是否有表头+分隔符
        inTable = true
        result.push(line)

        // 如果下一行不是分隔符行（---|---），且当前行看起来像表头（含中文/字母表头）
        const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : ''
        const looksLikeHeader = /[\u4e00-\u9fa5]|[a-zA-Z]/.test(line)
        const nextIsSeparator = /^[\s|:-]+$/.test(nextLine)

        if (looksLikeHeader && !nextIsSeparator) {
          // 自动补充分隔符行：根据当前行的列数生成 ---|---
          const colCount = (line.match(/\|/g) || []).length - 1
          const separator = '|' + ' --- |'.repeat(colCount)
          result.push(separator)
        }
      } else {
        result.push(line)
      }
    } else {
      if (inTable) {
        inTable = false
      }
      result.push(line)
    }
  }

  // 处理：如果还在表格内部结束（最后几行是表格行但没闭合），
  // 不需要特殊处理，marked 可以处理没有空行结尾的表格
  return result.join('\n')
}

// 处理SSE缓冲区剩余内容
function processSSEBuffer(buf) {
  if (!buf.trim()) return
  
  const messages = buf.split('\n\n')
  for (const msg of messages) {
    if (msg.trim()) {
      processSSEMessage(msg)
    }
  }
}

async function checkMapData() {
  try {
    const plans = await request.get('/plan/list')
    if (plans && plans.length > 0) {
      const latest = plans[0]
      if (latest.mapData) {
        // 先重置 ready 状态，让 MapView 等待容器就绪
        mapReady.value = false
        currentMapData.value = latest.mapData
        // 延迟检测容器尺寸，确保 DOM 已完成布局
        await nextTick()
        waitForMapContainer()
      }
    }
  } catch (e) { /* ignore */ }
}

/**
 * 等待内嵌地图容器具有有效尺寸后再通知 MapView 初始化地图
 * 解决：v-if 切换后容器尺寸为 0，导致高德地图瓦片请求全部被取消
 */
function waitForMapContainer() {
  const el = embeddedMapRef.value?.querySelector('.map-preview')
  if (!el) {
    // 容器还没渲染，再等一帧
    setTimeout(() => waitForMapContainer(), 50)
    return
  }

  // 检查容器是否已有有效尺寸
  if (el.offsetWidth > 0 && el.offsetHeight > 0) {
    mapReady.value = true
    return
  }

  // 用 ResizeObserver 监听容器尺寸变化（处理 CSS transition/动画导致的延迟）
  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
        observer.disconnect()
        mapReady.value = true
        break
      }
    }
  })
  observer.observe(el)

  // 兜底：最多等 2 秒后强制就绪（防止某些情况下 observer 不触发）
  setTimeout(() => {
    observer.disconnect()
    if (!mapReady.value) {
      mapReady.value = true
    }
  }, 2000)
}

async function openFullMap() {
  if (!currentConvId.value) return
  try {
    const plan = await request.get(`/plan/byConv/${currentConvId.value}`)
    if (plan && plan.id) {
      router.push(`/map/${plan.id}`)
    } else {
      ElMessage.warning('该对话还没有生成旅游计划')
    }
  } catch (e) {
    ElMessage.error('获取计划失败')
  }
}

function goToGenerate() {
  router.push('/generate')
}

/**
 * 检测当前流式内容是否为行程计划输出
 * 判定标准：
 * 1. 包含表格管道符 | 且有中文表头（时间/景点/花费等）
 * 2. 或包含 "第N天行程" 标记
 */
function detectPlanOutput(text) {
  if (!text) return false
  // 包含 markdown 表格 + 行程相关关键词 → 计划输出模式
  const hasTablePipe = text.includes('|') && /\|.*时间/.test(text)
  const hasDayMarker = /第\d+天行程/.test(text)
  return hasTablePipe || hasDayMarker
}

// 行程规划阶段的加载提示文案，按阶段动态切换
const PLAN_LOADING_STAGES = [
  '正在搜索景点和美食推荐...',
  '正在查询高德地图坐标...',
  '正在规划每日路线安排...',
  '正在优化行程时间节点...',
  '即将生成完整行程表...'
]
let planLoadingStage = 0
let planLoadingTimer = null

/**
 * 启动行程加载提示轮换
 * 在 sendMessage 开始时调用
 */
function startPlanLoadingHints() {
  planLoadingStage = 0
  planLoadingHint.value = PLAN_LOADING_STAGES[0]

  // 每 3 秒切换一个提示，模拟 AI 正在工作的不同阶段
  if (planLoadingTimer) clearInterval(planLoadingTimer)
  planLoadingTimer = setInterval(() => {
    planLoadingStage++
    if (planLoadingStage < PLAN_LOADING_STAGES.length) {
      planLoadingHint.value = PLAN_LOADING_STAGES[planLoadingStage]
    } else {
      // 循环到最后几个提示
      planLoadingHint.value = '马上就好，请稍候...'
    }
  }, 3000)
}

/**
 * 停止加载提示轮换
 * 在流式结束时调用
 */
function stopPlanLoadingHints() {
  if (planLoadingTimer) {
    clearInterval(planLoadingTimer)
    planLoadingTimer = null
  }
}

function formatTime(time) {
  if (!time) return ''
  const date = new Date(time)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function renderMarkdown(text) {
  if (!text) return ''
  // 1. 清理 SSE 协议残留字符
  const cleaned = cleanStreamText(text)
  // 2. 修复流式不完整表格（让 marked 能正确解析）
  const repaired = repairStreamingTables(cleaned)
  // 3. 调用 marked 渲染
  return marked(repaired)
}

function scrollToBottom() {
  nextTick(() => {
    if (msgListRef.value) {
      msgListRef.value.scrollTop = msgListRef.value.scrollHeight
    }
  })
}
</script>

<style scoped>
.chat-container {
  display: flex;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  overflow: hidden;
}

/* Markdown表格样式 */
.bubble :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
  font-size: 14px;
}

.bubble :deep(th) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 10px 12px;
  text-align: left;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.bubble :deep(td) {
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  background: white;
}

.bubble :deep(tr:nth-child(even) td) {
  background: #f8f9fa;
}

.bubble :deep(tr:hover td) {
  background: #e8f4fd;
}

/* 侧边栏样式 */
.sidebar {
  width: 280px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.1);
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.logo-icon {
  font-size: 32px;
}

.logo-text {
  font-size: 24px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.new-chat-btn {
  width: 100%;
  height: 40px;
  border-radius: 12px;
  font-weight: 500;
}

.conv-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.conv-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 14px;
  margin-bottom: 6px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: slideInLeft 0.3s ease-out backwards;
}

.conv-item:hover {
  background: rgba(102, 126, 234, 0.1);
  transform: translateX(4px);
}

.conv-item.active {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
  border-left: 3px solid #667eea;
}

.conv-icon {
  color: #667eea;
  font-size: 18px;
}

.conv-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #333;
  font-weight: 500;
}

.del-icon {
  opacity: 0;
  color: #999;
  transition: all 0.2s;
  padding: 4px;
  border-radius: 6px;
}

.conv-item:hover .del-icon {
  opacity: 1;
}

.del-icon:hover {
  background: rgba(255, 0, 0, 0.1);
  color: #f56c6c;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.footer-links {
  margin-bottom: 12px;
}

.footer-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: #666;
  font-size: 14px;
}

.footer-link:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #333;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 12px;
  font-size: 14px;
  color: #666;
}

/* 主聊天区域 */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f8fafc;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.header-title .el-icon {
  font-size: 24px;
  color: #667eea;
}

/* 消息列表 */
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 欢迎区域 */
.welcome-section {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.welcome-card {
  text-align: center;
  max-width: 600px;
  padding: 48px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  animation: fadeIn 0.5s ease-out;
}

.welcome-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.welcome-card h2 {
  font-size: 28px;
  color: #333;
  margin-bottom: 12px;
  font-weight: 600;
}

.welcome-card p {
  font-size: 16px;
  color: #666;
  margin-bottom: 28px;
}

.quick-prompts {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.prompt-tag {
  padding: 10px 18px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-radius: 20px;
  font-size: 14px;
  color: #667eea;
  cursor: pointer;
  transition: all 0.3s;
}

.prompt-tag:hover {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

/* 消息项 */
.message-item {
  animation: fadeIn 0.3s ease-out;
}

.message-wrapper {
  display: flex;
  gap: 14px;
  max-width: 85%;
}

.message-item.user .message-wrapper {
  flex-direction: row-reverse;
  margin-left: auto;
}

/* 头像 */
.avatar {
  flex-shrink: 0;
}

.ai-avatar {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.ai-icon {
  font-size: 20px;
}

.user-avatar .el-avatar {
  border: 2px solid rgba(102, 126, 234, 0.2);
}

/* 消息内容 */
.message-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.message-item.user .message-header {
  flex-direction: row-reverse;
}

.sender-name {
  font-weight: 600;
  color: #333;
}

.message-time {
  color: #999;
  font-size: 12px;
}

/* 消息气泡 */
.bubble {
  background: white;
  padding: 16px 20px;
  border-radius: 18px;
  line-height: 1.7;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.04);
  max-width: 700px;
}

.message-item.user .bubble {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
}

.message-item.user .bubble :deep(a) {
  color: rgba(255, 255, 255, 0.9);
}

/* 输入中动画 */
.typing-indicator {
  display: flex;
  gap: 4px;
  align-items: center;
}

.typing-indicator span {
  width: 6px;
  height: 6px;
  background: #667eea;
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out both;
}

.typing-indicator span:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-indicator span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes typing {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 内嵌地图 */
.embedded-map {
  margin: 20px 0;
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.map-title {
  font-weight: 600;
  color: #333;
}

.map-preview {
  height: 300px;
}

/* 输入区域 */
.input-area {
  padding: 20px 32px 32px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.input-wrapper {
  max-width: 900px;
  margin: 0 auto;
  background: white;
  border-radius: 16px;
  padding: 16px 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.04);
  transition: all 0.3s;
}

.input-wrapper:focus-within {
  box-shadow: 0 4px 24px rgba(102, 126, 234, 0.15);
  border-color: rgba(102, 126, 234, 0.3);
}

.chat-input :deep(.el-textarea__inner) {
  border: none;
  background: transparent;
  padding: 0;
  font-size: 15px;
  resize: none;
  box-shadow: none;
}

.chat-input :deep(.el-textarea__inner:focus) {
  box-shadow: none;
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.04);
}

.hint {
  color: #999;
  font-size: 12px;
}

.send-btn {
  border-radius: 8px;
  padding: 10px 24px;
  font-weight: 500;
}

/* Markdown 样式优化 */
.bubble :deep(.markdown-body) {
  font-size: 15px;
}

.bubble :deep(p) {
  margin: 8px 0;
}

.bubble :deep(p:first-child) {
  margin-top: 0;
}

.bubble :deep(p:last-child) {
  margin-bottom: 0;
}

.bubble :deep(ul), .bubble :deep(ol) {
  margin: 8px 0;
  padding-left: 20px;
}

.bubble :deep(li) {
  margin: 4px 0;
}

.bubble :deep(code) {
  background: rgba(0, 0, 0, 0.05);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.9em;
}

.bubble :deep(pre) {
  background: #f6f8fa;
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 8px 0;
}

.message-item.user .bubble :deep(pre) {
  background: rgba(255, 255, 255, 0.15);
}

.message-item.user .bubble :deep(code) {
  background: rgba(255, 255, 255, 0.2);
}

.bubble :deep(blockquote) {
  border-left: 3px solid #667eea;
  padding-left: 12px;
  margin: 8px 0;
  color: #666;
}

.message-item.user .bubble :deep(blockquote) {
  border-left-color: rgba(255, 255, 255, 0.5);
  color: rgba(255, 255, 255, 0.9);
}

.bubble :deep(a) {
  color: #667eea;
  text-decoration: none;
}

.bubble :deep(a:hover) {
  text-decoration: underline;
}

/* 地图淡入过渡动画 */
.map-fade-enter-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}
.map-fade-leave-active {
  transition: opacity 0.2s ease;
}
.map-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.map-fade-leave-to {
  opacity: 0;
}

/* ===== 行程计划加载状态样式 ===== */
.plan-loading-bubble {
  min-height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.plan-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 10px 0;
}

.plan-loading-icon {
  font-size: 40px;
  animation: planeFly 2s ease-in-out infinite;
}

@keyframes planeFly {
  0%, 100% { transform: translateX(0) translateY(0) rotate(0deg); }
  25% { transform: translateX(8px) translateY(-6px) rotate(5deg); }
  50% { transform: translateX(16px) translateY(0) rotate(0deg); }
  75% { transform: translateX(8px) translateY(-4px) rotate(-3deg); }
}

.plan-loading-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.plan-loading-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.plan-loading-hint {
  font-size: 13px;
  color: #999;
  transition: all 0.3s ease;
}

.plan-loading-dots {
  display: flex;
  gap: 5px;
}

.plan-loading-dots span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  animation: dotPulse 1.4s ease-in-out infinite;
}

.plan-loading-dots span:nth-child(1) { animation-delay: 0s; }
.plan-loading-dots span:nth-child(2) { animation-delay: 0.15s; }
.plan-loading-dots span:nth-child(3) { animation-delay: 0.3s; }
.plan-loading-dots span:nth-child(4) { animation-delay: 0.45s; }
.plan-loading-dots span:nth-child(5) { animation-delay: 0.6s; }

@keyframes dotPulse {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>