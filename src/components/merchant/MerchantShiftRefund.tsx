import React, { useState, useMemo } from 'react';
import {
  RotateCcw,
  Receipt,
  CalendarCheck,
  CreditCard,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Plus,
  Clock,
  User,
  DollarSign,
  ShieldCheck,
  Sparkles,
  Phone,
  Search,
  Filter,
  Download,
  Check,
  X,
  FileText,
  AlertCircle
} from 'lucide-react';
import { ShiftRecord, RefundRecord, ReservationItem, Order } from '../../types';
import { INITIAL_SHIFTS, INITIAL_REFUNDS, INITIAL_RESERVATIONS } from '../../data/mockEnhancedData';
import { exportToCsv } from '../../utils/dataExportEngine';
import { executeRealPayRefund } from '../../utils/realPaymentCloudEngine';
import { businessTransactionEngine } from '../../utils/businessTransactionEngine';
import { HeatmapGridMatrix, HeatmapDataPoint } from '../common/HeatmapGridMatrix';
import { audioHaptics } from '../../utils/audioHaptics';
import { ThermalReceiptTicket, ThermalReceiptTicketProps } from '../common/ThermalReceiptTicket';

interface MerchantShiftRefundProps {
  showToast: (msg: string) => void;
  orders?: Order[];
  onAuditRefund?: (orderId: string, approved: boolean, rejectReason?: string) => void;
}

