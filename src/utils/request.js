import axios from 'axios'
import { ElMessage } from 'element-plus'

const TOKEN_KEY = 'token'
const USER_INFO_KEY = 'userInfo'

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function clearAuthStorage() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_INFO_KEY)
}

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000
})

request.interceptors.request.use(config => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = token
  }
  return config
})

request.interceptors.response.use(
  res => {
    // blob 类型直接返回原始数据（文件下载场景）
    if (res.config.responseType === 'blob') {
      return res.data
    }
    if (res.data.code !== 200) {
      ElMessage.error(res.data.message || '请求失败')
      return Promise.reject(res.data)
    }
    return res.data.data
  },
  err => {
    if (err.response?.status === 401) {
      ElMessage.error('请先登录')
      clearAuthStorage()
      window.location.href = '/login'
    } else {
      const message = err.response?.data?.message || err.message || '网络错误'
      ElMessage.error(message)
    }
    return Promise.reject(err)
  }
)

export default request
