import React, { useState } from 'react';
import {
  Smartphone,
  Laptop,
  Tablet,
  KeyRound,
  Copy,
  Check,
  RefreshCw,
  Plus,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  HardDrive,
  Cpu,
  Monitor
} from 'lucide-react';
import { UserProfile, UserBoundDevice } from '../../../types/user';
import { copyTextToClipboard } from '../../../utils/clipboard';
import {
  addBoundDeviceToUser,
  removeBoundDeviceFromUser,
  toggleDeviceTrustStatus,
  regenerateUserPairingCode
} from '../../../utils/userDataRegistry';

interface UserDataMultiDeviceProps {
  user: UserProfile;
  onUpdateUser: (u: UserProfile) => void;
  showToast: (msg: string) => void;
}

export const UserDataMultiDevice: React.FC<UserDataMultiDeviceProps> = ({
  user,
  onUpdateUser,
  showToast
}) => {
  const [copied, setCopied] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // 新增设备表单状态
  const [newDevName, setNewDevName] = useState('');
  const [newDevHw, setNewDevHw] = useState('');
  const [newDevPlatform, setNewDevPlatform] = useState('iOS / Safari');

  const devices: UserBoundDevice[] = user.boundDevices || [];

  const handleCopyPairingCode = async () => {
    if (!user.pairingCode) return;
    await copyTextToClipboard(user.pairingCode);
    setCopied(true);
    showToast(`已复制多设备关联码: ${user.pairingCode}`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegeneratePairingCode = () => {
    const updated = regenerateUserPairingCode(user);
    onUpdateUser(updated);
    showToast('已重新生成 8 位跨设备安全关联码');
  };

  const handleToggleTrust = (devId: string) => {
    const updated = toggleDeviceTrustStatus(user, devId);
    onUpdateUser(updated);
    showToast('已更新设备安全信任状态');
  };

  const handleRemoveDevice = (devId: string) => {
    const updated = removeBoundDeviceFromUser(user, devId);
    onUpdateUser(updated);
    showToast('已解绑该互联设备');
  };

  const handleAddDeviceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDevName.trim()) {
      showToast('请输入设备名称');
      return;
    }
    const updated = addBoundDeviceToUser(user, {
      deviceName: newDevName.trim(),
      hardwareHash: newDevHw.trim() || undefined,
      platform: newDevPlatform
    });
    onUpdateUser(updated);
    setNewDevName('');
    setNewDevHw('');
    setShowAddForm(false);
    showToast(`已成功关联并绑定新设备: ${newDevName}`);
  };

  const getDeviceIcon = (name: string, platform?: string) => {
    const lower = `${name} ${platform || ''}`.toLowerCase();
    if (lower.includes('pad') || lower.includes('tablet')) return <Tablet className="w-4 h-4 text-sky-600" />;
    if (lower.includes('mac') || lower.includes('thinkpad') || lower.includes('pc') || lower.includes('win'))
      return <Laptop className="w-4 h-4 text-purple-600" />;
    return <Smartphone className="w-4 h-4 text-emerald-600" />;
  };

  return (
    <div className="space-y-3">
      {/* 8位跨设备关联码表单卡 */}
      <div className="p-3 bg-neutral-900 text-white rounded-[1px] border border-neutral-800 space-y-2 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs font-bold text-neutral-100 truncate whitespace-nowrap">
              跨设备安全免密关联码
            </span>
          </div>
          <span className="text-[10px] text-neutral-400 font-mono whitespace-nowrap shrink-0">
            8 位动态加密通行码
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 bg-neutral-950 px-3 py-2 rounded-[1px] border border-neutral-800">
          <span className="font-mono font-black text-sm text-amber-400 tracking-wider truncate">
            {user.pairingCode || 'UR-7788-BIND'}
          </span>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyPairingCode}
              className="text-neutral-300 hover:text-white text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已复制' : '复制码'}</span>
            </button>
            <span className="text-neutral-700">|</span>
            <button
              type="button"
              onClick={handleRegeneratePairingCode}
              className="text-neutral-400 hover:text-white text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>刷新</span>
            </button>
          </div>
        </div>

        <div className="text-[10px] text-neutral-400 truncate whitespace-nowrap font-medium">
          食客在副机、平板或车载屏幕输入此码，即刻与该账号完成无感多端信任绑定
        </div>
      </div>

      {/* 已绑定设备清单表单 */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold text-neutral-700 px-0.5">
          <span className="whitespace-nowrap flex items-center gap-1">
            <Monitor className="w-3.5 h-3.5 text-neutral-600" />
            已免密互联终端设备 ({devices.length} 台)
          </span>
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showAddForm ? '收起添加' : '关联新终端'}</span>
          </button>
        </div>

        {/* 手动添加新设备表单 */}
        {showAddForm && (
          <form
            onSubmit={handleAddDeviceSubmit}
            className="p-3 bg-neutral-50 rounded-[1px] border border-neutral-300 space-y-2 text-xs"
          >
            <div className="text-xs font-bold text-neutral-800 whitespace-nowrap">
              手动关联信任新设备 (表单)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-neutral-500 font-bold whitespace-nowrap block">
                  设备名称
                </label>
                <input
                  type="text"
                  placeholder="例如: 食客办公笔记本"
                  value={newDevName}
                  onChange={(e) => setNewDevName(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white rounded-[1px] border border-neutral-300 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 whitespace-nowrap"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-neutral-500 font-bold whitespace-nowrap block">
                  硬件哈希码 (选填)
                </label>
                <input
                  type="text"
                  placeholder="HW-XXXX-XXXX"
                  value={newDevHw}
                  onChange={(e) => setNewDevHw(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white rounded-[1px] border border-neutral-300 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 whitespace-nowrap"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-neutral-500 font-bold whitespace-nowrap block">
                  平台架构
                </label>
                <select
                  value={newDevPlatform}
                  onChange={(e) => setNewDevPlatform(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white rounded-[1px] border border-neutral-300 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 whitespace-nowrap"
                >
                  <option value="iPhone / iOS 17.5">iPhone / iOS 17.5</option>
                  <option value="iPadOS / Safari">iPadOS / Safari</option>
                  <option value="MacIntel / macOS 14.5">MacIntel / macOS 14.5</option>
                  <option value="Win32 / Windows 11">Win32 / Windows 11</option>
                  <option value="Android 14 / Chrome">Android 14 / Chrome</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 bg-white border border-neutral-300 hover:bg-neutral-100 rounded-[1px] text-xs font-bold text-neutral-600 cursor-pointer whitespace-nowrap"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-[1px] text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Check className="w-3.5 h-3.5" />
                <span>立即关联设备</span>
              </button>
            </div>
          </form>
        )}

        {/* 设备列表卡片 */}
        <div className="bg-white rounded-[1px] border border-neutral-200 divide-y divide-neutral-100 overflow-hidden text-xs">
          {devices.length === 0 ? (
            <div className="py-6 text-center text-neutral-400 text-xs whitespace-nowrap font-medium">
              该食客暂无绑定的互联设备
            </div>
          ) : (
            devices.map((d) => (
              <div key={d.id} className="p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-[1px] bg-neutral-100 flex items-center justify-center shrink-0">
                    {getDeviceIcon(d.deviceName, d.platform)}
                  </div>

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-neutral-900 truncate whitespace-nowrap">
                        {d.deviceName}
                      </span>
                      {d.isCurrent && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-[1px] font-mono whitespace-nowrap shrink-0">
                          当前首选主机
                        </span>
                      )}
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded-[1px] font-mono whitespace-nowrap shrink-0 ${
                          d.status === 'trusted'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {d.status === 'trusted' ? '信任免密' : '已挂起鉴权'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-mono truncate">
                      <span className="truncate text-neutral-700 font-bold">{d.hardwareHash}</span>
                      <span>·</span>
                      <span className="truncate">{d.platform || 'Cross-Platform'}</span>
                      <span>·</span>
                      <span className="truncate">{d.physicalResolution || '2560x1440'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleTrust(d.id)}
                    className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-[1px] text-[11px] flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    {d.status === 'trusted' ? (
                      <>
                        <ShieldAlert className="w-3 h-3 text-amber-600" />
                        <span>挂起</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>信任</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemoveDevice(d.id)}
                    className="p-1 text-neutral-400 hover:text-rose-600 rounded-[1px] hover:bg-rose-50 cursor-pointer"
                    title="解绑设备"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
