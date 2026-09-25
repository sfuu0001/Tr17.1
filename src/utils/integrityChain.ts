/**
 * 密码学存证链 (Integrity Chain) —— P0-c
 *
 * 修复的问题：
 *   原 generateHash() 实为 32 位 djb2 变体，且把 Date.now() 拼进返回值，
 *   导致「同一份数据两次计算结果不同」—— 不可复现即不可验签。而全项目
 *   不存在任何校验函数，UI 却硬编码显示「校验通过」，"防篡改"并不成立。
 *
 * 本模块提供：
 *   1. 真 SHA-256（crypto.subtle.digest），无第三方依赖；
 *   2. 规范化序列化（键排序 + 递归），消除对象键顺序带来的哈希歧义；
 *   3. 两级哈希：
 *        contentDigest = SHA256(规范化(字段差异 + 补丁 + 快照))
 *        payloadHash   = SHA256(规范化(身份字段 + contentDigest))
 *        chainHash     = SHA256(prevChainHash + ':' + payloadHash)
 *      —— 任何一条记录被增删改，都会从其自身开始断链；
 *   4. verifyChain()：真实校验并定位首处断链，区分
 *      「链被篡改」/「身份字段被改」/「内容被改」/「存证缺失」；
 *   5. 服务端锚定接口占位 —— 前端可信模型下无法自证清白，
 *      最终裁决必须依赖服务端持有的链尾锚点。
 */

import {
  ChainProof,
  ChainVerifyReport,
  MilestoneSnapshot,
  VersionPointer
} from '../types/versionTracking';

export const GENESIS_HASH = '0'.repeat(64);

// -------------------------------------------------------------
// 规范化序列化
// -------------------------------------------------------------

/**
 * 确定性序列化：对象键按字典序排列，递归处理数组与嵌套对象。
 * 这是"同一份数据哈希必须相同"的前提。
 */
