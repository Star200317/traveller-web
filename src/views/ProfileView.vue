<template>
  <div class="profile-container">
    <!-- 顶部导航栏 -->
    <div class="page-header">
      <div class="header-left">
        <el-button text @click="$router.push('/')">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
      </div>
      <h2 class="page-title">个人中心</h2>
      <div class="header-right">
        <el-button text @click="handleLogout">
          <el-icon><SwitchButton /></el-icon>
          退出登录
        </el-button>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 左侧用户信息卡片 -->
      <aside class="user-sidebar">
        <div class="user-card">
          <div class="avatar-section">
            <el-avatar :size="80" :src="userInfo.avatar" class="user-avatar">
              {{ userInfo.username?.charAt(0)?.toUpperCase() }}
            </el-avatar>
            <el-button text size="small" @click="showAvatarDialog = true" class="change-avatar-btn">
              <el-icon><Edit /></el-icon>
              更换头像
            </el-button>
          </div>
          <div class="user-info">
            <h3 class="username">{{ userInfo.username }}</h3>
            <p class="user-email">{{ userInfo.email }}</p>
            <div class="user-stats">
              <div class="stat-item">
                <span class="stat-value">{{ userStats.planCount }}</span>
                <span class="stat-label">旅行计划</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 快捷入口 -->
        <div class="quick-links">
          <div class="link-item" @click="activeTab = 'plans'">
            <el-icon><Tickets /></el-icon>
            <span>我的计划</span>
            <el-icon class="arrow"><ArrowRight /></el-icon>
          </div>
          <div class="link-item" @click="activeTab = 'settings'">
            <el-icon><Setting /></el-icon>
            <span>账号设置</span>
            <el-icon class="arrow"><ArrowRight /></el-icon>
          </div>
        </div>
      </aside>

      <!-- 右侧内容区 -->
      <main class="content-area">
        <!-- 我的计划 -->
        <div v-if="activeTab === 'plans'" class="tab-content">
          <div class="tab-header">
            <h3>我的旅行计划</h3>
            <el-button type="primary" @click="$router.push({ path: '/generate', query: { from: 'profile' } })">
              <el-icon><Plus /></el-icon>
              新建计划
            </el-button>
          </div>

          <div v-if="plans.length > 0" class="plans-grid">
            <div v-for="plan in plans" :key="plan.id" class="plan-card" @click="viewPlan(plan.id)">
              <div class="plan-cover">
                <img v-if="plan.coverImage" :src="plan.coverImage" alt="计划封面" />
                <div v-else class="cover-placeholder">
                  <span class="cover-icon">✈️</span>
                  <span class="cover-text">{{ plan.destination || '旅行计划' }}</span>
                </div>
              </div>
              <div class="plan-info">
                <h4 class="plan-title">{{ plan.title }}</h4>
                <div class="plan-meta">
                  <span class="plan-destination" v-if="plan.destination">
                    <el-icon><Location /></el-icon>
                    {{ plan.destination }}
                  </span>
                  <span class="plan-days" v-if="plan.days">
                    <el-icon><Calendar /></el-icon>
                    {{ plan.days }}天
                  </span>
                </div>
                <div class="plan-footer">
                  <el-tag :type="getStatusType(plan.status)" size="small">
                    {{ getStatusLabel(plan.status) }}
                  </el-tag>
                  <span class="plan-date">{{ formatDate(plan.createTime) }}</span>
                </div>
              </div>
              <div class="plan-actions">
                <el-button text size="small" @click.stop="viewPlan(plan.id)">
                  <el-icon><View /></el-icon>
                </el-button>
                <el-button text size="small" @click.stop="exportPlanPdf(plan.id, plan.title)" :loading="exportingId === plan.id">
                  <el-icon><Document /></el-icon>
                </el-button>
                <el-button text size="small" @click.stop="deletePlan(plan.id)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>
          </div>

          <el-empty v-else description="暂无旅行计划">
            <el-button type="primary" @click="$router.push({ path: '/generate', query: { from: 'profile' } })">创建第一个计划</el-button>
          </el-empty>
        </div>

        <!-- 账号设置 -->
        <div v-else-if="activeTab === 'settings'" class="tab-content">
          <div class="tab-header">
            <h3>账号设置</h3>
          </div>

          <div class="settings-form">
            <el-form :model="settingsForm" label-width="100px" class="profile-form">
              <el-form-item label="用户名">
                <el-input v-model="settingsForm.username" placeholder="请输入用户名" />
              </el-form-item>
              <el-form-item label="邮箱">
                <el-input v-model="settingsForm.email" placeholder="请输入邮箱" />
              </el-form-item>
            </el-form>

            <div class="form-actions">
              <el-button type="primary" @click="saveProfile" :loading="saving">
                保存修改
              </el-button>
            </div>
          </div>

          <el-divider />

          <div class="settings-section">
            <h4>修改密码</h4>
            <el-form :model="passwordForm" label-width="100px" class="password-form">
              <el-form-item label="当前密码">
                <el-input v-model="passwordForm.oldPassword" type="password" placeholder="请输入当前密码" show-password />
              </el-form-item>
              <el-form-item label="新密码">
                <el-input v-model="passwordForm.newPassword" type="password" placeholder="请输入新密码" show-password />
              </el-form-item>
              <el-form-item label="确认密码">
                <el-input v-model="passwordForm.confirmPassword" type="password" placeholder="请确认新密码" show-password />
              </el-form-item>
            </el-form>
            <div class="form-actions">
              <el-button @click="changePassword" :loading="changingPassword">
                修改密码
              </el-button>
            </div>
          </div>

          <el-divider />

          <div class="settings-section danger-zone">
            <h4>危险区域</h4>
            <p class="danger-text">删除账号后，所有数据将无法恢复</p>
            <el-button type="danger" plain @click="showDeleteDialog = true">
              删除账号
            </el-button>
          </div>
        </div>
      </main>
    </div>

    <!-- 头像选择对话框 -->
    <el-dialog v-model="showAvatarDialog" title="选择头像" width="400px">
      <div class="avatar-grid">
        <div
          v-for="avatar in avatarOptions"
          :key="avatar"
          class="avatar-option"
          :class="{ selected: settingsForm.avatar === avatar }"
          @click="settingsForm.avatar = avatar"
        >
          <el-avatar :size="60" :src="avatar" />
        </div>
      </div>
      <template #footer>
        <el-button @click="showAvatarDialog = false">取消</el-button>
        <el-button type="primary" @click="saveAvatar">确定</el-button>
      </template>
    </el-dialog>

    <!-- 删除账号确认对话框 -->
    <el-dialog v-model="showDeleteDialog" title="确认删除账号" width="400px">
      <div class="delete-confirm">
        <p>此操作不可逆，删除后：</p>
        <ul>
          <li>您的所有旅行计划将被删除</li>
          <li>收藏的地点将被清除</li>
          <li>账号信息将无法恢复</li>
        </ul>
        <el-input v-model="deleteConfirmText" placeholder="请输入 '确认删除' 来确认" />
      </div>
      <template #footer>
        <el-button @click="showDeleteDialog = false">取消</el-button>
        <el-button type="danger" :disabled="deleteConfirmText !== '确认删除'" @click="deleteAccount">
          确认删除
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft, ArrowRight, Edit, Delete, Setting, Plus,
  Tickets, Calendar, Location, View, SwitchButton, Document
} from '@element-plus/icons-vue'
import { getPlanList, deletePlan as deletePlanApi, exportPlanPdf as exportPlanPdfApi } from '@/api/plan'
import { updateProfile, changePassword as changePasswordApi, deleteAccount as deleteAccountApi } from '@/api/user'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

