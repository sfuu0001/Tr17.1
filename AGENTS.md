# 项目记忆与配置文档 (Project Memory & Guidelines)

本文档记录本项目（Urban Radar 流动餐车 GPS 极速专送平台）的核心云服务配置、部署流水线、环境变量与关键开发备忘，供开发与 AI Agent 自动读取和持久化记忆。

---

## 1. 腾讯云静态网站托管与 COS 配置

本项目已配置腾讯云自动化静态网站构建与部署流水线。相关凭证与存储桶信息如下：

| 配置项 | 配置值 / 说明 |
| :--- | :--- |
| **TENCENT_SECRET_ID** | `<YOUR_TENCENT_SECRET_ID>` |
| **TENCENT_SECRET_KEY** | `<YOUR_TENCENT_SECRET_KEY>` |
| **静态托管存储桶 (推荐)** | `529f-static-tc100-d9gz0e2ko5929e360-1445454244` (用于网页部署，免强制下载) |
| **文件存储存储桶** | `7463-tc100-d9gz0e2ko5929e360-1445454244` (用于应用附件存储) |
| **TENCENT_COS_REGION** | `ap-shanghai` (华东·上海) |
| **🌐 网页公网直接访问地址** | `https://tc100-d9gz0e2ko5929e360-1445454244.tcloudbaseapp.com` |
| **为什么访问 COS 默认域名会强制下载** | 按照中国工信部及腾讯云安全合规政策（2024 年 1 月 1 日后），任何通过 COS 默认 `*.myqcloud.com` 域名在浏览器中打开 HTML 均会被注入 `x-cos-force-download: true` 强制下载文件；唯有通过腾讯云静态托管专属域名 `*.tcloudbaseapp.com` 或绑定已备案自定义域名才可直接渲染浏览网页。 |

### 部署命令
```bash
# 自动执行构建 (npm run build) 并增量/并发上传全量静态资产至静态托管存储桶
npm run deploy:cos
```

### 部署脚本位置
- 部署脚本：`scripts/deploy-cos.mjs`
- 环境变量：根目录 `.env` 文件（由 `.gitignore` 保护，不提交至公共仓库）
- 静态网站特性：部署脚本已配置 SPA 404 回退至 `index.html`，保障单页路由刷新正常。

---

## 2. 环境变量与安全规范

### `.env` 变量定义
```ini
TENCENT_SECRET_ID=<YOUR_TENCENT_SECRET_ID>
TENCENT_SECRET_KEY=<YOUR_TENCENT_SECRET_KEY>
TENCENT_COS_BUCKET=529f-static-tc100-d9gz0e2ko5929e360-1445454244
TENCENT_COS_REGION=ap-shanghai
```

- `.env.example` 记录变量键名供模板参考；真实敏感凭证仅保存在本地/容器 `.env` 中。

---

## 3. 核心功能与权限设计备忘

1. **开发者调试模式 (Dev Simulation)**
   - 普通用户访问：浮动调试入口（`DevFloatingDock`）默认**隐藏**，避免干扰普通用户与食客体验。
   - 开发者/管理员权限：通过顶部角色切换器底部「开发者登录」、个人中心「开发者账号登录认证」、或全局快捷键 `Ctrl+Shift+D` 唤出认证弹窗；登录后自动激活浮动调试中枢。

2. **多端协同 (Customer / Merchant / Rider / Platform)**
   - 食客端（点餐、雷达配送追踪、卡券、订单协同联络室）
   - 商家端（扫码核销台、分站打印中心、版本回滚容灾）
   - 骑手端（订单派发、状态汇报、车载 GPS 仿真）
   - 平台端（综合监控与云函数调用排查）

---

## 4. 全局排版规范铁律 (Zero Monospace / 等线)
- **绝对禁止沿用等宽等线令牌 (Zero Monospace / DengXian Token Policy)**：
  - 本项目已永久废除全站所有界面的等宽、等线字体（包括 `font-mono`、JetBrains Mono、Courier、等线等硬编码或回退）；
  - 全站排版（包括金额、微标、状态标签、UID、时间戳、代码块、个人中心、餐车动态与控制台）统一采用现代比例无衬线工控标准族（`Space Grotesk` / 系统标准无衬线），严禁任何新开发或重构代码再次引入或沿用 `font-mono`、等线等机械字体。

---

## 5. UI/UX 极致美学与单排布局设计沉淀规范 (Minimalist Industrial UI Design System)

