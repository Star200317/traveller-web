<template>
  <div class="plan-generate-container">
    <!-- 左侧地图区域 -->
    <div class="map-panel">
      <div id="planMapContainer" class="map-container"></div>
      <!-- 地图控制按钮 -->
      <div class="map-controls">
        <el-button-group>
          <el-button :icon="ZoomIn" @click="mapZoomIn" />
          <el-button :icon="ZoomOut" @click="mapZoomOut" />
          <el-button :icon="Location" @click="fitView" />
        </el-button-group>
      </div>
    </div>

    <!-- 右侧行程编辑区域 -->
    <div class="plan-panel">
      <!-- 顶部操作栏 -->
      <div class="plan-header">
        <div class="header-left">
          <el-button text @click="goBack">
            <el-icon><ArrowLeft /></el-icon>
            返回
          </el-button>
          <el-input
            v-model="planName"
            class="plan-title-input"
            placeholder="请输入计划名称"
            size="large"
          />
        </div>
        <div class="header-right">
          <el-button type="primary" @click="savePlan" :loading="saving">
            保存计划
          </el-button>
        </div>
      </div>

      <!-- Tab标签页 -->
      <div class="plan-tabs">
        <el-tabs v-model="activeTab" type="border-card" @tab-change="onTabChange">
          <el-tab-pane name="overview">
            <template #label>
              <span class="tab-label">总览</span>
            </template>
          </el-tab-pane>
          <el-tab-pane name="unplanned">
            <template #label>
              <span class="tab-label">
                待计划
                <el-badge :value="unplannedItems.length" :max="99" v-if="unplannedItems.length > 0" />
              </span>
            </template>
          </el-tab-pane>
          <el-tab-pane
            v-for="(day, index) in days"
            :key="index"
            :label="day.label"
            :name="'day-' + index"
          >
            <template #label>
              <span class="tab-label">
                {{ day.label }}
                <el-icon class="tab-delete" @click.stop="deleteDay(index)">
                  <Close />
                </el-icon>
              </span>
            </template>
          </el-tab-pane>
          <el-tab-pane name="add">
            <template #label>
              <el-icon><Plus /></el-icon>
            </template>
          </el-tab-pane>
        </el-tabs>
      </div>

      <!-- 行程列表 -->
      <div class="plan-content">
        <!-- 总览视图 -->
        <div v-if="activeTab === 'overview'" class="overview-content">
          <div class="overview-header">
            <span class="overview-title">所有地点 ({{ allItems.length }})</span>
          </div>
          <div class="overview-list">
            <div
              v-for="(place, index) in allItems"
              :key="place.id"
              class="overview-item"
              @click="editItem(place)"
            >
              <div class="overview-number">{{ index + 1 }}</div>
              <div class="overview-info">
                <div class="overview-header">
                  <el-tag :type="getTypeTagType(place.type)" size="small">
                    {{ getTypeLabel(place.type) }}
                  </el-tag>
                  <span class="overview-name">{{ place.name }}</span>
                </div>
                <div class="overview-address">{{ place.address || '暂无地址' }}</div>
                <div class="overview-meta">
                  <span v-if="place.dayLabel" class="overview-day">{{ place.dayLabel }}</span>
                  <span v-if="place.orderIndex" class="overview-order">第 {{ place.orderIndex }} 站</span>
                  <span v-if="place.duration">{{ place.duration }}</span>
                </div>
              </div>
              <el-icon class="overview-arrow"><ArrowRight /></el-icon>
            </div>
          </div>
        </div>

        <!-- 按日视图 -->
        <div v-if="activeTab.startsWith('day-')" class="day-content">
          <div class="day-header">
            <span class="day-title">{{ currentDay?.label }}</span>
            <span class="day-info">共 {{ currentDayItems.length }} 个地点</span>
          </div>
          <div v-if="currentDayItems.length > 1" class="day-sort-toolbar">
            <span class="sort-hint">支持拖拽排序，也可以输入序号后点击“应用排序”</span>
            <el-button size="small" @click="applyManualSort">应用排序</el-button>
          </div>
          <div class="day-list">
            <div
              v-for="(place, index) in currentDayItems"
              :key="place.id"
              class="day-item"
              draggable="true"
              @dragstart="handleDragStart(index)"
              @dragover.prevent
              @drop="handleDrop(index)"
              @click="editItem(place)"
            >
              <div class="item-number">{{ index + 1 }}</div>
              <div class="item-image">
                <el-image
                  v-if="place.image"
                  :src="place.image"
                  fit="cover"
                  class="place-image"
                >
                  <template #error>
                    <div class="image-placeholder">
                      {{ getTypeEmoji(place.type) }}
                    </div>
                  </template>
                </el-image>
                <div v-else class="image-placeholder">
                  {{ getTypeEmoji(place.type) }}
                </div>
              </div>
              <div class="item-info">
                <div class="item-header">
                  <el-tag :type="getTypeTagType(place.type)" size="small">
                    {{ getTypeLabel(place.type) }}
                  </el-tag>
                  <span class="item-name">{{ place.name }}</span>
                </div>
                <div class="item-address">{{ place.address }}</div>
                <div class="item-meta">
                  <span class="sort-order-input" @click.stop>
                    <span>序号</span>
                    <el-input-number
                      v-model="place.sortOrder"
                      :min="1"
                      :max="currentDayItems.length"
                      size="small"
                    />
                  </span>
                  <span v-if="place.duration">
                    <el-icon><Clock /></el-icon>
                    {{ place.duration }}
                  </span>
                  <span v-if="place.price">{{ place.price }}</span>
                </div>
              </div>
              <div class="item-actions">
                <el-button text size="small" @click.stop="moveItem(place, -1)" :disabled="index === 0">
                  上移
                </el-button>
                <el-button text size="small" @click.stop="moveItem(place, 1)" :disabled="index === currentDayItems.length - 1">
                  下移
                </el-button>
                <el-button text size="small" @click.stop="editItem(place)">
                  <el-icon><Edit /></el-icon>
                </el-button>
                <el-button text size="small" @click.stop="removeItem(place)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>

            <div v-if="currentDayItems.length === 0" class="empty-day">
              <el-empty description="今日暂无安排" />
            </div>
          </div>
        </div>

        <!-- 待计划视图 -->
        <div v-else-if="activeTab === 'unplanned'" class="unplanned-content">
          <div class="unplanned-header">
            <span>待分配的地点</span>
            <el-button size="small" @click="showPlaceSelector">
              <el-icon><Plus /></el-icon>
              添加地点
            </el-button>
          </div>
          <div class="unplanned-list">
            <div
              v-for="place in unplannedItems"
              :key="place.id"
              class="unplanned-item"
              @click="editItem(place)"
            >
              <div class="item-image">
                <el-image
                  v-if="place.image"
                  :src="place.image"
                  fit="cover"
                  class="place-image"
                >
                  <template #error>
                    <div class="image-placeholder">
                      {{ getTypeEmoji(place.type) }}
                    </div>
                  </template>
                </el-image>
                <div v-else class="image-placeholder">
                  {{ getTypeEmoji(place.type) }}
                </div>
              </div>
              <div class="item-info">
                <div class="item-header">
                  <el-tag :type="getTypeTagType(place.type)" size="small">
                    {{ getTypeLabel(place.type) }}
                  </el-tag>
                  <span class="item-name">{{ place.name }}</span>
                </div>
                <div class="item-address">{{ place.address }}</div>
              </div>
              <el-button text size="small" @click.stop="assignToDay(place)">
                分配日期
              </el-button>
            </div>

            <div v-if="unplannedItems.length === 0" class="empty-unplanned">
              <el-empty description="暂无待计划地点" />
            </div>
          </div>
        </div>

        <!-- 添加日视图 -->
        <div v-else-if="activeTab === 'add'" class="add-day-content">
          <div class="add-day-form">
            <el-form :model="newDayForm" label-width="80px">
              <el-form-item label="开始日期">
                <el-date-picker
                  v-model="newDayForm.startDate"
                  type="date"
                  placeholder="选择开始日期"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                  :disabled-date="disabledDate"
                />
              </el-form-item>
              <el-form-item label="行程天数">
                <el-input-number
                  v-model="newDayForm.days"
                  :min="1"
                  :max="30"
                  @change="onDaysChange"
                />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="addDays">添加行程日</el-button>
              </el-form-item>
            </el-form>
          </div>
        </div>
      </div>

      <!-- 底部操作栏 -->
      <div class="plan-footer">
        <el-button @click="showPlaceSelector()">
          <el-icon><Plus /></el-icon>
          添加地点
        </el-button>
        <el-button @click="showPlaceSelector('hotel')">
          <el-icon><House /></el-icon>
          添加住宿
        </el-button>
        <el-button @click="showPlaceSelector('attraction')">
          <el-icon><Location /></el-icon>
          添加景点
        </el-button>
        <el-button @click="showPlaceSelector('restaurant')">
          <el-icon><Food /></el-icon>
          添加餐饮
        </el-button>
      </div>
    </div>

    <!-- 地点选择对话框 -->
    <el-dialog
      v-model="showPlaceDialog"
      title="选择地点"
      width="900px"
      :destroy-on-close="true"
    >
      <div class="place-selector">
        <!-- 筛选条件 -->
        <div class="place-filters">
          <el-select
            v-model="placeFilter.city"
            placeholder="选择城市"
            clearable
            filterable
            @change="loadPlaces"
          >
            <el-option
              v-for="(city, idx) in cities"
              :key="city + '-' + idx"
              :label="String(city)"
              :value="String(city)"
            />
          </el-select>
          <el-select
            v-model="placeFilter.type"
            placeholder="地点类型"
            clearable
            @change="loadPlaces"
          >
            <el-option label="景点" value="attraction" />
            <el-option label="酒店" value="hotel" />
            <el-option label="餐厅" value="restaurant" />
          </el-select>
          <el-input
            v-model="placeFilter.keyword"
            placeholder="搜索地点名称"
            clearable
            @input="debouncedSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>

        <!-- 地点列表 -->
        <div class="place-list">
          <div
            v-for="place in filteredPlaces"
            :key="place.id"
            class="place-item"
            :class="{ selected: selectedPlaceIds.has(place.id) }"
            @click="togglePlaceSelection(place)"
          >
            <el-checkbox
              :model-value="selectedPlaceIds.has(place.id)"
              @click.stop
              @change="togglePlaceSelection(place)"
            />
            <div class="place-info">
              <div class="place-name">{{ place.name }}</div>
              <div class="place-address">{{ place.address }}</div>
            </div>
            <el-tag :type="getTypeTagType(place.type)" size="small">
              {{ getTypeLabel(place.type) }}
            </el-tag>
          </div>

          <el-empty v-if="filteredPlaces.length === 0" description="暂无地点" />
        </div>

        <!-- 已选地点 -->
        <div class="selected-places" v-if="tempSelectedPlaces.length > 0">
          <div class="selected-header">
            已选择 {{ tempSelectedPlaces.length }} 个地点
          </div>
          <div class="selected-tags">
            <el-tag
              v-for="place in tempSelectedPlaces"
              :key="place.id"
              closable
              @close="removeTempSelection(place)"
            >
              {{ place.name }}
            </el-tag>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="showPlaceDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmPlaceSelection">
          确认为待计划
        </el-button>
      </template>
    </el-dialog>

    <!-- 地点编辑对话框 -->
    <el-dialog
      v-model="showEditDialog"
      title="编辑地点"
      width="500px"
    >
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="地点名称">
          <el-input v-model="editForm.name" readonly />
        </el-form-item>
        <el-form-item label="分配日期">
          <el-select v-model="editForm.dayDate" placeholder="选择日期" clearable>
            <el-option
              v-for="day in days"
              :key="day.date"
              :label="day.label"
              :value="day.date"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="editForm.notes"
            type="textarea"
            :rows="3"
            placeholder="添加备注信息"
          />
        </el-form-item>
        <el-form-item label="游玩时长">
          <el-input v-model="editForm.duration" placeholder="如：2小时" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button type="danger" plain @click="deleteItemFromEdit" style="margin-right: auto;">
          <el-icon><Delete /></el-icon>
          删除地点
        </el-button>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" @click="saveItemEdit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 日期分配对话框 -->
    <el-dialog
      v-model="showDayAssignDialog"
      title="分配到日期"
      width="400px"
    >
      <el-form :model="assignForm" label-width="80px">
        <el-form-item label="选择日期">
          <el-select v-model="assignForm.dayDate" placeholder="选择日期">
            <el-option
              v-for="day in days"
              :key="day.date"
              :label="day.label"
              :value="day.date"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showDayAssignDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmDayAssign">确认分配</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus, ArrowLeft, ArrowRight, Edit, Delete, Clock, Search,
  House, Location, Food, ZoomIn, ZoomOut, Close
} from '@element-plus/icons-vue'
import { getPlaceList, getAllCities } from '@/api/place'
import { savePlan as savePlanApi, getPlanDTO } from '@/api/plan'
import request from '@/utils/request'

