import {
  StoreInspectionCard,
  StoreInspectionCategory,
  StoreInspectionItem,
  InspectionGrade,
  DepositTransactionRecord
} from '../types/franchise';
import { safeGetStorage, safeSetStorage } from './safeStorage';
import { globalFranchiseEngine } from './franchiseTenantEngine';

export const FRANCHISE_AUDIT_EVENT = 'franchise_audit_updated';

const STORAGE_KEY_AUDITS = 'obsidian_franchise_store_audits';
const STORAGE_KEY_DEPOSITS = 'obsidian_franchise_deposit_records';

// 官方标准巡检指标规范模板
export const STANDARD_INSPECTION_CHECKLIST: StoreInspectionCategory[] = [
  {
    categoryKey: 'food_safety',
    categoryName: '1. 食品安全与私进原料 (占分25分)',
    maxScore: 25,
    currentScore: 25,
    items: [
      {
        id: 'FS-01',
        title: '中央仓赋码核查',
        standard: '现场冷冻肉品/面包胚/酱料必须具备总部中央仓防伪赋码，严禁外部私采私进',
        passed: true,
        deduction: 15,
        note: '已扫码核对，货源一致'
      },
      {
        id: 'FS-02',
        title: '保质期与效期标签',
        standard: '冷藏柜内半成品必须张贴开封日期与废弃报损时标，严禁临期/过期食材',
        passed: true,
        deduction: 5
      },
      {
        id: 'FS-03',
        title: '生熟用具严格分色',
        standard: '红案处理生肉、绿案处理蔬菜、白案出餐分装，夹具刀具分类悬挂',
        passed: true,
        deduction: 5
      }
    ]
  },
  {
    categoryKey: 'temperature_coldchain',
    categoryName: '2. 冷链温控与锁鲜监控 (占分20分)',
    maxScore: 20,
    currentScore: 20,
    items: [
      {
        id: 'TC-01',
        title: '冷冻舱温度实测',
        standard: '车载深冷储藏舱实测温度须持续保持在 -18℃ 以下 (探针实测)',
        passed: true,
        deduction: 10
      },
      {
        id: 'TC-02',
        title: '冷藏锁鲜柜温控',
        standard: '0-4℃ 保鲜柜温度记录仪每 2 小时自动点检，无断电升温异常',
        passed: true,
        deduction: 5
      },
      {
        id: 'TC-03',
        title: '成品保温待取格',
        standard: '保温出餐架实测表面温度 ≥ 60℃，锁温封签完好',
        passed: true,
        deduction: 5
      }
    ]
  },
  {
    categoryKey: 'vehicle_compliance',
    categoryName: '3. 车载合规与消防设施 (占分20分)',
    maxScore: 20,
    currentScore: 20,
    items: [
      {
        id: 'VC-01',
        title: '干粉灭火器检定',
        standard: '车头与烤炉工位各配备 4kg ABC干粉灭火器，指针处于绿色正常区间，年检标完好',
        passed: true,
        deduction: 10
      },
      {
        id: 'VC-02',
        title: '电路阻燃与油烟净化',
        standard: '静电油烟净化器开启率100%，无跑冒滴漏；电线护套无老化裸露',
        passed: true,
        deduction: 5
      },
      {
        id: 'VC-03',
        title: '一车一证现场公示',
        standard: '食品经营许可证、从业人员健康证原件在餐车醒目公示窗合规上墙',
        passed: true,
        deduction: 5
      }
    ]
  },
  {
    categoryKey: 'service_sop',
    categoryName: '4. 现制出品与工艺SOP (占分20分)',
    maxScore: 20,
    currentScore: 20,
    items: [
      {
        id: 'SP-01',
        title: '和牛炙烤出品标准',
        standard: '黑曜石炙烤炉温 260℃，和牛中心温度达到 65℃，按规定静置 2 分钟',
        passed: true,
        deduction: 10
      },
      {
        id: 'SP-02',
        title: '双层食品级锁温封装',
        standard: '采用铝箔隔温内衬 + 专属封签，外卖骑手取餐时核对专送码',
        passed: true,
        deduction: 5
      },
      {
        id: 'SP-03',
        title: '卫生消毒与免洗凝胶',
        standard: '点餐台前置感应洗手消毒液，后厨操作员每 30 分钟手部消毒',
        passed: true,
        deduction: 5
      }
    ]
  },
  {
    categoryKey: 'brand_visual',
    categoryName: '5. 品牌视觉与物料规范 (占分15分)',
    maxScore: 15,
    currentScore: 15,
    items: [
      {
        id: 'BV-01',
        title: '车身黑金涂装整洁',
        standard: '餐车外立面无私贴小广告，招牌发光字无缺笔暗光',
        passed: true,
        deduction: 8
      },
      {
        id: 'BV-02',
        title: '员工工服与礼仪',
        standard: '统一佩戴黑曜石专属围裙、耐油工作帽与透明卫生口罩',
        passed: true,
        deduction: 7
      }
    ]
  }
];

