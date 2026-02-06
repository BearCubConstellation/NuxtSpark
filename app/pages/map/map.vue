<script setup lang="ts">
import BaiduMapPanel from '~/components/maps/BaiduMapPanel.vue'
import TencentMapPanel from '~/components/maps/TencentMapPanel.vue'
import AmapMapPanel from '~/components/maps/AmapMapPanel.vue'

definePageMeta({
  title: '地图',
  nav: true,
  order: 3,
})
</script>

<template>
  <div class="page">
    <header class="page-header">
      <h1>地图组件概览</h1>
      <p>该页面仅用于大致展示三个地图组件的基础能力。</p>
    </header>
    <div class="grid">
      <!-- 百度 -->
      <ClientOnly>
        <BaiduMapPanel />
      </ClientOnly>
      <!-- 腾讯 -->
      <ClientOnly>
        <TencentMapPanel />
      </ClientOnly>
      <!-- 高德 -->
      <ClientOnly>
        <AmapMapPanel />
      </ClientOnly>
    </div>
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

.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

@media (max-width: 1100px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
