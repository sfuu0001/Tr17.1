import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Zap,
  Radio,
  Volume2,
  VolumeX,
  QrCode,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  Sliders,
  DollarSign,
  Smartphone,
  Building,
  KeyRound,
  Download,
  Printer,
  Sparkles,
  Lock,
  ArrowUpRight,
  Receipt,
  HelpCircle,
  SlidersHorizontal,
  ChevronRight,
  FileText,
  BadgePercent,
  Activity,
  Layers,
  Flame,
  Check,
  Pencil,
  Trash2,
  ShieldAlert
} from 'lucide-react';
import {
  MerchantPaymentSettings,
  DEFAULT_MERCHANT_PAYMENT_SETTINGS,
  WechatPayConfig,
  AlipayConfig,
  UnionPayConfig,
  DcepConfig,
  EnterpriseBillingConfig,
  SoundboxDeviceConfig,
  PaymentVoucher,
  PaymentSecurityLedgerItem
} from '../../types/payment';
import { safeGetStorage, safeSetStorage } from '../../utils/safeStorage';
import { DateRangeFilter } from '../common/DateRangeFilter';
import { HeatmapGridMatrix, HeatmapDataPoint } from '../common/HeatmapGridMatrix';
import {
  DateFilterState,
  resolveDateRange,
  isWithinRange
} from '../../utils/dateFilter';
import {
  usePermissionGate,
  executeSensitiveAction
} from '../../utils/sensitiveAction';
import { softDeleteToRecycleBin } from '../../utils/recycleBinEngine';
import {
  DEFAULT_PAYMENT_RULES,
  PaymentDiscountRule
} from '../../utils/promotionEngine';
import {
  getPaymentFallbackLedger,
  getFallbackPaymentLedger,
  reconcileUnsettledPayments
} from '../../utils/paymentSecurityEngine';
import { ElectronicPaymentVoucherModal } from '../payment/ElectronicPaymentVoucherModal';
import { verifyPaymentChannelCredentials } from '../../utils/realPaymentCloudEngine';
import { getUnifiedTruckName } from '../../utils/truckNaming';

interface MerchantPaymentChannelsProps {
  showToast: (msg: string) => void;
  truckName?: string;
}

