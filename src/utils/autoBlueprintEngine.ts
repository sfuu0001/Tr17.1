import { DishItem, DishVariant, DishOptionChoice, FieldSelectorMediaItem } from '../types';

// 导入本地高阶暗调 Low-key 美食真实资产（同源免跨域，确保像素级素描滤镜 100% 成功）
import lowkeyBurgerImg from '../assets/images/lowkey_burger_1788031618331.jpg';
import lowkeySteakImg from '../assets/images/lowkey_steak_1788031642790.jpg';
import lowkeyFriesImg from '../assets/images/lowkey_fries_1788031869280.jpg';
import lowkeySkewersImg from '../assets/images/lowkey_skewers_1788031604251.jpg';
import lowkeyColdbrewImg from '../assets/images/lowkey_coldbrew_1788031656934.jpg';
import lowkeyDessertImg from '../assets/images/lowkey_dessert_1788031701857.jpg';
import lowkeyOysterImg from '../assets/images/lowkey_oyster_1788031883124.jpg';
import lowkeyGnocchiImg from '../assets/images/lowkey_gnocchi_1788031630806.jpg';
import lowkeySodaImg from '../assets/images/lowkey_soda_1788032037702.jpg';
import lowkeyCornImg from '../assets/images/lowkey_corn_1788031923945.jpg';
import lowkeyEggplantImg from '../assets/images/lowkey_eggplant_1788031910310.jpg';
import lowkeyWingsImg from '../assets/images/lowkey_wings_1788031965248.jpg';

/**
 * 自动化工匠蓝图与写实素描引擎
 * (Automated Artisan Blueprint & Photorealistic Sketch Engine)
 *
 * 核心功能：
 * 1. 经典暗房色彩减淡素描算法 (Color-Dodge & Edge Extraction Pencil Sketch Filter)
 * 2. 真实食物工匠高精矢量线稿与尺寸标注生成器 (Photorealistic CAD Blueprint / Vector Sketch)
 * 3. 字段选择器 (变体 / 口味 / 配菜 / 辣度) 高清预设媒体库与双模生成
 * 4. 严格遵循「中文在前，英文在后」规范
 */

// 预设高真实度媒体图库推荐池
export const PRESET_SELECTOR_MEDIA_BANK: Record<string, {
  labelZh: string;
  labelEn: string;
  imageUrl: string;
  blueprintImageUrl?: string;
  sketchType: string;
  coreTemp: string;
  specRatio: string;
  noteZh: string;
  noteEn: string;
}> = {
  // 变体与肉饼类
  'standard_slider': {
    labelZh: '标准单饼尝鲜款',
    labelEn: 'Single Slider Standard',
    imageUrl: lowkeyBurgerImg,
    sketchType: 'burger_single',
    coreTemp: '56°C',
    specRatio: '7:3',
    noteZh: '标准单饼厚切，7:3 肥瘦黄金比，汁水充沛。',
    noteEn: 'Single thick-cut patty, 7:3 ratio with rich juiciness.'
  },
  'double_thick_stack': {
    labelZh: '豪华加厚双饼尊享版',
    labelEn: 'Double Thick Patty Stack',
    imageUrl: lowkeyBurgerImg,
    sketchType: 'burger_double',
    coreTemp: '56°C',
    specRatio: '7:3 (双层/Dual)',
    noteZh: 'A5 和牛双饼双层压炙，双倍大理石雪花油脂交融。',
    noteEn: 'A5 Wagyu double-deck seared with intensified marbling.'
  },
  'wagyu_triple_deluxe': {
    labelZh: '至尊三层黑金盛宴版',
    labelEn: 'Triple Black Gold Deluxe',
    imageUrl: lowkeyBurgerImg,
    sketchType: 'burger_triple',
    coreTemp: '57°C',
    specRatio: '7:3 (三层/Triple)',
    noteZh: '三层和牛爆汁厚饼，双层车达奶酪与手刨黑松露。',
    noteEn: 'Triple juicing patties with double cheddar and shaved black truffle.'
  },
  // 配菜类
  'truffle_fries': {
    labelZh: '手刨黑松露金黄薯条',
    labelEn: 'Truffle Fries',
    imageUrl: lowkeyFriesImg,
    sketchType: 'fries',
    coreTemp: '180°C',
    specRatio: '1:1.2',
    noteZh: '双重油温脆炸，手刨黑松露碎与海盐颗粒素描工序。',
    noteEn: 'Twice-fried with shaved black summer truffle & sea salt crystals.'
  },
  'garden_salad': {
    labelZh: '田园清爽时蔬沙拉',
    labelEn: 'Garden Salad',
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80',
    sketchType: 'salad',
    coreTemp: '4°C',
    specRatio: '4:1',
    noteZh: '水培羽衣甘蓝与芝麻菜，焦糖黑醋轻盈乳化。',
    noteEn: 'Hydroponic kale & arugula with caramelized balsamic reduction.'
  },
  'sweet_potato_crisps': {
    labelZh: '手工香脆甘薯薄片',
    labelEn: 'Sweet Potato Crisps',
    imageUrl: lowkeyFriesImg,
    sketchType: 'crisps',
    coreTemp: '165°C',
    specRatio: '1:1',
    noteZh: '红心红薯 1.2mm 极薄切片，低温脆炸锁住天然甘甜。',
    noteEn: '1.2mm precision slices crisped at low temp for natural sweetness.'
  },
  // 熟度类
  'doneness_medium': {
    labelZh: '标准五分熟 (主厨推荐)',
    labelEn: 'Medium (Chef Recommendation)',
    imageUrl: lowkeySteakImg,
    sketchType: 'steak',
    coreTemp: '56°C',
    specRatio: '50% Pink Center',
    noteZh: '粉嫩肉芯，大理石雪花油脂均匀化开，锁住丰腴肉汁。',
    noteEn: 'Pink tender core with evenly rendered marbling fat.'
  },
  'doneness_medium_well': {
    labelZh: '七分熟 (醇厚焦香)',
    labelEn: 'Medium Well',
    imageUrl: lowkeySteakImg,
    sketchType: 'steak',
    coreTemp: '64°C',
    specRatio: '20% Pink Center',
    noteZh: '表层微焦酥脆，内芯微粉，醇厚肉香更加饱满。',
    noteEn: 'Crispy seared exterior with deeply toasted beef aroma.'
  },
  'doneness_well_done': {
    labelZh: '全熟 (坚实韧脆)',
    labelEn: 'Well Done',
    imageUrl: lowkeySteakImg,
    sketchType: 'steak',
    coreTemp: '72°C',
    specRatio: '100% Cooked',
    noteZh: '彻底透烤，炭火焦香彻底浸润，适合偏爱坚韧口感食客。',
    noteEn: 'Thoroughly roasted through with dense smoky crust.'
  },
  // 口味类
  'flavor_truffle_garlic': {
    labelZh: '黑松露蒜香',
    labelEn: 'Truffle & Garlic',
    imageUrl: lowkeyGnocchiImg,
    sketchType: 'sauce',
    coreTemp: '60°C',
    specRatio: '3:7',
    noteZh: '手刨黑松露与金黄炸蒜蓉融合，香气醇郁回甘。',
    noteEn: 'Shaved black truffle infused with slow-roasted golden garlic.'
  },
  'flavor_black_pepper': {
    labelZh: '秘制黑椒酱香',
    labelEn: 'Signature Black Pepper',
    imageUrl: lowkeySteakImg,
    sketchType: 'sauce',
    coreTemp: '85°C',
    specRatio: '5:5',
    noteZh: '现研磨粗粒黑胡椒与焦糖洋葱熬煮，辛香微甜。',
    noteEn: 'Freshly cracked coarse black pepper simmered with caramelized onions.'
  },
  'flavor_charcoal_salt': {
    labelZh: '经典炭烤椒盐',
    labelEn: 'Charcoal Roasted Salt & Pepper',
    imageUrl: lowkeySkewersImg,
    sketchType: 'skewer',
    coreTemp: '850°C',
    specRatio: '1:9',
    noteZh: '纯果木炭烤炙提香，配以低温烘炒手作花椒盐。',
    noteEn: 'Pure fruitwood flame aroma anchored by hand-roasted Sichuan pepper salt.'
  },
  'flavor_rattan_pepper': {
    labelZh: '青花椒藤椒',
    labelEn: 'Green Sichuan Rattan Pepper',
    imageUrl: lowkeyWingsImg,
    sketchType: 'spice',
    coreTemp: '90°C',
    specRatio: '2:8',
    noteZh: '鲜青花椒冷萃冷榨油，清麻爽口，鲜香四溢。',
    noteEn: 'Cold-pressed fresh green rattan pepper oil with crisp numbing zest.'
  }
};

/**
 * 自动化生成高保真工匠 CAD 矢量线稿 / 手绘素描 SVG (Data URI)
 * 具备极高逼真度，包含食材真实肌理、排线阴影、尺寸标注与工匠测温针
 */
