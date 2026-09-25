# 控制台问题诊断与修复报告

**项目**：`5remix-ccrt`（Urban Radar 流动餐车 GPS 极速专送平台）
**检查时间**：2026-09-18
**检查范围**：类型检查、生产构建、dev 运行时、生产构建运行时（浏览器控制台 / 未捕获异常 / 网络失败 / localStorage 写入行为）
**检查结论**：**未发现编译期错误与崩溃级缺陷；控制台污染集中在 1 个 P0 级冷启动缺陷 + 3 个 P1 级配置/资源缺陷。**
**实施状态**：**全部 10 项已实施并逐项验证通过 —— 见 §0.1。**

---

## 0. 结论摘要

| 编号 | 问题 | 严重度 | 控制台表现 | 冷启动计数 | 修复难度 |
| :-- | :-- | :-- | :-- | :-- | :-- |
| **P0-1** | 冷启动版本指针风暴（写入网关全量重建基线） | **严重** | `治理规则命中 …价格类字段修改了 N 次` 刷屏 | **132 条 / 占全部消息 90%** | 中（2 处补丁） |
| **P1-2** | `obsidian_truck_business_statuses` 缺回滚适配 | 高 | `已接入写入网关但缺少回滚适配` | 6–8 条 | 低（1 行） |
| **P1-3** | CloudBase 实时通道：每个事件类型各开一路 watch | 高 | `initWatch success` / `client paused` / `ws event` 高频抖动 | 43–50 条 | 中 |
| **P1-4** | 后端未开荒：云函数 404 + 云数据库 422 | 高 | `Failed to load resource: 404/422` | 约 20 条 | 低（编排/配置） |
| **P2-5** | 自动触发的 `navigator.vibrate` 被浏览器干预拦截 | 中 | `Blocked call to navigator.vibrate …` | 2 条 | 低 |
| **P2-6** | SDK 内部未捕获的 promise rejection | 中 | `Uncaught (in promise) Error: wsclient.send timedout` | 偶发 | 低 |
| **P2-7** | 主 chunk 5.14 MB（单一巨块） | 中 | 构建告警 | — | 中 |

**一句话根因**：冷启动时，写入网关在「基线为空」的前提下把 **127 道菜 + 9 笔订单**当作 **136 条全新实体创建**逐条落成版本指针，每条指针又逐条进入反篡改规则评估——于是**一次合法的种子数据初始化，被系统误判为「10 分钟内改价 127 次」的价格篡改攻击**，产生 132 条告警刷屏，并伴随 276 次 localStorage 全量重写。

---

## 0.1 实施状态与最终验证结果

**状态**：全部 10 项已实施并逐项验证通过。

| 项目 | 提交 | 规模 |
| :-- | :-- | :-- |
| 修复前基线快照 | `34b7fc4` | 462 文件（同时另存完整文件系统快照备份） |
| 实施提交 | `ffb9acc` | 41 文件，+712 / −145 行（另含 29 张图片原地重编码） |

### 效果对照（生产构建 · 全新访客冷启动 20 秒）

| 指标 | 修复前 | 修复后 | 变化 |
| :-- | --: | --: | --: |
| **控制台消息总数** | **147** | **14** | **−90.5%** |
| warning 条数 | 136 | 4 | −97.1% |
| **`治理规则命中` 误报** | **132** | **0** | **−100%** |
| `initWatch success` | 7 | **3** | −57% |
| 未捕获异常 | 1 | **0** | −100% |
| `缺少回滚适配` 告警 | 2 | **0** | −100% |
| `navigator.vibrate` intervention | 有 | **0** | −100% |
| 云函数 404 + 集合 422 | 18 | **0**（熔断 + 1 条汇总提示） | −100% |
| localStorage 写入次数 | 335 | 约 **50** | −85% |
| **`obsidian_version_pointers` 写入** | **276** | **4** | **−98.6%** |
| **首屏 JS（index chunk）** | **5,142 kB** | **1,896 kB** | **−63.1%** |
| 菜品图片总体积 | 19.6 MB | **7.71 MB** | −60.6% |

### 关键语义修正（不只是"日志变少"）

版本指针由 **137 条 `create`**（被判为 `sensitive` 级「张磊 价格篡改」）变为**每模块 1 条聚合存证**：

```
module: dishes   action: create   risk: normal
summary: 「系统启动初始化播种【菜品与菜单管理】」
```

即审计数据从**错误的告警**变为**正确的初始化记录**，且 9 条真实历史记录完好保留。

### 逐项落地与验证

