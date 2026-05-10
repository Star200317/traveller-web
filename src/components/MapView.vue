<template>
  <div class="map-view" ref="mapRef">
    <div id="amap-container" class="map-container"></div>
    
    <!-- 地图控制按钮 -->
    <div class="map-controls">
      <el-button 
        circle 
        :icon="Plus" 
        @click="zoomIn"
        class="control-btn"
        title="放大"
      />
      <el-button 
        circle 
        :icon="Minus" 
        @click="zoomOut"
        class="control-btn"
        title="缩小"
      />
      <el-button 
        circle 
        :icon="Location" 
        @click="resetView"
        class="control-btn"
        title="重置视图"
      />
    </div>

    <!-- 图例 -->
    <div class="map-legend" v-if="mapData?.polylines?.length > 0">
      <div class="legend-title">📅 行程安排</div>
      <div class="legend-content">
        <div 
          v-for="day in dayList" 
          :key="day.day" 
          class="legend-item"
          :class="{ active: activeDay === day.day }"
          @click="highlightDay(day.day)"
        >
          <span class="legend-dot" :style="{ background: day.color }"></span>
          <span class="legend-text">第 {{ day.day }} 天</span>
          <span class="legend-count">{{ getDayPointCount(day.day) }} 个景点</span>
        </div>
      </div>
    </div>

    <!-- 景点列表 -->
    <div class="spots-panel" v-if="mapData?.markers?.length > 0" :class="{ collapsed: panelCollapsed }">
      <div class="panel-header" @click="panelCollapsed = !panelCollapsed">
        <span>📍 景点列表</span>
        <el-icon class="collapse-icon" :class="{ rotated: panelCollapsed }"><ArrowDown /></el-icon>
      </div>
      <div class="panel-content" v-show="!panelCollapsed">
        <div 
          v-for="(marker, idx) in mapData.markers" 
          :key="idx"
          class="spot-item"
          :class="{ active: activeMarker === idx }"
          @click="focusOnMarker(idx)"
        >
          <div class="spot-day" :style="{ background: marker.color }">Day{{ marker.day }}</div>
          <div class="spot-info">
            <div class="spot-name">{{ marker.name }}</div>
            <div class="spot-address" v-if="marker.address">{{ marker.address }}</div>
          </div>
          <div class="spot-order">#{{ marker.order }}</div>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="map-loading">
      <el-loading-spinner />
      <span>地图加载中...</span>
    </div>
  </div>
</template>

<script setup>
import { onMounted, watch, ref, nextTick, computed } from 'vue'
import { Plus, Minus, Location, ArrowDown } from '@element-plus/icons-vue'

const props = defineProps({
  mapData: { type: Object, required: true },
  ready: { type: Boolean, default: true }  // 容器是否已就绪（尺寸>0）
})

const mapRef = ref(null)
const mapId = 'amap-container'
let mapInstance = null
let isMapLoading = false
const loading = ref(false)
const activeDay = ref(null)
const activeMarker = ref(null)
const panelCollapsed = ref(false)

// 图例用的去重天数列表（每天一条，避免 polylines 多段路线导致重复显示）
const dayList = computed(() => {
  if (!props.mapData?.polylines) return []
  const seen = new Set()
  const result = []
  for (const pl of props.mapData.polylines) {
    if (!seen.has(pl.day)) {
      seen.add(pl.day)
      result.push({ day: pl.day, color: pl.color })
    }
  }
  return result
})

onMounted(() => {
  // 不再立即初始化，等待父组件通知 ready
})

// 监听 ready 状态变化：当容器就绪后才开始加载地图
watch(() => props.ready, (isReady) => {
  if (isReady && !mapInstance) {
    nextTick(() => initMap())
  }
}, { immediate: true })  // immediate: 如果挂载时已经是 ready，立即执行

watch(() => props.mapData, (newVal) => {
  if (newVal && mapInstance) renderMapData()
})