后续任何新增界面、页面重构或组件微调，AI Agent 必须严格继承并遵循以下设计哲学与布局规范：

### 1. 单排一体化调度顶栏与半透明毛玻璃弹出菜单 (Single-Row Toolbar & Minimalist Popovers)
- **严格单排布局**：所有顶部检索、筛选、排序与工具必须收拢为 `flex-nowrap items-center justify-between` 单排布局，严禁换行堆叠导致界面割裂。
- **废除原生下拉框，统一 Popover**：选择器一律采用极简弹出式菜单（Popover），杜绝任何浏览器原生 `<select>`。
- **毛玻璃与阴影标准**：弹出容器统一采用半透明高阶毛玻璃与超柔阴影：
  ```tsx
  className="rounded-xl backdrop-blur-xl bg-white/92 border border-neutral-200/90 shadow-xl shadow-neutral-950/10 p-1.5 z-50"
  ```
- **互斥展开与顺滑动效**：各 Popover 必须保持状态互斥（打开其一时自动收起其余），展开与收起使用 `framer-motion` 的 `AnimatePresence`（平滑缩放与轻微 Y 轴位移）。
- **优化触控热区**：菜单项采用宽触控区域（`px-2.5 py-2 rounded-lg`），选中态使用高透灰底微凸起（`bg-neutral-900/[0.07] text-neutral-950 font-bold`）搭配深绿对勾图标（`Check`）。

### 2. 工业黄金标尺高度与倒角绝对对称统一 (Strict h-8 & Rounded Symmetry)
- **统一 h-8 (32px) 交互标尺**：按钮、输入框、下拉触发器、微标与标签页一律严格遵循 `h-8`（32px）或外层等高约束，绝对禁止 `h-7`、`h-7.5`、`h-9` 混用导致的高低不对称。
- **严谨倒角规范**：
  - **分类筛选与折叠控制器（胶囊按钮）**：严格统一为 **`rounded-full` (极简全圆角胶囊)**，搭配 `px-3.5` 黄金比例水平内边距，提供轻盈流线型的触控体验。
  - **通用操作按键与输入单元**：统一为 `rounded-lg` (8px)。
  - **承载容器（外层卡片、弹出菜单、抽屉区块）**：严格统一为 `rounded-xl` (12px)。
  - 彻底杜绝尖锐直角（`rounded-none`）或过小倒角（`rounded`）与圆角容器产生的冲突感。

### 3. 白色极简纯净哲学与同色高亮规范 (White Minimalist & Chromatic Unity Rule)
- **绝对禁止全黑按钮背景**：页面所有交互按钮全面废除 `bg-neutral-900`、`bg-black` 等大面积厚重黑底。
- **极简胶囊按钮形态 (Capsule Pill Design)**：
  - 分类筛选条、内容折叠控制器统一采用 `h-8 px-3.5 rounded-full` 极简胶囊形态；
  - 按钮无论在激活态（Selected）还是未激活态（Unselected）均恒定保持纯白卡片基底（`bg-white`），杜绝厚重大色块或荧光色污染视觉。
- **边框、图标、文本「三位一体同色高亮」铁律**：
  - 按钮被选中高亮时，其**边框 (Border)、图标 (Icon)、文本 (Text)** 必须使用严格统一的主题高亮色，外圈配以同色超轻柔光晕（`ring-1.5 ring-offset-0`），达成绝对的视觉和谐一致：
    - **全部餐车 (All)**：翡翠绿三位一体（`border-emerald-600 text-emerald-700 ring-emerald-600/15` + 图标 `text-emerald-700`）
    - **卡券特惠 (Coupon)**：玫瑰红三位一体（`border-rose-500 text-rose-600 ring-rose-500/15` + 图标 `text-rose-600`）
    - **社群车友 (Community)**：琥珀橙三位一体（`border-amber-500 text-amber-600 ring-amber-500/15` + 图标 `text-amber-600`）
    - **专送履约 (Delivery)**：浅紫罗兰三位一体（`border-purple-500 text-purple-600 ring-purple-500/15` + 图标 `text-purple-600`）