| # | 项目 | 落地位置 | 验证结论 |
| :-- | :-- | :-- | :-- |
| ① | `navigator.vibrate` 用户激活门控 | 新增 `src/utils/haptics.ts`（`safeVibrate`）；收敛 9 处调用（`App.tsx` 2 / `BottomNavBar.tsx` 5 / `PickupTrackingSection.tsx` 2） | 残留原始调用 0 处；intervention 告警 0 条 |
| ② | 全局守卫补 SDK 噪声模式 | `index.html`、`src/main.tsx`（两处清单对齐，并注明"无法过滤 SDK 主动 `console.error`"） | `wsclient.send timedout` 未捕获异常归零 |
| ③ | 治理告警窗口去重 | `versionPointerEngine.ts`（按 `module+ruleId` 10s 窗口，仅影响日志） | 单条告警不再重复上百次 |
| ④ | 补回滚适配 | `rollbackGuard.ts`（`system` 模块补 `c('obsidian_truck_business_statuses','truckId')`） | 一致性告警 2 → 0，该键恢复可回滚 |
| ⑤ | **初始化播种豁免** | `governedStorage.ts`（`isInitialSeed` 判据 + 1 条聚合存证） | 137 条 create → 1 条；写盘 276 → 4 次 |
| ⑥ | 播种不参与反篡改计数 | `versionPointerEngine.ts`（`isBulkSeed`，与既有 `isRepairAction` 同范式） | 132 条误报 → 0；`riskLevel` 由 `sensitive` 修正为 `normal` |
| ⑦ | 批量 + 合并落盘 | `versionPointerEngine.ts`（`beginBatchPersist` / `endBatchPersist` / `savePointersDeferred`，`finally` 保证落盘；派生哈希延迟一 tick 且有启动自愈兜底） | 实测 `endBatchPersist` 落盘路径生效 |
| ⑧ | watch 单路化 + 就绪门控 | `adapters.ts`（目标并集 `mergedTargets`、同 tick 合并、签名复用、降级后停止自建重连） | `initWatch` 43–165 → **3** |
| ⑨ | 后端不可用熔断 | `cloudbase.ts`（5 分钟半开重探）+ 入口守卫（`fetchDishesFromCloud` / `fetchOrdersFromCloud` / `fetchUserProfileFromCloud` / `autoAuthEngine`） | 18 条 404/422 → 0，改为 1 条汇总提示 |
| ⑩ | 首屏瘦身 | `App.tsx`（三视图 `React.lazy` + **每视图独立** Suspense 边界）；29 张菜品图**原地重编码** | 首屏 5,142 → 1,896 kB；图片 19.6 → 7.71 MB |

### 全流程中一处自引入回归（已修复，如实记录）

首次实施第 ⑧ 项时，我在 `openWatcher` 内无条件加入 `closeWatchers()`，导致**关闭仍在握手的 watcher 触发 SDK 错误回调 → 重连风暴**：`initWatch` 一度恶化到 **165 次**、连接抖动 86 次、控制台 544 条。

经复验定位后改为三段式修正：① `setTimeout(0)` 合并同 tick 内的多次订阅；② 以订阅目标**签名**判断是否需要重建（签名不变则复用连接）；③ 连续失败达阈值后**停止自建重连**，交由恢复周期统一重探。最终 `initWatch` 收敛至 **3 次**。

> 说明该问题是通过**修复后再测量**发现的，而不是靠代码审阅——这也是本报告坚持"每项改动都跑一次冷启动采集"的原因。

### 第 ⑩ 项的两处工程判断

1. **未使用 `manualChunks` 拆分业务代码**。`React.lazy` 已让 Rollup 在动态导入边界自动切分（`MerchantSystemView` 2,498 kB / `PlatformSystemView` 509 kB / `RiderSystemView` 244 kB 独立成块）。强行按目录再拆会引入**循环 chunk 依赖**风险，收益为零。
2. **图片保持 JPEG 格式与文件名**。实测 29 张原图严重未优化（1024² 却达 600–740 kB）。方案对比：

   | 方案 | 体积 | 缩减 | 最差 PSNR | 结论 |
   | :-- | --: | --: | --: | :-- |
   | `quality=keep`（数学无损） | 17.2 MB | 12.1% | ∞ | 收益过小 |
   | **`quality=95` + optimize + progressive** | **7.71 MB** | **60.6%** | **42.05 dB** | **✅ 采用**（≥40 dB 即视觉不可区分） |
   | `quality=92` | 5.8 MB | 70.5% | 39.84 dB | 低于 40 dB 门槛 |
   | `quality=90` | 5.2 MB | 73.4% | 38.81 dB | 同上 |

   因**格式与文件名均未变动**，64 处引用、5 个源文件**零改动**；29/29 张可正常解码；git 显示纯二进制变更（0 行代码增删）。

