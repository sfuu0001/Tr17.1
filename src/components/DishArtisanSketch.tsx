import React from 'react';
import { DishItem } from '../types';

interface DishArtisanSketchProps {
  dish: DishItem;
  className?: string;
}

export const DishArtisanSketch: React.FC<DishArtisanSketchProps> = ({ dish, className = 'w-full h-full' }) => {
  const name = (dish.name + ' ' + (dish.enName || '') + ' ' + (dish.category || '')).toLowerCase();

  // 1. 炭烤和牛小汉堡 / 滑块堡 (Slider / Burger)
  if (name.includes('堡') || name.includes('burger') || name.includes('slider')) {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" stroke="#1a1c1b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {/* 左侧尺寸标尺线 (Cad Dimension Ruler) */}
        <line x1="10" y1="26" x2="10" y2="76" stroke="#a3a29b" strokeWidth="0.8" strokeDasharray="1.5 1.5" />
        <line x1="7" y1="26" x2="13" y2="26" stroke="#787770" strokeWidth="1" />
        <line x1="7" y1="76" x2="13" y2="76" stroke="#787770" strokeWidth="1" />
        
        {/* 顶层面包胚 (Top Bun) */}
        <path d="M 22 42 C 22 22, 78 22, 78 42 L 76 46 C 60 49, 40 49, 24 46 Z" fill="#ffffff" stroke="#1a1c1b" strokeWidth="2.2" />
        {/* 芝麻点 (Sesame seeds) */}
        <ellipse cx="38" cy="31" rx="1.5" ry="0.8" transform="rotate(-15 38 31)" fill="#1a1c1b" />
        <ellipse cx="50" cy="27" rx="1.5" ry="0.8" transform="rotate(5 50 27)" fill="#1a1c1b" />
        <ellipse cx="62" cy="33" rx="1.5" ry="0.8" transform="rotate(20 62 33)" fill="#1a1c1b" />
        
        {/* 生菜波浪纹 (Lettuce wavy line) */}
        <path d="M 22 47 Q 27 44, 32 47 T 42 47 T 52 47 T 62 47 T 72 47 T 78 47" stroke="#1a1c1b" strokeWidth="1.5" />
        
        {/* 厚切和牛肉饼 (Wagyu Patty 1) */}
        <rect x="22" y="50" width="56" height="10" rx="2" fill="#1a1c1b" />
        {/* 炙烤排线与高光 (Hatch marks) */}
        <line x1="30" y1="52" x2="36" y2="58" stroke="#ffffff" strokeWidth="1.2" />
        <line x1="42" y1="52" x2="48" y2="58" stroke="#ffffff" strokeWidth="1.2" />
        <line x1="54" y1="52" x2="60" y2="58" stroke="#ffffff" strokeWidth="1.2" />
        <line x1="66" y1="52" x2="72" y2="58" stroke="#ffffff" strokeWidth="1.2" />
        
        {/* 融化芝士瀑布 (Cheddar Melt) */}
        <path d="M 32 60 L 36 67 L 40 60 L 58 60 L 62 68 L 66 60" fill="#1a1c1b" stroke="#1a1c1b" strokeWidth="1.5" />
        
        {/* 底层面包胚 (Bottom Bun) */}
        <path d="M 25 64 L 75 64 C 76 72, 68 76, 50 76 C 32 76, 24 72, 25 64 Z" fill="#ffffff" stroke="#1a1c1b" strokeWidth="2.2" />
      </svg>
    );
  }

  // 2. 京葱大葱鸡肉串 (Yakitori Negima / Leek & Chicken)
  if (name.includes('京葱') || name.includes('negima') || (name.includes('鸡') && name.includes('串'))) {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" stroke="#1a1c1b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {/* 竹签主轴线 (Bamboo Skewer Axis) */}
        <line x1="16" y1="84" x2="84" y2="16" stroke="#1a1c1b" strokeWidth="2.2" />
        <path d="M 82 18 L 86 14 L 84 20" stroke="#1a1c1b" strokeWidth="2" fill="#1a1c1b" />
        
        {/* 鸡肉块 1 (Chicken Cut 1 - Lower) */}
        <g transform="rotate(-45 34 66)">
          <rect x="23" y="58" width="22" height="15" rx="2.5" fill="#ffffff" stroke="#1a1c1b" strokeWidth="2" />
          <line x1="26" y1="62" x2="42" y2="62" stroke="#1a1c1b" strokeWidth="1.2" strokeDasharray="2 2" />
          <line x1="26" y1="66" x2="42" y2="66" stroke="#1a1c1b" strokeWidth="1.2" strokeDasharray="2 2" />
          <line x1="26" y1="70" x2="40" y2="70" stroke="#1a1c1b" strokeWidth="1.2" />
        </g>

        {/* 京葱白段 (Sweet Negima Leek Section - Middle) */}
        <g transform="rotate(-45 50 50)">
          <rect x="40" y="42" width="20" height="15" rx="3" fill="#ffffff" stroke="#1a1c1b" strokeWidth="2" />
          {/* 京葱年轮同心圆/层次 (Leek rings) */}
          <circle cx="50" cy="49" r="4.5" stroke="#1a1c1b" strokeWidth="1.2" strokeDasharray="1.5 1.5" />
          <line x1="42" y1="44" x2="42" y2="54" stroke="#1a1c1b" strokeWidth="1.2" />
          <line x1="58" y1="44" x2="58" y2="54" stroke="#1a1c1b" strokeWidth="1.2" />
        </g>

        {/* 鸡肉块 2 (Chicken Cut 2 - Upper) */}
        <g transform="rotate(-45 66 34)">
          <rect x="55" y="26" width="22" height="15" rx="2.5" fill="#ffffff" stroke="#1a1c1b" strokeWidth="2" />
          <line x1="58" y1="30" x2="74" y2="30" stroke="#1a1c1b" strokeWidth="1.2" strokeDasharray="2 2" />
          <line x1="58" y1="34" x2="74" y2="34" stroke="#1a1c1b" strokeWidth="1.2" strokeDasharray="2 2" />
          <line x1="58" y1="38" x2="72" y2="38" stroke="#1a1c1b" strokeWidth="1.2" />
        </g>
      </svg>
    );
  }

  // 3. 澳洲M9和牛肋条串 / 经典肉串 (Rib finger / Wagyu / Meat Skewer)
  if (name.includes('串') || name.includes('skewer') || name.includes('yakitori') || name.includes('烤肉')) {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" stroke="#1a1c1b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {/* 竹签主轴 (Bamboo Skewer) */}
        <line x1="16" y1="84" x2="84" y2="16" stroke="#1a1c1b" strokeWidth="2.2" />
        <path d="M 82 18 L 86 14 L 84 20" stroke="#1a1c1b" strokeWidth="2" fill="#1a1c1b" />

        {/* 和牛肉粒 1 (Wagyu Cube/Sphere 1 - Lower) */}
        <circle cx="34" cy="66" r="10.5" fill="#ffffff" stroke="#1a1c1b" strokeWidth="2" />
        <line x1="28" y1="62" x2="38" y2="70" stroke="#1a1c1b" strokeWidth="1.4" />
        <line x1="30" y1="68" x2="40" y2="60" stroke="#1a1c1b" strokeWidth="1.4" />
        <circle cx="31" cy="63" r="1" fill="#1a1c1b" />
        <circle cx="37" cy="69" r="1" fill="#1a1c1b" />

        {/* 和牛肉粒 2 (Wagyu Cube/Sphere 2 - Middle) */}
        <circle cx="50" cy="50" r="11" fill="#ffffff" stroke="#1a1c1b" strokeWidth="2" />
        <line x1="44" y1="46" x2="54" y2="54" stroke="#1a1c1b" strokeWidth="1.4" />
        <line x1="46" y1="53" x2="56" y2="45" stroke="#1a1c1b" strokeWidth="1.4" />
        <circle cx="47" cy="48" r="1" fill="#1a1c1b" />
        <circle cx="53" cy="53" r="1" fill="#1a1c1b" />

        {/* 和牛肉粒 3 (Wagyu Cube/Sphere 3 - Upper) */}
        <circle cx="66" cy="34" r="10.5" fill="#ffffff" stroke="#1a1c1b" strokeWidth="2" />
        <line x1="60" y1="30" x2="70" y2="38" stroke="#1a1c1b" strokeWidth="1.4" />
        <line x1="62" y1="37" x2="72" y2="29" stroke="#1a1c1b" strokeWidth="1.4" />
        <circle cx="63" cy="32" r="1" fill="#1a1c1b" />
        <circle cx="69" cy="37" r="1" fill="#1a1c1b" />
      </svg>
    );
  }

  // 4. 厚切牛排 (Steak)
  if (name.includes('牛排') || name.includes('steak')) {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" stroke="#1a1c1b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 22 45 C 20 30, 45 22, 68 28 C 82 32, 85 50, 78 65 C 72 76, 45 78, 28 72 C 20 68, 18 56, 22 45 Z" fill="#ffffff" stroke="#1a1c1b" strokeWidth="2.2" />
        {/* 菱形炭烤烙印 (Diamond Grill Marks) */}
        <line x1="32" y1="36" x2="68" y2="60" stroke="#1a1c1b" strokeWidth="1.6" />
        <line x1="42" y1="32" x2="74" y2="52" stroke="#1a1c1b" strokeWidth="1.6" />
        <line x1="28" y1="48" x2="58" y2="68" stroke="#1a1c1b" strokeWidth="1.6" />
        <line x1="68" y1="36" x2="32" y2="60" stroke="#1a1c1b" strokeWidth="1.6" />
        <line x1="74" y1="46" x2="42" y2="68" stroke="#1a1c1b" strokeWidth="1.6" />
        <line x1="58" y1="28" x2="28" y2="48" stroke="#1a1c1b" strokeWidth="1.6" />
        {/* 迷迭香草 (Rosemary Sprig) */}
        <path d="M 45 40 Q 55 45, 62 42" stroke="#1a1c1b" strokeWidth="1.2" />
      </svg>
    );
  }

  // 5. 薯条 / 炸物 (Fries / Crisps)
  if (name.includes('薯条') || name.includes('薯') || name.includes('fries')) {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" stroke="#1a1c1b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {/* 薯条盒子 (Fries Paper Box) */}
        <path d="M 30 52 L 26 82 L 74 82 L 70 52 Z" fill="#ffffff" stroke="#1a1c1b" strokeWidth="2.2" />
        <path d="M 30 52 C 40 60, 60 60, 70 52" stroke="#1a1c1b" strokeWidth="1.6" />
        {/* 根根金黄手切粗薯条 (Cut Fries) */}
        <rect x="34" y="24" width="6" height="34" rx="1.5" fill="#ffffff" stroke="#1a1c1b" strokeWidth="1.5" />
        <rect x="43" y="16" width="6.5" height="42" rx="1.5" fill="#ffffff" stroke="#1a1c1b" strokeWidth="1.5" />
        <rect x="52" y="20" width="6" height="38" rx="1.5" fill="#ffffff" stroke="#1a1c1b" strokeWidth="1.5" />
        <rect x="61" y="28" width="5.5" height="30" rx="1.5" fill="#ffffff" stroke="#1a1c1b" strokeWidth="1.5" />
        {/* 倾斜薯条 */}
        <line x1="28" y1="36" x2="38" y2="56" stroke="#1a1c1b" strokeWidth="2" />
        <line x1="68" y1="34" x2="60" y2="54" stroke="#1a1c1b" strokeWidth="2" />
      </svg>
    );
  }

  // 6. 饮品 / 冷萃 (Drink / Cold Brew / Soda)
  if (name.includes('饮') || name.includes('冷萃') || name.includes('汁') || name.includes('茶') || name.includes('汽水') || name.includes('brew')) {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" stroke="#1a1c1b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {/* 玻璃杯轮廓 (Glass Tumbler) */}
        <path d="M 30 26 L 36 82 L 64 82 L 70 26 Z" fill="#ffffff" stroke="#1a1c1b" strokeWidth="2.2" />
        <ellipse cx="50" cy="26" rx="20" ry="4" stroke="#1a1c1b" strokeWidth="1.8" />
        {/* 液面与冷萃渐变排线 (Liquid Level) */}
        <path d="M 33 42 C 42 45, 58 45, 67 42" stroke="#1a1c1b" strokeWidth="1.6" />
        {/* 方块老冰 (Clear Ice Cubes) */}
        <rect x="42" y="46" width="14" height="14" rx="2" stroke="#1a1c1b" strokeWidth="1.4" strokeDasharray="2 1.5" />
        <rect x="48" y="58" width="12" height="12" rx="2" stroke="#1a1c1b" strokeWidth="1.4" strokeDasharray="2 1.5" />
        {/* 吸管 (Straw) */}
        <line x1="56" y1="14" x2="44" y2="78" stroke="#1a1c1b" strokeWidth="2" />
      </svg>
    );
  }

  // 7. 意面 / 玉棋 / 饭食 (Gnocchi / Pasta / Rice)
  if (name.includes('玉棋') || name.includes('面') || name.includes('饭') || name.includes('gnocchi')) {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" stroke="#1a1c1b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {/* 陶瓷宽口深盘 (Deep Ceramic Plate) */}
        <ellipse cx="50" cy="62" rx="38" ry="16" fill="#ffffff" stroke="#1a1c1b" strokeWidth="2.2" />
        <ellipse cx="50" cy="60" rx="26" ry="10" stroke="#1a1c1b" strokeWidth="1.2" strokeDasharray="2 2" />
        {/* 手工玉棋粒 (Handmade Gnocchi Dumplings) */}
        <ellipse cx="42" cy="56" rx="6" ry="4" stroke="#1a1c1b" strokeWidth="1.6" />
        <line x1="38" y1="56" x2="46" y2="56" stroke="#1a1c1b" strokeWidth="1" />
        <ellipse cx="56" cy="54" rx="6" ry="4" stroke="#1a1c1b" strokeWidth="1.6" />
        <line x1="52" y1="54" x2="60" y2="54" stroke="#1a1c1b" strokeWidth="1" />
        <ellipse cx="48" cy="62" rx="6" ry="4" stroke="#1a1c1b" strokeWidth="1.6" />
        <line x1="44" y1="62" x2="52" y2="62" stroke="#1a1c1b" strokeWidth="1" />
        {/* 黑松露刨片 (Truffle Shavings) */}
        <path d="M 46 48 Q 50 44, 54 48" stroke="#1a1c1b" strokeWidth="2" strokeLinecap="round" />
        <path d="M 38 51 Q 42 47, 44 52" stroke="#1a1c1b" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  // 8. 默认工匠手作图示 (Artisan Cloche / Skewer Plate)
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" stroke="#1a1c1b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {/* 质感托盘 (Service Platter) */}
      <line x1="20" y1="72" x2="80" y2="72" stroke="#1a1c1b" strokeWidth="2.2" />
      <path d="M 26 72 C 26 42, 74 42, 74 72 Z" fill="#ffffff" stroke="#1a1c1b" strokeWidth="2" />
      <circle cx="50" cy="38" r="4" fill="#1a1c1b" />
      {/* 炭火火苗微标 (Subtle Flame) */}
      <path d="M 46 58 Q 50 50, 54 58 T 46 58" stroke="#1a1c1b" strokeWidth="1.5" />
    </svg>
  );
};
