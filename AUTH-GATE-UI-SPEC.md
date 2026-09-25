# 门禁 / 登录弹窗 UI 设计规范（提取稿）

> **提取范围**：Urban Radar 流动餐车平台中全部「准入门禁 / 身份登录」类弹窗
> **提取方式**：从源码逐类读取 Tailwind 工具类 → 反解为设计令牌（color / radius / shadow / typography / spacing / motion）
> **代码基线**：`remix-remix-remix-remix-remix-asym447`（2026-09-11）
> **性质**：本文是**对现状的忠实提取（de-facto spec）**，非理想规范；第 7 节列出与权威令牌集的偏差。

---

## 1. 范围界定：哪些弹窗属于「门禁登录弹窗」

| # | 组件 | 文件 | 门禁语义 | 视觉方言 |
|---|------|------|----------|----------|
| A | **平台总控准入门禁** | `src/components/auth/PlatformAuthModal.tsx` | LEVEL-4 监督安全门禁 · 工号/邮箱 + 6 位 PIN | 浅色 |
| B | **商家/骑手手机实名认证** | `src/components/auth/StaffRiderPhoneAuthModal.tsx` | 手机号实名 + 设备硬件指纹绑定 | 深色 |
| C | **开发者与管理员调试认证** | `src/components/dev/DevAuthModal.tsx` | DEV-MODE 安全沙盒隔离 | 深色 |
| D | **RBAC 岗位权限受限拦截** | `src/components/auth/PermissionDeniedGuard.tsx` | 无权访问 → 店长临时提权放行 | 浅色（内嵌面板） |
| E | **在岗交接班换登** | `src/components/auth/StaffShiftHandoverModal.tsx` | 岗位即时换登 · 一键无密 | 浅色 |
| — | 门禁入口（非弹窗） | `src/components/RoleSwitcherDropdown.tsx` | 四端切换器中的入口徽标 | 浅色胶囊 |

**挂载与触发**（`src/App.tsx`）：
- `isStaffRiderAuthModalOpen` → 选择「商家端 / 骑手端」时触发（L787 / L793）
- `isPlatformAuthModalOpen` → 选择「平台总控端」时触发（L798）
- `DevAuthModal` 由 `DevSimulationContext` 控制，触发路径：角色切换器底部「开发者登录」/ 个人中心 / `Ctrl+Shift+D`
- 认证成功统一弹 toast：`平台总控安全门禁认证通过`（L2978）

---

## 2. 全局共性规范（A–E 共用）

### 2.1 遮罩层 Overlay

| 令牌 | 取值 | 适用组件 |
|------|------|----------|
| 定位 | `fixed inset-0` | A / B / C / E |
| 层级 | `z-50`（无其它层级变量） | A / B / C / E |
| 居中 | `flex items-center justify-center` | 全部 |
| 外层内边距 | `p-3 sm:p-4`（≥480px 断点放大） | A / B / E |
| 外层内边距 | `p-4`（无断点） | C |
| 遮罩底色 | `bg-black/60` | A / E |
| 遮罩底色 | `bg-black/75` | B / C |
| 背景模糊 | `backdrop-blur-xs` | A / E |
| 背景模糊 | `backdrop-blur-md` | B / C |
| 入场动画 | `animate-in fade-in duration-200` | B / C（A / E 无遮罩层动画） |

> 例外：**D（PermissionDeniedGuard）不是浮层**，而是页面内嵌面板 —— `w-full py-8 sm:py-12 px-4 flex items-center justify-center`，无遮罩、无 z-index。

### 2.2 弹窗容器 Container

| 令牌 | 取值 |
|------|------|
| 圆角 | `rounded-2xl`（16px）— A/B/C/E 全部一致 |
| 边框（浅色） | `border border-neutral-300` |
| 边框（深色） | `border border-neutral-800` |
| 阴影 | `shadow-2xl`（全部） |
| 结构 | `overflow-hidden flex flex-col` + 内容区 `overflow-y-auto` |
| 最大高度 | `max-h-[92vh]`（A / B）、`max-h-[90vh]`（E）、C 无限制 |
| 最大宽度 | `max-w-lg`（512px）— A / B / E；`max-w-md`（448px）— C；`max-w-xl`（576px）— D |
| 字体族 | `font-sans`（B / C 显式声明；A / E 继承 body） |

