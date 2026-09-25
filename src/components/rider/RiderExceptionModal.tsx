import React, { useState } from 'react';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  X,
  ShieldAlert,
  Flame,
  UserX,
  CloudRain,
  Building
} from 'lucide-react';

interface RiderExceptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNo: string;
  onReportException: (reason: string, addMinutes: number) => void;
  showToast: (msg: string) => void;
}

export const RiderExceptionModal: React.FC<RiderExceptionModalProps> = ({
  isOpen,
  onClose,
  orderNo,
  onReportException,
  showToast
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('餐车现场现烤备餐中 (申请加时)');
  const [addedMinutes, setAddedMinutes] = useState<number>(5);
  const [note, setNote] = useState<string>('');

  const exceptions = [
    {
      id: 'truck_cooking',
      title: '餐车现场现烤备餐中',
      desc: '高峰期餐车炭烤炉满载，需多等候 3~5 分钟',
      icon: Flame,
      defaultMinutes: 5
    },
    {
      id: 'customer_unreachable',
      title: '顾客电话暂未接听',
      desc: '已多次呼叫或发送短信，等待顾客回复',
      icon: UserX,
      defaultMinutes: 8
    },
    {
      id: 'building_access',
      title: '写字楼门禁/电梯管制',
      desc: '高峰期电梯排队或前台核验登记受阻',
      icon: Building,
      defaultMinutes: 6
    },
    {
      id: 'weather_delay',
      title: '暴雨/道路临时施工绕行',
      desc: '路况复杂，需开启恶劣天气免责通道',
      icon: CloudRain,
      defaultMinutes: 10
    }
  ];

  if (!isOpen) return null;

  const handleSubmit = () => {
    const fullReason = note.trim() ? `${selectedReason} - ${note.trim()}` : selectedReason;
    onReportException(fullReason, addedMinutes);
    showToast(`异常报备成功！系统已自动为您顺延 +${addedMinutes} 分钟免罚超时时间。`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white text-[#37352f] w-full max-w-md rounded-[6px] border border-[#d3d1cb] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-4 py-3 bg-[#fdf8f0] border-b border-[#f3e5ce] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-[3px] bg-[#d9730d] text-white flex items-center justify-center">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-bold text-xs text-[#8f6412] block">
                配送异常快速报备与申诉
              </span>
              <span className="text-[10px] text-[#8f6412]/80 font-mono">订单: {orderNo}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-[3px] hover:bg-[#f5e3ca] text-[#8f6412] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tip */}
        <div className="px-4 py-2 bg-[#fbf3db] border-b border-[#ecd9a8] text-[11px] text-[#8f6412]">
          💡 报备成功后，系统将自动通知顾客并豁免骑手超时考核，保障您的准时履约金。
        </div>

        {/* Exception options */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3">
          <span className="text-[11px] font-bold text-[#787774] block">选择异常原因:</span>
          <div className="space-y-2">
            {exceptions.map((ex) => {
              const Icon = ex.icon;
              const isSelected = selectedReason === ex.title;
              return (
                <div
                  key={ex.id}
                  onClick={() => {
                    setSelectedReason(ex.title);
                    setAddedMinutes(ex.defaultMinutes);
                  }}
                  className={`p-3 rounded-[4px] border cursor-pointer transition-all flex items-start gap-2.5 ${
                    isSelected
                      ? 'bg-[#fdf8f0] border-[#d9730d] text-[#37352f] shadow-xs'
                      : 'bg-[#fbfbfa] border-[#e6e6e4] hover:border-[#b8b6af]'
                  }`}
                >
                  <div className={`p-1.5 rounded-[3px] mt-0.5 ${isSelected ? 'bg-[#d9730d] text-white' : 'bg-[#f1f1ef] text-[#787774]'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{ex.title}</span>
                      <span className="text-[10px] font-mono font-bold text-[#d9730d]">
                        + {ex.defaultMinutes} 分钟
                      </span>
                    </div>
                    <p className="text-[11px] text-[#787774] mt-0.5 leading-tight">{ex.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Supplementary note */}
          <div className="space-y-1 pt-1">
            <span className="text-[11px] font-bold text-[#787774] block">补充说明 (选填):</span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例如: 餐车炭火正旺，主厨告知正在出餐..."
              className="w-full px-3 py-1.5 bg-[#f7f7f5] border border-[#d3d1cb] rounded-[3px] text-xs focus:outline-none focus:border-[#d9730d]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#f7f7f5] border-t border-[#e6e6e4] flex items-center justify-between gap-2.5">
          <span className="text-xs text-[#787774] flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-[#d9730d]" />
            <span>自动顺延加时: <strong className="text-[#d9730d]">+{addedMinutes} 分钟</strong></span>
          </span>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-white border border-[#d3d1cb] hover:bg-[#efefed] text-[#37352f] rounded-[3px] font-semibold text-xs transition-all cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-4 py-1.5 bg-[#d9730d] hover:bg-[#b85e05] active:scale-98 text-white rounded-[3px] font-bold text-xs transition-all cursor-pointer shadow-xs"
            >
              确认提交报备
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
