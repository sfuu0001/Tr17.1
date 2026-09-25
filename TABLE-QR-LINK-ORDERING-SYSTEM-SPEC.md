# 堂食点餐系统深度优化方案
## 桌台二维码 · 多端联动授权 · 全链路探针与数据退回

- 版本：v1.0
- 日期：2026-09-11
- 范围：桌台二维码与桌号体系、桌台会话与多参与者授权协议、商家端点餐会话监测台、顾客端全量行为抓取、探针监测与数据退回
- 关联：`PENETRATION-GRADE-DATA-GOVERNANCE-SPEC.md`（治理底座）、`MEMBER-PARAM-CONSOLE-DESIGN-CONSTRAINTS.md`（前端约束）

---

## 0. 结论与设计立场

**结论：本次不需要新建行为追踪与跨端通信体系，需要新建的是「桌台会话模型」与「联动授权协议」。**

三项既有设施可直接承载 80% 的需求：

| 需求 | 既有设施 | 复用方式 |
|---|---|---|
| 记录用户操作路径节点（全部抓取） | `utils/userJourneyTracker.ts` — 33 种 `UserActionType` + 7 节点漏斗 + `JourneyActionLog`（含 `durationFromPrevMs` / `isHesitation` / `riskLevel`）+ 7 种 `JudgmentType`（已含 `DINE_IN_UNBOUND_QUIT`） | 扩枚举 + 提采集保障，**不重写** |
| 强制弹窗、多端实时同步、任一同意即关闭 | `utils/reactiveSyncBus.ts` — 8 类事件 + `BroadcastChannel`（`urban_radar_reactive_sync_v1`） | 加 4 类事件 |
| 桌台绑定、清台转移、催菜联动 | `utils/tableStorage.ts` + `components/table/TableBindModal.tsx` + `TableBatchPrintModal.tsx` | 加会话层，绑定逻辑复用 |

治理底座（本日新建）已具备退回与探针所需的全部原语：`governedWrite`、`withTransaction`、`recordDataMutation`、`rollbackPointer` / `rollbackPatches`、`governanceRuleEngine`（含 quarantine）、`integrityChain`、`persistentStore`（分层保留）。

**核心缺口（必须新建）：**

1. **桌台没有二维码字段与扫码路由** —— `TableItem` 类型（`src/types.ts:433`）无 `qrCode` / `qrEnabled` / `qrToken`；`versionPointerEngine` 的 `FIELD_LABEL_MAP` 里已存在 `qrCode: '扫码点餐码'` / `qrEnabled: '桌码点餐开关'` 两个表项，但类型层未落地 —— 属于**历史遗留的半成品**。
2. **没有「一张桌多个点餐 id」的模型** —— 现有 `BoundTableInfo`（`src/types.ts:361`）只描述**单个客户端**的绑定关系，无参与者集合、无授权链。
3. **顾客行为数据与桌号未关联** —— `userJourneyTracker` 记录的是会话级行为，但会话未携带 `tableCode` / `participantId`，商家端无法"按桌看人"。
4. **授权协议完全缺失** —— 首绑、申请、弹窗、任一同意、授权人落名、授权者管理，均不存在。

**三条不可妥协的设计立场：**

1. **授权判定必须在数据层做，不能只做在弹窗层。** 弹窗只是呈现，"谁有权下单"必须由 `TableSession.participants[].authority` 决定，服务/存储层可校验。否则绕过弹窗即可下单。
2. **「任一同意即生效」必须靠 CAS 幂等，不能靠谁先渲染。** 两个授权人同时点同意时，只能有一个写入成功，另一个必须收到"已被 X 处理"而不是报错。
3. **顾客行为可见性受合规节流。** 商家端展示的必须是脱敏 id，完整 id 仅审计导出可见；行为留存有期限。这是本方案中唯一可能被业务方抵触但必须坚持的约束。

---

## 1. 需求拆解与实现映射