export function canonicalize(value: unknown): string {
  if (value === undefined) return '"__undefined__"';
  if (value === null) return 'null';
  const type = typeof value;
  if (type === 'number') {
    // 归一化 -0 与 NaN / Infinity，避免平台差异
    if (Number.isNaN(value as number)) return '"__NaN__"';
    if (!Number.isFinite(value as number)) return value === Infinity ? '"__Infinity__"' : '"__-Infinity__"';
    return String(value);
  }
  if (type === 'boolean') return value ? 'true' : 'false';
  if (type === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (type === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(',')}}`;
  }
  return JSON.stringify(String(value));
}

// -------------------------------------------------------------
// SHA-256
// -------------------------------------------------------------

let sha256Available: boolean | null = null;

function getSubtle(): SubtleCrypto | null {
  const c: any = (globalThis as any).crypto;
  return c && c.subtle ? (c.subtle as SubtleCrypto) : null;
}

export function isCryptoAvailable(): boolean {
  if (sha256Available === null) sha256Available = !!getSubtle();
  return sha256Available;
}

export async function sha256Hex(input: string): Promise<string> {
  const subtle = getSubtle();
  if (!subtle) {
    throw new Error(
      '[IntegrityChain] 当前环境不支持 crypto.subtle（需 HTTPS 或 localhost 安全上下文），无法生成密码学存证'
    );
  }
  const bytes = new TextEncoder().encode(input);
  const digest = await subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// -------------------------------------------------------------
// 记录内容摘要
// -------------------------------------------------------------

/**
 * 被哈希覆盖的内容字段。
 * 注意：绝不包含 updatedAt / chainProof / integrityHash 之类会被
 * 后续流程改写的字段，也不包含 Date.now()，否则哈希不可复现。
 */
function contentProjection(pointer: VersionPointer | MilestoneSnapshot): unknown {
  const p = pointer as VersionPointer;
  const s = pointer as MilestoneSnapshot;
  const isSnapshot = !!s.snapshotId;

  if (isSnapshot) {
    return {
      kind: 'snapshot',
      snapshotId: s.snapshotId,
      title: s.title,
      tag: s.tag,
      createdAt: s.createdAt,
      createdBy: s.createdBy?.id,
      dataSummary: s.dataSummary,
      payload: s.payload
    };
  }

  return {
    kind: 'pointer',
    fieldDiffs: p.fieldDiffs ?? [],
    patches: p.patches ?? [],
    beforeSnapshot: p.beforeSnapshot ?? null,
    afterSnapshot: p.afterSnapshot ?? null,
    rollbackSourcePointerId: p.rollbackSourcePointerId ?? null
  };
}

/** 身份字段（记录不可变的标识与归属） */
function identityProjection(pointer: VersionPointer | MilestoneSnapshot): unknown {
  const p = pointer as VersionPointer;
  const s = pointer as MilestoneSnapshot;
  if (s.snapshotId) {
    return { kind: 'snapshot', snapshotId: s.snapshotId, createdBy: s.createdBy?.id };
  }
  return {
    kind: 'pointer',
    pointerId: p.pointerId,
    versionTag: p.versionTag,
    timestamp: p.timestamp,
    operatorId: p.operator?.id,
    module: p.module,
    entityId: p.entityId,
    entityName: p.entityName,
    actionType: p.actionType,
    actionName: p.actionName
  };
}

export async function computeContentDigest(pointer: VersionPointer | MilestoneSnapshot): Promise<string> {
  return sha256Hex(canonicalize(contentProjection(pointer)));
}

/**
 * 计算链节点。
 * @param prevChainHash 上一条记录的 chainHash（创世用 GENESIS_HASH）
 */
export async function computeChainProof(
  prevChainHash: string,
  pointer: VersionPointer | MilestoneSnapshot
): Promise<ChainProof> {
  const contentDigest = await computeContentDigest(pointer);
  const payloadHash = await sha256Hex(
    canonicalize({ identity: identityProjection(pointer), contentDigest })
  );
  const chainHash = await sha256Hex(`${prevChainHash || GENESIS_HASH}:${payloadHash}`);
  return {
    algorithm: 'SHA-256',
    contentDigest,
    payloadHash,
    prevChainHash: prevChainHash || GENESIS_HASH,
    chainHash
  };
}

// -------------------------------------------------------------
// 校验
// -------------------------------------------------------------

/**
 * 校验整条链。
 *
 * @param pointers 存储中的记录（**倒序存储**：新记录在前，链按正序计算）
 * @param options.fullContentCheck 是否逐条重算内容摘要。
 *        fullContentCheck=false 时只校验链结构（适用于记录量很大、或内容已归档的场景）。
 */
export async function verifyChain(
  pointers: Array<VersionPointer | MilestoneSnapshot>,
  options: { fullContentCheck?: boolean } = {}
): Promise<ChainVerifyReport> {
  const fullContentCheck = options.fullContentCheck !== false;
  const ordered = [...pointers].reverse();

  let prev = GENESIS_HASH;
  const broken: string[] = [];
  let firstBrokenAt: ChainVerifyReport['firstBrokenAt'];

  for (const node of ordered) {
    const id = (node as VersionPointer).pointerId || (node as MilestoneSnapshot).snapshotId;
    const tag = (node as VersionPointer).versionTag || (node as MilestoneSnapshot).tagLabel || id;

    if (!node.chainProof) {
      broken.push(id);
      if (!firstBrokenAt) {
        firstBrokenAt = {
          pointerId: id,
          versionTag: tag,
          expectedChainHash: '(有待补算)',
          actualChainHash: '(缺失)',
          reason: 'missing_proof'
        };
      }
      prev = GENESIS_HASH;
      continue;
    }

    const expected = await computeChainProof(prev, node);

    // 1) 内容是否被改写（已归档的记录跳过，其内容摘要不再具备可比性）
    const archived = !!(node as VersionPointer).contentArchived;
    if (fullContentCheck && !archived && expected.contentDigest !== node.chainProof.contentDigest) {
      broken.push(id);
      if (!firstBrokenAt) {
        firstBrokenAt = {
          pointerId: id,
          versionTag: tag,
          expectedChainHash: expected.chainHash,
          actualChainHash: node.chainProof.chainHash,
          reason: 'content_modified'
        };
      }
    }

    // 2) 身份字段是否被改写
    if (expected.payloadHash !== node.chainProof.payloadHash) {
      broken.push(id);
      if (!firstBrokenAt) {
        firstBrokenAt = {
          pointerId: id,
          versionTag: tag,
          expectedChainHash: expected.chainHash,
          actualChainHash: node.chainProof.chainHash,
          reason: 'payload_modified'
        };
      }
    }

    // 3) 链结构是否被破坏
    if (expected.chainHash !== node.chainProof.chainHash) {
      if (!broken.includes(id)) broken.push(id);
      if (!firstBrokenAt) {
        firstBrokenAt = {
          pointerId: id,
          versionTag: tag,
          expectedChainHash: expected.chainHash,
          actualChainHash: node.chainProof.chainHash,
          reason: 'chain_mismatch'
        };
      }
    }

    prev = node.chainProof.chainHash;
  }

  return {
    valid: broken.length === 0,
    checkedCount: ordered.length,
    brokenPointerIds: broken,
    firstBrokenAt,
    verifiedAt: new Date().toISOString()
  };
}

/** 快速校验：只检测链结构，不重算内容（用于大记录量的首屏体检） */
export async function verifyChainStructure(
  pointers: Array<VersionPointer | MilestoneSnapshot>
): Promise<ChainVerifyReport> {
  return verifyChain(pointers, { fullContentCheck: false });
}

// -------------------------------------------------------------
// 服务端锚定（前端可信模型的必要补充）
// -------------------------------------------------------------

export interface ChainAnchorResult {
  anchorId: string;
  chainTailHash: string;
  anchoredAt: string;
  /** 未配置服务端锚定时的降级说明 */
  degraded?: boolean;
  message: string;
}

/**
 * 把链尾哈希推送到服务端留档。
 *
 * 为什么必须做：纯前端 localStorage 模型下，任何用户都可以打开 DevTools
 * 修改数据并重算整条链，前端无法自证清白。只有服务端持有独立的链尾锚点，
 * 才可能发现"整链被重算"这类攻击。
 *
 * @param uploader 由调用方注入的上传实现（例如 CloudBase 云函数调用）。
 *                 未注入时返回 degraded 结果，不伪造成功。
 */
export async function anchorChainTail(
  pointers: Array<VersionPointer | MilestoneSnapshot>,
  uploader?: (payload: { chainTailHash: string; pointerCount: number; tailPointerId: string }) => Promise<{ anchorId: string }>
): Promise<ChainAnchorResult> {
  const ordered = [...pointers].reverse();
  const tail = ordered[ordered.length - 1];
  const chainTailHash = tail?.chainProof?.chainHash ?? GENESIS_HASH;
  const tailPointerId =
    (tail as VersionPointer)?.pointerId || (tail as MilestoneSnapshot)?.snapshotId || '(empty)';
  const anchoredAt = new Date().toISOString();

  if (!uploader) {
    return {
      anchorId: '',
      chainTailHash,
      anchoredAt,
      degraded: true,
      message:
        '未接入服务端锚定：当前为纯前端可信模型，链尾哈希仅存本地，无法抵御"整链重算"攻击。请在部署时注入 uploader（CloudBase 云函数）以启用真正的防篡改裁决。'
    };
  }

  const res = await uploader({ chainTailHash, pointerCount: ordered.length, tailPointerId });
  return {
    anchorId: res.anchorId,
    chainTailHash,
    anchoredAt,
    message: `链尾哈希已锚定至服务端，锚点 ID: ${res.anchorId}`
  };
}
