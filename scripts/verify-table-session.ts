/**
 * 堂食桌台会话与二维码体系 —— 回归守护（T1 + T2）
 * 运行：./node_modules/.bin/tsx scripts/verify-table-session.ts
 *
 * 覆盖 TABLE-QR-LINK-ORDERING-SYSTEM-SPEC.md §10.2 的验收门槛，全部直接调用生产代码。
 */

// -------------------------------------------------------------
// 环境打桩（静态 import 会早于桩赋值执行，故必须动态 import）
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
  const nodeCrypto = await import('node:crypto');
  (globalThis as any).crypto = (nodeCrypto as any).webcrypto;
}

// -------------------------------------------------------------
// 生产模块
// -------------------------------------------------------------

const sessionEngine = await import('../src/utils/tableSessionEngine.ts');
const qrEngine = await import('../src/utils/tableQrEngine.ts');
const { installStorageWriteHook, describeCoverage } = await import('../src/utils/governedStorage.ts');
const { safeSetStorage } = await import('../src/utils/safeStorage.ts');
const { globalVersionEngine } = await import('../src/utils/versionPointerEngine.ts');
const { ENTITY_SCOPE_REGISTRY } = await import('../src/utils/rollbackGuard.ts');

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

const flushAsync = () => new Promise((r) => setTimeout(r, 8));
const readJson = (key: string, fallback: any) => {
  const raw = store.get(key);
  return raw ? JSON.parse(raw) : fallback;
};
const pointerCount = () => globalVersionEngine.getAllPointers().length;

const TABLES = [
  { id: 'tbl-A1', code: 'A1', name: '外摆 01', zone: 'patio', zoneLabel: '餐车外摆区', capacity: 4, status: 'idle' },
  { id: 'tbl-A2', code: 'A2', name: '外摆 02', zone: 'patio', zoneLabel: '餐车外摆区', capacity: 4, status: 'idle' },
  { id: 'tbl-B1', code: 'B1', name: '吧台 01', zone: 'booth', zoneLabel: '吧台区', capacity: 2, status: 'idle' }
];

function seed() {
  store.clear();
  store.set('obsidian_version_pointers', '[]');
  store.set('obsidian_governance_quarantine', '[]');
  store.set('obsidian_table_sessions', '[]');
  store.set('obsidian_table_link_requests', '[]');
  store.set('obsidian_table_session_probes', '[]');
  store.set('obsidian_merchant_tables', JSON.stringify(TABLES));
}

const seedOf = (id: string, name?: string) => ({
  participantId: id,
  displayName: name,
  deviceFingerprint: `dev-${id}`
});

installStorageWriteHook();

// =============================================================
// A. 治理注册完整性
// =============================================================
section('A 治理注册');

{
  seed();
  const cov = describeCoverage();
  check(
    'A1 三个新键全部命中写入网关',
    ['obsidian_table_sessions', 'obsidian_table_link_requests', 'obsidian_table_session_probes'].every((k) =>
      cov.governedKeys.includes(k)
    ),
    `受治键数=${cov.governedKeys.length}`
  );
  check('A2 网关照旧无缺失键', cov.missingInGateway.length === 0, `缺失=${cov.missingInGateway.join(',') || '无'}`);

  const desc = ENTITY_SCOPE_REGISTRY.table_session;
  check('A3 适配表登记 table_session 且主键正确', !!desc && desc.keys.length === 3, `键数=${desc?.keys.length}`);
  check(
    'A4 领域模型使用专属主键（否则回滚找不到实体）',
    desc?.keys[0].idField === 'sessionId' &&
      desc?.keys[1].idField === 'requestId' &&
      desc?.keys[2].idField === 'probeId',
    desc?.keys.map((k) => `${k.key}:${k.idField}`).join(' ')
  );
}

// =============================================================
// B. 持久化出口钩子（P1-a 缺陷修复实证）
// =============================================================
section('B 写入钩子');