| # | 需求 | 实现载体 | 新增/复用 |
|---|---|---|---|
| R1 | 每桌桌号 + 二维码 | `TableItem.qr*` + `TableQrView` + 扫码路由 `/t/{code}` | 新增字段、复用打印 |
| R2 | 商家端看到全部点餐 id | 「桌台点餐会话监测台」参与者列表 | 新增 |
| R3 | 看到当前浏览分类 | `participant.lastNode.categoryName` | 新增字段 + 复用 tracker |
| R4 | 看到上次点击的菜品 | `participant.lastNode.lastClickedDishName` | 新增字段 + 复用 tracker |
| R5 | 历史操作记录 | `JourneyActionLog[]` 全量时间线 | 复用 tracker，补 tableCode 关联 |
| R6 | 首绑者成为桌主 | `TableSession.ownerParticipantId`（CAS 写入） | 新增 |
| R7 | 第二人扫码 → 向第一人弹授权请求 | `LinkRequest` + `TABLE_LINK_REQUEST` 事件 | 新增 |
| R8 | 同意后第二人方可点餐 | `participants[].authority` 校验 | 新增 |
| R9 | 第三人 → 同时向 1、2 弹窗，任一同意即生效 | `LinkRequest.targets[]` + CAS `settleRequest` | 新增 |
| R10 | 授权后显示本次授权人 id | `LinkRequest.resolvedBy` + 关闭广播 | 新增 |
| R11 | 已授权者可管理同桌全部 id | `authority='manage'` 的成员管理权 | 新增 |
| R12 | 商家端兜底 + 探针监测 | `governanceRuleEngine` 新增 5 条规则 + 探针流 | 复用治理层 |
| R13 | 数据退回 | `rollbackPatches` / `rollbackPointer` / 快照 | 复用治理层 |
| R14 | 全量抓取小程序操作路径 | tracker 扩枚举 + 零丢失采集 | 扩展 |

---

## 2. 数据模型

### 2.1 新增类型（建议置于 `src/types.ts`）

```ts
/** 桌台会话：一个物理占用期 = 一个会话 */
export interface TableSession {
  sessionId: string;              // sess_<base36>
  tableId: string;
  tableCode: string;              // 'A1' | 'B2' | 'W01'
  occupancySeq: number;           // 本桌第几轮占用（用于版本追溯与统计）
  status: 'open' | 'locked' | 'closing' | 'closed';
  bindingLockAt?: string;         // 首绑进行中的锁定时间（防并发首绑）
  qrToken: string;                // 当前有效二维码令牌
  qrVersion: number;              // 递增，用于失效旧码
  qrIssuedAt: string;
  openedAt: string;
  closedAt?: string;
  closedBy?: string;              // 'table_cleared' | participantId | 'merchant'
  ownerParticipantId: string;     // 桌主（首绑者）
  participants: DiningParticipant[];
  pendingRequests: LinkRequest[];
  guestCount: number;
  riskFlags: string[];            // 命中规则 id
  integrityRef?: string;          // 链存证引用（chainHash）
}

export interface DiningParticipant {
  participantId: string;          // 点餐 id
  sessionId: string;
  maskedId: string;               // cust_****8821（商家端默认展示）
  displayName: string;            // 脱敏昵称
  role: 'owner' | 'member';
  authority: 'manage' | 'order_only';
  grantSource: 'self_bind' | 'delegated' | 'system_elevated';
  grantedBy?: string;             // 授权人 participantId —— R10 的落点
  grantedAt?: string;
  joinedAt: string;
  presence: 'online' | 'idle' | 'offline';
  lastSeenAt: string;
  deviceFingerprint: string;
  /** R3/R4：商家端要看的三个值 */
  lastNode: {
    categoryId?: string;
    categoryName?: string;
    lastClickedDishId?: string;
    lastClickedDishName?: string;
    at?: string;
  };
  /** 本地购物车归属（多人同桌的账目归集依据） */
  cartSummary: { itemCount: number; totalAmount: number; updatedAt: string };
  spendAttribution: number;       // 该 id 累计贡献金额
  removedAt?: string;
  removedBy?: string;
  removeReason?: string;
}

/** 联动授权请求 */
export interface LinkRequest {
  requestId: string;              // lr_<base36>
  sessionId: string;
  tableCode: string;
  requesterId: string;            // 申请人的 participantId
  requesterName: string;
  /** 被请求的授权人集合 —— R9 的"同时向 1 和 2 弹窗" */
  targets: string[];
  createdAt: string;
  expiresAt: string;              // 默认 60s
  status: 'pending' | 'granted' | 'denied' | 'expired' | 'superseded';
  /** R10：本次授权由谁完成（首个 CAS 成功者） */
  resolvedBy?: string;
  resolvedByName?: string;
  resolvedAt?: string;
  denyReason?: string;
}
```

