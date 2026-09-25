# 跨设备实时通道技术选型决策书
## 堂食桌台联动授权 · 顾客手机 ↔ 商家平板

- 版本：v1.0
- 日期：2026-09-11
- 状态：**已决策**
- 关联：`TABLE-QR-LINK-ORDERING-SYSTEM-SPEC.md` §9/§11、`src/utils/cloudbase.ts`、`src/utils/syncEngine.ts`、`src/utils/reactiveSyncBus.ts`

---

## 0. 决策结论

**采用 CloudBase 实时推送（`db.collection().watch()`）作为跨设备主通道，并按 L0–L4 五层降级。**

四项选型的裁定：

| 方案 | 裁定 | 一句话理由 |
|---|---|---|
| **CloudBase 实时推送** | ✅ **主通道** | 项目**已在线运行**这套通道，延迟与服务端推送语义都满足要求，且与现有登录态、云函数、离线队列天然同源 |
| MQTT | ❌ 不采用 | 需额外部署与运维 broker，鉴权与现有 CloudBase 登录态割裂，且无内建持久化/历史查询，离线补偿要自己再造一遍 |
| 轮询 | ⚠️ **仅作 L3 降级** | 延迟受周期支配（3s 轮询最坏 3s），授权弹窗体验不可接受；但作为 watch 不可用时的兜底必须保留 |
| BroadcastChannel（现状） | ⚠️ **降为 L0 同设备快通道** | 只在同源同浏览器有效，跨设备零作用；但同桌共用一台设备时延迟为 0，作为快路径保留 |

**决策的关键依据是一条既成事实**，而不是对新方案的偏好：`src/utils/cloudbase.ts:1088` 已经实现了完整可用的实时订阅——`db.collection(TCB_COLLECTIONS.ORDERS).orderBy(...).watch({ onChange, onError })`，并且已经处理了三件难事：

1. **auth 前置校验**（`getLoginState()` 未就绪时不发起 WebSocket，避免 `credentials not found`）
2. **错误降级**（识别 `unauthenticated` / `credentials` 错误后主动 `watcher.close()`，回退本地事件总线，不打断界面）
3. **云快照不覆盖本地**（`mergeCloudOrdersWithLocal()` 先合并再回写）

在这种情况下引入 MQTT 意味着**并存两套实时基础设施**，是明确的技术债。

---

## 1. 现状盘点（决策的既有约束）

### 1.1 已具备的能力

| 能力 | 位置 | 可直接复用 |
|---|---|---|
| 云实时订阅（WebSocket 推送） | `cloudbase.ts` `watchCloudOrders()` | ✅ 模式可直接套用 |
| 离线 outbox 队列 | `syncEngine.ts`，键 `obsidian_sync_outbox_queue` | ✅ 断网不丢 |
| 网络状态监听 + 15s 心跳 | `syncEngine.ts` `initNetworkListeners` / `startHeartbeat` | ✅ 已有的重连/出列触发 |
| 冲突策略（三档） | `syncEngine.ts` `ConflictStrategy` | ✅ 已有 `SERVER_AUTHORITATIVE` |
| 同设备广播 | `reactiveSyncBus.ts`（BroadcastChannel，12 类事件） | ✅ 作为 L0 |
| 匿名/自定义登录 | `cloudbase.ts` `ensureCloudbaseAuth()` | ✅ 顾客端身份来源 |
| 云函数模板体系 | `cloudbase.ts` `CLOUD_FUNCTION_TEMPLATES`（含 `chatMessages` 的 save/list/sync/get 模式） | ✅ 桌台云函数照此写 |
| 环境 ID | `VITE_TCB_ENV_ID`，默认 `tc100-d9gz0e2ko5929e360` | ✅ |
| SDK | `@cloudbase/js-sdk` ^3.8.2（已装） | ✅ |

### 1.2 缺口

| 缺口 | 说明 |
|---|---|
| `reactiveSyncBus` 只有 BroadcastChannel | 12 类事件无法跨设备；桌台会话的 4 类新事件同理 |
| 无传输层抽象 | 事件生产/消费与 BroadcastChannel 强耦合，换通道要改所有调用点 |
| 授权 CAS 只在客户端 | **跨设备下客户端 CAS 无原子性** —— 这是本决策最重要的架构含义，见 §3.2 |
| 顾客身份未与云端 uid 绑定 | `participantId` 本地生成，换设备后授权链会断（对应 `findOrphanParticipants`） |

---

## 2. 五层通道设计（L0–L4）

