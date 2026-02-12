<script setup lang="ts">
import type { FenceDTO, PointDTO } from '~/types/map-api.types'

const config = useRuntimeConfig() // 运行时配置

const status = ref<'idle' | 'loading' | 'ready' | 'error' | 'missing-key'>('idle') // 地图初始化状态
const loadingStep = ref<string>('') // 初始化阶段提示
const lastError = ref<string>('') // 初始化失败原因

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
// 绘制完成事件处理器（用于解绑）
let drawCompleteHandler: ((geometry: any) => void) | null = null
// 各类图形图层引用
let tencentOverlays: Record<TencentTool, any> | null = null

// 点位图层引用
let displayMarkers: any = null
// 圆形图层引用
let displayFenceCircles: any = null
// 多边形图层引用
let displayFencePolygons: any = null
// 点位信息窗（支持多点位）
let displayPointInfoWindows: any[] = []

// 工具切换提示文案
const toolNotification = ref<string | null>(null)
// 工具提示定时器
let toolNoticeTimer: number | null = null
// 绘制结果输出
const drawOutput = ref<string>('')
// 编辑器当前模式
const editorMode = ref<any>(null)
// 地图挂载容器
const mapHost = ref<HTMLDivElement | null>(null)
// 地图当前是否为 3D 模式
const isMap3D = ref(false)
// 地图操作模式：选点 / 绘制
const mapMode = ref<'pick' | 'draw'>('draw')
// 是否展开按钮区域
const isToolPanelOpen = ref(true)

type PointWithFences = Pick<PointDTO, 'id' | 'name' | 'location' | 'address'> & {
  fences?: FenceDTO[] | null
}

const props = defineProps<{
  points?: PointWithFences[]
}>()

const emit = defineEmits<{
  (e: 'map-click', payload: { lat: number; lng: number }): void
}>()

// 当前编辑器是否处于交互模式
const isEditorInteract = computed(
  () => editorMode.value === tencentSdk?.tools?.constants?.EDITOR_ACTION?.INTERACT,
)

const isDrawMode = computed(() => mapMode.value === 'draw')
const isLoading = computed(() => status.value === 'loading')

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
  drawCompleteHandler = (geometry: any) => {
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
  }
  tencentEditor.on('draw_complete', drawCompleteHandler)
}

// 初始化地图显示图层（点位、围栏圆、围栏多边形）
function initDisplayLayers(TMap: any, map: any) {
  displayMarkers = new TMap.MultiMarker({
    map,
    styles: {
      point: new TMap.MarkerStyle({
        width: 22,
        height: 30,
        anchor: { x: 11, y: 30 },
        src: 'https://mapapi.qq.com/web/lbs/javascriptGL/demo/img/markerDefault.png',
      }),
    },
  })
  displayFenceCircles = new TMap.MultiCircle({
    map,
    styles: {
      fenceCircle: new TMap.CircleStyle({
        color: 'rgba(59, 130, 246, 0.25)',
        borderColor: '#3b82f6',
        borderWidth: 2,
      }),
    },
  })
  displayFencePolygons = new TMap.MultiPolygon({
    map,
    styles: {
      fencePolygon: new TMap.PolygonStyle({
        color: 'rgba(16, 185, 129, 0.25)',
        borderColor: '#10b981',
        borderWidth: 2,
      }),
    },
  })

  displayPointInfoWindows = []
}