### 2.3 方言差异：两套皮肤

| 维度 | 浅色方言（A / E / D） | 深色方言（B / C） |
|------|----------------------|-------------------|
| 面板底色 | `bg-white` | `bg-[#141517]`（B） / `bg-[#121314]`（C） |
| 主文字 | `text-[#1a1a17]` | `text-white` |
| 顶部装饰条 | 无 | `h-1.5` 双色渐变（B） / `h-1` 三色渐变（C） |
| 顶栏 Header | 实底深色 `bg-[#1a1a17] text-white` | 半透明 `bg-neutral-900/60`（B） / 无底色（C） |
| 头部分隔线 | 无 | `border-b border-neutral-800/80` |
| 关闭按钮 | `p-1.5 rounded-lg` + `hover:bg-white/10`（A/E） | `w-8 h-8 rounded-full`（B） / `w-7 h-7 rounded-full`（C） |
| 底栏 Footer | `border-t border-neutral-200` + 浅底 | `bg-neutral-950`（B） / `bg-neutral-950/80`（C） |
| 正文内边距 | `p-4 sm:p-5` | `p-4 sm:p-5`（B） / `p-5`（C） |

### 2.4 动效 Motion

| 组件 | initial | animate / exit | transition |
|------|---------|----------------|------------|
| A / E | `{ opacity:0, scale:0.95, y:10 }` | `{ opacity:1, scale:1, y:0 }` | `{ duration: 0.2 }` |
| B | `{ scale:0.96, opacity:0, y:12 }` | 同上（y:0） | `{ type:'spring', stiffness:400, damping:28 }` |
| C | `{ scale:0.95, opacity:0, y:15 }` | 同上（y:0） | `{ type:'spring', stiffness:450, damping:30 }` |
| 错误块（C） | `{ opacity:0, y:-6 }` | `{ opacity:1, y:0 }` | 默认 |
| 指纹折叠区（B） | `{ height:0, opacity:0 }` | `{ height:'auto', opacity:1 }` | 默认 |
| 加载旋转 | `animate-spin` | — | lucide `RotateCw` |
| 提交反馈 | `active:scale-[0.99]`（C） | `hover:` 提亮一档 | `transition-all` |

**动效时长规范（隐含）**：遮罩淡入 200ms；容器 200ms（tween）或 spring(400/28–450/30)；微交互 `transition-colors` / `transition-all` 走 Tailwind 默认 150ms。

### 2.5 圆角体系（弹窗内实际使用）

| 用途 | 类名 | 值 |
|------|------|-----|
| 弹窗容器 | `rounded-2xl` | 16px |
| 输入框 / 列表卡 / 提示条 / 页签组 | `rounded-xl` | 12px |
| 按钮 / 浅色输入框 / 图标按钮 | `rounded-lg` | 8px |
| 角色图标盒（切换器） | `rounded-md` | 6px |
| 头像盒（B） | `rounded-lg` | 8px |
| 关闭按钮（深色方言） | `rounded-full` | 胶囊（**与权威令牌"禁止胶囊"冲突**） |
| 头部等级徽标 | `rounded-full` | 胶囊 |

### 2.6 图标规范（lucide-react）

| 场景 | 尺寸 | 备注 |
|------|------|-------|
| 头部图标盒 | `w-11 h-11`（B）/ `w-10 h-10`（C）/ `w-12 h-12`（D） | 圆角 `rounded-xl` |
| 头部主图标 | `w-5 h-5` | `strokeWidth` 2 ~ 2.2 |
| 表单前缀 / 错误图标 | `w-4 h-4` | — |
| 按钮内图标 | `w-3.5 h-3.5` | — |
| 徽标内图标 | `w-3 h-3` | — |

### 2.7 语义色分配（按端）

