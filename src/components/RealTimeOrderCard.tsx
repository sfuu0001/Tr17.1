import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  DollarSign,
  Clock,
  UtensilsCrossed,
  Flame,
  CheckCircle2,
  ChevronDown,
  Check,
  PackageCheck,
  AlertCircle,
  QrCode,
  Truck,
  MessageSquareText,
  Copy,
  Hash,
  ExternalLink,
  FileText,
  Sparkles,
  MoreHorizontal,
  ReceiptText,
  BellRing,
  HelpCircle,
  Info,
  ChevronRight,
  ShieldCheck,
  Maximize2,
  RefreshCw,
  ChevronUp
} from 'lucide-react';
import { useToast } from './ui/ToastContext';
import { matchDishImageUrl } from '../utils/dishImageMatcher';
import { generateQrCodeDataUrl } from '../utils/qrCodeEngine';
import { useCardScrollReveal, organicCardScrollVariants } from '../utils/useCardScrollReveal';

export interface RealTimeOrderCardProps {
  order: any;
  idx: number;
  isExpanded: boolean;
  onToggleExpand: (orderKey: string) => void;
  onTrackRadar: (order: any) => void;
  onOpenRefund: (order: any) => void;
  onOpenChat: (order: any) => void;
  renderHorizontalSteps: (order: any, stepIndex: number) => React.ReactNode;
}