- **配置语义化矢量图标**：分类与状态按钮统一配置 14px（`w-3.5 h-3.5 shrink-0`）的精细矢量图标（如 `Truck`, `Ticket`, `Users`, `ShieldCheck` 等），彻底废除简单粗暴的圆点占位。
- **微标与提示字段适读字号规范 (Legible Micro-Badge Font Scale)**：
  - 按钮内部或参数网格中的关键微标字段（如「老饕群」、「满50减10」、「极速专送」等福利提示）严禁使用过小字号（杜绝 `text-[9px]` 等肉眼辨识困难的微缩字）；
  - 统一约束为 `text-[11px] font-bold px-2 py-0.5 rounded-full leading-none shrink-0`，配合柔和半透主题色浅底与细边框（如 `bg-rose-50 text-rose-600 border-rose-200/80`），确保移动端触控屏上的高清晰适读性与精美呼吸感。
- **常规态与未选态规范**：
  - 采用轻质白底配合极细灰框与次级文字：
    ```tsx
    className="bg-white text-neutral-600 border-neutral-200/90 hover:bg-neutral-50 hover:text-neutral-900 hover:border-neutral-300 shadow-2xs"
    ```
  - 未选态图标采用柔和过渡色（`text-neutral-400` 或半透主题色），保持呼吸感与层次感。

### 4. 极简白底分段控制器与工控键值表单 (White Minimalist Segmented Controls & Key-Value Tables)
- **分段控制器与选项卡排布规范 (Segmented Control Layout)**：
  - **背景颜色灰改纯白**：底槽容器全面废除粗糙暗灰（如 `bg-neutral-200` 等脏灰底），统一采用极简纯白卡片（`p-1 bg-white rounded-xl border border-neutral-200/90 gap-1.5 shadow-2xs`）。
  - **取消水平均分撑满 (Zero flex-1 Stretch)**：绝对禁止对内部按钮使用 `flex-1` 强制撑满拉宽，杜绝按钮由于字符长短不一导致的机械割裂与字符被拉扯。
  - **自适应内容自动宽度 (Auto-Width & Content-Driven)**：按钮宽度一律根据内容（图标 + 文字 + 间隙）自动计算，统一配置 `w-auto shrink-0 h-8 px-3 rounded-lg`，紧凑自然。
  - **严格左对齐流式分布 (Left-Aligned justify-start)**：容器一律配置 `flex items-center justify-start overflow-x-auto scrollbar-none`，保持工业级统一视线起点。
  - **选定段与未选段微拟态**：
    - 选定段：`bg-white text-neutral-950 shadow-xs font-bold border border-neutral-900 ring-1.5 ring-neutral-900/10 rounded-lg`（或匹配业务主题色如玫瑰红、琥珀橙等）；
    - 未选段：`text-neutral-600 hover:text-neutral-950 hover:bg-neutral-50 border border-transparent rounded-lg font-medium`。
- **键值工况表单 (Key-Value Form Tables)**：
  - 抽屉内字段一律使用双列纯白工控卡片（`bg-white rounded-xl border border-neutral-200/90 divide-y divide-neutral-100/90 shadow-2xs`），内边距统一 `px-3.5 py-2.5`，核心状态（如恒温温控、履约时效）配以高透绿标与呼吸提示灯（`animate-pulse`）。

### 5. 防溢出与自适应防御 (Anti-Overflow & Viewport Resilience)
- **按钮内强制防折行规范 (Strict whitespace-nowrap & Proportional Font Defense)**：所有胶囊按钮、行动键及内部微标必须显式配置 `whitespace-nowrap`，绝对禁止任何按钮内文本发生多行转行折叠；字号与内边距需根据按钮尺寸黄金自适应（主文字 `text-[11px]~[11.5px]`，微标 `text-[10px]~[10.5px] px-1.5 py-0.5`），保证任何设备视口下均符合正常不溢出、不转行的美学显示逻辑。
- **防挤压机制**：每个横向容器中的文字节点必须设置 `min-w-0 truncate`，按键与徽记设置 `shrink-0`，确保在任何移动设备或窄视口下绝不发生水平溢出挤破。
- **横向隐形滚动**：多选项筛选条设置 `overflow-x-auto scrollbar-none py-0.5`，保障移动端滑动手感丝滑且视觉干净。

---

## 6. 全局输入框防缩放与互动器比例锁定硬性规范 (Zero Auto-Zoom on Input Focus & Strict Viewport Ratio Rule)

本规范为 **AI Agent 生成与维护本项目的最高硬性指令之一**。在任何后续功能开发、页面构建、表单设计或编辑器重构中，必须无条件遵循以下规则：

