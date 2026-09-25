import React, { useState } from 'react';
import {
  X,
  FileCode,
  Copy,
  Check,
  Download,
  Terminal,
  ExternalLink,
  Layers,
  Sparkles,
  Server,
  Cloud
} from 'lucide-react';
import { CLOUD_FUNCTION_TEMPLATES } from '../../utils/cloudbase';
import { copyTextToClipboard } from '../../utils/clipboard';
import { useToast } from '../ui/ToastContext';

interface CloudFunctionCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudFunctionCodeModal: React.FC<CloudFunctionCodeModalProps> = ({
  isOpen,
  onClose
}) => {
  const toast = useToast();
  const [selectedFnKey, setSelectedFnKey] = useState<keyof typeof CLOUD_FUNCTION_TEMPLATES>('USER_PROFILE');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentTemplate = CLOUD_FUNCTION_TEMPLATES[selectedFnKey];

  const handleCopyCode = async (text: string, label: string) => {
    await copyTextToClipboard(text);
    setCopiedKey(label);
    toast.success('代码已复制到剪贴板', label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadZipOrFiles = () => {
    const element = document.createElement('a');
    const file = new Blob([currentTemplate.indexJs], { type: 'text/javascript' });
    element.href = URL.createObjectURL(file);
    element.download = `${currentTemplate.name}_index.js`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success('云函数文件已下载', `${currentTemplate.name}_index.js`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-neutral-200 flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400/40 text-sky-400 flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-white tracking-tight">
                腾讯云开发 (TCB) 云函数即用部署源码
              </h3>
              <p className="text-[11px] text-neutral-400">
                包含个人资料同步、多端订单拉取、订单创建与退款 Node.js 源码
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Function Tabs */}
        <div className="px-3 py-2 bg-neutral-50 border-b border-neutral-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {Object.entries(CLOUD_FUNCTION_TEMPLATES).map(([key, template]) => {
            const isSelected = selectedFnKey === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedFnKey(key as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-black text-white shadow-xs'
                    : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                <Terminal className={`w-3 h-3 ${isSelected ? 'text-emerald-400' : 'text-neutral-400'}`} />
                <span>{template.name}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto max-h-[58vh] space-y-3">
          {/* Function Description & Actions */}
          <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-sans font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {currentTemplate.name}
                </span>
                <span className="font-bold text-black">{currentTemplate.description}</span>
              </div>
              <span className="text-[10px] text-neutral-400 block mt-1">
                Node.js 16/18/20 · 腾讯云开发 CloudBase 原生支持
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleDownloadZipOrFiles}
                className="px-2.5 py-1 bg-white hover:bg-neutral-100 text-black border border-neutral-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Download className="w-3 h-3" />
                <span>下载 index.js</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopyCode(currentTemplate.indexJs, 'index.js')}
                className="px-3 py-1 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
              >
                {copiedKey === 'index.js' ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>已复制</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>复制代码</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Code Viewer: index.js */}
          <div className="rounded-2xl border border-neutral-800 bg-[#121314] overflow-hidden text-white font-sans text-xs">
            <div className="px-3 py-2 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-neutral-400 text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-neutral-300 font-bold">{currentTemplate.name}/index.js</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopyCode(currentTemplate.indexJs, 'index.js')}
                className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>复制 index.js</span>
              </button>
            </div>
            <pre className="p-3.5 overflow-x-auto text-[11px] leading-relaxed text-emerald-300/90 font-sans select-text">
              {currentTemplate.indexJs}
            </pre>
          </div>

          {/* Quick Deployment Guide Accordion */}
          <div className="p-3 bg-sky-50/60 border border-sky-200 rounded-2xl text-xs space-y-1.5 text-sky-950">
            <div className="font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <span>3 步极速部署指南 (腾讯云控制台)</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-sky-900 pl-1">
              <li>打开腾讯云控制台 - 进入对应「云开发 CloudBase 环境」</li>
              <li>点击左侧菜单「云函数」- 点击「新建云函数」- 名称输入 <span className="font-sans font-bold bg-white px-1 py-0.2 rounded">{currentTemplate.name}</span></li>
              <li>将上方代码粘贴进 <span className="font-sans bg-white px-1 py-0.2 rounded">index.js</span> 并点击「保存并部署」即可立即生效！</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between">
          <span className="text-[11px] text-neutral-500">
            双轨安全机制：若云端未部署，应用将无感降级为本地持久化双向驱动
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-black hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  );
};