| 端 | 主强调色族 | 头部图标盒 | 选中态 | 提交按钮渐变 |
|----|-----------|-----------|--------|-------------|
| 商家端 B | Amber | `bg-amber-500/15 border-amber-500/30 text-amber-400` | `bg-amber-500/10 border-amber-500/40` | `from-amber-400 to-amber-500` |
| 骑手端 B | Emerald | `bg-emerald-500/15 border-emerald-500/30 text-emerald-400` | `bg-emerald-500/10 border-emerald-500/40` | `from-emerald-400 to-emerald-500` |
| 平台端 A | Indigo | `bg-indigo-900/60 border-indigo-400/40 text-indigo-200` | `border-indigo-600 bg-indigo-50/40` | 深炭 `bg-[#1a1a17]`（图标 indigo） |
| 开发者 C | Amber | `bg-amber-500/10 border-amber-500/30 text-amber-400` | — | `from-amber-500 to-amber-600` |
| 受限拦截 D | Amber | `bg-amber-50 border-amber-200 text-amber-700` | — | 深炭 `bg-[#1a1a17]` |

顶部渐变条：商家 `from-amber-500 via-orange-500 to-amber-600`；骑手 `from-emerald-500 via-teal-500 to-emerald-600`；开发者 `from-amber-500 via-emerald-500 to-sky-500`。

---

## 3. 分组件详细规范

### A. PlatformAuthModal — 平台总控准入门禁（浅色）

**头部横幅** `bg-[#1a1a17] text-white p-4 sm:p-5 flex items-start justify-between relative overflow-hidden`
- 装饰光晕：`absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none`
- 等级徽标：`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-900/60 border border-indigo-400/40 text-[10px] font-mono text-indigo-200` + `ShieldCheck w-3 h-3 text-indigo-400`，文案 `LEVEL-4 SUPERVISION SECURITY GATE`
- 主标题：`text-base sm:text-lg font-bold tracking-tight text-white`，文案「平台总控中心 · 专员安全准入门禁」
- 副说明：`text-xs text-neutral-300 mt-1 max-w-md`
- 关闭：`p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors`

**正文** `p-4 sm:p-5 overflow-y-auto space-y-4`

预设账号卡（3 组）：`p-2.5 rounded-xl border text-left cursor-pointer transition-all`
- 选中：`border-indigo-600 bg-indigo-50/40 shadow-xs`
- 默认：`border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/60`
- 头像 `text-base`；姓名 `text-xs font-bold text-[#1a1a17]`；角色标签 `text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-600 border border-neutral-200`；备注 `text-[11px] text-neutral-500`
- PIN 徽标：`inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded`

表单字段：
- 标签 `block text-xs font-semibold text-neutral-700 mb-1`
- 输入框 `w-full text-xs font-mono px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500`
- PIN 框附加 `tracking-widest`，右侧 `KeyRound w-4 h-4 text-neutral-400 absolute right-2.5 top-2.5`
- 字段级提示 `text-[10px] text-neutral-400 font-mono`（如「3 组预设权限」「通用万能放行码: 888888」）

错误提示：`p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700` + `AlertCircle w-4 h-4 shrink-0`

操作区：`pt-2 flex items-center justify-end gap-2 border-t border-neutral-200 mt-4`
- 取消：`px-3.5 py-1.5 text-xs text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors`
- 主按钮：`px-4 py-1.5 text-xs font-bold text-white bg-[#1a1a17] hover:bg-neutral-800 rounded-lg transition-all shadow-xs` + `ShieldCheck w-3.5 h-3.5 text-indigo-400`；加载文案「验证中...」；`disabled={isSubmitting}`

**校验逻辑**：账号 + PIN 双必填；主 PIN `888888` 全局通配；模拟核验延时 250ms。

### B. StaffRiderPhoneAuthModal — 商家 / 骑手手机实名认证（深色）

**顶部装饰条** `h-1.5 w-full` + 按端渐变（见 2.7）

**Header** `p-4 sm:p-5 border-b border-neutral-800/80 flex items-start justify-between bg-neutral-900/60`
- 图标盒 `w-11 h-11 rounded-xl border flex items-center justify-center shrink-0`（按端配色），图标 `Store` / `Bike` `w-5 h-5`
- 标题 `font-bold text-base text-white tracking-tight`（「POS 商家工作台 · 手机号实名认证」/「骑士专送工作台 · 手机号实名认证」）
- 端别徽标 `text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border`（`商家端登录` / `骑手端登录`）
- 副说明 `text-xs text-neutral-400 mt-0.5`
- 关闭 `w-8 h-8 rounded-full bg-neutral-800/80 hover:bg-neutral-800 text-neutral-400 hover:text-white`，`title="关闭认证窗口"`