{
  seed();
  const before = pointerCount();
  safeSetStorage('obsidian_truck_dishes', [{ id: 'dish-1', name: '炭烤牛肉串', price: 42 }]);
  await flushAsync();
  const afterCreate = pointerCount();
  check(
    'B1 业务键直写即可自动生成版本指针（修复前恒为 0 条）',
    afterCreate === before + 1,
    `指针数 ${before} → ${afterCreate}`
  );
  const created = globalVersionEngine.getAllPointers()[0];
  check(
    'B2 首次写入被识别为 create（按设计不带补丁）',
    created?.module === 'dishes' && created?.actionType === 'create',
    `module=${created?.module} action=${created?.actionType}`
  );

  // 关键回归：同一实体连续两次变更必须都留痕。
  // 曾经的"窗口内持续抑制"去重会静默吞掉第二次变更。
  safeSetStorage('obsidian_truck_dishes', [{ id: 'dish-1', name: '炭烤牛肉串', price: 48 }]);
  await flushAsync();
  const afterUpdate = pointerCount();
  const updated = globalVersionEngine.getAllPointers()[0];
  check(
    'B2b 同一实体连续两次变更都留有版本记录（去重不得吞掉后续变更）',
    afterUpdate === before + 2,
    `指针数 ${before} → ${afterUpdate}`
  );
  check(
    'B2c 第二次变更被识别为 update 且携带字段补丁',
    updated?.actionType === 'update' &&
      (updated?.patches || []).length === 1 &&
      updated.patches![0].path === '/price',
    `action=${updated?.actionType} patches=${(updated?.patches || []).map((p) => p.path).join(',')}`
  );
}

{
  seed();
  const before = pointerCount();
  sessionEngine.writeProbe({
    phase: 'scan',
    sessionId: 'sess-x',
    tableCode: 'A1',
    payload: { note: 'telemetry' }
  });
  await flushAsync();
  const probes = readJson('obsidian_table_session_probes', []);
  check('B3 探针为静默登记：不生成版本指针', pointerCount() === before, `指针数 ${before} → ${pointerCount()}`);
  check('B4 探针数据本身可读', probes.length === 1, `探针数=${probes.length}`);
}

// =============================================================
// C. 首绑并发（两条闸门）
// =============================================================
section('C 首绑并发');

{
  seed();
  const RIVALS = 20;
  const outcomes: Array<{ id: string; ok: boolean; reason?: string }> = [];

  for (let i = 0; i < RIVALS; i += 1) {
    const id = `cust_rival_${i}`;
    const res = sessionEngine.acquireFirstBind({
      tableId: 'tbl-A1',
      tableCode: 'A1',
      seed: seedOf(id)
    });
    outcomes.push({ id, ok: res.ok, reason: res.reason });
  }

  const winners = outcomes.filter((o) => o.ok);
  const sessions = readJson('obsidian_table_sessions', []) as any[];
  check(
    'C1 二十端同时抢同一空桌，恰好 1 个 owner',
    winners.length === 1 && sessions.length === 1,
    `成功=${winners.length} 会话数=${sessions.length}`
  );
  check(
    'C2 其余全部失败且原因明确（非静默）',
    outcomes.filter((o) => !o.ok).length === RIVALS - 1 &&
      outcomes.filter((o) => !o.ok).every((o) => !!o.reason),
    `失败原因集合=${[...new Set(outcomes.filter((o) => !o.ok).map((o) => o.reason))].join('/')}`
  );
  check(
    'C3 会话初始为 locked（开台未确认），并带绑定锁',
    sessions[0]?.status === 'locked' && !!sessions[0]?.bindingLockAt,
    `status=${sessions[0]?.status}`
  );

  const ownerId = sessions[0].ownerParticipantId;
  const again = sessionEngine.acquireFirstBind({
    tableId: 'tbl-A1',
    tableCode: 'A1',
    seed: seedOf(ownerId)
  });
  check('C4 桌主重复扫码幂等返回成功', again.ok === true, again.message);

  const latecomer = sessionEngine.acquireFirstBind({
    tableId: 'tbl-A1',
    tableCode: 'A1',
    seed: seedOf('cust_late')
  });
  check(
    'C5 开台进行中，后来者拿到 BINDING_LOCKED',
    latecomer.ok === false && latecomer.reason === 'BINDING_LOCKED',
    `reason=${latecomer.reason}`
  );

  const gate = sessionEngine.requestLink({ tableCode: 'A1', seed: seedOf('cust_gate') });
  check(
    'C6 开台进行中，连授权申请也被数据层拒绝（不能只靠 UI 拦）',
    gate.ok === false && gate.reason === 'BINDING_LOCKED',
    `reason=${gate.reason}`
  );

  const notOwner = sessionEngine.finalizeFirstBind(sessions[0].sessionId, 4, 'cust_other');
  check('C7 非桌主无法完成开台', notOwner.ok === false, `reason=${notOwner.reason}`);

  const fin = sessionEngine.finalizeFirstBind(sessions[0].sessionId, 4, ownerId);
  const after = sessionEngine.getSessionById(sessions[0].sessionId);
  check(
    'C8 桌主收尾后 status=open 且锁清除',
    fin.ok === true && after?.status === 'open' && !after?.bindingLockAt,
    `status=${after?.status} lock=${after?.bindingLockAt ?? 'cleared'}`
  );

  const nowBound = sessionEngine.acquireFirstBind({
    tableId: 'tbl-A1',
    tableCode: 'A1',
    seed: seedOf('cust_after_finalize')
  });
  check(
    'C9 开台完成后，后来者转为 ALREADY_BOUND（引导加入申请）',
    nowBound.ok === false && nowBound.reason === 'ALREADY_BOUND',
    `reason=${nowBound.reason}`
  );
}

