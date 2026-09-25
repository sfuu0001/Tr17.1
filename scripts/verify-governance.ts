/**
 * 数据治理全链路回归守护
 * 运行：./node_modules/.bin/tsx scripts/verify-governance.ts
 *
 * 覆盖 P0-a / P0-b / P0-c / P1-a / P1-b / P2-a / P2-b 七个阶段的验收不变式。
 * 每项断言都直接调用生产代码、检查落盘数据与存证条数，不做任何 mock 打桩。
 */

// -------------------------------------------------------------
// 环境打桩（静态 import 会早于桩赋值执行，故必须用动态 import）
// -------------------------------------------------------------

const store = new Map<string, string>();
let refuseWrites = false;

const localStorageStub = {
  get length() {
    return store.size;
  },
  key: (i: number) => Array.from(store.keys())[i] ?? null,
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => {
    if (refuseWrites) throw new Error('QuotaExceededError');
    store.set(k, v);
  },
  removeItem: (k: string) => {
    store.delete(k);
  },
  clear: () => store.clear()
};

const windowStub: any = {
  localStorage: localStorageStub,
  indexedDB: undefined,
  dispatchEvent: () => true,
  addEventListener: () => undefined,
  removeEventListener: () => undefined
};

(globalThis as any).window = windowStub;
(globalThis as any).localStorage = localStorageStub;

if (!(globalThis as any).crypto?.subtle) {
  const nodeCrypto = await import('node:crypto');
  (globalThis as any).crypto = (nodeCrypto as any).webcrypto;
}

// -------------------------------------------------------------
// 生产模块
// -------------------------------------------------------------

const { globalVersionEngine } = await import('../src/utils/versionPointerEngine.ts');
const { governedWrite, withTransaction, describeCoverage, resetGovernanceCaches, isGovernedKey } =
  await import('../src/utils/governedStorage.ts');
const { describeCoverage: describeRollback, ENTITY_SCOPE_REGISTRY, ALL_MODULES } =
  await import('../src/utils/rollbackGuard.ts');
const { applyRetentionPolicy, retentionTierOf } = await import('../src/utils/persistentStore.ts');
const { sha256Hex, canonicalize, verifyChain } = await import('../src/utils/integrityChain.ts');
const { diffToPatches, getByPointer } = await import('../src/utils/patchEngine.ts');
const { evaluateRules, getQuarantineEntries } = await import('../src/utils/governanceRuleEngine.ts');
const { DEFAULT_MERCHANT_OPERATORS } = await import('../src/utils/versionPointerEngine.ts');

// -------------------------------------------------------------
// 断言工具
// -------------------------------------------------------------

const results: Array<{ group: string; name: string; pass: boolean; detail: string }> = [];
let group = '';
const section = (g: string) => {
  group = g;
};
const check = (name: string, pass: boolean, detail = '') => {
  results.push({ group, name, pass, detail });
};

const seat = (module: any, entityId = 'x') => {
  globalVersionEngine.setActiveOperator(module);
  void entityId;
};

// -------------------------------------------------------------
// 夹具
// -------------------------------------------------------------

function clearAll() {
  store.clear();
  resetGovernanceCaches();
  store.set('obsidian_version_pointers', '[]');
  store.set('obsidian_governance_quarantine', '[]');
}

function dishes(price: number) {
  store.set(
    'obsidian_truck_dishes',
    JSON.stringify([{ id: 'dish-1', name: '炭烤牛肉串', price }])
  );
}

const readJson = (key: string, fallback: any) => {
  const raw = store.get(key);
  return raw ? JSON.parse(raw) : fallback;
};
const priceOf = () => readJson('obsidian_truck_dishes', [])[0]?.price;
const pointerCount = () => globalVersionEngine.getAllPointers().length;
const lastPointer = () => globalVersionEngine.getAllPointers()[0];

const asOperator = (index: number) =>
  globalVersionEngine.setActiveOperator(DEFAULT_MERCHANT_OPERATORS[index]);

