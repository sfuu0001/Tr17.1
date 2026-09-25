/**
 * 字段级补丁引擎 (Patch Engine) —— P2-a
 *
 * 为什么需要它：
 *   改造前 FieldDiff 只是"给人看的展示对象"，回滚必须依赖完整 beforeSnapshot
 *   做整实体浅合并（`{...current, ...beforeSnapshot}`），带来两个后果：
 *     1. 存储层一旦对快照"脱水"，历史版本就永久失去回滚能力；
 *     2. 回滚的最小粒度是整实体，无法只修某一个字段。
 *
 *   本模块把变更表达为 RFC 6902 风格的逆向补丁，路径可深入到嵌套字段
 *   （如 /variants/0/price）。于是：
 *     - 回滚 = 按 path 应用补丁，天然字段级精准；
 *     - 不再需要完整 beforeSnapshot，存储体积下降 1-2 个数量级；
 *     - 每条补丁自带 expectedCurrent，可直接做乐观并发校验。
 *
 * 本模块是纯函数，不触碰任何存储，便于单测。
 */

import { FieldPatch, PatchOp } from '../types/versionTracking';

// -------------------------------------------------------------
// RFC 6901 JSON Pointer
// -------------------------------------------------------------

/** 转义指针 token：~ → ~0，/ → ~1 */
export function escapePointerToken(token: string): string {
  return String(token).replace(/~/g, '~0').replace(/\//g, '~1');
}

export function unescapePointerToken(token: string): string {
  return String(token).replace(/~1/g, '/').replace(/~0/g, '~');
}

export function joinPointer(path: string, token: string | number): string {
  return `${path}/${escapePointerToken(String(token))}`;
}

export function parsePointer(path: string): string[] {
  if (!path || path === '/') return [];
  return path
    .split('/')
    .slice(1)
    .map(unescapePointerToken);
}

/** 读取指针指向的值；不存在时返回 undefined */
export function getByPointer(root: unknown, path: string): unknown {
  const tokens = parsePointer(path);
  let cursor: any = root;
  for (const token of tokens) {
    if (cursor === null || cursor === undefined) return undefined;
    cursor = cursor[token];
  }
  return cursor;
}

/**
 * 不可变写入：返回新的 root，不修改入参。
 * op 为 'remove' 时删除该 token；数组删除会 splice 以保持紧凑。
 */
export function setByPointer(
  root: unknown,
  path: string,
  value: unknown,
  op: PatchOp = 'replace'
): unknown {
  const tokens = parsePointer(path);
  if (tokens.length === 0) {
    return op === 'remove' ? undefined : value;
  }

  const clone = (node: any): any => {
    if (Array.isArray(node)) return node.slice();
    if (node && typeof node === 'object') return { ...node };
    return node === undefined || node === null ? {} : { [String(node)]: node };
  };

  const next = clone(root);
  let cursor: any = next;
  for (let i = 0; i < tokens.length - 1; i += 1) {
    const token = tokens[i];
    cursor[token] = clone(cursor[token]);
    cursor = cursor[token];
  }

  const last = tokens[tokens.length - 1];
  if (op === 'remove') {
    if (Array.isArray(cursor)) {
      const idx = Number(last);
      if (Number.isInteger(idx) && idx >= 0 && idx < cursor.length) cursor.splice(idx, 1);
    } else if (cursor && typeof cursor === 'object') {
      delete cursor[last];
    }
  } else {
    cursor[last] = value;
  }
  return next;
}

// -------------------------------------------------------------
// 差异比对 → 补丁
// -------------------------------------------------------------

export interface RawPatch {
  path: string;
  op: PatchOp;
  /** 变更前的值（逆向恢复用） */
  oldValue: unknown;
  /** 变更后的值（乐观并发基准） */
  newValue: unknown;
  /** 最小可读字段名，用于展示与标签映射 */
  field: string;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function stableStringify(v: unknown): string {
  if (v === undefined) return '__undefined__';
  return JSON.stringify(v);
}

const DEFAULT_IGNORED_KEYS = ['updatedAt', 'createdAt', 'lastModified', 'pointerId', 'chainProof', 'integrityHash'];

export interface DiffOptions {
  /** 不参与差异计算的字段名 */
  ignoredKeys?: string[];
  /** 忽略字段的最大递归深度，超过则以整个子树为原子变更 */
  maxDepth?: number;
  /** 当前深度（内部使用） */
  _depth?: number;
  /** 当前路径（内部使用） */
  _path?: string;
}

/**
 * 递归生成最小补丁集。
 * 对象 → 按键递归；数组 → 按下标递归（长度差转为 add/remove）；标量 → replace。
 */
export function diffToPatches(
  before: unknown,
  after: unknown,
  options: DiffOptions = {}
): RawPatch[] {
  const ignored = new Set(options.ignoredKeys ?? DEFAULT_IGNORED_KEYS);
  const maxDepth = options.maxDepth ?? 4;
  const depth = options._depth ?? 0;
  const basePath = options._path ?? '';

  if (stableStringify(before) === stableStringify(after)) return [];

  // 深度超限：整棵子树作为原子 replace
  if (depth >= maxDepth) {
    return [
      {
        path: basePath || '/',
        op: 'replace',
        oldValue: before,
        newValue: after,
        field: lastToken(basePath)
      }
    ];
  }

  // 对象递归
  if (isPlainObject(before) && isPlainObject(after)) {
    const patches: RawPatch[] = [];
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    keys.forEach((key) => {
      if (ignored.has(key)) return;
      const childPath = joinPointer(basePath, key);
      const beforeHas = Object.prototype.hasOwnProperty.call(before, key);
      const afterHas = Object.prototype.hasOwnProperty.call(after, key);

      if (beforeHas && !afterHas) {
        patches.push({ path: childPath, op: 'remove', oldValue: before[key], newValue: undefined, field: key });
        return;
      }
      if (!beforeHas && afterHas) {
        patches.push({ path: childPath, op: 'add', oldValue: undefined, newValue: after[key], field: key });
        return;
      }
      patches.push(
        ...diffToPatches(before[key], after[key], {
          ...options,
          ignoredKeys: options.ignoredKeys,
          maxDepth,
          _depth: depth + 1,
          _path: childPath
        })
      );
    });
    return patches;
  }

  // 数组递归
  if (Array.isArray(before) && Array.isArray(after)) {
    const patches: RawPatch[] = [];
    const maxLen = Math.max(before.length, after.length);
    for (let i = 0; i < maxLen; i += 1) {
      const childPath = joinPointer(basePath, i);
      if (i >= before.length) {
        patches.push({ path: childPath, op: 'add', oldValue: undefined, newValue: after[i], field: String(i) });
      } else if (i >= after.length) {
        patches.push({ path: childPath, op: 'remove', oldValue: before[i], newValue: undefined, field: String(i) });
      } else {
        patches.push(
          ...diffToPatches(before[i], after[i], {
            ...options,
            ignoredKeys: options.ignoredKeys,
            maxDepth,
            _depth: depth + 1,
            _path: childPath
          })
        );
      }
    }
    return patches;
  }

  // 标量或类型变化
  return [
    {
      path: basePath || '/',
      op: before === undefined ? 'add' : after === undefined ? 'remove' : 'replace',
      oldValue: before,
      newValue: after,
      field: lastToken(basePath)
    }
  ];
}

function lastToken(path: string): string {
  const tokens = parsePointer(path);
  return tokens.length ? tokens[tokens.length - 1] : 'root';
}

/**
 * 生成可直接用于回滚的 FieldPatch 列表。
 * expectedCurrent 取变更后的值 —— 回滚前用它做乐观并发校验。
 */
export function buildFieldPatches(
  targetKey: string,
  entityId: string,
  before: unknown,
  after: unknown,
  labelOf: (field: string) => string = (f) => f,
  options: DiffOptions = {}
): FieldPatch[] {
  return diffToPatches(before, after, options).map((raw) => ({
    targetKey,
    entityId,
    path: raw.path,
    op: raw.op,
    value: raw.oldValue,
    expectedCurrent: raw.newValue,
    fieldLabel: labelOf(raw.field)
  }));
}

/**
 * 应用逆向前把某条补丁的字段值改回 value。
 * 返回新的 root（不可变）。
 */
export function applyPatchToRoot(root: unknown, patch: FieldPatch): unknown {
  return setByPointer(root, patch.path, patch.value, patch.op);
}

// -------------------------------------------------------------
// 乐观并发校验
// -------------------------------------------------------------

export interface PatchConflict {
  path: string;
  fieldLabel: string;
  expected: unknown;
  actual: unknown;
}

/**
 * 逐条比对补丁的 expectedCurrent 与当前实际值。
 * @param readRoot 返回该补丁所属实体的当前值
 */
export function detectPatchConflicts(
  patches: FieldPatch[],
  readRoot: (patch: FieldPatch) => unknown
): PatchConflict[] {
  const conflicts: PatchConflict[] = [];
  patches.forEach((patch) => {
    const root = readRoot(patch);
    const actual = getByPointer(root, patch.path);
    if (stableStringify(actual) !== stableStringify(patch.expectedCurrent)) {
      conflicts.push({
        path: patch.path,
        fieldLabel: patch.fieldLabel,
        expected: patch.expectedCurrent,
        actual
      });
    }
  });
  return conflicts;
}

/** 反向补丁：把 after 恢复成 before（用于"撤销本次回滚"） */
export function invertPatches(patches: FieldPatch[]): FieldPatch[] {
  return patches.map((p) => ({
    ...p,
    op: p.op === 'add' ? 'remove' : p.op === 'remove' ? 'add' : 'replace',
    value: p.expectedCurrent,
    expectedCurrent: p.value
  }));
}

export function summarizePatches(patches: FieldPatch[], limit = 3): string {
  const shown = patches.slice(0, limit).map((p) => `${p.fieldLabel}(${p.path})`);
  const suffix = patches.length > limit ? ` 等 ${patches.length} 处` : '';
  return `${shown.join('、')}${suffix}`;
}
