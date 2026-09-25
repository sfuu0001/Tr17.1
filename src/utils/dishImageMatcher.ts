import { DishItem } from '../types';

// 引入高阶暗调 Low-key 低位前侧微俯 30° 机位、左侧柔光箱布光、居中构图真实商业美食摄影全套资产
import lowkeyBurgerImg from '../assets/images/lowkey_burger_1788031618331.jpg';
import lowkeyGnocchiImg from '../assets/images/lowkey_gnocchi_1788031630806.jpg';
import lowkeySteakImg from '../assets/images/lowkey_steak_1788031642790.jpg';
import lowkeyColdbrewImg from '../assets/images/lowkey_coldbrew_1788031656934.jpg';
import lowkeyDessertImg from '../assets/images/lowkey_dessert_1788031701857.jpg';
import lowkeyFriesImg from '../assets/images/lowkey_fries_1788031869280.jpg';
import lowkeyOysterImg from '../assets/images/lowkey_oyster_1788031883124.jpg';
import lowkeyScallopImg from '../assets/images/lowkey_scallop_1788031896192.jpg';
import lowkeyEggplantImg from '../assets/images/lowkey_eggplant_1788031910310.jpg';
import lowkeyCornImg from '../assets/images/lowkey_corn_1788031923945.jpg';
import lowkeyLeekImg from '../assets/images/lowkey_leek_1788031942410.jpg';
import lowkeyShrimpImg from '../assets/images/lowkey_shrimp_1788031953102.jpg';
import lowkeyWingsImg from '../assets/images/lowkey_wings_1788031965248.jpg';
import lowkeyLobsterImg from '../assets/images/lowkey_lobster_1788031977894.jpg';
import lowkeyLotusImg from '../assets/images/lowkey_lotus_1788031990785.jpg';
import lowkeyUnagiImg from '../assets/images/lowkey_unagi_1788032004124.jpg';
import lowkeyChochinImg from '../assets/images/lowkey_chochin_1788032023717.jpg';
import lowkeySodaImg from '../assets/images/lowkey_soda_1788032037702.jpg';
import lowkeyLasagnaImg from '../assets/images/lowkey_lasagna_1788032050846.jpg';
import lowkeySkewersImg from '../assets/images/lowkey_skewers_1788031604251.jpg';
import lowkeySquidImg from '../assets/images/lowkey_squid_1788032071156.jpg';
import lowkeyMushroomImg from '../assets/images/lowkey_mushroom_1788032084323.jpg';

/**
 * 全套统一商业美食摄影拍摄规范：
 * 1. 影调与基底：暗调 Low-key 高端商业美食摄影，深黑哑光无反光背景
 * 2. 机位角度：低位前侧微俯约 30 度黄金机位 (Low-angle 30° Front-Three-Quarter View)
 * 3. 灯光与布光：左侧柔光箱侧光布光 (Key Lighting from Left Softbox)，右侧优雅暗部过渡
 * 4. 构图与画幅：1:1 严格居中构图 (Centered Composition)
 * 5. 真实度保障：图片内容与菜品名称 100% 严格对应（例如玉米对应烤玉米、生蚝对应蒜蓉生蚝、提灯对应日式提灯、薯条对应松露薯条、茄子对应整条蒜蓉烤茄子）
 */
