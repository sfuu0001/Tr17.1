import {
  DishBomRecipe,
  BomIngredient,
  AntiLeakageAudit,
  FranchiseSupplyOrder,
  SupplyOrderItem
} from '../types/franchise';
import { safeGetStorage, safeSetStorage } from './safeStorage';

export const FRANCHISE_BOM_EVENT = 'franchise_bom_updated';

// 初始特许核心爆品标准配方 (BOM Recipes)
export const INITIAL_DISH_BOM_RECIPES: DishBomRecipe[] = [
  {
    dishId: 'dish-01',
    dishName: 'A5 宫崎和牛小汉堡双重奏',
    category: 'wagyu',
    isCoreDish: true,
    standardYieldRate: 0.98,
    theoreticalCost: 31.8,
    updatedAt: '2026-09-08 10:00',
    ingredients: [
      {
        materialId: 'mat-001',
        materialName: '日本宫崎A5和牛纯牛肉饼(冷冻)',
        skuCode: 'MAT-WAGYU-A5-100G',
        unit: '块',
        quantityPerServing: 2,
        isHqMandatory: true,
        costPerUnit: 12.5
      },
      {
        materialId: 'mat-002',
        materialName: '定制布里欧迷你小汉堡胚',
        skuCode: 'MAT-BRIOCHE-MINI',
        unit: '个',
        quantityPerServing: 2,
        isHqMandatory: true,
        costPerUnit: 2.2
      },
      {
        materialId: 'mat-003',
        materialName: '法国黑松露特调美乃滋',
        skuCode: 'MAT-TRUFFLE-MAYO-500G',
        unit: 'g',
        quantityPerServing: 25,
        isHqMandatory: true,
        costPerUnit: 0.08
      },
      {
        materialId: 'mat-004',
        materialName: '黑曜石定制防油保温汉堡盒',
        skuCode: 'MAT-PKG-BOX-A5',
        unit: '套',
        quantityPerServing: 1,
        isHqMandatory: true,
        costPerUnit: 0.4
      }
    ]
  },
  {
    dishId: 'dish-02',
    dishName: '法国黑松露手工玉棋',
    category: 'gnocchi',
    isCoreDish: true,
    standardYieldRate: 0.96,
    theoreticalCost: 20.6,
    updatedAt: '2026-09-08 10:00',
    ingredients: [
      {
        materialId: 'mat-005',
        materialName: '中央冷链特级马铃薯玉棋生胚',
        skuCode: 'MAT-GNOCCHI-BASE-200G',
        unit: 'g',
        quantityPerServing: 180,
        isHqMandatory: true,
        costPerUnit: 0.065
      },
      {
        materialId: 'mat-006',
        materialName: '佩里戈尔特级黑松露调味膏料',
        skuCode: 'MAT-TRUFFLE-PASTE-100G',
        unit: 'g',
        quantityPerServing: 18,
        isHqMandatory: true,
        costPerUnit: 0.38
      },
      {
        materialId: 'mat-007',
        materialName: '意大利熟成帕玛森干酪碎',
        skuCode: 'MAT-CHEESE-PARM',
        unit: 'g',
        quantityPerServing: 15,
        isHqMandatory: true,
        costPerUnit: 0.14
      }
    ]
  },
  {
    dishId: 'dish-03',
    dishName: '备长炭安格斯牛板腱串',
    category: 'yakitori',
    isCoreDish: true,
    standardYieldRate: 0.95,
    theoreticalCost: 16.5,
    updatedAt: '2026-09-08 10:00',
    ingredients: [
      {
        materialId: 'mat-008',
        materialName: '谷饲安格斯原切牛板腱肉串(3串/份)',
        skuCode: 'MAT-ANGUS-BEEF-SKEWER',
        unit: '串',
        quantityPerServing: 3,
        isHqMandatory: true,
        costPerUnit: 4.8
      },
      {
        materialId: 'mat-009',
        materialName: '日式秘制黑蒜烤肉烧汁',
        skuCode: 'MAT-YAKITORI-TARE-1L',
        unit: 'ml',
        quantityPerServing: 25,
        isHqMandatory: true,
        costPerUnit: 0.05
      },
      {
        materialId: 'mat-010',
        materialName: '定制加厚防烫防油纸袋',
        skuCode: 'MAT-PKG-BAG-SKEWER',
        unit: '个',
        quantityPerServing: 1,
        isHqMandatory: false,
        costPerUnit: 0.15
      }
    ]
  },
  {
    dishId: 'dish-04',
    dishName: '埃塞俄比亚日晒冷萃特调',
    category: 'coldbrew',
    isCoreDish: true,
    standardYieldRate: 0.99,
    theoreticalCost: 6.8,
    updatedAt: '2026-09-08 10:00',
    ingredients: [
      {
        materialId: 'mat-011',
        materialName: '日晒西达摩精萃咖啡浓缩原液',
        skuCode: 'MAT-COFFEE-COLDBREW-BASE',
        unit: 'ml',
        quantityPerServing: 120,
        isHqMandatory: true,
        costPerUnit: 0.04
      },
      {
        materialId: 'mat-012',
        materialName: '黑曜石定制螺口随行冷萃瓶(350ml)',
        skuCode: 'MAT-BOTTLE-350ML',
        unit: '个',
        quantityPerServing: 1,
        isHqMandatory: true,
        costPerUnit: 1.8
      }
    ]
  }
];