export const MerchantShiftRefund: React.FC<MerchantShiftRefundProps> = ({
  showToast,
  orders = [],
  onAuditRefund
}) => {
  const [subTab, setSubTab] = useState<'shift' | 'refund' | 'reservation' | 'customer_refund'>('shift');
  const [receiptModalData, setReceiptModalData] = useState<ThermalReceiptTicketProps | null>(null);

  // Shift state
  const [shifts, setShifts] = useState<ShiftRecord[]>(INITIAL_SHIFTS);
  const [isClosingShift, setIsClosingShift] = useState(false);
  const [closedBy, setClosedBy] = useState('陈收银 (EMP-8004)');
  const [successor, setSuccessor] = useState('王收银 (EMP-8005)');
  const [actualCashInput, setActualCashInput] = useState('500.0');
  const [diffReason, setDiffReason] = useState<any>('none');
  const [shiftNote, setShiftNote] = useState('晚班交接，外卖接单平稳');
  const [selectedShiftDate, setSelectedShiftDate] = useState<string | null>(null);

  // 42 天收银交接与钱箱对账打卡热力数据源
  const shiftHeatmapData: HeatmapDataPoint[] = useMemo(() => {
    const map = new Map<string, { totalSales: number; count: number; diff: number }>();
    shifts.forEach((s) => {
      const match = s.shiftNo.match(/\d{4}\d{2}\d{2}/);
      let dStr = '';
      if (match) {
        const raw = match[0];
        dStr = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
      } else {
        dStr = new Date().toISOString().slice(0, 10);
      }
      const cur = map.get(dStr) || { totalSales: 0, count: 0, diff: 0 };
      cur.totalSales += s.grossSales || 0;
      cur.count += 1;
      cur.diff += Math.abs(s.cashDiff || 0);
      map.set(dStr, cur);
    });

    const today = new Date();
    for (let i = 0; i < 42; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dStr = d.toISOString().slice(0, 10);
      if (!map.has(dStr)) {
        const dayOfWeek = d.getDay();
        const isBusy = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
        const sales = isBusy ? 4380 + ((i * 137) % 1500) : 2600 + ((i * 113) % 900);
        map.set(dStr, {
          totalSales: sales,
          count: 2,
          diff: i === 5 ? 8.0 : 0
        });
      }
    }

    const list: HeatmapDataPoint[] = [];
    map.forEach((val, dStr) => {
      const hasDiff = val.diff > 0;
      list.push({
        date: dStr,
        value: Math.round(val.totalSales),
        title: `${val.count}个班次 · ¥${val.totalSales.toFixed(1)}`,
        extraNote: hasDiff ? `钱箱差异 ¥${val.diff.toFixed(1)}` : '钱箱平账',
        status: hasDiff ? 'warning' : 'success',
        metrics: [
          { label: '营收', value: `¥${val.totalSales.toFixed(1)}` },
          { label: '钱箱', value: hasDiff ? `差异 ¥${val.diff.toFixed(1)}` : '平账 0.0' }
        ]
      });
    });
    return list;
  }, [shifts]);

  const displayedShifts = useMemo(() => {
    if (!selectedShiftDate) return shifts;
    const compactDate = selectedShiftDate.replace(/-/g, '');
    const filtered = shifts.filter((s) => s.shiftNo.replace(/-/g, '').includes(compactDate));
    return filtered.length > 0 ? filtered : shifts;
  }, [shifts, selectedShiftDate]);

  // Refund state
  const [refunds, setRefunds] = useState<RefundRecord[]>(INITIAL_REFUNDS);
  const [isCreatingRefund, setIsCreatingRefund] = useState(false);
  const [refundOrderNo, setRefundOrderNo] = useState('#ORD-9908');
  const [refundAmount, setRefundAmount] = useState('38.0');
  const [refundMethod, setRefundMethod] = useState('微信原路退款');
  const [refundReasonCategory, setRefundReasonCategory] = useState('taste_dislike');
  const [refundReasonNote, setRefundReasonNote] = useState('顾客反映生蚝偏咸，已协商退款');
  const [notifyKitchen, setNotifyKitchen] = useState(true);
  const [cookedIsLoss, setCookedIsLoss] = useState(true);
  const [managerAuthPin, setManagerAuthPin] = useState('');

  // Reservation state
  const [reservations, setReservations] = useState<ReservationItem[]>(INITIAL_RESERVATIONS);
  const [isAddingReservation, setIsAddingReservation] = useState(false);
  const [resName, setResName] = useState('张先生 (商务)');
  const [resPhone, setResPhone] = useState('138-0000-8888');
  const [resCount, setResCount] = useState('4');
  const [resTable, setResTable] = useState('A2');
  const [resTime, setResTime] = useState('20:00');
  const [resDeposit, setResDeposit] = useState('50.0');
  const [resNote, setResNote] = useState('需要安排靠窗景观位');

  // Submit Shift Close
  const openShiftReceiptModal = (s: ShiftRecord) => {
    audioHaptics.playTicketTear();
    setReceiptModalData({
      receiptNo: s.shiftNo,
      title: '收银班次日结与钱箱对账凭证',
      subtitle: `班次周期: ${s.startTime} ~ ${s.endTime}`,
      storeName: 'Urban Radar 流动餐车 #001',
      terminalNo: 'POS-CASH-DESK',
      cashierName: s.closedBy,
      timestamp: s.endTime,
      items: [
        { name: '微信支付流水归集', qty: 1, price: s.wechatSales, note: `${s.orderCount} 笔订单累计` },
        { name: '支付宝交易资金归集', qty: 1, price: s.alipaySales },
        { name: '现金实收记账', qty: 1, price: s.cashSales },
        { name: '钱箱实点现金', qty: 1, price: s.actualCash, note: s.diffReasonText }
      ],
      subtotal: s.grossSales,
      totalAmount: s.grossSales,
      payMethod: '多通道资金归集',
      stampText: s.cashDiff === 0 ? '已平账 0.0' : `差异 ¥${s.cashDiff.toFixed(1)}`,
      stampColor: s.cashDiff === 0 ? 'green' : 'amber'
    });
  };

  const handleCloseShiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const actualCash = parseFloat(actualCashInput) || 0;
    const systemCash = 500.0;
    const diff = actualCash - systemCash;

    const diffReasonLabels: Record<string, string> = {
      none: '钱箱实点现金与系统理论应收完全吻合',
      count_error: '点钞/清点失误误差',
      change_error: '顾客现金找零错误',
      unrecorded_sale: '漏单/未录入线下小额单',
      discount_mis: '折扣优惠遗漏'
    };

    const newShift: ShiftRecord = {
      id: `shift-${Date.now().toString().slice(-4)}`,
      shiftNo: `SFT-${Date.now().toString().slice(-6)}`,
      startTime: '10:00',
      endTime: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      closedBy,
      successor,
      grossSales: 5240.0,
      wechatSales: 3400.0,
      alipaySales: 1340.0,
      cashSales: systemCash,
      actualCash,
      cashDiff: diff,
      diffReason,
      diffReasonText: diffReasonLabels[diffReason] || '',
      orderCount: 46,
      note: shiftNote
    };

    setShifts([newShift, ...shifts]);
    setIsClosingShift(false);
    audioHaptics.playCashDrawerChime();
    openShiftReceiptModal(newShift);
    showToast(`交班完成！钱箱已弹出并生成拟真交班小票，营收 ¥${newShift.grossSales.toFixed(2)}`);
  };

  // Submit Refund
  const handleCreateRefundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(refundAmount) || 0;

    // Check manager authorization if > 200 or policy enabled
    if (amount >= 200 && managerAuthPin !== '8888') {
      audioHaptics.playWarningAlert();
      showToast('退款金额超过 ¥200 限制！请输入正确的主管授权 PIN 码 (演示: 8888)');
      return;
    }

    audioHaptics.playMechanicalLatch();

    const newRefund: RefundRecord = {
      id: `ref-${Date.now().toString().slice(-4)}`,
      refundNo: `RF-${Date.now().toString().slice(-6)}`,
      orderNo: refundOrderNo,
      date: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      amount,
      method: refundMethod,
      reasonCategory: refundReasonCategory,
      reasonNote: refundReasonNote,
      notifyKitchen,
      authorizedBy: amount >= 200 ? '李店长 (EMP-8001 主管授权)' : '陈收银 (EMP-8004)',
      cookedIsLoss,
      items: [{ name: '退款关联菜品项', quantity: 1, price: amount }],
      status: 'approved'
    };

    setRefunds([newRefund, ...refunds]);
    setIsCreatingRefund(false);
    showToast(
      `退款申请已通过！${cookedIsLoss ? '已自动联动后厨损耗单与审计日志' : '原路款项已退回'}`
    );
  };

  // Submit Reservation
  const handleAddReservationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const count = parseInt(resCount) || 2;
    const deposit = parseFloat(resDeposit) || 0;

    const newRes: ReservationItem = {
      id: `res-${Date.now().toString().slice(-4)}`,
      guestName: resName,
      phone: resPhone,
      guestCount: count,
      tableCode: resTable,
      reservationTime: resTime,
      countdownMin: 60,
      depositAmount: deposit,
      depositStatus: 'paid',
      status: 'confirmed',
      note: resNote
    };

    setReservations([newRes, ...reservations]);
    setIsAddingReservation(false);
    showToast(`桌台 ${resTable} 预定成功！已锁定台位并收取定金 ¥${deposit.toFixed(2)}`);
  };

  // 待审核的顾客线上退款申请
  const pendingCustomerRefunds = orders.filter(
    (o) => o.refundStatus === 'pending' || o.status === 'cancel_requested'
  );

  // 所有涉及退款售后的历史订单
  const allRefundOrders = orders.filter(
    (o) => o.refundStatus || o.status === 'cancelled' || o.status === 'cancel_requested'
  );

  // 驳回退款弹窗状态
  const [rejectModalOrder, setRejectModalOrder] = useState<Order | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('餐品已新鲜现制出炉，骑手正专送中，无法取消退单');

  // 导出 CSV / Excel 报表
  const handleExportCsv = () => {
    if (subTab === 'shift') {
      const data = shifts.map((s) => ({
        shiftNo: s.shiftNo,
        date: `${s.startTime} - ${s.endTime}`,
        closedBy: s.closedBy,
        totalSales: s.grossSales,
        wechatSales: s.wechatSales,
        alipaySales: s.alipaySales,
        cashSales: s.cashSales,
        actualCash: s.actualCash,
        cashDiff: s.cashDiff,
        diffReasonText: s.diffReasonText,
        note: s.note || '-'
      }));
      exportToCsv(
        '黑曜石餐车_收银班次对账表',
        [
          { label: '班次流水号', key: 'shiftNo' },
          { label: '交班时间', key: 'date' },
          { label: '当班收银员', key: 'closedBy' },
          { label: '班次总营业额', key: 'totalSales' },
          { label: '微信支付', key: 'wechatSales' },
          { label: '支付宝', key: 'alipaySales' },
          { label: '现金实收', key: 'cashSales' },
          { label: '钱箱实点', key: 'actualCash' },
          { label: '现金差异', key: 'cashDiff' },
          { label: '差异原因说明', key: 'diffReasonText' },
          { label: '交接备注', key: 'note' }
        ],
        data
      );
      showToast('已成功导出【收银班次对账表 (CSV/Excel)】');
    } else if (subTab === 'refund') {
      const data = refunds.map((r) => ({
        refundNo: r.refundNo,
        orderNo: r.orderNo,
        date: r.date,
        amount: r.amount,
        method: r.method,
        reasonNote: r.reasonNote,
        authorizedBy: r.authorizedBy,
        cookedIsLoss: r.cookedIsLoss ? '已记入损耗' : '未制作免损耗'
      }));
      exportToCsv(
        '黑曜石餐车_POS退款退菜台账',
        [
          { label: '退款单号', key: 'refundNo' },
          { label: '原订单号', key: 'orderNo' },
          { label: '退款时间', key: 'date' },
          { label: '退款金额', key: 'amount' },
          { label: '退款渠道', key: 'method' },
          { label: '退款原因说明', key: 'reasonNote' },
          { label: '授权审批人', key: 'authorizedBy' },
          { label: '厨房损耗状态', key: 'cookedIsLoss' }
        ],
        data
      );
      showToast('已成功导出【POS退款退菜台账 (CSV/Excel)】');
    } else if (subTab === 'customer_refund') {
      const data = allRefundOrders.map((o) => ({
        orderNo: o.orderNo,
        customerName: o.customerName || '先锋食客',
        userPhone: o.userPhone || '到店客',
        createdTime: o.createdTime,
        totalAmount: o.totalAmount,
        paymentMethod: (o as any).paymentMethod || 'wechat',
        refundStatus:
          o.refundStatus === 'approved'
            ? '已原路退款'
            : o.refundStatus === 'rejected'
            ? '已驳回退款'
            : '待商家审核',
        refundReason: o.refundReason || '顾客申请退款',
        refundRejectReason: o.refundRejectReason || '-'
      }));
      exportToCsv(
        '黑曜石餐车_顾客线上退款售后明细表',
        [
          { label: '订单编号', key: 'orderNo' },
          { label: '顾客称呼', key: 'customerName' },
          { label: '顾客手机号', key: 'userPhone' },
          { label: '下单时间', key: 'createdTime' },
          { label: '订单金额(元)', key: 'totalAmount' },
          { label: '原支付方式', key: 'paymentMethod' },
          { label: '退款审核状态', key: 'refundStatus' },
          { label: '顾客退款理由', key: 'refundReason' },
          { label: '商家驳回原因', key: 'refundRejectReason' }
        ],
        data
      );
      showToast('已成功导出【顾客线上退款售后明细表 (CSV/Excel)】');
    } else if (subTab === 'reservation') {
      const data = reservations.map((r) => ({
        guestName: r.guestName,
        phone: r.phone,
        partySize: r.guestCount,
        tableCode: r.tableCode,
        timeText: r.reservationTime,
        depositAmount: r.depositAmount,
        status: r.status === 'confirmed' ? '已确认锁定' : '已入座消费',
        note: r.note || '-'
      }));
      exportToCsv(
        '黑曜石餐车_桌台预定排期表',
        [
          { label: '预约宾客', key: 'guestName' },
          { label: '联系电话', key: 'phone' },
          { label: '就餐人数', key: 'partySize' },
          { label: '预订桌号', key: 'tableCode' },
          { label: '预约到店时间', key: 'timeText' },
          { label: '已收定金(元)', key: 'depositAmount' },
          { label: '预定状态', key: 'status' },
          { label: '特殊备注', key: 'note' }
        ],
        data
      );
      showToast('已成功导出【桌台预定排期表 (CSV/Excel)】');
    }
  };

  return (
    <div className="space-y-4 text-xs">
      {/* 1. Header Sub-tab Controller */}
      <div className="bg-white p-2.5 sm:p-3 rounded-[4px] border border-[#e6e6e4] flex items-center justify-between gap-2.5 sm:gap-3 flex-wrap shadow-2xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setSubTab('shift')}
            className={`px-3 py-1.5 rounded-full font-medium text-xs transition-all cursor-pointer flex items-center gap-1.5 bg-white border ${
              subTab === 'shift'
                ? 'border-zinc-900 text-zinc-900 font-semibold shadow-2xs'
                : 'border-[#e6e6e4] text-[#5a5854] hover:text-zinc-900 hover:border-zinc-300 hover:bg-slate-50'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0 text-zinc-700" />
            <span className="hidden sm:inline">收银交接班与钱箱对账 (Shift Handover)</span>
            <span className="sm:hidden">交接班对账</span>
            <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full ${
              subTab === 'shift' ? 'bg-zinc-900 text-white' : 'bg-[#f0f0ee] text-[#5a5854] border border-[#e6e6e4]'
            }`}>
              {shifts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('refund')}
            className={`px-3 py-1.5 rounded-full font-medium text-xs transition-all cursor-pointer flex items-center gap-1.5 bg-white border ${
              subTab === 'refund'
                ? 'border-zinc-900 text-zinc-900 font-semibold shadow-2xs'
                : 'border-[#e6e6e4] text-[#5a5854] hover:text-zinc-900 hover:border-zinc-300 hover:bg-slate-50'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-[#d44333] shrink-0" />
            <span className="hidden sm:inline">POS 内部退款台账</span>
            <span className="sm:hidden">POS退款</span>
            <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full ${
              subTab === 'refund' ? 'bg-zinc-900 text-white' : 'bg-[#f0f0ee] text-[#5a5854] border border-[#e6e6e4]'
            }`}>
              {refunds.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('customer_refund')}
            className={`px-3 py-1.5 rounded-full font-medium text-xs transition-all cursor-pointer flex items-center gap-1.5 bg-white border ${
              subTab === 'customer_refund'
                ? 'border-zinc-900 text-zinc-900 font-semibold shadow-2xs'
                : 'border-[#e6e6e4] text-[#5a5854] hover:text-zinc-900 hover:border-zinc-300 hover:bg-slate-50'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="hidden sm:inline">顾客线上退款申请流</span>
            <span className="sm:hidden">线上退款流</span>
            {pendingCustomerRefunds.length > 0 ? (
              <span className="font-mono text-[10px] bg-rose-500 text-white px-1.5 py-0.2 rounded-full font-semibold animate-pulse">
                {pendingCustomerRefunds.length} 待审
              </span>
            ) : (
              <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full ${
                subTab === 'customer_refund' ? 'bg-zinc-900 text-white' : 'bg-[#f0f0ee] text-[#5a5854] border border-[#e6e6e4]'
              }`}>
                {allRefundOrders.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSubTab('reservation')}
            className={`px-3 py-1.5 rounded-full font-medium text-xs transition-all cursor-pointer flex items-center gap-1.5 bg-white border ${
              subTab === 'reservation'
                ? 'border-zinc-900 text-zinc-900 font-semibold shadow-2xs'
                : 'border-[#e6e6e4] text-[#5a5854] hover:text-zinc-900 hover:border-zinc-300 hover:bg-slate-50'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5 text-[#1c5598] shrink-0" />
            <span className="hidden sm:inline">桌台预定 Pipeline (Reservations)</span>
            <span className="sm:hidden">桌台预定</span>
            <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full ${
              subTab === 'reservation' ? 'bg-zinc-900 text-white' : 'bg-[#f0f0ee] text-[#5a5854] border border-[#e6e6e4]'
            }`}>
              {reservations.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto justify-end">
          {/* CSV / Excel Export Trigger */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-1.5 bg-white hover:bg-[#f1f1ef] text-[#37352f] border border-[#e6e6e4] rounded-[2px] font-medium text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
            title="一键导出当前报表为标准 CSV/Excel 格式"
          >
            <Download className="w-3.5 h-3.5 text-[#5a5854]" />
            <span>导出报表 (CSV/Excel)</span>
          </button>

          {subTab === 'shift' && (
            <button
              type="button"
              onClick={() => setIsClosingShift(!isClosingShift)}
              className="px-3.5 py-1.5 bg-[#2b593f] hover:bg-[#204430] text-white rounded-[2px] font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>办理当班交接</span>
            </button>
          )}

          {subTab === 'refund' && (
            <button
              type="button"
              onClick={() => setIsCreatingRefund(!isCreatingRefund)}
              className="px-3.5 py-1.5 bg-[#d44333] hover:bg-[#b03022] text-white rounded-[2px] font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>发起退款 / 退菜申请</span>
            </button>
          )}

          {subTab === 'reservation' && (
            <button
              type="button"
              onClick={() => setIsAddingReservation(!isAddingReservation)}
              className="px-3.5 py-1.5 bg-[#1c5598] hover:bg-[#143e70] text-white rounded-[2px] font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新增预约订台</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Modal / Form: Shift Close */}
      {isClosingShift && subTab === 'shift' && (() => {
        const precheck = businessTransactionEngine.executeShiftPrecheck();
        return (
        <form
          onSubmit={handleCloseShiftSubmit}
          className="bg-[#fbfbfa] p-4 rounded-[4px] border border-[#2b593f] space-y-3 shadow-2xs animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between border-b border-[#e6e6e4] pb-2">
            <h4 className="font-semibold text-xs text-[#37352f] flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5 text-[#2b593f]" />
              <span>办理当班收银交接与实点现金对账</span>
            </h4>
            <span className="text-[10px] text-[#787774]">
              系统将比对钱箱实点现金并生成交班小票
            </span>
          </div>

          {/* 关账风控预检审查条 */}
          <div className={`p-2.5 rounded-[4px] border text-xs flex items-start gap-2 ${
            precheck.canProceed
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-300 text-amber-900'
          }`}>
            <ShieldCheck className={`w-4 h-4 shrink-0 mt-0.5 ${precheck.canProceed ? 'text-emerald-600' : 'text-amber-600'}`} />
            <div className="flex-1 space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  {precheck.canProceed ? '✅ 关账预检合规达标' : '⚠️ 关账合规警报与挂账排查'}
                </span>
                <span className="text-[10px] font-mono">
                  挂账: {precheck.heldOrdersCount} 笔 · 待退: {precheck.pendingRefundCount} 笔
                </span>
              </div>
              <p className="text-[11px] leading-relaxed">
                {precheck.message}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10.5px] font-medium text-[#5a5854] block mb-1">
                交班人 (当前当班)
              </label>
              <input
                type="text"
                value={closedBy}
                onChange={(e) => setClosedBy(e.target.value)}
                className="w-full bg-white border border-[#e6e6e4] focus:border-[#37352f] rounded-[2px] px-2 py-1.5 text-xs text-[#37352f] outline-none"
                required
              />
            </div>

            <div>
              <label className="text-[10.5px] font-medium text-[#5a5854] block mb-1">
                接班人 (接岗员工)
              </label>
              <input
                type="text"
                value={successor}
                onChange={(e) => setSuccessor(e.target.value)}
                className="w-full bg-white border border-[#e6e6e4] focus:border-[#37352f] rounded-[2px] px-2 py-1.5 text-xs text-[#37352f] outline-none"
                required
              />
            </div>

            <div>
              <label className="text-[10.5px] font-medium text-[#5a5854] block mb-1">
                钱箱实点现金 (¥)
              </label>
              <input
                type="number"
                step="0.1"
                value={actualCashInput}
                onChange={(e) => setActualCashInput(e.target.value)}
                className="w-full bg-white border border-[#e6e6e4] focus:border-[#37352f] rounded-[2px] px-2 py-1.5 text-xs text-[#37352f] font-mono outline-none"
                required
              />
            </div>

            <div>
              <label className="text-[10.5px] font-medium text-[#5a5854] block mb-1">
                现金差异归因 (如 $\neq$ 0)
              </label>
              <select
                value={diffReason}
                onChange={(e) => setDiffReason(e.target.value as any)}
                className="w-full bg-white border border-[#e6e6e4] focus:border-[#37352f] rounded-[2px] px-2 py-1.5 text-xs text-[#37352f] outline-none"
              >
                <option value="none">无差异 (吻合)</option>
                <option value="count_error">点钞清点误差</option>
                <option value="change_error">现金找零失误</option>
                <option value="unrecorded_sale">线下漏单/未录入</option>
                <option value="discount_mis">折扣优惠遗漏</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10.5px] font-medium text-[#5a5854] block mb-1">
                交班备注与事项说明
              </label>
              <input
                type="text"
                value={shiftNote}
                onChange={(e) => setShiftNote(e.target.value)}
                className="w-full bg-white border border-[#e6e6e4] focus:border-[#37352f] rounded-[2px] px-2 py-1.5 text-xs text-[#37352f] outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsClosingShift(false)}
              className="px-3 py-1 bg-[#efefed] hover:bg-[#e6e6e4] text-[#5a5854] rounded-[2px] font-medium text-xs cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-1 bg-[#2b593f] hover:bg-[#204430] text-white rounded-[2px] font-semibold text-xs cursor-pointer shadow-2xs flex items-center gap-1"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>确认结算并打印交班单</span>
            </button>
          </div>
        </form>
        );
      })()}

      {/* 3. Modal / Form: Refund */}
      {isCreatingRefund && subTab === 'refund' && (
        <form
          onSubmit={handleCreateRefundSubmit}
          className="bg-[#fbfbfa] p-4 rounded-[4px] border border-[#d44333] space-y-3 shadow-2xs animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between border-b border-[#e6e6e4] pb-2">
            <h4 className="font-semibold text-xs text-[#37352f] flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-[#d44333]" />
              <span>发起原路退款 / 退菜审计申请</span>
            </h4>
            <span className="text-[10px] text-[#787774]">
              超 ¥200 触发主管授权 · 已制作退菜自动记入损耗
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10.5px] font-medium text-[#5a5854] block mb-1">关联工单号</label>
              <input
                type="text"
                value={refundOrderNo}
                onChange={(e) => setRefundOrderNo(e.target.value)}
                className="w-full bg-white border border-[#e6e6e4] focus:border-[#37352f] rounded-[2px] px-2 py-1.5 text-xs text-[#37352f] font-mono outline-none"
                required
              />
            </div>

            <div>
              <label className="text-[10.5px] font-medium text-[#5a5854] block mb-1">
                退款金额 (¥)
              </label>
              <input
                type="number"
                step="0.1"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="w-full bg-white border border-[#e6e6e4] focus:border-[#37352f] rounded-[2px] px-2 py-1.5 text-xs text-[#37352f] font-mono outline-none"
                required
              />
            </div>

            <div>
              <label className="text-[10.5px] font-medium text-[#5a5854] block mb-1">退款原因归类</label>
              <select
                value={refundReasonCategory}
                onChange={(e) => setRefundReasonCategory(e.target.value)}
                className="w-full bg-white border border-[#e6e6e4] focus:border-[#37352f] rounded-[2px] px-2 py-1.5 text-xs text-[#37352f] outline-none"
              >
                <option value="taste_dislike">口味不适 / 咸淡要求</option>
                <option value="timeout">后厨上菜超时催单</option>
                <option value="customer_cancel">顾客赶时间变卦取消</option>
                <option value="soldout">菜品临时沽清售罄</option>
                <option value="order_error">服务员错点 / 错单</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10.5px] font-medium text-[#5a5854] block mb-1">详细原因备注</label>
              <input
                type="text"
                value={refundReasonNote}
                onChange={(e) => setRefundReasonNote(e.target.value)}
                className="w-full bg-white border border-[#e6e6e4] focus:border-[#37352f] rounded-[2px] px-2 py-1.5 text-xs text-[#37352f] outline-none"
                required
              />
            </div>

            <div>
              <label className="text-[10.5px] font-medium text-[#5a5854] block mb-1">
                主管授权密码 (超 ¥200 必填, 演示: 8888)
              </label>
              <input
                type="password"
                value={managerAuthPin}
                onChange={(e) => setManagerAuthPin(e.target.value)}
                placeholder="输入 4 位主管 PIN"
                className="w-full bg-white border border-[#e6e6e4] focus:border-[#37352f] rounded-[2px] px-2 py-1.5 text-xs text-[#37352f] font-mono outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-1">
            <label className="flex items-center gap-1.5 text-[11px] text-[#37352f] cursor-pointer">
              <input
                type="checkbox"
                checked={notifyKitchen}
                onChange={(e) => setNotifyKitchen(e.target.checked)}
                className="rounded-[2px] text-[#2b593f]"
              />
              <span>通知后厨取消制作 (KDS联动)</span>
            </label>

            <label className="flex items-center gap-1.5 text-[11px] text-[#d44333] font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={cookedIsLoss}
                onChange={(e) => setCookedIsLoss(e.target.checked)}
                className="rounded-[2px] text-[#d44333]"
              />
              <span>已制作退菜 $\to$ 自动记入厨房报损单 (cookedIsLoss)</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsCreatingRefund(false)}
              className="px-3 py-1 bg-[#efefed] hover:bg-[#e6e6e4] text-[#5a5854] rounded-[2px] font-medium text-xs cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-1 bg-[#d44333] hover:bg-[#b03022] text-white rounded-[2px] font-semibold text-xs cursor-pointer shadow-2xs"
            >
              确认原路退款
            </button>
          </div>
        </form>
      )}

      {/* 4. Modal / Form: Reservation */}
      {isAddingReservation && subTab === 'reservation' && (
        <form
          onSubmit={handleAddReservationSubmit}
          className="bg-[#fbfbfa] p-4 rounded-[4px] border border-[#1c5598] space-y-3 shadow-2xs animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between border-b border-[#e6e6e4] pb-2">
            <h4 className="font-semibold text-xs text-[#37352f] flex items-center gap-1.5">
              <CalendarCheck className="w-3.5 h-3.5 text-[#1c5598]" />
              <span>录入桌台预约 Pipeline (Reservations)</span>
            </h4>
            <span className="text-[10px] text-[#787774]">
              支持提前锁定餐位、收取订金与到店提醒
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10.5px] font-medium text-[#5a5854] block mb-1">顾客姓名 / 称呼</label>
              <input
                type="text"
                value={resName}
                onChange={(e) => setResName(e.target.value)}
                className="w-full bg-white border border-[#e6e6e4] focus:border-[#37352f] rounded-[2px] px-2 py-1.5 text-xs text-[#37352f] outline-none"
                required
              />
            </div>

            <div>
              <label className="text-[10.5px] font-medium text-[#5a5854] block mb-1">预留联系电话</label>
              <input
                type="text"
                value={resPhone}
                onChange={(e) => setResPhone(e.target.value)}
                className="w-full bg-white border border-[#e6e6e4] focus:border-[#37352f] rounded-[2px] px-2 py-1.5 text-xs text-[#37352f] outline-none"
                required
              />
            </div>

            <div>
              <label className="text-[10.5px] font-medium text-[#5a5854] block mb-1">就餐人数</label>
              <input
                type="number"
                value={resCount}
                onChange={(e) => setResCount(e.target.value)}
                className="w-full bg-white border border-[#e6e6e4] focus:border-[#37352f] rounded-[2px] px-2 py-1.5 text-xs text-[#37352f] font-mono outline-none"
                required
              />
            </div>

            <div>
              <label className="text-[10.5px] font-medium text-[#5a5854] block mb-1">锁定桌台编号</label>
              <input
                type="text"
                value={resTable}
                onChange={(e) => setResTable(e.target.value)}
                className="w-full bg-white border border-[#e6e6e4] focus:border-[#37352f] rounded-[2px] px-2 py-1.5 text-xs text-[#37352f] font-mono outline-none"
                required
              />
            </div>

            <div>
              <label className="text-[10.5px] font-medium text-[#5a5854] block mb-1">预约到达时间</label>
              <input
                type="text"
                value={resTime}
                onChange={(e) => setResTime(e.target.value)}
                className="w-full bg-white border border-[#e6e6e4] focus:border-[#37352f] rounded-[2px] px-2 py-1.5 text-xs text-[#37352f] font-mono outline-none"
                required
              />
            </div>

            <div>
              <label className="text-[10.5px] font-medium text-[#5a5854] block mb-1">
                预收定金金额 (¥)
              </label>
              <input
                type="number"
                value={resDeposit}
                onChange={(e) => setResDeposit(e.target.value)}
                className="w-full bg-white border border-[#e6e6e4] focus:border-[#37352f] rounded-[2px] px-2 py-1.5 text-xs text-[#37352f] font-mono outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[10.5px] font-medium text-[#5a5854] block mb-1">特殊需求与备注</label>
            <input
              type="text"
              value={resNote}
              onChange={(e) => setResNote(e.target.value)}
              className="w-full bg-white border border-[#e6e6e4] focus:border-[#37352f] rounded-[2px] px-2 py-1.5 text-xs text-[#37352f] outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAddingReservation(false)}
              className="px-3 py-1 bg-[#efefed] hover:bg-[#e6e6e4] text-[#5a5854] rounded-[2px] font-medium text-xs cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-1 bg-[#1c5598] hover:bg-[#143e70] text-white rounded-[2px] font-semibold text-xs cursor-pointer shadow-2xs"
            >
              确认预约并锁定桌台
            </button>
          </div>
        </form>
      )}

      {/* 5. Shifts List View */}
      {subTab === 'shift' && (
        <div className="space-y-3">
          <HeatmapGridMatrix
            id="shift-handover-heatmap"
            title="收银交接班与钱箱对账打卡热力"
            subtitle="透视各班次交接频次与钱箱长短款平账走势，点击指定日期可精准下钻该日交班日志"
            theme="amber"
            daysCount={42}
            data={shiftHeatmapData}
            metricUnit="元"
            selectedDate={selectedShiftDate}
            onSelectDate={(dStr) => {
              setSelectedShiftDate(dStr === selectedShiftDate ? null : dStr);
              showToast(dStr === selectedShiftDate ? '已重置显示全部班次' : `已下钻过滤 ${dStr} 的收银交班流水`);
            }}
            legendLabels={['无班次', '轻量交接', '平账达标', '高峰稳健', '差异/超额']}
          />

          <div className="bg-white rounded-[4px] border border-[#e6e6e4] overflow-hidden shadow-2xs">
            <div className="p-3 bg-[#f7f7f5] border-b border-[#e6e6e4] flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-xs text-[#37352f] flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-[#2b593f]" />
                  <span>历史班次营收与现金钱箱对账单 (Shift Logs)</span>
                </h4>
                {selectedShiftDate && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] bg-amber-50 text-amber-800 border border-amber-200 text-[10.5px]">
                    <span>正在查看：{selectedShiftDate}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedShiftDate(null)}
                      className="text-amber-600 hover:text-amber-900 cursor-pointer font-bold ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>
              <span className="text-[10px] text-[#787774]">T+0 实时结交 · 差异自动入账</span>
            </div>

            {/* Mobile Card List (< md) */}
            <div className="md:hidden divide-y divide-[#efefed]">
              {displayedShifts.map((s) => (
                <div key={s.id} className="p-3 space-y-2 hover:bg-[#fbfbfa]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-semibold text-xs text-[#37352f]">{s.shiftNo}</span>
                    <span className="font-mono font-semibold text-sm text-[#2b593f]">¥{s.grossSales.toFixed(2)}</span>
                  </div>
                  <div className="text-[11px] text-[#787774] flex items-center justify-between">
                    <span>{s.startTime} - {s.endTime} ({s.orderCount}单)</span>
                    <span className="text-[#37352f] font-medium">{s.closedBy} → 接班: {s.successor}</span>
                  </div>
                  <div className="bg-[#f7f7f5] rounded-[2px] p-2 text-[10.5px] space-y-1 font-mono">
                    <div className="flex justify-between text-[#5a5854]">
                      <span>微: ¥{s.wechatSales.toFixed(1)} / 支: ¥{s.alipaySales.toFixed(1)}</span>
                      <span>现: ¥{s.cashSales.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between border-t border-[#e6e6e4] pt-1">
                      <span className="text-[#37352f]">实点现金: ¥{s.actualCash.toFixed(1)}</span>
                      <span className={`font-semibold ${s.cashDiff === 0 ? 'text-[#2b593f]' : 'text-[#d44333]'}`}>
                        {s.cashDiff === 0 ? '平账 0.0' : `差异 ¥${s.cashDiff.toFixed(1)}`}
                      </span>
                    </div>
                  </div>
                  <div className="text-[10.5px] text-[#5a5854] flex items-center justify-between gap-2">
                    <span className="truncate">{s.diffReasonText} {s.note ? `(${s.note})` : ''}</span>
                    <button
                      type="button"
                      onClick={() => openShiftReceiptModal(s)}
                      className="px-2 py-1 bg-[#f1f1ef] hover:bg-[#e8e8e6] text-[#37352f] rounded-[2px] font-medium text-[10.5px] flex items-center gap-1 cursor-pointer shrink-0 active:scale-95"
                    >
                      <Printer className="w-3 h-3" />
                      <span>补打小票</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#e6e6e4] bg-[#fbfbfa] text-[#787774] text-[10.5px]">
                    <th className="p-2.5 font-semibold">班次/时间</th>
                    <th className="p-2.5 font-semibold">交接人员</th>
                    <th className="p-2.5 font-semibold">班次总营收</th>
                    <th className="p-2.5 font-semibold">微信 / 支付宝 / 现金</th>
                    <th className="p-2.5 font-semibold">实点现金 vs 差异</th>
                    <th className="p-2.5 font-semibold">钱箱差异说明</th>
                    <th className="p-2.5 font-semibold">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#efefed]">
                  {displayedShifts.map((s) => (
                  <tr key={s.id} className="hover:bg-[#fbfbfa] transition-colors">
                    <td className="p-2.5">
                      <span className="font-mono font-semibold text-xs text-[#37352f] block">{s.shiftNo}</span>
                      <span className="text-[10px] text-[#787774]">
                        {s.startTime} - {s.endTime} ({s.orderCount}单)
                      </span>
                    </td>

                    <td className="p-2.5 text-xs">
                      <span className="text-[#37352f] font-medium">{s.closedBy}</span>
                      <span className="text-[#787774] block text-[10px]">
                        接班: {s.successor}
                      </span>
                    </td>

                    <td className="p-2.5">
                      <span className="font-mono font-semibold text-sm text-[#2b593f]">
                        ¥{s.grossSales.toFixed(2)}
                      </span>
                    </td>

                    <td className="p-2.5 font-mono text-[11px] text-[#5a5854]">
                      <div>微: ¥{s.wechatSales.toFixed(1)}</div>
                      <div>支: ¥{s.alipaySales.toFixed(1)} / 现: ¥{s.cashSales.toFixed(1)}</div>
                    </td>

                    <td className="p-2.5">
                      <span className="font-mono font-semibold text-xs text-[#37352f] block">
                        ¥{s.actualCash.toFixed(1)}
                      </span>
                      <span
                        className={`font-mono text-[10px] font-semibold ${
                          s.cashDiff === 0
                            ? 'text-[#2b593f]'
                            : 'text-[#d44333]'
                        }`}
                      >
                        {s.cashDiff === 0 ? '平账 0.0' : `差异 ¥${s.cashDiff.toFixed(1)}`}
                      </span>
                    </td>

                    <td className="p-2.5 text-xs text-[#5a5854] max-w-xs">
                      <span className="block text-[10.5px]">{s.diffReasonText}</span>
                      {s.note && <span className="text-[10px] text-[#787774] italic">{s.note}</span>}
                    </td>

                    <td className="p-2.5">
                      <button
                        type="button"
                        onClick={() => openShiftReceiptModal(s)}
                        className="px-2 py-1 bg-[#f1f1ef] hover:bg-[#e8e8e6] text-[#37352f] rounded-[2px] font-medium text-[11px] flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                      >
                        <Printer className="w-3 h-3" />
                        <span>补打</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}

      {/* 6. Refund List View */}
      {subTab === 'refund' && (
        <div className="bg-white rounded-[4px] border border-[#e6e6e4] overflow-hidden shadow-2xs">
          <div className="p-3 bg-[#f7f7f5] border-b border-[#e6e6e4] flex items-center justify-between">
            <h4 className="font-semibold text-xs text-[#37352f] flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-[#d44333]" />
              <span>退款退菜审批与授权明细 (Refund &amp; Return Logs)</span>
            </h4>
            <span className="text-[10px] text-[#787774]">已制作退菜自动记入损耗</span>
          </div>

          {/* Mobile Card List (< md) */}
          <div className="md:hidden divide-y divide-[#efefed]">
            {refunds.map((r) => (
              <div key={r.id} className="p-3 space-y-2 hover:bg-[#fbfbfa]">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-semibold text-xs text-[#37352f]">{r.refundNo}</span>
                    <span className="text-[10px] text-[#787774]">{r.date}</span>
                  </div>
                  <span className="font-mono font-semibold text-sm text-[#d44333]">¥{r.amount.toFixed(2)}</span>
                </div>
                <div className="text-[11px] text-[#5a5854] flex items-center justify-between">
                  <span>订单: <span className="font-mono font-semibold text-[#37352f]">{r.orderNo}</span></span>
                  <span className="text-[10px] bg-[#f1f1ef] px-1.5 py-0.5 rounded-[2px]">{r.method}</span>
                </div>
                <div className="bg-[#f7f7f5] rounded-[2px] p-2 text-[10.5px] space-y-1">
                  <div className="font-semibold text-[#37352f]">
                    原因: {r.reasonCategory === 'taste_dislike' ? '口味不适' : r.reasonCategory === 'customer_cancel' ? '顾客取消' : '其他原因'}
                  </div>
                  <div className="text-[#787774]">{r.reasonNote}</div>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="flex items-center gap-1 text-[#37352f] font-medium">
                    <ShieldCheck className="w-3 h-3 text-[#2b593f]" />
                    <span>主管: {r.authorizedBy}</span>
                  </span>
                  {r.cookedIsLoss ? (
                    <span className="text-[10px] bg-[#fde8e8] text-[#d44333] border border-[#f8b4b4] px-1.5 py-0.5 rounded-[2px] font-semibold">
                      已记厨房报损
                    </span>
                  ) : (
                    <span className="text-[10px] bg-[#edf3ec] text-[#2b593f] border border-[#c4dcbc] px-1.5 py-0.5 rounded-[2px] font-semibold">
                      未制作免报损
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e6e6e4] bg-[#fbfbfa] text-[#787774] text-[10.5px]">
                  <th className="p-2.5 font-semibold">退款单号/时间</th>
                  <th className="p-2.5 font-semibold">工单号</th>
                  <th className="p-2.5 font-semibold">退款金额 &amp; 方式</th>
                  <th className="p-2.5 font-semibold">退款原因</th>
                  <th className="p-2.5 font-semibold">主管授权人</th>
                  <th className="p-2.5 font-semibold">损耗状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#efefed]">
                {refunds.map((r) => (
                  <tr key={r.id} className="hover:bg-[#fbfbfa] transition-colors">
                    <td className="p-2.5">
                      <span className="font-mono font-semibold text-xs text-[#37352f] block">{r.refundNo}</span>
                      <span className="text-[10px] text-[#787774]">{r.date}</span>
                    </td>

                    <td className="p-2.5 font-mono text-xs font-semibold text-[#37352f]">
                      {r.orderNo}
                    </td>

                    <td className="p-2.5">
                      <span className="font-mono font-semibold text-sm text-[#d44333] block">
                        ¥{r.amount.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-[#787774]">{r.method}</span>
                    </td>

                    <td className="p-2.5 text-xs text-[#5a5854] max-w-xs">
                      <span className="font-semibold text-[#37352f] block">
                        {r.reasonCategory === 'taste_dislike'
                          ? '口味不适'
                          : r.reasonCategory === 'customer_cancel'
                          ? '顾客取消'
                          : '其他原因'}
                      </span>
                      <span className="text-[10.5px] text-[#787774]">{r.reasonNote}</span>
                    </td>

                    <td className="p-2.5 text-xs text-[#37352f]">
                      <span className="flex items-center gap-1 font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#2b593f]" />
                        <span>{r.authorizedBy}</span>
                      </span>
                    </td>

                    <td className="p-2.5">
                      {r.cookedIsLoss ? (
                        <span className="text-[10px] bg-[#fde8e8] text-[#d44333] border border-[#f8b4b4] px-1.5 py-0.5 rounded-[2px] font-semibold">
                          已记入厨房报损
                        </span>
                      ) : (
                        <span className="text-[10px] bg-[#edf3ec] text-[#2b593f] border border-[#c4dcbc] px-1.5 py-0.5 rounded-[2px] font-semibold">
                          未制作免报损
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. Reservation List View */}
      {subTab === 'reservation' && (
        <div className="bg-white rounded-[4px] border border-[#e6e6e4] overflow-hidden shadow-2xs">
          <div className="p-3 bg-[#f7f7f5] border-b border-[#e6e6e4] flex items-center justify-between">
            <h4 className="font-semibold text-xs text-[#37352f] flex items-center gap-1.5">
              <CalendarCheck className="w-3.5 h-3.5 text-[#1c5598]" />
              <span>桌台预约与定金预收管线 (Reservation Pipeline)</span>
            </h4>
            <span className="text-[10px] text-[#787774]">支持提前锁定与到店提醒</span>
          </div>

          {/* Mobile Card List (< md) */}
          <div className="md:hidden divide-y divide-[#efefed]">
            {reservations.map((res) => (
              <div key={res.id} className="p-3 space-y-2 hover:bg-[#fbfbfa]">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-[#37352f]">{res.guestName}</span>
                    <span className="text-[10.5px] text-[#787774]">({res.guestCount} 位)</span>
                  </div>
                  <span className="font-mono font-semibold text-xs bg-[#37352f] text-white px-2 py-0.5 rounded-[2px]">
                    桌台 {res.tableCode}
                  </span>
                </div>
                <div className="text-[11px] text-[#5a5854] flex items-center justify-between">
                  <span>电话: <span className="font-mono">{res.phone}</span></span>
                  <span className="text-[#2b593f] font-mono font-semibold">已付定金 ¥{res.depositAmount.toFixed(1)}</span>
                </div>
                <div className="bg-[#f7f7f5] rounded-[2px] p-2 text-[10.5px] flex items-center justify-between">
                  <div>
                    <span className="font-mono font-semibold text-[#37352f]">{res.reservationTime}</span>
                    {res.status === 'confirmed' && (
                      <span className="ml-2 text-[10px] font-mono text-[#d9730d] font-semibold">
                        距到店 {res.countdownMin}m
                      </span>
                    )}
                  </div>
                  {res.note && <span className="text-[#787774] truncate max-w-[150px]">{res.note}</span>}
                </div>
                <div className="flex justify-end pt-0.5">
                  {res.status === 'confirmed' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setReservations((prev) =>
                          prev.map((item) =>
                            item.id === res.id ? { ...item, status: 'arrived' } : item
                          )
                        );
                        showToast(`顾客 ${res.guestName} 已到店！桌台 ${res.tableCode} 已自动转为就餐中。`);
                      }}
                      className="px-3 py-1 bg-[#2b593f] hover:bg-[#204430] text-white rounded-[2px] font-semibold text-xs cursor-pointer shadow-2xs"
                    >
                      确认到店开台
                    </button>
                  ) : (
                    <span className="text-[10px] bg-[#edf3ec] text-[#2b593f] px-2 py-0.5 rounded-[2px] font-semibold">
                      已入座消费
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e6e6e4] bg-[#fbfbfa] text-[#787774] text-[10.5px]">
                  <th className="p-2.5 font-semibold">顾客姓名/人数</th>
                  <th className="p-2.5 font-semibold">联系电话</th>
                  <th className="p-2.5 font-semibold">锁定桌台</th>
                  <th className="p-2.5 font-semibold">预约时间 &amp; 倒计时</th>
                  <th className="p-2.5 font-semibold">定金状态</th>
                  <th className="p-2.5 font-semibold">备注需求</th>
                  <th className="p-2.5 font-semibold">状态/操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#efefed]">
                {reservations.map((res) => (
                  <tr key={res.id} className="hover:bg-[#fbfbfa] transition-colors">
                    <td className="p-2.5">
                      <span className="font-semibold text-xs text-[#37352f] block">{res.guestName}</span>
                      <span className="text-[10px] text-[#787774]">{res.guestCount} 位贵宾</span>
                    </td>

                    <td className="p-2.5 font-mono text-xs text-[#5a5854]">
                      {res.phone}
                    </td>

                    <td className="p-2.5">
                      <span className="font-mono font-semibold text-xs bg-[#37352f] text-white px-2 py-0.5 rounded-[2px]">
                        桌台 {res.tableCode}
                      </span>
                    </td>

                    <td className="p-2.5">
                      <span className="font-mono font-semibold text-xs text-[#37352f] block">
                        {res.reservationTime}
                      </span>
                      {res.status === 'confirmed' && (
                        <span className="text-[10px] font-mono text-[#d9730d] font-semibold">
                          距到店 {res.countdownMin}m
                        </span>
                      )}
                    </td>

                    <td className="p-2.5">
                      <span className="font-mono font-semibold text-xs text-[#2b593f] block">
                        ¥{res.depositAmount.toFixed(1)}
                      </span>
                      <span className="text-[10px] text-[#2b593f]">已付定金</span>
                    </td>

                    <td className="p-2.5 text-xs text-[#5a5854] max-w-xs">
                      {res.note || '-'}
                    </td>

                    <td className="p-2.5">
                      {res.status === 'confirmed' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setReservations((prev) =>
                              prev.map((item) =>
                                item.id === res.id ? { ...item, status: 'arrived' } : item
                              )
                            );
                            showToast(`顾客 ${res.guestName} 已到店！桌台 ${res.tableCode} 已自动转为就餐中。`);
                          }}
                          className="px-2.5 py-1 bg-[#2b593f] hover:bg-[#204430] text-white rounded-[2px] font-semibold text-[11px] cursor-pointer"
                        >
                          确认到店开台
                        </button>
                      ) : (
                        <span className="text-[10px] bg-[#edf3ec] text-[#2b593f] px-1.5 py-0.5 rounded-[2px] font-semibold">
                          已入座消费
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. Customer Online Refund Flow (顾客线上退款申请与审核闭环) */}
      {subTab === 'customer_refund' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Status summary banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-[4px] p-3 flex items-center justify-between flex-wrap gap-2 text-[#37352f]">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <span className="font-semibold text-xs block text-amber-950">
                  顾客在线退款 / 售后审核流（资金原路退回闭环）
                </span>
                <span className="text-[11px] text-amber-800">
                  食客在客户端发起退单申请后，将实时推送至此；商家确认后联动微信/支付宝云支付原路返还资金。
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium px-2 py-0.5 rounded-[2px] bg-white text-amber-900 border border-amber-300">
                待审核: <strong className="font-mono font-semibold text-rose-600">{pendingCustomerRefunds.length}</strong> 笔
              </span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-[2px] bg-white text-neutral-700 border border-neutral-300">
                累计售后: <strong className="font-mono font-semibold">{allRefundOrders.length}</strong> 笔
              </span>
            </div>
          </div>

          {/* Pending Refunds Table */}
          <div className="bg-white rounded-[4px] border border-[#e6e6e4] overflow-hidden shadow-2xs">
            <div className="p-3 bg-[#f7f7f5] border-b border-[#e6e6e4] flex items-center justify-between">
              <h4 className="font-semibold text-xs text-[#37352f] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>待审核顾客退款申请 ({pendingCustomerRefunds.length})</span>
              </h4>
              <span className="text-[10px] text-neutral-500">超时未处理将触发系统自动降级提醒</span>
            </div>

            {pendingCustomerRefunds.length === 0 ? (
              <div className="py-12 text-center text-neutral-400">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-60" />
                <p className="text-xs font-semibold text-neutral-600">当前暂无待审核的顾客退款申请</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">当顾客在客户端申请取消订单时将自动显示在此处</p>
              </div>
            ) : (
              <>
                {/* Mobile Card List (< md) */}
                <div className="md:hidden divide-y divide-[#efefed]">
                  {pendingCustomerRefunds.map((o) => (
                    <div key={o.id} className="p-3 space-y-2.5 hover:bg-amber-50/40">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="font-mono font-semibold text-xs text-[#37352f] block">{o.orderNo}</span>
                          <span className="text-[10px] text-neutral-500">{o.createdTime}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-semibold text-sm text-rose-600 block">
                            ¥{o.totalAmount.toFixed(2)}
                          </span>
                          <span className={`text-[9.5px] px-1 py-0.2 rounded-[2px] font-medium inline-block ${
                            o.paymentMethod === 'alipay'
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}>
                            {o.paymentMethod === 'alipay' ? '支付宝' : '微信支付'}
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] text-neutral-600 flex items-center gap-1">
                        <User className="w-3 h-3 text-neutral-400" />
                        <span>{o.customerName || '先锋食客'}</span>
                        <span className="font-mono text-[10px] text-neutral-400">({o.userPhone || '到店客'})</span>
                      </div>

                      {/* Items */}
                      <div className="bg-[#f7f7f5] rounded-[2px] p-2 text-[10.5px] space-y-0.5">
                        {o.items?.map((item, idx) => (
                          <div key={idx} className="text-neutral-700 flex justify-between gap-1">
                            <span className="truncate">{item.name}</span>
                            <span className="font-mono text-neutral-500 shrink-0">x{item.quantity}</span>
                          </div>
                        ))}
                      </div>

                      {/* Reason */}
                      <div className="bg-rose-50/80 border border-rose-200 rounded-[2px] p-2 text-[11px]">
                        <span className="text-rose-900 font-medium block">
                          退款原因: {o.refundReason || '未说明退款原因'}
                        </span>
                        <span className="text-[10px] text-rose-600 block mt-0.5">
                          申请状态: {o.status === 'cancel_requested' ? '顾客主动申请取消' : '售后退单审核'}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              showToast(`正在向支付网关申请原路退款...`);
                              await executeRealPayRefund({
                                orderNo: o.orderNo,
                                refundAmount: o.totalAmount,
                                totalAmount: o.totalAmount,
                                reason: o.refundReason || '顾客线上申请极速退款'
                              });

                              onAuditRefund?.(o.id, true);

                              const newRefundRecord: RefundRecord = {
                                id: `ref-online-${Date.now()}`,
                                refundNo: `RF-ON-${Date.now().toString().slice(-6)}`,
                                orderNo: o.orderNo,
                                amount: o.totalAmount,
                                date: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
                                method: (o as any).paymentMethod === 'alipay' ? '支付宝原路退款' : '微信原路退款',
                                reasonCategory: 'customer_cancel',
                                reasonNote: `【线上退款闭环】理由: ${o.refundReason || '顾客在线申请'}`,
                                authorizedBy: '店长审核 (线上原路返还)',
                                cookedIsLoss: false,
                                notifyKitchen: true,
                                items: (o.items || []).map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
                                status: 'approved'
                              };
                              setRefunds((prev) => [newRefundRecord, ...prev]);

                              showToast(`【原路退款成功】订单 ${o.orderNo} 款项 ¥${o.totalAmount.toFixed(2)} 已原路退还至顾客 ${(o as any).paymentMethod === 'alipay' ? '支付宝' : '微信'} 账户！`);
                            } catch (err: any) {
                              showToast(`退款处理失败: ${err.message || '网络异常'}`);
                            }
                          }}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[2px] font-semibold text-xs cursor-pointer shadow-2xs flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>同意原路退款</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setRejectModalOrder(o);
                            setRejectReasonInput('餐品已新鲜现制出炉，骑手正专送中，无法取消退单');
                          }}
                          className="px-3 py-1.5 bg-[#f1f1ef] hover:bg-[#e8e8e6] text-[#37352f] border border-[#e6e6e4] rounded-[2px] font-medium text-xs cursor-pointer shadow-2xs flex items-center justify-center gap-1"
                        >
                          <X className="w-3.5 h-3.5 text-rose-500" />
                          <span>驳回</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table (>= md) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#e6e6e4] bg-[#fbfbfa] text-[#787774] text-[10.5px]">
                        <th className="p-2.5 font-semibold">订单流水 / 顾客</th>
                        <th className="p-2.5 font-semibold">下单时间</th>
                        <th className="p-2.5 font-semibold">退款金额 &amp; 支付原路</th>
                        <th className="p-2.5 font-semibold">购买菜品</th>
                        <th className="p-2.5 font-semibold">顾客退款申请理由</th>
                        <th className="p-2.5 font-semibold text-right">审核操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#efefed]">
                      {pendingCustomerRefunds.map((o) => (
                        <tr key={o.id} className="hover:bg-amber-50/40 transition-colors">
                          <td className="p-2.5">
                            <span className="font-mono font-semibold text-xs text-[#37352f] block">{o.orderNo}</span>
                            <span className="text-[10.5px] text-neutral-600 flex items-center gap-1 mt-0.5">
                              <User className="w-3 h-3 text-neutral-400" />
                              <span>{o.customerName || '先锋食客'}</span>
                              <span className="font-mono text-[10px] text-neutral-400">({o.userPhone || '到店客'})</span>
                            </span>
                          </td>

                          <td className="p-2.5 text-neutral-600 font-mono text-[11px]">
                            {o.createdTime}
                          </td>

                          <td className="p-2.5">
                            <span className="font-mono font-semibold text-sm text-rose-600 block">
                              ¥{o.totalAmount.toFixed(2)}
                            </span>
                            <span className={`text-[10px] px-1 py-0.2 rounded-[2px] font-medium inline-block mt-0.5 ${
                              o.paymentMethod === 'alipay'
                                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}>
                              {o.paymentMethod === 'alipay' ? '支付宝' : '微信支付'}
                            </span>
                          </td>

                          <td className="p-2.5 max-w-[200px]">
                            <div className="space-y-0.5">
                              {o.items?.map((item, idx) => (
                                <div key={idx} className="text-[11px] text-neutral-700 flex justify-between gap-1">
                                  <span className="truncate">{item.name}</span>
                                  <span className="font-mono text-neutral-500 shrink-0">x{item.quantity}</span>
                                </div>
                              ))}
                            </div>
                          </td>

                          <td className="p-2.5 max-w-[220px]">
                            <div className="bg-rose-50/80 border border-rose-200 rounded-[2px] p-1.5 text-xs">
                              <span className="text-rose-900 font-medium block text-[11px]">
                                {o.refundReason || '未说明退款原因'}
                              </span>
                              <span className="text-[10px] text-rose-600 block mt-0.5">
                                申请状态: {o.status === 'cancel_requested' ? '顾客主动申请取消' : '售后退单审核'}
                              </span>
                            </div>
                          </td>

                          <td className="p-2.5 text-right space-x-1.5 whitespace-nowrap">
                            {/* 批准退款 */}
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  showToast(`正在向支付网关申请原路退款...`);
                                  // 1. 调用真实支付网关原路退款
                                  await executeRealPayRefund({
                                    orderNo: o.orderNo,
                                    refundAmount: o.totalAmount,
                                    totalAmount: o.totalAmount,
                                    reason: o.refundReason || '顾客线上申请极速退款'
                                  });

                                  // 2. 调用 App 核心退款审核回调
                                  onAuditRefund?.(o.id, true);

                                  // 3. 记录进本地 POS 退款流水台账
                                  const newRefundRecord: RefundRecord = {
                                    id: `ref-online-${Date.now()}`,
                                    refundNo: `RF-ON-${Date.now().toString().slice(-6)}`,
                                    orderNo: o.orderNo,
                                    amount: o.totalAmount,
                                    date: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
                                    method: (o as any).paymentMethod === 'alipay' ? '支付宝原路退款' : '微信原路退款',
                                    reasonCategory: 'customer_cancel',
                                    reasonNote: `【线上退款闭环】理由: ${o.refundReason || '顾客在线申请'}`,
                                    authorizedBy: '店长审核 (线上原路返还)',
                                    cookedIsLoss: false,
                                    notifyKitchen: true,
                                    items: (o.items || []).map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
                                    status: 'approved'
                                  };
                                  setRefunds((prev) => [newRefundRecord, ...prev]);

                                  showToast(`【原路退款成功】订单 ${o.orderNo} 款项 ¥${o.totalAmount.toFixed(2)} 已原路退还至顾客 ${(o as any).paymentMethod === 'alipay' ? '支付宝' : '微信'} 账户！`);
                                } catch (err: any) {
                                  showToast(`退款处理失败: ${err.message || '网络异常'}`);
                                }
                              }}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[2px] font-semibold text-xs cursor-pointer shadow-2xs inline-flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>同意退款 (原路返还)</span>
                            </button>

                            {/* 驳回退款 */}
                            <button
                              type="button"
                              onClick={() => {
                                setRejectModalOrder(o);
                                setRejectReasonInput('餐品已新鲜现制出炉，骑手正专送中，无法取消退单');
                              }}
                              className="px-2.5 py-1.5 bg-[#f1f1ef] hover:bg-[#e8e8e6] text-[#37352f] border border-[#e6e6e4] rounded-[2px] font-medium text-xs cursor-pointer shadow-2xs inline-flex items-center gap-1"
                            >
                              <X className="w-3.5 h-3.5 text-rose-500" />
                              <span>驳回申请</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Historical Audited Refunds Table */}
          <div className="bg-white rounded-[4px] border border-[#e6e6e4] overflow-hidden shadow-2xs">
            <div className="p-3 bg-[#f7f7f5] border-b border-[#e6e6e4] flex items-center justify-between">
              <h4 className="font-semibold text-xs text-[#37352f] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#1c5598]" />
                <span>已审核退款与售后处理流水 ({allRefundOrders.length})</span>
              </h4>
              <span className="text-[10px] text-[#787774]">双向对账数据 · 已存档</span>
            </div>

            {/* Mobile Card List (< md) */}
            <div className="md:hidden divide-y divide-[#efefed]">
              {allRefundOrders.map((o) => (
                <div key={o.id} className="p-3 space-y-2 hover:bg-[#fbfbfa]">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="font-mono font-semibold text-xs text-[#37352f] block">{o.orderNo}</span>
                      <span className="text-[10px] text-[#787774]">
                        {o.customerName || '顾客'} ({o.userPhone || '到店客'})
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-semibold text-sm text-[#37352f] block">
                        ¥{o.totalAmount.toFixed(2)}
                      </span>
                      <span className="text-[9.5px] text-[#787774]">
                        {o.paymentMethod === 'alipay' ? '支付宝' : '微信支付'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10.5px]">
                    <span className="text-[#787774]">处理状态:</span>
                    {o.refundStatus === 'approved' ? (
                      <span className="px-1.5 py-0.5 rounded-[2px] text-[10px] font-semibold bg-[#edf3ec] text-[#2b593f] border border-[#c4dcbc]">
                        已原路全额退款
                      </span>
                    ) : o.refundStatus === 'rejected' ? (
                      <span className="px-1.5 py-0.5 rounded-[2px] text-[10px] font-semibold bg-[#fde8e8] text-[#d44333] border border-[#f8b4b4]">
                        已驳回退款
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-[2px] text-[10px] font-semibold bg-[#fef3d6] text-[#b06000] border border-[#fae2a0]">
                        待商家审核
                      </span>
                    )}
                  </div>

                  <div className="bg-[#f7f7f5] rounded-[2px] p-2 text-[10.5px] space-y-1">
                    <p className="text-[#5a5854]">
                      <strong className="text-[#37352f] font-medium">顾客申请:</strong> {o.refundReason || '未填写'}
                    </p>
                    {o.refundRejectReason && (
                      <p className="text-[#d44333] border-t border-[#e6e6e4] pt-1">
                        <strong className="font-medium">驳回说明:</strong> {o.refundRejectReason}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#e6e6e4] bg-[#fbfbfa] text-[#787774] text-[10.5px]">
                    <th className="p-2.5 font-semibold">订单号 / 顾客</th>
                    <th className="p-2.5 font-semibold">订单金额</th>
                    <th className="p-2.5 font-semibold">原支付方式</th>
                    <th className="p-2.5 font-semibold">审核处理状态</th>
                    <th className="p-2.5 font-semibold">退款理由 / 商家答复</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#efefed]">
                  {allRefundOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-[#fbfbfa] transition-colors">
                      <td className="p-2.5">
                        <span className="font-mono font-semibold text-xs text-[#37352f]">{o.orderNo}</span>
                        <span className="text-[10.5px] text-[#787774] block">
                          {o.customerName || '顾客'} ({o.userPhone || '到店客'})
                        </span>
                      </td>

                      <td className="p-2.5 font-mono font-semibold text-[#37352f]">
                        ¥{o.totalAmount.toFixed(2)}
                      </td>

                      <td className="p-2.5">
                        <span className="text-[10.5px] text-[#5a5854]">
                          {o.paymentMethod === 'alipay' ? '支付宝' : '微信支付'}
                        </span>
                      </td>

                      <td className="p-2.5">
                        {o.refundStatus === 'approved' ? (
                          <span className="px-2 py-0.5 rounded-[2px] text-[10px] font-semibold bg-[#edf3ec] text-[#2b593f] border border-[#c4dcbc]">
                            已原路全额退款
                          </span>
                        ) : o.refundStatus === 'rejected' ? (
                          <span className="px-2 py-0.5 rounded-[2px] text-[10px] font-semibold bg-[#fde8e8] text-[#d44333] border border-[#f8b4b4]">
                            已驳回退款
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-[2px] text-[10px] font-semibold bg-[#fef3d6] text-[#b06000] border border-[#fae2a0]">
                            待商家审核
                          </span>
                        )}
                      </td>

                      <td className="p-2.5 text-[#5a5854] text-[11px] max-w-sm">
                        <p className="truncate"><strong className="text-[#37352f] font-medium">顾客申请:</strong> {o.refundReason || '未填写'}</p>
                        {o.refundRejectReason && (
                          <p className="text-[#d44333] truncate mt-0.5">
                            <strong className="font-medium">驳回说明:</strong> {o.refundRejectReason}
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Reject Refund Modal */}
      {rejectModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-[4px] border border-[#e6e6e4] shadow-xl max-w-md w-full p-4 space-y-3">
            <div className="flex items-center justify-between border-b pb-2 border-[#e6e6e4]">
              <h4 className="font-semibold text-sm text-[#37352f] flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-[#d44333]" />
                <span>驳回顾客退款申请 · {rejectModalOrder.orderNo}</span>
              </h4>
              <button
                type="button"
                onClick={() => setRejectModalOrder(null)}
                className="text-[#787774] hover:text-[#37352f] p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#f7f7f5] p-2.5 rounded-[2px] text-xs space-y-1 text-[#5a5854] border border-[#e6e6e4]">
              <p><strong className="text-[#37352f] font-medium">顾客称呼:</strong> {rejectModalOrder.customerName || '先锋食客'} ({rejectModalOrder.userPhone || '无电话'})</p>
              <p><strong className="text-[#37352f] font-medium">申请退款金额:</strong> ¥{rejectModalOrder.totalAmount.toFixed(2)}</p>
              <p><strong className="text-[#37352f] font-medium">顾客退款理由:</strong> {rejectModalOrder.refundReason || '未填写'}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#37352f] block">
                选择或输入驳回原因 (将实时反馈至顾客端):
              </label>
              
              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {[
                  '餐品已新鲜现制出炉，骑手正专送中，无法取消退单',
                  '餐品已送达指定桌位/取餐点，请核对就餐',
                  '已与顾客电话协商，正常制作配送',
                  '非菜品质量问题，特惠套餐不予退单'
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRejectReasonInput(preset)}
                    className="text-[10px] bg-[#f1f1ef] hover:bg-[#e8e8e6] text-[#37352f] px-2 py-0.8 rounded-[2px] border border-[#e6e6e4] cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <textarea
                value={rejectReasonInput}
                onChange={(e) => setRejectReasonInput(e.target.value)}
                rows={3}
                className="w-full bg-white border border-[#e6e6e4] rounded-[2px] p-2 text-xs text-[#37352f] focus:outline-none focus:border-[#37352f]"
                placeholder="请输入详细的驳回原因..."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e6e6e4]">
              <button
                type="button"
                onClick={() => setRejectModalOrder(null)}
                className="px-3 py-1.5 bg-[#f1f1ef] hover:bg-[#e8e8e6] text-[#37352f] rounded-[2px] font-medium text-xs cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  onAuditRefund?.(rejectModalOrder.id, false, rejectReasonInput);
                  showToast(`已驳回订单 ${rejectModalOrder.orderNo} 的退款申请`);
                  setRejectModalOrder(null);
                }}
                className="px-4 py-1.5 bg-[#d44333] hover:bg-[#b03527] text-white rounded-[2px] font-semibold text-xs cursor-pointer shadow-2xs inline-flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>确认驳回退款</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 拟真热敏凭证小票交互预览弹窗 (工业触觉锯齿纸纹 & 声触回响) */}
      {receiptModalData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white p-5 rounded-lg shadow-2xl max-w-sm w-full relative max-h-[92vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                audioHaptics.playMicroClick();
                setReceiptModalData(null);
              }}
              className="absolute top-3 right-3 p-1.5 text-[#787774] hover:text-[#201f1d] hover:bg-[#efefed] cursor-pointer rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="mb-3 text-center">
              <h4 className="font-bold text-xs text-[#37352f] tracking-wide">拟真热敏凭证小票预览</h4>
              <p className="text-[10.5px] text-[#787774]">工业微凹热敏纸纹理 · 物理锯齿撕纸与声触触觉反馈</p>
            </div>
            <ThermalReceiptTicket
              {...receiptModalData}
              onTear={() => {
                showToast('已完成小票单据模拟撕取');
              }}
              onPrint={() => {
                showToast('正在向热敏小票机发送 ESC/POS 打印指令...');
                setTimeout(() => window.print(), 200);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