/** 记录一条 dishes 调价指针，返回指针对象 */
function recordPriceChange(from: number, to: number) {
  return globalVersionEngine.recordDataMutation({
    module: 'dishes',
    entityId: 'dish-1',
    entityName: '炭烤牛肉串',
    actionType: 'update',
    beforeData: { id: 'dish-1', name: '炭烤牛肉串', price: from },
    afterData: { id: 'dish-1', name: '炭烤牛肉串', price: to }
  });
}

// =============================================================
// P0-a 正确性缺陷
// =============================================================
section('P0-a 正确性');

// 1. 未支持回滚的模块（快照管理型）必须显式失败且不落存证
{
  clearAll();
  const p = globalVersionEngine.recordDataMutation({
    module: 'system',
    entityId: 'snap-x',
    entityName: '某快照记录',
    actionType: 'update',
    beforeData: { title: 'A' },
    afterData: { title: 'B' }
  });
  const before = pointerCount();
  const res = globalVersionEngine.rollbackSingleField(p.pointerId, 'title');
  check(
    'G3 快照管理型模块的单字段修复返回 UNSUPPORTED',
    res.success === false && res.reason === 'UNSUPPORTED',
    `success=${res.success} reason=${res.reason}`
  );
  check('G3 失败时不写入虚假修复存证', pointerCount() === before, `指针数 ${before} → ${pointerCount()}`);
}

// 2. fallback 模块（无数据实体）整实体回滚 → UNSUPPORTED
{
  clearAll();
  const p = globalVersionEngine.recordDataMutation({
    module: 'fallback',
    entityId: 'global',
    entityName: '全域兜底',
    actionType: 'update',
    beforeData: { v: 1 },
    afterData: { v: 2 }
  });
  const before = pointerCount();
  const res = globalVersionEngine.rollbackPointer(p.pointerId);
  check(
    'G3 无实体模块的整实体回滚返回 UNSUPPORTED',
    res.success === false && res.reason === 'UNSUPPORTED',
    `success=${res.success} reason=${res.reason}`
  );
  check('G3 整实体回滚失败时不落存证', pointerCount() === before, `指针数 ${before} → ${pointerCount()}`);
}

// 3. 正常路径确实改数据 + 恰好一条存证
{
  clearAll();
  dishes(35);
  const p = recordPriceChange(12, 35);
  const before = pointerCount();
  const res = globalVersionEngine.rollbackSingleField(p.pointerId, 'price');
  check('正常路径：单字段修复成功', res.success === true, res.message);
  check('正常路径：数据确实被改回', priceOf() === 12, `price=${priceOf()}`);
  check('正常路径：恰好写入一条修复存证', pointerCount() === before + 1, `${before} → ${pointerCount()}`);
}

// 4. G4 基线冲突
{
  clearAll();
  dishes(35);
  const p = recordPriceChange(12, 35);
  dishes(99); // 模拟指针之后又发生合法修改
  const before = pointerCount();
  const res = globalVersionEngine.rollbackSingleField(p.pointerId, 'price');
  check(
    'G4 单字段修复在基线不一致时被拒绝',
    res.success === false && res.reason === 'CONFLICT',
    `success=${res.success} reason=${res.reason}`
  );
  check('G4 拒绝后数据零变更', priceOf() === 99, `price=${priceOf()}`);
  check('G4 拒绝后不落存证', pointerCount() === before, `${before} → ${pointerCount()}`);

  const forced = globalVersionEngine.rollbackSingleField(p.pointerId, 'price', { force: true });
  check(
    'G4 强制模式可显式覆盖',
    forced.success === true && priceOf() === 12,
    `success=${forced.success} price=${priceOf()}`
  );
}

