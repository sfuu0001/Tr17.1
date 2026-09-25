/**
 * Urban Radar 骑手端 - 智能路线并单与多楼宇梯控导航 HUD & 极速履约超时倒计时沙漏 (Smart Route & Floor Elevator HUD)
 * 包含：CBD写字楼梯控及外卖柜专属指引、多单并单路顺拓扑、SLA红黄绿倒计时沙漏、一键提前呼叫食客
 */

import React, { useState } from 'react';
import {
  Navigation,
  Clock,
  Building2,
  Phone,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Compass,
  Layers,
  Sparkles,
  Zap,
  ChevronRight,
  DoorOpen
} from 'lucide-react';
import { ActiveDeliveryOrder } from '../../types';

interface RiderSmartRouteElevatorHUDProps {
  activeOrders: ActiveDeliveryOrder[];
  onAdvanceOrderStatus: (orderId: string, targetStatus?: string) => void;
  showToast: (msg: string) => void;
}

interface BuildingElevatorGuide {
  buildingName: string;
  lobbyRules: string;
  elevatorAdvice: string;
  lockerNumber: string;
  securityCode: string;
  peakHourTip: string;
}

const CBD_BUILDING_GUIDES: Record<string, BuildingElevatorGuide> = {
  '大悦城商务座': {
    buildingName: '静安大悦城 · 商务座写字楼 (T1)',
    lobbyRules: '1层大堂需在前台右侧自助访客机刷身份证或展示订单条码取二维码凭条',
    elevatorAdvice: '1~15层乘坐低区 1-4 号客梯；16层以上请乘坐高区 5-8 号客梯；高峰期建议走后侧 9 号直达货梯',
    lockerNumber: 'B1 停车场北出入口旁 1~4 号丰巢专柜',
    securityCode: '访客临时通行码: #8821*',
    peakHourTip: '11:45~12:40 期间低区客梯排队超 10 分钟，建议提前 3 分钟电话通知食客下楼自提'
  },
  '恒隆广场': {
    buildingName: '静安恒隆广场 · 办公楼二期',
    lobbyRules: '外卖专职骑手需走西门员工通道，严格佩戴安全头盔与反光背心登记',
    elevatorAdvice: '全楼层需使用消防专用 12 号梯，凭电子登记卡刷卡选层',
    lockerNumber: '西门员工通道入口处 120 门保温恒温外卖柜',
    securityCode: '保安台签到专属口令: 【黑曜石专送】',
    peakHourTip: '楼内禁止骑行平衡车或跑步，请轻声步行'
  }
};

