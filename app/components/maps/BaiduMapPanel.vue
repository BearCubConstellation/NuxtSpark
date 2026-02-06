<script setup lang="ts">
const config = useRuntimeConfig()

const status = ref<'idle' | 'loading' | 'ready' | 'error' | 'missing-key'>('idle')
const defaultCenter = { lng: 116.404, lat: 39.915 } // Beijing

const baiduAk = computed(() => config.public.baiduMapAk as string | undefined)

const headScripts = computed(() => {
  const scripts: { key: string; src: string; async?: boolean; defer?: boolean }[] = []
  if (baiduAk.value) {
    scripts.push({
      key: 'baidu-map-sdk',
      src: `https://api.map.baidu.com/api?type=webgl&v=1.0&ak=${baiduAk.value}&callback=__initBaiduMapGL`,
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

function waitForCallback(timeoutMs = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const timer = window.setInterval(() => {
      const callbackReady = (window as any).__baiduCallbackReady
      if (callbackReady) {
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
    status.value = 'missing-key'
    return
  }
  status.value = 'loading'
  try {
    ;(window as any).__baiduCallbackReady = false
    ;(window as any).__initBaiduMapGL = () => {
      ;(window as any).__baiduCallbackReady = true
    }
    console.info('[map][baidu] 等待回调触发')
    await waitForCallback()
    console.info('[map][baidu] 回调触发，开始初始化地图')
    console.info('[map][baidu] BMapGL 已就绪，开始初始化地图')
    const BMapGL = (window as any).BMapGL
    if (!BMapGL) throw new Error('BMapGL not found')
    const map = new BMapGL.Map('baidu-map')
    console.info('[map][baidu] Map 实例创建完成，设置中心点')
    const point = new BMapGL.Point(defaultCenter.lng, defaultCenter.lat)
    map.centerAndZoom(point, 12)
    map.enableScrollWheelZoom(true)
    status.value = 'ready'
    console.info('[map][baidu] ready')
  } catch (error: any) {
    status.value = 'error'
    const message = error instanceof Error ? error.message : String(error)
    console.warn('[map][baidu] 初始化失败，已进入 catch')
    console.warn(`[map][baidu] 错误信息: ${message}`)
  }
}

onMounted(() => {
  void initBaidu()
})
</script>

<template>
  <section class="panel">
    <header class="panel-header">
      <h2>百度地图</h2>
      <span class="status">{{ status }}</span>
    </header>
    <div id="baidu-map" class="map">
      <div v-if="status !== 'ready'" class="placeholder">
        {{ status === 'missing-key' ? '缺少 AK' : '加载中或失败' }}
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
