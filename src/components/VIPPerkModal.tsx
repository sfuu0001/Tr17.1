import React, { useState } from 'react';
import { X, Sparkles, Zap, Flame, Award, Check, ChevronDown } from 'lucide-react';

interface VIPPerkModalProps {
  isOpen: boolean;
  onClose: () => void;
  isVIPActive: boolean;
  onToggleVIP: () => void;
}

interface PerkItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  detail: string;
  accent: string;
}

export const VIPPerkModal: React.FC<VIPPerkModalProps> = ({
  isOpen,
  onClose,
  isVIPActive,
  onToggleVIP
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const perks: PerkItem[] = [
    {
      id: 'queue',
      icon: <Zap className="w-3.5 h-3.5" />,
      title: '后厨出餐队列智能插队',
      desc: '订单直连流动餐车炭烤工作站,出餐优先级提高至 99%,平均缩短出餐耗时 40%。',
      detail:
        '特权细则:VIP 订单在餐车后厨工作站获得最高优先级标签,系统自动将其插入当前队列最前端,确保炭烤资源优先分配。适用全部堂食 / 外卖 / 自提履约方式。',
      accent: '#d97706'
    },
    {
      id: 'pack',
      icon: <Flame className="w-3.5 h-3.5" />,
      title: '专属恒温锁鲜航天包装',
      desc: '配备双层石墨烯恒温铝箔保温餐盒,保证 A5 和牛汉堡与炙烤五花肉到手依然酥脆焦香。',
      detail:
        '特权细则:每笔 VIP 订单默认升级为航天级恒温锁鲜包装,内含双层石墨烯铝箔 + 食品级硅胶密封圈,保温时效较普通包装提升 2.3 倍。',
      accent: '#006D36'
    },
    {
      id: 'coupon',
      icon: <Award className="w-3.5 h-3.5" />,
      title: '专享立减优惠券自动抵扣',
      desc: '每单自动抵扣 ¥5 专享特惠券,可与外卖立减叠加使用。',
      detail:
        '特权细则:VIP 会员结账时系统自动匹配并抵扣 UR-VIP5 专享券(立减 ¥5),与阶梯满减、支付渠道立减、黑卡折扣可叠加,单笔最高再省 ¥5。',
      accent: '#1677ff'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 pointer-events-none">
      {/* 极淡遮罩,点击关闭(仅遮罩层拦截,内嵌卡片不遮挡页面) */}
      <div className="fixed inset-0 bg-black/20 pointer-events-auto" onClick={onClose} />

      {/* 内嵌卡片 - 黑曜石与品牌全新重构风格 */}
      <div className="relative pointer-events-auto w-full max-w-md bg-white rounded-2xl border border-brand-border shadow-card flex flex-col overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Banner - 品牌暗调渐变与黑曜石元素 */}
        <div className="obsidian-mesh text-white border-b border-neutral-700 px-4 py-3.5 relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white flex items-center justify-center transition-colors cursor-pointer"
            type="button"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-emerald/20 border border-brand-emerald/40 text-brand-emeraldLight text-[11px] font-bold mb-1.5">
            <Sparkles className="w-3 h-3" />
            <span>URBAN RADAR BLACK VIP</span>
          </div>

          <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
            黑曜石 VIP 专属优先出餐特权
          </h3>
          <p className="text-[11px] text-neutral-300 mt-0.5">
            动态巡游智能餐车专属快速通道 · 告别排队等待
          </p>
        </div>

        {/* Perks list */}
        <div className="p-3.5 space-y-2.5 bg-neutral-50/70 text-xs max-h-[60vh] overflow-y-auto">
          {perks.map((perk) => {
            const isOpenDetail = expandedId === perk.id;
            return (
              <div
                key={perk.id}
                className="rounded-xl border border-brand-border bg-white shadow-sm overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isOpenDetail ? null : perk.id)}
                  className="w-full flex items-start gap-2.5 p-2.5 text-left cursor-pointer hover:bg-neutral-50 transition-colors"
                >
                  <div
                    className="p-1.5 rounded-lg shrink-0"
                    style={{ backgroundColor: `${perk.accent}14`, color: perk.accent }}
                  >
                    {perk.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-neutral-900 text-xs">{perk.title}</h4>
                    <p className="text-neutral-500 text-[10.5px] mt-0.5 leading-snug">{perk.desc}</p>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform ${
                      isOpenDetail ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* 内嵌子面板 - 特权明细 */}
                {isOpenDetail && (
                  <div className="px-2.5 pb-2.5 -mt-1">
                    <div className="rounded-lg border border-brand-border bg-neutral-50 p-2.5 text-[10.5px] leading-relaxed text-neutral-600">
                      {perk.detail}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Action Toggle - 品牌主按钮风格 */}
        <div className="p-3 bg-white border-t border-brand-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-neutral-900">当前 VIP 特权状态:</span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded border ${
                isVIPActive
                  ? 'bg-emerald-50 text-brand-emerald border-emerald-200'
                  : 'bg-neutral-100 text-neutral-600 border-neutral-200'
              }`}
            >
              {isVIPActive ? '已激活生效' : '未开启'}
            </span>
          </div>

          <button
            onClick={onToggleVIP}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm border ${
              isVIPActive
                ? 'bg-brand-emerald border-brand-emerald text-white hover:bg-emerald-700'
                : 'bg-brand-charcoal border-brand-charcoal text-white hover:bg-black'
            }`}
            type="button"
          >
            {isVIPActive ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>特权保持开启</span>
              </>
            ) : (
              <span>免费激活 VIP</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