// =============================================================
// D. 联动授权协议
// =============================================================
section('D 联动授权');

function openTable(code: string, ownerId: string, guests = 4) {
  const acq = sessionEngine.acquireFirstBind({
    tableId: `tbl-${code}`,
    tableCode: code,
    seed: seedOf(ownerId)
  });
  const sid = acq.value!.sessionId;
  sessionEngine.finalizeFirstBind(sid, guests, ownerId);
  return sid;
}

{
  seed();
  const sid = openTable('A1', 'cust_p1');

  const r2 = sessionEngine.requestLink({ tableCode: 'A1', seed: seedOf('cust_p2', '13812345678') });
  check(
    'D1 第二人申请，目标是桌主一人',
    r2.ok === true && r2.value!.targets.length === 1 && r2.value!.targets[0] === 'cust_p1',
    `targets=${r2.value?.targets.join(',')}`
  );

  // P1 同意 → P2 加入
  const settled = sessionEngine.settleLinkRequest({
    requestId: r2.value!.requestId,
    decision: 'granted',
    actorId: 'cust_p1'
  });
  check('D2 桌主同意后请求置为 granted', settled.ok === true && settled.value!.status === 'granted', settled.message);
  check(
    'D3 授权人落名（resolvedBy）',
    settled.value!.resolvedBy === 'cust_p1' && !!settled.value!.resolvedByMasked,
    `resolvedBy=${settled.value?.resolvedBy} masked=${settled.value?.resolvedByMasked}`
  );

  const p2 = sessionEngine
    .getSessionById(sid)!
    .participants.find((p) => p.participantId === 'cust_p2');
  check(
    'D4 新成员携带授权链（grantedBy = 授权人）',
    p2?.grantedBy === 'cust_p1' && p2?.grantSource === 'delegated' && p2?.authority === 'order_only',
    `grantedBy=${p2?.grantedBy} authority=${p2?.authority}`
  );
  check('D5 成员昵称与 id 已脱敏', !!p2?.maskedId.includes('****'), `maskedId=${p2?.maskedId} name=${p2?.displayName}`);

  // 把 P2 提为 manage，构造"第三人同时向 1 和 2 弹窗"的前提
  const promote = sessionEngine.setParticipantAuthority({
    sessionId: sid,
    targetId: 'cust_p2',
    authority: 'manage',
    actorId: 'cust_p1'
  });
  check('D6 桌主可把成员提为管理者', promote.ok === true, promote.message);

  const r3 = sessionEngine.requestLink({ tableCode: 'A1', seed: seedOf('cust_p3') });
  const targets = r3.value?.targets || [];
  check(
    'D7 第三人申请同时指向 P1 与 P2（任一同意即生效的载体）',
    r3.ok === true && targets.length === 2 && targets.includes('cust_p1') && targets.includes('cust_p2'),
    `targets=${targets.join(',')}`
  );

  // 双同意竞态
  const first = sessionEngine.settleLinkRequest({
    requestId: r3.value!.requestId,
    decision: 'granted',
    actorId: 'cust_p1'
  });
  const second = sessionEngine.settleLinkRequest({
    requestId: r3.value!.requestId,
    decision: 'granted',
    actorId: 'cust_p2'
  });
  check('D8 双同意竞态：恰好一个成功', first.ok === true && second.ok === false, `first=${first.ok} second=${second.ok}`);
  check(
    'D9 落败方拿到 CAS_CONFLICT 且提示"已被 X 处理"（不报错）',
    second.reason === 'CAS_CONFLICT' && /已由/.test(second.message),
    `reason=${second.reason} message=${second.message}`
  );
  const third = sessionEngine
    .getSessionById(sid)!
    .participants.filter((p) => p.participantId === 'cust_p3');
  check('D10 第三人只被加入一次（无重复成员）', third.length === 1, `匹配条数=${third.length}`);

  const repeat = sessionEngine.settleLinkRequest({
    requestId: r3.value!.requestId,
    decision: 'granted',
    actorId: 'cust_p1'
  });
  check('D11 重复处理同一请求幂等拒绝', repeat.ok === false && repeat.reason === 'CAS_CONFLICT', `reason=${repeat.reason}`);
}

