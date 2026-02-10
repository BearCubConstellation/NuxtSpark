<script setup lang="ts">
const config = useRuntimeConfig() // 运行时配置

const status = ref<'idle' | 'loading' | 'ready' | 'error' | 'missing-key'>('idle') // 地图初始化状态

// 默认地图初始化中心点
const defaultCenter = { lng: 116.404, lat: 39.915 } // 北京
// 腾讯地图 Key
const tencentKey = computed(() => config.public.tencentMapKey as string | undefined)
// 绘制工具类型
type TencentTool = 'marker' | 'polyline' | 'polygon' | 'circle' | 'rectangle' | 'ellipse'
// 当前选中的绘制工具
const tencentTool = ref<TencentTool>('rectangle')
// 腾讯地图 SDK 实例
let tencentSdk: any = null
// 地图实例
let tencentMap: any = null
// 几何编辑器实例
let tencentEditor: any = null
// 各类图形图层引用
let tencentOverlays: Record<TencentTool, any> | null = null
// 工具切换提示文案
const toolNotification = ref<string | null>(null)
// 工具提示定时器
let toolNoticeTimer: number | null = null
// 绘制结果输出
const drawOutput = ref<string>('')
// 编辑器当前模式
const editorMode = ref<any>(null)
// 地图当前是否为 3D 模式
const isMap3D = ref(false)
// 地图操作模式：选点 / 绘制
const mapMode = ref<'pick' | 'draw'>('draw')
// 是否展开按钮区域
const isToolPanelOpen = ref(true)

const emit = defineEmits<{
  (e: 'map-click', payload: { lat: number; lng: number }): void
}>()

// 当前编辑器是否处于交互模式
const isEditorInteract = computed(
  () => editorMode.value === tencentSdk?.tools?.constants?.EDITOR_ACTION?.INTERACT,
)

const isDrawMode = computed(() => mapMode.value === 'draw')

// 绘制工具显示文本
const toolLabels: Record<TencentTool, string> = {
  marker: '点',
  polyline: '线',
  polygon: '多边形',
  circle: '圆',
  rectangle: '矩形',
  ellipse: '椭圆',
}

// 初始化几何图形编辑器与绘制工具
function initTencentDrawTools(TMap: any, map: any) {
  // 创建各类几何图层并挂载到地图
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
    // 根据返回的几何图形 ID 找到对应的图层数据
    const id = geometry.id
    const activeId = tencentEditor?.getActiveOverlay?.().id as TencentTool | undefined
    if (!activeId || !tencentOverlays) return

    const overlay = tencentOverlays[activeId]
    const selected = overlay?.geometries?.find((item: any) => item.id === id)
    if (!selected) return

    // 按图形类型组织输出数据
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

// 初始化天空盒
function initSkyBox(TMap: any) {
  // 基于当前系统时间选择白天/夜晚天空盒
  const hour = new Date().getHours()
  const isDayTime = hour >= 6 && hour < 18
  const dayBox = {
    src: 'https://mapapi.qq.com/web/lbs/javascriptGL/demo/img/skybox_day.png',
    horizontal: TMap.constants.IMAGE_DISPLAY.REPEAT,
    vertical: TMap.constants.IMAGE_DISPLAY.SCALE,
  }
  const nightBox = {
    src: 'https://mapapi.qq.com/web/lbs/javascriptGL/demo/img/skybox_night.png',
    horizontal: TMap.constants.IMAGE_DISPLAY.REPEAT,
    vertical: TMap.constants.IMAGE_DISPLAY.SCALE,
  }
  return {
    skybox: isDayTime ? [dayBox] : [nightBox],
  }
}

// 对 Key 做脱敏显示
function maskKey(value?: string) {
  // 只展示 Key 的前半部分
  if (!value) return 'missing'
  const half = Math.max(1, Math.floor(value.length / 2))
  return `${value.slice(0, half)}...`
}

// 仅加载一次脚本
const scriptLoads = new Map<string, Promise<void>>()
function loadScriptOnce(id: string, src: string): Promise<void> {
  // 复用相同脚本的加载 Promise，避免重复加载
  const cached = scriptLoads.get(id)
  if (cached) return cached
  const promise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null
    if (existing) {
      // 已存在脚本时，优先等待其 load/error 事件
      if ((window as any).TMap) {
        resolve()
        return
      }
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener(
        'error',
        () => reject(new Error(`Failed to load ${existing.src || src}`)),
        { once: true },
      )
      return
    }
    // 动态注入脚本
    const script = document.createElement('script')
    script.id = id
    script.src = src
    script.async = false
    script.defer = false
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(script)
  })
  scriptLoads.set(id, promise)
  return promise
}