// 根据点位数据更新地图显示
function updatePointDisplays() {
  // 没有地图实例或展示图层时直接返回
  if (!tencentSdk || !tencentMap) return
  if (!displayMarkers || !displayFenceCircles || !displayFencePolygons) return
  // 读取外部传入的点位数据（允许为空）
  const points = props.points ?? []
  // 生成点位 marker 的几何数据
  const markerGeometries = points.map((item) => ({
    id: item.id,
    styleId: 'point',
    position: new tencentSdk.LatLng(item.location.lat, item.location.lng),
    properties: {
      name: item.name,
      address: item.address ?? '',
    },
  }))
  // 更新点位图层
  displayMarkers.setGeometries(markerGeometries)

  // 清理旧点位信息窗
  if (displayPointInfoWindows.length > 0) {
    displayPointInfoWindows.forEach((info) => info?.close?.())
    displayPointInfoWindows = []
  }

  // 为每个点位创建信息窗
  if (points.length > 0) {
    points.forEach((point) => {
      const content = `
        <div class="map-info-window map-info-point-window">
          <div class="info-item">${point.name}</div>
        </div>
      `
      const infoWindow = new tencentSdk.InfoWindow({
        map: tencentMap,
        position: new tencentSdk.LatLng(point.location.lat, point.location.lng),
        content,
      })
      infoWindow.open()
      displayPointInfoWindows.push(infoWindow)
    })

    const first = points[0]
    if (first) {
      // 平滑移动到第一个点位位置，并根据当前地图模式调整视角
      easeToLocation(first.location.lng, first.location.lat, {
        zoom: 17,
        rotation: 90,
        pitch: isMap3D.value ? 70 : 0,
      })
    }
  }

  // 分别收集圆形与多边形围栏几何
  const circleGeometries: any[] = []
  const polygonGeometries: any[] = []
  points.forEach((item) => {
    // 单个点位可能关联多个围栏
    const fences = item.fences ?? []
    fences.forEach((fence) => {
      // 圆形围栏
      if (fence.type === 'CIRCLE' && fence.center && fence.radius) {
        circleGeometries.push({
          id: `fence-${fence.id}`,
          styleId: 'fenceCircle',
          center: new tencentSdk.LatLng(fence.center.lat, fence.center.lng),
          radius: fence.radius,
        })
      }
      // 多边形围栏
      if (fence.type === 'POLYGON' && fence.points && fence.points.length > 0) {
        polygonGeometries.push({
          id: `fence-${fence.id}`,
          styleId: 'fencePolygon',
          paths: fence.points.map((pt) => new tencentSdk.LatLng(pt.lat, pt.lng)),
        })
      }
    })
  })
  // 更新围栏图层
  displayFenceCircles.setGeometries(circleGeometries)
  displayFencePolygons.setGeometries(polygonGeometries)
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

// 切换绘制工具
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

// 平滑移动到指定坐标（可选调整缩放/旋转/俯仰）
function easeToLocation(
  lng: number,
  lat: number,
  options?: { zoom?: number; rotation?: number; pitch?: number; duration?: number },
) {
  if (!tencentMap || !tencentSdk) return
  const view = {
    center: new tencentSdk.LatLng(lat, lng),
    zoom: options?.zoom,
    rotation: options?.rotation,
    pitch: options?.pitch,
  }
  tencentMap.easeTo?.(view, { duration: options?.duration ?? 2000 })
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

// 打开窗体
function openInfoWindow(content: string, position: any) {
  if (!tencentSdk || !tencentMap) return
  const info = new tencentSdk.InfoWindow({
    map: tencentMap,
    content,
    position,
  })
  info.open()
}

// 地图点击回调
function clickCallback(evt: any){
  const lat = evt.latLng.getLat().toFixed(6);
  const lng = evt.latLng.getLng().toFixed(6);
  emit('map-click', { lat: Number(lat), lng: Number(lng) })
  // 绘制模式下不弹信息窗
  if (isDrawMode.value) return
  // 打开窗体展示Poi
  // 获取click事件返回的poi信息
  let poi = evt.poi || {name: '-'};
  const content = `
    <div class="map-info-window">
        <div class="info-item">${poi.name}</div>
        <div class="coord-item">${lat}, ${lng}</div>
        <div class="btn-group">
            <button class="map-btn btn-start" id="btnStart">设为起点</button>
            <button class="map-btn btn-way" id="btnWay">设为途经点</button>
            <button class="map-btn btn-end" id="btnEnd">设为终点</button>
        </div>
    </div>
  `;
  openInfoWindow(content, evt.latLng)
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
  loadingStep.value = '开始初始化'
  lastError.value = ''
  const startAt = Date.now()
  console.info('[map][tencent] 开始初始化')
  try {
    loadingStep.value = '加载SDK...'
    console.info('[map][tencent] 加载SDK...')
    // 加载 SDK 并等待全局对象就绪
    await loadScriptOnce('tencent-map-sdk', `https://map.qq.com/api/gljs?v=1.exp&key=${key}&libraries=tools`)
    loadingStep.value = '加载SDK完成'
    console.info('[map][tencent] 加载SDK完成', { 耗时ms: Date.now() - startAt })
    loadingStep.value = '等待全局对象开始'
    console.info('[map][tencent] 等待全局对象开始')
    await waitForGlobal(() => Boolean((window as any).TMap))
    loadingStep.value = '等待全局对象完成'
    console.info('[map][tencent] 等待全局对象完成', { 耗时ms: Date.now() - startAt })
    const TMap = (window as any).TMap
    if (!TMap) throw new Error('TMap not found')
    loadingStep.value = '获取TMap成功'
    console.info('[map][tencent] 获取TMap成功')
    tencentSdk = TMap
    const container = mapHost.value
    if (!container) throw new Error('qq-map container not found')

    loadingStep.value = '初始化天空盒开始'
    console.info('[map][tencent] 初始化天空盒开始')
    // 初始化天空盒
    const skybox = initSkyBox(TMap)
    loadingStep.value = '初始化天空盒完成'
    console.info('[map][tencent] 初始化天空盒完成', { 耗时ms: Date.now() - startAt })

    loadingStep.value = '创建地图实例开始'
    console.info('[map][tencent] 创建地图实例开始')
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
    loadingStep.value = '创建地图实例完成'
    console.info('[map][tencent] 创建地图实例完成', { 耗时ms: Date.now() - startAt })
    console.info('[tencent][map] created', { isMap3D: isMap3D.value })
    tencentMap.setViewMode?.(isMap3D.value ? '3D' : '2D')
    tencentMap.setPitch?.(isMap3D.value ? 70 : 0)
    syncMapDimensionState()

    loadingStep.value = '初始化绘制工具开始'
    console.info('[map][tencent] 正在初始化绘制工具')
    // 初始化绘制工具
    initTencentDrawTools(TMap, tencentMap)

    console.info('[map][tencent] 正在初始化地图显示图层')
    // 初始化地图显示图层
    initDisplayLayers(TMap, tencentMap)

    console.info('[map][tencent] 正在初始化数据更新显示')
    // 根据初始数据更新显示
    updatePointDisplays()

    console.info('[map][tencent] 相关图层与工具初始化完成', { 耗时ms: Date.now() - startAt })

    loadingStep.value = '绑定事件开始'
    console.info('[map][tencent] 绑定事件开始')
    editorMode.value = tencentEditor?.getActionMode?.() ?? TMap.tools.constants.EDITOR_ACTION.DRAW
    applyMapMode()

    //绑定点击事件到回调函数
    tencentMap.on("click", clickCallback)
    loadingStep.value = '绑定事件完成'
    console.info('[map][tencent] 绑定事件完成', { 耗时ms: Date.now() - startAt })

    status.value = 'ready'
    loadingStep.value = ''
    console.info('[map][tencent] 初始化成功', { 总耗时ms: Date.now() - startAt })
    console.info('[map][tencent] ready')
  } catch (err) {
    status.value = 'error'
    lastError.value = err instanceof Error ? err.message : String(err)
    loadingStep.value = ''
    console.warn('[map][tencent] 初始化失败', err)
    console.info('[map][tencent] 初始化结束', { 状态: status.value, 总耗时ms: Date.now() - startAt })
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

watch(
  () => props.points,
  () => {
    updatePointDisplays()
  },
  { deep: true },
)

// 组件卸载前清理定时器
function destroyTencentMap() {
  // 释放事件与对象引用
  if (tencentEditor?.off) {
    if (drawCompleteHandler) {
      tencentEditor.off('draw_complete', drawCompleteHandler)
      drawCompleteHandler = null
    }
  }
  tencentEditor?.destroy?.()
  tencentEditor = null
  tencentMap?.off?.('click', clickCallback)
  tencentMap?.destroy?.()
  tencentMap = null
  if (tencentOverlays) {
    Object.values(tencentOverlays).forEach((overlay: any) => overlay?.setMap?.(null))
    tencentOverlays = null
  }
  if (displayMarkers) {
    displayMarkers.setMap?.(null)
    displayMarkers = null
  }
  if (displayFenceCircles) {
    displayFenceCircles.setMap?.(null)
    displayFenceCircles = null
  }
  if (displayFencePolygons) {
    displayFencePolygons.setMap?.(null)
    displayFencePolygons = null
  }
  if (displayPointInfoWindows.length > 0) {
    displayPointInfoWindows.forEach((info) => info?.close?.())
    displayPointInfoWindows = []
  }
  if (toolNoticeTimer) {
    window.clearTimeout(toolNoticeTimer)
    toolNoticeTimer = null
  }
}

async function refreshTencentMap() {
  console.info('[map][tencent] 刷新地图被点击', { status: status.value })
  if (status.value === 'loading') return
  console.info('[map][tencent] refresh start')
  status.value = 'loading'
  destroyTencentMap()
  await initTencent()
  console.info('[map][tencent] refresh end', { status: status.value })
}

onBeforeUnmount(() => {
  // 卸载时释放事件与对象引用
  destroyTencentMap()
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
          :disabled="isLoading"
          @click="isToolPanelOpen = !isToolPanelOpen"
        >
          展开选项
        </button>
        <button class="tool-btn" type="button" :disabled="isLoading" @click="toggleMapDimension">
          地图视角：{{ isMap3D ? '3D' : '2D' }}
        </button>
        <button class="tool-btn" type="button" @click="refreshTencentMap">
          刷新地图
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
          :disabled="isLoading"
          @click="mapMode = 'pick'"
        >
          选点
        </button>
        <button
          class="tool-btn"
          :class="{ active: mapMode === 'draw' }"
          type="button"
          :disabled="isLoading"
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
          <button class="tool-btn" :class="{ active: tencentTool === 'polygon' }" :disabled="isEditorInteract || isLoading" type="button" @click="setTencentTool('polygon')">多边形</button>
          <button class="tool-btn" :class="{ active: tencentTool === 'circle' }" :disabled="isEditorInteract || isLoading" type="button" @click="setTencentTool('circle')">圆</button>
          <button class="tool-btn" :class="{ active: tencentTool === 'rectangle' }" :disabled="isEditorInteract || isLoading" type="button" @click="setTencentTool('rectangle')">矩形</button>
          <button class="tool-btn" :class="{ active: tencentTool === 'ellipse' }" :disabled="isEditorInteract || isLoading" type="button" @click="setTencentTool('ellipse')">椭圆</button>
          <button class="tool-btn" type="button" :disabled="isLoading" @click="toggleEditorMode">
            编辑器模式：{{ editorMode === tencentSdk?.tools?.constants?.EDITOR_ACTION?.DRAW ? '绘制' : '交互' }}
          </button>
        </template>
      </div>

      <span v-if="isDrawMode" class="tool-hint">点击地图区域移动鼠标开始绘制电子围栏</span>

      <div class="tool-footer">
        <button class="tool-btn tool-toggle" type="button" :disabled="isLoading" @click="isToolPanelOpen = !isToolPanelOpen">
          {{ isToolPanelOpen ? '收起选项' : '展开选项' }}
        </button>
      </div>
    </div>
    <transition name="tool-toast">
      <div v-if="toolNotification" class="tool-toast">{{ toolNotification }}</div>
    </transition>
    <div id="qq-map" class="map">
      <div ref="mapHost" class="map-host"></div>
      <div v-if="status !== 'ready'" class="placeholder">
        {{
          status === 'missing-key'
            ? '缺少 Key'
            : status === 'loading'
              ? (loadingStep || '正在加载')
              : `初始化失败：${lastError || '未知错误'}`
        }}
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

.map-host {
  width: 100%;
  height: 100%;
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

/* 由于 info window 是动态插入的，不能使用 scoped 样式 */
</style>

<style>
/* 信息窗口主容器样式 */
.map-info-window {
    /* border: 1px solid #e5e5e5; */
    /* border-radius: 8px; */
    /* box-shadow: 0 2px 8px rgba(0,0,0,0.1); */
    display: flex;
    flex-direction: column;
    gap: 8px; /* 增大间距更舒适 */
    padding: 2px; /* 合理内边距 */
    min-width: 10px; /* 适配按钮宽度 */
    /* background: #fff; */
}
.map-info-point-window {
    min-width: 10px; /* 适配按钮宽度 */
}

/* 信息项样式 */
.map-info-window .info-item {
    font-size: 14px;
    color: #333;
    line-height: 1.5;
    padding: 0 4px;
}

/* 坐标文本样式 */
.map-info-window .coord-item {
    font-size: 12px;
    color: #666;
    padding: 0 4px;
}

/* 按钮容器：横向排列 */
.map-info-window .btn-group {
    display: flex;
    gap: 6px; /* 按钮间距 */
    margin-top: 4px;
}

/* 通用按钮样式 */
.map-info-window .map-btn {
    flex: 1; /* 按钮等分宽度 */
    height: 32px;
    line-height: 32px;
    text-align: center;
    border-radius: 4px;
    border: none;
    color: #fff;
    font-size: 13px;
    cursor: pointer; /* 鼠标指针 */
    transition: background 0.2s; /* 过渡动画 */
}

/* 不同按钮区分色 */
.map-info-window .btn-start {
    background: #409eff; /* 起点-蓝色 */
}
.map-info-window .btn-way {
    background: #67c23a; /* 途经点-绿色 */
}
.map-info-window .btn-end {
    background: #f56c6c; /* 终点-红色 */
}

/* 按钮hover效果 */
.map-info-window .btn-start:hover {
    background: #66b1ff;
}
.map-info-window .btn-way:hover {
    background: #85ce61;
}
.map-info-window .btn-end:hover {
    background: #f78989;
}

/* 按钮禁用/点击态（可选） */
.map-info-window .map-btn:active {
    opacity: 0.8;
}
</style>
