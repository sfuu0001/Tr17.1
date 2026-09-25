# 会员资料与参数控制台 — 前端设计约束方案

- 版本：v1.0
- 日期：2026-09-11
- 适用范围：`members`（会员储值卡与积分资产）、`user_data_mgmt`（用户数据中心 / 统一档案）、`sku_params`（数字参数与标准管理），及三者名下的全部子组件
- 前置依赖：`src/index.css` 的《INDUSTRIAL PRECISION CONSOLE》权威令牌集
- 关联文档：`PENETRATION-GRADE-DATA-GOVERNANCE-SPEC.md`（数据版本治理）

---

## 0. 结论先行

本次重构的**主要矛盾不是视觉风格，而是四套并行令牌语言 + 会员与参数数据完全不在版本治理覆盖内**。

三条必须先成立的判断：

1. **不得合并页签。** `rbacEngine` 按 `tabId` 授权，`members`（`pos:checkout` / cashier）、`user_data_mgmt`（`finance:view_profit` / manager）、`sku_params`（`menu:price_edit` / manager）三者权限边界互不相同。合并会让收银员拿到 `manager` 级的财务档案视图，属于越权。
2. **本次重构必须同时把 6 个会员/参数持久化键接入写入网关。** 否则"渗透级"覆盖仍然有洞，且控制台自身会成为新的治理盲区。
3. **界面中所有完整性/风险读数必须来自真实引擎。** 当前 `DishParameterRulesModal` 里渲染的 `SHA-256:7e9a0c4` 是装饰字符串，与 P0-c 的真实存证链并存会造成"界面上有两个 SHA-256、一个是假的"这种更坏的局面。

---

## 1. 现状量化审计

### 1.1 代码体量（本次改造范围约 **9,479 行**）

| 模块 | 文件 | 行数 | 任意值硬编码色 | 权威令牌引用 |
|---|---|---|---|---|
| 用户数据中心 | `MerchantUserDataCenter.tsx` | 1,182 | 0 | **0** |
| 会员档案子件 | `user-data/*`（5 个） | 2,140 | 0 | **0** |
| 会员储值/积分 | `MerchantMemberCRM.tsx` | 850 | **139** | 0 |
| 数字参数与标准 | `SkuManagementView.tsx` | 1,458 | **181** | 0 |
| SKU 子件 | `sku/*`（6 个） | 1,571 | 86+ | 0 |
| 菜品参数规则弹窗 | `DishParameterRulesModal.tsx` | 2,278 | **490** | 0 |
| **对照：已迁移基线** | `menu-console/ConsoleMatrix.tsx` | — | **0** | **133** |

### 1.2 四套并行令牌语言

| 族 | 位置 | 命名示例 | 状态 |
|---|---|---|---|
| **A 旧令牌** | `index.css:22–128` | `surface` / `obsidian` / `accent` / `ember` / `brand-*` / `radar-*` / `paper` / `pitch` | 已标 ⛔ DEPRECATED，冻结 |
| **B M3 角色层** | `index.css:222+` | `background` / `on-surface` / `surface-container-high` / `secondary` | 与权威集色值同源，命名不同 |
| **C Tailwind 原生色板** | `user_data` 系列在用 | `bg-white` / `text-neutral-500` / `text-emerald-600` / `bg-rose-100` / `text-sky-600` | 不属于项目设计体系 |
| **D 任意值硬编码** | `sku` / 参数系列在用 | `text-[#64748b]` ×47、`text-[#0f172a]` ×46、`border-[#e2e8f0]` ×22 | 最严重 |
| **✅ 权威集** | `index.css:130–220` | `page-bg` / `card-bg` / `dark-container` / `border-main` / `text-prominent` / `status-olive` / `status-terracotta` / `slate-blue` / `accent-orange` / `rounded-console*` | 新界面唯一允许引用 |

**D 族本质是 C 族的十六进制写法**：`#64748b` = `slate-500`、`#0f172a` = `slate-900`、`#e2e8f0` = `slate-200`。所以第四族不需要单独设计迁移策略，按 C 族映射表统一收编即可。

### 1.3 数据落点与治理缺口（关键）

