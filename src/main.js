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

app.mount('#app')
