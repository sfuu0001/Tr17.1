/* ============================================================================
 * MerchantQrManageModal —— 桌码管理（T3-5）
 * ----------------------------------------------------------------------------
 * SPEC §3.1：单桌卡片（预览/短码/版本）+ 轮换（宽限期说明）+ 启停 + 打印。
 * 数据源：ensureAllTableQr() 幂等补齐 + getQrPrintSource()。
 * ==========================================================================*/

import React, { useMemo, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Eye, EyeOff, QrCode, Trash2 } from 'lucide-react';
import {
  ensureAllTableQr,
  ensureTableQr,
  rotateTableQr,
  setTableQrEnabled,
  getQrPayloadByTableCode,
  buildQrUrl
} from '../../../utils/tableQrEngine';
import { getMerchantTables, saveMerchantTables } from '../../../utils/tableStorage';
import { softDeleteToRecycleBin } from '../../../utils/recycleBinEngine';
import type { TableItem } from '../../../types';

interface MerchantQrManageModalProps {
  open: boolean;
  onClose: () => void;
  showToast: (msg: string) => void;
}

export function MerchantQrManageModal({ open, onClose, showToast }: MerchantQrManageModalProps) {
  const [tables, setTables] = useState<TableItem[]>(() => {
    const raw = getMerchantTables();
    return raw.map((t) => ensureTableQr(t));
  });
  const [confirmRotate, setConfirmRotate] = useState<string | null>(null);
  const [confirmRetire, setConfirmRetire] = useState<TableItem | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => setTables(getMerchantTables().map((t) => ensureTableQr(t)));

  // 在挂载时异步补齐未落盘的桌码配置，避免在 render 过程中调用 saveMerchantTables 同步触发其他组件 setState
  useEffect(() => {
    const raw = getMerchantTables();
    let changed = false;
    const next = raw.map((t) => {
      const ensured = ensureTableQr(t);
      if (ensured !== t) changed = true;
      return ensured;
    });
    if (changed) {
      saveMerchantTables(next);
    }
  }, []);

  // 双向动态同步：监听食客端与外部桌台状态更新
  useEffect(() => {
    const handleTablesUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<TableItem[]>;
      if (customEvent.detail && Array.isArray(customEvent.detail)) {
        setTables(customEvent.detail);
      } else {
        refresh();
      }
    };
    const handleStorage = (e: StorageEvent) => {
      // 统一回收站恢复联动：tableStorage 实际键为 obsidian_merchant_tables
      // （原 urban_radar_merchant_tables 为历史笔误，恢复事件永远匹配不上）
      if (e.key === 'obsidian_merchant_tables') {
        refresh();
      }
    };

    window.addEventListener('obsidian_tables_updated', handleTablesUpdated);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('obsidian_tables_updated', handleTablesUpdated);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const pausedCount = useMemo(
    () => tables.filter((t) => t.qrEnabled === false).length,
    [tables]
  );

  const handleRotate = (code: string) => {
    setBusy(true);
    try {
      const res = rotateTableQr(code);
      showToast(res.message);
      setConfirmRotate(null);
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleToggle = (code: string, enabled: boolean) => {
    const res = setTableQrEnabled(code, enabled);
    showToast(res.message);
    refresh();
  };

  // 移除此桌（统一回收站：桌台及其二维码配置整快照入站，30 天可恢复）
  const handleRetire = (t: TableItem) => {
    // 以落盘最新态为准做业务拦截，避免用本地过期状态误判
    const latest = getMerchantTables().find((x) => x.id === t.id) ?? t;
    if (latest.status === 'dining' || latest.status === 'cleaning') {
      showToast(`【${t.code}】号桌正在使用中（就餐/保洁），请先作废订单并清台后再移除`);
      setConfirmRetire(null);
      return;
    }
    const current = getMerchantTables();
    softDeleteToRecycleBin({
      type: 'table_qr',
      typeLabel: '桌台二维码',
      refId: latest.id,
      label: `${latest.code} 号桌（${latest.name}）`,
      snapshot: latest,
      storageKey: 'obsidian_merchant_tables',
      container: 'array',
      idField: 'id'
    });
    saveMerchantTables(current.filter((x) => x.id !== latest.id));
    showToast(`【${latest.code}】号桌及桌码已移除，30 天内可在统一回收站恢复`);
    setConfirmRetire(null);
    refresh();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[80] bg-dark-container/60"
          />
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            role="dialog"
            aria-label="桌码管理"
            className="fixed z-[81] inset-x-4 top-[6vh] max-h-[86vh] mx-auto max-w-2xl bg-card-bg border border-border-main rounded-console-xl flex flex-col overflow-hidden"
          >
            <div className="bg-dark-container px-5 py-3.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-white">桌码管理（{tables.length} 桌）</p>
                <div className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-white/80">
                  <span>显示 {tables.length - pausedCount}</span>
                  <span>/</span>
                  <span className={pausedCount > 0 ? 'text-status-terracotta font-bold' : ''}>
                    隐藏 {pausedCount}
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-console flex items-center justify-center text-white/70 hover:text-white cursor-pointer"
                aria-label="关闭"
              >
                ✕
              </button>
            </div>

            {pausedCount > 0 && (
              <div className="px-5 py-2 bg-status-terracotta/10 border-b border-status-terracotta shrink-0">
                <p className="text-xs text-status-terracotta">
                  ⚠ 当前 {pausedCount} 桌处于暂停状态，顾客扫码将无法点餐
                </p>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 tablet:grid-cols-2 gap-3">
              {tables.map((t) => {
                const payload = getQrPayloadByTableCode(t.code);
                const enabled = t.qrEnabled !== false;
                return (
                  <div
                    key={t.id}
                    className="bg-page-bg border border-border-main rounded-console p-4 flex gap-4"
                  >
                    {/* 二维码占位（url 供打印模块渲染真码；控制台用短码大字呈现） */}
                    <div className="w-20 h-20 shrink-0 bg-card-bg border border-border-main rounded-console flex flex-col items-center justify-center">
                      <span className="text-2xl">▣</span>
                      <span className="text-[10px] text-text-muted mt-1">v{t.qrVersion ?? 1}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-text-prominent">{t.code} 号桌</span>
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            enabled ? 'bg-status-olive' : 'bg-status-terracotta'
                          }`}
                        />
                        <span className="text-xs text-text-muted">
                          {enabled ? '启用中' : '已暂停'}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted mb-0.5">
                        短码：
                        <span className="font-mono text-text-prominent">
                          {t.qrCode || payload?.shortCode || '—'}
                        </span>
                      </p>
                      <p className="text-[10px] font-mono text-text-muted truncate mb-2">
                        {payload?.url || buildQrUrl(t.code, t.qrToken as string)}
                      </p>

                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => setConfirmRotate(t.code)}
                          disabled={busy}
                          className="h-7 px-2.5 rounded-console bg-card-bg border border-border-main text-xs text-text-secondary hover:border-accent-orange"
                        >
                          轮换二维码
                        </button>
                        <button
                          onClick={() => handleToggle(t.code, !enabled)}
                          className={`h-7 px-2.5 rounded-console flex items-center gap-1.5 text-xs font-medium border transition-colors cursor-pointer ${
                            enabled
                              ? 'bg-card-bg border-border-main text-text-secondary hover:border-status-terracotta hover:text-status-terracotta'
                              : 'bg-status-terracotta/10 border-status-terracotta/40 text-status-terracotta'
                          }`}
                        >
                          {enabled ? (
                            <>
                              <EyeOff className="w-3 h-3 text-status-terracotta" />
                              <span>隐藏桌码 (暂停)</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3 text-status-olive" />
                              <span>显示桌码 (恢复)</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => showToast(`已发送 ${t.code} 号桌桌码至打印队列`)}
                          className="h-7 px-2.5 rounded-console bg-slate-blue text-xs text-white"
                        >
                          打印此桌
                        </button>
                        <button
                          onClick={() => setConfirmRetire(t)}
                          disabled={busy}
                          className="h-7 px-2.5 rounded-console flex items-center gap-1 bg-card-bg border border-border-main text-xs text-text-secondary hover:border-status-terracotta hover:text-status-terracotta transition-colors cursor-pointer"
                          title="移除此桌（桌台及桌码进入统一回收站，30 天可恢复）"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>移除此桌</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 轮换二次确认：必须包含两条事实（宽限期 / 需重印） */}
            <AnimatePresence>
              {confirmRotate && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 bg-dark-container/60 flex items-center justify-center p-6"
                >
                  <div className="w-full max-w-sm bg-card-bg rounded-console-xl p-6">
                    <p className="text-sm font-bold text-text-prominent mb-3">
                      确认轮换 {confirmRotate} 号桌二维码？
                    </p>
                    <ul className="text-xs text-text-secondary space-y-1.5 mb-5 list-disc list-inside">
                      <li>旧码在 10 分钟内仍可使用（宽限期），期间扫码的顾客会自动引导到新码</li>
                      <li>立牌需重新打印</li>
                    </ul>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setConfirmRotate(null)}
                        className="flex-1 h-10 rounded-console border border-border-main text-sm text-text-secondary"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => handleRotate(confirmRotate)}
                        disabled={busy}
                        className={`flex-1 h-10 rounded-console text-white text-sm font-medium ${
                          busy ? 'bg-border-main' : 'bg-accent-orange'
                        }`}
                      >
                        {busy ? '轮换中…' : '确认轮换'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 移除此桌二次确认：必须包含两条事实（业务拦截规则 / 回收站可恢复） */}
            <AnimatePresence>
              {confirmRetire && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 bg-dark-container/60 flex items-center justify-center p-6"
                >
                  <div className="w-full max-w-sm bg-card-bg rounded-console-xl p-6">
                    <p className="text-sm font-bold text-text-prominent mb-3">
                      确认移除 {confirmRetire.code} 号桌（{confirmRetire.name}）？
                    </p>
                    <ul className="text-xs text-text-secondary space-y-1.5 mb-5 list-disc list-inside">
                      <li>就餐中 / 保洁中的桌台不可移除，需先作废订单并清台</li>
                      <li>桌台与二维码配置整快照进入统一回收站，30 天内可一键恢复</li>
                      <li>恢复后桌号、短码与当前有效令牌原样还原，无需重新打印</li>
                    </ul>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setConfirmRetire(null)}
                        className="flex-1 h-10 rounded-console border border-border-main text-sm text-text-secondary"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => handleRetire(confirmRetire)}
                        disabled={busy}
                        className={`flex-1 h-10 rounded-console text-white text-sm font-medium ${
                          busy ? 'bg-border-main' : 'bg-status-terracotta'
                        }`}
                      >
                        {busy ? '移除中…' : '确认移除'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
