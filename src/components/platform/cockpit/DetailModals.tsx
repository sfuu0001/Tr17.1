/**
 * 品牌区域运维地图数据大屏 - 五大主体专属详情弹窗交互层
 * 包含：区经理详情、固定门店详情、流动餐车详情、配送骑手详情、网格汇总详情
 */

import React from 'react';
import {
  X,
  Phone,
  Clock,
  Shield,
  MapPin,
  Store,
  Truck,
  Bike,
  Activity,
  AlertTriangle,
  History,
  Download,
  Mic,
  Zap,
  CheckCircle2,
  BatteryCharging,
  Flame,
  UserCheck,
  ChevronRight,
  ExternalLink,
  Layers,
  PenTool,
  BookmarkPlus,
  BookmarkCheck,
  Trash2
} from 'lucide-react';
import {
  ManagerEntity,
  StoreEntity,
  TruckEntity,
  RiderEntity,
  ZoneMesh
} from './cockpitData';

// ----------------------------------------------------------------------
// 1. 区经理详情弹窗
// ----------------------------------------------------------------------
interface ManagerModalProps {
  manager: ManagerEntity;
  onClose: () => void;
  onSelectZone?: (zoneId: string) => void;
  showToast: (msg: string) => void;
}

export const ManagerDetailModal: React.FC<ManagerModalProps> = ({
  manager,
  onClose,
  onSelectZone,
  showToast
}) => {
  const isOnline = manager.status === 'online';

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 transition-all duration-300">
      <div className="bg-white border border-[#e4e2dc] shadow-2xl w-[420px] max-w-[95vw] rounded-2xl p-4 text-[#1a1c1b]">
        {/* 顶部 Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#e4e2dc]">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold shadow-xs ${
                isOnline ? 'bg-[#1a1c1b]' : 'bg-[#ba1a1a]'
              }`}
            >
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#1a1c1b]">{manager.name}</h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#f4f4f2] text-[#474741] border border-[#e4e2dc]">
                  {manager.code}
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    isOnline ? 'bg-[#eaf7ee] text-[#006d36]' : 'bg-[#fee2e2] text-[#ba1a1a]'
                  }`}
                >
                  {isOnline ? '在岗在线' : `离线超限 (${manager.offlineMins}分)`}
                </span>
              </div>
              <p className="text-[11px] text-[#787770] mt-0.5 font-mono">{manager.zoneName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white border border-[#e4e2dc] text-[#787770] hover:text-[#ba1a1a] flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 离线预警横幅 */}
        {!isOnline && (
          <div className="mt-3 p-2.5 rounded-xl bg-[#fff5f5] border border-[#fecaca] text-[11px] text-[#ba1a1a] flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">区域运维异常告警</div>
              <p className="text-[10.5px] text-[#787770] mt-0.5">{manager.abnormalNotes}</p>
            </div>
          </div>
        )}

        {/* 运维网格资产四宫格 */}
        <div className="grid grid-cols-4 gap-2 my-3">
          <div className="bg-[#f4f4f2] rounded-xl p-2 border border-[#e4e2dc] text-center">
            <Store className="w-3.5 h-3.5 mx-auto text-[#1a1c1b]" />
            <div className="text-xs font-bold font-mono text-[#1a1c1b] mt-0.5">{manager.managedStores} 家</div>
            <div className="text-[9px] text-[#787770]">管辖门店</div>
          </div>
          <div className="bg-[#f4f4f2] rounded-xl p-2 border border-[#e4e2dc] text-center">
            <Truck className="w-3.5 h-3.5 mx-auto text-[#006d36]" />
            <div className="text-xs font-bold font-mono text-[#006d36] mt-0.5">{manager.activeTrucks} 辆</div>
            <div className="text-[9px] text-[#787770]">在营餐车</div>
          </div>
          <div className="bg-[#f4f4f2] rounded-xl p-2 border border-[#e4e2dc] text-center">
            <Bike className="w-3.5 h-3.5 mx-auto text-[#1a1c1b]" />
            <div className="text-xs font-bold font-mono text-[#1a1c1b] mt-0.5">{manager.onlineRiders} 人</div>
            <div className="text-[9px] text-[#787770]">在线骑手</div>
          </div>
          <div className="bg-[#f4f4f2] rounded-xl p-2 border border-[#e4e2dc] text-center">
            <Activity className="w-3.5 h-3.5 mx-auto text-[#d97706]" />
            <div className="text-xs font-bold font-mono text-[#d97706] mt-0.5">{manager.todayPatrolCount} 次</div>
            <div className="text-[9px] text-[#787770]">今日巡查</div>
          </div>
        </div>

        {/* 档案属性详情 */}
        <div className="bg-[#f4f4f2] rounded-xl p-2.5 border border-[#e4e2dc] space-y-1.5 text-[11px]">
          <div className="flex justify-between">
            <span className="text-[#787770]">联系电话:</span>
            <span className="font-mono font-medium text-[#1a1c1b]">{manager.phone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#787770]">当前定位地址:</span>
            <span className="font-medium text-[#1a1c1b] truncate max-w-[240px]">{manager.currentAddress}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#787770]">入职档案时间:</span>
            <span className="font-mono text-[#474741]">{manager.entryDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#787770]">最后在线同步:</span>
            <span className="font-mono text-[#006d36] font-medium">{manager.lastOnline}</span>
          </div>
        </div>

        {/* 当日巡查轨迹 */}
        <div className="mt-3">
          <div className="text-[11px] font-bold text-[#1a1c1b] mb-1.5 flex items-center justify-between">
            <span>当日网格巡查轨迹记录 ({manager.patrolPath.length} 处)</span>
            <span className="text-[10px] text-[#787770] font-normal">动态留存</span>
          </div>
          <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
            {manager.patrolPath.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-1.5 rounded-lg bg-[#f9f9f7] border border-[#e4e2dc] text-[10.5px]"
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#006d36]" />
                  <span className="font-medium text-[#1a1c1b]">{item.spotName}</span>
                </div>
                <span className="font-mono text-[#787770]">{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 底部操作条 */}
        <div className="mt-3 pt-2.5 border-t border-[#e4e2dc] flex items-center justify-between">
          <button
            type="button"
            onClick={() => showToast(`已向区经理【${manager.name}】发起即时督导通知`)}
            className="px-2.5 py-1.5 rounded-lg bg-white border border-[#e4e2dc] text-xs font-medium text-[#1a1c1b] hover:bg-[#f4f4f2] flex items-center gap-1 cursor-pointer"
          >
            <Phone className="w-3.5 h-3.5 text-[#006d36]" />
            <span>发起直呼督导</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (onSelectZone) onSelectZone(manager.zoneId);
              showToast(`已穿透查看【${manager.zoneName}】网格全量汇总`);
              onClose();
            }}
            className="px-3 py-1.5 rounded-lg bg-[#1a1c1b] hover:bg-black text-white text-xs font-semibold flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
          >
            <span>穿透网格汇总</span>
            <ChevronRight className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// 2. 固定门店详情弹窗
// ----------------------------------------------------------------------
interface StoreModalProps {
  store: StoreEntity;
  anchorScreenPos?: { x: number; y: number } | null;
  onClose: () => void;
  onSelectManager?: (managerCode: string) => void;
  showToast: (msg: string) => void;
}

export const StoreDetailModal: React.FC<StoreModalProps> = ({
  store,
  anchorScreenPos,
  onClose,
  onSelectManager,
  showToast
}) => {
  const statusLabels: Record<StoreEntity['status'], { label: string; color: string; bg: string }> = {
    open: { label: '正常营业', color: '#006d36', bg: '#eaf7ee' },
    paused: { label: '暂停营业', color: '#d97706', bg: '#fef3c7' },
    renovating: { label: '闭店装修', color: '#2563eb', bg: '#eff6ff' },
    fault: { label: '异常故障', color: '#ba1a1a', bg: '#fee2e2' }
  };
  const st = statusLabels[store.status];

  // 严格紧凑定位在锚点右侧显示，坚决避免居中遮挡地图
  const modalWidth = 360;
  const modalHeight = 490;
  const winW = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const winH = typeof window !== 'undefined' ? window.innerHeight : 800;

  // 默认在锚点右侧 +28px，垂直方向微调
  let isRightAligned = true;
  let leftPos = anchorScreenPos ? anchorScreenPos.x + 28 : winW - modalWidth - 40;
  let topPos = anchorScreenPos ? anchorScreenPos.y - 65 : 90;

  // 视窗边界防溢出保护：若右侧不足以容纳，则智能镜像显示在锚点左侧
  if (anchorScreenPos && leftPos + modalWidth > winW - 16) {
    leftPos = anchorScreenPos.x - modalWidth - 28;
    isRightAligned = false;
  }
  if (leftPos < 16) leftPos = 16;
  if (leftPos + modalWidth > winW - 16) leftPos = winW - modalWidth - 16;

  if (topPos + modalHeight > winH - 20) {
    topPos = Math.max(70, winH - modalHeight - 20);
  }
  if (topPos < 70) topPos = 70;

  return (
    <div
      style={{
        position: 'fixed',
        left: `${leftPos}px`,
        top: `${topPos}px`,
        width: `${modalWidth}px`,
        zIndex: 65
      }}
      className="pointer-events-auto transition-all duration-200 animate-in fade-in slide-in-from-left-3"
    >
      <div className="relative bg-white border border-[#1a1c1b]/15 shadow-2xl rounded-2xl p-4 text-[#1a1c1b]">
        {/* 指向店铺锚点的尖角指示标 */}
        {anchorScreenPos && (
          <div
            className={`hidden sm:block absolute top-7 w-3 h-3 bg-white border-[#1a1c1b]/15 rotate-45 ${
              isRightAligned
                ? '-left-1.5 border-l border-b'
                : '-right-1.5 border-r border-t'
            }`}
            style={{ boxShadow: isRightAligned ? '-2px 2px 4px rgba(0,0,0,0.04)' : '2px -2px 4px rgba(0,0,0,0.04)' }}
          />
        )}

        <div className="flex items-center justify-between pb-2.5 border-b border-[#e4e2dc]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#d97706] text-white flex items-center justify-center font-bold shadow-xs">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold text-[#1a1c1b]">{store.name}</h3>
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1"
                  style={{ color: st.color, backgroundColor: st.bg }}
                >
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: st.color }} />
                  {st.label}
                </span>
              </div>
              <p className="text-[10px] text-[#787770] font-mono">{store.code} · {store.zoneName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 rounded-lg bg-white border border-[#e4e2dc] text-[#787770] hover:text-[#ba1a1a] flex items-center justify-center cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 故障提醒 */}
        {store.faultReason && (
          <div className="mt-2.5 p-2 rounded-xl bg-[#fff5f5] border border-[#fecaca] text-[10.5px] text-[#ba1a1a] flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">设备故障报警提醒</div>
              <p className="text-[10px] text-[#787770] mt-0.5">{store.faultReason}</p>
            </div>
          </div>
        )}

        {/* 营业情况实时指标卡 (营业情况小组件) */}
        <div className="mt-2.5 bg-[#f9f9f7] rounded-xl p-2.5 border border-[#e4e2dc]">
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#e4e2dc]/60">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#1a1c1b]">
              <Activity className="w-3.5 h-3.5 text-[#006d36]" />
              <span>实时营业监测组件</span>
            </div>
            <span className="text-[9px] font-mono text-[#006d36] bg-[#eaf7ee] px-1.5 py-0.5 rounded font-bold">
              出餐峰值正常
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="bg-white rounded-lg p-1.5 border border-[#e4e2dc]/80 shadow-2xs">
              <div className="text-xs font-bold font-mono text-[#1a1c1b]">{store.todayOrders} 单</div>
              <div className="text-[9px] text-[#787770] mt-0.5">今日总单量</div>
            </div>
            <div className="bg-white rounded-lg p-1.5 border border-[#e4e2dc]/80 shadow-2xs">
              <div className="text-xs font-bold font-mono text-[#006d36]">¥{store.revenue.toLocaleString()}</div>
              <div className="text-[9px] text-[#787770] mt-0.5">实收流水</div>
            </div>
            <div className="bg-white rounded-lg p-1.5 border border-[#e4e2dc]/80 shadow-2xs">
              <div className="text-xs font-bold font-mono text-[#1a1c1b]">{store.customerFlow} 人</div>
              <div className="text-[9px] text-[#787770] mt-0.5">客流人次</div>
            </div>
          </div>

          {/* 实时营业负荷条与出餐效能 */}
          <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
            <div className="bg-white rounded-lg p-1.5 border border-[#e4e2dc]/60 flex items-center justify-between">
              <span className="text-[#787770]">平均出餐耗时</span>
              <span className="font-bold text-[#1a1c1b] font-mono">11 分钟</span>
            </div>
            <div className="bg-white rounded-lg p-1.5 border border-[#e4e2dc]/60 flex items-center justify-between">
              <span className="text-[#787770]">在制排队中</span>
              <span className="font-bold text-[#d97706] font-mono">5 单</span>
            </div>
          </div>
        </div>

        {/* 档案属性 */}
        <div className="mt-2.5 bg-[#f4f4f2] rounded-xl p-2 border border-[#e4e2dc] space-y-1 text-[10.5px]">
          <div className="flex justify-between">
            <span className="text-[#787770]">详细地址:</span>
            <span className="font-medium text-[#1a1c1b] truncate max-w-[210px]">{store.address}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#787770]">负责区经理:</span>
            <button
              type="button"
              onClick={() => {
                if (onSelectManager) onSelectManager(store.managerCode);
                showToast(`已跳转负责区经理【${store.managerName}】档案`);
                onClose();
              }}
              className="text-[#006d36] font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{store.managerName} ({store.managerCode})</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </button>
          </div>
          <div className="flex justify-between">
            <span className="text-[#787770]">驻店运力:</span>
            <span className="font-medium text-[#1a1c1b]">
              驻店骑手 {store.stationedRiders} 人 · 在岗员工 {store.onDutyStaff} 人
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#787770]">外送半径:</span>
            <span className="font-mono text-[#006d36] font-bold">{store.serviceRadiusMeters} 米</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#787770]">联系电话:</span>
            <span className="font-mono text-[#474741]">{store.phone}</span>
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-[#e4e2dc] flex items-center justify-between">
          <button
            type="button"
            onClick={() => showToast(`已导出门店【${store.name}】今日流水与出餐审计表`)}
            className="px-2 py-1 rounded-lg bg-white border border-[#e4e2dc] text-[11px] font-medium text-[#1a1c1b] hover:bg-[#f4f4f2] flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3 h-3" />
            <span>导出经营台账</span>
          </button>
          <button
            type="button"
            onClick={() => {
              showToast(`已向门店【${store.name}】发送实时配货与设备自检指令`);
              onClose();
            }}
            className="px-2.5 py-1 rounded-lg bg-[#1a1c1b] hover:bg-black text-white text-[11px] font-semibold cursor-pointer active:scale-95 transition-all"
          >
            下发调度与调拨
          </button>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// 3. 流动餐车详情弹窗 (6大状态完整覆盖)
// ----------------------------------------------------------------------
interface TruckModalProps {
  truck: TruckEntity;
  onClose: () => void;
  onSelectManager?: (managerCode: string) => void;
  onApproveSurge?: (truckId: string) => void;
  showToast: (msg: string) => void;
}

export const TruckDetailModal: React.FC<TruckModalProps> = ({
  truck,
  onClose,
  onSelectManager,
  onApproveSurge,
  showToast
}) => {
  const statusConfig: Record<
    TruckEntity['status'],
    { label: string; color: string; bg: string }
  > = {
    unprepared: { label: '未打样', color: '#787770', bg: '#f4f4f2' },
    prepped: { label: '筹备完成', color: '#2563eb', bg: '#eff6ff' },
    open: { label: '正常营业', color: '#006d36', bg: '#eaf7ee' },
    paused: { label: '暂停营业', color: '#d97706', bg: '#fef3c7' },
    closed: { label: '收摊离岗', color: '#474741', bg: '#ecebe8' },
    fault: { label: '故障异常', color: '#ba1a1a', bg: '#fee2e2' }
  };
  const sc = statusConfig[truck.status];

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 transition-all duration-300">
      <div className="bg-white border border-[#e4e2dc] shadow-2xl w-[440px] max-w-[95vw] rounded-2xl p-4 text-[#1a1c1b]">
        {/* 顶部 Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#e4e2dc]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1a1c1b] text-white flex items-center justify-center font-bold shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#1a1c1b]">{truck.name}</h3>
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{ color: sc.color, backgroundColor: sc.bg }}
                >
                  {sc.label}
                </span>
              </div>
              <p className="text-[11px] text-[#787770] mt-0.5 font-mono">{truck.code} · {truck.zoneName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white border border-[#e4e2dc] text-[#787770] hover:text-[#ba1a1a] flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 排队超限预警条 */}
        {truck.pendingQueue > 10 && (
          <div className="mt-3 p-2.5 rounded-xl bg-[#fff5f5] border border-[#fecaca] text-[11px] text-[#ba1a1a] flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-bold">积压订单达 {truck.pendingQueue} 单 (排队超限)</span>
            </div>
            <span className="text-[10px] text-[#787770]">建议一键削峰分流</span>
          </div>
        )}

        {/* 硬件与出餐三卡片 */}
        <div className="grid grid-cols-3 gap-2 my-3">
          <div className="bg-[#f4f4f2] rounded-xl p-2 border border-[#e4e2dc] text-center">
            <Flame className="w-3.5 h-3.5 mx-auto text-[#d97706]" />
            <div className="text-xs font-bold font-mono text-[#1a1c1b] mt-0.5">{truck.stoveTemp}</div>
            <div className="text-[9px] text-[#787770]">炉温实时</div>
          </div>
          <div className="bg-[#f4f4f2] rounded-xl p-2 border border-[#e4e2dc] text-center">
            <Clock className="w-3.5 h-3.5 mx-auto text-[#006d36]" />
            <div className="text-xs font-bold font-mono text-[#006d36] mt-0.5">{truck.todayOrders} 单</div>
            <div className="text-[9px] text-[#787770]">今日接单</div>
          </div>
          <div className="bg-[#f4f4f2] rounded-xl p-2 border border-[#e4e2dc] text-center">
            <BatteryCharging className="w-3.5 h-3.5 mx-auto text-[#006d36]" />
            <div className="text-xs font-bold font-mono text-[#1a1c1b] mt-0.5">{truck.batteryPercent}%</div>
            <div className="text-[9px] text-[#787770]">车载蓄能</div>
          </div>
        </div>

        {/* 属性与业务指标 */}
        <div className="bg-[#f4f4f2] rounded-xl p-2.5 border border-[#e4e2dc] space-y-1.5 text-[11px]">
          <div className="flex justify-between">
            <span className="text-[#787770]">今日出摊时长:</span>
            <span className="font-mono font-medium text-[#1a1c1b]">{truck.dutyHoursToday} 小时</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#787770]">实时覆盖用户:</span>
            <span className="font-mono text-[#006d36] font-bold">{truck.coveredUsers} 位 (方圆 {truck.coverageRadiusMeters}m)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#787770]">归属区经理:</span>
            <button
              type="button"
              onClick={() => {
                if (onSelectManager) onSelectManager(truck.managerCode);
                showToast(`已跳转负责区经理【${truck.managerName}】`);
                onClose();
              }}
              className="text-[#006d36] font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{truck.managerName}</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
          <div className="flex justify-between">
            <span className="text-[#787770]">随车对讲热线:</span>
            <span className="font-mono text-[#474741]">{truck.phone}</span>
          </div>
        </div>

        {/* 状态变更日志 */}
        <div className="mt-3">
          <div className="text-[11px] font-bold text-[#1a1c1b] mb-1.5 flex items-center justify-between">
            <span>全业务状态变更流与日志</span>
            <span className="text-[10px] text-[#787770] font-mono">10Hz MESH 同步</span>
          </div>
          <div className="space-y-1 max-h-20 overflow-y-auto pr-1">
            {truck.statusLogs.map((lg, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-1.5 rounded-lg bg-[#f9f9f7] border border-[#e4e2dc] text-[10px]"
              >
                <span>{lg.time} 由【{lg.oldStatus}】变更为【{lg.newStatus}】</span>
                <span className="text-[#787770] font-mono">{lg.operator}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 底部操作条 */}
        <div className="mt-3 pt-2.5 border-t border-[#e4e2dc] flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => showToast(`已建立与【${truck.name}】车内对讲连线`)}
              className="w-8 h-8 rounded-lg bg-white border border-[#e4e2dc] text-[#474741] hover:bg-[#f4f4f2] flex items-center justify-center cursor-pointer"
              title="车载直连对讲"
            >
              <Mic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => showToast(`已载入【${truck.name}】今日历史巡航与出摊轨迹`)}
              className="w-8 h-8 rounded-lg bg-white border border-[#e4e2dc] text-[#474741] hover:bg-[#f4f4f2] flex items-center justify-center cursor-pointer"
              title="历史轨迹回放"
            >
              <History className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              if (onApproveSurge) onApproveSurge(truck.id);
              showToast(`已下发一键削峰调度指令，已向邻近在途骑手推送分流加补通知`);
              onClose();
            }}
            className="px-3 py-1.5 rounded-lg bg-[#1a1c1b] hover:bg-black text-white text-xs font-semibold flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
          >
            <Zap className="w-3.5 h-3.5 text-white" />
            <span>一键削峰调度核准</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// 4. 配送骑手详情弹窗 (进行中订单全轨迹)
// ----------------------------------------------------------------------
interface RiderModalProps {
  rider: RiderEntity;
  onClose: () => void;
  showToast: (msg: string) => void;
}

export const RiderDetailModal: React.FC<RiderModalProps> = ({
  rider,
  onClose,
  showToast
}) => {
  const statusConfig: Record<
    RiderEntity['status'],
    { label: string; color: string; bg: string }
  > = {
    online: { label: '在岗在线', color: '#006d36', bg: '#eaf7ee' },
    resting: { label: '休息中', color: '#d97706', bg: '#fef3c7' },
    offline: { label: '离线离岗', color: '#787770', bg: '#f4f4f2' }
  };
  const sc = statusConfig[rider.status];

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 transition-all duration-300">
      <div className="bg-white border border-[#e4e2dc] shadow-2xl w-[440px] max-w-[95vw] rounded-2xl p-4 text-[#1a1c1b]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#e4e2dc]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#006d36] text-white flex items-center justify-center font-bold shadow-xs">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#1a1c1b]">{rider.name}</h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#f4f4f2] text-[#474741] border border-[#e4e2dc]">
                  {rider.code}
                </span>
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{ color: sc.color, backgroundColor: sc.bg }}
                >
                  {sc.label}
                </span>
              </div>
              <p className="text-[11px] text-[#787770] mt-0.5 font-mono">{rider.stationName} · {rider.zoneName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white border border-[#e4e2dc] text-[#787770] hover:text-[#ba1a1a] flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 履约四格数据 */}
        <div className="grid grid-cols-4 gap-2 my-3">
          <div className="bg-[#f4f4f2] rounded-xl p-2 border border-[#e4e2dc] text-center">
            <div className="text-xs font-bold font-mono text-[#1a1c1b]">{rider.todayCompleted} 单</div>
            <div className="text-[9px] text-[#787770]">今日完成</div>
          </div>
          <div className="bg-[#f4f4f2] rounded-xl p-2 border border-[#e4e2dc] text-center">
            <div className="text-xs font-bold font-mono text-[#006d36]">{rider.speedKmh} km/h</div>
            <div className="text-[9px] text-[#787770]">实时时速</div>
          </div>
          <div className="bg-[#f4f4f2] rounded-xl p-2 border border-[#e4e2dc] text-center">
            <div className="text-xs font-bold font-mono text-[#d97706]">{rider.rating} 分</div>
            <div className="text-[9px] text-[#787770]">配送评分</div>
          </div>
          <div className="bg-[#f4f4f2] rounded-xl p-2 border border-[#e4e2dc] text-center">
            <div className={`text-xs font-bold font-mono ${rider.timeoutCount > 0 ? 'text-[#ba1a1a]' : 'text-[#006d36]'}`}>
              {rider.timeoutCount} 单
            </div>
            <div className="text-[9px] text-[#787770]">超时单数</div>
          </div>
        </div>

        {/* 进行中订单列表与配送路线 */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-[#1a1c1b] flex items-center justify-between">
            <span>进行中专送订单全轨迹 ({rider.activeOrders.length} 笔)</span>
            <span className="text-[10px] text-[#006d36] font-mono">动态路由推演</span>
          </div>

          {rider.activeOrders.length === 0 ? (
            <div className="p-3 text-center text-xs text-[#787770] bg-[#f4f4f2] rounded-xl border border-[#e4e2dc]">
              当前暂无在途配送订单，骑手处于空闲待命状态
            </div>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {rider.activeOrders.map((ord) => (
                <div
                  key={ord.orderNo}
                  className={`p-2.5 rounded-xl border text-[11px] ${
                    ord.status === 'timeout_risk'
                      ? 'bg-[#fff5f5] border-[#fecaca]'
                      : 'bg-[#f9f9f7] border-[#e4e2dc]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[#1a1c1b]">#{ord.orderNo}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        ord.status === 'timeout_risk'
                          ? 'bg-[#fee2e2] text-[#ba1a1a]'
                          : ord.status === 'arriving'
                          ? 'bg-[#fef3c7] text-[#d97706]'
                          : 'bg-[#eaf7ee] text-[#006d36]'
                      }`}
                    >
                      {ord.status === 'timeout_risk'
                        ? '超时预警'
                        : ord.status === 'arriving'
                        ? '即将送达'
                        : '配送中'}
                    </span>
                  </div>
                  <div className="mt-1.5 space-y-1 text-[#474741]">
                    <div className="flex items-center gap-1 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#006d36]" />
                      <span className="text-[#787770]">取餐:</span>
                      <span className="truncate">{ord.pickupAddress}</span>
                    </div>
                    <div className="flex items-center gap-1 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ba1a1a]" />
                      <span className="text-[#787770]">送达:</span>
                      <span className="truncate font-medium text-[#1a1c1b]">{ord.dropoffAddress}</span>
                    </div>
                  </div>
                  <div className="mt-1.5 pt-1.5 border-t border-[#e4e2dc] flex items-center justify-between text-[10px]">
                    <span className="font-mono text-[#006d36] font-bold">¥{ord.amount.toFixed(2)}</span>
                    <span className="font-mono text-[#787770]">
                      预计剩余 <strong className="text-[#ba1a1a]">{ord.remainingMins}</strong> 分钟送达
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="mt-3 pt-2.5 border-t border-[#e4e2dc] flex items-center justify-between">
          <button
            type="button"
            onClick={() => showToast(`已呼叫骑手【${rider.name}】(${rider.phone})`)}
            className="px-2.5 py-1.5 rounded-lg bg-white border border-[#e4e2dc] text-xs font-medium text-[#1a1c1b] hover:bg-[#f4f4f2] flex items-center gap-1 cursor-pointer"
          >
            <Phone className="w-3.5 h-3.5 text-[#006d36]" />
            <span>呼叫骑手</span>
          </button>
          <button
            type="button"
            onClick={() => {
              showToast(`已在沙盘高亮展示骑手【${rider.name}】当前配送路线`);
              onClose();
            }}
            className="px-3 py-1.5 rounded-lg bg-[#1a1c1b] hover:bg-black text-white text-xs font-semibold cursor-pointer active:scale-95 transition-all"
          >
            高亮聚焦路线
          </button>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// 5. 网格汇总穿透详情弹窗 (Grid Rollup Summary)
// ----------------------------------------------------------------------
interface ZoneModalProps {
  zone: ZoneMesh;
  onClose: () => void;
  onEditZoneBoundary?: (zoneId: string) => void;
  showToast: (msg: string) => void;
}

export const ZoneDetailModal: React.FC<ZoneModalProps> = ({
  zone,
  onClose,
  onEditZoneBoundary,
  showToast
}) => {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 transition-all duration-300">
      <div className="bg-white border border-[#e4e2dc] shadow-2xl w-[440px] max-w-[95vw] rounded-2xl p-4 text-[#1a1c1b]">
        <div className="flex items-center justify-between pb-3 border-b border-[#e4e2dc]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1a1c1b] text-white flex items-center justify-center font-bold shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#1a1c1b]">{zone.name}</h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#f4f4f2] text-[#474741] border border-[#e4e2dc]">
                  {zone.code}
                </span>
              </div>
              <p className="text-[11px] text-[#787770] mt-0.5">管辖总监: {zone.managerName} ({zone.managerCode})</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white border border-[#e4e2dc] text-[#787770] hover:text-[#ba1a1a] flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 网格覆盖与运力饱和度条 */}
        <div className="grid grid-cols-2 gap-2 my-3">
          <div className="bg-[#f4f4f2] rounded-xl p-2.5 border border-[#e4e2dc]">
            <div className="flex items-center justify-between text-xs font-bold text-[#1a1c1b]">
              <span>网格覆盖率</span>
              <span className="text-[#006d36] font-mono">{zone.coverageRatePercent}%</span>
            </div>
            <div className="w-full bg-[#d5d5d0] h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-[#006d36] h-full rounded-full"
                style={{ width: `${zone.coverageRatePercent}%` }}
              />
            </div>
          </div>
          <div className="bg-[#f4f4f2] rounded-xl p-2.5 border border-[#e4e2dc]">
            <div className="flex items-center justify-between text-xs font-bold text-[#1a1c1b]">
              <span>运力饱和度</span>
              <span className="text-[#d97706] font-mono">{zone.supplySaturationPercent}%</span>
            </div>
            <div className="w-full bg-[#d5d5d0] h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-[#d97706] h-full rounded-full"
                style={{ width: `${zone.supplySaturationPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* 区域资产汇总 */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="bg-[#f4f4f2] rounded-xl p-2 border border-[#e4e2dc] text-center">
            <Store className="w-3.5 h-3.5 mx-auto text-[#1a1c1b]" />
            <div className="text-xs font-bold font-mono text-[#1a1c1b] mt-0.5">{zone.storesCount} 家</div>
            <div className="text-[9px] text-[#787770]">门店</div>
          </div>
          <div className="bg-[#f4f4f2] rounded-xl p-2 border border-[#e4e2dc] text-center">
            <Truck className="w-3.5 h-3.5 mx-auto text-[#006d36]" />
            <div className="text-xs font-bold font-mono text-[#006d36] mt-0.5">{zone.trucksCount} 辆</div>
            <div className="text-[9px] text-[#787770]">餐车</div>
          </div>
          <div className="bg-[#f4f4f2] rounded-xl p-2 border border-[#e4e2dc] text-center">
            <Bike className="w-3.5 h-3.5 mx-auto text-[#1a1c1b]" />
            <div className="text-xs font-bold font-mono text-[#1a1c1b] mt-0.5">{zone.ridersCount} 人</div>
            <div className="text-[9px] text-[#787770]">骑手</div>
          </div>
          <div className="bg-[#f4f4f2] rounded-xl p-2 border border-[#e4e2dc] text-center">
            <UserCheck className="w-3.5 h-3.5 mx-auto text-[#2563eb]" />
            <div className="text-xs font-bold font-mono text-[#2563eb] mt-0.5">{zone.onlineUsersCount} 人</div>
            <div className="text-[9px] text-[#787770]">在线用户</div>
          </div>
        </div>

        <p className="text-[11px] text-[#474741] p-2.5 rounded-xl bg-[#f4f4f2] border border-[#e4e2dc] leading-relaxed">
          {zone.description}
        </p>

        {/* 街区与多边形钢笔重绘边界入口 */}
        <div className="mt-2.5">
          <button
            type="button"
            onClick={() => {
              if (onEditZoneBoundary) onEditZoneBoundary(zone.id);
              onClose();
            }}
            className="w-full py-2 px-3 rounded-xl bg-[#1a1c1b] hover:bg-black text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98"
          >
            <PenTool className="w-3.5 h-3.5 text-amber-400" />
            <span>使用钢笔工具重绘/修改本网格街区边界</span>
          </button>
        </div>

        <div className="mt-3 pt-2.5 border-t border-[#e4e2dc] flex items-center justify-between">
          <button
            type="button"
            onClick={() => showToast(`已导出【${zone.name}】全量业务审计报表`)}
            className="px-2.5 py-1.5 rounded-lg bg-white border border-[#e4e2dc] text-xs font-medium text-[#1a1c1b] hover:bg-[#f4f4f2] flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>导出网格全量报表</span>
          </button>
          <button
            type="button"
            onClick={() => {
              showToast(`已下发【${zone.name}】网格动态运力再平衡建议`);
              onClose();
            }}
            className="px-3 py-1.5 rounded-lg bg-[#1a1c1b] hover:bg-black text-white text-xs font-semibold cursor-pointer active:scale-95 transition-all"
          >
            调度运力平衡
          </button>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// 6. 竞争对手情报详情弹窗 (紧凑吸附于锚点右侧，支持入库与删除标记)
// ----------------------------------------------------------------------
export interface CompetitorDetailModalProps {
  competitor: {
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
  };
  anchorScreenPos?: { x: number; y: number } | null;
  onClose: () => void;
  onToggleArchive: (id: string) => void;
  onDelete: (id: string) => void;
  showToast: (msg: string) => void;
}

export const CompetitorDetailModal: React.FC<CompetitorDetailModalProps> = ({
  competitor,
  anchorScreenPos,
  onClose,
  onToggleArchive,
  onDelete,
  showToast
}) => {
  const modalWidth = 330;
  const modalHeight = 360;
  const winW = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const winH = typeof window !== 'undefined' ? window.innerHeight : 800;

  // 严格贴在锚点右侧显示，若右侧空间不足则贴在锚点左侧
  let isRightAligned = true;
  let leftPos = anchorScreenPos ? anchorScreenPos.x + 24 : winW - modalWidth - 40;
  let topPos = anchorScreenPos ? anchorScreenPos.y - 50 : 100;

  if (anchorScreenPos && leftPos + modalWidth > winW - 16) {
    leftPos = anchorScreenPos.x - modalWidth - 24;
    isRightAligned = false;
  }
  if (leftPos < 16) leftPos = 16;
  if (leftPos + modalWidth > winW - 16) leftPos = winW - modalWidth - 16;

  if (topPos + modalHeight > winH - 20) {
    topPos = Math.max(70, winH - modalHeight - 20);
  }
  if (topPos < 70) topPos = 70;

  const threatConfig = {
    high: { label: '高威胁对手', color: '#ffffff', bg: '#1a1c1b', badge: 'bg-black text-white' },
    medium: { label: '中威胁对手', color: '#1a1c1b', bg: '#e4e2dc', badge: 'bg-neutral-200 text-neutral-800' },
    low: { label: '关注中', color: '#787770', bg: '#f4f4f2', badge: 'bg-neutral-100 text-neutral-600' }
  }[competitor.threatLevel];

  return (
    <div
      style={{
        position: 'fixed',
        left: `${leftPos}px`,
        top: `${topPos}px`,
        width: `${modalWidth}px`,
        zIndex: 65
      }}
      className="pointer-events-auto transition-all duration-200 animate-in fade-in slide-in-from-left-3"
    >
      <div className="relative bg-white border border-[#1a1c1b]/20 shadow-2xl rounded-2xl p-4 text-[#1a1c1b]">
        {/* 指向锚点的尖角指示标 */}
        {anchorScreenPos && (
          <div
            className={`hidden sm:block absolute top-6 w-3 h-3 bg-white border-[#1a1c1b]/20 rotate-45 ${
              isRightAligned ? '-left-1.5 border-l border-b' : '-right-1.5 border-r border-t'
            }`}
            style={{ boxShadow: isRightAligned ? '-2px 2px 4px rgba(0,0,0,0.04)' : '2px -2px 4px rgba(0,0,0,0.04)' }}
          />
        )}

        <div className="flex items-center justify-between pb-2 border-b border-[#e4e2dc]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#1a1c1b] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              ✕
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold text-[#1a1c1b]">{competitor.name}</h3>
                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${threatConfig.badge}`}>
                  {threatConfig.label}
                </span>
              </div>
              <p className="text-[10px] text-[#787770]">{competitor.category} · {competitor.zoneName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 rounded-lg bg-white border border-[#e4e2dc] text-[#787770] hover:text-[#ba1a1a] flex items-center justify-center cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 状态徽章 */}
        <div className="my-2.5 flex items-center justify-between bg-[#f4f4f2] p-2 rounded-xl text-[11px]">
          <span className="text-[#787770]">知识库入库状态:</span>
          {competitor.isArchived ? (
            <span className="font-bold text-[#006d36] flex items-center gap-1">
              <BookmarkCheck className="w-3.5 h-3.5" />
              <span>已入库存档 ({competitor.archivedAt?.slice(5) || '已入库'})</span>
            </span>
          ) : (
            <span className="font-medium text-[#787770] flex items-center gap-1">
              <BookmarkPlus className="w-3.5 h-3.5 text-[#474741]" />
              <span>待入库 (现场标记)</span>
            </span>
          )}
        </div>

        {/* 策略与情报详情 */}
        <div className="bg-[#f9f9f7] rounded-xl p-2.5 border border-[#e4e2dc] space-y-1.5 text-[11px]">
          <div>
            <span className="text-[#787770] block text-[10px]">应对与防御策略</span>
            <p className="text-[#1a1c1b] font-medium leading-relaxed mt-0.5">{competitor.strategy}</p>
          </div>
          <div className="pt-1.5 border-t border-[#e4e2dc]/60 flex items-center justify-between text-[10px] text-[#787770]">
            <span>巡查时间: {competitor.auditTime}</span>
            <span>坐标: ({competitor.coords.x}, {competitor.coords.y})</span>
          </div>
        </div>

        {/* 核心操作按钮：入库与删除标记 */}
        <div className="mt-3 pt-2.5 border-t border-[#e4e2dc] flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleArchive(competitor.id)}
            className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-98 ${
              competitor.isArchived
                ? 'bg-white border border-[#e4e2dc] text-[#474741] hover:bg-[#f4f4f2]'
                : 'bg-[#006d36] hover:bg-[#00572b] text-white'
            }`}
          >
            {competitor.isArchived ? (
              <>
                <BookmarkCheck className="w-3.5 h-3.5 text-[#006d36]" />
                <span>移出知识库</span>
              </>
            ) : (
              <>
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>入库知识库</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              onDelete(competitor.id);
              onClose();
            }}
            className="py-1.5 px-3 rounded-xl bg-white border border-[#ba1a1a]/30 text-[#ba1a1a] hover:bg-[#fff5f5] text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-98"
            title="从地图与列表中彻底移除此点位"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>删除标记</span>
          </button>
        </div>
      </div>
    </div>
  );
};