### 1. 彻底禁止点击输入框导致互动器/页面画面被放大 (Strict Zero Zoom on Focus)
- **移动端与触控视口 16px 铁律**：
  - 在移动端（iOS Safari / WebKit、Android Chrome、平板设备及桌面端触控模拟）中，当 `<input>`、`<textarea>` 或 `<select>` 控件的计算字号小于 `16px`（如 `text-xs` 12px）时，移动端内核会自动强制将整个视口拉大 1.3~1.5 倍以辅助阅读，进而导致**画幅被粗暴放大、所见即所得互动器比例失真、容器变形跳动且无法恢复**。
  - **强制解决方案**：
    1. 全局样式必须保留 `@media screen and (max-width: 768px)` 下输入控件 `font-size: 16px !important;` 约束；
    2. 原地行内编辑组件（如 `InlineEditableText`）在编辑态必须显式赋予 `style={{ fontSize: '16px', touchAction: 'manipulation' }}` 或 `text-base md:text-xs`，保证在触控视口下绝对不触发系统自动放大；
    3. 全局与组件内显式配置 `touch-action: manipulation`，消除双击缩放与意外手势捏合。

### 2. 档口小票拆单打印与所见即所得编辑器 (WYSIWYG Live Canvas) 交互铁律
- **1:1 原画比例恒定锁定**：
  - 核心虚拟打样纸张容器（如 58mm 便携随车 / 80mm 档口宽幅）必须恒定锁定 1:1 物理比例，杜绝使用可能导致宽高尺寸动画跳动的 `transition-all`（改用 `transition-colors`），确保用户在点击纸样上任意虚线框文字直接就地修改时，互动器比例画面稳如磐石，绝不允许产生任何放大或抖动。
- **输入聚焦防视口位移 (preventScroll)**：
  - 虚线输入框被点击激活时，程序聚焦必须显式使用 `inputRef.current.focus({ preventScroll: true })`，严禁触发浏览器默认的强制滚动居中（Scroll Jump），防止打样画幅发生突兀偏移。
- **点击事件严格阻断冒泡 (stopPropagation)**：
  - 所有虚线输入框及行内编辑态容器必须显式配置 `e.stopPropagation()`，彻底杜绝点击编辑时冒泡触发外层卡片选择、折叠抽屉或拖拽事件。
- **虚线输入框 (Dashed Input Box) 视觉统一规范**：
  - 原地编辑控件在非编辑态统一配置轻量虚线框与柔和高亮底色（如 `border border-dashed border-emerald-400/60 bg-emerald-50/20 hover:border-emerald-600`），激活编辑态时维持精准微圆角（`rounded-md`）与高反差聚焦环（`ring-2 ring-emerald-500/20`），清晰告知食客与档口操作员「此项可随时点击就地重命名或修改」。

---

## 7. 向下拉彩单/菜单小组件 AI 生成美化版硬性规范 (Strict Beautified Pull-down / Dropdown Menu Component Rule)

本规范为 **AI Agent 生成与维护本项目的最高硬性指令之一**。在任何后续功能开发、页面构建、组件生成或交互重构中，凡涉及「向下拉彩单 / 下拉菜单小组件（Pull-down Menu / Dropdown Popover / 下拉选择器）」时，**AI 必须严格生成美化版内容，严禁生成任何简陋版或原生裸露选项**：

### 1. 彻底废除粗糙简陋与原生裸露下拉 (Anti-Bare & Anti-Primitive Dropdown)
- **绝对禁止原生 `<select>` 与纯文本裸列表**：
  - 严禁直接使用未经深度美化的浏览器原生 `<select>` 控件或仅有一行文字的枯燥纯文本列表；
  - 严禁出现无图标、无副标说明、无微标徽章、无交互动效的「空白毛坯」下拉菜单。
- **强制要求全要素美化版 (Mandatory All-Factor Beautified Version)**：
  - 所有向下拉彩单/菜单组件，必须包含 **「语义化矢量图标 + 专属底槽 + 主标题 + 解释性副标题/工况描述 + 胶囊状态微标 + 选中勾选态 + 顺滑展开动效」** 完整视觉系统。

### 2. 美化版向下拉彩单核心视觉标准 (Beautified Pull-down Visual Standard)
1. **语义化矢量图标与微光底槽 (Semantic Vector Icon with Glow Container)**：
   - 菜单项左侧必须配置 16px~20px 的专属精致矢量图标（如 `Lucide-react` 常用图标族）；
   - 图标必须内嵌于专属圆角微光底槽中（如 `w-8 h-8 rounded-lg flex items-center justify-center`），常态赋予主题浅色底（如 `bg-neutral-100/80` 或 `bg-emerald-50`），激活时三位一体同色高亮。
