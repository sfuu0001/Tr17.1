export interface UIverseElement {
  id: string;
  title: string;
  author: string;
  category: 'buttons' | 'cards' | 'badges' | 'switches' | 'loaders';
  matchedScenario: string;
  matchedModule: 'orders' | 'kds' | 'tables' | 'calling' | 'deck' | 'global';
  tags: string[];
  description: string;
  popularity: number;
  uiverseUrl: string;
  codeSnippet: {
    html: string;
    css: string;
    tailwind: string;
  };
}

export const UIVERSE_ELEMENTS: UIverseElement[] = [
  // BUTTONS
  {
    id: 'uiv-btn-laser-glow',
    title: 'Cyber Neon Laser Glow (赛博霓虹激光扫光钮)',
    author: '@Gryffindor',
    category: 'buttons',
    matchedScenario: '催单加急 / 紧急叫号广播',
    matchedModule: 'calling',
    tags: ['Neon', 'Glow', 'Cyberpunk', 'High Impact'],
    description: '四周带有高亮环绕光晕与扫光动画，点击时产生光斑扩散，专用于高优先级或加急唤醒场景。',
    popularity: 9850,
    uiverseUrl: 'https://uiverse.io/Gryffindor/shiny-moth-20',
    codeSnippet: {
      html: `<button class="uiv-laser-btn">
  <span class="laser-light"></span>
  <span class="btn-text">⚡ 呼叫就餐</span>
</button>`,
      css: `.uiv-laser-btn {
  position: relative;
  background: #111;
  color: #fff;
  border-radius: 9999px;
  overflow: hidden;
  box-shadow: 0 0 15px rgba(43,89,63,0.5);
}`,
      tailwind: `relative group overflow-hidden px-4 py-2 rounded-full bg-neutral-900 text-white font-bold shadow-[0_0_20px_rgba(217,115,13,0.4)] hover:shadow-[0_0_25px_rgba(217,115,13,0.7)] transition-all active:scale-95`
    }
  },
  {
    id: 'uiv-btn-tactile-3d',
    title: 'Tactile Mechanical 3D Push (实体机械微凸按键)',
    author: '@Pradeeps99',
    category: 'buttons',
    matchedScenario: 'KDS 出餐划菜 / 快速开台确认',
    matchedModule: 'kds',
    tags: ['3D', 'Neumorphic', 'Tactile', 'Physical'],
    description: '底部具备立体深度阴影与物理冲压反馈，按压时位移 3px 并伴随金属质感回弹，防误触体验极佳。',
    popularity: 12400,
    uiverseUrl: 'https://uiverse.io/Pradeeps99/cool-button-44',
    codeSnippet: {
      html: `<button class="uiv-3d-btn">完成划菜</button>`,
      css: `.uiv-3d-btn {
  transform: translateY(0);
  box-shadow: 0 4px 0 #183324;
  transition: all 0.08s ease;
}
.uiv-3d-btn:active {
  transform: translateY(4px);
  box-shadow: 0 0 0 #183324;
}`,
      tailwind: `px-4 py-2 bg-emerald-700 hover:bg-emerald-600 active:translate-y-1 text-white font-bold rounded-xl shadow-[0_4px_0_#143e26] active:shadow-none transition-all`
    }
  },
  {
    id: 'uiv-btn-liquid-pill',
    title: 'Liquid Wave Gradient Pill (水滴液态流动胶囊)',
    author: '@alexruix',
    category: 'buttons',
    matchedScenario: '自提核销 / 一键批量打单',
    matchedModule: 'orders',
    tags: ['Liquid', 'Gradient', 'Clean', 'Modern'],
    description: '采用双色液态流动波纹渐变与高斯柔光，悬停时产生水流涌动视觉，极具现代前沿科技感。',
    popularity: 8720,
    uiverseUrl: 'https://uiverse.io/alexruix/cool-pill-12',
    codeSnippet: {
      html: `<button class="uiv-liquid-pill">扫码核销</button>`,
      css: `.uiv-liquid-pill {
  background: linear-gradient(90deg, #d9730d, #f59e0b, #d9730d);
  background-size: 200% auto;
  animation: shine 3s linear infinite;
}`,
      tailwind: `px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 bg-[length:200%_auto] hover:bg-[position:right_center] text-white font-semibold transition-all shadow-md`
    }
  },
  {
    id: 'uiv-btn-cosmic-shimmer',
    title: 'Cosmic Shimmer Dark Button (暗夜星云微光流转钮)',
    author: '@nikunjpatel',
    category: 'buttons',
    matchedScenario: '全渠道总控模式切换 / 诊断巡检',
    matchedModule: 'deck',
    tags: ['Cosmic', 'Dark Mode', 'Shimmer', 'Luxury'],
    description: '深黑底盘上带有斜向划过的流星微光渐隐条，低调内敛又充满深邃能量感。',
    popularity: 11200,
    uiverseUrl: 'https://uiverse.io/nikunjpatel/starry-night-button',
    codeSnippet: {
      html: `<button class="uiv-cosmic-btn">进入巡检</button>`,
      css: `.uiv-cosmic-btn::before {
  content: '';
  position: absolute;
  top: 0; left: -100%;
  width: 100%; height: 100%;
  background: linear-gradient(120deg, transparent, rgba(255,255,255,0.3), transparent);
  transition: all 0.6s;
}`,
      tailwind: `relative overflow-hidden px-4 py-2 bg-neutral-900 text-neutral-100 rounded-lg border border-neutral-800 hover:border-neutral-700 shadow-sm before:absolute before:inset-0 before:-translate-x-full hover:before:translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:transition-transform before:duration-700`
    }
  },

  // CARDS
  {
    id: 'uiv-card-cosmic-border',
    title: 'Cosmic Border Light-Trail Card (跑马灯流光边框卡片)',
    author: '@Yaya12085',
    category: 'cards',
    matchedScenario: 'KDS 烹饪中高优先级/催单工单卡',
    matchedModule: 'kds',
    tags: ['Border Trail', 'Animated Border', 'Eye-catching', 'Card'],
    description: '利用 CSS Conic Gradient 制造 360 度周转旋转的流光外框，在后厨复杂杂光环境下第一眼即可锁定。',
    popularity: 15600,
    uiverseUrl: 'https://uiverse.io/Yaya12085/rainbow-card-99',
    codeSnippet: {
      html: `<div class="uiv-cosmic-card">
  <div class="card-inner">Ticket #UR-092</div>
</div>`,
      css: `.uiv-cosmic-card {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
}
.uiv-cosmic-card::before {
  content: '';
  position: absolute;
  inset: -50%;
  background: conic-gradient(from 0deg, transparent, #e11d48, transparent 40%);
  animation: rotate 3s linear infinite;
}`,
      tailwind: `relative p-[2px] rounded-xl overflow-hidden bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 animate-gradient`
    }
  },
  {
    id: 'uiv-card-holo-tilt',
    title: 'Holographic Glass Tilt Card (全息微角度毛玻璃倾角卡)',
    author: '@satyamchaudharydev',
    category: 'cards',
    matchedScenario: '堂食台位就餐实时账单卡',
    matchedModule: 'tables',
    tags: ['Glassmorphism', 'Hologram', 'Tilt', 'Clean'],
    description: '半透明磨砂亚克力反光与微妙彩色衍射光条，呈现出高级手持掌机般的未来科技沉浸感。',
    popularity: 14300,
    uiverseUrl: 'https://uiverse.io/satyamchaudharydev/glass-card-2',
    codeSnippet: {
      html: `<div class="uiv-holo-card">Table A02 · 4人桌</div>`,
      css: `.uiv-holo-card {
  backdrop-filter: blur(16px);
  background: rgba(255,255,255,0.75);
  border: 1px solid rgba(255,255,255,0.4);
  box-shadow: 0 8px 32px rgba(0,0,0,0.06);
}`,
      tailwind: `backdrop-blur-md bg-white/80 border border-white/60 shadow-[0_10px_30px_rgba(0,0,0,0.05)] rounded-2xl p-4 transition-all hover:bg-white/95`
    }
  },
  {
    id: 'uiv-card-carbon-tech',
    title: 'Industrial Tech Spec Sheet (工业碳纤维切角规格单)',
    author: '@CyberPulse',
    category: 'cards',
    matchedScenario: '外卖专送实时雷达订单卡',
    matchedModule: 'orders',
    tags: ['Industrial', 'Cyber', 'Data Spec', 'Dark'],
    description: '斜角切角几何剪裁，右上角嵌入点阵编码与微小状态铆钉，专为精密运营调度打造。',
    popularity: 9100,
    uiverseUrl: 'https://uiverse.io/CyberPulse/sci-fi-sheet',
    codeSnippet: {
      html: `<div class="uiv-carbon-card">ORDER SPEC #8812</div>`,
      css: `.uiv-carbon-card {
  clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%);
  background: #18181b;
  border-left: 4px solid #10b981;
}`,
      tailwind: `bg-neutral-900 text-neutral-100 p-4 border-l-4 border-emerald-500 rounded-r-xl font-mono shadow-md`
    }
  },

  // BADGES & TAGS
  {
    id: 'uiv-tag-sonar-beacon',
    title: 'Sonar Radar Ping Beacon (雷达波束信标呼吸徽标)',
    author: '@RadarSense',
    category: 'badges',
    matchedScenario: '骑手配送中实时 GPS 状态 / 正在烹饪',
    matchedModule: 'orders',
    tags: ['Radar', 'Ping', 'Pulse', 'Live Status'],
    description: '双层扩散的光波涟漪，在视觉中心保持强心跳动，即刻传达「正在履约中/正在定位」的实时生命感。',
    popularity: 13900,
    uiverseUrl: 'https://uiverse.io/RadarSense/live-beacon-tag',
    codeSnippet: {
      html: `<span class="uiv-beacon"><span class="ping"></span>配送中</span>`,
      css: `.uiv-beacon .ping {
  position: absolute;
  width: 100%; height: 100%;
  border-radius: 9999px;
  background: #10b981;
  animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
}`,
      tailwind: `relative inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300`
    }
  },
  {
    id: 'uiv-tag-flame-sizzle',
    title: 'Blazing Flame Sizzle Tag (炙热烈焰爆闪催单标)',
    author: '@FireStorm',
    category: 'badges',
    matchedScenario: '超时 15m 紧急催单工单 / 临期预警',
    matchedModule: 'kds',
    tags: ['Flame', 'Warning', 'Overtime', 'Urgent'],
    description: '烈火橙红呼吸光，带有连续升腾的粒子跳动与高饱和警示边框，彻底告别单调平面的文字催单。',
    popularity: 10800,
    uiverseUrl: 'https://uiverse.io/FireStorm/flame-alert-badge',
    codeSnippet: {
      html: `<span class="uiv-flame-tag">🔥 紧急催单 x2</span>`,
      css: `.uiv-flame-tag {
  background: linear-gradient(45deg, #e11d48, #f97316);
  color: #fff;
  animation: flame-pulse 1s infinite alternate;
}`,
      tailwind: `inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-rose-600 via-orange-600 to-amber-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.6)] animate-pulse`
    }
  },
  {
    id: 'uiv-tag-cyber-pill',
    title: 'Cyber Cut-Corner Pill (赛博切角三色渠道胶囊)',
    author: '@ByteHunter',
    category: 'badges',
    matchedScenario: '堂食 🍽️ / 自提 🛍️ / 专送 🛵 渠道辨识标',
    matchedModule: 'global',
    tags: ['Cyber', 'Tri-color', 'Channel', 'Pill'],
    description: '高反差黑底+高亮状态色晶体点缀，兼备全圆角舒适感与赛博控制台的严谨机械感。',
    popularity: 9450,
    uiverseUrl: 'https://uiverse.io/ByteHunter/cyber-badge-3',
    codeSnippet: {
      html: `<span class="uiv-cyber-pill"><span class="dot"></span>自提 #A98</span>`,
      css: `.uiv-cyber-pill {
  background: #18181b;
  border: 1px solid #3f3f46;
  border-radius: 9999px;
  color: #f4f4f5;
}`,
      tailwind: `inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-neutral-900 text-white border border-neutral-700 shadow-sm`
    }
  },

  // TOGGLES & SWITCHES
  {
    id: 'uiv-sw-arcade-rocker',
    title: 'Arcade Heavy Rocker Switch (街机重型带灯翘板开关)',
    author: '@ViperGamer',
    category: 'switches',
    matchedScenario: '自动语音播报 / 防漏单声光报警开关',
    matchedModule: 'kds',
    tags: ['Arcade', 'Switch', 'LED', 'Tactile'],
    description: '带有真实 LED 导光槽与物理压痕，开启时通电点亮绿光，关闭时呈机械断开暗态。',
    popularity: 16700,
    uiverseUrl: 'https://uiverse.io/ViperGamer/arcade-toggle-66',
    codeSnippet: {
      html: `<label class="uiv-rocker-switch">
  <input type="checkbox" checked />
  <span class="rocker-slider"></span>
</label>`,
      css: `.uiv-rocker-switch input:checked + .rocker-slider {
  background-color: #10b981;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.4), 0 0 10px #10b981;
}`,
      tailwind: `relative inline-flex h-6 w-11 items-center rounded-full bg-neutral-800 transition-colors duration-300 focus:outline-none data-[checked]:bg-emerald-600`
    }
  },
  {
    id: 'uiv-sw-liquid-wave',
    title: 'Liquid Sliding Knob Switch (液态平滑双态滑块)',
    author: '@FluidMaster',
    category: 'switches',
    matchedScenario: '按单看板 ↔ 菜品汇总视图平滑切换',
    matchedModule: 'kds',
    tags: ['Smooth', 'Sliding', 'Fluid', 'Modern'],
    description: '内部滑块伴有弹簧阻尼弹性过冲动画，提供触手可及的爽脆切换指尖反馈。',
    popularity: 11500,
    uiverseUrl: 'https://uiverse.io/FluidMaster/smooth-slider-1',
    codeSnippet: {
      html: `<div class="uiv-liquid-toggle">...</div>`,
      css: `.uiv-liquid-toggle { border-radius: 9999px; background: #e4e4e7; }`,
      tailwind: `p-1 bg-neutral-100 rounded-full flex gap-1 border border-neutral-200`
    }
  },

  // LOADERS & EQUALIZERS
  {
    id: 'uiv-load-audio-eq',
    title: 'Live Audio Equalizer Wave (实时音频频谱跳动条)',
    author: '@SoundWave',
    category: 'loaders',
    matchedScenario: '前台 TTS 语音播报播放中 / 叫号声波中',
    matchedModule: 'calling',
    tags: ['Audio', 'Equalizer', 'Voice', 'Sound'],
    description: '4-5 根不同相位随机跳动的频段柱状体，清晰指示出当前语音引擎正在外放广播。',
    popularity: 18200,
    uiverseUrl: 'https://uiverse.io/SoundWave/equalizer-waves',
    codeSnippet: {
      html: `<div class="uiv-equalizer">
  <span class="bar"></span><span class="bar"></span>
  <span class="bar"></span><span class="bar"></span>
</div>`,
      css: `.uiv-equalizer .bar {
  display: inline-block;
  width: 3px;
  background: #10b981;
  border-radius: 2px;
  animation: eq 0.8s ease-in-out infinite alternate;
}`,
      tailwind: `flex items-end gap-0.5 h-4`
    }
  },
  {
    id: 'uiv-load-radar-sonar',
    title: '360° Polar Radar Sweep Sonar (极坐标旋转雷达声纳)',
    author: '@SonarLab',
    category: 'loaders',
    matchedScenario: '外卖专送骑手寻径 / 新单侦听雷达',
    matchedModule: 'orders',
    tags: ['Radar', 'Sonar', 'Sweep', 'Sci-Fi'],
    description: '复刻军工级 PPI 极坐标雷达屏幕，扇形余辉渐变扫视全场，探测周边 3km 运力。',
    popularity: 17300,
    uiverseUrl: 'https://uiverse.io/SonarLab/radar-sweep-screen',
    codeSnippet: {
      html: `<div class="uiv-radar-screen">
  <div class="sweep-beam"></div>
  <div class="blip"></div>
</div>`,
      css: `.uiv-radar-screen {
  position: relative;
  width: 80px; height: 80px;
  border-radius: 50%;
  border: 1px solid #10b981;
  background: radial-gradient(circle, #022c22 0%, #064e3b 100%);
}`,
      tailwind: `relative w-16 h-16 rounded-full border border-emerald-500/50 bg-emerald-950/80 overflow-hidden`
    }
  },
  {
    id: 'uiv-load-quantum-orbit',
    title: 'Quantum Orbit Rings Spinner (双轨道量子旋转环)',
    author: '@QuantumCode',
    category: 'loaders',
    matchedScenario: '分站打印机通讯检测 / 数据库并发同步',
    matchedModule: 'tables',
    tags: ['Spinner', 'Quantum', 'Orbit', 'Loading'],
    description: '正反双向交错的同心旋转光环，平滑永动，呈现极高精密仪器感。',
    popularity: 12900,
    uiverseUrl: 'https://uiverse.io/QuantumCode/quantum-spinner',
    codeSnippet: {
      html: `<div class="uiv-quantum-spinner"></div>`,
      css: `.uiv-quantum-spinner {
  width: 32px; height: 32px;
  border: 2px solid transparent;
  border-top-color: #d9730d;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}`,
      tailwind: `w-6 h-6 border-2 border-transparent border-t-amber-500 border-r-amber-400 rounded-full animate-spin`
    }
  }
];

