import { defineStore } from 'pinia'
import { ref } from 'vue'
import request, { clearAuthStorage } from '@/utils/request'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref(JSON.parse(localStorage.getItem('userInfo') || 'null'))

  function setToken(t) {
    token.value = t
    localStorage.setItem('token', t)
  }

  function setUserInfo(info) {
    userInfo.value = info
    localStorage.setItem('userInfo', JSON.stringify(info))
  }

  async function login(username, password) {
    const data = await request.post('/auth/login', { username, password })
    setToken(data.token)
    setUserInfo(data)
    return data
  }

  async function register(username, password, nickname) {
    const data = await request.post('/auth/register', { username, password, nickname })
    setToken(data.token)
    setUserInfo(data)
    return data
  }

  function logout() {
    request.post('/auth/logout').finally(() => {
      token.value = ''
      userInfo.value = null
      clearAuthStorage()
    })
  }

  return { token, userInfo, login, register, logout, setToken, setUserInfo }
})
