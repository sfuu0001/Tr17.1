# 桌台联动点餐 · 界面层设计说明书（T3）

> 版本：v1.0 ｜ 日期：2026-09-11 ｜ 供界面层实现者使用
>
> 前置事实：数据层（T1 会话引擎 + CAS 幂等）、二维码层（T2）、跨设备通道（C1–C7）已全部落地并通过回归（67/67 + 36/36）。**本说明书只覆盖界面层**，所有引擎调用签名均取自当前源码，可直接照抄。

---

## 0. 总纲：界面层的四个不可谈判约束

| # | 约束 | 原因 |
|---|---|---|
| C1 | **授权判定只信数据层**。任何下单/管理按钮的可用性必须来自 `canParticipantOrder()` 返回值，UI 自己不得根据"弹窗是否出现过"推断权限 | 绕过弹窗直接调用下单路径必须被数据层阻断；UI 只是呈现 |
| C2 | **授权收敛只信 `TABLE_LINK_SETTLED` 事件**。弹窗收到该事件即自动关闭并显示落名人；不得用"我点了同意"作为本地关闭依据 | 任一同意即全员关闭的正确性由服务端 CAS 保证，UI 无权自行裁决 |
| C3 | **全部身份展示用脱敏字段**。列表渲染一律用 `maskedId` / `maskedName` / `grantedByMasked`，完整 id 仅出现在审计导出 | 合规要求（方案 §7），顾客间互相不可见完整标识 |
| C4 | **设计令牌唯一来源**：`src/index.css` 的 INDUSTRIAL PRECISION CONSOLE 权威集 + `consoleTokens.ts` 的 TONE_CLASS。禁止任何 `#hex` 任意值类名与 Tailwind 原生色板（`slate-*/emerald-*` 等） | 项目已有四套并行令牌语言的反面教训（见 MEMBER-PARAM-CONSOLE-DESIGN-CONSTRAINTS.md），T3 是新代码，必须从第一行就干净 |

---

## 1. 交付物清单

### 1.1 顾客端（新建 6 个文件 + 3 处接线）

| 文件 | 职责 | 预估行数 |
|---|---|---|
| `src/components/table/TableScanLanding.tsx` | 扫码落点页（8 分支收敛呈现） | ~400 |
| `src/components/table/TableFirstBindForm.tsx` | 首绑表单（开台人数确认） | ~180 |
| `src/components/table/TableLinkWaiting.tsx` | 等待授权页（TTL 倒计时 + 状态机） | ~220 |
| `src/components/table/TableLinkAlertDialog.tsx` | 强制授权弹窗（本方案核心交互） | ~260 |
| `src/components/table/TableMembersPanel.tsx` | 同桌成员管理面板 | ~300 |
| `src/components/table/useTableSessionUi.ts` | 顾客端会话状态聚合 Hook（单例订阅） | ~250 |

**接线点（3 处）**：
1. `App.tsx`：`diningMode === 'dine_in'` 且无有效会话时，渲染 `TableScanLanding`（拦在菜单之前）。
2. `App.tsx`：全局挂载 `TableLinkAlertDialog`（等待授权请求事件，任何页面都可被弹）。
3. `CartDrawer.tsx` / `CheckoutPageView.tsx`：提交订单前调 `canParticipantOrder()`，失败渲染 `TableMembersPanel` 的"申请加入"入口。

### 1.2 商家端（新建 2 个文件 + 2 处接线）

| 文件 | 职责 | 预估行数 |
|---|---|---|
| `src/components/merchant/table/MerchantTableSessionMonitor.tsx` | 会话监测台（L1 列表 → L2 会话详情 → L3 参与者行为时间线） | ~600 |
| `src/components/merchant/table/MerchantQrManageModal.tsx` | 桌码管理（查看/轮换/启停/打印） | ~240 |

**接线点（2 处）**：
1. `MerchantSystemView.tsx` 的 `tables` 页签内新增子区块"会话监测台"（**不得新开页签**——新页签需 RBAC 注册，且 `tables` 已是收银员可达级别，权限语义正确）。
2. `TableBatchPrintModal.tsx`：数据源切换为 `getQrPrintSource()`。

---

## 2. 顾客端详细设计

### 2.1 身份引导（所有界面之前）