2. **双层层级排版与工况副标题 (Two-Tier Typography with Rich Subtitle)**：
   - **主标题**：加粗工控标准字（`text-xs font-bold text-neutral-900`），简明扼要，严禁使用等宽或硬编码等线字体；
   - **副标题说明**：细致次级文本（`text-[11px] text-neutral-500 leading-tight`），清晰说明该项的功能、适用场景、履约时效或当前工况。
3. **胶囊微标与实时数据点缀 (Status Capsule Badges & Metrics)**：
   - 菜单项右侧或标题旁必须点缀精致胶囊徽标（如 `text-[10px] font-bold px-2 py-0.5 rounded-full border`）；
   - 支持动态点缀待办计数值（如 `+3`）、特惠折扣（如 `9折`）、认证标识（如 `VIP专享`、`免密通行`、`即时生效`）或状态呼吸指示灯（`animate-pulse`）。
4. **半透明高阶毛玻璃与悬浮阴影 (Frosted Glass Container & Elevation)**：
   - 下拉浮层承载容器必须采用高阶毛玻璃设计：
     ```tsx
     className="rounded-xl backdrop-blur-xl bg-white/95 border border-neutral-200/90 shadow-2xl shadow-neutral-950/12 p-1.5 z-50 overflow-hidden"
     ```
   - 容器支持按业务逻辑加入精致分组小标题（Group Header，如 `text-[10px] font-bold text-neutral-400 px-2.5 py-1 tracking-wider uppercase`）与极细分割线（`border-b border-neutral-100/90`）。
5. **同色系微拟态高亮与勾选对勾 (Chromatic Unity & Selection Checkmark)**：
   - 激活选中项必须配置统一主题高亮色（如翡翠绿 `border-emerald-600/30 bg-emerald-50/60 text-emerald-950`），外圈附带轻微柔光（`ring-1 ring-emerald-500/15`）；
   - 选中项右侧显式展示高反差主题色勾选图标（`<Check className="w-4 h-4 text-emerald-600 shrink-0" />`），未选项则保持柔和呼吸空态。
6. **丝滑物理级展启动效 (Smooth Spring Animations via AnimatePresence)**：
   - 下拉菜单展开与收起必须由 `framer-motion`（`motion/react`）的 `AnimatePresence` 驱动，配置轻量位移与透明度缩放：
     ```tsx
     initial={{ opacity: 0, y: -6, scale: 0.98 }}
     animate={{ opacity: 1, y: 0, scale: 1 }}
     exit={{ opacity: 0, y: -6, scale: 0.98 }}
     transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
     ```
7. **触控防误触与 16px 防缩放合规 (Touch & Zero-Zoom Compliant)**：
   - 下拉项触控热区高度统一大于等于 36px，内边距规范 `px-2.5 py-2 rounded-lg`；
   - 若下拉彩单内部带有检索或过滤输入框，严格遵循第 6 条规范（移动端计算字号不低于 16px、配置 `touch-action: manipulation`），彻底禁止触发视口缩放与画幅跳动。

---

## 8. 工单状态流转微标防溢出与精简适读规范 (Status Capsule Badge Anti-Overflow & Compact Legibility Rule)

本规范为 **AI Agent 生成与维护工单卡片、状态微标与表头状态指示器的最高硬性指令之一**：

### 1. 状态标签防超长防撑破铁律 (Anti-Super-Long Status String Rule)
- **绝对禁止长文本直接灌入状态胶囊**：
  - 严禁将业务数据层中的长串工况描述（如「堂食后厨现制中 (0/3已上桌)」、「专线骑手正在疾速派送中已完成2单」等 10+ 字符长文本）直接渲染在移动端单排或工单卡片顶栏的状态微标按钮中；
  - 必须配置紧凑格式化适配器（如 `getCompactStatusBadgeLabel`），提取精简工况（如 `现制中 (0/3)`、`上桌中 (2/3)`、`后厨现制`、`待接单`、`待取餐`、`配送中` 等 3~7 个字符）；
  - 冗长描述与完整进度文字仅允许呈现在 HTML 原生 `title` 气泡提示中或点击展开的下沉彩单中。