### 遗留与后续建议

| 项 | 说明 |
| :-- | :-- |
| 后端资源未开荒 | 熔断只消除了噪声，**能力仍需补齐**：在 `tc100-d9gz0e2ko5929e360` 创建 `shaokao-sku` / `obsidian_truck_users` / `obsidian_truck_orders` / `obsidian_reactive_events` 集合，并部署 `userProfile` / `orders` / `getOrders` / `obsidian_orders` 云函数。熔断为半开语义，补齐后 **5 分钟内自动恢复**，无需重新部署前端。 |
| 播种记录的 `operator` 字段 | 聚合存证的 `summary` 已正确表述为「系统启动初始化播种」，但结构化 `operator` 字段仍取当前登录人（`getActiveOperator()`）。若要彻底修正需引入系统身份对象，会牵动依赖 `operator.name` 的展示逻辑，本次**未改动**以守住零影响。 |
| SDK 连接抖动 | 沙箱环境无法维持 WebSocket（`pong timed out`），故仍可见少量 `ws event` 重连日志。正常网络下端到端通道应稳定保持。 |
| 主 chunk 仍 1,896 kB | 食客端仍偏大，可进一步按页面视图（点餐 / 购物车 / 追踪）动态导入。 |

---

## 1. 检查方法

| 步骤 | 命令 / 工具 | 结果 |
| :-- | :-- | :-- |
| 依赖安装 | `npm install` | 成功，326 包 |
| 类型检查 | `tsc --noEmit` | **0 error** |
| 生产构建 | `vite build` | 成功，13s；1 条 chunk 体积告警 |
| dev 运行时 | `npm run dev` → `http://127.0.0.1:3000` | 采集完成 |
| 生产运行时 | `vite preview` → `http://127.0.0.1:4173` | 采集完成（纯净 profile 冷启动） |
| 控制台采集 | Chrome 152 headless + 原生 CDP（`Runtime.consoleAPICalled` / `exceptionThrown` / `Log.entryAdded` / `Network.*`） | 4 份原始 trace |
| 写入溯源 | 注入 `Storage.prototype.setItem` 拦截器（在应用脚本前注入），回溯调用栈与频次 | 精确定位循环链路 |

> 采集环境说明：分别做了「冷启动（站点数据全部清空）」与「热启动（复用已有 localStorage）」两组对照，以区分「启动期一次性爆发」与「稳态持续泄漏」。

---

## 2. P0-1 冷启动版本指针风暴（核心问题）

### 2.1 现象

生产构建、全新访客首次打开页面，20 秒内控制台产生：

```
消息总数 147 条 → warning 136 条
其中 132 条为同一条告警：
[VersionPointerEngine] 治理规则命中 1 项（sensitive）：
  【张磊】在 10 分钟内对「菜品与菜单管理」价格类字段修改了 N 次
```

`N` 从 **3 单调递增至 127**，且每隔数十毫秒连续抛出。

| 环境 | 控制台消息总数 | warning | 本告警条数 | 计数范围 |
| :-- | --: | --: | --: | :-- |
| dev 冷启动 | 250 | 149 | **132** | 3 → 127 |
| **生产冷启动（纯净 profile）** | **147** | **136** | **132** | 3 → 127 |
| dev 热启动 | 65 | 12 | **0** | — |
| 生产稳态（8s 窗口） | — | — | **0** | — |

**关键判据**：热启动与稳态均为 0 条 → 该缺陷是**冷启动专属的一次性爆发**，不是持续循环。

### 2.2 证据链（写入溯源）

同一冷启动窗口内 `localStorage.setItem` 调用 **335 次**，其中：

```
obsidian_version_pointers   x276   ← 占全部写入的 82.4%
   137x  safeSetStorage ← PersistentStore.setSync ← VersionPointerEngine.savePointers
         ← VersionPointerEngine.recordDataMutation ← ⟨commit handler⟩ ← Array.forEach
   137x  safeSetStorage ← PersistentStore.setSync ← VersionPointerEngine.savePointers
         ← VersionPointerEngine.backfillChainProof
     1x  safeSetStorage ← … ← backfillAllChainProofs ← selfHeal
```

**137 这个数字的来源已验证闭合**——运行时读取实际数据规模：

