/**
 * 品牌区域运维地图数据大屏 - 右侧功能抽屉组
 * 包含：全域精准检索抽屉、异常预警中枢、轨迹回放工作台、区域供需智能分析、操作审计与数据导出
 */

import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  AlertTriangle,
  History,
  Activity,
  Download,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Shield,
  Store,
  Truck,
  Bike,
  Users,
  MapPin,
  Flame,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
  Check,
  SlidersHorizontal,
  Package
} from 'lucide-react';
import {
  ManagerEntity,
  StoreEntity,
  TruckEntity,
  RiderEntity,
  UserEntity,
  ZoneMesh,
  AnomalyRecord,
  AuditLogItem
} from './cockpitData';
import { Order } from '../../../types';

// ----------------------------------------------------------------------
// 1. 全域精准检索抽屉 (3.1.1)
// ----------------------------------------------------------------------
interface SearchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  managers: ManagerEntity[];
  stores: StoreEntity[];
  trucks: TruckEntity[];
  riders: RiderEntity[];
  users: UserEntity[];
  zones: ZoneMesh[];
  orders?: Order[];
  onSelectEntity: (type: 'manager' | 'store' | 'truck' | 'rider' | 'user' | 'zone' | 'order', id: string, extraData?: any) => void;
  showToast: (msg: string) => void;
}