**设备指纹横幅** `px-4 py-2.5 bg-neutral-900/90 border-b border-neutral-800/80 flex items-center justify-between gap-2`
- 图标 `Fingerprint w-4 h-4 text-emerald-400`
- 正文 `text-[11.5px] leading-tight text-neutral-300 truncate`；哈希值 `text-emerald-400 font-mono font-bold`（未就绪显示 `HW-COLLECTING...`）
- 辅助说明 `hidden sm:inline`（移动端隐藏）
- 展开按钮 `text-[11px] text-neutral-400 hover:text-neutral-200 underline`

**指纹折叠矩阵** `overflow-hidden bg-[#0d0e10] border-b border-neutral-800 px-4 py-3 text-[11px] font-mono text-neutral-300 space-y-1.5`
- 表头 `flex justify-between border-b border-neutral-800/60 pb-1 text-neutral-400 text-[10px]`
- 数据网格 `grid grid-cols-2 gap-2 text-[10.5px]`：屏幕物理矩阵 / GPU 芯片与渲染器 / 声卡 DSP 散列 / Canvas 渲染哈希
- 脚注 `text-[10px] text-neutral-500 italic`

**页签组** `flex p-1 bg-neutral-900 rounded-xl border border-neutral-800 gap-1`
- 页签 `flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5`
- 激活 `bg-neutral-800 text-white shadow-xs`；未激活 `text-neutral-400 hover:text-white`
- 三页签：`Smartphone 短信验证码登录` / `KeyRound 手机密码登录` / `Sparkles text-amber-400 在册账号选单`

**表单字段**（B 的输入框尺寸明显大于 A）：
- 标签 `block text-xs font-semibold text-neutral-300 mb-1.5`
- 输入框 `w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 transition-colors`
- 手机号框：`pl-12 pr-4`，`+86` 前缀 `absolute left-3 text-neutral-400 text-xs font-mono font-bold select-none`，有值时右侧出现「清空」按钮
- 验证码行：`flex gap-2`；验证码框 `flex-1 maxLength=6 tracking-wider`；获取按钮 `px-4 py-2.5 rounded-xl text-xs font-bold border shrink-0`
  - 可用：`bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40`（骑手端换成 emerald 系）
  - 倒计时中：`bg-neutral-800 text-neutral-500 border-neutral-700 cursor-not-allowed`，文案 `${countdown}s 后重新发送`
- 密码框：右侧 `Eye / EyeOff w-4 h-4` 切换可见性

**预设账号卡** `p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between`
- 选中：`bg-amber-500/10 border-amber-500/40`（骑手端 emerald 系）
- 默认：`bg-neutral-900/70 border-neutral-800 hover:border-neutral-700`
- 头像盒 `w-9 h-9 rounded-lg bg-neutral-800`；姓名 `font-bold text-sm`；工号 `text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300`；手机号 `text-xs font-mono text-neutral-400`
- 右侧按钮 `px-3 py-1.5 rounded-lg text-xs font-bold`：选中 `bg-amber-500 text-neutral-950 font-black`（→「已选定」）；未选中 `bg-neutral-800 hover:bg-neutral-700 text-neutral-300`（→「选择此号」）

**错误提示** `p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2`

**提交按钮（通栏）** `w-full py-3 rounded-xl font-bold text-sm text-neutral-950 flex items-center justify-center gap-2 shadow-lg`
- 加载：`RotateCw w-4 h-4 animate-spin` + 「正在核验手机号与绑定硬件特征...」+ `opacity-70 cursor-wait`
- 常态：`ShieldCheck w-4 h-4` + 「手机号验证并进入{端名}工作台」+ `ArrowRight w-4 h-4 ml-0.5`

**底栏** `p-3 bg-neutral-950 border-t border-neutral-800/80 text-[11px] text-neutral-400 flex items-center justify-between`
- 左：`ShieldCheck w-3.5 h-3.5 text-emerald-400` + 「手机号实名鉴权 · 设备硬件指纹信息持续不变」
- 右：`text-[10px] text-neutral-500 font-mono` + `Urban Radar Auth v3.2`

