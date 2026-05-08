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
        <div class="user-info">
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
          <el-button text :icon="Share" @click="shareChat">分享</el-button>
          <el-button text :icon="Setting" @click="openSettings">设置</el-button>
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
                <span class="typing-indicator">
                  <span></span><span></span><span></span>
                </span>
              </div>
              <div class="bubble" v-html="renderMarkdown(streamBuffer)" />
            </div>
          </div>
        </div>

        <!-- 地图预览（内嵌） -->
        <div v-if="currentMapData" class="embedded-map">
          <div class="map-header">
            <span class="map-title">📍 旅游路线图</span>
            <el-button type="primary" link @click="openFullMap">查看完整地图</el-button>
          </div>
          <div class="map-preview">
            <MapView :mapData="currentMapData" />
          </div>
        </div>
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
import { ref, onMounted, nextTick, watch } from 'vue'
import { Plus, Delete, ChatDotRound, Compass, Share, Setting, Promotion } from '@element-plus/icons-vue'
import { marked } from 'marked'
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
  await request.delete(`/chat/conversation/${convId}`)
  conversations.value = conversations.value.filter(c => c.id !== convId)
  if (currentConvId.value === convId) {
    currentConvId.value = null
    messages.value = []
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

  // SSE 流式接收
  const url = `/api/chat/stream/${currentConvId.value}?message=${encodeURIComponent(query)}`
  const eventSource = new EventSource(url)

  eventSource.onmessage = (e) => {
    streamBuffer.value += e.data
    scrollToBottom()
  }

  eventSource.addEventListener('error', () => {
    eventSource.close()
    messages.value.push({ role: 'assistant', content: streamBuffer.value, id: Date.now() })
    streamBuffer.value = ''
    streaming.value = false
    scrollToBottom()
    checkMapData()
  })
}

async function checkMapData() {
  try {
    const plans = await request.get('/plan/list')
    if (plans && plans.length > 0) {
      const latest = plans[0]
      if (latest.mapData) {
        currentMapData.value = latest.mapData
      }
    }
  } catch (e) { /* ignore */ }
}

function openFullMap() {
  if (currentConvId.value) {
    router.push(`/map/${currentConvId.value}`)
  }
}

function shareChat() {
  // 分享功能
}

function openSettings() {
  // 设置功能
}

function formatTime(time) {
  if (!time) return ''
  const date = new Date(time)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function renderMarkdown(text) {
  return marked(text || '')
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
</style>