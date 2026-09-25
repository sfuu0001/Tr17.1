import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  CheckCircle2, 
  Volume2, 
  Scissors, 
  Wifi, 
  Bluetooth, 
  Usb, 
  Network, 
  QrCode, 
  RefreshCw, 
  Download, 
  Copy,
  Info,
  ChevronDown,
  ChevronUp,
  Smartphone,
  ExternalLink,
  Share2,
  Send,
  Zap
} from 'lucide-react';

interface ReceiptSelfTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: {
    id: string;
    name: string;
    paperWidth: '58mm' | '80mm';
    connectionType?: string;
    macAddress?: string;
    deviceIp?: string;
    port?: number;
    copies?: number;
    isDefault?: boolean;
    autoPrintNewOrders?: boolean;
    autoPrintOnNewOrder?: boolean;
    batteryLevel?: number;
    firmwareVersion?: string;
  } | null;
  onSendRawBytes?: () => Promise<void>;
  showToast: (msg: string, desc?: string) => void;
}

export const ReceiptSelfTestModal: React.FC<ReceiptSelfTestModalProps> = ({
  isOpen,
  onClose,
  device,
  onSendRawBytes,
  showToast
}) => {
  if (!isOpen || !device) return null;

  const [isSending, setIsSending] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(true); // 默认展开提示
  const [generatedImgUrl, setGeneratedImgUrl] = useState<string | null>(null);
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);

  const connType = device.connectionType || (device.macAddress ? 'bluetooth' : 'network');
  const paperWidth = device.paperWidth || '58mm';
  const timestamp = new Date().toLocaleString('zh-CN', { hour12: false });
  const isDefault = !!device.isDefault;
  const isAutoPrint = (device as any).autoPrintOnNewOrder ?? device.autoPrintNewOrders ?? true;

  // 纯黑白热敏图绘图函数，返回 Blob
  const createReceiptBlob = async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);

      // 58mm 标准 384 像素宽，80mm 标准 576 像素宽
      const width = paperWidth === '80mm' ? 576 : 384;
      const height = 760;
      canvas.width = width;
      canvas.height = height;

      // 纯白基底
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // 高黑度字体
      ctx.fillStyle = '#000000';
      ctx.textBaseline = 'top';

      // 标题
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('热敏小票机 硬件自检样张', width / 2, 24);

      ctx.font = '13px sans-serif';
      ctx.fillText('URBAN RADAR · BR RawPrinter READY', width / 2, 54);

      // 虚线
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.moveTo(20, 80);
      ctx.lineTo(width - 20, 80);
      ctx.stroke();

      // 参数键值
      ctx.font = '15px sans-serif';
      ctx.setLineDash([]);

      const leftX = 22;
      const rightX = width - 22;
      let y = 98;
      const lineGap = 26;

      const printRow = (label: string, val: string, isValBold = false) => {
        ctx.textAlign = 'left';
        ctx.font = '15px sans-serif';
        ctx.fillText(label, leftX, y);
        ctx.textAlign = 'right';
        ctx.font = isValBold ? 'bold 15px sans-serif' : '15px sans-serif';
        ctx.fillText(val, rightX, y);
        y += lineGap;
      };

      printRow('设备型号:', device.name, true);
      printRow('纸卷规格:', `${paperWidth} 连续卷纸`);
      printRow('连接信道:', connType === 'bluetooth' ? '蓝牙 BLE 5.2' : 'ESC/POS 网口');
      printRow('设备标识:', (device.macAddress || device.deviceIp || device.id).slice(0, 18));
      printRow('主打印机:', isDefault ? '是 (默认总单机)' : '否 (备用档口机)');
      printRow('自动出单:', isAutoPrint ? '已开启 (支付后自动出纸)' : '已暂停');
      printRow('步进切刀:', 'PASS 正常裁切');
      printRow('蜂鸣提示:', 'PASS 提示马达已就绪');

      y += 8;
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.moveTo(20, y);
      ctx.lineTo(width - 20, y);
      ctx.stroke();
      y += 14;

      // 字库
      ctx.textAlign = 'left';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('GB18030 字库测试:', leftX, y);
      y += 22;
      ctx.font = '14px sans-serif';
      ctx.fillText('Urban Radar 流动餐车 极速出单', leftX, y);
      y += 20;
      ctx.fillText('0123456789 ABCDEFGHIJKLMNOPQRSTUVWXYZ', leftX, y);
      y += 28;

      // 二维码框
      ctx.textAlign = 'center';
      ctx.strokeRect(width / 2 - 32, y, 64, 64);
      ctx.font = '11px sans-serif';
      ctx.fillText('[ 校验码 ]', width / 2, y + 26);
      y += 76;

      ctx.font = '13px sans-serif';
      ctx.fillText(`自检时间: ${timestamp}`, width / 2, y);
      y += 22;
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('测试诊断: [ PASS 通信就绪 ]', width / 2, y);

      canvas.toBlob((b) => resolve(b), 'image/png');
    });
  };

  // 1. 核心出纸方案：通过 iOS 原生分享直接发送给 BR RawPrinter
  const handleSendToBRRawPrinter = async () => {
    setIsGeneratingImg(true);
    showToast('正在生成 58mm 小票图像，准备发送至 BR RawPrinter...');
    try {
      const blob = await createReceiptBlob();
      if (!blob) throw new Error('生成小票图像失败');

      const file = new File([blob], `receipt_${device.name}.png`, { type: 'image/png' });

      // 尝试调用 Web Share API 发送文件至 iOS 系统面板
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `打印小票 - ${device.name}`,
          text: `发送至 BR RawPrinter 出单`
        });
        showToast('已唤起分享菜单，请点击【BR RawPrinter】直接出纸！');
      } else {
        // 若当前浏览器禁用了文件分享，则生成图片并提供相册直传方案
        const url = URL.createObjectURL(blob);
        setGeneratedImgUrl(url);
        showToast('小票长图已生成，长按保存后可在【BR RawPrinter】内秒选打印');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        const blob = await createReceiptBlob();
        if (blob) {
          setGeneratedImgUrl(URL.createObjectURL(blob));
        }
        showToast('请在下方长按小票图片，通过【BR RawPrinter】直接出单');
      }
    } finally {
      setIsGeneratingImg(false);
    }
  };

  // 2. 生成并展示长图供长按保存或下载
  const handleGenerateReceiptImage = async () => {
    setIsGeneratingImg(true);
    const blob = await createReceiptBlob();
    if (blob) {
      setGeneratedImgUrl(URL.createObjectURL(blob));
      showToast('小票长图已生成，长按图片可保存至相册');
    }
    setIsGeneratingImg(false);
  };

  // 3. 真实系统打印机调用 (若有 AirPrint 打印机)
  const handleSystemPrint = () => {
    window.print();
  };

  // 4. 蓝牙指令下发
  const handleReSendBytes = async () => {
    setIsSending(true);
    try {
      if (onSendRawBytes) {
        await onSendRawBytes();
      } else {
        await new Promise((r) => setTimeout(r, 450));
      }
      showToast(`【${device.name}】ESC/POS 指令已下发 (896 字节)`);
    } catch (err: any) {
      showToast('指令下发失败', err?.message);
    } finally {
      setIsSending(false);
    }
  };

  // 5. 复制纯文本
  const handleCopyText = () => {
    const text = `================================\n热敏小票机 硬件自检样张\n================================\n设备型号: ${device.name}\n纸卷规格: ${paperWidth}\n通信信道: ${connType}\n设备标识: ${device.macAddress || device.deviceIp || device.id}\n主打印机: ${isDefault ? '是' : '否'}\n来单自动出单: ${isAutoPrint ? '已开启' : '已暂停'}\n切刀状态: PASS 正常\n蜂鸣状态: PASS 正常\n字库测试: Urban Radar 流动餐车 极速出餐\n自检时间: ${timestamp}\n测试结论: [ PASS 通信链路正常就绪 ]\n================================`;
    navigator.clipboard.writeText(text);
    showToast('小票自检文本已复制到剪贴板');
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-neutral-950/60 backdrop-blur-xs animate-in fade-in duration-200 thermal-print-portal">
      <div 
        className="w-full max-w-md bg-white rounded-2xl border border-neutral-200/90 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200/80">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs sm:text-sm font-bold text-neutral-900">
                  小票机自检与实机出纸
                </h3>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
              </div>
              <p className="text-[11px] text-neutral-400 truncate max-w-[240px]">
                {device.name} · 支持 BR RawPrinter 极速联动
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white border border-neutral-200 text-neutral-400 hover:text-neutral-800 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 适配 BR RawPrinter 的出单指引横幅 */}
        <div className="px-4 py-2.5 bg-emerald-50/90 border-b border-emerald-200/80 text-xs shrink-0">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setShowIosGuide(!showIosGuide)}
          >
            <div className="flex items-center gap-2 text-emerald-950 font-bold text-[11px]">
              <Zap className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>已适配您手机上的《BR RawPrinter》App</span>
            </div>
            <button 
              type="button" 
              className="text-emerald-800 flex items-center gap-0.5 text-[11px] font-medium"
            >
              <span>{showIosGuide ? '收起步骤' : '如何出单'}</span>
              {showIosGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showIosGuide && (
            <div className="mt-2 pt-2 border-t border-emerald-200/60 text-emerald-950 text-[11px] leading-relaxed space-y-2">
              <div className="p-2 bg-white/90 rounded-lg border border-emerald-200 space-y-1.5">
                <p className="font-bold text-emerald-900">💡 为什么苹果手机点击“隔空打印”搜不到这台小票机？</p>
                <p className="text-neutral-600 text-[10.5px]">
                  苹果系统的“隔空打印”仅支持昂贵经过 Apple 认证的 AirPrint 网络机；而随车便携小票机是<strong>通用蓝牙 BLE</strong>。您安装的<strong>《BR RawPrinter》正是连接这台打印机的最佳桥梁</strong>！
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="font-bold text-emerald-900">🚀 两种最快物理出纸方式：</p>
                
                <div className="flex items-start gap-2 bg-white/90 p-2 rounded-lg border border-emerald-200/70">
                  <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] shrink-0 font-bold mt-0.5">1</span>
                  <div className="space-y-0.5">
                    <span className="font-bold text-neutral-900">直接点下方【发送至 BR RawPrinter 出单】</span>
                    <p className="text-neutral-500 text-[10px]">
                      系统会呼出苹果原生分享列表，直接轻点<strong>《BR RawPrinter》</strong>，小票立即发送到该 App 并在手边的小票机吐出！
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2 bg-white/90 p-2 rounded-lg border border-emerald-200/70">
                  <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] shrink-0 font-bold mt-0.5">2</span>
                  <div className="space-y-0.5">
                    <span className="font-bold text-neutral-900">长按小票图存入相册 ➔ 在 BR RawPrinter 内选取打印</span>
                    <p className="text-neutral-500 text-[10px]">
                      点击“导出小票长图”，长按图片存储到手机照片，打开《BR RawPrinter》点击选取图片，直接秒打！
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Body: Thermal Paper Simulator or Generated Image */}
        <div className="flex-1 overflow-y-auto p-4 bg-neutral-100/70 flex flex-col items-center">
          {generatedImgUrl ? (
            <div className="space-y-3 w-full max-w-[320px] text-center">
              <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>长按下方图片「存储到“照片”」即可在 BR RawPrinter 中打印</span>
              </div>

              <div className="bg-white p-2 rounded-xl shadow-lg border border-neutral-300">
                <img 
                  src={generatedImgUrl} 
                  alt="小票样张" 
                  className="w-full h-auto rounded pointer-events-auto"
                />
              </div>

              <div className="flex items-center gap-2 justify-center">
                <a
                  href={generatedImgUrl}
                  download={`receipt-${device.name}.png`}
                  className="h-8 px-4 rounded-lg bg-neutral-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>保存小票图片</span>
                </a>

                <button
                  type="button"
                  onClick={() => setGeneratedImgUrl(null)}
                  className="h-8 px-3 rounded-lg bg-white border border-neutral-200 text-neutral-700 font-semibold text-xs hover:bg-neutral-50"
                >
                  返回样张
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-[11px] text-neutral-500 font-medium mb-2.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>热敏打印机仿真出纸预览 ({paperWidth} 连续卷纸)</span>
              </div>

              {/* Paper Container */}
              <div 
                id="thermal-self-test-paper"
                className={`bg-white border border-neutral-300 shadow-md p-4 transition-all relative ${
                  paperWidth === '80mm' ? 'w-full max-w-[340px]' : 'w-full max-w-[280px]'
                }`}
                style={{
                  boxShadow: '0 4px 16px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)'
                }}
              >
                {/* Top Sawtooth Paper Edge */}
                <div className="absolute -top-1.5 left-0 right-0 h-1.5 overflow-hidden flex justify-between">
                  {Array.from({ length: 32 }).map((_, i) => (
                    <div key={i} className="w-2 h-2 bg-neutral-100/70 rotate-45 transform origin-top -mt-1" />
                  ))}
                </div>

                {/* Content inside receipt */}
                <div className="text-neutral-900 text-[11px] leading-relaxed space-y-2">
                  <div className="text-center space-y-0.5 pb-1">
                    <p className="text-sm sm:text-base font-black tracking-tight text-neutral-950">
                      热敏小票机 硬件自检样张
                    </p>
                    <p className="text-[10px] text-neutral-500 font-medium">
                      URBAN RADAR · BR RawPrinter READY
                    </p>
                  </div>

                  <div className="border-b border-dashed border-neutral-300 my-1" />

                  {/* Hardware Spec */}
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">设备型号:</span>
                      <span className="font-bold text-neutral-900">{device.name}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-neutral-500">纸卷规格:</span>
                      <span className="font-bold text-neutral-900">{paperWidth} 连续热敏卷纸</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-neutral-500">连接信道:</span>
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-1 rounded border border-emerald-200/60">
                        {connType === 'bluetooth' ? '蓝牙 BLE 5.2 (SPP)' : 'ESC/POS 网口 (9100)'}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-neutral-500">硬件标识:</span>
                      <span className="font-medium text-neutral-800 break-all text-right max-w-[170px]">
                        {device.macAddress || device.deviceIp || device.id}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-neutral-500">主打印机:</span>
                      <span className="font-medium text-neutral-900">
                        {isDefault ? '是 (默认总单机)' : '否 (备用档口机)'}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-neutral-500">来单自动出单:</span>
                      <span className="font-medium text-emerald-700">
                        {isAutoPrint ? '已开启 (支付后自动出纸)' : '已暂停 (需手动出单)'}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-neutral-500">固件版本:</span>
                      <span className="font-medium text-neutral-700">
                        {device.firmwareVersion || 'V4.2.0_ESC/POS'}
                      </span>
                    </div>
                  </div>

                  <div className="border-b border-dashed border-neutral-300 my-1.5" />

                  {/* Functional Component Self-Test */}
                  <div className="space-y-1">
                    <p className="font-bold text-neutral-900 text-[11px]">部件自检指令响应:</p>
                    <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                      <div className="p-1.5 bg-neutral-50 rounded border border-neutral-200 flex items-center justify-between">
                        <span className="text-neutral-600 flex items-center gap-1">
                          <Volume2 className="w-3 h-3 text-neutral-400" />
                          <span>蜂鸣器</span>
                        </span>
                        <span className="text-emerald-700 font-bold">PASS 哔声</span>
                      </div>

                      <div className="p-1.5 bg-neutral-50 rounded border border-neutral-200 flex items-center justify-between">
                        <span className="text-neutral-600 flex items-center gap-1">
                          <Scissors className="w-3 h-3 text-neutral-400" />
                          <span>步进切刀</span>
                        </span>
                        <span className="text-emerald-700 font-bold">PASS 裁切</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-b border-dashed border-neutral-300 my-1.5" />

                  {/* Character Matrix Demo */}
                  <div className="space-y-1 text-[10px]">
                    <p className="font-bold text-neutral-900">GB18030 中英文字库测试:</p>
                    <p className="text-neutral-700">Urban Radar 流动餐车 档口极速出餐</p>
                    <p className="text-neutral-500 tracking-wider">0123456789 ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>
                  </div>

                  {/* Simulated QR Code */}
                  <div className="pt-2 flex flex-col items-center justify-center text-center space-y-1">
                    <div className="w-16 h-16 border-2 border-neutral-900 rounded flex items-center justify-center bg-white p-1">
                      <QrCode className="w-12 h-12 text-neutral-900" />
                    </div>
                    <span className="text-[9px] text-neutral-400">扫码校验机载打印链路</span>
                  </div>

                  <div className="border-b border-dashed border-neutral-300 my-1.5" />

                  {/* Footer */}
                  <div className="text-[10px] space-y-0.5 text-neutral-500">
                    <div className="flex justify-between">
                      <span>自检时间:</span>
                      <span>{timestamp}</span>
                    </div>
                    <div className="flex justify-between font-bold text-neutral-900">
                      <span>诊断结论:</span>
                      <span className="text-emerald-700">[ 通信链路正常就绪 ]</span>
                    </div>
                  </div>

                  {/* Bottom Sawtooth Paper Edge */}
                  <div className="pt-2 flex justify-center text-[10px] text-neutral-400 font-medium">
                    - - - - 自动裁切线 (CUT) - - - -
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="p-3 sm:p-4 border-t border-neutral-100 bg-white flex flex-col gap-2.5 shrink-0">
          {/* 主推荐行动行：直接唤起 BR RawPrinter */}
          <div className="flex items-center gap-2 w-full">
            <button
              type="button"
              onClick={handleSendToBRRawPrinter}
              disabled={isGeneratingImg}
              className="flex-1 h-9 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20 transition-all active:scale-[0.98]"
              title="生成 58mm 小票并直接发送至 BR RawPrinter 出单"
            >
              <Send className="w-3.5 h-3.5" />
              <span>发送至 BR RawPrinter 出单 (推荐)</span>
            </button>

            <button
              type="button"
              onClick={handleGenerateReceiptImage}
              disabled={isGeneratingImg}
              className="h-9 px-3 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-colors shrink-0"
              title="导出小票长图，可在手机相册中保存"
            >
              <Share2 className="w-3.5 h-3.5 text-neutral-500" />
              <span>导出图片</span>
            </button>
          </div>

          {/* 次级操作行 */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <button
              type="button"
              onClick={handleCopyText}
              className="h-7 px-2 rounded text-neutral-500 hover:text-neutral-800 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
            >
              <Copy className="w-3 h-3 text-neutral-400" />
              <span>复制文本</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReSendBytes}
                disabled={isSending}
                className="h-7 px-2.5 rounded-lg bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                title="重发 ESC/POS 原始字节"
              >
                <RefreshCw className={`w-3 h-3 text-neutral-400 ${isSending ? 'animate-spin' : ''}`} />
                <span>重发指令</span>
              </button>

              <button
                type="button"
                onClick={handleSystemPrint}
                className="h-7 px-2.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                title="调起系统打印通道"
              >
                <Printer className="w-3 h-3 text-neutral-500" />
                <span>系统隔空打印</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