### 2.2 `TableItem` 扩展（`src/types.ts:433`）

```ts
interface TableItem {
  // ... 既有字段保持不变
  qrCode?: string;        // 人类可读短码，如 'A1-8F3K'
  qrToken?: string;       // 扫码令牌
  qrVersion?: number;
  qrEnabled?: boolean;    // 桌码点餐开关（FIELD_LABEL_MAP 已预留标签）
  qrIssuedAt?: string;
  activeSessionId?: string; // 当前会话，便于矩阵页一键下钻
}
```

### 2.3 新增持久化键与治理注册（**硬性要求**）

| 键 | 类型 | 治理模块 |
|---|---|---|
| `obsidian_table_sessions` | collection | 新增 `table_session` |
| `obsidian_table_link_requests` | collection | 新增 `table_session` |
| `obsidian_table_session_probes` | collection（环形） | 新增 `table_session`（tier: rolling） |

需同步修改三处，否则数据不在治理覆盖内（违反"渗透级"要求）：

1. `types/versionTracking.ts` — `VersionModuleType` 增加 `'table_session'`
2. `utils/rollbackGuard.ts` — `ENTITY_SCOPE_REGISTRY` 增加条目
3. `utils/governedStorage.ts` — `GOVERNED_KEY_MAP` 增加条目

---

## 3. 桌台号与二维码方案

### 3.1 桌号规范

- 格式：`{区域前缀}{两位序号}` —— `A01`（吧台）/ `B01`（卡座）/ `C01`（外摆）/ `W01`（等位）
- **必须同时存在三种载体**：
  1. 人眼可读大字（`text-headline-lg`，等宽数字）
  2. 二维码（扫码入口）
  3. 机器可读短码（`A1-8F3K`，人工兜底录入用 —— 二维码破损时的降级路径）

**约束**：三者必须物理同框印刷（亚克力立牌），避免"二维码在桌上、桌号在墙上"导致的对不上账。

### 3.2 二维码内容与令牌

```
https://<host>/t/A1?t=<qrToken>
```

- `qrToken` = `qr_<sessionless-hash>`，**与桌台绑定、与场次无关**（同一张桌长期使用同一个基码），但支持**主动轮换**：
  - 轮换后 `qrVersion + 1`，旧 token 保留 **10 分钟宽限期**（正在扫码的人不被中断）
  - 宽限期后旧 token 返回明确错误页，而非静默失败
- **为什么不是"一桌一码一次性"**：立牌是物理印刷品，一次性码会逼迫每次重新打印，运营成本不可接受。改为"长期码 + 可控轮换 + 设备指纹风控"。

### 3.3 扫码落点与降级

```
扫码 → /t/{code}?t={token}
  ├─ token 有效 & 桌台 qrEnabled=false → 「本桌暂未开放在线点餐」+ 呼叫服务员
  ├─ token 有效 & 桌台空闲            → 进入「首绑流程」（3.4）
  ├─ token 有效 & 桌台已绑定          → 进入「申请加入流程」（4.2）
  ├─ token 过期（宽限期内）           → 自动用新 token 重定向（无感）
  ├─ token 过期（超出宽限）           → 「桌码已更新，请扫描桌上的最新二维码」
  └─ 无 token（手输短码）             → 短码校验 + 需服务员确认
```

### 3.4 首绑流程（R6）

```
1. 校验 bindingLock：若 session 处于 locked 且未超时 → 「有人正在绑定本桌，请稍候」
   → 这是并发首绑的关键闸门（见 §4.4）
2. CAS 写入：仅当 ownerParticipantId 为空时写入，成功者即为桌主
3. 桌主填写：就餐人数（必填）、昵称（可默认"手机尾号"）
4. 生成 session（status: 'open'），派发 TABLE_SESSION_OPENED
5. 桌主 authority = 'manage'
```