// 5. G4 整实体回滚
{
  clearAll();
  dishes(35);
  const p = recordPriceChange(12, 35);
  dishes(99);
  const before = pointerCount();
  const res = globalVersionEngine.rollbackPointer(p.pointerId);
  check(
    'G4 整实体回滚在基线不一致时被拒绝',
    res.success === false && res.reason === 'CONFLICT',
    `success=${res.success} reason=${res.reason}`
  );
  check(
    'G4 整实体回滚拒绝后数据零变更且不落存证',
    priceOf() === 99 && pointerCount() === before,
    `price=${priceOf()} 指针数 ${before} → ${pointerCount()}`
  );
  const forced = globalVersionEngine.rollbackPointer(p.pointerId, { force: true });
  check(
    'G4 整实体强制回滚成功',
    forced.success === true && priceOf() === 12,
    `success=${forced.success} price=${priceOf()}`
  );
}

// 6. G5 持久化失败必须中止
{
  clearAll();
  dishes(35);
  const p = recordPriceChange(12, 35);
  const before = pointerCount();

  refuseWrites = true;
  const res = globalVersionEngine.rollbackPointer(p.pointerId);
  refuseWrites = false;

  check(
    'G5 写入失败时回滚返回 APPLY_FAILED',
    res.success === false && res.reason === 'APPLY_FAILED',
    `success=${res.success} reason=${res.reason}`
  );
  check('G5 写入失败时数据零变更', priceOf() === 35, `price=${priceOf()}`);
  check('G5 写入失败时不落存证', pointerCount() === before, `${before} → ${pointerCount()}`);
}

// 7. 审计链字段补齐
{
  clearAll();
  dishes(35);
  const p = recordPriceChange(12, 35);
  globalVersionEngine.rollbackPointer(p.pointerId, { force: true });
  const updated = globalVersionEngine.getAllPointers().find((x) => x.pointerId === p.pointerId);
  check(
    '审计链补齐 revertedAt / revertedBy',
    updated?.status === 'reverted' && !!updated?.revertedAt && !!updated?.revertedBy,
    `status=${updated?.status} revertedBy=${updated?.revertedBy}`
  );
}

// =============================================================
// P0-b 规则引擎
// =============================================================
section('P0-b 规则引擎');

// 8. 权限越界
{
  clearAll();
  asOperator(4); // 赵强 = 外卖专送领队 (rider)
  const p = globalVersionEngine.recordDataMutation({
    module: 'coupons',
    entityId: 'cp-1',
    entityName: '满100减20券',
    actionType: 'create',
    beforeData: null,
    afterData: { id: 'cp-1', title: '满100减20券', discountValue: 20 }
  });
  check(
    'R-RBAC-BYPASS 命中权限越界操作',
    (p.ruleHits || []).some((h) => h.ruleId === 'R-RBAC-BYPASS'),
    `命中=${(p.ruleHits || []).map((h) => h.ruleId).join('/')}`
  );
  check('越权操作被判定为疑似误操作', p.isSuspectedMistake === true, `riskLevel=${p.riskLevel}`);
}

// 9. 单价异常跳变
{
  clearAll();
  asOperator(0);
  dishes(35);
  const p = recordPriceChange(12, 35);
  check(
    'R-PRICE-JUMP 命中单价跳变（幅度 >50%）',
    (p.ruleHits || []).some((h) => h.ruleId === 'R-PRICE-JUMP'),
    `命中=${(p.ruleHits || []).map((h) => h.ruleId).join('/')}`
  );
  check(
    '风险字段被真实赋值（不再依赖 mock）',
    p.riskLevel === 'high_risk' && !!p.mistakeReason,
    `riskLevel=${p.riskLevel} reason=${p.mistakeReason}`
  );
}

// 10. 库存清零 + 隔离登记
{
  clearAll();
  asOperator(0);
  store.set(
    'obsidian_truck_materials',
    JSON.stringify([{ id: 'mat-1', name: '牛上脑', currentStock: 30 }])
  );
  const p = globalVersionEngine.recordDataMutation({
    module: 'materials',
    entityId: 'mat-1',
    entityName: '牛上脑',
    actionType: 'update',
    beforeData: { id: 'mat-1', name: '牛上脑', currentStock: 30 },
    afterData: { id: 'mat-1', name: '牛上脑', currentStock: 0 }
  });
  check(
    'R-STOCK-ZERO 命中库存归零',
    (p.ruleHits || []).some((h) => h.ruleId === 'R-STOCK-ZERO'),
    `命中=${(p.ruleHits || []).map((h) => h.ruleId).join('/')}`
  );
  check('quarantine 处置已登记隔离区', getQuarantineEntries().length > 0, `隔离条目=${getQuarantineEntries().length}`);
  check('隔离处置等级正确', p.governanceAction === 'quarantine', `action=${p.governanceAction}`);
}