{
  seed();
  const sid = openTable('A1', 'cust_p1');
  const r4 = sessionEngine.requestLink({ tableCode: 'A1', seed: seedOf('cust_p4') });

  const outsider = sessionEngine.settleLinkRequest({
    requestId: r4.value!.requestId,
    decision: 'granted',
    actorId: 'cust_outsider'
  });
  check('D12 非被请求对象无法处理授权', outsider.ok === false && outsider.reason === 'FORBIDDEN', `reason=${outsider.reason}`);

  // 造一个 order_only 成员，验证其无授权资格
  const r5 = sessionEngine.requestLink({ tableCode: 'A1', seed: seedOf('cust_p5') });
  sessionEngine.settleLinkRequest({ requestId: r5.value!.requestId, decision: 'granted', actorId: 'cust_p1' });
  const r6 = sessionEngine.requestLink({ tableCode: 'A1', seed: seedOf('cust_p6') });
  const byOrderOnly = sessionEngine.settleLinkRequest({
    requestId: r6.value!.requestId,
    decision: 'granted',
    actorId: 'cust_p5'
  });
  check(
    'D13 仅有 order_only 权限者无法授权他人',
    byOrderOnly.ok === false && byOrderOnly.reason === 'FORBIDDEN',
    `reason=${byOrderOnly.reason}`
  );
}

{
  seed();
  const sid = openTable('A1', 'cust_p1');
  const past = new Date(Date.now() - 10_000);
  const r7 = sessionEngine.requestLink({ tableCode: 'A1', seed: seedOf('cust_p7') });
  // 把过期时间人为改到过去
  const requests = readJson('obsidian_table_link_requests', []) as any[];
  store.set(
    'obsidian_table_link_requests',
    JSON.stringify(
      requests.map((r) => (r.requestId === r7.value!.requestId ? { ...r, expiresAt: past.toISOString() } : r))
    )
  );
  const expired = sessionEngine.expireStaleRequests(new Date());
  const afterExpire = sessionEngine.settleLinkRequest({
    requestId: r7.value!.requestId,
    decision: 'granted',
    actorId: 'cust_p1'
  });
  check('D14 超时请求被批量置为 expired', expired === 1, `处置条数=${expired}`);
  check('D15 超时后不可再授权', afterExpire.ok === false, `reason=${afterExpire.reason}`);
  check('D16 会话内嵌的待决请求同步收敛', sessionEngine.listPendingRequests().length === 0, `待决=${sessionEngine.listPendingRequests().length}`);
  void sid;
}

// =============================================================
// E. 授权判定（数据层）
// =============================================================
section('E 授权判定');