// 预设种子巡检记录
export const INITIAL_INSPECTION_CARDS: StoreInspectionCard[] = [
  {
    id: 'CARD-2026-0906-01',
    inspectionNo: 'INS-20260906-01',
    franchiseeId: 'FRAN-SH-001',
    franchiseeName: '黑曜石流动餐车 · 静安卓越分部',
    truckId: 'truck-01',
    inspectorName: '张督导 (华东一区金牌督导)',
    inspectionDate: '2026-09-06 15:30',
    score: 96,
    grade: 'A',
    categories: JSON.parse(JSON.stringify(STANDARD_INSPECTION_CHECKLIST)),
    criticalFindings: ['整体出餐动线流畅，冷链探针温度达标，卫生标兵餐车'],
    rectificationRequired: false,
    rectificationStatus: 'passed',
    penaltyAmount: 0,
    penaltyPaid: true,
    createdAt: '2026-09-06 16:00:00'
  },
  {
    id: 'CARD-2026-0907-02',
    inspectionNo: 'INS-20260907-02',
    franchiseeId: 'FRAN-SH-002',
    franchiseeName: '黑曜石流动餐车 · 浦东潮玩特许部',
    truckId: 'truck-03',
    inspectorName: '李督导 (区域品控主管)',
    inspectionDate: '2026-09-07 14:10',
    score: 74,
    grade: 'C',
    categories: [
      {
        categoryKey: 'food_safety',
        categoryName: '1. 食品安全与私进原料 (占分25分)',
        maxScore: 25,
        currentScore: 10,
        items: [
          {
            id: 'FS-01',
            title: '中央仓赋码核查',
            standard: '现场冷冻肉品/面包胚/酱料必须具备总部中央仓防伪赋码，严禁外部私采私进',
            passed: false,
            deduction: 15,
            note: '抽检发现 1 箱私采无编码冷冻肉饼，已当场封存取证'
          },
          {
            id: 'FS-02',
            title: '保质期与效期标签',
            standard: '冷藏柜内半成品必须张贴开封日期与废弃报损时标，严禁临期/过期食材',
            passed: true,
            deduction: 0
          },
          {
            id: 'FS-03',
            title: '生熟用具严格分色',
            standard: '红案处理生肉、绿案处理蔬菜、白案出餐分装，夹具刀具分类悬挂',
            passed: true,
            deduction: 0
          }
        ]
      },
      {
        categoryKey: 'temperature_coldchain',
        categoryName: '2. 冷链温控与锁鲜监控 (占分20分)',
        maxScore: 20,
        currentScore: 15,
        items: [
          {
            id: 'TC-01',
            title: '冷冻舱温度实测',
            standard: '车载深冷储藏舱实测温度须持续保持在 -18℃ 以下 (探针实测)',
            passed: true,
            deduction: 0
          },
          {
            id: 'TC-02',
            title: '冷藏锁鲜柜温控',
            standard: '0-4℃ 保鲜柜温度记录仪每 2 小时自动点检，无断电升温异常',
            passed: false,
            deduction: 5,
            note: '保鲜柜温控读数短暂偏高至 6.8℃，已责令调整制冷压缩机'
          },
          {
            id: 'TC-03',
            title: '成品保温待取格',
            standard: '保温出餐架实测表面温度 ≥ 60℃，锁温封签完好',
            passed: true,
            deduction: 0
          }
        ]
      },
      STANDARD_INSPECTION_CHECKLIST[2],
      STANDARD_INSPECTION_CHECKLIST[3],
      STANDARD_INSPECTION_CHECKLIST[4]
    ],
    criticalFindings: [
      '严重隐患：抽查发现 1 箱非总部中央配料冷冻肉饼，疑似私进货源，已涉嫌违约私采！',
      '保鲜柜读数偏高，存在食材品质隐患。'
    ],
    rectificationRequired: true,
    rectificationDeadline: '2026-09-10 18:00',
    rectificationStatus: 'pending_rectification',
    penaltyAmount: 2000,
    penaltyPaid: true,
    createdAt: '2026-09-07 15:00:00'
  }
];