// 状态
const activeTab = ref('plans')
const userInfo = ref({
  username: '用户',
  email: '',
  avatar: ''
})
const userStats = ref({
  planCount: 0
})
const plans = ref([])
const saving = ref(false)
const changingPassword = ref(false)
const exportingId = ref(null)  // 正在导出的计划ID，用于显示loading

// 设置相关
const settingsForm = reactive({
  username: '',
  email: '',
  avatar: ''
})
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 对话框
const showAvatarDialog = ref(false)
const showDeleteDialog = ref(false)
const deleteConfirmText = ref('')

// 头像选项
const avatarOptions = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Mimi',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Max',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex'
]

const syncUserState = (nextUserInfo = {}) => {
  const mergedUser = {
    ...userInfo.value,
    ...nextUserInfo,
    username: nextUserInfo.username ?? settingsForm.username,
    email: nextUserInfo.email ?? settingsForm.email,
    avatar: nextUserInfo.avatar ?? settingsForm.avatar
  }
  userInfo.value = mergedUser
  settingsForm.username = mergedUser.username || ''
  settingsForm.email = mergedUser.email || ''
  settingsForm.avatar = mergedUser.avatar || ''
  userStore.setUserInfo(mergedUser)
}

// 方法
const getStatusType = (status) => {
  const types = { 1: 'info', 2: 'success', 3: 'warning' }
  return types[status] || 'info'
}