### 2. 状态微标容器三重硬性防溢出尺寸约束 (Triple Anti-Overflow Guardrails)
- **最大宽度硬约束**：状态胶囊按钮必须配置显式最大宽度限制（移动端 `max-w-[125px]` / 桌面端 `max-w-[160px]`）；
- **文字截断防御**：微标文字承载节点必须显式配置 `<span className="truncate min-w-0">{compactLabel}</span>`，杜绝无约束的裸 `whitespace-nowrap` 撑破父容器；
- **弹性顶栏自适应**：在任何单排顶栏（Header Tier）中，左侧信息容器（单号、桌号、自提码）必须配置 `flex-1 min-w-0 overflow-hidden`，右侧状态微标配置 `shrink-0 flex items-center`，保证在 320px~375px 超窄屏幕上左右两侧绝对不发生重叠遮挡、相互挤压或右侧突兀出界。

---

## 9. 移动端卡片内嵌式推移展开与防遮挡裁切铁律 (Mobile In-Card Inline Expansion & Anti-Clipping Rule)

本规范为 **AI Agent 生成与维护移动端卡片、复合清单明细与弹出菜单的最高硬性指令之一**：

### 1. 外层承载卡片严禁盲目配置 `overflow-hidden` (Zero Blind overflow-hidden on Outer Cards)
- 包含下拉彩单、用户档案浮层、状态流转抽屉的卡片外层容器（如订单卡片 `<article>`、工况行），**绝对禁止盲目添加 `overflow-hidden`**；
- 避免任何绝对定位（`position: absolute`）浮层因超出父卡片下沿而被浏览器硬性腰斩截断或隐形消失。

### 2. 移动端复合清单明细一律采用内嵌式丝滑推移展开 (Mandatory Inline Accordion Expansion on Mobile)
- **拒绝遮挡操作键**：在移动端订单卡片、商品卡片、工单面板中，菜品清单明细、物料清单等复合信息展示，严禁使用覆盖在卡片下方的绝对定位浮层（悬浮浮层不仅容易被下层堆叠上下文遮挡，还会盖住卡片底部的「叫号/传菜」、「联络食客」、「打单小票」、「作废删除」等高频操作控制台）；
- **内嵌流式向下推移 (In-Flow Inline Flow)**：移动端卡片必须采用 `variant="inline"` 展开模式，通过 `framer-motion` 的 `AnimatePresence` 驱动高度自适应展开（`initial={{ opacity: 0, height: 0 }}` -> `animate={{ opacity: 1, height: 'auto' }}`），将卡片下方的操作控制台自然平滑向下推移；
- **保障 100% 完整可视与零冲突**：展开的明细面板内嵌于卡片之中，自带独立轻柔内滚动（`max-h-[260px] overflow-y-auto`）与快捷收起按钮（`✕`），确保任何窄屏设备下菜品明细与操作按键全部 100% 完整可见、零被遮挡、零视口跳动。

---

## 10. 菜品清单现分割线分割、微圆角工控标准与全子元素网格化布局硬性规范 (Dish List Divider, Micro-Rounded Corners & Grid Matrix Rule)

本规范为 **AI Agent 生成与维护后厨工单卡片 (KDS)、菜品表单、菜品清单与出餐进度看板的最高硬性指令之一**：

### 1. 菜品列表一体化容器与实线细分割铁律 (Unified Container & divide-y Rule)
- **取消离散臃肿卡片**：菜品列表严禁使用分散、多重边框且带间距的独立子卡片堆叠；
- **一体化与现分割线分割**：菜品列表必须收拢于一体化标准容器中（`bg-white border border-neutral-200/90 overflow-hidden shadow-2xs`），每个菜品行项之间统一采用现分割线（`divide-y divide-neutral-200/80`）清晰硬朗分割，呈现精密工控质感。

### 2. 取消大圆角全面采用微圆角硬性规范 (Micro-Rounded Corners Rule `rounded-[2px]~rounded-[3px]`)
- **严禁粗圆角 (Anti-Large Rounded Corners)**：后厨 KDS 工单卡片、菜品表单、工况汇总卡片及其内部所有子元素（按钮、微标、状态标签、时间线节点、数量指示器），一律废除 `rounded-lg`、`rounded-md`、`rounded-full` 等柔性大圆角；
- **统一微圆角规整标尺**：
  - 外层承载卡片、弹窗与列表一体化容器：统一配置微圆角 `rounded-[3px]`；
  - 交互按钮（叫号、作废、出餐、划菜计数器）：统一配置微圆角 `rounded-[3px]`；
  - 内部微标、状态胶囊、规格要求、时间戳微标：统一配置微圆角 `rounded-[2px]`。

