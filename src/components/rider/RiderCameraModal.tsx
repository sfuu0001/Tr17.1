import React, { useState } from 'react';
import {
  Camera,
  CheckCircle2,
  X,
  MapPin,
  Clock,
  ShieldCheck,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RiderCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNo: string;
  deliveryAddress: string;
  onPhotoConfirmed: (photoInfo: { locationTag: string; timestamp: string }) => void;
  showToast: (msg: string) => void;
}

export const RiderCameraModal: React.FC<RiderCameraModalProps> = ({
  isOpen,
  onClose,
  orderNo,
  deliveryAddress,
  onPhotoConfirmed,
  showToast
}) => {
  const [photoTaken, setPhotoTaken] = useState<boolean>(false);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const [selectedTag, setSelectedTag] = useState<string>('前台外卖自取架');

  const locationTags = [
    '前台外卖自取架',
    '顾客亲手当面签收',
    '门把手 / 门口置物柜',
    '大厦前台物业管家代收'
  ];

  if (!isOpen) return null;

  const nowString = new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const handleCapture = () => {
    setIsFlashing(true);
    setTimeout(() => {
      setIsFlashing(false);
      setPhotoTaken(true);
      showToast('快门已触发！已自动附加北斗卫星防伪水印。');
    }, 150);
  };

  const handleConfirm = () => {
    onPhotoConfirmed({
      locationTag: selectedTag,
      timestamp: nowString
    });
    showToast('妥投照片已成功上传存证！');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#181816] text-white w-full max-w-md rounded-[6px] border border-neutral-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-4 py-3 bg-[#201f1d] border-b border-neutral-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-[3px] bg-emerald-700 text-white flex items-center justify-center">
              <Camera className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-xs text-neutral-200">
              妥投拍照存证 (防漏防损防丢核验)
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-[3px] bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewfinder Frame */}
        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
          <div className="relative w-full aspect-4/3 bg-neutral-900 rounded-[4px] border-2 border-dashed border-neutral-700 overflow-hidden flex flex-col justify-between p-3">
            {/* Shutter Flash overlay */}
            <AnimatePresence>
              {isFlashing && (
                <motion.div
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="absolute inset-0 bg-white z-50 pointer-events-none"
                />
              )}
            </AnimatePresence>

            {/* Corner Viewfinder Brackets */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />

            {/* Top Viewfinder Info */}
            <div className="relative z-10 flex items-center justify-between text-[10px] text-emerald-400 font-mono">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>CAMERA LIVE 1080P</span>
              </span>
              <span>BEIDOU RTK HIGH-PRECISION</span>
            </div>

            {/* Simulated Captured Image / Scene */}
            {photoTaken ? (
              <motion.div
                initial={{ scale: 1.08, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 bg-[#242624] flex items-center justify-center p-4"
              >
                <div className="text-center space-y-2">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
                    className="w-12 h-12 bg-emerald-900/60 border border-emerald-500 rounded-full flex items-center justify-center mx-auto"
                  >
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  </motion.div>
                  <p className="text-xs font-bold text-emerald-300">
                    妥投实景照片已捕获
                  </p>
                  <p className="text-[10.5px] text-neutral-400">
                    餐品外包装完整 · 保温袋完好无损
                  </p>
                </div>
              </motion.div>
            ) : (
              <div className="text-center my-auto space-y-1">
                <Camera className="w-10 h-10 text-neutral-600 mx-auto" />
                <p className="text-xs text-neutral-400">请对准妥投放置点或顾客签收现场</p>
              </div>
            )}

            {/* Watermark Overlay at Bottom of Photo */}
            <div className="relative z-10 bg-black/80 backdrop-blur-xs p-2 rounded-[3px] border border-white/10 text-[10px] space-y-0.5 font-mono text-neutral-300">
              <div className="flex items-center justify-between text-emerald-400 font-bold">
                <span>防伪单号: {orderNo}</span>
                <span>{selectedTag}</span>
              </div>
              <p className="truncate flex items-center gap-1 text-white">
                <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>{deliveryAddress}</span>
              </p>
              <p className="text-neutral-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-neutral-400 shrink-0" />
                <span>拍摄时间: {nowString} (121.4737°E, 31.2304°N)</span>
              </p>
            </div>
          </div>

          {/* Location Spot Selector */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold text-neutral-300 block">选择妥投放置位置:</span>
            <div className="grid grid-cols-2 gap-1.5">
              {locationTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(tag)}
                  className={`p-2 rounded-[3px] text-xs font-medium text-left transition-all cursor-pointer border ${
                    selectedTag === tag
                      ? 'bg-emerald-950 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-[#201f1d] border-t border-neutral-700 flex items-center justify-between gap-2.5">
          {!photoTaken ? (
            <button
              type="button"
              onClick={handleCapture}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white rounded-[4px] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
            >
              <Camera className="w-4 h-4" />
              <span>按下快门 · 拍照存证</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setPhotoTaken(false)}
                className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-[4px] font-semibold text-xs flex items-center gap-1 cursor-pointer transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>重拍</span>
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white rounded-[4px] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>确认使用并上传存证</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