| 持久化键 | 归属模块 | 是否在治理层覆盖 |
|---|---|---|
| `obsidian_merchant_user_data` | `user_data_mgmt` | ❌ 未覆盖 |
| `obsidian_user_profile` | `user_data_mgmt` | ❌ 未覆盖 |
| `obsidian_cloud_device_registry` | `user_data_mgmt` | ❌ 未覆盖 |
| `obsidian_members_crm` | `members` | ❌ 未覆盖 |
| `obsidian_member_recharges` | `members` | ❌ 未覆盖 |
| `obsidian_sku_params` | `sku_params` | ❌ 未覆盖 |

结论：**会员资料与参数控制台的全部数据当前既无版本指针、也无回滚能力、也无链存证。** 而 `DishParameterRulesModal` 的 `onSave(updatedDish)` 最终落到 `obsidian_truck_dishes`（已覆盖）—— 这形成"同一份菜品数据，从参数弹窗改能被治理，从 SKU 控制台改不被治理"的不一致，必须消除。

---

## 2. 硬性不变式（约束总纲）

以下十条为**验收级约束**，任一不满足即视为重构未完成：

1. **唯一令牌源**：仅允许引用《INDUSTRIAL PRECISION CONSOLE》令牌类名，不得新增 `@theme` 令牌。
2. **零硬编码**：业务组件内不得出现 `#RRGGBB` 字面量，不得出现 `[#...]`、`[rgb(...)]` 任意值类名。
3. **零原生色板**：不得引用 `neutral-* / slate-* / emerald-* / rose-* / sky-* / amber-* / zinc-* / gray-*`。
4. **不合并路由**：三个 `tabId` 保持独立，权限边界不得调整。
5. **写路径统一**：所有业务数据写入必须经 `governedWrite()`，禁止组件内直接调用 `safeSetStorage` 写业务键。
6. **回滚粒度**：编辑类操作的撤销入口必须调用 `rollbackPatches(pointerId, paths)`，支持字段级而非整实体。
7. **真实读数**：完整性、风险、隔离态数据必须来自 `chainProof` / `ruleHits` / `isQuarantined()`，禁止任何装饰性占位。
8. **令牌语义化**：颜色选择由语义决定（可用/异常/敏感/中性），不得由"看起来好看"决定。
9. **三端齐备**：每个屏必须交付 mobile（<768）/ tablet（768–1279）/ desktop（≥1280）三档布局。
10. **降级可见**：存储降级、存证缺失、能力不支持必须在界面如实呈现，不得静默隐藏。

---

## 3. 令牌收编方案

### 3.1 允许使用的完整令牌清单（白名单，无扩展）

```
画布与容器   bg-page-bg · bg-card-bg · bg-dark-container · bg-dark-container-hover
边界         border-border-main · border-border-subtle · border-dark-container-border
文字         text-text-prominent · text-text-secondary · text-text-body
             text-text-muted · text-text-light-mono
语义色       status-olive(-bg/-border)      → 正常 / 已通过 / 可用
             status-terracotta(-bg/-border) → 需关注 / 待复核 / 已锁定
             slate-blue(-bg/-border)        → 信息 / 只读 / 辅助
             accent-orange(-bg)             → 焦点动作 / 主要 CTA
信号色       signal-live(-*)                → 在线 / 结算中
             signal-critical(-*)            → 严重告警 / 违规 / 越权
             signal-amber(-*)               → 预警 / 阈值临近
             signal-sky(-*)                 → 中性提示 / 说明
圆角         rounded-console(2px) · rounded-console-lg(4px)
             rounded-console-xl(8px) · rounded-console-pill(12px)
阴影         shadow-console-1 · shadow-console-2 · shadow-console-hud
间距         space-xs(4) · space-sm(8) · space-md(12) · space-lg(16) · space-xl(24)
             gutter(16) · gutter-desktop(24)
断点         tablet(768px) · desktop(1280px)
```

### 3.2 迁移映射表（强制）