export const RiderSmartRouteElevatorHUD: React.FC<RiderSmartRouteElevatorHUDProps> = ({
  activeOrders,
  onAdvanceOrderStatus,
  showToast
}) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string>(activeOrders[0]?.id || '');
  const [callingState, setCallingState] = useState<string | null>(null);

  const selectedOrder = activeOrders.find((o) => o.id === selectedOrderId) || activeOrders[0];

  // 匹配写字楼梯控指南
  const matchedGuide = selectedOrder?.deliveryAddress?.includes('大悦城')
    ? CBD_BUILDING_GUIDES['大悦城商务座']
    : CBD_BUILDING_GUIDES['恒隆广场'];

  // 提前呼叫食客
  const handlePreCallCustomer = (order: ActiveDeliveryOrder) => {
    setCallingState(order.id);
    showToast(`正在通过隐私虚拟中间号呼叫食客【${order.customerName}】(${order.customerPhone})，已提示即将抵达楼下！`);
    setTimeout(() => {
      setCallingState(null);
    }, 2500);
  };

  return (
    <div className="space-y-4">
      {/* 顶部 SLA 履约紧急度倒计时沙漏 (SLA Countdown & At-Risk Radar) */}
      <div className="bg-white border border-[#e3e2e0] rounded-xl p-4 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-bold text-[#1a1a17]">
              极速履约 SLA 倒计时沙漏 (At-Risk SLA Radar)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[#787774]">
            当前挂载: {activeOrders.length} 笔在途单
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {activeOrders.map((order, idx) => {
            const eta = order.etaMinutes ?? 8;
            const isCritical = eta <= 5;
            const isWarning = eta > 5 && eta <= 10;
            const isSelected = selectedOrder?.id === order.id;

            return (
              <div
                key={order.id}
                onClick={() => setSelectedOrderId(order.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-purple-500 bg-purple-50/50 shadow-xs'
                    : 'border-[#e8e7e4] bg-[#fafafa] hover:bg-[#f5f4f0]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-black text-white text-[10px] font-bold font-mono flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <span className="font-mono text-xs font-bold text-[#1a1a17]">
                      {order.orderNo}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                      isCritical
                        ? 'bg-red-500 text-white animate-pulse'
                        : isWarning
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    剩余 {eta} 分钟
                  </span>
                </div>

                <div className="my-2">
                  <div className="text-xs font-bold text-[#201f1d] truncate">
                    {order.deliveryAddress}
                  </div>
                  <div className="text-[11px] text-[#787774] flex items-center justify-between mt-0.5">
                    <span>{order.customerName}</span>
                    <span className="font-mono font-bold text-emerald-700">
                      赏金 ¥{(order.courierEarnings || 12).toFixed(1)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#ebeae7] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreCallCustomer(order);
                    }}
                    className="px-2 py-1 rounded bg-white hover:bg-stone-50 border border-[#d3d1cb] text-[10px] font-bold text-[#37352f] flex items-center gap-1 cursor-pointer"
                  >
                    <Phone className="w-3 h-3 text-purple-600" />
                    <span>{callingState === order.id ? '呼叫中...' : '提前2分钟报备'}</span>
                  </button>

                  <span className="text-[10px] text-purple-700 font-bold flex items-center">
                    查看写字楼指南 <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CBD 写字楼梯控与外卖柜专属指引 HUD */}
      {selectedOrder && matchedGuide && (
        <div className="bg-white border border-[#e3e2e0] rounded-xl p-4 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#f1f1ef]">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1a1a17]">
                  {matchedGuide.buildingName}
                </h3>
                <p className="text-xs text-[#787774]">
                  专送高阶梯控与通行指引 · 订单 {selectedOrder.orderNo}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-stone-100 text-stone-800 border border-stone-200">
                {matchedGuide.securityCode}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* 梯控建议 */}
            <div className="bg-[#fcfbfa] p-3.5 rounded-xl border border-[#ecebe8] space-y-2">
              <div className="flex items-center gap-2 text-stone-900 font-bold">
                <DoorOpen className="w-4 h-4 text-purple-600" />
                <span>电梯高低区分流与通行指南</span>
              </div>
              <p className="text-[#5a5854] leading-relaxed">
                {matchedGuide.elevatorAdvice}
              </p>
              <div className="pt-2 border-t border-[#f0efec] text-[11px] text-amber-800 font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>{matchedGuide.peakHourTip}</span>
              </div>
            </div>

            {/* 大堂前台与外卖柜 */}
            <div className="bg-[#fcfbfa] p-3.5 rounded-xl border border-[#ecebe8] space-y-2">
              <div className="flex items-center gap-2 text-stone-900 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>大堂门禁规则与外卖恒温柜点位</span>
              </div>
              <p className="text-[#5a5854] leading-relaxed">
                {matchedGuide.lobbyRules}
              </p>
              <div className="pt-2 border-t border-[#f0efec] text-[11px] text-emerald-800 font-medium">
                📍 推荐暂存点：{matchedGuide.lockerNumber}
              </div>
            </div>
          </div>

          {/* 最佳路顺拓扑链条 */}
          <div className="bg-stone-900 text-white p-3.5 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold flex items-center gap-1.5 text-emerald-400">
                <Compass className="w-4 h-4" />
                <span>AI 时间最优并单推荐派送顺序</span>
              </span>
              <span className="text-[10px] text-stone-400 font-mono">
                预计总里程 1.4km · 预估用时 11 分钟
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs overflow-x-auto py-1">
              <span className="px-2.5 py-1 rounded bg-stone-800 border border-stone-700 font-mono text-emerald-300 shrink-0">
                1. 黑曜石01餐车 (取2单)
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-stone-500 shrink-0" />
              <span className="px-2.5 py-1 rounded bg-purple-900/60 border border-purple-500/50 font-mono text-purple-200 shrink-0 font-bold">
                2. 大悦城商务座 1204室 (先送UR-98215)
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-stone-500 shrink-0" />
              <span className="px-2.5 py-1 rounded bg-stone-800 border border-stone-700 font-mono text-stone-300 shrink-0">
                3. 大悦城商务座 502室 (顺路送UR-9804)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