// 等待全局对象可用
function waitForGlobal(check: () => boolean, timeoutMs = 8000): Promise<void> {
  // 轮询等待全局对象可用，超时则抛错
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
function setTencentTool(id: TencentTool) { // 切换腾讯绘制工具
  if (!isDrawMode.value) return
  // 更新当前工具并同步到编辑器
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

// 设置编辑器模式（DRAW绘制模式、INTERACT交互模式）
function setEditorModel(mode: any) {
  // 设置编辑器模式并同步状态
  if (!tencentEditor || !tencentSdk) return
  const actions = tencentSdk?.tools?.constants?.EDITOR_ACTION
  if (!actions || !tencentEditor.setActionMode) return
  tencentEditor.setActionMode(mode)
  editorMode.value = tencentEditor?.getActionMode?.() ?? mode
}

// 切换编辑器模式
function toggleEditorMode() {
  // 在 DRAW 与 INTERACT 之间切换
  if (!tencentSdk) return
  const actions = tencentSdk?.tools?.constants?.EDITOR_ACTION
  if (!actions) return
  const nextMode = editorMode.value === actions.DRAW ? actions.INTERACT : actions.DRAW
  setEditorModel(nextMode)
}

// 根据地图模式同步编辑器行为
function applyMapMode() {
  if (!tencentSdk) return
  const actions = tencentSdk?.tools?.constants?.EDITOR_ACTION
  if (!actions) return
  if (mapMode.value === 'draw') {
    setEditorModel(actions.DRAW)
    tencentEditor?.setActiveOverlay?.(tencentTool.value)
  } else {
    setEditorModel(actions.INTERACT)
    tencentEditor?.setActiveOverlay?.(null)
  }
}

// 切换地图 2D/3D 显示
function toggleMapDimension() {
  if (!tencentMap) return
  console.info('[tencent][map] toggle dimension start', { from: isMap3D.value ? '3D' : '2D' })
  isMap3D.value = !isMap3D.value
  tencentMap.setViewMode?.(isMap3D.value ? '3D' : '2D')
  tencentMap.setPitch?.(isMap3D.value ? 70 : 0)
  // 回读实际模式，避免 UI 与地图状态不一致
  syncMapDimensionState()
  console.info('[tencent][map] toggle dimension end', { to: isMap3D.value ? '3D' : '2D' })
}

// 回读地图真实模式并同步 UI
function syncMapDimensionState() {
  if (!tencentMap) return
  const viewMode = tencentMap.getViewMode?.()
  console.info('[tencent][map] sync viewMode', { viewMode })
  if (viewMode === '3D' || viewMode === '2D') {
    isMap3D.value = viewMode === '3D'
    return
  }
  const pitch = tencentMap.getPitch?.()
  console.info('[tencent][map] sync pitch', { pitch })
  if (typeof pitch === 'number') {
    isMap3D.value = pitch > 0
  }
}

// 初始化腾讯地图与绘制工具
async function initTencent() {
  // 初始化腾讯地图与绘制工具
  const key = tencentKey.value
  console.info(`[map][tencent] key: ${maskKey(key)}`)
  if (!key) {
    status.value = 'missing-key'
    return
  }
  status.value = 'loading'
  try {
    // 加载 SDK 并等待全局对象就绪
    await loadScriptOnce('tencent-map-sdk', `https://map.qq.com/api/gljs?v=1.exp&key=${key}&libraries=tools`)
    await waitForGlobal(() => Boolean((window as any).TMap))
    const TMap = (window as any).TMap
    if (!TMap) throw new Error('TMap not found')
    tencentSdk = TMap
    const container = document.getElementById('qq-map')
    if (!container) throw new Error('qq-map container not found')

    // 初始化天空盒
    const skybox = initSkyBox(TMap)

    // 创建地图实例
    const map = new TMap.Map(container, {
      center: new TMap.LatLng(defaultCenter.lat, defaultCenter.lng),
      zoom: 17, //设置地图缩放级别
      pitch: isMap3D.value ? 70 : 0, //设置俯仰角
      rotation: 45, //设置地图旋转角度,
      renderOptions: {
          skyOptions: skybox,
      }
    })
    tencentMap = map
    console.info('[tencent][map] created', { isMap3D: isMap3D.value })
    tencentMap.setViewMode?.(isMap3D.value ? '3D' : '2D')
    tencentMap.setPitch?.(isMap3D.value ? 70 : 0)
    syncMapDimensionState()

    // 初始化绘制工具
    initTencentDrawTools(TMap, tencentMap)

    editorMode.value = tencentEditor?.getActionMode?.() ?? TMap.tools.constants.EDITOR_ACTION.DRAW
    applyMapMode()

    //绑定点击事件
    tencentMap.on("click",function(evt: any){
        var lat = evt.latLng.getLat().toFixed(6);
        var lng = evt.latLng.getLng().toFixed(6);
        emit('map-click', { lat: Number(lat), lng: Number(lng) })
    })

    status.value = 'ready'
    console.info('[map][tencent] ready')
  } catch (err) {
    status.value = 'error'
    console.warn('[map][tencent] init failed', err)
  }
}

// 组件挂载后初始化地图
onMounted(() => {
  // 首次挂载时初始化
  void initTencent()
})

watch(mapMode, () => {
  applyMapMode()
})

// 组件卸载前清理定时器
onBeforeUnmount(() => {
  // 卸载时释放事件与对象引用
  if (tencentEditor?.off) {
    tencentEditor.off('draw_complete')
  }
  tencentEditor?.destroy?.()
  tencentEditor = null
  tencentMap?.destroy?.()
  tencentMap = null
  if (tencentOverlays) {
    Object.values(tencentOverlays).forEach((overlay: any) => overlay?.setMap?.(null))
    tencentOverlays = null
  }
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
      <div class="header-actions">
        <button
          v-if="!isToolPanelOpen"
          class="tool-btn"
          type="button"
          @click="isToolPanelOpen = !isToolPanelOpen"
        >
          展开选项
        </button>
        <button class="tool-btn" type="button" @click="toggleMapDimension">
          地图视角：{{ isMap3D ? '3D' : '2D' }}
        </button>
        <span class="status">{{ status }}</span>
      </div>
    </header>
    <div v-if="isToolPanelOpen" class="tool-bar">
      <div class="tool-row">
        <span class="tool-label">地图模式：</span>
        <button
          class="tool-btn"
          :class="{ active: mapMode === 'pick' }"
          type="button"
          @click="mapMode = 'pick'"
        >
          选点
        </button>
        <button
          class="tool-btn"
          :class="{ active: mapMode === 'draw' }"
          type="button"
          @click="mapMode = 'draw'"
        >
          绘制
        </button>
        <!-- 地图视角按钮移动到标题行 -->
      </div>

      <div v-if="isToolPanelOpen" class="tool-row">
        <!-- 选点模式暂未定义展示内容，后续再补充 -->
        <template v-if="isDrawMode">
          <!-- <button class="tool-btn" :class="{ active: tencentTool === 'marker' }" type="button" @click="setTencentTool('marker')">点</button>
          <button class="tool-btn" :class="{ active: tencentTool === 'polyline' }" type="button" @click="setTencentTool('polyline')">线</button> -->
          <button class="tool-btn" :class="{ active: tencentTool === 'polygon' }" :disabled="isEditorInteract" type="button" @click="setTencentTool('polygon')">多边形</button>
          <button class="tool-btn" :class="{ active: tencentTool === 'circle' }" :disabled="isEditorInteract" type="button" @click="setTencentTool('circle')">圆</button>
          <button class="tool-btn" :class="{ active: tencentTool === 'rectangle' }" :disabled="isEditorInteract" type="button" @click="setTencentTool('rectangle')">矩形</button>
          <button class="tool-btn" :class="{ active: tencentTool === 'ellipse' }" :disabled="isEditorInteract" type="button" @click="setTencentTool('ellipse')">椭圆</button>
          <button class="tool-btn" type="button" @click="toggleEditorMode">
            编辑器模式：{{ editorMode === tencentSdk?.tools?.constants?.EDITOR_ACTION?.DRAW ? '绘制' : '交互' }}
          </button>
        </template>
      </div>

      <span v-if="isDrawMode" class="tool-hint">点击地图区域移动鼠标开始绘制电子围栏</span>

      <div class="tool-footer">
        <button class="tool-btn tool-toggle" type="button" @click="isToolPanelOpen = !isToolPanelOpen">
          {{ isToolPanelOpen ? '收起选项' : '展开选项' }}
        </button>
      </div>
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

.header-actions {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.tool-bar {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 12px;
  border-bottom: 1px solid #f0f2f5;
  background: #fff;
}

.tool-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.tool-label {
  font-size: 12px;
  color: #6b7280;
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

.tool-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tool-btn.active {
  border-color: #4f46e5;
  color: #4f46e5;
  background: #eef2ff;
}

.tool-hint {
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  color: #6b7280;
}

.tool-footer {
  width: 100%;
  display: flex;
  justify-content: center;
  border-top: 1px solid #f0f2f5;
  padding-top: 8px;
  margin-top: 2px;
}

.tool-toggle {
  border-radius: 999px;
  padding: 4px 14px;
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
