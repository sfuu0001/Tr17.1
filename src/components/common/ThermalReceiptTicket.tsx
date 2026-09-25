import React, { useState } from 'react';
import { 
  Printer, 
  Scissors, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ShieldCheck, 
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { audioHaptics } from '../../utils/audioHaptics';

export interface ThermalReceiptItem {
  name: string;
  qty: number;
  price: number;
  note?: string;
}

export interface ThermalReceiptTicketProps {
  receiptNo: string;
  title: string;
  subtitle?: string;
  storeName?: string;
  terminalNo?: string;
  cashierName?: string;
  timestamp?: string;
  items?: ThermalReceiptItem[];
  subtotal?: number;
  discount?: number;
  totalAmount: number;
  payMethod?: string;
  taxNo?: string;
  stampText?: string; // e.g. '已对账平账' | '已核销' | '作废'
  stampColor?: 'green' | 'red' | 'amber';
  onPrint?: () => void;
  onTear?: () => void;
  className?: string;
}

export const ThermalReceiptTicket: React.FC<ThermalReceiptTicketProps> = ({
  receiptNo,
  title,
  subtitle,
  storeName = 'Urban Radar 流动餐车 #001',
  terminalNo = 'POS-TRUCK-88',
  cashierName = '系统收银员',
  timestamp = new Date().toLocaleString(),
  items = [],
  subtotal,
  discount = 0,
  totalAmount,
  payMethod = '聚合收款',
  taxNo = '91310115MA1K4RXXXX',
  stampText,
  stampColor = 'green',
  onPrint,
  onTear,
  className = ''
}) => {
  const [isTorn, setIsTorn] = useState(false);

  const handleTear = () => {
    audioHaptics.playTicketTear();
    setIsTorn(true);
    if (onTear) onTear();
  };

  const handlePrint = () => {
    audioHaptics.playTicketTear();
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div className={`relative max-w-sm mx-auto font-mono text-[#222] select-none transition-all duration-300 ${
      isTorn ? 'opacity-85 translate-y-2' : ''
    } ${className}`}>
      
      {/* 顶部挂纸孔与撕纸锯齿装饰 */}
      <div className="relative h-4 bg-[#f8f8f6] border-t border-x border-[#dcdcd8] rounded-t-sm flex items-center justify-center overflow-hidden">
        <div className="w-12 h-1.5 bg-[#e4e4e0] rounded-full" />
      </div>

      {/* 核心小票纸体 (仿热敏纸微米米白纸纹 + 物理微凹质感) */}
      <div className="bg-[#fcfcfa] border-x border-[#dcdcd8] p-4 text-xs space-y-3 shadow-md relative">
        
        {/* 水印防伪印章 */}
        {stampText && (
          <div className="absolute top-1/3 right-4 transform rotate-[-18deg] pointer-events-none z-10">
            <div className={`border-2 border-dashed px-3 py-1 rounded-[3px] font-extrabold text-sm tracking-widest uppercase opacity-80 ${
              stampColor === 'green' 
                ? 'border-[#2b593f] text-[#2b593f]' 
                : stampColor === 'red'
                ? 'border-[#d44333] text-[#d44333]'
                : 'border-amber-600 text-amber-700'
            }`}>
              {stampText}
            </div>
          </div>
        )}

        {/* 头部凭证信息 */}
        <div className="text-center space-y-1 pb-2 border-b border-dashed border-[#b8b8b0]">
          <h3 className="font-bold text-sm tracking-wider text-[#111]">{storeName}</h3>
          <p className="text-[11px] font-semibold text-[#444]">{title}</p>
          {subtitle && <p className="text-[10px] text-[#777]">{subtitle}</p>}
          <div className="text-[9.5px] text-[#888] pt-1 flex justify-between">
            <span>机号: {terminalNo}</span>
            <span>操作: {cashierName}</span>
          </div>
          <div className="text-[9.5px] text-[#888] flex justify-between">
            <span>时间: {timestamp}</span>
            <span>单号: #{receiptNo.slice(-6)}</span>
          </div>
        </div>

        {/* 细目列表 */}
        {items.length > 0 && (
          <div className="space-y-1.5 py-1 text-[11px]">
            <div className="flex justify-between font-bold text-[#555] pb-1 border-b border-[#e4e4e0] text-[10px]">
              <span>品名 / 规格</span>
              <span className="w-10 text-center">数量</span>
              <span className="w-14 text-right">金额</span>
            </div>
            {items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-baseline leading-tight">
                <div className="pr-1 truncate max-w-[170px]">
                  <span className="text-[#222] font-medium">{item.name}</span>
                  {item.note && <span className="text-[9px] text-[#888] block">{item.note}</span>}
                </div>
                <div className="w-10 text-center text-[#555] shrink-0 font-mono">x{item.qty}</div>
                <div className="w-14 text-right font-bold text-[#111] shrink-0">¥{(item.price * item.qty).toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}

        {/* 结算金额统计 */}
        <div className="pt-2 border-t border-dashed border-[#b8b8b0] space-y-1 text-[11px]">
          {subtotal !== undefined && (
            <div className="flex justify-between text-[#666]">
              <span>应收小计</span>
              <span>¥{subtotal.toFixed(2)}</span>
            </div>
          )}
          {discount > 0 && (
            <div className="flex justify-between text-[#d44333]">
              <span>优惠减免</span>
              <span>-¥{discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-baseline font-bold text-sm pt-1 border-t border-[#dcdcd8]">
            <span className="text-[#111]">实收净额 ({payMethod})</span>
            <span className="text-base text-[#2b593f]">¥{totalAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* 底部防伪纳税识别与条形码隐喻 */}
        <div className="pt-2 border-t border-dashed border-[#b8b8b0] text-[9px] text-[#888] text-center space-y-1">
          <div className="flex justify-between">
            <span>统一信用代码:</span>
            <span className="font-mono">{taxNo}</span>
          </div>
          
          {/* 仿真条形码 */}
          <div className="pt-1 flex items-center justify-center gap-0.5 h-6 opacity-70">
            {[4, 1, 3, 2, 1, 4, 2, 3, 1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 4, 1].map((w, i) => (
              <span 
                key={i} 
                className="bg-[#222] h-full inline-block" 
                style={{ width: `${w}px` }} 
              />
            ))}
          </div>
          <p className="tracking-widest font-mono text-[8px] text-[#aaa]">*{receiptNo}*</p>
        </div>
      </div>

      {/* 底部锯齿撕纸边缘 (Sawtooth Perforated Edge) */}
      <div className="relative h-3 bg-[#fcfcfa] border-x border-[#dcdcd8] overflow-hidden">
        <svg 
          className="absolute bottom-0 left-0 w-full h-2.5 text-[#fcfcfa] fill-current" 
          viewBox="0 0 300 10" 
          preserveAspectRatio="none"
        >
          <path d="M0,0 L10,10 L20,0 L30,10 L40,0 L50,10 L60,0 L70,10 L80,0 L90,10 L100,0 L110,10 L120,0 L130,10 L140,0 L150,10 L160,0 L170,10 L180,0 L190,10 L200,0 L210,10 L220,0 L230,10 L240,0 L250,10 L260,0 L270,10 L280,0 L290,10 L300,0 L300,10 L0,10 Z" fill="#e8e8e4" />
        </svg>
      </div>

      {/* 底部浮动撕纸与打印快捷操作条 */}
      <div className="mt-2 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={handleTear}
          className="px-2.5 py-1 bg-[#f1f1ef] hover:bg-[#e4e4e0] text-[#37352f] rounded-[3px] text-xs flex items-center gap-1 font-medium transition-colors cursor-pointer active:scale-95 shadow-2xs"
        >
          <Scissors className="w-3.5 h-3.5 text-[#787774]" />
          <span>{isTorn ? '已撕下单据' : '模拟撕下单据'}</span>
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="px-2.5 py-1 bg-[#2b593f] hover:bg-[#224832] text-white rounded-[3px] text-xs flex items-center gap-1 font-medium transition-colors cursor-pointer active:scale-95 shadow-2xs"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>打印凭证</span>
        </button>
      </div>
    </div>
  );
};