export function generateArtisanSvgBlueprint(params: {
  titleZh: string;
  titleEn: string;
  category?: string;
  sketchType?: string;
  coreTemp?: string;
  specRatio?: string;
  artisanCode?: string;
  style?: 'blueprint' | 'pencil_sketch';
}): string {
  const {
    titleZh,
    titleEn,
    category = 'western',
    sketchType = 'burger',
    coreTemp = '56°C',
    specRatio = 'RATIO 7:3',
    artisanCode = 'ARTISAN #SPEC',
    style = 'blueprint'
  } = params;

  const isBlueprint = style === 'blueprint';
  const bgColor = isBlueprint ? '#041224' : '#F7F6F0';
  const strokeMain = isBlueprint ? '#00D4FF' : '#222326';
  const strokeSub = isBlueprint ? '#0084A8' : '#5A5B60';
  const strokeAccent = isBlueprint ? '#00FF88' : '#333330';
  const strokeWarm = isBlueprint ? '#FFB800' : '#444440';
  const strokeRed = isBlueprint ? '#FF4D4D' : '#882222';
  const textMuted = isBlueprint ? '#00A3C4' : '#777670';

  // 1. 根据菜品与规格类别生成写实高精度食材结构与剖面
  let pathsSvg = '';
  const sType = sketchType.toLowerCase();

  if (sType.includes('burger')) {
    const isDouble = sType.includes('double') || titleZh.includes('双') || titleEn.toLowerCase().includes('double');
    const isTriple = sType.includes('triple') || titleZh.includes('三') || titleEn.toLowerCase().includes('triple');

    pathsSvg = `
      <!-- === 写实立体汉堡剖面素描 / REALISTIC ARTISAN BURGER === -->
      <!-- 1. 顶层布里欧面包胚 (Top Brioche Bun) -->
      <path d="M45 74 C45 28, 275 28, 275 74 L270 88 C210 93, 110 93, 50 88 Z" stroke="${strokeMain}" stroke-width="2.4" fill="none" />
      <path d="M65 68 Q160 48 255 68" stroke="${strokeSub}" stroke-dasharray="2 3" stroke-width="1.2" />
      <!-- 面包芝麻与手作气孔颗粒 (Sesame seeds & crust texture) -->
      <ellipse cx="90" cy="52" rx="2.5" ry="1.2" transform="rotate(-15 90 52)" stroke="${strokeWarm}" stroke-width="1.2" fill="none" />
      <ellipse cx="125" cy="42" rx="2.5" ry="1.2" transform="rotate(8 125 42)" stroke="${strokeWarm}" stroke-width="1.2" fill="none" />
      <ellipse cx="160" cy="38" rx="2.5" ry="1.2" transform="rotate(-5 160 38)" stroke="${strokeWarm}" stroke-width="1.2" fill="none" />
      <ellipse cx="195" cy="44" rx="2.5" ry="1.2" transform="rotate(18 195 44)" stroke="${strokeWarm}" stroke-width="1.2" fill="none" />
      <ellipse cx="230" cy="56" rx="2.5" ry="1.2" transform="rotate(-20 230 56)" stroke="${strokeWarm}" stroke-width="1.2" fill="none" />
      <ellipse cx="150" cy="58" rx="2.5" ry="1.2" transform="rotate(12 150 58)" stroke="${strokeWarm}" stroke-width="1.2" fill="none" />

      <!-- 2. 新鲜羽衣甘蓝与皱褶生菜叶 (Crisp Lettuce Waves) -->
      <path d="M38 90 Q55 82 72 90 T108 89 T144 92 T180 88 T216 91 T252 87 T282 92" stroke="${strokeAccent}" stroke-width="2" fill="none" />
      <path d="M42 93 Q70 88 110 94 T180 91 T250 94 T278 92" stroke="${strokeSub}" stroke-width="1" stroke-dasharray="3 2" fill="none" />

      <!-- 3. 第 1 层厚切和牛肉饼 (Patty 1: Thick Cut A5 Wagyu) -->
      <path d="M44 98 L276 98 C278 100, 279 116, 276 118 L44 118 C41 116, 42 100, 44 98 Z" stroke="${strokeMain}" stroke-width="2.4" fill="none" />
      <!-- 肉饼侧面原切粗糙肌理排线 (Patty cross-hatch marbling texture) -->
      <path d="M52 101 L64 115 M72 101 L84 115 M94 101 L106 115 M116 101 L128 115 M138 101 L150 115 M160 101 L172 115 M182 101 L194 115 M204 101 L216 115 M226 101 L238 115 M248 101 L260 115 M266 102 L274 112" stroke="${strokeSub}" stroke-width="1.2" />
      <!-- 炙烤烙痕 (Grill Marks) -->
      <line x1="85" y1="99" x2="115" y2="117" stroke="${strokeWarm}" stroke-width="1.8" />
      <line x1="145" y1="99" x2="175" y2="117" stroke="${strokeWarm}" stroke-width="1.8" />
      <line x1="205" y1="99" x2="235" y2="117" stroke="${strokeWarm}" stroke-width="1.8" />

      <!-- 4. 溶化车达芝士淌落 (Melting Cheddar Cheese Cascade) -->
      <path d="M42 118 L68 118 L76 134 L88 118 L150 118 L160 138 L172 118 L214 118 L224 135 L234 118 L278 118" stroke="${strokeWarm}" stroke-width="2.2" fill="none" />

      ${isDouble || isTriple ? `
        <!-- 5. 第 2 层豪华和牛肉饼 (Patty 2: Double Deck Layer) -->
        <path d="M44 126 L276 126 C278 128, 279 144, 276 146 L44 146 C41 144, 42 128, 44 126 Z" stroke="${strokeMain}" stroke-width="2.4" fill="none" />
        <path d="M52 129 L64 143 M74 129 L86 143 M96 129 L108 143 M118 129 L130 143 M140 129 L152 143 M162 129 L174 143 M184 129 L196 143 M206 129 L218 143 M228 129 L240 143 M250 129 L262 143" stroke="${strokeSub}" stroke-width="1.2" />
        <!-- 炙烤烙痕 -->
        <line x1="95" y1="127" x2="125" y2="145" stroke="${strokeWarm}" stroke-width="1.8" />
        <line x1="155" y1="127" x2="185" y2="145" stroke="${strokeWarm}" stroke-width="1.8" />
        <line x1="215" y1="127" x2="245" y2="145" stroke="${strokeWarm}" stroke-width="1.8" />
      ` : ''}

      ${isTriple ? `
        <!-- 6. 第 3 层至尊和牛肉饼 (Patty 3: Triple Deluxe Layer) -->
        <path d="M44 148 L276 148 C278 150, 279 162, 276 164 L44 164 C41 162, 42 150, 44 148 Z" stroke="${strokeMain}" stroke-width="2.2" fill="none" />
        <path d="M54 150 L66 162 M84 150 L96 162 M114 150 L126 162 M144 150 L156 162 M174 150 L186 162 M204 150 L216 162 M234 150 L246 162" stroke="${strokeSub}" stroke-width="1" />
      ` : ''}

      <!-- 7. 底层面包胚 (Bottom Bun Heel) -->
      <path d="M48 ${isTriple ? '166' : isDouble ? '150' : '124'} L272 ${isTriple ? '166' : isDouble ? '150' : '124'} C270 ${isTriple ? '184' : isDouble ? '174' : '150'}, 50 ${isTriple ? '184' : isDouble ? '174' : '150'}, 48 ${isTriple ? '166' : isDouble ? '150' : '124'} Z" stroke="${strokeMain}" stroke-width="2.4" fill="none" />
      
      <!-- 8. 工匠温控探针 (Thermal Core Sensor Pin) -->
      <line x1="160" y1="16" x2="160" y2="${isTriple ? '154' : isDouble ? '136' : '110'}" stroke="${strokeRed}" stroke-width="1.6" stroke-dasharray="4 2" />
      <circle cx="160" cy="${isTriple ? '154' : isDouble ? '136' : '110'}" r="3.5" fill="${strokeRed}" />
      <text x="166" y="24" fill="${strokeRed}" font-family="'Space Grotesk', sans-serif" font-size="7.5" font-weight="bold">CORE: ${coreTemp}</text>
    `;
  } else if (sType.includes('skewer') || category === 'skewers' || category === 'yakitori') {
    pathsSvg = `
      <!-- === 写实果木炭火烤串线稿 / ARTISAN CHARCOAL SKEWER === -->
      <!-- 1. 天然竹签主干 (Bamboo Skewer Needle) -->
      <line x1="25" y1="175" x2="295" y2="35" stroke="${strokeMain}" stroke-width="2.6" stroke-linecap="round" />
      <line x1="24" y1="176" x2="294" y2="36" stroke="${strokeSub}" stroke-width="1" stroke-dasharray="3 3" />

      <!-- 2. 四块原切肉块层次 (4 Prime Meat Chunks with Marbling Texture) -->
      <!-- 块 1 -->
      <g transform="rotate(-26 80 148)">
        <rect x="60" y="132" width="42" height="34" rx="5" stroke="${strokeMain}" stroke-width="2.2" fill="none" />
        <path d="M64 138 Q80 144 96 138 M66 148 Q82 154 98 148 M68 158 Q84 162 96 158" stroke="${strokeSub}" stroke-width="1" />
      </g>
      <!-- 块 2 -->
      <g transform="rotate(-26 132 122)">
        <rect x="110" y="106" width="45" height="35" rx="5" stroke="${strokeAccent}" stroke-width="2.2" fill="none" />
        <path d="M114 112 Q132 118 150 112 M116 122 Q134 128 150 122 M118 132 Q136 136 148 132" stroke="${strokeSub}" stroke-width="1" />
      </g>
      <!-- 块 3 -->
      <g transform="rotate(-26 182 98)">
        <rect x="160" y="82" width="44" height="34" rx="5" stroke="${strokeMain}" stroke-width="2.2" fill="none" />
        <path d="M164 88 Q182 94 198 88 M166 98 Q184 104 200 98 M168 108 Q184 112 198 108" stroke="${strokeSub}" stroke-width="1" />
      </g>
      <!-- 块 4 -->
      <g transform="rotate(-26 234 72)">
        <rect x="212" y="56" width="44" height="33" rx="5" stroke="${strokeAccent}" stroke-width="2.2" fill="none" />
        <path d="M216 62 Q234 68 250 62 M218 72 Q234 78 250 72" stroke="${strokeSub}" stroke-width="1" />
      </g>

      <!-- 3. 炭火焦香迸溅与研磨椒盐微粒 (Char Sparks & Pepper Flakes) -->
      <circle cx="120" cy="80" r="1.8" fill="${strokeWarm}" />
      <circle cx="145" cy="70" r="1.2" fill="${strokeWarm}" />
      <circle cx="175" cy="55" r="2.2" fill="${strokeWarm}" />
      <circle cx="205" cy="45" r="1.5" fill="${strokeWarm}" />
      <path d="M138 88 Q144 80 152 86" stroke="${strokeRed}" stroke-width="1.5" fill="none" />
    `;
  } else if (sType.includes('steak') || sType.includes('doneness')) {
    pathsSvg = `
      <!-- === 写实原切和牛牛排剖面 / ARTISAN STEAK CROSS-SECTION === -->
      <!-- 1. 厚切牛排整体轮廓 (Thick Cut Steak Perimeter) -->
      <path d="M48 76 C95 48, 225 48, 272 74 C282 105, 276 138, 264 154 C215 178, 105 178, 52 144 C42 120, 42 95, 48 76 Z" stroke="${strokeMain}" stroke-width="2.6" fill="none" />
      
      <!-- 2. 高温果木炭火菱形烙网印 (Diamond Sear Marks) -->
      <line x1="68" y1="78" x2="252" y2="140" stroke="${strokeWarm}" stroke-width="2" />
      <line x1="88" y1="68" x2="262" y2="126" stroke="${strokeWarm}" stroke-width="2" />
      <line x1="112" y1="60" x2="268" y2="112" stroke="${strokeWarm}" stroke-width="2" />
      <line x1="72" y1="138" x2="242" y2="74" stroke="${strokeWarm}" stroke-width="2" />
      <line x1="92" y1="148" x2="258" y2="88" stroke="${strokeWarm}" stroke-width="2" />

      <!-- 3. 五分熟粉红肉芯核心边界 (Medium Pink Core Boundary) -->
      <path d="M85 96 Q160 84 232 102 Q160 138 85 116 Z" stroke="${strokeRed}" stroke-width="1.8" stroke-dasharray="5 2.5" fill="none" />
      
      <!-- 4. 大理石雪花脂肪肌理细线 (Wagyu Marbling Fat Seams) -->
      <path d="M100 102 Q125 94 145 104 T185 98 T215 106" stroke="${strokeSub}" stroke-width="1" />
      <path d="M110 114 Q135 120 160 112 T200 118" stroke="${strokeSub}" stroke-width="1" />

      <!-- 5. 迷迭香与海盐晶体点缀 (Rosemary & Sea Salt Crystals) -->
      <path d="M125 80 L145 88 L142 82 L155 86" stroke="${strokeAccent}" stroke-width="1.5" fill="none" />
      <rect x="180" y="86" width="3" height="3" stroke="${strokeMain}" stroke-width="0.8" fill="none" />
      <rect x="202" y="94" width="3" height="3" stroke="${strokeMain}" stroke-width="0.8" fill="none" />
    `;
  } else if (sType.includes('fries') || sType.includes('crisps')) {
    pathsSvg = `
      <!-- === 写实手工黑松露金黄脆薯 / TRUFFLE FRIES BLUEPRINT === -->
      <!-- 1. 工匠立挺包装纸盒 (Kraft Paper Packaging Sleeve) -->
      <path d="M96 82 L112 180 L208 180 L224 82 Z" stroke="${strokeMain}" stroke-width="2.5" fill="none" />
      <path d="M124 82 L128 172 M160 82 L160 172 M196 82 L192 172" stroke="${strokeSub}" stroke-width="1" stroke-dasharray="3 3" />
      
      <!-- 2. 立体层叠直切薯条 (Layered Golden Potato Fries) -->
      <path d="M108 82 L104 36 L120 38 L122 82" stroke="${strokeAccent}" stroke-width="2" fill="none" />
      <path d="M126 82 L132 24 L148 26 L144 82" stroke="${strokeMain}" stroke-width="2" fill="none" />
      <path d="M152 82 L160 16 L176 18 L172 82" stroke="${strokeAccent}" stroke-width="2" fill="none" />
      <path d="M180 82 L192 28 L206 32 L196 82" stroke="${strokeMain}" stroke-width="2" fill="none" />
      <path d="M140 82 L146 44 L160 46 L154 82" stroke="${strokeWarm}" stroke-width="1.8" fill="none" />

      <!-- 3. 手刨黑松露薄片与天然海盐结晶 (Shaved Truffle & Sea Salt) -->
      <ellipse cx="132" cy="42" rx="3" ry="1.8" transform="rotate(-20 132 42)" fill="${strokeWarm}" opacity="0.9" />
      <ellipse cx="162" cy="34" rx="3.5" ry="2" transform="rotate(15 162 34)" fill="${strokeWarm}" opacity="0.9" />
      <ellipse cx="186" cy="48" rx="2.8" ry="1.8" transform="rotate(-30 186 48)" fill="${strokeWarm}" opacity="0.9" />
      <circle cx="120" cy="50" r="1.5" fill="${strokeMain}" />
      <circle cx="150" cy="62" r="1.5" fill="${strokeMain}" />
      <circle cx="178" cy="65" r="1.5" fill="${strokeMain}" />
    `;
  } else if (sType.includes('oyster') || sType.includes('seafood')) {
    pathsSvg = `
      <!-- === 写实炭烤乳山大生蚝 / CHARCOAL ROASTED OYSTER === -->
      <!-- 1. 生蚝外壳层叠弧纹 (Layered Shell Rings) -->
      <path d="M52 110 C50 62, 110 40, 190 48 C250 56, 276 96, 268 132 C255 168, 175 182, 100 172 C62 164, 54 138, 52 110 Z" stroke="${strokeMain}" stroke-width="2.6" fill="none" />
      <path d="M72 108 C70 72, 115 56, 180 62 C230 68, 252 100, 246 128 C235 156, 168 168, 108 158" stroke="${strokeSub}" stroke-width="1.4" fill="none" />
      <path d="M96 110 C96 86, 130 76, 175 80 C212 84, 228 106, 222 124 C212 144, 160 152, 120 146" stroke="${strokeSub}" stroke-width="1" stroke-dasharray="3 2" fill="none" />

      <!-- 2. 肥美饱满生蚝肉 (Plump Tender Oyster Meat) -->
      <path d="M105 112 C105 92, 138 84, 168 88 C198 92, 208 114, 202 128 C194 142, 150 148, 122 142 C108 138, 105 125, 105 112 Z" stroke="${strokeAccent}" stroke-width="2.2" fill="none" />
      
      <!-- 3. 金银蒜蓉颗粒与秘制鲜汁 (Golden Garlic Granules & Scallions) -->
      <circle cx="132" cy="105" r="2" fill="${strokeWarm}" />
      <circle cx="145" cy="112" r="2.2" fill="${strokeWarm}" />
      <circle cx="158" cy="106" r="2" fill="${strokeWarm}" />
      <circle cx="170" cy="116" r="2.5" fill="${strokeWarm}" />
      <circle cx="140" cy="124" r="1.8" fill="${strokeAccent}" />
      <circle cx="160" cy="126" r="1.8" fill="${strokeAccent}" />
    `;
  } else if (sType.includes('drink') || category === 'drinks') {
    pathsSvg = `
      <!-- === 写实极夜冷萃浓缩咖啡 / COLD BREW GLASS BLUEPRINT === -->
      <!-- 1. 双层耐热玻璃杯身 (Double Wall Glass Tumbler) -->
      <path d="M104 46 L120 178 C124 186, 196 186, 200 178 L216 46 Z" stroke="${strokeMain}" stroke-width="2.6" fill="none" />
      <path d="M112 50 L126 172 C129 178, 191 178, 194 172 L208 50 Z" stroke="${strokeSub}" stroke-width="1.2" stroke-dasharray="3 2" fill="none" />

      <!-- 2. 咖啡液面与微气泡层 (Liquid Meniscus & Foam) -->
      <ellipse cx="160" cy="68" rx="46" ry="9" stroke="${strokeAccent}" stroke-width="2" fill="none" />
      
      <!-- 3. 立体多面体透明冰块 (3D Polyhedral Ice Cubes) -->
      <!-- 冰块 1 -->
      <polygon points="134,86 160,82 166,104 140,108" stroke="${strokeMain}" stroke-width="1.8" fill="none" />
      <polygon points="160,82 174,90 180,112 166,104" stroke="${strokeSub}" stroke-width="1.4" fill="none" />
      <!-- 冰块 2 -->
      <polygon points="144,116 172,112 178,136 150,140" stroke="${strokeMain}" stroke-width="1.8" fill="none" />

      <!-- 4. 低温冷萃慢速滴管 (Precision Cold Drip Nozzle) -->
      <line x1="160" y1="16" x2="160" y2="52" stroke="${strokeAccent}" stroke-width="1.8" stroke-dasharray="3 3" />
      <circle cx="160" cy="56" r="3" fill="${strokeAccent}" />
    `;
  } else if (sType.includes('sauce') || sType.includes('flavor') || sType.includes('dip')) {
    pathsSvg = `
      <!-- === 写实手工熬制酱料 / 秘制风味素描 / ARTISAN SAUCE & FLAVOR SKETCH === -->
      <!-- 1. 工匠陶瓷酱料盅 (Artisan Ceramic Ramekin / Sauce Boat) -->
      <path d="M72 138 C72 165, 248 165, 248 138 L256 94 C260 78, 244 74, 230 80 L90 80 C76 74, 60 78, 64 94 Z" stroke="${strokeMain}" stroke-width="2.4" fill="none" />
      <!-- 盅身反光与排线阴影 (Cross-hatch shading on porcelain curve) -->
      <path d="M82 102 C82 142, 238 142, 238 102" stroke="${strokeSub}" stroke-width="1.2" stroke-dasharray="3 2" fill="none" />
      <path d="M96 112 L106 136 M116 114 L126 138 M136 116 L146 140 M174 116 L184 140 M194 114 L204 138 M214 112 L224 136" stroke="${strokeSub}" stroke-width="0.9" />

      <!-- 2. 浓郁酱汁液面与慢熬慢滴 (Viscous Simmering Sauce & Drips) -->
      <ellipse cx="160" cy="84" rx="76" ry="16" stroke="${strokeWarm}" stroke-width="2.2" fill="none" />
      <path d="M124 84 Q140 76 160 84 T196 84" stroke="${strokeAccent}" stroke-width="1.6" fill="none" />

      <!-- 3. 工艺慢熬拉丝滴落挂壁 (Slow Viscous Drips) -->
      <path d="M102 94 Q106 122 108 116 Q110 110 114 94" stroke="${strokeWarm}" stroke-width="1.8" fill="none" />
      <path d="M208 94 Q212 128 215 120 Q218 112 222 94" stroke="${strokeWarm}" stroke-width="1.8" fill="none" />

      <!-- 4. 手磨粗粒黑胡椒 / 黑松露碎屑颗粒 (Fresh Cracked Pepper & Truffle Granules) -->
      <circle cx="138" cy="80" r="1.8" fill="${strokeMain}" />
      <circle cx="152" cy="88" r="2.2" fill="${strokeMain}" />
      <circle cx="168" cy="82" r="1.5" fill="${strokeMain}" />
      <circle cx="182" cy="86" r="2.0" fill="${strokeMain}" />
      <circle cx="145" cy="84" r="1.2" fill="${strokeWarm}" />
      <circle cx="175" cy="80" r="1.4" fill="${strokeWarm}" />

      <!-- 5. 罗勒新鲜香草叶对生素描 (Herb Sprig) -->
      <path d="M160 82 Q172 62 186 66 Q178 78 160 82 Z" stroke="${strokeAccent}" stroke-width="1.5" fill="none" />
      <path d="M160 82 Q148 64 134 68 Q142 80 160 82 Z" stroke="${strokeAccent}" stroke-width="1.5" fill="none" />
      <line x1="160" y1="84" x2="160" y2="60" stroke="${strokeAccent}" stroke-width="1.2" />

      <!-- 6. 慢熬温控指针 (Simmer Thermal Pin) -->
      <line x1="265" y1="35" x2="210" y2="92" stroke="${strokeRed}" stroke-width="1.5" stroke-dasharray="4 2" />
      <circle cx="210" cy="92" r="3" fill="${strokeRed}" />
      <text x="238" y="32" fill="${strokeRed}" font-family="'Space Grotesk', sans-serif" font-size="7.5" font-weight="bold">SLOW SIMMER: ${coreTemp}</text>
    `;
  } else if (sType.includes('spice') || sType.includes('spiciness') || sType.includes('chili') || sType.includes('pepper')) {
    pathsSvg = `
      <!-- === 写实川香红椒与辣椒素标定素描 / CHILI & CAPSAICIN CALIBRATION === -->
      <!-- 1. 经典弯角红辣椒外轮廓 (Sichuan Chili Pepper Silhouette) -->
      <path d="M56 68 C80 50, 185 45, 238 78 C265 95, 282 128, 276 150 C268 140, 245 125, 220 108 C175 78, 90 74, 56 68 Z" stroke="${strokeMain}" stroke-width="2.5" fill="none" />
      <!-- 辣椒背部受光与石墨排线 (Graphite cross-hatch contour) -->
      <path d="M85 64 Q170 58 235 88" stroke="${strokeWarm}" stroke-width="1.5" stroke-dasharray="3 2" fill="none" />
      <path d="M100 70 L110 82 M120 70 L130 84 M140 70 L150 86 M160 72 L170 88 M180 74 L190 92 M200 78 L210 96" stroke="${strokeSub}" stroke-width="1" />

      <!-- 2. 辣椒横截面剖面与辣椒籽 (Chili Seeds & Core Placenta) -->
      <ellipse cx="95" cy="120" rx="36" ry="24" transform="rotate(-15 95 120)" stroke="${strokeMain}" stroke-width="2.2" fill="none" />
      <ellipse cx="95" cy="120" rx="26" ry="16" transform="rotate(-15 95 120)" stroke="${strokeAccent}" stroke-width="1.2" stroke-dasharray="2 2" fill="none" />
      <!-- 核心辣椒籽颗粒 (Capsaicin Seeds) -->
      <ellipse cx="85" cy="115" rx="3.5" ry="2.2" transform="rotate(20 85 115)" stroke="${strokeWarm}" stroke-width="1.2" fill="none" />
      <ellipse cx="98" cy="112" rx="3.5" ry="2.2" transform="rotate(-30 98 112)" stroke="${strokeWarm}" stroke-width="1.2" fill="none" />
      <ellipse cx="106" cy="122" rx="3.5" ry="2.2" transform="rotate(15 106 122)" stroke="${strokeWarm}" stroke-width="1.2" fill="none" />
      <ellipse cx="90" cy="126" rx="3.5" ry="2.2" transform="rotate(-10 90 126)" stroke="${strokeWarm}" stroke-width="1.2" fill="none" />

      <!-- 3. 辣度辛香挥发气旋 (Spicy Aroma Convection Spirals) -->
      <path d="M140 135 Q160 115 155 95 T175 65" stroke="${strokeRed}" stroke-width="1.4" stroke-dasharray="4 3" fill="none" />
      <path d="M165 145 Q185 125 180 105 T200 75" stroke="${strokeRed}" stroke-width="1.4" stroke-dasharray="4 3" fill="none" />

      <!-- 4. 绿蒂把手 (Chili Stem) -->
      <path d="M56 68 C45 62, 38 48, 30 42 C32 46, 36 56, 48 64 Z" stroke="${strokeAccent}" stroke-width="2" fill="none" />

      <!-- 5. 辣椒素标尺与刻度线 (Capsaicin Scale / Scoville Calibration) -->
      <line x1="230" y1="130" x2="230" y2="182" stroke="${strokeMain}" stroke-width="1.2" />
      <line x1="225" y1="135" x2="235" y2="135" stroke="${strokeMain}" stroke-width="1" />
      <line x1="225" y1="150" x2="235" y2="150" stroke="${strokeMain}" stroke-width="1" />
      <line x1="225" y1="165" x2="235" y2="165" stroke="${strokeMain}" stroke-width="1" />
      <line x1="225" y1="180" x2="235" y2="180" stroke="${strokeMain}" stroke-width="1" />
      <text x="240" y="158" fill="${strokeRed}" font-family="'Space Grotesk', sans-serif" font-size="7" font-weight="bold">CAPSAICIN / ${specRatio}</text>
    `;
  } else if (sType.includes('salad') || sType.includes('vegetable') || sType.includes('greens')) {
    pathsSvg = `
      <!-- === 写实水培冷鲜田园沙拉素描 / HYDROPONIC SALAD SKETCH === -->
      <!-- 1. 清脆生菜叶片舒展 (Lettuce Leaves Contour) -->
      <path d="M70 145 C60 90, 110 52, 160 60 C210 52, 260 90, 250 145 C210 165, 110 165, 70 145 Z" stroke="${strokeMain}" stroke-width="2.4" fill="none" />
      <path d="M88 135 C80 98, 120 72, 160 76 C200 72, 240 98, 232 135" stroke="${strokeAccent}" stroke-width="1.5" fill="none" />
      <!-- 叶脉纹理 (Leaf Veins) -->
      <path d="M160 145 L160 80 M160 120 L135 105 M160 120 L185 105 M160 100 L140 90 M160 100 L180 90" stroke="${strokeSub}" stroke-width="1.2" />

      <!-- 2. 小番茄对切截面 (Cherry Tomato Halves) -->
      <ellipse cx="115" cy="125" rx="18" ry="14" transform="rotate(-15 115 125)" stroke="${strokeRed}" stroke-width="2" fill="none" />
      <circle cx="112" cy="123" r="4" stroke="${strokeWarm}" stroke-width="1.2" fill="none" />
      <circle cx="120" cy="127" r="3.5" stroke="${strokeWarm}" stroke-width="1.2" fill="none" />

      <!-- 3. 水润露珠与初榨橄榄油乳化光斑 (Dew Drops & Extra Virgin Emulsion) -->
      <circle cx="175" cy="115" r="3" stroke="${strokeAccent}" stroke-width="1.2" fill="none" />
      <circle cx="195" cy="130" r="2.5" stroke="${strokeAccent}" stroke-width="1.2" fill="none" />
      <circle cx="150" cy="138" r="2" stroke="${strokeWarm}" stroke-width="1" fill="none" />
      <text x="210" y="48" fill="${strokeAccent}" font-family="'Space Grotesk', sans-serif" font-size="7.5" font-weight="bold">CHILLED: 4°C</text>
    `;
  } else {
    // 默认高规格主厨餐盘分解图
    pathsSvg = `
      <!-- === 通用工匠餐品工程分解盘饰 / ARTISAN CLOCHE & PLATING === -->
      <!-- 1. 宽边法式餐盘同心圆 (Wide Rim Plating) -->
      <ellipse cx="160" cy="112" rx="116" ry="54" stroke="${strokeMain}" stroke-width="2.6" fill="none" />
      <ellipse cx="160" cy="112" rx="86" ry="38" stroke="${strokeSub}" stroke-width="1.5" stroke-dasharray="4 2" fill="none" />
      <ellipse cx="160" cy="112" rx="52" ry="24" stroke="${strokeAccent}" stroke-width="2" fill="none" />

      <!-- 2. 食材核心焦点 (Plated Food Structure) -->
      <path d="M128 108 C135 90, 185 90, 192 108 C185 124, 135 124, 128 108 Z" stroke="${strokeWarm}" stroke-width="2.2" fill="none" />
      <line x1="140" y1="102" x2="180" y2="114" stroke="${strokeWarm}" stroke-width="1.6" />
      <line x1="144" y1="114" x2="176" y2="102" stroke="${strokeWarm}" stroke-width="1.6" />

      <!-- 3. 中心十字基准线 (Center Crosshairs) -->
      <line x1="160" y1="36" x2="160" y2="186" stroke="${strokeMain}" stroke-width="1" stroke-dasharray="3 4" />
      <line x1="28" y1="112" x2="292" y2="112" stroke="${strokeMain}" stroke-width="1" stroke-dasharray="3 4" />
    `;
  }

  // 2. 拼接成完整精美 SVG
  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="100%" height="100%">
      <defs>
        ${isBlueprint ? `
          <!-- CAD 经典双层工程网格 -->
          <pattern id="cadGridSmall" width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M 16 0 L 0 0 0 16" fill="none" stroke="#082846" stroke-width="0.75"/>
          </pattern>
          <pattern id="cadGridLarge" width="64" height="64" patternUnits="userSpaceOnUse">
            <rect width="64" height="64" fill="url(#cadGridSmall)" />
            <path d="M 64 0 L 0 0 0 64" fill="none" stroke="#0B3C68" stroke-width="1.3"/>
          </pattern>
        ` : `
          <!-- 经典素描羊皮纸手绘纹理 -->
          <pattern id="sketchGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E6E5DC" stroke-width="0.5"/>
          </pattern>
        `}
      </defs>

      <!-- 背景画布 -->
      <rect width="320" height="200" fill="${bgColor}" />
      <rect width="320" height="200" fill="url(${isBlueprint ? '#cadGridLarge' : '#sketchGrid'})" />

      <!-- 顶部 HUD 状态栏 (中文在前，英文在后) -->
      <g>
        <rect x="10" y="8" width="156" height="16" fill="${isBlueprint ? '#07243E' : '#E8E7DF'}" stroke="${strokeMain}" stroke-width="0.8" />
        <text x="15" y="19.5" fill="${strokeMain}" font-family="'Space Grotesk', sans-serif" font-size="8.5" font-weight="bold">${artisanCode} · ${isBlueprint ? '工匠蓝图 CAD' : '手绘素描 SKETCH'}</text>

        <rect x="230" y="8" width="80" height="16" fill="${isBlueprint ? '#07243E' : '#E8E7DF'}" stroke="${strokeAccent}" stroke-width="0.8" />
        <text x="236" y="19.5" fill="${strokeAccent}" font-family="'Space Grotesk', sans-serif" font-size="8.5" font-weight="bold">温控: ${coreTemp}</text>
      </g>

      <!-- 核心写实矢量图元 -->
      <g id="artisan-paths">
        ${pathsSvg}
      </g>

      <!-- 底部精密公差尺寸标尺 -->
      <g>
        <line x1="25" y1="188" x2="295" y2="188" stroke="${strokeMain}" stroke-width="1" />
        <line x1="25" y1="183" x2="25" y2="193" stroke="${strokeMain}" stroke-width="1" />
        <line x1="295" y1="183" x2="295" y2="193" stroke="${strokeMain}" stroke-width="1" />
        <line x1="160" y1="185" x2="160" y2="191" stroke="${strokeMain}" stroke-width="1" />
        <rect x="110" y="181" width="100" height="12" fill="${bgColor}" />
        <text x="160" y="189.5" fill="${strokeMain}" font-family="'Space Grotesk', sans-serif" font-size="7.5" font-weight="bold" text-anchor="middle">配比: ${specRatio}</text>
      </g>

      <!-- 菜品水印与工艺签名 (中文在前，英文在后) -->
      <g>
        <text x="14" y="162" fill="${isBlueprint ? '#FFFFFF' : '#1A1C1B'}" opacity="0.95" font-family="sans-serif" font-size="11" font-weight="bold">${titleZh}</text>
        <text x="14" y="174" fill="${textMuted}" font-family="'Space Grotesk', sans-serif" font-size="8" font-weight="bold" text-transform="uppercase">${titleEn}</text>
      </g>

      <!-- 右下角激光准星 HUD -->
      <g transform="translate(285, 155)">
        <circle cx="0" cy="0" r="7" stroke="${strokeMain}" stroke-width="0.8" fill="none" />
        <line x1="0" y1="-10" x2="0" y2="10" stroke="${strokeMain}" stroke-width="0.8" />
        <line x1="-10" y1="0" x2="10" y2="0" stroke="${strokeMain}" stroke-width="0.8" />
        <text x="0" y="14" fill="${strokeMain}" font-family="'Space Grotesk', sans-serif" font-size="6" text-anchor="middle">${isBlueprint ? '1:1 CAD' : 'SKETCH'}</text>
      </g>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svgContent.trim())}`;
}

/**
 * 快速箱式模糊算法 (用于素描管线的暗房色彩减淡)
 */
function fastBoxBlur(data: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const output = new Uint8Array(data.length);
  const size = radius * 2 + 1;

  // 水平方向模糊
  const temp = new Uint8Array(data.length);
  for (let y = 0; y < height; y++) {
    let sum = 0;
    for (let i = -radius; i <= radius; i++) {
      const x = Math.min(Math.max(i, 0), width - 1);
      sum += data[y * width + x];
    }
    for (let x = 0; x < width; x++) {
      temp[y * width + x] = Math.round(sum / size);
      const nextX = Math.min(x + radius + 1, width - 1);
      const prevX = Math.max(x - radius, 0);
      sum += data[y * width + nextX] - data[y * width + prevX];
    }
  }

  // 垂直方向模糊
  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let i = -radius; i <= radius; i++) {
      const y = Math.min(Math.max(i, 0), height - 1);
      sum += temp[y * width + x];
    }
    for (let y = 0; y < height; y++) {
      output[y * width + x] = Math.round(sum / size);
      const nextY = Math.min(y + radius + 1, height - 1);
      const prevY = Math.max(y - radius, 0);
      sum += temp[nextY * width + x] - temp[prevY * width + x];
    }
  }

  return output;
}

/**
 * 纯前端工业级实物照片转写实素描 / 工匠蓝图 (Photo to Realistic Sketch / Blueprint Converter)
 * 采用色彩减淡 (Color Dodge Blending) + 灰度高反差 + CAD 网格复合算法
 */
export function convertPhotoToBlueprintCanvas(
  imageUrl: string,
  callback: (resultDataUrl: string) => void,
  options?: 'blueprint' | 'pencil_sketch' | {
    mode?: 'blueprint' | 'pencil_sketch';
    titleZh?: string;
    titleEn?: string;
  }
): void {
  const mode = typeof options === 'string' ? options : options?.mode || 'blueprint';
  const isBlueprint = mode === 'blueprint';
  const titleZh = typeof options === 'object' ? options?.titleZh : undefined;
  const titleEn = typeof options === 'object' ? options?.titleEn : undefined;

  const img = new Image();
  img.crossOrigin = 'anonymous';

  img.onload = () => {
    try {
      const width = 640;
      const height = 400;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        callback(fallbackSvg());
        return;
      }

      // 1. 居中覆盖绘制原图
      ctx.drawImage(img, 0, 0, width, height);

      // 2. 提取像素做色彩减淡素描 (Color Dodge Sketch)
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;
      const totalPixels = width * height;

      // 灰度化
      const gray = new Uint8Array(totalPixels);
      for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4;
        gray[i] = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
      }

      // 反相
      const inverted = new Uint8Array(totalPixels);
      for (let i = 0; i < totalPixels; i++) {
        inverted[i] = 255 - gray[i];
      }

      // 盒式模糊 (半径 5)
      const blurred = fastBoxBlur(inverted, width, height, 5);

      // 颜色减淡合成 (Color Dodge): dodge = (gray * 256) / (255 - blurred + 1)
      const sketch = new Uint8Array(totalPixels);
      for (let i = 0; i < totalPixels; i++) {
        const d = (gray[i] * 256) / (255 - blurred[i] + 1);
        sketch[i] = Math.min(255, Math.max(0, Math.floor(d)));
      }

      // 3. 将素描结果映射回 Canvas 像素
      if (isBlueprint) {
        // 蓝图模式：黑色/深灰线稿 -> 荧光青色 (#00d4ff)；白色背景 -> 深蓝底图 (#041224)
        for (let i = 0; i < totalPixels; i++) {
          const idx = i * 4;
          const s = sketch[i]; // 255 是原本的白，0 是原本的黑线条
          const lineIntensity = (255 - s) / 255; // 线条越深，值越接近 1

          // 基础深蓝背景 #041224 (4, 18, 36)
          // 亮青线条 #00d4ff (0, 212, 255)
          data[idx] = Math.round(4 + (0 - 4) * lineIntensity + lineIntensity * 60);
          data[idx + 1] = Math.round(18 + (212 - 18) * lineIntensity);
          data[idx + 2] = Math.round(36 + (255 - 36) * lineIntensity);
          data[idx + 3] = 255;
        }
      } else {
        // 素描手绘模式：米白纸底 (#f6f5f0) + 炭笔石墨排线 (#222220)
        for (let i = 0; i < totalPixels; i++) {
          const idx = i * 4;
          const s = sketch[i];
          const darkness = (255 - s) / 255;

          data[idx] = Math.round(246 - darkness * 210);
          data[idx + 1] = Math.round(245 - darkness * 210);
          data[idx + 2] = Math.round(240 - darkness * 205);
          data[idx + 3] = 255;
        }
      }

      ctx.putImageData(imgData, 0, 0);

      // 4. 叠加 CAD 网格与标尺 HUD
      ctx.save();
      if (isBlueprint) {
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.15)';
        ctx.lineWidth = 1;
        for (let x = 0; x < width; x += 32) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += 32) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        // 外框与 HUD
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(10, 10, width - 20, height - 20);

        ctx.fillStyle = '#00d4ff';
        ctx.font = 'bold 12px "Space Grotesk", sans-serif';
        ctx.fillText('REALISTIC BLUEPRINT / 智能实物工匠蓝图', 24, 32);
        ctx.font = '10px "Space Grotesk", sans-serif';
        ctx.fillText('CALIBRATED COLOR-DODGE SKETCH · 1:1 GEOMETRY', 24, 48);

        // 底部标尺
        ctx.strokeStyle = '#00d4ff';
        ctx.beginPath();
        ctx.moveTo(24, height - 24);
        ctx.lineTo(width - 24, height - 24);
        ctx.stroke();
        ctx.font = '10px "Space Grotesk", sans-serif';
        ctx.fillText('TOLERANCE ±0.05mm · RATIO 7:3', width / 2 - 80, height - 28);
      } else {
        // 铅笔素描 HUD
        ctx.strokeStyle = '#222220';
        ctx.lineWidth = 1;
        ctx.strokeRect(12, 12, width - 24, height - 24);

        ctx.fillStyle = '#222220';
        ctx.font = 'bold 12px serif';
        ctx.fillText('ARTISAN PENCIL SKETCH / 工匠艺术手绘素描', 24, 34);
        ctx.font = '10px "Space Grotesk", sans-serif';
        ctx.fillText('HAND-CRAFTED MARBLING & PROFILE', 24, 50);
      }
      ctx.restore();

      const result = canvas.toDataURL('image/png');
      callback(result);
    } catch {
      // 跨域或沙箱受限时，使用写实高精度矢量素描生成兜底，绝不传回假图或粗糙占位
      callback(fallbackSvg());
    }
  };

  img.onerror = () => {
    callback(fallbackSvg());
  };

  function fallbackSvg(): string {
    return generateArtisanSvgBlueprint({
      titleZh: titleZh || '工匠素描线稿',
      titleEn: titleEn || 'ARTISAN SKETCH',
      sketchType: 'burger_double',
      style: mode
    });
  }

  img.src = imageUrl;
}

/**
 * 自动化解析/生成变体专属媒体与线稿 (Auto-Resolve Variant Media & Blueprint)
 */
export function resolveVariantBlueprint(
  dish: DishItem,
  variant: DishVariant | null
): {
  photoUrl: string;
  blueprintUrl: string;
  artisanCode: string;
  coreTemp: string;
  specRatio: string;
  noteZh: string;
  noteEn: string;
} {
  // 基础参数
  const basePhoto = variant?.imageUrl || dish.imageUrl;
  const artisanCode = variant?.artisanCode || dish.artisanCode || `ARTISAN #${dish.id.replace(/\D/g, '').padStart(2, '0') || '01'}`;
  const coreTemp = variant?.coreTemp || dish.coreTemp || '56°C';
  const specRatio = variant?.specRatio || dish.specRatio || 'RATIO 7:3';

  // 1. 如果变体显式配置了 blueprintImageUrl，直接优先使用
  if (variant?.blueprintImageUrl) {
    return {
      photoUrl: basePhoto,
      blueprintUrl: variant.blueprintImageUrl,
      artisanCode,
      coreTemp,
      specRatio,
      noteZh: variant.description || dish.description || '工匠图纸规格标定。',
      noteEn: variant.enName || dish.enName || 'Artisan precision blueprint.'
    };
  }

  // 2. 尝试从 fieldSelectorMediaMap 查找
  const selectorKey = `variant_${variant?.id || 'default'}`;
  if (dish.fieldSelectorMediaMap && dish.fieldSelectorMediaMap[selectorKey]?.blueprintImageUrl) {
    const media = dish.fieldSelectorMediaMap[selectorKey];
    return {
      photoUrl: media.imageUrl || basePhoto,
      blueprintUrl: media.blueprintImageUrl,
      artisanCode,
      coreTemp,
      specRatio,
      noteZh: media.sketchNoteZh || variant?.description || dish.description,
      noteEn: media.sketchNoteEn || variant?.enName || dish.enName
    };
  }

  // 3. 智能关键词匹配生成高保真写实矢量线稿
  const vName = (variant?.name || dish.name).toLowerCase();
  let detectedType = 'burger_single';
  if (vName.includes('双') || vName.includes('double') || vName.includes('两层') || vName.includes('厚切')) {
    detectedType = 'burger_double';
  } else if (vName.includes('三') || vName.includes('triple') || vName.includes('盛宴')) {
    detectedType = 'burger_triple';
  } else if (vName.includes('串') || dish.category === 'skewers' || dish.category === 'yakitori') {
    detectedType = 'skewer';
  } else if (vName.includes('排') || vName.includes('steak') || dish.category === 'western') {
    detectedType = 'steak';
  } else if (vName.includes('咖') || vName.includes('饮') || dish.category === 'drinks') {
    detectedType = 'drink';
  } else if (vName.includes('蚝') || dish.category === 'baked') {
    detectedType = 'oyster';
  }

  const generatedBlueprint = generateArtisanSvgBlueprint({
    titleZh: variant ? `${variant.name}` : dish.name,
    titleEn: variant?.enName || dish.enName || 'PRECISION CAD DRAFT',
    category: dish.category,
    sketchType: variant?.sketchType || detectedType,
    coreTemp,
    specRatio,
    artisanCode,
    style: 'blueprint'
  });

  return {
    photoUrl: basePhoto,
    blueprintUrl: generatedBlueprint,
    artisanCode,
    coreTemp,
    specRatio,
    noteZh: variant?.description || '工匠工程线稿标定，多层组分精准装配。',
    noteEn: variant?.enName || 'Precision engineering CAD draft, calibrated for thermal balance.'
  };
}