进入堂食模式时，`useTableSessionUi` 首先执行：

```ts
const identity = await resolveIdentity();          // identityBinding.ts
// identity.mode: 'cloud_bound' | 'device_local'
// identity.participantId —— 之后所有引擎调用的 seed 都用它
```

**UI 规则**：
- `cloud_bound`：正常流程，无提示。
- `device_local`：在落点页顶部渲染**持久警示条**（`TONE_CLASS.neutral` 底 + terracotta 图标）：
  > 「当前为设备内有效模式：你的点餐身份仅在本设备有效，换设备需重新申请授权」
- 警示条**不得可关闭**（这是降级事实，不是打扰项），但高度 ≤48px 不挤压主内容。

### 2.2 扫码落点页 `TableScanLanding`

输入来自扫码（URL 参数解析）或手动短码。核心是**把 `resolveScan()` 的 8 种 `kind` 一一映射为分支**，禁止 UI 层自写判定逻辑：

| ScanResolution.kind | 界面行为 |
|---|---|
| `open_first_bind` | 跳首绑表单（§2.3），标题「你是本桌第一位点餐的人」 |
| `request_link` | 跳等待授权页（§2.4） |
| `already_joined` | 直接进入菜单，顶部 3s toast：「欢迎回来，同桌 {activeParticipantCount} 人」 |
| `qr_disabled` | 静态页：「本桌暂未开放扫码点餐」，仅一个「呼叫服务员」按钮（tel: 协议） |
| `table_busy_binding` | 静态页：「有人正在绑定本桌」，**唯一按钮「稍候重试」**（30s 后可点，防连点风暴），副文案显示剩余时间（由 `bindingLockAt + BINDING_LOCK_TTL_MS` 计算） |
| `token_grace_redirect` | **无感重定向**：用 `redirectToken` 重新走 resolveScan，不渲染任何中间态；仅当重定向再次失败才落「token_expired」分支 |
| `token_expired` | 静态页：「桌码已更新」+ 手动短码输入框（`generateShortCode` 产出的短码印在立牌上，这是它的存在意义） |
| `invalid_short_code` | 「未识别到有效桌号」+ 短码重试输入框 + 呼叫服务员 |

**布局约束**：单列垂直居中，桌号大字（`text-prominent`），状态插画区高度固定 160px（用现有 `DishArtisanSketch` 风格，不引外部图片资源）。所有分支共享同一外壳组件，分支只换内容区——保证视觉一致性且防止 8 个分支各自长歪。

### 2.3 首绑表单 `TableFirstBindForm`

对应引擎：`acquireFirstBind()` → 成功后 `finalizeFirstBind(sessionId, guestCount)`。

**字段（仅 1 个）**：就餐人数选择器 1–12（步进器，默认 2）。

**交互序列**：
1. 点击「开台」→ 立即禁用按钮并显示 spinner；
2. `acquireFirstBind` 返回 `CAS_CONFLICT` / `BINDING_LOCKED`（20 人同时抢一桌时的落败方）→ toast：「刚被其他人先开通了本桌」，**自动降级走 `request_link` 流程**（不是报错页）——这是方案文档里"失败者自动降级为申请者"的 UI 呈现；
3. `finalizeFirstBind` 成功 → 全屏过场动画 800ms（「{tableCode} 号桌已开台」）→ 进入菜单。

**禁止项**：此表单不得出现姓名/手机号字段（`ParticipantSeed.displayName` 是可选的，且引擎会自动 `maskName`；首绑要的是速度，不是信息采集）。

### 2.4 等待授权页 `TableLinkWaiting`

对应引擎：`requestLink({ tableCode, seed })` → 拿到 `LinkRequest`（含 `expiresAt`，TTL 60s）。

**状态机（4 态）**：

```
WAITING ──(TABLE_LINK_SETTLED: granted)──► JOINED ──► 进菜单
   │  ──(TABLE_LINK_SETTLED: denied)────► DENIED（显示拒绝原因，唯一按钮「重新申请」）
   │  ──(本地倒计时归零 / expired)───────► TIMEOUT（按钮「重新申请」+「呼叫服务员」）
   └──(用户主动取消)────────────────────► 返回落点页（引擎侧无需调用，请求会自然过期）
```

