<template>
  <div class="map-page">
    <!-- 顶部导航栏 -->
    <div class="map-header">
      <div class="header-left">
        <div class="logo" @click="goBack">
          <span class="logo-icon">🌍</span>
          <span class="logo-text">旅小智</span>
        </div>
        <div class="divider"></div>
        <h2 class="page-title">{{ planTitle }}</h2>
      </div>
      <div class="header-actions">
        <el-button 
          @click="goBack" 
          :icon="ArrowLeft"
          class="action-btn"
        >
          返回对话
        </el-button>
        <el-button 
          @click="openInAMap" 
          type="primary" 
          :icon="MapLocation"
          class="action-btn primary"
        >
          高德导航
        </el-button>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 左侧信息面板 -->
      <div class="info-sidebar" :class="{ collapsed: sidebarCollapsed }">
        <div class="sidebar-toggle" @click="sidebarCollapsed = !sidebarCollapsed">
          <el-icon :class="{ rotated: sidebarCollapsed }"><ArrowLeft /></el-icon>
        </div>
        
        <div class="sidebar-content" v-show="!sidebarCollapsed">
          <!-- 行程概览卡片 -->
          <div class="info-card overview-card" v-if="planInfo">
            <div class="card-header">
              <el-icon><Calendar /></el-icon>
              <span>行程概览</span>
            </div>
            <div class="card-body">
              <div class="info-item">
                <span class="label">📍 目的地</span>
                <span class="value">{{ planInfo.destination || '未设置' }}</span>
              </div>
              <div class="info-item">
                <span class="label">📅 天数</span>
                <span class="value">{{ planInfo.days }} 天</span>
              </div>
              <div class="info-item" v-if="planInfo.budget">
                <span class="label">💰 预算</span>
                <span class="value">¥{{ planInfo.budget }}</span>
              </div>
            </div>
          </div>

          <!-- 路线统计 -->
          <div class="info-card stats-card" v-if="mapData">
            <div class="card-header">
              <el-icon><DataLine /></el-icon>
              <span>路线统计</span>
            </div>
            <div class="card-body">
              <div class="stat-grid">
                <div class="stat-item">
                  <span class="stat-number">{{ attractionCount }}</span>
                  <span class="stat-label">景点总数</span>
                </div>
                <div class="stat-item">
                  <span class="stat-number">{{ dayList.length }}</span>
                  <span class="stat-label">行程天数</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 天数筛选 -->
          <div class="info-card filter-card" v-if="dayList.length > 0">
            <div class="card-header">
              <el-icon><Filter /></el-icon>
              <span>天数筛选</span>
            </div>
            <div class="card-body">
              <div class="day-filters">
                <div 
                  v-for="day in dayList" 
                  :key="day.day"
                  class="day-filter-item"
                  :class="{ active: selectedDay === day.day }"
                  :style="{ borderColor: day.color }"
                  @click="toggleDayFilter(day.day)"
                >
                  <span class="day-dot" :style="{ background: day.color }"></span>
                  <span>第 {{ day.day }} 天</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="action-group">
            <el-button 
              @click="exportMap" 
              :icon="Download"
              class="full-width-btn"
            >
              导出地图
            </el-button>
            <el-button 
              @click="shareMap" 
              :icon="Share"
              class="full-width-btn"
            >
              分享路线
            </el-button>
          </div>
        </div>
      </div>

      <!-- 地图区域 -->
      <div class="map-container">
        <MapView 
          v-if="filteredMapData && filteredMapData.markers?.length > 0" 
          :mapData="filteredMapData" 
        />
        
        <div v-else-if="loading" class="loading-state">
          <el-loading-spinner />
          <p>正在加载地图数据...</p>
        </div>
        
        <div v-else-if="error" class="error-state">
          <el-empty description="地图数据加载失败">
            <template #image>
              <div class="error-icon">⚠️</div>
            </template>
            <el-button @click="loadMapData" type="primary">重新加载</el-button>
          </el-empty>
        </div>
        
        <div v-else class="empty-state">
          <el-empty description="暂无地图数据">
            <template #image>
              <div class="empty-icon">🗺️</div>
            </template>
            <p class="empty-desc">该计划还没有生成地图路线</p>
            <el-button @click="goBack" type="primary">返回生成路线</el-button>
          </el-empty>
        </div>

        <!-- 调试按钮 -->
        <div class="debug-fab" @click="showRawData = true" title="查看原始数据">🐛</div>
      </div>
    </div>
  </div>

  <!-- 调试对话框 -->
  <el-dialog 
    v-model="showRawData" 
    title="原始数据（调试）" 
    width="800px"
    class="debug-dialog"
  >
    <pre class="debug-content">{{ JSON.stringify(rawData, null, 2) }}</pre>
  </el-dialog>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  ArrowLeft, 
  MapLocation, 
  Calendar, 
  DataLine, 
  Filter, 
  Download, 
  Share 
} from '@element-plus/icons-vue'
import MapView from '../components/MapView.vue'
import request from '../utils/request'

