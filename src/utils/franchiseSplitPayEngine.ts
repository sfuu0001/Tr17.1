import {
  TransactionSplitDetail,
  FranchiseeSettlementBill,
  FranchiseSplitConfig,
  SplitSettlementStatus
} from '../types/franchise';
import { Order } from '../types';
import { safeGetStorage, safeSetStorage } from './safeStorage';

export const FRANCHISE_SPLIT_EVENT = 'franchise_split_updated';

const STORAGE_KEY_SPLITS = 'obsidian_franchise_splits';
const STORAGE_KEY_BILLS = 'obsidian_franchise_settlement_bills';
const STORAGE_KEY_CONFIGS = 'obsidian_franchise_split_configs';

// 默认分账比例配置 (按加盟商配置或总部默认)
export const DEFAULT_SPLIT_CONFIGS: Record<string, FranchiseSplitConfig> = {
  'FRAN-SH-001': {
    franchiseeId: 'FRAN-SH-001',
    royaltyRatePercent: 5.0, // 品牌特许权益金 5.0%
    marketingRatePercent: 2.0, // 全国统筹营销基金 2.0%
    techFeeRatePercent: 0.6, // 通道技术费 0.6%
    settlementCycle: 'D+1',
    autoPayoutEnabled: true
  },
  'FRAN-SH-002': {
    franchiseeId: 'FRAN-SH-002',
    royaltyRatePercent: 5.5, // 新签分舵 5.5%
    marketingRatePercent: 2.0,
    techFeeRatePercent: 0.6,
    settlementCycle: 'D+1',
    autoPayoutEnabled: true
  },
  'FRAN-SH-003': {
    franchiseeId: 'FRAN-SH-003',
    royaltyRatePercent: 4.8, // 艺术街区重点扶持店 4.8%
    marketingRatePercent: 1.5,
    techFeeRatePercent: 0.6,
    settlementCycle: 'D+0',
    autoPayoutEnabled: true
  }
};

// 预设种子分账明细
export const INITIAL_SPLIT_DETAILS: TransactionSplitDetail[] = [
  {
    id: 'SPLIT-2026-0908-01',
    orderId: 'ord-1788001',
    orderNo: 'UR-9901',
    franchiseeId: 'FRAN-SH-001',
    franchiseeName: '黑曜石流动餐车 · 静安卓越分部',
    truckId: 'truck-01',
    orderAmount: 128.0,
    platformTechFee: 0.77,
    hqRoyaltyFee: 6.4,
    marketingFundFee: 2.56,
    franchiseeSettlementAmount: 118.27,
    settlementCycle: 'D+1',
    settlementStatus: 'settled',
    settledAt: '2026-09-08 00:05:00',
    createdAt: '2026-09-07 20:15:32'
  },
  {
    id: 'SPLIT-2026-0908-02',
    orderId: 'ord-1788002',
    orderNo: 'UR-9902',
    franchiseeId: 'FRAN-SH-001',
    franchiseeName: '黑曜石流动餐车 · 静安卓越分部',
    truckId: 'truck-01',
    orderAmount: 268.0,
    platformTechFee: 1.61,
    hqRoyaltyFee: 13.4,
    marketingFundFee: 5.36,
    franchiseeSettlementAmount: 247.63,
    settlementCycle: 'D+1',
    settlementStatus: 'settled',
    settledAt: '2026-09-08 00:05:00',
    createdAt: '2026-09-07 21:04:18'
  },
  {
    id: 'SPLIT-2026-0908-03',
    orderId: 'ord-1788003',
    orderNo: 'UR-9903',
    franchiseeId: 'FRAN-SH-002',
    franchiseeName: '黑曜石流动餐车 · 浦东潮玩特许部',
    truckId: 'truck-03',
    orderAmount: 342.0,
    platformTechFee: 2.05,
    hqRoyaltyFee: 18.81,
    marketingFundFee: 6.84,
    franchiseeSettlementAmount: 314.3,
    settlementCycle: 'D+1',
    settlementStatus: 'pending_clearance',
    createdAt: '2026-09-08 12:30:10'
  },
  {
    id: 'SPLIT-2026-0908-04',
    orderId: 'ord-1788004',
    orderNo: 'UR-9904',
    franchiseeId: 'FRAN-SH-002',
    franchiseeName: '黑曜石流动餐车 · 浦东潮玩特许部',
    truckId: 'truck-03',
    orderAmount: 480.0,
    platformTechFee: 2.88,
    hqRoyaltyFee: 26.4,
    marketingFundFee: 9.6,
    franchiseeSettlementAmount: 441.12,
    settlementCycle: 'D+1',
    settlementStatus: 'frozen_for_investigation',
    freezeReason: '触碰防飞单BOM风控告警：当班次牛肉饼理论耗量超出中央进货配额 35%',
    createdAt: '2026-09-08 14:15:22'
  },
  {
    id: 'SPLIT-2026-0908-05',
    orderId: 'ord-1788005',
    orderNo: 'UR-9905',
    franchiseeId: 'FRAN-SH-003',
    franchiseeName: '黑曜石流动餐车 · 徐汇西岸艺术驿站',
    truckId: 'truck-04',
    orderAmount: 196.0,
    platformTechFee: 1.18,
    hqRoyaltyFee: 9.41,
    marketingFundFee: 2.94,
    franchiseeSettlementAmount: 182.47,
    settlementCycle: 'D+0',
    settlementStatus: 'settled',
    settledAt: '2026-09-08 16:40:00',
    createdAt: '2026-09-08 16:20:00'
  }
];