export type UiverseSkinMode = 'default' | 'cyber_neon' | 'tactile_3d' | 'glass_frost';

export interface UiverseSkinPreset {
  id: UiverseSkinMode;
  name: string;
  badge: string;
  description: string;
  themeClass: string;
  accentColor: string;
}

export const UIVERSE_SKINS: UiverseSkinPreset[] = [
  {
    id: 'default',
    name: '工业运营控制台 (Standard Deck)',
    badge: '原版工业',
    description: '保留高对比度、清晰克制的深林绿、石墨深灰与琥珀橙三色胶囊。',
    themeClass: 'theme-standard',
    accentColor: '#2b593f'
  },
  {
    id: 'cyber_neon',
    name: 'UIverse 赛博霓虹极客风 (Cyber Neon)',
    badge: 'UIverse 热门',
    description: '全暗底高对比荧光，边框流光跑马灯，雷达心跳声纳与烈焰催单微光。',
    themeClass: 'theme-uiverse-cyber',
    accentColor: '#10b981'
  },
  {
    id: 'tactile_3d',
    name: 'UIverse 实体微拟物风 (Tactile 3D)',
    badge: '真实按压感',
    description: '微凸立体阴影、物理冲压位移按键与街机翘板拨动开关，触觉反馈极度扎实。',
    themeClass: 'theme-uiverse-tactile',
    accentColor: '#d9730d'
  },
  {
    id: 'glass_frost',
    name: 'UIverse 琉璃毛玻璃风 (Glass Frost)',
    badge: '现代美学',
    description: '半透明磨砂亚克力、全息微彩衍射光辉与水滴流体渐变，前沿通透。',
    themeClass: 'theme-uiverse-glass',
    accentColor: '#3b82f6'
  }
];
