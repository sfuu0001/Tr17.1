import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Download,
  Trash2,
  X,
  CreditCard,
  Coins,
  Fingerprint,
  MapPin,
  Settings2,
  Check,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  Smartphone,
  Crown,
  HardDrive,
  Cpu,
  Layers,
  Sparkles,
  RotateCcw,
  LayoutGrid,
  List,
  Eye,
  SlidersHorizontal,
  FileSpreadsheet,
  ArrowLeft,
  Save,
  CheckCircle2,
  ShieldAlert,
  ShieldBan,
  Calendar,
  Phone
} from 'lucide-react';
import { UserProfile } from '../../types/user';
import {
  getUserDataRecords,
  saveUserDataRecords,
  upsertUser,
  deleteUser,
  createBlankUserProfile,
  adjustUserBalance,
  usersToCsv
} from '../../utils/userDataRegistry';
import { UserDataHardwareMatrix } from './user-data/UserDataHardwareMatrix';
import { UserDataDiagnostics } from './user-data/UserDataDiagnostics';
import { UserDataMultiDevice } from './user-data/UserDataMultiDevice';
import { UserDataProfileForm } from './user-data/UserDataProfileForm';
import { UserDataViolationControl } from './user-data/UserDataViolationControl';

interface MerchantUserDataCenterProps {
  showToast: (msg: string) => void;
}

const TIER_LABEL: Record<UserProfile['membershipTier'], string> = {
  standard: '普通会员',
  vip_silver: '银卡 VIP',
  vip_black_elite: '黑金 VIP'
};

const TIER_BADGE: Record<UserProfile['membershipTier'], string> = {
  standard: 'bg-[#f1f1ef] text-[#787774] border-[#e6e6e4]',
  vip_silver: 'bg-slate-100 text-slate-700 border-slate-200',
  vip_black_elite: 'bg-[#0f172a] text-amber-300 border-[#0f172a]'
};

function downloadCsv(filename: string, content: string): void {
  try {
    const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    /* ignore */
  }
}

