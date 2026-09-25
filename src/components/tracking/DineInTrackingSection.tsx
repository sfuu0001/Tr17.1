import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UtensilsCrossed,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Copy,
  ChefHat,
  Flame,
  BellRing,
  Plus,
  ReceiptText,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  Coffee,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Order, TableDishItem, TableFlowStage } from '../../types';
import { speakText } from '../../utils/voiceAlertEngine';
import { urgeMerchantTableDishes } from '../../utils/tableStorage';

interface DineInTrackingSectionProps {
  order: Order;
  onBackToMenu?: () => void;
  showToast: (msg: string) => void;
}

const DEFAULT_DINE_IN_FLOW_STEPS: {
  key: TableFlowStage;
  title: string;
  desc: string;
  defaultTime?: string;
  operator: string;
}[] = [
  { key: 'placed', title: '扫码开台下单', desc: '微信扫码开台支付成功，订单同步后厨', defaultTime: '12:20', operator: '食客本人' },
  { key: 'kitchen_accepted', title: '后厨接单排产', desc: '炭火档与冷饮档同步接单分发', defaultTime: '12:21', operator: '厨师长阿豪' },
  { key: 'cooking', title: '核心菜品炙烤', desc: '高温炭火慢烘现制，和牛排与汉堡炙烤锁汁', defaultTime: '12:25', operator: '炭烤专岗' },
  { key: 'serving', title: '陆续出餐上桌', desc: '档口出餐，传菜员核对桌号陆续送达', defaultTime: '12:35', operator: '传菜员小林' },
  { key: 'all_served', title: '餐品全部齐备', desc: '所有菜品核对无误上齐，客享盛宴', operator: '全档口核验' }
];

