/**
 * 地图模块前后端接口与数据结构（腾讯位置服务版）- TypeScript 类型定义
 * 更新：根据“地图渲染需要贴路网线路 + 沿线电子围栏”需求，新增 Render 聚合 DTO 与预览能力
 * 日期：2026-02-09
 *
 * 设计要点（前端只展示）：
 * - Route 业务对象只需保存点位顺序；“贴路网线路 polyline”属于计算结果。
 * - 为了前端一次请求即可渲染「路线 + 围栏」，建议后端提供聚合渲染接口：GET /api/routes/{id}/render
 * - 该 render 接口返回：route.polyline（贴路网点集） + route.bound + fences[]（circle/polygon几何）
 */

/* =========================
 * 0. 通用类型
 * ========================= */

export type ISODateTime = string; // ISO 8601，例如：2026-02-09T10:00:00Z
export type ISODate = string;     // YYYY-MM-DD

/** 后端通用响应包装 */
export interface ApiResponse<T = unknown> {
  /** 业务码：0=成功，其它=失败 */
  code: number;
  /** 提示信息 */
  message: string;
  /** 业务数据 */
  data: T;
}

/** 分页请求 */
export interface PageRequest {
  /** 页码，从 1 开始 */
  pageNo: number;
  /** 每页条数 */
  pageSize: number;
}

/** 分页响应 */
export interface PageResponse<T> {
  /** 总条数 */
  total: number;
  /** 当前页列表 */
  list: T[];
}

/** 经纬度坐标（坐标口径需前后端统一） */
export interface LngLat {
  /** 经度 */
  lng: number;
  /** 纬度 */
  lat: number;
}

/** 外接矩形，用于地图 fitBounds */
export interface Bound {
  /** 西南角 */
  sw: LngLat;
  /** 东北角 */
  ne: LngLat;
}

/**
 * 线条几何：
 * - 推荐：后端返回点集 LngLat[]
 * - 兼容：后端返回编码串 string（前端需额外解码）
 */
export type Polyline = LngLat[] | string;

/* =========================
 * 0.5 枚举
 * ========================= */

export enum FenceType {
  /** 圆形围栏 */
  CIRCLE = "CIRCLE",
  /** 多边形围栏（含正方形、三角形、不规则多边形等） */
  POLYGON = "POLYGON",
}

export enum FenceStatus {
  ENABLED = "ENABLED",
  DISABLED = "DISABLED",
}

export enum TravelMode {
  /** 骑行（本期固定） */
  BICYCLING = "BICYCLING",
}

export enum PunchType {
  /** 常规 */
  ROUTINE = "ROUTINE",
  /** 非常规 */
  NON_ROUTINE = "NON_ROUTINE",
}

export enum OrderFlag {
  /** 顺序正确 */
  ORDERED = "ORDERED",
  /** 非顺序 */
  NOT_ORDERED = "NOT_ORDERED",
}

export enum DeviationFlag {
  /** 正常 */
  NORMAL = "NORMAL",
  /** 存在偏差 */
  DEVIATED = "DEVIATED",
}

export enum ExportStatus {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
}

export enum ExportFileFormat {
  EXCEL = "EXCEL",
  PDF = "PDF",
}

export enum ExportType {
  /** 打卡记录导出 */
  PUNCH_RECORDS = "PUNCH_RECORDS",
}

/* =========================
 * 1. 电子围栏（Fence）
 * ========================= */

export interface FenceDTO {
  /** 围栏ID */
  id: string;
  /** 围栏名称 */
  name: string;
  /** 围栏类型 */
  type: FenceType;
  /** 启用状态 */
  status: FenceStatus;

  /** 圆心（仅 type=CIRCLE 有效） */
  center?: LngLat | null;
  /** 半径（米，仅 type=CIRCLE 有效） */
  radius?: number | null;

  /** 多边形点集（仅 type=POLYGON 有效） */
  points?: LngLat[] | null;