**视觉要求**：
- **TTL 倒计时必须可见**：60s 环形进度（`border-main` 圆环 + `accent-orange` 进度弧），低于 10s 变 `status-terracotta` 并轻微脉冲动画；
- 副文案动态化：`同桌已有 {activeParticipantCount} 人在线`；
- **禁止**"预计等待 x 分钟"这类编造文案——真实 TTL 就是 60 秒。

### 2.5 强制授权弹窗 `TableLinkAlertDialog` ⭐ 核心交互

监听 `reactiveSyncBus` 的 `TABLE_LINK_REQUEST` 事件。**必须以全局顶层挂载**（`App.tsx` 根部），任何页面出现请求都立即弹。

**可达性硬指标**：`role="alertdialog"` + `aria-modal` + 自动聚焦「同意」按钮 + 打开时 `document.body` 加 `overflow:hidden`。这满足原始需求"强制弹窗"的语义——但取消键（Android 返回 / ESC）映射为**不响应**而非"拒绝"，避免误触伤感情。

**布局（单卡片三段）**：

```
┌──────────────────────────────────┐
│ 🔗 同桌点餐联动请求               │  ← TONE_CLASS.navy 标题条
│                                  │
│  {maskedId} 请求加入              │
│  {tableCode} 号桌 · {n} 人就餐中  │
│                                  │
│  同意后 TA 将可以：               │
│  ✓ 浏览菜单并加购                 │
│  ✓ 提交点餐（本次就餐内）          │
│  ✗ 管理同桌成员 / 修改你的权限     │  ← 权限边界必须写明，这是授权人决策依据
│                                  │
│  ┌──────────┐  ┌──────────┐      │
│  │  拒绝     │  │ ✓ 同意    │      │  ← 主按钮 accent-orange
│  └──────────┘  └──────────┘      │
│        ⏱ 42s 后自动过期           │  ← 与 expiresAt 同步的真实倒计时
└──────────────────────────────────┘
```

**提交路径（关键：双通道）**：

```ts
// 优先走云端权威裁决（跨设备正确性的来源）
const result = await settleLinkAuthoritative({
  requestId, decision: 'granted', actorId: identity.participantId
});
// 云服务不可用时降级本地 CAS（同设备场景仍然正确）
// —— settleLinkAuthoritative 内部已封装此降级，UI 只消费统一的 CasOutcome
```

**结果呈现（三态，全部必须实现）**：

| CasOutcome | 呈现 |
|---|---|
| `success` | 弹窗转成功态：「已授权 {maskedId}」，2s 后自动关闭 |
| `CAS_CONFLICT` | **不报错**。toast：「该请求已由 {resolvedByMasked} 处理」，关闭弹窗 |
| `EXPIRED` | 弹窗内就地变灰：「请求已超时」，按钮变「关闭」 |

**自动关闭（需求原文"同步自动关闭弹窗并显示本次授权操作的id为谁"）**：监听 `TABLE_LINK_SETTLED`，payload 中 `resolvedByMasked` 渲染为：
> 「本次授权由 {resolvedByMasked} 处理」
若 `resolvedBy === 我自己` 追加「（你）」。所有端（包括当时没弹窗的端）收到 settled 都要把该 requestId 从本地"待展示"队列清除——用 `Set<requestId>` 状态即可。

**多请求排队**：第三人扫码 + 第四人同时扫码时会连续收到两个 `TABLE_LINK_REQUEST`。**串行队列**：同一时刻只显示一个弹窗，其余入 FIFO 队列，前一个 settled 后 400ms 弹下一个。禁止堆叠弹窗。

### 2.6 同桌成员管理面板 `TableMembersPanel`

入口：菜单页右上角「{n} 人同桌」胶囊按钮。数据源：`listParticipants(sessionId)` + 订阅 `TABLE_SESSION_MUTATED` 刷新。

**权限分层渲染（先取我方 authority）**：

```ts
const me = listParticipants(sessionId).find(p => p.participantId === identity.participantId);
// me.authority === 'manage' → 显示管理操作列
// me.authority === 'order_only' → 只读列表 + 「向桌主申请管理权限」按钮
```

**成员行结构**（每行）：