export const DineInTrackingSection: React.FC<DineInTrackingSectionProps> = ({
  order,
  onBackToMenu,
  showToast
}) => {
  const [copiedOrderNo, setCopiedOrderNo] = useState(false);
  const [selectedStation, setSelectedStation] = useState<string>('all');
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isCallingServer, setIsCallingServer] = useState(false);
  const [isUrgingKitchen, setIsUrgingKitchen] = useState(false);

  // Local mutable dish state for simulated customer urging / interactions
  const [localDishes, setLocalDishes] = useState<TableDishItem[]>(() => {
    if (order.items && order.items.length > 0) {
      return order.items.map((it, idx) => ({
        id: `td-item-${idx}`,
        name: it.name,
        quantity: it.quantity,
        price: it.price,
        options: it.options,
        serveStatus: it.serveStatus || (idx === 0 ? 'served' : idx === 1 ? 'cooking' : 'preparing'),
        prepProgress: it.prepProgress !== undefined ? it.prepProgress : (idx === 0 ? 100 : idx === 1 ? 75 : 30),
        station: it.station || (idx % 2 === 0 ? '炭火炙烤档' : '冷饮现调档'),
        serveTime: it.serveTime || (idx === 0 ? '12:35' : undefined),
        imageUrl: it.imageUrl,
        isChefSpecial: idx === 0,
        isStruckOff: it.isStruckOff,
        struckOffReason: it.struckOffReason,
        struckOffAt: it.struckOffAt,
        compensationType: it.compensationType,
        compensationDetail: it.compensationDetail,
        compensationAmount: it.compensationAmount,
        isCompensatoryGift: it.isCompensatoryGift,
        addedBy: it.addedBy
      }));
    }
    return [
      {
        id: 'td-d-1',
        name: '碳烤和牛小汉堡双重奏',
        quantity: 2,
        price: 63.0,
        options: '五分熟, 招牌黑椒汁',
        serveStatus: 'served',
        prepProgress: 100,
        station: '炭火炙烤档',
        serveTime: '12:35',
        isChefSpecial: true
      },
      {
        id: 'td-d-2',
        name: '黑曜极夜冷萃冰咖',
        quantity: 1,
        price: 22.0,
        options: '少冰, 无糖',
        serveStatus: 'served',
        prepProgress: 100,
        station: '冷饮现调档',
        serveTime: '12:26'
      },
      {
        id: 'td-d-3',
        name: '冷萃黑金茉莉提拉米苏',
        quantity: 1,
        price: 38.0,
        options: '微甜, 加双份可可粉',
        serveStatus: 'cooking',
        prepProgress: 75,
        station: '西点烘焙档'
      }
    ];
  });

  // 响应商家端对菜品的修改、划菜、补偿变动
  useEffect(() => {
    if (order.items && order.items.length > 0) {
      setLocalDishes(
        order.items.map((it, idx) => ({
          id: `td-item-${idx}`,
          name: it.name,
          quantity: it.quantity,
          price: it.price,
          options: it.options,
          serveStatus: it.serveStatus || (idx === 0 ? 'served' : idx === 1 ? 'cooking' : 'preparing'),
          prepProgress: it.prepProgress !== undefined ? it.prepProgress : (idx === 0 ? 100 : idx === 1 ? 75 : 30),
          station: it.station || (idx % 2 === 0 ? '炭火炙烤档' : '冷饮现调档'),
          serveTime: it.serveTime || (idx === 0 ? '12:35' : undefined),
          imageUrl: it.imageUrl,
          isChefSpecial: idx === 0,
          isStruckOff: it.isStruckOff,
          struckOffReason: it.struckOffReason,
          struckOffAt: it.struckOffAt,
          compensationType: it.compensationType,
          compensationDetail: it.compensationDetail,
          compensationAmount: it.compensationAmount,
          isCompensatoryGift: it.isCompensatoryGift,
          addedBy: it.addedBy
        }))
      );
    }
  }, [order.items]);

  const orderNo = order.orderNo || `UR-DIN-${order.tableCode || 'A1'}-9821`;
  const tableCode = order.tableCode || 'A1';

  // Metrics computation
  const totalCount = localDishes.reduce((acc, cur) => acc + cur.quantity, 0);
  const servedCount = localDishes.filter((d) => d.serveStatus === 'served').reduce((acc, cur) => acc + cur.quantity, 0);
  const cookingCount = localDishes.filter((d) => d.serveStatus === 'cooking' || !d.serveStatus).reduce((acc, cur) => acc + cur.quantity, 0);
  const urgedCount = localDishes.filter((d) => d.serveStatus === 'urged').reduce((acc, cur) => acc + cur.quantity, 0);
  const servePercent = totalCount > 0 ? Math.round((servedCount / totalCount) * 100) : 0;

  // Distinct stations for tabs
  const stations = ['all', ...Array.from(new Set(localDishes.map((d) => d.station).filter(Boolean))) as string[]];

  const filteredDishes = localDishes.filter((d) => {
    if (selectedStation === 'all') return true;
    return d.station === selectedStation;
  });

  // Flow nodes calculation
  const isAllServed = servePercent === 100;
  const currentStepKey: TableFlowStage = isAllServed ? 'all_served' : servedCount > 0 ? 'serving' : 'cooking';

  const handleCopyOrderNo = () => {
    try {
      navigator.clipboard.writeText(orderNo);
      setCopiedOrderNo(true);
      showToast(`已复制堂食订单号: ${orderNo}`);
      setTimeout(() => setCopiedOrderNo(false), 2000);
    } catch {
      showToast(`堂食订单号: ${orderNo}`);
    }
  };

  // Customer urge dish serving
  const handleUrgeServing = () => {
    setIsUrgingKitchen(true);
    speakText(`桌号 ${tableCode} 宾客催促出餐，请后厨加快进度`, { chimeType: 'alert' });
    
    // Mark cooking dishes as urged
    setLocalDishes((prev) =>
      prev.map((d) => (d.serveStatus !== 'served' ? { ...d, serveStatus: 'urged' } : d))
    );

    // 回流至商家端台位矩阵:将该订单对应桌台的未上桌菜品标记为催单加急 (serveStatus='urged')
    if (order.orderNo) {
      urgeMerchantTableDishes(order.orderNo);
    }

    showToast(`已向后厨 KDS 传送【加急催菜】指令，主理人将优先排产制作！`);

    setTimeout(() => setIsUrgingKitchen(false), 3000);
  };

  // Customer call server
  const handleCallServer = () => {
    setIsCallingServer(true);
    speakText(`桌号 ${tableCode} 呼叫服务`, { chimeType: 'bell' });
    showToast(`已呼叫值班服务员「小林 (No.04)」，正在赶往 ${tableCode} 桌`);
    setTimeout(() => setIsCallingServer(false), 2500);
  };

  return (
    <div className="space-y-3.5 p-3 sm:p-4 bg-white max-w-3xl mx-auto">
      {/* 1. Table & Order Identity Card */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {/* Table Badge */}
            <div className="w-11 h-11 rounded-xl bg-neutral-900 text-white flex flex-col items-center justify-center shrink-0 shadow-xs">
              <span className="text-[9px] font-medium opacity-70 leading-none">桌台</span>
              <span className="font-sans font-bold text-base leading-tight mt-0.5">{tableCode}</span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-neutral-900 truncate">
                  堂食就餐 · {order.truckName || '黑曜石流动餐车'}
                </h2>
                <span className="text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 shrink-0">
                  室内散座
                </span>
              </div>
              <p className="text-xs text-neutral-500 flex items-center gap-2 mt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-neutral-400" />
                  <span>2 位宾客</span>
                </span>
                <span className="text-neutral-300">·</span>
                <span>服务员: 小林</span>
                <span className="text-neutral-300">·</span>
                <span className="flex items-center gap-1 text-amber-600">
                  <Clock className="w-3 h-3" />
                  <span>已就餐 28m</span>
                </span>
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[11px] text-neutral-400 block font-normal">消费合计</span>
            <span className="font-sans font-bold text-lg sm:text-xl text-neutral-900">
              ¥{(order.totalAmount || 186.0).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Order Number Row with Quick Copy */}
        <div className="flex items-center justify-between pt-2.5 border-t border-neutral-100 text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-neutral-400 shrink-0">堂食单号:</span>
            <span className="font-sans font-medium text-neutral-800 tracking-tight truncate">{orderNo}</span>
          </div>
          <button
            type="button"
            onClick={handleCopyOrderNo}
            className="text-xs font-medium text-neutral-600 hover:text-neutral-900 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            title="复制订单号"
          >
            {copiedOrderNo ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedOrderNo ? '已复制' : '复制单号'}</span>
          </button>
        </div>
      </div>

      {/* 2. Real-Time Dish Serving & Kitchen Prep Matrix (出餐上菜制作情况) */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-3.5">
        {/* Progress Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-neutral-900 flex items-center gap-1.5 text-sm">
              <UtensilsCrossed className="w-4 h-4 text-neutral-800" />
              <span>菜品出餐进展</span>
            </span>
            <span className="font-sans font-bold text-xs text-neutral-900">
              已上桌 {servedCount}/{totalCount} 件 ({servePercent}%)
            </span>
          </div>

          {/* Master Progress Bar */}
          <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full transition-all duration-500 ${
                servePercent === 100
                  ? 'bg-emerald-600'
                  : urgedCount > 0
                  ? 'bg-rose-500'
                  : 'bg-neutral-900'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${servePercent}%` }}
            />
          </div>

          {/* Quick Metrics Strip */}
          <div className="flex items-center justify-between text-xs text-neutral-500 pt-0.5">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span>已上桌 <strong>{servedCount}</strong> 份</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span>制作中 <strong>{cookingCount}</strong> 份</span>
              </span>
            </div>
            {urgedCount > 0 && (
              <span className="flex items-center gap-1 text-rose-600 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>催单加急 {urgedCount} 份</span>
              </span>
            )}
          </div>
        </div>

        {/* Station Filters */}
        {stations.length > 2 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {stations.map((st) => {
              const label = st === 'all' ? '全部' : st.replace(/档口|档/g, '');
              const isSelected = selectedStation === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSelectedStation(st)}
                  className={`text-xs px-3 py-1 rounded-full font-medium transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                    isSelected
                      ? 'bg-neutral-900 text-white shadow-2xs'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* Dish Items List */}
        <div className="space-y-2">
          {filteredDishes.map((dish, idx) => {
            const isStruck = dish.isStruckOff === true;
            const isGift = dish.isCompensatoryGift === true;
            const isServed = dish.serveStatus === 'served';
            const isCooking = dish.serveStatus === 'cooking';
            const isUrged = dish.serveStatus === 'urged';

            return (
              <div
                key={dish.id || idx}
                className={`p-3 rounded-xl border transition-all ${
                  isStruck
                    ? 'bg-rose-50/50 border-rose-200'
                    : isGift
                    ? 'bg-amber-50/50 border-amber-200'
                    : isServed
                    ? 'bg-neutral-50/40 border-neutral-200/60'
                    : isUrged
                    ? 'bg-rose-50/30 border-rose-200'
                    : 'bg-white border-neutral-200/80 shadow-2xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    {/* Status Icon */}
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xs ${
                        isStruck
                          ? 'bg-rose-100 text-rose-700'
                          : isGift
                          ? 'bg-amber-100 text-amber-800'
                          : isServed
                          ? 'bg-emerald-100 text-emerald-700'
                          : isUrged
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {isStruck ? (
                        <span className="font-sans text-xs font-bold">✕</span>
                      ) : isGift ? (
                        <Sparkles className="w-3.5 h-3.5" />
                      ) : isServed ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : isUrged ? (
                        <AlertCircle className="w-3.5 h-3.5" />
                      ) : (
                        <Flame className="w-3.5 h-3.5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4
                          className={`text-xs sm:text-sm font-bold leading-snug ${
                            isStruck ? 'line-through text-neutral-400' : 'text-neutral-900'
                          }`}
                        >
                          {dish.name}
                        </h4>
                        {dish.station && !isStruck && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-600">
                            {dish.station.replace(/档/g, '')}
                          </span>
                        )}
                        {isStruck && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-medium">
                            已划菜
                          </span>
                        )}
                        {isGift && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-medium">
                            致歉赠送
                          </span>
                        )}
                      </div>

                      {dish.options && (
                        <p className="text-xs text-neutral-500 mt-0.5 truncate">
                          规格: {dish.options}
                        </p>
                      )}

                      {/* Struck Detail */}
                      {isStruck ? (
                        <div className="mt-1 text-xs space-y-0.5 bg-white/80 p-2 rounded-lg border border-rose-100">
                          <div className="text-rose-700">
                            <span className="font-medium">原因: </span>
                            {dish.struckOffReason || '原料已沽清'}
                          </div>
                          {dish.compensationDetail && (
                            <div className="text-emerald-700">
                              <span className="font-medium">方案: </span>
                              {dish.compensationDetail}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mt-1 text-xs font-sans text-neutral-500">
                          <span>单价 ¥{dish.price.toFixed(2)}</span>
                          <span className="text-neutral-300">·</span>
                          <span className="font-bold text-neutral-900">x{dish.quantity} 份</span>
                          <span className="text-neutral-300">·</span>
                          <span className="font-bold text-neutral-900">
                            小计 ¥{(dish.price * dish.quantity).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Status Badge */}
                  <div className="text-right shrink-0">
                    {isStruck ? (
                      <span className="inline-flex items-center text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 whitespace-nowrap">
                        已退赔
                      </span>
                    ) : isServed ? (
                      <div className="space-y-0.5 text-right">
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800 whitespace-nowrap">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>已上桌</span>
                        </span>
                        {dish.serveTime && (
                          <p className="text-[10px] font-sans text-neutral-400">{dish.serveTime} 送达</p>
                        )}
                      </div>
                    ) : isUrged ? (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 whitespace-nowrap">
                        <AlertCircle className="w-3 h-3" />
                        <span>催单中</span>
                      </span>
                    ) : isCooking ? (
                      <div className="space-y-0.5 text-right">
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 whitespace-nowrap">
                          <Flame className="w-3 h-3" />
                          <span>制作中</span>
                        </span>
                        <p className="text-[10px] font-sans text-amber-700">{dish.prepProgress || 70}%</p>
                      </div>
                    ) : (
                      <span className="inline-flex items-center text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 whitespace-nowrap">
                        排单中
                      </span>
                    )}
                  </div>
                </div>

                {/* Sub Progress Bar for Cooking Item */}
                {!isServed && !isStruck && (
                  <div className="mt-2 pt-1.5 border-t border-neutral-100 flex items-center gap-2">
                    <div className="flex-1 h-1 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-300"
                        style={{ width: `${dish.prepProgress || 40}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-sans text-neutral-400">
                      进度 {dish.prepProgress || 40}%
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Action Buttons for Dine-in Customer */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-100">
          <button
            type="button"
            disabled={isAllServed || isUrgingKitchen}
            onClick={handleUrgeServing}
            className={`h-10 px-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-all border whitespace-nowrap ${
              isAllServed
                ? 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 active:scale-95'
            }`}
            title="向后厨直接加急催菜"
          >
            <BellRing className={`w-3.5 h-3.5 shrink-0 ${isUrgingKitchen ? 'animate-bounce' : ''}`} />
            <span>{isUrgingKitchen ? '已催单' : '一键催菜'}</span>
          </button>

          <button
            type="button"
            disabled={isCallingServer}
            onClick={handleCallServer}
            className="h-10 px-2 rounded-xl text-xs font-medium bg-neutral-50 hover:bg-neutral-100 text-neutral-800 border border-neutral-200 flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 whitespace-nowrap"
            title="呼叫桌台值班服务员"
          >
            <Users className={`w-3.5 h-3.5 shrink-0 ${isCallingServer ? 'text-emerald-600' : 'text-neutral-500'}`} />
            <span>{isCallingServer ? '呼叫中...' : '呼叫服务员'}</span>
          </button>

          <button
            type="button"
            onClick={onBackToMenu}
            className="h-10 px-2 rounded-xl text-xs font-medium bg-neutral-900 hover:bg-black text-white flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 whitespace-nowrap shadow-xs"
            title="继续加点其他美味菜品"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>加点菜品</span>
          </button>
        </div>
      </div>

      {/* 3. Dine-In Status Flow Nodes (堂食流转节点) */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-neutral-900 flex items-center gap-1.5 text-sm">
            <Layers className="w-4 h-4 text-neutral-700" />
            <span>堂食服务流转</span>
          </span>
          <span className="text-[11px] text-neutral-400">
            全链路实时同步
          </span>
        </div>

        {/* Streamlined Step Indicator */}
        <div className="grid grid-cols-5 gap-1 pt-1">
          {DEFAULT_DINE_IN_FLOW_STEPS.map((node, i) => {
            const isCompleted =
              isAllServed ||
              (i === 0) ||
              (i === 1) ||
              (i === 2 && servedCount > 0) ||
              (i === 3 && servedCount > 0);
            const isCurrent =
              !isAllServed &&
              ((i === 3 && servedCount > 0 && servedCount < totalCount) ||
                (i === 2 && servedCount === 0));

            const shortTitle = node.title
              .replace('扫码开台下单', '开台下单')
              .replace('后厨接单排产', '接单排产')
              .replace('核心菜品炙烤', '后厨烹饪')
              .replace('陆续出餐上桌', '出餐上桌')
              .replace('餐品全部齐备', '全部齐备');

            return (
              <div key={node.key} className="text-center space-y-1">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    isCompleted
                      ? 'bg-neutral-900'
                      : isCurrent
                      ? 'bg-emerald-500'
                      : 'bg-neutral-100'
                  }`}
                />
                <p
                  className={`text-[11px] truncate whitespace-nowrap ${
                    isCurrent
                      ? 'font-bold text-emerald-700'
                      : isCompleted
                      ? 'font-medium text-neutral-800'
                      : 'text-neutral-400'
                  }`}
                >
                  {shortTitle}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Dining Logs & Time Audit Strip */}
      <div className="p-3 bg-neutral-50 border border-neutral-200/60 rounded-xl text-xs flex items-center justify-between text-neutral-500">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>炭火现制现烤 SOP 质保 · 当面出餐核对</span>
        </span>
        <span className="text-[11px] text-neutral-400 shrink-0 font-mono">KDS 联动</span>
      </div>
    </div>
  );
};