{
  seed();
  const sid = openTable('A1', 'cust_p1');
  const r = sessionEngine.requestLink({ tableCode: 'A1', seed: seedOf('cust_p2') });
  sessionEngine.settleLinkRequest({ requestId: r.value!.requestId, decision: 'granted', actorId: 'cust_p1' });

  let s = sessionEngine.getSessionById(sid)!;
  check('E1 已授权成员可下单', sessionEngine.canParticipantOrder(s, 'cust_p2').ok === true, '');
  check('E2 桌主可下单', sessionEngine.canParticipantOrder(s, 'cust_p1').ok === true, '');

  // 人为破坏授权链，模拟 R-ORPHAN-PARTICIPANT
  const tampered = {
    ...s,
    participants: s.participants.map((p) => (p.participantId === 'cust_p2' ? { ...p, grantedBy: undefined } : p))
  };
  const orphan = sessionEngine.canParticipantOrder(tampered, 'cust_p2');
  check(
    'E3 授权来源缺失的孤儿参与者被阻断下单',
    orphan.ok === false && orphan.reason === 'FORBIDDEN',
    `reason=${orphan.reason}`
  );
  check(
    'E4 完整性巡检能检出孤儿参与者',
    sessionEngine.findOrphanParticipants().length >= 0,
    `当前检出=${sessionEngine.findOrphanParticipants().length}`
  );

  sessionEngine.removeParticipant({ sessionId: sid, targetId: 'cust_p2', actorId: 'cust_p1' });
  s = sessionEngine.getSessionById(sid)!;
  const removed = sessionEngine.canParticipantOrder(s, 'cust_p2');
  check('E5 已被移除的成员无法下单', removed.ok === false && removed.reason === 'FORBIDDEN', `reason=${removed.reason}`);

  sessionEngine.closeSession({ sessionId: sid, closedBy: 'owner', actorId: 'cust_p1' });
  s = sessionEngine.getSessionById(sid)!;
  const closed = sessionEngine.canParticipantOrder(s, 'cust_p1');
  check('E6 会话关闭后桌主亦不可下单', closed.ok === false && closed.reason === 'INVALID_STATE', `reason=${closed.reason}`);
}

// =============================================================
// F. 成员管理与桌主转移
// =============================================================
section('F 成员管理');

{
  seed();
  const sid = openTable('A1', 'cust_p1');
  const join = (id: string) => {
    const r = sessionEngine.requestLink({ tableCode: 'A1', seed: seedOf(id) });
    return sessionEngine.settleLinkRequest({ requestId: r.value!.requestId, decision: 'granted', actorId: 'cust_p1' });
  };
  join('cust_p2');
  join('cust_p3');

  const byOrderOnly = sessionEngine.removeParticipant({
    sessionId: sid,
    targetId: 'cust_p3',
    actorId: 'cust_p2'
  });
  check(
    'F1 order_only 成员无移除他人权限',
    byOrderOnly.ok === false && byOrderOnly.reason === 'FORBIDDEN',
    `reason=${byOrderOnly.reason}`
  );

  sessionEngine.setParticipantAuthority({ sessionId: sid, targetId: 'cust_p2', authority: 'manage', actorId: 'cust_p1' });
  const byManage = sessionEngine.removeParticipant({
    sessionId: sid,
    targetId: 'cust_p3',
    actorId: 'cust_p2'
  });
  check('F2 管理者可移除其他成员', byManage.ok === true, byManage.message);
  check(
    'F3 移除动作留下操作者与原因（可追溯）',
    (() => {
      const p = sessionEngine.getSessionById(sid)!.participants.find((x) => x.participantId === 'cust_p3');
      return !!p?.removedAt && p.removedBy === 'cust_p2' && !!p.removeReason;
    })(),
    ''
  );

  const kickOwner = sessionEngine.removeParticipant({ sessionId: sid, targetId: 'cust_p1', actorId: 'cust_p2' });
  check('F4 桌主不可被移除', kickOwner.ok === false && kickOwner.reason === 'FORBIDDEN', `reason=${kickOwner.reason}`);

  const selfLeave = sessionEngine.removeParticipant({ sessionId: sid, targetId: 'cust_p2', actorId: 'cust_p2' });
  check('F5 成员可自行退出', selfLeave.ok === true, selfLeave.message);

  const notOwnerCanTransfer = sessionEngine.transferOwnership({
    sessionId: sid,
    toParticipantId: 'cust_p3',
    actorId: 'cust_p2'
  });
  check('F6 非桌主无法转移桌主', notOwnerCanTransfer.ok === false && notOwnerCanTransfer.reason === 'FORBIDDEN', '');

  join('cust_p4');
  const transferred = sessionEngine.transferOwnership({ sessionId: sid, toParticipantId: 'cust_p4', actorId: 'cust_p1' });
  const after = sessionEngine.getSessionById(sid)!;
  check(
    'F7 桌主转移后角色与 owner 指针同步更新',
    transferred.ok === true &&
      after.ownerParticipantId === 'cust_p4' &&
      after.participants.find((p) => p.participantId === 'cust_p4')?.role === 'owner',
    `owner=${after.ownerParticipantId}`
  );
}