// 加盟商向中央供应链采购进货台账 (Mock Baseline)
interface FranchiseProcurementLog {
  franchiseeId: string;
  materialSku: string;
  materialName: string;
  totalDeliveredQty: number;
  unit: string;
  lastDeliveredDate: string;
}

const DEFAULT_PROCUREMENT_LOGS: FranchiseProcurementLog[] = [
  // 静安特许分部 (FRAN-SH-001) - 合规标杆
  { franchiseeId: 'FRAN-SH-001', materialSku: 'MAT-WAGYU-A5-100G', materialName: '日本宫崎A5和牛纯牛肉饼(冷冻)', totalDeliveredQty: 400, unit: '块', lastDeliveredDate: '2026-09-06' },
  { franchiseeId: 'FRAN-SH-001', materialSku: 'MAT-BRIOCHE-MINI', materialName: '定制布里欧迷你小汉堡胚', totalDeliveredQty: 400, unit: '个', lastDeliveredDate: '2026-09-06' },
  { franchiseeId: 'FRAN-SH-001', materialSku: 'MAT-GNOCCHI-BASE-200G', materialName: '中央冷链特级马铃薯玉棋生胚', totalDeliveredQty: 18000, unit: 'g', lastDeliveredDate: '2026-09-05' },
  { franchiseeId: 'FRAN-SH-001', materialSku: 'MAT-ANGUS-BEEF-SKEWER', materialName: '谷饲安格斯原切牛板腱肉串', totalDeliveredQty: 600, unit: '串', lastDeliveredDate: '2026-09-06' },

  // 浦东潮玩特许部 (FRAN-SH-002) - 存在私采嫌疑 (采购量显著偏低，出单异常膨胀)
  { franchiseeId: 'FRAN-SH-002', materialSku: 'MAT-WAGYU-A5-100G', materialName: '日本宫崎A5和牛纯牛肉饼(冷冻)', totalDeliveredQty: 100, unit: '块', lastDeliveredDate: '2026-09-01' },
  { franchiseeId: 'FRAN-SH-002', materialSku: 'MAT-BRIOCHE-MINI', materialName: '定制布里欧迷你小汉堡胚', totalDeliveredQty: 120, unit: '个', lastDeliveredDate: '2026-09-01' },
  { franchiseeId: 'FRAN-SH-002', materialSku: 'MAT-GNOCCHI-BASE-200G', materialName: '中央冷链特级马铃薯玉棋生胚', totalDeliveredQty: 6000, unit: 'g', lastDeliveredDate: '2026-09-02' },
  { franchiseeId: 'FRAN-SH-002', materialSku: 'MAT-ANGUS-BEEF-SKEWER', materialName: '谷饲安格斯原切牛板腱肉串', totalDeliveredQty: 240, unit: '串', lastDeliveredDate: '2026-09-02' }
];

