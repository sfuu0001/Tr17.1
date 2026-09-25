import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  MapPin,
  Navigation,
  DollarSign,
  UtensilsCrossed,
  ShieldAlert
} from 'lucide-react';
import { ChatMessageItem, ChatRole } from '../../utils/chatHub';

export interface ExceptionWorkflowCardProps {
  message: ChatMessageItem;
  activeRole: ChatRole;
  isSelf: boolean;
  onAction?: (action: 'accept' | 'refund' | 'view_berth', payload?: any) => void;
  showToast?: (title: string, desc?: string) => void;
  playChimeSound?: () => void;
}

export const ExceptionWorkflowCard: React.FC<ExceptionWorkflowCardProps> = ({
  message,
  activeRole,
  isSelf,
  onAction,
  showToast = () => {},
  playChimeSound = () => {}
}) => {
  const workflow = message.exceptionWorkflow;
  if (!workflow) return null;

  const isPending = workflow.status === 'pending';
  const isAccepted = workflow.status === 'accepted';
  const isRefunded = workflow.status === 'refund_requested';

  // 1. 换餐免差价协商卡片
  if (workflow.type === 'dish_replacement') {
    const orig = workflow.originalDish || { name: '黑松露芝士焗牛排', price: 68 };
    const repl = workflow.replacementDish || { name: '炭烤和牛汉堡套餐', price: 78, diffPrice: 0 };
    const canCustomerOperate = activeRole === 'user' || activeRole === 'platform';

    const handleAccept = () => {
      playChimeSound();
      showToast('已确认换餐', `已同意更换为【${repl.name}】，后厨正加急现制！`);
      if (onAction) onAction('accept');
    };

    const handleRefund = () => {
      playChimeSound();
      showToast('已申请退还差价', `已提交差额退还申请，系统将即时原路退回！`);
      if (onAction) onAction('refund');
    };

    return (
      <div className="w-[280px] sm:w-[320px] bg-white/95 backdrop-blur-md rounded-2xl border border-neutral-200/90 shadow-sm overflow-hidden font-sans text-neutral-800 animate-in fade-in duration-150">
        {/* 卡片顶栏 */}
        <div className="px-3 py-2 bg-amber-50/80 border-b border-amber-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 tracking-tight">
            <UtensilsCrossed className="w-3.5 h-3.5 text-amber-700 stroke-[1.5]" />
            <span>异常工单 · 备料告罄换餐协商</span>
          </div>
          <span
            className={`text-[10px] tabular-nums font-semibold px-1.5 py-0.2 rounded border shadow-3xs ${
              isPending
                ? 'bg-amber-100/80 text-amber-800 border-amber-300'
                : isAccepted
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-neutral-100 text-neutral-700 border-neutral-300'
            }`}
          >
            {isPending ? '待食客确认' : isAccepted ? '已同意换餐' : '已申请退款'}
          </span>
        </div>

        {/* 核心内容区：菜品对比 */}
        <div className="p-3 space-y-2.5">
          <p className="text-xs text-neutral-600 leading-relaxed font-normal">
            {workflow.description ||
              '原餐品备料已售罄，为不耽误您用餐，餐车申请更换为现烤汉堡，免收差价并优先现制配送！'}
          </p>

          <div className="grid grid-cols-2 gap-2 bg-neutral-50/80 p-2.5 rounded-xl border border-neutral-100 text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] text-neutral-400 tabular-nums font-medium block">原订餐品</span>
              <span className="font-semibold text-neutral-800 line-through truncate block">
                {orig.name}
              </span>
              <span className="text-[11px] tabular-nums text-neutral-500 font-medium">¥{orig.price}</span>
            </div>
            <div className="space-y-0.5 border-l border-neutral-200 pl-2">
              <span className="text-[10px] text-emerald-600 tabular-nums font-semibold block">
                建议替换 (免差价)
              </span>
              <span className="font-bold text-emerald-800 truncate block">
                {repl.name}
              </span>
              <span className="text-[11px] tabular-nums text-emerald-600 font-bold">
                ¥{repl.price} <span className="text-[9px] font-normal text-neutral-500">(原价)</span>
              </span>
            </div>
          </div>

          {/* 状态操作按钮 */}
          {isPending ? (
            canCustomerOperate ? (
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleAccept}
                  className="flex-1 py-1.5 px-2.5 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition active:scale-95 shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[2]" />
                  <span>同意替换 (免差价)</span>
                </button>
                <button
                  type="button"
                  onClick={handleRefund}
                  className="py-1.5 px-2.5 rounded-xl bg-neutral-100/90 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition active:scale-95 border border-neutral-200 shadow-3xs"
                >
                  <DollarSign className="w-3.5 h-3.5 stroke-[1.5]" />
                  <span>退差价</span>
                </button>
              </div>
            ) : (
              <div className="text-[11px] text-neutral-500 bg-neutral-100/70 p-2 rounded-xl text-center tabular-nums font-medium">
                ⏳ 等待食客端确认选择中...
              </div>
            )
          ) : isAccepted ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50/80 p-2 rounded-xl border border-emerald-200/80 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 stroke-[1.5]" />
              <span>食客已同意换餐，后厨现烤优先插单出餐！</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-neutral-700 bg-neutral-100 p-2 rounded-xl border border-neutral-200 font-medium">
              <DollarSign className="w-4 h-4 text-amber-600 shrink-0 stroke-[1.5]" />
              <span>食客已选择申请原路退款，财务系统已处理。</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. 餐车即时泊位变更卡片
  if (workflow.type === 'berth_relocation') {
    const berth = workflow.berthInfo || {
      fromLocation: '创智天地中央广场',
      toLocation: '创智天地2号门喷泉旁 (东北微移65m)',
      distanceDeltaMeters: 65,
      lat: 31.2312,
      lng: 121.4745,
      note: '因地段巡检微移，出餐自提与骑手取餐动线请按新位指引'
    };

    return (
      <div className="w-[280px] sm:w-[320px] bg-white/95 backdrop-blur-md rounded-2xl border border-neutral-200/90 shadow-sm overflow-hidden font-sans text-neutral-800 animate-in fade-in duration-150">
        <div className="px-3 py-2 bg-blue-50/80 border-b border-blue-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 tracking-tight">
            <Navigation className="w-3.5 h-3.5 text-blue-700 stroke-[1.5]" />
            <span>餐车雷达即时泊位微调指引</span>
          </div>
          <span className="text-[10px] tabular-nums font-semibold px-1.5 py-0.2 rounded bg-blue-100/90 text-blue-800 border border-blue-200 shadow-3xs">
            微移 {berth.distanceDeltaMeters}m
          </span>
        </div>

        <div className="p-3 space-y-2.5">
          <p className="text-xs text-neutral-600 leading-relaxed font-normal">
            {berth.note || '为配合现场路况微调，餐车已向东北微移 65米，骑手与自提食客请按新动线前往。'}
          </p>

          <div className="space-y-1.5 bg-neutral-50/80 p-2.5 rounded-xl border border-neutral-100 text-xs tabular-nums">
            <div className="flex items-center gap-1.5 text-neutral-400">
              <span className="w-2 h-2 rounded-full bg-neutral-300 shrink-0" />
              <span className="line-through truncate font-normal">原泊位：{berth.fromLocation}</span>
            </div>
            <div className="flex items-center gap-1.5 text-blue-900 font-semibold">
              <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
              <span className="truncate">新泊位：{berth.toLocation}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playChimeSound();
              showToast('已调起泊位雷达指引', `新泊位：${berth.toLocation}`);
              if (onAction) onAction('view_berth', berth);
            }}
            className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-95 shadow-xs"
          >
            <MapPin className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>查看新泊位雷达指引动线</span>
          </button>
        </div>
      </div>
    );
  }

  return null;
};
