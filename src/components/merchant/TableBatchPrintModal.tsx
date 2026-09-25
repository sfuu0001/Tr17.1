import React, { useState, useMemo } from 'react';
import {
  QrCode,
  Printer,
  Download,
  X,
  CheckCircle2,
  Share2,
  Copy,
  Layers,
  Utensils,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { TableItem } from '../../types';
import { useToast } from '../ui/ToastContext';
import { getQrPayloadByTableCode } from '../../utils/tableQrEngine';
import { getUnifiedTruckName } from '../../utils/truckNaming';

interface TableBatchPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: TableItem[];
  truckId?: string;
  truckName?: string;
  isEmbedded?: boolean;
}

export const TableBatchPrintModal: React.FC<TableBatchPrintModalProps> = ({
  isOpen,
  onClose,
  tables,
  truckId,
  truckName,
  isEmbedded = false
}) => {
  const toast = useToast();
  const resolvedTruckName = getUnifiedTruckName(truckId || truckName || 'truck-01', 'standard');
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [singleInspectTable, setSingleInspectTable] = useState<TableItem | null>(null);

  // Filter tables by zone
  const filteredTables = useMemo(() => {
    if (selectedZone === 'all') return tables;
    return tables.filter((t) => t.zone === selectedZone);
  }, [tables, selectedZone]);

  if (!isOpen) return null;

  // Base URL for scanning
  const baseUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : 'https://tc100-d9gz0e2ko5929e360-1445454244.tcloudbaseapp.com/';

  const getTableScanUrl = (tableCode: string) => {
    // T3：数据源切换为 tableQrEngine —— URL 携带轮换令牌（qrToken），
    // 旧的无令牌 URL 仅作引擎未初始化时的兜底。
    const payload = getQrPayloadByTableCode(tableCode);
    if (payload?.url) return payload.url;
    return `${baseUrl}?table=${encodeURIComponent(tableCode)}&mode=dine_in`;
  };

  const getTableQrImageUrl = (tableCode: string) => {
    const scanUrl = getTableScanUrl(tableCode);
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(scanUrl)}`;
  };

  const handleCopyLink = (tableCode: string) => {
    const link = getTableScanUrl(tableCode);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link);
      toast.success('扫码点餐直达链接已复制', link);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Main inner content
  const content = (
    <div className={`relative w-full bg-white flex flex-col overflow-hidden ${
      isEmbedded
        ? 'rounded-lg border border-neutral-200 shadow-xs print:border-none print:shadow-none'
        : 'h-full md:h-auto md:max-h-[92vh] md:max-w-4xl md:rounded-lg md:shadow-2xl md:border md:border-neutral-200 print:max-h-none print:shadow-none print:border-none print:p-0'
    }`}>
      {/* Header (Hidden when printing) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 border-b border-neutral-200 bg-neutral-50 shrink-0 gap-3 print:hidden">
        <div className="flex items-start sm:items-center justify-between gap-2.5 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-md bg-neutral-900 text-white flex items-center justify-center font-bold shrink-0">
              <QrCode className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-neutral-900 truncate">
                  桌台扫码点餐码 · 批量排版与打印中心
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-neutral-900 text-white text-[10px] sm:text-[10.5px] font-mono font-bold shrink-0">
                  直通该桌菜单
                </span>
                {isEmbedded && (
                  <span className="px-2 py-0.5 rounded-md bg-neutral-200 text-neutral-700 text-[10px] font-bold shrink-0">
                    内嵌式工作台
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-neutral-500 mt-0.5">
                顾客微信/相机扫码即刻自动绑定指定桌台，就座点餐直通后厨 KDS，免人工问询录入。
              </p>
            </div>
          </div>

          {/* Close/Collapse icon on mobile */}
          <button
            type="button"
            onClick={onClose}
            className="sm:hidden p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-md cursor-pointer shrink-0"
            title={isEmbedded ? '收起内嵌排版' : '关闭'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action button row */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePrint}
            className="w-full sm:w-auto px-4 py-1.5 rounded-md bg-neutral-900 hover:bg-black text-white text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-[0_2px_0_#404040] active:translate-y-0.5 active:shadow-none whitespace-nowrap shrink-0"
          >
            <Printer className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">调用系统打印立牌</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="hidden sm:flex p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-md cursor-pointer transition-colors shrink-0"
            title={isEmbedded ? '收起内嵌工作台' : '关闭窗口'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter bar (Hidden when printing) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3 sm:px-5 py-2 sm:py-2.5 bg-neutral-50 border-b border-neutral-200 text-xs shrink-0 gap-2 print:hidden">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 w-full sm:w-auto shrink-0">
          <span className="text-neutral-500 font-bold whitespace-nowrap shrink-0">区域筛选:</span>
          {[
            { id: 'all', label: `全部桌台 (${tables.length})` },
            { id: 'patio', label: '外摆休闲区' },
            { id: 'indoor', label: '散座区' },
            { id: 'bar', label: '吧台高脚凳' }
          ].map((z) => (
            <button
              key={z.id}
              type="button"
              onClick={() => setSelectedZone(z.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                selectedZone === z.id
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              {z.label}
            </button>
          ))}
        </div>

        <div className="text-[11px] text-neutral-500 flex items-center gap-1 shrink-0 whitespace-nowrap overflow-x-auto no-scrollbar">
          <Sparkles className="w-3.5 h-3.5 text-neutral-900 shrink-0" />
          <span>支持 A4 一页4立牌打印，建议选用哑光加厚卡纸装入亚克力立台</span>
        </div>
      </div>

      {/* Table Cards Print Grid */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-neutral-100/60 print:p-0 print:bg-white print:overflow-visible custom-scrollbar">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 print:grid-cols-2 print:gap-6">
          {filteredTables.map((table) => {
            const scanUrl = getTableScanUrl(table.code);
            const qrImg = getTableQrImageUrl(table.code);

            return (
              <div
                key={table.id}
                className="bg-white rounded-lg border border-neutral-200 p-3.5 sm:p-4 flex flex-col items-center justify-between text-center relative shadow-xs hover:border-neutral-400 transition-all print:shadow-none print:border-2 print:border-neutral-900 print:break-inside-avoid"
                style={{ minHeight: '320px' }}
              >
                {/* Stand Header Branding */}
                <div className="w-full border-b border-neutral-200 pb-2.5 mb-2.5 flex items-center justify-between">
                  <div className="text-left min-w-0">
                    <div className="text-[11px] font-bold text-neutral-900 flex items-center gap-1 truncate">
                      <Utensils className="w-3 h-3 text-neutral-700 shrink-0" />
                      <span className="truncate">{resolvedTruckName}</span>
                    </div>
                    <div className="text-[9.5px] text-neutral-500 truncate">{table.zoneLabel || '外摆就餐区'}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-neutral-900 text-white font-mono text-[10px] font-bold shrink-0 ml-1">
                    堂食专座
                  </span>
                </div>

                {/* Big Table Code Badge */}
                <div className="mb-2">
                  <div className="text-3xl font-black font-mono tracking-tight text-neutral-900">
                    {table.code}
                  </div>
                  <div className="text-[11px] text-neutral-500 font-medium mt-0.5">
                    {table.name} · 建议 {table.capacity} 人入座
                  </div>
                </div>

                {/* QR Code Container */}
                <div className="p-2.5 bg-white border border-neutral-200 rounded-lg shadow-2xs my-1 relative group">
                  <img
                    src={qrImg}
                    alt={`桌台 ${table.code} 扫码二维码`}
                    className="w-32 h-32 sm:w-36 sm:h-36 object-contain"
                    loading="lazy"
                  />
                </div>

                {/* Instructions */}
                <div className="mt-2 space-y-0.5">
                  <div className="text-xs font-black text-neutral-900 tracking-wide">微信 / 手机扫码直达点餐</div>
                  <div className="text-[10px] text-neutral-500">
                    无需排队 · 现烤现制 · 直送本桌
                  </div>
                  {/* T3：人眼可读短码 —— 二维码破损时的人工兜底录入通道 */}
                  {(() => {
                    const payload = getQrPayloadByTableCode(table.code);
                    return payload?.shortCode ? (
                      <div className="text-[11px] font-black font-mono text-neutral-900 mt-1 tracking-widest">
                        短码 {payload.shortCode}
                      </div>
                    ) : null;
                  })()}
                </div>

                {/* Action links (Hidden on print) */}
                <div className="mt-3 pt-2.5 border-t border-neutral-200 w-full flex items-center justify-between text-[11px] print:hidden gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyLink(table.code)}
                    className="text-neutral-500 hover:text-neutral-900 flex items-center gap-1 cursor-pointer whitespace-nowrap transition-colors"
                    title="复制扫码点餐链接"
                  >
                    <Copy className="w-3 h-3" />
                    <span>复制链接</span>
                  </button>
                  <a
                    href={scanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-900 hover:underline font-bold flex items-center gap-1 whitespace-nowrap"
                  >
                    <span>模拟扫码直达</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer info (Hidden when printing) */}
      <div className="p-3 sm:p-3.5 bg-neutral-50 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-600 gap-2.5 shrink-0 print:hidden">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <CheckCircle2 className="w-4 h-4 text-neutral-900 shrink-0" />
          <span className="text-[11px] sm:text-xs">食客扫码后，系统将锁定该桌台，订单与加菜均自动打上对应桌号</span>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handlePrint}
            className="sm:hidden flex-1 px-3.5 py-2 rounded-md bg-neutral-900 text-white text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>调用系统打印</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 sm:flex-none px-4 py-2 sm:py-1.5 rounded-md border border-neutral-200 hover:bg-neutral-100 text-neutral-700 text-xs font-bold cursor-pointer text-center transition-colors shadow-2xs"
          >
            {isEmbedded ? '收起内嵌排版' : '关闭窗口'}
          </button>
        </div>
      </div>
    </div>
  );

  if (isEmbedded) {
    return (
      <div className="w-full my-3 print:my-0">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch md:items-center justify-center p-0 md:p-6 bg-[#fbfbfa] md:bg-black/60 md:backdrop-blur-xs overflow-y-auto">
      {content}
    </div>
  );
};