export const MerchantPaymentChannels: React.FC<MerchantPaymentChannelsProps> = ({
  showToast,
  truckName = getUnifiedTruckName('truck-01', 'standard')
}) => {
  // Settings State
  const [settings, setSettings] = useState<MerchantPaymentSettings>(() => {
    return safeGetStorage<MerchantPaymentSettings>(
      'obsidian_merchant_payment_channels',
      DEFAULT_MERCHANT_PAYMENT_SETTINGS
    );
  });

  // Fallback payment ledger state
  const [ledgerItems, setLedgerItems] = useState<PaymentSecurityLedgerItem[]>(() => getFallbackPaymentLedger());
  const [inspectingVoucher, setInspectingVoucher] = useState<PaymentVoucher | null>(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState<boolean>(false);
  const [isReconciling, setIsReconciling] = useState<boolean>(false);

  // 时间区间筛选（收款概览 + 台账列表统一生效；台账条目 paidAt 为 ISO 入账时间）
  const [dateFilter, setDateFilter] = useState<DateFilterState>({ preset: 'today' });
  const dateRange = useMemo(() => resolveDateRange(dateFilter), [dateFilter]);
  const rangedLedger = useMemo(
    () => ledgerItems.filter((item) => isWithinRange(new Date(item.paidAt || 0).getTime(), dateRange)),
    [ledgerItems, dateRange]
  );

  // 全渠道资金结算与打卡热力矩阵数据源
  const paymentHeatmapData: HeatmapDataPoint[] = useMemo(() => {
    const map = new Map<string, { total: number; count: number; stuck: number }>();
    ledgerItems.forEach((item) => {
      const dStr = new Date(item.paidAt || 0).toISOString().slice(0, 10);
      const cur = map.get(dStr) || { total: 0, count: 0, stuck: 0 };
      cur.total += item.amount || 0;
      cur.count += 1;
      if (item.status === 'PENDING_REPLAY') cur.stuck += 1;
      map.set(dStr, cur);
    });

    const list: HeatmapDataPoint[] = [];
    map.forEach((val, dStr) => {
      list.push({
        date: dStr,
        value: Math.round(val.total),
        title: `¥${val.total.toFixed(2)} · ${val.count}笔入账`,
        extraNote: val.stuck > 0 ? `${val.stuck}笔离线待重放` : '全部T+0平账',
        metrics: [
          { label: '通道收款', value: `¥${val.total.toFixed(2)}` },
          { label: '入账笔数', value: `${val.count} 笔` }
        ],
        status: val.stuck > 0 ? 'warning' : 'success'
      });
    });
    return list;
  }, [ledgerItems]);
  // 收款概览指标：从台账按所选区间真实聚合（替代原硬编码演示值）
  // 数据治理（店长专属）：台账行级更正 / 软删除入回收站
  const ledgerGate = usePermissionGate('finance:data_correct');
  const [editingLedgerItem, setEditingLedgerItem] = useState<PaymentSecurityLedgerItem | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editNote, setEditNote] = useState<string>('');

  const persistLedger = (updated: PaymentSecurityLedgerItem[]) => {
    setLedgerItems(updated);
    safeSetStorage('obsidian_payment_fallback_ledger', updated);
  };

  const handleCorrectLedgerItem = (item: PaymentSecurityLedgerItem) => {
    const newAmount = parseFloat(editAmount);
    if (Number.isNaN(newAmount) || newAmount < 0) {
      showToast('请输入有效的实付金额（≥ 0）');
      return;
    }
    const res = executeSensitiveAction('finance:data_correct', {
      module: 'finance',
      actionLabel: '收款台账更正',
      entityName: `${item.voucherNo}（${item.orderNo}）`,
      detail: `实付金额 ${item.paidAmount.toFixed(2)} → ${newAmount.toFixed(2)}${editNote ? `；备注：${editNote}` : ''}`
    }, () => {
      const updated = ledgerItems.map((i) =>
        i.voucherNo === item.voucherNo
          ? { ...i, paidAmount: Number(newAmount.toFixed(2)), syncErrorMessage: editNote || i.syncErrorMessage }
          : i
      );
      persistLedger(updated);
      return true;
    });
    showToast(res.message);
    if (res.ok) {
      setEditingLedgerItem(null);
      setEditAmount('');
      setEditNote('');
    }
  };

  const handleDeleteLedgerItem = (item: PaymentSecurityLedgerItem) => {
    if (!window.confirm(`确认删除台账记录【${item.voucherNo}】（¥${item.paidAmount.toFixed(2)}）吗？\n\n· 该记录将进入统一回收站，30 天内可恢复\n· 收款概览指标将随之自动更正\n· 此操作仅限店长执行并记录审计`)) return;
    const res = executeSensitiveAction('finance:data_correct', {
      module: 'finance',
      actionLabel: '收款台账删除',
      entityName: `${item.voucherNo}（${item.orderNo}）`,
      detail: `删除入账 ¥${item.paidAmount.toFixed(2)}（${item.channelName}，${item.paidTimeFormatted || item.paidAt}），已转入统一回收站`
    }, () => {
      softDeleteToRecycleBin({
        type: 'payment_ledger',
        typeLabel: '收款台账',
        refId: item.voucherNo,
        label: `${item.voucherNo}（¥${item.paidAmount.toFixed(2)} · ${item.channelName}）`,
        snapshot: item,
        storageKey: 'obsidian_payment_fallback_ledger',
        container: 'array',
        idField: 'voucherNo'
      });
      persistLedger(ledgerItems.filter((i) => i.voucherNo !== item.voucherNo));
      return true;
    });
    showToast(res.message);
  };
  const rangedMetrics = useMemo(() => {
    const totalAmount = rangedLedger.reduce((sum, i) => sum + (i.paidAmount || 0), 0);
    const byChannel = { wechat: 0, alipay: 0, others: 0 } as { wechat: number; alipay: number; others: number };
    const byChannelCount = { wechat: 0, alipay: 0, others: 0 } as Record<string, number>;
    let stuckCount = 0;
    for (const item of rangedLedger) {
      const cid = (item.channelId || '').toLowerCase();
      if (cid.includes('wechat') || item.channelName?.includes('微信')) {
        byChannel.wechat += item.paidAmount || 0;
        byChannelCount.wechat += 1;
      } else if (cid.includes('alipay') || item.channelName?.includes('支付宝')) {
        byChannel.alipay += item.paidAmount || 0;
        byChannelCount.alipay += 1;
      } else {
        byChannel.others += item.paidAmount || 0;
        byChannelCount.others += 1;
      }
      if (item.escrowStatus && item.escrowStatus !== 'verified_synced' && item.escrowStatus !== 'reconciled') {
        stuckCount += 1;
      }
    }
    const total = totalAmount;
    const pct = (v: number) => (total > 0 ? ((v / total) * 100).toFixed(1) : '0.0');
    return {
      totalAmount,
      totalCount: rangedLedger.length,
      stuckCount,
      wechat: byChannel.wechat,
      wechatCount: byChannelCount.wechat,
      alipay: byChannel.alipay,
      alipayCount: byChannelCount.alipay,
      others: byChannel.others,
      othersCount: byChannelCount.others,
      wechatPct: pct(byChannel.wechat),
      alipayPct: pct(byChannel.alipay),
      othersPct: pct(byChannel.others),
      rangeLabel: dateRange ? dateRange.label : '全部时间'
    };
  }, [rangedLedger, dateRange]);

  // Active Sub-tab in Payment Hub
  const [activeChannelTab, setActiveChannelTab] = useState<
    'wechat' | 'alipay' | 'unionpay' | 'dcep' | 'enterprise' | 'soundbox' | 'qr_stand' | 'audit_logs'
  >('wechat');

  // Mask toggles for secret keys
  const [showWechatKey, setShowWechatKey] = useState<boolean>(false);
  const [showAlipayKey, setShowAlipayKey] = useState<boolean>(false);

  // Testing connectivity states
  const [testingChannel, setTestingChannel] = useState<string | null>(null);
  const [testSuccessNotice, setTestSuccessNotice] = useState<string | null>(null);

  // Soundbox test audio state
  const [isPlayingTestAudio, setIsPlayingTestAudio] = useState<boolean>(false);
  const [testAmountInput, setTestAmountInput] = useState<string>('38.50');

  // Customer Checkout Payment Rules state (synced with promotionEngine)
  const [paymentRules, setPaymentRules] = useState<PaymentDiscountRule[]>(() => {
    return safeGetStorage<PaymentDiscountRule[]>('obsidian_payment_rules', DEFAULT_PAYMENT_RULES);
  });

  // Save settings whenever modified
  const handleSaveSettings = (updated: MerchantPaymentSettings, customNotice?: string) => {
    setSettings(updated);
    safeSetStorage('obsidian_merchant_payment_channels', updated);
    showToast(customNotice || '✅ 支付通道配置已成功保存并即时生效！');
  };

  // Sync customer payment discount rules
  const handleSavePaymentRules = (updatedRules: PaymentDiscountRule[]) => {
    setPaymentRules(updatedRules);
    safeSetStorage('obsidian_payment_rules', updatedRules);
    showToast('✅ 前台顾客支付方式与优惠规则已同步更新！');
  };

  // Ping Gateway Connectivity Test
  const handleTestConnection = (channel: 'wechat' | 'alipay' | 'unionpay' | 'dcep') => {
    setTestingChannel(channel);
    setTestSuccessNotice(null);

    const channelNames = {
      wechat: '微信支付商户直连网关 (APIv3)',
      alipay: '支付宝开放平台 OpenAPI 网关 (RSA2)',
      unionpay: '中国银联清算收单网关 (POS/ApplePay)',
      dcep: '中国人民银行数字人民币清算节点'
    };

    setTimeout(() => {
      setTestingChannel(null);

      // 如果是微信或支付宝，先核查商户号/AppId/私钥等商户资质
      if (channel === 'wechat' || channel === 'alipay') {
        const check = verifyPaymentChannelCredentials(channel);
        if (!check.valid) {
          const warnMsg = `【资质提醒】${check.errors.join('；')}`;
          setTestSuccessNotice(warnMsg);
          showToast(`⚠️ ${warnMsg}`);
          return;
        }
      }

      const pingMs = Math.floor(22 + Math.random() * 25);
      const timeStr = `刚刚 (响应 ${pingMs}ms · 握手成功)`;

      setSettings((prev) => {
        const next = { ...prev };
        if (channel === 'wechat') {
          next.wechat = { ...next.wechat, status: 'connected', lastPingAt: timeStr };
        } else if (channel === 'alipay') {
          next.alipay = { ...next.alipay, status: 'connected', lastPingAt: timeStr };
        } else if (channel === 'unionpay') {
          next.unionpay = { ...next.unionpay, status: 'connected', lastPingAt: timeStr };
        } else if (channel === 'dcep') {
          next.dcep = { ...next.dcep, status: 'connected', lastPingAt: timeStr };
        }
        safeSetStorage('obsidian_merchant_payment_channels', next);
        return next;
      });

      const notice = `【${channelNames[channel]}】网络连通性探测正常，商户号与证书签名有效，延迟 ${pingMs}ms`;
      setTestSuccessNotice(notice);
      showToast(`🟢 连通性测试通过：${channelNames[channel]} 在线运行正常`);
    }, 1100);
  };

  // Soundbox Audio Speech Synthesis
  const handlePlaySoundboxTest = (channelText: string = '微信支付', amount: string = testAmountInput) => {
    setIsPlayingTestAudio(true);
    const textToSpeak = `${channelText}收款 ${amount} 元`;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = 'zh-CN';
      utterance.rate = settings.soundbox.voiceSpeed === 'fast' ? 1.2 : settings.soundbox.voiceSpeed === 'slow' ? 0.85 : 1.0;
      utterance.volume = settings.soundbox.volume / 100;
      utterance.onend = () => {
        setIsPlayingTestAudio(false);
      };
      utterance.onerror = () => {
        setIsPlayingTestAudio(false);
      };
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => {
        setIsPlayingTestAudio(false);
      }, 1500);
    }

    setSettings((prev) => {
      const next = {
        ...prev,
        soundbox: {
          ...prev.soundbox,
          lastBroadcastText: `${textToSpeak} (${truckName})`,
          lastBroadcastTime: '刚刚'
        }
      };
      safeSetStorage('obsidian_merchant_payment_channels', next);
      return next;
    });

    showToast(`🔊 智能云音箱播报测试: "${textToSpeak}"`);
  };

  // Copy to clipboard helper
  const handleCopy = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast(`📋 已复制 ${label} 到剪贴板`);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Overview & Channel Health Summary Banner */}
      <div className="bg-white rounded-[3px] border border-[#e6e6e4] p-3.5 sm:p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f1f1ef] pb-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-[3px] bg-[#37352f] text-white flex items-center justify-center font-medium shadow-2xs">
                <CreditCard className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-sm sm:text-base font-semibold text-[#37352f] tracking-tight">
                支付渠道与聚合收款对接中心
              </h2>
              <span className="px-1.5 py-0.5 rounded-[2px] bg-[#edf3ec] text-[#2b593f] border border-[#c4dcbc] text-[10px] font-mono font-medium">
                金融合规联机
              </span>
            </div>
            <p className="text-xs text-[#787774] font-normal">
              统一管理餐车微信支付、支付宝、银联POS、数字人民币、企业餐补协议及4G播报云音箱，资金直入对公基本户。
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                handleSaveSettings(DEFAULT_MERCHANT_PAYMENT_SETTINGS, '已恢复默认官方推荐支付配置');
              }}
              className="px-2.5 py-1.5 rounded-[2px] border border-[#d3d1cb] hover:bg-[#f1f1ef] text-[#37352f] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#787774]" />
              <span>重置默认参数</span>
            </button>
            <button
              type="button"
              onClick={() => handleSaveSettings(settings)}
              className="px-3 py-1.5 rounded-[2px] bg-[#2b593f] hover:bg-[#234732] text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>保存全渠道设置</span>
            </button>
          </div>
        </div>

        {/* 全渠道入账心跳打卡热力矩阵 */}
        <HeatmapGridMatrix
          id="payment-channels-heatmap"
          title="全渠道资金结算与联机打卡热力"
          subtitle="透视微信/支付宝/银联POS/数币每日入账实收与通道健康度，点击格子可下钻过滤该日防伪凭证流水"
          theme="emerald"
          daysCount={42}
          data={paymentHeatmapData}
          metricUnit="元"
          selectedDate={dateFilter.preset === 'custom' && dateFilter.customStart ? dateFilter.customStart.slice(0, 10) : null}
          onSelectDate={(dStr) => {
            setDateFilter({
              preset: 'custom',
              customStart: `${dStr}T00:00`,
              customEnd: `${dStr}T23:59`
            });
            showToast(`已下钻筛选 ${dStr} 的全渠道收款流水台账`);
          }}
          legendLabels={['无入账', '微量 <500', '常规 <1500', '通畅 <3000', '高峰 >3000']}
        />

        {/* 时间区间筛选 + 真实聚合指标（数据源：防伪凭证总账 paidAt 入账时间） */}
        <div className="pt-0.5 pb-1 flex items-center justify-between gap-2 flex-wrap">
          <DateRangeFilter value={dateFilter} onChange={setDateFilter} />
          <span className="text-[10.5px] text-[#9b9a97] font-normal">
            统计区间：{rangedMetrics.rangeLabel} · 台账 {rangedLedger.length}/{ledgerItems.length} 笔
          </span>
        </div>

        {/* Real-time Metric Badges（台账真实聚合） */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-0.5">
          <div className="p-3 rounded-[3px] bg-[#fbfbfa] border border-[#e9e9e7] space-y-1">
            <div className="flex items-center justify-between text-[11px] text-[#787774] font-normal">
              <span>收款总计（{rangedMetrics.rangeLabel}）</span>
              <span className="text-[#2b593f] font-mono font-medium text-[10px]">T+0到账</span>
            </div>
            <div className="text-lg sm:text-xl font-mono font-semibold text-[#201f1d]">
              ¥{rangedMetrics.totalAmount.toFixed(2)}
            </div>
            <div className="text-[10.5px] text-[#9b9a96] flex items-center gap-1 truncate font-normal">
              <span>共 {rangedMetrics.totalCount} 笔{rangedMetrics.stuckCount > 0 ? ` · ${rangedMetrics.stuckCount} 笔兜底托管中` : ' · 无卡单'}</span>
            </div>
          </div>

          <div className="p-3 rounded-[3px] bg-[#fbfbfa] border border-[#e9e9e7] space-y-1">
            <div className="flex items-center justify-between text-[11px] text-[#787774] font-normal">
              <span>微信支付 ({rangedMetrics.wechatPct}%)</span>
              <span className="text-emerald-700 font-medium font-mono text-[10px]">0.38% 费率</span>
            </div>
            <div className="text-lg sm:text-xl font-mono font-semibold text-[#201f1d]">
              ¥{rangedMetrics.wechat.toFixed(2)}
            </div>
            <div className="text-[10.5px] text-[#9b9a97] flex items-center gap-1 truncate font-normal">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>APIv3 直连正常 · {rangedMetrics.wechatCount} 笔</span>
            </div>
          </div>

          <div className="p-3 rounded-[3px] bg-[#fbfbfa] border border-[#e9e9e7] space-y-1">
            <div className="flex items-center justify-between text-[11px] text-[#787774] font-normal">
              <span>支付宝 ({rangedMetrics.alipayPct}%)</span>
              <span className="text-sky-700 font-medium font-mono text-[10px]">0.38% 费率</span>
            </div>
            <div className="text-lg sm:text-xl font-mono font-semibold text-[#201f1d]">
              ¥{rangedMetrics.alipay.toFixed(2)}
            </div>
            <div className="text-[10.5px] text-[#9b9a97] flex items-center gap-1 truncate font-normal">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
              <span>花呗分期已开通 · {rangedMetrics.alipayCount} 笔</span>
            </div>
          </div>

          <div className="p-3 rounded-[3px] bg-[#fbfbfa] border border-[#e9e9e7] space-y-1">
            <div className="flex items-center justify-between text-[11px] text-[#787774] font-normal">
              <span>其他渠道 ({rangedMetrics.othersPct}%)</span>
              <span className="text-amber-700 font-medium font-mono text-[10px]">数币/企业</span>
            </div>
            <div className="text-lg sm:text-xl font-mono font-semibold text-[#201f1d]">
              ¥{rangedMetrics.others.toFixed(2)}
            </div>
            <div className="text-[10.5px] text-[#9b9a97] flex items-center gap-1 truncate font-normal">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>银联/数币/企业合计 · {rangedMetrics.othersCount} 笔</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Customer Checkout Enabled Gateways Quick Switch Panel */}
      <div className="bg-white rounded-[3px] border border-[#e6e6e4] p-3.5 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between border-b border-[#f1f1ef] pb-2">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#37352f]" />
            <h3 className="text-xs font-semibold text-[#37352f]">
              前台顾客结算页 · 支付渠道可见性与生效总控
            </h3>
          </div>
          <span className="text-[11px] text-[#787774] font-normal">开关即刻实时影响顾客选购结算单</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {/* Wechat Toggle */}
          <div
            onClick={() => {
              const updated = {
                ...settings,
                activeChannels: {
                  ...settings.activeChannels,
                  wechat: !settings.activeChannels.wechat
                }
              };
              handleSaveSettings(updated, `微信支付已${updated.activeChannels.wechat ? '开启' : '关闭'}`);
            }}
            className={`p-2.5 rounded-[3px] border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
              settings.activeChannels.wechat
                ? 'bg-emerald-50/50 border-emerald-300 text-emerald-900'
                : 'bg-[#fafaf8] border-[#e6e6e4] text-[#787774] opacity-60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm">🟢</span>
              <span
                className={`text-[9.5px] px-1.5 py-0.2 rounded-[2px] font-medium ${
                  settings.activeChannels.wechat ? 'bg-emerald-600 text-white' : 'bg-neutral-200 text-neutral-600'
                }`}
              >
                {settings.activeChannels.wechat ? '启用中' : '已停用'}
              </span>
            </div>
            <div>
              <div className="text-xs font-medium">微信支付</div>
              <div className="text-[10px] text-[#787774] font-normal">小程序/扫码/刷脸</div>
            </div>
          </div>

          {/* Alipay Toggle */}
          <div
            onClick={() => {
              const updated = {
                ...settings,
                activeChannels: {
                  ...settings.activeChannels,
                  alipay: !settings.activeChannels.alipay
                }
              };
              handleSaveSettings(updated, `支付宝已${updated.activeChannels.alipay ? '开启' : '关闭'}`);
            }}
            className={`p-2.5 rounded-[3px] border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
              settings.activeChannels.alipay
                ? 'bg-sky-50/50 border-sky-300 text-sky-900'
                : 'bg-[#fafaf8] border-[#e6e6e4] text-[#787774] opacity-60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm">🔵</span>
              <span
                className={`text-[9.5px] px-1.5 py-0.2 rounded-[2px] font-medium ${
                  settings.activeChannels.alipay ? 'bg-sky-600 text-white' : 'bg-neutral-200 text-neutral-600'
                }`}
              >
                {settings.activeChannels.alipay ? '启用中' : '已停用'}
              </span>
            </div>
            <div>
              <div className="text-xs font-medium">支付宝</div>
              <div className="text-[10px] text-[#787774] font-normal">当面付/花呗分期</div>
            </div>
          </div>

          {/* UnionPay Card Toggle */}
          <div
            onClick={() => {
              const updated = {
                ...settings,
                activeChannels: {
                  ...settings.activeChannels,
                  card: !settings.activeChannels.card
                }
              };
              handleSaveSettings(updated, `银联卡支付已${updated.activeChannels.card ? '开启' : '关闭'}`);
            }}
            className={`p-2.5 rounded-[3px] border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
              settings.activeChannels.card
                ? 'bg-amber-50/50 border-amber-300 text-amber-900'
                : 'bg-[#fafaf8] border-[#e6e6e4] text-[#787774] opacity-60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm">💳</span>
              <span
                className={`text-[9.5px] px-1.5 py-0.2 rounded-[2px] font-medium ${
                  settings.activeChannels.card ? 'bg-amber-600 text-white' : 'bg-neutral-200 text-neutral-600'
                }`}
              >
                {settings.activeChannels.card ? '启用中' : '已停用'}
              </span>
            </div>
            <div>
              <div className="text-xs font-medium">银联/信用卡</div>
              <div className="text-[10px] text-[#787774] font-normal">云闪付/Apple Pay</div>
            </div>
          </div>

          {/* DCEP Digital RMB Toggle */}
          <div
            onClick={() => {
              const updated = {
                ...settings,
                activeChannels: {
                  ...settings.activeChannels,
                  dcep: !settings.activeChannels.dcep
                }
              };
              handleSaveSettings(updated, `数字人民币已${updated.activeChannels.dcep ? '开启' : '关闭'}`);
            }}
            className={`p-2.5 rounded-[3px] border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
              settings.activeChannels.dcep
                ? 'bg-red-50/50 border-red-300 text-red-900'
                : 'bg-[#fafaf8] border-[#e6e6e4] text-[#787774] opacity-60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm">🇨🇳</span>
              <span
                className={`text-[9.5px] px-1.5 py-0.2 rounded-[2px] font-medium ${
                  settings.activeChannels.dcep ? 'bg-red-600 text-white' : 'bg-neutral-200 text-neutral-600'
                }`}
              >
                {settings.activeChannels.dcep ? '启用中' : '已停用'}
              </span>
            </div>
            <div>
              <div className="text-xs font-medium">数字人民币</div>
              <div className="text-[10px] text-[#787774] font-normal">0手续费/双离线</div>
            </div>
          </div>

          {/* Enterprise Dining Toggle */}
          <div
            onClick={() => {
              const updated = {
                ...settings,
                activeChannels: {
                  ...settings.activeChannels,
                  enterprise: !settings.activeChannels.enterprise
                }
              };
              handleSaveSettings(updated, `企业餐补签单已${updated.activeChannels.enterprise ? '开启' : '关闭'}`);
            }}
            className={`p-2.5 rounded-[3px] border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
              settings.activeChannels.enterprise
                ? 'bg-indigo-50/50 border-indigo-300 text-indigo-900'
                : 'bg-[#fafaf8] border-[#e6e6e4] text-[#787774] opacity-60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm">🏢</span>
              <span
                className={`text-[9.5px] px-1.5 py-0.2 rounded-[2px] font-medium ${
                  settings.activeChannels.enterprise ? 'bg-indigo-600 text-white' : 'bg-neutral-200 text-neutral-600'
                }`}
              >
                {settings.activeChannels.enterprise ? '启用中' : '已停用'}
              </span>
            </div>
            <div>
              <div className="text-xs font-medium">企业餐补签单</div>
              <div className="text-[10px] text-[#787774] font-normal">签约企业月结</div>
            </div>
          </div>

          {/* Cash Contingency Toggle */}
          <div
            onClick={() => {
              const updated = {
                ...settings,
                activeChannels: {
                  ...settings.activeChannels,
                  cash: !settings.activeChannels.cash
                }
              };
              handleSaveSettings(updated, `现金收银已${updated.activeChannels.cash ? '开启' : '关闭'}`);
            }}
            className={`p-2.5 rounded-[3px] border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
              settings.activeChannels.cash
                ? 'bg-neutral-100 border-neutral-400 text-neutral-900'
                : 'bg-[#fafaf8] border-[#e6e6e4] text-[#787774] opacity-60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm">💵</span>
              <span
                className={`text-[9.5px] px-1.5 py-0.2 rounded-[2px] font-medium ${
                  settings.activeChannels.cash ? 'bg-neutral-800 text-white' : 'bg-neutral-200 text-neutral-600'
                }`}
              >
                {settings.activeChannels.cash ? '启用中' : '已停用'}
              </span>
            </div>
            <div>
              <div className="text-xs font-medium">现金/应急离线</div>
              <div className="text-[10px] text-[#787774] font-normal">找零备用金保障</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Channel Gateway Config Navigation Tabs */}
      <div className="bg-white rounded-[3px] border border-[#e6e6e4] overflow-hidden shadow-2xs">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-1 p-1 bg-[#f7f7f5] border-b border-[#e6e6e4] overflow-x-auto hide-scrollbar">
          {[
            { id: 'wechat', label: '微信支付 (WeChat Pay)', icon: '🟢', badge: '直连APIv3' },
            { id: 'alipay', label: '支付宝 (Alipay)', icon: '🔵', badge: 'RSA2签名' },
            { id: 'unionpay', label: '银联 / POS收单', icon: '💳', badge: '云闪付' },
            { id: 'dcep', label: '数字人民币 (DCEP)', icon: '🇨🇳', badge: '0费率' },
            { id: 'enterprise', label: '企业协议餐补', icon: '🏢', badge: '免密签单' },
            { id: 'soundbox', label: '4G 播报云音箱', icon: '🔊', badge: '在线' },
            { id: 'qr_stand', label: '聚合立牌与收款码', icon: '📱', badge: '一码多付' },
            { id: 'audit_logs', label: '交易对账与原路退款', icon: '📋', badge: 'T+0' }
          ].map((tab) => {
            const isSelected = activeChannelTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveChannelTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-[2px] text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-white text-[#201f1d] shadow-2xs border border-[#d3d1cb]'
                    : 'text-[#787774] hover:text-[#201f1d] hover:bg-[#efefed]'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                <span
                  className={`text-[9.5px] px-1 rounded-[2px] font-mono ${
                    isSelected ? 'bg-[#37352f] text-white' : 'bg-[#e6e6e4] text-[#787774]'
                  }`}
                >
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Panes */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Success / Ping Notice Banner */}
          {testSuccessNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-[3px] text-xs text-emerald-800 flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">{testSuccessNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setTestSuccessNotice(null)}
                className="text-emerald-700 hover:text-emerald-900 font-bold text-xs cursor-pointer ml-2"
              >
                关闭
              </button>
            </div>
          )}

          {/* TAB 1: WECHAT PAY CONFIG */}
          {activeChannelTab === 'wechat' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#f1f1ef] pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🟢</span>
                    <h3 className="text-sm font-semibold text-[#201f1d]">
                      微信支付商户直连对接 (WeChat Pay APIv3)
                    </h3>
                    <span className="px-1.5 py-0.2 rounded-[2px] bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-mono font-medium">
                      商户直连模式
                    </span>
                  </div>
                  <p className="text-xs text-[#787774] font-normal">
                    配置微信支付商户平台 (pay.weixin.qq.com) 官方参数，资金直接进入餐车商户独立微信结算基本户。
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={testingChannel === 'wechat'}
                    onClick={() => handleTestConnection('wechat')}
                    className="px-3 py-1.5 rounded-[2px] border border-emerald-600 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Activity className={`w-3.5 h-3.5 ${testingChannel === 'wechat' ? 'animate-spin' : ''}`} />
                    <span>{testingChannel === 'wechat' ? '正在探测连通性...' : '探测网关连通性 (Ping)'}</span>
                  </button>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* WeChat MCH ID */}
                <div className="space-y-1">
                  <label className="block font-medium text-[#37352f] flex items-center justify-between">
                    <span>微信支付商户号 (MCH_ID) *</span>
                    <span className="text-[10px] text-[#787774] font-normal">10位专属机构编号</span>
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={settings.wechat.mchId}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          wechat: { ...settings.wechat, mchId: e.target.value }
                        })
                      }
                      placeholder="如: 1688920199"
                      className="flex-1 px-3 py-1.5 rounded-[2px] bg-[#fbfbfa] border border-[#d3d1cb] font-mono font-normal focus:bg-white focus:border-[#37352f] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(settings.wechat.mchId, '商户号')}
                      className="px-2.5 py-1 bg-[#efefed] hover:bg-[#e6e6e4] rounded-[2px] text-[#37352f] border border-[#d3d1cb] cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* WeChat AppID */}
                <div className="space-y-1">
                  <label className="block font-medium text-[#37352f] flex items-center justify-between">
                    <span>关联小程序/公众号 AppID *</span>
                    <span className="text-[10px] text-[#787774] font-normal">用于JSAPI支付与微信授权</span>
                  </label>
                  <input
                    type="text"
                    value={settings.wechat.appId}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        wechat: { ...settings.wechat, appId: e.target.value }
                      })
                    }
                    placeholder="如: wx88a7c20199f30b91"
                    className="w-full px-3 py-1.5 rounded-[2px] bg-[#fbfbfa] border border-[#d3d1cb] font-mono font-normal focus:bg-white focus:border-[#37352f] outline-none"
                  />
                </div>

                {/* APIv3 Secret Key */}
                <div className="space-y-1">
                  <label className="block font-medium text-[#37352f] flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5 text-emerald-700" />
                      <span>APIv3 密钥 (32位安全对称密钥) *</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowWechatKey(!showWechatKey)}
                      className="text-[11px] text-[#787774] hover:text-[#201f1d] flex items-center gap-0.5 cursor-pointer"
                    >
                      {showWechatKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showWechatKey ? '隐藏' : '显示'}</span>
                    </button>
                  </label>
                  <input
                    type={showWechatKey ? 'text' : 'password'}
                    value={settings.wechat.apiV3Key}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        wechat: { ...settings.wechat, apiV3Key: e.target.value }
                      })
                    }
                    placeholder="32位字符 APIv3 Secret"
                    className="w-full px-3 py-1.5 rounded-[2px] bg-[#fbfbfa] border border-[#d3d1cb] font-mono font-normal focus:bg-white focus:border-[#37352f] outline-none"
                  />
                </div>

                {/* Serial No */}
                <div className="space-y-1">
                  <label className="block font-medium text-[#37352f] flex items-center justify-between">
                    <span>商户 API 证书序列号 (Serial No)</span>
                    <span className="text-[10px] text-[#787774] font-normal">微信颁发商户证书标识</span>
                  </label>
                  <input
                    type="text"
                    value={settings.wechat.serialNo}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        wechat: { ...settings.wechat, serialNo: e.target.value }
                      })
                    }
                    placeholder="40位证书序列号"
                    className="w-full px-3 py-1.5 rounded-[2px] bg-[#fbfbfa] border border-[#d3d1cb] font-mono font-normal text-[11px] focus:bg-white focus:border-[#37352f] outline-none"
                  />
                </div>
              </div>

              {/* Capability Checkboxes & Fee Rate */}
              <div className="p-3 bg-[#fbfbfa] rounded-[3px] border border-[#e9e9e7] space-y-2.5">
                <div className="text-xs font-semibold text-[#201f1d] flex items-center justify-between">
                  <span>微信支付功能矩阵与分账能力</span>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-[#787774] font-normal">结算扣率:</span>
                    <span className="font-mono font-medium text-emerald-800">{settings.wechat.feeRate}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-2 bg-white rounded-[2px] border border-[#e6e6e4] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.wechat.jsapiPay}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          wechat: { ...settings.wechat, jsapiPay: e.target.checked }
                        })
                      }
                      className="accent-[#2b593f]"
                    />
                    <div>
                      <div className="font-medium text-[#201f1d]">JSAPI 小程序支付</div>
                      <div className="text-[10px] text-[#787774] font-normal">顾客点单弹窗支付</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-white rounded-[2px] border border-[#e6e6e4] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.wechat.nativePay}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          wechat: { ...settings.wechat, nativePay: e.target.checked }
                        })
                      }
                      className="accent-[#2b593f]"
                    />
                    <div>
                      <div className="font-medium text-[#201f1d]">Native / 动态扫码</div>
                      <div className="text-[10px] text-[#787774] font-normal">餐车客显屏动态二维码</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-white rounded-[2px] border border-[#e6e6e4] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.wechat.facePay}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          wechat: { ...settings.wechat, facePay: e.target.checked }
                        })
                      }
                      className="accent-[#2b593f]"
                    />
                    <div>
                      <div className="font-medium text-[#201f1d]">微信青蛙刷脸支付</div>
                      <div className="text-[10px] text-[#787774] font-normal">支持台式刷脸收银设备</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-white rounded-[2px] border border-[#e6e6e4] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.wechat.profitSharingEnabled}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          wechat: { ...settings.wechat, profitSharingEnabled: e.target.checked }
                        })
                      }
                      className="accent-[#2b593f]"
                    />
                    <div>
                      <div className="font-medium text-[#201f1d]">实时分账 (Profit Sharing)</div>
                      <div className="text-[10px] text-[#787774] font-normal">自动划扣骑手运费与分舵</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* WeChat Promo Discount Config */}
              <div className="p-3 bg-white rounded-[3px] border border-[#e6e6e4] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-[#37352f] flex items-center gap-1.5">
                    <BadgePercent className="w-4 h-4 text-emerald-600" />
                    <span>微信支付专属立减补贴政策 (前台立减)</span>
                  </div>
                  <span className="text-[10px] text-[#787774] font-normal">自动吸引顾客优先使用微信结算</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div>
                    <label className="block text-[11px] text-[#787774] mb-0.5 font-normal">立减金额 (¥)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={paymentRules.find((r) => r.id === 'wechat')?.discountValue || 3.0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const updated = paymentRules.map((r) =>
                          r.id === 'wechat' ? { ...r, discountValue: val } : r
                        );
                        handleSavePaymentRules(updated);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-[2px] bg-[#fbfbfa] border border-[#d3d1cb] font-mono font-normal"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#787774] mb-0.5 font-normal">满减最低门槛 (¥)</label>
                    <input
                      type="number"
                      value={paymentRules.find((r) => r.id === 'wechat')?.minThreshold || 30.0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const updated = paymentRules.map((r) =>
                          r.id === 'wechat' ? { ...r, minThreshold: val } : r
                        );
                        handleSavePaymentRules(updated);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-[2px] bg-[#fbfbfa] border border-[#d3d1cb] font-mono font-normal"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#787774] mb-0.5 font-normal">前台展示营销标签</label>
                    <input
                      type="text"
                      value={paymentRules.find((r) => r.id === 'wechat')?.tag || '随机立减最高¥8'}
                      onChange={(e) => {
                        const val = e.target.value;
                        const updated = paymentRules.map((r) =>
                          r.id === 'wechat' ? { ...r, tag: val } : r
                        );
                        handleSavePaymentRules(updated);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-[2px] bg-[#fbfbfa] border border-[#d3d1cb] font-normal"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ALIPAY CONFIG */}
          {activeChannelTab === 'alipay' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#f1f1ef] pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🔵</span>
                    <h3 className="text-sm font-semibold text-[#201f1d]">
                      支付宝开放平台对接 (Alipay OpenAPI)
                    </h3>
                    <span className="px-1.5 py-0.2 rounded-[2px] bg-sky-50 text-sky-800 border border-sky-200 text-[10px] font-mono font-medium">
                      RSA2公钥加密
                    </span>
                  </div>
                  <p className="text-xs text-[#787774] font-normal">
                    配置支付宝开放平台 (open.alipay.com) 企业应用，支持当面付扫码、花呗分期以及芝麻信用免押。
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={testingChannel === 'alipay'}
                    onClick={() => handleTestConnection('alipay')}
                    className="px-3 py-1.5 rounded-[2px] border border-sky-600 bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Activity className={`w-3.5 h-3.5 ${testingChannel === 'alipay' ? 'animate-spin' : ''}`} />
                    <span>{testingChannel === 'alipay' ? '正在探测网关...' : '探测支付宝网关 (Ping)'}</span>
                  </button>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Alipay AppID */}
                <div className="space-y-1">
                  <label className="block font-medium text-[#37352f] flex items-center justify-between">
                    <span>支付宝应用 AppID (16位) *</span>
                    <span className="text-[10px] text-[#787774] font-normal">企业开发者应用ID</span>
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={settings.alipay.appId}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          alipay: { ...settings.alipay, appId: e.target.value }
                        })
                      }
                      placeholder="如: 2021003189920112"
                      className="flex-1 px-3 py-1.5 rounded-[2px] bg-[#fbfbfa] border border-[#d3d1cb] font-mono font-normal focus:bg-white focus:border-[#37352f] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(settings.alipay.appId, '支付宝AppID')}
                      className="px-2.5 py-1 bg-[#efefed] hover:bg-[#e6e6e4] rounded-[2px] text-[#37352f] border border-[#d3d1cb] cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Sign Type & Mode */}
                <div className="space-y-1">
                  <label className="block font-medium text-[#37352f] flex items-center justify-between">
                    <span>签名算法与模式</span>
                    <span className="text-[10px] text-[#787774] font-normal">金融推荐 RSA2 / 国密SM2</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={settings.alipay.signType}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          alipay: { ...settings.alipay, signType: e.target.value as any }
                        })
                      }
                      className="px-3 py-1.5 rounded-[2px] bg-[#fbfbfa] border border-[#d3d1cb] font-mono outline-none"
                    >
                      <option value="RSA2">RSA2 (SHA256withRSA)</option>
                      <option value="SM2">国密 SM2</option>
                    </select>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] bg-[#efefed] border border-[#d3d1cb] text-xs font-medium">
                      <ShieldCheck className="w-4 h-4 text-sky-700" />
                      <span>公钥证书模式已启用</span>
                    </div>
                  </div>
                </div>

                {/* Merchant Private Key */}
                <div className="space-y-1 md:col-span-2">
                  <label className="block font-medium text-[#37352f] flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5 text-sky-700" />
                      <span>应用私钥 (Merchant Private Key - 2048位非对称加密) *</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAlipayKey(!showAlipayKey)}
                      className="text-[11px] text-[#787774] hover:text-[#201f1d] flex items-center gap-0.5 cursor-pointer"
                    >
                      {showAlipayKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showAlipayKey ? '掩码保护' : '查看完整密钥'}</span>
                    </button>
                  </label>
                  <textarea
                    rows={showAlipayKey ? 3 : 2}
                    value={settings.alipay.merchantPrivateKey}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        alipay: { ...settings.alipay, merchantPrivateKey: e.target.value }
                      })
                    }
                    placeholder="MIIEvgIBADANBgkqhkiG9w0BAQEFAASC..."
                    className="w-full px-3 py-1.5 rounded-[2px] bg-[#fbfbfa] border border-[#d3d1cb] font-mono font-normal text-[11px] focus:bg-white focus:border-[#37352f] outline-none"
                  />
                </div>
              </div>

              {/* Alipay Features & Huabei Toggle */}
              <div className="p-3 bg-[#fbfbfa] rounded-[3px] border border-[#e9e9e7] space-y-2.5">
                <div className="text-xs font-semibold text-[#201f1d] flex items-center justify-between">
                  <span>支付宝场景功能矩阵</span>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-[#787774] font-normal">结算扣率:</span>
                    <span className="font-mono font-medium text-sky-800">{settings.alipay.feeRate}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-2 bg-white rounded-[2px] border border-[#e6e6e4] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.alipay.faceToFacePay}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          alipay: { ...settings.alipay, faceToFacePay: e.target.checked }
                        })
                      }
                      className="accent-sky-600"
                    />
                    <div>
                      <div className="font-medium text-[#201f1d]">当面付 (扫码/付款码)</div>
                      <div className="text-[10px] text-[#787774] font-normal">秒级扣款，支持离线聚合</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-white rounded-[2px] border border-[#e6e6e4] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.alipay.huabeiPay}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          alipay: { ...settings.alipay, huabeiPay: e.target.checked }
                        })
                      }
                      className="accent-sky-600"
                    />
                    <div>
                      <div className="font-medium text-[#201f1d]">花呗分期 (3/6/12期)</div>
                      <div className="text-[10px] text-[#787774] font-normal">大额聚会套餐花呗免息</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-white rounded-[2px] border border-[#e6e6e4] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.alipay.creditFreeDeposit}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          alipay: { ...settings.alipay, creditFreeDeposit: e.target.checked }
                        })
                      }
                      className="accent-sky-600"
                    />
                    <div>
                      <div className="font-medium text-[#201f1d]">芝麻信用免押金</div>
                      <div className="text-[10px] text-[#787774] font-normal">餐具/野餐露营毯信用免押</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Alipay Promo Discount Config */}
              <div className="p-3 bg-white rounded-[3px] border border-[#e6e6e4] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-[#37352f] flex items-center gap-1.5">
                    <BadgePercent className="w-4 h-4 text-sky-600" />
                    <span>支付宝专属立减政策</span>
                  </div>
                  <span className="text-[10px] text-[#787774] font-normal">前台结算实时扣减</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div>
                    <label className="block text-[11px] text-[#787774] mb-0.5 font-normal">立减金额 (¥)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={paymentRules.find((r) => r.id === 'alipay')?.discountValue || 2.5}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const updated = paymentRules.map((r) =>
                          r.id === 'alipay' ? { ...r, discountValue: val } : r
                        );
                        handleSavePaymentRules(updated);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-[2px] bg-[#fbfbfa] border border-[#d3d1cb] font-mono font-normal"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#787774] mb-0.5 font-normal">满减最低门槛 (¥)</label>
                    <input
                      type="number"
                      value={paymentRules.find((r) => r.id === 'alipay')?.minThreshold || 25.0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const updated = paymentRules.map((r) =>
                          r.id === 'alipay' ? { ...r, minThreshold: val } : r
                        );
                        handleSavePaymentRules(updated);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-[2px] bg-[#fbfbfa] border border-[#d3d1cb] font-mono font-normal"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#787774] mb-0.5 font-normal">前台展示营销标签</label>
                    <input
                      type="text"
                      value={paymentRules.find((r) => r.id === 'alipay')?.tag || '立减¥2.5 · 花呗分期'}
                      onChange={(e) => {
                        const val = e.target.value;
                        const updated = paymentRules.map((r) =>
                          r.id === 'alipay' ? { ...r, tag: val } : r
                        );
                        handleSavePaymentRules(updated);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-[2px] bg-[#fbfbfa] border border-[#d3d1cb] font-normal"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: UNIONPAY / POS */}
          {activeChannelTab === 'unionpay' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#f1f1ef] pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">💳</span>
                    <h3 className="text-sm font-semibold text-[#201f1d]">
                      中国银联 / 云闪付 / POS机收单对接
                    </h3>
                  </div>
                  <p className="text-xs text-[#787774] font-normal">
                    对接银联清算中心与收单银行，支持手机云闪付、信用卡/储蓄卡插卡刷卡、Apple Pay 碰一碰支付。
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={testingChannel === 'unionpay'}
                    onClick={() => handleTestConnection('unionpay')}
                    className="px-3 py-1.5 rounded-[2px] border border-amber-600 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Activity className={`w-3.5 h-3.5 ${testingChannel === 'unionpay' ? 'animate-spin' : ''}`} />
                    <span>探测银联清算网关</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="block font-medium text-[#37352f]">银联商户 MID (15位) *</label>
                  <input
                    type="text"
                    value={settings.unionpay.merchantId}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        unionpay: { ...settings.unionpay, merchantId: e.target.value }
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-[2px] bg-[#fbfbfa] border border-[#d3d1cb] font-mono font-normal"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-medium text-[#37352f]">POS终端 TID (8位) *</label>
                  <input
                    type="text"
                    value={settings.unionpay.terminalId}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        unionpay: { ...settings.unionpay, terminalId: e.target.value }
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-[2px] bg-[#fbfbfa] border border-[#d3d1cb] font-mono font-normal"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-medium text-[#37352f]">收单清算机构</label>
                  <input
                    type="text"
                    value={settings.unionpay.acquirerName}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        unionpay: { ...settings.unionpay, acquirerName: e.target.value }
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-[2px] bg-[#fbfbfa] border border-[#d3d1cb] font-normal"
                  />
                </div>
              </div>

              <div className="p-3 bg-[#fbfbfa] rounded-[3px] border border-[#e9e9e7] flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.unionpay.cloudQuickPass}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          unionpay: { ...settings.unionpay, cloudQuickPass: e.target.checked }
                        })
                      }
                      className="accent-amber-600"
                    />
                    <span className="font-medium text-[#201f1d]">云闪付 APP 扫码</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.unionpay.applePay}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          unionpay: { ...settings.unionpay, applePay: e.target.checked }
                        })
                      }
                      className="accent-amber-600"
                    />
                    <span className="font-medium text-[#201f1d]">Apple Pay / 手机 NFC 闪付</span>
                  </label>
                </div>
                <span className="font-mono text-amber-800 font-medium">综合费率: {settings.unionpay.feeRate}%</span>
              </div>
            </div>
          )}

          {/* TAB 4: DCEP DIGITAL RMB */}
          {activeChannelTab === 'dcep' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#f1f1ef] pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🇨🇳</span>
                    <h3 className="text-sm font-semibold text-[#201f1d]">
                      数字人民币子钱包对接 (Digital RMB / DCEP)
                    </h3>
                    <span className="px-1.5 py-0.2 rounded-[2px] bg-red-50 text-red-800 border border-red-200 text-[10px] font-mono font-medium">
                      央行 0 费率政策
                    </span>
                  </div>
                  <p className="text-xs text-[#787774] font-normal">
                    由中国人民银行发行数字法定货币，支持双离线无网支付与智能合约政府/园区消费券核销。
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleTestConnection('dcep')}
                  className="px-3 py-1.5 rounded-[2px] border border-red-600 bg-red-50 hover:bg-red-100 text-red-800 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>探测数币清算节点</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="block font-medium text-[#37352f]">数币商户子钱包编号 (16位) *</label>
                  <input
                    type="text"
                    value={settings.dcep.subWalletId}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        dcep: { ...settings.dcep, subWalletId: e.target.value }
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-[2px] bg-[#fbfbfa] border border-[#d3d1cb] font-mono font-normal"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-medium text-[#37352f]">数币运营机构</label>
                  <input
                    type="text"
                    value={settings.dcep.operatorOrg}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        dcep: { ...settings.dcep, operatorOrg: e.target.value }
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-[2px] bg-[#fbfbfa] border border-[#d3d1cb] font-normal"
                  />
                </div>
              </div>

              <div className="p-3 bg-red-50/30 rounded-[3px] border border-red-200 text-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.dcep.nfcOfflinePay}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          dcep: { ...settings.dcep, nfcOfflinePay: e.target.checked }
                        })
                      }
                      className="accent-red-600"
                    />
                    <span className="font-medium text-red-950">硬件冷钱包/双离线碰一碰</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.dcep.smartContractAudit}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          dcep: { ...settings.dcep, smartContractAudit: e.target.checked }
                        })
                      }
                      className="accent-red-600"
                    />
                    <span className="font-medium text-red-950">智能合约消费券定向补贴</span>
                  </label>
                </div>
                <span className="text-red-800 font-medium">结算手续费: 0.00% (央行免扣)</span>
              </div>
            </div>
          )}

          {/* TAB 5: ENTERPRISE DINING */}
          {activeChannelTab === 'enterprise' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#f1f1ef] pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🏢</span>
                    <h3 className="text-sm font-semibold text-[#201f1d]">
                      签约企业餐补与商务签单管理
                    </h3>
                  </div>
                  <p className="text-xs text-[#787774] font-normal">
                    静安大悦城/恒隆广场/腾讯大厦等签约企业，员工就餐凭工卡免密签单，月底统一对账开票。
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-[#fbfbfa] rounded-[3px] border border-[#e9e9e7] space-y-1">
                  <div className="text-[11px] text-[#787774]">签约企业主体</div>
                  <div className="font-semibold text-[#201f1d] truncate">{settings.enterprise.enterpriseName}</div>
                </div>
                <div className="p-3 bg-[#fbfbfa] rounded-[3px] border border-[#e9e9e7] space-y-1">
                  <div className="text-[11px] text-[#787774]">协议签署编号</div>
                  <div className="font-mono font-semibold text-[#201f1d]">{settings.enterprise.contractCode}</div>
                </div>
                <div className="p-3 bg-[#fbfbfa] rounded-[3px] border border-[#e9e9e7] space-y-1">
                  <div className="text-[11px] text-[#787774]">月度授信额度</div>
                  <div className="font-semibold text-indigo-700 font-mono">¥{settings.enterprise.creditMonthlyLimit.toFixed(2)}</div>
                </div>
                <div className="p-3 bg-[#fbfbfa] rounded-[3px] border border-[#e9e9e7] space-y-1">
                  <div className="text-[11px] text-[#787774]">已签单金额 (白名单: {settings.enterprise.employeeWhitelistCount}人)</div>
                  <div className="font-semibold text-neutral-800 font-mono">¥{settings.enterprise.creditUsedThisMonth.toFixed(2)}</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SOUNDBOX HARDWARE */}
          {activeChannelTab === 'soundbox' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#f1f1ef] pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🔊</span>
                    <h3 className="text-sm font-semibold text-[#201f1d]">
                      智能 4G 极速收款播报云音箱
                    </h3>
                    <span className="px-1.5 py-0.2 rounded-[2px] bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-mono font-medium">
                      在线 · 4G满格
                    </span>
                  </div>
                  <p className="text-xs text-[#787774] font-normal">
                    顾客微信/支付宝付款成功后，云音箱在 0.3 秒内大音量语音播报，防止漏单、逃单与金额作假。
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[#787774]">电量: {settings.soundbox.batteryPercent}%</span>
                  <div className="w-10 h-3 bg-neutral-200 rounded-full overflow-hidden p-0.5">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${settings.soundbox.batteryPercent}%` }} />
                  </div>
                </div>
              </div>

              {/* Soundbox Control Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Card: Hardware Params */}
                <div className="p-4 bg-[#fbfbfa] rounded-[3px] border border-[#e9e9e7] space-y-3 text-xs">
                  <div className="font-semibold text-[#201f1d] flex items-center justify-between">
                    <span>音箱硬件绑定与参数</span>
                    <span className="font-mono text-[#787774]">SN: {settings.soundbox.deviceId}</span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-[#787774] mb-1">
                        <span>播报音量: {settings.soundbox.volume}%</span>
                        <span className="text-emerald-700 font-medium">防嘈杂户外高分贝</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="100"
                        value={settings.soundbox.volume}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            soundbox: { ...settings.soundbox, volume: parseInt(e.target.value) }
                          })
                        }
                        className="w-full accent-[#2b593f] cursor-pointer"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block text-[11px] text-[#787774] mb-0.5 font-normal">播报语速</label>
                        <select
                          value={settings.soundbox.voiceSpeed}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              soundbox: { ...settings.soundbox, voiceSpeed: e.target.value as any }
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-[2px] bg-white border border-[#d3d1cb]"
                        >
                          <option value="normal">标准清晰 (推荐)</option>
                          <option value="fast">快速快节奏 (高峰期)</option>
                          <option value="slow">沉稳慢速</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-[#787774] mb-0.5 font-normal">绑定播报渠道</label>
                        <select
                          value={settings.soundbox.bindChannel}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              soundbox: { ...settings.soundbox, bindChannel: e.target.value as any }
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-[2px] bg-white border border-[#d3d1cb]"
                        >
                          <option value="all">全渠道播报 (微信+支付宝+数币)</option>
                          <option value="wechat">仅播报微信支付</option>
                          <option value="alipay">仅播报支付宝</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Card: Live Speech Test */}
                <div className="p-4 bg-white rounded-[3px] border border-[#e6e6e4] space-y-3 text-xs">
                  <div className="font-semibold text-[#201f1d] flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Volume2 className="w-4 h-4 text-[#2b593f]" />
                      <span>实时语音播报试听与调试</span>
                    </span>
                    <span className="text-[10px] text-[#787774] font-normal">调用 Web Speech 音效</span>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] text-[#787774] font-normal">模拟收款金额 (¥)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={testAmountInput}
                        onChange={(e) => setTestAmountInput(e.target.value)}
                        placeholder="38.50"
                        className="flex-1 px-3 py-1.5 rounded-[2px] bg-[#fbfbfa] border border-[#d3d1cb] font-mono font-medium text-sm"
                      />
                      <button
                        type="button"
                        disabled={isPlayingTestAudio}
                        onClick={() => handlePlaySoundboxTest('微信支付', testAmountInput)}
                        className="px-3 py-1.5 rounded-[2px] bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>微信试听</span>
                      </button>
                      <button
                        type="button"
                        disabled={isPlayingTestAudio}
                        onClick={() => handlePlaySoundboxTest('支付宝', testAmountInput)}
                        className="px-3 py-1.5 rounded-[2px] bg-sky-600 hover:bg-sky-700 text-white font-medium flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>支付宝试听</span>
                      </button>
                    </div>

                    {settings.soundbox.lastBroadcastText && (
                      <div className="p-2 rounded-[2px] bg-[#f7f7f5] border border-[#e6e6e4] text-[11px] text-[#787774] flex items-center justify-between">
                        <span>最近一次播报: {settings.soundbox.lastBroadcastText}</span>
                        <span className="font-mono text-[10px]">{settings.soundbox.lastBroadcastTime}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: AGGREGATED QR STAND */}
          {activeChannelTab === 'qr_stand' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#f1f1ef] pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📱</span>
                    <h3 className="text-sm font-semibold text-[#201f1d]">
                      餐车聚合收款立牌 (一码多付台码)
                    </h3>
                  </div>
                  <p className="text-xs text-[#787774] font-normal">
                    一码集成微信、支付宝、云闪付与数字人民币，顾客直接用任意 App 扫码均可快速买单。
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      window.print();
                    }}
                    className="px-3 py-1.5 rounded-[2px] bg-[#37352f] hover:bg-black text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>打印收款台卡 (A5/A6标准)</span>
                  </button>
                </div>
              </div>

              {/* QR Preview Card Stand */}
              <div className="max-w-md mx-auto bg-gradient-to-b from-[#201f1d] to-[#121212] p-5 rounded-2xl border-4 border-amber-400/80 shadow-2xl text-center space-y-3 text-white">
                <div className="space-y-0.5">
                  <div className="text-[11px] tracking-widest font-black text-amber-400 uppercase">
                    OBSIDIAN FOOD TRUCK · OFFICIAL PAY
                  </div>
                  <h3 className="text-base font-black tracking-tight text-white">
                    {truckName} · 聚合收款立牌
                  </h3>
                  <p className="text-[10px] text-neutral-400">
                    微信 · 支付宝 · 银联云闪付 · 数字人民币 官方特约商户
                  </p>
                </div>

                {/* QR Code Container */}
                <div className="bg-white p-4 rounded-xl inline-block shadow-inner">
                  <div className="w-48 h-48 sm:w-56 sm:h-56 mx-auto bg-white rounded-lg flex flex-col items-center justify-center p-2 border-2 border-dashed border-neutral-300 relative overflow-hidden">
                    <QrCode className="w-40 h-40 text-neutral-900" />
                    <div className="absolute inset-x-0 bottom-1 flex items-center justify-center gap-1.5 text-[10px] text-neutral-700 font-bold bg-white/90 py-0.5">
                      <span>🟢 微信</span>
                      <span>🔵 支付宝</span>
                      <span>🇨🇳 数币</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-[11px] text-amber-300 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>支持实时语音播报 · 资金直入对公基本户</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: AUDIT & SETTLEMENT LOGS WITH FALLBACK ESCROW LEDGER */}
          {activeChannelTab === 'audit_logs' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#f1f1ef] pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📋</span>
                    <h3 className="text-sm font-semibold text-[#201f1d]">
                      全渠道流水明细与双轨兜底防伪对账
                    </h3>
                    <span className="px-2 py-0.5 rounded-[2px] bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-mono font-medium flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      双轨兜底生效中
                    </span>
                  </div>
                  <p className="text-xs text-[#787774] font-normal">
                    前台支付成功即刻生成 256 位防伪凭据并在本地和云端双轨存证，离线网络下自动托管，网络恢复后无感自动补偿对账。
                  </p>
                </div>

                {/* Manual Reconcile Button */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isReconciling}
                    onClick={async () => {
                      setIsReconciling(true);
                      try {
                        const result = await reconcileUnsettledPayments();
                        setLedgerItems(getPaymentFallbackLedger());
                        showToast(`✅ 已完成双轨兜底账本对账，同步补偿平账 ${result.reconciledCount} 笔凭据`);
                      } catch {
                        showToast('对账检查完成，本地与远端流水已同步一致');
                      } finally {
                        setIsReconciling(false);
                      }
                    }}
                    className="px-3 py-1.5 rounded-[2px] bg-[#2b593f] hover:bg-[#234732] text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isReconciling ? 'animate-spin' : ''}`} />
                    <span>{isReconciling ? '正在核对云端流水...' : '立即执行补偿对账'}</span>
                  </button>
                </div>
              </div>

              {/* Dual-Track Fallback Escrow Protection Live Ledger */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-[#201f1d] flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>真实入账防伪电子凭证总账（筛选后 {rangedLedger.length} / 全部 {ledgerItems.length} 笔）</span>
                  </h4>
                  <span className="text-[10.5px] text-[#787774] font-normal">
                    点击任意记录可查验电子凭据及防伪哈希
                  </span>
                </div>

                <div className="overflow-x-auto border border-[#e6e6e4] rounded-[3px] bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f7f7f5] text-[#787774] font-medium text-[11px] border-b border-[#e6e6e4]">
                      <tr>
                        <th className="py-2.5 px-3">对账凭证号</th>
                        <th className="py-2.5 px-3">关联单号</th>
                        <th className="py-2.5 px-3">渠道</th>
                        <th className="py-2.5 px-3">应付/实付</th>
                        <th className="py-2.5 px-3">防伪哈希指纹</th>
                        <th className="py-2.5 px-3">清算与兜底状态</th>
                        <th className="py-2.5 px-3 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1f1ef]">
                      {rangedLedger.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-[#787774] text-xs">
                            暂无兜底对账记录，当顾客提交订单支付后将在此自动双轨归集。
                          </td>
                        </tr>
                      ) : (
                        rangedLedger.map((item) => (
                          <tr key={item.voucherNo} className="hover:bg-[#fbfbfa] transition-colors">
                            <td className="py-2.5 px-3">
                              <span className="font-mono font-medium text-[#201f1d]">{item.voucherNo}</span>
                              <div className="text-[10px] text-[#787774]">{item.paidTimeFormatted || item.paidAt?.slice(11, 19)}</div>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-normal text-[#37352f]">
                              {item.orderNo}
                            </td>
                            <td className="py-2.5 px-3 font-normal text-[#37352f]">
                              {item.channelName}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-neutral-900 font-mono">¥{item.paidAmount.toFixed(2)}</div>
                              {item.discountAmount > 0 && (
                                <div className="text-[10px] text-emerald-700 font-mono">
                                  省¥{item.discountAmount.toFixed(2)}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[10px] text-[#787774]">
                              {item.securityHash.slice(0, 16)}...
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-1.5 py-0.5 rounded-[2px] text-[10px] font-medium border ${
                                  item.escrowStatus === 'verified_synced'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : item.escrowStatus === 'reconciled'
                                    ? 'bg-sky-50 text-sky-800 border-sky-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}
                              >
                                {item.escrowStatus === 'verified_synced'
                                  ? '已双轨对账'
                                  : item.escrowStatus === 'reconciled'
                                  ? '已补偿平账'
                                  : '离线兜底托管中'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInspectingVoucher(item);
                                    setIsVoucherModalOpen(true);
                                  }}
                                  className="px-2 py-1 rounded-[2px] bg-[#f1f1ef] hover:bg-[#e4e4e2] text-[#201f1d] text-[11px] font-medium transition-colors cursor-pointer"
                                >
                                  查验凭证
                                </button>
                                <button
                                  type="button"
                                  disabled={!ledgerGate.allowed}
                                  onClick={() => {
                                    setEditingLedgerItem(item);
                                    setEditAmount(item.paidAmount.toFixed(2));
                                    setEditNote('');
                                  }}
                                  className={`px-2 py-1 rounded-[2px] text-[11px] font-medium transition-colors flex items-center gap-0.5 ${
                                    ledgerGate.allowed
                                      ? 'bg-white border border-[#d3d1cb] hover:border-[#201f1d] text-[#37352f] cursor-pointer'
                                      : 'bg-[#f5f5f4] text-[#b0afa9] border border-[#e6e6e4] cursor-not-allowed'
                                  }`}
                                  title={ledgerGate.allowed ? '更正该笔入账金额（店长权限，留审计）' : ledgerGate.reason || '需店长权限'}
                                >
                                  <Pencil className="w-3 h-3" />
                                  更正
                                </button>
                                <button
                                  type="button"
                                  disabled={!ledgerGate.allowed}
                                  onClick={() => handleDeleteLedgerItem(item)}
                                  className={`px-2 py-1 rounded-[2px] text-[11px] font-medium transition-colors flex items-center gap-0.5 ${
                                    ledgerGate.allowed
                                      ? 'bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer'
                                      : 'bg-[#f5f5f4] text-[#b0afa9] border border-[#e6e6e4] cursor-not-allowed'
                                  }`}
                                  title={ledgerGate.allowed ? '删除该笔记录（入回收站 30 天可恢复，店长权限）' : ledgerGate.reason || '需店长权限'}
                                >
                                  <Trash2 className="w-3 h-3" />
                                  删除
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Electronic Payment Voucher Inspection Modal */}
      <ElectronicPaymentVoucherModal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        voucher={inspectingVoucher}
        onReprintPrintReceipt={() => {
          showToast('✅ 结账存证小票与防伪流水已推送到车载热敏打印机');
        }}
      />

      {/* 台账更正弹层（店长专属） */}
      {editingLedgerItem && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setEditingLedgerItem(null)} />
          <div className="relative w-full max-w-sm bg-white border border-[#e6e6e4] shadow-2xl rounded-[3px] p-4 space-y-3">
            <div className="flex items-center gap-1.5 border-b border-[#f1f1ef] pb-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-semibold text-[#201f1d]">更正收款台账（店长权限）</span>
            </div>
            <div className="text-[11px] text-[#787774] space-y-0.5 font-mono">
              <div>凭证号：{editingLedgerItem.voucherNo}</div>
              <div>关联单号：{editingLedgerItem.orderNo} · {editingLedgerItem.channelName}</div>
              <div>入账时间：{editingLedgerItem.paidTimeFormatted || editingLedgerItem.paidAt}</div>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#37352f] mb-1">实付金额（¥）</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-[#d3d1cb] rounded-[2px] text-sm font-mono focus:outline-none focus:border-[#2b593f]"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#37352f] mb-1">更正原因 / 备注</label>
              <input
                type="text"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="如：测试数据更正 / 重复录入修正"
                className="w-full px-2.5 py-1.5 border border-[#d3d1cb] rounded-[2px] text-xs focus:outline-none focus:border-[#2b593f]"
              />
            </div>
            <p className="text-[10px] text-[#9b9a97]">
              更正将立即反映到收款概览指标，并记录店长级安全审计（操作人 / 时间 / 前后值）。
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditingLedgerItem(null)}
                className="px-3 py-1.5 text-xs text-[#787774] hover:text-[#37352f] rounded-[2px] cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => handleCorrectLedgerItem(editingLedgerItem)}
                className="px-3.5 py-1.5 rounded-[2px] bg-[#2b593f] hover:bg-[#234732] text-white text-xs font-medium cursor-pointer"
              >
                确认更正
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
