import { MaterialItem } from '../types';

/**
 * 原料档案与安全库存标准模板定义
 * 用于将餐饮/流动餐车供应链的所有标准原料抽象为可随时调用、复制、导入、导出的基准模板。
 */
export interface MaterialTemplate {
  templateId: string;
  templateCode: string;
  name: string;
  category: '肉类原料' | '海鲜水产' | '蔬菜品类' | '豆制品类' | '饮品辅料' | '消耗包材' | '主食面点' | '调料调味';
  subCategory?: string;
  safetyStock: number; // 推荐安全库存基准 (警戒线)
  reorderSuggestion: number; // 推荐补货起订量
  unit: string; // 单位: kg / 份 / 瓶 / 箱 / 个
  spec: string; // 包装规格 (如 '20kg/箱 (真空冷鲜)')
  purchasePrice: number; // 参考采购指导价 (¥)
  storageLocation: string; // 默认推荐仓位 (如 '冷库 A-03')
  storageTempZone: string; // 推荐储藏温区 (如 '冷藏 0-4℃', '冷冻 -18℃', '常温通风')
  shelfLifeDays: number; // 标准保质期(天)
  standardYieldRate: number; // 标准出品率/出肉率 (0.72 代表 72%)
  skewersPerKg?: number; // 标准千克出串数
  supplier: string; // 推荐直供商
  supplierContact?: string;
  supplierPhone?: string;
  supplierLeadDays: number; // 供货前置期(天)
  supplierRating: number; // 合作商星级 1-5
  minOrderQty: number; // 最小起订量
  description: string; // 原料标准特性与验收标准
  tags: string[]; // 检索与标签
}

/**
 * 原料档案分类清单
 */
export const MATERIAL_TEMPLATE_CATEGORIES = [
  '全部',
  '肉类原料',
  '海鲜水产',
  '蔬菜品类',
  '豆制品类',
  '调料调味',
  '饮品辅料',
  '消耗包材',
  '主食面点'
] as const;

/**
 * 全量原料档案与安全库存标准模板库
 * 涵盖全品类标准食材，实际在库数量统一设为 0，供商家一键调用并手动入库上架。
 */