function initMap() {
  if (isMapLoading) return
  isMapLoading = true
  loading.value = true

  const amapKey = import.meta.env.VITE_AMAP_KEY
  console.log('[AMap] 开始初始化地图, VITE_AMAP_KEY已配置:', !!amapKey && amapKey !== 'your-amap-js-key')
  if (!amapKey || amapKey === 'your-amap-js-key') {
    console.error('[AMap] 高德地图API Key未配置或使用了默认值')
    loading.value = false
    return
  }

  if (!window.AMap) {
    console.log('[AMap] 高德API未加载，开始动态加载脚本...')
    const script = document.createElement('script')
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${amapKey}&callback=onAmapLoad`
    script.onerror = () => {
      console.error('[AMap] 高德地图脚本加载失败，请检查API Key是否有效、网络是否可访问 webapi.amap.com')
      loading.value = false
    }
    document.head.appendChild(script)
    window.onAmapLoad = () => {
      console.log('[AMap] 高德地图API加载成功，开始创建地图实例')
      createMap()
      isMapLoading = false
      loading.value = false
    }
  } else {
    console.log('[AMap] 高德API已存在，直接创建地图实例')
    createMap()
    isMapLoading = false
    loading.value = false
  }
}

function createMap() {
  const center = props.mapData.center || { lat: 39.9, lng: 116.4 }
  console.log('[MapView] 创建地图实例, center:', center, 'zoom:', props.mapData.zoom || 12)
  try {
    mapInstance = new window.AMap.Map(mapId, {
      zoom: props.mapData.zoom || 12,
      center: [center.lng, center.lat],
      viewMode: '2D',
      mapStyle: 'amap://styles/whitesmoke'
    })
    console.log('[MapView] 地图实例创建成功, mapInstance:', !!mapInstance)
  } catch (e) {
    console.error('[MapView] 地图实例创建失败:', e)
    loading.value = false
    return
  }
  renderMapData()
}

function renderMapData() {
  if (!mapInstance) {
    console.warn('[MapView] renderMapData: mapInstance 不存在，跳过渲染')
    return
  }
  if (!props.mapData) {
    console.warn('[MapView] renderMapData: mapData 为空，跳过渲染')
    return
  }

  console.log('[MapView] renderMapData 开始, mapData:', props.mapData)
  mapInstance.clearMap()
  const { markers = [], polylines = [] } = props.mapData
  
  console.log(`[MapView] 共有 ${markers.length} 个标记点, ${polylines.length} 条路线`)
  if (markers.length === 0 && polylines.length === 0) {
    console.warn('[MapView] ⚠️ markers 和 polylines 均为空，地图上不会有任何内容！请检查后端返回的 plan.mapData 数据')
  }
  markers.forEach((m, idx) => {
    console.log(`[MapView] 标记 ${idx}: name=${m.name}, lat=${m.lat}, lng=${m.lng}, day=${m.day}, type=${m.type}`)
  })

  // 添加标记点
  markers.forEach((m, idx) => {
    // 跳过无效坐标的标记
    if (!m.lat || !m.lng || m.lat === 0 || m.lng === 0) {
      console.warn(`[MapView] 跳过无效坐标标记: ${m.name}, lat=${m.lat}, lng=${m.lng}`)
      return
    }
    // 根据类型选择颜色：酒店用紫色，景点用当天路线颜色
    const markerColor = m.type === 'hotel' ? '#8B5CF6' : m.color
    
    // 动态生成标记图标
    const markerIconSvg = `
      <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.16 0 0.716 6.4 0 14.4C0 22.4 16 40 16 40C16 40 32 22.4 32 14.4C31.284 6.4 24.84 0 16 0Z" fill="${markerColor}"/>
        <circle cx="16" cy="14" r="6" fill="white"/>
      </svg>
    `
    
    const marker = new window.AMap.Marker({
      position: [m.lng, m.lat],
      title: m.name,
      label: {
        content: `<div class="map-marker-label" style="background:${markerColor}">${m.type === 'hotel' ? '酒店' : 'Day' + m.day + '-' + m.order}</div>`,
        offset: new window.AMap.Pixel(0, -35)
      },
      icon: new window.AMap.Icon({
        size: new window.AMap.Size(32, 40),
        image: 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(markerIconSvg))),
        imageSize: new window.AMap.Size(32, 40)
      })
    })

    marker.extData = { index: idx, ...m }
    
    marker.on('click', () => {
      activeMarker.value = idx
      const infoWindow = new window.AMap.InfoWindow({
        content: `
          <div class="map-info-window">
            <div class="info-header" style="background: ${m.color}">
              <span class="info-day">Day ${m.day}</span>
              <span class="info-order">#${m.order}</span>
            </div>
            <div class="info-body">
              <h4>${m.name}</h4>
              <p class="info-address">${m.address || '暂无地址信息'}</p>
              <p class="info-desc">${m.description || ''}</p>
            </div>
          </div>
        `,
        offset: new window.AMap.Pixel(0, -45)
      })
      infoWindow.open(mapInstance, marker.getPosition())
    })

    mapInstance.add(marker)
  })

  // 添加路线
  polylines.forEach((pl, idx) => {
    // 跳过点数不足2个的路线（无法构成线段）
    if (!pl.points || pl.points.length < 2) {
      console.warn(`[MapView] 跳过无效路线段 #${idx}: 点数不足, day=${pl.day}`)
      return
    }
    const path = pl.points.map(p => [p.lng, p.lat])
    // 再次过滤无效坐标点
    const validPath = path.filter(([lng, lat]) => lng && lat && lng !== 0 && lat !== 0)
    if (validPath.length < 2) {
      console.warn(`[MapView] 跳过无效路线段 #${idx}: 有效点数不足, day=${pl.day}`)
      return
    }
    const polyline = new window.AMap.Polyline({
      path: validPath,
      strokeColor: pl.color,
      strokeWeight: 5,
      strokeOpacity: 0.8,
      lineJoin: 'round',
      showDir: true,
      dirColor: '#fff',
      isOutline: true,
      outlineColor: 'rgba(0,0,0,0.2)',
      borderWeight: 1
    })
    mapInstance.add(polyline)
  })

  if (markers.length > 0) {
    mapInstance.setFitView(null, false, [50, 50, 50, 50])
  }
}