export const RealTimeOrderCard: React.FC<RealTimeOrderCardProps> = ({
  order,
  idx,
  isExpanded,
  onToggleExpand,
  onTrackRadar,
  onOpenRefund,
  onOpenChat,
  renderHorizontalSteps
}) => {
  const toast = useToast();
  const { elementRef, currentVariant } = useCardScrollReveal();
  const orderKey = String(order.id || order.orderNo || idx);

  // 悬停和点击显示完整订单号的小型下拉菜单状态
  const [isOrderNoMenuOpen, setIsOrderNoMenuOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<any>(null);

  // 后厨时序日志微组件抽屉
  const [isKitchenLogOpen, setIsKitchenLogOpen] = useState(false);
  // 更多操作快捷菜单
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // 取餐/核销真实二维码小组件下拉状态
  const [isPickupQrOpen, setIsPickupQrOpen] = useState(false);
  const [orderQrDataUrl, setOrderQrDataUrl] = useState<string | null>(null);
  const [isGeneratingOrderQr, setIsGeneratingOrderQr] = useState(false);

  const cleanOrderNo = String(order.orderNo || order.id || 'UR-DIN-9821').replace(/^#/, '');

  const loadOrderQr = async () => {
    if (orderQrDataUrl) return;
    setIsGeneratingOrderQr(true);
    try {
      const baseUrl = typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://tc100-d9gz0e2ko5929e360-1445454244.tcloudbaseapp.com';
      const payload = `${baseUrl}/?action=order_verify&orderNo=${cleanOrderNo}&pickupCode=${order.pickupCode || cleanOrderNo.slice(-4)}&channel=${order.channel}`;
      const url = await generateQrCodeDataUrl(payload, {
        width: 320,
        margin: 2,
        darkColor: '#000000',
        lightColor: '#ffffff'
      });
      setOrderQrDataUrl(url);
    } catch (e) {
      console.error('Failed to generate order QR:', e);
    } finally {
      setIsGeneratingOrderQr(false);
    }
  };

  const togglePickupQr = () => {
    const nextState = !isPickupQrOpen;
    setIsPickupQrOpen(nextState);
    if (nextState) {
      loadOrderQr();
    }
  };
  const fullOrderNo = order.fullOrderNo || (cleanOrderNo.length > 14 ? cleanOrderNo : `UR-${order.channel === 'dine_in' ? 'DIN' : order.channel === 'pickup' ? 'PK' : 'DEL'}-20260908-${cleanOrderNo.replace(/[^A-Za-z0-9]/g, '')}-TCB88`);
  const cloudTraceId = order.id && String(order.id).startsWith('ord_') ? order.id : `tcb_ord_trace_${cleanOrderNo.toLowerCase()}_${order.createdTime ? String(order.createdTime).replace(/[^0-9]/g, '') : '122015'}`;
  const fullUid = order.userId || 'tcb_u_88209315893_wx';

  const handleMouseEnter = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setIsOrderNoMenuOpen(true);
  };

  const handleMouseLeave = () => {
    hoverTimerRef.current = setTimeout(() => {
      setIsOrderNoMenuOpen(false);
    }, 240);
  };

  const handleToggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOrderNoMenuOpen((prev) => !prev);
  };

  const copyToClipboard = (text: string, key: string, label: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text);
      }
      setCopiedKey(key);
      toast.success(`${label}已复制`);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // ignore
    }
  };

  // 点击外部及ESC退出监听
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOrderNoMenuOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOrderNoMenuOpen(false);
        setIsMoreMenuOpen(false);
        setIsKitchenLogOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const dishItems = (order.items && order.items.length > 0
    ? order.items
    : [
        {
          name: order.channel === 'dine_in' ? '碳烤和牛小汉堡双重奏' : order.channel === 'pickup' ? '果木烟熏黑豚炙烤五花' : '极夜燕麦拿铁',
          quantity: order.channel === 'dine_in' ? 2 : 1,
          serveStatus: order.channel === 'dine_in' ? 'served' : 'ready_to_serve',
          prepProgress: 100,
          station: order.channel === 'dine_in' ? '炭火炙烤档' : order.channel === 'pickup' ? '恒温取餐柜' : '餐车吧台',
          serveTime: '12:35'
        },
        {
          name: order.channel === 'dine_in' ? '黑曜极夜冷萃冰咖' : order.channel === 'pickup' ? '黑曜石松露金黄脆薯' : '现烤肉桂卷',
          quantity: 1,
          serveStatus: order.channel === 'dine_in' ? 'served' : 'ready_to_serve',
          prepProgress: 100,
          station: order.channel === 'dine_in' ? '冷饮现调档' : order.channel === 'pickup' ? '01号智能保温格' : '冷饮吧台',
          serveTime: '12:26'
        },
        {
          name: order.channel === 'dine_in' ? '冷萃黑金茉莉提拉米苏' : order.channel === 'pickup' ? '黑曜石松露金黄脆薯' : '现烤肉桂卷',
          quantity: 1,
          serveStatus: order.channel === 'dine_in' ? 'cooking' : 'ready_to_serve',
          prepProgress: order.channel === 'dine_in' ? 75 : 100,
          station: order.channel === 'dine_in' ? '西点烘焙档' : order.channel === 'pickup' ? '01号智能保温格' : '烘焙烤箱'
        }
      ]
  ).slice(0, 4);

  const servedCount = dishItems.filter((d: any) => d.serveStatus === 'served').length;
  const cookingCount = dishItems.filter((d: any) => d.serveStatus === 'cooking' || !d.serveStatus).length;

  // 智能获取菜品商业级美食摄影图片
  const getDishImage = (dish: any) => {
    if (dish.imageUrl) return dish.imageUrl;
    if (dish.image) return dish.image;
    return matchDishImageUrl({ id: dish.id, name: dish.name, category: dish.category });
  };

  const stepIndex = order.stepIndex ?? (order.statusType === 'en_route' ? 3 : order.statusType === 'delivered' ? 4 : order.statusType === 'ready' ? 2 : 1);
  const progressPct = stepIndex >= 4 || order.statusType === 'delivered' ? 100 : stepIndex === 3 ? 75 : stepIndex === 2 ? 50 : stepIndex === 1 ? 40 : 20;

  const isDineIn = order.channel === 'dine_in';
  const isPickup = order.channel === 'pickup';
  const isDelivered = order.statusType === 'delivered' || order.status === '已送达' || order.status === '已完成' || stepIndex >= 4;
  const isRefunded = order.statusType === 'refunded' || order.status === '已退款' || order.status === '已取消';
  const isEnRoute = order.statusType === 'en_route' || order.statusType === 'delivering' || order.status === '骑手配送中';

  // 监听订单状态变更：当订单状态、阶段节点或更新时间发生变化时，触发“刚刚更新”微脉冲指示器
  const [isStatusRecentlyUpdated, setIsStatusRecentlyUpdated] = useState<boolean>(() => {
    if (order.isRecentlyUpdated || order._justUpdated || order.justUpdated) return true;
    if (order.statusUpdatedAt) {
      const diff = Date.now() - new Date(order.statusUpdatedAt).getTime();
      return !isNaN(diff) && diff < 45000;
    }
    return false;
  });

  const prevStatusSignatureRef = useRef<string>(
    `${order.status || ''}_${order.statusType || ''}_${order.stepIndex ?? ''}_${order.rawStatus || ''}`
  );
  const updateTimerRef = useRef<any>(null);

  useEffect(() => {
    if (order.isRecentlyUpdated || order._justUpdated || order.justUpdated) {
      setIsStatusRecentlyUpdated(true);
      if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
      updateTimerRef.current = setTimeout(() => {
        setIsStatusRecentlyUpdated(false);
      }, 10000);
    }
  }, [order.isRecentlyUpdated, order._justUpdated, order.justUpdated]);

  useEffect(() => {
    const currentSig = `${order.status || ''}_${order.statusType || ''}_${order.stepIndex ?? ''}_${order.rawStatus || ''}`;
    if (prevStatusSignatureRef.current && prevStatusSignatureRef.current !== currentSig) {
      prevStatusSignatureRef.current = currentSig;
      setIsStatusRecentlyUpdated(true);
      if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
      updateTimerRef.current = setTimeout(() => {
        setIsStatusRecentlyUpdated(false);
      }, 10000);
    } else {
      prevStatusSignatureRef.current = currentSig;
    }
    return () => {
      if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
    };
  }, [order.status, order.statusType, order.stepIndex, order.rawStatus]);

  // 监听全局订单更新事件，若与当前卡片匹配且状态变更，立即唤起脉冲指示
  useEffect(() => {
    const handleGlobalOrdersUpdated = (e: any) => {
      const list = e?.detail;
      if (!Array.isArray(list)) return;
      const cleanNo = String(order.orderNo || order.id || '').replace(/^#/, '');
      const match = list.find((item: any) => {
        const itemNo = String(item.orderNo || item.id || '').replace(/^#/, '');
        return itemNo === cleanNo;
      });
      if (match) {
        const matchSig = `${match.status || ''}_${match.statusType || ''}_${match.stepIndex ?? ''}`;
        if (prevStatusSignatureRef.current && prevStatusSignatureRef.current !== matchSig) {
          prevStatusSignatureRef.current = matchSig;
          setIsStatusRecentlyUpdated(true);
          if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
          updateTimerRef.current = setTimeout(() => {
            setIsStatusRecentlyUpdated(false);
          }, 10000);
        }
      }
    };
    window.addEventListener('obsidian_orders_updated', handleGlobalOrdersUpdated);
    return () => {
      window.removeEventListener('obsidian_orders_updated', handleGlobalOrdersUpdated);
    };
  }, [order.orderNo, order.id]);

  return (
    <div
      ref={elementRef as any}
      key={`cust-ord-${order.id || order.orderNo || idx}-${idx}`}
      data-reveal="hidden-down"
      className="organic-card-reveal bg-white rounded-2xl border border-[#e8e8e3] shadow-[0_2px_10px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-shadow duration-300 w-full divide-y divide-[#f2f2ee] mt-2.5 relative overflow-hidden group/card"
    >
      {/* 顶部履约渠道专属微光渐变色条 */}
      <div
        className={`h-1 w-full transition-all ${
          isDineIn
            ? 'bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500'
            : isPickup
            ? 'bg-gradient-to-r from-sky-400 via-cyan-400 to-blue-500'
            : 'bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-600'
        }`}
      />

      {/* Zone 1: Order Header & Table Info (含悬停/点击展开完整订单号小型下拉菜单) */}
      <div className="bg-surface-card px-3.5 py-2.5 relative z-30" data-purpose="order-meta-header">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 shrink-0">
            {/* 完整订单号交互下拉菜单触发器 */}
            <div
              ref={dropdownRef}
              className="relative inline-block"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <button
                type="button"
                onClick={handleToggleMenu}
                className={`inline-flex items-center whitespace-nowrap bg-[#f4f4f2] hover:bg-[#eaeae6] active:scale-98 text-[#4b4b44] text-[11px] tabular-nums px-2 py-0.5 rounded-custom border transition-all cursor-pointer select-none group ${
                  isOrderNoMenuOpen ? 'border-black ring-1 ring-black/10 bg-white text-black shadow-2xs' : 'border-[#e5e7eb]'
                }`}
                title="悬停或点击展开完整订单号与链路凭证"
              >
                <span className="text-[#888880] group-hover:text-black transition-colors mr-1">单号</span>
                <span className="font-bold">#{order.orderNo || 'UR-DIN-9821'}</span>
                <ChevronDown
                  className={`w-3 h-3 ml-1 text-[#888880] group-hover:text-black transition-transform duration-200 ${
                    isOrderNoMenuOpen ? 'rotate-180 text-black' : ''
                  }`}
                />
              </button>

              {/* 小型下拉菜单 (悬停与点击触发) */}
              <AnimatePresence>
                {isOrderNoMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.96 }}
                    transition={{ duration: 0.16, ease: 'easeOut' }}
                    className="absolute top-full left-0 mt-1.5 z-50 w-72 sm:w-80 bg-white rounded-xl shadow-xl border border-[#e5e5e0] p-3 text-left divide-y divide-[#f2f2ee]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* 顶部指示箭头 */}
                    <div className="absolute -top-1.5 left-5 w-3 h-3 bg-white border-t border-l border-[#e5e5e0] rotate-45 pointer-events-none" />

                    {/* 下拉头部 */}
                    <div className="pb-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5 text-obsidian" />
                        <span className="text-xs font-black text-obsidian tracking-tight">完整订单档案凭证</span>
                      </div>
                      <span className="inline-flex items-center whitespace-nowrap bg-[#f4f4f2] text-[#60605a] text-[10px] px-2 py-0.5 rounded-custom font-medium border border-[#e5e7eb]">
                        {order.channel === 'dine_in' ? '堂食现制' : order.channel === 'pickup' ? '自提取餐' : '极速专送'}
                      </span>
                    </div>

                    {/* 完整业务订单号展示与复制 */}
                    <div className="py-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-[#787770] font-semibold">
                        <span>完整业务订单号</span>
                        <span className="tabular-nums text-[9.5px] text-[#059669] bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          可追溯
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-1.5 bg-[#f8f8f6] p-2 rounded-lg border border-[#e8e8e4]">
                        <span className="tabular-nums text-xs font-bold text-obsidian select-all break-all leading-tight">
                          {fullOrderNo}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(fullOrderNo, 'fullOrderNo', '完整订单号')}
                          className="px-2 py-1 rounded-md bg-white border border-[#dcdcd8] text-[#55554f] hover:text-black hover:bg-neutral-50 active:scale-95 transition-all cursor-pointer shrink-0 flex items-center gap-1 text-[10.5px] font-bold shadow-2xs"
                          title="一键复制完整订单号"
                        >
                          {copiedKey === 'fullOrderNo' ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700 text-[10px]">已复制</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-[#707068]" />
                              <span className="text-[10px]">复制</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* 关联流水号与食客 UID */}
                    <div className="py-2.5 space-y-1.5 text-[10.5px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[#787770] shrink-0 font-medium">系统流水号:</span>
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="tabular-nums text-[10px] text-[#40403c] truncate max-w-[150px] select-all bg-[#fafaf8] px-1.5 py-0.5 rounded border border-[#ecece8]">
                            {cloudTraceId}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(cloudTraceId, 'cloudTraceId', '系统流水号')}
                            className="text-[#787770] hover:text-black p-0.5 rounded cursor-pointer"
                            title="复制系统流水号"
                          >
                            {copiedKey === 'cloudTraceId' ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[#787770] shrink-0 font-medium">食客 UID:</span>
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="tabular-nums text-[10px] text-emerald-800 truncate max-w-[150px] select-all bg-[#edfcf6] px-1.5 py-0.5 rounded border border-[#bbf7d0]">
                            {fullUid}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(fullUid, 'uid', '食客 UID')}
                            className="text-[#787770] hover:text-black p-0.5 rounded cursor-pointer"
                            title="复制完整食客 UID"
                          >
                            {copiedKey === 'uid' ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-[#8a8a82] pt-0.5">
                        <span>下单时间: {order.createdTime || '12:20:15'}</span>
                        {order.tableCode ? (
                          <span className="tabular-nums font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                            台位: {order.tableCode}桌
                          </span>
                        ) : order.pickupCode ? (
                          <span className="tabular-nums font-bold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                            取餐码: #{order.pickupCode}
                          </span>
                        ) : (
                          <span className="font-bold text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200">
                            雷达专送
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 快捷操作区 */}
                    <div className="pt-2 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const allInfo = `【黑曜石流动餐车订单凭证】\n业务单号: ${fullOrderNo}\n系统流水: ${cloudTraceId}\n食客UID: ${fullUid}\n渠道: ${order.channel === 'dine_in' ? '堂食现制' : order.channel === 'pickup' ? '自提取餐' : '极速外卖'}\n下单时间: ${order.createdTime || '刚刚'}\n金额: ¥${Number(order.totalAmount || 0).toFixed(2)}`;
                          copyToClipboard(allInfo, 'allInfo', '全量单据档案');
                        }}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-[#f4f4f0] hover:bg-[#eaeae4] text-[#40403c] hover:text-black text-[10.5px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 border border-[#e2e2dc]"
                      >
                        {copiedKey === 'allInfo' ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700">已复制全量凭证</span>
                          </>
                        ) : (
                          <>
                            <FileText className="w-3 h-3 text-[#707068]" />
                            <span>复制全量凭证</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsOrderNoMenuOpen(false);
                          onTrackRadar(order);
                        }}
                        className="py-1.5 px-3 rounded-lg bg-black hover:bg-neutral-800 text-white text-[10.5px] font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <span>雷达追踪</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 食客 UID 便捷交互微胶囊 */}
            <button
              type="button"
              onClick={() => copyToClipboard(fullUid, 'uid_badge', '食客 UID')}
              className="inline-flex items-center whitespace-nowrap bg-[#f0fdf4] hover:bg-[#dcfce7] active:scale-95 text-[#15803d] text-[10.5px] tabular-nums px-2 py-0.5 rounded-custom border border-[#bbf7d0] transition-all cursor-pointer select-none shadow-2xs"
              title={`点击快速复制完整 UID: ${fullUid}`}
            >
              <span className="text-[#16a34a] mr-1 font-semibold">UID</span>
              <span className="font-medium">{order.userId ? (order.userId.length > 10 ? `${order.userId.slice(0, 8)}...` : order.userId) : '8820...'}</span>
              {copiedKey === 'uid_badge' ? (
                <Check className="w-2.5 h-2.5 ml-1 text-emerald-600" />
              ) : null}
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {order.channel === 'dine_in' && order.tableCode && (
              <span className="inline-flex items-center whitespace-nowrap bg-[#fef3c7] text-[#92400e] text-[10.5px] tabular-nums px-2 py-0.5 rounded-custom border border-[#fde68a] font-bold shadow-2xs">
                {order.tableCode}桌
              </span>
            )}
            {order.channel === 'pickup' && (order.pickupCode || order.orderNo) && (
              <button
                type="button"
                onClick={togglePickupQr}
                className="inline-flex items-center gap-1 whitespace-nowrap bg-[#f0fdfa] hover:bg-[#ccfbf1] active:scale-95 text-[#0f766e] text-[10.5px] tabular-nums px-2 py-0.5 rounded-custom border border-[#99f6e4] font-bold shadow-2xs transition-all cursor-pointer"
                title="点击下拉展示真实取餐核销二维码小组件"
              >
                <QrCode className="w-3 h-3 text-[#0d9488]" />
                <span>取餐码 #{order.pickupCode || order.orderNo?.slice(-4) || '8806'}</span>
              </button>
            )}
            <span className="inline-flex items-center whitespace-nowrap bg-[#f5f5f4] text-[#57534e] text-[10.5px] px-2 py-0.5 rounded-custom font-semibold border border-[#e7e5e4] shrink-0">
              {order.channel === 'dine_in' ? '堂食现制' : order.channel === 'pickup' ? '自提取餐' : '雷达专送'}
            </span>
          </div>
        </div>
      </div>

      {/* Zone 2: Trajectory Pipeline Stepper & Progress Notification */}
      <div className="bg-surface-card px-3.5 py-3" data-purpose="trajectory-pipeline">
        <div className="flex items-center justify-between pb-3 border-b border-[#f2f2ee]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-2xs border ${
              isDineIn ? 'bg-[#fffbeb] border-[#fde68a] text-[#b45309]' : isPickup ? 'bg-[#f0f9ff] border-[#bae6fd] text-[#0369a1]' : 'bg-[#ecfdf5] border-[#a7f3d0] text-[#047857]'
            }`}>
              {isDineIn ? <UtensilsCrossed className="w-3.5 h-3.5" /> : isPickup ? <QrCode className="w-3.5 h-3.5" /> : <Truck className="w-3.5 h-3.5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-black text-obsidian tracking-tight truncate">
                  {order.title || '黑曜石01号流动餐车'}
                </span>
                <span className="inline-flex items-center gap-1 bg-[#ecfdf5] text-[#059669] text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-[#bbf7d0] whitespace-nowrap shrink-0 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
                  {progressPct}%
                </span>
              </div>
              <p className="text-[10.5px] text-[#888880] flex items-center gap-1 mt-0.5">
                <span>{order.distance || (isDineIn ? '前厅堂食台位' : isPickup ? '恒温自提档' : '极速雷达专送')}</span>
                <span className="inline-block w-1 h-1 rounded-full bg-[#d1d5db]" />
                <span>{isDineIn ? `${order.tableCode || 'A1'}号位专递` : isPickup ? '凭码核销' : '专线直达'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* 状态徽章 (含刚刚更新微脉冲指示器 animate-pulse-dot) */}
            <span
              className={`inline-flex items-center gap-1.5 font-bold px-2.5 py-0.5 rounded-full text-[10.5px] shrink-0 whitespace-nowrap shadow-2xs transition-all duration-300 ${
                isStatusRecentlyUpdated
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 ring-2 ring-emerald-400/50 shadow-xs'
                  : isDelivered
                  ? 'bg-emerald-50/80 text-emerald-800 border border-emerald-200'
                  : isRefunded
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : isEnRoute
                  ? 'bg-sky-50 text-sky-800 border border-sky-200'
                  : 'bg-[#fffaf5] text-[#ea580c] border border-[#fed7aa]'
              }`}
              title={isStatusRecentlyUpdated ? '订单状态刚刚更新 · 实时同步中' : undefined}
            >
              {/* Subtle animated pulse indicator (similar to animate-pulse-dot in index.css) */}
              {isStatusRecentlyUpdated ? (
                <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500 animate-pulse-dot" />
                </span>
              ) : (
                <Clock
                  className={`w-3 h-3 ${
                    isDelivered
                      ? 'text-emerald-700'
                      : isRefunded
                      ? 'text-rose-600'
                      : isEnRoute
                      ? 'text-sky-600'
                      : 'text-[#ea580c]'
                  }`}
                />
              )}
              <span>{order.status || (order as any).statusConfig?.shortLabel || '餐车已接单'}</span>
              {isStatusRecentlyUpdated && (
                <span className="text-[9px] font-black text-emerald-700 bg-emerald-100/90 px-1 py-0.2 rounded-full leading-none animate-pulse">
                  刚刚更新
                </span>
              )}
            </span>

            {/* 高质感金额微胶囊 */}
            <div className="inline-flex items-baseline gap-0.5 bg-[#fbfbfa] px-2 py-0.5 rounded-lg border border-[#e8e8e4] shadow-2xs font-amount">
              <span className="text-[10px] text-[#888880] font-medium">¥</span>
              <span className="text-sm font-bold text-obsidian tracking-tight">
                {Number(order.totalAmount || 186).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Stepper Pipeline */}
        {renderHorizontalSteps(order, stepIndex)}

        {/* Zone 2: 后厨心跳微组件 (Kitchen Heartbeat Micro-Component) */}
        <div className="mt-2.5 flex items-center justify-between gap-2 bg-[#fafaf8] border border-[#e8e8e4] rounded-xl px-2.5 py-1.5 transition-colors">
          <div className="flex items-center gap-2 min-w-0">
            {/* 状态呼吸微章 */}
            <button
              type="button"
              onClick={() => setIsKitchenLogOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-[#fff7ed] to-[#fffaf5] border border-[#fed7aa] text-[#c2410c] text-[10.5px] font-bold cursor-pointer hover:border-[#fdba74] hover:shadow-2xs active:scale-95 transition-all shrink-0"
              title="点击打开/收起后厨调度与出餐时序抽屉"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ea580c] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ea580c]"></span>
              </span>
              <Flame className="w-3 h-3 text-[#ea580c]" />
              <span>炙烤现制中</span>
              <ChevronRight className={`w-3 h-3 text-[#ea580c]/70 transition-transform duration-200 ${isKitchenLogOpen ? 'rotate-90' : ''}`} />
            </button>

            {/* 精简状态摘要标签，移除长句平铺 */}
            <span className="text-[11px] text-[#707068] truncate font-medium">
              {order.channel === 'dine_in' ? '主厨现烤封汁 · 陆续上桌' : order.channel === 'pickup' ? '出炉打包待入柜' : '餐品制作中 · 骑手待就位'}
            </span>
          </div>

          {/* 预计出餐/首道小标签 */}
          <button
            type="button"
            onClick={() => setIsKitchenLogOpen(true)}
            className="inline-flex items-center gap-1 text-[10px] tabular-nums font-bold text-[#059669] bg-[#ecfdf5] border border-[#a7f3d0] px-2 py-0.5 rounded-custom hover:bg-[#d1fae5] transition-colors cursor-pointer shrink-0"
            title="查看完整流转时序与出餐日志"
          >
            <Clock className="w-2.5 h-2.5 text-[#059669]" />
            <span>预计 {order.estArrival?.slice(0, 5) || '12:25'}</span>
          </button>
        </div>

        {/* 后厨链路时序微抽屉 (Kitchen Timeline Log Drawer Popover) */}
        <AnimatePresence>
          {isKitchenLogOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="overflow-hidden mt-2 bg-white rounded-xl border border-[#e5e5e0] shadow-sm p-3 text-left space-y-2.5"
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-[#f2f2ee]">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-[#ea580c]" />
                  <span className="text-xs font-black text-obsidian tracking-tight">后厨现制调度流水日志</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsKitchenLogOpen(false)}
                  className="text-[11px] text-[#888880] hover:text-black font-medium cursor-pointer"
                >
                  收起日志
                </button>
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="flex items-start gap-2 text-[#40403c]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] mt-1 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-obsidian">工单主厨确认接单</span>
                      <span className="text-[10px] text-[#888880] tabular-nums">12:20:15</span>
                    </div>
                    <p className="text-[#787770] text-[10.5px]">餐车智能中枢分配至炭火炙烤与冷饮档口</p>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-[#40403c]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ea580c] animate-pulse mt-1 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#c2410c]">炭火现制进行中 (当前节点)</span>
                      <span className="text-[10px] text-[#ea580c] tabular-nums font-bold">12:23:40</span>
                    </div>
                    <p className="text-[#787770] text-[10.5px]">和牛小汉堡果木炙烤定型 (进度 75%)，冷萃黑金茉莉提拉米苏装盘中</p>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-[#888880]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d1d5db] mt-1 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span>{order.channel === 'dine_in' ? '核验上桌' : order.channel === 'pickup' ? '入柜保温待取' : '极速骑手揽送'}</span>
                      <span className="text-[10px] tabular-nums">待触发</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Exception / Refund Alerts if present */}
        {order.statusType === 'refund_pending' && (
          <div className="mt-2 p-2 bg-amber-50/90 border border-amber-200/90 rounded-custom text-xs space-y-1">
            <div className="flex items-center justify-between text-amber-900 font-bold">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>退单申请审核中 (已在节点 {order.refundPassedStep ?? order.stepIndex ?? 1} 提交反馈)</span>
              </span>
              <span className="text-[10px] tabular-nums text-amber-800">{order.refundAppliedAt || '处理中'}</span>
            </div>
            <p className="text-[11px] text-amber-800">
              <strong>退单原因：</strong>{order.refundReason || '临时有事 / 行程变更'} {order.refundFeedback ? `· ${order.refundFeedback}` : ''}
            </p>
          </div>
        )}
        {order.refundStatus === 'rejected' && (
          <div className="mt-2 p-2 bg-rose-50 border border-rose-200/90 rounded-custom text-xs space-y-0.5">
            <div className="flex items-center gap-1 text-rose-900 font-bold">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>退单申请已驳回</span>
            </div>
            <p className="text-[11px] text-rose-800">
              <strong>商家驳回说明：</strong>{order.refundRejectReason || '餐品已进入后厨不可逆制作流程，暂不支持退单'}
            </p>
          </div>
        )}
        {order.statusType === 'refunded' && (
          <div className="mt-2 p-2 bg-neutral-100 border border-neutral-200 rounded-custom text-xs space-y-0.5">
            <div className="flex items-center gap-1 text-neutral-800 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>退款已成功入账</span>
            </div>
            <p className="text-[11px] text-neutral-600">
              已按原支付路径退回 ¥{Number(order.totalAmount || 0).toFixed(2)} 元。
            </p>
          </div>
        )}
      </div>

      {/* Zone 3: 菜品制作看板微型化折叠抽屉 (Compact Dish Tray Accordion) */}
      <div className="bg-surface-card overflow-hidden w-full" data-purpose="dish-production-board">
        <div
          onClick={() => onToggleExpand(orderKey)}
          className="py-2 px-3.5 border-b border-[#f2f2ee] flex items-center justify-between bg-[#fcfcfb] hover:bg-[#f6f6f3] transition-colors cursor-pointer select-none group"
          title={isExpanded ? '点击收起菜品制作抽屉' : '点击展开全部菜品制作明细'}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded-md bg-[#fff7ed] border border-[#fed7aa] flex items-center justify-center shrink-0 shadow-2xs">
              <UtensilsCrossed className="w-3 h-3 text-[#ea580c]" />
            </div>

            <span className="text-xs font-bold text-obsidian tracking-tight whitespace-nowrap">
              {order.channel === 'dine_in' ? '堂食出餐制作' : order.channel === 'pickup' ? '自提打包出餐' : '餐车出餐进度'}
            </span>

            {/* 菜品微缩实物摄影重叠堆栈 (Food Avatar Stack Preview) */}
            <div className="flex items-center -space-x-1.5 shrink-0 ml-0.5">
              {dishItems.slice(0, 3).map((item: any, iIdx: number) => {
                const imgUrl = getDishImage(item);
                return (
                  <div
                    key={iIdx}
                    className="w-5 h-5 rounded-full overflow-hidden ring-1.5 ring-white bg-[#f0f0ec] shadow-2xs shrink-0"
                    title={item.name}
                  >
                    <img
                      src={imgUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                  </div>
                );
              })}
            </div>

            {/* 微型菜品进度胶囊 */}
            <span className="inline-flex items-center gap-1 bg-[#ecfdf5] border border-[#a7f3d0] text-[#059669] text-[10.5px] font-bold px-1.5 py-0.2 rounded-full whitespace-nowrap shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
              <span>{servedCount > 0 ? `${servedCount}已上桌` : ''}{cookingCount > 0 ? ` ${cookingCount}现制` : ' 齐备'}</span>
            </span>

            <span className="text-[10.5px] text-[#888880] tabular-nums whitespace-nowrap hidden sm:inline">
              共 {order.itemsCount || dishItems.length} 道
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-[#888880] group-hover:text-black font-medium transition-colors">
              {isExpanded ? '收起明细' : '展开制作抽屉'}
            </span>
            <div className="w-5 h-5 rounded-full bg-white border border-[#e5e5e0] flex items-center justify-center group-hover:border-black transition-colors shadow-2xs">
              <ChevronDown className={`w-3 h-3 text-[#888880] group-hover:text-black transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="divide-y divide-[#f4f4f0] px-3.5 py-1 bg-white"
            >
              {dishItems.map((dishItem: any, itemIdx: number) => {
                const isServed = dishItem.serveStatus === 'served';
                const isReady = dishItem.serveStatus === 'ready_to_serve' || dishItem.serveStatus === 'ready';
                const isStruck = dishItem.isStruckOff === true;
                const isGift = dishItem.isCompensatoryGift === true;
                const dishImg = getDishImage(dishItem);

                return (
                  <article
                    key={itemIdx}
                    className={`py-2.5 flex items-center justify-between gap-3 group/item ${
                      isStruck ? 'bg-red-50/40 px-2 rounded-lg my-1 border border-red-100' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* 高清圆角实物美食微缩缩略图 */}
                      <div className="relative w-9.5 h-9.5 rounded-lg overflow-hidden shrink-0 border border-[#e8e8e4] bg-[#f5f5f2] shadow-2xs">
                        <img
                          src={dishImg}
                          alt={dishItem.name}
                          className={`w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-300 ${
                            isStruck ? 'grayscale opacity-60' : ''
                          }`}
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                        <div
                          className={`absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full border border-white shrink-0 ${
                            isStruck
                              ? 'bg-red-500'
                              : isServed
                              ? 'bg-[#059669]'
                              : isReady
                              ? 'bg-[#0284c7]'
                              : 'bg-[#ea580c] animate-pulse'
                          }`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4
                            className={`text-xs font-bold truncate ${
                              isStruck
                                ? 'line-through text-neutral-400'
                                : 'text-obsidian group-hover/item:text-black'
                            }`}
                          >
                            {dishItem.name}
                          </h4>
                          <span className="text-[10.5px] tabular-nums font-bold text-[#888880] bg-[#f5f5f4] px-1 py-0.2 rounded">
                            x{dishItem.quantity || 1}
                          </span>
                          {isStruck && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-red-600 text-white shadow-2xs">
                              商家已划菜
                            </span>
                          )}
                          {isGift && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500 text-white shadow-2xs">
                              商家致歉赠送
                            </span>
                          )}
                          {dishItem.addedBy && (
                            <span className="text-[9px] text-neutral-500 bg-neutral-100 px-1 py-0.2 rounded">
                              {dishItem.addedBy}
                            </span>
                          )}
                        </div>

                        {/* 划菜原因与补偿明细 */}
                        {isStruck ? (
                          <div className="mt-1 space-y-0.5">
                            <div className="text-[10px] text-red-700 font-medium">
                              划菜原因：{dishItem.struckOffReason || '后厨沽清'}
                            </div>
                            {dishItem.compensationDetail && (
                              <div className="text-[10px] text-emerald-700 font-bold">
                                补偿方案：{dishItem.compensationDetail}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-[10.5px] text-[#888880] mt-0.5 flex items-center gap-1.5">
                            <span className="font-medium text-[#707068]">{dishItem.station || '后厨档口'}</span>
                            <span className="inline-block w-1 h-1 rounded-full bg-[#d1d5db]"></span>
                            <span
                              className={
                                isServed
                                  ? 'text-[#059669] font-medium'
                                  : isReady
                                  ? 'text-[#0284c7] font-medium'
                                  : 'text-[#ea580c] font-medium'
                              }
                            >
                              {isServed
                                ? '已出菜传菜'
                                : isReady
                                ? '出餐已入柜'
                                : '主厨炙烤封汁中'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {isStruck ? (
                      <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-300 shrink-0 whitespace-nowrap shadow-2xs">
                        已扣减补偿
                      </span>
                    ) : isServed ? (
                      <span className="inline-flex items-center gap-1 bg-[#ecfdf5] text-[#059669] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#a7f3d0] shrink-0 whitespace-nowrap shadow-2xs">
                        <Check className="w-2.5 h-2.5 text-[#059669]" />
                        已上桌{dishItem.serveTime ? ` ${dishItem.serveTime}` : ''}
                      </span>
                    ) : isReady ? (
                      <span className="inline-flex items-center gap-1 bg-[#f0f9ff] text-[#0369a1] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#bae6fd] shrink-0 whitespace-nowrap shadow-2xs">
                        <PackageCheck className="w-2.5 h-2.5 text-[#0284c7]" />
                        保温待取
                      </span>
                    ) : (
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="inline-flex items-center gap-1 bg-[#fff7ed] text-[#c2410c] text-[10px] font-bold px-2 py-0.2 rounded-full border border-[#fed7aa] whitespace-nowrap shadow-2xs">
                          <Flame className="w-2.5 h-2.5 text-[#ea580c] animate-pulse" />
                          现制 {dishItem.prepProgress || 75}%
                        </span>
                        <div className="w-16 h-1.5 bg-[#f4f4f2] rounded-full overflow-hidden border border-[#e5e7eb]">
                          <div
                            className="h-full bg-gradient-to-r from-[#ea580c] to-[#f97316] rounded-full transition-all duration-500"
                            style={{ width: `${dishItem.prepProgress || 75}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Zone 4: 分段式紧凑多合一操作底栏 (Segmented Compact Action Dock) */}
      <div className="bg-surface-card border-t border-[#f0f0ec] py-2.5 px-3.5 relative w-full flex items-center justify-between gap-2" data-purpose="bottom-control-dock">
        {/* 主交互行为胶囊 (雷达追踪/堂食流转/取餐码) */}
        <button
          type="button"
          onClick={() => {
            if (order.channel === 'pickup') {
              togglePickupQr();
            } else {
              onTrackRadar(order);
            }
          }}
          className="flex-1 h-9.5 bg-gradient-to-b from-[#1c1c1a] to-[#0c0c0b] hover:from-[#2c2c28] hover:to-[#181816] text-white rounded-xl flex items-center justify-center gap-1.5 px-3 active:scale-[0.98] transition-all cursor-pointer shadow-xs border border-white/10 group"
        >
          {order.channel === 'dine_in' ? (
            <UtensilsCrossed className="w-3.5 h-3.5 text-[#fbbf24] shrink-0" />
          ) : order.channel === 'pickup' ? (
            <QrCode className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" />
          ) : (
            <Truck className="w-3.5 h-3.5 text-[#4ade80] shrink-0" />
          )}
          <span className="text-xs font-bold tracking-tight">
            {order.channel === 'dine_in'
              ? '堂食流转与上菜'
              : order.channel === 'pickup'
              ? isPickupQrOpen
                ? '收起取餐码'
                : '取餐码核销'
              : '极速雷达追踪'}
          </span>
          <ChevronRight className={`w-3 h-3 text-white/50 transition-transform ${isPickupQrOpen ? 'rotate-90' : 'group-hover:translate-x-0.5'}`} />
        </button>

        {/* 联络室直接触达按钮 (带未读提示) */}
        <button
          type="button"
          aria-label="在线协同客服"
          title="在线协同客服 · 订单联络室"
          onClick={() => onOpenChat(order)}
          className="h-9.5 px-3 rounded-xl border border-[#e5e5e0] bg-[#fafaf8] hover:bg-[#f2f2ee] active:scale-95 text-[#40403c] transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs relative"
        >
          <MessageSquareText className="w-4 h-4 text-[#444440]" />
          <span className="text-xs font-bold hidden sm:inline">联络室</span>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10b981]"></span>
          </span>
        </button>

        {/* 更多辅助操作小型下拉菜单 (More Actions Popover) */}
        <div ref={moreMenuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsMoreMenuOpen((prev) => !prev)}
            aria-haspopup="true"
            aria-expanded={isMoreMenuOpen}
            className={`w-9.5 h-9.5 border rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-2xs ${
              isMoreMenuOpen ? 'bg-black text-white border-black ring-2 ring-black/10' : 'border-[#e5e5e0] bg-[#fafaf8] text-[#55554f] hover:bg-[#f0f0ed] hover:text-black'
            }`}
            title="更多订单支持操作 (退单、发票、凭据)"
          >
            <MoreHorizontal className="w-4 h-4 text-current" />
          </button>

          <AnimatePresence>
            {isMoreMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.95 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute bottom-full right-0 mb-1.5 z-50 w-56 bg-white rounded-xl shadow-xl border border-[#e5e5e0] p-1.5 text-left divide-y divide-[#f2f2ee]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 菜单列表 */}
                <div className="py-1 space-y-0.5">
                  {/* 出示取餐核销二维码 */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      togglePickupQr();
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-[#0284c7] hover:bg-sky-50 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5 text-[#0284c7] shrink-0" />
                    <span>{isPickupQrOpen ? '收起取餐二维码' : '出示取餐核销二维码'}</span>
                  </button>

                  {/* 退单申请 / 查看退单 */}
                  {order.statusType !== 'refunded' && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        onOpenRefund(order);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-[#dc2626] hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>
                        {order.statusType === 'refund_pending'
                          ? '查看退单审核'
                          : order.nonRefundable
                          ? '不可退单申诉'
                          : '申请退单 / 售后反馈'}
                      </span>
                    </button>
                  )}

                  {/* 电子小票与凭据复制 */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      copyToClipboard(
                        `【餐车凭据】单号: #${order.orderNo}\n流水号: ${cloudTraceId}\n金额: ¥${Number(order.totalAmount || 0).toFixed(2)}\n时间: 2026-09-08 12:20`,
                        'receipt',
                        '电子小票单据'
                      );
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-[#40403c] hover:bg-[#f6f6f4] flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <ReceiptText className="w-3.5 h-3.5 text-[#707068] shrink-0" />
                    <span>复制电子小票单据</span>
                  </button>

                  {/* 订单详细日志 */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      setIsKitchenLogOpen(true);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-[#40403c] hover:bg-[#f6f6f4] flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5 text-[#707068] shrink-0" />
                    <span>后厨流转时序</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 下拉真实二维码取餐/核销小组件 (Dropdown Real QR Code Widget) */}
      <AnimatePresence>
        {isPickupQrOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="border-t border-[#f0f0ed] bg-[#fbfbf9] overflow-hidden"
          >
            <div className="p-3.5 sm:p-4 space-y-3 text-center">
              {/* 顶部状态条 */}
              <div className="flex items-center justify-between text-[10.5px]">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                  </span>
                  <span className="font-bold text-neutral-800">餐车取餐核销小组件</span>
                  <span className="text-sky-700 font-bold bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200 text-[9.5px]">
                    动态防伪凭据
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setOrderQrDataUrl(null);
                      loadOrderQr();
                      toast.success('取餐码防伪凭证已实时刷新');
                    }}
                    className="p-1 rounded-md hover:bg-neutral-200/70 text-[#60605a] hover:text-black transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-medium"
                    title="刷新二维码"
                  >
                    <RefreshCw className={`w-2.5 h-2.5 ${isGeneratingOrderQr ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">刷新</span>
                  </button>
                </div>
              </div>

              {/* 真实二维码展示区域 */}
              <div className="inline-block relative bg-white p-3 rounded-2xl border border-[#e5e5e0] shadow-xs">
                <div className="absolute top-2 left-2 w-2.5 h-2.5 border-t-2 border-l-2 border-black rounded-tl" />
                <div className="absolute top-2 right-2 w-2.5 h-2.5 border-t-2 border-r-2 border-black rounded-tr" />
                <div className="absolute bottom-2 left-2 w-2.5 h-2.5 border-b-2 border-l-2 border-black rounded-bl" />
                <div className="absolute bottom-2 right-2 w-2.5 h-2.5 border-b-2 border-r-2 border-black rounded-br" />

                {isGeneratingOrderQr || !orderQrDataUrl ? (
                  <div className="w-36 h-36 sm:w-40 sm:h-40 flex flex-col items-center justify-center gap-2 text-neutral-400">
                    <RefreshCw className="w-6 h-6 animate-spin text-neutral-500" />
                    <span className="text-[10.5px] tabular-nums">生成真实取餐二维码中...</span>
                  </div>
                ) : (
                  <div className="relative">
                    <img
                      src={orderQrDataUrl}
                      alt={`取餐核销二维码-${cleanOrderNo}`}
                      className="w-36 h-36 sm:w-40 sm:h-40 object-contain mx-auto select-none rounded-md"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-sky-500/70 to-transparent animate-pulse pointer-events-none top-1/2 -translate-y-1/2" />
                  </div>
                )}
              </div>

              {/* 取餐码大字排版与仿真条形码 */}
              <div className="space-y-1.5 max-w-xs mx-auto">
                <div className="h-6 flex items-center justify-center gap-[2px] opacity-80 overflow-hidden px-4">
                  {[4, 1, 3, 2, 1, 4, 2, 1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 3, 1, 2, 4, 1, 3, 2].map((w, i) => (
                    <span key={i} className="bg-black inline-block h-full" style={{ width: `${w}px` }} />
                  ))}
                </div>

                <div className="flex items-center justify-center gap-2 pt-0.5">
                  <span className="tabular-nums font-black text-base tracking-widest text-black select-all">
                    取餐码 #{order.pickupCode || cleanOrderNo.slice(-4) || '8806'}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(order.pickupCode || cleanOrderNo.slice(-4) || '8806', 'pickup_code', '取餐码')}
                    className="px-2 py-0.8 rounded-md bg-neutral-100 hover:bg-neutral-200 active:scale-95 text-[#40403c] text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 border border-neutral-200/80"
                    title="复制取餐码"
                  >
                    {copiedKey === 'pickup_code' ? (
                      <>
                        <Check className="w-2.5 h-2.5 text-emerald-600" />
                        <span className="text-emerald-700">已复制</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-2.5 h-2.5 text-[#666]" />
                        <span>复制</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 底部使用提示与收起按钮 */}
              <div className="pt-2 border-t border-[#f0f0ed] flex items-center justify-between gap-2 text-[10.5px]">
                <span className="text-[#888880] text-left leading-tight truncate">
                  凭此码或真实二维码在餐车窗口出示核销自提
                </span>
                <button
                  type="button"
                  onClick={() => setIsPickupQrOpen(false)}
                  className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-[#40403c] font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                >
                  <span>收起小组件</span>
                  <ChevronUp className="w-3 h-3" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
