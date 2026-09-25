import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  X,
  MapPin,
  Package,
  CloudRain,
  BatteryCharging,
  Clock,
  HelpCircle,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { ActiveDeliveryOrder, PoolDeliveryOrder } from '../../types';

export interface RiderRejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ActiveDeliveryOrder | PoolDeliveryOrder | null;
  remainingQuota?: number; // e.g. 3
  onConfirmReject: (orderId: string, orderNo: string, reason: string, reasonCode: string) => void;
  showToast: (msg: string) => void;
}

export const RiderRejectionModal: React.FC<RiderRejectionModalProps> = ({
  isOpen,
  onClose,
  order,
  remainingQuota = 2,
  onConfirmReject,
  showToast
}) => {
  const [selectedReasonCode, setSelectedReasonCode] = useState<string>('out_of_range');
  const [customNote, setCustomNote] = useState<string>('');

  if (!isOpen || !order) return null;

  const rejectionTaxonomies = [
    {
      code: 'out_of_range',
      title: '超出配送极限半径 (>5.0km)',
      desc: '超出当前餐车与电摩合理锁鲜续航圈，难以保障准时妥投',
      icon: MapPin,
      badge: '半径边界'
    },
    {
      code: 'capacity_full',
      title: '恒温箱已满载 / 餐品体积超规',
      desc: '车尾 68℃ 恒温箱已无空位，强行装载易造成餐品倾倒洒漏',
      icon: Package,
      badge: '运力边界'
    },
    {
      code: 'extreme_weather',
      title: '极端恶劣天气 / 道路封锁积水',
      desc: '触发气象应急预警，路面存在严重安全隐患',
      icon: CloudRain,
      badge: '安全边界'
    },
    {
      code: 'vehicle_battery_fault',
      title: '电量低于 15% / 车辆突发故障',
      desc: '需紧急前往附近智能换电柜更换电池或检修',
      icon: BatteryCharging,
      badge: '设备边界'
    },
    {
      code: 'dispatch_timeout',
      title: '30s 抢单超时未响应',
      desc: '智能派单系统倒计时结束，触发安全兜底转派机制',
      icon: Clock,
      badge: '超时兜底'
    },
    {
      code: 'other',
      title: '其他不可抗力原因',
      desc: '需输入具体事由由运营调度中枢人工复核',
      icon: HelpCircle,
      badge: '人工审核'
    }
  ];

  const selectedTaxonomy = rejectionTaxonomies.find((r) => r.code === selectedReasonCode) || rejectionTaxonomies[0];

  const handleConfirm = () => {
    const fullReason = customNote.trim()
      ? `${selectedTaxonomy.title}（${customNote.trim()}）`
      : selectedTaxonomy.title;

    onConfirmReject(order.id, order.orderNo, fullReason, selectedReasonCode);
    showToast(`已成功执行拒接/释放工单 #${order.orderNo}，系统已启动二次加权智能转派！`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white text-[#37352f] w-full max-w-lg rounded-[6px] border border-[#d3d1cb] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-4 py-3 bg-[#fdf2f2] border-b border-[#f8d7da] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-[3px] bg-[#eb5757] text-white flex items-center justify-center">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-bold text-xs text-[#9c2b2e] block">
                骑手拒接机制与边界风控
              </span>
              <span className="text-[10px] text-[#9c2b2e]/80 font-mono">
                订单: #{order.orderNo.replace(/^#/, '')}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-[3px] hover:bg-[#f8d7da] text-[#9c2b2e] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quota & Boundary Status Bar */}
        <div className="px-4 py-2.5 bg-[#fff8e6] border-b border-[#ffe082] text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[#856404]">
            <AlertTriangle className="w-4 h-4 text-[#d9730d] shrink-0" />
            <span>
              今日免惩拒接额度：
              <strong className={remainingQuota > 0 ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                {remainingQuota} / 3 次
              </strong>
            </span>
          </div>
          <span className="text-[10px] text-[#856404]/80 font-mono">
            {remainingQuota > 0 ? '在合规边界内' : '⚠️ 已达上限将降权'}
          </span>
        </div>

        {/* Secondary Dispatch Escalation Explanation */}
        <div className="px-4 py-2 bg-[#f0f9ff] border-b border-[#bae6fd] text-[11px] text-[#0369a1] flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-[#0284c7] shrink-0" />
          <span>
            <strong>二次转派保障：</strong>拒接后工单将自动追加 <strong>+¥2.00 平台加急赏金</strong> 重入候选池；连续拒接将升级至<strong>【餐车主理人兜底中枢】</strong>。
          </span>
        </div>

        {/* Reason Selection List */}
        <div className="p-4 flex-1 overflow-y-auto space-y-2.5">
          <span className="text-[11px] font-bold text-[#787774] block">选择规范拒接原因 (纳入风控审计):</span>

          <div className="grid grid-cols-1 gap-2">
            {rejectionTaxonomies.map((item) => {
              const Icon = item.icon;
              const isSelected = selectedReasonCode === item.code;
              return (
                <div
                  key={item.code}
                  onClick={() => setSelectedReasonCode(item.code)}
                  className={`p-2.5 rounded-[4px] border cursor-pointer transition-all flex items-start gap-2.5 ${
                    isSelected
                      ? 'bg-[#fef2f2] border-[#eb5757] text-[#37352f] shadow-xs'
                      : 'bg-[#fbfbfa] border-[#e6e6e4] hover:border-[#b8b6af]'
                  }`}
                >
                  <div className={`p-1.5 rounded-[3px] mt-0.5 ${isSelected ? 'bg-[#eb5757] text-white' : 'bg-[#f1f1ef] text-[#787774]'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-xs text-[#37352f]">{item.title}</span>
                      <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-bold ${
                        isSelected ? 'bg-[#eb5757]/15 text-[#9c2b2e]' : 'bg-[#f0f0ed] text-[#787774]'
                      }`}>
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#787774] mt-0.5 leading-snug">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Supplementary Reason Input */}
          <div className="pt-1.5 space-y-1">
            <span className="text-[11px] font-bold text-[#787774] block">补充现场情况说明 (选填):</span>
            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="例如: 恒温箱已装有 2 份大份焗饭，无法稳妥平放..."
              className="w-full px-3 py-1.5 bg-[#f7f7f5] border border-[#d3d1cb] rounded-[3px] text-xs focus:outline-none focus:border-[#eb5757]"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-[#f7f7f5] border-t border-[#e6e6e4] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-[3px] bg-white border border-[#d3d1cb] hover:bg-[#efefed] text-xs font-semibold text-[#37352f] transition-all cursor-pointer"
          >
            返回任务
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-1.5 rounded-[3px] bg-[#eb5757] hover:bg-[#d44343] text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>确认拒接并转派</span>
          </button>
        </div>
      </div>
    </div>
  );
};