// 历史已出对账单种子数据
export const INITIAL_SETTLEMENT_BILLS: FranchiseeSettlementBill[] = [
  {
    id: 'BILL-20260907-001',
    billNo: 'STL-20260907-SH01',
    franchiseeId: 'FRAN-SH-001',
    franchiseeName: '黑曜石流动餐车 · 静安卓越分部',
    settlementDate: '2026-09-07',
    totalOrdersCount: 86,
    totalGrossRevenue: 14280.0,
    totalHqRoyalty: 714.0,
    totalMarketingFund: 285.6,
    totalTechFee: 85.68,
    totalNetPayout: 13194.72,
    status: 'paid',
    generatedAt: '2026-09-08 00:01:00',
    paidAt: '2026-09-08 00:05:00'
  },
  {
    id: 'BILL-20260907-002',
    billNo: 'STL-20260907-SH02',
    franchiseeId: 'FRAN-SH-002',
    franchiseeName: '黑曜石流动餐车 · 浦东潮玩特许部',
    settlementDate: '2026-09-07',
    totalOrdersCount: 62,
    totalGrossRevenue: 10850.0,
    totalHqRoyalty: 596.75,
    totalMarketingFund: 217.0,
    totalTechFee: 65.1,
    totalNetPayout: 9971.15,
    status: 'paid',
    generatedAt: '2026-09-08 00:01:00',
    paidAt: '2026-09-08 00:05:00'
  }
];

export class FranchiseSplitPayEngine {
  private splits: TransactionSplitDetail[];
  private bills: FranchiseeSettlementBill[];
  private configs: Record<string, FranchiseSplitConfig>;

  constructor() {
    this.splits = safeGetStorage<TransactionSplitDetail[]>(STORAGE_KEY_SPLITS, INITIAL_SPLIT_DETAILS);
    this.bills = safeGetStorage<FranchiseeSettlementBill[]>(STORAGE_KEY_BILLS, INITIAL_SETTLEMENT_BILLS);
    this.configs = safeGetStorage<Record<string, FranchiseSplitConfig>>(STORAGE_KEY_CONFIGS, DEFAULT_SPLIT_CONFIGS);
  }