// 11. 正常小额变更不误报
{
  clearAll();
  asOperator(0);
  dishes(13);
  const p = globalVersionEngine.recordDataMutation({
    module: 'dishes',
    entityId: 'dish-1',
    entityName: '炭烤牛肉串',
    actionType: 'update',
    beforeData: { id: 'dish-1', name: '炭烤牛肉串', price: 12 },
    afterData: { id: 'dish-1', name: '炭烤牛肉串', price: 13 }
  });
  check(
    '正常小额变更不产生误报',
    (p.ruleHits || []).length === 0 && p.riskLevel === 'normal',
    `命中=${(p.ruleHits || []).length} riskLevel=${p.riskLevel}`
  );
}

// 12. 规则数语料自述
{
  clearAll();
  const meta = (await import('../src/utils/governanceRuleEngine.ts')).getGovernanceRuleMeta();
  check('规则表已注册 8 条声明式规则', meta.length === 8, `实际=${meta.length}`);
}

// =============================================================
// P0-c 密码学存证
// =============================================================
section('P0-c 存证链');

// 13. 可复现性
{
  clearAll();
  const a = await sha256Hex(canonicalize({ b: 1, a: [1, 2, { z: 'x' }] }));
  const b = await sha256Hex(canonicalize({ a: [1, 2, { z: 'x' }], b: 1 }));
  check('规范化序列化消除键顺序歧义', a === b, `${a.slice(0, 16)} vs ${b.slice(0, 16)}`);
  check('输出为 64 位十六进制 SHA-256', /^[0-9a-f]{64}$/.test(a), `len=${a.length}`);
}

// 14. 链完整性 + 篡改检测
{
  clearAll();
  dishes(20);
  recordPriceChange(20, 21);
  recordPriceChange(21, 22);
  recordPriceChange(22, 23);
  await globalVersionEngine.backfillAllChainProofs();

  const verified = await globalVersionEngine.verifyChain();
  check(
    '未篡改的链校验通过',
    verified.valid === true && verified.checkedCount === 3,
    `valid=${verified.valid} checked=${verified.checkedCount}`
  );
  check(
    '每条记录均产出真实 chainHash',
    globalVersionEngine.getAllPointers().every((p) => !!p.chainProof && p.chainProof.chainHash.length === 64),
    `缺失存证数=${globalVersionEngine.getAllPointers().filter((p) => !p.chainProof).length}`
  );

  // 篡改中间一条记录的身份字段
  const pointers = globalVersionEngine.getAllPointers();
  const victim = pointers[1];
  const tampered = pointers.map((p) =>
    p.pointerId === victim.pointerId ? { ...p, entityName: '被篡改的名称' } : p
  );
  store.set('obsidian_version_pointers', JSON.stringify(tampered));

  const afterTamper = await globalVersionEngine.verifyChain();
  check('篡改后链校验失败', afterTamper.valid === false, `valid=${afterTamper.valid}`);
  check(
    '断链可定位到被篡改的那一条',
    afterTamper.brokenPointerIds.includes(victim.pointerId) &&
      afterTamper.firstBrokenAt?.reason === 'payload_modified',
    `broken=${afterTamper.brokenPointerIds.length} reason=${afterTamper.firstBrokenAt?.reason}`
  );
}

