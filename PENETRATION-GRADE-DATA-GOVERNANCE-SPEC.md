# 渗透级数据治理规范：颗粒精准修复回滚 + 监测修复

- 版本：v1.0
- 日期：2026-09-11
- 适用范围：`src/utils/versionPointerEngine.ts`、`src/utils/safeStorage.ts`、`src/utils/businessTransactionEngine.ts`、`src/utils/merchantBackupEngine.ts`、`src/components/merchant/MerchantDataFallbackCenter.tsx`、`src/components/merchant/MerchantVersionTrackingView.tsx`
- 目标读者：本项目前端/全栈工程师

---

## 0. 术语定义（先对齐可验收含义）

| 需求词 | 可验收的技术含义 | 判定标准 |
|---|---|---|
| **渗透级** | 记录能力覆盖全部持久化写入路径，不依赖人工埋点；任意业务模块新增数据后自动获得版本记录 | 覆盖率 = 已生成指针的写入点 / 全部写入点，须为 100% |
| **颗粒精准** | 回滚的最小单位是单字段（Field），而非整实体；且回滚不破坏该版本之后产生的合法变更 | 单字段回滚成功率 100%；并发冲突检测率 100% |
| **监测修复** | 异常由规则引擎实时判定（非硬编码），并按分级策略自动处置 | 真实操作可触发告警；自动修复动作可审计、可撤销 |
| **防篡改** | 哈希可复现、可验签、成链；篡改任一条记录会被检测出 | 存在可执行的 `verifyChain()`，且 UI 显示真实校验结果 |

> 重要前提：本方案仅在前端 localStorage 模型内做到"内部一致性"。**真正意义上的防篡改必须服务端锚定**，详见第 6 节。

---

## 1. 现状能力审计

### 1.1 缺口总览

| # | 缺口 | 严重度 | 类别 |
|---|---|---|---|
| G1 | 版本记录覆盖面严重不足（29 处调用点、集中于 4 个组件） | 高 | 渗透性 |
| G2 | 记录的 15 个模块中仅 6 个可回滚 | 高 | 精准性 |
| G3 | `rollbackSingleField` 对未支持模块**静默返回成功并写入伪存证** | **致命** | 正确性 |
| G4 | 回滚前无基线一致性校验，会无提示覆盖中间合法变更 | **致命** | 正确性 |
| G5 | 完整性哈希非 SHA-256 且不可复现，全项目无校验函数 | **致命** | 可信性 |
| G6 | `isSuspectedMistake` / `riskLevel` / `mistakeReason` 从未被计算 | 高 | 监测性 |
| G7 | 存储上限 60 条且 index>25 执行"脱水"，永久破坏旧版本回滚能力 | 高 | 可用性 |

### 1.2 逐项证据

**G1 — 覆盖面**
`recordDataMutation` 全项目调用 29 处（含定义处），分布：
- `components/merchant/MaterialView.tsx` 10
- `utils/versionPointerEngine.ts` 5（内部自调用）
- `utils/businessTransactionEngine.ts` 4
- `components/merchant/MerchantSystemView.tsx` 4
- `components/merchant/MerchantCouponsView.tsx` 4
- `components/merchant/MerchantVersionTrackingView.tsx` 2

`MODULE_NAME_MAP` 声明 15 个模块，而 `orders` / `calling_queue` / `kds` / `staff` / `payments` / `stall_gps` / `craft_standards` 在业务侧基本无写入点。当前是**抽样记录**，非渗透。

**G2 — 回滚分支覆盖**
`rollbackPointer()` 仅实现 6 个分支：
```
module === 'dishes' | 'materials' | 'coupons' | 'marketing' | 'delivery' | 'tables'
```
其余模块 `restoredSuccessfully` 保持 `false`，最终返回 `未能正确应用回滚快照`。用户可见"有历史记录，但点回滚必失败"。

**G3 — 静默失败（最高优先级）**
`rollbackSingleField()` 的实体写入部分只有 3 个 `if / else if` 分支（dishes / materials / coupons），**没有 else 兜底、没有 `success` 标记位**。对于 `marketing` / `delivery` / `tables` 等模块：
1. 不修改任何数据；
2. 仍然执行 `recordDataMutation({ actionType: 'rollback', ... })` 写入一条"🔧 精准单字段修复"存证；
3. 返回 `{ success: true }`。

