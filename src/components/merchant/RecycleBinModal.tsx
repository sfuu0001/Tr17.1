/* ============================================================================
 * RecycleBinModal —— 统一回收站弹窗（2026-09-16）
 * ----------------------------------------------------------------------------
 * - 保留期 30 天，列表显示剩余保留天数；
 * - 恢复：一键写回原模块（源 storage 键）；
 * - 彻底删除：仅品牌总部 (HQ) 身份可用（二次权限，confirm 双确认）；
 * - 实时刷新：subscribeRecycleBin。
 * ============================================================================*/
import React, { useEffect, useMemo, useState } from 'react';
import { Trash2, RotateCcw, ShieldAlert, X } from 'lucide-react';
import {
  getRecycleBinEntries,
  restoreFromRecycleBin,
  purgeFromRecycleBin,
  subscribeRecycleBin,
  RECYCLE_BIN_RETENTION_DAYS,
  RecycleBinEntry
} from '../../utils/recycleBinEngine';
import { globalFranchiseEngine } from '../../utils/franchiseTenantEngine';

interface RecycleBinModalProps {
  open: boolean;
  onClose: () => void;
  showToast?: (msg: string) => void;
}

export const RecycleBinModal: React.FC<RecycleBinModalProps> = ({ open, onClose, showToast }) => {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!open) return;
    const unsub = subscribeRecycleBin(() => setVersion((v) => v + 1));
    return unsub;
  }, [open]);
  const entries = useMemo(() => (open ? getRecycleBinEntries() : []), [open, version]);
  const isHqUser = useMemo(() => {
    try {
      return !!globalFranchiseEngine.getContext().isHqUser;
    } catch {
      return false;
    }
  }, []);

  if (!open) return null;

  const daysLeft = (e: RecycleBinEntry) =>
    Math.max(0, RECYCLE_BIN_RETENTION_DAYS - Math.floor((Date.now() - e.deletedAtMs) / 86400000));

  const handleRestore = (e: RecycleBinEntry) => {
    const res = restoreFromRecycleBin(e.binId);
    showToast?.(res.message);
  };

  const handlePurge = (e: RecycleBinEntry) => {
    if (!window.confirm(`【HQ 二次确认】彻底删除「${e.label}」？\n该操作不可恢复，快照将从回收站永久移除。`)) return;
    const res = purgeFromRecycleBin(e.binId, { isHqUser });
    showToast?.(res.message);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-[560px] max-h-[80vh] flex flex-col bg-white border border-[#e6e6e4] shadow-2xl rounded-[6px] overflow-hidden">
        {/* Header */}
        <div className="shrink-0 h-11 px-3 flex items-center gap-2 border-b border-[#e6e6e4] bg-[#f7f7f5]">
          <Trash2 className="w-4 h-4 text-[#185FA5]" />
          <span className="text-[13px] font-bold text-[#201f1d]">统一回收站</span>
          <span className="text-[10px] text-[#787774]">
            保留 {RECYCLE_BIN_RETENTION_DAYS} 天 · {entries.length} 项
          </span>
          {!isHqUser && (
            <span className="ml-auto flex items-center gap-1 text-[10px] text-[#8F6412] bg-[#ECD9A8]/50 border border-[#ECD9A8] px-1.5 py-0.5 rounded-[3px]">
              <ShieldAlert className="w-3 h-3" />
              彻底删除需 HQ 权限
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="ml-auto w-7 h-7 flex items-center justify-center text-[#787774] hover:text-[#201f1d] hover:bg-[#efefed] rounded-[4px] cursor-pointer"
            title="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {entries.length === 0 ? (
            <div className="py-16 text-center text-xs text-[#9a9a96]">回收站为空 —— 最近 30 天内没有可恢复的删除记录</div>
          ) : (
            <ul className="divide-y divide-[#efefed]">
              {entries.map((e) => (
                <li key={e.binId} className="px-3 py-2 flex items-center gap-2 hover:bg-[#fafaf9]">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] font-bold text-[#185FA5] bg-[#eef4fb] border border-[#d7e4f4] px-1 py-[1px] rounded-[2px] shrink-0">
                        {e.typeLabel}
                      </span>
                      <span className="text-xs font-semibold text-[#201f1d] truncate">{e.label}</span>
                    </div>
                    <div className="text-[10px] text-[#9a9a96] font-mono mt-0.5">
                      {e.deletedAt.slice(0, 16).replace('T', ' ')} · 删除人 {e.deletedBy} · 剩余 {daysLeft(e)} 天
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRestore(e)}
                    className="shrink-0 h-[26px] px-2 flex items-center gap-1 text-[11px] font-bold text-[#2B593F] bg-[#EDF3EC] border border-[#C4DCBC] hover:bg-[#D6E4D4] rounded-[4px] cursor-pointer transition-colors"
                    title="恢复到原模块"
                  >
                    <RotateCcw className="w-3 h-3" />
                    恢复
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePurge(e)}
                    disabled={!isHqUser}
                    className={`shrink-0 h-[26px] px-2 flex items-center gap-1 text-[11px] font-bold rounded-[4px] transition-colors border ${
                      isHqUser
                        ? 'text-[#D44333] bg-[#FBE4E4] border-[#F5C6C6] hover:bg-[#F8D7D7] cursor-pointer'
                        : 'text-[#b0afa9] bg-[#f5f5f4] border-[#e6e6e4] cursor-not-allowed'
                    }`}
                    title={isHqUser ? '彻底删除（HQ 二次确认）' : '需要品牌总部 (HQ) 权限'}
                  >
                    彻底删除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-3 py-1.5 border-t border-[#e6e6e4] bg-[#f7f7f5] text-[10px] text-[#9a9a96]">
          删除的业务数据自动进入回收站并即时同步云端 · 恢复写回原模块 · 彻底删除仅 HQ 可执行
        </div>
      </div>
    </div>
  );
};
