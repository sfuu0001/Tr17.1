import { CategoryType } from '../types';

export type CategoryBrandTriggerMode = 'first_time_only' | 'repeat_switch' | 'daily_first' | 'disabled';

export interface CategoryBrandModalConfig {
  categoryId: string; // e.g. 'skewers' | 'yakitori' | 'baked' | 'western' | 'mains' | 'custom_xxx'
  categoryName: string; // e.g. '炭烤串串', '日式烧鸟', '芝士焗类'
  categoryEnName?: string;
  categoryIcon?: string;
  enabled: boolean;
  triggerMode: CategoryBrandTriggerMode; // 首次切换弹出 | 每次切换弹出 | 每日首次切换弹出 | 停用
  brandTitle: string; // 品牌大标题 (如: "黑曜石 · 果木炭烤串串")
  brandSubtitle: string; // 核心副标/Slogan (如: "280℃果木菊花炭现点现烤 · 独家秘制九味干碟")
  badgeText: string; // 角标特色 (如: "🔥 现烤锁鲜")
  coverImageUrl: string; // 封面高清大图
  craftHighlights: string[]; // 亮点特色标签列表 (如: ["现串现烤", "果木熏香", "秘制干碟", "冷鲜直供"])
  storyDescription: string; // 品类故事与工艺说明
  couponText?: string; // 专属优惠权益提示
  featuredDishNames?: string[]; // 推荐招牌菜品
  buttonText: string; // 引导按钮文案 (如: "开始选购炭烤串串")
  autoCloseSeconds: number; // 0 = 不自动关闭 (需手动点击), 3/5 = 倒计时自动关闭
  accentColor: 'orange' | 'amber' | 'yellow' | 'stone' | 'rose' | 'emerald' | 'indigo' | 'sky';
  isCustom?: boolean; // 是否是商家自定义创建的分类
  updatedAt?: string;
}

export const CATEGORY_BRAND_STORAGE_KEY = 'obsidian_category_brand_popups_config_v1';
export const CATEGORY_BRAND_SEEN_PREFIX = 'obsidian_seen_cat_brand_modal_';
export const CATEGORY_BRAND_CONFIG_EVENT = 'obsidian_category_brand_config_changed';

/**
 * 默认三大核心大类 (炭烤串串, 日式烧鸟, 芝士焗类) 及其他品类的品牌弹窗配置
 */
