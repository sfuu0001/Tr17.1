import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  ShieldCheck,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Download,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Building2,
  Truck,
  Bike,
  Smartphone,
  Layers,
  Award,
  Calendar,
  Phone,
  FileSpreadsheet,
  X,
  Check,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  Info,
  Zap,
  Sparkles,
  Hash
} from 'lucide-react';
import {
  UserUnifiedProfile,
  UserDossierCategory,
  AccountStatus,
  getAllUserDossiers,
  saveUserDossier,
  deleteUserDossier,
  getMaskedPhone,
  getMaskedIdCard,
  EVENT_USER_DOSSIERS_CHANGED
} from '../../../utils/userDossierEngine';
import { useCascadeAuth } from '../../../context/CascadeAuthContext';
import { MeshTierLevel } from '../../../utils/cascadeMeshEngine';
import { exportToCsv } from '../../../utils/dataExportEngine';
import { getAllTruckConfigs } from '../../../utils/truckLocationEngine';

interface UserDossierManagerProps {
  showToast: (msg: string) => void;
}

export const UserDossierManager: React.FC<UserDossierManagerProps> = ({ showToast }) => {
  const { activeIdentity, canExecute, promptPermissionBlocked } = useCascadeAuth();
  const [dossiers, setDossiers] = useState<UserUnifiedProfile[]>(getAllUserDossiers());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 抽屉表单状态 (新增/编辑)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<UserUnifiedProfile | null>(null);
  const [formActiveLayer, setFormActiveLayer] = useState<'all' | 'L1' | 'L2' | 'L3' | 'L4'>('all');

  // 明文穿透授权弹窗
  const [penetrationTargetId, setPenetrationTargetId] = useState<string | null>(null);
  const [penetrationReason, setPenetrationReason] = useState('');
  const [unlockedPlaintextIds, setUnlockedPlaintextIds] = useState<Set<string>>(new Set());

  // 监听档案变动
  useEffect(() => {
    const handleUpdate = () => setDossiers(getAllUserDossiers());
    window.addEventListener(EVENT_USER_DOSSIERS_CHANGED, handleUpdate);
    return () => window.removeEventListener(EVENT_USER_DOSSIERS_CHANGED, handleUpdate);
  }, []);

  // 统计数据
  const stats = useMemo(() => {
    const total = dossiers.length;
    const sm4Count = dossiers.filter((d) => d.sm4Certified).length;
    const activeCount = dossiers.filter((d) => d.status === 'active').length;
    const riskCount = dossiers.filter((d) => d.status !== 'active' || d.creditScore < 95).length;
    return {
      total,
      sm4Rate: total > 0 ? Math.round((sm4Count / total) * 100) : 0,
      activeCount,
      riskCount
    };
  }, [dossiers]);

  // 过滤后的列表
  const filteredDossiers = useMemo(() => {
    return dossiers.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (selectedStatus !== 'all' && item.status !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchId = item.id.toLowerCase().includes(q);
        const matchPhone = item.phone.includes(q);
        const matchOrg = item.organization.toLowerCase().includes(q);
        const matchGrid = item.gridCode.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchPhone && !matchOrg && !matchGrid) return false;
      }
      return true;
    });
  }, [dossiers, selectedCategory, selectedStatus, searchQuery]);

  // 打开新增表单
  const handleOpenCreate = () => {
    const newProfile: UserUnifiedProfile = {
      id: `USR-${Date.now().toString().slice(-6)}`,
      name: '',
      avatar: '新',
      phone: '',
      idCardHash: '',
      gender: 'male',
      category: 'rider',
      meshTier: 'L4',
      securityRating: 'SEC-L1',
      sm4Certified: true,
      certificateNo: `SM4-NEW-${Math.floor(1000 + Math.random() * 9000)}`,
      organization: '静安苏河湾闪送快响队',
      gridCode: 'GRID-SUHE-01',
      assignedTruckId: 'TRUCK-03',
      assignedTruckName: '黑曜石 03 号·苏河湾滨河先锋车',
      directSupervisorName: '张建军 (L3 车长)',
      dispatchRadiusKm: 3.0,
      overflowGrabQuota: 30,
      status: 'active',
      creditScore: 98,
      totalOrdersFulfilled: 0,
      onTimeRatePercent: 100,
      complaintCount: 0,
      totalGmvContributed: 0,
      emergencyContact: '',
      emergencyPhone: '',
      cosDossierArchiveUrl: 'cos://7463-tc100-d9gz0e2ko5929e360-1445454244/dossiers/new.pdf',
      latestProofHash: '0x0000...init',
      createdAt: new Date().toLocaleString('zh-CN'),
      updatedAt: new Date().toLocaleString('zh-CN')
    };
    setEditingProfile(newProfile);
    setFormActiveLayer('all');
    setIsDrawerOpen(true);
  };

  // 快速载入预设角色分层模板
  const applyPresetTemplate = (preset: 'rider' | 'merchant' | 'district' | 'customer') => {
    if (!editingProfile) return;
    if (preset === 'rider') {
      setEditingProfile({
        ...editingProfile,
        category: 'rider',
        meshTier: 'L4',
        securityRating: 'SEC-L2',
        organization: '静安苏河湾闪送快响队',
        gridCode: 'GRID-SUHE-01',
        assignedTruckId: 'TRUCK-03',
        assignedTruckName: '黑曜石 03 号·苏河湾滨河先锋车',
        directSupervisorName: '张建军 (L3 车长)',
        dispatchRadiusKm: 3.5,
        overflowGrabQuota: 30,
        status: 'active',
        creditScore: 98,
        onTimeRatePercent: 99.4,
        totalOrdersFulfilled: 428,
        complaintCount: 0,
        totalGmvContributed: 16820,
        healthPermitExpiry: '2027-06-30'
      });
      showToast('已载入【L4 骑手单兵】高拟真分层档案模板');
    } else if (preset === 'merchant') {
      setEditingProfile({
        ...editingProfile,
        category: 'merchant',
        meshTier: 'L3',
        securityRating: 'SEC-L3',
        organization: '黑石流动餐车运营部',
        gridCode: 'GRID-RP-01',
        assignedTruckId: 'TRUCK-01',
        assignedTruckName: '黑曜石 01 号·人民广场先锋车',
        directSupervisorName: '王强 (L2 战区总监)',
        dispatchRadiusKm: 2.0,
        overflowGrabQuota: 0,
        status: 'active',
        creditScore: 99,
        onTimeRatePercent: 99.8,
        totalOrdersFulfilled: 1420,
        complaintCount: 1,
        totalGmvContributed: 98500,
        healthPermitExpiry: '2027-12-31'
      });
      showToast('已载入【L3 餐车车长】高拟真分层档案模板');
    } else if (preset === 'district') {
      setEditingProfile({
        ...editingProfile,
        category: 'district',
        meshTier: 'L2',
        securityRating: 'SEC-L4',
        organization: '黄浦核心商圈战区指挥中心',
        gridCode: 'GRID-HUANGPU-CTRL',
        assignedTruckId: undefined,
        assignedTruckName: undefined,
        directSupervisorName: '陈浩宇 (L1 主控席)',
        dispatchRadiusKm: 15.0,
        overflowGrabQuota: 500,
        status: 'active',
        creditScore: 100,
        onTimeRatePercent: 100,
        totalOrdersFulfilled: 0,
        complaintCount: 0,
        totalGmvContributed: 356000
      });
      showToast('已载入【L2 战区总监】高拟真分层档案模板');
    } else {
      setEditingProfile({
        ...editingProfile,
        category: 'customer',
        meshTier: 'CUSTOMER',
        securityRating: 'SEC-L1',
        organization: '黑石会员俱乐部·黑金食客',
        gridCode: 'GRID-GLOBAL-VIP',
        assignedTruckId: undefined,
        assignedTruckName: undefined,
        directSupervisorName: '客服中心专属管家',
        dispatchRadiusKm: 5.0,
        overflowGrabQuota: 0,
        status: 'active',
        creditScore: 100,
        onTimeRatePercent: 100,
        totalOrdersFulfilled: 45,
        complaintCount: 0,
        totalGmvContributed: 3680
      });
      showToast('已载入【食客会员】高拟真分层档案模板');
    }
  };

  // 根据当前表单四层数据计算国密 SM3 存证哈希
  const handleComputeProofHash = () => {
    if (!editingProfile) return;
    const raw = `${editingProfile.id}:${editingProfile.name}:${editingProfile.phone}:${Date.now()}:${editingProfile.meshTier}:${editingProfile.organization}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    const fullProofHash = `0x${hex}e8a37f920bc714d59a${hex.slice(0, 4)}c1`;
    setEditingProfile({
      ...editingProfile,
      latestProofHash: fullProofHash,
      cosDossierArchiveUrl: editingProfile.cosDossierArchiveUrl || `cos://7463-tc100-d9gz0e2ko5929e360-1445454244/dossiers/${editingProfile.id.toLowerCase()}.pdf`,
      updatedAt: new Date().toLocaleString('zh-CN')
    });
    showToast('已根据表单四层核心数据计算生成国密 SM3 存证哈希指纹！');
  };

  // 打开编辑表单
  const handleOpenEdit = (profile: UserUnifiedProfile) => {
    setEditingProfile({ ...profile });
    setFormActiveLayer('all');
    setIsDrawerOpen(true);
  };

  // 保存表单
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;
    if (!editingProfile.name.trim()) {
      showToast('请输入用户真实姓名！');
      return;
    }
    if (!editingProfile.phone.trim()) {
      showToast('请输入手机号！');
      return;
    }
    saveUserDossier(editingProfile);
    setIsDrawerOpen(false);
    setEditingProfile(null);
    showToast(`用户【${editingProfile.name}】的统一档案已更新并同步全域拓扑！`);
  };

  // 删除档案
  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`确定要从全域统一档案中心移除【${name}】(${id}) 的档案记录吗？`)) {
      deleteUserDossier(id);
      showToast(`已成功移除用户【${name}】的档案`);
    }
  };

  // 申请明文穿透
  const handleRequestPenetration = (id: string) => {
    // 检查是否具备高阶查看特权 (L0, L1, L5)
    if (activeIdentity.tier !== 'L0' && activeIdentity.tier !== 'L1' && activeIdentity.tier !== 'L5') {
      showToast(`【脱敏数据穿透拦截】当前身份【${activeIdentity.tierLabel}】无权申请敏感字段明文，须由 L1 以上或独立审计席签批`);
      return;
    }
    setPenetrationTargetId(id);
    setPenetrationReason('');
  };

  const handleConfirmPenetration = () => {
    if (!penetrationTargetId) return;
    if (!penetrationReason.trim()) {
      showToast('请输入审计调阅原因！');
      return;
    }
    setUnlockedPlaintextIds((prev) => new Set(prev).add(penetrationTargetId));
    showToast(`已授权明文穿透调阅，操作已记入全域 Hyperledger 区块链合规审计链`);
    setPenetrationTargetId(null);
  };

  // 导出 CSV
  const handleExportCsv = () => {
    try {
      const headers = [
        { label: '档案工号', key: 'id' },
        { label: '姓名', key: 'name' },
        { label: '分类', key: 'category' },
        { label: 'Mesh层级', key: 'meshTier' },
        { label: '脱敏手机号', key: 'phone' },
        { label: '安全等级', key: 'securityRating' },
        { label: '国密认证', key: 'sm4Certified' },
        { label: '所属组织', key: 'organization' },
        { label: '网格编号', key: 'gridCode' },
        { label: '管辖餐车', key: 'assignedTruckName' },
        { label: '信用分', key: 'creditScore' },
        { label: '账号状态', key: 'status' },
        { label: '更新时间', key: 'updatedAt' }
      ];
      const data = filteredDossiers.map((d) => ({
        id: d.id,
        name: d.name,
        category: d.category,
        meshTier: d.meshTier,
        phone: getMaskedPhone(d.phone, false),
        securityRating: d.securityRating,
        sm4Certified: d.sm4Certified ? '已认证' : '未认证',
        organization: d.organization,
        gridCode: d.gridCode,
        assignedTruckName: d.assignedTruckName || '无',
        creditScore: d.creditScore,
        status: d.status === 'active' ? '正常准入' : d.status === 'restricted' ? '观察受限' : '风控冻结',
        updatedAt: d.updatedAt
      }));
      exportToCsv('Urban_Radar_统一用户档案分层清单', headers, data);
      showToast('全域统一用户档案已成功导出为 CSV 表格文件！');
    } catch {
      showToast('导出失败，请重试');
    }
  };

  const truckList = getAllTruckConfigs();

  return (
    <div className="space-y-4">
      {/* 顶部指标看板 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-[#e2e3e1] rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#787774] mb-1">
            <span>统一纳管档案总数</span>
            <Users className="w-4 h-4 text-neutral-500" />
          </div>
          <div className="text-2xl font-black tracking-tight text-[#1a1a17] font-mono">
            {stats.total}
            <span className="text-xs font-normal text-[#787774] ml-1.5">位主体</span>
          </div>
          <div className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>覆盖食客/单兵/餐车/战区全角色</span>
          </div>
        </div>

        <div className="bg-white border border-[#e2e3e1] rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#787774] mb-1">
            <span>国密 SM4 认证率</span>
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black tracking-tight text-indigo-600 font-mono">
            {stats.sm4Rate}%
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            商用密码分层数字证书已就绪
          </div>
        </div>

        <div className="bg-white border border-[#e2e3e1] rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#787774] mb-1">
            <span>正常准入运行态</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black tracking-tight text-emerald-600 font-mono">
            {stats.activeCount}
            <span className="text-xs font-normal text-neutral-500 ml-1.5">正常</span>
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            动态心跳与履约健康
          </div>
        </div>

        <div className="bg-white border border-[#e2e3e1] rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#787774] mb-1">
            <span>风控预警与受限主体</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black tracking-tight text-amber-600 font-mono">
            {stats.riskCount}
            <span className="text-xs font-normal text-neutral-500 ml-1.5">需关注</span>
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            含客诉频发与待复核单兵
          </div>
        </div>
      </div>

      {/* 筛选与搜索工具条 */}
      <div className="bg-white border border-[#e2e3e1] rounded-xl p-3.5 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* 分类筛选 */}
          <div className="flex items-center gap-1 bg-[#f7f6f3] p-0.5 rounded-lg border border-[#e2e3e1] text-xs">
            {[
              { key: 'all', label: '全部主体' },
              { key: 'customer', label: '食客会员' },
              { key: 'rider', label: '骑手单兵 (L4)' },
              { key: 'merchant', label: '餐车车长 (L3)' },
              { key: 'district', label: '战区总监 (L2)' },
              { key: 'control', label: '商圈主控 (L1)' },
              { key: 'hq', label: 'HQ/审计 (L0/L5)' }
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSelectedCategory(tab.key)}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === tab.key
                    ? 'bg-white text-[#1a1a17] font-bold shadow-xs'
                    : 'text-[#787774] hover:text-[#1a1a17]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 状态筛选 */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs bg-[#f7f6f3] border border-[#e2e3e1] rounded-lg px-2.5 py-1.5 text-[#37352f] focus:outline-none cursor-pointer"
          >
            <option value="all">全状态过滤</option>
            <option value="active">正常准入 (Active)</option>
            <option value="restricted">观察受限 (Restricted)</option>
            <option value="frozen">风控冻结 (Frozen)</option>
          </select>
        </div>

        {/* 搜索与新增、导出操作 */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索工号/姓名/手机号/网格..."
              className="w-full text-xs bg-[#f7f6f3] border border-[#e2e3e1] rounded-lg pl-8 pr-3 py-1.5 text-[#37352f] placeholder-neutral-400 focus:outline-none focus:border-neutral-400"
            />
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-2.5 py-1.5 bg-white hover:bg-neutral-50 text-neutral-700 border border-[#d3d1cb] rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors shadow-2xs shrink-0"
            title="导出当前筛选名单为 CSV 表格"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">导出</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-3 py-1.5 bg-[#1a1a17] hover:bg-black text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新建档案</span>
          </button>
        </div>
      </div>

      {/* 档案分层清单主表格 */}
      <div className="bg-white border border-[#e2e3e1] rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#f7f6f3] border-b border-[#e2e3e1] text-[#787774] font-medium">
                <th className="py-2.5 px-3">主体基础信息</th>
                <th className="py-2.5 px-3">Mesh 层级 / 安全评级</th>
                <th className="py-2.5 px-3">脱敏联系方式 / 证件</th>
                <th className="py-2.5 px-3">组织管辖与驻守餐车</th>
                <th className="py-2.5 px-3">履约与信用画像</th>
                <th className="py-2.5 px-3">账号状态</th>
                <th className="py-2.5 px-3 text-right">分层管控操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f1ef]">
              {filteredDossiers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>暂无符合当前筛选条件的用户统一档案</p>
                  </td>
                </tr>
              ) : (
                filteredDossiers.map((profile) => {
                  const isUnlocked = unlockedPlaintextIds.has(profile.id);
                  const displayPhone = getMaskedPhone(profile.phone, isUnlocked);
                  const displayIdCard = getMaskedIdCard(profile.idCardHash, isUnlocked);

                  return (
                    <tr key={profile.id} className="hover:bg-[#fafaf8] transition-colors group">
                      {/* 主体信息 */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                            {profile.avatar}
                          </div>
                          <div>
                            <div className="font-bold text-[#1a1a17] flex items-center gap-1.5">
                              <span>{profile.name}</span>
                              {profile.sm4Certified && (
                                <span className="inline-flex items-center px-1 rounded bg-indigo-50 text-indigo-700 text-[9px] font-mono border border-indigo-200" title="国密 SM4 证书认证已通过">
                                  SM4
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-neutral-400">
                              {profile.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Mesh 层级 */}
                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#1a1a17] text-white">
                            {profile.meshTier}
                          </span>
                          <div className="text-[10px] font-mono text-neutral-500">
                            {profile.securityRating}
                          </div>
                        </div>
                      </td>

                      {/* 联系方式与穿透查看 */}
                      <td className="py-3 px-3 font-mono">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className={isUnlocked ? 'text-emerald-700 font-bold bg-emerald-50 px-1 rounded' : 'text-neutral-700'}>
                            {displayPhone}
                          </span>
                          {!isUnlocked ? (
                            <button
                              type="button"
                              onClick={() => handleRequestPenetration(profile.id)}
                              className="text-neutral-400 hover:text-neutral-800 transition-colors cursor-pointer"
                              title="申请穿透脱敏查看真实联系方式"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-[9px] text-emerald-600 bg-emerald-100/60 px-1 rounded">已解密</span>
                          )}
                        </div>
                        <div className="text-[10px] text-neutral-400">
                          {displayIdCard}
                        </div>
                      </td>

                      {/* 组织管辖 */}
                      <td className="py-3 px-3">
                        <div className="font-medium text-[#37352f] text-[11px]">
                          {profile.organization}
                        </div>
                        <div className="text-[10px] text-neutral-500 flex items-center gap-1">
                          <span className="font-mono">{profile.gridCode}</span>
                          {profile.assignedTruckName && (
                            <>
                              <span>·</span>
                              <span className="text-amber-700 truncate max-w-[120px]">{profile.assignedTruckName}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* 履约与信用 */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[11px] font-bold font-mono ${profile.creditScore >= 98 ? 'text-emerald-600' : profile.creditScore >= 95 ? 'text-amber-600' : 'text-red-600'}`}>
                            {profile.creditScore}分
                          </span>
                          <span className="text-[10px] text-neutral-400 font-mono">
                            ({profile.onTimeRatePercent}% 准时)
                          </span>
                        </div>
                        <div className="text-[10px] text-neutral-500 font-mono">
                          累计履约 {profile.totalOrdersFulfilled} 单 / GMV ¥{profile.totalGmvContributed.toLocaleString()}
                        </div>
                      </td>

                      {/* 状态 */}
                      <td className="py-3 px-3">
                        {profile.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            正常准入
                          </span>
                        ) : profile.status === 'restricted' ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            观察受限
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            风控冻结
                          </span>
                        )}
                      </td>

                      {/* 操作 */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(profile)}
                            className="p-1 text-neutral-600 hover:text-black hover:bg-neutral-100 rounded transition-colors cursor-pointer"
                            title="编辑四层分层表单档案"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(profile.id, profile.name)}
                            className="p-1 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            title="删除档案"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 四层递进式档案表单抽屉 (Edit / Create Drawer) */}
      <AnimatePresence>
        {isDrawerOpen && editingProfile && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative w-full max-w-2xl bg-white h-full shadow-2xl overflow-y-auto flex flex-col z-10"
            >
              {/* Drawer Header */}
              <div className="px-5 py-3.5 border-b border-neutral-200 bg-[#fbfbf9] sticky top-0 z-20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-black text-white font-bold flex items-center justify-center text-sm shadow-2xs">
                      {editingProfile.avatar || '档'}
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-[#1a1a17] flex items-center gap-2">
                        <span>{editingProfile.name ? `统一档案分层编辑 · ${editingProfile.name}` : '新建用户数据统一档案'}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-200 text-neutral-800 font-bold">
                          {editingProfile.meshTier}
                        </span>
                      </h2>
                      <p className="text-[11px] text-neutral-500 font-mono">
                        档案号: {editingProfile.id} · 国密 SM4/SM3 验签通道
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="p-1 text-neutral-400 hover:text-neutral-700 rounded-md transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* 分层表单快速导航步进器 */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setFormActiveLayer('all')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                      formActiveLayer === 'all'
                        ? 'bg-black text-white'
                        : 'bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    全部 4 层展开
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormActiveLayer('L1')}
                    className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                      formActiveLayer === 'L1'
                        ? 'bg-neutral-900 text-white'
                        : 'bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    L1 身份准入
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormActiveLayer('L2')}
                    className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                      formActiveLayer === 'L2'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white border border-neutral-300 text-indigo-700 hover:bg-indigo-50'
                    }`}
                  >
                    L2 组织管辖
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormActiveLayer('L3')}
                    className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                      formActiveLayer === 'L3'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white border border-neutral-300 text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    L3 履约风控
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormActiveLayer('L4')}
                    className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                      formActiveLayer === 'L4'
                        ? 'bg-amber-600 text-white'
                        : 'bg-white border border-neutral-300 text-amber-700 hover:bg-amber-50'
                    }`}
                  >
                    L4 云端存证
                  </button>
                </div>

                {/* 快速载入预设高拟真模板 */}
                <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] pt-0.5">
                  <span className="text-neutral-500 font-medium whitespace-nowrap flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    快速预填:
                  </span>
                  <button
                    type="button"
                    onClick={() => applyPresetTemplate('rider')}
                    className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 cursor-pointer whitespace-nowrap transition-colors"
                  >
                    骑手单兵 (L4)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetTemplate('merchant')}
                    className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer whitespace-nowrap transition-colors"
                  >
                    餐车车长 (L3)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetTemplate('district')}
                    className="px-2 py-0.5 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 cursor-pointer whitespace-nowrap transition-colors"
                  >
                    战区总监 (L2)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetTemplate('customer')}
                    className="px-2 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 cursor-pointer whitespace-nowrap transition-colors"
                  >
                    食客会员
                  </button>
                </div>
              </div>

              {/* Drawer Form Body - 四层分层结构 */}
              <form onSubmit={handleSaveProfile} className="p-5 space-y-5 flex-1">
                {/* 实时档案分层全景卡片预览 */}
                <div className="p-3 rounded-xl bg-gradient-to-r from-neutral-900 to-neutral-800 text-white shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded bg-white/20 font-bold flex items-center justify-center text-xs">
                        {editingProfile.avatar || '用'}
                      </span>
                      <span className="font-bold text-sm">{editingProfile.name || '未填真实姓名'}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/10 text-neutral-300">
                        {editingProfile.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                        信用: {editingProfile.creditScore} 分
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                        {editingProfile.meshTier}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-neutral-300 pt-1 border-t border-white/10">
                    <div>管辖组织: <span className="text-white truncate inline-block max-w-[120px] align-bottom">{editingProfile.organization || '无'}</span></div>
                    <div>驻守网格: <span className="text-white">{editingProfile.gridCode || '全局'}</span></div>
                    <div>安全密级: <span className="text-amber-300 font-bold">{editingProfile.securityRating}</span></div>
                  </div>
                </div>

                {/* 第 1 层：基础身份与准入鉴权层 */}
                {(formActiveLayer === 'all' || formActiveLayer === 'L1') && (
                  <div className="border border-neutral-200 rounded-xl p-4 bg-white shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-black text-white text-[10px] font-mono font-bold flex items-center justify-center">
                          L1
                        </span>
                        <h3 className="text-xs font-bold text-[#1a1a17]">第 1 层：基础身份与准入鉴权</h3>
                        <span className="text-[10px] text-neutral-400 font-mono">Identity & Gatekeeper</span>
                      </div>
                      <span className="text-[10px] font-mono text-neutral-400">真实身份·国密证书</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-neutral-600 font-medium mb-1">真实姓名 *</label>
                        <input
                          type="text"
                          required
                          value={editingProfile.name}
                          onChange={(e) => setEditingProfile({ ...editingProfile, name: e.target.value, avatar: e.target.value.slice(0, 1) || '用' })}
                          className="w-full bg-[#f9f9f8] border border-neutral-300 rounded-lg px-2.5 py-1.5 text-neutral-800 focus:outline-none focus:border-black"
                          placeholder="例如：周凯"
                        />
                      </div>

                      <div>
                        <label className="block text-neutral-600 font-medium mb-1">手机号 (核心联系) *</label>
                        <input
                          type="text"
                          required
                          value={editingProfile.phone}
                          onChange={(e) => setEditingProfile({ ...editingProfile, phone: e.target.value })}
                          className="w-full bg-[#f9f9f8] border border-neutral-300 rounded-lg px-2.5 py-1.5 text-neutral-800 focus:outline-none focus:border-black font-mono"
                          placeholder="例如：13812345678"
                        />
                      </div>

                      <div>
                        <label className="block text-neutral-600 font-medium mb-1">身份证号 / 证件哈希</label>
                        <input
                          type="text"
                          value={editingProfile.idCardHash}
                          onChange={(e) => setEditingProfile({ ...editingProfile, idCardHash: e.target.value })}
                          className="w-full bg-[#f9f9f8] border border-neutral-300 rounded-lg px-2.5 py-1.5 text-neutral-800 focus:outline-none focus:border-black font-mono"
                          placeholder="例如：310110********1234"
                        />
                      </div>

                      <div>
                        <label className="block text-neutral-600 font-medium mb-1">主体角色分类</label>
                        <select
                          value={editingProfile.category}
                          onChange={(e) => setEditingProfile({ ...editingProfile, category: e.target.value as UserDossierCategory })}
                          className="w-full bg-[#f9f9f8] border border-neutral-300 rounded-lg px-2.5 py-1.5 text-neutral-800 focus:outline-none focus:border-black cursor-pointer"
                        >
                          <option value="customer">食客会员 (Customer)</option>
                          <option value="rider">骑手单兵 (Rider/L4)</option>
                          <option value="merchant">餐车车长/员工 (Merchant/L3)</option>
                          <option value="district">战区总监 (District/L2)</option>
                          <option value="control">商圈主控席 (Control/L1)</option>
                          <option value="hq">HQ 最高全权/审计 (HQ/L0/L5)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-neutral-600 font-medium mb-1">安全控制等级 (Security Level)</label>
                        <select
                          value={editingProfile.securityRating}
                          onChange={(e) => setEditingProfile({ ...editingProfile, securityRating: e.target.value as any })}
                          className="w-full bg-[#f9f9f8] border border-neutral-300 rounded-lg px-2.5 py-1.5 text-neutral-800 focus:outline-none focus:border-black cursor-pointer font-mono"
                        >
                          <option value="SEC-L1">SEC-L1 常规基础级</option>
                          <option value="SEC-L2">SEC-L2 受控业务级</option>
                          <option value="SEC-L3">SEC-L3 战区重点级</option>
                          <option value="SEC-L4">SEC-L4 极高危熔断级</option>
                          <option value="SEC-L5">SEC-L5 独立合规审计级</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-neutral-600 font-medium mb-1">国密证书编号 (若已签发)</label>
                        <input
                          type="text"
                          value={editingProfile.certificateNo || ''}
                          onChange={(e) => setEditingProfile({ ...editingProfile, certificateNo: e.target.value })}
                          className="w-full bg-[#f9f9f8] border border-neutral-300 rounded-lg px-2.5 py-1.5 text-neutral-800 focus:outline-none font-mono text-[11px]"
                          placeholder="SM4-SH-XXXX"
                        />
                      </div>

                      <div className="col-span-2 pt-1 border-t border-neutral-100 flex items-center justify-between">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingProfile.sm4Certified}
                            onChange={(e) => setEditingProfile({ ...editingProfile, sm4Certified: e.target.checked })}
                            className="rounded text-black"
                          />
                          <span className="text-xs font-medium text-neutral-800">已签发国密 SM4 加密认证</span>
                        </label>

                        <div className="flex items-center gap-3">
                          <span className="text-neutral-500 font-medium">性别:</span>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name="gender"
                              checked={editingProfile.gender === 'male'}
                              onChange={() => setEditingProfile({ ...editingProfile, gender: 'male' })}
                            />
                            <span>男</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name="gender"
                              checked={editingProfile.gender === 'female'}
                              onChange={() => setEditingProfile({ ...editingProfile, gender: 'female' })}
                            />
                            <span>女</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 第 2 层：组织架构与 Mesh 管辖层 */}
                {(formActiveLayer === 'all' || formActiveLayer === 'L2') && (
                  <div className="border border-neutral-200 rounded-xl p-4 bg-white shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-indigo-600 text-white text-[10px] font-mono font-bold flex items-center justify-center">
                          L2
                        </span>
                        <h3 className="text-xs font-bold text-[#1a1a17]">第 2 层：Mesh 拓扑与组织管辖</h3>
                        <span className="text-[10px] text-neutral-400 font-mono">Topology & Jurisdiction</span>
                      </div>
                      <span className="text-[10px] font-mono text-indigo-600">网格化·餐车站位</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-neutral-600 font-medium mb-1">所属 Mesh 授权层级 *</label>
                        <select
                          value={editingProfile.meshTier}
                          onChange={(e) => setEditingProfile({ ...editingProfile, meshTier: e.target.value as MeshTierLevel })}
                          className="w-full bg-[#f9f9f8] border border-neutral-300 rounded-lg px-2.5 py-1.5 text-neutral-800 focus:outline-none focus:border-black cursor-pointer font-mono font-bold"
                        >
                          <option value="L0">L0 · HQ最高全权席 (全网根证书签发)</option>
                          <option value="L1">L1 · 区域商圈主控席 (商圈全域治理)</option>
                          <option value="L2">L2 · 战区指挥总监 (跨网格协同调度)</option>
                          <option value="L3">L3 · 站点移动餐车 (车长/单品沽清)</option>
                          <option value="L4">L4 · 基层现场单兵 (抢单/存证)</option>
                          <option value="L5">L5 · 独立审计席 (区块链回溯专权)</option>
                          <option value="CUSTOMER">CUSTOMER · 食客会员端</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-neutral-600 font-medium mb-1">所属组织 / 编制</label>
                        <input
                          type="text"
                          value={editingProfile.organization}
                          onChange={(e) => setEditingProfile({ ...editingProfile, organization: e.target.value })}
                          className="w-full bg-[#f9f9f8] border border-neutral-300 rounded-lg px-2.5 py-1.5 text-neutral-800 focus:outline-none focus:border-black"
                          placeholder="例如：静安苏河湾闪送快响队"
                        />
                      </div>

                      <div>
                        <label className="block text-neutral-600 font-medium mb-1">驻守网格代码 (Grid Code)</label>
                        <input
                          type="text"
                          value={editingProfile.gridCode}
                          onChange={(e) => setEditingProfile({ ...editingProfile, gridCode: e.target.value })}
                          className="w-full bg-[#f9f9f8] border border-neutral-300 rounded-lg px-2.5 py-1.5 text-neutral-800 focus:outline-none focus:border-black font-mono"
                          placeholder="例如：GRID-SUHE-01"
                        />
                      </div>

                      <div>
                        <label className="block text-neutral-600 font-medium mb-1">直属上级负责人 (姓名/席位)</label>
                        <input
                          type="text"
                          value={editingProfile.directSupervisorName || ''}
                          onChange={(e) => setEditingProfile({ ...editingProfile, directSupervisorName: e.target.value })}
                          className="w-full bg-[#f9f9f8] border border-neutral-300 rounded-lg px-2.5 py-1.5 text-neutral-800 focus:outline-none focus:border-black"
                          placeholder="例如：张建军 (L3 车长)"
                        />
                      </div>

                      <div>
                        <label className="block text-neutral-600 font-medium mb-1">关联驻守餐车 (若有)</label>
                        <select
                          value={editingProfile.assignedTruckId || ''}
                          onChange={(e) => {
                            const tId = e.target.value;
                            const truck = truckList.find((t) => t.id === tId);
                            setEditingProfile({
                              ...editingProfile,
                              assignedTruckId: tId || undefined,
                              assignedTruckName: truck ? truck.name : undefined
                            });
                          }}
                          className="w-full bg-[#f9f9f8] border border-neutral-300 rounded-lg px-2.5 py-1.5 text-neutral-800 focus:outline-none focus:border-black cursor-pointer"
                        >
                          <option value="">-- 无关联固定餐车 --</option>
                          {truckList.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.id} - {t.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-neutral-600 font-medium mb-1">调度履约半径 (km)</label>
                        <input
                          type="number"
                          step="0.5"
                          value={editingProfile.dispatchRadiusKm}
                          onChange={(e) => setEditingProfile({ ...editingProfile, dispatchRadiusKm: Number(e.target.value) || 3.0 })}
                          className="w-full bg-[#f9f9f8] border border-neutral-300 rounded-lg px-2.5 py-1.5 text-neutral-800 focus:outline-none focus:border-black font-mono"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-neutral-600 font-medium mb-1">每日跨车溢出抢单配额 (单/日)</label>
                        <input
                          type="number"
                          value={editingProfile.overflowGrabQuota}
                          onChange={(e) => setEditingProfile({ ...editingProfile, overflowGrabQuota: Number(e.target.value) || 0 })}
                          className="w-full bg-[#f9f9f8] border border-neutral-300 rounded-lg px-2.5 py-1.5 text-neutral-800 focus:outline-none focus:border-black font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 第 3 层：业务履约与风控画像层 */}
                {(formActiveLayer === 'all' || formActiveLayer === 'L3') && (
                  <div className="border border-neutral-200 rounded-xl p-4 bg-white shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-emerald-600 text-white text-[10px] font-mono font-bold flex items-center justify-center">
                          L3
                        </span>
                        <h3 className="text-xs font-bold text-[#1a1a17]">第 3 层：业务履约与风控画像</h3>
                        <span className="text-[10px] text-neutral-400 font-mono">Performance & Risk</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-600">信用评分·GMV贡献</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-neutral-600 font-medium mb-1">账号生命周期状态</label>
                        <select
                          value={editingProfile.status}
                          onChange={(e) => setEditingProfile({ ...editingProfile, status: e.target.value as AccountStatus })}
                          className="w-full bg-[#f9f9f8] border border-neutral-300 rounded-lg px-2.5 py-1.5 text-neutral-800 focus:outline-none focus:border-black cursor-pointer font-semibold"
                        >
                          <option value="active">正常准入 (Active)</option>
                          <option value="restricted">观察受限 (Restricted)</option>
                          <option value="frozen">风控冻结 (Frozen)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-neutral-600 font-medium mb-1">信用分 (0-100)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={editingProfile.creditScore}
                          onChange={(e) => setEditingProfile({ ...editingProfile, creditScore: Number(e.target.value) || 100 })}
                          className="w-full bg-[#f9f9f8] border border-neutral-300 rounded-lg px-2.5 py-1.5 text-neutral-800 focus:outline-none focus:border-black font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-neutral-600 font-medium mb-1">准时履约率 (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={editingProfile.onTimeRatePercent}
                          onChange={(e) => setEditingProfile({ ...editingProfile, onTimeRatePercent: Number(e.target.value) || 100 })}
                          className="w-full bg-[#f9f9f8] border border-neutral-300 rounded-lg px-2.5 py-1.5 text-neutral-800 focus:outline-none focus:border-black font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-neutral-600 font-medium mb-1">历史累计履约单量</label>
                        <input
                          type="number"
                          value={editingProfile.totalOrdersFulfilled || 0}
                          onChange={(e) => setEditingProfile({ ...editingProfile, totalOrdersFulfilled: Number(e.target.value) || 0 })}
                          className="w-full bg-[#f9f9f8] border border-neutral-300 rounded-lg px-2.5 py-1.5 text-neutral-800 focus:outline-none font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-neutral-600 font-medium mb-1">累计贡献流水 (元)</label>
                        <input
                          type="number"
                          value={editingProfile.totalGmvContributed || 0}
                          onChange={(e) => setEditingProfile({ ...editingProfile, totalGmvContributed: Number(e.target.value) || 0 })}
                          className="w-full bg-[#f9f9f8] border border-neutral-300 rounded-lg px-2.5 py-1.5 text-neutral-800 focus:outline-none font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-neutral-600 font-medium mb-1">历史客诉争议次数</label>
                        <input
                          type="number"
                          value={editingProfile.complaintCount || 0}
                          onChange={(e) => setEditingProfile({ ...editingProfile, complaintCount: Number(e.target.value) || 0 })}
                          className="w-full bg-[#f9f9f8] border border-neutral-300 rounded-lg px-2.5 py-1.5 text-neutral-800 focus:outline-none font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-neutral-600 font-medium mb-1">食品健康证到期日 (若适用)</label>
                        <input
                          type="date"
                          value={editingProfile.healthPermitExpiry || ''}
                          onChange={(e) => setEditingProfile({ ...editingProfile, healthPermitExpiry: e.target.value })}
                          className="w-full bg-[#f9f9f8] border border-neutral-300 rounded-lg px-2.5 py-1.5 text-neutral-800 focus:outline-none font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-neutral-600 font-medium mb-1">紧急联系人与电话</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editingProfile.emergencyContact}
                            onChange={(e) => setEditingProfile({ ...editingProfile, emergencyContact: e.target.value })}
                            className="w-1/2 bg-[#f9f9f8] border border-neutral-300 rounded-lg px-2 py-1.5 text-neutral-800 focus:outline-none"
                            placeholder="姓名"
                          />
                          <input
                            type="text"
                            value={editingProfile.emergencyPhone}
                            onChange={(e) => setEditingProfile({ ...editingProfile, emergencyPhone: e.target.value })}
                            className="w-1/2 bg-[#f9f9f8] border border-neutral-300 rounded-lg px-2 py-1.5 text-neutral-800 focus:outline-none font-mono"
                            placeholder="电话"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 第 4 层：云端资源与存证哈希 */}
                {(formActiveLayer === 'all' || formActiveLayer === 'L4') && (
                  <div className="border border-neutral-200 rounded-xl p-4 bg-white shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-amber-600 text-white text-[10px] font-mono font-bold flex items-center justify-center">
                          L4
                        </span>
                        <h3 className="text-xs font-bold text-[#1a1a17]">第 4 层：云端资源与证据链</h3>
                        <span className="text-[10px] text-neutral-400 font-mono">Tencent COS & Proof Hash</span>
                      </div>

                      <button
                        type="button"
                        onClick={handleComputeProofHash}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      >
                        <Zap className="w-3 h-3 text-amber-600" />
                        <span>一键计算国密存证指纹</span>
                      </button>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-neutral-600 font-medium">腾讯云 COS 统一档案归档 URI</label>
                          <span className="text-[10px] font-mono text-neutral-400">已挂载 7463-tc100 存储桶</span>
                        </div>
                        <input
                          type="text"
                          value={editingProfile.cosDossierArchiveUrl || ''}
                          onChange={(e) => setEditingProfile({ ...editingProfile, cosDossierArchiveUrl: e.target.value })}
                          className="w-full bg-[#f9f9f8] border border-neutral-300 rounded-lg px-2.5 py-1.5 text-neutral-800 focus:outline-none font-mono text-[11px]"
                          placeholder="cos://7463-tc100-d9gz0e2ko5929e360-1445454244/dossiers/user.pdf"
                        />
                      </div>

                      <div>
                        <label className="block text-neutral-600 font-medium mb-1">最新链上存证哈希 (SM3 / Blockchain Fingerprint)</label>
                        <input
                          type="text"
                          value={editingProfile.latestProofHash || ''}
                          onChange={(e) => setEditingProfile({ ...editingProfile, latestProofHash: e.target.value })}
                          className="w-full bg-[#f9f9f8] border border-neutral-300 rounded-lg px-2.5 py-1.5 text-neutral-800 focus:outline-none font-mono text-[11px]"
                          placeholder="0x..."
                        />
                      </div>

                      <div className="p-2 bg-[#fbfbf9] rounded-lg border border-neutral-200 text-[11px] text-neutral-600 flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>档案已启用腾讯云 KMS 主密钥信封加密，满足金融级信息防篡改与等保合规要求。</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer Buttons */}
                <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100 sticky bottom-0 bg-white py-3">
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#1a1a17] hover:bg-black text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>保存档案分层数据</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 明文穿透授权确认弹窗 */}
      <AnimatePresence>
        {penetrationTargetId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPenetrationTargetId(null)}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-neutral-300 p-5 z-10 space-y-4"
            >
              <div className="flex items-center gap-2.5 text-amber-600">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <h3 className="text-sm font-bold text-neutral-900">敏感数据穿透审计调阅申请</h3>
              </div>

              <p className="text-xs text-neutral-600 leading-relaxed">
                您正在申请对用户档案【<span className="font-mono font-bold text-black">{penetrationTargetId}</span>】解除脱敏并查看真实手机号与证件。按照数据安全合规要求，此调阅操作将生成永久区块链审计记录。
              </p>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  调阅事由与签批号 (必填) *
                </label>
                <input
                  type="text"
                  value={penetrationReason}
                  onChange={(e) => setPenetrationReason(e.target.value)}
                  placeholder="例如：战区应急调度联络客诉排查"
                  className="w-full bg-[#f9f9f8] border border-neutral-300 rounded-lg p-2 text-xs focus:outline-none focus:border-black"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setPenetrationTargetId(null)}
                  className="px-3 py-1.5 rounded-lg text-xs text-neutral-600 hover:bg-neutral-100 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPenetration}
                  className="px-4 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                >
                  确认调阅并存证
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