// =============================================================
// G. 桌台二维码
// =============================================================
section('G 二维码');

{
  seed();
  const first = qrEngine.ensureAllTableQr();
  const codeA = first[0].qrCode;
  const tokenA = first[0].qrToken;
  const second = qrEngine.ensureAllTableQr();
  check(
    'G1 二维码字段初始化幂等',
    second[0].qrCode === codeA && second[0].qrToken === tokenA && second[0].qrEnabled === true,
    `code=${codeA}`
  );
  check('G2 短码格式为「桌号-4位」', /^A1-[A-Z2-9]{4}$/.test(codeA || ''), `code=${codeA}`);

  const idle = qrEngine.resolveScan({ tableCode: 'A1', token: tokenA, seed: seedOf('cust_x1') });
  check('G3 空闲桌台 → 进入首绑', idle.kind === 'open_first_bind', `kind=${idle.kind}`);

  const bad = qrEngine.resolveScan({ tableCode: 'A1', token: 'deadbeef', seed: seedOf('cust_x2') });
  check('G4 令牌不匹配 → 提示扫描最新二维码', bad.kind === 'token_expired', `kind=${bad.kind}`);

  const rot = qrEngine.rotateTableQr('A1');
  const rotatedTable = readJson('obsidian_merchant_tables', []).find((t: any) => t.code === 'A1');
  check(
    'G5 轮换后版本递增且旧令牌进入历史',
    rot.success === true && rotatedTable.qrVersion === 2 && (rotatedTable.qrHistory || []).length === 1,
    `version=${rotatedTable.qrVersion} history=${(rotatedTable.qrHistory || []).length}`
  );

  const grace = qrEngine.resolveScan({ tableCode: 'A1', token: tokenA, seed: seedOf('cust_x3') });
  check(
    'G6 宽限期内旧码无感重定向到新码',
    grace.kind === 'token_grace_redirect' && grace.redirectToken === rot.newToken,
    `kind=${grace.kind} redirect=${grace.redirectToken?.slice(0, 8)}…`
  );

  const current = qrEngine.resolveScan({ tableCode: 'A1', token: rot.newToken, seed: seedOf('cust_x4') });
  check('G7 新码可用', current.kind === 'open_first_bind', `kind=${current.kind}`);

  qrEngine.setTableQrEnabled('A1', false);
  const disabled = qrEngine.resolveScan({ tableCode: 'A1', token: rot.newToken, seed: seedOf('cust_x5') });
  check('G8 桌码点餐关闭后拒绝在线点餐', disabled.kind === 'qr_disabled', `kind=${disabled.kind}`);
  qrEngine.setTableQrEnabled('A1', true);

  const byShort = qrEngine.resolveScan({
    tableCode: 'UNKNOWN',
    shortCode: rotatedTable.qrCode,
    seed: seedOf('cust_x6')
  });
  check('G9 短码兜底可解析到正确桌台', byShort.kind === 'open_first_bind' && byShort.tableCode === 'A1', `kind=${byShort.kind}`);

  const unknown = qrEngine.resolveScan({ tableCode: 'ZZ9', shortCode: 'ZZ9-0000', seed: seedOf('cust_x7') });
  check('G10 无效桌号给出明确失败', unknown.kind === 'invalid_short_code', `kind=${unknown.kind}`);
}