```
┌─ L0 同设备（同桌共用一台设备 / 同浏览器多标签）─────────────┐
│   TransportAdapter: BroadcastChannel                         │
│   延迟 ~0ms · 已有实现 · 免费                                │
├─ L1 跨设备主通道 ────────────────────────────────────────────┤
│   TransportAdapter: CloudBase watch（服务端 WebSocket 推送）  │
│   延迟 P95 约 100–300ms · 已在线 · 按 where 过滤订阅          │
├─ L2 断网 ────────────────────────────────────────────────────┤
│   Outbox 队列 + 本地乐观更新；恢复后幂等重放                  │
│   已有 syncEngine outbox · 事件带 eventId 去重                │
├─ L3 watch 不可用（鉴权失败 / 网络受限 / 连续失败）────────────┤
│   3s 轮询（仅拉取待决请求与会话版本号）+ 15s 心跳              │
│   已有心跳框架 · 需补轮询适配器                               │
└─ L4 全通道失效（商家端兜底，不依赖实时）──────────────────────┘
    探针流 + 会话监测台 + 商家强制介入（table:override_link）
```

**关键约束**：业务代码只与 `TransportAdapter` 接口交互，**不感知具体通道**。降级与升级由适配器内部完成，事件类型与 payload 契约保持不变（已有 12 类 + 新增 4 类）。

### 2.1 适配器接口（建议）

```ts
export interface TransportMessage<T = unknown> {
  eventId: string;          // 幂等去重
  traceId: string;          // 全链路追踪（与探针共用）
  type: ReactiveEventType;
  payload: T;
  emittedAt: string;
  emittedBy: string;        // participantId 或 merchantId
}

export interface TransportAdapter {
  readonly kind: 'broadcast' | 'cloudbase' | 'polling' | 'noop';
  /** 发布（本地即时生效，远端尽力投递） */
  publish<T>(msg: TransportMessage<T>): Promise<{ delivered: boolean }>;
  /** 订阅；filter 用于按桌/按会话收窄，避免全量快照风暴 */
  subscribe(filter: SubscriptionFilter, onMessage: (msg: TransportMessage) => void): () => void;
  /** 健康度，供降级决策与探针上报 */
  health(): { connected: boolean; latencyMs: number; consecutiveFailures: number };
  close(): void;
}

export interface SubscriptionFilter {
  tableCodes?: string[];        // 顾客端只订阅本桌
  sessionIds?: string[];
  participantIds?: string[];    // 只接收与我相关的授权请求
}
```

---

## 3. 传输之上的三个架构决策

通道定了之后，有三件事必须在通道层解决，否则跨设备一上线就会出问题。

### 3.1 订阅粒度：必须按桌/按人过滤，不能订阅全量

CloudBase `watch` 是**按集合订阅**的。若顾客端订阅整个 `obsidian_table_link_requests`，一店 20 桌 × 4 人 = 80 个客户端各自收到全量快照，形成快照风暴（每次变更广播 80 次）。

**约束**：
- `obsidian_table_sessions`：顾客端用 `where({ sessionId: mySessionId })` 订阅**单文档**
- `obsidian_table_link_requests`：顾客端用 `where({ targets: _.in([myParticipantId]), status: 'pending' })` 只订阅与我相关的待决请求 —— **这也是把授权请求独立成集合（而非嵌在 session 文档里）的原因**：独立集合才能做这个过滤
- 商家端才订阅全量（会话列表 + 待决请求），且商家端数量少（每店 1–2 台）

### 3.2 授权 CAS 必须上移到服务端（本决策最重要的含义）

当前 `settleLinkRequest()` 用客户端内存态做 CAS（读 → 校验 `status === 'pending'` → 写）。**这在同设备内是原子的，跨设备不是。**

两个授权人在各自手机上同时点"同意"时：
- 各自读到 `pending`
- 各自写入 `granted`
- 结果：**双份授权、授权链出现两个 `grantedBy`**，且没有任何一方报错

**必须改为服务端条件更新**：新增云函数 `tableLink`，`settle` 动作用**条件写入的原子性**实现真 CAS：

```js
// 云函数 tableLink · action: 'settle'
const res = await db.collection('obsidian_table_link_requests')
  .where({ requestId, status: 'pending' })   // 条件即比较
  .update({
    status: decision,
    resolvedBy: actorId,
    resolvedAt: new Date().toISOString()
  });

if (res.updated === 0) {
  // 已被他人抢先处理 —— 返回当前状态，让调用方展示"已被 X 处理"
  const cur = await db.collection('obsidian_table_link_requests').where({ requestId }).limit(1).get();
  return { code: 409, message: '该请求已被处理', data: cur.data[0] };
}
```

客户端 `settleLinkRequest()` 保留为**乐观路径**（同设备场景直接生效），但跨设备场景必须以服务端返回为准，并在收到 `TABLE_LINK_SETTLED` 广播后收敛本地状态。**"任一同意即同步关闭其余弹窗"的正确性，最终由服务端条件更新的原子性保证，而不是靠 UI 协调。**