const router = useRouter()
const route = useRoute()

// 当前计划ID（如果有）
const currentPlanId = ref(route.params.planId || null)

// 状态
const planName = ref('我的旅行计划')
const saving = ref(false)
const activeTab = ref('overview')
const days = ref([])
const allItems = ref([])
const unplannedItems = ref([])
const draggingIndex = ref(null)

// 地图相关
let map = null
let markers = []
let polylines = []

// 地点选择相关
const showPlaceDialog = ref(false)
const cities = ref([])
const filteredPlaces = ref([])
const selectedPlaceIds = ref(new Set())
const tempSelectedPlaces = ref([])
const placeFilter = reactive({
  city: '',
  type: '',
  keyword: ''
})

// 监听城市选择变化，调试用
watch(() => placeFilter.city, (newVal, oldVal) => {
  console.log('[watch] placeFilter.city 变化:', { oldVal, newVal, typeOfNew: typeof newVal })
})

// 监听 Tab 切换，更新地图显示
watch(activeTab, (newTab, oldTab) => {
  console.log('[watch] Tab 切换:', { from: oldTab, to: newTab })
  nextTick(() => {
    updateMapMarkers()
  })
})

// 编辑相关
const showEditDialog = ref(false)
const editForm = reactive({
  id: null,
  name: '',
  dayDate: '',
  notes: '',
  duration: ''
})

