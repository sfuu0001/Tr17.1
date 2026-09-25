/**
 * TableBindModal —— 堂食桌台绑定 · 选座开台（样式与布局重写版）
 * ============================================================================
 * 【本次改动范围】
 * 仅重写「样式与布局」：className、DOM 分区与层级、文案层级（标题/副标题/标签的
 * 视觉权重）。对齐参考实现 code.html（743 行）的视觉语言与结构分区。
 *
 * 【业务逻辑逐项保留（零改动）】
 *   props：isOpen / onClose / currentBoundTable / onBindTable / onConfirmBind / truckName
 *   state：activeTab / selectedZone / selectedTableCode / guestsCount / manualCodeInput / isScanning
 *   派生：availableTables（INITIAL_TABLES 过滤 truckId）、filteredTables（按 selectedZone 过滤）、
 *         currentSelectedObj（按 selectedTableCode 反查）
 *   handler：handleSelectTable / handleTakeWaitingNumber / handleConfirmBind /
 *            handleSimulateScan / handleManualSubmit
 *   外部调用：useToast（success/warning/info）、playScannerBeep、getWaitingQueue、addWaitingTable
 *   条件分支与触发时机（等位号 W 前缀分支、未匹配桌台告警、超容量自动降人数、扫码 1200ms 模拟）
 *   全部原样保留，仅调整书写位置以配合新 DOM 结构。
 *
 * 【从参考实现提炼的样式约定】
 *   1. 画布：白底 + 中性灰分层 bg-white / bg-neutral-100 / bg-neutral-50 / bg-neutral-50/60。
 *   2. 强调色：黑色 = 主操作与选中（选中胶囊 bg-black text-white、页签下划线 h-[2.5px]
 *      bg-neutral-900、主按钮黑底白字）；橙色 #f97316 系 = 桌台选中（border-2 border-orange-500
 *      + bg-orange-50/20 + 右上角 rounded-full bg-orange-500 勾选圆标）；
 *      绿色仅用于状态标签（空闲·免排队 text-emerald-600 / bg-emerald-50 / border-emerald-200）。
 *   3. 形状：卡片 rounded-2xl、胶囊与圆形按钮 rounded-full、小标签 rounded(4px)、
 *      人数按钮 rounded-xl、汇总桌号方块 rounded-xl。
 *   4. 排版：标题 14.5px 粗体、副标题 10.5px 灰、卡片主标 16px 特粗（font-extrabold）、
 *      卡内小字 10–11px、状态标签 9px；金额与编号一律 font-mono（等位号另加 tabular-nums）。
 *   5. 间距：屏内边距 px-3.5、卡片间距 gap-2.5、卡片内边距 p-2.5、区块间距 12px（mb-3）。
 *   6. 布局：header（返回圆钮 + 标题/副标题 + 关闭圆钮）→ 左对齐文字页签（黑色下划线指示条）
 *      → 可滚动内容区 flex-1 overflow-y-auto → 底部固定操作条（上边框 + 白底）。
 * ============================================================================
 */
import React, { useState, useEffect } from 'react';
import {
  UtensilsCrossed,
  X,
  QrCode,
  CheckCircle2,
  Users,
  Search,
  Check,
  Info,
  ChevronLeft,
  Eye,
  EyeOff,
  ExternalLink,
  Download,
  Copy,
  Sparkles
} from 'lucide-react';
import { BoundTableInfo, TableItem } from '../../types';
import { INITIAL_TABLES } from '../../data/posMockData';
import { playScannerBeep } from '../../utils/barcodeScannerEngine';
import { useToast } from '../ui/ToastContext';
import { getWaitingQueue, addWaitingTable, setCurrentBoundTable, getMerchantTables } from '../../utils/tableStorage';
import {
  getOpenSessionByTableCode,
  acquireFirstBind,
  finalizeFirstBind,
  requestLink,
  isBindingLockActive
} from '../../utils/tableSessionEngine';
import {
  ensureAllTableQr,
  ensureTableQr,
  setTableQrEnabled,
  getQrPayloadByTableCode,
  buildQrUrl
} from '../../utils/tableQrEngine';
import { generateQrCodeDataUrl } from '../../utils/qrCodeEngine';
import { reactiveSyncBus } from '../../utils/reactiveSyncBus';
import { useTableSessionUi } from './useTableSessionUi';

interface TableBindModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBoundTable: BoundTableInfo | null;
  onBindTable?: (table: BoundTableInfo) => void;
  onConfirmBind?: (table: BoundTableInfo) => void;
  truckName?: string;
}

