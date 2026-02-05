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

const tencentTool = ref<'marker' | 'polyline' | 'polygon' | 'circle' | 'rectangle' | 'ellipse'>('rectangle') // 当前选中的绘制工具

function setTencentTool(id: typeof tencentTool.value) { // 切换腾讯绘制工具
  tencentTool.value = id // 更新当前选中工具
  ;(window as any).__tencentEditor?.setActiveOverlay?.(id) // 通知编辑器切换激活图层
}

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
      src: `https://map.qq.com/api/gljs?v=1.exp&key=${tencentKey.value}&libraries=tools`,
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

// 初始化腾讯地图入口
async function initTencent() { 

    // 读取腾讯地图 Key
    const key = tencentKey.value 
    console.info(`[map][tencent] key: ${maskKey(key)}`) // 输出 Key（半掩码）

    // 如果没有 Key
    if (!key) { 
        status.qq = 'missing-key'
        return
    }

    // 标记为加载中
    status.qq = 'loading' 

    // 进入初始化流程
    try { 
        // 等待 TMap 全局对象可用
        await waitForGlobal(() => Boolean((window as any).TMap))

        var tencentMap;
        let editor: any;

        // 读取全局 TMap
        const TMap = (window as any).TMap

        // 兜底校验
        if (!TMap) throw new Error('TMap not found')

        // 创建腾讯地图实例
        tencentMap = new TMap.Map(document.getElementById('qq-map'), { 
            center: new TMap.LatLng(defaultCenter.lat, defaultCenter.lng), // 设置中心点
            zoom: 12, // 设置缩放级别
            pitch: 35, // 设置俯仰角
        })

        // 初始化几何图形及编辑器
        var marker = new TMap.MultiMarker({
          map: tencentMap,
        });
        var polyline = new TMap.MultiPolyline({
          map: tencentMap,
        });
        var polygon = new TMap.MultiPolygon({
          map: tencentMap,
        });
        var circle = new TMap.MultiCircle({
          map: tencentMap,
        });
        var rectangle = new TMap.MultiRectangle({
          map: tencentMap,
        });
        var ellipse = new TMap.MultiEllipse({
          map: tencentMap,
        });
        
        editor = new TMap.tools.GeometryEditor({
          // TMap.tools.GeometryEditor 文档地址：https://lbs.qq.com/webApi/javascriptGL/glDoc/glDocEditor
          map: tencentMap, // 编辑器绑定的地图对象
          overlayList: [
            // 可编辑图层 文档地址：https://lbs.qq.com/webApi/javascriptGL/glDoc/glDocEditor#4
            {
              overlay: marker,
              id: 'marker',
            },
            {
              overlay: polyline,
              id: 'polyline',
            },
            {
              overlay: polygon,
              id: 'polygon',
            },
            {
              overlay: circle,
              id: 'circle',
            },
            {
              overlay: rectangle,
              id: 'rectangle',
            },
            {
              overlay: ellipse,
              id: 'ellipse',
            },
          ],
          actionMode: TMap.tools.constants.EDITOR_ACTION.DRAW, // 编辑器的工作模式
          activeOverlayId: tencentTool.value, // 激活图层
          snappable: true, // 开启吸附
        });

        // 暴露到全局，便于切换工具
        (window as any).__tencentEditor = editor;

        // 监听绘制结束事件，获取绘制几何图形
        editor.on('draw_complete', (geometry: any) => {
          // 判断当前处于编辑状态的图层id是否是overlayList中id为rectangle（矩形）图层
          var id = geometry.id;
          if (editor.getActiveOverlay().id === 'rectangle') {
            // 获取矩形顶点坐标
            var geo = rectangle.geometries.filter(function (item: any) {
              return item.id === id;
            });
            console.log('绘制的矩形定位的坐标：', geo[0].paths);
          }

          if (editor.getActiveOverlay().id === 'polygon') {
            // 获取多边形顶点坐标
            var geo = polygon.geometries.filter(function (item: any) {
              return item.id === id;
            });
            console.log('绘制的多边形坐标：', geo[0].paths);
          }

          if (editor.getActiveOverlay().id === 'circle') {
            // 获取多边形顶点坐标
            var geo = circle.geometries.filter(function (item: any) {
              return item.id === id;
            });
            console.log('绘制的圆形坐标：', geo[0].paths);
          }
        });

        status.qq = 'ready' // 标记为就绪

        console.info('[map][tencent] ready')
    } catch { // 捕获初始化异常
        status.qq = 'error' // 标记为错误
        console.warn('[map][tencent] init failed')
    } // 结束 try/catch
} // 结束 initTencent

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
          <div class="tool-bar">
            <button
              class="tool-btn"
              :class="{ active: tencentTool === 'marker' }"
              type="button"
              @click="setTencentTool('marker')"
            >
              点
            </button>
            <button
              class="tool-btn"
              :class="{ active: tencentTool === 'polyline' }"
              type="button"
              @click="setTencentTool('polyline')"
            >
              线
            </button>
            <button
              class="tool-btn"
              :class="{ active: tencentTool === 'polygon' }"
              type="button"
              @click="setTencentTool('polygon')"
            >
              多边形
            </button>
            <button
              class="tool-btn"
              :class="{ active: tencentTool === 'circle' }"
              type="button"
              @click="setTencentTool('circle')"
            >
              圆
            </button>
            <button
              class="tool-btn"
              :class="{ active: tencentTool === 'rectangle' }"
              type="button"
              @click="setTencentTool('rectangle')"
            >
              矩形
            </button>
            <button
              class="tool-btn"
              :class="{ active: tencentTool === 'ellipse' }"
              type="button"
              @click="setTencentTool('ellipse')"
            >
              椭圆
            </button>
          </div>
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

.tool-bar {
  display: flex;
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