export interface ResolvedOptionBlueprint {
  photoUrl: string;
  blueprintUrl: string;
  sketchUrl: string;
  sketchType: string;
  noteZh: string;
  noteEn: string;
  coreMetricZh: string;
  coreMetricEn: string;
  artisanCode?: string;
  coreTemp?: string;
  specRatio?: string;
}

/**
 * 自动化解析选项/配菜/口味的线稿与素描图纸 (Auto-Resolve Option or Flavor Blueprint & Sketch)
 */
export function resolveOptionBlueprint(
  dish: DishItem,
  groupName: string,
  choice: DishOptionChoice | null
): ResolvedOptionBlueprint {
  const label = choice?.label || '';
  const labelLower = label.toLowerCase();

  // 1. 如果 choice 自身已配置 blueprintImageUrl
  if (choice?.blueprintImageUrl) {
    const sketchUrl = generateArtisanSvgBlueprint({
      titleZh: label,
      titleEn: choice.enLabel || 'CUSTOM CRAFT',
      category: dish.category,
      sketchType: choice.sketchType || 'general',
      coreTemp: 'STANDARD',
      specRatio: '1:1',
      artisanCode: 'OPTION #SPEC',
      style: 'pencil_sketch'
    });

    return {
      photoUrl: choice.imageUrl || dish.imageUrl,
      blueprintUrl: choice.blueprintImageUrl,
      sketchUrl,
      sketchType: choice.sketchType || 'general',
      noteZh: choice.description || '工匠精工定制配菜工艺。',
      noteEn: 'Artisan customized preparation craft.',
      coreMetricZh: '定制工艺标定',
      coreMetricEn: 'CUSTOM SPEC',
      artisanCode: 'OPTION #SPEC',
      coreTemp: 'STANDARD',
      specRatio: '1:1'
    };
  }

  // 2. 从 fieldSelectorMediaMap 查找
  const selectorKey = `option_${label}`;
  if (dish.fieldSelectorMediaMap && dish.fieldSelectorMediaMap[selectorKey]) {
    const item = dish.fieldSelectorMediaMap[selectorKey];
    const sketchType = item.sketchType || 'general';
    const coreTemp = 'STANDARD';
    const specRatio = '1:1';
    const artisanCode = 'OPTION #SPEC';

    const blueprintUrl = item.blueprintImageUrl || generateArtisanSvgBlueprint({
      titleZh: item.labelZh,
      titleEn: item.labelEn,
      category: dish.category,
      sketchType,
      coreTemp,
      specRatio,
      artisanCode,
      style: 'blueprint'
    });

    const sketchUrl = generateArtisanSvgBlueprint({
      titleZh: item.labelZh,
      titleEn: item.labelEn,
      category: dish.category,
      sketchType,
      coreTemp,
      specRatio,
      artisanCode,
      style: 'pencil_sketch'
    });

    return {
      photoUrl: item.imageUrl || choice?.imageUrl || dish.imageUrl,
      blueprintUrl,
      sketchUrl,
      sketchType,
      noteZh: item.sketchNoteZh || '定制工序已标定。',
      noteEn: item.sketchNoteEn || 'Custom craft calibrated.',
      coreMetricZh: item.coreMetricZh || '标准工艺',
      coreMetricEn: item.coreMetricEn || 'STANDARD',
      artisanCode,
      coreTemp,
      specRatio
    };
  }

  // 3. 智能语义推断
  if (labelLower.includes('truffle') || labelLower.includes('薯条') || labelLower.includes('fries')) {
    const preset = PRESET_SELECTOR_MEDIA_BANK['truffle_fries'];
    const sketchUrl = generateArtisanSvgBlueprint({
      titleZh: '手刨黑松露金黄薯条',
      titleEn: 'TRUFFLE FRIES',
      category: 'snacks',
      sketchType: 'fries',
      coreTemp: '180°C',
      specRatio: '1:1.2',
      artisanCode: 'SIDE #FRIES',
      style: 'pencil_sketch'
    });
    const blueprintUrl = generateArtisanSvgBlueprint({
      titleZh: '手刨黑松露金黄薯条',
      titleEn: 'TRUFFLE FRIES',
      category: 'snacks',
      sketchType: 'fries',
      coreTemp: '180°C',
      specRatio: '1:1.2',
      artisanCode: 'SIDE #FRIES',
      style: 'blueprint'
    });

    return {
      photoUrl: preset.imageUrl,
      blueprintUrl,
      sketchUrl,
      sketchType: 'fries',
      noteZh: preset.noteZh,
      noteEn: preset.noteEn,
      coreMetricZh: '双重脆炸 180°C',
      coreMetricEn: 'TWICE-FRIED 180°C',
      artisanCode: 'SIDE #FRIES',
      coreTemp: '180°C',
      specRatio: '1:1.2'
    };
  }

  if (labelLower.includes('salad') || labelLower.includes('沙拉')) {
    const preset = PRESET_SELECTOR_MEDIA_BANK['garden_salad'];
    const sketchUrl = generateArtisanSvgBlueprint({
      titleZh: '田园清爽时蔬沙拉',
      titleEn: 'GARDEN SALAD',
      category: 'snacks',
      sketchType: 'salad',
      coreTemp: '4°C',
      specRatio: '4:1',
      artisanCode: 'SIDE #SALAD',
      style: 'pencil_sketch'
    });
    const blueprintUrl = generateArtisanSvgBlueprint({
      titleZh: '田园清爽时蔬沙拉',
      titleEn: 'GARDEN SALAD',
      category: 'snacks',
      sketchType: 'salad',
      coreTemp: '4°C',
      specRatio: '4:1',
      artisanCode: 'SIDE #SALAD',
      style: 'blueprint'
    });

    return {
      photoUrl: preset.imageUrl,
      blueprintUrl,
      sketchUrl,
      sketchType: 'salad',
      noteZh: preset.noteZh,
      noteEn: preset.noteEn,
      coreMetricZh: '水培冷鲜 4°C',
      coreMetricEn: 'COLD-HYDRO 4°C',
      artisanCode: 'SIDE #SALAD',
      coreTemp: '4°C',
      specRatio: '4:1'
    };
  }

  if (labelLower.includes('sweet potato') || labelLower.includes('红薯') || labelLower.includes('crisps')) {
    const preset = PRESET_SELECTOR_MEDIA_BANK['sweet_potato_crisps'];
    const sketchUrl = generateArtisanSvgBlueprint({
      titleZh: '手工香脆甘薯薄片',
      titleEn: 'SWEET POTATO CRISPS',
      category: 'snacks',
      sketchType: 'crisps',
      coreTemp: '165°C',
      specRatio: '1:1',
      artisanCode: 'SIDE #CRISPS',
      style: 'pencil_sketch'
    });
    const blueprintUrl = generateArtisanSvgBlueprint({
      titleZh: '手工香脆甘薯薄片',
      titleEn: 'SWEET POTATO CRISPS',
      category: 'snacks',
      sketchType: 'crisps',
      coreTemp: '165°C',
      specRatio: '1:1',
      artisanCode: 'SIDE #CRISPS',
      style: 'blueprint'
    });

    return {
      photoUrl: preset.imageUrl,
      blueprintUrl,
      sketchUrl,
      sketchType: 'crisps',
      noteZh: preset.noteZh,
      noteEn: preset.noteEn,
      coreMetricZh: '极薄切片 1.2mm',
      coreMetricEn: 'SLICED 1.2mm',
      artisanCode: 'SIDE #CRISPS',
      coreTemp: '165°C',
      specRatio: '1:1'
    };
  }

  if (groupName.includes('熟度') || groupName.toLowerCase().includes('doneness')) {
    const isFive = label.includes('五分') || labelLower.includes('medium') && !labelLower.includes('well');
    const isSeven = label.includes('七分') || labelLower.includes('medium well');
    const key = isFive ? 'doneness_medium' : isSeven ? 'doneness_medium_well' : 'doneness_well_done';
    const preset = PRESET_SELECTOR_MEDIA_BANK[key];
    const sketchUrl = generateArtisanSvgBlueprint({
      titleZh: preset.labelZh,
      titleEn: preset.labelEn,
      category: 'western',
      sketchType: 'doneness',
      coreTemp: preset.coreTemp,
      specRatio: preset.specRatio,
      artisanCode: 'TEMP #PATTY',
      style: 'pencil_sketch'
    });
    const blueprintUrl = generateArtisanSvgBlueprint({
      titleZh: preset.labelZh,
      titleEn: preset.labelEn,
      category: 'western',
      sketchType: 'doneness',
      coreTemp: preset.coreTemp,
      specRatio: preset.specRatio,
      artisanCode: 'TEMP #PATTY',
      style: 'blueprint'
    });

    return {
      photoUrl: preset.imageUrl,
      blueprintUrl,
      sketchUrl,
      sketchType: 'doneness',
      noteZh: preset.noteZh,
      noteEn: preset.noteEn,
      coreMetricZh: `核心温控 ${preset.coreTemp}`,
      coreMetricEn: `CORE TEMP ${preset.coreTemp}`,
      artisanCode: 'TEMP #PATTY',
      coreTemp: preset.coreTemp,
      specRatio: preset.specRatio
    };
  }

  // 通用兜底
  const sketchUrl = generateArtisanSvgBlueprint({
    titleZh: label,
    titleEn: choice?.enLabel || 'CUSTOM CHOICE',
    category: dish.category,
    sketchType: 'general',
    coreTemp: 'STANDARD',
    specRatio: '1:1',
    artisanCode: 'CUSTOM #SPEC',
    style: 'pencil_sketch'
  });
  const blueprintUrl = generateArtisanSvgBlueprint({
    titleZh: label,
    titleEn: choice?.enLabel || 'CUSTOM CHOICE',
    category: dish.category,
    sketchType: 'general',
    coreTemp: 'STANDARD',
    specRatio: '1:1',
    artisanCode: 'CUSTOM #SPEC',
    style: 'blueprint'
  });

  return {
    photoUrl: choice?.imageUrl || dish.imageUrl,
    blueprintUrl,
    sketchUrl,
    sketchType: 'general',
    noteZh: `${label} 定制工序标定，手绘素描引擎动态排线渲染。`,
    noteEn: `${label} craft calibrated, hand-drawn sketch dynamically calculated.`,
    coreMetricZh: '手绘画规标定',
    coreMetricEn: 'SKETCH SPEC',
    artisanCode: 'CUSTOM #SPEC',
    coreTemp: 'STANDARD',
    specRatio: '1:1'
  };
}