```
{maskedId}  {presence 圆点: online=olive / idle=amber / offline=neutral}
角色: 桌主 | 成员          授权来源: 首绑 | {grantedByMasked} 授权
[管理权限仅在 role==='owner' && authority==='manage' 时显示:]
  [设为仅点餐 / 给予管理] ← 调 setParticipantAuthority
  [移出同桌]              ← 调 removeParticipant（二次确认，红色按钮）
桌主行额外: [移交桌主]       ← 调 transferOwnership（二次确认 + 不可撤销提示）
```

**离线成员特殊态**：`presence === 'offline'` 的成员行降透明度 60% + 标签「离线」，**仍可被移出**（这正是处理"授权人离线但人已走"的场景）。

**数据回显纪律**：所有变更操作后**不要手动 setState 列表**——`TABLE_SESSION_MUTATED` 事件会广播回自己，统一由事件驱动刷新，避免双源状态。

### 2.7 行为节点上报（"用户在浏览哪个分类 / 上次点了什么"）

在 `App.tsx` 的两个既有位置追加调用（**节流规则见 §5.2**）：

```ts
// 1. 分类切换处（activeCategory 的 useEffect 内）
updateParticipantNode({
  sessionId, participantId,
  node: { kind: 'category_view', categoryName: activeCategory, at: new Date().toISOString() }
});

// 2. 菜品点击处（DishCard onClick / DishDetailModal 打开处）
updateParticipantNode({
  sessionId, participantId,
  node: { kind: 'dish_click', dishId, dishName, at: new Date().toISOString() }
});

// 3. 购物车变更处（cart reducer 尾部）
updateParticipantCart({ sessionId, participantId, cart: { itemCount, totalAmount, updatedAt } });
```

**硬约束**：上报调用**必须 try 包裹且失败静默**——行为遥测永远不允许打断点餐主流程。未加入任何会话时（`sessionId === null`）直接短路返回。

---

## 3. 商家端详细设计

### 3.1 桌码管理 `MerchantQrManageModal`

数据源：`ensureAllTableQr()`（幂等，首次调用补齐缺失字段）+ `getQrPrintSource()`。

**单桌管理卡片**：

```
A1 号桌
二维码预览（qrCode URL 渲染）      短码: A1-8FZ4（font-mono 大字）
状态: ● 启用中  v3                ← qrVersion
[轮换二维码] [暂停使用] [打印此桌]
```

**轮换交互（对应 `rotateTableQr`）**：二次确认弹窗文案必须包含两条事实：
> 「旧码在 10 分钟内仍可使用（宽限期），期间扫码的顾客会自动引导到新码」「立牌需重新打印」

**暂停使用**：调 `setTableQrEnabled(code, false)`。暂停后顾客扫码落「qr_disabled」分支——商家端应显示「当前 {n} 桌处于暂停状态」汇总提示，防止误暂停整店。

### 3.2 会话监测台 `MerchantTableSessionMonitor`（三层下钻）

**L1 会话列表**：数据源 `listSessionOverviews()`，订阅 `TABLE_SESSION_MUTATED` 自动刷新。

表格列（桌面 ≥1024px）：

| 列 | 字段 | 说明 |
|---|---|---|
| 桌号 | `tableCode` + `occupancySeq` | 「A1 · 第2轮」——一轮一桌多次翻台的语义 |
| 状态 | `status` | open=olive / locked=amber / closing=terracotta |
| 时长 | `durationMinutes` | >120 分钟染 terracotta（久坐提示） |
| 人数 | `activeParticipantCount / participantCount` | 在线/总数 |
| 待处理 | `pendingRequestCount` | >0 时渲染 badgeAlert 红点，**这是商家兜底队列入口** |
| 消费 | `totalAmount` | ¥ 格式化 |
| 风险 | `riskFlags[]` | 有值时 terracotta 标签（数据源：治理规则引擎，勿在 UI 重算） |

**L2 会话详情**（点行展开/抽屉）：`DiningParticipant` 卡片矩阵，每卡显示：
- `maskedId` + presence 圆点 + 角色/权限徽标
- **当前浏览**：`lastNode.kind === 'category_view'` → 「正在看：{categoryName}」
- **上次点击**：`lastNode.kind === 'dish_click'` → 「上次点击：{dishName}」（相对时间，"3 分钟前"）
- 购物车摘要：`cartSummary.itemCount` 件 / ¥`totalAmount`
- `grantedByMasked` 授权链（「由 {x} 授权加入」）
- 空数据态：`lastNode` 为空对象时显示「暂无行为数据」，**禁止显示 "—" 或 0 冒充**

