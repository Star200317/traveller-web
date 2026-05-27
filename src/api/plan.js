import request from '@/utils/request'

// 获取计划列表
export function getPlanList() {
  return request({
    url: '/plan/list',
    method: 'get'
  })
}

// 获取计划详情（含计划项，从 plan_item 表读取）
export function getPlanDetail(planId) {
  return request({
    url: `/plan/${planId}/detail`,
    method: 'get'
  })
}

// 获取计划详情（DTO格式，含地点项及 place 信息）
export function getPlanDTO(planId) {
  return request({
    url: `/plan/${planId}/dto`,
    method: 'get'
  })
}

// 根据地点顺序获取真实驾车路线
export function getDrivingRoute(points) {
  return request({
    url: '/plan/route/driving',
    method: 'post',
    data: { points }
  })
}

// 创建新计划
export function createPlan(data) {
  return request({
    url: '/plan/create',
    method: 'post',
    data
  })
}

// 更新计划
export function updatePlan(planId, data) {
  return request({
    url: `/plan/${planId}`,
    method: 'put',
    data
  })
}

// 保存计划行程（地点列表）
export function savePlanItems(planId, items) {
  return request({
    url: `/plan/${planId}/items`,
    method: 'post',
    data: items
  })
}

// 获取地图数据
export function getPlanMapData(planId) {
  return request({
    url: `/plan/${planId}/map`,
    method: 'get'
  })
}

// 删除计划
export function deletePlan(planId) {
  return request({
    url: `/plan/${planId}`,
    method: 'delete'
  })
}

// 保存计划（含地点项，合并新建/更新，一次请求完成）
export function savePlan(data) {
  return request({
    url: '/plan/save',
    method: 'post',
    data
  })
}

// 导出PDF（返回文件流，触发浏览器下载）
export function exportPlanPdf(planId) {
  return request({
    url: `/plan/${planId}/export/pdf`,
    method: 'get',
    responseType: 'blob'
  })
}
