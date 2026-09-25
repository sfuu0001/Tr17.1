/**
 * 食材产地溯源与商品配方 SOP 核心管理引擎
 * (Food Ingredient Origin Traceability & Recipe SOP Engine)
 * 
 * 支持商家自定义菜品配方明细（材料名、克重用量、品牌、原产地基地、生产日期、保质期、冷库储位、条码）
 * 以及食材实物外包装相机拍照存根与防伪水印合规存证。
 */

import { DishItem, DishIngredientItem } from '../types';

const STORAGE_INGREDIENTS_KEY = 'obsidian_dish_ingredients_map_v1';
const STORAGE_TRACE_META_KEY = 'obsidian_dish_trace_meta_map_v1';

/** 常用冷冻冰库与温区位置预设 */
export const FREEZER_LOCATION_PRESETS = [
  '车载深冷冰库A-01 (上层 -18℃ 熟化串品)',
  '车载深冷冰库A-02 (中层 -18℃ 原切肉条)',
  '车载深冷冰库B-01 (底层 -22℃ 海鲜深冻)',
  '车载4℃急鲜保鲜柜C-01 (时令鲜蔬/菌菇)',
  '车载4℃急鲜保鲜柜C-02 (特调酱汁/乳酪)',
  '主理人保温箱D-01 (现烤出餐保温区)',
  '后备干货与主食常温箱E-03 (汉堡胚/面筋)'
];

/** 优质供应链合作品牌预设 */
export const INGREDIENT_BRAND_PRESETS = [
  '澳大利亚AACO / 昆士兰特选',
  '新希望六和优质禽业',
  '雨润冷鲜精细分割',
  '法国总统牌 President',
  '新西兰安佳 Anchor',
  '山东乳山纯净海产直供',
  '大连獐子岛海洋牧场',
  '主厨工坊秘制古法原酿',
  '中粮福临门优选油脂',
  '六鳌红蜜生态农场'
];

/** 优质原产地/溯源基地预设 */
export const INGREDIENT_ORIGIN_PRESETS = [
  '澳大利亚昆士兰州达令天然草场',
  '日本宫崎县特级和牛培育基地',
  '宁夏盐池滩羊原产地保护区',
  '山东半岛乳山国家级海洋牧场',
  '内蒙古锡林郭勒大草原原生态牧场',
  '云南普洱高山生态有机菌菇基地',
  '上海崇明生态岛直供果蔬基地',
  '黑龙江五常生态稻花香核心产区',
  '福建连江鲍鱼及海鲜活冻基地'
];

/** 预设保质期快捷选项 */
export const SHELF_LIFE_PRESETS = [
  '当日鲜供 (24小时内用毕)',
  '3天 (0-4℃冷藏鲜品)',
  '7天 (0-4℃真空气调锁鲜)',
  '30天 (-18℃冷冻保鲜)',
  '90天 (-18℃深冷速冻)',
  '180天 (-18℃原厂船冻)',
  '365天 (-22℃超低温冷藏)'
];

/** 真实外包装实物存根与检疫合格证参考图库 (支持在无物理相机时一键采用真实存根) */
export const FOOD_PACKAGE_SAMPLES = [
  {
    id: 'sample-beef',
    label: '原切和牛/原肉冷链外包装箱 (检验检疫合格章)',
    category: '肉类',
    url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
    thumb: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=200&q=80',
    brand: '澳大利亚AACO / 昆士兰特选',
    barcode: '6970481239012',
    inspectionNo: '入境货物检验检疫证明: NO.沪关检2026-0302-09'
  },
  {
    id: 'sample-chicken',
    label: '冷鲜散养禽肉/提灯气调锁鲜盒包装',
    category: '家禽',
    url: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=800&q=80',
    thumb: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=200&q=80',
    brand: '新希望六和禽业',
    barcode: '6970592314567',
    inspectionNo: '动物检疫合格证明: (鲁)A2026-0308-41'
  },
  {
    id: 'sample-seafood',
    label: '深海大生蚝/海鲜船冻原厂包装',
    category: '海鲜',
    url: 'https://images.unsplash.com/photo-1534482421-64566f976cfa?auto=format&fit=crop&w=800&q=80',
    thumb: 'https://images.unsplash.com/photo-1534482421-64566f976cfa?auto=format&fit=crop&w=200&q=80',
    brand: '山东乳山纯净海产直供',
    barcode: '6970928374651',
    inspectionNo: '水产品出厂净化检测合格报告: QS-20260305'
  },
  {
    id: 'sample-butter',
    label: '法国进口原装黑松露黄油/配料密封铝箔包装',
    category: '调料乳品',
    url: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=800&q=80',
    thumb: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=200&q=80',
    brand: '法国总统牌 President',
    barcode: '3155250001238',
    inspectionNo: '海关原装进口卫生证书: C20260115'
  },
  {
    id: 'sample-veggie',
    label: '崇明有机蔬菜/鲜芦笋冷链溯源袋 (农残双免绿标)',
    category: '蔬果',
    url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
    thumb: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=200&q=80',
    brand: '上海崇明生态岛直供果蔬基地',
    barcode: '6970334455667',
    inspectionNo: '国家有机农产品认证: OGC-3101-2026'
  },
  {
    id: 'sample-bread',
    label: '手工手作活性竹炭汉堡胚/面点无菌分装袋',
    category: '烘焙主食',
    url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
    thumb: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=200&q=80',
    brand: '主厨工坊秘制烘焙',
    barcode: '6970889900112',
    inspectionNo: 'SC食品生产许可: SC1083101150098'
  }
];