结果：UI 提示修复成功、审计链留下"已修复"记录，而数据**从未被修改**。这是审计可信度的根本性破坏。

**G4 — 无并发基线校验**
`rollbackPointer()` 与 `rollbackSingleField()` 均直接读当前数据并覆盖，未校验"当前值是否仍等于该指针的 `afterSnapshot`"。恢复采用浅合并：
```ts
updated = currentDishes.map((d) => (d.id === entityId ? { ...d, ...beforeSnapshot } : d));
```
若该实体在指针记录之后经历了 N 次合法修改，这些修改会被静默抹除，且审计链不会留下"被覆盖"的提示。

**G5 — 伪哈希**
```ts
function generateHash(dataStr: string): string {
  let hash = 0;
  for (...) { hash = (hash << 5) - hash + char; hash |= 0; }   // 32 位 djb2 变体
  return `sha256_${hex}${Date.now().toString(16).slice(-6)}`;  // 拼接时间戳 → 不可复现
}
```
问题：
1. 不是 SHA-256，是 32 位整数哈希，碰撞概率极高；
2. 拼接 `Date.now()` 使**同一份数据两次计算结果不同**，无法验签；
3. 全项目不存在任何 `verifyHash` / `verifyChain` 函数（已 grep 确认）；
4. `MerchantVersionTrackingView.tsx:749` 却硬编码渲染 `· 校验通过`。

**G6 — 监测数据源是假的**
`isSuspectedMistake` / `riskLevel` / `mistakeReason` 在 `recordDataMutation()` 构造 `newPointer` 时**完全没有赋值**。全项目仅出现在：
- `types/versionTracking.ts`（类型声明）
- `versionPointerEngine.ts` 的 `INITIAL_VERSION_POINTERS` 等 mock 常量
- 消费端筛选/渲染逻辑

因此"疑似误操作报警 N 处""风控拦截原因：xxx""疑似员工误操作"标签**全部来自硬编码演示数据**，真实操作永远为 `undefined` → 筛选条件 `onlyMistakes` 会让真实记录全部被过滤掉。

`automatedSentinelEngine.ts` 已具备五维遥测与熔断能力，但维度是「业务运行时」（后厨负载 / 网络 / 硬件 / GPS 围栏 / 退款率），与数据版本治理未打通。

**G7 — 存储治理与回滚能力冲突**
```ts
const pruned = pointers.slice(0, 60).map((ptr, idx) => {
  if (idx > 25 && ptr.beforeSnapshot && typeof ptr.beforeSnapshot === 'object') {
    return { ...ptr, beforeSnapshot: { summary: ..., entityId: ... },
             afterSnapshot:  { summary: ..., entityId: ... } };   // 快照被"脱水"
  }
  return ptr;
});
```
第 26 条之后的指针永久丧失回滚能力，但 UI 仍显示"一键恢复此版本"按钮。另外 `safeSetStorage()` 返回 `boolean`，而**全部调用点都忽略返回值**，配额超限时静默丢数据。无 schema 版本号、无迁移策略。

### 1.3 附：审计链字段未落库

`VersionPointer` 声明了 `revertedAt` / `revertedBy`，`status` 声明了第三个枚举值 `'superseded'`，但：
- `rollbackPointer()` 只写 `status: 'reverted'`，从不写 `revertedAt` / `revertedBy`；
- `'superseded'` 在全项目中从未被赋值。

导致无法直接查询"这条记录何时、被谁回滚"。回滚关系只能靠新指针的 `rollbackSourcePointerId` 反向推断。

---

## 2. 目标架构（五层）

```
┌─────────────────────────────────────────────────────────┐
│ L5 可信层   真 SHA-256 + 链式哈希 + verifyChain()        │
├─────────────────────────────────────────────────────────┤
│ L4 监测层   规则引擎 + 行为基线 + 分级自动修复           │
├─────────────────────────────────────────────────────────┤
│ L3 精准层   JSON Patch 逆向补丁 + 乐观并发校验           │
├─────────────────────────────────────────────────────────┤
│ L2 事务层   业务操作聚合（一次操作 = 一条指针）           │
├─────────────────────────────────────────────────────────┤
│ L1 渗透层   写入网关：所有持久化写入自动产生指针          │
└─────────────────────────────────────────────────────────┘
```