export const MerchantUserDataCenter: React.FC<MerchantUserDataCenterProps> = ({ showToast }) => {
  const [users, setUsers] = useState<UserProfile[]>(() => getUserDataRecords());
  const [viewMode, setViewMode] = useState<'card' | 'form'>('card');
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | UserProfile['membershipTier']>('all');
  const [hwFilter, setHwFilter] = useState<'all' | 'bound' | 'unbound'>('all');

  // 当前选中查看/编辑的用户档案
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  // 详情抽屉当前激活的标签页
  const [detailTab, setDetailTab] = useState<
    'hardware' | 'diagnostics' | 'devices' | 'violation' | 'profile' | 'preferences' | 'wallet' | 'addresses'
  >('hardware');

  // 新建用户模态框状态
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newTier, setNewTier] = useState<UserProfile['membershipTier']>('standard');
  const [newBalance, setNewBalance] = useState('100');

  // 资产调整模态框状态
  const [adjustTargetUser, setAdjustTargetUser] = useState<UserProfile | null>(null);
  const [adjustKind, setAdjustKind] = useState<'balance' | 'points'>('balance');
  const [adjustDelta, setAdjustDelta] = useState('50');
  const [adjustNote, setAdjustNote] = useState('商家后台调整补贴');

  // 实时找到选中的用户对象
  const activeUser = useMemo(() => {
    if (!selectedUid) return null;
    return users.find((u) => u.uid === selectedUid) || null;
  }, [users, selectedUid]);

  const persist = (next: UserProfile[]) => {
    setUsers(next);
    saveUserDataRecords(next);
  };

  const handleUpdateActiveUser = (updated: UserProfile) => {
    const next = upsertUser(updated);
    setUsers(next);
  };

  // ---------- 统计指标 ----------
  const stats = useMemo(() => {
    const total = users.length;
    const vip = users.filter((u) => u.isVIPActive).length;
    const totalPoints = users.reduce((s, u) => s + (u.points || 0), 0);
    const totalBalance = users.reduce((s, u) => s + (u.balance || 0), 0);
    const hwBound = users.filter((u) => !!u.hardwareHash).length;
    const multiDeviceCount = users.reduce((s, u) => s + (u.boundDevices?.length || 1), 0);
    const bannedCount = users.filter((u) => u.status === 'banned' || u.status === 'hardware_blacklisted').length;
    return { total, vip, totalPoints, totalBalance, hwBound, multiDeviceCount, bannedCount };
  }, [users]);

  // ---------- 过滤列表 ----------
  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        u.nickname.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q) ||
        u.uid.toLowerCase().includes(q) ||
        (u.hardwareHash && u.hardwareHash.toLowerCase().includes(q));
      const matchTier = tierFilter === 'all' || u.membershipTier === tierFilter;
      const matchHw =
        hwFilter === 'all' ||
        (hwFilter === 'bound' ? !!u.hardwareHash : !u.hardwareHash);
      return matchSearch && matchTier && matchHw;
    });
  }, [users, search, tierFilter, hwFilter]);

  // ---------- 操作处理器 ----------
  const handleExportCsv = () => {
    const csv = usersToCsv(users);
    const filename = `urban_radar_users_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCsv(filename, csv);
    showToast(`已导出全量 ${users.length} 位注册食客档案 CSV`);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNickname.trim()) {
      showToast('请输入食客昵称');
      return;
    }
    const created = createBlankUserProfile({
      nickname: newNickname.trim(),
      phone: newPhone.trim() || '138-0000-0000',
      membershipTier: newTier,
      isVIPActive: newTier !== 'standard',
      balance: Math.max(0, Number(newBalance) || 0)
    });
    const next = [created, ...users];
    persist(next);
    setSelectedUid(created.uid);
    setIsCreateOpen(false);
    setNewNickname('');
    setNewPhone('');
    showToast(`已成功新建食客档案: ${created.nickname}`);
  };

  const handleDeleteUser = (uid: string, name: string) => {
    if (window.confirm(`确定要注销并删除食客 [${name}] 的档案吗？`)) {
      const next = deleteUser(uid);
      setUsers(next);
      if (selectedUid === uid) setSelectedUid(null);
      showToast(`已删除食客档案: ${name}`);
    }
  };

  const handleQuickAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTargetUser) return;
    const val = Number(adjustDelta);
    if (isNaN(val) || val === 0) {
      showToast('请输入有效变动数值');
      return;
    }
    const updated = adjustUserBalance(adjustTargetUser, adjustKind, val, adjustNote.trim());
    handleUpdateActiveUser(updated);
    setAdjustTargetUser(null);
    showToast(`已${val > 0 ? '调增' : '扣减'} ${adjustTargetUser.nickname} ${adjustKind === 'balance' ? '余额' : '积分'} ¥${Math.abs(val)}`);
  };

  // ---------- 渲染档案详情内嵌检查器 (用于手机端内嵌与桌面端侧栏) ----------
  const renderDetailInspector = (targetUser: UserProfile, isMobileInline: boolean) => {
    const isBanned = targetUser.status === 'banned';
    const isHwBlacklisted = targetUser.status === 'hardware_blacklisted';

    return (
      <div
        className={`bg-white rounded-[2px] border border-[#e6e6e4] p-3 space-y-2.5 ${
          isMobileInline ? 'bg-[#fbfbfa] border-[#e6e6e4]' : ''
        }`}
      >
        {/* 详情头部表单行 */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#f1f1ef]">
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={targetUser.avatar}
              alt={targetUser.nickname}
              className="w-8 h-8 rounded-[2px] object-cover border border-[#e6e6e4] shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-medium text-xs text-[#0f172a] truncate whitespace-nowrap">
                  {targetUser.nickname}
                </span>

                {isHwBlacklisted && (
                  <span className="text-[9px] font-medium px-1.5 py-0.2 bg-rose-50 text-rose-700 border border-rose-200 rounded-[2px] font-mono whitespace-nowrap shrink-0">
                    全指纹黑名单
                  </span>
                )}
                {isBanned && !isHwBlacklisted && (
                  <span className="text-[9px] font-medium px-1.5 py-0.2 bg-rose-50 text-rose-700 border border-rose-200 rounded-[2px] font-mono whitespace-nowrap shrink-0">
                    已封禁
                  </span>
                )}

                <span
                  className={`text-[9px] font-medium px-1.5 py-0.2 rounded-[2px] border font-mono whitespace-nowrap shrink-0 ${
                    TIER_BADGE[targetUser.membershipTier]
                  }`}
                >
                  {TIER_LABEL[targetUser.membershipTier]}
                </span>
                {targetUser.isVIPActive && (
                  <span className="text-[9px] font-medium px-1.5 py-0.2 bg-amber-50 text-amber-700 border border-amber-200 rounded-[2px] whitespace-nowrap shrink-0">
                    VIP生效
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-[#787774] font-mono truncate">
                <span className="truncate">UID: {targetUser.uid}</span>
                <span>·</span>
                <span className="truncate">{targetUser.phone || '未绑定手机'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                setDetailTab('violation');
              }}
              className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10.5px] font-medium rounded-[2px] border border-rose-200 flex items-center gap-1 cursor-pointer whitespace-nowrap"
              title="风控与违规处置"
            >
              <ShieldBan className="w-3 h-3 text-rose-600" />
              <span>违规风控</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedUid(null)}
              className="p-1 text-[#787774] hover:text-[#0f172a] rounded-[2px] hover:bg-[#f1f1ef] cursor-pointer"
              title={isMobileInline ? '收起内嵌档案' : '关闭检视器'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 选项卡导航条 */}
        <div className="flex items-center gap-1 border-b border-[#f1f1ef] overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'hardware', label: '硬件特征矩阵', icon: HardDrive, color: 'text-emerald-500' },
            { id: 'diagnostics', label: '跨浏览器自愈测试', icon: ShieldAlert, color: 'text-sky-500' },
            { id: 'devices', label: '多设备互联', icon: Smartphone, color: 'text-amber-500' },
            { id: 'violation', label: '违规与风控管控', icon: ShieldBan, color: 'text-rose-500' },
            { id: 'profile', label: '会员资料', icon: Crown, color: 'text-[#787774]' },
            { id: 'wallet', label: '资产流水', icon: CreditCard, color: 'text-[#787774]' },
            { id: 'preferences', label: '参数设置', icon: Settings2, color: 'text-[#787774]' },
            { id: 'addresses', label: '地址簿', icon: MapPin, color: 'text-[#787774]' }
          ].map((tab) => {
            const IconC = tab.icon;
            const isActive = detailTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDetailTab(tab.id as any)}
                className={`px-2 py-1 text-xs font-medium rounded-[2px] flex items-center gap-1 cursor-pointer whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-[#0f172a] text-white'
                    : 'text-[#787774] hover:text-[#0f172a] hover:bg-[#f1f1ef]'
                }`}
              >
                <IconC className={`w-3 h-3 ${isActive ? 'text-white' : tab.color}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* 选项卡内容区域 */}
        <div className="pt-0.5">
          {detailTab === 'hardware' && (
            <UserDataHardwareMatrix user={targetUser} showToast={showToast} />
          )}

          {detailTab === 'diagnostics' && (
            <UserDataDiagnostics
              user={targetUser}
              onUpdateUser={handleUpdateActiveUser}
              showToast={showToast}
            />
          )}

          {detailTab === 'devices' && (
            <UserDataMultiDevice
              user={targetUser}
              onUpdateUser={handleUpdateActiveUser}
              showToast={showToast}
            />
          )}

          {detailTab === 'violation' && (
            <UserDataViolationControl
              user={targetUser}
              onUpdateUser={handleUpdateActiveUser}
              showToast={showToast}
            />
          )}

          {(detailTab === 'profile' ||
            detailTab === 'preferences' ||
            detailTab === 'wallet' ||
            detailTab === 'addresses') && (
            <UserDataProfileForm
              user={targetUser}
              subTab={detailTab}
              onUpdateUser={handleUpdateActiveUser}
              showToast={showToast}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2.5">
      {/* 顶部指标统计栏 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        <div className="p-2.5 bg-white rounded-[2px] border border-[#e6e6e4] flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] text-[#787774] font-medium block truncate whitespace-nowrap">
              注册食客总数
            </span>
            <span className="text-sm font-medium font-mono text-[#0f172a] block truncate whitespace-nowrap">
              {stats.total}
            </span>
          </div>
          <div className="w-7 h-7 rounded-[2px] bg-[#fbfbfa] border border-[#e6e6e4] text-[#787774] flex items-center justify-center shrink-0">
            <Users className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="p-2.5 bg-white rounded-[2px] border border-[#e6e6e4] flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] text-[#787774] font-medium block truncate whitespace-nowrap">
              VIP 活跃会员
            </span>
            <span className="text-sm font-medium font-mono text-amber-700 block truncate whitespace-nowrap">
              {stats.vip}
            </span>
          </div>
          <div className="w-7 h-7 rounded-[2px] bg-amber-50/50 border border-amber-200/60 text-amber-700 flex items-center justify-center shrink-0">
            <Crown className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="p-2.5 bg-white rounded-[2px] border border-[#e6e6e4] flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] text-[#787774] font-medium block truncate whitespace-nowrap">
              免密硬件识别
            </span>
            <span className="text-sm font-medium font-mono text-emerald-700 block truncate whitespace-nowrap">
              {stats.hwBound} <span className="text-[10px] text-[#787774] font-normal">/ 100%</span>
            </span>
          </div>
          <div className="w-7 h-7 rounded-[2px] bg-emerald-50/50 border border-emerald-200/60 text-emerald-700 flex items-center justify-center shrink-0">
            <Fingerprint className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="p-2.5 bg-white rounded-[2px] border border-[#e6e6e4] flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] text-[#787774] font-medium block truncate whitespace-nowrap">
              多设备互联终端
            </span>
            <span className="text-sm font-medium font-mono text-sky-700 block truncate whitespace-nowrap">
              {stats.multiDeviceCount}
            </span>
          </div>
          <div className="w-7 h-7 rounded-[2px] bg-sky-50/50 border border-sky-200/60 text-sky-700 flex items-center justify-center shrink-0">
            <Smartphone className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="p-2.5 bg-white rounded-[2px] border border-[#e6e6e4] flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] text-[#787774] font-medium block truncate whitespace-nowrap">
              储值资金池
            </span>
            <span className="text-sm font-medium font-mono text-[#0f172a] block truncate whitespace-nowrap">
              ¥{stats.totalBalance.toFixed(1)}
            </span>
          </div>
          <div className="w-7 h-7 rounded-[2px] bg-emerald-50/50 border border-emerald-200/60 text-emerald-700 flex items-center justify-center shrink-0">
            <CreditCard className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="p-2.5 bg-white rounded-[2px] border border-[#e6e6e4] flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] text-[#787774] font-medium block truncate whitespace-nowrap">
              违规/黑名单风控
            </span>
            <span className="text-sm font-medium font-mono text-rose-700 block truncate whitespace-nowrap">
              {stats.bannedCount} <span className="text-[10px] text-[#787774] font-normal">例</span>
            </span>
          </div>
          <div className="w-7 h-7 rounded-[2px] bg-rose-50/50 border border-rose-200/60 text-rose-700 flex items-center justify-center shrink-0">
            <ShieldBan className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* 控制台与过滤条 */}
      <div className="p-2 bg-white rounded-[2px] border border-[#e6e6e4] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        {/* 搜索与过滤组 */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 min-w-0 w-full sm:w-auto">
            <Search className="w-3.5 h-3.5 text-[#787774] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="按 UID / 昵称 / 手机号 / 硬件码检索..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-7.5 pl-8 pr-3 bg-[#fbfbfa] rounded-[2px] border border-[#e6e6e4] text-xs text-[#0f172a] font-normal focus:outline-none focus:border-[#0f172a] whitespace-nowrap truncate"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value as any)}
              className="h-7.5 px-2 flex-1 sm:flex-none bg-[#fbfbfa] rounded-[2px] border border-[#e6e6e4] text-xs font-medium text-[#787774] focus:outline-none shrink-0 whitespace-nowrap"
            >
              <option value="all">全等级档案</option>
              <option value="standard">普通食客</option>
              <option value="vip_silver">银卡 VIP</option>
              <option value="vip_black_elite">黑金 VIP</option>
            </select>

            <select
              value={hwFilter}
              onChange={(e) => setHwFilter(e.target.value as any)}
              className="h-7.5 px-2 flex-1 sm:flex-none bg-[#fbfbfa] rounded-[2px] border border-[#e6e6e4] text-xs font-medium text-[#787774] focus:outline-none shrink-0 whitespace-nowrap"
            >
              <option value="all">全部指纹</option>
              <option value="bound">已锚定硬件</option>
              <option value="unbound">未锚定指纹</option>
            </select>
          </div>
        </div>

        {/* 视图切换与功能按钮 */}
        <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-[#f1f1ef]">
          <div className="flex items-center bg-[#f1f1ef] p-0.5 rounded-[2px] border border-[#e6e6e4]">
            <button
              type="button"
              onClick={() => setViewMode('card')}
              className={`px-2 py-1 rounded-[2px] text-xs font-medium flex items-center gap-1 cursor-pointer whitespace-nowrap transition-colors ${
                viewMode === 'card'
                  ? 'bg-white text-[#0f172a] shadow-xs'
                  : 'text-[#787774] hover:text-[#0f172a]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>卡片</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('form')}
              className={`px-2 py-1 rounded-[2px] text-xs font-medium flex items-center gap-1 cursor-pointer whitespace-nowrap transition-colors ${
                viewMode === 'form'
                  ? 'bg-white text-[#0f172a] shadow-xs'
                  : 'text-[#787774] hover:text-[#0f172a]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>清单</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleExportCsv}
              className="h-7.5 px-2.5 bg-[#fbfbfa] hover:bg-[#f1f1ef] text-[#787774] border border-[#e6e6e4] rounded-[2px] text-xs font-medium flex items-center gap-1 cursor-pointer whitespace-nowrap"
              title="导出全量用户为 CSV 报表"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">导出 CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="h-7.5 px-3 bg-[#0f172a] hover:bg-neutral-800 text-white rounded-[2px] text-xs font-medium flex items-center gap-1 cursor-pointer whitespace-nowrap shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新建档案</span>
            </button>
          </div>
        </div>
      </div>

      {/* 主体工作区 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        {/* 左侧列表区 */}
        <div
          className={`space-y-2 transition-all ${
            activeUser ? 'lg:col-span-6 xl:col-span-5' : 'lg:col-span-12'
          }`}
        >
          {filtered.length === 0 ? (
            <div className="py-12 text-center bg-white rounded-[2px] border border-[#e6e6e4]">
              <Users className="w-8 h-8 text-[#787774] mx-auto mb-2 opacity-50" />
              <div className="text-xs font-medium text-[#0f172a] whitespace-nowrap">
                未检索到匹配的食客档案
              </div>
              <div className="text-[11px] text-[#787774] mt-0.5 whitespace-nowrap">
                请尝试更换搜索关键字或重置筛选
              </div>
            </div>
          ) : viewMode === 'card' ? (
            /* 卡片视图 */
            <div
              className={`grid grid-cols-1 ${
                activeUser
                  ? 'lg:grid-cols-1'
                  : 'sm:grid-cols-2 xl:grid-cols-3'
              } gap-2`}
            >
              {filtered.map((user) => {
                const isSelected = user.uid === selectedUid;
                const isBanned = user.status === 'banned';
                const isHwBlacklisted = user.status === 'hardware_blacklisted';

                return (
                  <div
                    key={user.uid}
                    className={`bg-white rounded-[2px] border transition-all ${
                      isSelected
                        ? 'border-[#0f172a] ring-1 ring-[#0f172a] bg-[#fbfbfa]'
                        : 'border-[#e6e6e4] hover:border-neutral-400'
                    }`}
                  >
                    <div
                      onClick={() => {
                        if (selectedUid === user.uid) {
                          setSelectedUid(null);
                        } else {
                          setSelectedUid(user.uid);
                        }
                      }}
                      className="p-3 cursor-pointer"
                    >
                      {/* 卡片头部 */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={user.avatar}
                            alt={user.nickname}
                            className="w-8 h-8 rounded-[2px] object-cover border border-[#e6e6e4] shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-medium text-xs text-[#0f172a] truncate whitespace-nowrap">
                                {user.nickname}
                              </span>

                              {isHwBlacklisted && (
                                <span className="text-[8px] font-medium px-1 py-0.2 bg-rose-50 text-rose-700 border border-rose-200 rounded-[2px] font-mono whitespace-nowrap shrink-0">
                                  全指纹黑名单
                                </span>
                              )}
                              {isBanned && !isHwBlacklisted && (
                                <span className="text-[8px] font-medium px-1 py-0.2 bg-rose-50 text-rose-700 border border-rose-200 rounded-[2px] font-mono whitespace-nowrap shrink-0">
                                  已封禁
                                </span>
                              )}

                              {user.isVIPActive && (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              )}
                            </div>
                            <span className="font-mono text-[10px] text-[#787774] block truncate whitespace-nowrap">
                              {user.uid}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[9px] font-medium px-1.5 py-0.5 rounded-[2px] border font-mono whitespace-nowrap shrink-0 ${
                            TIER_BADGE[user.membershipTier]
                          }`}
                        >
                          {TIER_LABEL[user.membershipTier]}
                        </span>
                      </div>

                      {/* 硬件特征 */}
                      <div className="bg-[#fbfbfa] rounded-[2px] p-2 space-y-1 text-xs border border-[#f1f1ef] font-mono">
                        {/* 硬件特征码 */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-normal text-[#787774] whitespace-nowrap shrink-0 flex items-center gap-1">
                            <Fingerprint className="w-3 h-3 text-emerald-600" />
                            硬件特征码
                          </span>
                          <span className="text-xs font-medium text-emerald-700 truncate text-right">
                            {user.hardwareHash || 'HW-CORE-DEFAULT'}
                          </span>
                        </div>

                        {/* CPU 架构与核心数 */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-normal text-[#787774] whitespace-nowrap shrink-0 flex items-center gap-1">
                            <Cpu className="w-3 h-3 text-sky-600" />
                            运算架构
                          </span>
                          <span className="text-[11px] font-medium text-[#0f172a] truncate text-right">
                            {user.hardwareDetails?.platform || 'Darwin/macOS'} · {user.hardwareDetails?.cpuCores || 8}C
                          </span>
                        </div>

                        {/* GPU 渲染引擎 */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-normal text-[#787774] whitespace-nowrap shrink-0 flex items-center gap-1">
                            <Layers className="w-3 h-3 text-purple-600" />
                            GPU 管线
                          </span>
                          <span className="text-[10px] font-normal text-[#787774] truncate text-right">
                            {user.hardwareDetails?.gpuRenderer || 'Apple M2 Pro (Metal)'}
                          </span>
                        </div>

                        {/* 屏幕物理分辨率 */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-normal text-[#787774] whitespace-nowrap shrink-0 flex items-center gap-1">
                            <Smartphone className="w-3 h-3 text-amber-600" />
                            物理分辨率
                          </span>
                          <span className="text-[11px] font-normal text-[#0f172a] truncate text-right">
                            {user.hardwareDetails?.physicalResolution || '2560x1440 · 2x'}
                          </span>
                        </div>

                        {/* 音频特征指纹 */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-normal text-[#787774] whitespace-nowrap shrink-0 flex items-center gap-1">
                            <HardDrive className="w-3 h-3 text-emerald-600" />
                            声卡特征码
                          </span>
                          <span className="text-[10px] font-normal text-[#787774] truncate text-right">
                            {user.hardwareDetails?.audioDspHash || 'AUD-9988-FLAC'}
                          </span>
                        </div>

                        {/* 免密硬件置信度 */}
                        <div className="flex items-center justify-between gap-2 pt-0.5 border-t border-[#f1f1ef]">
                          <span className="text-[10px] font-normal text-[#787774] whitespace-nowrap shrink-0 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            免密信任度
                          </span>
                          <span className="text-xs font-medium text-emerald-700 truncate text-right flex items-center gap-1">
                            <span>{user.autoLoginScore ?? 99.8}%</span>
                            <span className="text-[9px] font-normal text-[#787774]">
                              ({user.boundDevices?.length || 1}机互联)
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* 卡片底部操作行 */}
                      <div className="mt-2 pt-2 border-t border-[#f1f1ef] flex items-center justify-between gap-2">
                        <span className="text-[11px] font-medium text-[#0f172a] hover:text-emerald-700 flex items-center gap-0.5 whitespace-nowrap">
                          <span>{isSelected ? '收起档案详情' : '检视数据识别详情'}</span>
                          {isSelected ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronRight className="w-3 h-3" />
                          )}
                        </span>

                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUid(user.uid);
                              setDetailTab('violation');
                            }}
                            className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium rounded-[2px] text-[10px] cursor-pointer whitespace-nowrap border border-rose-200"
                          >
                            风控/资产
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user.uid, user.nickname)}
                            className="p-1 text-[#787774] hover:text-rose-600 rounded-[2px] cursor-pointer"
                            title="删除档案"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 手机端内嵌展开 */}
                    {isSelected && (
                      <div className="lg:hidden px-2.5 pb-3 pt-0 border-t border-[#e6e6e4]">
                        {renderDetailInspector(user, true)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* 表单清单视图 */
            <div className="bg-white rounded-[2px] border border-[#e6e6e4] overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-[#f1f1ef]">
                <thead className="bg-[#fbfbfa] text-[10px] text-[#787774] font-medium uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-2 whitespace-nowrap">食客档案</th>
                    <th className="px-3 py-2 whitespace-nowrap">手机号</th>
                    <th className="px-3 py-2 whitespace-nowrap">状态/等级</th>
                    <th className="px-3 py-2 whitespace-nowrap">资产参数</th>
                    <th className="px-3 py-2 whitespace-nowrap">硬件特征码</th>
                    <th className="px-3 py-2 whitespace-nowrap">免密置信度</th>
                    <th className="px-3 py-2 whitespace-nowrap">互联</th>
                    <th className="px-3 py-2 text-right whitespace-nowrap">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f1ef]">
                  {filtered.map((user) => {
                    const isSelected = user.uid === selectedUid;
                    return (
                      <React.Fragment key={user.uid}>
                        <tr
                          onClick={() => setSelectedUid(isSelected ? null : user.uid)}
                          className={`hover:bg-[#fbfbfa] transition-colors cursor-pointer ${
                            isSelected ? 'bg-[#f1f1ef]/60' : ''
                          }`}
                        >
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <img
                                src={user.avatar}
                                alt={user.nickname}
                                className="w-6 h-6 rounded-[2px] object-cover border border-[#e6e6e4] shrink-0"
                                referrerPolicy="no-referrer"
                              />
                              <div className="min-w-0">
                                <span className="font-medium text-[#0f172a] block truncate whitespace-nowrap">
                                  {user.nickname}
                                </span>
                                <span className="font-mono text-[9px] text-[#787774] block truncate whitespace-nowrap">
                                  {user.uid}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="px-3 py-2 font-mono text-[#0f172a] whitespace-nowrap">
                            {user.phone || '未绑定'}
                          </td>

                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              {user.status === 'hardware_blacklisted' && (
                                <span className="text-[8px] font-medium px-1 py-0.2 bg-rose-50 text-rose-700 border border-rose-200 rounded-[2px] font-mono whitespace-nowrap">
                                  黑名单
                                </span>
                              )}
                              {user.status === 'banned' && (
                                <span className="text-[8px] font-medium px-1 py-0.2 bg-rose-50 text-rose-700 border border-rose-200 rounded-[2px] font-mono whitespace-nowrap">
                                  封号
                                </span>
                              )}
                              <span
                                className={`text-[9px] font-medium px-1.5 py-0.5 rounded-[2px] border font-mono whitespace-nowrap ${
                                  TIER_BADGE[user.membershipTier]
                                }`}
                              >
                                {TIER_LABEL[user.membershipTier]}
                              </span>
                            </div>
                          </td>

                          <td className="px-3 py-2 font-mono text-[#0f172a] whitespace-nowrap">
                            ¥{user.balance.toFixed(2)} · {user.points}分
                          </td>

                          <td className="px-3 py-2 font-mono text-[11px] font-medium text-emerald-700 whitespace-nowrap">
                            {user.hardwareHash || 'HW-CORE-DEFAULT'}
                          </td>

                          <td className="px-3 py-2 font-mono text-[#0f172a] whitespace-nowrap">
                            <span className="flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              {user.autoLoginScore ?? 99.8}%
                            </span>
                          </td>

                          <td className="px-3 py-2 font-mono text-[#787774] whitespace-nowrap">
                            {user.boundDevices?.length || 1} 台
                          </td>

                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            <div
                              className="flex items-center justify-end gap-1.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedUid(user.uid);
                                  setDetailTab('violation');
                                }}
                                className="px-1.5 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-[2px] text-[10px] font-medium cursor-pointer whitespace-nowrap border border-rose-200"
                              >
                                风控
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedUid(isSelected ? null : user.uid)}
                                className="text-xs font-medium text-[#0f172a] hover:text-emerald-700 flex items-center gap-0.5 cursor-pointer whitespace-nowrap"
                              >
                                <span>{isSelected ? '收起' : '检视'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(user.uid, user.nickname)}
                                className="p-1 text-[#787774] hover:text-rose-600 rounded-[2px] cursor-pointer"
                                title="删除"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* 手机端表格展开内嵌档案 */}
                        {isSelected && (
                          <tr className="lg:hidden bg-[#fbfbfa]">
                            <td colSpan={8} className="p-2.5">
                              {renderDetailInspector(user, true)}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 桌面端右侧详情抽屉/检视器 */}
        {activeUser && (
          <div className="hidden lg:block lg:col-span-6 xl:col-span-7">
            {renderDetailInspector(activeUser, false)}
          </div>
        )}
      </div>

      {/* 新建食客档案模态框 */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-[2px] max-w-md w-full p-4 space-y-3 shadow-sm border border-[#e6e6e4]">
            <div className="flex items-center justify-between pb-2 border-b border-[#f1f1ef]">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0f172a]" />
                <span className="font-medium text-xs text-[#0f172a] whitespace-nowrap">
                  新建食客会员档案
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1 text-[#787774] hover:text-[#0f172a] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-2.5 text-xs">
              <div>
                <label className="text-[10px] text-[#787774] font-medium block mb-1 whitespace-nowrap">
                  食客昵称
                </label>
                <input
                  type="text"
                  placeholder="如: 王先生 (常客)"
                  value={newNickname}
                  onChange={(e) => setNewNickname(e.target.value)}
                  className="w-full h-7.5 px-2.5 bg-[#fbfbfa] rounded-[2px] border border-[#e6e6e4] font-normal text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a] whitespace-nowrap"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-[#787774] font-medium block mb-1 whitespace-nowrap">
                  手机号码
                </label>
                <input
                  type="tel"
                  placeholder="138-xxxx-xxxx"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full h-7.5 px-2.5 bg-[#fbfbfa] rounded-[2px] border border-[#e6e6e4] font-mono text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a] whitespace-nowrap"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-[#787774] font-medium block mb-1 whitespace-nowrap">
                    初始会员等级
                  </label>
                  <select
                    value={newTier}
                    onChange={(e) => setNewTier(e.target.value as any)}
                    className="w-full h-7.5 px-2 bg-[#fbfbfa] rounded-[2px] border border-[#e6e6e4] font-medium text-xs text-[#0f172a] focus:outline-none whitespace-nowrap"
                  >
                    <option value="standard">普通会员</option>
                    <option value="vip_silver">银卡 VIP</option>
                    <option value="vip_black_elite">黑金 VIP</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-[#787774] font-medium block mb-1 whitespace-nowrap">
                    初始赠送体验余额 (¥)
                  </label>
                  <input
                    type="number"
                    value={newBalance}
                    onChange={(e) => setNewBalance(e.target.value)}
                    className="w-full h-7.5 px-2.5 bg-[#fbfbfa] rounded-[2px] border border-[#e6e6e4] font-mono font-medium text-xs text-[#0f172a] focus:outline-none whitespace-nowrap"
                  />
                </div>
              </div>

              <div className="p-2 bg-[#fbfbfa] text-[#787774] border border-[#f1f1ef] rounded-[2px] text-[10px] leading-tight font-normal">
                系统将根据客户端无密码智能登录协议，自动为该食客生成高熵硬件矩阵、跨浏览器不变量与设备互联初始哈希。
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#f1f1ef]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3 py-1.5 bg-white border border-[#e6e6e4] hover:bg-[#f1f1ef] rounded-[2px] text-xs font-medium text-[#787774] cursor-pointer whitespace-nowrap"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#0f172a] hover:bg-neutral-800 text-white rounded-[2px] text-xs font-medium flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>立即保存档案</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 快捷资产调整模态框 */}
      {adjustTargetUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-[2px] max-w-sm w-full p-4 space-y-3 shadow-sm border border-[#e6e6e4]">
            <div className="flex items-center justify-between pb-2 border-b border-[#f1f1ef]">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#0f172a]" />
                <span className="font-medium text-xs text-[#0f172a] whitespace-nowrap">
                  资产快捷调整 ({adjustTargetUser.nickname})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAdjustTargetUser(null)}
                className="p-1 text-[#787774] hover:text-[#0f172a] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAdjustSubmit} className="space-y-2.5 text-xs">
              <div className="p-2 bg-[#fbfbfa] rounded-[2px] border border-[#f1f1ef] flex items-center justify-between text-xs">
                <span className="text-[#787774] font-normal whitespace-nowrap">当前账户结余:</span>
                <span className="font-mono font-medium text-[#0f172a] whitespace-nowrap">
                  余额 ¥{adjustTargetUser.balance.toFixed(2)} · 积分 {adjustTargetUser.points}
                </span>
              </div>

              <div>
                <label className="text-[10px] text-[#787774] font-medium block mb-1 whitespace-nowrap">
                  科目
                </label>
                <select
                  value={adjustKind}
                  onChange={(e) => setAdjustKind(e.target.value as any)}
                  className="w-full h-7.5 px-2 bg-[#fbfbfa] rounded-[2px] border border-[#e6e6e4] font-medium text-xs text-[#0f172a] focus:outline-none whitespace-nowrap"
                >
                  <option value="balance">储值余额 (¥)</option>
                  <option value="points">积分池 (Points)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-[#787774] font-medium block mb-1 whitespace-nowrap">
                  变动数值 (正数调增 / 负数扣减)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={adjustDelta}
                  onChange={(e) => setAdjustDelta(e.target.value)}
                  className="w-full h-7.5 px-2.5 bg-[#fbfbfa] rounded-[2px] border border-[#e6e6e4] font-mono font-medium text-xs text-[#0f172a] focus:outline-none whitespace-nowrap"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-[#787774] font-medium block mb-1 whitespace-nowrap">
                  业务说明
                </label>
                <input
                  type="text"
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  className="w-full h-7.5 px-2.5 bg-[#fbfbfa] rounded-[2px] border border-[#e6e6e4] text-[#0f172a] text-xs focus:outline-none whitespace-nowrap truncate"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#f1f1ef]">
                <button
                  type="button"
                  onClick={() => setAdjustTargetUser(null)}
                  className="px-3 py-1.5 bg-white border border-[#e6e6e4] hover:bg-[#f1f1ef] rounded-[2px] text-xs font-medium text-[#787774] cursor-pointer whitespace-nowrap"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#0f172a] hover:bg-neutral-800 text-white rounded-[2px] text-xs font-medium flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>确认调整并入账</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