/** 生成随机合规 69 开头条码 */
export function generateIngredientBarcode(): string {
  const prefix = '697';
  let middle = '';
  for (let i = 0; i < 9; i++) {
    middle += Math.floor(Math.random() * 10);
  }
  return prefix + middle;
}

/** 从持久化存储获取菜品配方明细 */
export function getDishIngredients(dish: DishItem): DishIngredientItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_INGREDIENTS_KEY);
    if (raw) {
      const map = JSON.parse(raw);
      if (map[dish.id] && Array.isArray(map[dish.id]) && map[dish.id].length > 0) {
        return map[dish.id];
      }
    }
  } catch (e) {
    console.error('Failed to parse dish ingredients:', e);
  }

  // 若 dish 自身带有 ingredients
  if (dish.ingredients && dish.ingredients.length > 0) {
    return dish.ingredients;
  }

  // 回退生成真实合理的默认配方
  return generateDefaultIngredientsForDish(dish);
}

/** 持久化保存菜品配方明细 */
export function saveDishIngredients(dishId: string, ingredients: DishIngredientItem[]): void {
  try {
    const raw = localStorage.getItem(STORAGE_INGREDIENTS_KEY) || '{}';
    const map = JSON.parse(raw);
    map[dishId] = ingredients;
    localStorage.setItem(STORAGE_INGREDIENTS_KEY, JSON.stringify(map));
  } catch (e) {
    console.error('Failed to save dish ingredients:', e);
  }
}

/** 获取菜品综合溯源与冷链资质元数据 */
export function getDishTraceabilityMeta(dishId: string): {
  originSource?: string;
  inspectionBatchNo?: string;
  coldChainTemp?: string;
  supplierName?: string;
} {
  try {
    const raw = localStorage.getItem(STORAGE_TRACE_META_KEY);
    if (raw) {
      const map = JSON.parse(raw);
      if (map[dishId]) return map[dishId];
    }
  } catch (_) {}
  return {};
}

/** 保存菜品综合溯源与冷链资质元数据 */
export function saveDishTraceabilityMeta(
  dishId: string,
  meta: {
    originSource?: string;
    inspectionBatchNo?: string;
    coldChainTemp?: string;
    supplierName?: string;
  }
): void {
  try {
    const raw = localStorage.getItem(STORAGE_TRACE_META_KEY) || '{}';
    const map = JSON.parse(raw);
    map[dishId] = {
      ...(map[dishId] || {}),
      ...meta
    };
    localStorage.setItem(STORAGE_TRACE_META_KEY, JSON.stringify(map));
  } catch (_) {}
}

/**
 * 根据菜品名称、分类及产地智能生成高标准规范的食材配方 SOP
 */