// 日期分配相关
const showDayAssignDialog = ref(false)
const assignForm = reactive({
  place: null,
  dayDate: ''
})

// 新增日期表单
const newDayForm = reactive({
  startDate: '',
  days: 3
})

// 计算属性
const currentDayItems = computed(() => {
  const index = parseInt(activeTab.value.replace('day-', ''))
  return days.value[index]?.items || []
})

const currentDay = computed(() => {
  const index = parseInt(activeTab.value.replace('day-', ''))
  return days.value[index] || null
})

const DAY_ROUTE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6', '#F97316', '#EC4899']

const getDayColor = (dayIndex) => DAY_ROUTE_COLORS[dayIndex % DAY_ROUTE_COLORS.length]

const normalizeDayItemsOrder = (day) => {
  if (!day?.items) return
  day.items = [...day.items]
    .sort((a, b) => (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER))
    .map((place, index) => ({
      ...place,
      sortOrder: index + 1
    }))
}

const syncDayItemsSortOrder = (day) => {
  if (!day?.items) return
  day.items = day.items.map((place, index) => ({
    ...place,
    sortOrder: index + 1
  }))
}

const normalizeAllDaysOrder = () => {
  days.value.forEach(normalizeDayItemsOrder)
}

// 方法
const getTypeLabel = (type) => {
  const map = {
    hotel: '住宿',
    attraction: '景点',
    restaurant: '餐饮',
    transport: '交通'
  }
  return map[type] || type
}