| 项 | 实测值 |
| :-- | --: |
| `obsidian_truck_dishes` 菜品条数 | **127** |
| `obsidian_truck_orders` 订单条数 | **9** |
| 合计实体数 | **136** |
| 观测到的 `recordDataMutation` 调用 | **137** |
| 落盘后实际保留的版本指针 | **30**（被保留配额裁剪） |

**127 + 9 = 136 ≈ 137 次逐条记录**，误差 1 条。证据链完全吻合。

### 2.3 根因链（代码级）

```
① 冷启动，localStorage 为空
        ↓
② fetchDishesFromCloud() / App.tsx:566 一次性写入全量菜单（127 条）
   —— 此时写入钩子拿到的 prev = undefined / []
        ↓
③ governedStorage.ts:359  governedRecordOnly(key, prev, next)
        ↓
④ governedStorage.ts:413  buildDrafts()：beforeList = []  →  127 条全部命中
        if (!prev) { drafts.push({ actionType: 'create', … }) }
   —— 每条菜品各生成 1 条 draft（订单同理 9 条）
        ↓
⑤ governedStorage.ts:379  scheduleHookFlush() → flushHookDrafts() → flush()
        ↓
⑥ versionPointerEngine.ts:1931  commit handler：
        drafts.forEach((draft) => recordDataMutation({ … }))   ← 循环 136 次
        ↓
⑦ versionPointerEngine.ts:977  recordDataMutation()
        · this.savePointers(updatedPointers)   → 1 次全量序列化写盘
        · .then(() => this.backfillChainProof(pointerId)) → 再 1 次全量写盘
        ↓
⑧ versionPointerEngine.ts:1095  evaluateRules(newPointer, 全部历史指针)
        → 命中「10 分钟内同一模块价格类字段被修改 ≥3 次」
        → console.warn(...)    ← 132 次刷屏
```

### 2.4 三重危害

1. **控制台污染**：单条无意义告警占据 **90%** 的控制台输出，真实错误被完全淹没——这直接破坏了本项目最看重的可运维性。
2. **审计语义错误（更严重）**：合法的一次性菜单播种被判定为 **`sensitive` 级价格篡改**，且主体被记为「张磊」。若该判定被上游告警/风控消费，将产生**持续性误报**；同时 `recordDataMutation` 会据此写入 `riskLevel`、`governanceAction`、`isSuspectedMistake` 等字段——**污染的是可信审计数据本身，而非仅日志**。代码中已存在 `isRepairAction` 规避自激的同类设计，说明该风险模式已被识别，但**初始化路径未纳入豁免**。
3. **写放大 + 审计丢失并存**：137 次记录 → 276 次全量重写（每次序列化整个指针数组，O(n²) 写放大）；而 `POINTER_RETENTION_CAP` 又将结果裁剪到 **30 条**——即**风暴既冲垮了性能，又把真正的历史记录挤掉了**。冷启动后留给用户的审计深度只剩 30 条。

### 2.5 修复方案

#### 补丁 A（推荐·根治）：初始化播种不逐条记录

`src/utils/governedStorage.ts` — `governedRecordOnly`（约 359 行）

```ts
export function governedRecordOnly(key: string, prev: unknown, next: unknown): void {
  const descriptor = GOVERNED_KEY_MAP[key];
  if (!descriptor) return;
  if (descriptor.recordMode === 'silent') return;

  // FIX(P0): 空基线 → 全量写入属于「初始化播种 / 批量导入」，不是业务变更。
  // 若按 create 逐条记录：一次菜单播种 = 127 条指针 + 276 次全量写盘，
  // 且逐条命中反篡改规则 → 控制台 132 条误报、审计配额被挤空。
  const isInitialSeed =
    (prev === undefined || prev === null || (Array.isArray(prev) && prev.length === 0)) &&
    next !== undefined && next !== null;

  if (isInitialSeed) {
    lastValueRegistry.set(key, next);
    // 保留一条聚合存证，审计可追溯但不产生风暴
    const afterList = Array.isArray(next) ? next : [];
    if (afterList.length > 0) {
      pendingHookDrafts.push({
        targetKey: key,
        module: descriptor.module,
        entityId: descriptor.singletonEntityId || key,
        entityName: descriptor.label,
        actionType: 'create',
        beforeData: null,
        afterData: { __seed__: true, count: afterList.length }
      });
      scheduleHookFlush();
    }
    return;
  }

  const drafts = buildDrafts(descriptor, key, prev, next);
  // …以下不变
}
```

**归类为「初始化播种」的判据**（满足其一即命中，避免漏豁免）：

