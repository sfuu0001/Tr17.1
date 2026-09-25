/* ============================================================================
 * TableScanLanding —— 扫码落点页（T3-2）
 * ----------------------------------------------------------------------------
 * resolveScan() 的 8 种 kind 一一映射为分支（SPEC §2.2）：
 * 禁止在本组件内自写判定逻辑 —— 判定权在数据层。
 * ==========================================================================*/

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import { ScanResolution, ScanOutcomeKind } from '../../types/tableSession';
import { useTableSessionUi } from './useTableSessionUi';
import { TableFirstBindForm } from './TableFirstBindForm';

interface TableScanLandingProps {
  /** 从 URL / 扫码得到的桌号与令牌 */
  tableCode?: string;
  token?: string;
  shortCode?: string;
  /** 手动短码重试 / 成功进入菜单的回调 */
  onEntered: () => void;
  /** 关闭 / 返回主界面回调 */
  onClose?: () => void;
  /** 切换至桌台矩阵选座开台回调 */
  onOpenMatrix?: () => void;
  showToast?: (msg: string) => void;
}

/** 状态插画区文案（8 分支共享外壳，分支只换内容区） */
function branchContent(res: ScanResolution): {
  title: string;
  desc: string;
  icon: string;
  tone: 'orange' | 'neutral' | 'terracotta' | 'blue';
  retryable: boolean;
} {
  switch (res.kind) {
    case 'open_first_bind':
      return { title: '你是本桌第一位点餐的人', desc: `即将开通 ${res.tableCode ?? ''} 号桌`, icon: '🪑', tone: 'orange', retryable: false };
    case 'request_link':
      return { title: '本桌已开台', desc: '正在请求同桌成员授权…', icon: '🔗', tone: 'blue', retryable: false };
    case 'already_joined':
      return { title: '欢迎回来', desc: res.message, icon: '✅', tone: 'olive' as never as 'blue', retryable: false };
    case 'qr_disabled':
      return { title: '本桌暂未开放扫码点餐', desc: '请联系服务员点餐，或呼叫服务员协助', icon: '🚫', tone: 'neutral', retryable: false };
    case 'table_busy_binding':
      return { title: '有人正在绑定本桌', desc: res.message, icon: '⏳', tone: 'terracotta', retryable: true };
    case 'token_grace_redirect':
      return { title: '正在为你更新桌码…', desc: res.message, icon: '🔄', tone: 'blue', retryable: false };
    case 'token_expired':
      return { title: '桌码已更新', desc: '请输入立牌下方的人眼可读短码，或呼叫服务员协助', icon: '📟', tone: 'terracotta', retryable: true };
    case 'invalid_short_code':
    default:
      return { title: '未识别到有效桌号', desc: res.message, icon: '❓', tone: 'neutral', retryable: true };
  }
}

