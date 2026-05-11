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
  ready: { type: Boolean, default: true }
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

async function renderMapData() {
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
    return
  }

  // 直接使用后端返回的坐标（后端 buildMapData 已通过 enrichPreciseAddress 确保坐标有效）
  // 只对所有坐标无效的点做 POI 搜索兜底
  const markersWithCoords = await Promise.all(
    markers.map(async (m, idx) => {
      const lat = m.lat || 0
      const lng = m.lng || 0
      
      // 坐标有效，直接使用
      if (lat !== 0 && lng !== 0) {
        return { ...m, lng: lng, lat: lat }
      }
      
      // 坐标无效，尝试 POI 搜索兜底
      console.warn(`[MapView] 标记 ${m.name} 坐标无效，尝试 POI 搜索...`)
      try {
        const result = await poiSearch(m.name, m.address, '')
        if (result) {
          return { ...m, lng: result.lng, lat: result.lat, address: result.address || m.address }
        }
      } catch (e) {
        console.warn(`[MapView] POI搜索失败: ${m.name}`, e)
      }
      
      // 都失败，返回一个标记（坐标为0，后续会被跳过）
      return { ...m, lng: 0, lat: 0 }
    })
  )
  
  // 添加标记点（跳过坐标无效的点）
  let validMarkerCount = 0
  markersWithCoords.forEach((m, idx) => {
    // 跳过坐标无效的点（0,0 是"空岛"，在非洲附近）
    if (!m.lng || !m.lat || m.lng === 0 || m.lat === 0) {
      console.warn(`[MapView] 跳过无效坐标的标记 #${idx}: ${m.name}, lng=${m.lng}, lat=${m.lat}`)
      return
    }
    validMarkerCount++
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
      // 获取类型图标
      const typeIcon = m.type === 'hotel' ? '🏨' : (m.type === 'meal' || m.type === 'restaurant' ? '🍽️' : '🏛️')
      const typeName = m.type === 'hotel' ? '酒店' : (m.type === 'meal' || m.type === 'restaurant' ? '餐厅' : '景点')

      const infoWindow = new window.AMap.InfoWindow({
        content: `
          <div class="map-info-window">
            <div class="info-header" style="background: ${m.color}">
              <span class="info-type">${typeIcon} ${typeName}</span>
              <span class="info-day">Day ${m.day}</span>
            </div>
            <div class="info-body">
              <h4>${m.name}</h4>
              <p class="info-address">📍 ${m.address || '暂无地址信息'}</p>
              ${m.description ? `<p class="info-desc">${m.description}</p>` : ''}
              ${m.price ? `<p class="info-price">💰 ${m.price}</p>` : ''}
              <div class="info-actions">
                <button onclick="window.open('https://uri.amap.com/navigation?to=${m.lng},${m.lat},${encodeURIComponent(m.name)}&mode=car&callnative=1', '_blank')" class="nav-btn">🧭 导航</button>
              </div>
            </div>
          </div>
        `,
        offset: new window.AMap.Pixel(0, -45)
      })
      infoWindow.open(mapInstance, marker.getPosition())
    })

    mapInstance.add(marker)
  })

  // 添加路线（使用POI搜索后的坐标）
  const polylinesWithCoords = polylines.map(pl => {
    if (!pl.points || pl.points.length < 2) {
      console.warn(`[MapView] 跳过无效路线段: day=${pl.day}, 点数不足`)
      return null
    }
    
    // 为路线中的每个点查找POI坐标
    const pointsWithCoords = pl.points.map(p => {
      if (p.lng && p.lat && p.lng !== 0 && p.lat !== 0) {
        return p
      }
      // 如果路线点没有坐标，尝试从markersWithCoords中查找
      const found = markersWithCoords.find(m => m.name === p.name && m.day === p.day)
      if (found) {
        return { ...p, lng: found.lng, lat: found.lat }
      }
      // 如果找不到，使用默认坐标
      const defaultCoord = getDefaultCoord(p.city || '厦门')
      return { ...p, lng: defaultCoord.lng, lat: defaultCoord.lat }
    })
    
    return { ...pl, points: pointsWithCoords }
  }).filter(pl => pl !== null)

  // 添加路线（直接使用后端已通过高德API规划好的路径点坐标画线）
  // 如果后端返回的 points 只有2个点（说明后端路线规划失败，只有起终点），则前端重新调用高德Driving API获取真实路线
  await renderRoutes(polylinesWithCoords)


  if (markersWithCoords.length > 0) {
    mapInstance.setFitView(null, false, [50, 50, 50, 50])
  }
}

// 【新增】高德POI搜索函数
function poiSearch(name, address, city) {
  return new Promise((resolve, reject) => {
    if (!window.AMap) {
      reject(new Error('高德地图API未加载'))
      return
    }

    const keyword = name || address || ''
    const searchCity = city || ''
    
    console.log(`[MapView] POI搜索: keyword=${keyword}, city=${searchCity}`)
    
    window.AMap.plugin('AMap.PlaceSearch', () => {
      const placeSearch = new window.AMap.PlaceSearch({
        city: searchCity,
        pageSize: 1,  // 只要第一个结果
        pageIndex: 1,
        citylimit: false,  // 不过滤城市，允许搜索全国
      })
      
      placeSearch.search(keyword, (status, result) => {
        if (status === 'complete' && result.info === 'OK') {
          const poi = result.poiList.pois[0]
          if (poi) {
            console.log(`[MapView] POI搜索成功: ${keyword} → ${poi.name}, (${poi.location.lng}, ${poi.location.lat})`)
            resolve({
              lng: poi.location.lng,
              lat: poi.location.lat,
              address: poi.address || address
            })
          } else {
            console.warn(`[MapView] POI搜索无结果: ${keyword}`)
            resolve(null)
          }
        } else {
          console.warn(`[MapView] POI搜索失败: ${keyword}, status=${status}, info=${result.info}`)
          resolve(null)
        }
      })
    })
  })
}

