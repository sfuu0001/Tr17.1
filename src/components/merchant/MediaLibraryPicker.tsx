/* ============================================================================
 * MediaLibraryPicker —— 在库图片素材库选择器
 * ----------------------------------------------------------------------------
 * 目标：运营上传一次图片即可反复调用，避免每次都从本地上传。
 * 1. 上传即入库（自动读取分辨率/体积/格式并去重）
 * 2. 网格化素材浏览，展示图片规格（宽×高 · 版式 · 体积）
 * 3. 点击「选用」把素材回填给调用方（变体图 / 口味图 / 主图等）
 * 4. 工业控制台风视觉，与 DishParameterRulesModal 保持一致
 * ==========================================================================*/

import React, { useEffect, useRef, useState } from 'react';
import { Upload, X, ImageIcon, Trash2, Check, Info } from 'lucide-react';
import {
  addFilesToLibrary,
  listLibraryImages,
  removeLibraryImage,
  subscribeImageLibrary,
  describeSpec,
  ImageLibraryItem
} from '../../utils/imageLibrary';

interface MediaLibraryPickerProps {
  open: boolean;
  onClose: () => void;
  onPick: (item: ImageLibraryItem) => void;
  title?: string;
  showToast?: (msg: string) => void;
  /** 当前已被使用的素材 dataUrl（用于标记「使用中」） */
  activeDataUrl?: string;
}

export function MediaLibraryPicker({
  open,
  onClose,
  onPick,
  title = '图片素材库 (MEDIA LIBRARY)',
  showToast,
  activeDataUrl
}: MediaLibraryPickerProps) {
  const [items, setItems] = useState<ImageLibraryItem[]>(() => listLibraryImages());
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setItems(listLibraryImages());
    return subscribeImageLibrary(() => setItems(listLibraryImages()));
  }, [open]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  if (!open) return null;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const { added, skipped } = await addFilesToLibrary(files);
      setItems(listLibraryImages());
      const parts: string[] = [];
      if (added.length > 0) parts.push(`入库 ${added.length} 张`);
      if (skipped.length > 0) parts.push(`跳过 ${skipped.length} 张（${skipped[0].name}: ${skipped[0].reason}）`);
      setNotice(parts.join('；') || '未选择有效图片');
      showToast?.(parts.join('；'));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#ffffff] w-full max-w-3xl max-h-[86vh] flex flex-col border border-[#e2e3e1] shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-[#e2e3e1] bg-[#f9f9f7] shrink-0">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[#000000]" />
            <span className="font-headline-sm text-sm font-bold text-[#1a1c1b]">{title}</span>
            <span className="font-label-micro text-[9px] text-[#787770] font-mono">
              库存 {items.length} 张 · 上传一次全店复用
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-[#787770] hover:text-[#1a1c1b] hover:bg-[#f0efec] cursor-pointer"
            title="关闭素材库"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Upload zone */}
        <div className="p-3 border-b border-[#e2e3e1] space-y-2 shrink-0">
          <div
            className="border border-dashed border-[#c8c7be] bg-[#f9f9f7] p-3 flex items-center justify-between gap-3 cursor-pointer hover:border-[#000000] transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Upload className="w-4 h-4 text-[#474741] shrink-0" />
              <div className="min-w-0">
                <div className="font-bold text-xs text-[#1a1c1b] truncate">
                  {busy ? '正在读取图片规格…' : '点击或拖拽图片到此入库（支持多选）'}
                </div>
                <div className="text-[10px] text-[#787770] font-mono">
                  建议方形 1:1 / 1024×1024 以上 · 单张 ≤900KB · 自动去重并记录分辨率
                </div>
              </div>
            </div>
            <span className="shrink-0 h-7 px-3 bg-[#000000] text-white text-[11px] font-bold flex items-center">
              选择文件
            </span>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          {notice && (
            <div className="flex items-start gap-1.5 text-[10.5px] p-2 bg-[#f4f7f6] border border-[#d3d1cb] text-[#1a1c1b]">
              <Info className="w-3 h-3 mt-0.5 shrink-0 text-[#2b593f]" />
              <span className="font-mono break-all">{notice}</span>
            </div>
          )}
        </div>

        {/* Grid */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 custom-scrollbar">
          {items.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#787770] border border-dashed border-[#d3d1cb]">
              素材库为空：上传一张图片后，即可在所有菜品、变体与口味中反复调用
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {items.map((it) => {
                const isActive = activeDataUrl && activeDataUrl === it.dataUrl;
                return (
                  <div
                    key={it.id}
                    className={`border p-1.5 space-y-1 transition-colors ${
                      isActive ? 'border-[#000000] bg-[#f4f7f6]' : 'border-[#e2e3e1] hover:border-[#b8b6ae] bg-[#f9f9f7]'
                    }`}
                  >
                    <div className="aspect-square bg-[#e8e7e2] overflow-hidden flex items-center justify-center">
                      <img src={it.dataUrl} alt={it.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="text-[9.5px] text-[#787770] font-mono truncate" title={it.name}>
                      {it.name}
                    </div>
                    <div className="text-[9px] text-[#a8a6a0] font-mono">{describeSpec(it)}</div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          onPick(it);
                          showToast?.(`已选用素材「${it.name}」`);
                          onClose();
                        }}
                        className={`flex-1 h-6 flex items-center justify-center gap-0.5 text-[10px] font-bold cursor-pointer transition-colors ${
                          isActive
                            ? 'bg-[#006d36] text-white'
                            : 'bg-[#000000] text-white hover:bg-neutral-800'
                        }`}
                      >
                        {isActive ? <Check className="w-3 h-3" /> : null}
                        <span>{isActive ? '使用中' : '选用'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!window.confirm(`从素材库删除「${it.name}」？\n（不会影响已引用该图的位置，仅从库存移除）`)) return;
                          removeLibraryImage(it.id);
                          setNotice(`已从素材库移除「${it.name}」`);
                        }}
                        className="w-6 h-6 flex items-center justify-center text-[#ba1a1a] hover:bg-[#fdecea] cursor-pointer transition-colors"
                        title="从素材库移除"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
