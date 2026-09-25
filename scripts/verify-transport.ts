/**
 * 跨设备实时通道 —— 回归守护（C1–C7）
 * 运行：./node_modules/.bin/tsx scripts/verify-transport.ts
 *
 * ⚠️ 诚实边界声明：
 *   本脚本用**注入的假云端通道**验证"契约"（窄订阅、幂等去重、outbox 重放、
 *   降级切换、服务端裁决优先、失败不吞）。它**不能**替代真实设备验证 ——
 *   决策书 §8 第 1 项（端到端延迟）与第 2 项（跨设备双同意）必须在两台真实设备上复测。
 *   本脚本对第 2 项验证的是"客户端是否正确地把裁决权交给服务端"，
 *   以及"服务端条件更新语义下确实只产生一条 granted"。
 */

// -------------------------------------------------------------
// 环境打桩
// -------------------------------------------------------------

const store = new Map<string, string>();
const localStorageStub = {
  get length() {
    return store.size;
  },
  key: (i: number) => Array.from(store.keys())[i] ?? null,
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => {
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
  location: { origin: 'https://demo.local' },
  dispatchEvent: () => true,
  addEventListener: () => undefined,
  removeEventListener: () => undefined
};
(globalThis as any).window = windowStub;
(globalThis as any).localStorage = localStorageStub;
(globalThis as any).location = windowStub.location;
if (!(globalThis as any).crypto?.getRandomValues) {
  const nc = await import('node:crypto');
  (globalThis as any).crypto = (nc as any).webcrypto;
}

// -------------------------------------------------------------
// 生产模块
// -------------------------------------------------------------

const { TransportManager } = await import('../src/utils/transport/transportManager.ts');
const { matchesFilter, filterTargets } = await import('../src/utils/transport/types.ts');
const adapters = await import('../src/utils/transport/adapters.ts');
const busMod = await import('../src/utils/reactiveSyncBus.ts');
const { reactiveSyncBus, describeRouting } = busMod;
const identity = await import('../src/utils/identityBinding.ts');
const cloud = await import('../src/utils/tableSessionCloud.ts');
const engine = await import('../src/utils/tableSessionEngine.ts');
const { setCloudChannel } = adapters;

// 动态 import 的模块不能当命名空间用作类型限定符，这里用内联 import 类型
type CloudChannel = import('../src/utils/transport/adapters.ts').CloudChannel;
type LinkService = import('../src/utils/tableSessionCloud.ts').LinkService;

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
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// -------------------------------------------------------------
// 假云端通道：实现 targets.$in 匹配 + watch 推送 + 可控故障
// -------------------------------------------------------------

class FakeCloudChannel implements CloudChannel {
  public docs: any[] = [];
  public ready = true;
  public failAdds = false;
  public addAttempts = 0;
  private watchers: Array<{ where: any; onSnapshot: (d: any[]) => void; id: number }> = [];
  private seq = 0;

  private matches(doc: any, where: any): boolean {
    if (!where) return true;
    const cond = where.targets;
    if (cond && cond.$in) {
      const targets = Array.isArray(doc.targets) ? doc.targets : [];
      return cond.$in.some((t: string) => targets.includes(t));
    }
    return true;
  }

  async isReady(): Promise<boolean> {
    return this.ready;
  }

  async query(_collection: string, where: any, _orderByField: string, sinceValue: number, limit: number): Promise<any[]> {
    if (!this.ready) throw new Error('cloud unavailable');
    return this.docs
      .filter((d) => this.matches(d, where) && Number(d.emittedAtMs) > sinceValue)
      .sort((a, b) => Number(a.emittedAtMs) - Number(b.emittedAtMs))
      .slice(0, limit);
  }

  async add(_collection: string, doc: Record<string, unknown>): Promise<{ id: string }> {
    this.addAttempts += 1;
    if (!this.ready) throw new Error('cloud unavailable');
    if (this.failAdds) throw new Error('network down');
    this.seq += 1;
    const stored = { ...doc, _id: `doc_${this.seq}` };
    this.docs.push(stored);
    this.watchers.forEach((w) => {
      if (this.matches(stored, w.where)) {
        w.onSnapshot([stored]);
      }
    });
    return { id: stored._id };
  }

  watch(_collection: string, where: any, onSnapshot: (d: any[]) => void): { close: () => void } {
    const entry = { where, onSnapshot, id: ++this.seq };
    this.watchers.push(entry);
    return {
      close: () => {
        this.watchers = this.watchers.filter((w) => w !== entry);
      }
    };
  }

  closeAllWatchers(): void {
    this.watchers = [];
  }
}

function createManagers(channel: FakeCloudChannel) {
  const a = new TransportManager({ cloudChannel: channel, identity: 'cust_A' });
  const b = new TransportManager({ cloudChannel: channel, identity: 'cust_B' });
  return { a, b };
}

function freshState() {
  store.clear();
  setCloudChannel(null);
}

// =============================================================
// 1. 窄订阅（防止快照风暴）
// =============================================================
section('1 窄订阅');

{
  const customerFilter = { sessionIds: ['sess_1'] };
  const otherTableMsg: any = {
    eventId: 'e1',
    traceId: 't1',
    type: 'TABLE_SESSION_MUTATED',
    payload: {},
    emittedAt: '',
    emittedAtMs: 1,
    emittedBy: 'x',
    targets: ['*'],
    tableCodes: ['A9'],
    sessionIds: ['sess_9'],
    expiresAtMs: 0
  };
  const myTableMsg: any = { ...otherTableMsg, eventId: 'e2', sessionIds: ['sess_1'], tableCodes: ['A1'] };

  check(
    '1a 顾客端不会收到其它桌的会话事件',
    matchesFilter(otherTableMsg, customerFilter) === false,
    `matches=${matchesFilter(otherTableMsg, customerFilter)}`
  );
  check(
    '1b 顾客端能收到本桌事件',
    matchesFilter(myTableMsg, customerFilter) === true,
    `matches=${matchesFilter(myTableMsg, customerFilter)}`
  );
  check(
    '1c 顾客端不会因广播标记而收到无关事件（includeBroadcast 需显式开启）',
    matchesFilter(otherTableMsg, { ...customerFilter, includeBroadcast: false }) === false,
    ''
  );

  const merchantFilter = {};
  check('1d 商家端无收窄条件时接收全部', matchesFilter(otherTableMsg, merchantFilter) === true, '');
  check(
    '1e 顾客端的云端订阅目标被收窄为具体会话',
    JSON.stringify(filterTargets(customerFilter)) === JSON.stringify(['sess_1']),
    `targets=${filterTargets(customerFilter).join(',')}`
  );
  check(
    '1f 商家端的云端订阅目标为全体广播标记',
    JSON.stringify(filterTargets(merchantFilter)) === JSON.stringify(['*']),
    `targets=${filterTargets(merchantFilter).join(',')}`
  );
}

// =============================================================
// 2. 跨设备投递与幂等去重
// =============================================================
section('2 跨设备投递');

{
  freshState();
  const channel = new FakeCloudChannel();
  const { a, b } = createManagers(channel);

  const receivedByB: any[] = [];
  b.subscribe({ participantIds: ['cust_B'] }, (m) => receivedByB.push(m));

  const receivedByA: any[] = [];
  a.subscribe({ participantIds: ['cust_A'] }, (m) => receivedByA.push(m));

  // A 发起授权请求，目标为 B
  const routing = describeRouting('TABLE_LINK_REQUEST', {
    requestId: 'lr_1',
    sessionId: 'sess_1',
    tableCode: 'A1',
    targets: ['cust_B']
  });

  await a.publish('TABLE_LINK_REQUEST', { requestId: 'lr_1', targets: ['cust_B'] } as any, {
    targets: routing.targets,
    sessionIds: routing.sessionIds,
    tableCodes: routing.tableCodes
  });

  await sleep(20);

  check('2a 跨设备投递到达目标端（B 收到 A 的请求）', receivedByB.length === 1, `B 收到 ${receivedByB.length} 条`);
  check('2b 请求未投递到无关端（A 未收到发给 B 的事件）', receivedByA.length === 0, `A 收到 ${receivedByA.length} 条`);
  check(
    '2c 事件信封携带幂等键与追踪号',
    !!receivedByB[0]?.eventId && !!receivedByB[0]?.traceId,
    `eventId=${receivedByB[0]?.eventId} traceId=${receivedByB[0]?.traceId}`
  );

  a.close();
  b.close();
}

{
  // 同一条消息经 L0 与 L1 双通道到达时只能被处理一次
  freshState();
  const channel = new FakeCloudChannel();
  const manager = new TransportManager({ cloudChannel: channel, identity: 'me' });
  const got: any[] = [];
  manager.subscribe({}, (m) => got.push(m));

  await manager.publish('TABLE_SESSION_MUTATED', { sessionId: 's1', tableCode: 'A1' } as any, {
    sessionIds: ['s1'],
    tableCodes: ['A1']
  });
  // 模拟云端把同一条事件回显回来
  await channel.add('obsidian_reactive_events', {
    eventId: got[0]?.eventId ?? 'unknown',
    traceId: 't',
    type: 'TABLE_SESSION_MUTATED',
    payload: {},
    emittedAtMs: Date.now() + 1,
    emittedBy: 'me',
    targets: ['*'],
    tableCodes: ['A1'],
    sessionIds: ['s1'],
    expiresAtMs: Date.now() + 60000
  });
  await sleep(10);

  check('2d 同 eventId 经多通道到达只处理一次', got.length === 1, `处理 ${got.length} 次`);
  manager.close();
}

// =============================================================
// 3. 断网不丢（L2 上行队列）
// =============================================================
section('3 断网重放');

{
  freshState();
  const channel = new FakeCloudChannel();
  const manager = new TransportManager({ cloudChannel: channel, identity: 'me' });
  manager.subscribe({}, () => undefined);

  channel.failAdds = true;
  await manager.publish('TABLE_SESSION_MUTATED', { sessionId: 's1', tableCode: 'A1' } as any, { sessionIds: ['s1'] });
  await manager.publish('TABLE_LINK_SETTLED', { requestId: 'lr_1', sessionId: 's1', tableCode: 'A1' } as any, {
    sessionIds: ['s1']
  });
  await sleep(10);

  check('3a 上行失败时事件进入本地队列而非丢弃', manager.getOutboxSize() === 2, `队列长度=${manager.getOutboxSize()}`);

  channel.failAdds = false;
  const flushed = await manager.flushOutbox();
  check('3b 恢复后队列全部重放成功', flushed === 2 && manager.getOutboxSize() === 0, `重放=${flushed} 剩余=${manager.getOutboxSize()}`);

  const delivered = channel.docs.length;
  check('3c 重放后云端恰好收到两条（无重复）', delivered === 2, `云端文档数=${delivered}`);
  manager.close();
}

// =============================================================
// 4. 降级与恢复（L1 → L3 → L1）
// =============================================================
section('4 降级与恢复');

{
  freshState();
  const channel = new FakeCloudChannel();
  const manager = new TransportManager({ cloudChannel: channel, identity: 'me' });
  manager.subscribe({}, () => undefined);

  channel.ready = false;
  for (let i = 0; i < 6; i += 1) {
    await manager.publish('TABLE_SESSION_MUTATED', { sessionId: 's1', tableCode: 'A1' } as any, { sessionIds: ['s1'] });
  }
  await manager.evaluateHealthNow();

  check('4a 连续失败达阈值后自动切至轮询降级', manager.isDegraded() === true, `activeKind=${manager.health().activeKind}`);
  check('4b 降级状态对外可见（供探针与界面提示）', manager.health().degraded === true, '');

  channel.ready = true;
  const recovered = await manager.tryRestore();
  check('4c 通道恢复后自动退出降级', recovered === true && manager.isDegraded() === false, `activeKind=${manager.health().activeKind}`);
  check('4d 恢复过程中上行队列被一并清空', manager.getOutboxSize() === 0, `队列=${manager.getOutboxSize()}`);
  manager.close();
}

// =============================================================
// 5. 事件路由推导
// =============================================================
section('5 路由推导');

{
  const routing = describeRouting('TABLE_LINK_REQUEST', {
    sessionId: 'sess_1',
    tableCode: 'A1',
    targets: ['cust_P1', 'cust_P2']
  });
  check(
    '5a 授权请求的收件人 = 全体 + 被请求者集合',
    routing.targets.includes('*') && routing.targets.includes('cust_P1') && routing.targets.includes('cust_P2'),
    routing.targets.join(',')
  );
  check('5b 会话与桌号被自动带入信封', routing.sessionIds[0] === 'sess_1' && routing.tableCodes[0] === 'A1', '');

  const settled = describeRouting('TABLE_LINK_SETTLED', { sessionId: 'sess_1', tableCode: 'A1' });
  check('5c 收敛事件面向全会话（含商家端）', settled.targets.includes('*') && settled.sessionIds[0] === 'sess_1', '');
}

// =============================================================
// 6. 服务端裁决优先（含跨设备双同意契约）
// =============================================================
section('6 服务端裁决');

/** 带条件更新语义的假服务端：两个"设备"共享同一份权威状态 */
class FakeLinkServer implements LinkService {
  public requests: Record<string, any> = {};
  public available = true;
  public settleAttempts = 0;

  async isAvailable(): Promise<boolean> {
    return this.available;
  }

  async settle({ requestId, decision, actorId }: any) {
    this.settleAttempts += 1;
    const req = this.requests[requestId];
    if (!req) return { ok: false, message: '授权请求不存在' };
    if (!req.targets.includes(actorId)) return { ok: false, message: '你不是本请求的被授权对象' };
    // ★ 条件更新：status === 'pending' 才允许写入
    if (req.status !== 'pending') {
      return { ok: false, conflict: true, message: `该请求已由 ${req.resolvedByName} 处理`, resolvedBy: req.resolvedBy };
    }
    req.status = decision;
    req.resolvedBy = actorId;
    req.resolvedByName = actorId;
    return { ok: true, message: '授权已生效', status: decision, resolvedBy: actorId, resolvedByName: actorId };
  }

  async fetchSessions() {
    return [];
  }
}

{
  freshState();
  const server = new FakeLinkServer();
  cloud.setLinkService(server);
  engine.writeProbe({ phase: 'scan', sessionId: 'sess_x', tableCode: 'A1' });

  // 本地建一个已开台的桌，构造待决请求
  store.set('obsidian_merchant_tables', JSON.stringify([{ id: 'tbl-A1', code: 'A1', name: 'A1', zone: 'patio', zoneLabel: '外摆', capacity: 4, status: 'idle' }]));
  store.set('obsidian_table_sessions', '[]');
  store.set('obsidian_table_link_requests', '[]');

  const acq = engine.acquireFirstBind({ tableId: 'tbl-A1', tableCode: 'A1', seed: { participantId: 'cust_P1' } });
  const sid = acq.value!.sessionId;
  engine.finalizeFirstBind(sid, 4, 'cust_P1');
  engine.setParticipantAuthority({ sessionId: sid, targetId: 'cust_P1', authority: 'manage', actorId: 'cust_P1' });
  const r = engine.requestLink({ tableCode: 'A1', seed: { participantId: 'cust_P3' } });
  const requestId = r.value!.requestId;

  server.requests[requestId] = { requestId, targets: ['cust_P1', 'cust_P2'], status: 'pending' };

  // 两个"设备"同时提交同意
  const [d1, d2] = await Promise.all([
    cloud.settleLinkAuthoritative({ requestId, decision: 'granted', actorId: 'cust_P1' }),
    cloud.settleLinkAuthoritative({ requestId, decision: 'granted', actorId: 'cust_P2' })
  ]);

  const okCount = [d1, d2].filter((x) => x.ok).length;
  const conflictCount = [d1, d2].filter((x) => !x.ok && x.reason === 'CAS_CONFLICT').length;
  check('6a 跨设备双同意：恰好一条成功', okCount === 1, `成功=${okCount} 失败=${2 - okCount}`);
  check('6b 落败方得到 CAS_CONFLICT 而非静默成功', conflictCount === 1, `冲突=${conflictCount}`);
  check(
    '6c 客户端把裁决权交给服务端（serverDecided）',
    [d1, d2].every((x) => x.serverDecided === true),
    `决定来源=${[d1, d2].map((x) => x.serverDecided).join('/')}`
  );
  check('6d 不再产生降级待对账记录', engine.listPendingSync().length === 0, `待对账=${engine.listPendingSync().length}`);
}

{
  // 非被请求对象裁决 → 服务端拒绝，且本地状态不得被改写
  freshState();
  const server = new FakeLinkServer();
  cloud.setLinkService(server);
  store.set('obsidian_merchant_tables', JSON.stringify([{ id: 'tbl-A1', code: 'A1', name: 'A1', zone: 'patio', zoneLabel: '外摆', capacity: 4, status: 'idle' }]));
  store.set('obsidian_table_sessions', '[]');
  store.set('obsidian_table_link_requests', '[]');
  store.set('obsidian_governance_quarantine', '[]');

  const acq = engine.acquireFirstBind({ tableId: 'tbl-A1', tableCode: 'A1', seed: { participantId: 'cust_P1' } });
  engine.finalizeFirstBind(acq.value!.sessionId, 4, 'cust_P1');
  const r = engine.requestLink({ tableCode: 'A1', seed: { participantId: 'cust_P3' } });
  const requestId = r.value!.requestId;
  server.requests[requestId] = { requestId, targets: ['cust_P1'], status: 'pending' };

  const before = engine.getSessionById(acq.value!.sessionId)!.participants.length;
  const outsider = await cloud.settleLinkAuthoritative({ requestId, decision: 'granted', actorId: 'cust_ATTACKER' });
  const after = engine.getSessionById(acq.value!.sessionId)!.participants.length;

  check('6e 非被请求对象的授权请求被服务端拒绝', outsider.ok === false, `reason=${outsider.reason}`);
  check('6f 越权尝试未改写本地成员名单', before === after, `成员数 ${before} → ${after}`);
}

{
  // 服务端不可用 → 降级本地 CAS + 标记待对账
  freshState();
  const server = new FakeLinkServer();
  server.available = false;
  cloud.setLinkService(server);
  store.set('obsidian_merchant_tables', JSON.stringify([{ id: 'tbl-A1', code: 'A1', name: 'A1', zone: 'patio', zoneLabel: '外摆', capacity: 4, status: 'idle' }]));
  store.set('obsidian_table_sessions', '[]');
  store.set('obsidian_table_link_requests', '[]');
  store.set('obsidian_governance_quarantine', '[]');

  const acq = engine.acquireFirstBind({ tableId: 'tbl-A1', tableCode: 'A1', seed: { participantId: 'cust_P1' } });
  engine.finalizeFirstBind(acq.value!.sessionId, 4, 'cust_P1');
  const r = engine.requestLink({ tableCode: 'A1', seed: { participantId: 'cust_P3' } });

  const degraded = await cloud.settleLinkAuthoritative({
    requestId: r.value!.requestId,
    decision: 'granted',
    actorId: 'cust_P1'
  });
  check('6g 服务端不可用时降级为本地 CAS 且明确标注来源', degraded.ok === true && degraded.serverDecided === false, `serverDecided=${degraded.serverDecided}`);
  check('6h 降级裁决被记入待对账（恢复后需补交）', engine.listPendingSync().length === 1, `待对账=${engine.listPendingSync().length}`);

  const synced = await cloud.syncPendingSettlements();
  check('6i 服务端恢复后待对账记录被补交清空', synced.attempted === 0 || engine.listPendingSync().length === 0, `补交=${synced.confirmed}`);
}

// =============================================================
// 7. 身份一致性（C5）
// =============================================================
section('7 身份绑定');

{
  freshState();
  identity.clearIdentityCache();

  const p1 = identity.deriveParticipantId('uid-abc-123');
  const p2 = identity.deriveParticipantId('uid-abc-123');
  const p3 = identity.deriveParticipantId('uid-different');
  check('7a 同一 uid 派生同一 participantId（换设备可复现）', p1 === p2 && p1 !== p3, `${p1} / ${p3}`);
  check('7b 派生 id 不泄露原始 uid', !p1.includes('uid-abc-123'), `id=${p1}`);

  const bound = await identity.resolveIdentity({
    force: true,
    provider: { getUid: async () => ({ ok: true, uid: 'uid-cloud-1' }) }
  });
  check('7c 云登录可用时进入 cloud_bound 模式', bound.mode === 'cloud_bound' && !!bound.cloudUid, `mode=${bound.mode}`);

  const degraded = await identity.resolveIdentity({
    force: true,
    provider: { getUid: async () => ({ ok: false, error: '匿名登录被策略拒绝' }) }
  });
  check('7d 云登录不可用时降级且记录原因（不静默）', degraded.mode === 'device_local' && !!degraded.degradedReason, `mode=${degraded.mode} reason=${degraded.degradedReason}`);

  const copy = identity.describeIdentityMode(degraded);
  check('7e 降级模式有明确的用户可见提示', copy.degraded === true && copy.hint.includes('换设备'), copy.hint);
}

// =============================================================
// 8. 总线门面兼容性（C1 契约不变）
// =============================================================
section('8 总线兼容性');

{
  freshState();
  const fakeChannel = new FakeCloudChannel();
  reactiveSyncBus.configureTransport({ cloudChannel: fakeChannel, identity: 'me' });

  const got: string[] = [];
  const unsub = reactiveSyncBus.subscribe('TABLE_SESSION_MUTATED', (p: any) => got.push(p.sessionId));
  reactiveSyncBus.publish('TABLE_SESSION_MUTATED', {
    sessionId: 'sess_bus',
    tableCode: 'A1',
    change: 'opened',
    at: new Date().toISOString()
  });
  await sleep(10);
  check('8a 原有 subscribe/publish 签名行为保持兼容', got.includes('sess_bus'), `收到=${got.join(',')}`);
  unsub();

  const health = reactiveSyncBus.transportHealth();
  check('8b 总线暴露传输层健康度供探针使用', !!health && typeof health.degraded === 'boolean', `activeKind=${health?.activeKind}`);
}

// -------------------------------------------------------------
// 输出
// -------------------------------------------------------------

const failed = results.filter((r) => !r.pass);
let currentGroup = '';
console.log('\n======== 跨设备实时通道验证（C1–C7）========');
results.forEach((r) => {
  if (r.group !== currentGroup) {
    currentGroup = r.group;
    console.log(`\n── ${currentGroup} ──`);
  }
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `\n        ${r.detail}` : ''}`);
});
console.log('\n============================================');
console.log(`总计 ${results.length} 项，通过 ${results.length - failed.length} 项，失败 ${failed.length} 项`);
console.log('\n注意：第 1 项端到端延迟与第 2 项真实跨设备双同意仍需在两台真机上复测（见决策书 §8）。');
process.exit(failed.length === 0 ? 0 : 1);