function zoomIn() {
  if (mapInstance) mapInstance.zoomIn()
}

function zoomOut() {
  if (mapInstance) mapInstance.zoomOut()
}

function resetView() {
  if (mapInstance && props.mapData?.markers?.length > 0) {
    mapInstance.setFitView(null, false, [50, 50, 50, 50])
  }
}

function highlightDay(day) {
  activeDay.value = activeDay.value === day ? null : day
  // 这里可以添加高亮特定天数路线的逻辑
}

function focusOnMarker(idx) {
  if (mapInstance && props.mapData?.markers?.length > idx) {
    const marker = props.mapData.markers[idx]
    mapInstance.setCenter([marker.lng, marker.lat])
    mapInstance.setZoom(16)
    activeMarker.value = idx
  }
}

function getDayPointCount(day) {
  if (!props.mapData?.markers) return 0
  // 只统计 type=attraction 的标记，不含酒店和餐食
  return props.mapData.markers.filter(m => m.day === day && m.type === 'attraction').length
}
</script>

<style scoped>
.map-view {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.map-container {
  width: 100%;
  height: 100%;
}

/* 地图控制按钮 */
.map-controls {
  position: absolute;
  top: 20px;
  left: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 100;
}

.control-btn {
  width: 40px;
  height: 40px;
  background: white;
  border: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
}

.control-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

/* 图例 */
.map-legend {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 16px;
  padding: 16px;
  min-width: 180px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  z-index: 100;
  animation: slideInRight 0.3s ease-out;
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.legend-title {
  font-weight: 600;
  font-size: 14px;
  color: #333;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.legend-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
}

.legend-item:hover {
  background: #f5f5f5;
}

.legend-item.active {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-text {
  font-weight: 500;
  font-size: 13px;
  color: #333;
}

.legend-count {
  margin-left: auto;
  font-size: 11px;
  color: #999;
  background: #f5f5f5;
  padding: 2px 8px;
  border-radius: 10px;
}

/* 景点面板 */
.spots-panel {
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  z-index: 100;
  max-height: 300px;
  width: 280px;
  transition: all 0.3s;
  animation: slideInUp 0.3s ease-out;
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.spots-panel.collapsed {
  max-height: 50px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  font-weight: 600;
  font-size: 14px;
  color: #333;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.3s;
}

.panel-header:hover {
  background: #f9f9f9;
}

.collapse-icon {
  transition: transform 0.3s;
}

.collapse-icon.rotated {
  transform: rotate(180deg);
}

.panel-content {
  max-height: 230px;
  overflow-y: auto;
  padding: 8px;
}

.spot-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
  margin-bottom: 4px;
}

.spot-item:hover {
  background: #f5f5f5;
}

.spot-item.active {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
}

.spot-day {
  font-size: 10px;
  color: white;
  padding: 3px 6px;
  border-radius: 4px;
  font-weight: 600;
  flex-shrink: 0;
}

.spot-info {
  flex: 1;
  min-width: 0;
}

.spot-name {
  font-weight: 500;
  font-size: 13px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.spot-address {
  font-size: 11px;
  color: #999;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.spot-order {
  font-size: 11px;
  color: #ccc;
  font-weight: 600;
}

/* 加载状态 */
.map-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.95);
  padding: 30px 50px;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  z-index: 200;
}

/* 自定义标记标签 */
:deep(.map-marker-label) {
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

/* 信息窗口样式 */
:deep(.map-info-window) {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  min-width: 200px;
}

:deep(.info-header) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  color: white;
}

:deep(.info-day) {
  font-weight: 600;
  font-size: 12px;
}

:deep(.info-order) {
  font-size: 11px;
  opacity: 0.9;
}

:deep(.info-body) {
  padding: 14px;
}

:deep(.info-body h4) {
  margin: 0 0 8px;
  font-size: 15px;
  color: #333;
}

:deep(.info-address) {
  font-size: 12px;
  color: #666;
  margin: 0 0 6px;
}

:deep(.info-desc) {
  font-size: 12px;
  color: #999;
  margin: 0;
  line-height: 1.5;
}
</style>