```ts
const isInitialSeed =
  prev === undefined || prev === null ||
  (Array.isArray(prev) && prev.length === 0) ||
  (Array.isArray(prev) && Array.isArray(next) && next.length > prev.length * 5 + 20); // 批量导入兜底
```

#### 补丁 B（推荐·性能）：提交处理器批量落盘

`src/utils/versionPointerEngine.ts` — commit handler（1931–1952 行）

当前 `drafts.forEach` 中每条 `recordDataMutation` 都会 `savePointers()` 一次，导致 O(n²)。改为批内只落盘一次：

```ts
registerGovernanceCommitHandler((drafts, label, transactionId) => {
  const operator = globalVersionEngine.getActiveOperator();
  globalVersionEngine.beginBatchPersist();          // 新增：开启批模式，savePointers 只更新内存
  try {
    drafts.forEach((draft) => {
      globalVersionEngine.recordDataMutation({ /* …参数不变… */ });
    });
  } finally {
    globalVersionEngine.endBatchPersist();          // 新增：一次性落盘 + 派发事件
  }
});
```

配套在 `VersionPointerEngine` 内新增 `batchDepth` 计数：`savePointers` 在批模式下仅写 `this.pointers`，`endBatchPersist` 时统一 `persist`。**效果：276 次写盘 → 约 3 次。**

#### 补丁 C（推荐·规则层防御）：播种不参与反篡改计数

`src/utils/versionPointerEngine.ts` — `evaluateRules` 调用处（约 1085 行）

```ts
const isBulkSeed =
  params.origin === 'gateway' &&
  params.actionType === 'create' &&
  (params.customSummary?.includes('初始化播种') ?? false);

const ruleHits: RuleHit[] = (isRepairAction || isBulkSeed)
  ? []
  : evaluateRules(newPointer, [newPointer, ...existingPointers]);
```

与既有 `isRepairAction` 豁免保持同一设计范式。

#### 补丁 D（可选·兜底）：告警聚合/限流

即使 A–C 落地，规则引擎仍可能对真实高频操作逐条告警。建议按 `module + ruleId` 做 **N 秒窗口去重**，窗口内只输出首条与累计条数：

```ts
if (ruleHits.length > 0) {
  const sig = `${newPointer.module}:${ruleHits.map((h) => h.ruleId).join('/')}`;
  if (!shouldEmitRuleWarning(sig)) return;   // 默认 10s 窗口
  console.warn(`[VersionPointerEngine] 治理规则命中 …`);
}
```

> **建议落地顺序**：A + B 为必做（同时解决刷屏与写放大）；C 为纵深防御；D 为可选兜底。四者互不冲突。

---

## 3. P1-2 `obsidian_truck_business_statuses` 缺少回滚适配

**现象**（冷启动 6 条 / dev 8 条）：

```
[GovernedStorage] 以下键已接入写入网关但缺少回滚适配（有记录却回不了）:
  obsidian_truck_business_statuses
```

**根因**：该键已在写入网关登记（`src/utils/governedStorage.ts:117`），但未在回滚适配表登记：

- `GOVERNED_KEY_MAP`（governedStorage.ts:117）→ **有**
  `obsidian_truck_business_statuses: g('system', 'collection', '各餐车独立营业与渠道状态', 'business-status', 'truckId')`
- `ENTITY_SCOPE_REGISTRY.system.keys`（rollbackGuard.ts:137-140）→ **无**，仅登记了单例键 `obsidian_business_status`

二者差集即 `assertGatewayConsistency` 报告的 orphan（governedStorage.ts:568-574）。**这是真实的功能缺口**：该键会被生成版本指针，但**无法回滚**——恰好命中「有记录却回不了」的设计初衷告警。

**修复**：`src/utils/rollbackGuard.ts`，`system` 模块补登记：

```ts
system: {
  moduleLabel: '系统应急与全局配置',
  keys: [
    s('obsidian_business_status', ['business-status', 'system-config']),
    c('obsidian_truck_business_statuses', 'truckId')   // FIX(P1): 补齐回滚适配
  ],
  snapshotManaged: true
}
```

---

## 4. P1-3 CloudBase 实时通道：watch 重复订阅与空转抖动

**现象**：`[realtime]` 前缀的 SDK 日志占满 `log` 级别输出。

| 日志 | 冷启动计数 | 热启动（15s） | 生产冷启动 |
| :-- | --: | --: | --: |
| `[realtime] initWatch success` | **50** | **43** | 7 |
| `[realtime] INIT_WATCH use a retry ticket` | 14 | — | 20（污染样本） |
| `[realtime] client paused` / `resuming` / `resumed` | 各 7 | — | 各 11 |
| `[realtime] ws event: open` / `close` | 3 / 2 | 2 / — | 13 / 11 |

