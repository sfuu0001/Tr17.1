import React, { useState } from 'react';
import { 
  Users, 
  CreditCard, 
  Award, 
  Plus, 
  Search, 
  DollarSign, 
  Coins, 
  ArrowDownRight, 
  ArrowUpRight, 
  Download, 
  Gift, 
  Phone, 
  Calendar,
  Sparkles,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { 
  MemberRecord, 
  MemberRechargeRecord, 
  MemberTier 
} from '../../types';
import { 
  INITIAL_MEMBERS, 
  INITIAL_MEMBER_RECHARGES 
} from '../../data/merchantExtendedMockData';
import { exportToCsv } from '../../utils/dataExportEngine';
import { playChimeSound } from '../../utils/voiceAlertEngine';
import { DateRangeFilter } from '../common/DateRangeFilter';
import { DateFilterState, resolveDateRange, isWithinRange } from '../../utils/dateFilter';
import { useMemo } from 'react';

interface MerchantMemberCRMProps {
  showToast: (msg: string) => void;
}

export const MerchantMemberCRM: React.FC<MerchantMemberCRMProps> = ({ showToast }) => {
  const [members, setMembers] = useState<MemberRecord[]>(() => {
    const raw = localStorage.getItem('obsidian_members_crm');
    return raw ? JSON.parse(raw) : INITIAL_MEMBERS;
  });

  const [recharges, setRecharges] = useState<MemberRechargeRecord[]>(() => {
    const raw = localStorage.getItem('obsidian_member_recharges');
    return raw ? JSON.parse(raw) : INITIAL_MEMBER_RECHARGES;
  });

  const [activeTab, setActiveTab] = useState<'members' | 'recharges' | 'rules'>('members');
  // 时间区间筛选（充值记录 timestamp）
  const [dateFilter, setDateFilter] = useState<DateFilterState>({ preset: 'all' });
  const dateRange = useMemo(() => resolveDateRange(dateFilter), [dateFilter]);
  const filteredRecharges = useMemo(
    () => recharges.filter((r) => isWithinRange(new Date(r.timestamp || '').getTime(), dateRange)),
    [recharges, dateRange]
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  
  // Recharge Modal State
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState<boolean>(false);
  const [targetMember, setTargetMember] = useState<MemberRecord | null>(null);
  const [rechargeAmount, setRechargeAmount] = useState<number>(200);
  const [bonusAmount, setBonusAmount] = useState<number>(30);
  const [paymentMethod, setPaymentMethod] = useState<'wechat' | 'alipay' | 'cash' | 'pos'>('wechat');
  const [rechargeNote, setRechargeNote] = useState<string>('');

  // New Member Modal State
  const [isNewMemberModalOpen, setIsNewMemberModalOpen] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [newTier, setNewTier] = useState<MemberTier>('regular');
  const [initialBalance, setInitialBalance] = useState<number>(0);

  const saveMembers = (updated: MemberRecord[]) => {
    setMembers(updated);
    localStorage.setItem('obsidian_members_crm', JSON.stringify(updated));
  };

  const saveRecharges = (updated: MemberRechargeRecord[]) => {
    setRecharges(updated);
    localStorage.setItem('obsidian_member_recharges', JSON.stringify(updated));
  };

  const handleOpenRecharge = (member: MemberRecord) => {
    setTargetMember(member);
    setRechargeAmount(200);
    setBonusAmount(30);
    setIsRechargeModalOpen(true);
  };

  const handleConfirmRecharge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetMember) return;

    const totalReceived = rechargeAmount + bonusAmount;
    const newRecord: MemberRechargeRecord = {
      id: `rcg-${Date.now()}`,
      recordNo: `RC${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${Math.floor(Math.random() * 90 + 10)}`,
      memberId: targetMember.id,
      memberName: targetMember.name,
      phone: targetMember.phone,
      rechargeAmount,
      bonusAmount,
      totalReceived,
      paymentMethod,
      operator: '店长 (张伟)',
      timestamp: new Date().toLocaleString('zh-CN', { hour12: false }),
      note: rechargeNote || (bonusAmount > 0 ? `充值赠送 ¥${bonusAmount}` : '普通充值')
    };

    // Update member balance and points
    const earnedPoints = Math.floor(rechargeAmount);
    const updatedMembers = members.map(m => {
      if (m.id === targetMember.id) {
        const newBalance = m.balance + totalReceived;
        const newTotalSpent = m.totalSpent + rechargeAmount;
        // Auto tier upgrade check
        let upgradedTier: MemberTier = m.tier;
        let upgradedTierName = m.tierName;
        let upgradedDiscount = m.discountRate;

        if (newTotalSpent >= 3000) {
          upgradedTier = 'diamond';
          upgradedTierName = '黑钻会员';
          upgradedDiscount = 0.85;
        } else if (newTotalSpent >= 1500) {
          upgradedTier = 'gold';
          upgradedTierName = '黄金会员';
          upgradedDiscount = 0.90;
        } else if (newTotalSpent >= 500) {
          upgradedTier = 'silver';
          upgradedTierName = '白银会员';
          upgradedDiscount = 0.95;
        }

        return {
          ...m,
          balance: newBalance,
          points: m.points + earnedPoints,
          totalSpent: newTotalSpent,
          tier: upgradedTier,
          tierName: upgradedTierName,
          discountRate: upgradedDiscount
        };
      }
      return m;
    });

    saveMembers(updatedMembers);
    saveRecharges([newRecord, ...recharges]);
    setIsRechargeModalOpen(false);
    playChimeSound('success');
    showToast(`会员【${targetMember.name}】成功充值 ¥${rechargeAmount}（赠送 ¥${bonusAmount}），实际到账 ¥${totalReceived}！`);
  };

  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone) return;

    const discountRate = newTier === 'diamond' ? 0.85 : newTier === 'gold' ? 0.90 : newTier === 'silver' ? 0.95 : 1.0;
    const tierName = newTier === 'diamond' ? '黑钻会员' : newTier === 'gold' ? '黄金会员' : newTier === 'silver' ? '白银会员' : '大众会员';

    const newMember: MemberRecord = {
      id: `mem-${Date.now()}`,
      memberNo: `M${Math.floor(1000 + Math.random() * 9000)}`,
      name: newName,
      phone: newPhone,
      tier: newTier,
      tierName,
      discountRate,
      balance: initialBalance,
      points: 100, // 注册赠送 100 积分
      totalSpent: initialBalance,
      orderCount: initialBalance > 0 ? 1 : 0,
      lastVisit: '刚刚',
      registeredAt: new Date().toISOString().slice(0, 10),
      tags: ['新会员登记'],
      couponCount: 1
    };

    saveMembers([newMember, ...members]);
    setIsNewMemberModalOpen(false);
    setNewName('');
    setNewPhone('');
    setInitialBalance(0);
    playChimeSound('success');
    showToast(`新会员【${newName}】建档成功！已赠送 100 初始积分`);
  };

  const handleExportMembers = () => {
    exportToCsv(
      '黑石餐车_会员资产总表',
      [
        { label: '会员卡号', key: 'memberNo' },
        { label: '姓名', key: 'name' },
        { label: '手机号', key: 'phone' },
        { label: '会员等级', key: 'tierName' },
        { label: '专属折扣', key: 'discountRate' },
        { label: '储值余额(元)', key: 'balance' },
        { label: '当前积分', key: 'points' },
        { label: '累计消费(元)', key: 'totalSpent' },
        { label: '注册日期', key: 'registeredAt' }
      ],
      members
    );
    showToast('会员总表导出已开始下载！');
  };

  const filteredMembers = members.filter(m => {
    const matchQuery = m.name.includes(searchQuery) || m.phone.includes(searchQuery) || m.memberNo.includes(searchQuery);
    const matchTier = selectedTier === 'all' || m.tier === selectedTier;
    return matchQuery && matchTier;
  });

  const totalMemberBalance = members.reduce((sum, m) => sum + m.balance, 0);
  const totalRechargeCash = recharges.reduce((sum, r) => sum + r.rechargeAmount, 0);

  return (
    <div className="space-y-4 max-w-[2000px] mx-auto pb-10">
      {/* Header */}
      <div className="bg-white rounded-[4px] border border-[#e6e6e4] p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[2px] bg-[#f7f7f5] border border-[#e6e6e4] flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-[#37352f]" />
            </div>
            <h2 className="text-base font-semibold text-[#37352f]">会员储值卡与积分资产中心</h2>
            <span className="px-2 py-0.5 bg-[#edf6f1] text-[#2b593f] border border-[#cbe4d7] text-xs font-medium rounded-[2px]">
              注册会员 {members.length} 人
            </span>
          </div>
          <p className="text-xs text-[#787774] mt-1">
            支持会员等级分层（白银/黄金/黑钻专属折扣）、储值卡充赠流水、积分抵扣与营销资产管理。
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportMembers}
            className="px-3 py-1.5 bg-[#f7f7f5] hover:bg-[#efefed] text-[#37352f] rounded-[2px] text-xs font-medium flex items-center gap-1.5 cursor-pointer border border-[#e6e6e4] transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-[#787774]" />
            <span>导出会员报表</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNewMemberModalOpen(true)}
            className="px-3.5 py-1.5 bg-[#37352f] hover:bg-[#201f1d] text-white rounded-[2px] text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新增会员建档</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 sm:p-4 rounded-[4px] border border-[#e6e6e4] shadow-2xs">
          <span className="text-xs text-[#787774] block">全店储值沉淀资金</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xs text-[#d9730d] font-semibold">¥</span>
            <span className="text-xl sm:text-2xl font-semibold text-[#37352f] font-mono">{totalMemberBalance.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-[4px] border border-[#e6e6e4] shadow-2xs">
          <span className="text-xs text-[#787774] block">本月累计充值实收</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xs text-[#2b593f] font-semibold">¥</span>
            <span className="text-xl sm:text-2xl font-semibold text-[#2b593f] font-mono">{totalRechargeCash.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-[4px] border border-[#e6e6e4] shadow-2xs">
          <span className="text-xs text-[#787774] block">黑钻/黄金高净值会员</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-semibold text-[#37352f] font-mono">
              {members.filter(m => m.tier === 'diamond' || m.tier === 'gold').length}
            </span>
            <span className="text-xs text-[#787774]">位 (占比 {Math.round((members.filter(m => m.tier === 'diamond' || m.tier === 'gold').length / (members.length || 1)) * 100)}%)</span>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-[4px] border border-[#e6e6e4] shadow-2xs">
          <span className="text-xs text-[#787774] block">会员积分总池</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-semibold text-[#37352f] font-mono">
              {members.reduce((s, m) => s + m.points, 0).toLocaleString()}
            </span>
            <span className="text-xs text-[#787774]">分 (可抵 ¥{(members.reduce((s, m) => s + m.points, 0) / 100).toFixed(0)})</span>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="bg-white rounded-[4px] border border-[#e6e6e4] p-3.5 sm:p-4 space-y-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#efefed]">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-nowrap max-w-full">
            <button
              type="button"
              onClick={() => setActiveTab('members')}
              className={`px-3 py-1 text-xs font-medium rounded-full cursor-pointer whitespace-nowrap shrink-0 transition-all bg-white border ${
                activeTab === 'members'
                  ? 'border-zinc-900 text-zinc-900 font-semibold shadow-2xs'
                  : 'border-[#e6e6e4] text-[#5a5854] hover:text-zinc-900 hover:border-zinc-300 hover:bg-slate-50'
              }`}
            >
              会员档案名册 ({members.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('recharges')}
              className={`px-3 py-1 text-xs font-medium rounded-full cursor-pointer whitespace-nowrap shrink-0 transition-all bg-white border ${
                activeTab === 'recharges'
                  ? 'border-zinc-900 text-zinc-900 font-semibold shadow-2xs'
                  : 'border-[#e6e6e4] text-[#5a5854] hover:text-zinc-900 hover:border-zinc-300 hover:bg-slate-50'
              }`}
            >
              储值充赠明细流水 ({recharges.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('rules')}
              className={`px-3 py-1 text-xs font-medium rounded-full cursor-pointer whitespace-nowrap shrink-0 transition-all bg-white border ${
                activeTab === 'rules'
                  ? 'border-zinc-900 text-zinc-900 font-semibold shadow-2xs'
                  : 'border-[#e6e6e4] text-[#5a5854] hover:text-zinc-900 hover:border-zinc-300 hover:bg-slate-50'
              }`}
            >
              等级折扣与充值规则配置
            </button>
          </div>

          {activeTab === 'members' && (
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#787774]" />
                <input
                  type="text"
                  placeholder="搜索卡号/手机号/姓名"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs border border-[#e6e6e4] bg-[#f7f7f5] rounded-[2px] focus:outline-none focus:border-[#37352f] w-full sm:w-48 text-[#37352f]"
                />
              </div>

              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-[#e6e6e4] rounded-[2px] bg-white text-[#37352f] shrink-0 focus:outline-none focus:border-[#37352f]"
              >
                <option value="all">全部等级</option>
                <option value="diamond">黑钻会员 (85折)</option>
                <option value="gold">黄金会员 (9折)</option>
                <option value="silver">白银会员 (95折)</option>
                <option value="regular">大众会员</option>
              </select>
            </div>
          )}
        </div>

        {/* 1. Member Roster Table & Responsive Cards */}
        {activeTab === 'members' && (
          <div>
            {/* Mobile / Tablet Cards (< md) */}
            <div className="md:hidden space-y-2.5">
              {filteredMembers.map(m => (
                <div
                  key={m.id}
                  className="p-3 bg-white border border-[#e6e6e4] rounded-[2px] space-y-2.5 shadow-2xs hover:border-[#37352f] transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm text-[#37352f]">{m.name}</span>
                        <span className={`px-1.5 py-0.2 rounded-[2px] text-[10px] font-medium border inline-flex items-center gap-0.5 ${
                          m.tier === 'diamond'
                            ? 'bg-[#37352f] text-white border-[#37352f]'
                            : m.tier === 'gold'
                            ? 'bg-[#fef3d6] text-[#d9730d] border-[#fae2a0]'
                            : m.tier === 'silver'
                            ? 'bg-[#f7f7f5] text-[#37352f] border-[#e6e6e4]'
                            : 'bg-[#fafaf8] text-[#787774] border-[#e6e6e4]'
                        }`}>
                          {m.tier === 'diamond' && '💎 '}
                          {m.tier === 'gold' && '🥇 '}
                          {m.tier === 'silver' && '🥈 '}
                          {m.tierName} · {Math.round(m.discountRate * 100)}折
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-[#787774] mt-0.5">
                        卡号: {m.memberNo} · 手机: {m.phone}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenRecharge(m)}
                      className="px-2.5 py-1 bg-[#f7f7f5] hover:bg-[#efefed] text-[#37352f] border border-[#e6e6e4] rounded-[2px] text-xs font-medium cursor-pointer transition-colors shrink-0 shadow-2xs"
                    >
                      充值 💳
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 p-2 bg-[#fafaf8] rounded-[2px] border border-[#efefed] text-center">
                    <div>
                      <div className="text-[10px] text-[#787774]">储值余额</div>
                      <div className="font-semibold text-xs text-[#2b593f] font-mono mt-0.5">
                        ¥{m.balance.toFixed(0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#787774]">当前积分</div>
                      <div className="font-mono text-xs text-[#37352f] font-medium mt-0.5">
                        {m.points}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#787774]">累计消费</div>
                      <div className="font-mono text-xs text-[#787774] mt-0.5">
                        ¥{m.totalSpent.toFixed(0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#787774]">最近光顾</div>
                      <div className="text-[10px] text-[#787774] truncate mt-0.5">
                        {m.lastVisit}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (>= md) */}
            <div className="hidden md:block overflow-x-auto -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
              <table className="w-full text-xs text-left min-w-[620px]">
                <thead className="bg-[#fafaf8] text-[#787774] font-medium border-y border-[#e6e6e4]">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">会员卡号 / 姓名</th>
                    <th className="py-2.5 px-3 font-semibold">手机号</th>
                    <th className="py-2.5 px-3 font-semibold">会员等级与折扣</th>
                    <th className="py-2.5 px-3 text-right font-semibold">储值余额</th>
                    <th className="py-2.5 px-3 text-right font-semibold">积分</th>
                    <th className="py-2.5 px-3 text-right font-semibold">累计消费</th>
                    <th className="py-2.5 px-3 font-semibold">最近光顾</th>
                    <th className="py-2.5 px-3 text-right font-semibold">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#efefed]">
                  {filteredMembers.map(m => (
                    <tr key={m.id} className="hover:bg-[#fafaf8] transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-[#37352f]">{m.name}</div>
                        <span className="text-[11px] font-mono text-[#787774]">{m.memberNo}</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[#37352f]">{m.phone}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-[2px] text-[11px] font-medium border inline-flex items-center gap-1 ${
                          m.tier === 'diamond'
                            ? 'bg-[#37352f] text-white border-[#37352f]'
                            : m.tier === 'gold'
                            ? 'bg-[#fef3d6] text-[#d9730d] border-[#fae2a0]'
                            : m.tier === 'silver'
                            ? 'bg-[#f7f7f5] text-[#37352f] border-[#e6e6e4]'
                            : 'bg-[#fafaf8] text-[#787774] border-[#e6e6e4]'
                        }`}>
                          {m.tier === 'diamond' && '💎 '}
                          {m.tier === 'gold' && '🥇 '}
                          {m.tier === 'silver' && '🥈 '}
                          {m.tierName} · {Math.round(m.discountRate * 100)}折
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-[#2b593f] font-mono">
                        ¥{m.balance.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[#37352f]">
                        {m.points}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[#787774]">
                        ¥{m.totalSpent.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-[#787774]">{m.lastVisit}</td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenRecharge(m)}
                          className="px-2.5 py-1 bg-[#f7f7f5] hover:bg-[#efefed] text-[#37352f] border border-[#e6e6e4] rounded-[2px] text-xs font-medium cursor-pointer transition-colors shadow-2xs"
                        >
                          充值赠送 💳
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. Recharge Records Table */}
        {activeTab === 'recharges' && (
          <>
            <div className="mb-2"><DateRangeFilter value={dateFilter} onChange={setDateFilter} compact /></div>
            <div>
              {/* Mobile / Tablet Cards (< md) */}
              <div className="md:hidden space-y-2.5">
                {filteredRecharges.map(r => (
                  <div
                    key={r.id}
                    className="p-3 bg-white border border-[#e6e6e4] rounded-[2px] space-y-2.5 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-sm text-[#37352f]">{r.memberName}</div>
                        <div className="text-[11px] font-mono text-[#787774] mt-0.5">
                          {r.phone} · <span className="text-[#787774]">{r.recordNo}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-sm text-[#37352f] font-mono">
                          到账 ¥{r.totalReceived.toFixed(2)}
                        </div>
                        <div className="text-[10.5px] text-[#787774]">
                          实付 ¥{r.rechargeAmount.toFixed(0)} + 赠 ¥{r.bonusAmount.toFixed(0)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-[#efefed] text-[11px]">
                      <span className="px-2 py-0.5 bg-[#f7f7f5] border border-[#e6e6e4] rounded-[2px] text-[10.5px] font-medium text-[#37352f]">
                        {r.paymentMethod === 'wechat' ? '微信支付' : r.paymentMethod === 'alipay' ? '支付宝' : '现金/POS'}
                      </span>
                      <span className="text-[#787774]">经手: {r.operator}</span>
                      <span className="text-[#787774] font-mono text-[10px]">{r.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table (>= md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-xs text-left min-w-[640px]">
                  <thead className="bg-[#fafaf8] text-[#787774] font-medium border-y border-[#e6e6e4]">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">流水号</th>
                      <th className="py-2.5 px-3 font-semibold">会员姓名 / 手机号</th>
                      <th className="py-2.5 px-3 text-right font-semibold">充值本金</th>
                      <th className="py-2.5 px-3 text-right font-semibold">赠送金额</th>
                      <th className="py-2.5 px-3 text-right font-semibold">实际到账</th>
                      <th className="py-2.5 px-3 font-semibold">支付渠道</th>
                      <th className="py-2.5 px-3 font-semibold">经手操作员</th>
                      <th className="py-2.5 px-3 font-semibold">充值时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#efefed]">
                    {filteredRecharges.map(r => (
                      <tr key={r.id} className="hover:bg-[#fafaf8] transition-colors">
                        <td className="py-3 px-3 font-mono text-[#787774]">{r.recordNo}</td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-[#37352f]">{r.memberName}</div>
                          <span className="text-[11px] font-mono text-[#787774]">{r.phone}</span>
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-[#2b593f] font-mono">
                          ¥{r.rechargeAmount.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right text-[#d9730d] font-medium font-mono">
                          +¥{r.bonusAmount.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-[#37352f] font-mono">
                          ¥{r.totalReceived.toFixed(2)}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 bg-[#f7f7f5] border border-[#e6e6e4] rounded-[2px] text-[11px] font-medium text-[#37352f]">
                            {r.paymentMethod === 'wechat' ? '微信支付' : r.paymentMethod === 'alipay' ? '支付宝' : '现金/POS'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[#787774]">{r.operator}</td>
                        <td className="py-3 px-3 text-[#787774] font-mono">{r.timestamp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* 3. Tier Rules & Recharge Packages */}
        {activeTab === 'rules' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
            {/* Tier Rules */}
            <div className="border border-[#e6e6e4] rounded-[4px] p-4 bg-[#fafaf8] shadow-2xs">
              <h4 className="font-semibold text-sm text-[#37352f] mb-3 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-[#d9730d]" />
                <span>会员等级成长与专属权益矩阵</span>
              </h4>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 bg-white rounded-[2px] border border-[#e6e6e4] flex items-center justify-between shadow-2xs">
                  <div>
                    <span className="font-semibold text-[#37352f] block">💎 黑钻会员 (Diamond)</span>
                    <span className="text-[11px] text-[#787774]">门槛：累计消费满 ¥3,000</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-[#d9730d]">全场 8.5 折</span>
                    <span className="text-[10px] text-[#787774] block">消费双倍积分</span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-[2px] border border-[#e6e6e4] flex items-center justify-between shadow-2xs">
                  <div>
                    <span className="font-semibold text-[#37352f] block">🥇 黄金会员 (Gold)</span>
                    <span className="text-[11px] text-[#787774]">门槛：累计消费满 ¥1,500</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-[#d9730d]">全场 9.0 折</span>
                    <span className="text-[10px] text-[#787774] block">消费 1.5 倍积分</span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-[2px] border border-[#e6e6e4] flex items-center justify-between shadow-2xs">
                  <div>
                    <span className="font-semibold text-[#37352f] block">🥈 白银会员 (Silver)</span>
                    <span className="text-[11px] text-[#787774]">门槛：累计消费满 ¥500</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-[#37352f]">全场 9.5 折</span>
                    <span className="text-[10px] text-[#787774] block">每月赠 10 元代金券</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Popular Recharge Packages */}
            <div className="border border-[#e6e6e4] rounded-[4px] p-4 bg-[#fafaf8] shadow-2xs">
              <h4 className="font-semibold text-sm text-[#37352f] mb-3 flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-[#2b593f]" />
                <span>热门储值充赠活动配置</span>
              </h4>

              <div className="space-y-2 text-xs">
                {[
                  { pay: 200, gift: 30, tag: '尝鲜推荐' },
                  { pay: 500, gift: 100, tag: '最划算 / 畅销' },
                  { pay: 1000, gift: 250, tag: 'VIP 专属赠礼' }
                ].map((pkg, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-[2px] border border-[#e6e6e4] flex items-center justify-between shadow-2xs">
                    <div>
                      <div className="font-semibold text-sm text-[#37352f]">
                        充值 ¥{pkg.pay} <span className="text-[#d9730d]">赠送 ¥{pkg.gift}</span>
                      </div>
                      <span className="text-[11px] text-[#787774]">实际到账 ¥{pkg.pay + pkg.gift}（综合折扣 8.7 折）</span>
                    </div>
                    <span className="px-2 py-0.5 bg-[#edf6f1] text-[#2b593f] border border-[#cbe4d7] rounded-[2px] text-[11px] font-medium">
                      {pkg.tag}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recharge Modal */}
      {isRechargeModalOpen && targetMember && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-[4px] border border-[#e6e6e4] shadow-2xs w-full max-w-md p-4 sm:p-5 text-[#37352f] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#efefed] mb-4">
              <h3 className="font-semibold text-base text-[#37352f]">会员储值卡充值</h3>
              <button
                type="button"
                onClick={() => setIsRechargeModalOpen(false)}
                className="text-[#787774] hover:text-[#37352f] p-1 cursor-pointer rounded-[2px]"
              >
                ✕
              </button>
            </div>

            <div className="bg-[#fafaf8] p-3 rounded-[2px] border border-[#e6e6e4] mb-4 text-xs">
              <div className="flex justify-between font-semibold text-sm mb-1">
                <span>{targetMember.name} ({targetMember.phone})</span>
                <span className="text-[#2b593f] font-mono">余额 ¥{targetMember.balance.toFixed(2)}</span>
              </div>
              <span className="text-[#787774]">等级：{targetMember.tierName}（享受 {Math.round(targetMember.discountRate * 100)} 折）</span>
            </div>

            <form onSubmit={handleConfirmRecharge} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#787774] mb-1 font-medium">快速快捷充值方案</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { pay: 200, bonus: 30 },
                    { pay: 500, bonus: 100 },
                    { pay: 1000, bonus: 250 }
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setRechargeAmount(p.pay);
                        setBonusAmount(p.bonus);
                      }}
                      className={`p-2 rounded-[2px] border text-center cursor-pointer transition-colors ${
                        rechargeAmount === p.pay && bonusAmount === p.bonus
                          ? 'bg-[#37352f] text-white border-[#37352f]'
                          : 'bg-[#fafaf8] border-[#e6e6e4] hover:bg-[#efefed] text-[#37352f]'
                      }`}
                    >
                      <div className="font-semibold text-sm font-mono">¥{p.pay}</div>
                      <div className="text-[10px]">赠 ¥{p.bonus}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#787774] mb-1 font-medium">实收金额 (元)</label>
                  <input
                    type="number"
                    min="1"
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-[#e6e6e4] bg-[#fafaf8] rounded-[2px] focus:outline-none focus:border-[#37352f] font-semibold text-[#37352f] font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[#787774] mb-1 font-medium">赠送金额 (元)</label>
                  <input
                    type="number"
                    min="0"
                    value={bonusAmount}
                    onChange={(e) => setBonusAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-[#e6e6e4] bg-[#fafaf8] rounded-[2px] focus:outline-none focus:border-[#37352f] text-[#d9730d] font-semibold font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#787774] mb-1 font-medium">收款渠道</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'wechat', label: '微信支付' },
                    { id: 'alipay', label: '支付宝' },
                    { id: 'cash', label: '现金/刷卡' }
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`py-1.5 rounded-[2px] border text-center cursor-pointer transition-colors text-xs ${
                        paymentMethod === m.id
                          ? 'bg-[#37352f] text-white border-[#37352f] font-medium'
                          : 'bg-[#fafaf8] border-[#e6e6e4] hover:bg-[#efefed] text-[#37352f]'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 bg-[#fef3d6]/30 p-2.5 rounded-[2px] border border-[#fae2a0] text-[#37352f] flex justify-between items-center font-medium">
                <span>实际到账总额：</span>
                <span className="text-base font-semibold font-mono text-[#2b593f]">¥{(rechargeAmount + bonusAmount).toFixed(2)}</span>
              </div>

              <div className="pt-3 border-t border-[#efefed] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRechargeModalOpen(false)}
                  className="px-3 py-1.5 text-[#787774] hover:text-[#37352f] rounded-[2px] cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#37352f] hover:bg-[#201f1d] text-white rounded-[2px] font-medium cursor-pointer shadow-2xs transition-colors"
                >
                  确认收款入账
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Member Registration Modal */}
      {isNewMemberModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-[4px] border border-[#e6e6e4] shadow-2xs w-full max-w-md p-4 sm:p-5 text-[#37352f] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#efefed] mb-4">
              <h3 className="font-semibold text-base text-[#37352f]">新增会员登记</h3>
              <button
                type="button"
                onClick={() => setIsNewMemberModalOpen(false)}
                className="text-[#787774] hover:text-[#37352f] p-1 cursor-pointer rounded-[2px]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#787774] mb-1 font-medium">会员姓名</label>
                <input
                  type="text"
                  placeholder="如: 王建国"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#e6e6e4] bg-[#fafaf8] rounded-[2px] focus:outline-none focus:border-[#37352f] text-[#37352f]"
                  required
                />
              </div>

              <div>
                <label className="block text-[#787774] mb-1 font-medium">手机号码</label>
                <input
                  type="tel"
                  placeholder="如: 13812345678"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#e6e6e4] bg-[#fafaf8] rounded-[2px] focus:outline-none focus:border-[#37352f] font-mono text-[#37352f]"
                  required
                />
              </div>

              <div>
                <label className="block text-[#787774] mb-1 font-medium">初始会员等级</label>
                <select
                  value={newTier}
                  onChange={(e) => setNewTier(e.target.value as MemberTier)}
                  className="w-full px-3 py-1.5 border border-[#e6e6e4] rounded-[2px] bg-white text-[#37352f] focus:outline-none focus:border-[#37352f]"
                >
                  <option value="regular">大众会员 (无折扣)</option>
                  <option value="silver">白银会员 (9.5折)</option>
                  <option value="gold">黄金会员 (9.0折)</option>
                  <option value="diamond">黑钻会员 (8.5折)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-[#efefed] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewMemberModalOpen(false)}
                  className="px-3 py-1.5 text-[#787774] hover:text-[#37352f] rounded-[2px] cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#37352f] hover:bg-[#201f1d] text-white rounded-[2px] font-medium cursor-pointer shadow-2xs transition-colors"
                >
                  保存并开卡
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