### 3.3 顾客身份必须绑定云端 uid

跨设备的前提是**同一顾客在手机 A 和手机 B 上是同一个 `participantId`**，否则：
- 换设备后 `grantedBy` 指向的授权人找不到
- `findOrphanParticipants()` 会大量误报
- 授权链断裂

**方案**：`participantId` 的权威值改为「CloudBase 匿名登录 uid」的派生值；本地的 `deviceFingerprint` 只作辅助归并信号（`userDataRegistry` 已有 `obsidian_cloud_device_registry` 与硬件指纹归并逻辑，可复用）。扫码后先 `ensureCloudbaseAuth()`，用 uid 注册为 participant。

**副作用需接受**：匿名登录在部分受限环境会失败（代码已识别此情况）。此时降级为"本设备内有效"，并在 UI 明确提示"当前设备离线模式，换设备需重新申请加入"——**不静默假装已登录**。

---

## 4. 数据模型落到云端

| 集合 | 文档主键 | 订阅方 | 过滤条件 |
|---|---|---|---|
| `obsidian_table_sessions` | `_id = sessionId` | 顾客端（本桌）、商家端（全部） | 顾客：`where({ sessionId })` |
| `obsidian_table_link_requests` | `_id = requestId` | 顾客端（与我相关）、商家端（待决） | 顾客：`where({ targets: _.in([me]), status:'pending' })` |
| `obsidian_table_session_probes` | `_id = probeId` | **商家端才订阅**；顾客端可不上云 | 商家：`where({ tableCode, at: _.gte(ts) })` |

**探针不上云的理由**：探针是高频遥测（每人每小时数百条），全量上云会产生显著的写入与存储成本，而它的消费者只有商家端。顾客端本地环形缓冲保留即可；**异常事件**（对应 `ProbePhase = 'anomaly'`）才强制上云并触发链存证。

**安全规则（必须在控制台配置）**：
- 顾客端对 `obsidian_table_link_requests` **只能创建自己发起的请求**、**只能更新 `targets` 包含自己的文档**
- 顾客端**不可写** `status: 'granted'` 之外的字段；`participantId` / `grantedBy` 由云函数写入，客户端无权指定
- 桌台会话的成员增减**只能经云函数**，客户端只读 —— 否则任何人可直接把自己加进 `participants`

---

## 5. 可靠性与降级策略

| 项 | 策略 |
|---|---|
| watch 断线重连 | 指数退避 1s → 2s → 4s → 8s → 上限 30s，成功后退避重置 |
| 连续失败阈值 | 连续 5 次失败 → 切 L3 轮询，并写一条 `ProbePhase='anomaly'` 探针 |
| 轮询周期 | 3s（仅拉取待决请求 + 会话版本号，非全量文档） |
| 恢复判定 | 轮询期间每 60s 尝试一次 watch 重连；成功后自动切回并补拉一次全量 |
| 幂等 | 所有消息带 `eventId`；接收端保留最近 N 条已处理 eventId（LRU） |
| 离线队列 | 复用 `syncEngine` 的 outbox；恢复后按 `emittedAt` 顺序重放 |
| 事件顺序 | 同一 `sessionId` 的事件按 `emittedAt` 排序；服务端 `updatedAt` 为最终裁决 |
| 成本控制 | 订阅按 §3.1 收窄；探针默认不上云；心跳 15s（已有） |

**降级必须可见**：降级到 L3 或 L4 时，顾客端显示"网络不稳，授权可能延迟"，商家端在会话监测台标黄。**不允许静默降级让用户以为一切正常。**

---

## 6. 成本与延迟预期

| 指标 | L0 同设备 | L1 CloudBase watch | L3 轮询 |
|---|---|---|---|
| 端到端延迟 | < 10ms | P95 100–300ms | 平均 1.5s，最坏 3s |
| 连接数 | 0（进程内） | = 在线客户端数 | 0 |
| 单店 20 桌 × 4 人 | — | 80 条 watch 订阅 | 80 × 20 req/min |
| 授权类事件频率 | — | 人类操作级（每分钟个位数） | — |
| 额外基础设施 | 无 | 无（复用现有环境） | 无 |

结论：L1 的负载特征（低频人操作级事件 + 按桌过滤的窄订阅）完全在 CloudBase 免费/基础配额量级内；**MQTT 的唯一优势（更高吞吐）在本场景用不上**，而它的运维成本是确定的。

---

## 7. 落地顺序