const getTypeTagType = (type) => {
  const map = {
    hotel: 'warning',
    attraction: 'success',
    restaurant: 'danger',
    transport: 'info'
  }
  return map[type] || ''
}

const getTypeEmoji = (type) => {
  const map = {
    hotel: '🏨',
    attraction: '🎢',
    restaurant: '🍜',
    transport: '🚗'
  }
  return map[type] || '📍'
}

const initMap = () => {
  nextTick(() => {
    if (!window.AMap) {
      // 如果地图未加载，延迟重试
      setTimeout(initMap, 500)
      return
    }

    map = new window.AMap.Map('planMapContainer', {
      zoom: 12,
      center: [116.397428, 39.90923], // 默认北京
      viewMode: '2D'
    })

    updateMapMarkers()
  })
}

const clearMapOverlays = () => {
  if (!map) return
  if (markers.length > 0) {
    map.remove(markers)
    markers = []
  }
  if (polylines.length > 0) {
    map.remove(polylines)
    polylines = []
  }
}

const buildMapGroups = () => {
  if (activeTab.value === 'overview') {
    return days.value
      .map((day, index) => ({
        day,
        index,
        items: [...(day.items || [])].filter(item => item.longitude && item.latitude)
      }))
      .filter(group => group.items.length > 0)
  }

  if (activeTab.value === 'unplanned') {
    return [{
      day: { label: '待计划', date: null },
      index: 0,
      items: [...unplannedItems.value].filter(item => item.longitude && item.latitude)
    }]
  }

  if (activeTab.value.startsWith('day-')) {
    const dayIndex = parseInt(activeTab.value.replace('day-', ''))
    const day = days.value[dayIndex]
    if (!day) return []
    return [{
      day,
      index: dayIndex,
      items: [...(day.items || [])].filter(item => item.longitude && item.latitude)
    }]
  }

  return []
}

const buildMarkerContent = (label, color) =>
  `<div class="custom-marker" style="background:${color}">${label}</div>`

const fallbackPath = (start, end) => [[start.longitude, start.latitude], [end.longitude, end.latitude]]

const fetchDrivingSegments = async (items) => {
  try {
    const response = await request.post('/plan/route/driving', {
      points: items.map(item => ({
        name: item.name,
        lng: item.longitude,
        lat: item.latitude
      }))
    })
    return response?.segments || []
  } catch (error) {
    console.error('[PlanGenerate] 获取真实路线失败，回退为直线', error)
    return []
  }
}

const drawDayRoutes = async (items, color) => {
  const segments = await fetchDrivingSegments(items)

  for (let i = 0; i < items.length - 1; i++) {
    const start = items[i]
    const end = items[i + 1]
    const routePath = segments[i]?.path
    const path = Array.isArray(routePath) && routePath.length > 1
      ? routePath.map(point => Array.isArray(point) ? point : [point.lng, point.lat])
      : fallbackPath(start, end)

    const line = new window.AMap.Polyline({
      path,
      strokeColor: color,
      strokeWeight: 5,
      strokeOpacity: 0.85,
      lineJoin: 'round',
      showDir: true,
      dirColor: '#ffffff'
    })
    polylines.push(line)
  }
}

const updateMapMarkers = async () => {
  if (!map) return

  clearMapOverlays()
  normalizeAllDaysOrder()

  const groups = buildMapGroups()

  for (const group of groups) {
    const color = getDayColor(group.index)
    group.items.forEach((place, index) => {
      const marker = new window.AMap.Marker({
        position: [place.longitude, place.latitude],
        content: buildMarkerContent(index + 1, color),
        offset: new window.AMap.Pixel(-15, -15)
      })
      const infoWindow = new window.AMap.InfoWindow({
        content: `<div class="info-window"><h4>${place.name}</h4><p>${group.day.label || ''} · 第 ${index + 1} 站</p><p>${place.address || ''}</p></div>`
      })
      marker.on('click', () => infoWindow.open(map, marker.getPosition()))
      markers.push(marker)
    })

    if (group.items.length > 1 && activeTab.value !== 'unplanned') {
      await drawDayRoutes(group.items, color)
    }
  }

  if (markers.length > 0) {
    map.add(markers)
  }
  if (polylines.length > 0) {
    map.add(polylines)
  }
  if (markers.length > 0 || polylines.length > 0) {
    map.setFitView()
  }
}