// 15. verifyChain 直接调用（纯函数入口）
{
  clearAll();
  const raw = [
    {
      pointerId: 'p1',
      versionTag: 'v1',
      timestamp: '2026-09-11 10:00:00',
      operator: DEFAULT_MERCHANT_OPERATORS[0],
      module: 'dishes',
      entityId: 'd1',
      entityName: 'D',
      actionType: 'update',
      actionName: '字段修改',
      fieldDiffs: [],
      patches: [],
      beforeSnapshot: null,
      afterSnapshot: null,
      isRevertible: true,
      integrityHash: '',
      status: 'active'
    } as any
  ];
  const emptyReport = await verifyChain(raw);
  check(
    '缺少存证的记录被判定为 missing_proof',
    emptyReport.valid === false && emptyReport.firstBrokenAt?.reason === 'missing_proof',
    `reason=${emptyReport.firstBrokenAt?.reason}`
  );
}

// =============================================================
// P1-a 写入网关
// =============================================================
section('P1-a 写入网关');

// 16. 自动记录
{
  clearAll();
  dishes(10);
  const before = pointerCount();
  const res = governedWrite('obsidian_truck_dishes', [{ id: 'dish-1', name: '炭烤牛肉串', price: 11 }]);
  check(
    'governedWrite 自动生成版本指针',
    res.success === true && res.recorded === true && pointerCount() === before + 1,
    `${before} → ${pointerCount()}`
  );
  const p = lastPointer();
  check(
    '自动记录携带正确模块与补丁',
    p.module === 'dishes' && p.actionType === 'update' && (p.patches || []).length === 1,
    `module=${p.module} patches=${(p.patches || []).length}`
  );
  check(
    '补丁携带乐观并发基准',
    getByPointer({ price: 11 }, p.patches![0].path) === 11 &&
      p.patches![0].expectedCurrent === 11,
    `path=${p.patches![0].path} expected=${p.patches![0].expectedCurrent}`
  );
}

// 17. 事务共享 transactionId
{
  clearAll();
  dishes(10);
  store.set('obsidian_truck_materials', JSON.stringify([{ id: 'mat-1', name: '牛肉', currentStock: 30 }]));
  const before = pointerCount();

  withTransaction('午市批量调价', () => {
    governedWrite('obsidian_truck_dishes', [{ id: 'dish-1', name: '炭烤牛肉串', price: 12 }]);
    governedWrite('obsidian_truck_materials', [{ id: 'mat-1', name: '牛肉', currentStock: 28 }]);
  });

  const created = globalVersionEngine.getAllPointers().filter((p) => p.transactionId);
  const txIds = new Set(created.map((p) => p.transactionId));
  check(
    '事务内多次写入共享同一 transactionId',
    created.length === 2 && txIds.size === 1 && pointerCount() === before + 2,
    `新增=${created.length} 事务数=${txIds.size}`
  );
  check(
    '事务标签被记录以便整体回溯',
    created[0]?.transactionLabel === '午市批量调价',
    `label=${created[0]?.transactionLabel}`
  );
}

// 18. 网关覆盖率
{
  const gw = describeCoverage();
  check(
    '网关覆盖适配表中声明的全部键',
    gw.missingInGateway.length === 0,
    `缺失键=${gw.missingInGateway.join(', ') || '无'}`
  );
  check(
    '有记录必有回滚适配（无孤儿键）',
    gw.governedKeys.every((k) =>
      ALL_MODULES.some((m) => ENTITY_SCOPE_REGISTRY[m].keys.some((d) => d.key === k))
    ),
    `受治键数=${gw.governedKeys.length}`
  );
  check('isGovernedKey 能识别受治键', isGovernedKey('obsidian_truck_orders') === true, '');
}

// =============================================================
// P1-b 全模块覆盖
// =============================================================
section('P1-b 模块覆盖');

// 19. 覆盖率自述
{
  const cov = describeRollback();
  check(
    '15 个模块中仅快照管理型不支持实体回滚',
    cov.unsupported.length === 2 &&
      cov.unsupported.includes('fallback') &&
      cov.unsupported.includes('system'),
    `不支持=${cov.unsupported.join(', ')}`
  );
  check(
    '适配表与模块枚举完全对应（新增模块必须同步登记，否则 tsc 报错）',
    ALL_MODULES.length === Object.keys(ENTITY_SCOPE_REGISTRY).length && ALL_MODULES.length >= 15,
    `模块数=${ALL_MODULES.length}`
  );
}