const route = useRoute()
const router = useRouter()

const planId = ref(route.params.planId)
const planTitle = ref('旅游路线图')
const planInfo = ref(null)
const mapData = ref(null)
const loading = ref(true)
const error = ref(false)
const showRawData = ref(false)
const rawData = ref(null)
const sidebarCollapsed = ref(false)
const selectedDay = ref(null)

// 前端内存缓存：避免同一 planId 重复请求后端
const mapDataCache = new Map()

// 从后端拿到 plan 数据后，处理 mapData
function processPlanData(plan) {
  if (!plan) {
    return { markers: [], polylines: [] }
  }
  
  console.log('[MapPage] 原始 plan 数据:', JSON.stringify({
    id: plan.id,
    hasMapData: !!plan.mapData,
    mapDataType: typeof plan.mapData,
    mapDataKeys: plan.mapData ? Object.keys(plan.mapData) : [],
    hasPlanContent: !!plan.planContent,
    planContentType: typeof plan.planContent,
    planContentKeys: plan.planContent ? Object.keys(plan.planContent) : [],
    daysCount: plan.planContent?.days?.length ?? 'N/A'
  }, null, 2))

  if (plan.mapData && Array.isArray(plan.mapData.markers) && plan.mapData.markers.length > 0) {
    // 后端已生成有效 mapData，直接使用（最快路径）
    console.log('[MapPage] ✅ 使用后端已存储的 mapData, markers=', plan.mapData.markers.length)
    return plan.mapData
  }
  
  // 后端 mapData 为空或无效，尝试前端实时解析 planContent
  if (plan.planContent) {
    console.log('[MapPage] ⚠️ 后端 mapData 无效，尝试前端解析 planContent')
    const built = buildMapDataFromContent(plan.planContent)
    console.log('[MapPage] 前端解析结果: markers=', built.markers.length, 'polylines=', built.polylines.length)
    
    // 如果前端解析也失败（markers=0），尝试从 planContent 文本中提取表格数据
    if (built.markers.length === 0 && typeof plan.planContent === 'object') {
      console.log('[MapPage] 标准解析无结果，尝试深度提取...')
      return deepExtractMapData(plan.planContent)
    }
    
    return built
  }
  
  return { markers: [], polylines: [] }
}

// 根据筛选条件过滤地图数据
const filteredMapData = computed(() => {
  if (!mapData.value) return null
  if (!selectedDay.value) return mapData.value
  
  return {
    ...mapData.value,
    markers: mapData.value.markers?.filter(m => m.day === selectedDay.value) || [],
    polylines: mapData.value.polylines?.filter(p => p.day === selectedDay.value) || []
  }
})

// 去重天数列表（polylines 每天有多段路线，去重后每天只显示一次）
const dayList = computed(() => {
  if (!mapData.value?.polylines) return []
  const seen = new Set()
  const result = []
  for (const pl of mapData.value.polylines) {
    if (!seen.has(pl.day)) {
      seen.add(pl.day)
      result.push({ day: pl.day, color: pl.color })
    }
  }
  return result
})

// 景点总数（只统计 type=attraction 的标记，不含酒店和餐食）
const attractionCount = computed(() => {
  if (!mapData.value?.markers) return 0
  return mapData.value.markers.filter(m => m.type === 'attraction').length
})

onMounted(() => {
  loadMapData()
})