  /** 外接矩形（可选，用于地图快速定位） */
  bound?: Bound | null;

  /** 备注 */
  remark?: string | null;

  /** 创建时间 */
  createdAt?: ISODateTime;
  /** 更新时间 */
  updatedAt?: ISODateTime;
}

export interface FenceQueryRequest extends PageRequest {
  /** 名称关键字（可选） */
  keyword?: string;
  /** 状态过滤（可选） */
  status?: FenceStatus;
}

export type FenceListItem = Pick<FenceDTO, "id" | "name" | "type" | "status" | "bound">;

export interface FenceCreateRequest {
  name: string;
  type: FenceType;
  status: FenceStatus;

  center?: LngLat | null;
  radius?: number | null;

  points?: LngLat[] | null;

  remark?: string | null;
}

export type FenceUpdateRequest = FenceCreateRequest;

export interface IdResponse {
  id: string;
}

/* =========================
 * 2. 点位（Point / Checkpoint）
 * ========================= */

export interface PointDTO {
  /** 点位ID */
  id: string;
  /** 点位名称（本部/收货点等） */
  name: string;
  /** 坐标 */
  location: LngLat;
  /** 展示地址（建议后端逆地理编码填充后返回） */
  address?: string | null;
  /** 关联围栏ID（可选） */
  fenceId?: string | null;
  /** 备注 */
  remark?: string | null;

  createdAt?: ISODateTime;
  updatedAt?: ISODateTime;
}

export interface PointQueryRequest extends PageRequest {
  keyword?: string;
}

export interface PointCreateRequest {
  name: string;
  location: LngLat;
  fenceId?: string | null;
  remark?: string | null;
}

export type PointUpdateRequest = PointCreateRequest;

/* =========================
 * 3. 地理解析（逆地理编码）
 * ========================= */

export interface ReverseGeocodeResponse {
  /** 原始坐标 */
  location: LngLat;
  /** 完整地址（展示用） */
  address: string;
  /** 行政区信息（展示/筛选可用） */
  adInfo?: {
    province?: string;
    city?: string;
    district?: string;
  };
  /** 附近POI（可选） */
  poi?: {
    name?: string;
    distanceMeter?: number;
  };
}

/* =========================
 * 4. 路线（Route）与推荐排序/预览
 * ========================= */

/**
 * 路线点位引用：
 * - 业务上至少需要 pointId + order
 * - 为了减少前端二次查询点位详情，推荐后端在「详情/渲染」场景补充 name/location
 */
export interface RoutePointRef {
  /** 点位ID */
  pointId: string;
  /** 顺序号，从 1 开始 */
  order: number;

  /** 点位名称（可选：便于展示） */
  name?: string;
  /** 点位坐标（可选：便于地图打点） */
  location?: LngLat;
  /** 关联围栏ID集合（可选：便于渲染沿线围栏） */
  fenceIds?: string[];
}

export interface RouteDTO {
  id: string;
  name: string;
  travelMode: TravelMode;
  /** 点位顺序（业务骨架） */
  points: RoutePointRef[];
  remark?: string | null;

  createdAt?: ISODateTime;
  updatedAt?: ISODateTime;
}

export interface RouteQueryRequest extends PageRequest {
  keyword?: string;
}

export interface RouteCreateRequest {
  name: string;
  travelMode: TravelMode;
  points: Array<Pick<RoutePointRef, "pointId" | "order">>;
  remark?: string | null;
}

export type RouteUpdateRequest = RouteCreateRequest;

/** 推荐排序/预览计算请求 */
export interface RecommendOrderRequest {
  travelMode: TravelMode;
  /** 参与排序的点位集合 */
  pointIds: string[];
  /** 固定起点（可选） */
  fixedStartPointId?: string | null;
  /** 固定终点（可选） */
  fixedEndPointId?: string | null;
  /** 是否需要返回路线几何（建议详情/预览为 true） */
  needPolyline?: boolean;
}