const mapZoomIn = () => map?.zoomIn()
const mapZoomOut = () => map?.zoomOut()
const fitView = () => map?.setFitView()

const loadCities = async () => {
  try {
    const data = await getAllCities()
    console.log('[loadCities] 原始数据:', JSON.stringify(data))
    console.log('[loadCities] 数据类型:', typeof data, '是否数组:', Array.isArray(data))
    if (Array.isArray(data)) {
      cities.value = data.map((item, idx) => {
        if (typeof item === 'string') return item.trim()
        if (item && typeof item === 'object') {
          const name = item.name || item.city || item.cityName || ''
          if (typeof name === 'string' && name.trim()) return name.trim()
          console.warn('[loadCities] 城市名称不是字符串:', name, typeof name)
          return ''
        }
        const str = String(item || '').trim()
        return str || ''
      }).filter(Boolean)
      console.log('[loadCities] cities.value 结果:', JSON.stringify(cities.value))
    } else {
      console.warn('[loadCities] 返回数据不是数组，原始值:', data)
      cities.value = []
    }
  } catch (e) {
    console.error('加载城市列表失败:', e)
    cities.value = []
  }
}

const loadPlaces = async () => {
  try {
    console.log('[loadPlaces] 开始加载地点，筛选条件:', JSON.stringify(placeFilter))
    const params = {}
    if (placeFilter.city) params.city = placeFilter.city
    if (placeFilter.type) params.type = placeFilter.type
    console.log('[loadPlaces] 请求参数:', params)

    let data = await getPlaceList(params)
    console.log('[loadPlaces] 返回数据数量:', data?.length, '前5条:', JSON.stringify(data?.slice(0, 5)))

    // 关键词过滤
    if (placeFilter.keyword) {
      const keyword = placeFilter.keyword.toLowerCase()
      data = data.filter(p =>
        p.name?.toLowerCase().includes(keyword) ||
        p.address?.toLowerCase().includes(keyword)
      )
    }

    filteredPlaces.value = data || []
  } catch (e) {
    console.error('加载地点列表失败:', e)
  }
}

let searchTimer = null
const debouncedSearch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(loadPlaces, 300)
}

const showPlaceSelector = (type) => {
  // 防御：防止误传事件对象
  if (typeof type !== 'string') type = ''
  placeFilter.type = type || ''
  // 保留城市选择，不清空
  // placeFilter.city = ''  // 注释掉，保留上次选择的城市
  placeFilter.keyword = ''
  tempSelectedPlaces.value = []
  selectedPlaceIds.value = new Set()
  showPlaceDialog.value = true
  loadPlaces()
}

const togglePlaceSelection = (place) => {
  const id = place.id
  if (selectedPlaceIds.value.has(id)) {
    selectedPlaceIds.value.delete(id)
    tempSelectedPlaces.value = tempSelectedPlaces.value.filter(p => p.id !== id)
  } else {
    selectedPlaceIds.value.add(id)
    tempSelectedPlaces.value.push(place)
  }
}

const removeTempSelection = (place) => {
  selectedPlaceIds.value.delete(place.id)
  tempSelectedPlaces.value = tempSelectedPlaces.value.filter(p => p.id !== place.id)
}

const confirmPlaceSelection = () => {
  tempSelectedPlaces.value.forEach(place => {
    const newItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      placeId: place.id,
      name: place.name,
      address: place.address,
      type: place.type,
      city: place.city,
      longitude: place.longitude,
      latitude: place.latitude,
      price: place.price,
      notes: '',
      duration: '',
      dayDate: null,
      sortOrder: null
    }
    unplannedItems.value.push(newItem)
  })

  updateAllItems()
  showPlaceDialog.value = false
  ElMessage.success(`已添加 ${tempSelectedPlaces.value.length} 个地点到待计划`)
}

const editItem = (place) => {
  editForm.id = place.id
  editForm.name = place.name
  editForm.dayDate = place.dayDate || ''
  editForm.notes = place.notes || ''
  editForm.duration = place.duration || ''
  showEditDialog.value = true
}

const saveItemEdit = () => {
  const place = allItems.value.find(i => i.id === editForm.id)
  if (place) {
    // 从原位置移除
    if (place.dayDate) {
      const oldDay = days.value.find(d => d.date === place.dayDate)
      if (oldDay) {
        const idx = oldDay.items.findIndex(i => i.id === place.id)
        if (idx >= 0) oldDay.items.splice(idx, 1)
      }
    } else {
      const idx = unplannedItems.value.findIndex(i => i.id === place.id)
      if (idx >= 0) unplannedItems.value.splice(idx, 1)
    }

    // 更新数据
    place.dayDate = editForm.dayDate || null
    place.notes = editForm.notes
    place.duration = editForm.duration

    // 添加到新位置
    if (editForm.dayDate) {
      const newDay = days.value.find(d => d.date === editForm.dayDate)
      if (newDay) {
        place.sortOrder = (newDay.items?.length || 0) + 1
        newDay.items.push(place)
      }
    } else {
      place.sortOrder = null
      unplannedItems.value.push(place)
    }

    updateAllItems()
  }
  showEditDialog.value = false
}

