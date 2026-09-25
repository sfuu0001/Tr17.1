import { DishItem } from '../types';
import { INITIAL_DISHES } from '../data/mockData';
import { TCB_ENV_ID, TCB_COLLECTIONS, getEnterpriseDataInventory } from './cloudbase';

/**
 * 导出用于腾讯云 CloudBase / TDSQL-C / MongoDB / MySQL 的标准数据格式
 */

/**
 * 生成全量企业级多集合打包备份 JSON 结构
 */
export function generateFullEnterpriseDumpJson(): string {
  const inventory = getEnterpriseDataInventory();
  const exportPackage = {
    exportMeta: {
      appName: 'Obsidian Urban Radar · 黑曜石移动餐车系统',
      envId: TCB_ENV_ID,
      version: '3.5.0-Enterprise',
      exportedAt: new Date().toISOString(),
      collectionCount: inventory.length
    },
    collections: inventory.map(item => ({
      key: item.key,
      name: item.name,
      collectionName: item.collectionName,
      storageKey: item.storageKey,
      count: item.getData().length,
      data: item.getData()
    }))
  };
  return JSON.stringify(exportPackage, null, 2);
}

/**
 * 生成符合腾讯云 CloudBase 数据库集合导入的标准 JSON 文本 (NDJSON 格式)
 */
export function generateCloudBaseDishesJson(dishes: DishItem[] = INITIAL_DISHES): string {
  return dishes
    .map((dish) => {
      const doc = {
        _id: dish.id,
        id: dish.id,
        name: dish.name,
        enName: dish.enName || '',
        category: dish.category,
        subCategory: dish.subCategory || 'all',
        subCategoryName: dish.subCategoryName || '',
        price: dish.price,
        originalPrice: dish.originalPrice || dish.price,
        prevPrice: dish.prevPrice || dish.price,
        deliveryDiscount: dish.deliveryDiscount || 0,
        deliveryDiscountTag: dish.deliveryDiscountTag || '',
        dineInDiscount: dish.dineInDiscount || 0,
        dineInDiscountTag: dish.dineInDiscountTag || '',
        description: dish.description,
        isPopular: !!dish.isPopular,
        orderType: dish.orderType || 'delivery',
        badgeText: dish.badgeText || '',
        typeTag: dish.typeTag || '',
        prepTime: dish.prepTime || '约4m',
        imageUrl: dish.imageUrl,
        available: dish.available ?? true,
        nutrition: dish.nutrition || { calories: '120 kcal', protein: '10g' },
        originSource: dish.originSource || '优质原产地食材',
        chefNotes: dish.chefNotes || '大火快烤锁汁，撒万能干料。',
        collection: TCB_COLLECTIONS.DISHES,
        envId: TCB_ENV_ID,
        syncedAt: new Date().toISOString()
      };
      return JSON.stringify(doc);
    })
    .join('\n');
}

/**
 * 生成符合腾讯云 MySQL / TDSQL 的 SQL 导入脚本
 */
export function generateCloudBaseDishesSql(dishes: DishItem[] = INITIAL_DISHES): string {
  const tableCreate = `
-- 腾讯云 MySQL / TDSQL 菜品表创建 (shaokao_sku)
CREATE TABLE IF NOT EXISTS \`shaokao_sku\` (
  \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,
  \`name\` VARCHAR(128) NOT NULL COMMENT '菜品名称',
  \`en_name\` VARCHAR(128) DEFAULT NULL COMMENT '英文名称',
  \`category\` VARCHAR(32) NOT NULL COMMENT '主分类',
  \`sub_category\` VARCHAR(32) DEFAULT NULL COMMENT '二级分类ID',
  \`sub_category_name\` VARCHAR(64) DEFAULT NULL COMMENT '二级分类名',
  \`price\` DECIMAL(10, 2) NOT NULL COMMENT '外卖实付价',
  \`original_price\` DECIMAL(10, 2) NOT NULL COMMENT '划线原价',
  \`prev_price\` DECIMAL(10, 2) DEFAULT NULL COMMENT '上期价格',
  \`delivery_discount\` DECIMAL(10, 2) DEFAULT 0 COMMENT '外卖立减',
  \`dinein_discount\` DECIMAL(10, 2) DEFAULT 0 COMMENT '堂食立减',
  \`description\` TEXT COMMENT '详细描述与调料配方说明',
  \`is_popular\` TINYINT(1) DEFAULT 0 COMMENT '是否爆款',
  \`order_type\` VARCHAR(16) DEFAULT 'delivery' COMMENT '支持就餐形式',
  \`badge_text\` VARCHAR(32) DEFAULT NULL COMMENT '角标',
  \`prep_time\` VARCHAR(32) DEFAULT '约4m' COMMENT '出餐时间',
  \`image_url\` VARCHAR(512) DEFAULT NULL COMMENT '图片链接',
  \`available\` TINYINT(1) DEFAULT 1 COMMENT '是否在售',
  \`origin_source\` VARCHAR(255) DEFAULT NULL COMMENT '原料产地规格',
  \`chef_notes\` TEXT COMMENT '烤制调味SOP秘笈',
  \`synced_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 批量写入/更新菜品数据
`;

  const insertStatements = dishes.map((dish) => {
    const esc = (str?: string) => (str ? str.replace(/'/g, "\\'") : '');
    return `INSERT INTO \`shaokao_sku\` (\`id\`, \`name\`, \`en_name\`, \`category\`, \`sub_category\`, \`sub_category_name\`, \`price\`, \`original_price\`, \`prev_price\`, \`delivery_discount\`, \`dinein_discount\`, \`description\`, \`is_popular\`, \`order_type\`, \`badge_text\`, \`prep_time\`, \`image_url\`, \`available\`, \`origin_source\`, \`chef_notes\`) VALUES ('${esc(dish.id)}', '${esc(dish.name)}', '${esc(dish.enName)}', '${esc(dish.category)}', '${esc(dish.subCategory)}', '${esc(dish.subCategoryName)}', ${dish.price}, ${dish.originalPrice || dish.price}, ${dish.prevPrice || dish.price}, ${dish.deliveryDiscount || 0}, ${dish.dineInDiscount || 0}, '${esc(dish.description)}', ${dish.isPopular ? 1 : 0}, '${esc(dish.orderType || 'delivery')}', '${esc(dish.badgeText)}', '${esc(dish.prepTime)}', '${esc(dish.imageUrl)}', ${dish.available !== false ? 1 : 0}, '${esc(dish.originSource)}', '${esc(dish.chefNotes)}') ON DUPLICATE KEY UPDATE \`name\`='${esc(dish.name)}', \`price\`=${dish.price}, \`original_price\`=${dish.originalPrice || dish.price}, \`delivery_discount\`=${dish.deliveryDiscount || 0}, \`dinein_discount\`=${dish.dineInDiscount || 0}, \`description\`='${esc(dish.description)}', \`is_popular\`=${dish.isPopular ? 1 : 0}, \`available\`=${dish.available !== false ? 1 : 0}, \`chef_notes\`='${esc(dish.chefNotes)}';`;
  });

  return tableCreate + insertStatements.join('\n');
}

/**
 * 触发文件直接下载 (JSON / SQL)
 */
export function downloadDataFile(filename: string, content: string, mimeType: string = 'application/json') {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
