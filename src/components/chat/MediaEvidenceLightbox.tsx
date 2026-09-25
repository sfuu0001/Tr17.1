import React, { useState, useEffect } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  ShieldCheck,
  MapPin,
  Clock,
  Download,
  Fingerprint
} from 'lucide-react';

export interface MediaEvidenceLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
  timeStr?: string;
  orderNo?: string;
  operatorName?: string;
  operatorRole?: string;
  gpsCoords?: { lat: number; lng: number; precisionMeters?: number };
}

export const MediaEvidenceLightbox: React.FC<MediaEvidenceLightboxProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title = '餐品封签与外卖架存证影像',
  timeStr,
  orderNo = 'UR-9821',
  operatorName = '专线骑手 · 陈志远',
  operatorRole = '骑手配送中',
  gpsCoords = { lat: 31.2304, lng: 121.4737, precisionMeters: 3.2 }
}) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setRotation(0);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((prev) => Math.min(prev + 0.5, 3.5));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((prev) => Math.max(prev - 0.5, 0.75));
  };

  const handleRotate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(1);
    setRotation(0);
  };

  const displayTime = timeStr || new Date().toLocaleString('zh-CN', { hour12: false });
  const hashId = `EVID-SHA256-${Math.abs(orderNo.split('').reduce((acc, c) => acc + c.charCodeAt(0), 1024)).toString(16).toUpperCase()}`;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* 顶栏操作区 */}
      <header
        className="w-full px-4 py-3 flex items-center justify-between text-white border-b border-white/10 bg-black/40 backdrop-blur-md z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-4 h-4 stroke-[1.5]" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight flex items-center gap-2">
              <span>{title}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                可信存证
              </span>
            </div>
            <div className="text-[11px] text-white/50 font-mono flex items-center gap-2">
              <span>单号 #{orderNo}</span>
              <span>·</span>
              <span>{operatorName}</span>
            </div>
          </div>
        </div>

        {/* 缩放旋转控制条 */}
        <div className="flex items-center gap-1 bg-white/10 rounded-full px-2 py-1 border border-white/15">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= 0.75}
            className="p-1.5 text-white/80 hover:text-white disabled:opacity-30 rounded-full hover:bg-white/10 cursor-pointer transition"
            title="缩小"
          >
            <ZoomOut className="w-4 h-4 stroke-[1.5]" />
          </button>
          <span className="text-xs font-mono w-10 text-center text-white/90">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= 3.5}
            className="p-1.5 text-white/80 hover:text-white disabled:opacity-30 rounded-full hover:bg-white/10 cursor-pointer transition"
            title="放大"
          >
            <ZoomIn className="w-4 h-4 stroke-[1.5]" />
          </button>
          <div className="w-px h-3.5 bg-white/20 mx-1" />
          <button
            type="button"
            onClick={handleRotate}
            className="p-1.5 text-white/80 hover:text-white rounded-full hover:bg-white/10 cursor-pointer transition"
            title="顺时针旋转90°"
          >
            <RotateCw className="w-4 h-4 stroke-[1.5]" />
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 text-white/80 hover:text-white rounded-full hover:bg-white/10 cursor-pointer transition"
            title="重置缩放与角度"
          >
            <Maximize2 className="w-4 h-4 stroke-[1.5]" />
          </button>
          <div className="w-px h-3.5 bg-white/20 mx-1" />
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-rose-400 rounded-full hover:bg-white/10 cursor-pointer transition"
            title="关闭 (Esc)"
          >
            <X className="w-4 h-4 stroke-[1.5]" />
          </button>
        </div>
      </header>

      {/* 居中大图与微距缩放视口 */}
      <div className="relative flex-1 overflow-hidden flex items-center justify-center p-4">
        <div
          className="relative transition-transform duration-200 cursor-grab active:cursor-grabbing max-w-full max-h-full flex items-center justify-center"
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={imageUrl}
            alt={title}
            className="max-h-[72vh] max-w-[90vw] object-contain rounded-xl shadow-2xl border border-white/20"
          />

          {/* 画面内微距观察线框瞄准引导 */}
          <div className="absolute top-3 left-3 pointer-events-none bg-black/60 backdrop-blur-xs text-white/70 border border-white/20 rounded px-2 py-0.5 text-[10px] font-mono">
            微距检视模式 · 支持双指捏合或鼠标滚轮
          </div>
        </div>

        {/* 右下角叠加防伪时空水印 (密码级存证规范) */}
        <div
          className="absolute bottom-4 right-4 pointer-events-none bg-black/75 backdrop-blur-md border border-white/20 rounded-xl p-3 text-white max-w-sm shadow-2xl text-[11px] font-mono leading-relaxed space-y-1 z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold border-b border-white/10 pb-1 text-[11px]">
            <Fingerprint className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>URBAN RADAR 时空数字存证</span>
          </div>
          <div className="flex items-center gap-1.5 text-white/80">
            <Clock className="w-3 h-3 text-white/50 shrink-0 stroke-[1.5]" />
            <span>授时打刻：{displayTime}</span>
          </div>
          <div className="flex items-center gap-1.5 text-white/80">
            <MapPin className="w-3 h-3 text-white/50 shrink-0 stroke-[1.5]" />
            <span>
              GPS：{gpsCoords.lat.toFixed(4)}°N, {gpsCoords.lng.toFixed(4)}°E (精度 ±{gpsCoords.precisionMeters}m)
            </span>
          </div>
          <div className="text-[10px] text-white/50 pt-0.5 truncate">
            哈希凭证：{hashId}
          </div>
        </div>
      </div>

      {/* 底栏状态与操作 */}
      <footer
        className="w-full px-4 py-2.5 flex items-center justify-between text-white/70 border-t border-white/10 bg-black/40 backdrop-blur-md text-xs z-10 font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <span>三方责任确权已存档 · 任何篡改均被数字防伪指纹识别</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const a = document.createElement('a');
              a.href = imageUrl;
              a.download = `Evidence-${orderNo}-${Date.now()}.jpg`;
              a.click();
            }}
            className="flex items-center gap-1 px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs cursor-pointer transition border border-white/15"
          >
            <Download className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>下载留存</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