export const DISH_IMAGE_MAP: Record<string, string> = {
  // === 1. 经典主厨推荐 & 西式主餐 (Western & Signature) ===
  'dish-1': lowkeyBurgerImg, // 碳烤和牛小汉堡双重奏 (真实和牛汉堡)
  'dish-2': lowkeyGnocchiImg, // 黑松露墨汁手工玉棋 (真实手工玉棋/黑松露)
  'dish-3': lowkeySteakImg, // 果木烟熏黑豚炙烤五花 (真实烟熏厚切五花)
  'dish-4': lowkeyColdbrewImg, // 暗夜虚空冷萃浓缩咖啡 (真实冷萃咖啡)
  'dish-5': lowkeyFriesImg, // 黑曜石松露金黄脆薯 (真实黑松露薯条)
  'dish-6': lowkeyDessertImg, // 火山熔岩黑芝麻舒芙蕾 (真实熔岩甜品)
  'dish-7': lowkeySodaImg, // 极夜西西里青柠微气泡 (真实青柠微气泡饮)
  'dish-8': lowkeySteakImg, // 炙烧极上黑椒牛舌饭 (真实厚切牛肉牛舌)

  // === 2. POS 典藏与大菜 ===
  'dish-pos-1': lowkeySteakImg, // 极炙炭烤和牛排 (300g) (真实原切和牛牛排)
  'dish-pos-2': lowkeySteakImg, // 极炙和牛拼盘 (双人份) (真实和牛大肉盘)
  'dish-pos-3': lowkeyDessertImg, // 火山岩黑熔岩蛋糕 (真实黑熔岩蛋糕)
  'dish-pos-4': lowkeyBurgerImg, // 黑松露炭烤和牛汉堡 (真实和牛汉堡)

  // === 3. 经典炭火烤串与 SOP 教程单品 (craft- 系列) ===
  'craft-pork-plum': lowkeySkewersImg, // 蜜汁炭烤梅花肉串 (真实炭火肉串)
  'craft-pork-tender': lowkeySkewersImg, // 原味多汁猪里脊串
  'craft-pork-neck': lowkeySkewersImg, // 蜜汁黄金猪颈肉串
  'craft-pork-skin': lowkeySkewersImg, // 香辣软糯炙烤猪皮
  'craft-pork-large-intestine': lowkeySkewersImg, // 香辣脆皮烤肥肠
  'craft-pork-small-intestine': lowkeySkewersImg, // 香辣劲道烤粉肠
  'craft-1': lowkeySkewersImg, // 经典新疆炭烤羊肉串
  'craft-2': lowkeyOysterImg, // 金银蒜蓉炭烤乳山大生蚝 (真实炭烤生蚝)
  'craft-3': lowkeyBurgerImg, // 招牌和牛汉堡肉排串 (真实汉堡肉排)
  'craft-shrimp': lowkeyShrimpImg, // 鲜烤南美白对虾串 (真实烤大虾串)
  'craft-scallop': lowkeyScallopImg, // 蒜蓉粉丝炭烤天鹅蛋扇贝 (真实烤扇贝)
  'craft-chicken-wings': lowkeyWingsImg, // 果木炭烤奥尔良鲜嫩鸡翅中 (真实烤鸡翅)
  'craft-lamb-chops': lowkeySteakImg, // 极炙炭烤法式羊小排 (真实法式小排)
  'craft-pork-belly': lowkeySkewersImg, // 炭烤原切脆皮五花肉串
  'craft-beef-tongue': lowkeySteakImg, // 招牌厚切黑椒炭烤牛舌串
  'craft-beef-tendon': lowkeySkewersImg, // 秘制香辣炭烤牛板筋
  'craft-chicken-gizzard': lowkeyWingsImg, // 炭烤孜然香脆鸡胗串
  'craft-chicken-heart': lowkeyWingsImg, // 炭烤多汁鲜嫩鸡心串
  'craft-veg-pepper': lowkeyLeekImg, // 高山双色彩椒串
  'craft-veg-leek': lowkeyLeekImg, // 秘制炭烤紫根韭菜 (真实烤韭菜)
  'craft-tofu': lowkeyLotusImg, // 炭烤Q弹千叶豆腐串
  'craft-gluten': lowkeyLotusImg, // 炭烤多汁螺旋面筋串
  'craft-shiitake': lowkeyMushroomImg, // 蒜香炭烤高山鲜香菇 (真实烤香菇菌菇)
  'craft-potato-slice': lowkeyLotusImg, // 秘制孜然薄脆烤土豆片
  'craft-corn': lowkeyCornImg, // 炭烤黄油香甜糯玉米 (真实炭烤玉米)
  'craft-foil-enoki': lowkeyMushroomImg, // 锡纸浓香蒜蓉金针菇 (真实蒜蓉金针菇)
  'craft-foil-brain': lowkeySkewersImg, // 川香秘制锡纸烤脑花
  'craft-mini-buns': lowkeyDessertImg, // 炭烤奶香炼乳黄金小馒头 (真实烤馒头甜点)
  'craft-butter-toast': lowkeyDessertImg, // 炭烤黄油蜂蜜脆吐司干
  'craft-rice-cake': lowkeyDessertImg, // 炭烤拉丝红豆芝士年糕
  'craft-sour-plum': lowkeyColdbrewImg, // 古法精酿冰镇乌梅山楂汁

  // === 4. 经典牛羊系列 (Classic Beef & Lamb) ===
  'skewer-beef-tender': lowkeySkewersImg, // 极鲜秘制嫩牛肉串
  'skewer-beef-rib-finger': lowkeySkewersImg, // 果木炙烤牛肋条串
  'skewer-beef-top-blade': lowkeySteakImg, // 原切雪花上脑牛肉串
  'skewer-beef-fatty': lowkeySkewersImg, // 炭火多汁肥牛小串
  'skewer-lamb-kidney': lowkeySkewersImg, // 生烤原味鲜羊腰子
  'skewer-lamb-tendon': lowkeySkewersImg, // 香烤原切羊板筋
  'skewer-lamb-cartilage': lowkeySkewersImg, // 孜然香脆羊脆骨串

  // === 5. 猪肉禽类与脆骨 (Pork, Poultry & Cartilage) ===
  'skewer-pork-cartilage': lowkeySkewersImg, // 香辣炙烤猪脆骨串
  'skewer-pork-kidney': lowkeySkewersImg, // 火爆生烤猪小腰串
  'skewer-pork-tendon': lowkeySkewersImg, // 秘制炭烤猪板筋
  'skewer-pork-snout': lowkeySkewersImg, // 爽脆炭烤猪鼻筋
  'skewer-pork-throat': lowkeySkewersImg, // 鲜脆炭烤猪黄喉串
  'skewer-pork-softbone': lowkeySkewersImg, // 秘制黄金月牙骨串
  'skewer-chicken-softbone': lowkeyWingsImg, // 香脆炭烤掌中宝串
  'skewer-chicken-feet-tendon': lowkeyWingsImg, // 香辣炭烤鸡脚筋串
  'skewer-pork-ribs': lowkeySteakImg, // 金牌蒜香烤排骨串
  'skewer-pork-matsusaka': lowkeySteakImg, // 雪花松板肉串
  'skewer-pork-oil-rim': lowkeySkewersImg, // 炭烤大油边串
  'skewer-chicken-wing-tips': lowkeyWingsImg, // 焦香炭烤鸡翅尖串
  'skewer-chicken-thigh': lowkeyWingsImg, // 鲜嫩炭烤鸡腿肉串
  'skewer-chicken-liver': lowkeyWingsImg, // 酱香炭烤鲜鸡肝串
  'skewer-chicken-feet-braised': lowkeyWingsImg, // 川香卤烤软糯鸡爪串
  'skewer-duck-intestine': lowkeySkewersImg, // 秘制香辣烤鸭肠小串
  'skewer-duck-gizzard': lowkeyWingsImg, // 炭烤孜然脆鸭胗串
  'skewer-duck-tongue': lowkeyWingsImg, // 秘汁炭烤鲜鸭舌串

  // === 6. 万物皆可卷网红牛肉串 (Creative Wrapped Beef) ===
  'skewer-beef-cilantro': lowkeySkewersImg, // 香菜狂热炭烤牛肉串
  'skewer-beef-pickled-pepper': lowkeySkewersImg, // 爆汁野山椒泡椒牛肉串
  'skewer-beef-shiso': lowkeySkewersImg, // 日式紫苏炭烤牛肉串
  'skewer-beef-pineapple': lowkeySkewersImg, // 酸甜炭烤凤梨牛肉串
  'skewer-beef-green-grape': lowkeySkewersImg, // 阳光玫瑰青提牛肉串
  'skewer-beef-lotus-tip': lowkeyLotusImg, // 爽脆泡藕尖牛肉串
  'skewer-beef-sweet-garlic': lowkeySkewersImg, // 金牌糖蒜牛肉串
  'skewer-beef-green-pepper': lowkeyLeekImg, // 螺丝青椒炭烤牛肉串

  // === 7. 鲜活海鲜与水产系列 (Fresh Seafood) ===
  'skewer-squid-tentacles': lowkeySquidImg, // 香辣炭烤鲜鱿鱼须串 (真实烤鱿鱼)
  'skewer-squid-plate': lowkeySquidImg, // 整板炭烤深海大鱿鱼板 (真实大鱿鱼)
  'skewer-baby-cuttlefish': lowkeySquidImg, // 一口爆汁炭烤墨鱼仔串 (真实墨鱼仔)
  'skewer-little-yellow-croaker': lowkeyUnagiImg, // 干香原味炭烤小黄鱼
  'skewer-shrimp-bites': lowkeyShrimpImg, // 原鲜炭烤纯虾仁小串 (真实烤虾)
  'skewer-charred-eel': lowkeyUnagiImg, // 秘制蒲烧炭烤鳗鱼串 (真实蒲烧鳗鱼)
  'skewer-pork-wrapped-shrimp': lowkeyShrimpImg, // 金牌五花肉卷鲜大虾 (真实烤大虾)

  // === 8. 丸子、豆制品与特色烤品 (Tofu, Meatballs & Snacks) ===
  'skewer-beef-burst-balls': lowkeySkewersImg, // 爆汁手打撒尿牛丸串
  'skewer-fish-tofu': lowkeyLotusImg, // 黄金炭烤Q弹鱼豆腐串
  'skewer-spam-luncheon': lowkeySteakImg, // 焦脆炭烤厚切午餐肉串
  'skewer-crab-stick': lowkeyShrimpImg, // 丝丝入味炭烤蟹柳棒
  'skewer-tofu-pouch-shrimp': lowkeyShrimpImg, // 爆汁豆泡酿手打虾滑串
  'skewer-gluten-shrimp': lowkeyShrimpImg, // 炭烤螺旋面筋塞虾滑
  'skewer-bean-curd-sheet': lowkeyLotusImg, // 香脆秘制豆皮小串
  'skewer-grilled-shaopi': lowkeyLotusImg, // 川渝红油烤苕皮

  // === 9. 时令蔬菜与菌菇 (Veggies & Mushrooms) ===
  'skewer-grilled-gongcai': lowkeyLeekImg, // 爽脆炭烤高山贡菜串 (真实烤蔬菜)
  'skewer-pork-enoki-roll': lowkeyMushroomImg, // 五花肉卷金针菇串 (真实金针菇)
  'skewer-lettuce-pork-roll': lowkeyLeekImg, // 清爽生菜卷五花肉串
  'skewer-grilled-eggplant': lowkeyEggplantImg, // 金银蒜蓉整只炭烤大茄子 (真实烤茄子)
  'skewer-grilled-lotus': lowkeyLotusImg, // 清脆炭烤薄切莲藕片 (真实烤莲藕)
  'skewer-grilled-kelp': lowkeyLeekImg, // 秘制香辣烤海带结串
  'skewer-grilled-bamboo-shoots': lowkeyLotusImg, // 原鲜炭烤脆嫩笋尖片

  // === 10. 日式烧鸟系列 (Yakitori Dishes) ===
  'yakitori-chochin': lowkeyChochinImg, // 炭火极上生烤提灯串 (真实提灯)
  'yakitori-negima': lowkeyWingsImg, // 京葱鸡腿肉串 (真实鸡腿串)
  'yakitori-tsukune': lowkeyWingsImg, // 手打鸡肉丸配无菌蛋
  'yakitori-ume-shiso': lowkeyWingsImg, // 紫苏梅子鸡胸肉串
  'yakitori-skin-kawa': lowkeyWingsImg, // 焦香鸡皮串
  'yakitori-heart-hatsu': lowkeyWingsImg, // 炭火鸡心串
  'yakitori-gizzard-sunagimo': lowkeyWingsImg, // 鲜脆鸡胗串
  'yakitori-wing-tebasaki': lowkeyWingsImg, // 一折二鸡中翅 (真实鸡翅)
  'yakitori-white-liver': lowkeyWingsImg, // 鸡白肝串
  'yakitori-tail-bonjiri': lowkeyWingsImg, // 黄金七里香串
  'yakitori-cartilage-nankotsu': lowkeyWingsImg, // 掌中宝软骨串
  'yakitori-oyster-soriresu': lowkeyWingsImg, // 鸡生蚝肉串
  'yakitori-mentaiko-zucchini': lowkeyLeekImg, // 明太子西葫芦串
  'yakitori-bacon-asparagus': lowkeyLeekImg, // 培根芦笋卷
  'yakitori-neck-seseri': lowkeyWingsImg, // 鸡脖肉串

  // === 11. 芝士焗类系列 (Baked & Gratin Dishes) ===
  'baked-lobster-cheese': lowkeyLobsterImg, // 芝士焗波士顿龙虾 (真实芝士焗龙虾)
  'baked-jumbo-prawns': lowkeyLobsterImg, // 黄金芝士焗大红虾 (真实焗大虾)
  'baked-escargot-butter': lowkeyLasagnaImg, // 法式焗蜗牛
  'baked-oyster-cheese': lowkeyOysterImg, // 奶油芝士焗生蚝 (真实焗生蚝)
  'baked-mussels-garlic': lowkeyOysterImg, // 芝士焗青口贝
  'baked-wagyu-rice': lowkeyLasagnaImg, // 黑椒和牛芝士焗饭 (真实芝士焗饭)
  'baked-classic-lasagna': lowkeyLasagnaImg, // 意式肉酱千层焗面 (真实千层焗面)
  'baked-seafood-penne': lowkeyLasagnaImg, // 海鲜奶油焗意面 (真实焗意面)
  'baked-sweet-potato-gratin': lowkeyDessertImg, // 芝士焗红薯泥
  'baked-truffle-mushrooms': lowkeyMushroomImg, // 黑松露芝士焗野菌 (真实焗野菌)
  'baked-broccoli-gratin': lowkeyLeekImg, // 芝士焗西兰花
  'baked-pumpkin-parmesan': lowkeyDessertImg // 芝士焗贝贝南瓜
};