**交互规则**：手机号必须 11 位（`replace(/\D/g,'')` 过滤非数字）；短信码 6 位、演示固定 `888888` 自动填入；重发倒计时 60s；打开弹窗即采集设备指纹并预填首个预设账号；三种登录方式 `phone_sms` / `phone_pwd` / `one_click`。

### C. DevAuthModal — 开发者与管理员调试认证（深色）

- 容器 `max-w-md`（三端最窄）；顶部 `h-1 bg-gradient-to-r from-amber-500 via-emerald-500 to-sky-500`
- Header `p-5 pb-4 border-b border-neutral-800/80`：图标盒 `w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400` + `Terminal w-5 h-5 stroke-[2.2]`；标题 `font-bold text-base text-white tracking-tight` + 徽标 `text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30`（`DEV-MODE`）
- 安全边界提示 `px-5 py-3 bg-neutral-900/60 border-b border-neutral-800/60 flex items-start gap-2.5` + `ShieldAlert w-4 h-4 text-amber-400`，正文 `text-[11.5px] leading-relaxed text-neutral-300`，强调词 `text-amber-300`
- 表单 `p-5 space-y-4`；输入框 `pl-9 pr-3 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700/80 text-sm font-mono`，左侧内嵌图标 `absolute inset-y-0 left-0 pl-3 text-neutral-500`（`UserCheck` / `KeyRound`），密码框右侧 `Eye/EyeOff`；聚焦 `focus:border-amber-500 focus:ring-1 focus:ring-amber-500`
- 错误块 `p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2`
- 快捷区 `flex items-center justify-between`：一键填入 `text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium underline underline-offset-2` + `Sparkles w-3.5 h-3.5`；快捷键提示 `text-[10px] text-neutral-500 font-mono`（`快捷键 Ctrl+Shift+D`）
- 双按钮 `flex items-center gap-2`：取消 `flex-1 py-2.5 rounded-xl border border-neutral-700 bg-neutral-800/80 text-xs font-semibold text-neutral-300`；提交 `flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-xs font-black text-black tracking-wide shadow-md`
- 底栏 `p-3 bg-neutral-950/80 border-t border-neutral-800/60 text-center text-[10.5px] text-neutral-500`
- 演示凭证：`admin` / `admin888`（`DESIGNATED_ADMIN_PASSWORD`）；模拟核验 250ms

### D. PermissionDeniedGuard — RBAC 受限拦截（浅色内嵌面板）

- 容器 `bg-white rounded-2xl border border-neutral-300 shadow-xl max-w-xl w-full p-6 sm:p-8 text-[#1a1a17]`
- 顶部告警区 `flex items-start gap-4 pb-5 border-b border-neutral-200`：图标盒 `w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-700` + `ShieldAlert w-6 h-6`
- 受限徽标 `inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-100/70 border border-amber-300/60 text-[10px] font-mono text-amber-900 font-bold` + `Lock w-3 h-3`
- 标题 `text-lg font-bold tracking-tight`；说明 `text-xs text-neutral-500 mt-1`
- **身份对照双栏** `grid grid-cols-1 sm:grid-cols-2 gap-3 my-5`：
  - 当前身份卡 `p-3 rounded-xl bg-neutral-50 border border-neutral-200`（眉标题 `text-[10px] font-mono text-neutral-400 uppercase tracking-wider`）
  - 准入要求卡 `p-3 rounded-xl bg-amber-50/50 border border-amber-200`（眉标题 `text-[10px] font-mono text-amber-700`）
  - 岗位徽章沿用 `ROLE_LEVEL_META.badgeColor`（Tier1 店长 `bg-amber-100 text-amber-900 border-amber-300`；Tier2 `bg-blue-50 text-blue-800 border-blue-200`；Tier3 出品 `bg-orange-50 / bg-cyan-50`；Tier4 物流 `bg-emerald-50 text-emerald-900 border-emerald-200`）
