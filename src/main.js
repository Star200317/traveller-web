import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import ChatView from './views/ChatView.vue'
import LoginView from './views/LoginView.vue'
import MapViewPage from './views/MapViewPage.vue'
import { useUserStore } from './stores/user'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: LoginView },
    { path: '/', component: ChatView, meta: { requiresAuth: true } },
    { path: '/map/:planId', component: MapViewPage, meta: { requiresAuth: true } }
  ]
})

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(ElementPlus)

// 路由守卫在 Pinia 初始化后设置
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  const token = userStore.token || localStorage.getItem('token')

  if (to.meta.requiresAuth && !token) {
    next('/login')
  } else if (to.path === '/login' && token) {
    next('/')
  } else {
    next()
  }
})

// 高德地图 JS API 预加载（在应用启动时静默加载，打开地图页面时直接使用）
const AMAP_KEY = '051b40dc66f3b5e522738f026a027916'
if (!window.AMap) {
  const script = document.createElement('script')
  script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}&callback=onAmapPreload`
  script.onload = () => {
    console.log('[main] 高德地图 API 预加载完成')
  }
  script.onerror = () => {
    console.warn('[main] 高德地图 API 预加载失败，将在地图页面重新加载')
  }
  window.onAmapPreload = () => {
    console.log('[main] 高德地图 API 预加载回调触发')
  }
  document.head.appendChild(script)
}

app.mount('#app')
