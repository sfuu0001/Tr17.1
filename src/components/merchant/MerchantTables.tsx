import React, { useState, useRef, useEffect } from 'react';
import {
  UtensilsCrossed,
  Plus,
  Users,
  Clock,
  ArrowRightLeft,
  ReceiptText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  ChevronDown,
  Check,
  LayoutGrid,
  Split,
  Percent,
  UserCheck,
  Barcode,
  Search,
  Copy,
  Flame,
  UserPlus,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  ListOrdered,
  QrCode,
  Megaphone,
  Brush,
  ShieldAlert,
  Ban,
  Trash2,
  AlertTriangle,
  FileX,
  ShieldCheck,
  Zap,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { TableItem, TableStatus, TableZone, DishItem, Order, WaitingTableItem, TableDishItem } from '../../types';
import { globalScannerEngine, playScannerBeep } from '../../utils/barcodeScannerEngine';
import { resolveOrderChannelType, normalizeOrderKey } from '../../utils/orderNormalizer';
import { TableDishProgressView } from './TableDishProgressView';
import { TableBatchPrintModal } from './TableBatchPrintModal';
import { MonoTableCard } from './MonoTableCard';
import { TableCardSynergyMonitor } from './table/TableCardSynergyMonitor';
import { TableCardSynergyDrawer } from './table/TableCardSynergyDrawer';
import { TableSynergyHeaderPill } from './table/TableSynergyHeaderPill';
import { TableCardSynergyFooterAction } from './table/TableCardSynergyFooterAction';
import { TableSession } from '../../types/tableSession';
import { voiceAlerts } from '../../utils/voiceAlertEngine';
import { AccountAuditDrawer } from './AccountAuditDrawer';
import { globalVersionEngine } from '../../utils/versionPointerEngine';
import { businessTransactionEngine } from '../../utils/businessTransactionEngine';
import { safeGetStorage, safeSetStorage } from '../../utils/safeStorage';
import { merchantEventBus } from '../../utils/merchantEventBus';
import {
  getWaitingQueue,
  saveWaitingQueue,
  addWaitingTable,
  cancelWaitingTable,
  transferWaitingToTable,
  getAutoTransferConfig,
  setAutoTransferConfig,
  onTableCleanedRelease
} from '../../utils/tableStorage';

interface MerchantTablesProps {
  tables: TableItem[];
  orders?: Order[];
  menuItems: DishItem[];
  onOpenTable: (tableId: string, guests: number, server: string) => void;
  onCheckoutTable: (tableId: string, discount: number, isAaSplit: boolean) => void;
  onTransferTable: (fromTableId: string, toTableId: string) => void;
  onReleaseTable: (tableId: string) => void;
  onUpdateTable?: (updatedTable: TableItem) => void;
  onSyncOrderItems?: (orderNo: string, items: TableDishItem[]) => void;
  onVoidTableOrder?: (tableId: string, reason: string, targetStatus?: 'idle' | 'cleaning') => void;
  showToast: (msg: string, detail?: string) => void;
}

export const MerchantTables: React.FC<MerchantTablesProps> = ({
  tables,
  orders,
  menuItems,
  onOpenTable,
  onCheckoutTable,
  onTransferTable,
  onReleaseTable,
  onUpdateTable,
  onSyncOrderItems,
  onVoidTableOrder,
  showToast
}) => {
  const [selectedZone, setSelectedZone] = useState<TableZone>('all');
  const [isZoneDropdownOpen, setIsZoneDropdownOpen] = useState<boolean>(false);
  const zoneDropdownRef = useRef<HTMLDivElement>(null);
  
  // Search query for orderNo / table code / dish name
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected table for detailed Dish Progress & Flow Nodes view
  const [selectedTableForDetail, setSelectedTableForDetail] = useState<TableItem | null>(null);
  const [detailViewMode, setDetailViewMode] = useState<'split' | 'fullscreen'>('split');

  // Modals state
  const [activeModal, setActiveModal] = useState<'open' | 'bill' | 'transfer' | 'addWaiting' | 'manualTransfer' | 'cleanPrompt' | 'voidOrder' | null>(null);
  const [isBatchPrintModalOpen, setIsBatchPrintModalOpen] = useState<boolean>(false);
  const [isMobileTableActionsOpen, setIsMobileTableActionsOpen] = useState<boolean>(false);
  const [selectedTable, setSelectedTable] = useState<TableItem | null>(null);
  const [activeSynergySession, setActiveSynergySession] = useState<TableSession | null>(null);

  // Void Order Modal State
  const [voidTargetTable, setVoidTargetTable] = useState<TableItem | null>(null);
  const [voidReason, setVoidReason] = useState<string>('顾客退单/未就餐离店');
  const [customVoidReason, setCustomVoidReason] = useState<string>('');
  const [voidTargetStatus, setVoidTargetStatus] = useState<'idle' | 'cleaning'>('idle');
  
  // Waiting Queue & Auto-Transfer State
  const [waitingQueue, setWaitingQueue] = useState<WaitingTableItem[]>(() => getWaitingQueue());
  const [autoTransferOnClean, setAutoTransferOnClean] = useState<boolean>(() => getAutoTransferConfig());

  // Add Waiting Form State
  const [waitGuests, setWaitGuests] = useState<number>(2);
  const [waitGuestName, setWaitGuestName] = useState<string>('');
  const [waitPhone, setWaitPhone] = useState<string>('');
  const [waitZone, setWaitZone] = useState<string>('餐车外摆区');

  // Manual Transfer Waiting Form State
  const [waitingToTransfer, setWaitingToTransfer] = useState<WaitingTableItem | null>(null);
  const [transferTargetTableId, setTransferTargetTableId] = useState<string>('');

  // Clean Prompt State (When manual mode cleans a table and waiting queue is not empty)
  const [cleanPromptTable, setCleanPromptTable] = useState<TableItem | null>(null);
  const [cleanPromptCandidates, setCleanPromptCandidates] = useState<WaitingTableItem[]>([]);

  // Open Table Form State
  const [openGuests, setOpenGuests] = useState<number>(2);
  const [openServer, setOpenServer] = useState<string>('小林 (No.04)');

  // Bill Checkout Form State
  const [billDiscount, setBillDiscount] = useState<number>(1.0); // 1.0 = no discount, 0.9 = 9折
  const [isAaSplit, setIsAaSplit] = useState<boolean>(false);
  const [aaGuestCount, setAaGuestCount] = useState<number>(2);

  // Transfer Form State
  const [targetTableId, setTargetTableId] = useState<string>('');

  // Sync waiting queue and auto transfer config from storage events
  useEffect(() => {
    const handleQueueUpdated = (e: Event) => {
      const detail = (e as CustomEvent<WaitingTableItem[]>).detail;
      if (detail && Array.isArray(detail)) {
        setWaitingQueue(detail);
      } else {
        setWaitingQueue(getWaitingQueue());
      }
    };
    const handleAutoTransferConfig = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      if (typeof detail === 'boolean') {
        setAutoTransferOnClean(detail);
      } else {
        setAutoTransferOnClean(getAutoTransferConfig());
      }
    };
    window.addEventListener('obsidian_waiting_queue_updated', handleQueueUpdated);
    window.addEventListener('obsidian_auto_transfer_config_changed', handleAutoTransferConfig);
    return () => {
      window.removeEventListener('obsidian_waiting_queue_updated', handleQueueUpdated);
      window.removeEventListener('obsidian_auto_transfer_config_changed', handleAutoTransferConfig);
    };
  }, []);

  // Handle Clean Complete with Auto or Manual Transfer
  const handleCleanComplete = (tbl: TableItem) => {
    const activeWaitings = waitingQueue.filter((w) => w.status === 'waiting');

    if (autoTransferOnClean && activeWaitings.length > 0) {
      // 自动纳入转移
      const res = onTableCleanedRelease(tbl.id);
      if (res.transferred && res.waitingItem && res.updatedTable) {
        // 📢 语音叫号通知等位客人就座
        voiceAlerts.speakText(
          `请等位单号 ${res.waitingItem.code}，${res.waitingItem.guests}位贵宾，到 ${res.updatedTable.code} 号桌就座用餐！`,
          { chimeType: 'call' }
        );
        showToast(`【保洁自动转移】桌台 ${res.updatedTable.code} 已自动纳入等位 ${res.waitingItem.code} (${res.waitingItem.guests}人) 入座并语音叫号！`);
      } else {
        onReleaseTable(tbl.id);
        showToast(`桌台 ${tbl.code} 保洁完成，已恢复为空闲状态！`);
      }
    } else if (!autoTransferOnClean && activeWaitings.length > 0) {
      // 手动纳入转移提示弹窗
      setCleanPromptTable(tbl);
      setCleanPromptCandidates(activeWaitings);
      setActiveModal('cleanPrompt');
    } else {
      onReleaseTable(tbl.id);
      showToast(`桌台 ${tbl.code} 保洁完成，已恢复为空闲状态！`);
    }
  };

  // Open manual transfer modal for a waiting entry
  const handleOpenManualTransfer = (w: WaitingTableItem) => {
    setWaitingToTransfer(w);
    // 优先选择空闲桌台
    const idleTbls = tables.filter((t) => t.status === 'idle');
    setTransferTargetTableId(idleTbls.length > 0 ? idleTbls[0].id : (tables[0]?.id || ''));
    setActiveModal('manualTransfer');
  };

  // Close zone dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (zoneDropdownRef.current && !zoneDropdownRef.current.contains(event.target as Node)) {
        setIsZoneDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Hardware Barcode Scanner Listener for Tables & Member Checkout
  useEffect(() => {
    const unsub = globalScannerEngine.subscribe((result) => {
      if (result.type === 'table' && result.matchedData) {
        const tbl = result.matchedData as TableItem;
        if (tbl.status === 'idle') {
          handleOpenModal(tbl);
          showToast(`[扫码枪] 识别桌台 ${tbl.name}，已打开开台弹窗`);
        } else if (tbl.status === 'dining') {
          handleBillModal(tbl);
          showToast(`[扫码枪] 识别桌台 ${tbl.name}，已打开结账单`);
        }
      } else if (result.type === 'member' && activeModal === 'bill') {
        setBillDiscount(0.88);
        showToast(`[扫码枪] 识别会员卡，已自动应用 8.8 折专属 VIP 优惠！`);
      }
    });
    return () => unsub();
  }, [tables, activeModal]);

  // 跨组件联动总线监听 (KDS 出餐同步 / 菜品售罄 / 餐车转场联动)
  useEffect(() => {
    const unsubKds = merchantEventBus.on('merchant:kds_dish_completed', (payload) => {
      // 当 KDS 出餐时，自动同步至桌台列表
      const latestTables = safeGetStorage<TableItem[]>('obsidian_merchant_tables', []);
      if (latestTables.length > 0) {
        latestTables.forEach((t) => {
          const match = payload.ticketNo.includes(t.code) || (t.orderNo && t.orderNo.includes(payload.ticketNo.replace(/^#/, '')));
          if (match && onUpdateTable) {
            onUpdateTable(t);
          }
        });
      }
    });

    const unsubSoldOut = merchantEventBus.on('merchant:dish_sold_out', (payload) => {
      if (payload.isSoldOut) {
        // 校验当前在座桌台是否点了该菜品
        const affectedTables = tables.filter((t) =>
          t.status === 'dining' && t.orderItems?.some((it) => it.name === payload.dishName && it.serveStatus !== 'served')
        );
        if (affectedTables.length > 0) {
          const codes = affectedTables.map((t) => t.code).join('、');
          showToast(`⚠️【沽清预警】「${payload.dishName}」已沽清，在座桌台（${codes}）包含尚未出餐项目，请及时协调换菜！`);
        }
      }
    });

    const unsubStall = merchantEventBus.on('merchant:stall_relocated', (payload) => {
      showToast(`🚚【餐车已转场至 ${payload.stallName}】桌台建议容量: ${payload.maxTables} 桌，已联动重置外摆区！`);
    });

    return () => {
      unsubKds();
      unsubSoldOut();
      unsubStall();
    };
  }, [tables, onUpdateTable]);

  // If detail view is open in fullscreen mode, render TableDishProgressView
  if (selectedTableForDetail && detailViewMode === 'fullscreen') {
    const freshTable = tables.find((t) => t.id === selectedTableForDetail.id) || selectedTableForDetail;
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between bg-white border border-neutral-200 px-3.5 py-2.5 rounded-lg shadow-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono font-black text-xs bg-neutral-900 text-white px-2 py-0.5 rounded-md">
              {freshTable.code} 桌
            </span>
            <span className="text-xs text-neutral-800 font-bold">全屏传菜与出餐大屏模式</span>
          </div>
          <button
            type="button"
            onClick={() => setDetailViewMode('split')}
            className="px-3 py-1.5 text-xs font-bold bg-neutral-900 text-white rounded-md hover:bg-black transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>还原右侧画中画分栏</span>
          </button>
        </div>
        <TableDishProgressView
          table={freshTable}
          onBack={() => setSelectedTableForDetail(null)}
          onUpdateTable={(updated) => {
            onUpdateTable?.(updated);
            setSelectedTableForDetail(updated);
            if (updated.orderNo && updated.orderItems && onSyncOrderItems) {
              onSyncOrderItems(updated.orderNo, updated.orderItems);
            }
          }}
          onOpenBillModal={(tbl) => {
            setSelectedTableForDetail(null);
            handleBillModal(tbl);
          }}
          onVoidOrder={(tbl) => {
            setSelectedTableForDetail(null);
            handleVoidOrderModal(tbl);
          }}
          showToast={showToast}
        />
      </div>
    );
  }

  const zoneOptions: { id: TableZone; label: string; count: number }[] = [
    { id: 'all', label: '全部台位', count: tables.length },
    { id: 'patio', label: '餐车外摆区', count: tables.filter((t) => t.zone === 'patio').length },
    { id: 'hall', label: '室内散座', count: tables.filter((t) => t.zone === 'hall').length },
    { id: 'booth', label: '雅致卡座', count: tables.filter((t) => t.zone === 'booth').length }
  ];

  const currentZone = zoneOptions.find((z) => z.id === selectedZone) || zoneOptions[0];

  const filteredTables = tables.filter((t) => {
    if (selectedZone !== 'all' && t.zone !== selectedZone) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const matchOrderNo = t.orderNo?.toLowerCase().includes(q);
    const matchCode = t.code.toLowerCase().includes(q);
    const matchName = t.name.toLowerCase().includes(q);
    const matchServer = t.serverName?.toLowerCase().includes(q);
    const matchDishes = t.orderItems?.some((d) => d.name.toLowerCase().includes(q));

    // Also match associated dine-in order (e.g. order 7078 bound to table A2)
    const matchDineInOrder = (orders || []).some((o) => {
      const channel = resolveOrderChannelType(o);
      if (channel !== 'dine_in') return false;
      const isThisTable = (o.tableCode && o.tableCode.toLowerCase() === t.code.toLowerCase()) ||
        (o.tableId && o.tableId === t.id) ||
        (t.code === 'A2' && (normalizeOrderKey(o.orderNo) === '7078' || normalizeOrderKey(o.id) === '7078'));
      if (!isThisTable) return false;
      return o.orderNo.toLowerCase().includes(q) || (o.items && o.items.some(it => it.name.toLowerCase().includes(q)));
    });

    return Boolean(matchOrderNo || matchCode || matchName || matchServer || matchDishes || matchDineInOrder);
  });

  const idleCount = tables.filter((t) => t.status === 'idle').length;
  const diningCount = tables.filter((t) => t.status === 'dining').length;
  const cleaningCount = tables.filter((t) => t.status === 'cleaning').length;
  const reservedCount = tables.filter((t) => t.status === 'reserved').length;

  const handleOpenModal = (tbl: TableItem) => {
    setSelectedTable(tbl);
    setOpenGuests(tbl.capacity || 2);
    setActiveModal('open');
  };

  const handleBillModal = (tbl: TableItem) => {
    setSelectedTable(tbl);
    setBillDiscount(1.0);
    setIsAaSplit(false);
    setAaGuestCount(tbl.currentGuests || 2);
    setActiveModal('bill');
  };

  const handleTransferModal = (tbl: TableItem) => {
    setSelectedTable(tbl);
    const availableTarget = tables.find((t) => t.status === 'idle' && t.id !== tbl.id);
    setTargetTableId(availableTarget ? availableTarget.id : '');
    setActiveModal('transfer');
  };

  const handleVoidOrderModal = (tbl: TableItem) => {
    setVoidTargetTable(tbl);
    setVoidReason('顾客退单/未就餐离店');
    setCustomVoidReason('');
    setVoidTargetStatus('idle');
    setActiveModal('voidOrder');
  };

  const handleConfirmVoidOrder = () => {
    if (!voidTargetTable) return;

    const finalReason = voidReason === '自定义输入' ? (customVoidReason.trim() || '前台手动作废') : voidReason;

    // 使用统一业务领域事务管道执行原子级作废 (级联更新桌台 + 订单 + KDS工单 + 版本快照)
    if (onVoidTableOrder) {
      onVoidTableOrder(voidTargetTable.id, finalReason, voidTargetStatus);
    } else {
      businessTransactionEngine.executeVoidTableOrder({
        tableId: voidTargetTable.id,
        reason: finalReason,
        targetStatus: voidTargetStatus,
        operatorName: '前台值班领班',
        showToast
      });
    }

    setActiveModal(null);
    setVoidTargetTable(null);
  };

  // Quick open table button helper
  const handleQuickOpenTable = () => {
    const firstIdle = tables.find(t => t.status === 'idle');
    if (firstIdle) {
      handleOpenModal(firstIdle);
    } else {
      showToast('当前台位已全部满座，可引导顾客在前台取等位候补号！');
    }
  };

  // Clean all cleaning tables helper
  const handleCleanAllTables = () => {
    const cleaningTables = tables.filter(t => t.status === 'cleaning');
    if (cleaningTables.length === 0) {
      showToast('当前没有处于清洁中的桌台');
      return;
    }
    cleaningTables.forEach(t => onReleaseTable(t.id));
    showToast(`已一键完成 ${cleaningTables.length} 张桌台保洁归位，全部恢复为空闲就绪！`);
  };

  return (
    <div className="space-y-3.5 text-xs">
      {/* Top Filter & Search Bar (Deck Style) */}
      <div className="bg-white p-2.5 sm:p-3 rounded-lg border border-neutral-200 flex items-center justify-between gap-3 flex-wrap lg:flex-nowrap shadow-xs">
        <div className="flex items-center gap-2 sm:gap-2.5 flex-1 w-full sm:w-auto min-w-0 flex-wrap sm:flex-nowrap">
          {/* Zone Dropdown Selector */}
          <div className="relative shrink-0" ref={zoneDropdownRef}>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-neutral-700 shrink-0 text-xs">台区:</span>
              <button
                type="button"
                onClick={() => setIsZoneDropdownOpen(!isZoneDropdownOpen)}
                className="px-3 py-1.5 bg-white hover:bg-neutral-50 border border-neutral-200 hover:border-neutral-900 rounded-full text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs shrink-0"
              >
                <span className="text-neutral-900">{currentZone.label}</span>
                <span className="text-[10px] font-mono font-black px-2 py-0.2 rounded-full bg-neutral-900 text-white">
                  {currentZone.count}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${
                    isZoneDropdownOpen ? 'rotate-180 text-neutral-900' : ''
                  }`}
                />
              </button>
            </div>

            {/* Zone Dropdown Menu */}
            {isZoneDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-[200px] bg-white border border-neutral-200 rounded-lg shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-100">
                  选择台位区域
                </div>
                <div className="py-1 space-y-0.5 px-1.5">
                  {zoneOptions.map((z) => {
                    const isSelected = selectedZone === z.id;
                    return (
                      <button
                        key={z.id}
                        type="button"
                        onClick={() => {
                          setSelectedZone(z.id);
                          setIsZoneDropdownOpen(false);
                        }}
                        className={`w-full px-2.5 py-1.5 rounded-full text-xs font-bold flex items-center justify-between gap-2 transition-colors cursor-pointer text-left ${
                          isSelected
                            ? 'bg-neutral-900 text-white'
                            : 'text-neutral-700 hover:bg-neutral-100'
                        }`}
                      >
                        <span>{z.label}</span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded-full ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-600'
                            }`}
                          >
                            {z.count}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Search Input for OrderNo, Table Code, Dish Name */}
          <div className="relative flex-1 min-w-0 w-full sm:w-auto max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索订单号 (如 UR-DIN-9821)、桌台 (A1) 或菜品..."
              className="w-full pl-9 pr-8 py-1.5 bg-white hover:bg-neutral-50 focus:bg-white border border-neutral-200 focus:border-neutral-900 rounded-full text-xs text-neutral-900 placeholder:text-neutral-400 transition-colors focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-900 p-0.5 cursor-pointer"
                title="清除搜索"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 4 Status Legends & Batch Print Button */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs text-neutral-500 flex-wrap sm:flex-nowrap w-full lg:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto hide-scrollbar flex-nowrap shrink-0 max-w-full">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200 font-bold whitespace-nowrap shrink-0">
              <span className="w-2 h-2 rounded-full bg-neutral-400 shrink-0" />
              <span className="whitespace-nowrap">空闲 ({idleCount})</span>
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-neutral-900 text-white border border-neutral-900 font-black whitespace-nowrap shrink-0 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
              <span className="whitespace-nowrap">就餐中 ({diningCount})</span>
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-800 border border-neutral-300 font-bold whitespace-nowrap shrink-0">
              <span className="w-2 h-2 rounded-full bg-neutral-600 shrink-0" />
              <span className="whitespace-nowrap">清洁中 ({cleaningCount})</span>
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-neutral-50 text-neutral-700 border border-dashed border-neutral-300 font-bold whitespace-nowrap shrink-0">
              <span className="w-2 h-2 rounded-full bg-neutral-400 shrink-0" />
              <span className="whitespace-nowrap">已预订 ({reservedCount})</span>
            </span>
          </div>

          {/* Action Buttons: Mobile Dropdown Menu (手机端下拉菜单式) & Desktop Tactile Buttons */}
          {/* Mobile Actions: sm:hidden */}
          <div className="flex sm:hidden items-center gap-1.5 shrink-0 ml-auto">
            <button
              type="button"
              onClick={handleQuickOpenTable}
              className="px-3 py-1.5 bg-neutral-900 hover:bg-black text-white rounded-full font-black text-xs flex items-center gap-1 transition-all shadow-[0_2px_0_#404040] active:shadow-none cursor-pointer whitespace-nowrap shrink-0"
              title="快速开台"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>快速开台</span>
            </button>

            <div className="relative">
              <button
                type="button"
                id="mobile-table-actions-trigger"
                onClick={() => setIsMobileTableActionsOpen((prev) => !prev)}
                className="px-2.5 py-1.5 bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-900 rounded-full font-bold text-xs flex items-center gap-1 transition-all shadow-2xs cursor-pointer whitespace-nowrap shrink-0"
                aria-label="更多桌务操作"
                aria-expanded={isMobileTableActionsOpen}
              >
                <span>桌务</span>
                <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${isMobileTableActionsOpen ? 'rotate-180 text-neutral-900' : ''}`} />
              </button>

              {isMobileTableActionsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsMobileTableActionsOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-neutral-200 rounded-lg shadow-xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-150 space-y-1 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileTableActionsOpen(false);
                        handleCleanAllTables();
                      }}
                      className="w-full px-2.5 py-2 rounded-md text-left hover:bg-neutral-100 text-neutral-800 flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Brush className="w-3.5 h-3.5 text-neutral-600" />
                        <span>一键保洁全场</span>
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-neutral-100 text-neutral-700">
                        {cleaningCount}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileTableActionsOpen(false);
                        setIsBatchPrintModalOpen((prev) => !prev);
                      }}
                      className="w-full px-2.5 py-2 rounded-md text-left hover:bg-neutral-100 text-neutral-800 flex items-center gap-2 cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5 text-neutral-600" />
                      <span>{isBatchPrintModalOpen ? '收起立牌中心' : '打印桌码立牌'}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Desktop Actions: hidden sm:flex */}
          <div className="hidden sm:flex items-center gap-1.5 flex-wrap sm:ml-auto shrink-0">
            {/* Quick Open Table Button (UIverse Tactile 3D style) */}
            <button
              type="button"
              onClick={handleQuickOpenTable}
              className="px-3.5 py-1.5 bg-neutral-900 hover:bg-black text-white rounded-full font-black text-xs flex items-center gap-1 transition-all active:translate-y-0.5 shadow-[0_2px_0_#404040] active:shadow-none cursor-pointer whitespace-nowrap shrink-0"
              title="自动寻找空闲桌台并快速开台"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">快速开台</span>
            </button>

            {/* Clean All Cleaning Tables Button */}
            <button
              type="button"
              onClick={handleCleanAllTables}
              className={`px-3 py-1.5 rounded-full font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border shadow-2xs active:translate-y-0.5 whitespace-nowrap shrink-0 ${
                cleaningCount > 0
                  ? 'bg-neutral-100 text-neutral-900 border-neutral-300 hover:bg-neutral-200'
                  : 'bg-white text-neutral-500 border-neutral-200 hover:bg-neutral-50'
              }`}
              title="将全部清洁中的桌台一键恢复为空闲状态"
            >
              <Brush className="w-3.5 h-3.5 text-neutral-700 shrink-0" />
              <span className="whitespace-nowrap">一键保洁 ({cleaningCount})</span>
            </button>

            {/* Batch Print Table Stand QR Button */}
            <button
              type="button"
              onClick={() => setIsBatchPrintModalOpen((prev) => !prev)}
              className={`px-3.5 py-1.5 rounded-full font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 active:translate-y-0.5 ${
                isBatchPrintModalOpen
                  ? 'bg-neutral-800 text-white ring-2 ring-neutral-900 shadow-none'
                  : 'bg-neutral-900 hover:bg-black text-white shadow-[0_2px_0_#404040] active:shadow-none'
              }`}
              title="生成并打印所有桌台亚克力立牌二维码"
            >
              <QrCode className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">{isBatchPrintModalOpen ? '收起立牌中心' : '打印桌码立牌'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Table Batch Print QR Stand Center */}
      {isBatchPrintModalOpen && (
        <TableBatchPrintModal
          isOpen={isBatchPrintModalOpen}
          onClose={() => setIsBatchPrintModalOpen(false)}
          tables={tables}
          isEmbedded={true}
        />
      )}

      {/* Waitlist Queue & Auto/Manual Transfer Control Hub */}
      {(() => {
        const activeWaitings = waitingQueue.filter((w) => w.status === 'waiting');
        const transferredWaitings = waitingQueue.filter((w) => w.status === 'transferred');

        return (
          <div className="bg-white p-3 rounded-lg border border-neutral-200 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap border-b border-neutral-100 pb-2.5">
              {/* Left Title & Status */}
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-neutral-900 text-white rounded-md">
                  <ListOrdered className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-xs text-neutral-900">等位桌号队列</span>
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md ${
                        activeWaitings.length > 0
                          ? 'bg-neutral-900 text-white'
                          : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                      }`}
                    >
                      {activeWaitings.length > 0 ? `${activeWaitings.length} 组等位中` : '暂无等位'}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-neutral-500 leading-tight mt-0.5">
                    支持食客先取等位号先行点单备餐，桌台清理后可自动或手动转移入座
                  </p>
                </div>
              </div>

              {/* Center & Right: Auto-Transfer Toggle & Add Button */}
              <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap sm:flex-nowrap w-full sm:w-auto justify-between sm:justify-end">
                {/* Auto Transfer Toggle */}
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-md cursor-pointer transition-colors whitespace-nowrap shrink-0"
                  onClick={() => {
                    const nextVal = !autoTransferOnClean;
                    setAutoTransferOnClean(nextVal);
                    setAutoTransferConfig(nextVal);
                    showToast(
                      nextVal
                        ? '已开启【清理后自动转移】：桌台保洁完成后将自动为等位客人分配入座！'
                        : '已切换为【手动转移模式】：桌台保洁完成后将弹出转移推荐供手动确认。'
                    );
                  }}
                  title="点击切换：桌台保洁完成后是否自动纳入等待队列的食客"
                >
                  <span className="text-[11px] font-medium text-neutral-600 whitespace-nowrap">
                    <span className="hidden sm:inline">桌台清理后</span>自动转移:
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        autoTransferOnClean ? 'bg-neutral-900' : 'bg-neutral-300'
                      }`}
                    />
                    <span
                      className={`text-xs font-mono font-bold whitespace-nowrap ${
                        autoTransferOnClean ? 'text-neutral-900' : 'text-neutral-500'
                      }`}
                    >
                      {autoTransferOnClean ? '自动转移 (开)' : '手动确认 (关)'}
                    </span>
                  </div>
                  {autoTransferOnClean ? (
                    <ToggleRight className="w-4 h-4 text-neutral-900 shrink-0" />
                  ) : (
                    <ToggleLeft className="w-4 h-4 text-neutral-400 shrink-0" />
                  )}
                </div>

                {/* Add Waiting Table Button */}
                <button
                  type="button"
                  onClick={() => {
                    setWaitGuests(2);
                    setWaitGuestName('');
                    setWaitPhone('');
                    setWaitZone('餐车外摆区');
                    setActiveModal('addWaiting');
                  }}
                  className="px-3 py-1.5 bg-neutral-900 hover:bg-black text-white rounded-md font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-[0_2px_0_#404040] active:translate-y-0.5 active:shadow-none transition-all shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ 登记等位桌号</span>
                </button>
              </div>
            </div>

            {/* Waiting Queue Cards or Empty State */}
            {activeWaitings.length === 0 ? (
              <div className="py-2.5 px-3 bg-neutral-50 rounded-md border border-dashed border-neutral-200 flex items-center justify-between text-xs text-neutral-600">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
                  <span>当前无等位排队客单。现有桌台翻台与就餐流转正常。</span>
                </div>
                {transferredWaitings.length > 0 && (
                  <span className="text-[10.5px] text-neutral-500 font-mono">
                    今日已成功转移入座 {transferredWaitings.length} 组等位客人
                  </span>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {activeWaitings.map((w) => {
                  const hasOrder = Boolean(w.orderNo || (w.orderItems && w.orderItems.length > 0));
                  return (
                    <div
                      key={w.id}
                      className="p-2.5 bg-white border border-neutral-200 rounded-lg shadow-xs flex flex-col justify-between gap-2 hover:border-neutral-900 transition-all relative group"
                    >
                      {/* Card Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-xs bg-neutral-900 text-white px-1.5 py-0.2 rounded-md">
                            {w.code}
                          </span>
                          <span className="font-bold text-xs text-neutral-900">
                            {w.guestName || '等位客人'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                          <span className="flex items-center gap-0.5 font-bold text-neutral-700">
                            <Users className="w-3 h-3 text-neutral-500" />
                            <span>{w.guests}人</span>
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-0.5 text-neutral-700 font-mono font-bold">
                            <Clock className="w-3 h-3" />
                            <span>{w.elapsedMinutes || 1}m</span>
                          </span>
                        </div>
                      </div>

                      {/* Card Body: Phone, Zone & Pre-order Status */}
                      <div className="space-y-1 text-[11px] text-neutral-600">
                        <div className="flex items-center justify-between text-[10.5px]">
                          <span className="text-neutral-500">
                            电话: {w.phone || '到店食客'} · 意向: {w.preferredZone || '外摆区'}
                          </span>
                          <span className="text-neutral-400 font-mono">取号 {w.createdAt}</span>
                        </div>

                        {hasOrder ? (
                          <div className="bg-neutral-50 p-1.5 rounded-md border border-neutral-200 text-neutral-800 flex items-center justify-between">
                            <div className="flex items-center gap-1 font-bold">
                              <UtensilsCrossed className="w-3 h-3 text-neutral-700" />
                              <span>
                                提前备餐中 ({w.orderItems?.length || 1}道菜)
                              </span>
                            </div>
                            <span className="font-mono font-black text-neutral-900">
                              ¥{(w.totalAmount || 0).toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <div className="bg-neutral-50 p-1 rounded-md text-neutral-500 text-[10.5px]">
                            尚未提前点餐 · 等待桌台分配
                          </div>
                        )}
                      </div>

                      {/* Card Actions: Manual Transfer & Cancel */}
                      <div className="flex items-center gap-1.5 pt-1 border-t border-neutral-100">
                        <button
                          type="button"
                          onClick={() => handleOpenManualTransfer(w)}
                          className="flex-1 py-1 px-2 bg-neutral-900 hover:bg-black text-white rounded-md font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-all shadow-[0_2px_0_#404040] active:translate-y-0.5 active:shadow-none"
                        >
                          <ArrowRightLeft className="w-3 h-3" />
                          <span>手动纳入转移</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            cancelWaitingTable(w.id);
                            showToast(`等位号 ${w.code} 已取消！`);
                          }}
                          className="py-1 px-2 bg-white hover:bg-rose-50 text-neutral-500 hover:text-rose-600 border border-neutral-200 rounded-md text-[11px] cursor-pointer transition-colors"
                          title="取消排队"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* 智能排队叫号与空闲台位敏捷撮合中心 (Smart Queue Match Strip) */}
      {(() => {
        const activeWaitings = waitingQueue.filter((w) => w.status === 'waiting');
        const idleTables = tables.filter((t) => t.status === 'idle');
        if (activeWaitings.length === 0 || idleTables.length === 0) return null;

        const bestWait = activeWaitings[0];
        // 匹配容纳人数相符的最适空桌
        const bestMatchTable =
          [...idleTables].sort((a, b) => {
            const fitA = a.capacity >= bestWait.guests ? 1 : 0;
            const fitB = b.capacity >= bestWait.guests ? 1 : 0;
            if (fitA !== fitB) return fitB - fitA;
            return Math.abs(a.capacity - bestWait.guests) - Math.abs(b.capacity - bestWait.guests);
          })[0] || idleTables[0];

        return (
          <div className="bg-neutral-900 text-white px-3.5 py-2.5 rounded-lg border border-neutral-800 shadow-md flex items-center justify-between gap-3 flex-wrap animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="flex items-center gap-1 font-black text-neutral-900 bg-white px-2 py-0.5 rounded-md border border-neutral-200">
                <Zap className="w-3.5 h-3.5 text-neutral-900 fill-neutral-900" />
                <span>智能等位撮合推荐</span>
              </span>
              <span className="text-neutral-300">
                等位 <strong className="text-white font-mono text-xs font-black underline decoration-neutral-400 underline-offset-2">{bestWait.code} 号</strong>
                （{bestWait.guests}人 · 已候补 {bestWait.elapsedMinutes || 1}m）匹配空闲桌台
                <strong className="text-white font-black ml-1">{bestMatchTable.code} 桌</strong> ({bestMatchTable.name} · {bestMatchTable.capacity}人位)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const res = businessTransactionEngine.executeMatchQueueToTable({
                    queueItemId: bestWait.id,
                    tableId: bestMatchTable.id,
                    guestCount: bestWait.guests,
                    showToast
                  });
                  if (res.success && res.table) {
                    onUpdateTable?.(res.table);
                  }
                }}
                className="px-3.5 py-1.5 bg-white hover:bg-neutral-100 text-neutral-900 font-black text-xs rounded-md shadow-[0_2px_0_#a3a3a3] active:translate-y-0.5 active:shadow-none flex items-center gap-1.5 cursor-pointer transition-all"
                title="呼叫该等位顾客并直接开台安排就座"
              >
                <Megaphone className="w-3.5 h-3.5" />
                <span>一键叫号·入座开台</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Master-Detail Split Container: Tables Grid (62%) + Dish Progress Side Panel (38%) */}
      <div className="flex flex-col lg:flex-row gap-3 items-start w-full">
        {/* Left: Table Cards Grid */}
        <div className={selectedTableForDetail ? 'w-full lg:w-[62%] min-w-0 transition-all' : 'w-full transition-all'}>
          <div className={`grid gap-3 ${selectedTableForDetail ? 'grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'}`}>
        {filteredTables.map((tbl) => {
          // Check if there is a dine-in order explicitly matched to this table
          const matchedDineInOrder = (orders || []).find((o) => {
            const channel = resolveOrderChannelType(o);
            if (channel !== 'dine_in') return false;
            // 终态订单(已完成/已退款/已取消/商家拒单)不再占用桌台，允许翻台恢复
            if (['completed', 'refunded', 'cancelled', 'merchant_rejected'].includes(o.status)) return false;
            if (tbl.orderNo && (o.orderNo === tbl.orderNo || o.orderNo === `#${tbl.orderNo}` || tbl.orderNo.includes(o.orderNo))) return true;
            if (o.tableCode && o.tableCode.toUpperCase() === tbl.code.toUpperCase()) return true;
            if (o.tableId && o.tableId === tbl.id) return true;
            if (tbl.code === 'A2' && (normalizeOrderKey(o.orderNo) === '7078' || normalizeOrderKey(o.id) === '7078')) return true;
            return false;
          });

          const isEffectiveDining = tbl.status === 'dining' || Boolean(matchedDineInOrder);
          const isIdle = tbl.status === 'idle' && !matchedDineInOrder;
          const isDining = isEffectiveDining;
          const isCleaning = tbl.status === 'cleaning' && !matchedDineInOrder;
          const isReserved = tbl.status === 'reserved' && !matchedDineInOrder;

          const orderNo = matchedDineInOrder
            ? matchedDineInOrder.orderNo.replace(/^#/, '')
            : (tbl.orderNo || `UR-DIN-${tbl.code}-${tbl.elapsedMinutes || '01'}`);

          const orderItems = (tbl.orderItems && tbl.orderItems.length > 0)
            ? tbl.orderItems
            : (matchedDineInOrder
                ? matchedDineInOrder.items.map((it, idx) => ({
                    id: `matched-dish-${idx}`,
                    dishId: it.dishId || `dish-${idx}`,
                    name: it.name,
                    price: it.price,
                    quantity: it.quantity,
                    kitchenStation: 'charcoal' as const,
                    serveStatus: (matchedDineInOrder.stepIndex && matchedDineInOrder.stepIndex >= 3) ? 'served' as const : 'cooking' as const
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

          return (
            <MonoTableCard
              key={tbl.id}
              tbl={tbl}
              orderNo={orderNo}
              matchedDineInOrder={matchedDineInOrder}
              selectedTableForDetail={selectedTableForDetail}
              setSelectedTableForDetail={setSelectedTableForDetail}
              handleOpenModal={handleOpenModal}
              handleBillModal={handleBillModal}
              handleTransferModal={handleTransferModal}
              handleVoidOrderModal={handleVoidOrderModal}
              handleCleanComplete={handleCleanComplete}
              setIsBatchPrintModalOpen={setIsBatchPrintModalOpen}
              waitingQueue={waitingQueue}
              autoTransferOnClean={autoTransferOnClean}
              showToast={showToast}
              setActiveSynergySession={setActiveSynergySession}
              onUpdateTable={onUpdateTable}
              onOpenTable={onOpenTable}
            />
          );
        })}
          </div>
        </div>

        {/* Right: Picture-in-Picture Table Dish Progress Panel */}
        {selectedTableForDetail && (
          <div
            id="pip-dish-progress-panel"
            className="w-full lg:w-[38%] sticky top-2 z-20 h-[82vh] sm:h-[85vh] lg:h-[88vh] max-h-[88vh] overflow-hidden rounded-lg border border-neutral-200 shadow-xs bg-white flex flex-col animate-in fade-in slide-in-from-right-3 duration-200"
          >
            <div className="flex items-center justify-between bg-neutral-900 text-white px-3.5 py-2.5 border-b border-neutral-800 shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-xs bg-white text-neutral-900 px-2 py-0.5 rounded-md">
                  {selectedTableForDetail.code} 桌
                </span>
                <span className="text-xs font-bold text-neutral-200">画中画出餐协同</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setDetailViewMode('fullscreen')}
                  className="p-1 hover:bg-neutral-800 rounded-md text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  title="放大为全屏出餐大屏"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTableForDetail(null)}
                  className="p-1 hover:bg-neutral-800 rounded-md text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  title="关闭画中画分栏"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {(() => {
              const freshTable = tables.find((t) => t.id === selectedTableForDetail.id) || selectedTableForDetail;
              return (
                <TableDishProgressView
                  isEmbedded={true}
                  table={freshTable}
                  onBack={() => setSelectedTableForDetail(null)}
                  onUpdateTable={(updated) => {
                    onUpdateTable?.(updated);
                    setSelectedTableForDetail(updated);
                    if (updated.orderNo && updated.orderItems && onSyncOrderItems) {
                      onSyncOrderItems(updated.orderNo, updated.orderItems);
                    }
                  }}
                  onOpenBillModal={(tbl) => {
                    handleBillModal(tbl);
                  }}
                  onVoidOrder={(tbl) => {
                    handleVoidOrderModal(tbl);
                  }}
                  showToast={showToast}
                />
              );
            })()}
          </div>
        )}
      </div>

      {/* 1. Modal: 快速开台 */}
      {activeModal === 'open' && selectedTable && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-sm rounded-lg border border-neutral-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3.5 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-xs bg-neutral-900 text-white px-2 py-0.5 rounded-md">
                  {selectedTable.code}
                </span>
                <span className="font-black text-sm text-neutral-900">开台入座</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-neutral-400 hover:text-neutral-900 p-1 hover:bg-neutral-100 rounded-md cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs text-neutral-800">
              <div className="space-y-1">
                <label className="font-bold text-neutral-700 block">就餐人数选择:</label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 4, 6].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setOpenGuests(num)}
                      className={`py-2 rounded-md font-bold border text-center cursor-pointer transition-all ${
                        openGuests === num
                          ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                          : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                      }`}
                    >
                      {num} 人
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-700 block">值班服务员:</label>
                <select
                  value={openServer}
                  onChange={(e) => setOpenServer(e.target.value)}
                  className="w-full p-2 bg-neutral-50 hover:bg-white focus:bg-white border border-neutral-200 focus:border-neutral-900 rounded-md text-xs text-neutral-900 focus:outline-none transition-colors"
                >
                  <option value="小林 (No.04)">小林 (No.04) · 区域主管</option>
                  <option value="阿豪 (No.02)">阿豪 (No.02) · 资深侍应</option>
                  <option value="王店长 (No.01)">王店长 (No.01) · 领班总控</option>
                </select>
              </div>

              <div className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-200 text-[11px] text-neutral-700 space-y-0.5">
                <p className="font-bold text-neutral-900 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-neutral-900" />
                  <span>智能开台联动已就绪</span>
                </p>
                <p>确认开台后，桌边扫码立即可用，餐车厨房 KDS 同步建立联单。</p>
              </div>
            </div>

            <div className="p-3 bg-neutral-50 border-t border-neutral-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-3.5 py-1.5 bg-white text-neutral-700 border border-neutral-200 rounded-md font-bold cursor-pointer hover:bg-neutral-100 transition-colors shadow-2xs"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenTable(selectedTable.id, openGuests, openServer);
                  setActiveModal(null);
                  showToast(`桌台 ${selectedTable.code} 成功开台 (${openGuests}人)，桌码点餐已激活！`);
                }}
                className="px-4 py-1.5 bg-neutral-900 hover:bg-black text-white rounded-md font-black cursor-pointer shadow-[0_2px_0_#404040] active:translate-y-0.5 active:shadow-none transition-all"
              >
                确认开台
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal: 账单结账与 AA 均摊 */}
      {activeModal === 'bill' && selectedTable && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-md rounded-lg border border-neutral-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3.5 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-xs bg-neutral-900 text-white px-2 py-0.5 rounded-md">
                  {selectedTable.code}
                </span>
                <span className="font-black text-sm text-neutral-900">堂食结账</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-neutral-400 hover:text-neutral-900 p-1 hover:bg-neutral-100 rounded-md cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs max-h-[75vh] overflow-y-auto custom-scrollbar">
              {/* Order items list */}
              <div className="space-y-1.5">
                <span className="font-bold text-neutral-700 block">消费明细清单:</span>
                <div className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-200 space-y-1.5">
                  {(selectedTable.orderItems || []).map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-900 font-medium">{it.name}</span>
                        <span className="text-[10px] text-neutral-500 font-mono">x{it.quantity}</span>
                      </div>
                      <span className="font-mono font-black text-neutral-900">
                        ¥{(it.price * it.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discount Selection */}
              <div className="space-y-1">
                <label className="font-bold text-neutral-700 flex items-center gap-1">
                  <Percent className="w-3 h-3 text-neutral-700" />
                  <span>整单折扣优惠:</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: '无折扣', val: 1.0 },
                    { label: '9折', val: 0.9 },
                    { label: '8.8折', val: 0.88 },
                    { label: '8折 VIP', val: 0.8 }
                  ].map((d) => (
                    <button
                      key={d.label}
                      type="button"
                      onClick={() => setBillDiscount(d.val)}
                      className={`py-1.5 rounded-md font-bold border text-center cursor-pointer transition-all ${
                        billDiscount === d.val
                          ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                          : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* AA Split Toggle */}
              <div className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-neutral-900 flex items-center gap-1">
                    <Split className="w-3.5 h-3.5 text-neutral-700" />
                    <span>启用 AA 均摊计算器</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={isAaSplit}
                    onChange={(e) => setIsAaSplit(e.target.checked)}
                    className="w-4 h-4 accent-neutral-900 cursor-pointer"
                  />
                </div>

                {isAaSplit && (
                  <div className="flex items-center justify-between pt-1 border-t border-neutral-200 text-xs">
                    <span className="text-neutral-700 font-medium">均摊人数:</span>
                    <div className="flex items-center gap-2">
                      {[2, 3, 4, 5].map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => setAaGuestCount(cnt)}
                          className={`w-6 h-6 rounded-md font-mono font-black text-xs cursor-pointer transition-all ${
                            aaGuestCount === cnt
                              ? 'bg-neutral-900 text-white shadow-xs'
                              : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
                          }`}
                        >
                          {cnt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Calculation Summary */}
              {(() => {
                const rawTotal = selectedTable.totalAmount || 0;
                const finalTotal = rawTotal * billDiscount;
                const perPerson = isAaSplit ? finalTotal / aaGuestCount : finalTotal;

                return (
                  <div className="bg-neutral-100 p-3 rounded-lg border border-neutral-200 space-y-1.5">
                    <div className="flex items-center justify-between text-neutral-600">
                      <span>原价合计:</span>
                      <span className="line-through text-neutral-400 font-mono">¥{rawTotal.toFixed(2)}</span>
                    </div>
                    {billDiscount < 1.0 && (
                      <div className="flex items-center justify-between text-neutral-700 font-bold">
                        <span>折扣优惠减免:</span>
                        <span className="font-mono">-¥{(rawTotal - finalTotal).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm font-bold text-neutral-900 pt-1 border-t border-neutral-200">
                      <span>应收总金额:</span>
                      <span className="text-base font-black font-mono">¥{finalTotal.toFixed(2)}</span>
                    </div>
                    {isAaSplit && (
                      <div className="flex items-center justify-between text-xs font-bold text-neutral-900 bg-white p-2 rounded-md border border-neutral-200">
                        <span>AA 人均应付 ({aaGuestCount}人):</span>
                        <span className="text-sm font-black font-mono">¥{perPerson.toFixed(2)} /人</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="p-3 bg-neutral-50 border-t border-neutral-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-3.5 py-1.5 bg-white text-neutral-700 border border-neutral-200 rounded-md font-bold cursor-pointer hover:bg-neutral-100 transition-colors shadow-2xs"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  onCheckoutTable(selectedTable.id, billDiscount, isAaSplit);
                  setActiveModal(null);
                  showToast(`桌台 ${selectedTable.code} 结账完成并自动转为保洁状态，流水已归档！`);
                }}
                className="px-4 py-1.5 bg-neutral-900 hover:bg-black text-white rounded-md font-black text-xs cursor-pointer shadow-[0_2px_0_#404040] active:translate-y-0.5 active:shadow-none flex items-center gap-1.5 transition-all"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>确认结账</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal: 换桌并单 */}
      {activeModal === 'transfer' && selectedTable && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-sm rounded-lg border border-neutral-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3.5 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-xs bg-neutral-900 text-white px-2 py-0.5 rounded-md">
                  {selectedTable.code}
                </span>
                <span className="font-black text-sm text-neutral-900">换桌转单</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-neutral-400 hover:text-neutral-900 p-1 hover:bg-neutral-100 rounded-md cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs text-neutral-800">
              <p className="text-neutral-600">
                当前桌位: <strong className="text-neutral-900">{selectedTable.name} ({selectedTable.code})</strong>
              </p>

              <div className="space-y-1">
                <label className="font-bold text-neutral-700 block">目标转入桌台:</label>
                <select
                  value={targetTableId}
                  onChange={(e) => setTargetTableId(e.target.value)}
                  className="w-full p-2 bg-neutral-50 hover:bg-white focus:bg-white border border-neutral-200 focus:border-neutral-900 rounded-md text-xs text-neutral-900 focus:outline-none transition-colors"
                >
                  {tables
                    .filter((t) => t.id !== selectedTable.id && t.status === 'idle')
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.code} - {t.name} ({t.zoneLabel} · {t.capacity}座)
                      </option>
                    ))}
                </select>
              </div>

              <div className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-200 text-[11px] text-neutral-700">
                换桌后，原桌已点菜品、KDS 工单和挂账流水将无缝合并至新桌台，原桌自动转为待保洁。
              </div>
            </div>

            <div className="p-3 bg-neutral-50 border-t border-neutral-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-3.5 py-1.5 bg-white text-neutral-700 border border-neutral-200 rounded-md font-bold cursor-pointer hover:bg-neutral-100 transition-colors shadow-2xs"
              >
                取消
              </button>
              <button
                type="button"
                disabled={!targetTableId}
                onClick={() => {
                  if (!targetTableId) return;
                  onTransferTable(selectedTable.id, targetTableId);
                  setActiveModal(null);
                  showToast(`成功将订单自 ${selectedTable.code} 转移至目标桌台！`);
                }}
                className="px-4 py-1.5 bg-neutral-900 hover:bg-black text-white rounded-md font-black text-xs cursor-pointer disabled:opacity-50 transition-all shadow-[0_2px_0_#404040] active:translate-y-0.5 active:shadow-none"
              >
                确认换桌
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal: 登记生成等位桌号 */}
      {activeModal === 'addWaiting' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-sm rounded-lg border border-neutral-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3.5 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-xs bg-neutral-900 text-white px-2 py-0.5 rounded-md">
                  NEW WAIT
                </span>
                <span className="font-black text-sm text-neutral-900">登记等位桌号</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-neutral-400 hover:text-neutral-900 p-1 hover:bg-neutral-100 rounded-md cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs text-neutral-800">
              <div className="space-y-1">
                <label className="font-bold text-neutral-700 block">就餐人数 (位):</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 6, 8].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setWaitGuests(num)}
                      className={`flex-1 py-1 rounded-md border text-xs font-mono font-black transition-all cursor-pointer ${
                        waitGuests === num
                          ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                          : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-700 block">顾客称呼 / 备注:</label>
                <input
                  type="text"
                  value={waitGuestName}
                  onChange={(e) => setWaitGuestName(e.target.value)}
                  placeholder="例如: 林女士 / 2位窗边"
                  className="w-full p-2 bg-neutral-50 hover:bg-white focus:bg-white border border-neutral-200 focus:border-neutral-900 rounded-md text-xs text-neutral-900 focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-700 block">联系电话 (选填):</label>
                <input
                  type="text"
                  value={waitPhone}
                  onChange={(e) => setWaitPhone(e.target.value)}
                  placeholder="用于入座短信或现场呼号"
                  className="w-full p-2 bg-neutral-50 hover:bg-white focus:bg-white border border-neutral-200 focus:border-neutral-900 rounded-md text-xs text-neutral-900 focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-700 block">期望就餐区域:</label>
                <select
                  value={waitZone}
                  onChange={(e) => setWaitZone(e.target.value)}
                  className="w-full p-2 bg-neutral-50 hover:bg-white focus:bg-white border border-neutral-200 focus:border-neutral-900 rounded-md text-xs text-neutral-900 focus:outline-none transition-colors"
                >
                  <option value="餐车外摆区">餐车外摆休闲区</option>
                  <option value="室内大厅散座">室内大厅散座</option>
                  <option value="舒适卡座区">舒适卡座区</option>
                  <option value="不限，任意有空位即入">不限，任意有空位即入</option>
                </select>
              </div>

              <div className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-200 text-[11px] text-neutral-700">
                取号后将生成 W 开头的等位桌号，食客可凭等位号先行点单。一旦现有桌台清理完毕，系统将自动或手动转移入座！
              </div>
            </div>

            <div className="p-3 bg-neutral-50 border-t border-neutral-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-3.5 py-1.5 bg-white text-neutral-700 border border-neutral-200 rounded-md font-bold cursor-pointer hover:bg-neutral-100 transition-colors shadow-2xs"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  const newItem = addWaitingTable({
                    guests: waitGuests,
                    phone: waitPhone || '到店取号',
                    guestName: waitGuestName || `等位食客 (${waitGuests}位)`,
                    preferredZone: waitZone
                  });
                  setActiveModal(null);
                  showToast(`成功生成等位桌号 ${newItem.code} (${newItem.guests}人)！`);
                }}
                className="px-4 py-1.5 bg-neutral-900 hover:bg-black text-white rounded-md font-black text-xs cursor-pointer transition-all shadow-[0_2px_0_#404040] active:translate-y-0.5 active:shadow-none"
              >
                确认登记
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal: 手动将等位桌号纳入转移 */}
      {activeModal === 'manualTransfer' && waitingToTransfer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-sm rounded-lg border border-neutral-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3.5 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-xs bg-neutral-900 text-white px-2 py-0.5 rounded-md">
                  {waitingToTransfer.code}
                </span>
                <span className="font-black text-sm text-neutral-900">手动纳入转移入座</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-neutral-400 hover:text-neutral-900 p-1 hover:bg-neutral-100 rounded-md cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs text-neutral-800">
              <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200 space-y-1 text-neutral-700">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-neutral-900">
                    {waitingToTransfer.guestName || '等位客人'}
                  </span>
                  <span className="font-mono font-bold text-neutral-900">{waitingToTransfer.guests}人就餐</span>
                </div>
                <div className="text-[11px] text-neutral-500 flex items-center justify-between">
                  <span>取号时间: {waitingToTransfer.createdAt}</span>
                  <span>已等待: {waitingToTransfer.elapsedMinutes || 1} 分钟</span>
                </div>
                {waitingToTransfer.orderNo && (
                  <div className="text-[11px] font-bold text-neutral-900 pt-1 border-t border-neutral-200">
                    已提前下单: {waitingToTransfer.orderNo} (¥{(waitingToTransfer.totalAmount || 0).toFixed(2)})
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-700 block">目标入座正式桌台:</label>
                <select
                  value={transferTargetTableId}
                  onChange={(e) => setTransferTargetTableId(e.target.value)}
                  className="w-full p-2 bg-neutral-50 hover:bg-white focus:bg-white border border-neutral-200 focus:border-neutral-900 rounded-md text-xs text-neutral-900 focus:outline-none transition-colors"
                >
                  {/* 先列出已清理完毕的空闲桌台 */}
                  <optgroup label="✅ 推荐: 当前已清理空闲桌台">
                    {tables
                      .filter((t) => t.status === 'idle')
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.code} 号桌 - {t.name} ({t.zoneLabel} · 容量{t.capacity}人)
                        </option>
                      ))}
                  </optgroup>
                  {/* 若商家需要也可选择其它桌台 */}
                  <optgroup label="其他桌台 (需确认)">
                    {tables
                      .filter((t) => t.status !== 'idle')
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.code} 号桌 - {t.name} ({t.status === 'cleaning' ? '清洁中' : t.status === 'dining' ? '就餐中' : '预订'})
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              <div className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-200 text-[11px] text-neutral-700">
                确认转移后，等位桌号将自动标记为已转移，目标桌台状态转为就餐中，等位订单菜品无缝同步！
              </div>
            </div>

            <div className="p-3 bg-neutral-50 border-t border-neutral-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-3.5 py-1.5 bg-white text-neutral-700 border border-neutral-200 rounded-md font-bold cursor-pointer hover:bg-neutral-100 transition-colors shadow-2xs"
              >
                取消
              </button>
              <button
                type="button"
                disabled={!transferTargetTableId}
                onClick={() => {
                  const res = transferWaitingToTable(waitingToTransfer.id, transferTargetTableId);
                  setActiveModal(null);
                  if (res.success) {
                    showToast(res.message);
                  } else {
                    showToast(res.message || '转移失败，请重试');
                  }
                }}
                className="px-4 py-1.5 bg-neutral-900 hover:bg-black text-white rounded-md font-black text-xs cursor-pointer shadow-[0_2px_0_#404040] active:translate-y-0.5 active:shadow-none transition-all"
              >
                确认转移入座
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal: 保洁完成手动转移引导提示 */}
      {activeModal === 'cleanPrompt' && cleanPromptTable && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-md rounded-lg border border-neutral-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3.5 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-xs bg-neutral-900 text-white px-2 py-0.5 rounded-md">
                  {cleanPromptTable.code} CLEANED
                </span>
                <span className="font-black text-sm text-neutral-900">桌台清理完成 · 是否纳入等位转移？</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-neutral-400 hover:text-neutral-900 p-1 hover:bg-neutral-100 rounded-md cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs text-neutral-800">
              <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200 text-neutral-700">
                桌台 <strong className="text-neutral-900">{cleanPromptTable.code} ({cleanPromptTable.name})</strong> 已保洁完毕！
                当前处于手动确认转移模式，检测到等位队列中有 <strong>{cleanPromptCandidates.length}</strong> 位客人等待就座。
              </div>

              <div className="space-y-1.5">
                <span className="font-bold text-neutral-700 block">选择一位客人纳入转移入座:</span>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                  {cleanPromptCandidates.map((c) => (
                    <div
                      key={c.id}
                      className="p-2 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-lg flex items-center justify-between gap-2 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-xs bg-neutral-900 text-white px-1.5 py-0.2 rounded-md">
                          {c.code}
                        </span>
                        <div>
                          <div className="font-bold text-neutral-900">
                            {c.guestName || '等位客人'} ({c.guests}人)
                          </div>
                          <div className="text-[10.5px] text-neutral-500">
                            等待 {c.elapsedMinutes || 1}分钟 · {c.phone || '到店'} · 期望 {c.preferredZone || '外摆区'}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const res = transferWaitingToTable(c.id, cleanPromptTable.id);
                          setActiveModal(null);
                          if (res.success) {
                            voiceAlerts.speakText(
                              `请等位单号 ${c.code}，${c.guests}位贵宾，到 ${cleanPromptTable.code} 号桌就座用餐！`,
                              { chimeType: 'call' }
                            );
                            showToast(`【手动转移成功】${cleanPromptTable.code} 号桌已安排等位 ${c.code} (${c.guests}人) 入座并语音叫号！`);
                          }
                        }}
                        className="px-2.5 py-1 bg-neutral-900 hover:bg-black text-white rounded-md font-bold text-xs cursor-pointer shadow-[0_2px_0_#404040] active:translate-y-0.5 active:shadow-none shrink-0 transition-all flex items-center gap-1"
                      >
                        <Megaphone className="w-3 h-3 text-white" />
                        <span>转移入座并叫号</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-3 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between gap-2">
              <span className="text-[11px] text-neutral-500">或设为空闲供现场新客入座</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onReleaseTable(cleanPromptTable.id);
                    setActiveModal(null);
                    showToast(`桌台 ${cleanPromptTable.code} 已设为空闲，暂不转移等位。`);
                  }}
                  className="px-3.5 py-1.5 bg-white text-neutral-700 border border-neutral-200 rounded-md font-bold cursor-pointer hover:bg-neutral-100 transition-colors shadow-2xs"
                >
                  仅恢复为空闲
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal: 堂食台位订单作废与清台确认 */}
      {activeModal === 'voidOrder' && voidTargetTable && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-lg border border-neutral-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            {/* 顶部警告色标题 */}
            <div className="p-3.5 bg-neutral-900 text-white border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center text-white shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-black text-xs bg-white text-neutral-900 px-1.5 py-0.2 rounded-md">
                      {voidTargetTable.code} 桌
                    </span>
                    <span className="font-black text-sm text-white">作废堂食订单确认</span>
                  </div>
                  <p className="text-[11px] text-neutral-300">将撤销作废此桌当前在结/就餐订单并重置释放台位</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-neutral-400 hover:text-white p-1 hover:bg-neutral-800 rounded-md cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 模态框主体内容 */}
            <div className="p-4 space-y-3.5 overflow-y-auto text-xs custom-scrollbar">
              {/* 当前桌台及订单信息概览 */}
              <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200 space-y-2">
                <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                  <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                    <UtensilsCrossed className="w-3.5 h-3.5 text-neutral-600" />
                    <span>{voidTargetTable.name} ({voidTargetTable.zoneLabel || '外摆区'})</span>
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    容量 {voidTargetTable.capacity} 人位
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-neutral-500 block">关联订单号:</span>
                    <span className="font-mono font-bold text-neutral-900 break-all">
                      {voidTargetTable.orderNo || `UR-DIN-${voidTargetTable.code}-01`}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">消费订单金额:</span>
                    <span className="font-mono font-black text-neutral-900 text-sm">
                      ¥{(voidTargetTable.totalAmount || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* 菜品清单预览 */}
                {voidTargetTable.orderItems && voidTargetTable.orderItems.length > 0 && (
                  <div className="pt-2 border-t border-neutral-200 space-y-1">
                    <div className="flex items-center justify-between text-[10.5px] text-neutral-500">
                      <span>已点菜品明细 ({voidTargetTable.orderItems.length} 项):</span>
                      <span>共 {voidTargetTable.orderItems.reduce((acc, it) => acc + it.quantity, 0)} 件</span>
                    </div>
                    <div className="max-h-24 overflow-y-auto bg-white p-2 rounded-md border border-neutral-200 space-y-1">
                      {voidTargetTable.orderItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[11px]">
                          <span className="text-neutral-900 truncate max-w-[200px]">{item.name}</span>
                          <span className="font-mono text-neutral-500">
                            x{item.quantity} · ¥{(item.price * item.quantity).toFixed(1)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 作废原因单选 */}
              <div className="space-y-1.5">
                <label className="font-bold text-neutral-900 flex items-center gap-1">
                  <FileX className="w-3.5 h-3.5 text-neutral-700" />
                  <span>请选择作废原因 (将归档至多账号审计日志):</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    '顾客退单/未就餐离店',
                    '错开桌台/重复录入',
                    '顾客换桌/重新点餐',
                    '菜品售罄/顾客取消',
                    '系统测试/演练订单',
                    '自定义输入'
                  ].map((reason) => {
                    const isSelected = voidReason === reason;
                    return (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => setVoidReason(reason)}
                        className={`px-2.5 py-1.5 rounded-md border text-left text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-neutral-900 text-white font-bold border-neutral-900 shadow-xs'
                            : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-700'
                        }`}
                      >
                        {reason}
                      </button>
                    );
                  })}
                </div>

                {voidReason === '自定义输入' && (
                  <div className="pt-1">
                    <input
                      type="text"
                      value={customVoidReason}
                      onChange={(e) => setCustomVoidReason(e.target.value)}
                      placeholder="请输入具体作废原因 (如：前台误触、顾客赶时间离开)..."
                      className="w-full p-2 bg-neutral-50 border border-neutral-300 rounded-md text-xs text-neutral-900 focus:outline-none focus:bg-white focus:border-neutral-900 transition-colors"
                    />
                  </div>
                )}
              </div>

              {/* 桌台后续状态选择 */}
              <div className="space-y-1.5">
                <label className="font-bold text-neutral-900 block">作废后桌位状态恢复为:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setVoidTargetStatus('idle')}
                    className={`p-2 rounded-md border text-left transition-colors cursor-pointer flex flex-col gap-0.5 ${
                      voidTargetStatus === 'idle'
                        ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                        : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    <span className="font-bold text-xs flex items-center gap-1">
                      <span>🟢 立即恢复为空闲</span>
                    </span>
                    <span className={`text-[10px] ${voidTargetStatus === 'idle' ? 'text-neutral-300' : 'text-neutral-500'}`}>
                      可随时接待现场新顾客扫码点餐
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVoidTargetStatus('cleaning')}
                    className={`p-2 rounded-md border text-left transition-colors cursor-pointer flex flex-col gap-0.5 ${
                      voidTargetStatus === 'cleaning'
                        ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                        : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    <span className="font-bold text-xs flex items-center gap-1">
                      <span>🟡 置为保洁清洁中</span>
                    </span>
                    <span className={`text-[10px] ${voidTargetStatus === 'cleaning' ? 'text-neutral-300' : 'text-neutral-500'}`}>
                      需值班保洁清桌后方可迎客
                    </span>
                  </button>
                </div>
              </div>

              {/* 多账号协同安全回滚提示 */}
              <div className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-200 text-neutral-700 flex items-start gap-2 text-[11px]">
                <ShieldCheck className="w-4 h-4 text-neutral-900 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-neutral-900">已激活多账号防误触审计与数据快照</strong>
                  <span>此作废操作将自动写入版本回溯树。如系员工误操作，您随时可在右侧「审计恢复抽屉」中一键无损还原此桌订单与菜品进度。</span>
                </div>
              </div>
            </div>

            {/* 模态框底部操作 */}
            <div className="p-3 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-3.5 py-1.5 bg-white text-neutral-700 border border-neutral-200 rounded-md font-bold cursor-pointer hover:bg-neutral-100 transition-colors text-xs shadow-2xs"
              >
                放弃返回
              </button>
              <button
                type="button"
                onClick={handleConfirmVoidOrder}
                className="px-4 py-1.5 bg-neutral-900 hover:bg-black text-white rounded-md font-black text-xs cursor-pointer shadow-[0_2px_0_#404040] active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1.5"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>确认作废订单并清台</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 右侧折叠内嵌式账号操作对比与数据兜底组件 */}
      <AccountAuditDrawer
        currentModule="tables"
        title="堂食桌台操作审计与版本恢复"
        showToast={showToast}
      />

      {/* 堂食双向协同监管深度抽屉 (成员权限变更、心跳探针、异常仲裁强制关台) */}
      {activeSynergySession && (
        <TableCardSynergyDrawer
          session={activeSynergySession}
          onClose={() => setActiveSynergySession(null)}
          showToast={showToast}
        />
      )}
    </div>
  );
};