export const SearchDrawer: React.FC<SearchDrawerProps> = ({
  isOpen,
  onClose,
  managers,
  stores,
  trucks,
  riders,
  users,
  zones,
  orders = [],
  onSelectEntity,
  showToast
}) => {
  const [keyword, setKeyword] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'order' | 'rider' | 'truck' | 'store' | 'manager' | 'user'>('all');
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // 组合多条件过滤
  const searchResults = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    const results: {
      type: 'manager' | 'store' | 'truck' | 'rider' | 'user' | 'order';
      id: string;
      title: string;
      subtitle: string;
      statusLabel: string;
      statusColor: string;
      zoneName: string;
      extraData?: any;
    }[] = [];

    // 云端真实订单
    if (selectedType === 'all' || selectedType === 'order') {
      orders.forEach((ord) => {
        const itemNames = ord.items?.map((i) => i.name).join(' ') || '';
        const orderIdStr = (ord.id || '').toLowerCase();
        const orderNoStr = (ord.orderNo || '').toLowerCase();
        const customerStr = (ord.customerName || '').toLowerCase();
        const phoneStr = (ord.userPhone || '').toLowerCase();
        const tableStr = (ord.tableCode || '').toLowerCase();
        const addressStr = (ord.deliveryAddress || '').toLowerCase();

        if (
          !q ||
          orderIdStr.includes(q) ||
          orderNoStr.includes(q) ||
          customerStr.includes(q) ||
          phoneStr.includes(q) ||
          tableStr.includes(q) ||
          itemNames.toLowerCase().includes(q) ||
          addressStr.includes(q)
        ) {
          const isDelivering = ord.status === 'delivering';
          const isCooking = ord.status === 'cooking';
          const isPending = ord.status === 'pending';
          const isCompleted = ord.status === 'completed';

          results.push({
            type: 'order',
            id: ord.id || ord.orderNo,
            title: `订单 ${ord.orderNo || ord.id}`,
            subtitle: `${ord.items?.map((i) => `${i.name}x${i.quantity}`).join(', ') || '餐品'} · ¥${ord.totalAmount || 0} · ${ord.tableCode ? `桌号:${ord.tableCode}` : ord.deliveryAddress || '专送'}`,
            statusLabel: isDelivering ? '极速专送中' : isCooking ? '后厨现制' : isPending ? '待接单' : isCompleted ? '已完成' : '流转中',
            statusColor: isDelivering ? '#006d36' : isCooking ? '#d97706' : isPending ? '#2563eb' : '#787770',
            zoneName: ord.channelType === 'delivery' || ord.channel === 'delivery' ? '专送网格' : '出摊现场',
            extraData: ord
          });
        }
      });
    }

    // 骑手
    if (selectedType === 'all' || selectedType === 'rider') {
      riders.forEach((r) => {
        if (selectedZone !== 'all' && r.zoneId !== selectedZone) return;
        if (selectedStatus === 'abnormal' && r.timeoutCount === 0) return;
        if (selectedStatus === 'active' && r.status !== 'online') return;
        if (
          !q ||
          r.name.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q) ||
          r.phone.includes(q) ||
          r.stationName.toLowerCase().includes(q)
        ) {
          results.push({
            type: 'rider',
            id: r.id,
            title: `骑手 ${r.name} (${r.code})`,
            subtitle: `${r.stationName} · 时速 ${r.speedKmh}km/h · 评分 ${r.rating} · 在途 ${r.activeOrders.length}单`,
            statusLabel: r.status === 'online' ? (r.activeOrders.length > 0 ? '专送在途' : '在岗待命') : r.status === 'resting' ? '休息中' : '离线',
            statusColor: r.status === 'online' ? '#006d36' : '#d97706',
            zoneName: r.zoneName,
            extraData: r
          });
        }
      });
    }

    // 餐车
    if (selectedType === 'all' || selectedType === 'truck') {
      trucks.forEach((t) => {
        if (selectedZone !== 'all' && t.zoneId !== selectedZone) return;
        if (selectedStatus === 'abnormal' && t.status !== 'fault' && t.pendingQueue <= 10) return;
        if (selectedStatus === 'active' && t.status !== 'open') return;
        if (
          !q ||
          t.name.toLowerCase().includes(q) ||
          t.code.toLowerCase().includes(q) ||
          t.managerName.toLowerCase().includes(q)
        ) {
          results.push({
            type: 'truck',
            id: t.id,
            title: `${t.name} (${t.code})`,
            subtitle: `炉温: ${t.stoveTemp} · 今日订单: ${t.todayOrders} · 排队: ${t.pendingQueue}单`,
            statusLabel: t.pendingQueue > 10 ? '排队超限' : t.status === 'open' ? '正常营业' : '筹备中',
            statusColor: t.pendingQueue > 10 ? '#ba1a1a' : t.status === 'open' ? '#006d36' : '#2563eb',
            zoneName: t.zoneName,
            extraData: t
          });
        }
      });
    }

    // 门店
    if (selectedType === 'all' || selectedType === 'store') {
      stores.forEach((s) => {
        if (selectedZone !== 'all' && s.zoneId !== selectedZone) return;
        if (selectedStatus === 'abnormal' && s.status !== 'fault') return;
        if (selectedStatus === 'active' && s.status !== 'open') return;
        if (
          !q ||
          s.name.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          s.address.toLowerCase().includes(q)
        ) {
          results.push({
            type: 'store',
            id: s.id,
            title: s.name,
            subtitle: `${s.address} · 今日 ${s.todayOrders} 单 · 营收 ¥${s.revenue}`,
            statusLabel: s.status === 'open' ? '正常营业' : s.status === 'fault' ? '异常故障' : '暂停中',
            statusColor: s.status === 'open' ? '#006d36' : s.status === 'fault' ? '#ba1a1a' : '#d97706',
            zoneName: s.zoneName,
            extraData: s
          });
        }
      });
    }

    // 区经理
    if (selectedType === 'all' || selectedType === 'manager') {
      managers.forEach((m) => {
        if (selectedZone !== 'all' && m.zoneId !== selectedZone) return;
        if (selectedStatus === 'abnormal' && m.status !== 'offline') return;
        if (selectedStatus === 'active' && m.status !== 'online') return;
        if (
          !q ||
          m.name.toLowerCase().includes(q) ||
          m.phone.includes(q) ||
          m.code.toLowerCase().includes(q) ||
          m.zoneName.toLowerCase().includes(q)
        ) {
          results.push({
            type: 'manager',
            id: m.id,
            title: `区经理 ${m.name} (${m.code})`,
            subtitle: `负责: ${m.zoneName} · 巡查 ${m.todayPatrolCount} 次`,
            statusLabel: m.status === 'online' ? '在岗巡查' : '离线超限',
            statusColor: m.status === 'online' ? '#006d36' : '#ba1a1a',
            zoneName: m.zoneName,
            extraData: m
          });
        }
      });
    }

    // 用户
    if (selectedType === 'all' || selectedType === 'user') {
      users.forEach((u) => {
        if (selectedZone !== 'all' && u.zoneId !== selectedZone) return;
        if (!q || u.phoneMask.includes(q) || u.id.toLowerCase().includes(q)) {
          results.push({
            type: 'user',
            id: u.id,
            title: `食客 ${u.phoneMask}`,
            subtitle: `${u.zoneName} · 活跃时间: ${u.lastActive}`,
            statusLabel: u.isCluster ? '高频聚落' : '在线',
            statusColor: '#2563eb',
            zoneName: u.zoneName
          });
        }
      });
    }

    return results;
  }, [keyword, selectedType, selectedZone, selectedStatus, orders, managers, stores, trucks, riders, users]);

  if (!isOpen) return null;

  return (
    <div className="bg-white/98 backdrop-blur-md border border-[#e4e2dc] shadow-2xl w-96 rounded-2xl p-4 max-h-[85vh] flex flex-col transition-all duration-200 text-[#1a1c1b] animate-in fade-in-50 slide-in-from-right-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#e4e2dc]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#1a1c1b] flex items-center justify-center text-white">
            <Search className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-[#1a1c1b] tracking-wider">全域主体与云端订单精准检索</span>
            <p className="text-[10px] text-[#787770] font-mono">GLOBAL ENTITY & CLOUD ORDERS</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-lg hover:bg-[#f4f4f2] text-[#787770] hover:text-[#1a1c1b] flex items-center justify-center cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 搜索框 */}
      <div className="mt-3 relative">
        <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-[#787770]" />
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="输入订单号、菜品、骑手、餐车、手机或商圈..."
          className="w-full pl-8.5 pr-8 py-2 bg-[#f4f4f2] border border-[#e4e2dc] rounded-xl text-xs text-[#1a1c1b] placeholder-[#787770] focus:outline-none focus:border-[#1a1c1b]"
          autoFocus
        />
        {keyword && (
          <button
            type="button"
            onClick={() => setKeyword('')}
            className="absolute right-2.5 top-2 text-[#787770] hover:text-[#1a1c1b] text-xs cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {/* 主体类型 Tab 筛选 */}
      <div className="mt-2.5 flex items-center gap-1 overflow-x-auto pb-1 text-[11px] custom-scrollbar">
        {[
          { key: 'all', label: '全部' },
          { key: 'order', label: `订单(${orders.length})` },
          { key: 'rider', label: `骑手(${riders.length})` },
          { key: 'truck', label: `餐车(${trucks.length})` },
          { key: 'store', label: `门店(${stores.length})` },
          { key: 'manager', label: `区经理(${managers.length})` }
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setSelectedType(tab.key as any)}
            className={`px-2.5 py-1 rounded-lg border font-medium cursor-pointer shrink-0 transition-all ${
              selectedType === tab.key
                ? 'bg-[#1a1c1b] text-white border-[#1a1c1b] shadow-xs'
                : 'bg-white text-[#474741] border-[#e4e2dc] hover:bg-[#f4f4f2]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 商圈与状态双下拉组合 */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        <select
          value={selectedZone}
          onChange={(e) => setSelectedZone(e.target.value)}
          className="px-2 py-1.5 bg-[#f4f4f2] border border-[#e4e2dc] rounded-lg text-[10.5px] text-[#1a1c1b] focus:outline-none"
        >
          <option value="all">全域商圈网格</option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>{z.name}</option>
          ))}
        </select>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-2 py-1.5 bg-[#f4f4f2] border border-[#e4e2dc] rounded-lg text-[10.5px] text-[#1a1c1b] focus:outline-none"
        >
          <option value="all">所有状态</option>
          <option value="active">在岗/正常营业/专送中</option>
          <option value="abnormal">异常/排队超限/超时预警</option>
        </select>
      </div>

      {/* 结果列表 */}
      <div className="mt-3 space-y-2 overflow-y-auto flex-1 pr-1 custom-scrollbar">
        <div className="text-[10px] text-[#787770] flex items-center justify-between">
          <span>共找到 {searchResults.length} 条业务记录</span>
          <span className="font-mono text-[#006d36]">点击直接穿透定位与追踪</span>
        </div>

        {searchResults.map((item) => (
          <div
            key={`${item.type}-${item.id}`}
            onClick={() => {
              onSelectEntity(item.type, item.id, item.extraData);
              showToast(`已定位聚焦 ${item.title}`);
            }}
            className="p-2.5 rounded-xl bg-[#f9f9f7] border border-[#e4e2dc] hover:border-[#1a1c1b] hover:bg-white cursor-pointer transition-all hover:shadow-xs group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1a1c1b] flex items-center gap-1.5 truncate">
                {item.type === 'order' && <Package className="w-3.5 h-3.5 text-[#d97706] shrink-0" />}
                {item.type === 'manager' && <Shield className="w-3.5 h-3.5 text-[#1a1c1b] shrink-0" />}
                {item.type === 'store' && <Store className="w-3.5 h-3.5 text-[#1a1c1b] shrink-0" />}
                {item.type === 'truck' && <Truck className="w-3.5 h-3.5 text-[#006d36] shrink-0" />}
                {item.type === 'rider' && <Bike className="w-3.5 h-3.5 text-[#006d36] shrink-0" />}
                {item.type === 'user' && <Users className="w-3.5 h-3.5 text-[#2563eb] shrink-0" />}
                <span className="truncate">{item.title}</span>
              </span>
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0"
                style={{ color: item.statusColor, backgroundColor: `${item.statusColor}18` }}
              >
                {item.statusLabel}
              </span>
            </div>
            <p className="text-[11px] text-[#787770] mt-1 line-clamp-1 group-hover:text-[#474741] transition-colors">
              {item.subtitle}
            </p>
          </div>
        ))}

        {searchResults.length === 0 && (
          <div className="p-6 text-center text-xs text-[#787770] bg-[#f4f4f2] rounded-xl border border-[#e4e2dc]">
            未检索到匹配的主体或订单，请调整搜索词或切换筛选类型
          </div>
        )}
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// 2. 异常预警与处置中心 (3.8)
// ----------------------------------------------------------------------
interface AnomalyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  anomalies: AnomalyRecord[];
  onResolveAnomaly: (id: string) => void;
  onLocateTarget: (targetKey: string) => void;
  showToast: (msg: string) => void;
}

export const AnomalyDrawer: React.FC<AnomalyDrawerProps> = ({
  isOpen,
  onClose,
  anomalies,
  onResolveAnomaly,
  onLocateTarget,
  showToast
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'resolved'>('pending');

  const filtered = useMemo(() => {
    return anomalies.filter((a) => {
      if (filterStatus === 'all') return true;
      return a.status === filterStatus;
    });
  }, [anomalies, filterStatus]);

  if (!isOpen) return null;

  return (
    <div className="bg-white/98 backdrop-blur-md border border-[#e4e2dc] shadow-2xl w-96 rounded-2xl p-4 max-h-[85vh] flex flex-col transition-all duration-200 text-[#1a1c1b] animate-in fade-in-50 slide-in-from-right-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#e4e2dc]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#fff5f5] border border-[#fecaca] flex items-center justify-center text-[#ba1a1a]">
            <AlertTriangle className="w-4 h-4 text-[#ba1a1a]" />
          </div>
          <div>
            <span className="text-xs font-bold text-[#1a1c1b] tracking-wider">业务异常预警与处置总成</span>
            <p className="text-[10px] text-[#787770] font-mono">ANOMALY CONTROL CENTER</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-lg hover:bg-[#f4f4f2] text-[#787770] hover:text-[#1a1c1b] flex items-center justify-center cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 状态筛选 */}
      <div className="mt-3 flex items-center gap-1.5 text-xs">
        <button
          type="button"
          onClick={() => setFilterStatus('pending')}
          className={`flex-1 py-1 rounded-lg border font-medium cursor-pointer ${
            filterStatus === 'pending'
              ? 'bg-[#ba1a1a] text-white border-[#ba1a1a]'
              : 'bg-white text-[#ba1a1a] border-[#e4e2dc] hover:bg-[#fff5f5]'
          }`}
        >
          待处理异常 ({anomalies.filter((a) => a.status === 'pending').length})
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus('resolved')}
          className={`flex-1 py-1 rounded-lg border font-medium cursor-pointer ${
            filterStatus === 'resolved'
              ? 'bg-[#006d36] text-white border-[#006d36]'
              : 'bg-white text-[#006d36] border-[#e4e2dc] hover:bg-[#eaf7ee]'
          }`}
        >
          已闭环日志 ({anomalies.filter((a) => a.status === 'resolved').length})
        </button>
      </div>

      {/* 异常卡片列表 */}
      <div className="mt-3 space-y-2.5 overflow-y-auto flex-1 pr-1 custom-scrollbar">
        {filtered.map((item) => (
          <div
            key={item.id}
            className={`p-3 rounded-xl border text-xs transition-all ${
              item.status === 'resolved'
                ? 'bg-[#f4f4f2] border-[#e4e2dc] opacity-75'
                : item.level === 'critical'
                ? 'bg-[#fff5f5] border-[#fecaca]'
                : 'bg-[#fffbeb] border-[#fef3c7]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`font-bold flex items-center gap-1.5 ${
                  item.level === 'critical' ? 'text-[#ba1a1a]' : 'text-[#d97706]'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                {item.title}
              </span>
              <span className="font-mono text-[10px] text-[#787770]">{item.occurredAt}</span>
            </div>

            <p className="text-[11px] text-[#474741] mt-1.5 leading-relaxed">{item.detail}</p>

            <div className="mt-2.5 pt-2 border-t border-[#e4e2dc] flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  onLocateTarget(item.targetKey);
                  showToast(`已在沙盘定位至异常主体【${item.zoneName}】`);
                }}
                className="text-[11px] text-[#1a1c1b] font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <MapPin className="w-3 h-3 text-[#ba1a1a]" />
                <span>地图穿透定位</span>
              </button>

              {item.status === 'pending' ? (
                <button
                  type="button"
                  onClick={() => {
                    onResolveAnomaly(item.id);
                    showToast(`已标记异常【${item.title}】为已闭环处置`);
                  }}
                  className="px-2 py-1 rounded-md bg-[#1a1c1b] hover:bg-black text-white text-[10.5px] font-semibold cursor-pointer active:scale-95 transition-all"
                >
                  标记已处理
                </button>
              ) : (
                <span className="text-[10.5px] text-[#006d36] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  已闭环存档
                </span>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="p-4 text-center text-xs text-[#787770] bg-[#f4f4f2] rounded-xl border border-[#e4e2dc]">
            暂无相关异常预警记录
          </div>
        )}
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// 3. 轨迹溯源与多时段回放工作台 (3.9)
// ----------------------------------------------------------------------
interface TrajectoryPlaybackDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  managers: ManagerEntity[];
  trucks: TruckEntity[];
  riders: RiderEntity[];
  onSelectRider?: (riderId: string) => void;
  showToast: (msg: string) => void;
}

export const TrajectoryPlaybackDrawer: React.FC<TrajectoryPlaybackDrawerProps> = ({
  isOpen,
  onClose,
  managers,
  trucks,
  riders,
  onSelectRider,
  showToast
}) => {
  const [targetType, setTargetType] = useState<'manager' | 'truck' | 'rider'>('rider');
  const [selectedId, setSelectedId] = useState<string>(riders[0]?.id || 'rider-01');
  const [timeRange, setTimeRange] = useState<'today' | 'yesterday' | '7days'>('today');
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(40);
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);

  if (!isOpen) return null;

  return (
    <div className="bg-white/98 backdrop-blur-md border border-[#e4e2dc] shadow-2xl w-96 rounded-2xl p-4 max-h-[85vh] flex flex-col transition-all duration-200 text-[#1a1c1b] animate-in fade-in-50 slide-in-from-right-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#e4e2dc]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#1a1c1b] flex items-center justify-center text-white">
            <History className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-[#1a1c1b] tracking-wider">业务轨迹全时域回溯工作台</span>
            <p className="text-[10px] text-[#787770] font-mono">TRAJECTORY AUDIT // REPLAY</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-lg hover:bg-[#f4f4f2] text-[#787770] hover:text-[#1a1c1b] flex items-center justify-center cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 主体分类切换 */}
      <div className="mt-3 flex items-center gap-1 text-xs">
        <button
          type="button"
          onClick={() => {
            setTargetType('rider');
            const defaultRider = riders[0]?.id || '';
            setSelectedId(defaultRider);
            if (defaultRider) onSelectRider?.(defaultRider);
          }}
          className={`flex-1 py-1 rounded-lg border font-medium cursor-pointer transition-all ${
            targetType === 'rider'
              ? 'bg-[#1a1c1b] text-white border-[#1a1c1b]'
              : 'bg-white text-[#1a1c1b] border-[#e4e2dc] hover:bg-[#f4f4f2]'
          }`}
        >
          骑手订单专送
        </button>
        <button
          type="button"
          onClick={() => {
            setTargetType('truck');
            setSelectedId(trucks[0]?.id || '');
          }}
          className={`flex-1 py-1 rounded-lg border font-medium cursor-pointer transition-all ${
            targetType === 'truck'
              ? 'bg-[#1a1c1b] text-white border-[#1a1c1b]'
              : 'bg-white text-[#1a1c1b] border-[#e4e2dc] hover:bg-[#f4f4f2]'
          }`}
        >
          餐车移动出摊
        </button>
        <button
          type="button"
          onClick={() => {
            setTargetType('manager');
            setSelectedId(managers[0]?.id || '');
          }}
          className={`flex-1 py-1 rounded-lg border font-medium cursor-pointer transition-all ${
            targetType === 'manager'
              ? 'bg-[#1a1c1b] text-white border-[#1a1c1b]'
              : 'bg-white text-[#1a1c1b] border-[#e4e2dc] hover:bg-[#f4f4f2]'
          }`}
        >
          区经理巡查
        </button>
      </div>

      {/* 选择具体主体下拉 */}
      <div className="mt-2.5">
        <label className="text-[10px] text-[#787770] font-medium">选择溯源主体对象</label>
        <select
          value={selectedId}
          onChange={(e) => {
            const val = e.target.value;
            setSelectedId(val);
            if (targetType === 'rider') {
              onSelectRider?.(val);
              showToast(`已在地图沙盘高亮骑手轨迹`);
            }
          }}
          className="w-full mt-0.5 px-2.5 py-1.5 bg-[#f4f4f2] border border-[#e4e2dc] rounded-lg text-xs text-[#1a1c1b] focus:outline-none"
        >
          {targetType === 'rider' &&
            riders.map((r) => (
              <option key={r.id} value={r.id}>{r.name} ({r.code}) · {r.stationName} (在途{r.activeOrders.length}单)</option>
            ))}
          {targetType === 'truck' &&
            trucks.map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.code}) · {t.zoneName}</option>
            ))}
          {targetType === 'manager' &&
            managers.map((m) => (
              <option key={m.id} value={m.id}>{m.name} ({m.code}) · {m.zoneName}</option>
            ))}
        </select>
      </div>

      {/* 时间跨度 Tab */}
      <div className="mt-2.5 flex items-center gap-1 text-[11px]">
        {[
          { key: 'today', label: '今日实时' },
          { key: 'yesterday', label: '昨日全天' },
          { key: '7days', label: '近 7 天' }
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTimeRange(t.key as any)}
            className={`flex-1 py-1 rounded-md border text-center font-medium cursor-pointer ${
              timeRange === t.key
                ? 'bg-[#1a1c1b] text-white border-[#1a1c1b]'
                : 'bg-white text-[#1a1c1b] border-[#e4e2dc] hover:bg-[#f4f4f2]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 回放播放控制盘 */}
      <div className="mt-3 p-3 rounded-xl bg-[#f4f4f2] border border-[#e4e2dc] space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[#1a1c1b]">回放进度</span>
          <span className="font-mono text-[#006d36] font-bold">{progress}%</span>
        </div>

        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          onChange={(e) => setProgress(Number(e.target.value))}
          className="w-full h-1.5 bg-[#d5d5d0] rounded-lg appearance-none cursor-pointer accent-[#1a1c1b]"
        />

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                const next = !isPlaying;
                setIsPlaying(next);
                showToast(next ? '开始动态轨迹回放推演' : '已暂停轨迹回放');
              }}
              className="px-2.5 py-1 rounded-lg bg-[#1a1c1b] hover:bg-black text-white text-xs font-semibold flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? '暂停' : '播放'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setProgress(0);
                showToast('轨迹回放已复位至起点');
              }}
              className="p-1 rounded-lg bg-white border border-[#e4e2dc] text-[#474741] hover:bg-[#ecebe8] cursor-pointer"
              title="复位至起点"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 倍速切换 */}
          <div className="flex items-center gap-1 text-[10px]">
            {[1, 2, 4].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s as any)}
                className={`px-1.5 py-0.5 rounded border font-mono font-bold cursor-pointer ${
                  speed === s
                    ? 'bg-[#1a1c1b] text-white border-[#1a1c1b]'
                    : 'bg-white text-[#474741] border-[#e4e2dc]'
                }`}
              >
                {s}X
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 节点历史快照 */}
      <div className="mt-3 flex-1 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
        <div className="text-[10px] text-[#787770] font-bold">作业路线节点留存</div>
        <div className="p-2 rounded-lg bg-[#f9f9f7] border border-[#e4e2dc] text-[11px] space-y-1">
          <div className="flex justify-between">
            <span className="text-[#787770]">当前模拟时间:</span>
            <span className="font-mono text-[#1a1c1b]">14:35:00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#787770]">累积位移里程:</span>
            <span className="font-mono text-[#006d36] font-bold">14.8 公里</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#787770]">平均巡航时速:</span>
            <span className="font-mono text-[#1a1c1b]">21.4 km/h</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// 4. 区域供需与智能态势分析 (3.6.2 & 3.6.3)
// ----------------------------------------------------------------------
interface RegionalIntelligenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  zones: ZoneMesh[];
  showToast: (msg: string) => void;
}

export const RegionalIntelligenceDrawer: React.FC<RegionalIntelligenceDrawerProps> = ({
  isOpen,
  onClose,
  zones,
  showToast
}) => {
  if (!isOpen) return null;

  return (
    <div className="bg-white/98 backdrop-blur-md border border-[#e4e2dc] shadow-2xl w-96 rounded-2xl p-4 max-h-[85vh] flex flex-col transition-all duration-200 text-[#1a1c1b] animate-in fade-in-50 slide-in-from-right-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#e4e2dc]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#eaf7ee] border border-[#bbf7d0] flex items-center justify-center text-[#006d36]">
            <Activity className="w-4 h-4 text-[#006d36]" />
          </div>
          <div>
            <span className="text-xs font-bold text-[#1a1c1b] tracking-wider">全域供需剪刀差与智能运力分析</span>
            <p className="text-[10px] text-[#787770] font-mono">SUPPLY & DEMAND ANALYTICS</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-lg hover:bg-[#f4f4f2] text-[#787770] hover:text-[#1a1c1b] flex items-center justify-center cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 核心宏观指标 */}
      <div className="grid grid-cols-2 gap-2 my-3">
        <div className="bg-[#f4f4f2] rounded-xl p-2.5 border border-[#e4e2dc]">
          <div className="text-[10px] text-[#787770]">网格服务完整度</div>
          <div className="text-sm font-bold font-mono text-[#006d36] mt-0.5">98.2%</div>
          <div className="text-[9.5px] text-[#787770] mt-0.5">全城核心商圈全覆盖</div>
        </div>
        <div className="bg-[#f4f4f2] rounded-xl p-2.5 border border-[#e4e2dc]">
          <div className="text-[10px] text-[#787770]">运力供需饱和度</div>
          <div className="text-sm font-bold font-mono text-[#d97706] mt-0.5">85.4%</div>
          <div className="text-[9.5px] text-[#787770] mt-0.5">峰值存在轻微缺口</div>
        </div>
      </div>

      {/* 智能诊断预警 */}
      <div className="space-y-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
        <div className="text-[11px] font-bold text-[#1a1c1b]">智能识别供需不平衡区域</div>

        {/* 1. 用户集中但运力不足 */}
        <div className="p-2.5 rounded-xl bg-[#fff5f5] border border-[#fecaca] space-y-1 text-xs">
          <div className="flex items-center justify-between font-bold text-[#ba1a1a]">
            <span>【苏河湾东区】用户聚集但运力偏紧</span>
            <span className="text-[10px] font-mono">缺口约 3 骑手</span>
          </div>
          <p className="text-[11px] text-[#474741] leading-relaxed">
            该片区在线食客达 320 人次，但目前仅有 2 名骑手在途配送，建议启动周边 04号餐车站桩补强。
          </p>
          <button
            type="button"
            onClick={() => showToast('已自动向苏河湾商圈调度加派 2 名在途备用骑手')}
            className="mt-1 px-2 py-1 rounded bg-[#ba1a1a] text-white text-[10px] font-semibold cursor-pointer active:scale-95 transition-all"
          >
            一键调度运力补充
          </button>
        </div>

        {/* 2. 覆盖盲区提示 */}
        <div className="p-2.5 rounded-xl bg-[#fffbeb] border border-[#fef3c7] space-y-1 text-xs">
          <div className="flex items-center justify-between font-bold text-[#d97706]">
            <span>【滨江绿地外滩段】流动服务盲区</span>
            <span className="text-[10px]">盲区半径 2.5km</span>
          </div>
          <p className="text-[11px] text-[#474741] leading-relaxed">
            晚间散步客流聚集，固定门店辐射死角，推荐在 19:00 安排 06号深夜串烧车前往该区域出摊。
          </p>
        </div>

        {/* 3. 各网格饱和度一览 */}
        <div className="pt-2">
          <div className="text-[11px] font-bold text-[#1a1c1b] mb-1.5">三大网格饱和度雷达对比</div>
          <div className="space-y-1.5">
            {zones.map((z) => (
              <div
                key={z.id}
                className="p-2 rounded-xl bg-[#f9f9f7] border border-[#e4e2dc] text-xs flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-[#1a1c1b]">{z.name}</div>
                  <div className="text-[10px] text-[#787770]">
                    餐车 {z.trucksCount} 辆 · 骑手 {z.ridersCount} 人 · 用户 {z.onlineUsersCount}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-[#006d36]">{z.supplySaturationPercent}%</div>
                  <div className="text-[9px] text-[#787770]">饱和度</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// 5. 操作审计日志与数据导出中心 (3.9)
// ----------------------------------------------------------------------
interface AuditExportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  auditLogs: AuditLogItem[];
  orders?: Order[];
  onExportReport: (type: string) => void;
  showToast: (msg: string) => void;
}

export const AuditExportDrawer: React.FC<AuditExportDrawerProps> = ({
  isOpen,
  onClose,
  auditLogs,
  orders = [],
  onExportReport,
  showToast
}) => {
  if (!isOpen) return null;

  return (
    <div className="bg-white/98 backdrop-blur-md border border-[#e4e2dc] shadow-2xl w-96 rounded-2xl p-4 max-h-[85vh] flex flex-col transition-all duration-200 text-[#1a1c1b] animate-in fade-in-50 slide-in-from-right-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#e4e2dc]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#f4f4f2] border border-[#e4e2dc] flex items-center justify-center text-[#1a1c1b]">
            <FileSpreadsheet className="w-4 h-4 text-[#1a1c1b]" />
          </div>
          <div>
            <span className="text-xs font-bold text-[#1a1c1b] tracking-wider">数据报表导出与操作审计</span>
            <p className="text-[10px] text-[#787770] font-mono">AUDIT LOGS & REPORT EXPORT</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-lg hover:bg-[#f4f4f2] text-[#787770] hover:text-[#1a1c1b] flex items-center justify-center cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 一键导出按键 */}
      <div className="mt-3 space-y-2">
        <div className="text-[11px] font-bold text-[#1a1c1b] flex items-center justify-between">
          <span>数据快照一键导出 (CSV 格式)</span>
          <span className="text-[10px] text-[#006d36] font-medium">已对齐腾讯云端数据</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => onExportReport('orders')}
            className="p-2 rounded-xl bg-[#f4f4f2] border border-[#e4e2dc] hover:border-[#1a1c1b] hover:bg-white text-left cursor-pointer transition-all"
          >
            <div className="text-[11px] font-bold text-[#1a1c1b] flex items-center gap-1">
              <Download className="w-3 h-3 text-[#d97706]" />
              <span>云端订单</span>
            </div>
            <div className="text-[9px] text-[#787770] mt-0.5">{orders.length} 笔流水</div>
          </button>
          <button
            type="button"
            onClick={() => onExportReport('general')}
            className="p-2 rounded-xl bg-[#f4f4f2] border border-[#e4e2dc] hover:border-[#1a1c1b] hover:bg-white text-left cursor-pointer transition-all"
          >
            <div className="text-[11px] font-bold text-[#1a1c1b] flex items-center gap-1">
              <Download className="w-3 h-3 text-[#006d36]" />
              <span>运维台账</span>
            </div>
            <div className="text-[9px] text-[#787770] mt-0.5">五大主体全量</div>
          </button>
          <button
            type="button"
            onClick={() => onExportReport('anomalies')}
            className="p-2 rounded-xl bg-[#f4f4f2] border border-[#e4e2dc] hover:border-[#1a1c1b] hover:bg-white text-left cursor-pointer transition-all"
          >
            <div className="text-[11px] font-bold text-[#1a1c1b] flex items-center gap-1">
              <Download className="w-3 h-3 text-[#ba1a1a]" />
              <span>异常处置</span>
            </div>
            <div className="text-[9px] text-[#787770] mt-0.5">闭环处置追踪</div>
          </button>
        </div>
      </div>

      {/* 操作审计日志流 */}
      <div className="mt-3 pt-3 border-t border-[#e4e2dc] flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2">
        <div className="text-[11px] font-bold text-[#1a1c1b] flex items-center justify-between">
          <span>大屏操作审计流水 ({auditLogs.length} 条)</span>
          <span className="text-[10px] text-[#787770]">不可篡改</span>
        </div>

        {auditLogs.map((log) => (
          <div
            key={log.id}
            className="p-2 rounded-lg bg-[#f9f9f7] border border-[#e4e2dc] text-[10.5px] space-y-1"
          >
            <div className="flex items-center justify-between font-medium">
              <span className="text-[#1a1c1b] font-bold">{log.action}</span>
              <span className="font-mono text-[#787770]">{log.time}</span>
            </div>
            <p className="text-[#474741]">{log.details}</p>
            <div className="text-[9.5px] text-[#787770] font-mono">操作人: {log.operator} ({log.role})</div>
          </div>
        ))}
      </div>
    </div>
  );
};