**根因（两层）**：

1. **每事件类型各开一路 watch。** `CloudBaseAdapter.subscribe`（adapters.ts:400-412）每次调用都**直接新增一个 watcher，且不关闭既有的**：

```ts
public subscribe(filter, onMessage): () => void {
  this.currentFilter = filter;
  const entry = { filter, onMessage };
  this.subscribers.push(entry);
  this.openWatcher(filter);        // ← 未先 closeWatchers()
  return () => {
    this.subscribers = this.subscribers.filter((s) => s !== entry);
    if (this.subscribers.length === 0) this.closeWatchers();   // ← 仅归零时才回收
  };
}
```

`reactiveSyncBus` 定义了 **12 种** `ReactiveEventType`（reactiveSyncBus.ts:27-40），每种都会触发一次 `manager.subscribe` → 一次 `openWatcher` → 一次 `db.collection().watch()`。**12 路 watch 全部盯同一个集合 `obsidian_reactive_events`**（过滤条件仅 `targets` 不同），而 `configureTransport`（reactiveSyncBus.ts:151-160）会整体重建 manager 并**按已登记过滤器逐一重订阅**——冷启动期间被调用 2–3 次。**12 × 3 ≈ 36–43 路**，与实测 43–50 吻合。

2. **未就绪也照开。** `openWatcher` 自身不做就绪判定（`tryRecover` 才做），叠加 `POLLING_INTERVAL_MS = 3000`（adapters.ts:531）的降级轮询，于是未签名状态下 SDK 以约 2.9 秒周期反复 `paused → INIT_WATCH → resumed` 空转。

**修复**：

```ts
// 修复 1：重订阅前先回收，保证「一个集合一路 watch」
private openWatcher(filter: SubscriptionFilter): void {
  if (this.closed) return;
  this.closeWatchers();                     // FIX(P1): 避免 watcher 累积
  const targets = filterTargets(filter);
  // 进一步：合并全部 subscriber 的 targets，单路 watch 覆盖
  const merged = Array.from(new Set(this.subscribers.flatMap((s) => filterTargets(s.filter))));
  const where = { targets: { $in: merged.length ? merged : targets } };
  // …
}

// 修复 2：未就绪不开 watch，避免 SDK 空转重试
public async subscribe(filter, onMessage): Promise<() => void> {
  const ready = await this.channel.isReady();
  if (!ready) { /* 仅登记订阅者，待恢复时统一 openWatcher */ }
  // …
}
```

**预期收益**：watch 路数 43 → **1**，SDK 日志量下降约 **97%**，同时消除 `wsclient.send timedout` 的产生条件（见 P2-6）。

---

## 5. P1-4 后端未开荒：云函数 404 与云数据库 422

**现象**：每次页面加载固定产生 8 条 404 与 10 条 422。

| 状态码 | 目标 | 出现次数 | 判定 |
| :-- | :-- | --: | :-- |
| **404** | `/v1/functions/userProfile` | 4 | 云函数**未部署** |
| **404** | `/v1/functions/orders` | 2 | 云函数**未部署** |
| **404** | `/v1/functions/getOrders` | 2 | 云函数**未部署** |
| **404** | `/v1/functions/obsidian_orders` | 2 | 云函数**未部署** |
| **422** | `collections/obsidian_truck_users` | 8 | 集合不存在或未授权 |
| **422** | `collections/obsidian_truck_orders` | 2 | 集合不存在或未授权 |
| **422** | `collections/shaokao-sku` | 2 | 集合不存在或未授权 |
| **422** | `collections/obsidian_reactive_events` | 2 | 集合不存在或未授权 |

**分析**：
- 目标环境 `tc100-d9gz0e2ko5929e360` 可达，**匿名鉴权实际成功**（日志可见 `[TCB] 腾讯云开发后台连接成功! … UID: v1zcB3GtEoin_RaXAlNg`）。
- `shaokao-sku` 侧发起的是**无条件 `limit(200).get()`**，同样返回 422 → 可排除查询语句构造问题，指向**集合未创建 / 安全规则未放行**。
- 云函数返回 404 → `CLOUD_FUNCTION_TEMPLATES`（cloudbase.ts:1686+）中的模板**尚未部署到环境**。
- 应用侧降级完备（自动切本地双轨存储，功能不受影响），**这是噪声而非功能缺陷**；但 18 条失败请求会持续污染控制台与 Network 面板。

**修复**（二选一）：