| 现用（C 族 / D 族） | 收编为 | 说明 |
|---|---|---|
| `bg-white` | `bg-card-bg` | 卡片/表格行 |
| `bg-neutral-50` `bg-[#f8fafc]` | `bg-page-bg` | 页面底 |
| `bg-neutral-100` `#f1f5f9` | `border-border-subtle` 作底 + `bg-card-bg` | 建议去底色、改用边界分区 |
| `border-neutral-100/200` `#e2e8f0` | `border-border-subtle` | 次级分隔 |
| `border-neutral-300` `#cbd5e1` | `border-border-main` | 主分隔 / 输入框 |
| `text-neutral-900` `#0f172a` | `text-text-prominent` | 主标题、关键数值 |
| `text-neutral-700/800` `#475569` | `text-text-secondary` | 次级标题 |
| `text-neutral-500/600` `#64748b` | `text-text-body` | 正文 |
| `text-neutral-400` `#94a3b8` | `text-text-muted` | 辅助说明 |
| `text-emerald-600/700` `#16a34a` | `text-status-olive` | 正常态 |
| `bg-emerald-50/100` | `bg-status-olive-bg` | 正常态底 |
| `text-rose-600/800` `#dc2626` | `text-signal-critical-text` | 异常/违规 |
| `bg-rose-50/100` | `bg-signal-critical-surface` | 异常态底 |
| `text-sky-600` `#2563eb` | `text-slate-blue` | 信息态 |
| `bg-amber-50` `text-amber-*` | `signal-amber-*` 族 | 预警态 |
| `rounded-md/lg/xl`（会员与参数区） | `rounded-console-lg` | 卡片/输入 |
| `rounded-full`（会员与参数区） | `rounded-console-pill` | 仅限状态点、徽标 |
| `shadow-sm/md`（会员与参数区） | `shadow-console-1/2` | 结构化边界优先 |

### 3.3 会员等级色的处理约束

现有等级（普通食客 / 普通会员 / 银卡 VIP / 黑金 VIP）**不得各配一种新颜色**，按"特权强度"映射到既有令牌：

| 等级 | 承载 | 理由 |
|---|---|---|
| 普通食客 | `bg-page-bg` + `text-text-muted` + `border-border-subtle` | 无特权，最弱视觉权重 |
| 普通会员 | `border-border-main` + `text-text-secondary` | 有身份、无特权色 |
| 银卡 VIP | `slate-blue-bg` + `text-slate-blue` + `border-slate-blue-border` | 信息/增强 |
| 黑金 VIP | `bg-dark-container` + `text-white` | 仅最高等级允许使用结构色 |

等级差异靠**结构色与字重**表达，不靠引入第五种色彩语义。

---

## 4. 信息架构（不合并，但统一骨架）

### 4.1 三工作区骨架（共用同一外壳）

三个页签复用同一套「控制台外壳」，仅内容面板不同：

```
┌──────────────────────────────────────────────────────────────────────┐
│ A 头部脊 (bg-dark-container)                                          │
│   [图标] 中文标题 · EN 副标    [实时态徽标]      [主 CTA] [次动作]      │
├───────────────┬──────────────────────────────────────────────────────┤
│ B 左导航脊     │ C 内容面板                                            │
│  (w-220 桌面) │  ┌─ C1 指标带（3–5 张 KPI，等高 72px）─────────────┐  │
│  · 分区 1     │  ├─ C2 过滤/检索条（单行，≤3 控件 + 检索框）───────┤  │
│  · 分区 2     │  ├─ C3 主数据区（表格 or 卡片矩阵，见 §7）────────┤  │
│  · 分区 3     │  ├─ C4 治理状态条（链/风险/隔离，见 §8）──────────┤  │
│  (mobile:      │  └─ C5 分页 / 批量操作条 ────────────────────────┘  │
│   折叠为横向   │                                                      │
│   滑动标签条)  │                                                      │
└───────────────┴──────────────────────────────────────────────────────┘
```

**约束**：A/B/C 三区的令牌用法固定 —— A 区必须 `bg-dark-container`，B 区必须 `bg-card-bg` + 右边界 `border-border-main`，C 区必须 `bg-page-bg`。三个页签不得各自发明头部样式。

### 4.2 各页签内部分区（保持现有功能，仅重排）

