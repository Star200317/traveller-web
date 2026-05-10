<template>
  <div class="login-page">
    <!-- 背景动画 -->
    <div class="bg-animation">
      <div class="bg-circle c1"></div>
      <div class="bg-circle c2"></div>
      <div class="bg-circle c3"></div>
    </div>

    <div class="login-container">
      <!-- 左侧品牌展示 -->
      <div class="brand-section">
        <div class="brand-content">
          <div class="logo">
            <span class="logo-icon">🌍</span>
            <span class="logo-text">旅小智</span>
          </div>
          <h1 class="brand-title">AI 智能旅游向导</h1>
          <p class="brand-desc">
            让 AI 帮你规划完美旅程<br>
            智能路线 · 景点推荐 · 一键导出
          </p>
          <div class="feature-tags">
            <span class="tag">🎯 智能规划</span>
            <span class="tag">🗺️ 路线导航</span>
            <span class="tag">📄 PDF导出</span>
          </div>
        </div>
      </div>

      <!-- 右侧登录表单 -->
      <div class="form-section">
        <div class="form-card">
          <div class="form-header">
            <h2>{{ activeTab === 'login' ? '欢迎回来' : '创建账号' }}</h2>
            <p>{{ activeTab === 'login' ? '登录以继续您的旅程规划' : '开始您的智能旅行体验' }}</p>
          </div>

          <el-tabs v-model="activeTab" class="custom-tabs">
            <el-tab-pane label="登录" name="login">
              <el-form 
                :model="loginForm" 
                @submit.prevent="handleLogin"
                class="login-form"
              >
                <el-form-item>
                  <el-input 
                    v-model="loginForm.username" 
                    placeholder="请输入用户名" 
                    size="large"
                    class="custom-input"
                  >
                    <template #prefix>
                      <el-icon><User /></el-icon>
                    </template>
                  </el-input>
                </el-form-item>
                <el-form-item>
                  <el-input 
                    v-model="loginForm.password" 
                    type="password" 
                    placeholder="请输入密码" 
                    size="large"
                    show-password
                    class="custom-input"
                  >
                    <template #prefix>
                      <el-icon><Lock /></el-icon>
                    </template>
                  </el-input>
                </el-form-item>
                <el-button 
                  type="primary" 
                  native-type="submit" 
                  :loading="loading"
                  size="large"
                  class="submit-btn"
                >
                  登 录
                </el-button>

                <div class="forget-password-row">
                  <span class="forget-link" @click="forgetPasswordRef.open()">忘记密码？</span>
                </div>
              </el-form>
            </el-tab-pane>

            <el-tab-pane label="注册" name="register">
              <el-form 
                :model="regForm" 
                @submit.prevent="handleRegister"
                class="login-form"
              >
                <el-form-item>
                  <el-input 
                    v-model="regForm.username" 
                    placeholder="用户名（3-20位）" 
                    size="large"
                    class="custom-input"
                  >
                    <template #prefix>
                      <el-icon><User /></el-icon>
                    </template>
                  </el-input>
                </el-form-item>
                <el-form-item>
                  <el-input 
                    v-model="regForm.nickname" 
                    placeholder="昵称（可选）" 
                    size="large"
                    class="custom-input"
                  >
                    <template #prefix>
                      <el-icon><Avatar /></el-icon>
                    </template>
                  </el-input>
                </el-form-item>
                <el-form-item>
                  <el-input 
                    v-model="regForm.password" 
                    type="password" 
                    placeholder="密码（6-20位）" 
                    size="large"
                    show-password
                    class="custom-input"
                  >
                    <template #prefix>
                      <el-icon><Lock /></el-icon>
                    </template>
                  </el-input>
                </el-form-item>
                <el-button 
                  type="primary" 
                  native-type="submit" 
                  :loading="loading"
                  size="large"
                  class="submit-btn"
                >
                  注 册
                </el-button>
              </el-form>
            </el-tab-pane>
          </el-tabs>

          <div class="form-footer">
            <p>© 2026 旅小智 AI旅游向导</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 忘记密码弹窗 -->
    <ForgetPassword ref="forgetPasswordRef" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import { User, Lock, Avatar } from '@element-plus/icons-vue'
import ForgetPassword from '@/components/ForgetPassword.vue'

const router = useRouter()
const userStore = useUserStore()
const activeTab = ref('login')
const loading = ref(false)
const loginForm = ref({ username: '', password: '' })
const regForm = ref({ username: '', password: '', nickname: '' })
const forgetPasswordRef = ref(null)

