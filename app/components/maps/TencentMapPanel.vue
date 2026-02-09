<script setup lang="ts">
const config = useRuntimeConfig()

const status = ref<'idle' | 'loading' | 'ready' | 'error' | 'missing-key'>('idle')

// 默认地图初始化中心点
const defaultCenter = { lng: 116.404, lat: 39.915 } // Beijing

const tencentKey = computed(() => config.public.tencentMapKey as string | undefined)

const tencentTool = ref<'marker' | 'polyline' | 'polygon' | 'circle' | 'rectangle' | 'ellipse'>('rectangle') // 当前选中的绘制工具
let tencentEditor: any = null
let tencentOverlays: Record<string, any> | null = null
const toolNotification = ref<string | null>(null)
let toolNoticeTimer: number | null = null
const drawOutput = ref<string>('')

const toolLabels: Record<typeof tencentTool.value, string> = {
  marker: '点',
  polyline: '线',
  polygon: '多边形',
  circle: '圆',
  rectangle: '矩形',
  ellipse: '椭圆',
}

// 初始化几何图形编辑器与绘制工具
function initTencentDrawTools(TMap: any, map: any) {
  const marker = new TMap.MultiMarker({ map })
  const polyline = new TMap.MultiPolyline({ map })
  const polygon = new TMap.MultiPolygon({ map })
  const circle = new TMap.MultiCircle({ map })
  const rectangle = new TMap.MultiRectangle({ map })
  const ellipse = new TMap.MultiEllipse({ map })
  tencentOverlays = { marker, polyline, polygon, circle, rectangle, ellipse }

  tencentEditor = new TMap.tools.GeometryEditor({
    map,
    // 用于编辑的几何图层
    overlayList: [
      { overlay: marker, id: 'marker' },
      { overlay: polyline, id: 'polyline' },
      { overlay: polygon, id: 'polygon' },
      { overlay: circle, id: 'circle' },
      { overlay: rectangle, id: 'rectangle' },
      { overlay: ellipse, id: 'ellipse' },
    ],
    // 编辑器的操作状态（DRAW绘制模式、INTERACT交互模式）
    actionMode: TMap.tools.constants.EDITOR_ACTION.DRAW,
    activeOverlayId: tencentTool.value,
		selectable: true, // 开启点选功能
    snappable: true,
  })

  // 处理绘制完成后的数据输出
  tencentEditor.on('draw_complete', (geometry: any) => {
    const id = geometry.id
    const activeId = tencentEditor?.getActiveOverlay?.().id as typeof tencentTool.value | undefined
    if (!activeId || !tencentOverlays) return

    const overlay = tencentOverlays[activeId]
    const selected = overlay?.geometries?.find((item: any) => item.id === id)
    if (!selected) return

    const output = {
      type: activeId,
      id,
      paths: selected.paths,
      center: selected.center,
      radius: selected.radius,
      bounds: selected.bounds,
      raw: selected,
    }
    console.log('[tencent][draw_complete] data:', output)
    drawOutput.value = JSON.stringify(output, null, 2)
  })
}

// 对 Key 做脱敏显示
function maskKey(value?: string) {
  if (!value) return 'missing'
  const half = Math.max(1, Math.floor(value.length / 2))
  return `${value.slice(0, half)}...`
}

// 仅加载一次脚本
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
    script.async = false
    script.defer = false
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(script)
  })
}

// 等待全局对象可用
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

// 切换腾讯绘制工具
function setTencentTool(id: typeof tencentTool.value) { // 切换腾讯绘制工具
  tencentTool.value = id // 更新当前选中工具
  tencentEditor?.setActiveOverlay?.(id) // 通知编辑器切换激活图层
  const label = toolLabels[id] ?? id
  toolNotification.value = `已切换为${label}`
  if (toolNoticeTimer) window.clearTimeout(toolNoticeTimer)
  toolNoticeTimer = window.setTimeout(() => {
    toolNotification.value = null
    toolNoticeTimer = null
  }, 1600)
}

