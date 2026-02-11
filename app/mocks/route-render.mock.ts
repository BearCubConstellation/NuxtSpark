import { 
  FenceStatus, // 围栏状态枚举（来源：FenceDTO.status）
  FenceType, // 围栏类型枚举（来源：FenceDTO.type）
  TravelMode  // 出行方式枚举（来源：RouteRenderDTO.route.travelMode）
} from '../../documents/map-api.types_v1'
// 路线渲染数据（来源：RouteRenderDTO）
import type { RouteRenderDTO } from '../../documents/map-api.types_v1'

export const mockRouteRender: RouteRenderDTO = {
  // 路线渲染数据（来源：RouteRenderDTO.route）
  route: {
    // 路线ID（来源：RouteRenderDTO.route.id）
    id: 'route_001',
    // 路线名称（来源：RouteRenderDTO.route.name）
    name: '本部-东区配送线',
    // 出行方式（来源：RouteRenderDTO.route.travelMode / TravelMode）
    travelMode: TravelMode.BICYCLING,
    // 地图视野外接矩形（来源：RouteRenderDTO.route.bound / Bound）
    bound: {
      // 西南角坐标（来源：Bound.sw / LngLat）
      sw: { lng: 116.3805, lat: 39.902 },
      // 东北角坐标（来源：Bound.ne / LngLat）
      ne: { lng: 116.4285, lat: 39.934 },
    },
    // 贴路网整条路线（来源：RouteRenderDTO.route.polyline / LngLat[]）
    polyline: [
      { lng: 116.3899, lat: 39.9102 },
      { lng: 116.392, lat: 39.911 },
      { lng: 116.3955, lat: 39.913 },
      { lng: 116.401, lat: 39.917 },
      { lng: 116.4075, lat: 39.9205 },
      { lng: 116.414, lat: 39.924 },
    ],
    // 路线点位集合（来源：RouteRenderDTO.route.points）
    points: [
      {
        // 点位ID（来源：RouteRenderDTO.route.points[].id）
        id: 'point_001',
        // 点位名称（来源：RouteRenderDTO.route.points[].name）
        name: '本部',
        // 点位坐标（来源：RouteRenderDTO.route.points[].location / LngLat）
        location: { lng: 116.3899, lat: 39.9102 },
        // 点位关联的围栏ID集合（来源：RouteRenderDTO.route.points[].fenceIds）
        fenceIds: ['fence_001'],
      },
      {
        id: 'point_010',
        name: 'A收货点',
        location: { lng: 116.401, lat: 39.917 },
        fenceIds: ['fence_010'],
      },
      {
        id: 'point_020',
        name: 'B收货点',
        location: { lng: 116.414, lat: 39.924 },
        fenceIds: ['fence_020', 'fence_021'],
      },
    ],
    // 分段信息（来源：RouteRenderDTO.route.segments / RecommendOrderSegment[]）
    segments: [
      {
        // 起点点位ID（来源：RecommendOrderSegment.fromPointId）
        fromPointId: 'point_001',
        // 终点点位ID（来源：RecommendOrderSegment.toPointId）
        toPointId: 'point_010',
        // 理论距离（米）（来源：RecommendOrderSegment.theoryDistanceMeter）
        theoryDistanceMeter: 3200,
        // 理论时长（秒）（来源：RecommendOrderSegment.theoryDurationSecond）
        theoryDurationSecond: 900,
      },
      {
        fromPointId: 'point_010',
        toPointId: 'point_020',
        theoryDistanceMeter: 4100,
        theoryDurationSecond: 1200,
      },
    ],
    // 总理论里程（米）（来源：RouteRenderDTO.route.totalTheoryDistanceMeter）
    totalTheoryDistanceMeter: 7300,
    // 总理论耗时（秒）（来源：RouteRenderDTO.route.totalTheoryDurationSecond）
    totalTheoryDurationSecond: 2100,
  },
  // 路线相关的围栏集合（来源：RouteRenderDTO.fences / FenceDTO[]）
  fences: [
    {
      // 围栏ID（来源：FenceDTO.id）
      id: 'fence_001',
      // 围栏名称（来源：FenceDTO.name）
      name: '本部围栏',
      // 围栏类型（来源：FenceDTO.type / FenceType）
      type: FenceType.CIRCLE,
      // 围栏状态（来源：FenceDTO.status / FenceStatus）
      status: FenceStatus.ENABLED,
      // 圆心（来源：FenceDTO.center / LngLat）
      center: { lng: 116.3899, lat: 39.9102 },
      // 半径（米）（来源：FenceDTO.radius）
      radius: 200,
      // 备注（来源：FenceDTO.remark）
      remark: '本部范围',
    },
    {
      id: 'fence_010',
      name: 'A收货点围栏',
      type: FenceType.POLYGON,
      status: FenceStatus.ENABLED,
      // 多边形点集（来源：FenceDTO.points / LngLat[]）
      points: [
        { lng: 116.3995, lat: 39.916 },
        { lng: 116.4025, lat: 39.916 },
        { lng: 116.4025, lat: 39.9185 },
        { lng: 116.3995, lat: 39.9185 },
      ],
    },
    {
      id: 'fence_020',
      name: 'B收货点围栏-主区',
      type: FenceType.CIRCLE,
      status: FenceStatus.ENABLED,
      center: { lng: 116.414, lat: 39.924 },
      radius: 150,
    },
    {
      id: 'fence_021',
      name: 'B收货点围栏-扩展区',
      type: FenceType.POLYGON,
      status: FenceStatus.DISABLED,
      points: [
        { lng: 116.4125, lat: 39.923 },
        { lng: 116.4165, lat: 39.923 },
        { lng: 116.4165, lat: 39.9255 },
        { lng: 116.4125, lat: 39.9255 },
      ],
      remark: '备用扩展区',
    },
  ],
}