// 20. 集合型模块 orders 可回滚
{
  clearAll();
  store.set(
    'obsidian_truck_orders',
    JSON.stringify([{ id: 'ord-1', orderNo: 'A1001', status: 'cooking' }])
  );
  const p = globalVersionEngine.recordDataMutation({
    module: 'orders',
    entityId: 'ord-1',
    entityName: '订单 A1001',
    actionType: 'update',
    beforeData: { id: 'ord-1', orderNo: 'A1001', status: 'cooking' },
    afterData: { id: 'ord-1', orderNo: 'A1001', status: 'done' }
  });
  store.set(
    'obsidian_truck_orders',
    JSON.stringify([{ id: 'ord-1', orderNo: 'A1001', status: 'done' }])
  );
  const res = globalVersionEngine.rollbackPointer(p.pointerId);
  const restored = readJson('obsidian_truck_orders', [])[0]?.status;
  check('orders 模块可回滚（原实现必失败）', res.success === true, res.message);
  check('orders 数据确实被还原', restored === 'cooking', `status=${restored}`);
}

// 21. 单例型模块 delivery 可回滚
{
  clearAll();
  store.set('obsidian_delivery_settings', JSON.stringify({ minDeliveryAmount: 25, deliveryFee: 5 }));
  const p = globalVersionEngine.recordDataMutation({
    module: 'delivery',
    entityId: 'delivery-config',
    entityName: '配送配置',
    actionType: 'update',
    beforeData: { minDeliveryAmount: 25, deliveryFee: 5 },
    afterData: { minDeliveryAmount: 20, deliveryFee: 5 }
  });
  store.set('obsidian_delivery_settings', JSON.stringify({ minDeliveryAmount: 20, deliveryFee: 5 }));
  const res = globalVersionEngine.rollbackPointer(p.pointerId);
  const restored = readJson('obsidian_delivery_settings', {}) as any;
  check('delivery 单例模块可回滚', res.success === true, res.message);
  check(
    'delivery 配置确实被还原',
    restored.minDeliveryAmount === 25 && restored.deliveryFee === 5,
    JSON.stringify(restored)
  );
}

// =============================================================
// P2-a JSON Patch
// =============================================================
section('P2-a JSON Patch');

// 22. 递归路径生成
{
  const patches = diffToPatches(
    { id: 'd1', price: 10, tags: ['a', 'b'], nested: { spec: { level: 1 } } },
    { id: 'd1', price: 12, tags: ['a', 'c', 'd'], nested: { spec: { level: 3 } } }
  );
  const paths = patches.map((p) => p.path).sort();
  check(
    '递归生成嵌套路径补丁',
    paths.includes('/price') &&
      paths.includes('/nested/spec/level') &&
      paths.includes('/tags/1') &&
      paths.includes('/tags/2'),
    `paths=${paths.join(' ')}`
  );
}

// 23. 补丁级选择性回滚
{
  clearAll();
  dishes(20);
  const p = globalVersionEngine.recordDataMutation({
    module: 'dishes',
    entityId: 'dish-1',
    entityName: '炭烤牛肉串',
    actionType: 'update',
    beforeData: { id: 'dish-1', name: '炭烤牛肉串', price: 20, available: false },
    afterData: { id: 'dish-1', name: '炭烤牛肉串', price: 30, available: true }
  });
  store.set(
    'obsidian_truck_dishes',
    JSON.stringify([{ id: 'dish-1', name: '炭烤牛肉串', price: 30, available: true }])
  );

  const patchCount = (p.patches || []).length;
  const targeted = globalVersionEngine.rollbackPatches(p.pointerId, ['/price']);
  const entity = readJson('obsidian_truck_dishes', [])[0];
  check('一条记录拆分出多个字段补丁', patchCount === 2, `补丁数=${patchCount}`);
  check(
    '可按路径只回滚指定字段',
    targeted.success === true && entity.price === 20 && entity.available === true,
    `price=${entity.price} available=${entity.available}`
  );
}

