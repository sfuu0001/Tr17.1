import React, { useState } from 'react';
import {
  User,
  Phone,
  Crown,
  Coins,
  CreditCard,
  MapPin,
  Settings,
  Plus,
  Trash2,
  Check,
  Eye,
  EyeOff,
  Key,
  Copy,
  RotateCcw,
  Flame,
  Utensils,
  History,
  Calendar,
  Sparkles
} from 'lucide-react';
import { UserProfile, UserAddress } from '../../../types/user';
import { adjustUserBalance } from '../../../utils/userDataRegistry';

interface UserDataProfileFormProps {
  user: UserProfile;
  subTab: 'profile' | 'preferences' | 'wallet' | 'addresses';
  onUpdateUser: (u: UserProfile) => void;
  showToast: (msg: string) => void;
}

export const UserDataProfileForm: React.FC<UserDataProfileFormProps> = ({
  user,
  subTab,
  onUpdateUser,
  showToast
}) => {
  const [showFullPhone, setShowFullPhone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [editingPasswordVal, setEditingPasswordVal] = useState(user.password || 'Radar#8888');

  // 资产调整表单状态
  const [adjustKind, setAdjustKind] = useState<'balance' | 'points'>('balance');
  const [adjustDelta, setAdjustDelta] = useState<string>('50');
  const [adjustNote, setAdjustNote] = useState<string>('商家后台回馈补贴');

  // 新增地址表单状态
  const [showAddAddr, setShowAddAddr] = useState(false);
  const [newAddrName, setNewAddrName] = useState('');
  const [newAddrPhone, setNewAddrPhone] = useState(user.phone || '');
  const [newAddrTag, setNewAddrTag] = useState<'公司' | '家' | '学校' | '其他'>('公司');
  const [newAddrMain, setNewAddrMain] = useState('');
  const [newAddrDetail, setNewAddrDetail] = useState('');

  // 处理基本资料字段更新
  const handleFieldChange = (field: keyof UserProfile, value: any) => {
    const updated = { ...user, [field]: value };
    onUpdateUser(updated);
  };

  // 处理偏好设置更新
  const handlePrefChange = (field: string, value: any) => {
    const updated = {
      ...user,
      preferences: {
        ...user.preferences,
        [field]: value
      }
    };
    onUpdateUser(updated);
    showToast('已保存偏好参数设置');
  };

  // 执行资产调增/调减
  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(adjustDelta);
    if (isNaN(val) || val === 0) {
      showToast('请输入有效的变动数值');
      return;
    }
    const updated = adjustUserBalance(user, adjustKind, val, adjustNote.trim());
    onUpdateUser(updated);
    showToast(
      `已${val > 0 ? '调增' : '扣减'}食客${adjustKind === 'balance' ? '余额' : '积分'} ¥${Math.abs(val)}`
    );
  };

  // 添加新收货地址
  const handleAddAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddrMain.trim()) {
      showToast('请输入收货地址');
      return;
    }
    const newAddr: UserAddress = {
      id: `addr-${Date.now()}`,
      name: newAddrName.trim() || user.nickname,
      phone: newAddrPhone.trim() || user.phone,
      tag: newAddrTag,
      address: newAddrMain.trim(),
      detail: newAddrDetail.trim() || '无门牌号',
      isDefault: user.addresses.length === 0,
      createdAt: new Date().toISOString().slice(0, 16)
    };
    const updated: UserProfile = {
      ...user,
      addresses: [newAddr, ...user.addresses]
    };
    onUpdateUser(updated);
    setShowAddAddr(false);
    setNewAddrMain('');
    setNewAddrDetail('');
    showToast('已新增收货地址');
  };

  // 设为默认地址
  const handleSetDefaultAddr = (addrId: string) => {
    const updated: UserProfile = {
      ...user,
      addresses: user.addresses.map((a) => ({
        ...a,
        isDefault: a.id === addrId
      }))
    };
    onUpdateUser(updated);
    showToast('已更新默认收货地址');
  };

  // 删除地址
  const handleDeleteAddr = (addrId: string) => {
    const updated: UserProfile = {
      ...user,
      addresses: user.addresses.filter((a) => a.id !== addrId)
    };
    onUpdateUser(updated);
    showToast('已删除收货地址');
  };

  const maskedPhone = user.phone
    ? user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
    : '未绑定手机';

  return (
    <div className="space-y-3">
      {/* 选项卡 1: 会员基础资料与 VIP 参数 */}
      {subTab === 'profile' && (
        <div className="space-y-2.5">
          <div className="p-3 bg-white rounded-[1px] border border-neutral-200 divide-y divide-neutral-100 text-xs shadow-xs">
            {/* UID */}
            <div className="py-2 flex items-center justify-between gap-3">
              <span className="font-bold text-neutral-600 whitespace-nowrap shrink-0">食客 UID</span>
              <span className="font-mono font-bold text-neutral-900 truncate text-right">
                {user.uid}
              </span>
            </div>

            {/* 昵称 */}
            <div className="py-2 flex items-center justify-between gap-3">
              <span className="font-bold text-neutral-600 whitespace-nowrap shrink-0">用户昵称</span>
              <input
                type="text"
                value={user.nickname}
                onChange={(e) => handleFieldChange('nickname', e.target.value)}
                className="w-48 text-right font-bold text-neutral-900 border-b border-dashed border-neutral-300 focus:border-emerald-500 focus:outline-none bg-transparent whitespace-nowrap"
              />
            </div>

            {/* 手机号 */}
            <div className="py-2 flex items-center justify-between gap-3">
              <span className="font-bold text-neutral-600 whitespace-nowrap shrink-0">手机号码</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="font-mono font-bold text-neutral-900 whitespace-nowrap">
                  {showFullPhone ? user.phone || '未填写' : maskedPhone}
                </span>
                <button
                  type="button"
                  onClick={() => setShowFullPhone(!showFullPhone)}
                  className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                  title="切换脱敏显示"
                >
                  {showFullPhone ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* 账户密码 / 登录凭证 (支持查看密码明文、复制、快速重置) */}
            <div className="py-2.5 flex items-center justify-between gap-3 bg-neutral-50/80 -mx-3 px-3 border-y border-neutral-100">
              <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
                <Key className="w-3.5 h-3.5 text-neutral-700 shrink-0" />
                <span className="font-bold text-neutral-800">账户密码凭证</span>
                <span className="text-[10px] bg-neutral-200 text-neutral-700 px-1 py-0.2 rounded-none font-mono">
                  {showPassword ? '明文已公开' : '密文保护中'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {isEditingPassword ? (
                  <div className="flex items-center gap-1 font-mono">
                    <input
                      type="text"
                      value={editingPasswordVal}
                      onChange={(e) => setEditingPasswordVal(e.target.value)}
                      placeholder="设置新密码..."
                      className="w-32 sm:w-40 px-1.5 py-0.5 border border-neutral-400 bg-white text-xs font-bold font-mono text-neutral-900 rounded-none focus:outline-none focus:border-black"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!editingPasswordVal.trim()) {
                          showToast('密码不能为空');
                          return;
                        }
                        handleFieldChange('password', editingPasswordVal.trim());
                        setIsEditingPassword(false);
                        showToast('已更新该食客登录密码');
                      }}
                      className="px-2 py-0.5 bg-black text-white text-[11px] font-bold rounded-none hover:bg-neutral-800 cursor-pointer"
                    >
                      保存
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPasswordVal(user.password || 'Radar#8888');
                        setIsEditingPassword(false);
                      }}
                      className="px-1.5 py-0.5 border border-neutral-300 text-[11px] text-neutral-600 rounded-none hover:bg-neutral-100 cursor-pointer"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="font-mono font-bold text-neutral-900 text-xs tracking-wider bg-white px-2 py-0.5 border border-neutral-300 rounded-none select-all min-w-[90px] text-center">
                      {showPassword ? (user.password || '未设置密码') : '••••••••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 text-neutral-600 hover:text-black hover:bg-neutral-200 rounded-none transition-colors cursor-pointer"
                      title={showPassword ? '隐藏密码' : '点击查看密码明文'}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5 text-neutral-800" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const pwd = user.password || 'Radar#8888';
                        navigator.clipboard?.writeText(pwd);
                        showToast(`密码已复制: ${pwd}`);
                      }}
                      className="p-1 text-neutral-600 hover:text-black hover:bg-neutral-200 rounded-none transition-colors cursor-pointer"
                      title="复制密码到剪贴板"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPasswordVal(user.password || 'Radar#8888');
                        setIsEditingPassword(true);
                      }}
                      className="text-[11px] px-1.5 py-0.5 border border-neutral-300 hover:border-black text-neutral-700 hover:text-black rounded-none transition-colors cursor-pointer font-medium"
                      title="重置或修改密码"
                    >
                      修改
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const randomPwd = `Radar@${Math.floor(1000 + Math.random() * 9000)}`;
                        handleFieldChange('password', randomPwd);
                        setEditingPasswordVal(randomPwd);
                        setShowPassword(true);
                        showToast(`已一键重置临时密码: ${randomPwd}`);
                      }}
                      className="p-1 text-neutral-500 hover:text-neutral-900 rounded-none transition-colors cursor-pointer"
                      title="一键生成随机临时密码"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 会员等级 */}
            <div className="py-2 flex items-center justify-between gap-3">
              <span className="font-bold text-neutral-600 whitespace-nowrap shrink-0">会员等级</span>
              <select
                value={user.membershipTier}
                onChange={(e) => handleFieldChange('membershipTier', e.target.value)}
                className="h-7 px-2 bg-neutral-50 rounded-[1px] border border-neutral-300 font-bold text-neutral-900 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 whitespace-nowrap"
              >
                <option value="standard">普通食客 (Standard)</option>
                <option value="vip_silver">银卡会员 (VIP Silver)</option>
                <option value="vip_black_elite">黑金精英 (VIP Black Elite)</option>
              </select>
            </div>

            {/* VIP 生效状态 */}
            <div className="py-2 flex items-center justify-between gap-3">
              <span className="font-bold text-neutral-600 whitespace-nowrap shrink-0">VIP 权益激活</span>
              <button
                type="button"
                onClick={() => handleFieldChange('isVIPActive', !user.isVIPActive)}
                className={`px-2.5 py-1 rounded-[1px] text-[11px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                  user.isVIPActive
                    ? 'bg-amber-500 text-white'
                    : 'bg-neutral-200 text-neutral-600'
                }`}
              >
                <Crown className="w-3 h-3" />
                <span>{user.isVIPActive ? '权益生效中' : '未激活 / 普通'}</span>
              </button>
            </div>

            {/* 性别 */}
            <div className="py-2 flex items-center justify-between gap-3">
              <span className="font-bold text-neutral-600 whitespace-nowrap shrink-0">性别档案</span>
              <select
                value={user.gender || 'secret'}
                onChange={(e) => handleFieldChange('gender', e.target.value)}
                className="h-7 px-2 bg-neutral-50 rounded-[1px] border border-neutral-300 font-medium text-neutral-900 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 whitespace-nowrap"
              >
                <option value="male">男士 (Male)</option>
                <option value="female">女士 (Female)</option>
                <option value="secret">保密 (Secret)</option>
              </select>
            </div>

            {/* 生日 */}
            <div className="py-2 flex items-center justify-between gap-3">
              <span className="font-bold text-neutral-600 whitespace-nowrap shrink-0">生日日期</span>
              <input
                type="date"
                value={user.birthday || '2000-01-01'}
                onChange={(e) => handleFieldChange('birthday', e.target.value)}
                className="h-7 px-2 bg-neutral-50 rounded-[1px] border border-neutral-300 font-mono text-neutral-900 text-xs focus:outline-none whitespace-nowrap"
              />
            </div>

            {/* 个人简介 */}
            <div className="py-2 flex items-center justify-between gap-3">
              <span className="font-bold text-neutral-600 whitespace-nowrap shrink-0">个性签名/备忘</span>
              <input
                type="text"
                value={user.bio || ''}
                onChange={(e) => handleFieldChange('bio', e.target.value)}
                className="w-56 text-right font-medium text-neutral-800 border-b border-dashed border-neutral-300 focus:border-emerald-500 focus:outline-none bg-transparent whitespace-nowrap truncate"
                placeholder="食客偏好备忘..."
              />
            </div>

            {/* 注册渠道与时间 */}
            <div className="py-2 flex items-center justify-between gap-3">
              <span className="font-bold text-neutral-600 whitespace-nowrap shrink-0">注册渠道与时间</span>
              <span className="font-mono text-neutral-500 text-[11px] truncate text-right">
                {user.authProvider} · {user.createdAt || '2026-06-01'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 选项卡 2: 参数偏好设置 */}
      {subTab === 'preferences' && (
        <div className="p-3 bg-white rounded-[1px] border border-neutral-200 divide-y divide-neutral-100 text-xs shadow-xs">
          {/* 辣度 */}
          <div className="py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-rose-500" />
              <span className="font-bold text-neutral-700 whitespace-nowrap">辣度偏好</span>
            </div>
            <select
              value={user.preferences?.spiciness || 'mild'}
              onChange={(e) => handlePrefChange('spiciness', e.target.value)}
              className="h-7 px-2 bg-neutral-50 rounded-[1px] border border-neutral-300 font-bold text-neutral-900 text-xs focus:outline-none whitespace-nowrap"
            >
              <option value="none">不辣 (None)</option>
              <option value="mild">微辣 (Mild)</option>
              <option value="medium">中辣 (Medium)</option>
              <option value="hot">重辣 (Hot)</option>
            </select>
          </div>

          {/* 餐具 */}
          <div className="py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <Utensils className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-bold text-neutral-700 whitespace-nowrap">餐具选项</span>
            </div>
            <select
              value={user.preferences?.cutlery || 'eco'}
              onChange={(e) => handlePrefChange('cutlery', e.target.value)}
              className="h-7 px-2 bg-neutral-50 rounded-[1px] border border-neutral-300 font-bold text-neutral-900 text-xs focus:outline-none whitespace-nowrap"
            >
              <option value="eco">环保不需餐具 (Eco)</option>
              <option value="needed">按份提供餐具 (Needed)</option>
              <option value="not_needed">不需要餐具 (Not Needed)</option>
            </select>
          </div>

          {/* 忌口与定制备注 */}
          <div className="py-2.5 flex items-center justify-between gap-3">
            <span className="font-bold text-neutral-700 whitespace-nowrap">特殊忌口与备忘</span>
            <input
              type="text"
              value={user.preferences?.dietaryNote || ''}
              onChange={(e) => handlePrefChange('dietaryNote', e.target.value)}
              placeholder="例如: 微辣, 不要香菜, 海鲜少油"
              className="w-48 text-right font-medium text-neutral-900 border-b border-dashed border-neutral-300 focus:border-emerald-500 focus:outline-none bg-transparent whitespace-nowrap truncate"
            />
          </div>

          {/* 自动用券 */}
          <div className="py-2.5 flex items-center justify-between gap-3">
            <span className="font-bold text-neutral-700 whitespace-nowrap">下单自动核销最优优惠券</span>
            <button
              type="button"
              onClick={() => handlePrefChange('autoApplyCoupons', !user.preferences?.autoApplyCoupons)}
              className={`w-10 h-5 rounded-[1px] transition-colors relative cursor-pointer ${
                user.preferences?.autoApplyCoupons ? 'bg-emerald-600' : 'bg-neutral-300'
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-[1px] bg-white transition-transform ${
                  user.preferences?.autoApplyCoupons ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* 雷达位置追踪 */}
          <div className="py-2.5 flex items-center justify-between gap-3">
            <span className="font-bold text-neutral-700 whitespace-nowrap">餐车 GPS 距离极速追踪</span>
            <button
              type="button"
              onClick={() => handlePrefChange('radarTracking', !user.preferences?.radarTracking)}
              className={`w-10 h-5 rounded-[1px] transition-colors relative cursor-pointer ${
                user.preferences?.radarTracking ? 'bg-emerald-600' : 'bg-neutral-300'
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-[1px] bg-white transition-transform ${
                  user.preferences?.radarTracking ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* 短信通知 */}
          <div className="py-2.5 flex items-center justify-between gap-3">
            <span className="font-bold text-neutral-700 whitespace-nowrap">极速到单与派送短信提醒</span>
            <button
              type="button"
              onClick={() => handlePrefChange('smsNotification', !user.preferences?.smsNotification)}
              className={`w-10 h-5 rounded-[1px] transition-colors relative cursor-pointer ${
                user.preferences?.smsNotification ? 'bg-emerald-600' : 'bg-neutral-300'
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-[1px] bg-white transition-transform ${
                  user.preferences?.smsNotification ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* 选项卡 3: 资产与钱包流水 */}
      {subTab === 'wallet' && (
        <div className="space-y-3">
          {/* 资产看板与快捷调整 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="p-3 bg-neutral-900 text-white rounded-[1px] border border-neutral-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-neutral-400 font-bold block whitespace-nowrap">
                  当前储值余额
                </span>
                <span className="text-xl font-black font-mono text-emerald-400 whitespace-nowrap">
                  ¥{user.balance.toFixed(2)}
                </span>
              </div>
              <CreditCard className="w-6 h-6 text-neutral-600" />
            </div>

            <div className="p-3 bg-neutral-900 text-white rounded-[1px] border border-neutral-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-neutral-400 font-bold block whitespace-nowrap">
                  当前可用积分
                </span>
                <span className="text-xl font-black font-mono text-amber-400 whitespace-nowrap">
                  {user.points.toLocaleString()}
                </span>
              </div>
              <Coins className="w-6 h-6 text-neutral-600" />
            </div>
          </div>

          {/* 资产调整表单 */}
          <form
            onSubmit={handleAdjustSubmit}
            className="p-3 bg-white rounded-[1px] border border-neutral-200 space-y-2 text-xs shadow-xs"
          >
            <div className="font-bold text-neutral-800 flex items-center gap-1.5 whitespace-nowrap">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>商家后台资产快捷调整 (表单)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-neutral-500 font-bold block mb-1 whitespace-nowrap">
                  调整科目
                </label>
                <select
                  value={adjustKind}
                  onChange={(e) => setAdjustKind(e.target.value as any)}
                  className="w-full h-8 px-2 bg-neutral-50 rounded-[1px] border border-neutral-300 font-bold text-neutral-900 text-xs focus:outline-none whitespace-nowrap"
                >
                  <option value="balance">储值余额 (¥)</option>
                  <option value="points">积分池 (Points)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-neutral-500 font-bold block mb-1 whitespace-nowrap">
                  变动数值 (正数充值/负数扣减)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={adjustDelta}
                  onChange={(e) => setAdjustDelta(e.target.value)}
                  className="w-full h-8 px-2.5 bg-neutral-50 rounded-[1px] border border-neutral-300 font-mono font-bold text-neutral-900 text-xs focus:outline-none whitespace-nowrap"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-500 font-bold block mb-1 whitespace-nowrap">
                  变动说明 / 备注
                </label>
                <input
                  type="text"
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  className="w-full h-8 px-2.5 bg-neutral-50 rounded-[1px] border border-neutral-300 text-neutral-900 text-xs focus:outline-none whitespace-nowrap truncate"
                  placeholder="如: 餐车 VIP 充值赠送"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-[1px] text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Check className="w-3.5 h-3.5" />
                <span>立即执行调整</span>
              </button>
            </div>
          </form>

          {/* 钱包交易明细表单列表 */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold text-neutral-700 px-0.5 whitespace-nowrap">
              钱包收支流水明细 (共 {user.walletHistory?.length || 0} 笔)
            </div>

            <div className="bg-white rounded-[1px] border border-neutral-200 divide-y divide-neutral-100 overflow-hidden text-xs">
              {!user.walletHistory || user.walletHistory.length === 0 ? (
                <div className="py-6 text-center text-neutral-400 whitespace-nowrap font-medium">
                  暂无钱包变动流水记录
                </div>
              ) : (
                user.walletHistory.map((tx) => (
                  <div key={tx.id} className="p-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-neutral-900 truncate whitespace-nowrap">
                          {tx.title}
                        </span>
                        <span className="text-[9px] font-mono text-neutral-400 whitespace-nowrap shrink-0">
                          {tx.timestamp}
                        </span>
                        {tx.orderNo && (
                          <span className="text-[9px] font-mono bg-neutral-100 text-neutral-600 px-1 py-0.2 rounded-[1px] whitespace-nowrap shrink-0">
                            {tx.orderNo}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-neutral-500 font-mono whitespace-nowrap truncate">
                        结余: ¥{tx.balanceAfter.toFixed(2)}
                      </div>
                    </div>

                    <div
                      className={`font-mono font-bold text-xs shrink-0 whitespace-nowrap ${
                        tx.amount >= 0 ? 'text-emerald-600' : 'text-neutral-800'
                      }`}
                    >
                      {tx.amount >= 0 ? `+${tx.amount.toFixed(2)}` : tx.amount.toFixed(2)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 选项卡 4: 收货地址簿 */}
      {subTab === 'addresses' && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-neutral-700 px-0.5">
            <span className="whitespace-nowrap flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-neutral-600" />
              收货地址档案 ({user.addresses.length} 个)
            </span>
            <button
              type="button"
              onClick={() => setShowAddAddr(!showAddAddr)}
              className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddAddr ? '收起表单' : '新增收货地址'}</span>
            </button>
          </div>

          {/* 新增地址表单 */}
          {showAddAddr && (
            <form
              onSubmit={handleAddAddressSubmit}
              className="p-3 bg-neutral-50 rounded-[1px] border border-neutral-300 space-y-2 text-xs"
            >
              <div className="text-xs font-bold text-neutral-800 whitespace-nowrap">
                新增收货地址 (表单)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-neutral-500 font-bold block mb-1 whitespace-nowrap">
                    收货人姓名
                  </label>
                  <input
                    type="text"
                    value={newAddrName}
                    onChange={(e) => setNewAddrName(e.target.value)}
                    placeholder="如: 陈先生"
                    className="w-full h-8 px-2.5 bg-white rounded-[1px] border border-neutral-300 text-xs font-medium focus:outline-none whitespace-nowrap"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-neutral-500 font-bold block mb-1 whitespace-nowrap">
                    联系电话
                  </label>
                  <input
                    type="tel"
                    value={newAddrPhone}
                    onChange={(e) => setNewAddrPhone(e.target.value)}
                    placeholder="手机号码"
                    className="w-full h-8 px-2.5 bg-white rounded-[1px] border border-neutral-300 text-xs font-mono focus:outline-none whitespace-nowrap"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-neutral-500 font-bold block mb-1 whitespace-nowrap">
                    标签分类
                  </label>
                  <select
                    value={newAddrTag}
                    onChange={(e) => setNewAddrTag(e.target.value as any)}
                    className="w-full h-8 px-2.5 bg-white rounded-[1px] border border-neutral-300 text-xs font-bold focus:outline-none whitespace-nowrap"
                  >
                    <option value="公司">公司</option>
                    <option value="家">家</option>
                    <option value="学校">学校</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-neutral-500 font-bold block mb-1 whitespace-nowrap">
                    配送主地址
                  </label>
                  <input
                    type="text"
                    value={newAddrMain}
                    onChange={(e) => setNewAddrMain(e.target.value)}
                    placeholder="如: 静安区南京西路 1788 号"
                    className="w-full h-8 px-2.5 bg-white rounded-[1px] border border-neutral-300 text-xs font-medium focus:outline-none whitespace-nowrap"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] text-neutral-500 font-bold block mb-1 whitespace-nowrap">
                    详细门牌/工位
                  </label>
                  <input
                    type="text"
                    value={newAddrDetail}
                    onChange={(e) => setNewAddrDetail(e.target.value)}
                    placeholder="如: 商务楼 22F 前台"
                    className="w-full h-8 px-2.5 bg-white rounded-[1px] border border-neutral-300 text-xs font-medium focus:outline-none whitespace-nowrap"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddAddr(false)}
                  className="px-3 py-1.5 bg-white border border-neutral-300 hover:bg-neutral-100 rounded-[1px] text-xs font-bold text-neutral-600 cursor-pointer whitespace-nowrap"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-[1px] text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>保存收货地址</span>
                </button>
              </div>
            </form>
          )}

          {/* 地址列表卡片 */}
          <div className="bg-white rounded-[1px] border border-neutral-200 divide-y divide-neutral-100 overflow-hidden text-xs">
            {user.addresses.length === 0 ? (
              <div className="py-6 text-center text-neutral-400 whitespace-nowrap font-medium">
                暂未添加任何收货地址
              </div>
            ) : (
              user.addresses.map((addr) => (
                <div key={addr.id} className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-[1px] bg-neutral-100 text-neutral-700 whitespace-nowrap shrink-0">
                        {addr.tag}
                      </span>
                      <span className="font-bold text-neutral-900 truncate whitespace-nowrap">
                        {addr.name} ({addr.phone})
                      </span>
                      {addr.isDefault && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-[1px] font-mono whitespace-nowrap shrink-0">
                          默认地址
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-600 truncate whitespace-nowrap">
                      {addr.address} · {addr.detail}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {!addr.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleSetDefaultAddr(addr.id)}
                        className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-[1px] text-[11px] cursor-pointer whitespace-nowrap"
                      >
                        设为默认
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteAddr(addr.id)}
                      className="p-1 text-neutral-400 hover:text-rose-600 rounded-[1px] hover:bg-rose-50 cursor-pointer"
                      title="删除地址"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