// 预设履约保证金账本变动明细
export const INITIAL_DEPOSIT_RECORDS: DepositTransactionRecord[] = [
  {
    id: 'DEP-REC-001',
    franchiseeId: 'FRAN-SH-001',
    franchiseeName: '黑曜石流动餐车 · 静安卓越分部',
    type: 'initial_deposit',
    amount: 50000,
    balanceAfter: 50000,
    reason: '签约特许经营合同首次足额缴纳履约保证金',
    operator: '总部财务总监 · 沈会计',
    createdAt: '2026-01-10 10:00:00'
  },
  {
    id: 'DEP-REC-002',
    franchiseeId: 'FRAN-SH-002',
    franchiseeName: '黑曜石流动餐车 · 浦东潮玩特许部',
    type: 'initial_deposit',
    amount: 50000,
    balanceAfter: 50000,
    reason: '签约特许经营合同首次足额缴纳履约保证金',
    operator: '总部财务总监 · 沈会计',
    createdAt: '2026-03-12 11:30:00'
  },
  {
    id: 'DEP-REC-003',
    franchiseeId: 'FRAN-SH-002',
    franchiseeName: '黑曜石流动餐车 · 浦东潮玩特许部',
    type: 'penalty_deduction',
    amount: 2000,
    balanceAfter: 48000,
    reason: '巡检单 INS-20260907-02 发现私进无防伪码肉饼，违约扣除履约保证金 ¥2,000',
    relatedInspectionNo: 'INS-20260907-02',
    operator: '区域品控总监 · 张巡检',
    createdAt: '2026-09-07 15:30:00'
  }
];

export class FranchiseStoreAuditEngine {
  private cards: StoreInspectionCard[];
  private depositRecords: DepositTransactionRecord[];

  constructor() {
    this.cards = safeGetStorage<StoreInspectionCard[]>(STORAGE_KEY_AUDITS, INITIAL_INSPECTION_CARDS);
    this.depositRecords = safeGetStorage<DepositTransactionRecord[]>(
      STORAGE_KEY_DEPOSITS,
      INITIAL_DEPOSIT_RECORDS
    );
  }