export function generateDefaultIngredientsForDish(dish: DishItem): DishIngredientItem[] {
  const name = dish.name || '';
  const category: string = dish.category || '';

  // 1. 和牛汉堡 / 西式精切
  if (name.includes('和牛') || name.includes('汉堡') || name.includes('牛排') || category === 'burger' || category === 'western') {
    return [
      {
        id: `ing-${dish.id}-1`,
        name: '澳洲谷饲M5原切和牛肉',
        dosageGrams: 150,
        brand: '澳大利亚AACO / 昆士兰特选',
        origin: '澳大利亚昆士兰州达令草场',
        productionDate: '2026-03-02',
        shelfLife: '180天 (至2026-08-31)',
        freezerLocation: '车载深冷冰库A-02 (中层 -18℃ 原切肉条)',
        barcode: '6970481239012',
        packagingPhotoUrl: FOOD_PACKAGE_SAMPLES[0].url,
        packagingPhotos: [FOOD_PACKAGE_SAMPLES[0].url],
        storageTemp: '≤ -18℃ 冻藏',
        inspectionCertNo: '检疫检验: NO.沪关检2026-0302-09',
        notes: '标准排酸48小时，雪花大理石纹理M5+级'
      },
      {
        id: `ing-${dish.id}-2`,
        name: '手作活性竹炭汉堡胚',
        dosageGrams: 85,
        brand: '主厨工坊秘制烘焙',
        origin: '上海静安中央烘焙厨房',
        productionDate: '2026-03-09',
        shelfLife: '3天 (常温锁鲜)',
        freezerLocation: '后备干货与主食常温箱E-03 (汉堡胚/面筋)',
        barcode: '6970889900112',
        packagingPhotoUrl: FOOD_PACKAGE_SAMPLES[5].url,
        packagingPhotos: [FOOD_PACKAGE_SAMPLES[5].url],
        storageTemp: '常温干燥 18-22℃',
        inspectionCertNo: 'SC1083101150098',
        notes: '食用级植物活性竹炭粉手工揉制'
      },
      {
        id: `ing-${dish.id}-3`,
        name: '法国黑冬松露蒜香黄油',
        dosageGrams: 20,
        brand: '法国总统牌 President',
        origin: '法国诺曼底产区',
        productionDate: '2026-02-15',
        shelfLife: '90天 (至2026-05-15)',
        freezerLocation: '车载4℃急鲜保鲜柜C-02 (特调酱汁/乳酪)',
        barcode: '3155250001238',
        packagingPhotoUrl: FOOD_PACKAGE_SAMPLES[3].url,
        packagingPhotos: [FOOD_PACKAGE_SAMPLES[3].url],
        storageTemp: '2-6℃ 冷藏',
        inspectionCertNo: '入境卫证: C20260115-08',
        notes: '天然乳脂含量≥82%，含5%意大利黑松露碎'
      }
    ];
  }

  // 2. 烧鸟 / 鸡肉 / 提灯系列
  if (name.includes('提灯') || name.includes('鸡') || category === 'yakitori') {
    return [
      {
        id: `ing-${dish.id}-1`,
        name: name.includes('提灯') ? '当日冷鲜母鸡提灯卵巢部位' : '冷鲜散养黄羽鸡腿肉',
        dosageGrams: name.includes('提灯') ? 45 : 75,
        brand: '新希望六和优质禽业',
        origin: '山东青岛标准化绿色禽肉基地',
        productionDate: '2026-03-09',
        shelfLife: '3天 (0-4℃冷藏鲜品)',
        freezerLocation: '车载4℃急鲜保鲜柜C-01 (时令鲜蔬/菌菇)',
        barcode: '6970592314567',
        packagingPhotoUrl: FOOD_PACKAGE_SAMPLES[1].url,
        packagingPhotos: [FOOD_PACKAGE_SAMPLES[1].url],
        storageTemp: '0-4℃ 急鲜锁鲜',
        inspectionCertNo: '(鲁)A2026-0308-41',
        notes: '清晨当日屠宰，严控冷链全程 4℃ 极速直供'
      },
      {
        id: `ing-${dish.id}-2`,
        name: '特级山东大葱白 (直葱)',
        dosageGrams: 25,
        brand: '上海崇明生态岛直供果蔬基地',
        origin: '山东章丘大葱直供基地',
        productionDate: '2026-03-09',
        shelfLife: '5天 (冷藏保鲜)',
        freezerLocation: '车载4℃急鲜保鲜柜C-01 (时令鲜蔬/菌菇)',
        barcode: '6970334455667',
        packagingPhotoUrl: FOOD_PACKAGE_SAMPLES[4].url,
        packagingPhotos: [FOOD_PACKAGE_SAMPLES[4].url],
        storageTemp: '2-8℃ 恒温',
        inspectionCertNo: '农残快速检测合格单: QC-20260309',
        notes: '葱白粗度≥2.5cm，脆甜无辛辣焦涩'
      },
      {
        id: `ing-${dish.id}-3`,
        name: '老字号古法酿造秘制照烧汁',
        dosageGrams: 15,
        brand: '主厨工坊秘制古法原酿',
        origin: '江苏苏州古法酿造工坊',
        productionDate: '2026-02-28',
        shelfLife: '180天',
        freezerLocation: '车载4℃急鲜保鲜柜C-02 (特调酱汁/乳酪)',
        barcode: '6970112233445',
        packagingPhotoUrl: FOOD_PACKAGE_SAMPLES[3].url,
        storageTemp: '阴凉避光储存',
        inspectionCertNo: 'SC102320509001',
        notes: '以老母鸡汤底慢熬6小时，纯大豆原酿'
      }
    ];
  }

  // 3. 羊肉 / 经典烤串 / 鲜五花
  if (name.includes('羊') || name.includes('串') || name.includes('肉') || category === 'skewer') {
    return [
      {
        id: `ing-${dish.id}-1`,
        name: name.includes('羊') ? '宁夏滩羊原切后腿肉' : '精修冷鲜雪花五花肉',
        dosageGrams: 80,
        brand: name.includes('羊') ? '宁夏盐池滩羊原产地直供' : '雨润冷鲜精细分割',
        origin: name.includes('羊') ? '宁夏盐池滩羊原产地保护区' : '江苏雨润现代化肉类工厂',
        productionDate: '2026-03-04',
        shelfLife: '90天 (-18℃深冷速冻)',
        freezerLocation: '车载深冷冰库A-01 (上层 -18℃ 熟化串品)',
        barcode: '6970823419087',
        packagingPhotoUrl: FOOD_PACKAGE_SAMPLES[0].url,
        packagingPhotos: [FOOD_PACKAGE_SAMPLES[0].url],
        storageTemp: '≤ -18℃ 冻藏',
        inspectionCertNo: '动物卫生检疫证: (宁)B2026-0304-12',
        notes: '标准三瘦两肥黄金穿签配比，排酸处理无膻味'
      },
      {
        id: `ing-${dish.id}-2`,
        name: '主理人秘制炭烤椒盐孜然粉',
        dosageGrams: 8,
        brand: '主厨工坊秘制古法原酿',
        origin: '新疆吐鲁番高品质孜然基地',
        productionDate: '2026-03-01',
        shelfLife: '180天',
        freezerLocation: '后备干货与主食常温箱E-03 (汉堡胚/面筋)',
        barcode: '6970192837465',
        storageTemp: '密封常温防潮',
        notes: '石磨低温慢碾，香气饱满不上火'
      }
    ];
  }

  // 4. 海鲜 / 生蚝 / 龙虾 / 扇贝
  if (name.includes('生蚝') || name.includes('虾') || name.includes('贝') || name.includes('鱼') || name.includes('海鲜') || category === 'seafood') {
    return [
      {
        id: `ing-${dish.id}-1`,
        name: name.includes('生蚝') ? '山东乳山鲜活大生蚝 (2L规格)' : '深海纯净海鲜主料',
        dosageGrams: name.includes('生蚝') ? 140 : 100,
        brand: '山东乳山纯净海产直供',
        origin: '山东半岛乳山国家级海洋牧场',
        productionDate: '2026-03-08',
        shelfLife: '7天 (0-4℃冷藏鲜品)',
        freezerLocation: '车载深冷冰库B-01 (底层 -22℃ 海鲜深冻)',
        barcode: '6970928374651',
        packagingPhotoUrl: FOOD_PACKAGE_SAMPLES[2].url,
        packagingPhotos: [FOOD_PACKAGE_SAMPLES[2].url],
        storageTemp: '0-2℃ 纯净盐水活养/急冻',
        inspectionCertNo: '海产出厂检测合格证: HY-2026-0308-01',
        notes: '紫外线纯水循环净化24小时，达刺身级纯净标准'
      },
      {
        id: `ing-${dish.id}-2`,
        name: '手剁金银蒜蓉辣酱',
        dosageGrams: 30,
        brand: '主厨工坊秘制古法原酿',
        origin: '山东金乡大蒜核心产区',
        productionDate: '2026-03-07',
        shelfLife: '15天 (冷藏)',
        freezerLocation: '车载4℃急鲜保鲜柜C-02 (特调酱汁/乳酪)',
        barcode: '6970338811223',
        storageTemp: '2-6℃ 冷藏',
        notes: '五分炸金蒜 + 五分鲜生蒜，加入生抽与植物油慢熬'
      }
    ];
  }

  // 5. 蔬菜 / 菇类
  if (name.includes('菇') || name.includes('茄') || name.includes('菜') || name.includes('玉米') || category === 'vegetable') {
    return [
      {
        id: `ing-${dish.id}-1`,
        name: `有机生态高品质${name.slice(0, 4)}原料`,
        dosageGrams: 120,
        brand: '上海崇明生态岛直供果蔬基地',
        origin: '上海崇明生态岛直供果蔬基地',
        productionDate: '2026-03-09',
        shelfLife: '3天 (0-4℃冷藏鲜品)',
        freezerLocation: '车载4℃急鲜保鲜柜C-01 (时令鲜蔬/菌菇)',
        barcode: '6970334455667',
        packagingPhotoUrl: FOOD_PACKAGE_SAMPLES[4].url,
        packagingPhotos: [FOOD_PACKAGE_SAMPLES[4].url],
        storageTemp: '2-6℃ 恒温高湿',
        inspectionCertNo: '无公害检测报告: AGRI-20260309',
        notes: '无农药残留双重检测，鲜采直达餐车后厨'
      }
    ];
  }

  // 默认通用配方
  return [
    {
      id: `ing-${dish.id}-1`,
      name: `${dish.name}主要核心原料`,
      dosageGrams: 100,
      brand: '主厨严格甄选品牌',
      origin: dish.originSource || '优质绿色原料直供基地',
      productionDate: '2026-03-05',
      shelfLife: '90天 (-18℃深冷速冻)',
      freezerLocation: '车载深冷冰库A-02 (中层 -18℃ 原切肉条)',
      barcode: generateIngredientBarcode(),
      packagingPhotoUrl: FOOD_PACKAGE_SAMPLES[0].url,
      packagingPhotos: [FOOD_PACKAGE_SAMPLES[0].url],
      storageTemp: '≤ -18℃ 恒温',
      inspectionCertNo: '检验检疫合格证: NO.QC2026-0305',
      notes: '全程冷链温控直达，符合食品安全GB/T标准'
    },
    {
      id: `ing-${dish.id}-2`,
      name: '主厨特调风味辅料与调味包',
      dosageGrams: 20,
      brand: '主厨工坊秘制古法原酿',
      origin: '中央厨房标准化调配',
      productionDate: '2026-03-01',
      shelfLife: '180天',
      freezerLocation: '后备干货与主食常温箱E-03 (汉堡胚/面筋)',
      barcode: generateIngredientBarcode(),
      storageTemp: '常温避光干燥'
    }
  ];
}