// 从编辑对话框中删除当前地点
const deleteItemFromEdit = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除地点「${editForm.name}」吗？`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
  } catch {
    return
  }

  const place = allItems.value.find(i => i.id === editForm.id)
  if (place) {
    removeItem(place)
  }
  showEditDialog.value = false
  ElMessage.success('已删除该地点')
}

const removeItem = (place) => {
  // 从所有列表中移除
  const idx = allItems.value.findIndex(i => i.id === place.id)
  if (idx >= 0) allItems.value.splice(idx, 1)

  if (place.dayDate) {
    const day = days.value.find(d => d.date === place.dayDate)
    if (day) {
      const dayIdx = day.items.findIndex(i => i.id === place.id)
      if (dayIdx >= 0) day.items.splice(dayIdx, 1)
    }
  } else {
    const upIdx = unplannedItems.value.findIndex(i => i.id === place.id)
    if (upIdx >= 0) unplannedItems.value.splice(upIdx, 1)
  }

  updateMapMarkers()
  ElMessage.success('已移除')
}

const assignToDay = (place) => {
  assignForm.place = place
  assignForm.dayDate = ''
  showDayAssignDialog.value = true
}

const confirmDayAssign = () => {
  if (assignForm.place && assignForm.dayDate) {
    const idx = unplannedItems.value.findIndex(i => i.id === assignForm.place.id)
    if (idx >= 0) {
      const movedItem = unplannedItems.value.splice(idx, 1)[0]
      movedItem.dayDate = assignForm.dayDate
      const targetDay = days.value.find(d => d.date === assignForm.dayDate)
      if (targetDay) {
        movedItem.sortOrder = (targetDay.items?.length || 0) + 1
        targetDay.items.push(movedItem)
      }
      updateAllItems()
    }
  }
  showDayAssignDialog.value = false
}

const onTabChange = (tab) => {
  if (tab === 'add') {
    // 显示添加日期表单
  }
}

const onDaysChange = (val) => {
  // 天数变化
}

const disabledDate = (time) => {
  return time.getTime() < Date.now() - 8.64e7
}

const addDays = () => {
  if (!newDayForm.startDate) {
    ElMessage.warning('请选择开始日期')
    return
  }

  const daysToAdd = newDayForm.days
  const start = new Date(newDayForm.startDate)
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

  for (let i = 0; i < daysToAdd; i++) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const week = weekDays[date.getDay()]

    days.value.push({
      label: `${month}.${day} ${week}`,
      date: date.toISOString().split('T')[0],
      items: []
    })
  }

  newDayForm.startDate = ''
  newDayForm.days = 3
  activeTab.value = 'day-' + (days.value.length - 1)
  ElMessage.success(`已添加 ${daysToAdd} 天行程`)
}

// 删除某一天及其所有行程
const deleteDay = async (index) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除「${days.value[index].label}」及其所有行程地点吗？`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
  } catch {
    return
  }

  // 从 allItems 中移除该天所有地点
  const removedItemIds = new Set(
    (days.value[index].items || []).map(place => place.id)
  )
  allItems.value = allItems.value.filter(place => !removedItemIds.has(place.id))

  // 删除该天
  days.value.splice(index, 1)

  // 重排剩余天的 dayDate
  days.value.forEach(day => {
    (day.items || []).forEach(place => {
      place.dayDate = day.date
    })
  })

  // 处理当前激活的 Tab
  const tabStr = activeTab.value
  if (tabStr.startsWith('day-')) {
    const currentIndex = parseInt(tabStr.replace('day-', ''))
    if (currentIndex === index) {
      // 删除的是当前 Tab，切换到其他 Tab
      if (days.value.length > 0) {
        const newIndex = Math.min(index, days.value.length - 1)
        activeTab.value = 'day-' + newIndex
      } else {
        activeTab.value = 'unplanned'
      }
    } else if (currentIndex > index) {
      // 删除的天在前面，当前 Tab 索引需要减 1
      activeTab.value = 'day-' + (currentIndex - 1)
    }
  }

  updateAllItems()
  ElMessage.success('已删除该天行程')
}

const updateAllItems = () => {
  normalizeAllDaysOrder()
  allItems.value = []
  days.value.forEach((day, dayIndex) => {
    day.items.forEach((place, placeIndex) => {
      allItems.value.push({
        ...place,
        dayDate: day.date,
        dayLabel: day.label,
        orderIndex: placeIndex + 1,
        routeColor: getDayColor(dayIndex)
      })
    })
  })
  unplannedItems.value.forEach(place => {
    allItems.value.push({
      ...place,
      dayDate: null,
      dayLabel: '待计划'
    })
  })
  updateMapMarkers()
}