export const TableBindModal: React.FC<TableBindModalProps> = ({
  isOpen,
  onClose,
  currentBoundTable,
  onBindTable,
  onConfirmBind,
  truckName = '黑曜石 01 号流动餐车'
}) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'matrix' | 'scan' | 'manual'>('matrix');
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [selectedTableCode, setSelectedTableCode] = useState<string>(
    currentBoundTable?.code || 'A1'
  );
  const [guestsCount, setGuestsCount] = useState<number>(
    currentBoundTable?.guests || 2
  );
  const [manualCodeInput, setManualCodeInput] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // ---- T3 会话验证：统一授权判定（与扫码落点页共用同一引擎与状态）----
  const tableSession = useTableSessionUi();
  const [waitingRequest, setWaitingRequest] = useState<{ requestId: string; expiresAt: string } | null>(null);
  const [bindBusy, setBindBusy] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());

  // 堂食桌台全量数据响应式状态（双向同步）
  const [merchantTables, setMerchantTables] = useState<TableItem[]>(() => {
    const t = getMerchantTables();
    const source = t.length > 0 ? t : INITIAL_TABLES;
    return source.map((item) => ensureTableQr(item));
  });

  // 专属二维码大图物料预览浮层状态
  const [previewQrTable, setPreviewQrTable] = useState<TableItem | null>(null);
  const [previewQrDataUrl, setPreviewQrDataUrl] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    void tableSession.actions.init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 监听桌台数据更新事件（跨组件与商家后台双向同步）
  useEffect(() => {
    const handleUpdated = (e: Event) => {
      const ce = e as CustomEvent<TableItem[]>;
      if (ce.detail && Array.isArray(ce.detail)) {
        setMerchantTables(ce.detail);
      } else {
        setMerchantTables(getMerchantTables());
      }
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'urban_radar_merchant_tables') {
        try {
          const parsed = e.newValue ? JSON.parse(e.newValue) : null;
          if (Array.isArray(parsed)) {
            setMerchantTables(parsed);
          }
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('obsidian_tables_updated', handleUpdated);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('obsidian_tables_updated', handleUpdated);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // 动态生成高清二维码预览图
  useEffect(() => {
    if (!previewQrTable) {
      setPreviewQrDataUrl('');
      return;
    }
    const payload = getQrPayloadByTableCode(previewQrTable.code);
    const targetUrl = payload?.url || buildQrUrl(previewQrTable.code, previewQrTable.qrToken || 'TOKEN');
    let isCancelled = false;
    generateQrCodeDataUrl(targetUrl, { width: 360, margin: 2 })
      .then((url) => {
        if (!isCancelled) {
          setPreviewQrDataUrl(url);
        }
      })
      .catch((err) => {
        console.warn('Failed to generate table QR preview', err);
      });
    return () => {
      isCancelled = true;
    };
  }, [previewQrTable?.code, previewQrTable?.qrToken, previewQrTable?.qrVersion]);

  // 等待授权中：TABLE_LINK_SETTLED 驱动收窗（granted → 绑定成功；denied/expired → 提示）
  useEffect(() => {
    if (!waitingRequest) return;
    const unsub = reactiveSyncBus.subscribe('TABLE_LINK_SETTLED', (payload) => {
      if (payload.requestId !== waitingRequest.requestId) return;
      if (payload.status === 'granted') {
        setWaitingRequest(null);
        toast.success('授权已通过', '你已加入本桌点餐');
        // 成功收尾在 settled 分支内完成（compat 绑定信息随会话生成）
      } else {
        setWaitingRequest(null);
        toast.warning(
          payload.status === 'denied' ? '同桌成员拒绝了本次加入' : '授权请求已超时',
          '可重新发起申请，或呼叫服务员协助'
        );
      }
    });
    const clock = setInterval(() => setNowTick(Date.now()), 1000);
    return () => {
      unsub();
      clearInterval(clock);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingRequest?.requestId]);

  // 食客端展开/收起查看指定桌台真实二维码点餐卡片（只读展示，不修改商家启停开关）
  const handleToggleTableQr = (table: TableItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (previewQrTable && previewQrTable.code.toUpperCase() === table.code.toUpperCase()) {
      // 若当前正展示该桌，点击收起隐藏
      setPreviewQrTable(null);
    } else {
      // 展开显示该桌台真实二维码
      setPreviewQrTable(table);
    }
  };

  if (!isOpen) return null;

  // 桌台数据源：响应式真实桌台库优先（与扫码引擎一致），空库时回退初始样例
  const availableTables = (merchantTables.length > 0 ? merchantTables : INITIAL_TABLES).filter(
    (t) => !t.truckId || t.truckId === 'truck-01'
  );

  // Filtered tables by zone
  const filteredTables = availableTables.filter(t => {
    if (selectedZone === 'all') return true;
    return t.zone === selectedZone;
  });

  const handleSelectTable = (tbl: typeof availableTables[0]) => {
    setSelectedTableCode(tbl.code);
    if (guestsCount > tbl.capacity) {
      setGuestsCount(tbl.capacity);
    }
  };

  const handleTakeWaitingNumber = () => {
    const newWait = addWaitingTable({
      guests: guestsCount,
      guestName: `食客取号 (${guestsCount}位)`,
      preferredZone: '餐车外摆区'
    });
    setSelectedTableCode(newWait.code);
    toast.success(`已生成等位桌号【${newWait.code}】`, `候补人数: ${guestsCount}人，请点击下方确认绑定即可提前点餐！`);
  };

  /** 成功收尾：写旧版兼容绑定（触发 obsidian_bound_table_changed，全量旧读者自动更新） */
  const succeedWithCompat = (matched: { id: string; code: string; name?: string; zone: string; zoneLabel?: string; capacity: number; serverName?: string; status?: string }) => {
    const boundInfo: BoundTableInfo = {
      id: matched.id,
      code: matched.code,
      name: matched.name || `${matched.code} 号桌`,
      zone: matched.zone,
      zoneLabel: matched.zoneLabel || '餐车外摆区',
      capacity: matched.capacity,
      guests: guestsCount,
      serverName: matched.serverName || '阿豪 (No.02)',
      tableStatus: (matched.status as any) || 'idle',
      isWaiting: false
    };
    // T3 统一出口：会话引擎为权威，兼容写仅同步旧版读者
    setCurrentBoundTable(boundInfo);
    if (onConfirmBind) onConfirmBind(boundInfo);
    if (onBindTable) onBindTable(boundInfo);
    toast.success(`已成功绑定堂食桌台【${matched.code}号桌 · ${boundInfo.zoneLabel}】`, `${guestsCount}人就餐`);
    onClose();
  };

  const handleConfirmBind = () => {
    // 兼容等位桌号绑定 (以 W 开头) —— 等位队列仍走旧体系（等位≠开台会话）
    if (selectedTableCode.toUpperCase().startsWith('W')) {
      const boundInfo: BoundTableInfo = {
        id: `wait-${selectedTableCode.toUpperCase()}`,
        code: selectedTableCode.toUpperCase(),
        name: `等位候补 ${selectedTableCode.toUpperCase()} 号`,
        zone: 'waiting',
        zoneLabel: '等位候补区',
        capacity: 4,
        guests: guestsCount,
        serverName: '等位专员',
        tableStatus: 'idle',
        isWaiting: true,
        waitingCode: selectedTableCode.toUpperCase()
      };

      if (onConfirmBind) onConfirmBind(boundInfo);
      if (onBindTable) onBindTable(boundInfo);
      toast.success(
        `已成功绑定等位桌号【${selectedTableCode.toUpperCase()}】`,
        `可先行点餐备餐，桌台清理完成后将为您自动或手动转移入座！`
      );
      onClose();
      return;
    }

    const matched = availableTables.find(t => t.code.toUpperCase() === selectedTableCode.toUpperCase());
    if (!matched) {
      toast.warning('请选择或输入有效的桌台编号（如 A1, A2, 或等位号 W01）');
      return;
    }

    const identity = tableSession.identity;
    if (!identity) {
      toast.warning('身份尚未就绪，请稍候重试');
      return;
    }
    const seed = { participantId: identity.participantId, deviceFingerprint: identity.deviceFingerprint };
    const code = matched.code.toUpperCase();

    // ---- 分支 1：该桌已有开台会话 ----
    const existing = getOpenSessionByTableCode(code);
    if (existing) {
      const me = existing.participants.find(
        (p) => p.participantId === identity.participantId && !p.removedAt
      );
      if (me) {
        // 我已是成员 → 直接成功（幂等）
        succeedWithCompat(matched);
        return;
      }
      // 开台闸门期间不接受加入申请（数据层同款判定，弹窗只是提前拦截）
      if (isBindingLockActive(existing, new Date())) {
        toast.warning('本桌正在开台', '请稍候重试，或选择其他桌台');
        return;
      }
      // 非成员 → 发起联动授权（与扫码落点页同一条 requestLink 路径）
      setBindBusy(true);
      try {
        const link = requestLink({ tableCode: code, seed });
        if (link.ok && link.value) {
          setWaitingRequest({ requestId: link.value.requestId, expiresAt: link.value.expiresAt });
          toast.info('已发送加入请求', '等待同桌任一成员授权，60 秒内有效');
        } else {
          toast.warning(link.message);
        }
      } finally {
        setBindBusy(false);
      }
      return;
    }

    // ---- 分支 2：空桌 → CAS 首绑（失败自动降级为加入申请）----
    setBindBusy(true);
    try {
      const acquired = acquireFirstBind({ tableId: matched.id, tableCode: code, seed });
      if (!acquired.ok) {
        if (
          acquired.reason === 'ALREADY_BOUND' ||
          acquired.reason === 'BINDING_LOCKED' ||
          acquired.reason === 'CAS_CONFLICT'
        ) {
          // 刚被人抢先 → 与扫码落点页一致的降级语义
          const link = requestLink({ tableCode: code, seed });
          if (link.ok && link.value) {
            setWaitingRequest({ requestId: link.value.requestId, expiresAt: link.value.expiresAt });
            toast.info('该桌刚被他人开通', '已自动转为加入申请，等待授权');
          } else {
            toast.warning(link.message);
          }
        } else {
          toast.warning(acquired.message);
        }
        return;
      }
      const finalized = finalizeFirstBind(acquired.value!.sessionId, guestsCount);
      if (!finalized.ok) {
        toast.warning(finalized.message);
        return;
      }
      succeedWithCompat(matched);
    } finally {
      setBindBusy(false);
    }
  };

  // Simulate scanning QR code sticker on the table
  const handleSimulateScan = (codeToScan: string = 'A1') => {
    setIsScanning(true);
    setTimeout(() => {
      playScannerBeep();
      setIsScanning(false);
      const matched = availableTables.find(t => t.code.toUpperCase() === codeToScan.toUpperCase()) || availableTables[0];
      setSelectedTableCode(matched.code);
      setActiveTab('matrix');
      toast.success(`[扫码识别成功] 已识别餐桌二维码：${matched.code} 号桌`, matched.zoneLabel);
    }, 1200);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualCodeInput.trim().toUpperCase();
    if (!clean) {
      toast.warning('请输入桌台编码，如 A1 或等位号 W01');
      return;
    }

    if (clean.startsWith('W')) {
      setSelectedTableCode(clean);
      setActiveTab('matrix');
      toast.info(`已设定等位桌号：${clean}`, '可用于提前点单备餐，清理后转移入座');
      return;
    }

    const matched = availableTables.find(t => t.code.toUpperCase() === clean);
    if (matched) {
      setSelectedTableCode(matched.code);
      setActiveTab('matrix');
      toast.info(`已匹配到桌台：${matched.code} 号桌`, matched.zoneLabel);
    } else {
      toast.warning(`未找到编号为 ${clean} 的桌台`, '请核对桌贴或从列表中选择');
    }
  };

  const currentSelectedObj = availableTables.find(t => t.code.toUpperCase() === selectedTableCode.toUpperCase());

  return (
    <div className="fixed inset-0 z-50 bg-[#F7F7F6] flex flex-col w-full h-full overflow-hidden animate-fadeIn">
      {/* 全屏工作台：白底画布 + 三层分区（header / 可滚动内容 / 底部固定操作条） */}
      <div className="bg-white w-full h-full flex flex-col max-w-3xl mx-auto shadow-2xl border-x border-neutral-200/70">

        {/* ============ 1. header：返回圆钮 + 标题/副标题 + 关闭圆钮 ============ */}
        <header className="bg-white text-neutral-900 border-b border-neutral-200/80 px-3.5 pt-3.5 pb-2.5 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 min-w-0">
              {/* 返回圆钮 */}
              <button
                type="button"
                aria-label="返回"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-neutral-50 border border-neutral-200/90 flex items-center justify-center text-neutral-700 hover:text-neutral-950 hover:bg-neutral-100 active:scale-95 transition-all shrink-0 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 stroke-[2.2]" />
              </button>

              {/* 标题 + 餐车徽标 + 副标题 */}
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5 flex-wrap">
                  <h1 className="text-[14.5px] font-bold tracking-tight text-neutral-900">堂食桌台绑定 · 选座开台</h1>
                  <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-300 font-medium">
                    {truckName}
                  </span>
                </div>
                <p className="text-[10.5px] text-neutral-400 mt-0.5 leading-tight">堂食订单将直传餐车后厨与桌台，请确认您的就餐座位</p>
              </div>
            </div>

            {/* 关闭圆钮 */}
            <button
              type="button"
              aria-label="关闭"
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-500 hover:text-neutral-950 hover:bg-neutral-200 transition-colors shrink-0 ml-1.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5 stroke-[2.2]" />
            </button>
          </div>
        </header>

        {/* ============ 2. 左对齐文字页签（2.5px 黑色下划线指示条） ============ */}
        <section className="border-b border-neutral-100 px-3.5 pt-1.5 bg-white shrink-0">
          <div className="flex items-center space-x-5 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('matrix')}
              className={`relative flex items-center space-x-1.5 py-2.5 transition cursor-pointer ${
                activeTab === 'matrix'
                  ? 'text-neutral-950 font-bold'
                  : 'text-neutral-500 hover:text-neutral-800 font-medium'
              }`}
            >
              <UtensilsCrossed className={`w-3.5 h-3.5 ${activeTab === 'matrix' ? 'text-orange-600' : 'text-neutral-400'}`} />
              <span>桌台矩阵</span>
              <span className={`absolute bottom-0 left-0 right-0 h-[2.5px] bg-neutral-900 rounded-full ${activeTab === 'matrix' ? '' : 'hidden'}`} />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('scan')}
              className={`relative flex items-center space-x-1.5 py-2.5 transition cursor-pointer ${
                activeTab === 'scan'
                  ? 'text-neutral-950 font-bold'
                  : 'text-neutral-500 hover:text-neutral-800 font-medium'
              }`}
            >
              <QrCode className={`w-3.5 h-3.5 ${activeTab === 'scan' ? 'text-orange-600' : 'text-neutral-400'}`} />
              <span>扫码选座</span>
              <span className={`absolute bottom-0 left-0 right-0 h-[2.5px] bg-neutral-900 rounded-full ${activeTab === 'scan' ? '' : 'hidden'}`} />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('manual')}
              className={`relative flex items-center space-x-1.5 py-2.5 transition cursor-pointer ${
                activeTab === 'manual'
                  ? 'text-neutral-950 font-bold'
                  : 'text-neutral-500 hover:text-neutral-800 font-medium'
              }`}
            >
              <Search className={`w-3.5 h-3.5 ${activeTab === 'manual' ? 'text-orange-600' : 'text-neutral-400'}`} />
              <span>输入桌号</span>
              <span className={`absolute bottom-0 left-0 right-0 h-[2.5px] bg-neutral-900 rounded-full ${activeTab === 'manual' ? '' : 'hidden'}`} />
            </button>
          </div>
        </section>

        {/* ============ 3. 可滚动内容区 ============ */}
        <div className="flex-1 overflow-y-auto bg-white">

          {/* ---------- 3.1 页签：桌台矩阵 ---------- */}
          {activeTab === 'matrix' && (
            <>
              {/* 区域筛选：横向滚动胶囊（选中黑底白字） */}
              <section className="px-3.5 pt-3 pb-2 overflow-x-auto flex items-center space-x-2">
                {[
                  { key: 'all', label: '全部区域' },
                  { key: 'patio', label: '外摆休闲区 (推荐)' },
                  { key: 'bar', label: '露天吧台区' },
                  { key: 'hall', label: '室内散座区' }
                ].map(z => (
                  <button
                    key={z.key}
                    type="button"
                    onClick={() => setSelectedZone(z.key)}
                    className={`rounded-full text-xs whitespace-nowrap transition cursor-pointer ${
                      selectedZone === z.key
                        ? 'px-3.5 py-1.5 bg-black text-white font-semibold shadow-xs'
                        : 'px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    {z.label}
                  </button>
                ))}
              </section>

              {/* 桌台矩阵：3 列网格卡片（选中 = 橙色描边 + 勾选圆标） */}
              <section className="p-3.5 pt-1 grid grid-cols-3 gap-2.5">
                {filteredTables.map(tbl => {
                  const isSelected = selectedTableCode.toUpperCase() === tbl.code.toUpperCase();
                  const isIdle = tbl.status === 'idle' || !tbl.status;
                  const isDining = tbl.status === 'dining';
                  const isCleaning = !isIdle && !isDining;
                  const isQrEnabled = tbl.qrEnabled !== false;
                  const isCurrentlyViewing = previewQrTable?.code.toUpperCase() === tbl.code.toUpperCase();

                  return (
                    <article
                      key={tbl.id}
                      onClick={() => handleSelectTable(tbl)}
                      className={`cursor-pointer transition-all active:scale-[0.98] relative rounded-2xl p-2.5 flex flex-col justify-between h-[106px] overflow-hidden select-none ${
                        isSelected
                          ? 'bg-orange-50/25 border-2 border-orange-500 shadow-sm'
                          : `border border-neutral-200/90 shadow-xs ${isCleaning ? 'bg-neutral-50/60 opacity-80' : 'bg-white hover:border-neutral-300'}`
                      }`}
                    >
                      {/* 顶栏：左侧桌号与人数 + 右侧快捷操作区（勾选标 + 手机端优化桌码按钮） */}
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0 flex-1 pr-0.5">
                          <div className="flex items-baseline space-x-1">
                            <span className={`font-mono text-base font-black tracking-tight leading-none ${isCleaning && !isSelected ? 'text-neutral-700' : 'text-neutral-950'}`}>
                              {tbl.code}
                            </span>
                            <span className={`text-[10px] shrink-0 font-medium ${isCleaning && !isSelected ? 'text-neutral-400' : 'text-neutral-500'}`}>
                              {tbl.capacity}人桌
                            </span>
                          </div>
                          <p className={`text-[10.5px] mt-0.5 truncate leading-tight ${isCleaning && !isSelected ? 'text-neutral-400' : 'text-neutral-500'}`}>
                            {tbl.zoneLabel}
                          </p>
                        </div>

                        {/* 右上角操作区：选中勾选徽章 + 手机端精致轻量「桌码」按钮 */}
                        <div className="flex items-center gap-1 shrink-0">
                          {isSelected && (
                            <div
                              className="w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-2xs shrink-0 animate-in fade-in zoom-in-75 duration-150"
                              title="已选定当前就餐桌台"
                            >
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          )}

                          {/* 优化后的手机端显示桌码按钮（点击直接呼出专属高清扫码弹窗，不挤压底栏） */}
                          <button
                            type="button"
                            onClick={(e) => handleToggleTableQr(tbl, e)}
                            title={
                              isCurrentlyViewing
                                ? `点击收起 ${tbl.code} 号桌点餐二维码`
                                : `点击展开查看 ${tbl.code} 号桌真实点餐二维码（同桌扫码）`
                            }
                            aria-label={`${isCurrentlyViewing ? '收起' : '查看'} ${tbl.code} 号桌点餐二维码`}
                            className={`flex items-center justify-center gap-0.5 h-5 px-1.5 rounded-md text-[9px] font-bold transition-all active:scale-95 cursor-pointer border shrink-0 ${
                              isCurrentlyViewing
                                ? 'bg-neutral-900 text-white border-neutral-900 shadow-2xs'
                                : isQrEnabled
                                ? 'bg-white hover:bg-orange-50 text-neutral-700 hover:text-orange-600 border-neutral-200/90 shadow-2xs'
                                : 'bg-neutral-100 text-neutral-400 border-neutral-200/80'
                            }`}
                          >
                            <QrCode className={`w-3 h-3 shrink-0 ${isCurrentlyViewing ? 'text-orange-400' : isQrEnabled ? 'text-orange-500' : 'text-neutral-400'}`} />
                            <span className="leading-none whitespace-nowrap">{isCurrentlyViewing ? '收起' : '桌码'}</span>
                          </button>
                        </div>
                      </div>

                      {/* 底栏：左侧就餐状态胶囊 + 右侧订单单号（与桌码解耦，杜绝内容堆叠溢出） */}
                      <div className="flex items-center justify-between gap-1 min-w-0 pt-1 border-t border-neutral-100/70">
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-semibold tracking-tighter truncate max-w-[66px] ${
                            isIdle
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60'
                              : isDining
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-neutral-200/80 text-neutral-600 font-medium'
                          }`}
                        >
                          {isIdle ? '空闲·免排队' : isDining ? '就餐中·可加单' : '保洁备桌'}
                        </span>

                        {tbl.orderNo && (
                          <span
                            className="font-mono text-neutral-400 text-[8.5px] truncate max-w-[36px] text-right shrink-0"
                            title={`关联单号: ${tbl.orderNo}`}
                          >
                            {tbl.orderNo.replace('UR-', '')}
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </section>

              {/* 现场客满等位区 */}
              {(() => {
                const queue = getWaitingQueue().filter((w) => w.status === 'waiting');
                return (
                  <section className="px-3.5 mb-3">
                    <div className="border border-dashed border-neutral-300 rounded-2xl p-3.5 bg-neutral-50/70">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-neutral-800">现场客满？等位先行点单</span>
                          <span className="bg-[#d97706] text-white text-[10px] font-bold px-1.5 py-0.5 rounded leading-tight">
                            候补中 {queue.length} 组
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleTakeWaitingNumber}
                          className="bg-neutral-800 hover:bg-neutral-900 active:scale-95 text-white text-xs font-medium px-2.5 py-1 rounded-lg transition cursor-pointer whitespace-nowrap"
                        >
                          + 自助取等位号
                        </button>
                      </div>

                      <p className="text-[11px] text-neutral-500 leading-relaxed">
                        绑定等位桌号后可先行点餐制作；一旦现有桌台清理完毕，系统将自动或人工为您转移入座！
                      </p>

                      {queue.length > 0 && (
                        <div className="mt-2.5 flex items-center space-x-2">
                          <span className="text-[11px] text-neutral-600 whitespace-nowrap">现有等位号:</span>
                          <div className="flex items-center space-x-1.5 overflow-x-auto">
                            {queue.map((w) => {
                              const isSelected = selectedTableCode.toUpperCase() === w.code.toUpperCase();
                              return (
                                <button
                                  key={w.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedTableCode(w.code);
                                    setGuestsCount(w.guests);
                                  }}
                                  className={`px-2 py-0.5 rounded text-[11px] font-mono tabular-nums whitespace-nowrap transition cursor-pointer border ${
                                    isSelected
                                      ? 'bg-black text-white border-black'
                                      : 'bg-white border-neutral-200 text-neutral-800 hover:border-neutral-400 active:bg-neutral-100'
                                  }`}
                                >
                                  {w.code} ({w.guests}人)
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                );
              })()}

              {/* 就餐人数确认（1/2/3/4/5+ 胶囊，选中橙色） */}
              <section className="px-3.5 mb-3">
                <div className="bg-orange-50/20 border border-orange-200/60 rounded-2xl p-3.5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-1.5 text-neutral-900 font-bold text-xs">
                      <Users className="w-4 h-4 text-orange-600" />
                      <span>就餐人数确认</span>
                    </div>
                    <span className="text-xs text-neutral-600">
                      当前选择: <strong className="text-neutral-950 font-bold">{guestsCount} 人</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setGuestsCount(num)}
                        className={`py-1.5 text-xs rounded-xl text-center transition cursor-pointer ${
                          guestsCount === num
                            ? 'bg-[#e66810] text-white font-bold shadow-sm'
                            : 'bg-white border border-neutral-200 text-neutral-700 font-semibold hover:bg-neutral-50'
                        }`}
                      >
                        {num === 5 ? '5人+' : `${num}人`}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {/* 已选桌台汇总卡（橙色桌号方块 + 绿色「已匹配就绪」标签） */}
              {currentSelectedObj ? (
                <section className="px-3.5 mb-3">
                  <div className="bg-white border border-neutral-200/90 rounded-2xl p-3 flex items-center justify-between text-neutral-900 shadow-sm transition">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-[#e66810] flex items-center justify-center font-mono font-black text-lg text-white shrink-0 tracking-tight">
                        {currentSelectedObj.code}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold tracking-tight text-neutral-950 flex items-center space-x-1.5 flex-wrap">
                          <span className="truncate">{currentSelectedObj.name}</span>
                          <span className="text-orange-600 font-medium text-[11px]">({currentSelectedObj.zoneLabel})</span>
                        </div>
                        <p className="text-[10px] text-neutral-500 mt-0.5 tabular-nums">
                          最大容纳 {currentSelectedObj.capacity} 人 · 本次就餐 {guestsCount} 人
                        </p>
                        {guestsCount > currentSelectedObj.capacity && (
                          <div className="text-[10px] text-amber-600 font-medium flex items-center space-x-1 mt-0.5">
                            <Info className="w-3 h-3 text-amber-500 shrink-0" />
                            <span>人数可能较拥挤，建议选更大桌型</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleTableQr(currentSelectedObj)}
                        title={`查看 ${currentSelectedObj.code} 号桌点餐二维码`}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200/80 transition active:scale-95 cursor-pointer shadow-2xs"
                      >
                        <QrCode className="w-3.5 h-3.5 text-orange-600" />
                        <span>查看桌码</span>
                      </button>
                      <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/60 font-medium whitespace-nowrap">
                        已匹配就绪
                      </span>
                    </div>
                  </div>
                </section>
              ) : selectedTableCode.toUpperCase().startsWith('W') ? (
                <section className="px-3.5 mb-3">
                  <div className="bg-white border border-neutral-200/90 rounded-2xl p-3 flex items-center justify-between text-neutral-900 shadow-sm transition">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-[#e66810] flex items-center justify-center font-mono font-black text-base text-white shrink-0 tracking-tight">
                        {selectedTableCode.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold tracking-tight text-neutral-950 flex items-center space-x-1.5 flex-wrap">
                          <span>等位候补桌号</span>
                          <span className="text-orange-600 font-medium text-[11px]">(等位候补区)</span>
                        </div>
                        <p className="text-[10px] text-neutral-500 mt-0.5 tabular-nums">
                          候补就餐 {guestsCount} 人 · 现有桌台清理后自动/手动转移入座
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/60 font-medium whitespace-nowrap">
                        候补就绪
                      </span>
                    </div>
                  </div>
                </section>
              ) : null}
            </>
          )}

          {/* ---------- 3.2 页签：扫码桌贴选座 ---------- */}
          {activeTab === 'scan' && (
            <div className="px-4 py-8 flex flex-col items-center text-center">
              {/* 取景框 */}
              <div className="relative w-56 h-56 bg-neutral-900 rounded-3xl overflow-hidden border-4 border-neutral-800 flex items-center justify-center">
                <div className="absolute inset-4 border-2 border-dashed border-white/40 rounded-2xl pointer-events-none" />
                <div className="absolute left-4 right-4 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-orange-500 to-transparent" />

                {isScanning ? (
                  <div className="text-white/70 text-xs flex flex-col items-center space-y-3">
                    <div className="w-8 h-8 border-2 border-white/20 border-t-orange-500 rounded-full animate-spin" />
                    <span>正在光学对焦识别桌贴二维码...</span>
                  </div>
                ) : (
                  <div className="text-white/60 text-xs flex flex-col items-center">
                    <QrCode className="w-12 h-12 text-white/50 mb-2 animate-pulse" />
                    <span>请对准桌上二维码标签</span>
                  </div>
                )}
              </div>

              <p className="text-xs text-neutral-500 mt-4 leading-relaxed">
                支持自动对焦扫描，识别后即可瞬间绑定桌号
              </p>

              {!isScanning && (
                <div className="mt-5 w-full grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSimulateScan('A1')}
                    className="px-3 py-2 bg-white border border-neutral-200 rounded-xl text-left cursor-pointer transition active:scale-95 hover:bg-neutral-50"
                  >
                    <div className="text-xs font-bold text-neutral-900">扫 A1 号桌贴</div>
                    <div className="text-[10px] text-neutral-500 mt-0.5">外摆区 · 2人座 (常用)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSimulateScan('A2')}
                    className="px-3 py-2 bg-white border border-neutral-200 rounded-xl text-left cursor-pointer transition active:scale-95 hover:bg-neutral-50"
                  >
                    <div className="text-xs font-bold text-neutral-900">扫 A2 号桌贴</div>
                    <div className="text-[10px] text-neutral-500 mt-0.5">外摆区 · 4人座 (订单7078专属)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSimulateScan('B1')}
                    className="px-3 py-2 bg-white border border-neutral-200 rounded-xl text-left cursor-pointer transition active:scale-95 hover:bg-neutral-50"
                  >
                    <div className="text-xs font-bold text-neutral-900">扫 B1 号桌贴</div>
                    <div className="text-[10px] text-neutral-500 mt-0.5">室内散座 · 2人位</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSimulateScan('C1')}
                    className="px-3 py-2 bg-white border border-neutral-200 rounded-xl text-left cursor-pointer transition active:scale-95 hover:bg-neutral-50"
                  >
                    <div className="text-xs font-bold text-neutral-900">扫 C1 号吧台桌贴</div>
                    <div className="text-[10px] text-neutral-500 mt-0.5">露天吧台 · 2人位</div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ---------- 3.3 页签：手动输入桌号 ---------- */}
          {activeTab === 'manual' && (
            <div className="px-4 py-6">
              <form onSubmit={handleManualSubmit} className="w-full bg-white p-5 rounded-3xl border border-neutral-200/90 shadow-xl flex flex-col">
                <div className="flex items-start justify-between pb-3.5 border-b border-neutral-100">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-xl bg-orange-100/70 border border-orange-200/60 flex items-center justify-center text-orange-600 shrink-0">
                      <Search className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900 tracking-tight">手动输入桌号</h3>
                      <p className="text-[10px] text-neutral-400 mt-0.5 leading-tight">输入或选择现场桌台编码 (如 A1, B2 或等位号 W01)</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="关闭"
                    onClick={() => setActiveTab('matrix')}
                    className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 flex items-center justify-center transition shrink-0 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5 stroke-[2.2]" />
                  </button>
                </div>

                <div className="mt-4 mb-3.5">
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1.5">输入桌台代码</label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={manualCodeInput}
                      onChange={(e) => setManualCodeInput(e.target.value)}
                      placeholder="例: A1 / B2"
                      className="uppercase w-full h-12 px-4 border-2 border-neutral-200 focus:border-black rounded-xl font-mono font-black text-lg tracking-widest text-center focus:outline-none transition-all bg-neutral-50/70 focus:bg-white text-neutral-900"
                    />
                    <div className="absolute right-3.5 flex items-center pointer-events-none">
                      <span className="text-[10px] font-mono text-neutral-400 px-1.5 py-0.5 rounded bg-neutral-200/60 font-semibold">NUM</span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer active:scale-95"
                >
                  校验并选择
                </button>

                <p className="text-[10px] text-neutral-400 mt-3 leading-relaxed">
                  可直接在现场餐桌标牌角落查看桌号（大写字母 + 数字编号）
                </p>
              </form>
            </div>
          )}
        </div>

        {/* ============ 4. 底部固定操作条 ============ */}
        {/* T3 等待授权横幅：requestLink 已发出，TABLE_LINK_SETTLED 驱动收窗 */}
        {waitingRequest && (
          <div className="shrink-0 bg-amber-50 border-t border-amber-200 px-3.5 py-2.5 flex items-center gap-2.5">
            <span className="w-4 h-4 border-2 border-amber-400 border-t-amber-600 rounded-full animate-spin shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[11.5px] font-semibold text-amber-800">
                已发送加入请求 · 剩余{' '}
                {Math.max(0, Math.ceil((new Date(waitingRequest.expiresAt).getTime() - nowTick) / 1000))}s
              </p>
              <p className="text-[10px] text-amber-700/80 truncate">任一同桌成员同意后自动完成绑定</p>
            </div>
            <button
              type="button"
              onClick={() => setWaitingRequest(null)}
              className="text-[10px] text-amber-700 underline shrink-0 cursor-pointer"
            >
              取消等待
            </button>
          </div>
        )}

        <footer className="shrink-0 bg-white border-t border-neutral-200/80 px-3.5 py-3 flex items-center justify-between">
          <p className="text-[10px] text-neutral-400 max-w-[130px] leading-tight">
            绑定后桌台将同步至商家端出餐大屏
          </p>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-700 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 active:scale-95 transition cursor-pointer whitespace-nowrap"
            >
              暂不绑定
            </button>
            <button
              type="button"
              onClick={handleConfirmBind}
              disabled={bindBusy || !!waitingRequest}
              className="px-4 py-2 text-xs font-bold text-white bg-black hover:bg-neutral-800 active:scale-95 rounded-xl flex items-center space-x-1.5 shadow-sm transition cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
              <span>{bindBusy ? '处理中…' : waitingRequest ? '等待授权中' : '确认绑定该桌台'}</span>
            </button>
          </div>
        </footer>
      </div>

      {/* 二维码高清预览与显隐控制浮层 */}
      {previewQrTable && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewQrTable(null)}
        >
          <div
            className="bg-white w-full max-w-xs rounded-2xl p-5 shadow-2xl border border-neutral-200 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 关闭按钮 */}
            <button
              type="button"
              onClick={() => setPreviewQrTable(null)}
              className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-500 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* 标题 */}
            <div className="text-center mb-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200/60 text-orange-700 text-xs font-semibold mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>流动餐车 · 堂食专属桌码</span>
              </div>
              <h3 className="text-xl font-black text-neutral-900 tracking-tight">
                {previewQrTable.code} 号桌
              </h3>
              <p className="text-xs text-neutral-500">
                {previewQrTable.zoneLabel} · {previewQrTable.capacity}人桌
              </p>
            </div>

            {/* 二维码卡片 */}
            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/80 flex flex-col items-center justify-center mb-3 relative">
              {previewQrDataUrl ? (
                <img
                  src={previewQrDataUrl}
                  alt={`${previewQrTable.code}号桌点餐二维码`}
                  className={`w-44 h-44 rounded-lg bg-white p-1 border shadow-xs transition-opacity ${
                    previewQrTable.qrEnabled === false ? 'opacity-30 grayscale' : 'opacity-100'
                  }`}
                />
              ) : (
                <div className="w-44 h-44 rounded-lg bg-neutral-200 flex items-center justify-center text-neutral-400 text-xs">
                  生成二维码中…
                </div>
              )}

              {/* 如果已隐藏，在二维码上打上遮罩 */}
              {previewQrTable.qrEnabled === false && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 rounded-xl">
                  <EyeOff className="w-8 h-8 text-amber-600 mb-1" />
                  <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                    已隐藏 · 暂停扫码点餐
                  </span>
                </div>
              )}

              <div className="mt-2.5 flex items-center gap-2">
                <span className="text-xs text-neutral-500">人工短码:</span>
                <span className="font-mono font-bold text-sm text-neutral-900 bg-white px-2 py-0.5 rounded border border-neutral-200">
                  {previewQrTable.qrCode || `${previewQrTable.code}-UR88`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const code = previewQrTable.qrCode || `${previewQrTable.code}-UR88`;
                    navigator.clipboard?.writeText(code);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 1500);
                    toast.success('短码已复制', code);
                  }}
                  className="text-[11px] text-orange-600 hover:text-orange-700 font-medium cursor-pointer"
                >
                  {copiedCode ? '已复制' : '复制'}
                </button>
              </div>
            </div>

            {/* 商家权限管控提示与状态卡片（客户端只读，严禁越权修改） */}
            <div className="bg-neutral-100/80 p-3 rounded-xl border border-neutral-200/80 flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {previewQrTable.qrEnabled !== false ? (
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Eye className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <EyeOff className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-neutral-900">
                      {previewQrTable.qrEnabled !== false ? '扫码点餐开放中' : '此桌已暂停扫码点餐'}
                    </p>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-neutral-200 text-neutral-600 font-medium">
                      商家后台管控
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-0.5">
                    {previewQrTable.qrEnabled !== false
                      ? '手机/微信现场扫码即可开台或协同点单'
                      : '该桌台点餐开关需由餐车管理端统一启停，食客端只读'}
                  </p>
                </div>
              </div>
            </div>

            {/* 底部操作按钮 */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const payload = getQrPayloadByTableCode(previewQrTable.code);
                  const url = payload?.url || buildQrUrl(previewQrTable.code, previewQrTable.qrToken || 'TOKEN');
                  navigator.clipboard?.writeText(url);
                  toast.success('扫码点餐网址已复制', url);
                }}
                className="flex-1 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl flex items-center justify-center gap-1 transition cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>复制点餐链接</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (previewQrDataUrl) {
                    const a = document.createElement('a');
                    a.href = previewQrDataUrl;
                    a.download = `桌台二维码-${previewQrTable.code}号桌.png`;
                    a.click();
                    toast.success(`已开始下载 ${previewQrTable.code} 号桌立牌二维码物料`);
                  }
                }}
                className="flex-1 py-2 text-xs font-bold text-white bg-black hover:bg-neutral-800 rounded-xl flex items-center justify-center gap-1 shadow-xs transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>下载立牌物料</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const TableBindFullScreenView = TableBindModal;
export default TableBindModal;
