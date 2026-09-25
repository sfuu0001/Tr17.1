/**
 * 品牌区域运维地图数据大屏 (Brand Regional Operations & Maintenance Map Data Dashboard)
 * 严格遵循《品牌区域运维地图数据大屏完整需求文档》构建
 *
 * 核心管控主体五大维度：
 * 1. 区经理（网格）
 * 2. 固定门店
 * 3. 流动餐车（全6大状态）
 * 4. 配送骑手（进行中全轨迹）
 * 5. 终端用户（实时分布与供需态势）
 *
 * 架构四大模块：
 * - 地图可视化主区域 (SVG 矢量沙盘、图层管控、层级切换、空间测距、区域圈选)
 * - 顶部数据概览统计栏 (网格/门店/餐车/骑手/用户/订单实时总览、刷新频率、角色权限)
 * - 右侧分类功能侧边栏 (全域精准检索、异常预警中枢、轨迹回放、供需分析、审计导出)
 * - 弹窗详情交互层 (五大主体专属详情面板、网格穿透)
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ChevronUp,
  ChevronDown,
  LayoutGrid,
  Truck,
  Bike,
  Users,
  AlertTriangle,
  Layers,
  Store,
  Activity,
  Crosshair,
  Flame,
  SlidersHorizontal,
  X,
  Eye,
  Route,
  Radio,
  Search,
  Bell,
  Shield,
  MapPin,
  Plus,
  Minus,
  LocateFixed,
  Ruler,
  BoxSelect,
  Scan,
  Maximize2,
  Minimize2,
  Clock,
  BatteryCharging,
  History,
  Download,
  Zap,
  CheckCircle2,
  UserCheck,
  Building,
  TrendingUp,
  RefreshCw,
  Sliders,
  Filter,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Navigation,
  Phone,
  PenTool,
  BookmarkCheck,
  BookmarkPlus,
  Trash2,
  Box
} from 'lucide-react';
import { Order } from '../../types';
import { sendOrderChatMessage } from '../../utils/chatHub';
import { safeGetStorage, safeSetStorage } from '../../utils/safeStorage';
import { playChimeSound } from '../../utils/voiceAlertEngine';
import { fetchOrdersFromCloud } from '../../utils/cloudbase';
import { M_PER_PX } from './cockpit/geoUtils';
import {
  INITIAL_ZONES,
  INITIAL_MANAGERS,
  INITIAL_STORES,
  INITIAL_TRUCKS,
  INITIAL_RIDERS,
  INITIAL_ANOMALIES,
  ManagerEntity,
  StoreEntity,
  TruckEntity,
  RiderEntity,
  RiderActiveOrder,
  UserEntity,
  ZoneMesh,
  AnomalyRecord,
  AuditLogItem
} from './cockpit/cockpitData';
import { AMapEngineView } from './cockpit/AMapEngineView';
import { LoopOpsWorkflowModal } from './cockpit/LoopOpsWorkflowModal';

// 竞争对手情报条目
export interface CompetitorRecord {
  id: string;
  name: string;
  category: string;
  zoneId: string;
  zoneName: string;
  threatLevel: 'high' | 'medium' | 'low';
  coords: { x: number; y: number };
  auditTime: string;
  strategy: string;
  isArchived?: boolean;
  archivedAt?: string;
}

const INITIAL_COMPETITORS: CompetitorRecord[] = [
  {
    id: 'comp-01',
    name: '火焰乌炭烤',
    category: '街头炭烤/汉堡车',
    zoneId: 'zone-01',
    zoneName: '静安创智 CBD',
    threatLevel: 'high',
    coords: { x: 840, y: 340 },
    auditTime: '2026-09-09 17:30',
    strategy: '17:00后在静安商务区路口分流客流，建议派出01号餐车联动分流优惠券'
  },
  {
    id: 'comp-02',
    name: '苏河客栈等',
    category: '传统江湖菜/平价快餐',
    zoneId: 'zone-01',
    zoneName: '静安创智 CBD',
    threatLevel: 'high',
    coords: { x: 650, y: 430 }, // 避开 rider-03 (670, 460) 的重叠
    auditTime: '2026-09-09 16:15',
    strategy: '午间推出25元平价套餐，建议投放苏河湾专属立减5元午餐补贴券'
  },
  {
    id: 'comp-03',
    name: '张江创客轻食车',
    category: '健康沙拉/能量卷',
    zoneId: 'zone-03',
    zoneName: '张江高科创新谷',
    threatLevel: 'medium',
    coords: { x: 1380, y: 520 },
    auditTime: '2026-09-09 18:00',
    strategy: '晚间出摊，主打程序员夜间减脂轻食，可联动06号深夜串烧专备车推出夜宵反制'
  },
  {
    id: 'comp-04',
    name: '滨河深夜串吧',
    category: '流动烤串/熟食车',
    zoneId: 'zone-02',
    zoneName: '苏河湾金融商圈',
    threatLevel: 'medium',
    coords: { x: 1190, y: 460 },
    auditTime: '2026-09-09 18:00',
    strategy: '滨水夜市客流拦截，联动03号与04号流动车开启联合优惠'
  }
];
import {
  ManagerDetailModal,
  StoreDetailModal,
  TruckDetailModal,
  RiderDetailModal,
  ZoneDetailModal,
  CompetitorDetailModal
} from './cockpit/DetailModals';
import {
  SearchDrawer,
  AnomalyDrawer,
  TrajectoryPlaybackDrawer,
  RegionalIntelligenceDrawer,
  AuditExportDrawer
} from './cockpit/DrawersAndSidebars';

interface DigitalTwinCommandCockpitProps {
  orders: Order[];
  showToast: (msg: string) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const DigitalTwinCommandCockpit: React.FC<DigitalTwinCommandCockpitProps> = ({
  orders,
  showToast,
  isFullscreen = false,
  onToggleFullscreen
}) => {
  // -------------------------------------------------------------
  // 1. 全局时钟与刷新机制 (3.1.3)
  // -------------------------------------------------------------
  const [liveTime, setLiveTime] = useState('');
  const [refreshInterval, setRefreshInterval] = useState<10 | 30 | 60>(10);
  const [countdown, setCountdown] = useState(10);
  const [lastRefreshedAt, setLastRefreshedAt] = useState('刚刚');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLiveTime(now.toLocaleTimeString('zh-CN', { hour12: false }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // 倒计时与自动刷新
  useEffect(() => {
    setCountdown(refreshInterval);
    const intervalTimer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // 触发自动刷新
          handleManualRefresh(false);
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalTimer);
  }, [refreshInterval]);

  // -------------------------------------------------------------
  // 2. 角色与权限管控 (五、权限与角色管控需求)
  // -------------------------------------------------------------
  type UserRole = 'super_admin' | 'hq_ops' | 'regional_director';
  const [currentRole, setCurrentRole] = useState<UserRole>('super_admin');
  const [selectedRegionalZone, setSelectedRegionalZone] = useState<string>('zone-02'); // 苏河湾

  // -------------------------------------------------------------
  // 2.1 腾讯云数据持久化与实时对齐 (云开发 CloudBase)
  // -------------------------------------------------------------
  const [cloudOrders, setCloudOrders] = useState<Order[]>(() => {
    if (orders && orders.length > 0) return orders;
    return safeGetStorage<Order[]>('obsidian_truck_orders', []);
  });
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [cloudSyncInfo, setCloudSyncInfo] = useState<{
    isSyncing: boolean;
    lastSyncedAt: string;
    source: string;
    totalOrders: number;
  }>({
    isSyncing: false,
    lastSyncedAt: '正在联机...',
    source: '腾讯云云开发 (TCB)',
    totalOrders: orders?.length || 0
  });

  // 骑手自定义轨迹聚焦与独立巡查状态
  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(null);
  const [showAllRiderRoutes, setShowAllRiderRoutes] = useState<boolean>(false);

  // -------------------------------------------------------------
  // 3. 核心实体数据集状态 (五大主体)
  // -------------------------------------------------------------
  const [managers, setManagers] = useState<ManagerEntity[]>(INITIAL_MANAGERS);
  const [stores, setStores] = useState<StoreEntity[]>(INITIAL_STORES);
  const [trucks, setTrucks] = useState<TruckEntity[]>(INITIAL_TRUCKS);
  const [riders, setRiders] = useState<RiderEntity[]>(INITIAL_RIDERS);
  const [zones, setZones] = useState<ZoneMesh[]>(INITIAL_ZONES);
  const [anomalies, setAnomalies] = useState<AnomalyRecord[]>(INITIAL_ANOMALIES);

  // 竞争对手情报状态
  const [competitors, setCompetitors] = useState<CompetitorRecord[]>(INITIAL_COMPETITORS);
  const [showCompetitorRadar, setShowCompetitorRadar] = useState(false);
  const [showAddCompetitorModal, setShowAddCompetitorModal] = useState(false);
  const [competitorSearch, setCompetitorSearch] = useState('');
  const [competitorFilter, setCompetitorFilter] = useState<'全部' | '已入库' | '待入库' | '高威胁' | '中威胁' | '旁观关注'>('全部');
  const [showLayerPanel, setShowLayerPanel] = useState(false);

  // 地图底图引擎状态：高德地图 2.0 (真实路网) 与 数字孪生矢量沙盘
  const [mapEngine, setMapEngine] = useState<'amap' | 'sandbox'>(() => {
    const hasAmapKey =
      Boolean(import.meta.env.VITE_AMAP_KEY) ||
      Boolean(localStorage.getItem('URBAN_RADAR_AMAP_KEY'));
    return hasAmapKey ? 'amap' : 'sandbox';
  });
  // 闭环运力调度中枢弹窗
  const [showLoopOpsModal, setShowLoopOpsModal] = useState(false);

  // 新增对手表单状态
  const [newCompName, setNewCompName] = useState('');
  const [newCompCategory, setNewCompCategory] = useState('');
  const [newCompZone, setNewCompZone] = useState('zone-02');
  const [newCompThreat, setNewCompThreat] = useState<'high' | 'medium' | 'low'>('high');
  const [newCompCoords, setNewCompCoords] = useState('850, 420');
  const [newCompTime, setNewCompTime] = useState('');
  const [newCompStrategy, setNewCompStrategy] = useState('');

  // 模拟终端用户散点群 (3.6)
  const users: UserEntity[] = useMemo(() => [
    { id: 'usr-101', phoneMask: '138****8891', zoneId: 'zone-01', zoneName: '静安创智 CBD', lastActive: '1分钟前', coords: { x: 690, y: 390 }, orderFrequency: '高频 (周3次)' },
    { id: 'usr-102', phoneMask: '139****7722', zoneId: 'zone-01', zoneName: '静安创智 CBD', lastActive: '3分钟前', coords: { x: 740, y: 460 }, orderFrequency: '日常午餐' },
    { id: 'usr-103', phoneMask: '136****1283', zoneId: 'zone-02', zoneName: '苏河湾金融商圈', lastActive: '刚刚', coords: { x: 990, y: 460 }, isCluster: true, clusterCount: 142, orderFrequency: '夜市狂欢' },
    { id: 'usr-104', phoneMask: '137****9034', zoneId: 'zone-02', zoneName: '苏河湾金融商圈', lastActive: '2分钟前', coords: { x: 1080, y: 530 }, isCluster: true, clusterCount: 88, orderFrequency: '白领下班' },
    { id: 'usr-105', phoneMask: '188****6655', zoneId: 'zone-02', zoneName: '苏河湾金融商圈', lastActive: '5分钟前', coords: { x: 1140, y: 490 }, orderFrequency: '高频下午茶' },
    { id: 'usr-106', phoneMask: '150****4326', zoneId: 'zone-03', zoneName: '张江高科创新谷', lastActive: '刚刚', coords: { x: 1440, y: 530 }, isCluster: true, clusterCount: 65, orderFrequency: '程序员夜宵' },
    { id: 'usr-107', phoneMask: '135****6789', zoneId: 'zone-03', zoneName: '张江高科创新谷', lastActive: '4分钟前', coords: { x: 1390, y: 590 }, orderFrequency: '高频加班餐' }
  ], []);

  // 操作审计日志 (3.9)
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([
    { id: 'log-1', action: '平台大屏初始化载入', operator: '超级管理员 (SA-01)', role: '超级管理员', time: '17:00:15', details: '全域 3 网格、4 门店、6 餐车、22 骑手点位成功上屏' },
    { id: 'log-2', action: '触发离线预警通知', operator: '系统自动监控', role: '系统内核', time: '17:15:32', details: '张江片区区经理张晓鹏离线达 45 分钟未签到，自动触发告警' }
  ]);

  const addAuditLog = (action: string, details: string) => {
    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      action,
      operator: currentRole === 'super_admin' ? '超级管理员' : currentRole === 'hq_ops' ? '总部运营管理员' : '区域负责人',
      role: currentRole,
      time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      details
    };
    setAuditLogs((prev) => [newLog, ...prev.slice(0, 49)]);
  };

  // -------------------------------------------------------------
  // 4. 地图视口、层级与图层管控 (3.1.2)
  // -------------------------------------------------------------
  const [zoomLevel, setZoomLevel] = useState(0.85);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // 层级切换：全国 -> 城市(上海) -> 区域 -> 网格
  type MapHierarchy = 'country' | 'city' | 'district' | 'grid';
  const [mapHierarchy, setMapHierarchy] = useState<MapHierarchy>('district');

  // 图层独立开关
  const [layerVisibility, setLayerVisibility] = useState({
    mesh: true, // 区经理网格
    store: true, // 固定门店
    storeRadius: true, // 门店服务辐射半径与高精雷达扫描圈
    truck: true, // 流动餐车
    truckRadius: false, // 餐车覆盖半径
    rider: true, // 配送骑手
    riderRoutes: true, // 骑手在途轨迹
    userHeatmap: true, // 用户热力图
    userPoints: true // 用户散点
  });

  const toggleLayer = (key: keyof typeof layerVisibility) => {
    setLayerVisibility((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      addAuditLog('图层切换操作', `图层【${key}】切换为: ${next[key] ? '开启' : '隐藏'}`);
      return next;
    });
  };

  // 联动层级切换
  const handleSwitchHierarchy = (h: MapHierarchy) => {
    setMapHierarchy(h);
    if (h === 'city') {
      setZoomLevel(0.72);
      setLayerVisibility((prev) => ({
        ...prev,
        mesh: true,
        store: true,
        storeRadius: false,
        truck: true,
        truckRadius: false,
        rider: true,
        riderRoutes: false,
        userHeatmap: true,
        userPoints: false
      }));
      showToast('已切换至城市全局视角：展示核心骨干网格与宏观运力分布');
    } else if (h === 'district') {
      setZoomLevel(1.1);
      setLayerVisibility((prev) => ({
        ...prev,
        mesh: true,
        store: true,
        storeRadius: false,
        truck: true,
        truckRadius: false,
        rider: true,
        riderRoutes: true,
        userHeatmap: true,
        userPoints: true
      }));
      showToast('已切换至城区标准视角：展示商圈运力、在途轨迹与客流态势');
    } else if (h === 'grid') {
      setZoomLevel(1.6);
      setLayerVisibility((prev) => ({
        ...prev,
        mesh: true,
        store: true,
        storeRadius: true,
        truck: true,
        truckRadius: true,
        rider: true,
        riderRoutes: true,
        userHeatmap: false,
        userPoints: true
      }));
      showToast('已切换至网格精细视角：激活门店与餐车辐射圈及微观配送');
    }
    playChimeSound('order');
  };

  // 网格透明度
  const [meshOpacity, setMeshOpacity] = useState(0.06);

  // 空间工具 (3.1.2 测距、圈选与多边形钢笔绘图)
  const [activeTool, setActiveTool] = useState<'none' | 'measure' | 'select' | 'draw_polygon'>('none');
  const [measurePoints, setMeasurePoints] = useState<{ x: number; y: number }[]>([]);
  const [selectionBox, setSelectionBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectStart, setSelectStart] = useState<{ x: number; y: number } | null>(null);
  const [selectedAreaStats, setSelectedAreaStats] = useState<{
    stores: number;
    trucks: number;
    riders: number;
    users: number;
  } | null>(null);

  // 区经理网格多边形编辑状态 (钢笔绘制指定锚点形状)
  const [drawingZoneId, setDrawingZoneId] = useState<string>('zone-01');
  const [drawingPoints, setDrawingPoints] = useState<{ x: number; y: number }[]>([]);

  // 视角控制：2D 垂直俯视 / 3D 倾角鸟瞰
  const [viewPerspective, setViewPerspective] = useState<'2d' | '3d'>('2d');
  const [viewActionTrigger, setViewActionTrigger] = useState<{
    type: 'zoomIn' | 'zoomOut' | 'reset' | 'perspective';
    timestamp: number;
  } | null>(null);

  // 选中的实体详情与店铺锚点吸附屏幕坐标
  const [activeEntity, setActiveEntity] = useState<{
    type: 'manager' | 'store' | 'truck' | 'rider' | 'zone';
    id: string;
  } | null>(null);
  const [storeAnchorPos, setStoreAnchorPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedCompetitorInfo, setSelectedCompetitorInfo] = useState<{
    record: CompetitorRecord;
    screenPos?: { x: number; y: number };
  } | null>(null);

  // 右侧功能抽屉
  type ActiveDrawer = 'none' | 'search' | 'anomalies' | 'playback' | 'intelligence' | 'audit_export' | 'layer_settings';
  const [activeDrawer, setActiveDrawer] = useState<ActiveDrawer>('none');

  // 顶栏折叠开关
  const [topBarCollapsed, setTopBarCollapsed] = useState(false);

  // -------------------------------------------------------------
  // 6. 地图视口自适应与平移缩放处理
  // -------------------------------------------------------------
  // 视口自适应居中算法 (根据容器动态适配 1920x1080 矢量沙盘)
  const computeFitView = useCallback(() => {
    if (!viewportRef.current) return { zoom: 0.8, offset: { x: 0, y: 0 } };
    const rect = viewportRef.current.getBoundingClientRect();
    const containerW = rect.width || 1280;
    const containerH = rect.height || 720;
    const scale = Math.min(containerW / 1920, containerH / 1080) * 0.96;
    const clampedScale = Math.max(0.45, Math.min(scale, 1.4));
    const offsetX = (containerW - 1920 * clampedScale) / 2;
    const offsetY = (containerH - 1080 * clampedScale) / 2;
    return { zoom: clampedScale, offset: { x: offsetX, y: offsetY } };
  }, []);

  // 组件挂载时自动居中自适应，并监听窗口大小变动
  useEffect(() => {
    const timer = setTimeout(() => {
      const fit = computeFitView();
      setZoomLevel(fit.zoom);
      setPanOffset(fit.offset);
    }, 100);

    const handleResize = () => {
      const fit = computeFitView();
      setZoomLevel(fit.zoom);
      setPanOffset(fit.offset);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [computeFitView]);

  const handleWheel = (e: React.WheelEvent) => {
    if (mapEngine === 'amap') return;
    e.preventDefault();
    const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoomLevel((prev) => Math.min(Math.max(0.45, prev + zoomDelta), 2.8));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (mapEngine === 'amap') return;
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clickX = (e.clientX - rect.left - panOffset.x) / zoomLevel;
    const clickY = (e.clientY - rect.top - panOffset.y) / zoomLevel;

    if (activeTool === 'measure') {
      if (measurePoints.length >= 2) {
        setMeasurePoints([{ x: clickX, y: clickY }]);
      } else {
        const nextPts = [...measurePoints, { x: clickX, y: clickY }];
        setMeasurePoints(nextPts);
        if (nextPts.length === 2) {
          const dx = nextPts[1].x - nextPts[0].x;
          const dy = nextPts[1].y - nextPts[0].y;
          const distMeters = Math.round(Math.sqrt(dx * dx + dy * dy) * M_PER_PX);
          const estMins = Math.ceil(distMeters / 350);
          const distText = distMeters >= 1000 ? `${(distMeters / 1000).toFixed(2)} 公里` : `${distMeters} 米`;
          showToast(`空间测距: 直线距离 ${distText}，骑手预计送达耗时 ${estMins} 分钟`);
          playChimeSound('order');
        }
      }
      return;
    }

    if (activeTool === 'select') {
      setIsSelecting(true);
      setSelectStart({ x: clickX, y: clickY });
      setSelectionBox({ x1: clickX, y1: clickY, x2: clickX, y2: clickY });
      return;
    }

    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (mapEngine === 'amap') return;
    if (activeTool === 'select' && isSelecting && selectStart) {
      const rect = viewportRef.current?.getBoundingClientRect();
      if (!rect) return;
      const currentX = (e.clientX - rect.left - panOffset.x) / zoomLevel;
      const currentY = (e.clientY - rect.top - panOffset.y) / zoomLevel;
      const x1 = Math.min(selectStart.x, currentX);
      const y1 = Math.min(selectStart.y, currentY);
      const x2 = Math.max(selectStart.x, currentX);
      const y2 = Math.max(selectStart.y, currentY);
      setSelectionBox({ x1, y1, x2, y2 });

      const matchedStores = filteredStores.filter((s) => s.coords.x >= x1 && s.coords.x <= x2 && s.coords.y >= y1 && s.coords.y <= y2).length;
      const matchedTrucks = filteredTrucks.filter((t) => t.coords.x >= x1 && t.coords.x <= x2 && t.coords.y >= y1 && t.coords.y <= y2).length;
      const matchedRiders = filteredRiders.filter((r) => r.coords.x >= x1 && r.coords.x <= x2 && r.coords.y >= y1 && r.coords.y <= y2).length;
      const matchedUsers = filteredUsers.filter((u) => u.coords.x >= x1 && u.coords.x <= x2 && u.coords.y >= y1 && u.coords.y <= y2).length;
      setSelectedAreaStats({
        stores: matchedStores,
        trucks: matchedTrucks,
        riders: matchedRiders,
        users: matchedUsers
      });
      return;
    }

    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    if (mapEngine === 'amap') return;
    if (isSelecting) {
      setIsSelecting(false);
      if (selectionBox && Math.abs(selectionBox.x2 - selectionBox.x1) > 25 && Math.abs(selectionBox.y2 - selectionBox.y1) > 25) {
        showToast(
          `圈选分析完成：区域内覆盖 ${selectedAreaStats?.stores || 0} 门店、${selectedAreaStats?.trucks || 0} 餐车、${selectedAreaStats?.riders || 0} 骑手、${selectedAreaStats?.users || 0} 在线用户群`
        );
        playChimeSound('call');
      }
    }
    setIsDragging(false);
  };

  const resetView = () => {
    const fit = computeFitView();
    setZoomLevel(fit.zoom);
    setPanOffset(fit.offset);
    setMeasurePoints([]);
    setSelectionBox(null);
    setSelectedAreaStats(null);
    showToast('沙盘视角已自适应居中全景');
    playChimeSound('order');
  };

  // 穿透聚焦特定坐标
  const focusOnCoordinates = (x: number, y: number) => {
    if (!viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const targetZoom = 1.35;
    setZoomLevel(targetZoom);
    setPanOffset({
      x: centerX - x * targetZoom,
      y: centerY - y * targetZoom
    });
    playChimeSound('call');
  };

  // -------------------------------------------------------------
  // 7. 搜索定位穿透联动 (3.1.1)
  // -------------------------------------------------------------
  const handleSelectSearchedEntity = (
    type: 'manager' | 'store' | 'truck' | 'rider' | 'user' | 'zone' | 'order',
    id: string
  ) => {
    let targetCoords = { x: 1000, y: 500 };
    if (type === 'order') {
      const ord = cloudOrders.find((o) => o.id === id || o.orderNo === id);
      if (ord) {
        // 查找匹配的在途配送骑手
        const assignedRider = riders.find((r) =>
          r.activeOrders.some((o) => o.orderNo === ord.orderNo || o.orderNo === ord.id)
        );
        if (assignedRider) {
          targetCoords = assignedRider.coords;
          setSelectedRiderId(assignedRider.id);
          showToast(`已在全域沙盘中锁定订单 [${ord.orderNo || ord.id}]，由骑手【${assignedRider.name}】极速专送中`);
        } else {
          const matchedTruck = trucks.find((t) => t.id === ord.truckId);
          if (matchedTruck) {
            targetCoords = matchedTruck.coords;
            setActiveEntity({ type: 'truck', id: matchedTruck.id });
          }
          showToast(`已在全域沙盘中定位订单: ${ord.orderNo || ord.id}`);
        }
      }
    } else if (type === 'manager') {
      const m = managers.find((item) => item.id === id);
      if (m) targetCoords = m.coords;
    } else if (type === 'store') {
      const s = stores.find((item) => item.id === id);
      if (s) targetCoords = s.coords;
    } else if (type === 'truck') {
      const t = trucks.find((item) => item.id === id);
      if (t) targetCoords = t.coords;
    } else if (type === 'rider') {
      const r = riders.find((item) => item.id === id);
      if (r) {
        targetCoords = r.coords;
        setSelectedRiderId(r.id);
      }
    } else if (type === 'user') {
      const u = users.find((item) => item.id === id);
      if (u) targetCoords = u.coords;
    } else if (type === 'zone') {
      const z = zones.find((item) => item.id === id);
      if (z) targetCoords = z.centerCoords;
    }

    focusOnCoordinates(targetCoords.x, targetCoords.y);
    if (type !== 'user' && type !== 'order') {
      setActiveEntity({ type, id });
    }
    setActiveDrawer('none');
  };

  // -------------------------------------------------------------
  // 8. 异常处置与闭环 (3.8)
  // -------------------------------------------------------------
  const handleResolveAnomaly = (anomalyId: string) => {
    const targetAnomaly = anomalies.find((a) => a.id === anomalyId);
    setAnomalies((prev) =>
      prev.map((a) =>
        a.id === anomalyId
          ? {
              ...a,
              status: 'resolved',
              resolvedAt: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
              resolver: currentRole === 'super_admin' ? '超级管理员' : '区域主管'
            }
          : a
      )
    );

    // 同步修复对应主体的异常状态与业务指标
    if (targetAnomaly) {
      if (targetAnomaly.targetKey === 'mgr-003') {
        setManagers((prev) =>
          prev.map((m) => (m.id === 'mgr-003' ? { ...m, status: 'online', offlineMins: 0, abnormalNotes: undefined } : m))
        );
      } else if (targetAnomaly.targetKey === 'truck-03') {
        setTrucks((prev) =>
          prev.map((t) => (t.id === 'truck-03' ? { ...t, pendingQueue: 4, status: 'open' } : t))
        );
      } else if (targetAnomaly.targetKey === 'rider-04') {
        setRiders((prev) =>
          prev.map((r) =>
            r.id === 'rider-04'
              ? {
                  ...r,
                  activeOrders: r.activeOrders.map((o) => ({ ...o, status: 'delivering', remainingMins: 8 }))
                }
              : r
          )
        );
      } else if (targetAnomaly.targetKey === 'store-004') {
        setStores((prev) =>
          prev.map((s) => (s.id === 'store-004' ? { ...s, status: 'open', faultReason: undefined } : s))
        );
      }
    }
    playChimeSound('success');
    addAuditLog('处置业务异常', `异常编号【${anomalyId}】已被人工核实闭环，受影响实体已恢复正常态势`);
    showToast(`异常【${anomalyId}】已成功处置闭环，关联设备与人员状态已同步恢复`);
  };

  const handleLocateAnomalyTarget = (targetKey: string) => {
    const m = managers.find((x) => x.id === targetKey);
    if (m) {
      focusOnCoordinates(m.coords.x, m.coords.y);
      setActiveEntity({ type: 'manager', id: m.id });
      setActiveDrawer('none');
      playChimeSound('urgent');
      return;
    }
    const t = trucks.find((x) => x.id === targetKey);
    if (t) {
      focusOnCoordinates(t.coords.x, t.coords.y);
      setActiveEntity({ type: 'truck', id: t.id });
      setActiveDrawer('none');
      playChimeSound('urgent');
      return;
    }
    const r = riders.find((x) => x.id === targetKey);
    if (r) {
      focusOnCoordinates(r.coords.x, r.coords.y);
      setActiveEntity({ type: 'rider', id: r.id });
      setActiveDrawer('none');
      playChimeSound('urgent');
      return;
    }
    const s = stores.find((x) => x.id === targetKey);
    if (s) {
      focusOnCoordinates(s.coords.x, s.coords.y);
      setActiveEntity({ type: 'store', id: s.id });
      setActiveDrawer('none');
      playChimeSound('urgent');
      return;
    }
    const z = zones.find((x) => x.id === targetKey);
    if (z) {
      focusOnCoordinates(z.centerCoords.x, z.centerCoords.y);
      setActiveEntity({ type: 'zone', id: z.id });
      setActiveDrawer('none');
      playChimeSound('urgent');
      return;
    }
  };

  // -------------------------------------------------------------
  // 9. 一键导出业务报表 (CSV 下载) (3.9)
  // -------------------------------------------------------------
  const handleExportReport = (type: string) => {
    let csvContent = '';
    let fileName = '';

    if (type === 'orders') {
      fileName = `Urban_Radar_腾讯云实时订单与专送台账_${Date.now()}.csv`;
      csvContent = '订单编号,客户姓名,联络电话,当前状态,订单金额,下单时间,餐车归属,配送目标地址\n';
      cloudOrders.forEach((o) => {
        csvContent += `"${o.orderNo || o.id}","${o.customerName || '食客'}","${o.userPhone || '138****0000'}","${o.status}",¥${o.totalAmount},"${o.createdTime || ''}","${o.truckName || '全域流动餐车'}","${(o.deliveryAddress || '').replace(/"/g, '""')}"\n`;
      });
    } else if (type === 'general') {
      fileName = `Urban_Radar_全域运维数据报表_${Date.now()}.csv`;
      csvContent = '类别,编号,名称,负责商圈,状态,核心指标,联络方式\n';
      managers.forEach((m) => {
        csvContent += `区经理,${m.code},${m.name},${m.zoneName},${m.status === 'online' ? '在岗' : '离线'},管辖门店${m.managedStores}家/餐车${m.activeTrucks}辆,${m.phone}\n`;
      });
      stores.forEach((s) => {
        csvContent += `固定门店,${s.code},${s.name},${s.zoneName},${s.status},今日订单${s.todayOrders}单/营收¥${s.revenue},${s.phone}\n`;
      });
      trucks.forEach((t) => {
        csvContent += `流动餐车,${t.code},${t.name},${t.zoneName},${t.status},接单${t.todayOrders}单/覆盖${t.coveredUsers}人,${t.phone}\n`;
      });
      riders.forEach((r) => {
        csvContent += `配送骑手,${r.code},${r.name},${r.zoneName},${r.status},今日送达${r.todayCompleted}单/评分${r.rating},${r.phone}\n`;
      });
    } else {
      fileName = `Urban_Radar_异常事件处置台账_${Date.now()}.csv`;
      csvContent = '异常编号,分类,预警标题,所属片区,发生时间,处置状态,详情记录\n';
      anomalies.forEach((a) => {
        csvContent += `${a.id},${a.type},${a.title},${a.zoneName},${a.occurredAt},${a.status === 'resolved' ? '已闭环' : '待处置'},"${a.detail}"\n`;
      });
    }

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`已成功导出数据报表文件: ${fileName}`);
    addAuditLog('导出业务报表', `导出 ${fileName}，共计记录已安全落地`);
  };

  // -------------------------------------------------------------
  // 9.1 对接腾讯云开发数据拉取与动态主体运力标定
  // -------------------------------------------------------------
  const syncCloudData = useCallback(async (isManualClick = true) => {
    setIsSyncingCloud(true);
    try {
      const res = await fetchOrdersFromCloud();
      if (res.orders && res.orders.length > 0) {
        setCloudOrders(res.orders);
        setCloudSyncInfo({
          isSyncing: false,
          lastSyncedAt: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
          source: res.fromCloud ? '腾讯云云函数 (TCB Cloud Functions)' : '本地安全快照缓存',
          totalOrders: res.orders.length
        });

        // 动态校准配送骑手在途订单与轨迹分布
        setRiders((prev) => {
          const inFlightOrders = res.orders.filter((o) =>
            ['delivering', 'cooking', 'pending', 'paid'].includes(o.status)
          );
          return prev.map((r, idx) => {
            const assigned = inFlightOrders.filter((_, i) => i % prev.length === idx);
            if (assigned.length === 0) return r;
            return {
              ...r,
              activeOrders: assigned.map((ord, oIdx) => ({
                orderNo: ord.orderNo || ord.id,
                pickupAddress: ord.truckName || `${r.stationName || '流动餐车'}出摊点`,
                dropoffAddress: ord.deliveryAddress || '专属送达点',
                status: (ord.status === 'delivering' ? 'delivering' : 'picking') as RiderActiveOrder['status'],
                remainingMins: 10 + oIdx * 5,
                amount: ord.totalAmount || 38,
                pickupCoords: r.coords,
                dropoffCoords: {
                  x: r.coords.x + (oIdx === 0 ? 60 : -65) + (idx % 2 === 0 ? 30 : -30),
                  y: r.coords.y + (oIdx === 0 ? -45 : 55) + (idx % 3 === 0 ? 25 : -25)
                },
                path: [
                  r.coords,
                  {
                    x: r.coords.x + (oIdx === 0 ? 25 : -25),
                    y: r.coords.y + (oIdx === 0 ? -15 : 20)
                  },
                  {
                    x: r.coords.x + (oIdx === 0 ? 60 : -65) + (idx % 2 === 0 ? 30 : -30),
                    y: r.coords.y + (oIdx === 0 ? -45 : 55) + (idx % 3 === 0 ? 25 : -25)
                  }
                ]
              }))
            };
          });
        });

        // 动态校准流动餐车排队与今日订单
        setTrucks((prev) =>
          prev.map((t) => {
            const matchedOrders = res.orders.filter((o) => o.truckId === t.id);
            return {
              ...t,
              todayOrders: matchedOrders.length > 0 ? matchedOrders.length : t.todayOrders,
              pendingQueue: Math.max(1, res.orders.filter((o) => o.status === 'cooking' || o.status === 'pending').length % 7 + 1)
            };
          })
        );
      }

      if (isManualClick) {
        showToast(
          res.fromCloud
            ? `已成功对接腾讯云数据：实时读取 ${res.orders.length} 笔订单与动态全域运力`
            : `已同步全量数据：当前载入 ${res.orders.length} 笔订单与节点状态`
        );
        addAuditLog('腾讯云数据同步', `从 ${res.fromCloud ? '腾讯云云开发' : '本地存储'} 拉取 ${res.orders.length} 笔订单，全域节点已完成校准`);
      }
    } catch (err) {
      console.error('Error in syncCloudData:', err);
      if (isManualClick) {
        showToast('云端数据对接已完成本地缓存对齐');
      }
    } finally {
      setIsSyncingCloud(false);
      setCountdown(refreshInterval);
      setLastRefreshedAt(new Date().toLocaleTimeString('zh-CN', { hour12: false }));
    }
  }, [refreshInterval, showToast]);

  // 组件挂载时即刻拉取腾讯云数据
  useEffect(() => {
    syncCloudData(false);
  }, [syncCloudData]);

  // 当外部父级传入 orders 更新时，保持同步
  useEffect(() => {
    if (orders && orders.length > 0) {
      setCloudOrders(orders);
    }
  }, [orders]);

  // 手动即时刷新
  const handleManualRefresh = (isManualClick = true) => {
    syncCloudData(isManualClick);
  };

  // -------------------------------------------------------------
  // 10. 顶部统计汇总派生 (3.7)
  // -------------------------------------------------------------
  const summaryStats = useMemo(() => {
    const totalGrids = zones.length;
    const onlineManagers = managers.filter((m) => m.status === 'online').length;
    const offlineManagers = managers.filter((m) => m.status === 'offline').length;

    const totalStores = stores.length;
    const openStores = stores.filter((s) => s.status === 'open').length;
    const abnormalStores = stores.filter((s) => s.status === 'fault').length;

    const totalTrucks = trucks.length;
    const preppedTrucks = trucks.filter((t) => t.status === 'prepped').length;
    const openTrucks = trucks.filter((t) => t.status === 'open').length;
    const faultTrucks = trucks.filter((t) => t.status === 'fault' || t.pendingQueue > 10).length;

    const totalRiders = riders.length > 0 ? riders.length : 22;
    const onlineRiders = riders.filter((r) => r.status === 'online').length;
    const deliveringRiders = riders.filter((r) => r.activeOrders.length > 0).length;
    const idleRiders = Math.max(0, onlineRiders - deliveringRiders);

    const totalOnlineUsers = 1420;
    const inFlightOrders = cloudOrders.filter((o) => ['delivering', 'cooking', 'pending', 'paid'].includes(o.status));
    const activeOrders = inFlightOrders.length > 0 ? inFlightOrders.length : cloudOrders.length > 0 ? cloudOrders.length : 28;
    const timeoutRiskOrders = anomalies.filter((a) => a.status === 'pending').length;

    return {
      totalGrids,
      onlineManagers,
      offlineManagers,
      totalStores,
      openStores,
      abnormalStores,
      totalTrucks,
      preppedTrucks,
      openTrucks,
      faultTrucks,
      totalRiders,
      onlineRiders,
      deliveringRiders,
      idleRiders,
      totalOnlineUsers,
      activeOrders,
      timeoutRiskOrders
    };
  }, [zones, managers, stores, trucks, riders, cloudOrders, anomalies]);

  // 根据当前角色过滤可见实体
  const filteredZones = useMemo(() => {
    if (currentRole === 'regional_director') {
      return zones.filter((z) => z.id === selectedRegionalZone);
    }
    return zones;
  }, [zones, currentRole, selectedRegionalZone]);

  const filteredManagers = useMemo(() => {
    if (currentRole === 'regional_director') {
      return managers.filter((m) => m.zoneId === selectedRegionalZone);
    }
    return managers;
  }, [managers, currentRole, selectedRegionalZone]);

  const filteredStores = useMemo(() => {
    if (currentRole === 'regional_director') {
      return stores.filter((s) => s.zoneId === selectedRegionalZone);
    }
    return stores;
  }, [stores, currentRole, selectedRegionalZone]);

  const filteredTrucks = useMemo(() => {
    if (currentRole === 'regional_director') {
      return trucks.filter((t) => t.zoneId === selectedRegionalZone);
    }
    return trucks;
  }, [trucks, currentRole, selectedRegionalZone]);

  const filteredRiders = useMemo(() => {
    if (currentRole === 'regional_director') {
      return riders.filter((r) => r.zoneId === selectedRegionalZone);
    }
    return riders;
  }, [riders, currentRole, selectedRegionalZone]);

  const selectedRider = useMemo(() => {
    if (!selectedRiderId) return null;
    return riders.find((r) => r.id === selectedRiderId) || null;
  }, [selectedRiderId, riders]);

  // 根据当前角色过滤可见在线用户
  const filteredUsers = useMemo(() => {
    if (currentRole === 'regional_director') {
      return users.filter((u) => u.zoneId === selectedRegionalZone);
    }
    return users;
  }, [users, currentRole, selectedRegionalZone]);

  // 过滤竞争对手
  const filteredCompetitors = useMemo(() => {
    return competitors.filter((c) => {
      if (currentRole === 'regional_director' && c.zoneId !== selectedRegionalZone) {
        return false;
      }

      const matchSearch =
        !competitorSearch ||
        c.name.toLowerCase().includes(competitorSearch.toLowerCase()) ||
        c.category.toLowerCase().includes(competitorSearch.toLowerCase()) ||
        c.zoneName.toLowerCase().includes(competitorSearch.toLowerCase());

      let matchFilter = true;
      if (competitorFilter === '高威胁') matchFilter = c.threatLevel === 'high';
      else if (competitorFilter === '中威胁') matchFilter = c.threatLevel === 'medium';
      else if (competitorFilter === '已入库') matchFilter = Boolean(c.isArchived);
      else if (competitorFilter === '待入库') matchFilter = !c.isArchived;
      else if (competitorFilter === '旁观关注') matchFilter = c.threatLevel === 'low';

      return matchSearch && matchFilter;
    });
  }, [competitors, competitorSearch, competitorFilter, currentRole, selectedRegionalZone]);

  // 竞争对手入库 / 移出知识库
  const handleToggleArchiveCompetitor = (compId: string) => {
    setCompetitors((prev) =>
      prev.map((c) => {
        if (c.id === compId) {
          const nowArchived = !c.isArchived;
          const updated = {
            ...c,
            isArchived: nowArchived,
            archivedAt: nowArchived ? new Date().toLocaleString('zh-CN', { hour12: false }) : undefined
          };
          addAuditLog('竞品知识库维护', `${nowArchived ? '入库存档' : '移出知识库'}：${c.name} (${c.zoneName})`);
          showToast(nowArchived ? `已将对手【${c.name}】存入情报知识库` : `已将对手【${c.name}】移出知识库`);
          if (selectedCompetitorInfo?.record.id === compId) {
            setSelectedCompetitorInfo({ ...selectedCompetitorInfo, record: updated });
          }
          return updated;
        }
        return c;
      })
    );
  };

  // 删除竞争对手标记
  const handleDeleteCompetitor = (compId: string) => {
    const target = competitors.find((c) => c.id === compId);
    setCompetitors((prev) => prev.filter((c) => c.id !== compId));
    if (selectedCompetitorInfo?.record.id === compId) {
      setSelectedCompetitorInfo(null);
    }
    addAuditLog('删除竞品标记', `已删除点位：${target?.name || compId}`);
    showToast(`已成功移除竞品标记：${target?.name || ''}`);
  };

  // 街区道路自然弯曲轮廓预设 (可供区经理网格快速吸附真实街区或在基础上钢笔增删锚点)
  const STREET_BLOCK_PRESETS: Record<string, { label: string; points: { x: number; y: number }[] }> = {
    'zone-01': {
      label: '静安南京西路及商业街网围合 (12点)',
      points: [
        { x: 540, y: 310 },
        { x: 630, y: 300 },
        { x: 740, y: 315 },
        { x: 880, y: 330 },
        { x: 990, y: 370 },
        { x: 1040, y: 440 },
        { x: 1010, y: 530 },
        { x: 920, y: 580 },
        { x: 790, y: 595 },
        { x: 670, y: 580 },
        { x: 570, y: 510 },
        { x: 520, y: 410 }
      ]
    },
    'zone-02': {
      label: '苏河湾沿河滨水蜿蜒走廊 (14点)',
      points: [
        { x: 890, y: 390 },
        { x: 980, y: 375 },
        { x: 1080, y: 385 },
        { x: 1190, y: 410 },
        { x: 1290, y: 450 },
        { x: 1340, y: 530 },
        { x: 1310, y: 620 },
        { x: 1220, y: 680 },
        { x: 1110, y: 700 },
        { x: 1000, y: 670 },
        { x: 930, y: 610 },
        { x: 890, y: 520 },
        { x: 880, y: 450 }
      ]
    },
    'zone-03': {
      label: '张江高科技园区矩阵网格 (12点)',
      points: [
        { x: 1260, y: 360 },
        { x: 1380, y: 370 },
        { x: 1510, y: 400 },
        { x: 1630, y: 450 },
        { x: 1680, y: 540 },
        { x: 1650, y: 640 },
        { x: 1560, y: 710 },
        { x: 1430, y: 725 },
        { x: 1320, y: 680 },
        { x: 1250, y: 590 },
        { x: 1220, y: 490 },
        { x: 1235, y: 410 }
      ]
    }
  };

  // 启动多边形钢笔绘制指定网格区域
  const handleStartEditZoneBoundary = (zoneId: string) => {
    setActiveTool('draw_polygon');
    setDrawingZoneId(zoneId);
    const targetZone = zones.find((z) => z.id === zoneId);
    if (targetZone?.polygonPoints) {
      const pts = targetZone.polygonPoints
        .split(' ')
        .map((pair) => {
          const [x, y] = pair.split(',').map(Number);
          return { x, y };
        })
        .filter((p) => !isNaN(p.x) && !isNaN(p.y));
      setDrawingPoints(pts);
    } else {
      setDrawingPoints([]);
    }
    setActiveEntity(null);
    showToast(`已激活多边形钢笔工具：正在编辑【${targetZone?.name || zoneId}】边界范围`);
  };

  // 撤销上一个绘制控制锚点
  const handleUndoDrawingPoint = () => {
    setDrawingPoints((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.slice(0, prev.length - 1);
      showToast(`已撤销上一个锚点，剩余 ${next.length} 个控制点`);
      return next;
    });
  };

  // 清空当前绘制点位
  const handleClearDrawingPoints = () => {
    setDrawingPoints([]);
    showToast('已清空当前绘制锚点，可重新落点或选择街区预设');
  };

  // 应用街区预设轮廓
  const handleApplyStreetBlockPreset = (zoneId: string) => {
    const preset = STREET_BLOCK_PRESETS[zoneId];
    if (preset) {
      setDrawingPoints(preset.points);
      showToast(`已成功应用街区吸附预设：【${preset.label}】`);
    }
  };

  // 保存并更新网格范围
  const handleSaveDrawnPolygon = () => {
    if (drawingPoints.length < 3) {
      showToast('多边形至少需要 3 个控制锚点以围合封闭区域');
      return;
    }
    const ptsString = drawingPoints.map((p) => `${p.x},${p.y}`).join(' ');
    const avgX = Math.round(drawingPoints.reduce((acc, p) => acc + p.x, 0) / drawingPoints.length);
    const avgY = Math.round(drawingPoints.reduce((acc, p) => acc + p.y, 0) / drawingPoints.length);

    setZones((prev) =>
      prev.map((z) => {
        if (z.id === drawingZoneId) {
          return {
            ...z,
            polygonPoints: ptsString,
            centerCoords: { x: avgX, y: avgY }
          };
        }
        return z;
      })
    );

    const targetZ = zones.find((z) => z.id === drawingZoneId);
    addAuditLog(
      '区经理网格编辑',
      `重绘并更新【${targetZ?.name || drawingZoneId}】边界轮廓 (包含 ${drawingPoints.length} 个街区锚点)`
    );
    showToast(`已成功保存并应用【${targetZ?.name || drawingZoneId}】新网格轮廓！`);
    setActiveTool('none');
    setDrawingPoints([]);
  };

  const handleSaveCompetitor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompName.trim()) {
      showToast('请输入对手品牌/代号');
      return;
    }
    const [cxStr, cyStr] = newCompCoords.split(',').map((s) => s.trim());
    const cx = Number(cxStr) || 850;
    const cy = Number(cyStr) || 420;
    const zoneObj = zones.find((z) => z.id === newCompZone);
    const newRecord: CompetitorRecord = {
      id: `comp-${Date.now()}`,
      name: newCompName.trim(),
      category: newCompCategory.trim() || '餐饮流动车',
      zoneId: newCompZone,
      zoneName: zoneObj?.name || '核心商圈',
      threatLevel: newCompThreat,
      coords: { x: cx, y: cy },
      auditTime: newCompTime.trim() || new Date().toLocaleString('zh-CN'),
      strategy: newCompStrategy.trim() || '持续监控其客流走向与促销力度',
      isArchived: false
    };
    setCompetitors((prev) => [newRecord, ...prev]);
    addAuditLog('新增竞争对手情报', `录入对手【${newRecord.name}】(${newRecord.category})，标记于【${newRecord.zoneName}】`);
    setShowAddCompetitorModal(false);
    setNewCompName('');
    setNewCompCategory('');
    setNewCompStrategy('');
    showToast(`已成功录入竞品情报【${newRecord.name}】并标定至沙盘`);
  };

  // 闭环调度执行回调 (感知-判断-执行-持续迭代)
  const handleDispatchTruck = (truckId: string, targetZoneId: string) => {
    setTrucks((prev) =>
      prev.map((t) => {
        if (t.id === truckId) {
          const targetZone = zones.find((z) => z.id === targetZoneId);
          return {
            ...t,
            status: 'open',
            zoneId: targetZoneId,
            zoneName: targetZone?.name || t.zoneName,
            coords: { x: 960, y: 460 },
            dutyHoursToday: Number((t.dutyHoursToday + 0.5).toFixed(1))
          };
        }
        return t;
      })
    );
    addAuditLog('运力应急调拨', `调度备用餐车【${truckId}】前往网格【${targetZoneId}】就位支援，状态设为营业`);
    showToast('已调度备用餐车前往目标网格就位并开启营业');
  };

  const handleIssueCoupons = (zoneId: string, amount: number) => {
    const targetZone = zones.find((z) => z.id === zoneId);
    addAuditLog('定向营销派发', `向网格【${targetZone?.name || zoneId}】全量在线食客定向派发 ¥${amount} 满减补贴券`);
    showToast(`已向网格在线食客定向派发 ¥${amount} 夜市抢单红包`);
  };

  const handleDispatchInspector = (zoneId: string, managerName: string) => {
    const targetZone = zones.find((z) => z.id === zoneId);
    const targetZoneName = targetZone?.name || zoneId;
    setAnomalies((prev) =>
      prev.map((a) =>
        a.zoneName === targetZoneName
          ? {
              ...a,
              status: 'resolved' as const,
              resolvedAt: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
              resolver: `区经理【${managerName}】(现场处置)`
            }
          : a
      )
    );
    addAuditLog('现场核验工单', `指派区经理【${managerName}】前往网格【${targetZoneName}】现场排查处置`);
    showToast(`已派发现场巡检工单至区经理【${managerName}】手机端`);
  };

  return (
    <div
      ref={viewportRef}
      className="relative w-full h-[calc(100vh-140px)] min-h-[700px] bg-white rounded-2xl border border-[#e4e2dc] overflow-hidden select-none font-sans text-[#1a1c1b]"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* ========================================================= */}
      {/* 模块一：地图可视化主区域 (高德地图 2.0 / SVG 矢量沙盘 双模底座) */}
      {/* ========================================================= */}
      {mapEngine === 'amap' ? (
        <AMapEngineView
          zones={zones}
          stores={filteredStores}
          trucks={filteredTrucks}
          riders={filteredRiders}
          users={filteredUsers}
          competitors={filteredCompetitors}
          layerVisibility={layerVisibility}
          showCompetitorRadar={showCompetitorRadar}
          selectedRiderId={selectedRiderId}
          showAllRiderRoutes={showAllRiderRoutes}
          viewPerspective={viewPerspective}
          viewActionTrigger={viewActionTrigger}
          mapHierarchy={mapHierarchy}
          activeTool={activeTool}
          drawingPoints={drawingPoints}
          onAddDrawingPoint={(pt) => setDrawingPoints((prev) => [...prev, pt])}
          onSelectEntity={({ type, id, screenPos }) => {
            if (type === 'store' && screenPos) {
              setStoreAnchorPos(screenPos);
            }
            if (type === 'rider') {
              setSelectedRiderId((prev) => (prev === id ? null : id));
            }
            setActiveEntity({ type: type as any, id });
          }}
          onSelectRider={(riderId) => {
            setSelectedRiderId((prev) => (prev === riderId ? null : riderId));
          }}
          onSelectCompetitor={(name, comp, screenPos) => {
            const competitor = comp || competitors.find((c) => c.name === name);
            if (competitor) {
              setSelectedCompetitorInfo({ record: competitor, screenPos });
            }
            setShowCompetitorRadar(true);
            setCompetitorSearch(name);
          }}
          onSwitchToSandbox={() => {
            setMapEngine('sandbox');
            showToast('已切换至数字孪生矢量沙盘');
          }}
          showToast={showToast}
        />
      ) : (
        <div
          ref={mapContainerRef}
          className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing transition-transform ease-out"
          style={{
            transform:
              viewPerspective === '3d'
                ? `perspective(1200px) rotateX(26deg) rotateZ(-2deg) translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`
                : `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
            transformOrigin: '50% 50%',
            transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
        <svg
          viewBox="0 0 1920 1080"
          className="w-[1920px] h-[1080px] pointer-events-auto"
          onClick={(e) => {
            if (activeTool === 'draw_polygon') {
              const rect = viewportRef.current?.getBoundingClientRect();
              if (!rect) return;
              const ptX = Math.round((e.clientX - rect.left - panOffset.x) / zoomLevel);
              const ptY = Math.round((e.clientY - rect.top - panOffset.y) / zoomLevel);
              setDrawingPoints((prev) => [...prev, { x: ptX, y: ptY }]);
              return;
            }
            // 点击空白处关闭所有弹窗 (3.1.2)
            if ((e.target as SVGElement).tagName === 'svg' || (e.target as SVGElement).tagName === 'rect') {
              setActiveEntity(null);
              setStoreAnchorPos(null);
            }
          }}
        >
          <defs>
            {/* 背景微网格阵列 - 纯白底色微网格 */}
            <pattern id="urbanGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f0f0ed" strokeWidth="0.8" />
              <circle cx="0" cy="0" r="1.5" fill="#dededb" />
            </pattern>

            {/* 用户热力图梯度 - 优雅灰阶透明度 */}
            <radialGradient id="heatGreen" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1a1c1b" stopOpacity="0.18" />
              <stop offset="60%" stopColor="#1a1c1b" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#1a1c1b" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="heatAmber" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1a1c1b" stopOpacity="0.22" />
              <stop offset="60%" stopColor="#1a1c1b" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#1a1c1b" stopOpacity="0" />
            </radialGradient>

            {/* 流光轨迹滤镜 */}
            <filter id="craftGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#1a1c1b" floodOpacity="0.12" />
            </filter>
          </defs>

          {/* 1. 地图背景底衬 (纯白极简底色) */}
          <rect width="1920" height="1080" fill="#ffffff" />
          <rect width="1920" height="1080" fill="url(#urbanGrid)" />

          {/* 2. 城市核心水系 (Suzhou Creek 苏州河流径 - 黑白极简灰阶) */}
          <path
            d="M 100,520 C 340,490 620,530 840,460 C 1080,390 1280,480 1520,440 C 1720,400 1880,420 1920,410"
            fill="none"
            stroke="#f1f2f2"
            strokeWidth="38"
            strokeLinecap="round"
          />
          <path
            d="M 100,520 C 340,490 620,530 840,460 C 1080,390 1280,480 1520,440 C 1720,400 1880,420 1920,410"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="22"
            strokeLinecap="round"
          />
          <text x="1260" y="445" fill="#9ca3af" fontSize="11" letterSpacing="4" fontFamily="'Space Grotesk', sans-serif">
            SUZHOU CREEK 水系干线
          </text>

          {/* 3. 城市主干道与路网系统 - 极简微灰线条 */}
          <g stroke="#ededeb" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <line x1="200" y1="260" x2="1800" y2="280" />
            <line x1="180" y1="680" x2="1820" y2="690" />
            <line x1="500" y1="180" x2="540" y2="880" />
            <line x1="880" y1="160" x2="900" y2="900" />
            <line x1="1260" y1="160" x2="1280" y2="920" />
            <line x1="1620" y1="200" x2="1640" y2="900" />
          </g>

          {/* 4. 用户热力图层 (3.6) */}
          {layerVisibility.userHeatmap && (
            <g>
              <circle cx="1060" cy="510" r="190" fill="url(#heatAmber)" />
              <circle cx="710" cy="430" r="140" fill="url(#heatGreen)" />
              <circle cx="1450" cy="540" r="150" fill="url(#heatGreen)" />
            </g>
          )}

          {/* 5. 区经理专属网格层 (3.2.1) */}
          {layerVisibility.mesh &&
            filteredZones.map((z) => {
              const zoneLabel =
                z.id === 'zone-01'
                  ? "ZONE-01 // JING'AN CBD"
                  : z.id === 'zone-02'
                  ? 'ZONE-02 // SUHE CREEK'
                  : 'ZONE-03 // ZHANGJIANG';

              return (
                <g
                  key={z.id}
                  className="cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveEntity({ type: 'zone', id: z.id });
                  }}
                >
                  {/* 网格英文规范化标头 */}
                  <text
                    x={z.centerCoords.x}
                    y={z.centerCoords.y - 85}
                    fill={z.id === 'zone-01' ? '#1a1c1b' : z.id === 'zone-02' ? '#006d36' : '#d97706'}
                    fontSize="12"
                    fontWeight="bold"
                    fontFamily="'Space Grotesk', sans-serif"
                    letterSpacing="1.2"
                    textAnchor="middle"
                  >
                    {zoneLabel}
                  </text>

                  <polygon
                    points={z.polygonPoints}
                    fill={z.color}
                    fillOpacity={meshOpacity}
                    stroke={z.color}
                    strokeWidth="2"
                    strokeDasharray="6 4"
                    className="transition-all duration-200 group-hover:stroke-width-3"
                  />
                  {/* 网格核心铭牌 */}
                  <g transform={`translate(${z.centerCoords.x - 70}, ${z.centerCoords.y - 45})`}>
                    <rect
                      width="140"
                      height="42"
                      rx="8"
                      fill="white"
                      stroke="#e4e2dc"
                      strokeWidth="1"
                      filter="url(#craftGlow)"
                    />
                    <text x="12" y="18" fill="#1a1c1b" fontSize="11" fontWeight="bold">
                      {z.name}
                    </text>
                    <text x="12" y="32" fill="#787770" fontSize="9.5" fontFamily="'Space Grotesk', sans-serif">
                      主管: {z.managerName} · 覆盖率 {z.coverageRatePercent}%
                    </text>
                  </g>
                </g>
              );
            })}

          {/* 区经理网格多边形钢笔绘图实时交互预览层 */}
          {activeTool === 'draw_polygon' && drawingPoints.length > 0 && (
            <g pointerEvents="none">
              {/* 封闭多边形预览填充 */}
              {drawingPoints.length >= 3 && (
                <polygon
                  points={drawingPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                  fill="#006d36"
                  fillOpacity="0.18"
                  stroke="#006d36"
                  strokeWidth="2.5"
                  strokeDasharray="8 4"
                />
              )}
              {/* 折线路径 */}
              <polyline
                points={drawingPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="#006d36"
                strokeWidth="2.5"
              />
              {/* 锚点手柄 */}
              {drawingPoints.map((pt, idx) => (
                <g key={idx} transform={`translate(${pt.x}, ${pt.y})`}>
                  <circle r="7" fill="white" stroke="#006d36" strokeWidth="2.5" filter="url(#craftGlow)" />
                  <circle r="3" fill="#006d36" />
                  <text x="10" y="4" fill="#006d36" fontSize="9" fontWeight="bold" fontFamily="'Space Grotesk', sans-serif">
                    P{idx + 1}
                  </text>
                </g>
              ))}
            </g>
          )}

          {/* 5.2 竞争对手情报点位 (红菱形带X) */}
          {filteredCompetitors.map((comp) => (
            <g
              key={comp.id}
              transform={`translate(${comp.coords.x}, ${comp.coords.y})`}
              className="cursor-pointer group"
              onClick={(e) => {
                e.stopPropagation();
                const rect = viewportRef.current?.getBoundingClientRect();
                const screenX = rect ? rect.left + panOffset.x + comp.coords.x * zoomLevel : 450;
                const screenY = rect ? rect.top + panOffset.y + comp.coords.y * zoomLevel : 250;
                setSelectedCompetitorInfo({ record: comp, screenPos: { x: screenX, y: screenY } });
                setShowCompetitorRadar(true);
                setCompetitorSearch(comp.name);
                showToast(`已选定对手【${comp.name}】(${comp.threatLevel === 'high' ? '高威胁' : '中威胁'})`);
              }}
            >
              {/* 威胁警示波纹 */}
              {comp.threatLevel === 'high' && (
                <circle
                  r="18"
                  fill="none"
                  stroke="#1a1c1b"
                  strokeWidth="1.2"
                  className="animate-ping"
                  style={{ transformOrigin: '0 0', animationDuration: '2.5s' }}
                />
              )}
              {/* 纯黑高对比菱形 */}
              <rect
                x="-11"
                y="-11"
                width="22"
                height="22"
                rx="3"
                fill="#1a1c1b"
                stroke="white"
                strokeWidth="1.5"
                transform="rotate(45)"
                filter="url(#craftGlow)"
              />
              {/* 叉号 X */}
              <path
                d="M -4 -4 L 4 4 M 4 -4 L -4 4"
                stroke="white"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              {/* 对手名称标签 */}
              <g transform="translate(0, 22)">
                <rect x="-35" y="-2" width="70" height="18" rx="4" fill="white" stroke="#1a1c1b" strokeWidth="0.8" />
                <text
                  x="0"
                  y="11"
                  fill="#1a1c1b"
                  fontSize="9.5"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {comp.name}
                </text>
              </g>
            </g>
          ))}

          {/* 6. 固定门店点位与服务辐射圈 (3.3) */}
          {layerVisibility.store &&
            filteredStores.map((s) => (
              <g
                key={s.id}
                transform={`translate(${s.coords.x}, ${s.coords.y})`}
                className="cursor-pointer group"
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = viewportRef.current?.getBoundingClientRect();
                  const screenX = rect ? rect.left + panOffset.x + s.coords.x * zoomLevel : 500;
                  const screenY = rect ? rect.top + panOffset.y + s.coords.y * zoomLevel : 300;
                  setStoreAnchorPos({ x: screenX, y: screenY });
                  setActiveEntity({ type: 'store', id: s.id });
                }}
              >
                {/* 服务辐射半径与高精雷达扫描圈 (基于标准比例尺 M_PER_PX) */}
                {layerVisibility.storeRadius && (
                  <g pointerEvents="none">
                    {/* 外层雷达扫描辐射圈 */}
                    <circle
                      r={s.serviceRadiusMeters / M_PER_PX}
                      fill="rgba(217, 119, 6, 0.05)"
                      stroke="#d97706"
                      strokeWidth="1.5"
                      strokeDasharray="6 4"
                    />
                    {/* 中级巡航雷达环 (55%) */}
                    <circle
                      r={(s.serviceRadiusMeters / M_PER_PX) * 0.55}
                      fill="none"
                      stroke="#d97706"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                      opacity="0.6"
                    />
                    {/* 核心近场速配环 (25%) */}
                    <circle
                      r={(s.serviceRadiusMeters / M_PER_PX) * 0.25}
                      fill="rgba(217, 119, 6, 0.08)"
                      stroke="#d97706"
                      strokeWidth="1.2"
                      opacity="0.75"
                    />
                    {/* 辐射距离标签 */}
                    <g transform={`translate(${(s.serviceRadiusMeters / M_PER_PX) * 0.707}, ${-(s.serviceRadiusMeters / M_PER_PX) * 0.707})`}>
                      <rect x="-32" y="-10" width="64" height="16" rx="4" fill="#1a1c1b" opacity="0.85" />
                      <text x="0" y="2" fill="white" fontSize="8.5" fontWeight="bold" textAnchor="middle" fontFamily="'Space Grotesk', sans-serif">
                        {(s.serviceRadiusMeters / 1000).toFixed(1)}km 雷达
                      </text>
                    </g>
                  </g>
                )}
                {/* 门店橙色靶环结构 (Target concentric rings) */}
                <circle r="15" fill="none" stroke="#d97706" strokeWidth="2.5" filter="url(#craftGlow)" />
                <circle r="6" fill="#d97706" />

                {/* 门店营业情况小组件 (紧凑胶囊微标牌，指示当前营业状态与业绩) */}
                <g transform="translate(18, -18)" className="pointer-events-none select-none">
                  <rect
                    x="0"
                    y="0"
                    width="136"
                    height="38"
                    rx="8"
                    fill="white"
                    stroke="#d97706"
                    strokeWidth="1.2"
                    filter="url(#craftGlow)"
                  />
                  <text x="8" y="15" fill="#1a1c1b" fontSize="10.5" fontWeight="bold">
                    {s.name}
                  </text>
                  <rect x="94" y="5" width="36" height="14" rx="4" fill="#eaf7ee" />
                  <circle cx="100" cy="12" r="2" fill="#006d36" />
                  <text x="114" y="15" fill="#006d36" fontSize="8" fontWeight="bold" textAnchor="middle">
                    {s.status === 'open' ? '营业中' : '暂停'}
                  </text>
                  <text x="8" y="30" fill="#474741" fontSize="8.5" fontFamily="'Space Grotesk', sans-serif">
                    ¥{s.revenue.toLocaleString()} · {s.todayOrders}单 · {s.stationedRiders}骑
                  </text>
                </g>
              </g>
            ))}

          {/* 7. 流动餐车点位与覆盖半径 (3.4) */}
          {layerVisibility.truck &&
            filteredTrucks.map((t) => {
              const isOpen = t.status === 'open';
              const isFault = t.status === 'fault' || t.pendingQueue > 10;
              return (
                <g
                  key={t.id}
                  transform={`translate(${t.coords.x}, ${t.coords.y})`}
                  className="cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveEntity({ type: 'truck', id: t.id });
                  }}
                >
                  {/* 餐车覆盖辐射圈 (基于标准比例尺 M_PER_PX) */}
                  {layerVisibility.truckRadius && (
                    <circle
                      r={t.coverageRadiusMeters / M_PER_PX}
                      fill="#006d36"
                      fillOpacity="0.05"
                      stroke="#006d36"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                  )}

                  {/* 10Hz MESH 扩散光圈 */}
                  {isOpen && (
                    <circle
                      r="22"
                      fill="none"
                      stroke={isFault ? '#ba1a1a' : '#006d36'}
                      strokeWidth="1.5"
                      className="animate-ping"
                      style={{ transformOrigin: '0 0', animationDuration: '2.5s' }}
                    />
                  )}

                  {/* 车体外框 */}
                  <rect
                    x="-18"
                    y="-18"
                    width="36"
                    height="36"
                    rx="10"
                    fill={isFault ? '#ba1a1a' : isOpen ? '#006d36' : '#1a1c1b'}
                    filter="url(#craftGlow)"
                  />

                  {/* 车载车标矢量 */}
                  <path
                    d="M -10 -4 L 2 -4 L 7 1 L 7 6 L -10 6 Z M -6 6 A 2.5 2.5 0 0 1 -2 6 M 3 6 A 2.5 2.5 0 0 1 7 6"
                    fill="none"
                    stroke="white"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* 排队超限预警标 */}
                  {t.pendingQueue > 10 && (
                    <circle cx="14" cy="-14" r="6" fill="#ba1a1a" stroke="white" strokeWidth="1.5" />
                  )}

                  {/* 标牌 */}
                  <g transform="translate(22, -8)">
                    <rect x="0" y="-8" width="138" height="24" rx="5" fill="white" stroke="#e4e2dc" />
                    <text x="6" y="8" fill="#1a1c1b" fontSize="10.5" fontWeight="bold">
                      {t.name}
                    </text>
                    <text x="6" y="20" fill="#787770" fontSize="8.5" fontFamily="'Space Grotesk', sans-serif">
                      炉温 {t.stoveTemp} · 队列: {t.pendingQueue}单
                    </text>
                  </g>
                </g>
              );
            })}

          {/* 8. 配送骑手点位与在途轨迹 (3.5) */}
          {layerVisibility.rider &&
            filteredRiders.map((r) => {
              const isSelected = selectedRiderId === r.id;
              const shouldRenderRoutes = layerVisibility.riderRoutes && (showAllRiderRoutes || isSelected);

              return (
                <g key={r.id}>
                  {/* 骑手在单轨迹路线飞线 (支持自定义单骑手路线或全量轨迹) */}
                  {shouldRenderRoutes &&
                    r.activeOrders.map((ord) => (
                      <g key={ord.orderNo}>
                        <polyline
                          points={ord.path.map((p) => `${p.x},${p.y}`).join(' ')}
                          fill="none"
                          stroke={isSelected ? '#d97706' : ord.status === 'timeout_risk' ? '#ba1a1a' : '#006d36'}
                          strokeWidth={isSelected ? '3.5' : '2.5'}
                          strokeDasharray={isSelected ? '8 4' : '6 4'}
                        />
                        {/* 用户收货落点 Pin */}
                        <circle
                          cx={ord.dropoffCoords.x}
                          cy={ord.dropoffCoords.y}
                          r={isSelected ? '6' : '4'}
                          fill={isSelected ? '#d97706' : ord.status === 'timeout_risk' ? '#ba1a1a' : '#1a1c1b'}
                          stroke="white"
                          strokeWidth="1.5"
                        />
                      </g>
                    ))}

                  {/* 骑手坐标点 */}
                  <g
                    transform={`translate(${r.coords.x}, ${r.coords.y})`}
                    className="cursor-pointer group"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRiderId((prev) => (prev === r.id ? null : r.id));
                      setActiveEntity({ type: 'rider', id: r.id });
                    }}
                  >
                    {/* 选中高亮呼吸圈 */}
                    {isSelected && (
                      <circle
                        r="22"
                        fill="none"
                        stroke="#d97706"
                        strokeWidth="2"
                        className="animate-ping"
                        style={{ transformOrigin: '0 0', animationDuration: '2s' }}
                      />
                    )}
                    <circle
                      r={isSelected ? '15' : '12'}
                      fill={isSelected ? '#d97706' : r.status === 'online' ? '#006d36' : r.status === 'resting' ? '#d97706' : '#787770'}
                      filter="url(#craftGlow)"
                    />
                    <circle r="4" fill="white" />
                    <text x="16" y="4" fill="#1a1c1b" fontSize="9.5" fontWeight="bold">
                      {r.name} ({r.speedKmh}km/h)
                    </text>
                  </g>
                </g>
              );
            })}

          {/* 9. 区经理现场巡查点 (3.2.2) */}
          {filteredManagers.map((m) => (
            <g
              key={m.id}
              transform={`translate(${m.coords.x}, ${m.coords.y})`}
              className="cursor-pointer group"
              onClick={(e) => {
                e.stopPropagation();
                setActiveEntity({ type: 'manager', id: m.id });
              }}
            >
              <rect
                x="-12"
                y="-12"
                width="24"
                height="24"
                rx="6"
                fill={m.status === 'online' ? '#1a1c1b' : '#ba1a1a'}
                filter="url(#craftGlow)"
              />
              <path
                d="M -5 -4 L 5 -4 L 0 5 Z"
                fill="white"
              />
              <text x="14" y="4" fill="#1a1c1b" fontSize="9.5" fontWeight="bold">
                {m.name} ({m.status === 'online' ? '在岗' : `离线${m.offlineMins}m`})
              </text>
            </g>
          ))}

          {/* 10. 终端用户散点群 (3.6) */}
          {layerVisibility.userPoints &&
            filteredUsers.map((u) => (
              <g
                key={u.id}
                transform={`translate(${u.coords.x}, ${u.coords.y})`}
                className="cursor-pointer group"
                onClick={(e) => {
                  e.stopPropagation();
                  showToast(`定位至在线食客 ${u.phoneMask} (${u.zoneName})`);
                }}
              >
                {u.isCluster ? (
                  <g pointerEvents="none">
                    <circle r="16" fill="#2563eb" fillOpacity="0.16" />
                    <rect
                      x="-46"
                      y="-11"
                      width="92"
                      height="22"
                      rx="11"
                      fill="#2563eb"
                      stroke="white"
                      strokeWidth="1.5"
                      filter="url(#craftGlow)"
                    />
                    <circle cx="-32" cy="0" r="3" fill="white" />
                    <text
                      x="6"
                      y="3.5"
                      fill="white"
                      fontSize="9.5"
                      fontWeight="bold"
                      textAnchor="middle"
                      letterSpacing="0.3"
                      style={{ whiteSpace: 'nowrap', userSelect: 'none' }}
                    >
                      {u.clusterCount}人客群
                    </text>
                  </g>
                ) : (
                  <circle r="3.5" fill="#2563eb" stroke="white" strokeWidth="1" />
                )}
              </g>
            ))}

          {/* 10.5 竞争对手情报点位 (沙盘 SVG 模式高精锚点) */}
          {showCompetitorRadar &&
            filteredCompetitors.map((c) => {
              const isHigh = c.threatLevel === 'high';
              return (
                <g
                  key={c.id}
                  transform={`translate(${c.coords.x}, ${c.coords.y})`}
                  className="cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    setSelectedCompetitorInfo({
                      record: c,
                      screenPos: { x: rect.left + 24, y: rect.top }
                    });
                    showToast(`已选定竞品：${c.name} (${c.category})`);
                  }}
                >
                  <rect
                    x="-11"
                    y="-11"
                    width="22"
                    height="22"
                    rx="4"
                    transform="rotate(45)"
                    fill="#1a1c1b"
                    stroke="white"
                    strokeWidth="2"
                    filter="url(#craftGlow)"
                  />
                  <text
                    x="0"
                    y="3.5"
                    fill="white"
                    fontSize="11"
                    fontWeight="900"
                    textAnchor="middle"
                  >
                    ✕
                  </text>
                  <g transform="translate(18, -10)">
                    <rect
                      x="0"
                      y="-6"
                      width="106"
                      height="22"
                      rx="5"
                      fill="white"
                      stroke="#1a1c1b"
                      strokeWidth="1"
                    />
                    <text x="6" y="8.5" fill="#1a1c1b" fontSize="9.5" fontWeight="bold">
                      {c.name}
                    </text>
                    <rect
                      x="72"
                      y="-2.5"
                      width="28"
                      height="14"
                      rx="2"
                      fill={isHigh ? '#ba1a1a' : '#f4f4f2'}
                    />
                    <text
                      x="86"
                      y="7.5"
                      fill={isHigh ? 'white' : '#474741'}
                      fontSize="7.5"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {isHigh ? '高威胁' : '中威胁'}
                    </text>
                  </g>
                </g>
              );
            })}

          {/* 11. 空间直线测距绘线 */}
          {activeTool === 'measure' && measurePoints.length > 0 && (
            <g>
              {measurePoints.map((pt, idx) => (
                <circle key={idx} cx={pt.x} cy={pt.y} r="5" fill="#ba1a1a" stroke="white" strokeWidth="2" />
              ))}
              {measurePoints.length === 2 && (() => {
                const dx = measurePoints[1].x - measurePoints[0].x;
                const dy = measurePoints[1].y - measurePoints[0].y;
                const distMeters = Math.round(Math.sqrt(dx * dx + dy * dy) * M_PER_PX);
                const midX = (measurePoints[0].x + measurePoints[1].x) / 2;
                const midY = (measurePoints[0].y + measurePoints[1].y) / 2;
                const distText = distMeters >= 1000 ? `${(distMeters / 1000).toFixed(2)} km` : `${distMeters} m`;
                const estMins = Math.ceil(distMeters / 350);
                return (
                  <g>
                    <line
                      x1={measurePoints[0].x}
                      y1={measurePoints[0].y}
                      x2={measurePoints[1].x}
                      y2={measurePoints[1].y}
                      stroke="#ba1a1a"
                      strokeWidth="2.5"
                      strokeDasharray="5 5"
                    />
                    <rect
                      x={midX - 52}
                      y={midY - 13}
                      width="104"
                      height="24"
                      rx="6"
                      fill="#1a1c1b"
                      stroke="white"
                      strokeWidth="1.5"
                      opacity="0.95"
                    />
                    <text
                      x={midX}
                      y={midY + 2}
                      fill="white"
                      fontSize="10"
                      fontWeight="bold"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontFamily="'Space Grotesk', sans-serif"
                    >
                      {distText} · ~{estMins}分
                    </text>
                  </g>
                );
              })()}
            </g>
          )}

          {/* 12. 矩形圈选区域线框 */}
          {selectionBox && (
            <g>
              <rect
                x={selectionBox.x1}
                y={selectionBox.y1}
                width={Math.max(1, selectionBox.x2 - selectionBox.x1)}
                height={Math.max(1, selectionBox.y2 - selectionBox.y1)}
                fill="rgba(0, 109, 54, 0.08)"
                stroke="#006d36"
                strokeWidth="2"
                strokeDasharray="6 4"
                rx="4"
              />
            </g>
          )}
        </svg>
      </div>
      )}

      {/* 空间工具浮动交互状态条 */}
      {activeTool === 'measure' && measurePoints.length > 0 && (
        <div className="absolute top-18 left-1/2 -translate-x-1/2 z-30 pointer-events-auto bg-white/95 backdrop-blur-md border border-[#e4e2dc] shadow-md rounded-full px-3.5 py-1.5 flex items-center gap-2.5 text-xs text-[#1a1c1b]">
          <span className="w-2 h-2 rounded-full bg-[#ba1a1a]" />
          <span className="text-[11px] font-medium">
            {measurePoints.length === 1 ? '请在地图上点击第二个点位以完成连线' : '已完成空间直线测距'}
          </span>
          <button
            type="button"
            onClick={() => setMeasurePoints([])}
            className="text-[10px] text-[#787770] hover:text-[#ba1a1a] cursor-pointer underline ml-1"
          >
            重置测距
          </button>
        </div>
      )}

      {activeTool === 'select' && selectedAreaStats && (
        <div className="absolute top-18 left-1/2 -translate-x-1/2 z-30 pointer-events-auto bg-white/95 backdrop-blur-md border border-[#e4e2dc] shadow-md rounded-xl px-4 py-2 flex items-center gap-3 text-xs text-[#1a1c1b]">
          <span className="w-2 h-2 rounded-full bg-[#006d36]" />
          <span className="font-bold text-[11px]">圈选分析态势:</span>
          <span className="text-[11px]">门店 <b>{selectedAreaStats.stores}</b> 家</span>
          <span className="text-[#e4e2dc]">|</span>
          <span className="text-[11px]">餐车 <b>{selectedAreaStats.trucks}</b> 辆</span>
          <span className="text-[#e4e2dc]">|</span>
          <span className="text-[11px]">骑手 <b>{selectedAreaStats.riders}</b> 名</span>
          <span className="text-[#e4e2dc]">|</span>
          <span className="text-[11px]">客流群 <b>{selectedAreaStats.users}</b> 处</span>
          <button
            type="button"
            onClick={() => {
              setSelectionBox(null);
              setSelectedAreaStats(null);
            }}
            className="ml-1 text-[10px] text-[#787770] hover:text-[#ba1a1a] cursor-pointer underline"
          >
            清除圈选
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* 模块二：顶部浮动数据概览胶囊 (上) */}
      {/* ========================================================= */}
      <div className="absolute top-3.5 left-1/2 -translate-x-1/2 z-30 pointer-events-auto transition-all duration-300">
        <div className="bg-white/95 backdrop-blur-md border border-[#e4e2dc] shadow-sm rounded-full px-3.5 py-1.5 flex items-center gap-3 text-[#1a1c1b] text-xs">
          {/* 折叠/展开按钮 */}
          <button
            type="button"
            onClick={() => setTopBarCollapsed(!topBarCollapsed)}
            className="p-0.5 rounded-full hover:bg-[#f4f4f2] text-[#787770] hover:text-[#1a1c1b] cursor-pointer transition-colors"
            title={topBarCollapsed ? '展开完整概览' : '收起概览'}
          >
            {topBarCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>

          {/* 品牌标识 */}
          <div className="flex items-center gap-1.5 font-bold tracking-wider text-xs">
            <span className="w-2 h-2 rounded-full bg-[#1a1c1b]" />
            <span className="font-mono text-[11px] font-bold">URBAN RADAR</span>
          </div>

          {/* 引擎切换胶囊 */}
          <button
            type="button"
            onClick={() => {
              const nextEngine = mapEngine === 'amap' ? 'sandbox' : 'amap';
              setMapEngine(nextEngine);
              showToast(`已切换底图为：${nextEngine === 'amap' ? '高德地图 2.0 真实路网' : '数字孪生高帧率矢量沙盘'}`);
            }}
            className="px-2 py-0.5 rounded-full bg-white border border-[#e4e2dc] text-[#1a1c1b] font-mono text-[10px] font-bold flex items-center gap-1 cursor-pointer hover:bg-[#f4f4f2] transition-colors"
            title="点击无缝切换地图引擎"
          >
            <Navigation className="w-3 h-3" />
            <span>{mapEngine === 'amap' ? '高德 2.0' : '仿真沙盘'}</span>
          </button>

          {/* 闭环决策中枢入口 */}
          <button
            type="button"
            onClick={() => setShowLoopOpsModal(true)}
            className="px-2.5 py-0.5 rounded-full bg-[#1a1c1b] text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer hover:bg-black transition-colors shadow-2xs"
            title="打开【感知·判断·执行·持续迭代】运力闭环调度中枢"
          >
            <Activity className="w-3 h-3 text-white" />
            <span>闭环调度</span>
          </button>

          {!topBarCollapsed && (
            <>
              <div className="w-px h-3.5 bg-[#e4e2dc]" />

              {/* 网格数 */}
              <div className="flex items-center gap-1 text-[#1a1c1b]" title="管辖网格数">
                <LayoutGrid className="w-3.5 h-3.5 text-[#787770]" />
                <span className="font-mono font-bold text-[11px]">
                  {String(summaryStats.totalGrids).padStart(2, '0')}
                </span>
              </div>

              {/* 餐车营业/全量 */}
              <div className="flex items-center gap-1 text-[#1a1c1b]" title="营业餐车/全量餐车">
                <Truck className="w-3.5 h-3.5 text-[#787770]" />
                <span className="font-mono font-bold text-[11px]">
                  {String(summaryStats.openTrucks).padStart(2, '0')}/{String(summaryStats.totalTrucks).padStart(2, '0')}
                </span>
              </div>

              {/* 骑手数 */}
              <div className="flex items-center gap-1 text-[#1a1c1b]" title="在岗配送骑手">
                <Bike className="w-3.5 h-3.5 text-[#787770]" />
                <span className="font-mono font-bold text-[11px]">{summaryStats.totalRiders}</span>
              </div>

              {/* 在线食客 */}
              <div className="flex items-center gap-1 text-[#1a1c1b]" title="在线食客活跃数">
                <Users className="w-3.5 h-3.5 text-[#787770]" />
                <span className="font-mono font-bold text-[11px]">
                  {summaryStats.totalOnlineUsers.toLocaleString()}
                </span>
              </div>

              {/* 待处理预警 */}
              <div className="flex items-center gap-1 text-[#1a1c1b]" title="待处理业务告警">
                <AlertTriangle className="w-3.5 h-3.5 text-[#1a1c1b]" />
                <span className="font-mono font-bold text-[11px]">
                  {String(anomalies.filter((a) => a.status === 'pending').length).padStart(2, '0')}
                </span>
              </div>

              <div className="w-px h-3.5 bg-[#e4e2dc]" />

              {/* 刷新频率与时钟 */}
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#787770]">
                <span className="px-1.5 py-0.5 rounded-full bg-[#f4f4f2] text-[#1a1c1b] font-bold text-[10px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1a1c1b] animate-pulse" />
                  10Hz
                </span>
                <span className="font-medium text-[#1a1c1b]">{liveTime || '03:13:11'}</span>
              </div>

              <div className="w-px h-3.5 bg-[#e4e2dc]" />

              {/* 腾讯云数据状态胶囊 */}
              <button
                type="button"
                onClick={() => syncCloudData(true)}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#f4f4f2] hover:bg-[#e4e2dc] text-[#1a1c1b] font-mono text-[10px] font-bold cursor-pointer transition-colors"
                title={`点击即刻从腾讯云同步全量数据源\n数据来源: ${cloudSyncInfo.source}\n最近同步: ${cloudSyncInfo.lastSyncedAt}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isSyncingCloud ? 'bg-[#d97706] animate-ping' : 'bg-[#006d36]'}`} />
                <span>云端:{cloudOrders.length}单</span>
                {isSyncingCloud && <RefreshCw className="w-2.5 h-2.5 animate-spin text-[#d97706]" />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 模块三：左侧浮动操作坞 (左) */}
      {/* ========================================================= */}
      <div className="absolute left-4 top-16 z-20 flex flex-col items-center gap-2 pointer-events-auto">
        {/* 地图底图引擎切换 */}
        <button
          type="button"
          onClick={() => {
            const nextEngine = mapEngine === 'amap' ? 'sandbox' : 'amap';
            setMapEngine(nextEngine);
            showToast(`已切换至【${nextEngine === 'amap' ? '高德地图 2.0 真实路网' : '数字孪生高帧率矢量沙盘'}】`);
          }}
          className={`w-9 h-9 rounded-xl bg-white/95 backdrop-blur border border-[#e4e2dc] shadow-sm flex items-center justify-center cursor-pointer transition-all ${
            mapEngine === 'amap' ? 'bg-[#1a1c1b] text-white shadow-md' : 'text-[#474741] hover:bg-[#f4f4f2]'
          }`}
          title={mapEngine === 'amap' ? '当前：高德 2.0 真实路网 (点击切为沙盘)' : '当前：矢量沙盘 (点击切为高德)'}
        >
          <Navigation className="w-4 h-4" />
        </button>

        {/* 闭环调度中枢入口 */}
        <button
          type="button"
          onClick={() => setShowLoopOpsModal(true)}
          className="w-9 h-9 rounded-xl bg-white/95 backdrop-blur border border-[#e4e2dc] shadow-sm flex items-center justify-center cursor-pointer transition-all text-[#1a1c1b] hover:bg-[#1a1c1b] hover:text-white"
          title="打开【感知·判断·执行·持续迭代】运力闭环调度中枢"
        >
          <Activity className="w-4 h-4" />
        </button>

        {/* 图层总控开关 */}
        <button
          type="button"
          onClick={() => setShowLayerPanel(!showLayerPanel)}
          className={`w-9 h-9 rounded-xl bg-white/95 backdrop-blur border border-[#e4e2dc] shadow-sm flex items-center justify-center cursor-pointer transition-all ${
            showLayerPanel ? 'bg-[#1a1c1b] text-white shadow-md' : 'text-[#474741] hover:bg-[#f4f4f2]'
          }`}
          title="业务图层面板"
        >
          <Layers className="w-4 h-4" />
        </button>

        {/* 经典白色胶囊坞 (黑白高对比极简设计) */}
        <div className="bg-white/95 backdrop-blur border border-[#e4e2dc] shadow-sm rounded-2xl p-1.5 flex flex-col items-center gap-1.5 text-[#1a1c1b]">
          {/* 网格层 */}
          <button
            type="button"
            onClick={() => toggleLayer('mesh')}
            className={`w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all ${
              layerVisibility.mesh ? 'bg-[#1a1c1b] text-white shadow-xs font-bold' : 'text-[#787770] hover:text-[#1a1c1b] hover:bg-[#f4f4f2]'
            }`}
            title="区经理网格层"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>

          {/* 门店层 */}
          <button
            type="button"
            onClick={() => toggleLayer('store')}
            className={`w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all ${
              layerVisibility.store ? 'bg-[#1a1c1b] text-white shadow-xs font-bold' : 'text-[#787770] hover:text-[#1a1c1b] hover:bg-[#f4f4f2]'
            }`}
            title="固定门店点位"
          >
            <Store className="w-4 h-4" />
          </button>

          {/* 餐车层 */}
          <button
            type="button"
            onClick={() => toggleLayer('truck')}
            className={`w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all ${
              layerVisibility.truck ? 'bg-[#1a1c1b] text-white shadow-xs font-bold' : 'text-[#787770] hover:text-[#1a1c1b] hover:bg-[#f4f4f2]'
            }`}
            title="流动餐车站桩"
          >
            <Truck className="w-4 h-4" />
          </button>

          {/* 骑手层 */}
          <button
            type="button"
            onClick={() => toggleLayer('rider')}
            className={`w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all ${
              layerVisibility.rider ? 'bg-[#1a1c1b] text-white shadow-xs font-bold' : 'text-[#787770] hover:text-[#1a1c1b] hover:bg-[#f4f4f2]'
            }`}
            title="配送骑手在途轨迹"
          >
            <Bike className="w-4 h-4" />
          </button>

          {/* 图层详细控制 */}
          <button
            type="button"
            onClick={() => setShowLayerPanel(!showLayerPanel)}
            className={`w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all ${
              showLayerPanel ? 'bg-[#1a1c1b] text-white shadow-xs font-bold' : 'text-[#787770] hover:text-[#1a1c1b] hover:bg-[#f4f4f2]'
            }`}
            title="图层设置与沙盘层级"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          {/* 视角复位 */}
          <button
            type="button"
            onClick={() => {
              resetView();
              showToast('已重置视角至城市核心俯瞰');
            }}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[#787770] hover:text-[#1a1c1b] hover:bg-[#f4f4f2] cursor-pointer transition-all"
            title="重置居中"
          >
            <Zap className="w-4 h-4" />
          </button>

          {/* 竞争对手情报雷达 */}
          <button
            type="button"
            onClick={() => setShowCompetitorRadar(!showCompetitorRadar)}
            className={`w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all relative ${
              showCompetitorRadar ? 'bg-[#1a1c1b] text-white shadow-xs font-bold' : 'text-[#787770] hover:text-[#1a1c1b] hover:bg-[#f4f4f2]'
            }`}
            title="竞争对手情报雷达与档案"
          >
            <Radio className="w-4 h-4" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#1a1c1b] ring-2 ring-white animate-pulse" />
          </button>

          {/* 区经理网格钢笔自由绘制与边界修改 */}
          <button
            type="button"
            onClick={() => {
              if (activeTool === 'draw_polygon') {
                setActiveTool('none');
                setDrawingPoints([]);
                showToast('已关闭区经理网格绘制模式');
              } else {
                handleStartEditZoneBoundary(drawingZoneId || zones[0]?.id || 'zone-01');
              }
            }}
            className={`w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all ${
              activeTool === 'draw_polygon' ? 'bg-[#1a1c1b] text-white shadow-xs font-bold' : 'text-[#787770] hover:text-[#1a1c1b] hover:bg-[#f4f4f2]'
            }`}
            title="区经理网格自由绘制与街区边界修改 (钢笔工具)"
          >
            <PenTool className="w-4 h-4" />
          </button>

          {/* 2D / 3D 视角自由切换 */}
          <button
            type="button"
            onClick={() => {
              const nextP = viewPerspective === '2d' ? '3d' : '2d';
              setViewPerspective(nextP);
              setViewActionTrigger({ type: 'perspective', timestamp: Date.now() });
              showToast(nextP === '3d' ? '已切换至 3D 鸟瞰倾角透视视角' : '已切换至 2D 平面正交俯视视角');
            }}
            className={`w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all font-mono text-[10.5px] font-bold ${
              viewPerspective === '3d' ? 'bg-[#1a1c1b] text-white shadow-xs' : 'text-[#787770] hover:text-[#1a1c1b] hover:bg-[#f4f4f2]'
            }`}
            title={`切换视角 (当前: ${viewPerspective.toUpperCase()})`}
          >
            {viewPerspective === '3d' ? '3D' : '2D'}
          </button>
        </div>

        {/* 展开的图层精细设置面板 */}
        {showLayerPanel && (
          <div className="absolute left-12 top-0 w-48 bg-white/95 backdrop-blur border border-[#e4e2dc] shadow-xl rounded-2xl p-3 flex flex-col gap-2 text-xs text-[#1a1c1b] animate-in fade-in slide-in-from-left-2">
            <div className="flex items-center justify-between pb-1 border-b border-[#e4e2dc]">
              <span className="text-[10px] text-[#787770] font-bold uppercase">业务图层设置</span>
              <button
                type="button"
                onClick={() => setShowLayerPanel(false)}
                className="text-[#787770] hover:text-[#1a1c1b] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 层级切换 */}
            <div className="flex flex-col gap-1 pb-1 border-b border-[#e4e2dc]">
              <span className="text-[9.5px] text-[#787770] font-bold">沙盘层级</span>
              <div className="grid grid-cols-3 gap-1">
                {(['city', 'district', 'grid'] as const).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => {
                      handleSwitchHierarchy(h);
                    }}
                    className={`py-1 rounded text-[10px] font-medium cursor-pointer transition-all ${
                      mapHierarchy === h ? 'bg-[#1a1c1b] text-white' : 'bg-[#f4f4f2] text-[#474741]'
                    }`}
                  >
                    {h === 'city' ? '城市' : h === 'district' ? '城区' : '网格'}
                  </button>
                ))}
              </div>
            </div>

            {/* 图层复选框 */}
            <label className="flex items-center justify-between cursor-pointer text-[11px]">
              <span>区经理网格</span>
              <input
                type="checkbox"
                checked={layerVisibility.mesh}
                onChange={() => toggleLayer('mesh')}
                className="accent-[#1a1c1b] cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer text-[11px]">
              <span>固定门店</span>
              <input
                type="checkbox"
                checked={layerVisibility.store}
                onChange={() => toggleLayer('store')}
                className="accent-[#1a1c1b] cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer text-[11px]">
              <span>流动餐车</span>
              <input
                type="checkbox"
                checked={layerVisibility.truck}
                onChange={() => toggleLayer('truck')}
                className="accent-[#006d36] cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer text-[11px]">
              <span>配送骑手与在途</span>
              <input
                type="checkbox"
                checked={layerVisibility.rider}
                onChange={() => toggleLayer('rider')}
                className="accent-[#006d36] cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer text-[11px]">
              <span>食客热力图</span>
              <input
                type="checkbox"
                checked={layerVisibility.userHeatmap}
                onChange={() => toggleLayer('userHeatmap')}
                className="accent-[#d97706] cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer text-[11px]">
              <span>终端散点集群</span>
              <input
                type="checkbox"
                checked={layerVisibility.userPoints}
                onChange={() => toggleLayer('userPoints')}
                className="accent-[#2563eb] cursor-pointer"
              />
            </label>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 模块四：右侧浮动操作坞 (右) */}
      {/* ========================================================= */}
      <div className="absolute right-4 top-4 z-20 flex flex-col items-center gap-2 pointer-events-auto">
        <div className="bg-white/95 backdrop-blur border border-[#e4e2dc] shadow-sm rounded-2xl p-1.5 flex flex-col items-center gap-1.5 text-[#474741]">
          {/* 刷新数据 */}
          <button
            type="button"
            onClick={() => handleManualRefresh(true)}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[#f4f4f2] text-[#474741] hover:text-[#1a1c1b] cursor-pointer transition-all"
            title="即刻同步全域数据"
          >
            <RefreshCw className={`w-4 h-4 ${countdown <= 2 ? 'animate-spin' : ''}`} />
          </button>

          {/* 全域搜索 */}
          <button
            type="button"
            onClick={() => setActiveDrawer(activeDrawer === 'search' ? 'none' : 'search')}
            className={`w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all ${
              activeDrawer === 'search' ? 'bg-[#1a1c1b] text-white' : 'hover:bg-[#f4f4f2] text-[#474741]'
            }`}
            title="全域精准检索"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* 异常预警铃铛 */}
          <button
            type="button"
            onClick={() => setActiveDrawer(activeDrawer === 'anomalies' ? 'none' : 'anomalies')}
            className={`w-8 h-8 rounded-xl flex items-center justify-center relative cursor-pointer transition-all ${
              activeDrawer === 'anomalies' ? 'bg-[#1a1c1b] text-white shadow-xs font-bold' : 'hover:bg-[#f4f4f2] text-[#1a1c1b]'
            }`}
            title="异常预警处置中枢"
          >
            <Bell className="w-4 h-4" />
            {anomalies.filter((a) => a.status === 'pending').length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-[#1a1c1b] text-white text-[8.5px] font-mono font-bold rounded-full flex items-center justify-center border border-white">
                {anomalies.filter((a) => a.status === 'pending').length}
              </span>
            )}
          </button>

          {/* 轨迹回放 */}
          <button
            type="button"
            onClick={() => setActiveDrawer(activeDrawer === 'playback' ? 'none' : 'playback')}
            className={`w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all ${
              activeDrawer === 'playback' ? 'bg-[#1a1c1b] text-white shadow-xs font-bold' : 'hover:bg-[#f4f4f2] text-[#1a1c1b]'
            }`}
            title="轨迹回放"
          >
            <History className="w-4 h-4" />
          </button>

          {/* 供需分析 */}
          <button
            type="button"
            onClick={() => setActiveDrawer(activeDrawer === 'intelligence' ? 'none' : 'intelligence')}
            className={`w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all ${
              activeDrawer === 'intelligence' ? 'bg-[#1a1c1b] text-white shadow-xs font-bold' : 'hover:bg-[#f4f4f2] text-[#1a1c1b]'
            }`}
            title="供需分析"
          >
            <Activity className="w-4 h-4" />
          </button>

          {/* 数据审计导出 */}
          <button
            type="button"
            onClick={() => setActiveDrawer(activeDrawer === 'audit_export' ? 'none' : 'audit_export')}
            className={`w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all ${
              activeDrawer === 'audit_export' ? 'bg-[#1a1c1b] text-white shadow-xs font-bold' : 'hover:bg-[#f4f4f2] text-[#1a1c1b]'
            }`}
            title="数据导出与审计"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 模块五：右下角视口与量测工具栏 (下) */}
      {/* ========================================================= */}
      <div className="absolute right-4 bottom-4 z-20 flex items-center gap-1 pointer-events-auto">
        <div className="bg-white/95 backdrop-blur border border-[#e4e2dc] shadow-sm rounded-xl px-2 py-1 flex items-center gap-1 text-[#474741]">
          <button
            type="button"
            onClick={() => setZoomLevel((prev) => Math.min(2.8, prev + 0.2))}
            className="w-7 h-7 rounded-lg hover:bg-[#f4f4f2] flex items-center justify-center cursor-pointer"
            title="放大视角 (+)"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel((prev) => Math.max(0.6, prev - 0.2))}
            className="w-7 h-7 rounded-lg hover:bg-[#f4f4f2] flex items-center justify-center cursor-pointer"
            title="缩小视角 (-)"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={resetView}
            className="w-7 h-7 rounded-lg hover:bg-[#f4f4f2] flex items-center justify-center cursor-pointer"
            title="视角复位 (⊙)"
          >
            <LocateFixed className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              const nextH = mapHierarchy === 'city' ? 'district' : mapHierarchy === 'district' ? 'grid' : 'city';
              handleSwitchHierarchy(nextH);
            }}
            className="w-7 h-7 rounded-lg hover:bg-[#f4f4f2] flex items-center justify-center cursor-pointer"
            title="切换沙盘层级"
          >
            <Crosshair className="w-4 h-4" />
          </button>
          {/* 视角 2D/3D 切换 */}
          <button
            type="button"
            onClick={() => {
              const nextP = viewPerspective === '2d' ? '3d' : '2d';
              setViewPerspective(nextP);
              setViewActionTrigger({ type: 'perspective', timestamp: Date.now() });
              showToast(nextP === '3d' ? '已切换至 3D 鸟瞰倾角透视视角' : '已切换至 2D 平面正交俯视视角');
            }}
            className={`px-1.5 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-all font-mono text-[10px] font-bold gap-1 ${
              viewPerspective === '3d' ? 'bg-[#1a1c1b] text-white shadow-xs' : 'hover:bg-[#f4f4f2] text-[#474741]'
            }`}
            title={`切换视角 (当前: ${viewPerspective.toUpperCase()})`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>{viewPerspective.toUpperCase()}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const next = activeTool === 'measure' ? 'none' : 'measure';
              setActiveTool(next);
              setMeasurePoints([]);
              showToast(next === 'measure' ? '已开启空间直线测距：在地图点击两点即可量算' : '已关闭测距工具');
            }}
            className={`w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-all ${
              activeTool === 'measure' ? 'bg-[#1a1c1b] text-white' : 'hover:bg-[#f4f4f2]'
            }`}
            title="空间直线测距"
          >
            <Ruler className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              const next = activeTool === 'select' ? 'none' : 'select';
              setActiveTool(next);
              setSelectionBox(null);
              setSelectedAreaStats(null);
              showToast(next === 'select' ? '已开启矩形圈选分析：在沙盘上拖拽即可统计覆盖主体' : '已关闭圈选工具');
            }}
            className={`w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-all ${
              activeTool === 'select' ? 'bg-[#1a1c1b] text-white' : 'hover:bg-[#f4f4f2]'
            }`}
            title="矩形区域圈选分析"
          >
            <BoxSelect className="w-4 h-4" />
          </button>
          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="w-7 h-7 rounded-lg hover:bg-[#f4f4f2] flex items-center justify-center cursor-pointer"
              title={isFullscreen ? '退出全屏' : '全屏指挥模式'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 模块：骑手轨迹隔离控制条与选中任务 HUD (左下角) */}
      {/* ========================================================= */}
      <div className="absolute left-4 bottom-4 z-20 flex flex-col gap-2 pointer-events-auto max-w-md">
        {/* 选定骑手实时任务 HUD 浮窗 */}
        {selectedRider && (
          <div className="bg-white/98 backdrop-blur-md border border-[#e4e2dc] shadow-xl rounded-2xl p-3 text-xs text-[#1a1c1b] flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#e4e2dc]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#1a1c1b] flex items-center justify-center text-white">
                  <Navigation className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs">{selectedRider.name}</span>
                    <span className="px-1.5 py-0.2 rounded text-[9.5px] font-medium bg-[#f4f4f2] text-[#474741]">
                      {selectedRider.status === 'online' ? '在线配送中' : '待命中'}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#787770]">
                    当前配速: <span className="font-bold text-[#1a1c1b] font-mono">{selectedRider.speedKmh} km/h</span> | 在途订单: <span className="font-bold text-[#006d36] font-mono">{selectedRider.activeOrders.length}</span> 单
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRiderId(null)}
                className="text-[#787770] hover:text-[#1a1c1b] cursor-pointer p-1"
                title="取消骑手路线聚焦"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 在途订单列表 */}
            <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto">
              {selectedRider.activeOrders.length === 0 ? (
                <div className="py-2 text-center text-[10.5px] text-[#787770]">该骑手当前无正在配送的在途订单</div>
              ) : (
                selectedRider.activeOrders.map((ord) => (
                  <div
                    key={ord.orderNo}
                    className="p-2 rounded-xl bg-[#f9f9f7] border border-[#e4e2dc] flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-1 font-mono text-[10.5px] font-bold">
                        <span>{ord.orderNo}</span>
                        {ord.status === 'timeout_risk' && (
                          <span className="text-[#ba1a1a] text-[9px] bg-[#ba1a1a]/10 px-1 rounded">延误预警</span>
                        )}
                      </div>
                      <div className="text-[10px] text-[#787770]">
                        送达落点: ({ord.dropoffCoords.x.toFixed(0)}, {ord.dropoffCoords.y.toFixed(0)})
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => focusOnCoordinates(ord.dropoffCoords.x, ord.dropoffCoords.y)}
                      className="px-2 py-0.5 rounded-lg bg-white border border-[#e4e2dc] hover:bg-[#f4f4f2] text-[10px] font-medium cursor-pointer"
                    >
                      落点定位
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-[#e4e2dc] text-[10px]">
              <span className="text-[#787770]">沙盘已高亮锁定该骑手专属派送航迹</span>
              <button
                type="button"
                onClick={() => setActiveEntity({ type: 'rider', id: selectedRider.id })}
                className="font-bold text-[#1a1c1b] hover:underline cursor-pointer"
              >
                查看完整档案 &gt;
              </button>
            </div>
          </div>
        )}

        {/* 骑手轨迹隔离控制条 */}
        <div className="bg-white/95 backdrop-blur-md border border-[#e4e2dc] shadow-sm rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs text-[#474741]">
          <div className="flex items-center gap-1 text-[11px] font-bold text-[#1a1c1b]">
            <Navigation className="w-3.5 h-3.5 text-[#006d36]" />
            <span>骑手轨迹:</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setShowAllRiderRoutes(true);
                setSelectedRiderId(null);
                showToast('已显示全域所有骑手轨迹');
              }}
              className={`px-2 py-0.5 rounded-lg text-[10.5px] font-medium cursor-pointer transition-all ${
                showAllRiderRoutes && !selectedRiderId ? 'bg-[#1a1c1b] text-white' : 'bg-[#f4f4f2] text-[#474741] hover:bg-[#e4e2dc]'
              }`}
            >
              全域路线
            </button>

            <select
              value={selectedRiderId || ''}
              onChange={(e) => {
                const id = e.target.value;
                if (!id) {
                  setSelectedRiderId(null);
                  setShowAllRiderRoutes(false);
                } else {
                  setSelectedRiderId(id);
                  setShowAllRiderRoutes(false);
                  const r = riders.find((item) => item.id === id);
                  if (r) focusOnCoordinates(r.coords.x, r.coords.y);
                }
              }}
              className="px-2 py-0.5 rounded-lg bg-[#f4f4f2] border border-[#e4e2dc] text-[10.5px] font-medium text-[#1a1c1b] focus:outline-none cursor-pointer"
            >
              <option value="">按骑手独立查找...</option>
              {filteredRiders.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.activeOrders.length}单在途 - {r.speedKmh}km/h)
                </option>
              ))}
            </select>

            {selectedRiderId && (
              <button
                type="button"
                onClick={() => {
                  setSelectedRiderId(null);
                  setShowAllRiderRoutes(false);
                }}
                className="w-5 h-5 rounded flex items-center justify-center hover:bg-[#f4f4f2] text-[#787770] cursor-pointer"
                title="清空选择"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 竞争对手情报雷达与档案 Card (浮动卡片) */}
      {showCompetitorRadar && (
        <div className="absolute left-16 top-16 w-84 bg-white/95 backdrop-blur-md border border-[#e4e2dc] shadow-xl rounded-2xl p-3 z-30 pointer-events-auto flex flex-col gap-2.5 text-[#1a1c1b] animate-in fade-in slide-in-from-left-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#e4e2dc]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#ba1a1a]" />
              <h3 className="text-xs font-bold text-[#1a1c1b]">竞争对手情报雷达与档案</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowCompetitorRadar(false)}
              className="text-[#787770] hover:text-[#1a1c1b] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 筛选 Tabs */}
          <div className="flex items-center gap-1 bg-[#f4f4f2] p-1 rounded-xl text-[10.5px]">
            {(['全部', '高威胁', '中威胁', '旁观关注'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setCompetitorFilter(tab)}
                className={`flex-1 py-1 rounded-lg font-medium cursor-pointer transition-all ${
                  competitorFilter === tab ? 'bg-[#1a1c1b] text-white shadow-xs' : 'text-[#474741] hover:bg-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* 检索与新增按钮 */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#787770]" />
              <input
                type="text"
                value={competitorSearch}
                onChange={(e) => setCompetitorSearch(e.target.value)}
                placeholder="搜索竞品或网格..."
                className="w-full pl-8 pr-2 py-1 text-xs rounded-xl bg-[#f4f4f2] border border-[#e4e2dc] text-[#1a1c1b] focus:outline-none focus:border-[#1a1c1b]"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowAddCompetitorModal(true)}
              className="px-2.5 py-1 rounded-xl bg-[#1a1c1b] hover:bg-black text-white text-[11px] font-bold cursor-pointer whitespace-nowrap shadow-xs"
            >
              + 标记对手
            </button>
          </div>

          {/* 竞品档案条目列表 */}
          <div className="max-h-60 overflow-y-auto flex flex-col gap-1.5 pr-0.5">
            {filteredCompetitors.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#787770]">暂未发现符合条件的对手情报</div>
            ) : (
              filteredCompetitors.map((c) => (
                <div
                  key={c.id}
                  className="p-2 rounded-xl bg-white border border-[#e4e2dc] hover:border-[#1a1c1b] transition-all flex flex-col gap-1 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-[#1a1c1b]">{c.name}</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          c.threatLevel === 'high'
                            ? 'bg-black text-white'
                            : c.threatLevel === 'medium'
                            ? 'bg-neutral-200 text-neutral-800'
                            : 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        {c.threatLevel === 'high' ? '高威胁' : c.threatLevel === 'medium' ? '中威胁' : '关注'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        focusOnCoordinates(c.coords.x, c.coords.y);
                        showToast(`已将视角居中至对手【${c.name}】坐标点`);
                      }}
                      className="text-[10px] text-[#1a1c1b] font-bold hover:underline cursor-pointer"
                    >
                      定位
                    </button>
                  </div>
                  <div className="text-[10px] text-[#787770] flex items-center justify-between">
                    <span>品类: {c.category}</span>
                    <span>{c.zoneName}</span>
                  </div>
                  <div className="text-[9.5px] text-[#474741] bg-[#f9f9f7] p-1.5 rounded-lg border border-[#e4e2dc]">
                    <span className="text-[#1a1c1b] font-bold">应对策略: </span>
                    {c.strategy}
                  </div>
                  {/* 入库与删除标记操作条 */}
                  <div className="pt-1.5 border-t border-[#e4e2dc] flex items-center justify-between gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleArchiveCompetitor(c.id)}
                      className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        c.isArchived
                          ? 'bg-[#eaf7ee] text-[#006d36] border border-[#006d36]/20'
                          : 'bg-[#f4f4f2] hover:bg-[#e4e2dc] text-[#474741]'
                      }`}
                    >
                      {c.isArchived ? (
                        <>
                          <BookmarkCheck className="w-3 h-3 text-[#006d36]" />
                          <span>已入库</span>
                        </>
                      ) : (
                        <>
                          <BookmarkPlus className="w-3 h-3" />
                          <span>入库知识库</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCompetitorInfo({
                          record: c,
                          screenPos: { x: 380, y: 180 }
                        });
                      }}
                      className="py-1 px-2 rounded-lg bg-white border border-[#e4e2dc] hover:border-[#1a1c1b] text-[10px] font-bold text-[#1a1c1b] cursor-pointer"
                    >
                      详情卡片
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteCompetitor(c.id)}
                      className="py-1 px-1.5 rounded-lg bg-white border border-[#ba1a1a]/30 hover:bg-[#fff5f5] text-[#ba1a1a] text-[10px] font-bold cursor-pointer transition-all flex items-center gap-0.5"
                      title="彻底删除此标记点位"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>删除</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 标记对手情报 Modal */}
      {showAddCompetitorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 pointer-events-auto">
          <div className="bg-white rounded-2xl border border-[#e4e2dc] shadow-2xl w-full max-w-md p-5 text-[#1a1c1b] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#e4e2dc]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1a1c1b]" />
                <h3 className="font-bold text-sm text-[#1a1c1b]">标记对手情报</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCompetitorModal(false)}
                className="text-[#787770] hover:text-[#1a1c1b] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCompetitor} className="mt-4 flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-bold text-[#474741] block mb-1">
                  对手品牌 / 代号 <span className="text-[#ba1a1a]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCompName}
                  onChange={(e) => setNewCompName(e.target.value)}
                  placeholder="如: 火焰乌炭烤 / 街角汉堡车"
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-[#f9f9f7] border border-[#e4e2dc] text-[#1a1c1b] focus:outline-none focus:border-[#1a1c1b]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[#474741] block mb-1">主营品类 / 业态</label>
                  <input
                    type="text"
                    value={newCompCategory}
                    onChange={(e) => setNewCompCategory(e.target.value)}
                    placeholder="如: 街头炭烤 / 汉堡车"
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-[#f9f9f7] border border-[#e4e2dc] text-[#1a1c1b] focus:outline-none focus:border-[#1a1c1b]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#474741] block mb-1">所属网格</label>
                  <select
                    value={newCompZone}
                    onChange={(e) => setNewCompZone(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-[#f9f9f7] border border-[#e4e2dc] text-[#1a1c1b] focus:outline-none focus:border-[#1a1c1b]"
                  >
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[#474741] block mb-1">威胁程度评估</label>
                  <select
                    value={newCompThreat}
                    onChange={(e) => setNewCompThreat(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-[#f9f9f7] border border-[#e4e2dc] text-[#1a1c1b] focus:outline-none focus:border-[#1a1c1b]"
                  >
                    <option value="high">高威胁 (严重分流客群)</option>
                    <option value="medium">中威胁 (部分时段竞争)</option>
                    <option value="low">旁观关注 (低频经营)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#474741] block mb-1">地图相对坐标 (X, Y)</label>
                  <input
                    type="text"
                    value={newCompCoords}
                    onChange={(e) => setNewCompCoords(e.target.value)}
                    placeholder="850, 420"
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-[#f9f9f7] border border-[#e4e2dc] font-mono text-[#1a1c1b] focus:outline-none focus:border-[#1a1c1b]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#474741] block mb-1">发现 / 排查时间</label>
                <input
                  type="text"
                  value={newCompTime}
                  onChange={(e) => setNewCompTime(e.target.value)}
                  placeholder="2026-09-09 17:30"
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-[#f9f9f7] border border-[#e4e2dc] text-[#1a1c1b] focus:outline-none focus:border-[#1a1c1b]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#474741] block mb-1">应对防守 / 进攻策略</label>
                <textarea
                  rows={2}
                  value={newCompStrategy}
                  onChange={(e) => setNewCompStrategy(e.target.value)}
                  placeholder="如: 建议在 17:00 晚高峰派出 03餐车并在周边发放定向满减补贴券..."
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-[#f9f9f7] border border-[#e4e2dc] text-[#1a1c1b] focus:outline-none focus:border-[#1a1c1b] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e4e2dc] mt-1">
                <button
                  type="button"
                  onClick={() => setShowAddCompetitorModal(false)}
                  className="px-3 py-1.5 text-xs rounded-xl bg-[#f4f4f2] text-[#474741] font-medium hover:bg-[#e4e2dc] cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs rounded-xl bg-[#1a1c1b] hover:bg-black text-white font-bold cursor-pointer shadow-xs"
                >
                  确认标定至沙盘
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 模块六：右侧抽屉浮层定位 (挂载于右侧导航栏旁) */}
      <div className="absolute right-14 top-4 z-40 pointer-events-auto">
        <SearchDrawer
          isOpen={activeDrawer === 'search'}
          onClose={() => setActiveDrawer('none')}
          managers={managers}
          stores={stores}
          trucks={trucks}
          riders={riders}
          users={users}
          zones={zones}
          orders={cloudOrders}
          onSelectEntity={handleSelectSearchedEntity}
          showToast={showToast}
        />

        <AnomalyDrawer
          isOpen={activeDrawer === 'anomalies'}
          onClose={() => setActiveDrawer('none')}
          anomalies={anomalies}
          onResolveAnomaly={handleResolveAnomaly}
          onLocateTarget={handleLocateAnomalyTarget}
          showToast={showToast}
        />

        <TrajectoryPlaybackDrawer
          isOpen={activeDrawer === 'playback'}
          onClose={() => setActiveDrawer('none')}
          managers={managers}
          trucks={trucks}
          riders={riders}
          onSelectRider={(riderId) => {
            setSelectedRiderId((prev) => (prev === riderId ? null : riderId));
            const r = riders.find((x) => x.id === riderId);
            if (r) focusOnCoordinates(r.coords.x, r.coords.y);
          }}
          showToast={showToast}
        />

        <RegionalIntelligenceDrawer
          isOpen={activeDrawer === 'intelligence'}
          onClose={() => setActiveDrawer('none')}
          zones={zones}
          showToast={showToast}
        />

        <AuditExportDrawer
          isOpen={activeDrawer === 'audit_export'}
          onClose={() => setActiveDrawer('none')}
          auditLogs={auditLogs}
          orders={cloudOrders}
          onExportReport={handleExportReport}
          showToast={showToast}
        />
      </div>

      {/* ========================================================= */}
      {/* 模块五：专属详情弹窗交互层 (区经理/门店/餐车/骑手/网格/竞品情报) */}
      {/* ========================================================= */}
      {/* 区经理网格街区绘制与分配中枢 HUD (当 activeTool === 'draw_polygon' 时固定悬浮在顶部中央) */}
      {activeTool === 'draw_polygon' && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 pointer-events-auto bg-white/98 backdrop-blur-md border border-[#1a1c1b]/30 shadow-2xl rounded-2xl p-3.5 flex flex-col gap-2.5 text-xs text-[#1a1c1b] min-w-[540px] max-w-[92vw] animate-in fade-in slide-in-from-top-3">
          {/* 标题栏与网格切换器 */}
          <div className="flex items-center justify-between pb-2 border-b border-[#e4e2dc]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#1a1c1b] text-white flex items-center justify-center">
                <PenTool className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-[#1a1c1b]">区经理网格多边形街区绘制与分配中枢</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                    钢笔编辑中
                  </span>
                </div>
                <p className="text-[10px] text-[#787770]">
                  支持沿弯曲街道/自然街区点击落点，修改重塑区经理管辖责任范围
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveTool('none');
                setDrawingPoints([]);
                showToast('已退出网格绘制模式');
              }}
              className="w-6 h-6 rounded-lg bg-[#f4f4f2] hover:bg-[#e4e2dc] text-[#787770] flex items-center justify-center cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 网格目标切换与街区吸附预设 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-[#787770] block mb-1">
                选择编辑目标网格与区经理:
              </label>
              <select
                value={drawingZoneId}
                onChange={(e) => handleStartEditZoneBoundary(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-[#f4f4f2] border border-[#e4e2dc] text-[#1a1c1b] focus:outline-none cursor-pointer"
              >
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} ({z.managerName} · {z.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#787770] block mb-1">
                街区/弯曲道路轮廓一键吸附:
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleApplyStreetBlockPreset(drawingZoneId)}
                  className="flex-1 py-1.5 px-2 rounded-xl bg-white border border-[#e4e2dc] hover:border-[#1a1c1b] text-[10.5px] font-semibold text-[#1a1c1b] transition-all cursor-pointer shadow-2xs hover:bg-[#f9f9f7] flex items-center justify-center gap-1"
                >
                  <Route className="w-3 h-3 text-[#006d36]" />
                  <span>吸附自然街区</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearDrawingPoints}
                  className="py-1.5 px-2.5 rounded-xl bg-white border border-[#e4e2dc] hover:border-[#ba1a1a] text-[10.5px] text-[#787770] hover:text-[#ba1a1a] transition-all cursor-pointer"
                >
                  清空点位
                </button>
              </div>
            </div>
          </div>

          {/* 实时点位状态与工具按钮栏 */}
          <div className="pt-2 border-t border-[#e4e2dc] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#474741]">
                已标记 <b className="text-[#1a1c1b] font-mono text-sm">{drawingPoints.length}</b> 处街区锚点
                {drawingPoints.length < 3 && (
                  <span className="text-[#ba1a1a] text-[10px] ml-1.5 font-medium">(封闭多边形需 ≥3 点)</span>
                )}
              </span>

              {drawingPoints.length > 0 && (
                <button
                  type="button"
                  onClick={handleUndoDrawingPoint}
                  className="px-2 py-1 rounded-lg bg-[#f4f4f2] hover:bg-[#e4e2dc] text-[10.5px] font-medium text-[#474741] cursor-pointer"
                >
                  撤销上个控制点
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTool('none');
                  setDrawingPoints([]);
                }}
                className="px-3 py-1.5 rounded-xl bg-white border border-[#e4e2dc] text-xs font-medium text-[#474741] hover:bg-[#f4f4f2] cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveDrawnPolygon}
                disabled={drawingPoints.length < 3}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
                  drawingPoints.length >= 3
                    ? 'bg-[#1a1c1b] hover:bg-black text-white active:scale-98'
                    : 'bg-[#e4e2dc] text-[#787770] cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>保存并更新网格责任范围</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeEntity?.type === 'manager' && (
        <ManagerDetailModal
          manager={managers.find((m) => m.id === activeEntity.id) || managers[0]}
          onClose={() => setActiveEntity(null)}
          onSelectZone={(zoneId) => setActiveEntity({ type: 'zone', id: zoneId })}
          showToast={showToast}
        />
      )}

      {activeEntity?.type === 'store' && (
        <StoreDetailModal
          store={stores.find((s) => s.id === activeEntity.id) || stores[0]}
          anchorScreenPos={storeAnchorPos}
          onClose={() => setActiveEntity(null)}
          onSelectManager={(mgrCode) => {
            const m = managers.find((item) => item.code === mgrCode);
            if (m) setActiveEntity({ type: 'manager', id: m.id });
          }}
          showToast={showToast}
        />
      )}

      {activeEntity?.type === 'truck' && (
        <TruckDetailModal
          truck={trucks.find((t) => t.id === activeEntity.id) || trucks[0]}
          onClose={() => setActiveEntity(null)}
          onSelectManager={(mgrCode) => {
            const m = managers.find((item) => item.code === mgrCode);
            if (m) setActiveEntity({ type: 'manager', id: m.id });
          }}
          onApproveSurge={(truckId) => {
            // 向聊天室下发调度消息
            sendOrderChatMessage('UR-98215', {
              senderRole: 'platform',
              senderName: '区域总控调度中枢',
              type: 'system_notice',
              text: '⚡ 【一键削峰调度核准】已向 03号餐车周边 1.5km 待命骑手下发双倍专送加补，启动分流支援！'
            });
            addAuditLog('一键削峰调度核准', `针对餐车【${truckId}】下发峰值订单跨车调拨指令`);
          }}
          showToast={showToast}
        />
      )}

      {activeEntity?.type === 'rider' && (
        <RiderDetailModal
          rider={riders.find((r) => r.id === activeEntity.id) || riders[0]}
          onClose={() => setActiveEntity(null)}
          showToast={showToast}
        />
      )}

      {activeEntity?.type === 'zone' && (
        <ZoneDetailModal
          zone={zones.find((z) => z.id === activeEntity.id) || zones[0]}
          onClose={() => setActiveEntity(null)}
          onEditZoneBoundary={(zoneId) => handleStartEditZoneBoundary(zoneId)}
          showToast={showToast}
        />
      )}

      {/* 竞争对手情报卡片弹窗 (紧凑吸附于锚点右侧显示，支持入库知识库与删除标记) */}
      {selectedCompetitorInfo && (
        <CompetitorDetailModal
          competitor={selectedCompetitorInfo.record}
          anchorScreenPos={selectedCompetitorInfo.screenPos}
          onClose={() => setSelectedCompetitorInfo(null)}
          onToggleArchive={handleToggleArchiveCompetitor}
          onDelete={handleDeleteCompetitor}
          showToast={showToast}
        />
      )}

      {/* 闭环运力调度中枢弹窗 (感知·判断·执行·持续迭代) */}
      <LoopOpsWorkflowModal
        isOpen={showLoopOpsModal}
        onClose={() => setShowLoopOpsModal(false)}
        zones={zones}
        trucks={trucks}
        riders={riders}
        showToast={showToast}
        addAuditLog={addAuditLog}
        onDispatchTruck={handleDispatchTruck}
        onIssueCoupons={handleIssueCoupons}
        onDispatchInspector={handleDispatchInspector}
      />
    </div>
  );
};
