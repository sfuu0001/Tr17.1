import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  ReceiptText,
  Clock,
  Users,
  ChefHat,
  Flame,
  CheckCircle2,
  AlertCircle,
  Copy,
  Printer,
  BellRing,
  Sparkles,
  UtensilsCrossed,
  Layers,
  ChevronRight,
  ShieldCheck,
  Plus,
  RefreshCw,
  Info,
  Ban
} from 'lucide-react';
import { TableItem, TableDishItem, TableFlowNode, TableFlowStage } from '../../types';
import { voiceAlerts, speakText } from '../../utils/voiceAlertEngine';
import { businessTransactionEngine } from '../../utils/businessTransactionEngine';

interface TableDishProgressViewProps {
  table: TableItem;
  onBack: () => void;
  onUpdateTable: (updatedTable: TableItem) => void;
  onOpenBillModal?: (table: TableItem) => void;
  onVoidOrder?: (table: TableItem) => void;
  showToast: (msg: string, detail?: string) => void;
  isEmbedded?: boolean;
}

const DEFAULT_FLOW_NODES: { key: TableFlowStage; title: string; desc: string }[] = [
  { key: 'placed', title: '扫码开台下单', desc: '宾客扫码或前台代开台成功' },
  { key: 'kitchen_accepted', title: '后厨接单排产', desc: '各档口后厨接单备料' },
  { key: 'cooking', title: '核心菜品炙烤', desc: '高温炭火与炉灶现制烹饪' },
  { key: 'serving', title: '陆续出餐上桌', desc: '各档口出餐，服务员传菜到位' },
  { key: 'all_served', title: '餐品全部齐备', desc: '全单菜品核对齐备，客享美味' },
  { key: 'completed', title: '结账清台就绪', desc: '用餐完毕结账，保洁翻台' }
];

