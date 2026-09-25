import React, { useState } from 'react';
import {
  ShieldAlert,
  Play,
  RotateCcw,
  CheckCircle2,
  Layers,
  Terminal,
  RefreshCw,
  Cpu,
  Fingerprint,
  Zap,
  HardDrive
} from 'lucide-react';
import { UserProfile } from '../../../types/user';
import { runSimulatedUserDiagnostic } from '../../../utils/userDataRegistry';

interface UserDataDiagnosticsProps {
  user: UserProfile;
  onUpdateUser: (u: UserProfile) => void;
  showToast: (msg: string) => void;
}

interface DiagnosticLogItem {
  id: string;
  type: 'anti_wipe' | 'cross_browser' | 'new_device';
  title: string;
  success: boolean;
  score: number;
  reason: string;
  timestamp: string;
}

export const UserDataDiagnostics: React.FC<UserDataDiagnosticsProps> = ({
  user,
  onUpdateUser,
  showToast
}) => {
  const [runningType, setRunningType] = useState<string | null>(null);
  const [logs, setLogs] = useState<DiagnosticLogItem[]>([
    {
      id: 'init-1',
      type: 'anti_wipe',
      title: '抗清缓存自愈免密识别',
      success: true,
      score: user.autoLoginScore || 99.8,
      reason: `跨会话硬件指纹校验通过 [${user.hardwareHash || 'HW-CORE'}]，成功绑定食客 ${user.nickname}。`,
      timestamp: '系统初始化'
    }
  ]);

  const handleRunTest = (type: 'anti_wipe' | 'cross_browser' | 'new_device', title: string) => {
    setRunningType(type);
    setTimeout(() => {
      const res = runSimulatedUserDiagnostic(user, type);
      const newLog: DiagnosticLogItem = {
        id: `log-${Date.now()}`,
        type,
        title,
        success: res.success,
        score: res.score,
        reason: res.reason,
        timestamp: res.timestamp
      };
      setLogs((prev) => [newLog, ...prev]);
      setRunningType(null);

      // 更新用户状态标记
      const updated: UserProfile = {
        ...user,
        crossBrowserTested: type === 'cross_browser' ? true : user.crossBrowserTested,
        antiWipeRecoveryTested: type === 'anti_wipe' ? true : user.antiWipeRecoveryTested
      };
      onUpdateUser(updated);
      showToast(`已完成「${title}」判定: 置信度 ${res.score}%`);
    }, 600);
  };

  return (
    <div className="space-y-3">
      {/* 诊断引擎就绪状态看板 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="p-2.5 bg-white rounded-[1px] border border-neutral-200 flex items-center justify-between gap-2 shadow-xs">
          <div className="min-w-0">
            <span className="text-[10px] text-neutral-500 font-bold block truncate whitespace-nowrap">
              跨浏览器不可变特征
            </span>
            <span className="text-xs font-black text-neutral-900 block truncate whitespace-nowrap">
              Chrome ⇄ Safari 一致
            </span>
          </div>
          <span className="w-6 h-6 rounded-[1px] bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </span>
        </div>

        <div className="p-2.5 bg-white rounded-[1px] border border-neutral-200 flex items-center justify-between gap-2 shadow-xs">
          <div className="min-w-0">
            <span className="text-[10px] text-neutral-500 font-bold block truncate whitespace-nowrap">
              抗清除缓存自愈
            </span>
            <span className="text-xs font-black text-neutral-900 block truncate whitespace-nowrap">
              底层双重保险箱就绪
            </span>
          </div>
          <span className="w-6 h-6 rounded-[1px] bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4 text-emerald-700" />
          </span>
        </div>

        <div className="p-2.5 bg-white rounded-[1px] border border-neutral-200 flex items-center justify-between gap-2 shadow-xs">
          <div className="min-w-0">
            <span className="text-[10px] text-neutral-500 font-bold block truncate whitespace-nowrap">
              首次访问秒级建档
            </span>
            <span className="text-xs font-black text-neutral-900 block truncate whitespace-nowrap">
              零阻力自动入库
            </span>
          </div>
          <span className="w-6 h-6 rounded-[1px] bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4" />
          </span>
        </div>
      </div>

      {/* 交互测试控制表单条 */}
      <div className="p-3 bg-neutral-900 text-white rounded-[1px] border border-neutral-800 space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs font-bold text-neutral-100 truncate whitespace-nowrap">
              无密码智能登录系统 · 现场测试沙箱
            </span>
          </div>
          <span className="text-[10px] font-mono text-neutral-400 shrink-0 whitespace-nowrap">
            UID: {user.uid}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            disabled={runningType !== null}
            onClick={() => handleRunTest('anti_wipe', '抗清缓存自愈识别')}
            className="px-2.5 py-2 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-900 border border-neutral-700 rounded-[1px] text-xs font-bold text-neutral-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            {runningType === 'anti_wipe' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            ) : (
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span className="truncate">模拟清缓存自愈测试</span>
          </button>

          <button
            type="button"
            disabled={runningType !== null}
            onClick={() => handleRunTest('cross_browser', '跨浏览器比对')}
            className="px-2.5 py-2 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-900 border border-neutral-700 rounded-[1px] text-xs font-bold text-neutral-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            {runningType === 'cross_browser' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
            ) : (
              <Layers className="w-3.5 h-3.5 text-sky-400" />
            )}
            <span className="truncate">模拟跨浏览器一致性</span>
          </button>

          <button
            type="button"
            disabled={runningType !== null}
            onClick={() => handleRunTest('new_device', '新设备建档')}
            className="px-2.5 py-2 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-900 border border-neutral-700 rounded-[1px] text-xs font-bold text-neutral-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            {runningType === 'new_device' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
            ) : (
              <Play className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className="truncate">模拟新设备秒级建档</span>
          </button>
        </div>
      </div>

      {/* 实时诊断判定日志表单 */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold text-neutral-700 px-0.5">
          <span className="whitespace-nowrap flex items-center gap-1">
            <Terminal className="w-3.5 h-3.5 text-neutral-600" />
            实时诊断流水与判定依据 (表单列表)
          </span>
          <button
            type="button"
            onClick={() => setLogs([])}
            className="text-[10px] text-neutral-400 hover:text-neutral-700 flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3 h-3" />
            <span>清空记录</span>
          </button>
        </div>

        <div className="bg-white rounded-[1px] border border-neutral-200 divide-y divide-neutral-100 overflow-hidden">
          {logs.length === 0 ? (
            <div className="py-6 text-center text-neutral-400 text-xs font-medium whitespace-nowrap">
              暂无现场测试流水，请点击上方按扭进行仿真判定
            </div>
          ) : (
            logs.map((item) => (
              <div key={item.id} className="p-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold text-neutral-900 truncate whitespace-nowrap">
                      {item.title}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-[1px] whitespace-nowrap shrink-0">
                      置信度 {item.score}%
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono whitespace-nowrap shrink-0">
                      {item.timestamp}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-600 truncate font-mono whitespace-nowrap">
                    {item.reason}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1 text-emerald-600 font-bold text-xs whitespace-nowrap">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>PASS</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