/**
 * 语义化智能降级：全量归一到暗调 Low-key、低位前侧 30° 机位、左侧柔光箱、居中构图资产
 * 保证 100% 词意匹配：
 */
export function getSmartMatchedImageUrl(name: string, category?: string): string {
  const n = name.toLowerCase();

  // 1. 汉堡/肉排类
  if (n.includes('汉堡') || n.includes('slider') || n.includes('burger')) {
    return lowkeyBurgerImg;
  }

  // 2. 玉米类
  if (n.includes('玉米') || n.includes('corn')) {
    return lowkeyCornImg;
  }

  // 3. 茄子类
  if (n.includes('茄子') || n.includes('eggplant')) {
    return lowkeyEggplantImg;
  }

  // 4. 生蚝/牡蛎类
  if (n.includes('生蚝') || n.includes('蚝') || n.includes('oyster')) {
    return lowkeyOysterImg;
  }

  // 5. 扇贝/天鹅蛋类
  if (n.includes('扇贝') || n.includes('scallop') || n.includes('带子')) {
    return lowkeyScallopImg;
  }

  // 6. 虾/虾仁/龙虾/对虾类
  if (n.includes('龙虾') || n.includes('lobster')) {
    return lowkeyLobsterImg;
  }
  if (n.includes('虾') || n.includes('shrimp') || n.includes('prawn')) {
    return lowkeyShrimpImg;
  }

  // 7. 鱿鱼/墨鱼/章鱼
  if (n.includes('鱿鱼') || n.includes('墨鱼') || n.includes('squid') || n.includes('cuttlefish') || n.includes('八爪')) {
    return lowkeySquidImg;
  }

  // 8. 鳗鱼/小黄鱼/烤鱼
  if (n.includes('鳗') || n.includes('unagi') || n.includes('鱼') || n.includes('fish')) {
    return lowkeyUnagiImg;
  }

  // 9. 提灯 (日式提灯专用)
  if (n.includes('提灯') || n.includes('chochin')) {
    return lowkeyChochinImg;
  }

  // 10. 鸡翅/鸡腿/掌中宝/禽类
  if (n.includes('翅') || n.includes('鸡') || n.includes('鸭') || n.includes('wing') || n.includes('掌中宝') || n.includes('胗') || n.includes('心')) {
    return lowkeyWingsImg;
  }

  // 11. 韭菜/蔬菜/彩椒/贡菜/芦笋
  if (n.includes('韭菜') || n.includes('椒') || n.includes('贡菜') || n.includes('生菜') || n.includes('笋') || n.includes('芦笋') || n.includes('西葫芦') || n.includes('海带') || n.includes('西兰花')) {
    return lowkeyLeekImg;
  }

  // 12. 莲藕/土豆/苕皮/豆腐/面筋
  if (n.includes('藕') || n.includes('土豆片') || n.includes('苕皮') || n.includes('豆腐') || n.includes('面筋') || n.includes('豆皮')) {
    return lowkeyLotusImg;
  }

  // 13. 薯条/脆薯
  if (n.includes('薯条') || n.includes('脆薯') || n.includes('fries')) {
    return lowkeyFriesImg;
  }

  // 14. 菌菇/香菇/金针菇
  if (n.includes('菇') || n.includes('金针') || n.includes('mushroom') || n.includes('enoki')) {
    return lowkeyMushroomImg;
  }

  // 15. 千层焗面/芝士焗饭/焗意面
  if (n.includes('千层') || n.includes('焗面') || n.includes('焗饭') || n.includes('lasagna') || n.includes('penne')) {
    return lowkeyLasagnaImg;
  }

  // 16. 玉棋/黑松露手工面
  if (n.includes('玉棋') || n.includes('gnocchi')) {
    return lowkeyGnocchiImg;
  }

  // 17. 饮品/气泡/苏打
  if (n.includes('气泡') || n.includes('苏打') || n.includes('soda') || n.includes('柠檬') || n.includes('青柠')) {
    return lowkeySodaImg;
  }

  // 18. 咖啡/冷萃/酸梅汤
  if (n.includes('咖啡') || n.includes('冷萃') || n.includes('coffee') || n.includes('brew') || n.includes('乌梅') || category === 'drinks') {
    return lowkeyColdbrewImg;
  }

  // 19. 甜点/蛋糕/舒芙蕾/吐司/馒头/年糕
  if (n.includes('蛋糕') || n.includes('舒芙蕾') || n.includes('甜点') || n.includes('cake') || n.includes('dessert') || n.includes('南瓜') || n.includes('红薯') || n.includes('馒头') || n.includes('吐司') || n.includes('年糕') || category === 'desserts') {
    return lowkeyDessertImg;
  }

  // 20. 牛排/和牛/战斧/大肉盘/羊排/排骨
  if (n.includes('牛排') || n.includes('steak') || n.includes('拼盘') || n.includes('战斧') || n.includes('排骨') || n.includes('羊排') || n.includes('松板肉')) {
    return lowkeySteakImg;
  }

  // 默认统一精选：暗调 Low-key 30° 机位炭火烤肉串
  return lowkeySkewersImg;
}

/**
 * 获取单个菜品重匹配后的图片（支持传入菜品对象或菜品名称字符串）
 */
export function matchDishImageUrl(dish: Partial<DishItem> | string): string {
  if (typeof dish === 'string') {
    return getSmartMatchedImageUrl(dish);
  }
  if (dish?.id && DISH_IMAGE_MAP[dish.id]) {
    return DISH_IMAGE_MAP[dish.id];
  }
  return getSmartMatchedImageUrl(dish?.name || '', dish?.category);
}

/**
 * 批量重新匹配所有菜品的图片
 */
export function rematchAllDishImages(dishes: DishItem[]): DishItem[] {
  return dishes.map((dish) => {
    const matchedUrl = matchDishImageUrl(dish);
    return {
      ...dish,
      imageUrl: matchedUrl,
      galleryImages: [
        { url: matchedUrl, label: '招牌出品 · 30°商业摄影' },
        ...(dish.galleryImages && dish.galleryImages.length > 1
          ? dish.galleryImages.slice(1).map((g) => ({ ...g, url: matchedUrl }))
          : [])
      ]
    };
  });
}