export const STANDARD_MATERIAL_TEMPLATES: MaterialTemplate[] = [
  // ------------------------------------------------------------
  // 1. 肉类原料 (Meat Materials)
  // ------------------------------------------------------------
  {
    templateId: 'tpl-mat-wagyu-rib',
    templateCode: 'TPL-RM-001',
    name: '澳洲和牛肋条肉 (冷藏真空)',
    category: '肉类原料',
    subCategory: '牛肉精切',
    safetyStock: 15.0,
    reorderSuggestion: 20.0,
    unit: 'kg',
    spec: '20kg/箱 (真空冷鲜装)',
    purchasePrice: 128.0,
    storageLocation: '冷库 A-03 (0-4℃)',
    storageTempZone: '冷藏 0-4℃',
    shelfLifeDays: 7,
    standardYieldRate: 0.72,
    skewersPerKg: 28.8,
    supplier: '中粮安达直供冷链',
    supplierContact: '张经理',
    supplierPhone: '13812345678',
    supplierLeadDays: 2,
    supplierRating: 5,
    minOrderQty: 10,
    description: '去筋膜修边后标准出肉率72%，单串重25g，雪花纹理清晰，烤制香气浓郁。',
    tags: ['牛肉', '和牛', '肋条', '招牌烤串']
  },
  {
    templateId: 'tpl-mat-lamb-leg',
    templateCode: 'TPL-RM-002',
    name: '原切鲜羊后腿肉 (排酸真空)',
    category: '肉类原料',
    subCategory: '羊肉原切',
    safetyStock: 25.0,
    reorderSuggestion: 30.0,
    unit: 'kg',
    spec: '25kg/箱 (排酸真空装)',
    purchasePrice: 76.0,
    storageLocation: '冷库 A-01 (0-4℃)',
    storageTempZone: '冷藏 0-4℃',
    shelfLifeDays: 5,
    standardYieldRate: 0.74,
    skewersPerKg: 29.6,
    supplier: '宁夏滩羊产业基地',
    supplierContact: '马厂长',
    supplierPhone: '13909512345',
    supplierLeadDays: 1,
    supplierRating: 5,
    minOrderQty: 15,
    description: '排酸后腿肉去骨去淋巴，肉质鲜嫩无膻味，标准出成率74%。',
    tags: ['羊肉', '羊后腿', '宁夏滩羊', '传统肉串']
  },
  {
    templateId: 'tpl-mat-lamb-chop',
    templateCode: 'TPL-RM-003',
    name: '原切法式小羊排肉',
    category: '肉类原料',
    subCategory: '羊排部位',
    safetyStock: 10.0,
    reorderSuggestion: 15.0,
    unit: 'kg',
    spec: '10kg/箱 (单根独立急冻)',
    purchasePrice: 88.0,
    storageLocation: '冷库 C-05 (-18℃)',
    storageTempZone: '冷冻 -18℃',
    shelfLifeDays: 90,
    standardYieldRate: 0.85,
    skewersPerKg: 10.0,
    supplier: '内蒙古锡盟牧业直供',
    supplierContact: '巴特尔',
    supplierPhone: '13704791234',
    supplierLeadDays: 2,
    supplierRating: 5,
    minOrderQty: 10,
    description: '锡林郭勒苏尼特羊，骨香浓郁，肥瘦相间，适合炭火直烤与法式焗烤。',
    tags: ['羊排', '法式羊排', '内蒙直供']
  },
  {
    templateId: 'tpl-mat-chicken-wing',
    templateCode: 'TPL-RM-004',
    name: '冰鲜一级鸡翅中',
    category: '肉类原料',
    subCategory: '禽类原料',
    safetyStock: 5.0,
    reorderSuggestion: 10.0,
    unit: 'kg',
    spec: '10kg/箱 (约35-40只/kg)',
    purchasePrice: 32.0,
    storageLocation: '冷库 C-08 (-2-2℃)',
    storageTempZone: '冷藏 0-4℃',
    shelfLifeDays: 5,
    standardYieldRate: 0.95,
    skewersPerKg: 18.0,
    supplier: '新希望六和禽业',
    supplierContact: '王主管',
    supplierPhone: '13612348888',
    supplierLeadDays: 1,
    supplierRating: 4,
    minOrderQty: 10,
    description: '表皮完整无淤血，标准单只重量30-35g，腌制入味快，出皮脆肉嫩。',
    tags: ['鸡翅', '翅中', '烧烤必选']
  },
  {
    templateId: 'tpl-mat-pork-belly',
    templateCode: 'TPL-RM-005',
    name: '精品三层五花肉 (冷鲜)',
    category: '肉类原料',
    subCategory: '猪肉精选',
    safetyStock: 15.0,
    reorderSuggestion: 25.0,
    unit: 'kg',
    spec: '15kg/箱 (三层分明)',
    purchasePrice: 48.0,
    storageLocation: '冷库 A-02 (0-4℃)',
    storageTempZone: '冷藏 0-4℃',
    shelfLifeDays: 5,
    standardYieldRate: 0.82,
    skewersPerKg: 32.0,
    supplier: '雨润食品冷链直通',
    supplierContact: '刘经理',
    supplierPhone: '13588990011',
    supplierLeadDays: 1,
    supplierRating: 5,
    minOrderQty: 10,
    description: '肥瘦相间五层肉，去皮去毛修整齐平，适合厚切盐烤或秘制五花肉串。',
    tags: ['五花肉', '冷鲜肉', '猪肉']
  },
  {
    templateId: 'tpl-mat-pork-plum',
    templateCode: 'TPL-RM-006',
    name: '优质猪前夹梅花肉',
    category: '肉类原料',
    subCategory: '猪肉精选',
    safetyStock: 12.0,
    reorderSuggestion: 20.0,
    unit: 'kg',
    spec: '20kg/箱 (冷鲜去皮)',
    purchasePrice: 42.0,
    storageLocation: '冷库 A-02 (0-4℃)',
    storageTempZone: '冷藏 0-4℃',
    shelfLifeDays: 5,
    standardYieldRate: 0.88,
    skewersPerKg: 35.0,
    supplier: '雨润食品冷链直通',
    supplierContact: '刘经理',
    supplierPhone: '13588990011',
    supplierLeadDays: 1,
    supplierRating: 4,
    minOrderQty: 10,
    description: '大理石花纹细腻，肉嫩汁多不柴，适合作为招牌大肉串主料。',
    tags: ['梅花肉', '猪肉', '大肉串']
  },
  {
    templateId: 'tpl-mat-wagyu-brisket',
    templateCode: 'TPL-RM-007',
    name: '澳洲M5和牛胸肉 (修精)',
    category: '肉类原料',
    subCategory: '牛肉精切',
    safetyStock: 10.0,
    reorderSuggestion: 20.0,
    unit: 'kg',
    spec: '15kg/箱 (原装进口)',
    purchasePrice: 135.0,
    storageLocation: '冷库 A-03 (0-4℃)',
    storageTempZone: '冷藏 0-4℃',
    shelfLifeDays: 7,
    standardYieldRate: 0.70,
    skewersPerKg: 28.0,
    supplier: '中粮安达直供冷链',
    supplierContact: '张经理',
    supplierPhone: '13812345678',
    supplierLeadDays: 2,
    supplierRating: 5,
    minOrderQty: 10,
    description: 'M5级雪花脂肪丰富，切厚片碳火快炙，油脂甘香化渣。',
    tags: ['M5和牛', '牛胸肉', '高端烤肉']
  },
  {
    templateId: 'tpl-mat-beef-tongue',
    templateCode: 'TPL-RM-008',
    name: '精修牛舌后段舌根 (去皮除筋)',
    category: '肉类原料',
    subCategory: '牛肉内脏',
    safetyStock: 6.0,
    reorderSuggestion: 12.0,
    unit: 'kg',
    spec: '5kg/包 (真空急速冷冻)',
    purchasePrice: 96.0,
    storageLocation: '冷库 C-05 (-18℃)',
    storageTempZone: '冷冻 -18℃',
    shelfLifeDays: 180,
    standardYieldRate: 0.68,
    skewersPerKg: 20.0,
    supplier: '中粮安达直供冷链',
    supplierContact: '张经理',
    supplierPhone: '13812345678',
    supplierLeadDays: 2,
    supplierRating: 5,
    minOrderQty: 5,
    description: '仅取牛舌后1/3精华舌根部位，口感脆嫩多汁，厚切葱烧顶级风味。',
    tags: ['牛舌', '厚切牛舌', '日式烧鸟']
  },
  {
    templateId: 'tpl-mat-pork-brain',
    templateCode: 'TPL-RM-009',
    name: '冷鲜生猪脑 (当日直达)',
    category: '肉类原料',
    subCategory: '内脏特色',
    safetyStock: 5.0,
    reorderSuggestion: 10.0,
    unit: 'kg',
    spec: '约8-10具/kg (冷水保温盒)',
    purchasePrice: 45.0,
    storageLocation: '冷库 A-01 (0-4℃)',
    storageTempZone: '冷藏 0-4℃',
    shelfLifeDays: 2,
    standardYieldRate: 0.92,
    skewersPerKg: 8.0,
    supplier: '雨润食品冷链直通',
    supplierContact: '刘经理',
    supplierPhone: '13588990011',
    supplierLeadDays: 1,
    supplierRating: 4,
    minOrderQty: 5,
    description: '膜破率低于3%，去血丝后锡纸烤脑花，口感绵密如骨髓。',
    tags: ['猪脑', '锡纸烤脑花', '夜市特色']
  },

  // ------------------------------------------------------------
  // 2. 海鲜水产 (Seafood Materials)
  // ------------------------------------------------------------
  {
    templateId: 'tpl-mat-oyster',
    templateCode: 'TPL-RM-010',
    name: '乳山鲜活大生蚝 (特级净水净化)',
    category: '海鲜水产',
    subCategory: '贝类水产',
    safetyStock: 30.0,
    reorderSuggestion: 50.0,
    unit: '份',
    spec: '一件60只 (单只重120g-150g)',
    purchasePrice: 18.0,
    storageLocation: '海鲜冷水保鲜槽 A-01',
    storageTempZone: '冷藏 2-6℃ (湿冷保活)',
    shelfLifeDays: 3,
    standardYieldRate: 0.98,
    supplier: '威海乳山直供海产',
    supplierContact: '姜船长',
    supplierPhone: '13963112233',
    supplierLeadDays: 1,
    supplierRating: 5,
    minOrderQty: 30,
    description: '经紫外线无菌海水净化，壳厚肚圆肉质奶白，招牌炭烤金蒜生蚝主料。',
    tags: ['生蚝', '乳山生蚝', '鲜活海鲜', '招牌爆款']
  },
  {
    templateId: 'tpl-mat-shrimp',
    templateCode: 'TPL-RM-011',
    name: '鲜活基围虾 (9级活度)',
    category: '海鲜水产',
    subCategory: '虾类水产',
    safetyStock: 4.0,
    reorderSuggestion: 5.0,
    unit: 'kg',
    spec: '充氧水袋运输 (约40-50尾/kg)',
    purchasePrice: 68.0,
    storageLocation: '海鲜活水循环缸 A-02',
    storageTempZone: '冷藏 12-16℃ (水循环活鲜)',
    shelfLifeDays: 2,
    standardYieldRate: 0.95,
    skewersPerKg: 20.0,
    supplier: '连云港直通冷链水产',
    supplierContact: '陈老板',
    supplierPhone: '13851239988',
    supplierLeadDays: 1,
    supplierRating: 5,
    minOrderQty: 4,
    description: '壳薄体透，虾肉紧实弹牙，整串生烤保持原汁鲜甜。',
    tags: ['基围虾', '鲜虾', '海鲜串']
  },
  {
    templateId: 'tpl-mat-scallop',
    templateCode: 'TPL-RM-012',
    name: '鲜活天鹅蛋大扇贝 (带壳净化)',
    category: '海鲜水产',
    subCategory: '贝类水产',
    safetyStock: 6.0,
    reorderSuggestion: 12.0,
    unit: 'kg',
    spec: '约8-10只/kg (泡沫冰温箱)',
    purchasePrice: 85.0,
    storageLocation: '海鲜冷水保鲜槽 A-01',
    storageTempZone: '冷藏 2-6℃',
    shelfLifeDays: 3,
    standardYieldRate: 0.90,
    supplier: '威海乳山直供海产',
    supplierContact: '姜船长',
    supplierPhone: '13963112233',
    supplierLeadDays: 1,
    supplierRating: 5,
    minOrderQty: 6,
    description: '个大饱满黄厚柱大，搭配龙口粉丝与秘制蒜蓉粉丝炭烤。',
    tags: ['扇贝', '大扇贝', '蒜蓉扇贝']
  },

  // ------------------------------------------------------------
  // 3. 蔬菜品类 (Vegetables)
  // ------------------------------------------------------------
  {
    templateId: 'tpl-mat-color-pepper',
    templateCode: 'TPL-RM-013',
    name: '高山黄甜椒与有机彩椒',
    category: '蔬菜品类',
    subCategory: '鲜蔬配料',
    safetyStock: 10.0,
    reorderSuggestion: 15.0,
    unit: 'kg',
    spec: '10kg/箱 (无农残泡沫框)',
    purchasePrice: 12.0,
    storageLocation: '后厨果蔬保鲜架 C-01',
    storageTempZone: '冷藏 6-10℃',
    shelfLifeDays: 7,
    standardYieldRate: 0.88,
    supplier: '绿野有机农庄直通车',
    supplierContact: '赵庄主',
    supplierPhone: '13805316677',
    supplierLeadDays: 1,
    supplierRating: 4,
    minOrderQty: 10,
    description: '果肉厚实多汁，色泽鲜亮，用于和牛烤串间穿搭配色与清口解腻。',
    tags: ['彩椒', '甜椒', '时令蔬菜']
  },
  {
    templateId: 'tpl-mat-leek',
    templateCode: 'TPL-RM-014',
    name: '鲜嫩紫根韭菜 (净菜真空保鲜)',
    category: '蔬菜品类',
    subCategory: '鲜蔬原料',
    safetyStock: 8.0,
    reorderSuggestion: 15.0,
    unit: 'kg',
    spec: '5kg/箱 (根部整齐去泥黄叶)',
    purchasePrice: 6.5,
    storageLocation: '后厨果蔬保鲜架 C-02',
    storageTempZone: '冷藏 0-4℃',
    shelfLifeDays: 4,
    standardYieldRate: 0.95,
    supplier: '绿野有机农庄直通车',
    supplierContact: '赵庄主',
    supplierPhone: '13805316677',
    supplierLeadDays: 1,
    supplierRating: 4,
    minOrderQty: 8,
    description: '根紫叶绿辛香浓郁，烧烤摊经典必烤蔬菜，整齐成把穿签。',
    tags: ['韭菜', '烤韭菜', '素烤必点']
  },
  {
    templateId: 'tpl-mat-shiitake',
    templateCode: 'TPL-RM-015',
    name: '高山椴木厚肉鲜香菇',
    category: '蔬菜品类',
    subCategory: '食用菌类',
    safetyStock: 6.0,
    reorderSuggestion: 12.0,
    unit: 'kg',
    spec: '5kg/箱 (直径5-6cm伞厚肉实)',
    purchasePrice: 18.0,
    storageLocation: '后厨果蔬保鲜架 C-02',
    storageTempZone: '冷藏 2-6℃',
    shelfLifeDays: 6,
    standardYieldRate: 0.90,
    supplier: '绿野有机农庄直通车',
    supplierContact: '赵庄主',
    supplierPhone: '13805316677',
    supplierLeadDays: 1,
    supplierRating: 4,
    minOrderQty: 5,
    description: '表面划十字刀口，烤制过程刷秘制酱油与黄油，鲜香四溢。',
    tags: ['香菇', '鲜香菇', '烤菌菇']
  },
  {
    templateId: 'tpl-mat-enoki',
    templateCode: 'TPL-RM-016',
    name: '优质鲜白金针菇 (无硫熏蒸)',
    category: '蔬菜品类',
    subCategory: '食用菌类',
    safetyStock: 8.0,
    reorderSuggestion: 15.0,
    unit: 'kg',
    spec: '10kg/箱 (真空包装袋装)',
    purchasePrice: 9.0,
    storageLocation: '后厨果蔬保鲜架 C-02',
    storageTempZone: '冷藏 2-6℃',
    shelfLifeDays: 8,
    standardYieldRate: 0.88,
    supplier: '绿野有机农庄直通车',
    supplierContact: '赵庄主',
    supplierPhone: '13805316677',
    supplierLeadDays: 1,
    supplierRating: 4,
    minOrderQty: 8,
    description: '用于锡纸蒜蓉烤金针菇或培根金针菇卷，根部整齐洁净。',
    tags: ['金针菇', '锡纸烤', '蔬菜卷']
  },

  // ------------------------------------------------------------
  // 4. 豆制品类 (Bean Products)
  // ------------------------------------------------------------
  {
    templateId: 'tpl-mat-chiba-tofu',
    templateCode: 'TPL-RM-017',
    name: '高弹千叶豆腐 (原板大砖切)',
    category: '豆制品类',
    subCategory: '豆制品',
    safetyStock: 10.0,
    reorderSuggestion: 20.0,
    unit: 'kg',
    spec: '10kg/箱 (无菌冷藏塑封)',
    purchasePrice: 16.0,
    storageLocation: '冷藏保鲜库 B-03',
    storageTempZone: '冷藏 0-4℃',
    shelfLifeDays: 30,
    standardYieldRate: 0.98,
    supplier: '海霸王豆制品直供',
    supplierContact: '钱总',
    supplierPhone: '13398765432',
    supplierLeadDays: 1,
    supplierRating: 4,
    minOrderQty: 10,
    description: '耐烤久烤不焦，烤后外脆内嫩蜂窝孔丰富，吸饱撒料孜然香。',
    tags: ['千叶豆腐', '豆制品', '烤豆腐']
  },
  {
    templateId: 'tpl-mat-gluten',
    templateCode: 'TPL-RM-018',
    name: '手工螺旋大面筋串 (谷朊粉生胚)',
    category: '豆制品类',
    subCategory: '豆面制品',
    safetyStock: 12.0,
    reorderSuggestion: 20.0,
    unit: 'kg',
    spec: '约20串/kg (急速冷冻带签)',
    purchasePrice: 14.0,
    storageLocation: '冷冻储物柜 D-02 (-18℃)',
    storageTempZone: '冷冻 -18℃',
    shelfLifeDays: 90,
    standardYieldRate: 0.98,
    supplier: '海霸王豆制品直供',
    supplierContact: '钱总',
    supplierPhone: '13398765432',
    supplierLeadDays: 1,
    supplierRating: 4,
    minOrderQty: 10,
    description: '螺旋划刀深且均匀，刷红油辣酱炭烤，筋道弹牙焦香四溢。',
    tags: ['面筋', '烤面筋', '经典街头']
  },

  // ------------------------------------------------------------
  // 5. 饮品辅料与调味原浆 (Drinks & Ingredients)
  // ------------------------------------------------------------
  {
    templateId: 'tpl-mat-sour-plum',
    templateCode: 'TPL-RM-019',
    name: '精酿乌梅山楂浓缩原汁 (古法熬制)',
    category: '饮品辅料',
    subCategory: '特色饮品',
    safetyStock: 12.0,
    reorderSuggestion: 24.0,
    unit: '瓶',
    spec: '1.2L/瓶 (高倍稀释比例1:6)',
    purchasePrice: 38.0,
    storageLocation: '店面饮品冰柜 D-01',
    storageTempZone: '常温避光 (开封后冷藏)',
    shelfLifeDays: 180,
    standardYieldRate: 1.0,
    supplier: '老字号古法酿造工坊',
    supplierContact: '孙师傅',
    supplierPhone: '13123456789',
    supplierLeadDays: 2,
    supplierRating: 5,
    minOrderQty: 12,
    description: '天然乌梅、山楂、甘草原叶慢熬，酸甜爽口解油腻，毛利极高。',
    tags: ['酸梅汤', '山楂汁', '解腻神饮']
  },

  // ------------------------------------------------------------
  // 6. 消耗包材 (Packaging)
  // ------------------------------------------------------------
  {
    templateId: 'tpl-mat-kraft-bag',
    templateCode: 'TPL-RM-020',
    name: '食品级牛皮纸防油餐袋 (黑曜石联名大号)',
    category: '消耗包材',
    subCategory: '外卖包装',
    safetyStock: 300.0,
    reorderSuggestion: 500.0,
    unit: '个',
    spec: '500个/箱 (加厚80g淋膜防油)',
    purchasePrice: 0.35,
    storageLocation: '干货仓包材架 E-01',
    storageTempZone: '常温通风干燥',
    shelfLifeDays: 720,
    standardYieldRate: 1.0,
    supplier: '恒美环保包装制品',
    supplierContact: '周厂长',
    supplierPhone: '13798761122',
    supplierLeadDays: 3,
    supplierRating: 5,
    minOrderQty: 300,
    description: '通过SGS食品安全检测，承重力达3kg，透气孔防蒸汽闷软炸物。',
    tags: ['外卖包装', '防油纸袋', '品牌耗材']
  },

  // ------------------------------------------------------------
  // 7. 主食面点 (Staple Foods)
  // ------------------------------------------------------------
  {
    templateId: 'tpl-mat-steamed-bun',
    templateCode: 'TPL-RM-021',
    name: '手工奶香小馒头 (速冻生胚)',
    category: '主食面点',
    subCategory: '烤主食',
    safetyStock: 10.0,
    reorderSuggestion: 20.0,
    unit: 'kg',
    spec: '5kg/袋 (单只重约20g)',
    purchasePrice: 12.0,
    storageLocation: '干货冷冻柜 D-03 (-18℃)',
    storageTempZone: '冷冻 -18℃',
    shelfLifeDays: 180,
    standardYieldRate: 0.98,
    supplier: '三全食品商用直供',
    supplierContact: '郑经理',
    supplierPhone: '13245678901',
    supplierLeadDays: 1,
    supplierRating: 4,
    minOrderQty: 10,
    description: '炭火慢烤至金黄焦脆，淋炼乳食用，老少咸宜的主食补充。',
    tags: ['小馒头', '烤馒头', '主食']
  },

  // ------------------------------------------------------------
  // 8. 进阶肉类禽类精选 (Special Meat & Poultry)
  // ------------------------------------------------------------
  {
    templateId: 'tpl-mat-beef-tendon',
    templateCode: 'TPL-RM-022',
    name: '原切熟压牛背板筋 (排酸熟压真空)',
    category: '肉类原料',
    subCategory: '牛肉精切',
    safetyStock: 10.0,
    reorderSuggestion: 20.0,
    unit: 'kg',
    spec: '20kg/箱 (熟压半成品冷冻)',
    purchasePrice: 65.0,
    storageLocation: '冷库 B-04 (-18℃)',
    storageTempZone: '冷冻 -18℃',
    shelfLifeDays: 90,
    standardYieldRate: 0.95,
    skewersPerKg: 30.0,
    supplier: '中粮安达直供冷链',
    supplierContact: '张经理',
    supplierPhone: '13812345678',
    supplierLeadDays: 2,
    supplierRating: 5,
    minOrderQty: 10,
    description: '高温高压熟化压平，筋道弹牙，炭烤刷酱越嚼越香。',
    tags: ['板筋', '牛肉', '下酒招牌']
  },
  {
    templateId: 'tpl-mat-chicken-gizzard',
    templateCode: 'TPL-RM-023',
    name: '冰鲜香脆鸡胗 (双A精修切花)',
    category: '肉类原料',
    subCategory: '禽类原料',
    safetyStock: 8.0,
    reorderSuggestion: 15.0,
    unit: 'kg',
    spec: '10kg/箱 (冷鲜真空排酸)',
    purchasePrice: 28.0,
    storageLocation: '冷库 C-06 (-2-2℃)',
    storageTempZone: '冷藏 0-4℃',
    shelfLifeDays: 4,
    standardYieldRate: 0.85,
    skewersPerKg: 25.0,
    supplier: '新希望六和禽业',
    supplierContact: '刘主管',
    supplierPhone: '13987654321',
    supplierLeadDays: 1,
    supplierRating: 5,
    minOrderQty: 8,
    description: '精切十字花刀，火候精准时脆爽弹嫩，佐酒绝配。',
    tags: ['鸡胗', '禽肉', '脆爽']
  },
  {
    templateId: 'tpl-mat-chicken-heart',
    templateCode: 'TPL-RM-024',
    name: '冰鲜多汁鲜鸡心 (排血精修去油)',
    category: '肉类原料',
    subCategory: '禽类原料',
    safetyStock: 8.0,
    reorderSuggestion: 15.0,
    unit: 'kg',
    spec: '10kg/箱 (冷鲜去油脂割开)',
    purchasePrice: 26.0,
    storageLocation: '冷库 C-07 (-2-2℃)',
    storageTempZone: '冷藏 0-4℃',
    shelfLifeDays: 4,
    standardYieldRate: 0.88,
    skewersPerKg: 26.0,
    supplier: '新希望六和禽业',
    supplierContact: '刘主管',
    supplierPhone: '13987654321',
    supplierLeadDays: 1,
    supplierRating: 5,
    minOrderQty: 8,
    description: '割开排净积血并修整多余油脂，炙烤锁鲜爆汁。',
    tags: ['鸡心', '日式烧鸟', '爆汁']
  },
  {
    templateId: 'tpl-mat-beef-blade',
    templateCode: 'TPL-RM-025',
    name: '澳洲安格斯牛板腱 (雪花牡蛎肉薄切)',
    category: '肉类原料',
    subCategory: '牛肉精切',
    safetyStock: 12.0,
    reorderSuggestion: 20.0,
    unit: 'kg',
    spec: '15kg/箱 (整条冷藏排酸)',
    purchasePrice: 95.0,
    storageLocation: '冷库 A-04 (0-4℃)',
    storageTempZone: '冷藏 0-4℃',
    shelfLifeDays: 7,
    standardYieldRate: 0.78,
    skewersPerKg: 28.0,
    supplier: '中粮安达直供冷链',
    supplierContact: '张经理',
    supplierPhone: '13812345678',
    supplierLeadDays: 2,
    supplierRating: 5,
    minOrderQty: 10,
    description: '中间带细筋，两边肉质极为软嫩，炭火快烤柔韧多汁。',
    tags: ['板腱', '牛肉', '高端串烤']
  },

  // ------------------------------------------------------------
  // 9. 更多海鲜与水产 (Expanded Seafood)
  // ------------------------------------------------------------
  {
    templateId: 'tpl-mat-scallop-shell',
    templateCode: 'TPL-RM-026',
    name: '鲜活天鹅蛋大扇贝 (大号半壳冰鲜)',
    category: '海鲜水产',
    subCategory: '鲜贝贝类',
    safetyStock: 15.0,
    reorderSuggestion: 25.0,
    unit: 'kg',
    spec: '15kg/箱 (单只约100-120g)',
    purchasePrice: 58.0,
    storageLocation: '海鲜冷冻柜 S-02 (-18℃)',
    storageTempZone: '冷冻 -18℃',
    shelfLifeDays: 30,
    standardYieldRate: 0.90,
    supplier: '大连獐子岛海洋牧业',
    supplierContact: '孙船长',
    supplierPhone: '13611223344',
    supplierLeadDays: 1,
    supplierRating: 5,
    minOrderQty: 15,
    description: '贝肉肥厚多汁，配金银蒜蓉与龙口粉丝炭烤，经典海鲜担当。',
    tags: ['扇贝', '大扇贝', '蒜蓉海鲜']
  },
  {
    templateId: 'tpl-mat-squid-tentacle',
    templateCode: 'TPL-RM-027',
    name: '极鲜深海大鱿鱼须 (船冻大串原切)',
    category: '海鲜水产',
    subCategory: '鱿鱼水产',
    safetyStock: 10.0,
    reorderSuggestion: 20.0,
    unit: 'kg',
    spec: '10kg/箱 (整只大须无杂质)',
    purchasePrice: 42.0,
    storageLocation: '海鲜冷冻柜 S-03 (-18℃)',
    storageTempZone: '冷冻 -18℃',
    shelfLifeDays: 90,
    standardYieldRate: 0.85,
    skewersPerKg: 18.0,
    supplier: '舟山大洋渔业捕捞',
    supplierContact: '吴经理',
    supplierPhone: '13599887766',
    supplierLeadDays: 2,
    supplierRating: 5,
    minOrderQty: 10,
    description: '船上极速深冷锁鲜，铁板或炭火压烤，爽脆紧实弹牙。',
    tags: ['鱿鱼', '海鲜', '招牌烤串']
  },

  // ------------------------------------------------------------
  // 10. 更多鲜蔬与根茎 (Expanded Vegetables)
  // ------------------------------------------------------------
  {
    templateId: 'tpl-mat-potato',
    templateCode: 'TPL-RM-028',
    name: '精选薄皮黄心大土豆 (高山黄心沙土)',
    category: '蔬菜品类',
    subCategory: '根茎时蔬',
    safetyStock: 25.0,
    reorderSuggestion: 40.0,
    unit: 'kg',
    spec: '25kg/袋 (单只200g-300g)',
    purchasePrice: 3.5,
    storageLocation: '常温蔬菜架 V-03',
    storageTempZone: '常温阴凉通风',
    shelfLifeDays: 20,
    standardYieldRate: 0.82,
    skewersPerKg: 16.0,
    supplier: '内蒙古乌兰察布马铃薯基地',
    supplierContact: '王经理',
    supplierPhone: '13766554433',
    supplierLeadDays: 1,
    supplierRating: 5,
    minOrderQty: 25,
    description: '切波浪厚片穿串，烤至两面金黄微焦，外酥里沙。',
    tags: ['土豆', '烤土豆片', '热销时蔬']
  },
  {
    templateId: 'tpl-mat-sweet-corn',
    templateCode: 'TPL-RM-029',
    name: '有机甜糯玉米段 (双穗锁鲜净切)',
    category: '蔬菜品类',
    subCategory: '鲜甜玉米',
    safetyStock: 15.0,
    reorderSuggestion: 30.0,
    unit: 'kg',
    spec: '10kg/箱 (每段约5cm长真空包)',
    purchasePrice: 9.8,
    storageLocation: '冷库 V-04 (0-4℃)',
    storageTempZone: '冷藏 0-4℃',
    shelfLifeDays: 14,
    standardYieldRate: 0.95,
    skewersPerKg: 10.0,
    supplier: '吉林农科院甜玉米直供',
    supplierContact: '赵科长',
    supplierPhone: '13877665544',
    supplierLeadDays: 1,
    supplierRating: 5,
    minOrderQty: 10,
    description: '非转基因水果甜玉米，炭火烘烤粒粒爆汁甜润。',
    tags: ['甜玉米', '烤玉米', '素食热选']
  },

  // ------------------------------------------------------------
  // 11. 调料调味与秘制酱汁 (Seasonings & Sauces)
  // ------------------------------------------------------------
  {
    templateId: 'tpl-mat-bbq-sauce',
    templateCode: 'TPL-RM-030',
    name: '秘制黑曜石炭烤刷酱 (复合草果老汤酱)',
    category: '调料调味',
    subCategory: '秘制调味',
    safetyStock: 15.0,
    reorderSuggestion: 30.0,
    unit: 'kg',
    spec: '5kg/桶 (食品级阻氧密封)',
    purchasePrice: 32.0,
    storageLocation: '干调货架 T-01',
    storageTempZone: '阴凉避光常温',
    shelfLifeDays: 90,
    standardYieldRate: 1.0,
    supplier: '黑曜石中央厨房研发基地',
    supplierContact: '陈总厨',
    supplierPhone: '13399881122',
    supplierLeadDays: 1,
    supplierRating: 5,
    minOrderQty: 10,
    description: '核心商业秘方，十余味香辛料低温慢熬，增鲜提色附着力强。',
    tags: ['秘制酱', '烧烤刷酱', '核心原料']
  },
  {
    templateId: 'tpl-mat-cumin-powder',
    templateCode: 'TPL-RM-031',
    name: '特制孜然椒盐黄金配方粉 (新疆托克逊现磨)',
    category: '调料调味',
    subCategory: '干撒料粉',
    safetyStock: 8.0,
    reorderSuggestion: 15.0,
    unit: 'kg',
    spec: '2kg/袋 (铝箔防潮自封)',
    purchasePrice: 45.0,
    storageLocation: '干调货架 T-02',
    storageTempZone: '常温避光干燥',
    shelfLifeDays: 180,
    standardYieldRate: 1.0,
    supplier: '新疆托克逊香料合作社',
    supplierContact: '阿不都',
    supplierPhone: '13111223344',
    supplierLeadDays: 3,
    supplierRating: 5,
    minOrderQty: 6,
    description: '小茴香与孜然黄金配比，颗粒适中，出炉前撒落激发油香。',
    tags: ['孜然', '椒盐', '撒料']
  },
  {
    templateId: 'tpl-mat-chili-powder',
    templateCode: 'TPL-RM-032',
    name: '四川二荆条特级香辣撒粉 (慢火焙香)',
    category: '调料调味',
    subCategory: '干撒料粉',
    safetyStock: 8.0,
    reorderSuggestion: 15.0,
    unit: 'kg',
    spec: '2kg/袋 (铝箔防潮自封)',
    purchasePrice: 38.0,
    storageLocation: '干调货架 T-03',
    storageTempZone: '常温避光干燥',
    shelfLifeDays: 180,
    standardYieldRate: 1.0,
    supplier: '四川省农科院调味试验厂',
    supplierContact: '何厂长',
    supplierPhone: '13344556677',
    supplierLeadDays: 2,
    supplierRating: 5,
    minOrderQty: 6,
    description: '精选四川二荆条与石柱红，香而不燥辣度温和，色泽红亮。',
    tags: ['辣椒粉', '香辣', '干碟']
  },
  {
    templateId: 'tpl-mat-teriyaki-sauce',
    templateCode: 'TPL-RM-033',
    name: '秘制日式烧鸟照烧汁 (清酒味醂慢煨浓缩)',
    category: '调料调味',
    subCategory: '日式蘸刷汁',
    safetyStock: 10.0,
    reorderSuggestion: 20.0,
    unit: 'kg',
    spec: '5kg/桶 (浓缩原浆)',
    purchasePrice: 36.0,
    storageLocation: '冷库 T-04 (0-4℃)',
    storageTempZone: '冷藏 0-4℃',
    shelfLifeDays: 60,
    standardYieldRate: 1.0,
    supplier: '味之素调味直供供应链',
    supplierContact: '高桥代表',
    supplierPhone: '13800112233',
    supplierLeadDays: 2,
    supplierRating: 5,
    minOrderQty: 10,
    description: '鸡骨烤香后与味醂、浓口酱油文火收汁，鲜甜挂壁，烧鸟专用。',
    tags: ['照烧汁', '烧鸟', '日料调味']
  },

  // ------------------------------------------------------------
  // 12. 更多包材与耗材 (Expanded Packaging)
  // ------------------------------------------------------------
  {
    templateId: 'tpl-mat-bamboo-skewer',
    templateCode: 'TPL-RM-034',
    name: '加厚环保原木烧烤竹签 (35cm 高韧防碳化)',
    category: '消耗包材',
    subCategory: '餐车串签',
    safetyStock: 3000.0,
    reorderSuggestion: 10000.0,
    unit: '支',
    spec: '1000支/包 (全竹磨光无毛刺)',
    purchasePrice: 0.04,
    storageLocation: '干货仓包材架 E-02',
    storageTempZone: '常温通风干燥',
    shelfLifeDays: 720,
    standardYieldRate: 1.0,
    supplier: '福建武夷竹业加工总厂',
    supplierContact: '林总',
    supplierPhone: '13955667788',
    supplierLeadDays: 3,
    supplierRating: 5,
    minOrderQty: 5000,
    description: '经过水煮脱脂与高温碳化工艺，烘烤不易折断无异味。',
    tags: ['竹签', '烧烤签', '必备耗材']
  },
  {
    templateId: 'tpl-mat-foil-box',
    templateCode: 'TPL-RM-035',
    name: '食品级铝箔耐高温锁温打包盒 (含透明防雾扣盖)',
    category: '消耗包材',
    subCategory: '外卖包装',
    safetyStock: 200.0,
    reorderSuggestion: 500.0,
    unit: '套',
    spec: '250套/箱 (加厚食品级铝箔耐火保温)',
    purchasePrice: 0.85,
    storageLocation: '干货仓包材架 E-03',
    storageTempZone: '常温干燥',
    shelfLifeDays: 720,
    standardYieldRate: 1.0,
    supplier: '恒美环保包装制品',
    supplierContact: '周厂长',
    supplierPhone: '13798761122',
    supplierLeadDays: 2,
    supplierRating: 5,
    minOrderQty: 250,
    description: '直接可上炭火或微波加热，极强锁温保温，外卖到家依然烫口。',
    tags: ['铝箔盒', '外卖餐盒', '保温包装']
  }
];