// 加载计划详情（DTO 格式）
const loadPlanDetail = async () => {
  if (!currentPlanId.value) return

  try {
    const dto = await getPlanDTO(currentPlanId.value)
    if (!dto) return

    planName.value = dto.title || '我的旅行计划'

    // 从 DTO 恢复 days 数组（每个 day 初始化空 items）
    if (dto.days && dto.days.length > 0) {
      days.value = dto.days.map(d => ({ ...d, items: [] }))
    } else {
      days.value = []
    }

    // 清空现有数据
    unplannedItems.value = []

    // 将 DTO items 分配到对应天数或待计划
    if (dto.items) {
      dto.items.forEach(item => {
        if (item.dayDate) {
          const day = days.value.find(d => d.date === item.dayDate)
          if (day) {
            item.sortOrder = item.sortOrder || day.items.length + 1
            day.items.push(item)
          } else {
            unplannedItems.value.push(item)
          }
        } else {
          unplannedItems.value.push(item)
        }
      })
    }

    updateAllItems()
  } catch (e) {
    console.error('加载计划详情失败:', e)
  }
}

// 保存计划
const savePlan = async () => {
  if (!planName.value.trim()) {
    ElMessage.warning('请输入计划名称')
    return
  }

  saving.value = true
  try {
    // 根据 days 计算开始/结束日期
    let startDate = null
    let endDate = null
    if (days.value.length > 0) {
      const sortedDays = [...days.value].sort((a, b) => a.date.localeCompare(b.date))
      startDate = sortedDays[0].date
      endDate = sortedDays[sortedDays.length - 1].date
    }

    // 调试：打印计算的日期
    console.log('[savePlan] 计算的日期:', { startDate, endDate, days: days.value })

    const dto = {
      id: currentPlanId.value || null,
      title: planName.value,
      startDate,
      endDate,
      items: allItems.value.map(place => ({
        placeId: place.placeId,
        dayDate: place.dayDate || null,
        notes: place.notes,
        duration: place.duration,
        sortOrder: place.orderIndex || null
      }))
      // 注意：不再发送 days 字段，后端直接从 items 里的 dayDate 处理
    }
    const result = await savePlanApi(dto)
    currentPlanId.value = result.id
    ElMessage.success('计划保存成功')
  } catch (e) {
    console.error('保存失败:', e)
    const errMsg = e.response?.data?.message || e.response?.data || e.message || '未知错误'
    ElMessage.error('保存失败: ' + (JSON.stringify(errMsg).slice(0, 200)))
  } finally {
    saving.value = false
  }
}

// 返回上一页（根据来源决定目标）
const goBack = () => {
  // 有 planId 或 from=profile，说明是从个人中心跳转来的，返回个人中心
  if (route.params.planId || route.query.from === 'profile') {
    router.push('/profile')
  } else {
    // 从聊天页面（generate）来的，返回首页/聊天页
    router.push('/')
  }
}

onMounted(() => {
  loadCities()
  initMap()
  if (currentPlanId.value) {
    loadPlanDetail()
  }
})

// 监听路由参数变化，支持从不同计划间切换
watch(() => route.params.planId, (newPlanId) => {
  currentPlanId.value = newPlanId || null
  if (newPlanId) {
    planName.value = '我的旅行计划'
    activeTab.value = 'overview'
    days.value = []
    allItems.value = []
    unplannedItems.value = []
    loadPlanDetail()
  } else {
    activeTab.value = 'overview'
    planName.value = '我的旅行计划'
    days.value = []
    allItems.value = []
    unplannedItems.value = []
    updateMapMarkers()
  }
})

onUnmounted(() => {
  if (map) {
    map.destroy()
  }
})

const moveItem = (place, offset) => {
  const day = days.value.find(d => d.date === place.dayDate)
  if (!day) return
  const currentIndex = day.items.findIndex(item => item.id === place.id)
  const targetIndex = currentIndex + offset
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= day.items.length) return
  const [moved] = day.items.splice(currentIndex, 1)
  day.items.splice(targetIndex, 0, moved)
  syncDayItemsSortOrder(day)
  updateAllItems()
}

const handleDragStart = (index) => {
  draggingIndex.value = index
}

const handleDrop = (targetIndex) => {
  if (draggingIndex.value === null || draggingIndex.value === targetIndex || !currentDay.value) {
    draggingIndex.value = null
    return
  }
  const items = currentDay.value.items
  const [moved] = items.splice(draggingIndex.value, 1)
  items.splice(targetIndex, 0, moved)
  syncDayItemsSortOrder(currentDay.value)
  draggingIndex.value = null
  updateAllItems()
}

const applyManualSort = () => {
  if (!currentDay.value) return
  currentDay.value.items = [...currentDay.value.items].sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999))
  syncDayItemsSortOrder(currentDay.value)
  updateAllItems()
  ElMessage.success('已应用新的路线顺序')
}
</script>

<style scoped>
.plan-generate-container {
  display: flex;
  height: 100vh;
  background: #f5f5f5;
}