- **提权区** `bg-[#fbfbf9] p-4 rounded-xl border border-neutral-200 mb-5`：标题 `text-xs font-bold text-neutral-800` + `KeyRound w-3.5 h-3.5 text-amber-600`；提示 `text-[10px] font-mono text-neutral-400`（`测试放行码: 8888`）
  - PIN 输入 `flex-1 text-xs font-mono px-3 py-1.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white`，`maxLength=8`，占位「输入 4~6 位店长放行 PIN」
  - 提交 `px-3.5 py-1.5 bg-[#1a1a17] hover:bg-neutral-800 text-white text-xs font-bold rounded-lg disabled:opacity-40`，禁用条件 `isSubmitting || !overridePin`
  - 行内错误 `text-[11px] text-red-600 mt-1.5 flex items-center gap-1` + `AlertCircle w-3 h-3`
- **底部导航** `flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-neutral-200`
  - 次要「返回允许的常规操作」`px-4 py-2 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-50 text-xs font-medium` + `ArrowLeft w-3.5 h-3.5`
  - 主「快速交接班 / 切换店长登录」`px-4 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300/80 text-amber-900 text-xs font-bold shadow-2xs` + `UserCheck w-3.5 h-3.5 text-amber-600`
- **规则常量**：放行码白名单 `['8888','666666','123456']`；提权有效期 **15 分钟**；模拟核验 200ms

### E. StaffShiftHandoverModal — 在岗交接班（浅色）

- 头部同 A 的深色横幅机制：`bg-[#1a1a17] text-white p-4 sm:p-5`（**无**光晕装饰、**无** `overflow-hidden`）
- 徽标 `inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-[10px] font-mono text-amber-300` + `ArrowRightLeft w-3 h-3 text-amber-400`，文案 `FOOD TRUCK SHIFT HANDOVER MATRIX`
- 在岗状态条 `bg-neutral-50 px-4 py-2.5 border-b border-neutral-200 text-xs`：左侧 `text-neutral-500`，右侧 `font-bold text-[#1a1a17]` + 状态点 `w-2 h-2 rounded-full bg-emerald-500 animate-pulse`
- 花名册卡 `p-3 rounded-xl border transition-all`：
  - 当值：`border-emerald-600 bg-emerald-50/50 cursor-default ring-1 ring-emerald-500/30`，右侧徽章 `text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-1 rounded-md` + `Check w-3.5 h-3.5`
  - 可切换：`border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50 cursor-pointer`，右侧按钮 `px-3 py-1 bg-white hover:bg-neutral-100 border border-neutral-300 text-xs font-semibold rounded-md` + `ChevronRight w-3.5 h-3.5`
  - 头像盒 `w-10 h-10 rounded-lg bg-neutral-100 border border-neutral-200 text-xl`
  - 工号 `text-[10px] font-mono text-neutral-500 px-1.5 py-0.2 rounded bg-neutral-100 border border-neutral-200`；岗位徽章沿用 `ROLE_LEVEL_META.badgeColor`
- 底栏 `p-4 bg-neutral-50 border-t border-neutral-200 text-xs text-neutral-500`
- **交互**：点击卡片即一键换登（`authMethod:'one_click'`，**无二次验证**）；当值人员禁用点击；切换中显示「切换中...」

---

## 4. 状态规范总表

| 状态 | 表现 |
|------|------|
| 默认 | 见各组件 |
| 悬停（输入框） | 浅色：无 hover 态，仅 focus；深色：`border-neutral-700`→focus `border-amber-500` |
| 聚焦 | 浅色 A：`ring-2 ring-indigo-500 + border-indigo-500`；浅色 D：`ring-2 ring-amber-500`；深色 B：仅 `border-amber-500`（无 ring）；深色 C：`border-amber-500 + ring-1 ring-amber-500` |
| 禁用 | `disabled:opacity-40`（D）/ `disabled:opacity-50`（A）/ `opacity-70 cursor-wait`（B 加载）/ 倒计时按钮 `cursor-not-allowed` |
| 加载 | 文案替换为进行时（「验证中...」「核验中...」「切换中...」「正在核验...」）+ `RotateCw animate-spin`（B） |
| 错误 | 红/玫红浅底胶囊条；B/C 用 `/10` 透明底 + `/30` 描边；A/D 用实底 `bg-red-50` + `border-red-200` |
| 成功 | 关闭弹窗 + 全局 toast（`useToast`）；A 由 `App.tsx` 统一弹「平台总控安全门禁认证通过」 |
| 空/未就绪 | 指纹哈希占位 `HW-COLLECTING...` |

