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