async function handleLogin() {
  if (!loginForm.value.username || !loginForm.value.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }
  loading.value = true
  try {
    await userStore.login(loginForm.value.username, loginForm.value.password)
    ElMessage.success('登录成功')
    router.push('/')
  } catch (err) {
    ElMessage.error(err.message || '登录失败')
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  if (!regForm.value.username || !regForm.value.password) {
    ElMessage.warning('请填写必要信息')
    return
  }
  if (regForm.value.username.length < 3 || regForm.value.username.length > 20) {
    ElMessage.warning('用户名长度需在3-20位之间')
    return
  }
  if (regForm.value.password.length < 6 || regForm.value.password.length > 20) {
    ElMessage.warning('密码长度需在6-20位之间')
    return
  }
  loading.value = true
  try {
    await userStore.register(regForm.value.username, regForm.value.password, regForm.value.nickname)
    ElMessage.success('注册成功')
    router.push('/')
  } catch (err) {
    ElMessage.error(err.message || '注册失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
}

/* 背景动画 */
.bg-animation {
  position: absolute;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 0;
}

.bg-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  animation: float 20s infinite ease-in-out;
}

.c1 {
  width: 600px;
  height: 600px;
  top: -200px;
  right: -200px;
  animation-delay: 0s;
}

.c2 {
  width: 400px;
  height: 400px;
  bottom: -100px;
  left: -100px;
  animation-delay: -5s;
}

.c3 {
  width: 300px;
  height: 300px;
  top: 50%;
  left: 50%;
  animation-delay: -10s;
}

@keyframes float {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(30px, -30px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
}

/* 主容器 */
.login-container {
  display: flex;
  min-height: 100vh;
  position: relative;
  z-index: 1;
}

/* 左侧品牌区 */
.brand-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
  color: white;
}

.brand-content {
  max-width: 500px;
  animation: fadeInLeft 0.8s ease-out;
}

@keyframes fadeInLeft {
  from {
    opacity: 0;
    transform: translateX(-50px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.logo {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
}

.logo-icon {
  font-size: 56px;
}

.logo-text {
  font-size: 42px;
  font-weight: 700;
  letter-spacing: 2px;
}

.brand-title {
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 20px;
  line-height: 1.2;
}

.brand-desc {
  font-size: 20px;
  line-height: 1.8;
  opacity: 0.9;
  margin-bottom: 40px;
}

.feature-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.tag {
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 30px;
  font-size: 15px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s;
}

.tag:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

/* 右侧表单区 */
.form-section {
  width: 480px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.form-card {
  width: 100%;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 24px;
  padding: 40px;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.15);
  animation: fadeInUp 0.8s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(50px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.form-header {
  text-align: center;
  margin-bottom: 32px;
}

.form-header h2 {
  font-size: 28px;
  color: #333;
  margin-bottom: 8px;
  font-weight: 600;
}

.form-header p {
  font-size: 15px;
  color: #666;
}

/* 自定义标签页 */
.custom-tabs :deep(.el-tabs__header) {
  margin-bottom: 32px;
}

.custom-tabs :deep(.el-tabs__nav-wrap::after) {
  height: 2px;
  background: #f0f0f0;
}

.custom-tabs :deep(.el-tabs__item) {
  font-size: 16px;
  padding: 0 24px;
  height: 44px;
  color: #666;
}

.custom-tabs :deep(.el-tabs__item.is-active) {
  color: #667eea;
  font-weight: 600;
}

.custom-tabs :deep(.el-tabs__active-bar) {
  height: 3px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 3px;
}

/* 表单样式 */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.custom-input :deep(.el-input__wrapper) {
  border-radius: 12px;
  padding: 4px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid #e5e7eb;
  transition: all 0.3s;
}

.custom-input :deep(.el-input__wrapper:hover) {
  border-color: #c4b5fd;
}

.custom-input :deep(.el-input__wrapper.is-focus) {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.custom-input :deep(.el-input__inner) {
  height: 48px;
  font-size: 15px;
}

.custom-input :deep(.el-input__prefix) {
  color: #999;
  font-size: 18px;
  margin-right: 8px;
}

.submit-btn {
  width: 100%;
  height: 52px;
  border-radius: 12px;
  font-size: 17px;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  margin-top: 8px;
  transition: all 0.3s;
}

.submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
}

.submit-btn:active {
  transform: translateY(0);
}

.form-footer {
  margin-top: 32px;
  text-align: center;
}

.form-footer p {
  font-size: 13px;
  color: #999;
}

/* 忘记密码 */
.forget-password-row {
  text-align: right;
  margin-top: -8px;
  margin-bottom: 8px;
}

.forget-link {
  font-size: 14px;
  color: #667eea;
  cursor: pointer;
  transition: color 0.3s;
}

.forget-link:hover {
  color: #764ba2;
}

/* 响应式设计 */
@media (max-width: 900px) {
  .login-container {
    flex-direction: column;
  }
  
  .brand-section {
    padding: 40px 20px;
    text-align: center;
  }
  
  .brand-title {
    font-size: 32px;
  }
  
  .form-section {
    width: 100%;
    padding: 20px;
  }
  
  .form-card {
    padding: 30px 24px;
  }
}
</style>