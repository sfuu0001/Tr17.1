import React, { useState } from 'react';
import {
  HardDrive,
  Fingerprint,
  Tv,
  Music,
  Cpu,
  Globe,
  Copy,
  Check,
  ShieldCheck,
  Layers,
  Sparkles,
  Smartphone,
  Gauge,
  Clock
} from 'lucide-react';
import { UserProfile } from '../../../types/user';
import { copyTextToClipboard } from '../../../utils/clipboard';

interface UserDataHardwareMatrixProps {
  user: UserProfile;
  showToast: (msg: string) => void;
}

export const UserDataHardwareMatrix: React.FC<UserDataHardwareMatrixProps> = ({
  user,
  showToast
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const details = user.hardwareDetails;

  const handleCopy = async (text: string, label: string) => {
    await copyTextToClipboard(text);
    setCopiedKey(label);
    showToast(`已复制${label}: ${text}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-3">
      {/* 顶部特征双核表单卡 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {/* 跨浏览器不变量核心特征码 */}
        <div className="p-3 bg-neutral-900 text-white rounded-[1px] border border-neutral-800 flex flex-col justify-between gap-2 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-neutral-300 flex items-center gap-1.5 whitespace-nowrap">
              <HardDrive className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">跨浏览器不变量硬件特征码</span>
            </span>
            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-mono px-1.5 py-0.5 rounded-[1px] border border-emerald-500/30 whitespace-nowrap shrink-0">
              INVARIANT
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 bg-neutral-950 px-2.5 py-1.5 rounded-[1px] border border-neutral-800">
            <span className="font-mono font-black text-xs text-emerald-400 truncate tracking-wide">
              {user.hardwareHash || details?.hardwareHash || 'HW-CORE-UNSET'}
            </span>
            <button
              type="button"
              onClick={() => handleCopy(user.hardwareHash || details?.hardwareHash || '', '硬件特征码')}
              className="text-neutral-400 hover:text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
            >
              {copiedKey === '硬件特征码' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedKey === '硬件特征码' ? '已复制' : '复制'}</span>
            </button>
          </div>

          <div className="text-[10px] text-neutral-400 whitespace-nowrap truncate font-medium">
            基于物理 GPU/声卡/屏幕/CPU 核心数，切浏览器与清缓存保持恒定
          </div>
        </div>

        {/* 全维度设备多维复合指纹 */}
        <div className="p-3 bg-neutral-900 text-white rounded-[1px] border border-neutral-800 flex flex-col justify-between gap-2 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-neutral-300 flex items-center gap-1.5 whitespace-nowrap">
              <Fingerprint className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="truncate">全维度复合设备指纹</span>
            </span>
            <span className="text-[9px] bg-sky-500/20 text-sky-300 font-mono px-1.5 py-0.5 rounded-[1px] border border-sky-500/30 whitespace-nowrap shrink-0">
              COMPOSITE
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 bg-neutral-950 px-2.5 py-1.5 rounded-[1px] border border-neutral-800">
            <span className="font-mono font-black text-xs text-sky-400 truncate tracking-wide">
              {user.deviceFingerprint || details?.deviceFingerprint || 'DEV-FPR-UNSET'}
            </span>
            <button
              type="button"
              onClick={() => handleCopy(user.deviceFingerprint || details?.deviceFingerprint || '', '复合指纹')}
              className="text-neutral-400 hover:text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
            >
              {copiedKey === '复合指纹' ? <Check className="w-3 h-3 text-sky-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedKey === '复合指纹' ? '已复制' : '复制'}</span>
            </button>
          </div>

          <div className="text-[10px] text-neutral-400 whitespace-nowrap truncate font-medium">
            高熵全维度 Canvas/环境/字体复合签名，辅助二级多端鉴权
          </div>
        </div>
      </div>

      {/* 算法匹配置信度指标条 */}
      <div className="p-2.5 bg-neutral-50 rounded-[1px] border border-neutral-200 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-[1px] bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-black text-neutral-900 block truncate whitespace-nowrap">
              无密码智能鉴权匹配引擎
            </span>
            <span className="text-[10px] text-neutral-500 block truncate whitespace-nowrap">
              满足「不可变特征精准匹配」规则，实现跨缓存、跨浏览器秒级登入
            </span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-[9px] text-neutral-400 whitespace-nowrap">匹配置信度</div>
          <div className="text-sm font-black font-mono text-emerald-600 whitespace-nowrap">
            {details?.confidenceScore ?? user.autoLoginScore ?? 99.8}%
          </div>
        </div>
      </div>

      {/* 物理设备硬件参数检测表单 */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold text-neutral-700 px-0.5">
          <span className="whitespace-nowrap flex items-center gap-1">
            <Gauge className="w-3.5 h-3.5 text-neutral-600" />
            物理设备底层特征矩阵 (表单明细)
          </span>
          <span className="text-[10px] text-neutral-400 font-mono whitespace-nowrap">
            采集时间: {details?.collectedAt ? details.collectedAt.slice(0, 16) : '刚刚'}
          </span>
        </div>

        <div className="bg-white rounded-[1px] border border-neutral-200 divide-y divide-neutral-100 overflow-hidden text-xs">
          {/* GPU */}
          <div className="px-3 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-[1px] bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Tv className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-bold text-neutral-700 whitespace-nowrap shrink-0">
                GPU 芯片与供应商
              </span>
            </div>
            <span className="font-mono text-xs font-bold text-neutral-900 truncate text-right">
              {details?.gpuRenderer || 'Apple M2 Pro (Metal 3)'} · {details?.gpuVendor || 'Apple'}
            </span>
          </div>

          {/* Web Audio */}
          <div className="px-3 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-[1px] bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Music className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-bold text-neutral-700 whitespace-nowrap shrink-0">
                Web Audio 声卡 DSP
              </span>
            </div>
            <span className="font-mono text-xs font-bold text-neutral-900 truncate text-right">
              {details?.audioDspHash || 'DSP-8A7B2C1D'} (DynamicsCompressor)
            </span>
          </div>

          {/* Canvas 2D */}
          <div className="px-3 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-[1px] bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-bold text-neutral-700 whitespace-nowrap shrink-0">
                Canvas 2D 几何栅格
              </span>
            </div>
            <span className="font-mono text-xs font-bold text-neutral-900 truncate text-right">
              {details?.canvasHash || 'CNV-9F3E4A21'} (Sub-pixel Anti-aliasing)
            </span>
          </div>

          {/* 屏幕 */}
          <div className="px-3 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-[1px] bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Tv className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-bold text-neutral-700 whitespace-nowrap shrink-0">
                物理屏幕几何与色彩
              </span>
            </div>
            <span className="font-mono text-xs font-bold text-neutral-900 truncate text-right">
              {details?.physicalResolution || '2560x1440'} · {details?.colorDepth || 24}bit · DPR {details?.pixelRatio || 2.0}
            </span>
          </div>

          {/* CPU & 平台 */}
          <div className="px-3 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-[1px] bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Cpu className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-bold text-neutral-700 whitespace-nowrap shrink-0">
                CPU 逻辑核心与架构
              </span>
            </div>
            <span className="font-mono text-xs font-bold text-neutral-900 truncate text-right">
              {details?.cpuCores || 8} 核心 · {details?.platform || 'MacIntel / macOS'}
            </span>
          </div>

          {/* 内存与触控 */}
          <div className="px-3 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-[1px] bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <Smartphone className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-bold text-neutral-700 whitespace-nowrap shrink-0">
                设备内存与触控点
              </span>
            </div>
            <span className="font-mono text-xs font-bold text-neutral-900 truncate text-right">
              {details?.deviceMemoryGb || 16} GB RAM · 最大触控点 {details?.maxTouchPoints || 0}
            </span>
          </div>

          {/* 时区与多语言 */}
          <div className="px-3 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-[1px] bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                <Globe className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-bold text-neutral-700 whitespace-nowrap shrink-0">
                时区标识与多语言族
              </span>
            </div>
            <span className="font-mono text-xs font-bold text-neutral-900 truncate text-right">
              {details?.timezone || 'Asia/Shanghai'} · {(details?.languages || ['zh-CN', 'zh', 'en']).join(', ')}
            </span>
          </div>

          {/* 同步状态 */}
          <div className="px-3 py-2 flex items-center justify-between gap-3 bg-neutral-50/50">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-[1px] bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-bold text-neutral-700 whitespace-nowrap shrink-0">
                云端同步归档状态
              </span>
            </div>
            <span className="font-mono text-xs font-bold text-emerald-600 truncate text-right flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              已同步至商家中枢 ({user.cloudSyncedAt ? user.cloudSyncedAt.slice(0, 16) : '实时'})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
