<template>
  <el-dialog
    v-model="dialogVisible"
    title="忘记密码"
    width="460px"
    :close-on-click-modal="false"
    destroy-on-close
    class="forget-dialog"
    @close="handleClose"
  >
    <div class="dialog-tip">请输入账号并完成验证码校验后重置密码</div>

    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      class="forget-form"
      @keyup.enter="handleSubmit"
    >
      <el-form-item label="用户名" prop="username">
        <el-input
          v-model.trim="form.username"
          placeholder="请输入用户名"
          size="large"
          clearable
        >
          <template #prefix>
            <el-icon><User /></el-icon>
          </template>
        </el-input>
      </el-form-item>

      <el-form-item label="验证码" prop="code">
        <div class="code-input-wrapper">
          <el-input
            v-model.trim="form.code"
            placeholder="请输入6位验证码"
            size="large"
            maxlength="6"
            class="code-input"
          >
            <template #prefix>
              <el-icon><Key /></el-icon>
            </template>
          </el-input>
          <el-button
            size="large"
            :disabled="countdown > 0 || !form.username || sendingCode"
            :loading="sendingCode"
            class="send-code-btn"
            @click="handleSendCode"
          >
            {{ countdown > 0 ? `${countdown}s后重发` : '获取验证码' }}
          </el-button>
        </div>
      </el-form-item>

      <el-form-item label="新密码" prop="newPassword">
        <el-input
          v-model.trim="form.newPassword"
          type="password"
          placeholder="请输入新密码（6-20位）"
          size="large"
          show-password
          clearable
        >
          <template #prefix>
            <el-icon><Lock /></el-icon>
          </template>
        </el-input>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button size="large" @click="handleClose">取消</el-button>
        <el-button
          type="primary"
          size="large"
          :loading="loading"
          @click="handleSubmit"
        >
          重置密码
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { User, Lock, Key } from '@element-plus/icons-vue'
import request from '@/utils/request'

const emit = defineEmits(['success'])

const dialogVisible = ref(false)
const loading = ref(false)
const sendingCode = ref(false)
const countdown = ref(0)
const formRef = ref(null)
let countdownTimer = null

const form = reactive({
  username: '',
  code: '',
  newPassword: ''
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  code: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { pattern: /^\d{6}$/, message: '验证码应为6位数字', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度需在6-20位之间', trigger: 'blur' }
  ]
}

function clearCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}

function startCountdown() {
  clearCountdown()
  countdown.value = 60
  countdownTimer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      countdown.value = 0
      clearCountdown()
    }
  }, 1000)
}

function open() {
  dialogVisible.value = true
}

async function handleSendCode() {
  if (!form.username) {
    ElMessage.warning('请先输入用户名')
    return
  }

  sendingCode.value = true
  try {
    await request.post('/auth/send-code', { username: form.username })
    ElMessage.success('验证码已发送（开发模式下可在控制台查看）')
    startCountdown()
  } finally {
    sendingCode.value = false
  }
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await request.post('/auth/reset-password', {
      username: form.username,
      code: form.code,
      newPassword: form.newPassword
    })
    ElMessage.success('密码重置成功，请使用新密码登录')
    emit('success')
    handleClose()
  } finally {
    loading.value = false
  }
}

function handleClose() {
  dialogVisible.value = false
  clearCountdown()
  countdown.value = 0
  formRef.value?.resetFields()
}

onBeforeUnmount(() => {
  clearCountdown()
})

defineExpose({ open })
</script>

<style scoped>
.dialog-tip {
  margin: 0 0 14px;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 13px;
  color: #475569;
  background: linear-gradient(135deg, #f0f7ff 0%, #eef2ff 100%);
  border: 1px solid #dbeafe;
}

.forget-form {
  padding-top: 4px;
}

.forget-form :deep(.el-form-item) {
  margin-bottom: 16px;
}

.forget-form :deep(.el-form-item__label) {
  color: #334155;
  font-weight: 600;
  line-height: 1.4;
  padding-bottom: 6px;
}

.forget-form :deep(.el-input__wrapper) {
  border-radius: 10px;
}

.code-input-wrapper {
  display: flex;
  gap: 10px;
  width: 100%;
}

.code-input {
  flex: 1;
}

.send-code-btn {
  width: 130px;
  flex-shrink: 0;
  border-radius: 10px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 640px) {
  .code-input-wrapper {
    flex-direction: column;
  }

  .send-code-btn {
    width: 100%;
  }
}
</style>