/**
 * 根据筛选条件检索原料模板
 */
export function getMaterialTemplates(
  category: string = '全部',
  searchQuery: string = ''
): MaterialTemplate[] {
  return STANDARD_MATERIAL_TEMPLATES.filter((tpl) => {
    const matchCategory = category === '全部' || tpl.category === category;
    if (!matchCategory) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      tpl.name.toLowerCase().includes(q) ||
      tpl.templateCode.toLowerCase().includes(q) ||
      tpl.description.toLowerCase().includes(q) ||
      tpl.tags.some((tag) => tag.toLowerCase().includes(q)) ||
      tpl.supplier.toLowerCase().includes(q)
    );
  });
}

/**
 * 将模板实例化为可入库的原料档案 (MaterialItem)
 * 关键规则：遵循用户要求，实际在库库存 (currentStock) 初始化为 0！
 * 状态设置为 'warning' (因为 0 必定低于安全库存)，需商家手动上架入库。
 */
export function instantiateMaterialFromTemplate(
  tpl: MaterialTemplate,
  customSku?: string
): MaterialItem {
  const generatedId = `mat-${tpl.templateId.replace('tpl-mat-', '')}-${Date.now().toString(36)}`;
  const finalSku = customSku || `SKU-RM-${Math.floor(100 + Math.random() * 900)}`;

  return {
    id: generatedId,
    sku: finalSku,
    name: tpl.name,
    category: tpl.category,
    currentStock: 0, // 遵从要求：初始在库为0
    safetyStock: tpl.safetyStock,
    reorderSuggestion: tpl.reorderSuggestion,
    unit: tpl.unit,
    purchasePrice: tpl.purchasePrice,
    storageLocation: tpl.storageLocation,
    supplier: tpl.supplier,
    supplierSuggest: true,
    supplierContact: tpl.supplierContact,
    supplierPhone: tpl.supplierPhone,
    supplierLeadDays: tpl.supplierLeadDays,
    supplierRating: tpl.supplierRating,
    purchaseCount: 0,
    lastPurchased: '未采购入库',
    status: 'warning', // 在库为0触发待入库预警
    stockStatus: 'out_of_stock',
    isInStock: false,
    standardYieldRate: tpl.standardYieldRate,
    shelfLifeDays: tpl.shelfLifeDays,
    storageTempZone: tpl.storageTempZone,
    minOrderQty: tpl.minOrderQty,
    spec: tpl.spec,
    remark: tpl.description,
    updatedAt: new Date().toISOString()
  };
}