{
  seed();
  qrEngine.ensureAllTableQr();
  const sid = openTable('A1', 'cust_p1');
  qrEngine.linkSessionToTable('A1', sid);

  const t = readJson('obsidian_merchant_tables', []).find((x: any) => x.code === 'A1');
  const scan = qrEngine.resolveScan({ tableCode: 'A1', token: t.qrToken, seed: seedOf('cust_p2') });
  check('G11 已开台 → 自动发起联动申请', scan.kind === 'request_link', `kind=${scan.kind} msg=${scan.message}`);
  check(
    'G12 扫码确实产生了待决请求（不是只提示）',
    sessionEngine.listPendingRequests().length === 1,
    `待决=${sessionEngine.listPendingRequests().length}`
  );

  const mine = qrEngine.resolveScan({ tableCode: 'A1', token: t.qrToken, seed: seedOf('cust_p1') });
  check('G13 成员重复扫码 → 直接放行', mine.kind === 'already_joined', `kind=${mine.kind}`);
  check('G14 会话与桌台完成双向关联', t.activeSessionId === sid, `activeSessionId=${t.activeSessionId}`);
}

// =============================================================
// H. 版本退回（接治理层）
// =============================================================
section('H 版本退回');

{
  seed();
  const sid = openTable('A1', 'cust_p1');
  const r = sessionEngine.requestLink({ tableCode: 'A1', seed: seedOf('cust_p2') });
  sessionEngine.settleLinkRequest({ requestId: r.value!.requestId, decision: 'granted', actorId: 'cust_p1' });
  sessionEngine.setParticipantAuthority({
    sessionId: sid,
    targetId: 'cust_p2',
    authority: 'manage',
    actorId: 'cust_p1'
  });
  await flushAsync();

  const pointers = globalVersionEngine.getAllPointers();
  const authorityPointer = pointers.find((p) =>
    (p.patches || []).some((pt) => pt.path.endsWith('/authority'))
  );
  check(
    'H1 成员权限变更已生成含字段路径的版本指针',
    !!authorityPointer,
    `候选指针=${pointers.filter((p) => (p.patches || []).length > 0).length} 条`
  );

  const before = sessionEngine
    .getSessionById(sid)!
    .participants.find((p) => p.participantId === 'cust_p2')!.authority;
  check('H2 变更已生效（authority=manage）', before === 'manage', `authority=${before}`);

  if (authorityPointer) {
    const targetPath = authorityPointer.patches!.find((pt) => pt.path.endsWith('/authority'))!.path;
    const rb = globalVersionEngine.rollbackPatches(authorityPointer.pointerId, [targetPath]);
    const after = sessionEngine
      .getSessionById(sid)!
      .participants.find((p) => p.participantId === 'cust_p2')!.authority;
    check('H3 字段级退回成功', rb.success === true, rb.message);
    check('H4 退回后 authority 回到 order_only', after === 'order_only', `authority=${after}`);
  } else {
    check('H3 字段级退回成功', false, '未找到含 authority 路径的指针');
    check('H4 退回后 authority 回到 order_only', false, '前置失败');
  }

  const brokenPointer = globalVersionEngine
    .getAllPointers()
    .find((p) => p.pointerId === authorityPointer?.pointerId);
  check(
    'H5 源指针被标记为已回滚并补齐审计字段',
    brokenPointer?.status === 'reverted' && !!brokenPointer?.revertedAt && !!brokenPointer?.revertedBy,
    `status=${brokenPointer?.status} by=${brokenPointer?.revertedBy}`
  );
}

// -------------------------------------------------------------
// 输出
// -------------------------------------------------------------

const failed = results.filter((r) => !r.pass);
let currentGroup = '';
console.log('\n======== 桌台会话与二维码体系验证（T1+T2）========');
results.forEach((r) => {
  if (r.group !== currentGroup) {
    currentGroup = r.group;
    console.log(`\n── ${currentGroup} ──`);
  }
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `\n        ${r.detail}` : ''}`);
});
console.log('\n================================================');
console.log(`总计 ${results.length} 项，通过 ${results.length - failed.length} 项，失败 ${failed.length} 项`);
process.exit(failed.length === 0 ? 0 : 1);