---

## 4. 绑定与授权协议（核心）

### 4.1 状态机

```
                    ┌──────────── 桌台空闲 ────────────┐
                    │                                  │
              [扫码·第1人]                       [扫码·第N人 N≥2]
                    │                                  │
              CAS 首绑成功                              ▼
                    │                        LinkRequest(pending)
                    ▼                         targets = 全部 manage 成员
        ┌─── TableSession.open ───┐                     │
        │  owner = P1             │◄──── 广播 TABLE_LINK_REQUEST
        │  P1.authority = manage  │                     │
        └───────────┬─────────────┘                     │
                    │                          ┌────────┴────────┐
              [扫码·第2人]                      │                 │
                    │                    任一同意(CAS)      全部超时/拒绝
                    ▼                          │                 │
          LinkRequest(targets=[P1])            ▼                 ▼
                    │                   P_N 加入为 member    P_N 被拒绝
                    │                   grantedBy = 同意者id   可申请商家协助
                    │                   authority = order_only
                    │                   广播 TABLE_LINK_SETTLED
                    └────────────────► 其余端弹窗自动关闭
```

### 4.2 第二人流程（R7/R8/R10）

1. 扫码 → 生成 `LinkRequest{ requesterId: P2, targets: 全部 manage 成员 }`
2. 通过 `reactiveSyncBus.publish('TABLE_LINK_REQUEST', ...)` 广播
3. 目标端（P1）订阅后弹出**强制弹窗**：
   - `role="alertdialog"`、禁止遮罩关闭、禁止 ESC 关闭
   - 必须显示：申请人脱敏 id + 昵称、桌号、当前同桌人数
   - 两个动作：`同意联动` / `拒绝`
4. 同意 → `settleRequest(requestId, 'granted', participantId)`（见 §4.4）
5. P2 端收到 `TABLE_LINK_SETTLED` → 关闭等待页，`authority = 'order_only'`，可下单
6. 所有端 toast：`本次授权由 {maskedId}（{displayName}）完成` —— **R10 的落点**

### 4.3 第三人流程（R9）

- `targets` = **当前全部 `authority === 'manage'` 且 `presence !== 'offline'` 的成员**（即 P1 + P2，若 P2 被授予了 manage）
- 三端同时弹窗，**首个 CAS 成功者胜出**
- 胜出后立即 `publish('TABLE_LINK_SETTLED')`，其余端**收到即关**，并提示"已被 {resolvedBy} 处理"
- 落名规则：`resolvedBy` 写入 `LinkRequest`，同时写入新成员的 `grantedBy` —— 授权链可追溯

**关键**：R9 的"同时向 1 和 2 弹出、任一同意即同步关闭"本质上是一个**分布式竞态收敛问题**，不能靠 UI 协调。

### 4.4 并发、幂等与防竞态（必须实现，否则功能在生产会出错）

| 竞态场景 | 后果 | 解法 |
|---|---|---|
| **两个 id 同时首绑同一张空桌** | 两个桌主，会话分裂 | `bindingLockAt` 闸门 + CAS（仅 `ownerParticipantId == null` 可写）；失败者自动降级为"申请加入"并提示"该桌已被绑定，已为你发起加入申请" |
| **两个授权人同时点同意** | 重复授权 / 双份成员 | `settleRequest` 做 CAS：读→校验 `status === 'pending'`→写；失败者静默转为"已被处理"提示，**不得报错** |
| **授权人在弹窗期间离线** | 请求永久悬挂 | `presence` 心跳：`lastSeenAt` > 90s → `idle`；> 5min → `offline`。请求到期前若 targets 全部 offline，自动转"待商家确认"队列 |
| **桌主离线且无人 manage** | 后续无人可授权 | 自动提升 `grantSource: 'system_elevated'`：把 manage 交给最早加入的在线 member，并 `publish` 通知；或（可配置）转商家端接管 |
| **同一用户换设备/清缓存** | participantId 漂移，产生幽灵成员 | 用 `deviceFingerprint + 会员手机号后四位` 归并；归并动作本身写一条指针可审计/可退回 |
| **清台时仍有在线 participant** | 会话悬挂 | 清台前置校验：有在线成员则要求商家二次确认，`closedBy: 'table_cleared'` 并留存会话快照 |
| **二维码被截图外传** | 陌生人加入 | `qrToken` 轮换 + 设备指纹计数 + 地理围栏（餐车半径内才允许首绑）+ `R-QR-SHARE-ABUSE` 规则告警 |