**L3 行为时间线**（点参与者卡展开）：数据源 `getProbesBySession(sessionId)`，按 `at` 倒序渲染 `phase` 图标流（scan → first_bind → link_request → link_settled → …）。每条探针显示时间 + `phase` 中文标签 + `payload` 摘要（JSON.stringify 截断 80 字符，font-mono 小字）。

**商家兜底操作区（L2 底部）**——需求原文"兜底和探针监测"的落点：

| 操作 | 引擎调用 | 确认强度 |
|---|---|---|
| 代批授权 | 对超时未决的 pending 请求批量 `settleLinkRequest` | 单条确认 |
| 移出成员 | `removeParticipant` | 二次确认 |
| 结束会话 | `closeSession({ closedBy: 'merchant' })` | **强确认**：输入桌号后才能点确认 |
| 字段级退回 | 打开既有 `MerchantVersionTrackingView` 的 `table_session` 模块过滤视图 | 走治理层既有 UI，**不重复造** |

**全离线兜底队列**：当某 pending 请求的所有授权人 `presence === 'offline'`（引擎 `expireStaleRequests` 到期前），L1 该行的 `pendingRequestCount` 徽标升级为「待商家处理」amber 标签——商家成为最后裁决人，这是方案文档"全 offline 转商家确认队列"的 UI 呈现。

---

## 4. 状态与数据流规则

### 4.1 会话状态聚合 Hook `useTableSessionUi`

单例模式（模块级共享状态，非 React Context——项目内 `consoleTokens` 同风格）：

```ts
interface TableSessionUiState {
  identity: ResolvedIdentity | null;
  activeSession: TableSession | null;      // 自己所在的 open/locked 会话
  myParticipant: DiningParticipant | null;
  pendingLinkRequest: LinkRequest | null;  // 自己发出的等待中请求
  linkDialogQueue: LinkRequest[];          // 收到的待裁决请求（弹窗队列）
}
```

**事件订阅矩阵**（在 Hook 内完成，组件不直接订阅）：

| 事件 | 动作 |
|---|---|
| `TABLE_SESSION_MUTATED` | 若 payload 含我的 sessionId → 重拉 `getSessionById` 刷新 activeSession |
| `TABLE_LINK_REQUEST` | `targets` 含我 → 入 `linkDialogQueue` |
| `TABLE_LINK_SETTLED` | 从队列移除 + 若是我发出的 pending → 状态机推进 |
| `PARTICIPANT_NODE_CHANGED` | 忽略（顾客端不需要别人行为；此事件只有商家端消费） |

**节流要求**：`PARTICIPANT_NODE_CHANGED` 的**发布方**（不是订阅方）节流——分类切换 ≥1.5s、菜品点击 ≥800ms 合并（保留最新值）。探针写入 `writeProbe()` 无需节流（引擎内已有 800 条环形缓冲）。

### 4.2 组件禁做清单

1. ❌ 组件内直接 `safeGetStorage('obsidian_table_sessions')` 读原始数组——必须走引擎函数（列表结构含 removedAt 过滤、脱敏等逻辑）。
2. ❌ UI 自行计算 presence（`resolvePresence` 是引擎函数，勿复制 90s/5min 常量到组件）。
3. ❌ 弹窗关闭后本地保留请求对象继续展示——`TABLE_LINK_SETTLED` 未到也不得自作主张移除（可能只是网络慢）。
4. ❌ 任何"编辑后手动 refetch 全量列表"——统一事件驱动。
5. ❌ 在界面层新写风险规则/阈值——`riskFlags` 来自 `governanceRuleEngine`，UI 只渲染。

---

## 5. 设计令牌与排版

### 5.1 令牌白名单（只许用这些）

背景 `page-bg` / 卡片 `card-bg`、`dark-container`｜边框 `border-main`｜文字 `text-prominent` / `text-secondary` / `text-muted`｜强调 `accent-orange`｜语义 `status-olive`(成功) / `status-terracotta`(警告/危险) / `slate-blue`(信息)｜圆角 `rounded-console`｜语气 `TONE_CLASS.*`（navy/orange/terracotta/blue/neutral/olive 六色）。