  private persist() {
    safeSetStorage(STORAGE_KEY_SPLITS, this.splits);
    safeSetStorage(STORAGE_KEY_BILLS, this.bills);
    safeSetStorage(STORAGE_KEY_CONFIGS, this.configs);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(FRANCHISE_SPLIT_EVENT, { detail: this.splits }));
    }
  }

  public getSplitDetails(franchiseeId?: string, truckId?: string): TransactionSplitDetail[] {
    let list = [...this.splits];
    if (franchiseeId && franchiseeId !== 'HQ') {
      list = list.filter((s) => s.franchiseeId === franchiseeId);
    }
    if (truckId) {
      list = list.filter((s) => s.truckId === truckId);
    }
    // Sort by latest created first
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getSplitConfigs(): Record<string, FranchiseSplitConfig> {
    return { ...this.configs };
  }

  public updateSplitConfig(config: FranchiseSplitConfig) {
    this.configs[config.franchiseeId] = config;
    this.persist();
  }

  /**
   * 核心算法：实时计算订单分账各分项费用
   */
  public calculateSplit(orderAmount: number, franchiseeId = 'FRAN-SH-001') {
    const config = this.configs[franchiseeId] || {
      franchiseeId,
      royaltyRatePercent: 5.0,
      marketingRatePercent: 2.0,
      techFeeRatePercent: 0.6,
      settlementCycle: 'D+1',
      autoPayoutEnabled: true
    };

    const techFee = Math.round(orderAmount * (config.techFeeRatePercent / 100) * 100) / 100;
    const royaltyFee = Math.round(orderAmount * (config.royaltyRatePercent / 100) * 100) / 100;
    const marketingFee = Math.round(orderAmount * (config.marketingRatePercent / 100) * 100) / 100;
    const netPayout = Math.max(0, Math.round((orderAmount - techFee - royaltyFee - marketingFee) * 100) / 100);

    return {
      platformTechFee: techFee,
      hqRoyaltyFee: royaltyFee,
      marketingFundFee: marketingFee,
      franchiseeSettlementAmount: netPayout,
      cycle: config.settlementCycle
    };
  }

  /**
   * 订单生成/支付成功时原子记录特许分账细账
   */
  public recordOrderSplit(order: Order, franchiseeId = 'FRAN-SH-001', truckId = 'truck-01'): TransactionSplitDetail {
    const franchiseeNames: Record<string, string> = {
      'FRAN-SH-001': '黑曜石流动餐车 · 静安卓越分部',
      'FRAN-SH-002': '黑曜石流动餐车 · 浦东潮玩特许部',
      'FRAN-SH-003': '黑曜石流动餐车 · 徐汇西岸艺术驿站',
      'HQ': '黑曜石餐车品牌直营中枢'
    };

    const cleanOrderNo = (order.orderNo || order.id).replace(/^#/, '');
    const existing = this.splits.find((s) => s.orderNo === cleanOrderNo || s.orderId === order.id);
    if (existing) {
      return existing;
    }

    const { platformTechFee, hqRoyaltyFee, marketingFundFee, franchiseeSettlementAmount, cycle } =
      this.calculateSplit(order.totalAmount, franchiseeId);

    const now = new Date();
    const timeStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now
      .getDate()
      .toString()
      .padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    const newSplit: TransactionSplitDetail = {
      id: `SPLIT-${now.getFullYear()}${now.getMonth() + 1}-${Math.floor(1000 + Math.random() * 9000)}`,
      orderId: order.id,
      orderNo: cleanOrderNo,
      franchiseeId,
      franchiseeName: franchiseeNames[franchiseeId] || '特许加盟合伙餐车',
      truckId: truckId || 'truck-01',
      orderAmount: order.totalAmount,
      platformTechFee,
      hqRoyaltyFee,
      marketingFundFee,
      franchiseeSettlementAmount,
      settlementCycle: cycle as any,
      settlementStatus: cycle === 'D+0' ? 'settled' : 'pending_clearance',
      settledAt: cycle === 'D+0' ? timeStr : undefined,
      createdAt: timeStr
    };

    this.splits.unshift(newSplit);
    this.persist();
    return newSplit;
  }

  /**
   * 退单/售后退款冲抵追回 (Clawback)
   */
  public clawbackRefundSplit(orderIdentifier: string, refundAmount: number, reason = '订单已退款取消'): TransactionSplitDetail | null {
    const cleanId = orderIdentifier.replace(/^#/, '');
    const target = this.splits.find((s) => s.orderNo === cleanId || s.orderId === cleanId);
    if (!target) return null;

    target.settlementStatus = 'refund_clawback';
    target.clawbackAmount = refundAmount;
    target.freezeReason = `售后退款已追回冲账: ${reason}`;

    this.persist();
    return target;
  }

  /**
   * 风控冻结 (如怀疑飞单或越界经营)
   */
  public freezeSplit(splitId: string, reason: string): boolean {
    const target = this.splits.find((s) => s.id === splitId);
    if (!target) return false;

    target.settlementStatus = 'frozen_for_investigation';
    target.freezeReason = reason;
    this.persist();
    return true;
  }

  /**
   * 解除风控冻结
   */
  public unfreezeSplit(splitId: string): boolean {
    const target = this.splits.find((s) => s.id === splitId);
    if (!target) return false;

    target.settlementStatus = 'pending_clearance';
    target.freezeReason = undefined;
    this.persist();
    return true;
  }

  /**
   * D+1 批量清算结账：将待结算流水合并生成正式对账单并划付
   */
  public executeBatchSettlement(franchiseeId?: string): {
    settledCount: number;
    totalAmount: number;
    bill?: FranchiseeSettlementBill;
  } {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now
      .getDate()
      .toString()
      .padStart(2, '0')}`;
    const timeStr = `${todayStr} ${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    let eligible = this.splits.filter((s) => s.settlementStatus === 'pending_clearance');
    if (franchiseeId && franchiseeId !== 'HQ') {
      eligible = eligible.filter((s) => s.franchiseeId === franchiseeId);
    }

    if (eligible.length === 0) {
      return { settledCount: 0, totalAmount: 0 };
    }

    let totalGross = 0;
    let totalRoyalty = 0;
    let totalMarketing = 0;
    let totalTech = 0;
    let totalNet = 0;

    eligible.forEach((s) => {
      s.settlementStatus = 'settled';
      s.settledAt = timeStr;
      totalGross += s.orderAmount;
      totalRoyalty += s.hqRoyaltyFee;
      totalMarketing += s.marketingFundFee;
      totalTech += s.platformTechFee;
      totalNet += s.franchiseeSettlementAmount;
    });

    const targetFranId = franchiseeId && franchiseeId !== 'HQ' ? franchiseeId : 'FRAN-ALL-CONSOLIDATED';
    const targetFranName =
      franchiseeId && franchiseeId !== 'HQ'
        ? eligible[0]?.franchiseeName || '特许加盟商'
        : '总部统筹加盟分舵联合对账单';

    const newBill: FranchiseeSettlementBill = {
      id: `BILL-${Date.now().toString().slice(-6)}`,
      billNo: `STL-${todayStr.replace(/-/g, '')}-${targetFranId.slice(-4)}`,
      franchiseeId: targetFranId,
      franchiseeName: targetFranName,
      settlementDate: todayStr,
      totalOrdersCount: eligible.length,
      totalGrossRevenue: Math.round(totalGross * 100) / 100,
      totalHqRoyalty: Math.round(totalRoyalty * 100) / 100,
      totalMarketingFund: Math.round(totalMarketing * 100) / 100,
      totalTechFee: Math.round(totalTech * 100) / 100,
      totalNetPayout: Math.round(totalNet * 100) / 100,
      status: 'paid',
      generatedAt: timeStr,
      paidAt: timeStr
    };

    this.bills.unshift(newBill);
    this.persist();

    return {
      settledCount: eligible.length,
      totalAmount: newBill.totalNetPayout,
      bill: newBill
    };
  }

  public getSettlementBills(franchiseeId?: string): FranchiseeSettlementBill[] {
    if (franchiseeId && franchiseeId !== 'HQ') {
      return this.bills.filter((b) => b.franchiseeId === franchiseeId || b.franchiseeId === 'FRAN-ALL-CONSOLIDATED');
    }
    return [...this.bills];
  }

  /**
   * 聚合统计财务看板核心指标
   */
  public getSplitSummary(franchiseeId?: string) {
    const list = this.getSplitDetails(franchiseeId);

    const totalGMV = list.reduce((sum, s) => sum + s.orderAmount, 0);
    const totalTechFee = list.reduce((sum, s) => sum + s.platformTechFee, 0);
    const totalHqRoyalty = list.reduce((sum, s) => sum + s.hqRoyaltyFee, 0);
    const totalMarketingFund = list.reduce((sum, s) => sum + s.marketingFundFee, 0);
    const totalNetSettlement = list.reduce((sum, s) => sum + s.franchiseeSettlementAmount, 0);

    const pendingCount = list.filter((s) => s.settlementStatus === 'pending_clearance').length;
    const pendingAmount = list
      .filter((s) => s.settlementStatus === 'pending_clearance')
      .reduce((sum, s) => sum + s.franchiseeSettlementAmount, 0);

    const settledCount = list.filter((s) => s.settlementStatus === 'settled').length;
    const frozenCount = list.filter((s) => s.settlementStatus === 'frozen_for_investigation').length;
    const clawbackCount = list.filter((s) => s.settlementStatus === 'refund_clawback').length;

    return {
      totalGMV: Math.round(totalGMV * 100) / 100,
      totalTechFee: Math.round(totalTechFee * 100) / 100,
      totalHqRoyalty: Math.round(totalHqRoyalty * 100) / 100,
      totalMarketingFund: Math.round(totalMarketingFund * 100) / 100,
      totalNetSettlement: Math.round(totalNetSettlement * 100) / 100,
      pendingCount,
      pendingAmount: Math.round(pendingAmount * 100) / 100,
      settledCount,
      frozenCount,
      clawbackCount
    };
  }
}

export const globalFranchiseSplitEngine = new FranchiseSplitPayEngine();
