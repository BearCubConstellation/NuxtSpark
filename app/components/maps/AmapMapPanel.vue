<script setup lang="ts">
const config = useRuntimeConfig()

const status = ref<'idle' | 'loading' | 'ready' | 'error' | 'missing-key'>('idle')
const defaultCenter = { lng: 116.404, lat: 39.915 } // Beijing

const amapKey = computed(() => config.public.amapKey as string | undefined)

function maskKey(value?: string) {
  if (!value) return 'missing'
  const half = Math.max(1, Math.floor(value.length / 2))
  return `${value.slice(0, half)}...`
}

function loadScriptOnce(id: string, src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) {
      console.info(`[map] script already loaded: ${id}`)
      resolve()
      return
    }
    const script = document.createElement('script')
    script.id = id
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(script)
  })
}

async function initAmap() {
  const key = amapKey.value
  console.info(`[map][amap] key: ${maskKey(key)}`)
  if (!key) {
    status.value = 'missing-key'
    return
  }
  status.value = 'loading'
  try {
    await loadScriptOnce('amap-sdk', `https://webapi.amap.com/maps?v=2.0&key=${key}`)
    const AMap = (window as any).AMap
    if (!AMap) throw new Error('AMap not found')
    new AMap.Map('amap-map', {
      center: [defaultCenter.lng, defaultCenter.lat],
      zoom: 12,
      viewMode: '3D',
      pitch: 35,
    })
    status.value = 'ready'
    console.info('[map][amap] ready')
  } catch {
    status.value = 'error'
    console.warn('[map][amap] init failed')
  }
}

onMounted(() => {
  void initAmap()
})
</script>

<template>
  <section class="panel">
    <header class="panel-header">
      <h2>高德地图</h2>
      <span class="status">{{ status }}</span>
    </header>
    <div id="amap-map" class="map">
      <div v-if="status !== 'ready'" class="placeholder">
        {{ status === 'missing-key' ? '缺少 Key' : '加载中或失败' }}
      </div>
    </div>
  </section>
</template>

<style scoped>
.panel {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid #f0f2f5;
  background: #fafafa;
}

.panel-header h2 {
  margin: 0;
  font-size: 16px;
}

.status {
  font-size: 12px;
  color: #6b7280;
}

.map {
  position: relative;
  height: 360px;
}

.placeholder {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #9ca3af;
  background: repeating-linear-gradient(
    45deg,
    #f8fafc,
    #f8fafc 10px,
    #f1f5f9 10px,
    #f1f5f9 20px
  );
  font-size: 14px;
}
</style>