// 加盟商订货单流转 (Supply Orders)
const DEFAULT_SUPPLY_ORDERS: FranchiseSupplyOrder[] = [
  {
    id: 'FSO-20260908-01',
    franchiseeId: 'FRAN-SH-001',
    franchiseeName: '黑曜石餐车 · 静安卓越分部',
    truckId: 'truck-01',
    status: 'in_transit',
    coldChainTempZone: '冷冻 -18℃',
    deliveryAddress: '上海市静安区万荣路777号市北高新园区2号停机位',
    trackingNo: 'SF-COLD-998822019',
    createdAt: '2026-09-07 14:30',
    approvedAt: '2026-09-07 15:10',
    totalAmount: 3240,
    items: [
      { materialId: 'mat-001', materialName: '日本宫崎A5和牛纯牛肉饼(冷冻)', skuCode: 'MAT-WAGYU-A5-100G', unit: '块', requestedQty: 200, unitPrice: 12.5, subtotal: 2500 },
      { materialId: 'mat-002', materialName: '定制布里欧迷你小汉堡胚', skuCode: 'MAT-BRIOCHE-MINI', unit: '个', requestedQty: 200, unitPrice: 2.2, subtotal: 440 },
      { materialId: 'mat-003', materialName: '法国黑松露特调美乃滋', skuCode: 'MAT-TRUFFLE-MAYO-500G', unit: 'g', requestedQty: 3000, unitPrice: 0.1, subtotal: 300 }
    ],
    notes: '预计明日早9点晨检前到车，请提前开启车顶-18℃冷柜降温'
  },
  {
    id: 'FSO-20260906-02',
    franchiseeId: 'FRAN-SH-002',
    franchiseeName: '黑曜石餐车 · 浦东潮玩分部',
    truckId: 'truck-03',
    status: 'delivered',
    coldChainTempZone: '冷冻 -18℃',
    deliveryAddress: '上海市浦东新区世博大道1368号世博源5区',
    trackingNo: 'SF-COLD-882199044',
    createdAt: '2026-09-05 09:00',
    approvedAt: '2026-09-05 10:20',
    deliveredAt: '2026-09-06 08:30',
    totalAmount: 1820,
    items: [
      { materialId: 'mat-008', materialName: '谷饲安格斯原切牛板腱肉串', skuCode: 'MAT-ANGUS-BEEF-SKEWER', unit: '串', requestedQty: 240, unitPrice: 4.8, subtotal: 1152 },
      { materialId: 'mat-005', materialName: '中央冷链特级马铃薯玉棋生胚', skuCode: 'MAT-GNOCCHI-BASE-200G', unit: 'g', requestedQty: 6000, unitPrice: 0.065, subtotal: 390 },
      { materialId: 'mat-009', materialName: '日式秘制黑蒜烤肉烧汁', skuCode: 'MAT-YAKITORI-TARE-1L', unit: 'ml', requestedQty: 5000, unitPrice: 0.05, subtotal: 250 }
    ],
    notes: '周末世博滨江客流大，加急补货'
  }
];

class FranchiseBomLeakageEngine {
  private recipes: DishBomRecipe[];
  private supplyOrders: FranchiseSupplyOrder[];
  private procurementLogs: FranchiseProcurementLog[];