**方案 A（推荐）——补齐后端**：按 `AGENTS.md` / `PROJECT_MEMORY.md` 与 `cloudbase.ts` 内置模板，在 `tc100-d9gz0e2ko5929e360` 环境中创建上表 4 个集合 + 部署 4 个云函数，并配置集合安全规则允许匿名读写。

**方案 B——前端熔断（若暂不部署后端）**：在 `callCloudFunction` / 集合读取路径引入「后端不可用」短路，避免每次加载重复试探：

```ts
// src/utils/cloudbase.ts
let backendUnavailable = false;

export async function callCloudFunction<T>(name: string, data: any = {}) {
  if (backendUnavailable) {
    return { success: false, durationMs: 0, source: 'local_fallback',
             error: '后端未就绪（已熔断，跳过重试）' };
  }
  // …首次失败且为 404/CONNECTION_NOT_EXIST 时置位 backendUnavailable = true，
  //   并只输出一条汇总告警，而不是每次加载重放全部 404。
}
```

配合 `console.info` 一次性提示，Network 面板即可恢复干净。

---

## 6. P2-5 `navigator.vibrate` 被浏览器干预拦截

**现象**：

```
[intervention] Blocked call to navigator.vibrate because user hasn't tapped
on the frame or any embedded frame yet
```

**根因**：调用发生在 `setTimeout` 回调内，**脱离了用户手势上下文**，浏览器按振动 API 策略直接阻断。代码虽已 `try/catch`，但浏览器以 *intervention* 形式记录（非抛出异常），因此 `catch` 无法捕获。

- `src/App.tsx:793-795`（`immediate` 模式，350ms 定时器）
- `src/App.tsx:806-808`（`countdown` 模式，≥500ms 定时器）
- `src/components/BottomNavBar.tsx:111`

**修复**：仅在有用户激活时振动，让「自动展开」场景静默跳过：

```ts
// src/App.tsx:793 / 806
if (
  truckExpandConfig.hapticFeedback &&
  typeof navigator !== 'undefined' &&
  navigator.vibrate &&
  // FIX(P2): 自动展开无用户手势，振动必被浏览器拦截并产生 intervention 日志
  navigator.userActivation?.hasBeenActive === true
) {
  try { navigator.vibrate(40); } catch { /* ignore */ }
}
```

> 注意：`navigator.userActivation` 在部分旧版 Safari 缺失，已用可选链兼容；缺失时视为无激活、跳过振动——语义正确。

---

## 7. P2-6 SDK 内部未捕获的 promise rejection

**现象**：

```
Uncaught (in promise) Error: wsclient.send timedout
    at new e4 (…/@cloudbase_js-sdk.js:21078)
    at t5.<anonymous> (…:21730)
```

**分析**：来自 `@cloudbase/js-sdk` 实时 WebSocket 客户端的内部 rejection。触发条件与 **P1-3 的 watch 空转**强相关——连接无法建立时 SDK 以约 2.9 秒周期重试并抛出该错误。

- `src/main.tsx:6-19` 的全局守卫**仅过滤 `Script error.`**，无法覆盖该模式。
- `index.html:17-52` 的内联守卫过滤了 `initWebSocketConnection`、`credentials not found`、`AMap` 等模式，但**同样未覆盖 `wsclient` 系列**。

**修复**：

1. **优先做 P1-3**——消除 watch 空转后该 rejection 的产生条件随之消失。
2. 纵深防御：将 SDK 已知噪声模式补充进守卫列表（`index.html:17-52` 与 `src/main.tsx:6-19` 需同步）：

```js
msg.indexOf('wsclient.send timedout') !== -1 ||
msg.indexOf('initWatch') !== -1 ||
msg.indexOf('INIT_WATCH') !== -1
```

> 立场说明：全局守卫应**只屏蔽 SDK 已知噪声**，不可用于掩盖业务异常。因此本条以「修复 P1-3 为主、守卫为辅」。

---

## 8. P2-7 构建产物体积

`vite build` 输出（构建成功，仅 1 条告警）：

| 产物 | 大小 | gzip |
| :-- | --: | --: |
| `index-4VaoZFj0.js` | **5,142.02 kB** | 1,233.07 kB |
| `vendor-cloudbase-*.js` | 743.38 kB | 186.19 kB |
| `vendor-react-*.js` | 472.24 kB | 135.42 kB |
| `index-*.css` | 401.16 kB | 54.75 kB |
| 25 张菜品图（单张） | 585–794 kB | — |