### L1 渗透层 —— 从"手工埋点"改为"写入网关"

关键洞察：`safeStorage.ts` 已经是**全部持久化的唯一出口**。不要继续在业务代码里加埋点，而是在出口处自动拦截。

```ts
// src/utils/governedStorage.ts（新增）
import { safeGetStorage, safeSetStorage } from './safeStorage';
import { globalVersionEngine } from './versionPointerEngine';

const KEY_MODULE_MAP: Record<string, { module: VersionModuleType; collection: string }> = {
  obsidian_truck_dishes:      { module: 'dishes',    collection: 'dish' },
  obsidian_truck_materials:   { module: 'materials', collection: 'material' },
  obsidian_merchant_coupons:  { module: 'coupons',   collection: 'coupon' },
  obsidian_merchant_tables:   { module: 'tables',    collection: 'table' },
  obsidian_staff_members:     { module: 'staff',     collection: 'staff' },
  obsidian_delivery_settings: { module: 'delivery',  collection: 'settings' },
  obsidian_activity_rules:    { module: 'marketing', collection: 'rule' },
  // ... 补齐至 100%
};

// 上一版缓存，用于自动 diff
const lastValueRegistry = new Map<string, unknown>();

/** 所有业务写入统一走这里，自动产生版本指针 */
export function governedWrite<T>(key: string, next: T): boolean {
  const mapping = KEY_MODULE_MAP[key];
  const prev = lastValueRegistry.get(key) ?? safeGetStorage<T>(key, null as unknown as T);

  const ok = safeSetStorage(key, next);
  if (!ok) {
    // 写入失败本身是一条高危事件，不可静默
    globalVersionEngine.recordGovernanceFailure({ key, reason: 'quota_exceeded' });
    return false;
  }
  if (!mapping) return true;

  const patches = buildReversePatches(prev, next);          // 见 L3
  enqueueToTransaction({ key, mapping, patches, prev, next }); // 见 L2
  lastValueRegistry.set(key, next);
  return true;
}
```

同时把 `safeStorage.safeSetStorage` 收敛为**私有**，业务侧只能引用 `governedWrite`，用 lint 规则（`no-restricted-imports`）强制。

### L2 事务层 —— 一次业务操作 = 一条指针

现状：一次折扣发放可能同时改 `obsidian_merchant_coupons` + `obsidian_activity_rules`，会生成两条互不关联的指针，回滚只能回一半。

```ts
let txContext: { id: string; entries: TxEntry[] } | null = null;
let flushTimer: number | null = null;

export function withTransaction<T>(label: string, fn: () => T): T {
  const isRoot = txContext === null;
  if (isRoot) txContext = { id: `tx_${Date.now()}`, entries: [] };
  try {
    return fn();
  } finally {
    if (isRoot) {
      const ctx = txContext!;
      txContext = null;
      // 微任务合并：同一事件循环内的多次写入折叠为一条指针
      flushTimer = window.setTimeout(() => commitTransaction(ctx, label), 0);
    }
  }
}
```

`commitTransaction` 把同一事务内多个 key 的补丁合并为一条 `VersionPointer`，`patches` 按 `targetKey` 分组。回滚时按组同时逆向应用，实现**跨模块原子回滚**。

### L3 精准层 —— JSON Patch 取代整体覆盖

**核心改造**：`FieldDiff` 从"给人看的展示"升级为"可执行的补丁"。

```ts
export interface FieldPatch {
  targetKey: string;        // 持久化键，如 obsidian_truck_dishes
  entityId: string;         // 集合内实体 id
  path: string;             // RFC 6902 指针，如 /price 或 /variants/0/price
  op: 'replace' | 'add' | 'remove';
  value: unknown;           // 逆向恢复所需的值（= 旧值）
  expectedCurrent: unknown; // 乐观并发校验基准（= 新值）
  fieldLabel: string;
}
```

三点收益：
1. **字段级精准**：回滚 = 应用 `path` 补丁，不再整实体覆盖；
2. **摆脱完整快照**：不需要 `beforeSnapshot` 全对象 → 直接解决 G7 的"脱水导致不可回滚"；
3. **可做并发校验**：回滚前逐条比对 `expectedCurrent === 当前实际值`。