async function loadMapData() {
  loading.value = true
  error.value = false
  try {
    // 命中缓存，直接返回（同一会话内不重复请求）
    if (mapDataCache.has(planId.value)) {
      console.log('[MapPage] 命中前端缓存，直接使用 planId=' + planId.value)
      const cached = mapDataCache.get(planId.value)
      mapData.value = cached.mapData
      planTitle.value = cached.title
      planInfo.value = cached.planInfo
      rawData.value = cached.raw
      return
    }

    const plan = await request.get(`/plan/${planId.value}`)
    console.log('[MapPage] 计划数据:', plan)
    rawData.value = plan

    if (!plan) {
      mapData.value = { markers: [], polylines: [] }
      return
    }

    planTitle.value = plan.title || '未命名计划'
    planInfo.value = {
      destination: plan.destination || '',
      days: plan.days || 0,
      budget: plan.budget || 0
    }

    // 使用 processPlanData 统一处理，优先用后端 mapData
    const processed = processPlanData(plan)
    mapData.value = processed

    // 写入缓存
    mapDataCache.set(planId.value, {
      mapData: processed,
      title: planTitle.value,
      planInfo: planInfo.value,
      raw: rawData.value
    })
    console.log('[MapPage] 已写入前端缓存, planId=' + planId.value)
  } catch (err) {
    console.error('[MapPage] 加载失败:', err)
    rawData.value = { error: err.message }
    error.value = true
  } finally {
    loading.value = false
  }
}

function buildMapDataFromContent(content) {
  if (!content || !content.days) return { markers: [], polylines: [] }

  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD']
  const markers = []
  const polylines = []

  content.days.forEach((day, dayIdx) => {
    const color = colors[dayIdx % colors.length]
    const activities = day.activities || day.attractions || []
    const points = []

    // 支持两种字段名：latitude/longitude (AI原始) 或 lat/lng (后端转换后)
    activities.forEach((act, actIdx) => {
      const lat = act.lat || act.latitude
      const lng = act.lng || act.longitude
      if (lat && lng && lat !== 0 && lng !== 0) {
        markers.push({
          day: day.day || dayIdx + 1,
          order: actIdx + 1,
          name: act.name,
          lat: lat,
          lng: lng,
          address: act.address || '',
          description: act.description || '',
          color: color,
          type: 'attraction'
        })
        points.push({ lat: lat, lng: lng })
      } else {
        console.log(`[MapPage] 跳过无坐标景点: ${act?.name}, lat=${lat}, lng=${lng}`)
      }
    })

    // 餐食也作为标记点
    ;(day.meals || []).forEach((meal) => {
      const mLat = meal.lat || meal.latitude
      const mLng = meal.lng || meal.longitude
      if (mLat && mLng && mLat !== 0 && mLng !== 0) {
        markers.push({
          day: day.day || dayIdx + 1,
          order: 999,
          name: meal.name,
          lat: mLat, lng: mLng,
          address: meal.address || '',
          color: color,
          type: 'meal'
        })
      }
    })

    // 酒店
    const hotel = day.hotel
    if (hotel?.name) {
      const hLat = hotel.lat || hotel.latitude
      const hLng = hotel.lng || hotel.longitude
      if (hLat && hLng && hLat !== 0 && hLng !== 0) {
        markers.push({
          day: day.day || dayIdx + 1,
          order: 0,
          name: hotel.name + ' (酒店)',
          lat: hLat, lng: hLng,
          address: hotel.address || '',
          color: '#8B5CF6',
          type: 'hotel'
        })
      }
    }
    
    if (points.length > 1) {
      polylines.push({
        day: day.day || dayIdx + 1,
        color: color,
        points: points
      })
    }
  })

  return { markers, polylines }
}

/**
 * 深度提取：从 planContent 的各种嵌套格式中尝试提取坐标数据
 * 兜底方案：当标准解析返回空结果时调用
 */
function deepExtractMapData(content) {
  if (!content) return { markers: [], polylines: [] }

  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD']
  const markers = []
  const polylines = []

  const days = content.days || content.data || content.plan || []
  
  days.forEach((day, dayIdx) => {
    const color = colors[dayIdx % colors.length]
    const dayNum = day.day || day.dayIndex || dayIdx + 1

    // 尝试多个可能的字段名来获取活动列表
    const activities = day.activities || day.attractions || day.items || day.spots || day.places ||
      (Array.isArray(day) ? day : [])
    
    let linePoints = []

    activities.forEach((item, idx) => {
      if (!item?.name) return
      
      const lat = item.lat || item.latitude || item.y
      const lng = item.lng || item.longitude || item.x

      if (lat && lng && lat !== 0 && lng !== 0) {
        markers.push({
          day: dayNum, order: idx + 1, name: item.name,
          address: item.address || '', description: item.description || item.introduction || '',
          time: item.time || item.timeRange || '',
          lat, lng, color, type: 'attraction'
        })
        linePoints.push({ lat, lng, name: item.name })
      }
    })

    if (linePoints.length > 1) {
      polylines.push({ day: dayNum, color, points: linePoints })
    }
  })

  console.log('[MapPage] 深度提取结果: markers=', markers.length, ', polylines=', polylines.length)
  return { markers, polylines }
}

