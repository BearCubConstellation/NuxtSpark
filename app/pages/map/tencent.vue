<script setup lang="ts">
import TencentMapPanel from '~/components/maps/TencentMapPanel.vue'

definePageMeta({
  title: '腾讯地图',
  nav: true,
  order: 4,
})
</script>

<template>
  <div class="page">
    <header class="page-header">
      <h1>腾讯地图（位置服务）</h1>
      <p>此页面用来测试腾讯位置服务的绘制与交互能力。</p>
    </header>
    <ClientOnly>
      <TencentMapPanel />
    </ClientOnly>
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
</style>