```ts
public rollbackPatched(pointerId: string, onlyPaths?: string[]): RollbackResult {
  const pointer = this.findPointer(pointerId);
  const patches = pointer.patches.filter(p => !onlyPaths || onlyPaths.includes(p.path));

  // 阶段一：预检（只读，不写）
  const conflicts: Conflict[] = [];
  for (const patch of patches) {
    const actual = readPath(patch.targetKey, patch.entityId, patch.path);
    if (!deepEqual(actual, patch.expectedCurrent)) {
      conflicts.push({ patch, actual, expected: patch.expectedCurrent });
    }
  }
  if (conflicts.length > 0) {
    return { success: false, reason: 'CONFLICT', conflicts };
    // UI 需提示：该实体在指针对应版本之后已被修改 N 次，请选择「强制覆盖」或「仅合并无冲突字段」
  }

  // 阶段二：应用（写入），任一失败则整体回滚本次回滚
  const applied: FieldPatch[] = [];
  try {
    for (const patch of patches) {
      writePath(patch.targetKey, patch.entityId, patch.path, patch.value);
      applied.push(patch);
    }
  } catch (e) {
    for (const p of applied.reverse()) {
      writePath(p.targetKey, p.entityId, p.path, p.expectedCurrent); // 补偿还原
    }
    return { success: false, reason: 'APPLY_FAILED' };
  }
  return { success: true, appliedCount: applied.length };
}
```

**强制要求**：所有未实现的分支必须返回显式失败，禁止出现"走完流程但没改数据"的路径。建议在函数出口加断言：

```ts
if (applied.length === 0 && patches.length > 0) {
  throw new Error(`[FATAL] 回滚未应用任何补丁，疑似分支未实现: ${pointer.module}`);
}
```

### L4 监测层 —— 规则引擎 + 分级自动修复

**规则用声明式配置，不写进业务逻辑：**

```ts
export interface GovernanceRule {
  id: string;
  label: string;
  scope: { modules?: VersionModuleType[]; actionTypes?: VersionActionType[] };
  severity: 'low' | 'sensitive' | 'high_risk';
  predicate: (ctx: RuleContext) => string | null;  // 返回 null = 未命中；返回字符串 = 命中原因
  action: 'notify' | 'quarantine' | 'auto_revert';
  enabled: boolean;
}
```

规则清单（建议首批 8 条）：

| 规则 ID | 判定条件 | 严重度 | 动作 |
|---|---|---|---|
| `R-DISCOUNT-ABNORMAL` | 单笔折扣率 > 门店近 30 天 P95 | high_risk | notify |
| `R-OFFHOURS-VOID` | 非营业时段作废订单/工单 | high_risk | quarantine |
| `R-RAPID-PRICING` | 同一操作员 10 分钟内改价 ≥ 3 次 | sensitive | notify |
| `R-PRICE-JUMP` | 单价变动幅度 > 50% | high_risk | notify |
| `R-STOCK-ZERO` | 库存被改为 0 或负数 | high_risk | quarantine |
| `R-RBAC-BYPASS` | 模块与操作员角色不匹配（如后厨账号操作 `calling_queue`） | high_risk | notify + 通报 |
| `R-BULK-DELETE` | 单次删除实体数 > 10 | high_risk | quarantine |
| `R-FORCE-CLEAN-OFFHOURS` | 非营业时段强制清台 | sensitive | auto_revert |

**接入点**：在 `recordDataMutation()` 生成指针后立即求值。

```ts
const ruleHits = governanceRuleEngine.evaluate({ pointer: newPointer, history: existingPointers });
if (ruleHits.length > 0) {
  newPointer.riskLevel = highestSeverity(ruleHits);
  newPointer.isSuspectedMistake = ruleHits.some(h => h.severity === 'high_risk');
  newPointer.mistakeReason = ruleHits.map(h => h.reason).join('；');
  applyRuleActions(ruleHits, newPointer);   // notify / quarantine / auto_revert
}
```

**行为基线**（降低误报）：纯阈值规则在餐车这种小样本场景误报率高。建议按 `操作员 × 模块 × 时段` 维护滚动统计，用 P95 分位数判定，样本量 < 30 时降级为硬阈值并标注"基线样本不足"。

