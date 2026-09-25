import React, { useState, useEffect } from 'react';
import { X, Edit3, ShieldAlert, Check, RefreshCw } from 'lucide-react';

export type EditableEntityType = 'district' | 'director' | 'truck' | 'rider';

export interface EditableEntityData {
  type: EditableEntityType;
  id: string;
  name?: string;
  currentName?: string;
  subTitle?: string;
  extraField?: string;
  extraValue?: string;
  extraLabel?: string;
}

interface CascadeEditEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityData?: EditableEntityData | null;
  data?: EditableEntityData | null;
  onSave: (type: EditableEntityType, id: string, newName: string, extraValue?: string) => void;
  showToast?: (msg: string, desc?: string) => void;
}

export const CascadeEditEntityModal: React.FC<CascadeEditEntityModalProps> = ({
  isOpen,
  onClose,
  entityData,
  data,
  onSave,
  showToast
}) => {
  const activeData = entityData || data;
  const [name, setName] = useState('');
  const [extraValue, setExtraValue] = useState('');
  const [hasChanged, setHasChanged] = useState(false);

  useEffect(() => {
    if (activeData) {
      setName(activeData.name || activeData.currentName || '');
      setExtraValue(activeData.extraField || activeData.extraValue || '');
      setHasChanged(false);
    }
  }, [activeData, isOpen]);

  if (!isOpen || !activeData) return null;

  const getTypeLabel = (type: EditableEntityType) => {
    switch (type) {
      case 'district':
        return '区域 / 核心商圈';
      case 'director':
        return '战区指挥总监';
      case 'truck':
        return '移动餐车资产';
      case 'rider':
        return '基层单兵 / 专送骑手';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(activeData.type, activeData.id, name.trim(), extraValue.trim());
    if (showToast) {
      showToast('实体名称已成功更新并存证', `已保存: ${name.trim()}`);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl border border-[#e4e4df] shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#e4e4df] flex items-center justify-between bg-[#fafaf9]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1a1a17]">
                修改{getTypeLabel(entityData.type)}名称
              </h3>
              <p className="text-[11px] text-[#787774] font-mono">
                实体唯一标识: {entityData.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#787774] hover:text-[#1a1a17] rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-lg text-xs text-amber-900 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">防误操作编辑提示</p>
              <p className="text-[11px] text-amber-800/90 leading-relaxed">
                您当前已临时解锁防误触保护。修改后的名称将实时同步至全域级联穿透矩阵、各级指挥台与手持终端。
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#37352f] flex items-center justify-between">
              <span>{getTypeLabel(entityData.type)}显示名称 *</span>
              <span className="text-[10px] text-[#787774]">必填</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setHasChanged(true);
              }}
              placeholder={`请输入新的${getTypeLabel(entityData.type)}名称`}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#d2d2cd] focus:outline-none focus:ring-2 focus:ring-[#1a1a17] focus:border-transparent"
              autoFocus
              required
            />
          </div>

          {entityData.extraLabel && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#37352f]">
                {entityData.extraLabel}
              </label>
              <input
                type="text"
                value={extraValue}
                onChange={(e) => {
                  setExtraValue(e.target.value);
                  setHasChanged(true);
                }}
                placeholder={`请输入${entityData.extraLabel}`}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#d2d2cd] focus:outline-none focus:ring-2 focus:ring-[#1a1a17] focus:border-transparent"
              />
            </div>
          )}

          {/* Footer actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#e4e4df]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-[#d2d2cd] text-xs font-medium text-[#37352f] hover:bg-gray-50 transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-1.5 rounded-lg bg-[#1a1a17] text-white text-xs font-bold hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              确认修改并生效
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