**`user_data_mgmt` 用户数据中心** —— 现 1182 行单文件、五类内容混排，必须拆分为左导航脊的 4 个分区：

| 分区 | 承载 | 来源 |
|---|---|---|
| 档案主档 | 会员资料表单、等级、状态 | `UserDataProfileForm` |
| 资产与积分 | 储值余额、积分池、免密置信度 | `MerchantUserDataCenter` 内联 |
| 设备与硬件 | 多设备互联、指纹矩阵、配对码 | `UserDataMultiDevice` / `UserDataHardwareMatrix` |
| 风控与诊断 | 违规处置、跨浏览器自愈测试、导出 | `UserDataViolationControl` / `UserDataDiagnostics` |

**`members` 会员储值卡与积分资产** —— 维持单分区，但需把 139 处任意值色值全部收编，并与 `user_data_mgmt` 的"资产与积分"分区明确边界：前者是**卡与积分规则**，后者是**单会员资产视图**。两者数据键不同（`obsidian_members_crm` vs `obsidian_merchant_user_data`），界面需显式标注数据来源，避免运营误判。

**`sku_params` 数字参数与标准管理** —— 由 `SkuManagementView`(1458) + 6 个 `sku/*` 弹窗 + `DishParameterRulesModal`(2278) 组成。重构方向：

1. `DishParameterRulesModal` 的 2278 行必须拆为 3 个组件：**参数网格**（可编辑行）× **装配剖面示意**（只读图形）× **变更预览**（补丁 diff）。
2. 该弹窗内的装饰性 `SHA-256:7e9a0c4`、`ENG-09`、`RTK 5G · 18ms` 等工业仪表读数，**要么删除，要么替换为真实数据**（见 §8.2）。禁止保留"看起来像真实读数但其实是常量"的元素。
3. SKU 参数写入必须经 `governedWrite('obsidian_sku_params', ...)`，并在重构时把该键加入 `GOVERNED_KEY_MAP`。

---

## 5. 布局与栅格约束

| 档位 | 断点 | 内容面板 | 左导航脊 | 表格 | KPI 带 |
|---|---|---|---|---|---|
| mobile | <768 | 单列，全宽 | 折叠为顶部横向滑动标签条 | 转卡片矩阵（每卡一行记录） | 2 × 2 网格 |
| tablet | 768–1279 | 单列，`gutter` 16px | 抽屉式（点击展开） | 表格，隐藏次要列 | 3 列 |
| desktop | ≥1280 | `max-w-[1440px]` + `gutter-desktop` 24px | 常驻 220px | 表格，全列 | 4–5 列 |

**硬约束**：
- 内容面板最大宽度 1440px，超宽屏居中，禁止无限拉伸。
- 参数网格行高固定 **40px（desktop）/ 44px（mobile 触控）**，不得因内容换行而变高——参数对比依赖行对齐。
- 会员卡片矩阵列数固定：desktop 4 / tablet 3 / mobile 1（会员档案是"人和资产"的展示，堆叠优于压缩）。
- 表格 `sticky` 表头 + 首列（会员名 / SKU 名）`sticky`，横向滚动时保持锚定。

---

## 6. 排版与密度约束

项目已定义完整的排版类，**必须直接复用，不得自定义字号**：

| 用途 | 类 | 规格 |
|---|---|---|
| 屏标题 | `text-headline-lg` / `text-headline-lg-mobile` | Space Grotesk 24/18px |
| 区块标题 | `text-headline-md` | Space Grotesk 16px |
| 标签/表头 | `text-label-lg` / `text-label-md` | JetBrains Mono 13/11px |
| 微标 | `text-label-micro` | JetBrains Mono 8px（仅状态点旁） |
| 关键数值（金额/库存/积分） | `text-code-num` | JetBrains Mono 14px |
| 次要数值 | `text-code-sm` | JetBrains Mono 12px |
| 正文 | `text-sm`（font-sans 继承） | Hanken Grotesk |