**自动修复分级与约束**：
- `notify`：仅记录 + 推送，无副作用；
- `quarantine`：把指针标 `high_risk`，**锁定该实体**（`governedWrite` 对该 `entityId` 返回失败并提示待复核），不做数据变更；
- `auto_revert`：**仅白名单规则可开启**，且必须满足三个条件：① 回滚前自动生成应急快照（参考 `merchantBackupEngine.rollbackToSnapshot()` 已有的正确做法）；② 记录独立审计条目；③ 提供一键撤销入口。

**与哨兵打通**：把"数据版本异常"作为第六感知维度注入 `automatedSentinelEngine`，通过 `reactiveSyncBus` 与现有 `threatLevel` 联动，避免两套告警体系并行。

### L5 可信层 —— 真实密码学存证

```ts
// src/utils/integrityChain.ts（新增）
async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/** 规范化序列化：键排序，消除顺序歧义 */
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const keys = Object.keys(value as object).sort();
  return `{${keys.map(k => `${JSON.stringify(k)}:${canonicalize((value as any)[k])}`).join(',')}}`;
}

const GENESIS = '0'.repeat(64);

/** 只在持久化成功后计算并写入链哈希 */
export async function buildChainNode(
  prevChainHash: string,
  pointer: VersionPointer
): Promise<{ payloadHash: string; chainHash: string }> {
  const payloadHash = await sha256Hex(canonicalize({
    pointerId: pointer.pointerId,
    operatorId: pointer.operator.id,
    module: pointer.module,
    entityId: pointer.entityId,
    actionType: pointer.actionType,
    patches: pointer.patches,
    timestamp: pointer.timestamp
  }));
  const chainHash = await sha256Hex(`${prevChainHash}:${payloadHash}`);
  return { payloadHash, chainHash };
}

/** 真实校验：任一条被改动 → 断链并定位 */
export async function verifyChain(pointers: VersionPointer[]): Promise<ChainVerifyReport> {
  const ordered = [...pointers].reverse();  // 存储为倒序，链按正序
  let prev = GENESIS;
  const broken: string[] = [];
  for (const p of ordered) {
    const { chainHash } = await buildChainNode(prev, p);
    if (p.chainHash !== chainHash) broken.push(p.pointerId);
    prev = p.chainHash ?? GENESIS;
  }
  return { valid: broken.length === 0, brokenPointerIds: broken, checkedCount: ordered.length };
}
```

硬性要求：
1. `Date.now()` **不得**参与哈希输入 —— 哈希必须可复现；
2. UI 中"校验通过"文案必须由 `verifyChain()` 的真实结果驱动，禁止硬编码；
3. 哈希计算是异步的，需同步调整 `recordDataMutation` 为 async 或在写入后异步补算（推荐后者：先写入 `chainHash: null`，再异步补齐并派发事件）。

### 补充：审计链字段补齐

`rollbackPointer` / `rollbackPatched` 必须写入：
```ts
{ ...p, status: 'reverted', revertedAt: new Date().toISOString(), revertedBy: operator.name }
```
并新增查询能力：`getRollbackHistory(entityId)`、`getEntityTimeline(entityId)`。
`'superseded'` 语义建议启用：当实体在软删除后又被重建时，旧指针标记为 `superseded`。

### 补充：存储治理

1. **schema 版本化**：`obsidian_version_pointers_meta = { schemaVersion: 2, migratedAt }`，读写入口做迁移分支；
2. **返回值必须处理**：`governedWrite` 失败时降级到 IndexedDB，并把失败事件本身作为 `high_risk` 记录；
3. **容量策略**：补丁化后单条指针体积下降约 1-2 个数量级，保留上限可从 60 提升至 3000+；超限时**按模块分层保留**（`system` / `staff` / `payments` 永久保留；`dishes` / `materials` 滚动保留），**禁止统一"脱水"**；
4. **中期迁移 IndexedDB**：localStorage 5-10 MB 是硬上限，无法支撑"渗透级"的记录量。

---

## 3. 落地路线图