export const DEFAULT_CATEGORY_BRAND_CONFIGS: Record<string, CategoryBrandModalConfig> = {
  skewers: {
    categoryId: 'skewers',
    categoryName: '炭烤串串',
    categoryEnName: 'Skewer Grill',
    categoryIcon: '🍢',
    enabled: true,
    triggerMode: 'first_time_only',
    brandTitle: '黑曜石 · 果木炭烤工坊',
    brandSubtitle: '选用特级果木菊花炭 · 280℃极温锁鲜炙烤',
    badgeText: '🔥 果木现烤',
    coverImageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80',
    craftHighlights: ['特级果木炭', '冷鲜肉日配', '现串现烤', '独家九味干碟'],
    storyDescription:
      '每串肉品均选用当日冷鲜排酸肉品，由师傅手工现串。在280℃果木菊花炭火上慢火翻转炙烤，逼出多余油脂，外皮焦香酥脆、内部肉汁饱满丰盈，搭配黑曜石独家调配九味干碟，香辣过瘾！',
    couponText: '炭烤专区专享：满¥35立减¥5 · 免费赠送秘制干碟',
    featuredDishNames: ['招牌牛肉串', '果木羊肉串', '鲜烤乳山生蚝', '川香烤苕皮'],
    buttonText: '开始选购炭烤串串',
    autoCloseSeconds: 0,
    accentColor: 'orange',
    updatedAt: '2026-08-29 12:00:00'
  },
  yakitori: {
    categoryId: 'yakitori',
    categoryName: '日式烧鸟',
    categoryEnName: 'Yakitori Grill',
    categoryIcon: '🍢',
    enabled: true,
    triggerMode: 'first_time_only',
    brandTitle: '黑曜石 · 备长炭手作烧鸟',
    brandSubtitle: '纪州备长炭 800℃ 极温手作炙烤 · 日式居酒屋灵魂风味',
    badgeText: '🏮 居酒屋匠心',
    coverImageUrl: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800&auto=format&fit=crop&q=80',
    craftHighlights: ['备长炭炙烤', '秘传熟成酱汁', '爆汁提灯限定', '每日冷鲜分切'],
    storyDescription:
      '还原东京居酒屋纯正烧鸟风味！采用极温少烟的纪州备长炭，红外辐射瞬间锁住鲜美汁水。不仅有经典京葱鸡肉与紫苏梅子鸡，更每日限量供应爆汁提灯、鸡白肝与七里香等珍稀部位。',
    couponText: '烧鸟尝鲜礼：日式烧鸟专享 8.8 折 · 赠特调柠檬海盐',
    featuredDishNames: ['限量爆汁提灯', '经典京葱鸡肉串', '紫苏鸡肉丸配无菌蛋', '明太子西葫芦'],
    buttonText: '开始选购日式烧鸟',
    autoCloseSeconds: 0,
    accentColor: 'amber',
    updatedAt: '2026-08-29 12:00:00'
  },
  baked: {
    categoryId: 'baked',
    categoryName: '芝士焗类',
    categoryEnName: 'Baked & Gratin',
    categoryIcon: '🧀',
    enabled: true,
    triggerMode: 'first_time_only',
    brandTitle: '黑曜石 · 双倍马苏里拉黄金焗烤',
    brandSubtitle: '进口新西兰高品质厚乳芝士 · 230℃金黄焦化超长拉丝',
    badgeText: '🧀 金黄拉丝',
    coverImageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
    craftHighlights: ['双倍马苏里拉', '拉丝长达30cm', '黑椒和牛焗饭', '波士顿龙虾焗'],
    storyDescription:
      '双倍芝士控的终极狂欢！选用新西兰进口原切马苏里拉芝士，铺满鲜美波士顿龙虾、原切黑椒和牛与意式肉酱，经专业烤箱230℃高温旋风焗烤至金黄微焦，浓郁奶香扑鼻而来，拉丝惊艳！',
    couponText: '芝士焗物特惠：焗烤全系立减¥6 · 芝士控必选',
    featuredDishNames: ['芝士焗波士顿龙虾', '黑椒和牛芝士焗饭', '法式奶油焗生蚝', '芝士焗香甜红薯泥'],
    buttonText: '开始选购芝士焗烤',
    autoCloseSeconds: 0,
    accentColor: 'yellow',
    updatedAt: '2026-08-29 12:00:00'
  },
  western: {
    categoryId: 'western',
    categoryName: '西式快餐',
    categoryEnName: 'Western Classic',
    categoryIcon: '🥩',
    enabled: false,
    triggerMode: 'first_time_only',
    brandTitle: '黑曜石 · 原切厚炙西式精选',
    brandSubtitle: '澳洲安格斯谷饲原切 · 焦香美式手工汉堡',
    badgeText: '🥩 谷饲原切',
    coverImageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80',
    craftHighlights: ['澳洲谷饲牛肉', '手打和牛肉饼', '黑松露风味', '现做现出'],
    storyDescription: '严选高品质谷饲牛肉与手作和牛汉堡肉饼，现煎锁汁，搭配特调黑松露酱汁与手作面包，浓郁多汁。',
    couponText: '西餐单品满¥40减¥6',
    featuredDishNames: ['碳烤和牛小汉堡双重奏', '经典黑椒西冷牛排'],
    buttonText: '开始选购西式精选',
    autoCloseSeconds: 0,
    accentColor: 'rose',
    updatedAt: '2026-08-29 12:00:00'
  },
  mains: {
    categoryId: 'mains',
    categoryName: '主食料理',
    categoryEnName: 'Mains & Bowls',
    categoryIcon: '🥘',
    enabled: false,
    triggerMode: 'first_time_only',
    brandTitle: '黑曜石 · 现炒现煮暖心主食',
    brandSubtitle: '现炒锅气 · 颗粒分明东北大米 · 饱腹丰盛',
    badgeText: '🍲 锅气十足',
    coverImageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&auto=format&fit=crop&q=80',
    craftHighlights: ['现炒大火锅气', '五常精选大米', '料足味浓', '暖胃饱腹'],
    storyDescription: '每一份主食均由主厨大火现炒或慢火熬煮，锅气十足，饱满米粒吸饱特制酱汁，满足大胃王的一切期待。',
    couponText: '主食加购饮品立省¥4',
    featuredDishNames: ['川味碳烤牛肉拌面', '和牛粒蛋炒饭'],
    buttonText: '开始选购主食料理',
    autoCloseSeconds: 0,
    accentColor: 'emerald',
    updatedAt: '2026-08-29 12:00:00'
  },
  drinks: {
    categoryId: 'drinks',
    categoryName: '特调饮品',
    categoryEnName: 'Beverages & Brews',
    categoryIcon: '☕',
    enabled: false,
    triggerMode: 'first_time_only',
    brandTitle: '黑曜石 · 冰爽解腻特调工坊',
    brandSubtitle: '新鲜冷压鲜萃 · 低糖清爽 · 烧烤绝配',
    badgeText: '🥤 解辣冰爽',
    coverImageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&auto=format&fit=crop&q=80',
    craftHighlights: ['新鲜现榨', '精选原叶茶底', '低卡低糖', '解腻搭档'],
    storyDescription: '严选原叶现萃茶底与时令新鲜水果，低糖清爽配方，是享用炭烤与炙烧时的最佳解腻冰爽伴侣！',
    couponText: '饮品第二杯半价特惠',
    featuredDishNames: ['冷萃生椰拿铁', '手打暴打柠檬茶'],
    buttonText: '开始挑选特调饮品',
    autoCloseSeconds: 0,
    accentColor: 'sky',
    updatedAt: '2026-08-29 12:00:00'
  }
};