  constructor() {
    this.recipes = safeGetStorage<DishBomRecipe[]>('obsidian_franchise_bom_recipes', INITIAL_DISH_BOM_RECIPES);
    this.supplyOrders = safeGetStorage<FranchiseSupplyOrder[]>('obsidian_franchise_supply_orders', DEFAULT_SUPPLY_ORDERS);
    this.procurementLogs = safeGetStorage<FranchiseProcurementLog[]>('obsidian_franchise_procurements', DEFAULT_PROCUREMENT_LOGS);
  }

  private notify() {
    window.dispatchEvent(new CustomEvent(FRANCHISE_BOM_EVENT, { detail: { timestamp: Date.now() } }));
  }

  public getRecipes(): DishBomRecipe[] {
    return this.recipes;
  }

  public getRecipeByDishId(dishId: string): DishBomRecipe | undefined {
    return this.recipes.find(r => r.dishId === dishId);
  }

  public getSupplyOrders(franchiseeId?: string): FranchiseSupplyOrder[] {
    if (!franchiseeId || franchiseeId === 'HQ') {
      return this.supplyOrders;
    }
    return this.supplyOrders.filter(o => o.franchiseeId === franchiseeId);
  }

  public createSupplyOrder(order: Omit<FranchiseSupplyOrder, 'id' | 'createdAt' | 'status'>): FranchiseSupplyOrder {
    const newOrder: FranchiseSupplyOrder = {
      ...order,
      id: `FSO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
      createdAt: new Date().toLocaleString(),
      status: 'submitted'
    };
    this.supplyOrders = [newOrder, ...this.supplyOrders];
    safeSetStorage('obsidian_franchise_supply_orders', this.supplyOrders);
    this.notify();
    return newOrder;
  }

  public approveSupplyOrder(orderId: string, trackingNo?: string): boolean {
    const target = this.supplyOrders.find(o => o.id === orderId);
    if (!target) return false;
    target.status = 'in_transit';
    target.approvedAt = new Date().toLocaleString();
    if (trackingNo) target.trackingNo = trackingNo;
    safeSetStorage('obsidian_franchise_supply_orders', this.supplyOrders);
    this.notify();
    return true;
  }

  public markOrderDelivered(orderId: string): boolean {
    const target = this.supplyOrders.find(o => o.id === orderId);
    if (!target) return false;
    target.status = 'delivered';
    target.deliveredAt = new Date().toLocaleString();

    // 到货后，自动累加加盟商的采购进货总量，供防飞单引擎核销
    target.items.forEach(item => {
      const exist = this.procurementLogs.find(
        p => p.franchiseeId === target.franchiseeId && p.materialSku === item.skuCode
      );
      if (exist) {
        exist.totalDeliveredQty += item.requestedQty;
        exist.lastDeliveredDate = new Date().toISOString().slice(0, 10);
      } else {
        this.procurementLogs.push({
          franchiseeId: target.franchiseeId,
          materialSku: item.skuCode,
          materialName: item.materialName,
          totalDeliveredQty: item.requestedQty,
          unit: item.unit,
          lastDeliveredDate: new Date().toISOString().slice(0, 10)
        });
      }
    });

    safeSetStorage('obsidian_franchise_supply_orders', this.supplyOrders);
    safeSetStorage('obsidian_franchise_procurements', this.procurementLogs);
    this.notify();
    return true;
  }

  /**
   * 核心算法：智能比对 POS 实销出单量 vs. 总部中央仓进货量
   * 自动诊断「私采外购替代」或「未入账飞单逃避抽成」
   */
  public runAntiLeakageAudit(franchiseeId: string, truckId: string): AntiLeakageAudit[] {
    const audits: AntiLeakageAudit[] = [];

    // 模拟从业务订单引擎及历史销售抽取的真实出单数据
    // 静安 (FRAN-SH-001) 出单与采购极度吻合
    // 浦东 (FRAN-SH-002) 和牛小汉堡出单180份(按BOM需360块牛肉饼)，但总部采购仅100块 -> 严重私采外购！
    const mockSalesMap: Record<string, Record<string, number>> = {
      'FRAN-SH-001': {
        'dish-01': 192, // 理论耗用和牛肉饼 384 块，总部进货 400 块 -> 账实吻合正常 (safe)
        'dish-02': 95,  // 理论耗用生胚 17,100g，总部进货 18,000g -> safe
        'dish-03': 180, // 理论耗用肉串 540 串，总部进货 600 串 -> safe
        'dish-04': 210  // safe
      },
      'FRAN-SH-002': {
        'dish-01': 168, // 理论耗用和牛肉饼 336 块，总部进料仅 100 块 -> 缺口 236 块 (高危私采!)
        'dish-02': 32,  // 理论耗用生胚 5,760g，总部进料 6,000g -> safe
        'dish-03': 130, // 理论耗用 390 串，总部进料仅 240 串 -> 缺口 150 串 (高危私采!)
        'dish-04': 140
      }
    };

    const truckSales = mockSalesMap[franchiseeId] || mockSalesMap['FRAN-SH-001'];

    this.recipes.forEach(recipe => {
      const salesQty = truckSales[recipe.dishId] || 0;
      const coreIng = recipe.ingredients.find(i => i.isHqMandatory) || recipe.ingredients[0];
      const theoreticalNeeded = salesQty * coreIng.quantityPerServing;

      const procRecord = this.procurementLogs.find(
        p => p.franchiseeId === franchiseeId && p.materialSku === coreIng.skuCode
      );
      const procuredQty = procRecord ? procRecord.totalDeliveredQty : 0;
      const variance = theoreticalNeeded - procuredQty;
      const variancePercent = procuredQty > 0 ? ((variance / procuredQty) * 100) : (theoreticalNeeded > 0 ? 100 : 0);

      let riskLevel: AntiLeakageAudit['riskLevel'] = 'safe';
      let estimatedLoss = 0;
      let note = '中央仓供料与POS出单核销平衡，在合理损耗容限内。';

      if (variance > coreIng.quantityPerServing * 15 && variancePercent > 15) {
        riskLevel = 'high_risk_private_sourcing';
        // 涉嫌私自外购劣质牛肉饼/非标原料替代总部品控
        estimatedLoss = Math.round(variance * coreIng.costPerUnit * 1.8);
        note = `⚠️ 严重私采预警：实销${salesQty}份需消耗${coreIng.materialName}${theoreticalNeeded}${coreIng.unit}，但总部采购仅${procuredQty}${coreIng.unit}！疑似私采外部非标原料。`;
      } else if (variance < -coreIng.quantityPerServing * 40 && variancePercent < -30) {
        riskLevel = 'unrecorded_sales';
        estimatedLoss = Math.round(Math.abs(variance) * 25);
        note = `⚠️ 疑似线下私收飞单：总部已供料${procuredQty}${coreIng.unit}，但POS仅入账${salesQty}份成菜，差额达${Math.abs(variance)}${coreIng.unit}，疑似微信个人码收款逃避分成！`;
      } else if (variancePercent > 5) {
        riskLevel = 'low_risk';
        note = '略微超出标准BOM安全库存，建议安排巡检核查后厨解冻损耗。';
      }

      audits.push({
        dishId: recipe.dishId,
        dishName: recipe.dishName,
        franchiseeId,
        truckId,
        period: '本月度累计 (2026-09)',
        actualSalesQuantity: salesQty,
        theoreticalMaterialRequired: theoreticalNeeded,
        hqProcuredQuantity: procuredQty,
        varianceQuantity: variance,
        variancePercent: parseFloat(variancePercent.toFixed(1)),
        riskLevel,
        estimatedLossOrLeakage: estimatedLoss,
        inspectionNote: note,
        detectedAt: new Date().toLocaleDateString()
      });
    });

    return audits;
  }
}

export const globalFranchiseBomEngine = new FranchiseBomLeakageEngine();