| 阶段 | 内容 | 交付物 | 验收标准 |
|---|---|---|---|
| **P0-a** | 修复 G3 静默失败、G4 无并发校验、G5 返回值忽略 | 补丁 | 未支持模块回滚返回显式失败；并发冲突可复现并被拒绝；配额失败可见 |
| **P0-b** | 接入规则引擎，让 G6 的判定字段真正被计算 | `governanceRuleEngine.ts` + 8 条规则 | 真实操作可触发告警；mock 数据可移除 |
| **P0-c** | 真 SHA-256 + 链式哈希 + `verifyChain()` | `integrityChain.ts` | 篡改任一条记录后 `verifyChain()` 返回 `valid: false` 并定位该条 |
| **P1-a** | L1 写入网关 + L2 事务聚合 | `governedStorage.ts` | 覆盖率 100%；批量操作折叠为单条指针 |
| **P1-b** | 补齐 15 个模块的回滚分支 | 补丁 | 任意模块"有记录即可回滚"，无死角 |
| **P2-a** | L3 JSON Patch 化改造 + 单字段回滚全覆盖 | `patchEngine.ts` | 任意模块任意字段可单独回滚；保留上限 ≥ 3000 |
| **P2-b** | 存储迁移 IndexedDB + 分层保留策略 | 迁移脚本 | 无 schema 报错；旧数据可读 |
| **P3** | 与 `automatedSentinelEngine` 打通第六维度 | 集成 | 数据异常与业务威胁共用同一 `threatLevel` |

**建议先做 P0-a**：三处正确性缺陷不修，后续所有"渗透/精准/监测"建设都建立在不可信的数据之上。

---

## 4. 关键风险

| 风险 | 说明 | 缓解 |
|---|---|---|
| **客户端可信模型** | 纯前端 localStorage 架构下，任何用户可开 DevTools 直接改数据与哈希链，前端无法自证清白 | 必须把 `chainHash` 链尾定期锚定到服务端（项目已接入 CloudBase）。前端只做"快速检测"，服务端锚点做"最终裁决" |
| **自动回滚误伤** | 规则误判会导致合法数据被自动覆盖 | 默认全部 `notify`；`auto_revert` 需白名单 + 回滚前快照 + 可撤销 |
| **小样本误报** | 餐车单店样本量小，P95 基线不稳定 | 样本 < 30 时降级硬阈值并显式标注 |
| **异步哈希的时序** | `crypto.subtle` 是异步，可能破坏现有同步写入流程 | 采用"先写入、后补算"两阶段，UI 对 `chainHash: null` 显示"存证中" |
| **三套备份体系并存** | `globalVersionEngine` / `merchantBackupEngine` / 组件内手工快照 三条独立链路 | 统一收敛到 `governedStorage` + `globalVersionEngine`，`merchantBackupEngine` 保留营收报表调整的领域逻辑，但快照存储改为委托 |

---

## 5. 接口草案（供评审）

```ts
// 业务写入（唯一入口）
governedWrite<T>(key: string, next: T): boolean
withTransaction<T>(label: string, fn: () => T): T

// 查询
getEntityTimeline(entityId: string): VersionPointer[]
getRollbackHistory(entityId: string): RollbackRecord[]
previewRollback(pointerId: string): { patches: FieldPatch[]; conflicts: Conflict[] }

// 回滚
rollbackPatched(pointerId: string, onlyPaths?: string[]): RollbackResult
rollbackSingleField(pointerId: string, fieldKey: string): RollbackResult  // 语义不变，实现改为补丁应用

// 监测
evaluateRules(pointer: VersionPointer): RuleHit[]
setRuleEnabled(ruleId: string, enabled: boolean): void

// 可信
verifyChain(pointers: VersionPointer[]): Promise<ChainVerifyReport>
anchorChainToServer(): Promise<{ anchorId: string }>
```

---

## 6. 结论

当前实现具备良好的**产品形态**（两个视角中枢、指针模型、快照里程碑、回滚存证链），但底层能力与"渗透级"要求存在结构性差距：

1. **渗透性**：记录是抽样埋点（G1），不是全覆盖；
2. **精准性**：回滚最小单位是整实体（G2/G3），且会静默失败；
3. **监测性**：风险判定字段从未计算（G6），UI 报警全是演示数据；
4. **可信性**：哈希不可复现且无校验（G5），"防篡改"目前不成立；
5. **可靠性**：回滚无并发保护（G4），存储上限破坏历史可回滚性（G7）。

按第 3 节路线图推进，可在保持现有 UI 与产品形态不变的前提下，把底座升级为可验收的版本治理系统。