**校验与反馈规则**

| 组件 | 校验 | 提示文案 |
|------|------|----------|
| A | 账号必填、PIN 必填（`maxLength=10`，规范 6 位） | 「平台安全凭证或 6 位 PIN 码不正确，请选择下方演示专员快速登录或输入 888888」 |
| B | 手机号 11 位 | 「请输入正确的 11 位手机号码」/「请输入手机短信验证码」/「请输入登录密码」 |
| C | 账号、密码必填 | `loginAdmin` 返回消息 |
| D | PIN 非空 | 「授权码有误，请输入有效的 4~6 位店长安全授权码 (默认 8888)」 |

---

## 5. 文案规范

- **门禁语汇统一使用军事/安保隐喻**：准入门禁、准入最低要求、放行、提权、核验证据、监督（LEVEL-4 SUPERVISION）、安全沙盒隔离、设备指纹无损继承。
- **标题句式**：`{归属} · {动作/门禁名}`，例：「平台总控中心 · 专员安全准入门禁」「POS 商家工作台 · 手机号实名认证」「餐车站在岗交接班 · 岗位即时换登」。
- **副说明定位**：一句话说明「为什么需要验证」（如：涉及抽佣比例、跨店结算、争议仲裁）。
- **英文全大写单行标签**（等宽字体）：`LEVEL-4 SUPERVISION SECURITY GATE`、`DEV-MODE`、`FOOD TRUCK SHIFT HANDOVER MATRIX`。
- **版本戳**：底栏右侧常驻 `Urban Radar Auth v3.2` / `前端客户端安全调试控制中枢 v2.6.4`。
- **演示提示**常显于字段标签右侧（`text-[10px] text-neutral-400 font-mono`），如「通用万能放行码: 888888」「默认密钥: admin888」「测试放行码: 8888」——**上线前必须移除**。

---

## 6. 间距刻度（弹窗内部实际使用）

| 用途 | 值 |
|------|-----|
| 弹窗正文内边距 | 16px（`p-4`）→ 20px（`sm:p-5`） |
| 头部内边距 | 20px（`p-5`，C）/ 16→20px（A/B/E） |
| 底栏内边距 | 12px（`p-3`，B/C）/ 16px（`p-4`，E） |
| 字段间距 | 12px（`space-y-3`，A）/ 16px（`space-y-4`，B/C） |
| 列表卡间距 | 8px（`space-y-2`）/ 10px（`space-y-2.5`） |
| 输入框内边距 | 竖向 10px（`py-2.5`，深色）/ 8px（`py-2`，浅色）/ 6px（`py-1.5`，D） |
| 按钮内边距 | 通栏主按钮 `py-3`；次级 `py-2.5`；紧凑 `py-1.5` |

---

## 7. 与「权威设计令牌集」的偏差（重要）

`src/index.css` 中声明的 **✅ INDUSTRIAL PRECISION CONSOLE 权威令牌集**（`--color-page-bg #F4F4F2`、`--color-dark-container #001020`、`--color-border-main #CCCCCC`、`--radius-console 2/4/8/12`、`--shadow-console-1/2`、禁胶囊、禁柔和云影）**并未被门禁登录弹窗采用**。当前 A–E 全部使用「旧令牌 + 硬编码十六进制」。

### 7.1 硬编码色值清单（违反「禁止在业务组件内硬编码十六进制色值」）

| 色值 | 出现组件 | 用途 | 权威令牌对应 |
|------|----------|------|-------------|
| `#1a1a17` | A / E / D / 切换器 | 头部横幅底、主按钮底、主文字 | `--color-dark-container #001020` |
| `#141517` | B | 弹窗面板底 | `--color-dark-container` |
| `#121314` | C | 弹窗面板底 | `--color-dark-container` |
| `#0d0e10` | B | 指纹矩阵折叠区底 | `--color-dark-container` |
| `#1a1a17`（token） | A / E | 主文字 | `--color-text-prominent #000000` |
| `#fbfbf9` | D | 提权区底 | `--color-page-bg #F4F4F2` |