.map-panel {
  flex: 1;
  position: relative;
  background: #fff;
}

.map-container {
  width: 100%;
  height: 100%;
}

.map-controls {
  position: absolute;
  bottom: 20px;
  left: 20px;
  z-index: 10;
}

.plan-panel {
  width: 480px;
  display: flex;
  flex-direction: column;
  background: #fff;
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
}

.plan-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.plan-title-input {
  width: 240px;
}

.plan-tabs {
  border-bottom: 1px solid #eee;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 4px;
}

.plan-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

/* 总览样式 */
.overview-content {
  flex: 1;
  overflow-y: auto;
}

.overview-header {
  margin-bottom: 16px;
}

.overview-title {
  font-size: 16px;
  font-weight: 500;
}

.overview-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.overview-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.overview-item:hover {
  background: #e8f4ff;
}

.overview-number {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #409EFF;
  color: #fff;
  border-radius: 50%;
  font-size: 14px;
  font-weight: bold;
}

.overview-info {
  flex: 1;
}

.overview-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.overview-name {
  font-weight: 500;
  color: #333;
}

.overview-address {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.overview-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #999;
}

.overview-day {
  color: #409EFF;
  font-weight: 500;
}

.overview-order {
  color: #6366f1;
  font-weight: 500;
}

.overview-arrow {
  color: #ccc;
}

/* 日视图样式 */
.day-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.day-sort-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  margin-bottom: 12px;
  background: #f5f7ff;
  border: 1px solid #dbe4ff;
  border-radius: 10px;
}

.sort-hint {
  font-size: 12px;
  color: #667085;
}

.day-title {
  font-size: 16px;
  font-weight: 500;
}

.day-info {
  font-size: 12px;
  color: #999;
}

.day-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.day-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 10px;
  background: #f7faff;
  border: 1px solid #e8eef8;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.day-item:hover {
  background: #eef6ff;
  border-color: #cfe1ff;
}

.day-item[draggable="true"] {
  cursor: grab;
}

.day-item[draggable="true"]:active {
  cursor: grabbing;
}

.item-number {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #67C23A;
  color: #fff;
  border-radius: 50%;
  font-size: 12px;
  font-weight: bold;
}

.item-image {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}

.place-image {
  width: 100%;
  height: 100%;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eee;
  font-size: 24px;
}

.item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.item-header .el-tag {
  flex-shrink: 0;
}

.item-name {
  font-weight: 500;
  color: #1f2a37;
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.item-address {
  font-size: 12px;
  color: #7c8899;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.item-address::before {
  content: "📍 ";
}

.item-meta {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 10px;
  font-size: 12px;
  color: #666;
  min-width: 0;
  overflow: hidden;
}

.sort-order-input {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.sort-order-input .el-input-number {
  width: 86px;
}

.item-meta > span:not(.sort-order-input) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-actions {
  display: grid;
  grid-template-columns: repeat(2, auto);
  gap: 2px 6px;
  justify-items: end;
  align-content: start;
  flex-shrink: 0;
  min-width: 94px;
}

.item-actions :deep(.el-button) {
  margin-left: 0;
  padding: 4px 6px;
}

.empty-day,
.empty-unplanned {
  padding: 40px 0;
}

/* 待计划样式 */
.unplanned-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.unplanned-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.unplanned-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  cursor: pointer;
}

/* 日期Tab上的删除按钮 */
.tab-delete {
  margin-left: 4px;
  font-size: 12px;
  color: #999;
  border-radius: 50%;
  padding: 2px;
  transition: all 0.2s;
  cursor: pointer;
}

.tab-delete:hover {
  color: #f56c6c;
  background: rgba(245, 108, 108, 0.1);
}

/* 添加日期表单 */
.add-day-content {
  padding: 20px;
}

.add-day-form {
  max-width: 300px;
}

/* 底部操作栏 */
.plan-footer {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #eee;
  background: #fff;
}

/* 地点选择器 */
.place-selector {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.place-filters {
  display: flex;
  gap: 12px;
}

.place-filters .el-select {
  width: 150px;
}

.place-filters .el-input {
  flex: 1;
}

.place-list {
  max-height: 400px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.place-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.place-item:hover {
  background: #e8f4ff;
}

.place-item.selected {
  background: #ecf5ff;
  border: 1px solid #409EFF;
}

.place-info {
  flex: 1;
  min-width: 0;
}

.place-name {
  font-weight: 500;
  margin-bottom: 4px;
}

.place-address {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.selected-places {
  padding: 12px;
  background: #f0f9ff;
  border-radius: 8px;
}

.selected-header {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* 自定义地图标记 */
:deep(.custom-marker) {
  width: 30px;
  height: 30px;
  background: #409EFF;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.5);
}

:deep(.info-window) {
  padding: 8px;
}

:deep(.info-window h4) {
  margin: 0 0 4px;
  font-size: 14px;
}

:deep(.info-window p) {
  margin: 0;
  font-size: 12px;
  color: #666;
}
</style>
