import request from '@/utils/request'

// 获取地点列表（支持城市和类型筛选）
export function getPlaceList(params) {
  return request({
    url: '/places/list',
    method: 'get',
    params
  })
}

// 获取所有城市列表
export function getAllCities() {
  return request({
    url: '/places/cities',
    method: 'get'
  })
}

// 获取地点统计
export function getPlaceStats(city) {
  return request({
    url: '/places/stats',
    method: 'get',
    params: { city }
  })
}

// 获取地点详情
export function getPlaceById(id) {
  return request({
    url: `/places/${id}`,
    method: 'get'
  })
}

// 搜索地点
export function searchPlace(name) {
  return request({
    url: '/places/search',
    method: 'get',
    params: { name }
  })
}

// 获取推荐地点
export function getRecommendPlaces(city, limit = 20) {
  return request({
    url: '/places/recommend',
    method: 'get',
    params: { city, limit }
  })
}

// 批量获取地点
export function getBatchPlaces(ids) {
  return request({
    url: '/places/batch',
    method: 'post',
    data: ids
  })
}
