import { DishItem } from '../types';
import { CategoryTreeNode, DishRankingItem } from '../types/filter';
import { CATEGORY_TAXONOMY } from '../data/categoryTaxonomy';

// Subcategory classifier based on dishes
export function buildDishTree(dishes: DishItem[]): CategoryTreeNode[] {
  if (!dishes || !Array.isArray(dishes) || dishes.length === 0) {
    return [];
  }

  // Pre-seed categoryMap using defined taxonomies or fallbacks
  const categoryMap: Record<string, { name: string; enName: string; subs: Record<string, DishItem[]> }> = {};

  const getOrCreateCategory = (catKey: string) => {
    if (!categoryMap[catKey]) {
      const taxonomy = CATEGORY_TAXONOMY[catKey];
      categoryMap[catKey] = {
        name: taxonomy?.name || (catKey === 'skewers' ? '炭烤串串' : catKey),
        enName: taxonomy?.enName || (catKey === 'skewers' ? 'Charcoal Skewers' : catKey),
        subs: {}
      };
    }
    return categoryMap[catKey];
  };

  const addDishToSub = (catKey: string, subName: string, dish: DishItem) => {
    const cat = getOrCreateCategory(catKey);
    if (!cat.subs[subName]) {
      cat.subs[subName] = [];
    }
    cat.subs[subName].push(dish);
  };

  dishes.forEach((dish) => {
    if (!dish || !dish.id) return;
    const catKey = (dish.category && typeof dish.category === 'string') ? dish.category : 'skewers';

    // Derive the best subcategory display name
    let subName = '';

    // First check if dish.subCategory matches a subcategory defined in CATEGORY_TAXONOMY
    const catTaxonomy = CATEGORY_TAXONOMY[catKey];
    if (catTaxonomy && Array.isArray(catTaxonomy.subCategories) && dish.subCategory) {
      const matchedSub = catTaxonomy.subCategories.find(
        (s) => s.id === dish.subCategory || s.name === dish.subCategory
      );
      if (matchedSub && matchedSub.id !== 'all') {
        subName = matchedSub.name;
      }
    }

    if (!subName) {
      const dName = dish.name || '';
      const sub = dish.subCategory || '';

      if (catKey === 'skewers') {
        if (dName.includes('牛肉') || dName.includes('和牛') || sub.includes('beef')) {
          subName = '网红牛肉烤串';
        } else if (dName.includes('羊') || dName.includes('筋') || sub.includes('meat')) {
          subName = '经典牛羊与肉类';
        } else if (dName.includes('鸡') || dName.includes('猪') || dName.includes('五花') || dName.includes('排骨') || dName.includes('骨') || dName.includes('掌中宝')) {
          subName = '鲜嫩猪禽烧烤';
        } else if (dName.includes('虾') || dName.includes('生蚝') || dName.includes('鱿鱼') || dName.includes('海鲜') || dName.includes('鱼') || dName.includes('鳗')) {
          subName = '现烤海鲜与鱼生';
        } else if (dName.includes('锡纸') || dName.includes('面筋') || dName.includes('脑花') || dName.includes('馒头')) {
          subName = '锡纸烧烤与主食';
        } else {
          subName = '丸滑豆品与素菜';
        }
      } else if (catKey === 'yakitori') {
        if (dName.includes('提灯') || dName.includes('七里香') || dName.includes('白肝') || dName.includes('生蚝肉')) {
          subName = '珍稀部位';
        } else if (dName.includes('鸡心') || dName.includes('鸡胗') || dName.includes('软骨') || dName.includes('鸡皮') || dName.includes('鸡脖')) {
          subName = '内脏与软骨';
        } else if (dName.includes('中翅') || dName.includes('芦笋') || dName.includes('西葫芦') || dName.includes('香菇')) {
          subName = '鸡翅与蔬菜卷';
        } else {
          subName = '经典鸡肉串';
        }
      } else if (catKey === 'baked') {
        if (dName.includes('虾') || dName.includes('龙虾') || dName.includes('生蚝') || dName.includes('蜗牛') || dName.includes('青口')) {
          subName = '焗烤海鲜';
        } else if (dName.includes('饭') || dName.includes('面') || dName.includes('千层')) {
          subName = '焗饭与焗意面';
        } else {
          subName = '芝士小食与蔬果';
        }
      } else if (catKey === 'western') {
        if (dName.includes('牛排') || dName.includes('拼盘') || sub.includes('steak')) {
          subName = '原切牛排主菜';
        } else if (dName.includes('汉堡') || dName.includes('意面') || dName.includes('玉棋') || dName.includes('饭') || sub.includes('pasta')) {
          subName = '汉堡意面简餐';
        } else if (dName.includes('甜品') || dName.includes('蛋糕') || dName.includes('舒芙蕾') || sub.includes('dessert')) {
          subName = '法式流心甜品';
        } else {
          subName = '开胃佐餐小食';
        }
      } else if (catKey === 'mains') {
        if (dName.includes('汉堡') || dName.includes('五花') || dName.includes('牛排') || dName.includes('和牛')) {
          subName = '碳烤和牛与肉类';
        } else if (dName.includes('玉棋') || dName.includes('意面')) {
          subName = '手工意式主餐';
        } else {
          subName = '主厨精选饭食';
        }
      } else if (catKey === 'drinks') {
        if (dName.includes('咖啡') || dName.includes('冷萃')) {
          subName = '冷萃浓缩咖啡';
        } else {
          subName = '鲜果微气泡特饮';
        }
      } else if (catKey === 'snacks') {
        if (dName.includes('薯') || dName.includes('炸')) {
          subName = '黑松露炸物与薯条';
        } else {
          subName = '炙烤风味佐餐';
        }
      } else if (catKey === 'desserts') {
        if (dName.includes('舒芙蕾') || dName.includes('熔岩') || dName.includes('蛋糕')) {
          subName = '熔岩舒芙蕾与烘焙';
        } else {
          subName = '手作法式甜品';
        }
      } else if (catKey === 'popular') {
        subName = '热销招牌甄选';
      } else {
        subName = dish.badgeText || dish.typeTag || '精选推荐';
      }
    }

    addDishToSub(catKey, subName, dish);
  });

  return Object.entries(categoryMap)
    .map(([id, item]) => {
      const subcategories = Object.entries(item.subs)
        .filter(([_, list]) => list && list.length > 0)
        .map(([sName, list]) => ({
          id: `${id}-${sName}`,
          name: sName,
          dishes: list
        }));

      const totalCount = subcategories.reduce((acc, cur) => acc + cur.dishes.length, 0);

      return {
        id,
        name: item.name,
        enName: item.enName,
        count: totalCount,
        subcategories
      };
    })
    .filter((node) => node.count > 0);
}