// 24. 归档快照后仍保有字段级回滚能力
{
  const archived: any = {
    pointerId: 'rev_archived',
    versionTag: 'v9',
    timestamp: '2026-09-11 10:00:00',
    operator: DEFAULT_MERCHANT_OPERATORS[0],
    module: 'dishes',
    entityId: 'd-arch',
    entityName: '归档菜品',
    actionType: 'update',
    actionName: '字段修改',
    summary: 's',
    fieldDiffs: [],
    patches: [
      {
        targetKey: 'obsidian_truck_dishes',
        entityId: 'd-arch',
        path: '/price',
        op: 'replace',
        value: 10,
        expectedCurrent: 20,
        fieldLabel: '销售价格 (¥)'
      }
    ],
    beforeSnapshot: { summary: 's', entityId: 'd-arch' },
    afterSnapshot: { summary: 's', entityId: 'd-arch' },
    contentArchived: true,
    isRevertible: true,
    integrityHash: '',
    tier: 'rolling',
    status: 'active'
  };
  const plan = applyRetentionPolicy([archived], 3000);
  const kept = plan.kept.find((p) => p.pointerId === 'rev_archived');
  check(
    '归档不会清除补丁（字段级回滚能力得以保留）',
    !!kept && (kept.patches || []).length === 1 && kept.contentArchived === true,
    `patches=${(kept?.patches || []).length} archived=${kept?.contentArchived}`
  );
}

// =============================================================
// P2-b 分层保留
// =============================================================
section('P2-b 分层保留');

// 25. permanent 不被淘汰 + 优先淘汰 rolling
{
  const mk = (id: string, module: any): any => ({
    pointerId: id,
    versionTag: id,
    timestamp: '2026-09-11 10:00:00',
    operator: DEFAULT_MERCHANT_OPERATORS[0],
    module,
    entityId: id,
    entityName: id,
    actionType: 'update',
    actionName: '字段修改',
    summary: 's',
    fieldDiffs: [],
    patches: [],
    beforeSnapshot: null,
    afterSnapshot: null,
    isRevertible: true,
    integrityHash: '',
    status: 'active'
  });

  // 倒序存储：新记录在前
  const list = [
    mk('r-new-1', 'dishes'),
    mk('r-new-2', 'dishes'),
    mk('r-old-1', 'dishes'),
    mk('p-1', 'payments'),
    mk('l-1', 'orders'),
    mk('p-2', 'staff')
  ];
  const plan = applyRetentionPolicy(list, 4);
  const keptIds = plan.kept.map((p) => p.pointerId);
  check('总量超限时优先淘汰 rolling 层', !keptIds.includes('r-old-1'), `保留=${keptIds.join(',')}`);
  check(
    'permanent 层（payments/staff）永不被淘汰',
    keptIds.includes('p-1') && keptIds.includes('p-2'),
    `保留=${keptIds.join(',')}`
  );
  check(
    '保留条数符合上限',
    plan.kept.length <= 4,
    `保留=${plan.kept.length} 淘汰=${plan.droppedCount}`
  );
}

// 26. 分层映射正确
{
  check('payments 归入 permanent 层', retentionTierOf('payments') === 'permanent', retentionTierOf('payments'));
  check('dishes 归入 rolling 层', retentionTierOf('dishes') === 'rolling', retentionTierOf('dishes'));
  check('orders 归入 long 层', retentionTierOf('orders') === 'long', retentionTierOf('orders'));
}

// -------------------------------------------------------------
// 输出
// -------------------------------------------------------------

const failed = results.filter((r) => !r.pass);
let currentGroup = '';
console.log('\n============ 数据治理全链路验证 ============');
results.forEach((r) => {
  if (r.group !== currentGroup) {
    currentGroup = r.group;
    console.log(`\n── ${currentGroup} ──`);
  }
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `\n        ${r.detail}` : ''}`);
});
console.log('\n===========================================');
console.log(`总计 ${results.length} 项，通过 ${results.length - failed.length} 项，失败 ${failed.length} 项`);
process.exit(failed.length === 0 ? 0 : 1);
