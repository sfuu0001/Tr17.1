import { CategoryType } from '../types';

export interface SubCategoryConfig {
  id: string;
  name: string;
  enName: string;
  icon: string;
  badge?: string;
  desc: string;
}

export interface PrimaryCategoryConfig {
  id: string;
  name: string;
  sidebarName?: string;
  enName: string;
  icon: string;
  badge?: string;
  bubblePill?: string; // 外卖风格黑底小气泡胶囊，如"品质保证"、"咔嚓脆"、"体验为先"
  subIcons?: string;   // 侧边栏微图标或装饰，如"💎💎💎"、"👑 店内热销"
  desc: string;
  tagline: string;
  themeColor: {
    bg: string;
    text: string;
    border: string;
    activeBg: string;
    pillActive: string;
    accent: string;
  };
  subCategories: SubCategoryConfig[];
}

export const CATEGORY_TAXONOMY: Record<string, PrimaryCategoryConfig> = {
  all: {
    id: 'all',
    name: '全部',
    sidebarName: '全部品类',
    enName: 'All Items',
    icon: '✨',
    desc: '全品类美食精选',
    tagline: '黑曜石餐车现制全品类料理 · 现烤现出',
    themeColor: {
      bg: 'bg-neutral-100',
      text: 'text-neutral-900',
      border: 'border-neutral-200',
      activeBg: 'bg-black text-white',
      pillActive: 'bg-black text-white border-black',
      accent: 'text-neutral-900'
    },
    subCategories: []
  },
  popular: {
    id: 'popular',
    name: '热销爆款',
    sidebarName: '店内热销',
    enName: 'Popular Hits',
    icon: '🔥',
    badge: 'HOT',
    bubblePill: '品质保证',
    subIcons: '👑👑👑',
    desc: '食客回购率最高口碑菜品',
    tagline: '神抢手 官方补贴一口价 · 好评破万爆款榜单 · 闭眼点不踩雷',
    themeColor: {
      bg: 'bg-amber-50',
      text: 'text-amber-900',
      border: 'border-amber-200',
      activeBg: 'bg-amber-500 text-black',
      pillActive: 'bg-amber-500 text-black border-amber-600',
      accent: 'text-amber-600'
    },
    subCategories: []
  },
  skewers: {
    id: 'skewers',
    name: '炭烤串串',
    sidebarName: '炭烤串串',
    enName: 'Bichotan Charred Skewers',
    icon: '🍢',
    badge: '果木炭烤',
    bubblePill: '原木炭火',
    subIcons: '🔥 鲜烤锁汁',
    desc: '果木炭火现串现烤 · 独家秘制干碟',
    tagline: '果木菊花炭慢烤 · 现点现烤锁鲜 · 独家秘制干碟配料',
    themeColor: {
      bg: 'bg-orange-50',
      text: 'text-orange-950',
      border: 'border-orange-300',
      activeBg: 'bg-gradient-to-r from-orange-600 to-amber-600 text-white',
      pillActive: 'bg-orange-600 text-white border-orange-700 shadow-xs',
      accent: 'text-orange-600'
    },
    subCategories: [
      { id: 'all', name: '全部串串', enName: 'All Skewers', icon: '🍢', desc: '全部炭火烤串' },
      { id: 'skewers-beef-creative', name: '网红牛肉串', enName: 'Creative Beef', icon: '🥩', badge: '引流爆款', desc: '香菜牛肉、泡椒牛肉、紫苏牛肉、凤梨牛肉与青提牛肉' },
      { id: 'skewers-meat', name: '经典牛羊', enName: 'Beef & Lamb', icon: '🍖', badge: '必点', desc: '经典新疆羊肉串、牛肋条、上脑牛肉、羊腰与板筋' },
      { id: 'skewers-pork-poultry', name: '鲜嫩猪禽', enName: 'Pork & Poultry', icon: '🍗', desc: '五花肉、掌中宝、脆骨、松板肉、鸡中翅与蒜香排骨' },
      { id: 'skewers-seafood', name: '海鲜河鲜', enName: 'Fresh Seafood', icon: '🦐', badge: '现烤', desc: '乳山生蚝、基围虾、鲜鱿鱼须、墨鱼仔、小黄鱼与鳗鱼' },
      { id: 'skewers-balls-tofu', name: '丸滑豆品', enName: 'Balls & Tofu', icon: '🧆', desc: '撒尿牛丸、鱼豆腐、豆泡虾滑、面筋虾滑与午餐肉' },
      { id: 'skewers-veggie', name: '素菜混搭', enName: 'Veggies & Mix', icon: '🥬', desc: '烤苕皮、贡菜、金针菇卷肉、双色彩椒与多汁香菇' },
      { id: 'skewers-special', name: '锡纸与主食', enName: 'Foil & Buns', icon: '🥘', desc: '锡纸蒜蓉金针菇、川香烤脑花、烤面筋与炼乳黄金小馒头' }
    ]
  },
  yakitori: {
    id: 'yakitori',
    name: '日式烧鸟',
    sidebarName: '日式烧鸟',
    enName: 'Yakitori Grill',
    icon: '🍢',
    badge: '炭火烧鸟',
    bubblePill: '备长炭烤',
    subIcons: '🏮 居酒屋',
    desc: '备长炭手作炙烤 · 秘制酱烤与经典盐烤',
    tagline: '炭火精细慢烤 · 严选冷鲜鸡肉与珍稀部位 · 日式居酒屋风味',
    themeColor: {
      bg: 'bg-stone-900',
      text: 'text-amber-100',
      border: 'border-stone-700',
      activeBg: 'bg-stone-900 text-amber-300',
      pillActive: 'bg-stone-900 text-amber-300 border-stone-800 shadow-xs',
      accent: 'text-amber-400'
    },
    subCategories: [
      { id: 'all', name: '全部烧鸟', enName: 'All Yakitori', icon: '🍢', desc: '全部日式烧鸟烤串' },
      { id: 'yakitori-classic', name: '经典鸡肉串', enName: 'Classic Cuts', icon: '🍗', badge: '招牌', desc: '京葱鸡肉串、紫苏梅子鸡肉、手打鸡肉丸配无菌蛋' },
      { id: 'yakitori-special', name: '珍稀部位', enName: 'Rare Cuts', icon: '✨', badge: '居酒屋限定', desc: '爆汁提灯、七里香/鸡尾、鸡白肝、鸡生蚝肉' },
      { id: 'yakitori-giblets', name: '内脏与软骨', enName: 'Giblets & Cartilage', icon: '🔥', desc: '炭烤鸡心、香脆鸡胗、掌中宝软骨、焦香鸡皮、鸡脖肉' },
      { id: 'yakitori-wings-veggie', name: '鸡翅与蔬菜卷', enName: 'Wings & Skewers', icon: '🥬', desc: '一折二鸡中翅、明太子西葫芦、培根芦笋卷、酱烤香菇' }
    ]
  },
  baked: {
    id: 'baked',
    name: '芝士焗类',
    sidebarName: '芝士焗物',
    enName: 'Baked & Gratin',
    icon: '🧀',
    badge: '金黄拉丝',
    bubblePill: '浓郁拉丝',
    subIcons: '✨ 黄金焗烤',
    desc: '双层马苏里拉芝士 · 烤箱高温金黄焦化',
    tagline: '原切厚乳芝士 · 浓郁拉丝奶香 · 鲜甜海鲜与软糯焗物',
    themeColor: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-950',
      border: 'border-yellow-300',
      activeBg: 'bg-yellow-600 text-white',
      pillActive: 'bg-yellow-600 text-white border-yellow-700 shadow-xs',
      accent: 'text-yellow-600'
    },
    subCategories: [
      { id: 'all', name: '全部焗类', enName: 'All Baked', icon: '🧀', desc: '全部芝士焗烤料理' },
      { id: 'baked-seafood', name: '焗烤海鲜', enName: 'Seafood Gratin', icon: '🦐', badge: '鲜美拉丝', desc: '芝士焗波士顿龙虾、黄金焗大红虾、法式焗蜗牛、奶油焗生蚝、焗青口贝' },
      { id: 'baked-staple', name: '焗饭与焗意面', enName: 'Baked Rice & Pasta', icon: '🍝', badge: '浓香主食', desc: '黑椒和牛芝士焗饭、意式经典肉酱千层焗面、海鲜奶油焗意面' },
      { id: 'baked-appetizer', name: '芝士小食与蔬果', enName: 'Appetizers & Veg', icon: '🍠', desc: '芝士焗香甜红薯泥、黑松露焗野菌皇、蒜香奶油焗西兰花、芝士焗南瓜' }
    ]
  },
  western: {
    id: 'western',
    name: '精致西餐',
    sidebarName: '精致西餐',
    enName: 'Western Bistro',
    icon: '🥩',
    badge: 'M5+和牛',
    bubblePill: '体验为先',
    subIcons: '💎💎💎',
    desc: '澳洲原切和牛牛排 · 手工汉堡意面',
    tagline: '澳洲谷饲M5+和牛 · 纯手打和牛汉堡 · 主厨特调法式风味',
    themeColor: {
      bg: 'bg-neutral-900',
      text: 'text-neutral-100',
      border: 'border-neutral-700',
      activeBg: 'bg-neutral-900 text-amber-300',
      pillActive: 'bg-black text-amber-300 border-black shadow-xs',
      accent: 'text-amber-400'
    },
    subCategories: [
      { id: 'all', name: '全部西餐', enName: 'All Western', icon: '🍽️', desc: '全部精致西式料理' },
      { id: 'western-steak', name: '原切牛排主菜', enName: 'Steak & Entrees', icon: '🥩', badge: 'M5+和牛', desc: '极炙炭烤和牛排300g、和牛双人豪华拼盘与烟熏黑豚' },
      { id: 'western-burger-pasta', name: '汉堡意面简餐', enName: 'Burgers & Pasta', icon: '🍔', desc: '黑松露炭烤和牛堡、墨汁玉棋与黑椒牛舌饭' },
      { id: 'western-starters', name: '开胃佐餐小食', enName: 'Starters & Sides', icon: '🍟', desc: '炭烤和牛小汉堡双重奏与黑松露金黄脆薯' },
      { id: 'western-dessert', name: '法式流心甜品', enName: 'Bistro Dessert', icon: '🍰', desc: '火山岩黑熔岩蛋糕与黑芝麻舒芙蕾' }
    ]
  },
  mains: {
    id: 'mains',
    name: '主食简餐',
    sidebarName: '单点主食',
    enName: 'Mains & Bowls',
    icon: '🍚',
    badge: '现炒现做',
    bubblePill: '管饱推荐',
    subIcons: '🍲 暖胃现炒',
    desc: '招牌和牛炒饭 · 墨汁意面简餐',
    tagline: '慢熬浓汁高汤 · 原粒越光大米 · 饱腹管饱招牌主食',
    themeColor: {
      bg: 'bg-neutral-100',
      text: 'text-neutral-900',
      border: 'border-neutral-300',
      activeBg: 'bg-black text-white',
      pillActive: 'bg-black text-white border-black',
      accent: 'text-neutral-800'
    },
    subCategories: []
  },
  drinks: {
    id: 'drinks',
    name: '特调饮品',
    sidebarName: '特调饮品',
    enName: 'Artisan Drinks',
    icon: '🥤',
    badge: '冰爽解腻',
    bubblePill: '解腻清爽',
    subIcons: '🍹 24h冷萃',
    desc: '24h冷萃浓缩 · 精酿乌梅山楂汁',
    tagline: '精选埃塞俄比亚原豆 · 24h低温慢萃 · 烧烤解腻搭档',
    themeColor: {
      bg: 'bg-sky-50',
      text: 'text-sky-950',
      border: 'border-sky-300',
      activeBg: 'bg-sky-700 text-white',
      pillActive: 'bg-sky-700 text-white border-sky-800',
      accent: 'text-sky-600'
    },
    subCategories: [
      { id: 'all', name: '全部饮品', enName: 'All Drinks', icon: '🥤', desc: '全系列特调' },
      { id: 'drinks-special', name: '冷萃与气泡', enName: 'Cold Brew & Soda', icon: '☕', desc: '暗夜冷萃咖啡与极夜西西里青柠' }
    ]
  },
  desserts: {
    id: 'desserts',
    name: '手作甜品',
    sidebarName: '法式甜品',
    enName: 'Handcrafted Sweets',
    icon: '🍰',
    badge: '现烤流心',
    bubblePill: '咔嚓脆',
    subIcons: '🍮 熔岩流心',
    desc: '法芙娜黑巧流心 · 芝麻舒芙蕾',
    tagline: '法芙娜70%黑巧现烤 · 纯手作浓郁流心',
    themeColor: {
      bg: 'bg-pink-50',
      text: 'text-pink-950',
      border: 'border-pink-300',
      activeBg: 'bg-pink-600 text-white',
      pillActive: 'bg-pink-600 text-white border-pink-700',
      accent: 'text-pink-600'
    },
    subCategories: [
      { id: 'all', name: '全部甜品', enName: 'All Desserts', icon: '🍰', desc: '手作烘焙' },
      { id: 'desserts-sweet', name: '流心舒芙蕾', enName: 'Souffle & Lava', icon: '🍮', desc: '火山熔岩与黑芝麻舒芙蕾' }
    ]
  },
  snacks: {
    id: 'snacks',
    name: '炸物小食',
    sidebarName: '酥脆小食',
    enName: 'Snacks & Sides',
    icon: '🍟',
    badge: '酥脆爽口',
    bubblePill: '宝子快看',
    subIcons: '👍——多',
    desc: '黑松露金黄脆薯 · 椒盐掌中宝',
    tagline: '现点现炸热气腾腾 · 佐餐必配酥脆小食',
    themeColor: {
      bg: 'bg-amber-50',
      text: 'text-amber-950',
      border: 'border-amber-300',
      activeBg: 'bg-amber-600 text-white',
      pillActive: 'bg-amber-600 text-white border-amber-700',
      accent: 'text-amber-600'
    },
    subCategories: [
      { id: 'all', name: '全部小食', enName: 'All Snacks', icon: '🍟', desc: '全系列炸物小食' }
    ]
  }
};

export const getCategoryDef = (category: CategoryType) => {
  return CATEGORY_TAXONOMY[category];
};

export const getSubCategoryDef = (category: CategoryType, subCategory?: string) => {
  if (!subCategory) return undefined;
  return CATEGORY_TAXONOMY[category]?.subCategories?.find((s) => s.id === subCategory);
};