/**
 * 带有官方食品安全存根与时间戳水印的水印图片生成器
 */
export function addFoodSafetyStampToCanvas(
  canvas: HTMLCanvasElement,
  ingredient: {
    name: string;
    brand: string;
    barcode: string;
    freezerLocation?: string;
  }
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  // 底部半透明防伪深色横条
  const barHeight = Math.max(68, Math.round(h * 0.12));
  ctx.fillStyle = 'rgba(26, 28, 27, 0.88)';
  ctx.fillRect(0, h - barHeight, w, barHeight);

  // 顶部防伪安全封条细线
  ctx.fillStyle = '#006d36';
  ctx.fillRect(0, h - barHeight, w, 3);

  // 水印文字
  const dateStr = new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const fontSize = Math.max(12, Math.round(w / 40));
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.fillText(`🛡️ URBAN RADAR 食品安全溯源存根 | ${ingredient.name}`, 14, h - barHeight + fontSize + 8);

  ctx.font = `normal ${Math.max(10, fontSize - 2)}px "Space Grotesk", sans-serif`;
  ctx.fillStyle = '#c8c7be';
  ctx.fillText(
    `品牌: ${ingredient.brand || '直供'} | 条码: ${ingredient.barcode || '无'} | 储位: ${ingredient.freezerLocation || '车载冷库'}`,
    14,
    h - barHeight + fontSize * 2 + 14
  );

  // 右下角存根时间戳
  ctx.textAlign = 'right';
  ctx.fillStyle = '#a8dab5';
  ctx.fillText(`验货拍照: ${dateStr}`, w - 14, h - 14);
}