/**
 * 获取当前所有分类品牌弹窗配置 (包含商家自定义新增的分类)
 */
export function getCategoryBrandConfigs(): Record<string, CategoryBrandModalConfig> {
  if (typeof window === 'undefined') return DEFAULT_CATEGORY_BRAND_CONFIGS;
  try {
    const raw = localStorage.getItem(CATEGORY_BRAND_STORAGE_KEY);
    if (!raw) return DEFAULT_CATEGORY_BRAND_CONFIGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CATEGORY_BRAND_CONFIGS,
      ...parsed
    };
  } catch (err) {
    console.warn('[CategoryBrandSettings] 读取配置失败，降级默认:', err);
    return DEFAULT_CATEGORY_BRAND_CONFIGS;
  }
}

/**
 * 保存分类品牌弹窗配置并广播事件
 */
export function saveCategoryBrandConfigs(configs: Record<string, CategoryBrandModalConfig>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CATEGORY_BRAND_STORAGE_KEY, JSON.stringify(configs));
    window.dispatchEvent(
      new CustomEvent(CATEGORY_BRAND_CONFIG_EVENT, {
        detail: configs
      })
    );
  } catch (err) {
    console.error('[CategoryBrandSettings] 保存配置异常:', err);
  }
}

/**
 * 订阅分类品牌弹窗配置变更事件
 */
export function subscribeCategoryBrandConfigs(
  callback: (configs: Record<string, CategoryBrandModalConfig>) => void
): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => {
    const customEvt = e as CustomEvent<Record<string, CategoryBrandModalConfig>>;
    callback(customEvt.detail || getCategoryBrandConfigs());
  };
  window.addEventListener(CATEGORY_BRAND_CONFIG_EVENT, handler);
  return () => window.removeEventListener(CATEGORY_BRAND_CONFIG_EVENT, handler);
}

/**
 * 获取今天的日期字符串 (YYYY-MM-DD)
 */
function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 检查用户是否应该展示该分类的品牌弹窗
 */
export function shouldShowCategoryBrandModal(categoryId: string, config?: CategoryBrandModalConfig): boolean {
  if (typeof window === 'undefined') return false;
  const currentConfig = config || getCategoryBrandConfigs()[categoryId];
  if (!currentConfig || !currentConfig.enabled || currentConfig.triggerMode === 'disabled') {
    return false;
  }

  // 1. 每次切换都弹出
  if (currentConfig.triggerMode === 'repeat_switch') {
    return true;
  }

  // 2. 仅第一次切换时弹出 (之后不重复弹出)
  if (currentConfig.triggerMode === 'first_time_only') {
    try {
      const seen = localStorage.getItem(`${CATEGORY_BRAND_SEEN_PREFIX}${categoryId}`);
      return seen !== 'true';
    } catch {
      return true;
    }
  }

  // 3. 每日首次切换时弹出
  if (currentConfig.triggerMode === 'daily_first') {
    try {
      const today = getTodayString();
      const seenDay = localStorage.getItem(`${CATEGORY_BRAND_SEEN_PREFIX}${categoryId}_daily`);
      return seenDay !== today;
    } catch {
      return true;
    }
  }

  return false;
}

/**
 * 记录用户已查看该分类品牌弹窗
 */
export function recordCategoryBrandModalSeen(categoryId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${CATEGORY_BRAND_SEEN_PREFIX}${categoryId}`, 'true');
    localStorage.setItem(`${CATEGORY_BRAND_SEEN_PREFIX}${categoryId}_daily`, getTodayString());
  } catch {
    // ignore
  }
}

/**
 * 重置所有分类的查看记录 (供商家后台测试使用)
 */
export function resetAllCategorySeenRecords(): void {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CATEGORY_BRAND_SEEN_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

/**
 * 重置单个分类的查看记录
 */
export function resetSingleCategorySeenRecord(categoryId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`${CATEGORY_BRAND_SEEN_PREFIX}${categoryId}`);
    localStorage.removeItem(`${CATEGORY_BRAND_SEEN_PREFIX}${categoryId}_daily`);
  } catch {
    // ignore
  }
}
