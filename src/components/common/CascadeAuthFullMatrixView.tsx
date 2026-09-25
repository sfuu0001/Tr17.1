import React, { useState } from 'react';
import {
  ShieldCheck,
  Crown,
  Building2,
  Users,
  Truck,
  Bike,
  Lock,
  Unlock,
  Sliders,
  ExternalLink,
  Sparkles,
  Zap,
  CheckCircle2,
  X,
  Radio,
  KeyRound,
  AlertTriangle,
  History,
  Terminal,
  RefreshCw,
  Fingerprint,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useCascadeAuth } from '../../context/CascadeAuthContext';
import { MeshTierLevel, DEFAULT_MESH_IDENTITIES } from '../../utils/cascadeMeshEngine';

export interface CascadeAuthFullMatrixViewProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToPlatformMatrix?: () => void;
}

export const CascadeAuthFullMatrixView: React.FC<CascadeAuthFullMatrixViewProps> = ({
  isOpen,
  onClose,
  onNavigateToPlatformMatrix
}) => {
  const { activeIdentity, switchTier, permissions, applyPreset } = useCascadeAuth();
  const [activeTab, setActiveTab] = useState<'matrix' | 'topology' | 'audit'>('matrix');
  const [elevationTimer, setElevationTimer] = useState<number | null>(null);
  const [killSwitchEngaged, setKillSwitchEngaged] = useState<boolean>(false);
  const [auditFilter, setAuditFilter] = useState<'all' | 'alert' | 'pass'>('all');

  if (!isOpen) return null;

  const activeEnabledCount = permissions.filter((p) => p.enabled).length;

  const tierOptions: {
    tier: MeshTierLevel;
    label: string;
    icon: any;
    desc: string;
    badge: string;
    levelName: string;
    keyHash: string;
    color: string;
  }[] = [
    {
      tier: 'L0',
      label: 'L0 HQ最高全权管理员',
      levelName: '总部战略最高层',
      icon: Crown,
      desc: '拥有全域商圈开设、根证书签批、极高危熔断 (Kill-Switch) 与全权控制',
      badge: '最高全权',
      keyHash: '0x9E7F...3B21 (ECDSA-Root)',
      color: 'border-purple-500/60 bg-purple-950/40 text-purple-200'
    },
    {
      tier: 'L1',
      label: 'L1 区域商圈主控席',
      levelName: '区域核心中枢',
      icon: Building2,
      desc: '苏河湾商圈全域主控，管理下属多名主控与督查席位，协调辖区餐车部署',
      badge: '商圈主控',
      keyHash: '0x4D1A...77E0 (Zone-Cert)',
      color: 'border-amber-500/60 bg-amber-950/40 text-amber-200'
    },
    {
      tier: 'L2',
      label: 'L2 战区指挥总监',
      levelName: '战区调度总监',
      icon: Users,
      desc: '直属管辖 03/04/01 号餐车与 8 名现场单兵，负责天气加价审批与跨车调度',
      badge: '指挥总监',
      keyHash: '0x81C3...9A10 (Fleet-Master)',
      color: 'border-blue-500/60 bg-blue-950/40 text-blue-200'
    },
    {
      tier: 'L3',
      label: 'L3 站点移动餐车站长',
      levelName: '现场车长主理人',
      icon: Truck,
      desc: '03号餐车主厨/车长，负责单品实时快速估清下架、后厨出餐与车载温控预警',
      badge: '移动餐车',
      keyHash: '0xF309...E842 (Stall-Token)',
      color: 'border-orange-500/60 bg-orange-950/40 text-orange-200'
    },
    {
      tier: 'L4',
      label: 'L4 基层现场单兵/骑手',
      levelName: '极速末端运力',
      icon: Bike,
      desc: 'RTK 亚米级先锋单兵，享有车前语音直连、拍照存证、跨车超载溢出抢单分账',
      badge: '基层单兵',
      keyHash: '0x1A2B...5C6D (Rider-Key)',
      color: 'border-emerald-500/60 bg-emerald-950/40 text-emerald-200'
    },
    {
      tier: 'L5',
      label: 'L5 独立审计席',
      levelName: '合规风控审计',
      icon: ShieldCheck,
      desc: '独立审计员方敏慧，穿透全网底层 90 天区块链哈希操作日志与基线重置',
      badge: '独立审计',
      keyHash: '0x00FF...AA11 (Audit-Watch)',
      color: 'border-indigo-500/60 bg-indigo-950/40 text-indigo-200'
    }
  ];

  const auditLogs = [
    { id: 'log-1', time: '10:42:15', tier: 'L0', action: 'ROOT_COMMISSION', desc: 'HQ 授权商圈跨车运力溢出补偿', status: 'pass', hash: 'sha256:7f81...a3b9' },
    { id: 'log-2', time: '10:38:02', tier: 'L3', action: 'STALL_MENU_HOLD', desc: '黑曜石01车估清【炭烤和牛小汉堡】', status: 'pass', hash: 'sha256:2c14...89ee' },
    { id: 'log-3', time: '10:35:49', tier: 'L4', action: 'UNAUTHORIZED_CROSS_DISPATCH', desc: '检测到未授权修改全域加价系数，已被 L0 基线拦截', status: 'alert', hash: 'sha256:990e...1b4a' },
    { id: 'log-4', time: '10:20:11', tier: 'L2', action: 'RADAR_EXPAND_REQ', desc: '苏河湾战区临时扩大运送雷达半径至 3.5km', status: 'pass', hash: 'sha256:4a7d...5501' },
    { id: 'log-5', time: '09:55:20', tier: 'L5', action: 'BASELINE_90D_VERIFY', desc: '90天全景穿透审计自检通过，无单点漂移', status: 'pass', hash: 'sha256:11bb...ee90' }
  ];

  const filteredLogs = auditLogs.filter((l) => {
    if (auditFilter === 'all') return true;
    return l.status === auditFilter;
  });

  const handleApplyTemporaryElevation = () => {
    setElevationTimer(60);
    const timer = setInterval(() => {
      setElevationTimer((prev) => {
        if (!prev || prev <= 1) {
          clearInterval(timer);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0D0E11] text-neutral-100 flex flex-col w-full h-full overflow-hidden animate-fadeIn font-sans">
      {/* 顶部专业 HUD 指挥控制台标题栏 */}
      <header className="border-b border-neutral-800 bg-[#14161B]/95 backdrop-blur-md px-4 py-3 shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/50 flex items-center justify-center text-purple-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2 flex-wrap">
                <h1 className="text-base font-extrabold text-white tracking-wide flex items-center gap-1.5">
                  <span>全域级联穿透分层授权中枢</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-400/40">
                    HUD COMMAND CENTER
                  </span>
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  当前放行 {activeEnabledCount}/15
                </span>
              </div>
              <p className="text-xs text-neutral-400 truncate mt-0.5">
                当前授权席位：<strong className="text-white">{activeIdentity.tierLabel} · {activeIdentity.name}</strong> ({activeIdentity.roleTitle})
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {onNavigateToPlatformMatrix && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToPlatformMatrix();
                }}
                className="hidden sm:flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>全域拓扑矩阵</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              title="关闭指挥中心"
            >
              <X className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>
        </div>

        {/* 顶部分栏导航 */}
        <div className="max-w-6xl mx-auto mt-2 flex items-center space-x-6 text-xs border-t border-neutral-800/80 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`py-1 relative font-bold transition flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'matrix' ? 'text-white' : 'text-neutral-400 hover:text-neutral-200 font-medium'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>身份天梯矩阵 (L0-L5)</span>
            {activeTab === 'matrix' && (
              <span className="absolute -bottom-2 left-0 right-0 h-[2px] bg-purple-500 rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('topology')}
            className={`py-1 relative font-bold transition flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'topology' ? 'text-white' : 'text-neutral-400 hover:text-neutral-200 font-medium'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            <span>全息权限密码学链条</span>
            {activeTab === 'topology' && (
              <span className="absolute -bottom-2 left-0 right-0 h-[2px] bg-amber-500 rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`py-1 relative font-bold transition flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'audit' ? 'text-white' : 'text-neutral-400 hover:text-neutral-200 font-medium'
            }`}
          >
            <History className="w-3.5 h-3.5 text-emerald-400" />
            <span>90天基线审计沙盒</span>
            {activeTab === 'audit' && (
              <span className="absolute -bottom-2 left-0 right-0 h-[2px] bg-emerald-500 rounded-full" />
            )}
          </button>
        </div>
      </header>

      {/* 视口主内容区 */}
      <main className="flex-1 overflow-y-auto p-4 max-w-6xl w-full mx-auto space-y-4">
        {/* Tab 1: 身份天梯矩阵 */}
        {activeTab === 'matrix' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-purple-400" />
                点击以下任意身份席位，即刻实时穿透全站权限与指令沙盒：
              </span>
              <span className="font-mono text-[11px] text-purple-400">实时加密通道同步</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {tierOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = activeIdentity.tier === opt.tier;
                return (
                  <div
                    key={opt.tier}
                    onClick={() => switchTier(opt.tier)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group relative ${
                      isSelected
                        ? `${opt.color} ring-2 ring-purple-500 ring-offset-2 ring-offset-[#0D0E11] shadow-lg`
                        : 'border-neutral-800 bg-[#15171D] hover:bg-[#1A1D24] hover:border-neutral-700 text-neutral-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-mono font-bold block">{opt.tier}</span>
                            <span className="text-[10px] text-neutral-400">{opt.levelName}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/10">
                          {opt.badge}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white mb-1">{opt.label}</h4>
                      <p className="text-xs text-neutral-400 leading-relaxed">{opt.desc}</p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[10.5px] font-mono text-neutral-400">
                      <span>密钥：{opt.keyHash}</span>
                      {isSelected ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          正在接管
                        </span>
                      ) : (
                        <span className="group-hover:text-white flex items-center gap-0.5">
                          切换 <ArrowRight className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: 全息权限密码学链条 */}
        {activeTab === 'topology' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#15171D] border border-neutral-800 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>全域密码学安全参数与穿透拓扑</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-black/40 border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 block font-mono">ENCRYPTION PROTOCOL</span>
                  <span className="text-sm font-bold text-white mt-1 block">ECDSA-secp256k1</span>
                  <span className="text-[10px] text-emerald-400 mt-0.5 block">哈希链条完好 · 无篡改</span>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 block font-mono">MESH DEPTH</span>
                  <span className="text-sm font-bold text-white mt-1 block">4-Hop Micro-Cascade</span>
                  <span className="text-[10px] text-neutral-300 mt-0.5 block">平均穿透延迟 1.8ms</span>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 block font-mono">KILL SWITCH STATE</span>
                  <span className={`text-sm font-bold mt-1 block ${killSwitchEngaged ? 'text-red-400' : 'text-emerald-400'}`}>
                    {killSwitchEngaged ? '已紧急锁死' : 'GUARD READY 正常'}
                  </span>
                  <span className="text-[10px] text-neutral-400 mt-0.5 block">L0 / L5 独占触发权</span>
                </div>
              </div>

              {/* 应急控制动作 */}
              <div className="pt-2 flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={handleApplyTemporaryElevation}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{elevationTimer ? `即时全域提权中 (${elevationTimer}s)` : '发起 60秒 临时全域提权申请'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setKillSwitchEngaged((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    killSwitchEngaged
                      ? 'bg-red-600 text-white'
                      : 'bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/40'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{killSwitchEngaged ? '解除紧急熔断锁定' : '模拟高危熔断 (Kill-Switch)'}</span>
                </button>
              </div>
            </div>

            {/* 权限放行明细表 */}
            <div className="p-4 rounded-2xl bg-[#15171D] border border-neutral-800">
              <h4 className="text-xs font-bold text-neutral-300 mb-3 flex items-center justify-between">
                <span>当前身份放行权限矩阵 (15 维度基线)</span>
                <span className="text-[10px] font-mono text-neutral-500">RBAC-MESH-SPEC</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {permissions.map((perm) => (
                  <div
                    key={perm.id}
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                      perm.enabled
                        ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-200'
                        : 'border-neutral-800 bg-neutral-900/50 text-neutral-500'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <span className="font-bold block truncate">{perm.name}</span>
                      <span className="text-[10px] font-mono text-neutral-400 block truncate">{perm.code || perm.id}</span>
                    </div>
                    <span className="shrink-0">
                      {perm.enabled ? (
                        <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-neutral-600" />
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: 90天基线审计沙盒 */}
        {activeTab === 'audit' && (
          <div className="p-4 rounded-2xl bg-[#15171D] border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Fingerprint className="w-4 h-4 text-emerald-400" />
                  <span>全域穿透审计沙盒与 90 天不可篡改日志</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  所有提权、越权尝试、熔断指令均经由哈希链条实时盖戳归档
                </p>
              </div>

              <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-neutral-800 text-xs">
                {(['all', 'alert', 'pass'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setAuditFilter(mode)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                      auditFilter === mode
                        ? 'bg-neutral-800 text-white font-bold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {mode === 'all' ? '全部' : mode === 'alert' ? '越权告警' : '放行记录'}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-neutral-800/80">
              {filteredLogs.map((log) => (
                <div key={log.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-neutral-400">{log.time}</span>
                      <span className="font-bold text-white px-1.5 py-0.2 rounded bg-white/10 font-mono text-[10px]">
                        {log.tier}
                      </span>
                      <span className="font-mono text-[11px] text-purple-300 font-semibold">{log.action}</span>
                    </div>
                    <p className="text-neutral-300 mt-1">{log.desc}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        log.status === 'pass'
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                          : 'bg-red-950/60 text-red-300 border border-red-500/30'
                      }`}
                    >
                      {log.status === 'pass' ? 'VERIFIED' : 'BLOCKED 拦截'}
                    </span>
                    <span className="block text-[9.5px] font-mono text-neutral-500 mt-1">{log.hash}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 底部全域控制栏 */}
      <footer className="border-t border-neutral-800 bg-[#14161B] px-4 py-2.5 shrink-0 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2 text-neutral-400 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>全域级联穿透基线生效中</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold transition cursor-pointer"
          >
            退出指挥中心
          </button>
        </div>
      </footer>
    </div>
  );
};

export default CascadeAuthFullMatrixView;