// Generate Rankings
export function getDishRankings(dishes: DishItem[]): {
  hotRankings: DishRankingItem[];
  chefRankings: DishRankingItem[];
  praiseRankings: DishRankingItem[];
} {
  const safeDishes = Array.isArray(dishes) ? dishes.filter((d) => d && d.name) : [];

  if (safeDishes.length === 0) {
    return {
      hotRankings: [],
      chefRankings: [],
      praiseRankings: []
    };
  }

  const hotDishes = [...safeDishes]
    .sort((a, b) => (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0) || (b.price || 0) - (a.price || 0))
    .slice(0, 5);

  const hotRankings: DishRankingItem[] = hotDishes.map((dish, index) => ({
    id: `hot-${dish.id || index}`,
    dishId: dish.id || `dish-hot-${index}`,
    rank: index + 1,
    dish,
    hotScore: 9800 - index * 620,
    tag: index === 0 ? '热销 TOP 1' : index === 1 ? '人气飙升' : '回头客推荐'
  }));

  let chefDishes = safeDishes.filter((d) => d.isChefSpecial || d.badgeText?.includes('招牌') || (d.price && d.price > 30)).slice(0, 4);
  if (chefDishes.length === 0) {
    chefDishes = safeDishes.slice(0, 4);
  }
  const chefRankings: DishRankingItem[] = chefDishes.map((dish, index) => ({
    id: `chef-${dish.id || index}`,
    dishId: dish.id || `dish-chef-${index}`,
    rank: index + 1,
    dish,
    hotScore: 9600 - index * 450,
    tag: '主厨匠心'
  }));

  let praiseDishes = safeDishes.filter((d) => d.available && (d.discountTag || d.isPopular)).slice(0, 4);
  if (praiseDishes.length === 0) {
    praiseDishes = safeDishes.slice(0, 4);
  }
  const praiseRankings: DishRankingItem[] = praiseDishes.map((dish, index) => ({
    id: `praise-${dish.id || index}`,
    dishId: dish.id || `dish-praise-${index}`,
    rank: index + 1,
    dish,
    hotScore: 9900 - index * 310,
    tag: '好评如潮 99.8%'
  }));

  return { hotRankings, chefRankings, praiseRankings };
}