/**
 * 导出全量原料模板库为 JSON 格式文件文本
 */
export function exportMaterialTemplatesJson(
  templates: MaterialTemplate[] = STANDARD_MATERIAL_TEMPLATES
): string {
  return JSON.stringify(
    {
      version: '1.2.0',
      exportTime: new Date().toISOString(),
      platform: 'Urban Radar Food Truck Supply Chain System',
      description: '流动餐车站位供应链 - 原料档案与安全库存标准模板库',
      templateCount: templates.length,
      templates
    },
    null,
    2
  );
}

/**
 * 从 JSON 文本解析并校验原料模板
 */
export function parseMaterialTemplatesJson(jsonStr: string): {
  success: boolean;
  templates?: MaterialTemplate[];
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonStr);
    const list: any[] = Array.isArray(parsed) ? parsed : parsed.templates;
    if (!Array.isArray(list) || list.length === 0) {
      return { success: false, error: 'JSON 文件中未找到有效的原料模板数组' };
    }

    // 校验必要字段
    const validTemplates: MaterialTemplate[] = [];
    for (const item of list) {
      if (item.name && item.category && typeof item.safetyStock === 'number') {
        validTemplates.push({
          templateId: item.templateId || `tpl-custom-${Math.random().toString(36).slice(2, 8)}`,
          templateCode: item.templateCode || `TPL-${Math.floor(100 + Math.random() * 900)}`,
          name: String(item.name),
          category: item.category,
          subCategory: item.subCategory || '',
          safetyStock: Number(item.safetyStock) || 10,
          reorderSuggestion: Number(item.reorderSuggestion) || 20,
          unit: item.unit || 'kg',
          spec: item.spec || '标准包装',
          purchasePrice: Number(item.purchasePrice) || 0,
          storageLocation: item.storageLocation || '冷库 A-01',
          storageTempZone: item.storageTempZone || '冷藏 0-4℃',
          shelfLifeDays: Number(item.shelfLifeDays) || 7,
          standardYieldRate: Number(item.standardYieldRate) || 0.8,
          skewersPerKg: item.skewersPerKg ? Number(item.skewersPerKg) : undefined,
          supplier: item.supplier || '自营冷链直供',
          supplierContact: item.supplierContact || '',
          supplierPhone: item.supplierPhone || '',
          supplierLeadDays: Number(item.supplierLeadDays) || 1,
          supplierRating: Number(item.supplierRating) || 5,
          minOrderQty: Number(item.minOrderQty) || 5,
          description: item.description || '',
          tags: Array.isArray(item.tags) ? item.tags : []
        });
      }
    }

    if (validTemplates.length === 0) {
      return { success: false, error: '未能从文件中解析出符合字段规范的原料模板' };
    }

    return { success: true, templates: validTemplates };
  } catch (err: any) {
    return { success: false, error: `JSON 语法解析失败: ${err.message || '格式错误'}` };
  }
}