const getStatusLabel = (status) => {
  const labels = { 1: '草稿', 2: '已确认', 3: '已导出' }
  return labels[status] || '未知'
}

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('zh-CN')
}

// 加载用户信息
const loadUserInfo = async () => {
  try {
    // 从 localStorage 获取用户信息
    const stored = localStorage.getItem('userInfo')
    if (stored) {
      const info = JSON.parse(stored)
      userInfo.value = { ...userInfo.value, ...info }
      settingsForm.username = info.username || ''
      settingsForm.email = info.email || ''
      settingsForm.avatar = info.avatar || ''
    }
  } catch (e) {
    console.error('加载用户信息失败:', e)
  }
}

// 加载旅行计划
const loadPlans = async () => {
  try {
    const data = await getPlanList()
    plans.value = data || []
    userStats.value.planCount = plans.value.length
  } catch (e) {
    console.error('加载旅行计划失败:', e)
  }
}

// 查看计划
const viewPlan = (planId) => {
  router.push(`/plan/${planId}`)
}

// 删除计划
const deletePlan = async (planId) => {
  try {
    await ElMessageBox.confirm('确定要删除这个旅行计划吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await deletePlanApi(planId)
    ElMessage.success('删除成功')
    loadPlans()
  } catch (e) {
    if (e !== 'cancel') {
      console.error('删除失败:', e)
    }
  }
}

// 导出PDF
const exportPlanPdf = async (planId, planTitle) => {
  exportingId.value = planId
  try {
    const blob = await exportPlanPdfApi(planId)
    // 创建下载链接
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = (planTitle || '旅游计划') + '.pdf'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch (e) {
    console.error('导出PDF失败:', e)
    ElMessage.error('导出失败，请重试')
  } finally {
    exportingId.value = null
  }
}

// 保存个人资料
const saveProfile = async () => {
  saving.value = true
  try {
    const updatedUser = await updateProfile({
      username: settingsForm.username,
      email: settingsForm.email,
      avatar: settingsForm.avatar
    })
    syncUserState(updatedUser || {})
    ElMessage.success('保存成功')
  } catch (e) {
    console.error('保存失败:', e)
  } finally {
    saving.value = false
  }
}

// 保存头像
const saveAvatar = async () => {
  try {
    const selectedAvatar = settingsForm.avatar || avatarOptions[0]
    const updatedUser = await updateProfile({
      username: settingsForm.username,
      email: settingsForm.email,
      avatar: selectedAvatar
    })
    syncUserState({ ...(updatedUser || {}), avatar: updatedUser?.avatar || selectedAvatar })
    showAvatarDialog.value = false
    ElMessage.success('头像已更新')
  } catch (e) {
    console.error('保存头像失败:', e)
    ElMessage.error('保存头像失败')
  }
}

// 修改密码
const changePassword = async () => {
  if (!passwordForm.oldPassword) {
    ElMessage.warning('请输入当前密码')
    return
  }
  if (!passwordForm.newPassword) {
    ElMessage.warning('请输入新密码')
    return
  }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    ElMessage.warning('两次输入的密码不一致')
    return
  }

  changingPassword.value = true
  try {
    await changePasswordApi({
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword
    })
    ElMessage.success('密码修改成功')
    passwordForm.oldPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
  } catch (e) {
    console.error('修改密码失败:', e)
  } finally {
    changingPassword.value = false
  }
}

// 删除账号
const deleteAccount = async () => {
  try {
    await deleteAccountApi()
    ElMessage.success('账号已删除')
    userStore.setToken('')
    userStore.setUserInfo(null)
    localStorage.clear()
    router.push('/login')
  } catch (e) {
    console.error('删除账号失败:', e)
  }
}

// 退出登录
const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'question'
    })
    await userStore.logout()
    router.push('/login')
  } catch (e) {
    // 取消操作
  }
}

