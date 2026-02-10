<script setup lang="ts">
import TencentMapPanel from '~/components/maps/TencentMapPanel.vue'

definePageMeta({
  title: '腾讯地图',
  nav: true,
  order: 4,
})

function handleMapClick(payload: { lat: number; lng: number }) {
  console.info('地图组件返回点击坐标：', payload)
}
</script>

<template>
  <div class="page">
    <header class="page-header">
      <h1>腾讯地图（位置服务）</h1>
      <p>此页面用来测试腾讯位置服务的绘制与交互能力。</p>
    </header>
    <section class="page-content">
      <aside class="left-pane">
        <div class="left-card">
          <h2>左侧面板</h2>
          <p>这里预留给筛选、列表或说明等内容。</p>
        </div>
      </aside>
      <div class="right-pane">
        <ClientOnly>
          <TencentMapPanel @map-click="handleMapClick" />
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

@media (max-width: 900px) {
  .page-content {
    grid-template-columns: 1fr;
  }
}
</style>