/**
 * 自动化解析口味风格手绘素描 (Auto-Resolve Flavor Hand-Drawn Sketch)
 */
export function resolveFlavorSketch(
  dish: DishItem,
  flavorName: string
): ResolvedOptionBlueprint {
  const fLower = (flavorName || '').toLowerCase();

  // 1. 从 fieldSelectorMediaMap 查找
  const key = `flavor_${flavorName}`;
  if (dish.fieldSelectorMediaMap && dish.fieldSelectorMediaMap[key]) {
    const item = dish.fieldSelectorMediaMap[key];
    const sketchType = item.sketchType || 'sauce';
    const coreTemp = '80°C';
    const specRatio = '5:5';
    const artisanCode = 'FLAVOR #ARTISAN';

    const sketchUrl = generateArtisanSvgBlueprint({
      titleZh: item.labelZh,
      titleEn: item.labelEn,
      category: dish.category,
      sketchType,
      coreTemp,
      specRatio,
      artisanCode,
      style: 'pencil_sketch'
    });
    const blueprintUrl = item.blueprintImageUrl || generateArtisanSvgBlueprint({
      titleZh: item.labelZh,
      titleEn: item.labelEn,
      category: dish.category,
      sketchType,
      coreTemp,
      specRatio,
      artisanCode,
      style: 'blueprint'
    });

    return {
      photoUrl: item.imageUrl || dish.imageUrl,
      sketchUrl,
      blueprintUrl,
      sketchType,
      noteZh: item.sketchNoteZh || `${flavorName} 秘制酱汁调配，香气醇郁。`,
      noteEn: item.sketchNoteEn || 'Signature sauce crafted with precision.',
      coreMetricZh: item.coreMetricZh || '慢熬温控 80°C',
      coreMetricEn: item.coreMetricEn || 'SIMMER 80°C',
      artisanCode,
      coreTemp,
      specRatio
    };
  }

  // 2. 智能语义推断
  if (fLower.includes('黑松露') || fLower.includes('蒜香') || fLower.includes('truffle')) {
    const preset = PRESET_SELECTOR_MEDIA_BANK['flavor_truffle_garlic'];
    const sketchUrl = generateArtisanSvgBlueprint({
      titleZh: preset.labelZh,
      titleEn: preset.labelEn,
      category: dish.category,
      sketchType: 'sauce',
      coreTemp: preset.coreTemp,
      specRatio: preset.specRatio,
      artisanCode: 'FLAVOR #TRUFFLE',
      style: 'pencil_sketch'
    });
    const blueprintUrl = generateArtisanSvgBlueprint({
      titleZh: preset.labelZh,
      titleEn: preset.labelEn,
      category: dish.category,
      sketchType: 'sauce',
      coreTemp: preset.coreTemp,
      specRatio: preset.specRatio,
      artisanCode: 'FLAVOR #TRUFFLE',
      style: 'blueprint'
    });

    return {
      photoUrl: preset.imageUrl,
      sketchUrl,
      blueprintUrl,
      sketchType: 'sauce',
      noteZh: preset.noteZh,
      noteEn: preset.noteEn,
      coreMetricZh: '黑松露 3:7 配比',
      coreMetricEn: 'TRUFFLE 3:7 RATIO',
      artisanCode: 'FLAVOR #TRUFFLE',
      coreTemp: preset.coreTemp,
      specRatio: preset.specRatio
    };
  }

  if (fLower.includes('黑椒') || fLower.includes('胡椒') || fLower.includes('pepper')) {
    const preset = PRESET_SELECTOR_MEDIA_BANK['flavor_black_pepper'];
    const sketchUrl = generateArtisanSvgBlueprint({
      titleZh: preset.labelZh,
      titleEn: preset.labelEn,
      category: dish.category,
      sketchType: 'sauce',
      coreTemp: preset.coreTemp,
      specRatio: preset.specRatio,
      artisanCode: 'FLAVOR #PEPPER',
      style: 'pencil_sketch'
    });
    const blueprintUrl = generateArtisanSvgBlueprint({
      titleZh: preset.labelZh,
      titleEn: preset.labelEn,
      category: dish.category,
      sketchType: 'sauce',
      coreTemp: preset.coreTemp,
      specRatio: preset.specRatio,
      artisanCode: 'FLAVOR #PEPPER',
      style: 'blueprint'
    });

    return {
      photoUrl: preset.imageUrl,
      sketchUrl,
      blueprintUrl,
      sketchType: 'sauce',
      noteZh: preset.noteZh,
      noteEn: preset.noteEn,
      coreMetricZh: '慢熬 85°C · 浓汁',
      coreMetricEn: 'SIMMER 85°C',
      artisanCode: 'FLAVOR #PEPPER',
      coreTemp: preset.coreTemp,
      specRatio: preset.specRatio
    };
  }

  if (fLower.includes('炭烤') || fLower.includes('椒盐') || fLower.includes('雪盐') || fLower.includes('salt')) {
    const preset = PRESET_SELECTOR_MEDIA_BANK['flavor_charcoal_salt'];
    const sketchUrl = generateArtisanSvgBlueprint({
      titleZh: preset.labelZh,
      titleEn: preset.labelEn,
      category: dish.category,
      sketchType: 'spice',
      coreTemp: preset.coreTemp,
      specRatio: preset.specRatio,
      artisanCode: 'FLAVOR #SALT',
      style: 'pencil_sketch'
    });
    const blueprintUrl = generateArtisanSvgBlueprint({
      titleZh: preset.labelZh,
      titleEn: preset.labelEn,
      category: dish.category,
      sketchType: 'spice',
      coreTemp: preset.coreTemp,
      specRatio: preset.specRatio,
      artisanCode: 'FLAVOR #SALT',
      style: 'blueprint'
    });

    return {
      photoUrl: preset.imageUrl,
      sketchUrl,
      blueprintUrl,
      sketchType: 'spice',
      noteZh: preset.noteZh,
      noteEn: preset.noteEn,
      coreMetricZh: '手炒花椒盐 1:9',
      coreMetricEn: 'SALT & PEPPER 1:9',
      artisanCode: 'FLAVOR #SALT',
      coreTemp: preset.coreTemp,
      specRatio: preset.specRatio
    };
  }

  if (fLower.includes('青花椒') || fLower.includes('藤椒') || fLower.includes('麻')) {
    const preset = PRESET_SELECTOR_MEDIA_BANK['flavor_rattan_pepper'];
    const sketchUrl = generateArtisanSvgBlueprint({
      titleZh: preset.labelZh,
      titleEn: preset.labelEn,
      category: dish.category,
      sketchType: 'spice',
      coreTemp: preset.coreTemp,
      specRatio: preset.specRatio,
      artisanCode: 'FLAVOR #RATTAN',
      style: 'pencil_sketch'
    });
    const blueprintUrl = generateArtisanSvgBlueprint({
      titleZh: preset.labelZh,
      titleEn: preset.labelEn,
      category: dish.category,
      sketchType: 'spice',
      coreTemp: preset.coreTemp,
      specRatio: preset.specRatio,
      artisanCode: 'FLAVOR #RATTAN',
      style: 'blueprint'
    });

    return {
      photoUrl: preset.imageUrl,
      sketchUrl,
      blueprintUrl,
      sketchType: 'spice',
      noteZh: preset.noteZh,
      noteEn: preset.noteEn,
      coreMetricZh: '冷萃清麻 2:8',
      coreMetricEn: 'COLD-PRESS 2:8',
      artisanCode: 'FLAVOR #RATTAN',
      coreTemp: preset.coreTemp,
      specRatio: preset.specRatio
    };
  }

  if (fLower.includes('照烧') || fLower.includes('日式') || fLower.includes('teriyaki')) {
    const sketchUrl = generateArtisanSvgBlueprint({
      titleZh: flavorName,
      titleEn: 'JAPANESE TERIYAKI',
      category: dish.category,
      sketchType: 'sauce',
      coreTemp: '78°C',
      specRatio: '6:4',
      artisanCode: 'FLAVOR #TERIYAKI',
      style: 'pencil_sketch'
    });
    const blueprintUrl = generateArtisanSvgBlueprint({
      titleZh: flavorName,
      titleEn: 'JAPANESE TERIYAKI',
      category: dish.category,
      sketchType: 'sauce',
      coreTemp: '78°C',
      specRatio: '6:4',
      artisanCode: 'FLAVOR #TERIYAKI',
      style: 'blueprint'
    });

    return {
      photoUrl: dish.imageUrl,
      sketchUrl,
      blueprintUrl,
      sketchType: 'sauce',
      noteZh: '日式传统本味醂与昆布酱汁慢火收汁，鲜甜醇厚亮泽。',
      noteEn: 'Simmered Japanese mirin and kombu glaze with rich umami shine.',
      coreMetricZh: '慢火收汁 78°C',
      coreMetricEn: 'REDUCTION 78°C',
      artisanCode: 'FLAVOR #TERIYAKI',
      coreTemp: '78°C',
      specRatio: '6:4'
    };
  }

  // 默认特调风味
  const sketchUrl = generateArtisanSvgBlueprint({
    titleZh: flavorName,
    titleEn: 'ARTISAN SAUCE',
    category: dish.category,
    sketchType: 'sauce',
    coreTemp: '75°C',
    specRatio: '5:5',
    artisanCode: 'FLAVOR #SPECIAL',
    style: 'pencil_sketch'
  });
  const blueprintUrl = generateArtisanSvgBlueprint({
    titleZh: flavorName,
    titleEn: 'ARTISAN SAUCE',
    category: dish.category,
    sketchType: 'sauce',
    coreTemp: '75°C',
    specRatio: '5:5',
    artisanCode: 'FLAVOR #SPECIAL',
    style: 'blueprint'
  });

  return {
    photoUrl: dish.imageUrl,
    sketchUrl,
    blueprintUrl,
    sketchType: 'sauce',
    noteZh: `${flavorName} 秘制特调调味素描标定，现熬现淋挂壁拉丝。`,
    noteEn: `${flavorName} artisan sauce dynamically calculated and sketched.`,
    coreMetricZh: '主厨特调工序',
    coreMetricEn: 'CHEF CRAFT',
    artisanCode: 'FLAVOR #SPECIAL',
    coreTemp: '75°C',
    specRatio: '5:5'
  };
}