### 4.5 已授权者的管理权（R11）

`authority === 'manage'` 的成员可执行：

| 动作 | 约束 |
|---|---|
| 移除其他成员 | 不可移除桌主；被移除者写入 `removedBy` / `removeReason`，并收到通知 |
| 授予/回收他人的 `manage` | 需二次确认；操作写指针 |
| 发起重新授权 | 对 `order_only` 成员可要求重新确认 |
| 转移桌主 | 仅桌主本人可转交；转交后原桌主降为 `manage` |
| 关闭会话 | 需商家端确认（避免误关导致结账纠纷） |

**商家端兜底权限**：新增 `table:override_link`（`minimumRole: manager`，`isSensitive: true`），允许商家强制移除成员、强制关闭会话、强制轮换二维码、强制把会话退回历史版本。

---

## 5. 商家端「桌台点餐会话监测台」

### 5.1 三层下钻结构

```
L1 桌台矩阵（扩展既有 MerchantTables）
   每桌一行：桌号 · 二维码版本 · 会话时长 · 参与 id 数 · 桌主 · 待决请求 · 贡献金额 · 风险标记
   ↓ 点击
L2 会话参与者列表
   每个点餐 id 一行：
     ├ 脱敏 id + 昵称          ├ 角色/权限（桌主 / manage / order_only）
     ├ 当前浏览分类  ← R3      ├ 上次点击菜品 + 时间  ← R4
     ├ 在线状态 + 最后活跃       ├ 购物车件数 / 金额
     └ 贡献金额                 └ 授权链（谁授权进来的）
   ↓ 点击
L3 该 id 的全量行为时间线（R5）
   复用 JourneyActionLog 渲染：
     序号 · 阶段 · 动作 · 标签 · 距上一步耗时 · 是否犹豫 · 风险级别
   支持：按阶段筛选、按动作类型筛选、导出 CSV、跳转到该 id 的订单
```

### 5.2 实时性约束

| 事件 | 粒度 | 频率上限 |
|---|---|---|
| `TABLE_SESSION_MUTATED` | 会话级（成员增减、状态变更） | 即时 |
| `PARTICIPANT_NODE_CHANGED` | 参与者级（分类切换/点击菜品） | **节流 1s**（避免高频行为洪水） |
| `TABLE_LINK_REQUEST` / `TABLE_LINK_SETTLED` | 请求级 | 即时 |
| 行为明细（L3 时间线） | 明细级 | **不实时推送**，按需拉取 |

**约束**：`PARTICIPANT_NODE_CHANGED` 必须节流并只推"当前值"（分类/菜品），不推逐条动作明细。否则一次滑动菜单会产生上百条广播，拖垮商家端渲染。明细走拉取。

### 5.3 商家端兜底操作入口

| 操作 | 说明 | 权限 |
|---|---|---|
| 强制移除成员 | 商家裁定，写入 `removedBy='merchant'` | `table:override_link` |
| 强制关闭会话 | 悬挂会话清理 | `table:override_link` |
| 强制轮换二维码 | 疑似外传时 | `table:override_link` |
| 把某成员退回上一步 | 单字段级回退 | `contingency:rollback` |
| 把整桌退回某时刻 | 会话级回退 | `contingency:rollback` |
| 桌台整体快照还原 | 兜底 | `contingency:rollback` |

---

## 6. 全量事件抓取（R14）

### 6.1 需补全的动作枚举

现有 33 种覆盖主链路，要满足"全部抓取"需补 15 种：