onMounted(() => {
  loadUserInfo()
  loadPlans()
})
</script>

<style scoped>
.profile-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  height: 64px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.08);
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.main-content {
  display: flex;
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  gap: 24px;
}

/* 左侧用户卡片 */
.user-sidebar {
  width: 280px;
  flex-shrink: 0;
}

.user-card {
  background: rgba(255, 255, 255, 0.98);
  border-radius: 16px;
  padding: 24px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.avatar-section {
  position: relative;
  display: inline-block;
  margin-bottom: 16px;
}

.user-avatar {
  border: 3px solid #667eea;
}

.change-avatar-btn {
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.username {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.user-email {
  margin: 0 0 16px;
  font-size: 14px;
  color: #999;
}

.user-stats {
  display: flex;
  justify-content: center;
  gap: 32px;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #667eea;
}

.stat-label {
  font-size: 12px;
  color: #999;
}

.quick-links {
  margin-top: 16px;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.link-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid #f0f0f0;
}

.link-item:last-child {
  border-bottom: none;
}

.link-item:hover {
  background: rgba(102, 126, 234, 0.05);
}

.link-item .el-icon:first-child {
  font-size: 20px;
  color: #667eea;
}

.link-item span {
  flex: 1;
  font-size: 14px;
  color: #333;
}

.link-item .arrow {
  font-size: 14px;
  color: #ccc;
}

/* 右侧内容区 */
.content-area {
  flex: 1;
  min-width: 0;
}

.tab-content {
  background: rgba(255, 255, 255, 0.98);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.tab-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

/* 计划卡片网格 */
.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.plan-card {
  background: #f8f9fa;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.plan-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.plan-cover {
  height: 140px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.plan-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: white;
}

.cover-icon {
  font-size: 40px;
}

.cover-text {
  font-size: 14px;
  font-weight: 500;
}

.plan-info {
  padding: 16px;
}

.plan-title {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.plan-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #666;
  margin-bottom: 12px;
}

.plan-meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.plan-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.plan-date {
  font-size: 12px;
  color: #999;
}

.plan-actions {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.plan-card:hover .plan-actions {
  opacity: 1;
}

.plan-actions .el-button {
  background: white;
  border-radius: 50%;
  width: 32px;
  height: 32px;
}

/* 设置表单 */
.settings-form,
.password-form {
  max-width: 500px;
}

.form-actions {
  margin-top: 20px;
}

.settings-section {
  margin-bottom: 24px;
}

.settings-section h4 {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.danger-zone {
  padding: 20px;
  background: #fff5f5;
  border-radius: 8px;
}

.danger-text {
  color: #f56c6c;
  margin-bottom: 16px;
}

/* 头像网格 */
.avatar-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.avatar-option {
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: all 0.2s;
}

.avatar-option:hover {
  background: #f0f4ff;
}

.avatar-option.selected {
  background: #ecf5ff;
  box-shadow: 0 0 0 2px #409EFF;
}

/* 删除确认 */
.delete-confirm p {
  margin: 0 0 12px;
  color: #666;
}

.delete-confirm ul {
  margin: 0 0 16px;
  padding-left: 20px;
  color: #999;
}

.delete-confirm li {
  margin-bottom: 4px;
}

/* 响应式 */
@media (max-width: 768px) {
  .main-content {
    flex-direction: column;
  }

  .user-sidebar {
    width: 100%;
  }

  .plans-grid,
  .favorites-grid {
    grid-template-columns: 1fr;
  }
}
</style>