/** 分段（可用于列表展示分段里程，也可用于地图画分段线） */
export interface RecommendOrderSegment {
  fromPointId: string;
  toPointId: string;
  theoryDistanceMeter: number;
  theoryDurationSecond: number;
  /** 线路几何（可选） */
  polyline?: Polyline;
}

/** 推荐排序/预览计算响应 */
export interface RecommendOrderResponse {
  orderedPointIds: string[];
  segments: RecommendOrderSegment[];
  totalTheoryDistanceMeter: number;
  totalTheoryDurationSecond: number;
  /** 可选：适配地图展示 */
  bound?: Bound;
  /** 可选：整条路线的合并 polyline（如果后端愿意返回，前端绘制更简单） */
  polyline?: Polyline;
}

/**
 * 路线预览 DTO（用于路线详情页地图展示）
 * - 典型接口：GET /api/routes/{id}?needPolyline=true  或  GET /api/routes/{id}/preview
 */
export interface RoutePreviewDTO {
  /** 视野外接矩形（建议返回） */
  bound?: Bound;
  /** 整体贴路网 polyline（推荐返回点集） */
  polyline?: Polyline;
  /** 分段详情（可选） */
  segments?: RecommendOrderSegment[];
  totalTheoryDistanceMeter?: number;
  totalTheoryDurationSecond?: number;
}

/** 路线详情返回（建议支持 needPolyline 参数） */
export interface RouteDetailDTO extends RouteDTO {
  /** needPolyline=true 时返回 */
  preview?: RoutePreviewDTO;
}

/* =========================
 * 4.1 地图渲染聚合（关键：路线 + 围栏 + 贴路网 polyline）
 * ========================= */

/**
 * 地图渲染聚合接口返回：
 * - 典型接口：GET /api/routes/{id}/render
 * - 目标：前端一次请求即可渲染「贴路网路线 + 沿线围栏（circle/polygon） + 点位 marker」
 */
export interface RouteRenderDTO {
  route: {
    id: string;
    name: string;
    travelMode: TravelMode;

    /** 推荐返回：地图 fitBounds */
    bound?: Bound;

    /**
     * 贴路网整条路线：
     * - 强烈推荐：LngLat[] 点集
     */
    polyline: LngLat[];

    /**
     * 点位（建议后端补齐 location/name，避免前端二次请求点位表）
     * fenceIds：该点位关联的围栏（可选）
     */
    points: Array<{
      id: string;
      name: string;
      location: LngLat;
      fenceIds?: string[];
    }>;

    /** 可选：分段（如果需要在 UI 展示分段里程/耗时） */
    segments?: RecommendOrderSegment[];

    /** 可选：总理论里程/耗时 */
    totalTheoryDistanceMeter?: number;
    totalTheoryDurationSecond?: number;
  };

  /** 该路线相关的围栏集合（circle/polygon） */
  fences: FenceDTO[];
}

/* =========================
 * 5. 打卡记录（PunchRecord）
 * ========================= */

export interface PunchRecordMapView {
  /** 起点坐标 */
  fromLocation: LngLat;
  /** 终点坐标 */
  toLocation: LngLat;
  /** 理论路线（可选） */
  theoryPolyline?: Polyline;
  /** 实际轨迹（可选） */
  actualTrackPolyline?: Polyline;
  /** 建议返回：地图 fitBounds */
  bound?: Bound;
}

export interface PunchRecordDTO {
  id: string;

  staffId: string;
  staffName?: string;

  deviceId?: string | null;
  routeId?: string | null;

  fromPointId?: string | null;
  toPointId?: string | null;

  arriveAt?: ISODateTime | null;
  leaveAt?: ISODateTime | null;

  /** 常规/非常规 */
  type: PunchType;
  /** 顺序正确/非顺序 */
  orderFlag: OrderFlag;
  /** 偏差标识 */
  deviationFlag: DeviationFlag;

