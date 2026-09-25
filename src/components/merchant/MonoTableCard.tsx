import React, { useState } from 'react';
import {
  Users,
  Clock,
  QrCode,
  Ban,
  ReceiptText,
  ArrowRightLeft,
  Plus,
  Zap,
  CheckCircle2,
  Copy,
  UtensilsCrossed,
  ChevronRight,
  Barcode,
  Sparkles,
  ChefHat,
  ChevronDown,
  ChevronUp,
  UserCheck
} from 'lucide-react';
import { TableItem, Order } from '../../types';
import { businessTransactionEngine } from '../../utils/businessTransactionEngine';
import { TableCardSynergyMonitor } from './table/TableCardSynergyMonitor';
import { TableCardSynergyFooterAction } from './table/TableCardSynergyFooterAction';
import { TableSynergyHeaderPill } from './table/TableSynergyHeaderPill';

export interface MonoTableCardProps {
  tbl: TableItem;
  orderNo: string;
  matchedDineInOrder?: Order;
  selectedTableForDetail: TableItem | null;
  setSelectedTableForDetail: (tbl: TableItem | null) => void;
  handleOpenModal: (tbl: TableItem) => void;
  handleBillModal: (tbl: TableItem) => void;
  handleTransferModal: (tbl: TableItem) => void;
  handleVoidOrderModal: (tbl: TableItem) => void;
  handleCleanComplete: (tbl: TableItem) => void;
  setIsBatchPrintModalOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
  waitingQueue: any[];
  autoTransferOnClean?: boolean;
  showToast: (msg: string) => void;
  setActiveSynergySession: (sess: any) => void;
  onUpdateTable?: (tbl: TableItem) => void;
  onOpenTable?: (tableId: string, guests: number, server: string) => void;
}