**约束**：
1. **所有金额、库存量、积分、置信度、行号一律等宽字体**，且右对齐；这是参数对比可读性的前提。
2. 字号来源只剩三处：`text-headline-*`、`text-label-*`、`text-sm/base`。不得出现 `text-[13px]` 这类任意值。
3. 会员与参数界面**禁止使用 `text-2xl` 以上的字号**——最高权重靠 `bg-dark-container` 色块承担，不靠字号膨胀。
4. 数字千分位、货币符号 `¥`（本项目为人民币场景）、百分比保留 1 位小数，统一走格式化函数，禁止行内模板拼接。

---

## 7. 组件契约

### 7.1 三种主数据区形态（按数据性质选择，不得混用）

| 形态 | 使用条件 | 代表 |
|---|---|---|
| **参数网格** | 字段固定、需横向对比、行数 <200 | SKU 参数、菜品参数规则 |
| **记录表格** | 实体多、列可变、需排序分页 | 会员列表、储值流水 |
| **档案卡片矩阵** | 强身份属性、字段异构 | 会员档案墙 |

**判定规则（强制）**：字段集合在整个列表中**恒定** → 用参数网格；**建议但非强制** → 用表格。禁止"卡片里塞一张表格"的嵌套。

### 7.2 参数行的统一契约

每行必须固定包含四个槽位，次序不可变：

```
[ 参数名 (label-md) ] [ 当前值 (code-num, 右对齐) ] [ 输入/开关 ] [ 状态点 + 变更标记 ]
```

- **状态点**使用 `rounded-console-pill`，直径 ≤8px，颜色只取 `status-olive` / `signal-amber` / `signal-critical` 三色。
- **变更标记**：本行有未提交修改时，行左缘显示 2px `accent-orange` 竖条 + `text-label-micro` 的"待提交"。这是与治理层补丁联动的唯一视觉锚点。
- 只读行（无权限编辑）必须用 `bg-page-bg` 底 + `text-text-muted`，且鼠标为 `not-allowed`——**不得只是隐藏输入框**，要让用户明确知道"这一项存在但你不能改"。

### 7.3 状态与反馈（统一，不得各自实现）

| 场景 | 呈现 | 令牌 |
|---|---|---|
| 加载 | 骨架屏，尺寸与终态一致 | `border-border-subtle` 描边块 |
| 空态 | 居中图标 + 一句结论 + 一个动作 | `text-text-muted` |
| 无权限 | 权限说明 + 所需角色名 + 返回动作 | `signal-amber-*` |
| 已隔离 | 顶部条 `bg-signal-critical-surface`，表体禁用，提供"申请解除"入口 | `signal-critical-*` |
| 存证缺失 | 徽标显示"存证中"，不得显示"校验通过" | `slate-blue-*` |
| 链校验失败 | 顶部条 + 定位到具体记录行 | `signal-critical-*` |
| 保存成功 | 行内确认 + 生成版本指针提示（含版本号） | `status-olive-*` |
| 冲突（基线不一致） | 对话框列出冲突字段的"期望 vs 实际"，提供"强制覆盖"二次确认 | `status-terracotta-*` |

### 7.4 危险操作约束

- 删除会员档案、清空积分、重置设备指纹、批量改参数：**必须**二次确认对话框，对话框中必须列出受影响实体数量与具体名称（≤10 条全列，>10 条列前 10 条 + "等 N 条"）。
- 危险确认按钮使用 `signal-critical` 底；**禁止**把危险动作做成 `accent-orange` 主 CTA。
- 批量操作条（`C5`）在未选中任何行时必须不渲染，不得渲染为禁用态——减少视觉噪声。

---

## 8. 治理集成约束（本次重构的核心增量）

### 8.1 写路径

**约束**：`user-data/*`、`MerchantMemberCRM`、`SkuManagementView`、`sku/*`、`DishParameterRulesModal` 中所有对业务键的写入，必须替换为：

```ts
withTransaction('修改会员档案: ' + userName, () => {
  governedWrite('obsidian_merchant_user_data', nextUsers);
});
```

前提：先把 6 个键加入 `GOVERNED_KEY_MAP` 与 `ENTITY_SCOPE_REGISTRY`（新增 `member_profile` / `member_asset` / `sku_params` 三个模块映射，或复用现有模块下的独立键集合）。