// 初始化腾讯地图与绘制工具
async function initTencent() {
  const key = tencentKey.value
  console.info(`[map][tencent] key: ${maskKey(key)}`)
  if (!key) {
    status.value = 'missing-key'
    return
  }
  status.value = 'loading'
  try {
    await loadScriptOnce('tencent-map-sdk', `https://map.qq.com/api/gljs?v=1.exp&key=${key}&libraries=tools`)
    await waitForGlobal(() => Boolean((window as any).TMap))
    const TMap = (window as any).TMap
    if (!TMap) throw new Error('TMap not found')
    const container = document.getElementById('qq-map')
    if (!container) throw new Error('qq-map container not found')

    const map = new TMap.Map(container, {
      center: new TMap.LatLng(defaultCenter.lat, defaultCenter.lng),
      zoom: 12,
      pitch: 35,
    })

    initTencentDrawTools(TMap, map)

    status.value = 'ready'
    console.info('[map][tencent] ready')
  } catch {
    status.value = 'error'
    console.warn('[map][tencent] init failed')
  }
}

// 组件挂载后初始化地图
onMounted(() => {
  void initTencent()
})

// 组件卸载前清理定时器
onBeforeUnmount(() => {
  if (toolNoticeTimer) {
    window.clearTimeout(toolNoticeTimer)
    toolNoticeTimer = null
  }
})
</script>

<template>
  <section class="panel">
    <header class="panel-header">
      <h2>腾讯位置服务</h2>
      <span class="status">{{ status }}</span>
    </header>
    <div class="tool-bar">
      <button class="tool-btn" :class="{ active: tencentTool === 'marker' }" type="button" @click="setTencentTool('marker')">点</button>
      <button class="tool-btn" :class="{ active: tencentTool === 'polyline' }" type="button" @click="setTencentTool('polyline')">线</button>
      <button class="tool-btn" :class="{ active: tencentTool === 'polygon' }" type="button" @click="setTencentTool('polygon')">多边形</button>
      <button class="tool-btn" :class="{ active: tencentTool === 'circle' }" type="button" @click="setTencentTool('circle')">圆</button>
      <button class="tool-btn" :class="{ active: tencentTool === 'rectangle' }" type="button" @click="setTencentTool('rectangle')">矩形</button>
      <button class="tool-btn" :class="{ active: tencentTool === 'ellipse' }" type="button" @click="setTencentTool('ellipse')">椭圆</button>
      <span class="tool-hint">点击地图区域移动鼠标开始绘制电子围栏</span>
    </div>
    <transition name="tool-toast">
      <div v-if="toolNotification" class="tool-toast">{{ toolNotification }}</div>
    </transition>
    <div id="qq-map" class="map">
      <div v-if="status !== 'ready'" class="placeholder">
        {{ status === 'missing-key' ? '缺少 Key' : '加载中或失败' }}
      </div>
    </div>
    <div class="draw-output">
      <div class="draw-output-title">绘制输出</div>
      <pre class="draw-output-body">{{ drawOutput || '暂无绘制数据' }}</pre>
    </div>
  </section>
</template>

<style scoped>
.panel {
  position: relative;
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

.tool-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #f0f2f5;
  background: #fff;
  flex-wrap: wrap;
}

.tool-btn {
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #374151;
  border-radius: 8px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
}

.tool-btn.active {
  border-color: #4f46e5;
  color: #4f46e5;
  background: #eef2ff;
}

.tool-hint {
  display: inline-flex;
  align-items: center;
  margin-left: 8px;
  font-size: 12px;
  color: #6b7280;
}

.tool-toast {
  position: absolute;
  right: 12px;
  top: 52px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(17, 24, 39, 0.92);
  color: #fff;
  font-size: 12px;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.2);
  pointer-events: none;
  z-index: 2;
}

.tool-toast-enter-active,
.tool-toast-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.tool-toast-enter-from,
.tool-toast-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.status {
  font-size: 12px;
  color: #6b7280;
}

.map {
  position: relative;
  height: 360px;
}

.draw-output {
  border-top: 1px solid #f0f2f5;
  padding: 10px 12px;
  background: #fcfcfd;
}

.draw-output-title {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 6px;
}

.draw-output-body {
  margin: 0;
  font-size: 12px;
  color: #111827;
  white-space: pre-wrap;
  word-break: break-all;
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