| 分类 | 新增动作 |
|---|---|
| 曝光类 | `category_impression`、`dish_impression`、`banner_impression` |
| 停留类 | `dish_dwell`（停留时长）、`page_dwell`、`scroll_depth` |
| 检索类 | `search_keyword`、`filter_change`、`sort_change` |
| 异常类 | `network_error`、`api_retry`、`payment_fail` |
| 桌台联动类 | `scan_qr`、`table_link_request_sent`、`table_link_granted`、`table_link_denied`、`table_link_timeout`、`participant_removed` |
| 小程序特有 | `mp_enter`、`mp_show`、`mp_hide`、`mp_unload`、`share_trigger` |

**说明**：曝光与停留类事件量大，必须与主链路事件分离存储（见 6.3）。

### 6.2 事件结构扩展

`JourneyActionLog` 需补三个字段以支撑按桌看人：

```ts
tableCode?: string;
sessionId?: string;
participantId?: string;
```

### 6.3 零丢失采集保障

```
业务动作
  ↓ track(action, label, meta)         ← 唯一入口，禁止业务侧直接写存储
  ↓ 入内存环形队列（上限 500）
  ↓ 1s 或满 20 条 → 批量 flush
  ├─ 成功 → 清队列
  └─ 失败 → 落 obsidian_journey_buffer_v1（上限 2000，LRU）
              ↓ 恢复后重放，重放成功才删除
```

**四条硬性约束：**

1. **主链路 100% 采集，不采样。** 曝光/停留类可配置采样率，但默认 100%（与"全部抓取"一致）。
2. **采集失败不得影响业务。** `track()` 必须是 fire-and-forget，异常吞掉并计数，绝不阻塞加购/结算。
3. **先本地后同步。** 网络异常时落本地环形缓冲，恢复后重放；重放幂等（`eventId` 去重）。
4. **明细与聚合分离。** 明细进 `obsidian_table_session_probes`（rolling 层，滚动保留）；聚合指标（漏斗、人均）进独立键（long 层）。

### 6.4 隐私约束（**必须坚持**）

| 项 | 约束 |
|---|---|
| 商家端展示的 id | **默认脱敏**（`cust_****8821`），完整 id 需 `audit:export` 权限 |
| 昵称/手机号 | 一律脱敏（沿用项目既有 `138****6621` 写法） |
| 采集范围 | 仅点餐相关行为；**禁止**采集通讯录、精确 GPS 轨迹、剪贴板 |
| 留存期限 | 行为明细 30 天，到期由 `persistentStore` 分层保留自动清理；授权与结账记录按资金类永久保留 |
| 告知同意 | 首扫二维码时必须展示堂食点餐说明（含行为记录用途），同意后方可继续 |

---

## 7. 兜底、探针与数据退回（R12 / R13）

### 7.1 探针监测规则（`governanceRuleEngine` 新增 5 条）

| 规则 ID | 判定 | 严重度 | 处置 |
|---|---|---|---|
| `R-QR-SHARE-ABUSE` | 同一 `qrToken` 在 10 分钟内被 >5 个不同设备指纹扫描 | high_risk | 自动轮换 token + 告警 |
| `R-LINK-STORM` | 同一桌台 10 分钟内 >8 次联动请求 | high_risk | quarantine（禁止新申请，需商家放行） |
| `R-ORPHAN-PARTICIPANT` | 存在非 owner 且无 `grantedBy` 的成员 | high_risk | 阻断该成员下单请求 |
| `R-SESSION-OVERRUN` | 单桌会话 >3 小时未结账 | sensitive | 提示 + 商家端标黄 |
| `R-CART-DIVERGENCE` | 成员 `cartSummary` 与服务端订单金额持续不一致 >5 分钟 | sensitive | 探针告警 + 冻结该成员下单 |

### 7.2 探针数据流

```
关键状态变更（授权/加入/移除/轮换/异常）
  ↓ 写入 obsidian_table_session_probes { probeId, traceId, sessionId, participantId, phase, payload, at }
  ↓ 每 N 条或异常时必须 → integrityChain 生成链存证
  ↓ 异常事件额外生成「全量状态快照」（复用 createMilestoneSnapshot，tag: emergency_backup）
```

