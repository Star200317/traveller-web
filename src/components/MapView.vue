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
          v-for="(pl, idx) in mapData.polylines" 
          :key="idx" 
          class="legend-item"
          :class="{ active: activeDay === pl.day }"
          @click="highlightDay(pl.day)"
        >
          <span class="legend-dot" :style="{ background: pl.color }"></span>
          <span class="legend-text">第 {{ pl.day }} 天</span>
          <span class="legend-count">{{ getDayPointCount(pl.day) }} 个景点</span>
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
import { onMounted, watch, ref, nextTick } from 'vue'
import { Plus, Minus, Location, ArrowDown } from '@element-plus/icons-vue'

const props = defineProps({
  mapData: { type: Object, required: true }
})

const mapRef = ref(null)
const mapId = 'amap-container'
let mapInstance = null
let isMapLoading = false
const loading = ref(false)
const activeDay = ref(null)
const activeMarker = ref(null)
const panelCollapsed = ref(false)

onMounted(() => {
  nextTick(() => {
    initMap()
  })
})

watch(() => props.mapData, (newVal) => {
  if (newVal && mapInstance) renderMapData()
})

function initMap() {
  if (isMapLoading) return
  isMapLoading = true
  loading.value = true

  const amapKey = import.meta.env.VITE_AMAP_KEY
  if (!amapKey || amapKey === 'your-amap-js-key') {
    console.error('[AMap] 高德地图API Key未配置')
    loading.value = false
    return
  }

  if (!window.AMap) {
    const script = document.createElement('script')
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${amapKey}&callback=onAmapLoad`
    script.onerror = () => {
      console.error('[AMap] 高德地图脚本加载失败')
      loading.value = false
    }
    document.head.appendChild(script)
    window.onAmapLoad = () => {
      createMap()
      isMapLoading = false
      loading.value = false
    }
  } else {
    createMap()
    isMapLoading = false
    loading.value = false
  }
}

function createMap() {
  const center = props.mapData.center || { lat: 39.9, lng: 116.4 }
  mapInstance = new window.AMap.Map(mapId, {
    zoom: props.mapData.zoom || 12,
    center: [center.lng, center.lat],
    viewMode: '2D',
    mapStyle: 'amap://styles/whitesmoke'
  })
  renderMapData()
}

function renderMapData() {
  if (!mapInstance || !props.mapData) return

  mapInstance.clearMap()
  const { markers = [], polylines = [] } = props.mapData

  // 添加标记点
  markers.forEach((m, idx) => {
    const marker = new window.AMap.Marker({
      position: [m.lng, m.lat],
      title: m.name,
      label: {
        content: `<div class="map-marker-label" style="background:${m.color}">Day${m.day}-${m.order}</div>`,
        offset: new window.AMap.Pixel(0, -35)
      },
      icon: new window.AMap.Icon({
        size: new window.AMap.Size(32, 40),
        image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCAzMiA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cGF0aCBkPSJNMTYgMEM3LjE2IDAgMC43MTYgNi40IDAgMTQuNEMwIDIyLjQgMTYgNDAgMTYgNDBDMTYgNDAgMzIgMjIuNCAzMiAxNC40QzMxLjI4NCA2LjQgMjQuODQgMCAxNiAwWiIgZmlsbD0idXJsKCNncmFkaWVudCkiLz4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iZ3JhZGllbnQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjNjY3ZWVhIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzc2NGJhMiIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICA8L2RlZnM+Cjwvc3ZnPg==',
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
  polylines.forEach(pl => {
    const path = pl.points.map(p => [p.lng, p.lat])
    const polyline = new window.AMap.Polyline({
      path,
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
  return props.mapData.markers.filter(m => m.day === day).length
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