  /** 理论里程（米） */
  theoryDistanceMeter?: number | null;
  /** 实际里程（米） */
  actualDistanceMeter?: number | null;
  /** 偏差百分比（例如 28.1） */
  deviationPercent?: number | null;

  /** 地图联动展示（可选：详情时返回） */
  mapView?: PunchRecordMapView;
}

export interface PunchRecordQueryRequest extends PageRequest {
  staffIds?: string[];
  dateFrom: ISODate;
  dateTo: ISODate;

  types?: PunchType[];
  orderFlags?: OrderFlag[];
  deviationFlags?: DeviationFlag[];

  /** 列表建议 false，详情 true */
  needPolyline?: boolean;
}

/* =========================
 * 6. 人员 / 设备（筛选&展示最小字段）
 * ========================= */

export interface StaffDTO {
  id: string;
  name: string;
  deptName?: string | null;

  /** 关联设备ID（可选） */
  deviceIds?: string[];
  /** 关联路线ID（可选） */
  routeIds?: string[];
}

export interface DeviceDTO {
  id: string;
  sn?: string | null;
  name?: string | null;

  /** 最后一次上报位置（可选） */
  lastLocation?: LngLat | null;
  /** 最后一次上报时间（可选） */
  lastReportAt?: ISODateTime | null;
}

/* =========================
 * 7. 导出（Export）
 * ========================= */

export interface ExportCreateRequest {
  type: ExportType;
  /** 与查询接口一致的过滤条件 */
  params: Record<string, unknown>;
  fileFormat: ExportFileFormat;
}

export interface ExportCreateResponse {
  taskId: string;
}

export interface ExportTaskDTO {
  taskId: string;
  status: ExportStatus;
  progress?: number;
  downloadUrl?: string | null;
  expiredAt?: ISODateTime | null;
}

/* =========================
 * 8. 接口返回类型别名（可选：让调用处更清晰）
 * ========================= */

/** 围栏列表接口返回 */
export type FenceQueryApiData = PageResponse<FenceListItem>;
/** 点位列表接口返回 */
export type PointQueryApiData = PageResponse<Pick<PointDTO, "id" | "name" | "location" | "address">>;
/** 路线列表接口返回 */
export type RouteQueryApiData = PageResponse<Pick<RouteDTO, "id" | "name" | "travelMode">>;
/** 打卡记录列表接口返回（列表精简版） */
export type PunchRecordQueryApiData = PageResponse<
  Pick<
    PunchRecordDTO,
    | "id"
    | "staffId"
    | "staffName"
    | "type"
    | "orderFlag"
    | "deviationFlag"
    | "theoryDistanceMeter"
    | "actualDistanceMeter"
    | "deviationPercent"
  >
>;

/** 路线详情接口返回（支持可选 preview） */
export type RouteDetailApiData = RouteDetailDTO;

/** 路线渲染聚合接口返回（路线 polyline + 围栏几何） */
export type RouteRenderApiData = RouteRenderDTO;

/* =========================
 * 9. 推荐的接口命名（仅注释，不强制）
 * ========================= *
 * - POST   /api/fences/query
 * - GET    /api/fences/{id}
 * - POST   /api/points/query
 * - GET    /api/points/{id}
 * - GET    /api/geo/reverse?lng=&lat=
 * - POST   /api/routes/query
 * - GET    /api/routes/{id}                 // 可选：?needPolyline=true 返回 preview
 * - GET    /api/routes/{id}/render          // 关键：一次性返回 polyline + fences
 * - POST   /api/routes/recommend-order      // 返回排序 + 可选 polyline/segments
 * - POST   /api/punch-records/query
 * - GET    /api/punch-records/{id}?needPolyline=true
 * - POST   /api/exports
 * - GET    /api/exports/{taskId}
 */