function toggleDayFilter(day) {
  selectedDay.value = selectedDay.value === day ? null : day
}

function goBack() {
  router.push('/')
}

function openInAMap() {
  if (mapData.value?.markers?.length > 0) {
    const first = mapData.value.markers[0]
    const url = `https://uri.amap.com/marker?position=${first.lng},${first.lat}&name=${encodeURIComponent(first.name)}`
    window.open(url, '_blank')
  }
}

function exportMap() {
  // 导出地图功能
  console.log('导出地图')
}

function shareMap() {
  // 分享地图功能
  console.log('分享地图')
}
</script>

<style scoped>
.map-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  overflow: hidden;
}

/* 顶部导航栏 */
.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  height: 64px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.08);
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: transform 0.3s;
}

.logo:hover {
  transform: scale(1.02);
}

.logo-icon {
  font-size: 28px;
}

.logo-text {
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.divider {
  width: 1px;
  height: 24px;
  background: #e5e7eb;
}

.page-title {
  margin: 0;
  font-size: 18px;
  color: #333;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  border-radius: 10px;
  padding: 10px 20px;
  font-weight: 500;
  transition: all 0.3s;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.action-btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
}

/* 主内容区 */
.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}

/* 左侧信息面板 */
.info-sidebar {
  width: 320px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
  border-right: 1px solid rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  position: relative;
  transition: width 0.3s ease;
  z-index: 50;
}

.info-sidebar.collapsed {
  width: 48px;
}

.sidebar-toggle {
  position: absolute;
  right: -12px;
  top: 20px;
  width: 24px;
  height: 24px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 10;
  transition: all 0.3s;
}

.sidebar-toggle:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.sidebar-toggle .el-icon {
  font-size: 14px;
  color: #666;
  transition: transform 0.3s;
}

.sidebar-toggle .el-icon.rotated {
  transform: rotate(180deg);
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 信息卡片 */
.info-card {
  background: white;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.04);
  animation: slideInLeft 0.4s ease-out;
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
  color: #333;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.card-header .el-icon {
  font-size: 18px;
  color: #667eea;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.info-item .label {
  color: #666;
}

.info-item .value {
  font-weight: 600;
  color: #333;
}

/* 统计卡片 */
.stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stat-item {
  text-align: center;
  padding: 12px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
  border-radius: 12px;
}

.stat-number {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: #667eea;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #666;
}

/* 天数筛选 */
.day-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.day-filter-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 20px;
  border: 2px solid transparent;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.3s;
  background: #f5f5f5;
}

.day-filter-item:hover {
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.day-filter-item.active {
  background: white;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.day-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

/* 操作按钮组 */
.action-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: auto;
}

.full-width-btn {
  width: 100%;
  border-radius: 10px;
  padding: 12px;
  font-weight: 500;
}

/* 地图容器 */
.map-container {
  flex: 1;
  position: relative;
  min-height: 0;
  background: #f8fafc;
}

/* 加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
  color: #666;
}

/* 错误状态 */
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.error-icon,
.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-desc {
  color: #999;
  margin: 8px 0 24px;
}

/* 调试对话框 */
.debug-dialog :deep(.el-dialog__body) {
  padding: 0;
}

.debug-content {
  background: #f8f9fa;
  padding: 20px;
  margin: 0;
  border-radius: 0 0 8px 8px;
  overflow: auto;
  max-height: 500px;
  font-size: 12px;
  line-height: 1.6;
}

/* 调试悬浮按钮 */
.debug-fab {
  position: absolute;
  bottom: 24px;
  right: 24px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 200;
  transition: all 0.3s;
  user-select: none;
}
.debug-fab:hover {
  background: rgba(0, 0, 0, 0.8);
  transform: scale(1.1);
}

/* 响应式 */
@media (max-width: 768px) {
  .info-sidebar {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 100;
  }
  
  .info-sidebar.collapsed {
    transform: translateX(-100%);
  }
}
</style>