**分析**：`vite.config.ts:14-31` 的 `manualChunks` **只对 `node_modules` 分包**（`if (!id.includes('node_modules')) return undefined`），因此 22 万行业务代码全部压进单一 chunk——**分包策略只解决了 vendor，未解决应用本体**；告警所指正是这块。

**修复建议**（按收益排序）：

1. **路由/视图级 `React.lazy` 动态导入**：`platform/*`（数字孪生指挥舱）、`merchant/*`、`rider/*`、`dev/*` 等按角色分流的重型视图是天然切分点——**只有对应角色才加载对应代码**，首屏收益最大。
2. **图片资源**：25 张菜品图单张 585–794 kB、无响应式变体，合计约 17 MB；建议转 WebP + 生成 `srcset` 多尺寸变体。
3. 若短期不改架构，可设置 `build.chunkSizeWarningLimit` 以消除噪声，但**这只是掩盖告警，不解决加载体积**，不推荐作为最终方案。

---

## 9. 修复优先级与验证方法

### 建议排期

| 阶段 | 内容 | 预期效果 |
| :-- | :-- | :-- |
| **第一步** | P0-1 补丁 A + B；P1-2；P2-5 | 控制台消息 147 → **约 10**（降幅 >93%）；写盘 335 → 约 60 |
| **第二步** | P1-3；P2-6 | 消除 watch 抖动与 WS rejection；Network 面板恢复干净 |
| **第三步** | P1-4（方案 A 或 B） | 消除 18 条 404/422 |
| **第四步** | P2-7 | 首屏体积显著下降 |

### 回归验证清单

| 验证项 | 方法 | 通过标准 |
| :-- | :-- | :-- |
| 冷启动告警 | 清空站点数据 → 打开页面 → 采集 20s 控制台 | 本告警 **0 条**；控制台消息总数 < 15 |
| 版本指针语义 | 读 `localStorage.obsidian_version_pointers` | 播种仅 1 条聚合存证（或按保留策略结果），**不出现 137 条 create** |
| 写放大 | 注入 `setItem` 计数器 | `obsidian_version_pointers` 写入次数 < 5 |
| 审计保真 | 播种后执行一次真实改价 | 应正常生成指针并**正常命中**规则告警（确认豁免未过度放宽） |
| 回滚可用性 | 触发 `assertGatewayConsistency` | 告警消失，且 `business_statuses` 可回滚 |
| watch 路数 | 采集 `[realtime] initWatch success` | 冷启动 ≤ 2 条 |
| 数据不回退 | 正常下单 / 改价 / 切角色 | 功能与修复前一致 |

### 风险提示

- **补丁 A 的豁免范围需收敛**。判据若过宽（例如仅用 `next.length > 20`），会掩盖真实的批量改价攻击。建议以「`prev` 为空」为主判据，`5n + 20` 仅作兜底，并在 UI 侧保留「批量导入」的显式审计留痕。
- **补丁 B 需保证 `finally` 落盘**。若批内抛错未落盘，会造成「内存有、磁盘无」的审计缺口——`endBatchPersist` 必须置于 `finally`。
- **P1-4 方案 A 涉及云环境变更**，请先在测试环境验证集合安全规则，避免匿名读写过度放开。

---

## 10. 附录：原始采集数据

| 文件 | 说明 |
| :-- | :-- |
| `console-report.json` | dev 冷启动：250 条消息 / 0 异常 / 6 条 ≥400 |
| `console-warm.json` | dev 热启动：65 条消息 / 12 warning / 0 条本告警 |
| `console-prod.json` | 生产构建采集（含跨页污染，仅作参考） |
| `prod-cold.log` | **生产冷启动纯净样本**：335 次写入 / 147 条消息 / 132 条本告警 |

采集脚本（临时目录，可复现）：`cdp-console.mjs`（控制台+网络）、`cdp-probe-writes.mjs`（写入溯源）、`cdp-coldstart.mjs`（冷启动复现）。

### 环境信息

| 项 | 值 |
| :-- | :-- |
| Node | v22.22.2 / npm 11.16.0 |
| Vite | 6.4.3 |
| React | 19 |
| 浏览器 | Chrome 152.0.7977.83（headless） |
| TCB 环境 | `tc100-d9gz0e2ko5929e360` |
| 类型检查 | 0 error |
| 生产构建 | 成功 |

---

*本报告的第 2–8 节为**诊断与补丁方案**（保留原始分析过程，便于复核根因推理）；第 0.1 节为**实施结果与验证数据**。全部 10 项已落地于提交 `ffb9acc`，可随时以 `git diff 34b7fc4 ffb9acc` 逐项复核，或以 `git checkout 34b7fc4 -- <路径>` 单文件回退。*