### 7.2 圆角冲突

- 权威规范：模块容器/弹窗最大 `6px`（`rounded-md`），**胶囊几何严格禁止**（仅限状态点）。
- 实际门禁弹窗：容器 `rounded-2xl`（16px）、输入 `rounded-xl`（12px）、关闭按钮 `rounded-full`、等级徽标 `rounded-full`。**偏差显著。**

### 7.3 阴影冲突

- 权威规范：Elevation L3（下拉/浮层）应为 `0 8px 16px rgba(0,16,32,0.10)` 且「避免柔和云影」。
- 实际：全部使用 Tailwind `shadow-2xl`（`0 25px 50px -12px rgba(0,0,0,0.25)`），属柔和云影。另 B 主按钮用 `shadow-lg`、A 用 `shadow-xs`。

### 7.4 遮罩冲突

- 权威规范：弹窗须「清晰结构化边界」，未规定毛玻璃。
- 实际：A/E `backdrop-blur-xs` + `bg-black/60`；B/C `backdrop-blur-md` + `bg-black/75`。毛玻璃模糊无令牌定义。

### 7.5 字号冲突

- 权威字阶（`m3-*`）：`title-md 16/24`、`body-md 14/20`、`label-md 12/16`、`code-sm 12/16`。
- 实际门禁弹窗大量使用 `text-[10px]` / `text-[10.5px]` / `text-[11px]` / `text-[11.5px]` / `text-[9px]` 等**低于 M3 最小字阶的任意值**，且与 `--breakpoint-tablet/desktop` 三端断点体系无关联。

---

## 8. 无障碍（A11y）缺口清单

经全量检索 `src/components/auth/` 与 `DevAuthModal.tsx`，以下均为**零实现**：

| 项 | 现状 | 应有 |
|----|------|------|
| Esc 关闭 | 未实现（无 `keydown` 监听） | 遮罩层监听 `Escape` 关闭 |
| 焦点管理 | 无 `autoFocus`、无 focus trap | 打开时聚焦首个输入框并锁定 Tab 循环 |
| ARIA | 无 `role="dialog"` / `aria-modal` / `aria-labelledby` | 三者齐备 |
| 关闭按钮语义 | 仅图标，靠 `title` 提示 | `aria-label="关闭"` |
| 表单错误播报 | 仅视觉展示 | `aria-live="polite"` + `aria-describedby` |
| 背景内容 inert | 未处理 | 遮罩开启时 `aria-hidden` 主内容 |

---

## 9. 结论与建议（按优先级）

1. **先统一方言**：目前存在「浅色 vs 深色」两套皮肤、两种输入框尺寸（`px-3 py-2 text-xs` vs `px-3.5 py-2.5 text-sm`）、两种关闭按钮几何。建议**门禁类弹窗统一为深色方言**（安全/门禁语义更契合），或反向统一为浅色 —— 二选一，不要并存。
2. **落地权威令牌**：把 `#1a1a17` → `--color-dark-container`、`rounded-2xl` → `--radius-console-xl(8px)`、`shadow-2xl` → `--shadow-console-2`，即可让门禁弹窗并入 `INDUSTRIAL PRECISION CONSOLE` 体系，消除第 7 节全部偏差。
3. **抽取公共基座**：A–E 共享约 70% 结构（遮罩 + 容器 + 头部横幅 + 滚动正文 + 底栏），建议抽 `AuthGateShell` / `AuthGateField` / `AuthGateCard` 三个原子组件，避免 5 处重复维护。
4. **补 A11y**：至少实现 Esc 关闭 + `role="dialog"` + `aria-label`，成本极低、收益明确。
5. **移除演示痕迹**：`888888` / `admin888` / `8888` 三处明文提示与万能放行码必须在生产构建中剔除（建议用 `import.meta.env.DEV` 条件渲染）。
6. **补移动端适配**：B 的指纹横幅辅助文案已做 `hidden sm:inline`，但 A/E 的头部横幅、D 的双栏对照在 `<480px` 下无专门压缩策略，建议补齐 `xs` 断点（项目已定义 `--breakpoint-xs: 480px`）。

---

*本文由源码静态提取生成，未修改任何业务代码。*