  private persist() {
    safeSetStorage(STORAGE_KEY_AUDITS, this.cards);
    safeSetStorage(STORAGE_KEY_DEPOSITS, this.depositRecords);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(FRANCHISE_AUDIT_EVENT, { detail: this.cards }));
    }
  }

  public getInspectionCards(franchiseeId?: string, truckId?: string): StoreInspectionCard[] {
    let list = [...this.cards];
    if (franchiseeId && franchiseeId !== 'HQ') {
      list = list.filter((c) => c.franchiseeId === franchiseeId);
    }
    if (truckId) {
      list = list.filter((c) => c.truckId === truckId);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getDepositRecords(franchiseeId?: string): DepositTransactionRecord[] {
    let list = [...this.depositRecords];
    if (franchiseeId && franchiseeId !== 'HQ') {
      list = list.filter((r) => r.franchiseeId === franchiseeId);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * 提交并记录一次完整的线下督导巡检
   */
  public submitInspection(
    cardData: Omit<StoreInspectionCard, 'id' | 'createdAt'>,
    operator = '品牌督导专员'
  ): StoreInspectionCard {
    const now = new Date();
    const timeStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now
      .getDate()
      .toString()
      .padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    const newCard: StoreInspectionCard = {
      ...cardData,
      id: `CARD-${Date.now().toString().slice(-6)}`,
      createdAt: timeStr
    };

    this.cards.unshift(newCard);

    // 如果产生了罚款，自动扣减保证金并记录账本
    if (newCard.penaltyAmount > 0) {
      this.applyDepositPenalty(
        newCard.franchiseeId,
        newCard.franchiseeName,
        newCard.penaltyAmount,
        `督导巡检扣款 (${newCard.inspectionNo}): ${newCard.criticalFindings.join('; ')}`,
        newCard.inspectionNo,
        operator
      );
    }

    this.persist();
    return newCard;
  }

  /**
   * 扣减履约保证金
   */
  public applyDepositPenalty(
    franchiseeId: string,
    franchiseeName: string,
    penaltyAmount: number,
    reason: string,
    inspectionNo?: string,
    operator = '总部风控品控中枢'
  ): boolean {
    const profiles = globalFranchiseEngine.getProfiles();
    const targetProfile = profiles.find((p) => p.id === franchiseeId);
    if (!targetProfile) return false;

    targetProfile.depositBalance = Math.max(0, targetProfile.depositBalance - penaltyAmount);
    // 同步扣分
    targetProfile.complianceScore = Math.max(50, targetProfile.complianceScore - Math.min(15, Math.ceil(penaltyAmount / 200)));
    globalFranchiseEngine.updateProfile(targetProfile);

    const now = new Date();
    const timeStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now
      .getDate()
      .toString()
      .padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    const newRecord: DepositTransactionRecord = {
      id: `DEP-REC-${Date.now().toString().slice(-6)}`,
      franchiseeId,
      franchiseeName,
      type: 'penalty_deduction',
      amount: penaltyAmount,
      balanceAfter: targetProfile.depositBalance,
      reason,
      relatedInspectionNo: inspectionNo,
      operator,
      createdAt: timeStr
    };

    this.depositRecords.unshift(newRecord);
    this.persist();
    return true;
  }

  /**
   * 加盟商补缴履约保证金
   */
  public replenishDeposit(
    franchiseeId: string,
    amount: number,
    operator = '加盟商网银直充'
  ): boolean {
    const profiles = globalFranchiseEngine.getProfiles();
    const targetProfile = profiles.find((p) => p.id === franchiseeId);
    if (!targetProfile) return false;

    targetProfile.depositBalance += amount;
    if (targetProfile.depositBalance >= targetProfile.depositRequired) {
      targetProfile.complianceScore = Math.min(100, targetProfile.complianceScore + 5);
      if (targetProfile.status === 'probation') {
        targetProfile.status = 'active';
      }
    }
    globalFranchiseEngine.updateProfile(targetProfile);

    const now = new Date();
    const timeStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now
      .getDate()
      .toString()
      .padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    const newRecord: DepositTransactionRecord = {
      id: `DEP-REC-${Date.now().toString().slice(-6)}`,
      franchiseeId,
      franchiseeName: targetProfile.brandBranchName,
      type: 'replenishment',
      amount,
      balanceAfter: targetProfile.depositBalance,
      reason: '加盟商补足合规履约保证金',
      operator,
      createdAt: timeStr
    };

    this.depositRecords.unshift(newRecord);
    this.persist();
    return true;
  }

  /**
   * 更新整改工单状态 (如加盟商上传整改说明/督导复检通过)
   */
  public updateRectificationStatus(
    cardId: string,
    status: StoreInspectionCard['rectificationStatus'],
    notes?: string
  ): boolean {
    const target = this.cards.find((c) => c.id === cardId);
    if (!target) return false;

    target.rectificationStatus = status;
    if (notes) {
      target.reinspectionNotes = notes;
    }
    if (status === 'reinspected_passed') {
      target.score = Math.min(95, target.score + 15);
      target.grade = target.score >= 90 ? 'A' : 'B';
    }

    this.persist();
    return true;
  }

  /**
   * 聚合巡检品质指标
   */
  public getAuditSummary(franchiseeId?: string) {
    const list = this.getInspectionCards(franchiseeId);
    const profiles = globalFranchiseEngine.getProfiles();

    const currentProfile = franchiseeId && franchiseeId !== 'HQ'
      ? profiles.find((p) => p.id === franchiseeId)
      : null;

    const totalInspections = list.length;
    const avgScore =
      totalInspections > 0
        ? Math.round(list.reduce((sum, c) => sum + c.score, 0) / totalInspections)
        : 100;

    const gradeA = list.filter((c) => c.grade === 'A').length;
    const gradeB = list.filter((c) => c.grade === 'B').length;
    const gradeC = list.filter((c) => c.grade === 'C').length;
    const gradeD = list.filter((c) => c.grade === 'D').length;

    const pendingRectifications = list.filter(
      (c) => c.rectificationStatus === 'pending_rectification' || c.rectificationStatus === 'rectification_overdue'
    ).length;

    const totalPenalties = list.reduce((sum, c) => sum + c.penaltyAmount, 0);

    return {
      totalInspections,
      avgScore,
      gradeA,
      gradeB,
      gradeC,
      gradeD,
      pendingRectifications,
      totalPenalties,
      depositBalance: currentProfile ? currentProfile.depositBalance : 148000,
      depositRequired: currentProfile ? currentProfile.depositRequired : 150000
    };
  }
}

export const globalFranchiseAuditEngine = new FranchiseStoreAuditEngine();