```
C1  抽象 TransportAdapter
    ├─ 定义接口与 TransportMessage（含 eventId / traceId）
    ├─ 把 reactiveSyncBus 的 BroadcastChannel 收编为 BroadcastAdapter（行为不变）
    └─ 12 类既有事件全部走适配器 —— 先零行为变更地完成抽象，再谈换通道
C2  云端数据面
    ├─ 建 3 个集合（sessions / link_requests / probes）
    ├─ 配置安全规则（§4）
    └─ 云函数 tableLink：join / settle（服务端 CAS）/ heartbeat / release
C3  授权写入上移
    ├─ settleLinkRequest 改为"本地乐观 + 服务端裁决"
    ├─ 收到 TABLE_LINK_SETTLED 后收敛本地状态
    └─ 跨设备双同意竞态用例（两个进程，非同一进程的两行代码）
C4  订阅适配
    ├─ CloudBaseAdapter（watch + where 过滤 + 退避重连）
    ├─ 顾客端：本桌会话单文档 + 与我相关的待决请求
    └─ 商家端：全会话 + 待决请求
C5  身份绑定
    └─ participantId 权威值改为 CloudBase uid 派生；匿名登录失败时明确降级提示
C6  降级链与探针
    ├─ PollingAdapter（3s，仅待决请求）
    ├─ 连续失败切换 + 恢复切回 + 补拉全量
    └─ 降级/恢复写探针（ProbePhase='anomaly'）
C7  压测与验收（见 §8）
```

**C1 必须先做**：先零行为变更地完成传输层抽象，再换通道，否则一旦出问题无法区分是"抽象引入的"还是"通道引入的"。
**C3 必须与 C2 同批**：客户端 CAS 与云函数 CAS 并存期间会出现两条写入路径，容易双写。

---

## 8. 验收门槛

| # | 指标 | 门槛 |
|---|---|---|
| 1 | 跨设备授权弹窗端到端延迟 | P95 < 1.5s（真实两台设备，非同浏览器两标签） |
| 2 | **跨设备双同意竞态** | 两个授权人在**不同设备**同时同意 → 恰好 1 条 `granted`，另一侧收到 409 并显示"已被 X 处理" |
| 3 | 断网重放 | 断网 60s 内产生的全部事件，恢复后 100% 重放且无重复（按 eventId 校验） |
| 4 | 降级切换 | watch 连续失败 5 次后 5s 内切到轮询；恢复后 60s 内自动切回并补拉 |
| 5 | 订阅收窄 | 顾客端订阅的数据量不随"店铺桌数"增长（20 桌店铺与 2 桌店铺的顾客端订阅量相同） |
| 6 | 越权防护 | 直接调用数据库 API 无法把自己加进 `participants`，无法伪造 `grantedBy` |
| 7 | 身份一致性 | 同一顾客换设备后仍为同一 `participantId`；匿名登录不可用时明确提示而非静默降级 |
| 8 | 降级可见 | L3/L4 状态下顾客端与商家端均有可见提示 |

建议固化进 `scripts/verify-transport.ts`，与既有 `verify-governance.ts`（58 项）和 `verify-table-session.ts`（67 项）并入同一回归体系。

---

## 9. 遗留风险

| 风险 | 说明 | 缓解 |
|---|---|---|
| **匿名登录在受限环境失败** | 部分企业网络/浏览器策略下匿名登录不可用，跨设备能力直接失效 | 明确降级提示 + 提供手机号验证登录作为备选；商家端不受影响 |
| **云函数部署不在本仓** | `CLOUD_FUNCTION_TEMPLATES` 是源码模板，需人工在控制台部署 | 把 `tableLink` 模板补进 `CLOUD_FUNCTION_TEMPLATES`，与既有模板同源管理 |
| **云端与会话本地态的最终一致性** | 客户端乐观写入 + 服务端裁决存在窗口期 | 以服务端 `updatedAt` 为最终裁决；UI 在窗口期显示"处理中"而非"已完成" |
| **watch 配额** | 大量并发 watch 可能触发连接数配额 | 按 §3.1 收窄；商家端可合并为单订阅；监控连续失败率作为预警 |
| **安全规则配置遗漏** | 规则在控制台而非代码中，易被遗漏且难复核 | 把规则 JSON 纳入仓库（`infra/tcb-rules/`），并在回归脚本中断言其存在性 |

---

## 10. 一句话总结

**跨设备通道用 CloudBase 实时推送，因为它已经在项目里跑着了**——`cloudbase.ts` 的 `watch()` 订阅连同 auth 校验、错误降级、快照合并三件难事都已经实现。真正需要新建的不是通道，而是三件事：**传输层抽象**（让通道可替换）、**授权 CAS 上移服务端**（跨设备下客户端 CAS 不成立）、**顾客身份绑定云端 uid**（否则授权链跨设备即断）。MQTT 的唯一优势在本场景用不上，而运维成本是确定的。