export const TableDishProgressView: React.FC<TableDishProgressViewProps> = ({
  table,
  onBack,
  onUpdateTable,
  onOpenBillModal,
  onVoidOrder,
  showToast,
  isEmbedded = false
}) => {
  const [copiedOrderNo, setCopiedOrderNo] = useState(false);
  const [activeTab, setActiveTab] = useState<'dishes' | 'flow' | 'kds_log'>('dishes');
  const [filterStation, setFilterStation] = useState<string>('all');

  // Ensure table has orderNo
  const orderNo = table.orderNo || `UR-DIN-${table.code}-${table.elapsedMinutes || '01'}`;

  // Ensure orderItems exists
  const dishes: TableDishItem[] = table.orderItems || [];

  // Compute serving stats
  const totalDishCount = dishes.reduce((acc, cur) => acc + cur.quantity, 0);
  const servedDishCount = dishes.filter((d) => d.serveStatus === 'served').reduce((acc, cur) => acc + cur.quantity, 0);
  const cookingDishCount = dishes.filter((d) => d.serveStatus === 'cooking' || !d.serveStatus).reduce((acc, cur) => acc + cur.quantity, 0);
  const urgedDishCount = dishes.filter((d) => d.serveStatus === 'urged').reduce((acc, cur) => acc + cur.quantity, 0);

  // Initialize or fallback flow nodes
  const flowNodes: TableFlowNode[] = table.flowNodes && table.flowNodes.length > 0
    ? table.flowNodes
    : DEFAULT_FLOW_NODES.map((n, i) => {
        let status: 'completed' | 'current' | 'pending' = 'pending';
        if (i === 0) status = 'completed';
        else if (i === 1) status = 'completed';
        else if (i === 2 && (table.elapsedMinutes || 0) > 10) status = 'completed';
        else if (i === 3) status = 'current';
        return {
          id: `fn-${i}`,
          nodeKey: n.key,
          title: n.title,
          description: n.desc,
          status,
          time: i < 3 ? `${12}:${20 + i * 5}` : undefined,
          operator: i === 0 ? '宾客' : '后厨'
        };
      });

  const handleCopyOrderNo = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(orderNo);
      setCopiedOrderNo(true);
      showToast(`订单号已复制: ${orderNo}`);
      setTimeout(() => setCopiedOrderNo(false), 2000);
    } catch {
      showToast(`订单号: ${orderNo}`);
    }
  };

  // Toggle or cycle dish serving status
  const handleToggleDishStatus = (dishIndex: number) => {
    const updatedDishes = [...dishes];
    const current = updatedDishes[dishIndex].serveStatus || 'cooking';
    let nextStatus: TableDishItem['serveStatus'] = 'served';
    let nextProgress = 100;
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    if (current === 'served') {
      nextStatus = 'cooking';
      nextProgress = 70;
    } else if (current === 'cooking' || current === 'preparing' || current === 'ready_to_serve') {
      nextStatus = 'served';
      nextProgress = 100;
    } else if (current === 'urged') {
      nextStatus = 'served';
      nextProgress = 100;
    }

    updatedDishes[dishIndex] = {
      ...updatedDishes[dishIndex],
      serveStatus: nextStatus,
      prepProgress: nextProgress,
      serveTime: nextStatus === 'served' ? timeStr : undefined
    };

    // Check if all dishes are served
    const allServed = updatedDishes.every((d) => d.serveStatus === 'served');
    let nextPhase = table.tablePhase || 'serving';
    let nextNodes = [...flowNodes];

    if (allServed) {
      nextPhase = 'all_served';
      nextNodes = nextNodes.map((n) => {
        if (n.nodeKey === 'serving' || n.nodeKey === 'all_served') {
          return { ...n, status: 'completed', time: n.time || timeStr };
        }
        return n;
      });
      speakText(`${table.code}桌菜品已全部上齐，请慢用！`, { persona: 'sweet_frontdesk', rate: 1.05 });
      showToast(`桌台 ${table.code} 菜品已全部出齐上桌！`, '后厨状态与前台同步完成');
    } else {
      showToast(`已更新「${updatedDishes[dishIndex].name}」状态为 ${nextStatus === 'served' ? '已上桌' : '烹饪中'}`);
    }

    onUpdateTable({
      ...table,
      orderItems: updatedDishes,
      tablePhase: nextPhase,
      flowNodes: nextNodes
    });
  };

  // Urge a specific dish
  const handleUrgeDish = (dishIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedDishes = [...dishes];
    const dish = updatedDishes[dishIndex];
    if (dish.serveStatus === 'served') {
      showToast(`该菜品「${dish.name}」已上桌，无需催单`);
      return;
    }

    updatedDishes[dishIndex] = {
      ...dish,
      serveStatus: 'urged',
      prepProgress: Math.max(dish.prepProgress || 50, 90)
    };

    onUpdateTable({
      ...table,
      orderItems: updatedDishes
    });

    // 跨组件联动事务：向 KDS 后厨派发工单加急、置顶与语音播报
    businessTransactionEngine.executeUrgeOrderOrDish({
      tableCode: table.code,
      orderNo,
      dishName: dish.name,
      showToast: (msg) => showToast(msg, `桌台 ${table.code} 实时催菜`)
    });
  };

  // Urge entire table
  const handleUrgeEntireTable = () => {
    const hasUnserved = dishes.some((d) => d.serveStatus !== 'served');
    if (!hasUnserved) {
      showToast(`桌台 ${table.code} 菜品已全部上齐，无需催单`);
      return;
    }

    const updatedDishes = dishes.map((d) => {
      if (d.serveStatus !== 'served') {
        return { ...d, serveStatus: 'urged' as const, prepProgress: Math.max(d.prepProgress || 50, 90) };
      }
      return d;
    });

    onUpdateTable({
      ...table,
      orderItems: updatedDishes
    });

    businessTransactionEngine.executeUrgeOrderOrDish({
      tableCode: table.code,
      orderNo,
      showToast: (msg) => showToast(msg, `桌台 ${table.code} 全桌催单`)
    });
  };

  // Mark all dishes as served
  const handleMarkAllServed = () => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const updatedDishes = dishes.map((d) => ({
      ...d,
      serveStatus: 'served' as const,
      prepProgress: 100,
      serveTime: d.serveTime || timeStr
    }));

    const nextNodes = flowNodes.map((n) => {
      if (n.nodeKey === 'serving' || n.nodeKey === 'all_served') {
        return { ...n, status: 'completed' as const, time: n.time || timeStr };
      }
      return n;
    });

    onUpdateTable({
      ...table,
      orderItems: updatedDishes,
      tablePhase: 'all_served',
      flowNodes: nextNodes
    });

    speakText(`${table.code}桌菜品已全部上齐，祝您用餐愉快！`, { persona: 'sweet_frontdesk' });
    showToast(`桌台 ${table.code} 全单菜品已全部标为已上齐！`);
  };

  // Advance flow node
  const handleAdvanceFlowNode = (nodeKey: TableFlowStage) => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const targetIdx = flowNodes.findIndex((n) => n.nodeKey === nodeKey);
    if (targetIdx === -1) return;

    const updatedNodes = flowNodes.map((n, i) => {
      if (i <= targetIdx) {
        return { ...n, status: 'completed' as const, time: n.time || timeStr };
      }
      if (i === targetIdx + 1) {
        return { ...n, status: 'current' as const };
      }
      return { ...n, status: 'pending' as const };
    });

    onUpdateTable({
      ...table,
      tablePhase: nodeKey,
      flowNodes: updatedNodes
    });

    showToast(`流转节点已更新为: ${flowNodes[targetIdx].title}`);
  };

  // Filter stations
  const stations = ['all', ...Array.from(new Set(dishes.map((d) => d.station).filter(Boolean) as string[]))];
  const filteredDishes = filterStation === 'all'
    ? dishes
    : dishes.filter((d) => d.station === filterStation);

  return (
    <div className={`bg-neutral-100/50 ${isEmbedded ? 'h-full flex-1' : 'min-h-[82vh] rounded-[3px] border border-neutral-200'} flex flex-col font-sans text-xs overflow-hidden`}>
      {/* Top Header Bar (Fixed at top) */}
      <div className={`bg-white border-b border-neutral-200 ${isEmbedded ? 'p-2.5' : 'p-3 sm:p-4'} flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0 z-20 shadow-2xs`}>
        <div className="flex items-center gap-2 min-w-0">
          {!isEmbedded && (
            <button
              type="button"
              onClick={onBack}
              className="p-1.5 hover:bg-neutral-100 rounded-[3px] text-neutral-700 transition-colors cursor-pointer border border-neutral-200 shrink-0"
              title="返回桌台大厅"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-black text-xs sm:text-sm px-2 py-0.5 bg-neutral-900 text-white rounded-[3px] shrink-0 leading-none">
                {table.code}
              </span>
              <h2 className="text-xs sm:text-sm font-black text-neutral-900 tracking-tight truncate">
                {table.name}
              </h2>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-[2px] bg-neutral-100 text-neutral-600 border border-neutral-200 shrink-0">
                {table.zoneLabel}
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-[2px] bg-neutral-100 text-neutral-700 border border-neutral-200 flex items-center gap-1 shrink-0">
                <Users className="w-2.5 h-2.5" />
                <span>{table.currentGuests || table.capacity}人</span>
              </span>
            </div>

            {/* Order No Pill & Meta */}
            <div className="flex items-center gap-1.5 mt-1 text-[10.5px] text-neutral-500 flex-wrap">
              <span className="font-medium shrink-0">单号:</span>
              <div
                onClick={handleCopyOrderNo}
                className="font-bold text-neutral-900 bg-neutral-100 hover:bg-neutral-200 px-1.5 py-0.2 rounded-[2px] border border-neutral-200 flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                title="点击复制订单号"
              >
                <span className="truncate max-w-[130px] sm:max-w-none">{orderNo}</span>
                <Copy className="w-2.5 h-2.5 text-neutral-400 shrink-0" />
                {copiedOrderNo && <span className="text-[9px] text-neutral-900 font-bold">已复制</span>}
              </div>

              <span className="text-neutral-300">|</span>
              <span className="flex items-center gap-1 shrink-0">
                <Clock className="w-2.5 h-2.5 text-neutral-400" />
                <span>开台 {table.elapsedMinutes || 0}m</span>
              </span>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 self-end sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={handleUrgeEntireTable}
            className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-neutral-900 rounded-[3px] font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs whitespace-nowrap"
            title="向后厨下发全桌加急催菜指令"
          >
            <Flame className="w-3.5 h-3.5 text-neutral-900 shrink-0" />
            <span className="hidden sm:inline">全桌加急催菜</span>
            <span className="inline sm:hidden text-[11px]">催全桌</span>
          </button>

          <button
            type="button"
            onClick={() => {
              speakText(`当前${table.code}桌，共${dishes.length}项菜品，已出餐${servedDishCount}道，烹饪中${cookingDishCount}道。`, { persona: 'steady_male' });
              showToast(`已播报桌台 ${table.code} 菜品状态`);
            }}
            className="px-2.5 py-1.5 bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-700 rounded-[3px] font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            title="语音播报出餐进度"
          >
            <BellRing className="w-3.5 h-3.5 text-neutral-600" />
            <span className="hidden md:inline">语音状态播报</span>
            <span className="inline md:hidden text-[11px]">播报</span>
          </button>

          {onVoidOrder && (
            <button
              type="button"
              onClick={() => onVoidOrder(table)}
              className="px-2.5 py-1.5 bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-700 rounded-[3px] font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap shadow-2xs"
              title="作废此桌订单并释放台位"
            >
              <Ban className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
              <span>作废本单</span>
            </button>
          )}

          {onOpenBillModal && (
            <button
              type="button"
              onClick={() => onOpenBillModal(table)}
              className="px-3 sm:px-3.5 py-1.5 bg-neutral-900 hover:bg-black text-white rounded-[3px] font-black text-xs flex items-center gap-1 cursor-pointer transition-all shadow-[0_2px_0_#404040] active:translate-y-0.5 active:shadow-none whitespace-nowrap"
            >
              <ReceiptText className="w-3.5 h-3.5 shrink-0" />
              <span>结账 (¥{(table.totalAmount || 0).toFixed(2)})</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-3.5 sm:space-y-4 touch-pan-y custom-scrollbar">
        {/* Overview Stats Bar */}
        <div className={`grid ${isEmbedded ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'} gap-2`}>
          <div className="bg-white p-2.5 rounded-[3px] border border-neutral-200 shadow-2xs flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-[10.5px] text-neutral-500 font-medium block truncate">点单菜品总数</span>
              <span className="font-black text-xs sm:text-sm text-neutral-900 block mt-0.5 truncate">
                {dishes.length} 项 ({totalDishCount} 件)
              </span>
            </div>
            <UtensilsCrossed className="w-4 h-4 text-neutral-400 shrink-0 ml-1" />
          </div>

          <div className="bg-white p-2.5 rounded-[3px] border border-neutral-200 shadow-2xs flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-[10.5px] text-neutral-500 font-medium block truncate">已出餐上桌</span>
              <span className="font-black text-xs sm:text-sm text-neutral-900 block mt-0.5 truncate">
                {servedDishCount} / {totalDishCount} 件
              </span>
            </div>
            <CheckCircle2 className="w-4 h-4 text-neutral-900 shrink-0 ml-1" />
          </div>

          <div className="bg-white p-2.5 rounded-[3px] border border-neutral-200 shadow-2xs flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-[10.5px] text-neutral-500 font-medium block truncate">炉火制作中</span>
              <span className="font-black text-xs sm:text-sm text-neutral-900 block mt-0.5 truncate">
                {cookingDishCount} 件
              </span>
            </div>
            <Flame className="w-4 h-4 text-neutral-600 shrink-0 ml-1" />
          </div>

          <div className="bg-white p-2.5 rounded-[3px] border border-neutral-200 shadow-2xs flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-[10.5px] text-neutral-500 font-medium block truncate">加急催菜项</span>
              <span className="font-black text-xs sm:text-sm text-neutral-900 block mt-0.5 truncate">
                {urgedDishCount} 件
              </span>
            </div>
            <AlertCircle className={`w-4 h-4 text-neutral-700 shrink-0 ml-1 ${urgedDishCount > 0 ? 'animate-bounce' : ''}`} />
          </div>
        </div>

        {/* Section: Status Flow Nodes */}
        <div className="bg-white rounded-[3px] border border-neutral-200 p-3 sm:p-3.5 shadow-2xs">
          <div className="flex items-center justify-between mb-2.5 flex-wrap gap-1.5">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-neutral-900" />
              <h3 className="font-black text-xs text-neutral-900">堂食履约流转阶段</h3>
            </div>
            <span className="text-[10px] font-bold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-[2px] border border-neutral-200">
              当前: {flowNodes.find((n) => n.status === 'current')?.title || '出餐上桌中'}
            </span>
          </div>

          {/* Stepper Grid */}
          <div className={`grid ${isEmbedded ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-6'} gap-2`}>
            {flowNodes.map((node, idx) => {
              const isDone = node.status === 'completed';
              const isCurrent = node.status === 'current';
              const isPending = node.status === 'pending';

              let cardBg = 'bg-neutral-50 border-neutral-200 text-neutral-600';
              let badgeColor = 'bg-neutral-200 text-neutral-600';

              if (isDone) {
                cardBg = 'bg-white border-neutral-300 text-neutral-900';
                badgeColor = 'bg-neutral-900 text-white font-bold';
              } else if (isCurrent) {
                cardBg = 'bg-white border-neutral-900 ring-2 ring-neutral-900/10 shadow-xs text-neutral-900';
                badgeColor = 'bg-neutral-900 text-white font-black animate-pulse';
              }

              return (
                <div
                  key={node.id || idx}
                  onClick={() => handleAdvanceFlowNode(node.nodeKey)}
                  className={`p-2 sm:p-2.5 rounded-[3px] border ${cardBg} flex flex-col justify-between transition-all cursor-pointer hover:border-neutral-900 group min-h-[72px]`}
                  title="点击切换为此流转节点"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded-[2px] ${badgeColor}`}>
                        阶段 {idx + 1}
                      </span>
                      {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-neutral-900 shrink-0" />}
                      {isCurrent && <span className="w-2 h-2 rounded-full bg-neutral-900 animate-ping shrink-0" />}
                    </div>

                    <h4 className="font-bold text-xs mt-1 group-hover:text-neutral-900 truncate">
                      {node.title}
                    </h4>
                    <p className="text-[10px] leading-snug text-neutral-500 line-clamp-2">
                      {node.description}
                    </p>
                  </div>

                  <div className="pt-1.5 mt-1.5 border-t border-neutral-100 flex items-center justify-between text-[9.5px] text-neutral-400">
                    <span>{node.time || '--:--'}</span>
                    <span className="font-bold text-neutral-600">{isDone ? '已核验' : isCurrent ? '进行中' : '待流转'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section: Dishes Preparation & Serving Status */}
        <div className="bg-white rounded-[3px] border border-neutral-200 overflow-hidden shadow-2xs">
          {/* List Header & Station Filter */}
          <div className="p-3 border-b border-neutral-200 flex items-center justify-between gap-2 flex-wrap bg-neutral-50">
            <div className="flex items-center gap-2">
              <ChefHat className="w-4 h-4 text-neutral-900" />
              <h3 className="font-black text-xs text-neutral-900">
                菜品出餐与上桌清单 ({dishes.length}道菜品)
              </h3>
            </div>

            {/* Station Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full">
              <span className="text-[11px] text-neutral-500 font-bold shrink-0">档口:</span>
              {stations.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStation(st)}
                  className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                    filterStation === st
                      ? 'bg-neutral-900 text-white'
                      : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  {st === 'all' ? '全部档口' : st}
                </button>
              ))}
            </div>
          </div>

          {/* Dishes List */}
          <div className="divide-y divide-neutral-100">
            {filteredDishes.length === 0 ? (
              <div className="p-8 text-center text-neutral-400 space-y-2">
                <UtensilsCrossed className="w-8 h-8 mx-auto text-neutral-300" />
                <p>暂无符合筛选档口的菜品</p>
              </div>
            ) : (
              filteredDishes.map((dish, idx) => {
                const originalIndex = dishes.findIndex((d) => d.name === dish.name && d.price === dish.price);
                const isServed = dish.serveStatus === 'served';
                const isUrged = dish.serveStatus === 'urged';
                const isCooking = dish.serveStatus === 'cooking' || !dish.serveStatus;
                const isReady = dish.serveStatus === 'ready_to_serve';

                const progress = dish.prepProgress ?? (isServed ? 100 : 70);

                return (
                  <div
                    key={dish.id || idx}
                    className={`p-3 transition-colors flex flex-col gap-2.5 ${
                      isUrged ? 'bg-neutral-100/80' : isServed ? 'bg-neutral-50/50' : 'hover:bg-neutral-50'
                    }`}
                  >
                    {/* Top Row: Index + Title + Price + Tags */}
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-[2px] bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0 font-bold text-xs text-neutral-700">
                        {idx + 1}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            <span className="font-bold text-xs sm:text-sm text-neutral-900 truncate">
                              {dish.name}
                            </span>
                            <span className="font-bold text-xs text-neutral-400 shrink-0">
                              x{dish.quantity}
                            </span>
                            {dish.station && (
                              <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded-[2px] bg-neutral-100 text-neutral-600 border border-neutral-200 shrink-0">
                                {dish.station}
                              </span>
                            )}
                            {dish.isChefSpecial && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-[2px] bg-neutral-900 text-white shrink-0">
                                招牌现制
                              </span>
                            )}
                          </div>

                          <span className="text-xs sm:text-sm text-neutral-900 font-black shrink-0">
                            ¥{(dish.price * dish.quantity).toFixed(2)}
                          </span>
                        </div>

                        {dish.options && (
                          <p className="text-[11px] text-neutral-500 truncate">
                            规格要求: <span className="text-neutral-700 font-medium">{dish.options}</span>
                          </p>
                        )}

                        {/* Progress Bar */}
                        <div className="pt-0.5 space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-neutral-400">制作出餐进度:</span>
                            <span className="font-bold text-neutral-900">{progress}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden border border-neutral-200">
                            <div
                              className="h-full bg-neutral-900 transition-all duration-500 rounded-full"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Status Badge & Interactive Action Buttons */}
                    <div className="pt-2 border-t border-neutral-100 flex items-center justify-between gap-2 flex-wrap">
                      {/* Left: Status Badge */}
                      <div className="min-w-0">
                        {isServed && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] bg-neutral-900 text-white font-bold text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>已上桌</span>
                            {dish.serveTime && <span className="font-normal text-[10px] text-neutral-300">({dish.serveTime})</span>}
                          </span>
                        )}

                        {isCooking && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] bg-neutral-100 text-neutral-700 border border-neutral-200 font-bold text-xs">
                            <Flame className="w-3.5 h-3.5 text-neutral-700 shrink-0" />
                            <span>烹饪制作中</span>
                          </span>
                        )}

                        {isReady && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] bg-neutral-100 text-neutral-800 border border-neutral-200 font-bold text-xs">
                            <Sparkles className="w-3.5 h-3.5 shrink-0" />
                            <span>待出餐上桌</span>
                          </span>
                        )}

                        {isUrged && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] bg-neutral-900 text-white font-bold text-xs animate-pulse">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>催单加急中</span>
                          </span>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Action 1: Toggle Serve */}
                        <button
                          type="button"
                          onClick={() => handleToggleDishStatus(originalIndex)}
                          className={`px-3 py-1.5 rounded-[3px] font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-2xs whitespace-nowrap ${
                            isServed
                              ? 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200'
                              : 'bg-neutral-900 text-white hover:bg-black shadow-[0_2px_0_#404040] active:translate-y-0.5 active:shadow-none'
                          }`}
                          title={isServed ? '点击撤回为烹饪制作状态' : '点击确认该菜品已送至桌台'}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>{isServed ? '撤回制作' : '标为已上桌'}</span>
                        </button>

                        {/* Action 2: Urge */}
                        {!isServed && (
                          <button
                            type="button"
                            onClick={(e) => handleUrgeDish(originalIndex, e)}
                            className="px-2.5 py-1.5 bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-700 rounded-[3px] font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shadow-2xs"
                            title="向后厨发送加急出餐催促"
                          >
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>催菜</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom Fixed Action Footer */}
      <div className="bg-white border-t border-neutral-200 p-2.5 sm:p-3 flex flex-col gap-2 shrink-0 z-20 shadow-xs">
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-neutral-700 shrink-0" />
            <span>
              目前出餐完成率: <strong className="text-neutral-900 font-bold">{totalDishCount > 0 ? Math.round((servedDishCount / totalDishCount) * 100) : 0}%</strong> ({servedDishCount}/{totalDishCount} 件)
            </span>
          </div>
          <div className="w-24 sm:w-32 bg-neutral-100 h-1.5 rounded-full overflow-hidden border border-neutral-200">
            <div
              className="bg-neutral-900 h-full rounded-full transition-all duration-300"
              style={{ width: `${totalDishCount > 0 ? (servedDishCount / totalDishCount) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={handleMarkAllServed}
            disabled={servedDishCount === totalDishCount}
            className="px-2 py-1.5 sm:py-2 bg-neutral-900 hover:bg-black disabled:opacity-40 text-white rounded-[3px] font-black text-xs flex items-center justify-center gap-1 cursor-pointer transition-all shadow-[0_2px_0_#404040] active:translate-y-0.5 active:shadow-none whitespace-nowrap truncate"
            title="一键将全部菜品更新为已出齐上桌"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
            <span className="truncate">一键全上齐</span>
          </button>

          <button
            type="button"
            onClick={() => {
              speakText(`后厨请注意，${table.code}桌全单菜品催促制作，请核对档口工单！`, {
                persona: 'steady_male',
                chimeType: 'urgent'
              });
              showToast(`全单催菜广播已发送至餐车后厨KDS！`);
            }}
            className="px-2 py-1.5 sm:py-2 bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-200 rounded-[3px] font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors whitespace-nowrap truncate shadow-2xs"
            title="通过车载语音和屏幕广播全单催促后厨出餐"
          >
            <BellRing className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
            <span className="truncate">全单催菜</span>
          </button>

          <button
            type="button"
            onClick={onBack}
            className="px-2 py-1.5 sm:py-2 bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200 rounded-[3px] font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors whitespace-nowrap truncate shadow-2xs"
            title="返回桌台看板主厅"
          >
            <span className="truncate">返回大厅</span>
          </button>
        </div>
      </div>
    </div>
  );
};
