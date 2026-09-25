import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldBan,
  ShieldCheck,
  AlertTriangle,
  Fingerprint,
  RotateCcw,
  Check,
  Coins,
  CreditCard,
  Sliders,
  History,
  HardDrive,
  Cpu,
  Lock,
  Unlock,
  UserX,
  UserCheck
} from 'lucide-react';
import { UserProfile } from '../../../types/user';
import {
  setUserViolationAction,
  setDirectUserAssets,
  adjustUserBalance
} from '../../../utils/userDataRegistry';

interface UserDataViolationControlProps {
  user: UserProfile;
  onUpdateUser: (updated: UserProfile) => void;
  showToast: (msg: string) => void;
}

export const UserDataViolationControl: React.FC<UserDataViolationControlProps> = ({
  user,
  onUpdateUser,
  showToast
}) => {
  // 违规处置状态
  const isBanned = user.status === 'banned';
  const isHwBlacklisted = user.status === 'hardware_blacklisted';
  const isNormal = !user.status || user.status === 'normal';

  const [banReason, setBanReason] = useState('恶意高频撞库 / 疑似黑产欺诈');
  const [customReason, setCustomReason] = useState('');
  const [operatorName, setOperatorName] = useState('商家风控值班员');

  // 资产与积分直接修改表单状态
  const [editBalance, setEditBalance] = useState(user.balance.toString());
  const [editPoints, setEditPoints] = useState(user.points.toString());
  const [assetReason, setAssetReason] = useState('后台风控/人工校准');

  // 快速加减微调状态
  const [quickDeltaKind, setQuickDeltaKind] = useState<'balance' | 'points'>('balance');
  const [quickDeltaVal, setQuickDeltaVal] = useState('50');

  // 处理封停账号
  const handleBanAccount = () => {
    const reason = customReason.trim() || banReason;
    if (window.confirm(`确定要封停食客 [${user.nickname}] 的登录与下单权限吗？`)) {
      const updated = setUserViolationAction(user, 'ban', reason, operatorName);
      onUpdateUser(updated);
      showToast(`已封停食客 [${user.nickname}] 的账号权限`);
    }
  };

  // 处理全指纹黑名单
  const handleBlacklistHardware = () => {
    const reason = customReason.trim() || banReason;
    if (
      window.confirm(
        `【高危拦截操作】确定将食客 [${user.nickname}] 的硬件特征码 [${user.hardwareHash}]、设备指纹及全部互联终端加入全指纹黑名单吗？\n拉黑后，该物理设备及关联终端将完全禁止免密自动登入与结算！`
      )
    ) {
      const updated = setUserViolationAction(user, 'blacklist_hw', reason, operatorName);
      onUpdateUser(updated);
      showToast(`已将食客 [${user.nickname}] 加入全指纹黑名单`);
    }
  };

  // 处理解除处罚
  const handleUnban = () => {
    if (window.confirm(`确定要解除对食客 [${user.nickname}] 的封禁与黑名单限制吗？`)) {
      const updated = setUserViolationAction(user, 'unban', '管理员人工解封恢复', operatorName);
      onUpdateUser(updated);
      showToast(`已解除食客 [${user.nickname}] 的限制状态，恢复正常`);
    }
  };

  // 保存直接修改的资产与积分
  const handleSaveDirectAssets = (e: React.FormEvent) => {
    e.preventDefault();
    const bal = Number(editBalance);
    const pts = Number(editPoints);
    if (isNaN(bal) || bal < 0) {
      showToast('请输入有效的储值金额 (>=0)');
      return;
    }
    if (isNaN(pts) || pts < 0) {
      showToast('请输入有效的积分数值 (>=0)');
      return;
    }
    const updated = setDirectUserAssets(user, bal, pts, assetReason.trim() || '后台管理修改');
    onUpdateUser(updated);
    showToast(`资产与积分已直接更新：余额 ¥${bal.toFixed(2)}，积分 ${pts}`);
  };

  // 快捷微调加减
  const handleQuickAdjust = (delta: number) => {
    const updated = adjustUserBalance(
      user,
      quickDeltaKind,
      delta,
      `商家后台快捷微调 (${delta > 0 ? '+' : ''}${delta})`
    );
    onUpdateUser(updated);
    if (quickDeltaKind === 'balance') {
      setEditBalance(updated.balance.toString());
    } else {
      setEditPoints(updated.points.toString());
    }
    showToast(`已为 ${user.nickname} 快速${delta > 0 ? '调增' : '扣减'} ${Math.abs(delta)}`);
  };

  // 汇总所有被拦截的特征码
  const collectedFingerprints = [
    user.hardwareHash && { type: '主硬件不变码', val: user.hardwareHash },
    user.deviceFingerprint && { type: '设备复合指纹', val: user.deviceFingerprint },
    user.hardwareDetails?.audioDspHash && {
      type: '声卡 DSP 采样',
      val: user.hardwareDetails.audioDspHash
    },
    user.hardwareDetails?.canvasHash && {
      type: 'Canvas 渲染指纹',
      val: user.hardwareDetails.canvasHash
    },
    ...(user.boundDevices || []).map((d) => ({
      type: `互联终端 (${d.deviceName})`,
      val: d.hardwareHash
    }))
  ].filter(Boolean) as Array<{ type: string; val: string }>;

  return (
    <div className="space-y-3">
      {/* 状态总览横幅 (1px 微圆角) */}
      <div
        className={`p-3 rounded-[1px] border flex items-center justify-between gap-2 ${
          isHwBlacklisted
            ? 'bg-rose-950 text-rose-100 border-rose-800'
            : isBanned
            ? 'bg-amber-950 text-amber-100 border-amber-800'
            : 'bg-emerald-50 text-emerald-900 border-emerald-200'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-7 h-7 rounded-[1px] flex items-center justify-center shrink-0 ${
              isHwBlacklisted
                ? 'bg-rose-800 text-rose-200'
                : isBanned
                ? 'bg-amber-800 text-amber-200'
                : 'bg-emerald-600 text-white'
            }`}
          >
            {isHwBlacklisted ? (
              <ShieldBan className="w-4 h-4" />
            ) : isBanned ? (
              <ShieldAlert className="w-4 h-4" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wide whitespace-nowrap">
                {isHwBlacklisted
                  ? '【全指纹黑名单】物理特征级高危封杀'
                  : isBanned
                  ? '【账号已封停】禁止下单与免密登录'
                  : '【状态正常】信誉良好 · 免密认证放行'}
              </span>
              <span
                className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-[1px] border whitespace-nowrap ${
                  isHwBlacklisted
                    ? 'bg-rose-900 border-rose-700 text-rose-200'
                    : isBanned
                    ? 'bg-amber-900 border-amber-700 text-amber-200'
                    : 'bg-emerald-100 border-emerald-300 text-emerald-800'
                }`}
              >
                {user.status || 'normal'}
              </span>
            </div>
            <span className="text-[11px] opacity-80 block truncate font-mono mt-0.5">
              {user.violationRecord?.reason
                ? `处置原因: ${user.violationRecord.reason} · 处置时间: ${
                    user.violationRecord.bannedAt || '近期'
                  }`
                : '该食客档案尚未被标记任何风控违规行为，各项权限均正常使用。'}
            </span>
          </div>
        </div>

        {!isNormal && (
          <button
            type="button"
            onClick={handleUnban}
            className="px-2.5 py-1 bg-white text-neutral-900 hover:bg-neutral-100 rounded-[1px] text-xs font-bold shrink-0 flex items-center gap-1 cursor-pointer whitespace-nowrap shadow-xs"
          >
            <Unlock className="w-3.5 h-3.5 text-emerald-600" />
            <span>立即解封复原</span>
          </button>
        )}
      </div>

      {/* 违规处置操作区 (1px 微圆角) */}
      <div className="p-3 bg-white rounded-[1px] border border-neutral-200 space-y-3 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span className="text-xs font-bold text-neutral-900 whitespace-nowrap">
              用户违规风控处置中枢 (封号 / 全指纹黑名单)
            </span>
          </div>
          <span className="text-[10px] text-neutral-400 font-mono whitespace-nowrap">
            风控联动免密网关
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div>
            <label className="text-[10px] text-neutral-500 font-bold block mb-1 whitespace-nowrap">
              常见违规原因预设
            </label>
            <select
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              className="w-full h-8 px-2 bg-neutral-50 rounded-[1px] border border-neutral-300 text-xs font-medium focus:outline-none whitespace-nowrap"
            >
              <option value="恶意高频撞库 / 疑似黑产欺诈">恶意高频撞库 / 疑似黑产欺诈</option>
              <option value="多次虚假下单拒付 / 破坏餐车运营秩序">多次虚假下单拒付 / 破坏餐车运营秩序</option>
              <option value="伪造 GPS 坐标恶意套取首单新人礼">伪造 GPS 坐标恶意套取首单新人礼</option>
              <option value="违规刷单套现 / 非法洗积分">违规刷单套现 / 非法洗积分</option>
              <option value="辱骂骑手/商家员工，违反用户服务协议">辱骂骑手/商家员工，违反用户服务协议</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-neutral-500 font-bold block mb-1 whitespace-nowrap">
              自定义说明 (选填)
            </label>
            <input
              type="text"
              placeholder="可输入具体处罚补充说明..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              className="w-full h-8 px-2.5 bg-neutral-50 rounded-[1px] border border-neutral-300 text-xs focus:outline-none whitespace-nowrap"
            />
          </div>
        </div>

        {/* 违规处罚动作按钮组 (1px 微圆角) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <div className="p-2.5 bg-amber-50/70 rounded-[1px] border border-amber-200 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-xs font-bold text-amber-900 block truncate whitespace-nowrap">
                账号级封号 (Ban Account)
              </span>
              <span className="text-[10px] text-amber-700 block truncate whitespace-nowrap">
                阻断该 UID 的下单、卡券与账户结算
              </span>
            </div>
            <button
              type="button"
              onClick={handleBanAccount}
              disabled={isBanned}
              className={`px-3 py-1.5 rounded-[1px] text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 ${
                isBanned
                  ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                  : 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
              }`}
            >
              <UserX className="w-3.5 h-3.5" />
              <span>{isBanned ? '已封号' : '立即封号'}</span>
            </button>
          </div>

          <div className="p-2.5 bg-rose-50/70 rounded-[1px] border border-rose-200 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-xs font-bold text-rose-900 block truncate whitespace-nowrap">
                全指纹黑名单 (Hardware Blacklist)
              </span>
              <span className="text-[10px] text-rose-700 block truncate whitespace-nowrap">
                拦截所有硬件特征码、声卡与互联设备
              </span>
            </div>
            <button
              type="button"
              onClick={handleBlacklistHardware}
              disabled={isHwBlacklisted}
              className={`px-3 py-1.5 rounded-[1px] text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 ${
                isHwBlacklisted
                  ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                  : 'bg-rose-700 hover:bg-rose-800 text-white shadow-xs'
              }`}
            >
              <ShieldBan className="w-3.5 h-3.5" />
              <span>{isHwBlacklisted ? '已拉黑' : '全指纹拉黑'}</span>
            </button>
          </div>
        </div>

        {/* 已采集待拦截的硬件特征列表 */}
        <div className="p-2.5 bg-neutral-50 rounded-[1px] border border-neutral-200 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-neutral-700 flex items-center gap-1 whitespace-nowrap">
              <Fingerprint className="w-3.5 h-3.5 text-neutral-600" />
              <span>该食客关联的硬件拦截特征池 ({collectedFingerprints.length} 项)</span>
            </span>
            <span className="text-[10px] text-neutral-400 font-mono">
              全指纹拉黑时将同时全量封堵
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] font-mono">
            {collectedFingerprints.map((fp, i) => (
              <div
                key={i}
                className="px-2 py-1 bg-white rounded-[1px] border border-neutral-200 flex items-center justify-between gap-2"
              >
                <span className="text-neutral-500 truncate whitespace-nowrap">{fp.type}</span>
                <span className="font-bold text-neutral-900 truncate whitespace-nowrap">
                  {fp.val}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 修改积分以及资产面板 (1px 微圆角) */}
      <div className="p-3 bg-white rounded-[1px] border border-neutral-200 space-y-3 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
          <div className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs font-bold text-neutral-900 whitespace-nowrap">
              修改食客资产与积分 (直接修改 / 精确校准)
            </span>
          </div>
          <span className="text-[10px] text-neutral-400 font-mono whitespace-nowrap">
            实时写入账户与钱包明细
          </span>
        </div>

        {/* 当前资产数值看板 */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 bg-neutral-50 rounded-[1px] border border-neutral-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-neutral-500 font-bold block whitespace-nowrap">
                当前储值余额
              </span>
              <span className="text-base font-mono font-black text-neutral-900 whitespace-nowrap">
                ¥{user.balance.toFixed(2)}
              </span>
            </div>
            <CreditCard className="w-5 h-5 text-neutral-400" />
          </div>

          <div className="p-2 bg-neutral-50 rounded-[1px] border border-neutral-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-neutral-500 font-bold block whitespace-nowrap">
                当前积分结存
              </span>
              <span className="text-base font-mono font-black text-amber-600 whitespace-nowrap">
                {user.points.toLocaleString()}
              </span>
            </div>
            <Coins className="w-5 h-5 text-amber-500" />
          </div>
        </div>

        {/* 直接设定表单 */}
        <form onSubmit={handleSaveDirectAssets} className="space-y-2.5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-neutral-600 font-bold block mb-1 whitespace-nowrap">
                设定新储值余额 (¥)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={editBalance}
                onChange={(e) => setEditBalance(e.target.value)}
                className="w-full h-8 px-2.5 bg-neutral-50 rounded-[1px] border border-neutral-300 font-mono font-bold text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900 whitespace-nowrap"
                required
              />
            </div>

            <div>
              <label className="text-[10px] text-neutral-600 font-bold block mb-1 whitespace-nowrap">
                设定新积分数值 (Points)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={editPoints}
                onChange={(e) => setEditPoints(e.target.value)}
                className="w-full h-8 px-2.5 bg-neutral-50 rounded-[1px] border border-neutral-300 font-mono font-bold text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900 whitespace-nowrap"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-neutral-600 font-bold block mb-1 whitespace-nowrap">
              修改备注 (将记录在钱包对账流水中)
            </label>
            <input
              type="text"
              value={assetReason}
              onChange={(e) => setAssetReason(e.target.value)}
              placeholder="如: 客诉补偿 / 风控调账 / 异常回滚"
              className="w-full h-8 px-2.5 bg-neutral-50 rounded-[1px] border border-neutral-300 text-xs focus:outline-none whitespace-nowrap"
              required
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            {/* 快捷增减按钮 */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-neutral-400 font-bold whitespace-nowrap hidden sm:inline">
                快捷增减:
              </span>
              <button
                type="button"
                onClick={() => handleQuickAdjust(50)}
                className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-[1px] text-[10px] font-mono font-bold cursor-pointer whitespace-nowrap"
              >
                +50
              </button>
              <button
                type="button"
                onClick={() => handleQuickAdjust(-50)}
                className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-[1px] text-[10px] font-mono font-bold cursor-pointer whitespace-nowrap"
              >
                -50
              </button>
              <button
                type="button"
                onClick={() => handleQuickAdjust(100)}
                className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-[1px] text-[10px] font-mono font-bold cursor-pointer whitespace-nowrap"
              >
                +100
              </button>
            </div>

            <button
              type="submit"
              className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-[1px] text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>保存资产与积分</span>
            </button>
          </div>
        </form>
      </div>

      {/* 处罚历史审计记录 (1px 微圆角) */}
      <div className="p-3 bg-white rounded-[1px] border border-neutral-200 space-y-2 shadow-xs">
        <div className="flex items-center justify-between pb-1.5 border-b border-neutral-100">
          <div className="flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-neutral-600" />
            <span className="text-xs font-bold text-neutral-900 whitespace-nowrap">
              处置审计操作流水 (Audit Trail)
            </span>
          </div>
          <span className="text-[10px] text-neutral-400 font-mono">不可篡改</span>
        </div>

        {user.violationRecord?.history && user.violationRecord.history.length > 0 ? (
          <div className="divide-y divide-neutral-100 max-h-36 overflow-y-auto">
            {user.violationRecord.history.map((log) => (
              <div key={log.id} className="py-1.5 flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-[1px] border whitespace-nowrap ${
                        log.action === 'blacklist_hw'
                          ? 'bg-rose-100 text-rose-800 border-rose-200'
                          : log.action === 'ban'
                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      {log.action === 'blacklist_hw'
                        ? '全指纹黑名单'
                        : log.action === 'ban'
                        ? '账号封停'
                        : '解除封禁'}
                    </span>
                    <span className="text-neutral-800 truncate text-[11px] font-medium whitespace-nowrap">
                      {log.reason}
                    </span>
                  </div>
                </div>
                <div className="text-right text-[10px] text-neutral-400 font-mono whitespace-nowrap shrink-0">
                  <span>{log.operator}</span> · <span>{log.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-3 text-center text-[11px] text-neutral-400 font-mono">
            暂无违规处罚历史记录
          </div>
        )}
      </div>
    </div>
  );
};