**为什么异常时必须快照**：`persistStore` 的 rolling 层会归档旧记录的重量字段。授权纠纷需要完整现场，因此异常点必须显式落快照，而不是依赖滚动保留。

### 7.3 数据退回（三档粒度）

| 档 | API | 场景 |
|---|---|---|
| **字段级** | `rollbackPatches(pointerId, ['/participants/2/authority'])` | 误把某成员提为 manage，只回退该字段 |
| **实体级** | `rollbackPointer(pointerId)` | 误移除某成员，恢复该成员全部字段 |
| **会话级** | 会话快照还原 | 整桌被误操作（如被误清台），恢复成员集合 + 授权链 |
| **微件级** | `createMilestoneSnapshot` + `restoreMilestoneSnapshot` | 极端情况整桌兜底 |

**冲突处理约束**：退回前必须走 G4 基线校验。若目标状态在指针之后已被再次修改，返回 `CONFLICT` 并要求商家在"期望 vs 实际"对照后显式确认强制覆盖 —— 禁止静默覆盖（这是治理层已实现的语义，直接复用）。

### 7.4 会话级版本追溯

每个 `TableSession` 必须能回答："这张桌在第几轮占用时，谁授权了谁，中途被谁移除过，商家介入过几次。"

实现：会话关闭时生成一份**会话档案**（不可变快照），写入 `occupancySeq` + 完整参与者变更时间线 + 链尾哈希。该档案按 `permanent` 层保留（资金/纠纷相关）。

---

## 8. 权限与合规约束

| 主体 | 权限模型 |
|---|---|
| 顾客端 | 无 RBAC；凭 `participantId` + `qrToken` + `deviceFingerprint` 三元凭据；`authority` 决定能否下单 |
| 商家端 | 复用 `rbacEngine`；新增 `table:view_session`（barista 起）、`table:override_link`（manager，敏感）、`audit:export`（manager，敏感） |
| 授权弹窗 | 仅 `authority === 'manage'` 且在线者可见可操作 |

**约束**：顾客端的 `authority` 校验必须在**写入路径**做（`governedWrite` 前的中介层），不能只靠 UI 隐藏按钮。绕过 UI 直接调用存储是不可接受的 —— 这与本次前端重构中"参数控制台写路径统一"的约束同源。

---

## 9. 三端与实时性约束

| 端 | 关键屏 | 特殊约束 |
|---|---|---|
| 顾客端（小程序/H5） | 扫码落点、首绑表单、等待授权页、点餐主流程、同桌成员面板 | 弹窗必须 `alertdialog`；等待页需显示"已通知 N 位成员"，避免用户以为卡死 |
| 商家端 | 桌台矩阵、会话监测台（三层）、探针告警台 | L2 列表必须支持"按风险/按金额/按停留时长"排序 |
| 后厨端 | 不变 | 无变更 |

**实时性**：全部走 `reactiveSyncBus`（已具备 `BroadcastChannel`）。**注意**：`BroadcastChannel` 仅同源同浏览器有效；跨设备（顾客手机 vs 商家平板）**必须**走服务端通道（CloudBase 或 MQTT）。这是本方案最大的技术前提，见 §11 未决问题。

---

## 10. 落地顺序与验收门槛

### 10.1 顺序（按依赖）

```
T1  数据层地基
    ├─ 新增 table_session 模块（types / rollbackGuard / governedStorage 三处注册）
    ├─ TableSession / DiningParticipant / LinkRequest 类型
    └─ tableStorage 扩展：会话 CRUD + CAS 首绑 + settleRequest 幂等
T2  二维码体系
    ├─ TableItem.qr* 字段 + 生成/轮换
    ├─ 扫码路由 /t/{code} + 五种落点分支
    └─ 打印接入 TableBatchPrintModal
T3  授权协议
    ├─ reactiveSyncBus 新增 4 类事件
    ├─ 强制弹窗 + 等待页 + 已处理提示
    └─ 并发用例（首绑竞态 / 双同意竞态 / 离线悬挂）
T4  全量抓取
    ├─ 动作枚举补 15 种 + 日志字段补 3 个
    └─ 零丢失采集队列 + 本地缓冲重放
T5  商家端监测台
    ├─ L1/L2/L3 三层
    └─ 节流 + 按需拉取的实时策略
T6  探针与退回
    ├─ 5 条规则接入 governanceRuleEngine
    ├─ 探针流 + 异常快照
    └─ 三档退回入口 + 冲突确认
T7  合规
    ├─ 脱敏展示 + 权限门禁
    └─ 留存期限 + 首扫告知同意
```