// 【新增】获取默认坐标（城市中心）
function getDefaultCoord(city) {
  const cityCenters = {
    '北京': { lat: 39.9042, lng: 116.4074 },
    '上海': { lat: 31.2304, lng: 121.4737 },
    '广州': { lat: 23.1291, lng: 113.2644 },
    '深圳': { lat: 22.5431, lng: 114.0579 },
    '厦门': { lat: 24.4798, lng: 118.0894 },
    '三亚': { lat: 18.2528, lng: 109.5120 },
    '昆明': { lat: 25.0389, lng: 102.7183 },
    '大理': { lat: 25.6065, lng: 100.2676 },
    '丽江': { lat: 26.8721, lng: 100.2299 },
    '成都': { lat: 30.5728, lng: 104.0668 },
    '杭州': { lat: 30.2741, lng: 120.1551 },
    '西安': { lat: 34.3416, lng: 108.9398 }
  }
  
  return cityCenters[city] || cityCenters['厦门']  // 默认厦门
}

// 渲染路线：将所有 polylines 中的点全部打平，按天序排列，统一连线
async function renderRoutes(polylinesWithCoords) {
  // 加载 Driving 插件（只需一次）
  await new Promise((resolve) => {
    window.AMap.plugin('AMap.Driving', () => resolve())
  })

  // 将所有 polylines 中的点全部收集起来（只保留有坐标的点）
  const allPoints = []
  for (const pl of polylinesWithCoords) {
    const points = (pl.points || []).filter(p => p.lng && p.lat && p.lng !== 0 && p.lat !== 0)
    for (const p of points) {
      allPoints.push({ ...p, _day: pl.day, _color: pl.color })
    }
  }

  if (allPoints.length < 2) return

  // 去重：相同坐标的点只保留第一个（避免后端返回的路径中间点干扰）
  const uniquePoints = []
  const seen = new Set()
  for (const p of allPoints) {
    const key = p.lng.toFixed(6) + ',' + p.lat.toFixed(6)
    if (!seen.has(key)) {
      seen.add(key)
      uniquePoints.push(p)
    }
  }

  // 按天排序，同一天内按出现顺序保持原序
  uniquePoints.sort((a, b) => (a._day || 0) - (b._day || 0))

  console.log('[MapView] renderRoutes: 总点数=' + uniquePoints.length + ', points=', uniquePoints.map(p => (p.name || 'unnamed') + '(day' + (p._day || '?') + ')'))

  // 依次连线（相邻两点调用一次 Driving API）
  for (let i = 0; i < uniquePoints.length - 1; i++) {
    const start = uniquePoints[i]
    const end = uniquePoints[i + 1]
    // 用起点的颜色和天信息
    console.log('[MapView] 画线: ' + (start.name || 'unnamed') + ' -> ' + (end.name || 'unnamed'))
    await drawDrivingRoute(start, end, start._color, start._day)
  }
}

// 调用高德 Driving API 规划两点之间的真实道路路线并画线
function drawDrivingRoute(start, end, color, day) {
  return new Promise((resolve) => {
    const driving = new window.AMap.Driving({
      policy: window.AMap.DrivingPolicy.LEAST_TIME,
      map: null
    })

    driving.search(
      [start.lng, start.lat],
      [end.lng, end.lat],
      (status, result) => {
        if (status === 'complete' && result.info === 'OK' && result.routes && result.routes.length > 0) {
          const route = result.routes[0]
          // 从 route.steps 中提取所有路径坐标点（step.polyline 是 "lng,lat;lng,lat;..." 格式）
          const path = []
          for (const step of (route.steps || [])) {
            if (step.polyline) {
              const coords = step.polyline.split(';').map(s => {
                const [lng, lat] = s.split(',').map(Number)
                return [lng, lat]
              })
              path.push(...coords)
            }
          }

          if (path.length >= 2) {
            const polyline = new window.AMap.Polyline({
              path: path,
              strokeColor: color,
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
            console.log('[MapView] 真实路线绘制成功: day=' + day + ' ' + (start.name || '') + '->' + (end.name || '') + ', ' + path.length + '个路径点')
            resolve()
            return
          }
        }

        // 规划失败，降级为直线
        console.warn('[MapView] Driving规划失败，降级为直线: day=' + day, status, result ? result.info : '')
        const fallbackPath = [[start.lng, start.lat], [end.lng, end.lat]]
        const polyline = new window.AMap.Polyline({
          path: fallbackPath,
          strokeColor: color,
          strokeWeight: 4,
          strokeOpacity: 0.5,
          lineJoin: 'round',
          showDir: true,
          dirColor: '#fff'
        })
        mapInstance.add(polyline)
        resolve()
      }
    )
  })
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