export const MonoTableCard: React.FC<MonoTableCardProps> = ({
  tbl,
  orderNo,
  matchedDineInOrder,
  selectedTableForDetail,
  setSelectedTableForDetail,
  handleOpenModal,
  handleBillModal,
  handleTransferModal,
  handleVoidOrderModal,
  handleCleanComplete,
  setIsBatchPrintModalOpen,
  waitingQueue,
  autoTransferOnClean,
  showToast,
  setActiveSynergySession,
  onUpdateTable,
  onOpenTable
}) => {
  const [showAllDishes, setShowAllDishes] = useState(false);

  const isEffectiveDining = tbl.status === 'dining' || Boolean(matchedDineInOrder);
  const isDining = isEffectiveDining;
  const isIdle = tbl.status === 'idle' && !matchedDineInOrder;
  const isCleaning = tbl.status === 'cleaning';
  const isReserved = tbl.status === 'reserved';

  const orderItems =
    tbl.orderItems && tbl.orderItems.length > 0
      ? tbl.orderItems
      : (matchedDineInOrder?.items
          ? matchedDineInOrder.items.map((it, idx) => ({
              dishId: it.dishId || `dish-${idx}`,
              name: it.name,
              price: it.price,
              quantity: it.quantity,
              kitchenStation: 'charcoal' as const,
              serveStatus:
                matchedDineInOrder.stepIndex && matchedDineInOrder.stepIndex >= 3
                  ? ('served' as const)
                  : ('cooking' as const)
            }))
          : []);

  const totalDishes = orderItems.reduce((acc, cur) => acc + cur.quantity, 0);
  const servedDishes = orderItems.filter((d) => d.serveStatus === 'served').reduce((acc, cur) => acc + cur.quantity, 0);
  const servePercent = totalDishes > 0 ? Math.round((servedDishes / totalDishes) * 100) : 0;
  const hasUrged = orderItems.some((d) => d.serveStatus === 'urged');

  const tableForDetail: TableItem = {
    ...tbl,
    status: isEffectiveDining ? 'dining' : tbl.status,
    orderNo,
    orderItems,
    currentGuests: tbl.currentGuests || (matchedDineInOrder ? 2 : tbl.capacity)
  };

  const isCurrentlyActiveInSidePanel = selectedTableForDetail?.id === tbl.id;
  const displayedItems = showAllDishes ? orderItems : orderItems.slice(0, 3);

  return (
    <div
      data-purpose={`mono-table-card-${tbl.code}`}
      onClick={() => {
        if (isDining) {
          setSelectedTableForDetail(tableForDetail);
          if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            setTimeout(() => {
              document.getElementById('pip-dish-progress-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 120);
          }
        } else if (isIdle) {
          handleOpenModal(tbl);
        }
      }}
      className={`group relative rounded-lg border transition-all duration-200 overflow-hidden cursor-pointer select-none bg-white text-neutral-900 flex flex-col justify-between shadow-xs ${
        isCurrentlyActiveInSidePanel
          ? 'ring-2 ring-neutral-900 border-neutral-900 shadow-[0_0_20px_rgba(0,0,0,0.12)]'
          : isDining
          ? 'border-neutral-300 hover:border-neutral-800 hover:shadow-md'
          : isIdle
          ? 'border-neutral-200 hover:border-neutral-400 hover:shadow-xs'
          : isCleaning
          ? 'border-neutral-200 hover:border-neutral-400 hover:shadow-xs'
          : 'border-dashed border-neutral-300 hover:border-neutral-500'
      }`}
    >
      {/* 顶部单色状态装饰条 */}
      <div className={`h-1 w-full ${
        isDining ? 'bg-neutral-900' : isIdle ? 'bg-neutral-200' : isCleaning ? 'bg-neutral-400' : 'bg-neutral-300'
      }`} />

      {/* 主体内容区 —— 白底黑字，清晰外露 */}
      <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-2.5">
          {/* 1. 卡片头部：桌号(反差黑底白字)、名称、协同药丸、状态胶囊、快捷工具 */}
          <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-neutral-200">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="font-mono font-black text-sm px-2 py-0.5 bg-neutral-900 text-white rounded-md tracking-tight shrink-0 shadow-xs">
                {tbl.code}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-xs text-neutral-900 truncate">{tbl.name}</h4>
                  <TableSynergyHeaderPill tableCode={tbl.code} />
                </div>
                <p className="text-[10.5px] text-neutral-500 font-mono truncate">
                  {tbl.capacity}人位 · {tbl.zone || '餐车外摆区'}
                </p>
              </div>
            </div>

            {/* 状态徽标与快捷图标组 */}
            <div className="flex items-center gap-1 shrink-0">
              {/* 二维码立牌查看/打印按钮 */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsBatchPrintModalOpen(true);
                }}
                className="p-1 hover:bg-neutral-100 rounded text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
                title={`查看/打印 ${tbl.code} 桌台二维码`}
              >
                <QrCode className="w-3.5 h-3.5" />
              </button>

              {/* 订单作废/取消预订快捷按钮 */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleVoidOrderModal(tableForDetail);
                }}
                className="p-1 hover:bg-rose-50 rounded text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer"
                title={`作废/撤销 ${tbl.code} 订单记录`}
              >
                <Ban className="w-3.5 h-3.5" />
              </button>

              {/* 状态胶囊 */}
              {isDining && (
                <span className="bg-neutral-900 text-white font-bold text-[10.5px] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs font-mono whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <span>就餐 {tbl.elapsedMinutes || 12}m</span>
                </span>
              )}
              {isIdle && (
                <span className="border border-neutral-200 bg-neutral-100 text-neutral-700 font-medium text-[10.5px] px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                  <span>空闲</span>
                </span>
              )}
              {isCleaning && (
                <span className="border border-neutral-300 bg-neutral-100 text-neutral-800 font-mono font-medium text-[10.5px] px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap">
                  <span>▨ 保洁 {tbl.elapsedMinutes}m</span>
                </span>
              )}
              {isReserved && (
                <span className="border border-dashed border-neutral-300 bg-neutral-50 text-neutral-700 font-mono text-[10.5px] px-2 py-0.5 rounded-full whitespace-nowrap">
                  ◌ 已预订
                </span>
              )}
            </div>
          </div>

          {/* 2. 堂食匹配订单条（若有） */}
          {matchedDineInOrder && (
            <div className="flex items-center justify-between gap-1.5 bg-amber-50/80 px-2.5 py-1.5 rounded border border-amber-200 text-[11px] text-amber-900">
              <div className="flex items-center gap-1.5 min-w-0">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 animate-pulse" />
                <span className="truncate">
                  堂食匹配: <strong className="font-mono">#{matchedDineInOrder.orderNo.replace(/^#/, '')}</strong>
                </span>
              </div>
              <span className="font-mono font-bold text-amber-950 shrink-0">
                ¥{matchedDineInOrder.totalAmount.toFixed(2)}
              </span>
            </div>
          )}

          {/* 3. 就餐态详细信息：订单号、客数/服务员、出餐全览、协同监控 */}
          {isDining && (
            <div className="space-y-2">
              {/* 订单编号与一键复制 */}
              <div className="flex items-center justify-between gap-1.5 bg-neutral-50 px-2.5 py-1.5 rounded border border-neutral-200 text-[11px]">
                <span className="text-neutral-500 font-medium flex items-center gap-1.5 shrink-0">
                  <Barcode className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                  <span>单号:</span>
                </span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-mono font-bold text-neutral-900 tracking-tight truncate max-w-[130px] sm:max-w-[160px]" title={orderNo}>
                    {orderNo}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      try {
                        navigator.clipboard.writeText(orderNo);
                        showToast(`已复制单号: ${orderNo}`);
                      } catch {
                        showToast(`单号: ${orderNo}`);
                      }
                    }}
                    className="p-1 hover:bg-neutral-200 rounded text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer shrink-0"
                    title="复制单号"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* 客数与服务员元数据 */}
              <div className="flex items-center justify-between text-[11px] text-neutral-500 px-0.5">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-neutral-600" />
                  <span>客数: <strong className="text-neutral-900 font-mono">{tbl.currentGuests || 2}/{tbl.capacity}人</strong></span>
                </span>
                <span className="truncate" title={tbl.serverName || '小林 (No.04)'}>
                  服务: <span className="text-neutral-800 font-medium">{tbl.serverName || '小林 (No.04)'}</span>
                </span>
              </div>

              {/* 出餐制作与上菜进展明细（全息展示，绝不隐藏） */}
              {orderItems.length > 0 && (
                <div className="bg-neutral-50 p-2.5 rounded border border-neutral-200 space-y-2">
                  <div className="flex items-center justify-between text-[10.5px]">
                    <span className="flex items-center gap-1 text-neutral-600 font-medium">
                      <ChefHat className="w-3.5 h-3.5 text-neutral-600" />
                      <span>出餐制作进度:</span>
                    </span>
                    <span className="font-mono font-bold text-neutral-900">
                      已上 {servedDishes}/{totalDishes} 件 ({servePercent}%)
                    </span>
                  </div>

                  {/* 进度条 */}
                  <div className="h-1.5 w-full bg-neutral-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        servePercent === 100
                          ? 'bg-neutral-900'
                          : hasUrged
                          ? 'bg-rose-600 animate-pulse'
                          : 'bg-neutral-700'
                      }`}
                      style={{ width: `${servePercent}%` }}
                    />
                  </div>

                  {/* 菜品列表行（支持完整查看） */}
                  <div className="space-y-1 pt-1 border-t border-neutral-200">
                    {displayedItems.map((item, idx) => {
                      const isItemServed = item.serveStatus === 'served';
                      const isItemUrged = item.serveStatus === 'urged';
                      return (
                        <div key={idx} className="flex items-center justify-between text-[11px] gap-1.5">
                          <span className="text-neutral-800 truncate flex-1" title={item.name}>
                            {item.name}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="font-mono text-neutral-500 text-[10.5px]">x{item.quantity}</span>
                            {isItemServed ? (
                              <span className="text-[9.5px] font-medium px-1.5 py-0.2 rounded bg-neutral-200 text-neutral-800 border border-neutral-300 whitespace-nowrap">
                                ✓ 已上
                              </span>
                            ) : isItemUrged ? (
                              <span className="text-[9.5px] font-medium px-1.5 py-0.2 rounded bg-neutral-900 text-white border border-neutral-900 font-bold animate-pulse whitespace-nowrap">
                                催单中
                              </span>
                            ) : (
                              <span className="text-[9.5px] font-medium px-1.5 py-0.2 rounded bg-white text-neutral-600 border border-neutral-200 whitespace-nowrap">
                                烹饪中
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {orderItems.length > 3 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAllDishes(!showAllDishes);
                        }}
                        className="w-full pt-1 text-[10px] text-neutral-500 hover:text-neutral-900 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        {showAllDishes ? (
                          <>
                            <span>收起菜品</span>
                            <ChevronUp className="w-3 h-3" />
                          </>
                        ) : (
                          <>
                            <span>另有 {orderItems.length - 3} 道菜品 (展开查看)</span>
                            <ChevronDown className="w-3 h-3" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* 协同双向监管组件（扫码授权待批、多人员在线状态与行为轨迹） */}
              <TableCardSynergyMonitor
                tableCode={tbl.code}
                tableId={tbl.id}
                isDining={isDining}
                showToast={showToast}
                onOpenSynergyDrawer={(sess) => setActiveSynergySession(sess)}
              />

              {/* 查看画中画流转详情跳转按钮 */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTableForDetail(tableForDetail);
                  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                    setTimeout(() => {
                      document.getElementById('pip-dish-progress-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 120);
                  }
                }}
                className="w-full py-1.5 px-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 hover:text-neutral-900 rounded border border-neutral-200 hover:border-neutral-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <UtensilsCrossed className="w-3.5 h-3.5 text-neutral-600" />
                <span>菜品制作流转与催菜台</span>
                <ChevronRight className="w-3 h-3 text-neutral-500" />
              </button>

              {/* 消费合计 */}
              <div className="flex items-center justify-between pt-1 border-t border-neutral-200">
                <span className="text-[11px] text-neutral-500">消费合计:</span>
                <span className="font-mono font-black text-sm sm:text-base text-neutral-900">
                  ¥{(tbl.totalAmount || matchedDineInOrder?.totalAmount || 0).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* 4. 空闲态卡片内容 */}
          {isIdle && (
            <div className="py-6 px-3 text-center space-y-1.5 bg-neutral-50 rounded border border-neutral-200">
              <p className="text-xs font-semibold text-neutral-800">标准 {tbl.capacity} 人位 · 台位就绪</p>
              <p className="text-[11px] text-neutral-500">扫码点餐码已激活，随时可开台</p>
            </div>
          )}

          {/* 5. 保洁态卡片内容 */}
          {isCleaning && (
            <div className="py-6 px-3 text-center space-y-1.5 bg-neutral-50 rounded border border-neutral-200">
              <p className="text-xs font-semibold text-neutral-800 flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5 text-neutral-600" />
                <span>保洁清台进行中 ({tbl.elapsedMinutes}m)</span>
              </p>
              <p className="text-[11px] text-neutral-500 font-mono">
                负责人: {tbl.serverName || '流动保洁专员'}
              </p>
            </div>
          )}

          {/* 6. 预订态卡片内容 */}
          {isReserved && tbl.reservation && (
            <div className="p-3 space-y-1.5 bg-neutral-50 rounded border border-neutral-200 text-[11px]">
              <div className="flex items-center justify-between text-neutral-900 font-semibold">
                <span>宾客: {tbl.reservation.guestName}</span>
                <span className="text-[10px] font-mono bg-neutral-900 text-white px-1.5 py-0.2 rounded font-bold">
                  {tbl.reservation.countdownMinutes}m后到店
                </span>
              </div>
              <p className="text-neutral-600 font-mono">预约到店: {tbl.reservation.timeText}</p>
              <p className="text-neutral-600 font-mono">联系电话: {tbl.reservation.phone}</p>
            </div>
          )}
        </div>

        {/* 7. 底部常态快捷操作栏（反差黑底主按键与精致辅键） */}
        <div className="pt-2.5 border-t border-neutral-200 mt-2">
          {isDining && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleBillModal(tbl);
                }}
                className="flex-1 py-1.5 px-2 bg-neutral-900 hover:bg-black text-white rounded font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:translate-y-0.5 shadow-[0_2px_0_#404040] active:shadow-none"
              >
                <ReceiptText className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>立即结账 / 清台</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTransferModal(tbl);
                }}
                className="py-1.5 px-2 bg-white hover:bg-neutral-100 text-neutral-700 hover:text-neutral-900 border border-neutral-200 rounded text-xs font-medium flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs"
                title="换桌"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>换桌</span>
              </button>

              <TableCardSynergyFooterAction
                tableCode={tbl.code}
                onOpenSynergyDrawer={(sess) => setActiveSynergySession(sess)}
              />

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleVoidOrderModal(tableForDetail);
                }}
                className="p-1.5 bg-white hover:bg-rose-50 text-neutral-400 hover:text-rose-600 border border-neutral-200 hover:border-rose-200 rounded cursor-pointer transition-colors shadow-2xs"
                title="作废订单"
              >
                <Ban className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {isIdle && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenModal(tbl);
                }}
                className="flex-1 py-1.5 px-2 bg-neutral-900 hover:bg-black text-white rounded font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:translate-y-0.5 shadow-[0_2px_0_#404040] active:shadow-none"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>开台点餐</span>
              </button>

              {waitingQueue.filter((w) => w.status === 'waiting').length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const targetWait = waitingQueue.find((w) => w.status === 'waiting');
                    if (targetWait) {
                      const res = businessTransactionEngine.executeMatchQueueToTable({
                        queueItemId: targetWait.id,
                        tableId: tbl.id,
                        guestCount: targetWait.guests,
                        showToast
                      });
                      if (res.success && res.table) {
                        onUpdateTable?.(res.table);
                      }
                    }
                  }}
                  className="py-1.5 px-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 rounded text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  title="撮合排队首位顾客入座"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500 fill-current" />
                  <span>撮合</span>
                </button>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleVoidOrderModal(tableForDetail);
                }}
                className="p-1.5 bg-white hover:bg-rose-50 text-neutral-400 hover:text-rose-600 border border-neutral-200 hover:border-rose-200 rounded cursor-pointer transition-colors shadow-2xs"
                title="作废/重置此台位"
              >
                <Ban className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {isCleaning && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCleanComplete(tbl);
                }}
                className="flex-1 py-1.5 px-2 bg-neutral-900 hover:bg-black text-white rounded font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:translate-y-0.5 shadow-[0_2px_0_#404040] active:shadow-none"
              >
                <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>
                  保洁完毕
                  {waitingQueue.filter((w) => w.status === 'waiting').length > 0
                    ? autoTransferOnClean
                      ? ' (自动转客)'
                      : ' (转客)'
                    : ''}
                </span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleVoidOrderModal(tableForDetail);
                }}
                className="p-1.5 bg-white hover:bg-rose-50 text-neutral-400 hover:text-rose-600 border border-neutral-200 hover:border-rose-200 rounded cursor-pointer transition-colors shadow-2xs"
                title="强制作废单据并归位"
              >
                <Ban className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {isReserved && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenTable) {
                    onOpenTable(tbl.id, tbl.currentGuests || 4, '小林 (No.04)');
                    showToast(`预约宾客已入座，桌台 ${tbl.code} 成功开台！`);
                  } else {
                    handleOpenModal(tbl);
                  }
                }}
                className="flex-1 py-1.5 px-2 bg-neutral-900 hover:bg-black text-white rounded font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:translate-y-0.5 shadow-[0_2px_0_#404040] active:shadow-none"
              >
                <UserCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>入座开台</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleVoidOrderModal(tableForDetail);
                }}
                className="p-1.5 bg-white hover:bg-rose-50 text-neutral-400 hover:text-rose-600 border border-neutral-200 hover:border-rose-200 rounded cursor-pointer transition-colors shadow-2xs"
                title="作废/取消预约"
              >
                <Ban className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