export function TableScanLanding({
  tableCode: initialCode,
  token: initialToken,
  shortCode: initialShortCode,
  onEntered,
  onClose,
  onOpenMatrix,
  showToast
}: TableScanLandingProps) {
  const { identity, actions } = useTableSessionUi();
  const [resolution, setResolution] = useState<ScanResolution | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [retryLockUntil, setRetryLockUntil] = useState(0);
  const [redirecting, setRedirecting] = useState(false);

  // 首次进入：立即执行一次 resolveScan
  useEffect(() => {
    if (!identity || !initialCode) return;
    const res = actions.scan(initialCode, initialToken, initialShortCode);
    // 宽限期重定向：无感重扫，不渲染中间态
    if (res.kind === 'token_grace_redirect' && res.redirectToken && res.tableCode) {
      setRedirecting(true);
      const next = actions.scan(res.tableCode, res.redirectToken);
      setRedirecting(false);
      if (next.kind === 'token_grace_redirect') {
        // 防御：不应出现二次宽限，兜底落 expired 分支
        setResolution({ ...next, kind: 'token_expired' });
      } else {
        setResolution(next);
      }
      return;
    }
    setResolution(res);
    // already_joined → 直接进入菜单
    if (res.kind === 'already_joined') {
      const timer = setTimeout(() => onEntered(), 600);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity, initialCode]);

  const content = useMemo(() => (resolution ? branchContent(resolution) : null), [resolution]);

  const handleRetry = () => {
    const code = (manualCode || initialCode || '').trim();
    if (!code || Date.now() < retryLockUntil) return;
    const res = actions.scan(code, undefined, manualCode || undefined);
    if (res.kind === 'table_busy_binding') {
      // 防连点风暴：30s 内不可重试
      setRetryLockUntil(Date.now() + 30_000);
    }
    if (res.kind === 'already_joined') {
      onEntered();
      return;
    }
    setResolution(res);
  };

  /* ---- 分支直达子流程 ---- */
  if (resolution?.kind === 'open_first_bind' && resolution.tableId && resolution.tableCode) {
    return (
      <TableFirstBindForm
        tableId={resolution.tableId}
        tableCode={resolution.tableCode}
        onEntered={onEntered}
        showToast={showToast}
      />
    );
  }

  if (resolution?.kind === 'request_link' && resolution.tableCode) {
    return (
      <TableLinkRequestLauncher
        tableCode={resolution.tableCode}
        onEntered={onEntered}
        showToast={showToast}
      />
    );
  }

  // 无扫码参数（如直接切到堂食模式）：渲染手动输入态而非永久"识别中"
  const awaitingInput = !resolution && !initialCode;

  if (redirecting || (!content && !awaitingInput) || (!content && !awaitingInput && resolution)) {
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center">
        <div className="text-text-muted text-sm">正在识别桌码…</div>
      </div>
    );
  }

  if (awaitingInput) {
    return (
      <div className="min-h-screen bg-page-bg flex flex-col items-center justify-center px-6 relative">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white border border-border-main flex items-center justify-center text-text-secondary hover:text-text-prominent shadow-xs cursor-pointer z-20"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <div className="w-full max-w-md bg-card-bg border border-border-main rounded-console-xl p-8 text-center shadow-sm">
          <div className="text-5xl mb-4">📷</div>
          <h1 className="text-lg font-bold text-text-prominent mb-2">扫描桌牌二维码开始点餐</h1>
          <p className="text-sm text-text-secondary mb-6">
            或输入桌牌下方的人眼可读短码
          </p>
          <div className="flex gap-2 mb-3">
            <input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="短码，如 A1-8FZ4"
              className="flex-1 h-11 px-3 rounded-console bg-page-bg border border-border-main text-text-prominent text-sm font-mono focus:outline-none focus:border-accent-orange"
            />
            <button
              onClick={handleRetry}
              className="h-11 px-5 rounded-console bg-accent-orange text-white text-sm font-medium hover:bg-accent-orange/90 active:scale-95 transition-all cursor-pointer"
            >
              进入
            </button>
          </div>
          <div className="flex flex-col gap-2 items-center">
            <button
              onClick={() => (window.location.href = 'tel:')}
              className="text-sm text-slate-blue underline underline-offset-4 cursor-pointer"
            >
              呼叫服务员协助
            </button>
            {onOpenMatrix && (
              <button
                type="button"
                onClick={onOpenMatrix}
                className="mt-2 text-xs text-accent-orange font-medium hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>无桌码？打开桌台矩阵直接选座</span>
                <span>→</span>
              </button>
            )}
          </div>
        </div>
        {identity?.mode === 'device_local' && (
          <p className="text-xs text-status-terracotta mt-4">
            ⚠ 当前为设备内有效模式：换设备需重新申请授权
          </p>
        )}
      </div>
    );
  }

  const retryLocked = Date.now() < retryLockUntil;

  return (
    <div className="min-h-screen bg-page-bg flex flex-col items-center justify-center px-6 relative">
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white border border-border-main flex items-center justify-center text-text-secondary hover:text-text-prominent shadow-xs cursor-pointer z-20"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      {/* device_local 降级警示条（不可关闭，高度 ≤48px） */}
      {identity?.mode === 'device_local' && (
        <div className="fixed top-0 inset-x-0 h-12 bg-status-terracotta/10 border-b border-status-terracotta flex items-center justify-center px-4 z-50">
          <span className="text-xs text-status-terracotta truncate">
            ⚠ 当前为设备内有效模式：点餐身份仅本设备有效，换设备需重新申请授权
          </span>
        </div>
      )}

      <div className="w-full max-w-md bg-card-bg border border-border-main rounded-console-xl p-8 flex flex-col items-center text-center mt-12">
        <div className="w-40 h-40 rounded-console-lg bg-page-bg flex items-center justify-center text-6xl mb-6">
          {content.icon}
        </div>
        <h1 className="text-xl font-bold text-text-prominent mb-2">{content.title}</h1>
        <p className="text-sm text-text-secondary mb-6 leading-relaxed">{content.desc}</p>

        {/* 手动短码输入（token_expired / invalid_short_code / table_busy_binding） */}
        {content.retryable && (
          <div className="w-full flex gap-2 mb-3">
            <input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="输入立牌短码，如 A1-8FZ4"
              className="flex-1 h-11 px-3 rounded-console bg-page-bg border border-border-main text-text-prominent text-sm font-mono focus:outline-none focus:border-accent-orange"
            />
            <button
              onClick={handleRetry}
              disabled={retryLocked}
              className={`h-11 px-5 rounded-console text-sm font-medium text-white ${
                retryLocked ? 'bg-border-main text-text-muted cursor-not-allowed' : 'bg-accent-orange'
              }`}
            >
              {retryLocked ? '稍候重试' : '重试'}
            </button>
          </div>
        )}

        {content.retryable && (
          <p className="text-xs text-text-muted mb-3">
            {resolution.kind === 'table_busy_binding' && '30 秒后可重试，避免频繁刷新'}
            {resolution.kind === 'token_expired' && '短码印在桌牌二维码下方'}
            {resolution.kind === 'invalid_short_code' && '也可呼叫服务员协助'}
          </p>
        )}

        <button
          onClick={() => window.location.href = 'tel:'}
          className="text-sm text-slate-blue underline underline-offset-4"
        >
          呼叫服务员协助
        </button>
      </div>

      {/* 首扫合规告知（仅首绑分支之前展示一次） */}
      <p className="text-xs text-text-muted mt-6 max-w-md text-center leading-relaxed">
        扫码即表示同意你的点餐行为数据用于本桌协同点餐与商家运营分析，明细保留 30 天
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * request_link 分支：发起申请后交给等待页（TableLinkWaiting）
 * ------------------------------------------------------------------------- */
import { TableLinkWaiting } from './TableLinkWaiting';

function TableLinkRequestLauncher({
  tableCode,
  onEntered,
  showToast
}: {
  tableCode: string;
  onEntered: () => void;
  showToast?: (msg: string) => void;
}) {
  const { pendingLinkRequest, actions } = useTableSessionUi();

  useEffect(() => {
    if (!pendingLinkRequest) {
      const res = actions.requestLink(tableCode);
      if (!res.ok && showToast) showToast(res.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <TableLinkWaiting
      tableCode={tableCode}
      onGranted={onEntered}
      showToast={showToast}
    />
  );
}