**验收（可 grep）**：新增 8 个文件中 `#[0-9a-fA-F]{3,8}` 命中数 = 0；`slate-|emerald-|rose-|sky-|neutral-` 原生色板类名 = 0。

### 5.2 排版密度

- 顾客端是**手机竖屏优先**（`max-w-md mx-auto`），字号下限 14px，可点区域 ≥44×44px；
- 商家端监测台是**桌面密度**：行高 44px、表格字号 13px、抽屉宽 480px；
- 探针时间线用 `font-mono`（时间戳/traceId）。

---

## 6. 合规与文案

1. **脱敏纪律**：`maskedId`（形如 `cust_****8821`）是列表唯一合法展示形态。任何 `participantId` 明文出现在 DOM 都算缺陷。
2. **首扫告知**：落点页 `open_first_bind` 分支底部一行小字：「扫码即表示同意你的点餐行为数据用于本桌协同点餐与商家运营分析，明细保留 30 天」。
3. **顾客互不可见原则**：顾客端任何界面不得出现其他顾客的 `lastNode`（正在看什么/点了什么）——**该数据只进商家端监测台**。`TableMembersPanel` 只显示 presence/角色/授权链。
4. 文案语气：短句、动词开头、不用感叹号堆叠；错误文案必须含"下一步怎么办"。

---

## 7. 验收清单（实现者自测）

**行为级（8 项）**：
1. 两浏览器标签页 A（已开台）+ B 扫同码 → A 弹窗、B 停在等待页；A 点同意 → **B 在 1s 内自动跳转进菜单**且显示「由 {maskedId_A} 授权」。
2. A、C 两个授权人**同时**点同意 → 恰好一次成功；另一端看到「已由 {x} 处理」，B 侧成员数恰好 +1。
3. 等待页倒计时归零 → 请求过期，重新申请可用。
4. 桌主移交后，原桌主变 `order_only`，其管理操作列消失（事件驱动刷新，无需手动刷新页面）。
5. `device_local` 模式下换设备扫同码 → 走 `request_link`（而不是被识别为已加入）。
6. 商家端轮换二维码 → 旧码扫码 10 分钟内落 `token_grace_redirect` 进桌，超时落 `token_expired`。
7. 下单前 `canParticipantOrder` 失败的账户点「去结算」→ 弹出申请加入入口，**不发请求**。
8. 断网时点同意 → `settleLinkAuthoritative` 降级路径生效，联网后 `syncPendingSettlements()` 补同步（菜单页恢复网络后自动触发）。

**静态级（3 项，可 grep）**：
9. 8 个新文件硬编码色值 = 0、原生色板类名 = 0。
10. 明文 `participantId` 不出现在任何顾客端 JSX 文本节点。
11. 所有引擎调用出现在 `useTableSessionUi.ts` 或事件处理器中，不在 render 体内直接调用（防每帧重放）。

**真机复测（2 项，交接后由你执行）**：
12. 两台真实设备跨设备授权延迟 P95 < 1s（CloudBase watch 通道）。
13. 一台设备断网 → 恢复后 pending 结算自动补交。

---

## 8. 建议实现顺序

```
第 1 步  useTableSessionUi.ts（一切的地基；做完先用 console 验证事件流转）
第 2 步  TableScanLanding + TableFirstBindForm（打通"扫码→开台→进菜单"主干）
第 3 步  TableLinkAlertDialog + TableLinkWaiting（核心授权交互，双浏览器自测验收 1/2/3）
第 4 步  TableMembersPanel（验收 4/5）
第 5 步  行为节点上报接线（App.tsx 两处 + 节流）
第 6 步  商家端 MerchantQrManageModal → MerchantTableSessionMonitor（L1 → L2 → L3 逐层）
第 7 步  令牌验收 grep + 全量回归（verify-table-session + verify-transport 必须仍旧全绿）
```

每步完成后跑 `npm run build` + 三套回归脚本——数据层已被 103 项断言保护，界面层不应触碰任何 `src/utils/tableSession*` / `src/utils/transport/*` 文件；若发现引擎行为不符合本说明书预期，**回来找我改引擎，不要在 UI 里绕**。