**禁止**：组件内直接 `safeSetStorage('obsidian_sku_params', ...)`。这一点必须通过 lint 规则 `no-restricted-imports` 或代码评审强制。

### 8.2 真实读数替换清单

| 位置 | 现状 | 重构后 |
|---|---|---|
| `DishParameterRulesModal` `SHA-256:7e9a0c4` | 硬编码装饰 | `pointer.chainProof.chainHash.slice(0,12)`，无存证时显示"存证中" |
| `DishParameterRulesModal` `2 处属性变更` | 硬编码 | `pointer.patches.length` |
| `MerchantVersionTrackingView:749` `校验通过` | 硬编码 | `await verifyChain()` 的真实结果 |
| 会员档案"违规风控"计数 | 局部统计 | `pointer.ruleHits` 聚合 |
| 参数控制台"待复核"角标 | 无 | `getQuarantineEntries().filter(e => !e.released).length` |

### 8.3 回滚入口

每个可编辑实体在详情视图必须提供**粒度可选**的回滚：

- **整实体回滚**：`rollbackPointer(pointerId)`
- **字段级回滚**：`rollbackPatches(pointerId, ['/assets/points'])` —— 参数网格的每一行、会员档案的每一个字段都要能单独回退。
- **冲突处理**：返回 `reason === 'CONFLICT'` 时，弹窗列出冲突字段并明确询问是否强制覆盖，禁止静默失败或静默覆盖。

### 8.4 版本可见性

- 每个会员档案 / 参数集详情页底部必须有**变更时间线**（最近 N 条指针），显示：操作员、时间、字段差异摘要、`chainHash` 前 12 位、风险标记。
- 时间线必须显示"当前记录是否已被回滚"（`status === 'reverted'` + `revertedBy` / `revertedAt`）——这两个字段是本次治理层新补齐的，界面必须用上。
- 治理健康度（覆盖率、持久化后端、链状态、分层保留配额）需在三个页签的 `C4` 区共享同一份 `getGovernanceHealth()` 数据，**不得各自计算**。

---

## 9. 权限与降级约束

1. **权限来源唯一**：可编辑性判断只允许来自 `rbacEngine` 与 `CascadePermissionGuard`，禁止组件内自定义 `isAdmin` 之类布尔。
2. **字段级权限**：`user_data_mgmt` 需要 `finance:view_profit`（manager 级），因此**收银员进入该页签时，金额类字段必须显示为掩码或只读**，而不是整页拒绝——整页拒绝会损失"查档案"这一合法用途。
3. **降级可见**：`persistentStore.health.degraded === true` 时，`C4` 区必须出现 `signal-amber` 提示条，文案包含失败次数与最近失败时间。
4. **能力不支持要说清**：任意"回滚不可用"的场景必须说明原因（该模块由快照体系管理 / 实体不存在 / 权限不足），禁止只显示一个灰色的禁用按钮。

---

## 10. 无障碍约束

1. 所有交互元素（参数行、等级切换、状态点）必须可键盘聚焦，`focus` 状态使用 `accent-orange` 2px 描边，不得仅靠颜色变化。
2. 状态点（`rounded-console-pill`）纯色圆点**必须**附带文本或 `aria-label`，因为颜色不是可访问信息通道。
3. 表格必须使用语义化 `<table>` / `<th scope>`；参数网格若用 `div` 实现，必须补 `role="grid"` 与 `aria-rowindex`。
4. 危险操作对话框必须 `role="alertdialog"`，初始焦点落在取消按钮而非确认按钮。
5. 数值对比（期望 vs 实际）不得只靠 `status-terracotta` / `status-olive` 区分，需同时带"修改前 / 修改后"文字标签。

---

## 11. 验收门槛（可执行指标）

重构完成需同时满足：