**T1 必须先于 T3**：没有 CAS 与幂等原语，授权协议在生产并发下必然出错。
**T6 必须在 T5 之后**：探针告警台需要监测台提供下钻锚点。

### 10.2 验收门槛

| 指标 | 门槛 |
|---|---|
| 并发首绑 | 20 个客户端同时扫同一空桌，**恰好 1 个 owner**，其余全部转为申请者 |
| 双同意竞态 | 两个授权人同时点同意，**恰好 1 条 `LinkRequest` 被 settle**，另一侧显示"已被 X 处理"无报错 |
| 授权链完整 | 任意成员可回溯到 `grantedBy` 源头；无 `R-ORPHAN-PARTICIPANT` 命中 |
| 事件零丢失 | 断网 60s 内产生的全部事件，恢复后 100% 重放成功且无重复 |
| 退回正确性 | 字段级退回后，其余字段值与退回前逐字节一致 |
| 治理覆盖 | 3 个新键全部命中 `GOVERNED_KEY_MAP`，无孤儿键 |
| 冲突不静默 | 100% 的并发修改退回请求返回 `CONFLICT` 或强制确认，无静默覆盖 |
| 隐私 | 商家端默认视图不含完整 id / 未脱敏手机号 |

建议把这 8 项固化进 `scripts/verify-table-session.ts`，纳入既有 `verify-governance.ts` 回归体系。

---

## 11. 未决问题与风险

| # | 问题 | 影响 | 建议 |
|---|---|---|---|
| 1 | **跨设备实时通道未定** | `BroadcastChannel` 只在同一浏览器同源内有效，顾客手机与商家平板之间**无法**用它通信。若不做服务端通道，授权弹窗与监测台实时性都无法实现 | **必须优先决策**：接 CloudBase 实时数据库 / MQTT / 轮询（轮询体验差但零依赖）。这是本方案唯一的前置技术卡点 |
| 2 | 同桌 AA 与账目归属 | `spendAttribution` 已留字段，但"谁点的菜谁付钱"与"统一结账"是两种业务模式 | 需业务确认；技术上两种都支持，差异在结账页聚合方式 |
| 3 | 二维码是否要带定位 | 地理围栏能显著降低截图外传风险，但小程序定位权限有合规成本 | 建议：首绑校验围栏，后续访问不校验 |
| 4 | 行为数据量级 | 单桌 4 人 × 每小时数百事件 × 高峰多桌，rolling 层 1000 条配额会迅速打满 | 需评估后调整分层配额，或把明细推到 IndexedDB 专用表（`persistentStore` 已支持，需扩展） |
| 5 | 与既有 `TableBindModal` 的关系 | 现有绑定弹窗是"单客户端自选桌台"，与本次"扫码绑定"路径并存会造成两套入口 | 建议：扫码为主路径，`TableBindModal` 降级为"服务员代客绑台"入口，共用同一 session 层 |
| 6 | 商家端监测台的隐私边界 | "商家能看到用户在浏览哪个分类"在部分司法辖区属于行为监控 | 需法务确认告知文案与留存期限；技术侧已按最小必要原则设计 |

---

## 12. 一句话总结

本次优化的本质是**在既有 `userJourneyTracker` + `reactiveSyncBus` + `tableStorage` 三块地基上，补上"桌台会话"这一层领域模型，并把授权判定下沉到数据层**。二维码与桌号是入口，会话与授权是核心，探针与退回是保障，全量抓取是既有能力的补全。

落地顺序的关键是 **T1（会话层 + CAS 幂等原语）先行**——否则授权协议在真实并发下必然崩溃；以及**尽早决策跨设备实时通道**（§11 第 1 项），这是唯一可能导致整体架构返工的风险点。
