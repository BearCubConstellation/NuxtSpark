<script setup lang="ts">
definePageMeta({
  title: '地图',
  nav: true,
  order: 3,
})

const config = useRuntimeConfig()

type MapStatus = 'idle' | 'loading' | 'ready' | 'error' | 'missing-key'

const status = reactive({
  baidu: 'idle' as MapStatus,
  qq: 'idle' as MapStatus,
  amap: 'idle' as MapStatus,
})

const defaultCenter = { lng: 116.404, lat: 39.915 } // Beijing

const baiduAk = computed(() => config.public.baiduMapAk as string | undefined)
const tencentKey = computed(() => config.public.tencentMapKey as string | undefined)
const amapKey = computed(() => config.public.amapKey as string | undefined)

const headScripts = computed(() => {
  const scripts: { key: string; src: string; async?: boolean; defer?: boolean }[] = []
  if (baiduAk.value) {
    scripts.push({
      key: 'baidu-map-sdk',
      src: `https://api.map.baidu.com/api?v=1.0&type=webgl&ak=${baiduAk.value}`,
      async: false,
      defer: false,
    })
  }
  if (tencentKey.value) {
    scripts.push({
      key: 'tencent-map-sdk',
      src: `https://map.qq.com/api/gljs?v=1.exp&key=${tencentKey.value}`,
      async: false,
      defer: false,
    })
  }
  return scripts
})

useHead(() => ({
  script: headScripts.value,
}))

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

function waitForGlobal(check: () => boolean, timeoutMs = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const timer = window.setInterval(() => {
      if (check()) {
        window.clearInterval(timer)
        resolve()
        return
      }
      if (Date.now() - start > timeoutMs) {
        window.clearInterval(timer)
        reject(new Error('timeout'))
      }
    }, 100)
  })
}

async function initBaidu() {
  const ak = baiduAk.value
  console.info(`[map][baidu] ak: ${maskKey(ak)}`)
  if (!ak) {
    status.baidu = 'missing-key'
    return
  }
  status.baidu = 'loading'
  try {
    await waitForGlobal(() => Boolean((window as any).BMapGL))
    const BMapGL = (window as any).BMapGL
    if (!BMapGL) throw new Error('BMapGL not found')
    const map = new BMapGL.Map('baidu-map')
    const point = new BMapGL.Point(defaultCenter.lng, defaultCenter.lat)
    map.centerAndZoom(point, 12)
    map.enableScrollWheelZoom(true)
    status.baidu = 'ready'
    console.info('[map][baidu] ready')
  } catch {
    status.baidu = 'error'
    console.warn('[map][baidu] init failed')
  }
}

async function initTencent() {
  const key = tencentKey.value
  console.info(`[map][tencent] key: ${maskKey(key)}`)
  if (!key) {
    status.qq = 'missing-key'
    return
  }
  status.qq = 'loading'
  try {
    await waitForGlobal(() => Boolean((window as any).TMap))
    const TMap = (window as any).TMap
    if (!TMap) throw new Error('TMap not found')
    new TMap.Map(document.getElementById('qq-map'), {
      center: new TMap.LatLng(defaultCenter.lat, defaultCenter.lng),
      zoom: 12,
      pitch: 35,
    })
    status.qq = 'ready'
    console.info('[map][tencent] ready')
  } catch {
    status.qq = 'error'
    console.warn('[map][tencent] init failed')
  }
}

async function initAmap() {
  const key = amapKey.value
  console.info(`[map][amap] key: ${maskKey(key)}`)
  if (!key) {
    status.amap = 'missing-key'
    return
  }
  status.amap = 'loading'
  try {
    await loadScriptOnce(
      'amap-sdk',
      `https://webapi.amap.com/maps?v=2.0&key=${key}`,
    )
    const AMap = (window as any).AMap
    if (!AMap) throw new Error('AMap not found')
    new AMap.Map('amap-map', {
      center: [defaultCenter.lng, defaultCenter.lat],
      zoom: 12,
      viewMode: '3D',
      pitch: 35,
    })
    status.amap = 'ready'
    console.info('[map][amap] ready')
  } catch {
    status.amap = 'error'
    console.warn('[map][amap] init failed')
  }
}

onMounted(() => {
  void initBaidu()
  void initTencent()
  void initAmap()
})
</script>

<template>
  <div class="page">
    <!-- <h1 class="title">三家地图横向对比</h1> -->
    <ClientOnly>
      <div class="grid">
        <section class="panel">
          <header class="panel-header">
            <h2>百度地图</h2>
            <span class="status">{{ status.baidu }}</span>
          </header>
          <div id="baidu-map" class="map">
            <div v-if="status.baidu !== 'ready'" class="placeholder">
              {{ status.baidu === 'missing-key' ? '缺少 AK' : '加载中或失败' }}
            </div>
          </div>
        </section>

        <section class="panel">
          <header class="panel-header">
            <h2>腾讯位置服务</h2>
            <span class="status">{{ status.qq }}</span>
          </header>
          <div id="qq-map" class="map">
            <div v-if="status.qq !== 'ready'" class="placeholder">
              {{ status.qq === 'missing-key' ? '缺少 Key' : '加载中或失败' }}
            </div>
          </div>
        </section>

        <section class="panel">
          <header class="panel-header">
            <h2>高德地图</h2>
            <span class="status">{{ status.amap }}</span>
          </header>
          <div id="amap-map" class="map">
            <div v-if="status.amap !== 'ready'" class="placeholder">
              {{ status.amap === 'missing-key' ? '缺少 Key' : '加载中或失败' }}
            </div>
          </div>
        </section>
      </div>
    </ClientOnly>
  </div>
</template>

<style scoped>
.page {
  padding: 24px;
}

.title {
  margin: 0 0 16px;
  font-size: 24px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

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

@media (max-width: 1100px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