### 3. 卡片内部区域所有子元素严格网格化与自适应流排版 (Strict CSS Grid Matrix & Adaptive Flow)
- **结构化网格骨架**：菜品卡片与行内各子元素必须使用结构严谨的双列架构组织排版：
  - 采用 `grid grid-cols-[1fr_auto] gap-x-2 gap-y-1 p-2 sm:p-2.5 items-start min-w-0 max-w-full overflow-hidden` 架构；
  - **列 1 (左侧信息矩阵 `flex flex-col gap-1 min-w-0 max-w-full overflow-hidden`)**：
    - 行 1：菜品主标题（`font-bold text-xs sm:text-[12.5px] leading-snug break-all`）+ 规格要求微标；
    - 行 2：加急与备注专属单元格（若有，强制配置 `min-w-0 max-w-full truncate`）；
    - 行 3：下单时间 + 烹饪中/出餐耗时工况流转单元（必须采用 `flex flex-wrap items-center gap-1 text-[10px] min-w-0 max-w-full`，**绝对严禁使用不可换行的 `grid-flow-col auto-cols-max` 硬撑宽**）；
  - **列 2 (右侧工控与操作矩阵 `flex items-center gap-1 shrink-0 justify-end pt-0.5`)**：
    - 精准时间线展开微圆角按键（`w-6 h-6 sm:w-7 sm:h-7 rounded-[2px]`）；
    - 划菜操作与数量微圆角指示器（`h-6 sm:h-7 px-2 rounded-[2px] text-[11px] sm:text-xs`、完成对勾）；
  - **展开行 (时间线矩阵 `col-span-2`)**：跨双列通栏展开，内部流转节点采用精准网格点位、微圆角指示器与自适应文字换行对齐。

---

## 11. 全局绝对尺寸物理边界、零溢出与智能文本/字号梯级缩放硬性规范 (Absolute Size Boundary, Zero Overflow & Smart Proportional Typography Rule)

本规范为 **AI Agent 生成与维护本系统所有界面、工单卡片、微标与弹层的最高硬性防溢出指令**：

### 1. 元素绝对不允许超出容器尺寸 (Absolute Boundary & Zero Blow-Out Rule)
- **100% 容器边界锁定**：所有卡片、容器、子区块必须显式声明 `w-full max-w-full overflow-hidden`，绝对禁止任何子元素凭借内部长文本、未折行徽标或大尺寸固定宽高将父容器硬性撑爆；
- **CSS Grid/Flex min-w-0 铁律**：Grid 列或 Flex 子节点若承载可变长度文本或标签，必须显式附加 `min-w-0 max-w-full`，彻底破除浏览器默认 `min-width: auto` 导致的无底线宽度延展。

### 2. 智能文本与字号梯级缩放规范 (Intelligent Text & Proportional Font Downscaling)
- **时间与耗时字段紧凑智能压缩**：
  - 时间戳一律智能裁剪为 `HH:mm`（如 `18:14` 而非 `18:14:00`）；
  - 制作耗时一律采用紧凑工控格式（如 `6m28s` 或 `6m`，杜绝冗长字符 `耗时6分28秒`）；
- **字号智能下调与自适应换行**：
  - 紧凑工况与次级标签（下单时间、出餐耗时、烹饪状态）统一缩微至 `text-[10px]` 并搭配极简内边距 `px-1.5 py-0.5 leading-tight`；
  - 容器必须配置 `flex-wrap` 或 `break-all`，在窄屏（如 320px~375px）下自适应自然换行，绝不允许单行硬溢出。

### 3. 黄色/琥珀色高亮元素与状态标签紧凑化防溢出 (Compact Alert & Flame Tag Guardrail)
- **杜绝高警示大元素撑破**：黄色/琥珀色/加急催单等视觉重点元素（如 `bg-amber-50` 烹饪中、催单加急、自提码微标）严禁使用过大字号与外边距；
- **微标尺寸约束**：所有状态标签高度统一在 `h-5`~`h-6` 以内，图标控制在 `w-2.5 h-2.5`~`w-3 h-3`，文字超长时严格执行 `truncate` 截断，保障视觉和谐与绝对零溢出。



