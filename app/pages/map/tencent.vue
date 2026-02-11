<script setup lang="ts">
import TencentMapPanel from '~/components/maps/TencentMapPanel.vue'
import type { RouteRenderDTO } from '~/types/map-api.types'
import { mockRouteRenderList } from '~/mocks/route-render.mock'

definePageMeta({
  title: '腾讯地图',
  nav: true,
  order: 4,
  layoutMode: 'fixed',
})

// 处理地图组件的点击事件
function handleMapClick(payload: { lat: number; lng: number; }) {
  console.info('地图组件返回点击坐标：', payload)
}

const routeList = ref<RouteRenderDTO[]>([])
const expandedRouteIds = ref<Set<string>>(new Set())
const selectedPoint = ref<{
  id: string
  name: string
  location: { lng: number; lat: number }
  address?: string | null
  fences?: any[] | null
} | null>(null)

// 模拟获取路线渲染数据的函数
async function fetchRouteRenderMock() {
  const data = mockRouteRenderList[0]
  if (!data) return null
  await new Promise((resolve) => setTimeout(resolve, 300))
  console.info('[mock][route-render]', data)
  routeList.value = mockRouteRenderList
  return data
}

function toggleRouteDetail(routeId: string) {
  const next = new Set(expandedRouteIds.value)
  if (next.has(routeId)) {
    next.delete(routeId)
  } else {
    next.add(routeId)
  }
  expandedRouteIds.value = next
}

function formatKm(meter?: number) {
  if (typeof meter !== 'number' || Number.isNaN(meter)) return '--'
  return (meter / 1000).toFixed(2)
}

function handlePointClick(point: { id: string; name?: string; location?: { lng: number; lat: number } }) {
  // 点击点位列表时，将点位传递给地图组件展示
  if (!point.location) return
  console.info('[地图点位] 已选择点位', {
    id: point.id,
    name: point.name ?? point.id,
    location: point.location,
  })
  selectedPoint.value = {
    id: point.id,
    name: point.name ?? point.id,
    location: point.location,
    address: null,
    fences: [],
  }
}
</script>

<template>
  <div class="page">
    <!-- <header class="page-header">
      <h1>腾讯地图（位置服务）</h1>
      <p>此页面用来测试腾讯位置服务的绘制与交互能力。</p>
    </header> -->
    <section class="page-content">
      <aside class="left-pane">
        <div class="left-card">
          <h2>线路列表</h2>
          <p>（ ID / 名称 / 总理论里程）</p>
          <div class="route-list">
            <div v-if="routeList.length === 0" class="route-empty">暂无数据</div>
            <div v-if="routeList.length === 0" class="page-actions">
              <button class="action-btn" type="button" @click="fetchRouteRenderMock">
                获取线路
              </button>
            </div>
            <div v-for="item in routeList" :key="item.route.id" class="route-item">
              <div class="route-main">
                <div class="route-info">
                  <div class="route-id">ID：{{ item.route.id }}</div>
                  <div class="route-name">名称：{{ item.route.name }}</div>
                  <div class="route-distance">
                    总理论里程：{{ formatKm(item.route.totalTheoryDistanceMeter) }} km
                  </div>
                </div>
                <button
                  class="detail-btn"
                  type="button"
                  @click="toggleRouteDetail(item.route.id)"
                >
                  {{ expandedRouteIds.has(item.route.id) ? '收起详情' : '展开详情' }}
                </button>
              </div>
              <div v-if="expandedRouteIds.has(item.route.id)" class="route-detail">
                <div class="detail-title">点位信息</div>
                <div v-if="item.route.points.length === 0" class="detail-empty">
                  暂无点位
                </div>
                <div
                  v-for="point in item.route.points"
                  :key="point.id"
                  class="point-row"
                  role="button"
                  tabindex="0"
                  @click="handlePointClick(point)"
                >
                  <div class="point-name">{{ point.name }}</div>
                  <div class="point-coord">
                    {{ point.location.lng }}, {{ point.location.lat }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
      <div class="right-pane">
        <ClientOnly>
          <TencentMapPanel :points="selectedPoint ? [selectedPoint] : []" @map-click="handleMapClick" />
        </ClientOnly>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page {
  padding: 24px;
}

.page-header {
  margin-bottom: 16px;
  text-align: center;
}

.page-header h1 {
  margin: 0 0 6px;
  font-size: 20px;
}

.page-header p {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
}

.page-actions {
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
}

.action-btn {
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #111827;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
}

.action-btn:hover {
  border-color: #4f46e5;
  color: #4f46e5;
  background: #eef2ff;
}

.page-content {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 16px;
  align-items: start;
}

.left-pane {
  min-width: 0;
}

.right-pane {
  min-width: 0;
}

.left-card {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 12px;
  background: #fff;
}

.left-card h2 {
  margin: 0 0 6px;
  font-size: 14px;
}

.left-card p {
  margin: 0;
  font-size: 12px;
  color: #6b7280;
}

.route-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.route-empty {
  padding: 10px;
  border: 1px dashed #e5e7eb;
  border-radius: 10px;
  font-size: 12px;
  color: #9ca3af;
  text-align: center;
}

.route-item {
  border: 1px solid #eef2f7;
  border-radius: 10px;
  padding: 10px;
  background: #f9fafb;
}

.route-main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.route-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #111827;
}

.route-id,
.route-name {
  font-weight: 600;
}

.route-distance {
  color: #94a3b8;
}

.detail-btn {
  border: 1px solid #dbe0e6;
  background: #fff;
  color: #374151;
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}

.detail-btn:hover {
  border-color: #4f46e5;
  color: #4f46e5;
  background: #eef2ff;
}

.route-detail {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-title {
  font-size: 12px;
  color: #6b7280;
}

.detail-empty {
  font-size: 12px;
  color: #9ca3af;
}

.point-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: #111827;
}

.point-coord {
  color: #6b7280;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 900px) {
  .page-content {
    grid-template-columns: 1fr;
  }
}
</style>