| 指标 | 门槛 | 检查方式 |
|---|---|---|
| 硬编码色值 | **0** | `grep -c "#[0-9a-fA-F]\{6\}" <file>` |
| 任意值色类名 | **0** | `grep -c "\[#[0-9a-fA-F]\{3,8\}\]" <file>` |
| Tailwind 原生色板 | **0** | `grep -cE "(bg\|text\|border)-(neutral\|slate\|emerald\|rose\|sky\|amber\|zinc\|gray)-" <file>` |
| 权威令牌引用 | ≥ 基线（`ConsoleMatrix` 133 处同量级） | `grep -cE "page-bg\|card-bg\|dark-container\|border-main\|text-prominent\|text-muted\|status-olive\|status-terracotta\|slate-blue\|accent-orange\|rounded-console" <file>` |
| 直接写业务键 | **0** | `grep -rn "safeSetStorage(" <改造文件>` 仅允许出现在 `utils/` |
| 治理覆盖 | 6 个键全部命中 | `grep` `GOVERNED_KEY_MAP` |
| 类型检查 | 0 错误 | `tsc -b` |
| 回归守护 | 全绿 | `tsx scripts/verify-governance.ts` |
| 三端验证 | 375 / 768 / 1440 三档无横向溢出 | 手动 + `SimulationProbe` |

建议把上表前 6 项固化为 `scripts/verify-console-tokens.ts`，纳入既有回归脚本体系。

---

## 12. 迁移顺序与风险

### 12.1 建议顺序（按依赖与风险）

```
S1  令牌收编（纯类名替换，零逻辑改动）
    ├─ S1a  MerchantMemberCRM (139 处)
    ├─ S1b  sku/* 6 个弹窗 (86+ 处)
    ├─ S1c  SkuManagementView (181 处)
    └─ S1d  DishParameterRulesModal (490 处)
S2  治理接入（数据层，先于 UI 拆分）
    ├─ 6 个键入 GOVERNED_KEY_MAP / ENTITY_SCOPE_REGISTRY
    ├─ 写入改 governedWrite + withTransaction
    └─ 回归脚本补 6 个用例
S3  结构拆分
    ├─ MerchantUserDataCenter 1182 → 外壳 + 4 分区
    ├─ DishParameterRulesModal 2278 → 参数网格 + 剖面图 + 变更预览
    └─ 抽公共外壳组件
S4  真实读数替换（§8.2 五项）
S5  字段级回滚入口 + 变更时间线
S6  三端布局与无障碍校验
```

**S1 必须先于 S3**：纯类名替换可在不改变 DOM 结构的前提下完成并逐屏验收；一旦先动结构，两个变更叠加会导致视觉回归无法归因。

**S2 必须先于 S4**：没有真实指针数据，替换后的读数只会显示"存证中"，无法验证。

### 12.2 主要风险

| 风险 | 说明 | 缓解 |
|---|---|---|
| **令牌族 B 并存** | M3 角色层与权威集色值同源但命名不同，替换时容易把 `surface-container-low` 误判为"已合规" | 明确宣布：新控制台**只认权威集**，M3 角色名同样列入禁止清单 |
| **既有 `index.css` 同名覆盖陷阱** | 文档已记录"普通 CSS 类会击败 Tailwind 分层工具类，造成令牌改了但颜色没变" | 收编前先核查是否存在同名普通类 |
| **`DishParameterRulesModal` 视觉复杂度高** | 2278 行的工业装饰风格自成体系，全面收编可能损失"精密感" | 保留其**结构语言**（网格、剖面、等宽数字），只替换色彩与圆角令牌；精密感来自几何与排版，不来自颜色数量 |
| **会员数据迁移** | `obsidian_user_profile` 与 `obsidian_merchant_user_data` 存在语义重叠，收编时可能改错键 | 收编前先做键语义对账，明确哪个是档案权威源、哪个是商户侧副本 |
| **合并页签的诱惑** | 三个页签视觉统一后，容易被要求"顺便合了" | 以 §0 第 1 条为不可谈判项，权限边界优先于信息架构美学 |

---

## 13. 一句话总结

本次重构的本质是**把四套令牌语言与六个治理盲区收敛为一套**：视觉上只认《INDUSTRIAL PRECISION CONSOLE》，数据上只认 `governedWrite` + 补丁化回滚 + 真实存证链；页签因 RBAC 而不合并，但共用同一外壳、同一组件契约、同一状态语义。可分 S1–S6 六步落地，其中 S1（纯令牌收编）与 S2（治理接入）互不阻塞，可并行推进。