/**
 * 自动化解析辣度级别手绘素描与辣椒素参数 (Auto-Resolve Spiciness Sketch & Scoville Scale)
 */
export function resolveSpicinessSketch(
  dish: DishItem,
  spicinessName: string
): ResolvedOptionBlueprint & { shuValue: number } {
  const sName = (spicinessName || '').toLowerCase();

  let shuValue = 1500;
  let coreMetricZh = '1,500 SHU · 温和微辣';
  let coreMetricEn = '1,500 SHU MILD';
  let noteZh = '精选优质二荆条轻度烘焙，温和微辣提香不燥喉。';
  let noteEn = 'Mild chili roasting delivering aromatic warmth without harsh heat.';
  let coreTemp = '焙香 65°C';
  let specRatio = '1,500 SHU';

  if (sName.includes('不辣') || sName.includes('免辣') || sName.includes('原味') || sName.includes('none')) {
    shuValue = 0;
    coreMetricZh = '0 SHU · 免辣原香';
    coreMetricEn = '0 SHU ZERO HEAT';
    noteZh = '不添加辣椒素，保留食材原汁原味鲜甜与炭烤果木清香。';
    noteEn = 'Zero capsaicin heat, preserving natural sweetness and wood smoke aroma.';
    coreTemp = '常温萃取';
    specRatio = '0 SHU';
  } else if (sName.includes('微辣') || sName.includes('轻辣') || sName.includes('mild')) {
    shuValue = 1500;
    coreMetricZh = '1,500 SHU · 温和微辣';
    coreMetricEn = '1,500 SHU MILD';
    noteZh = '精选优质二荆条轻度烘焙，温和微辣提香不燥喉。';
    noteEn = 'Mild chili roasting delivering aromatic warmth without harsh heat.';
    coreTemp = '焙香 65°C';
    specRatio = '1,500 SHU';
  } else if (sName.includes('中辣') || sName.includes('川香') || sName.includes('medium') || sName.includes('七味')) {
    shuValue = 8500;
    coreMetricZh = '8,500 SHU · 经典川香';
    coreMetricEn = '8,500 SHU CLASSIC';
    noteZh = '贵州子弹头与川产朝天椒配比，辛香浓烈，回味悠长。';
    noteEn = 'Sichuan bullet chili blend generating vibrant, enduring spicy aromatics.';
    coreTemp = '爆炒 120°C';
    specRatio = '8,500 SHU';
  } else if (sName.includes('重辣') || sName.includes('大辣') || sName.includes('嗜辣') || sName.includes('hot')) {
    shuValue = 28000;
    coreMetricZh = '28,000 SHU · 深度香辣';
    coreMetricEn = '28,000 SHU FIERY';
    noteZh = '精选河南新一代与艳椒拼配，热辣滚烫，唤醒味蕾深度刺激。';
    noteEn = 'Intense dry chili blend delivering deep heat and robust pungency.';
    coreTemp = '极温 160°C';
    specRatio = '28,000 SHU';
  } else if (sName.includes('变态') || sName.includes('魔鬼') || sName.includes('特辣') || sName.includes('ghost')) {
    shuValue = 120000;
    coreMetricZh = '120,000+ SHU · 巅峰刺激';
    coreMetricEn = '120,000+ SHU EXTREME';
    noteZh = '印度断魂魔鬼椒微量提纯，极度辛辣爆发，嗜辣极限之选。';
    noteEn = 'Ghost pepper concentrate triggering explosive capsaicin crescendo.';
    coreTemp = '巅峰浓缩';
    specRatio = '120,000+ SHU';
  }

  const sketchUrl = generateArtisanSvgBlueprint({
    titleZh: spicinessName,
    titleEn: 'CAPSAICIN LEVEL',
    category: dish.category,
    sketchType: 'spice',
    coreTemp,
    specRatio,
    artisanCode: 'HEAT #SPICE',
    style: 'pencil_sketch'
  });
  const blueprintUrl = generateArtisanSvgBlueprint({
    titleZh: spicinessName,
    titleEn: 'CAPSAICIN LEVEL',
    category: dish.category,
    sketchType: 'spice',
    coreTemp,
    specRatio,
    artisanCode: 'HEAT #SPICE',
    style: 'blueprint'
  });

  return {
    photoUrl: dish.imageUrl,
    sketchUrl,
    blueprintUrl,
    sketchType: 'spice',
    noteZh,
    noteEn,
    coreMetricZh,
    coreMetricEn,
    artisanCode: 'HEAT #SPICE',
    coreTemp,
    specRatio,
    shuValue
  };
}

