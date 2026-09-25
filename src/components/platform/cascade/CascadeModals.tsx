import React, { useState } from 'react';
import {
  ShieldCheck,
  Building2,
  Truck,
  Users,
  Radio,
  Key,
  Smartphone,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Copy,
  Download,
  Terminal,
  Clock,
  Search,
  Lock,
  X,
  FileText,
  Zap,
  Sliders
} from 'lucide-react';
import {
  CascadePermissionItem,
  CascadeAuditLog,
  CURRENT_AUDITOR,
  generateTemplateDistributionPayload
} from '../../../utils/cascadeMeshEngine';

// ================= 1. L1 根中枢证书与拓扑模态框 =================
interface L1RootCertModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string, desc?: string) => void;
}

export const L1RootCertModal: React.FC<L1RootCertModalProps> = ({ isOpen, onClose, showToast }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl max-w-xl w-full border border-[#e4e4df] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-5 py-4 border-b border-[#e4e4df] flex items-center justify-between bg-[#fafaf9]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1a1a17] text-white flex items-center justify-center font-black">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1a1a17]">L1 组织总部根中枢证书与 MESH 拓扑</h3>
              <p className="text-[11px] text-[#787774]">NODE-ROOT-001 · 华东总控主干节点</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#787774] hover:text-[#1a1a17] hover:bg-[#f0f0ed] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto text-xs text-[#37352f]">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-[#f7f6f3] border border-[#e3e2de]">
              <span className="text-[10px] text-[#787774] block">根证书类型</span>
              <span className="font-mono font-bold text-[#1a1a17]">SM2/SM3 国密根 CA</span>
            </div>
            <div className="p-3 rounded-lg bg-[#f7f6f3] border border-[#e3e2de]">
              <span className="text-[10px] text-[#787774] block">拓扑通信频度</span>
              <span className="font-mono font-bold text-emerald-700">10Hz 毫秒级心跳</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#1a1a17] text-white font-mono text-[11px] space-y-1.5">
            <div className="text-[#a0a09a] text-[10px]">ROOT CA PUBLIC KEY HASH:</div>
            <div className="text-emerald-400 break-all">
              04A92B71EC3908841FDC7B342A99E52C160DF3E98045F3112E8B90D80E2B45A19
            </div>
            <div className="text-[#a0a09a] text-[10px] pt-1">ACTIVE CLUSTER NODES:</div>
            <div className="text-neutral-300">
              [SH-NODE-01: ONLINE] [SH-NODE-02: ACTIVE] [EDGE-MESH-90: SYNCED]
            </div>
          </div>

          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] leading-relaxed">
            <strong>根权威校验状态：</strong>华东总控节点已通过中国信息安全测评中心可信认证，全网所有流动餐车与手持单兵终端的每一笔动态权限均以此根证书为信任源。
          </div>
        </div>

        <div className="px-5 py-3 border-t border-[#e4e4df] bg-[#fafaf9] flex items-center justify-between">
          <button
            onClick={() => {
              showToast('证书存证已导出', 'SM2 根中枢证书指纹已保存至本地');
              onClose();
            }}
            className="px-3 py-1.5 rounded-lg border border-[#d2d2cd] text-xs font-medium text-[#37352f] hover:bg-white flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            导出证书指纹
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#1a1a17] text-white text-xs font-bold hover:bg-black cursor-pointer"
          >
            完成查看
          </button>
        </div>
      </div>
    </div>
  );
};

// ================= 2. L3 移动餐车智能调度控制台模态框 =================
interface TruckDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  truckName: string;
  queueCount: number;
  tempCelsius: number;
  onActivateOverflow: () => void;
  showToast: (msg: string, desc?: string) => void;
}

export const TruckDispatchModal: React.FC<TruckDispatchModalProps> = ({
  isOpen,
  onClose,
  truckName,
  queueCount,
  tempCelsius,
  onActivateOverflow,
  showToast
}) => {
  const [targetTemp, setTargetTemp] = useState<number>(tempCelsius);
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl max-w-lg w-full border border-[#e4e4df] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-5 py-4 border-b border-[#e4e4df] flex items-center justify-between bg-[#fafaf9]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center font-black">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1a1a17]">{truckName} 智能调度与干预</h3>
              <p className="text-[11px] text-[#787774]">站点负载分流与硬件遥测中心</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#787774] hover:text-[#1a1a17] hover:bg-[#f0f0ed] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto text-xs text-[#37352f]">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
              <span className="text-[10px] text-orange-800 font-bold block">当前排队待制餐</span>
              <span className="text-lg font-black text-orange-700 font-mono">{queueCount} 笔</span>
              <span className="text-[9.5px] text-orange-600 block mt-0.5">超过 10 笔阈值 · 超载中</span>
            </div>
            <div className="p-3 rounded-lg bg-[#f7f6f3] border border-[#e3e2de]">
              <span className="text-[10px] text-[#787774] block">保温箱实时温控</span>
              <span className="text-lg font-black text-[#1a1a17] font-mono">{targetTemp.toFixed(1)} °C</span>
              <span className="text-[9.5px] text-emerald-600 block mt-0.5">标准区间 (65°C - 75°C)</span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#fafaf9] border border-[#e4e4df] space-y-2">
            <h4 className="font-bold text-[11px] text-[#1a1a17] flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              协同分流方案推荐
            </h4>
            <p className="text-[11px] text-[#787774] leading-relaxed">
              邻近 <strong>04号流动餐车</strong> 当前仅 4 笔排队，距离本车 420 米。启动一键溢出分流后，系统将自动点亮专送单兵的「跨车超载溢出抢单权」，实现均衡出餐与订单自动拆账。
            </p>
            <button
              onClick={() => {
                onActivateOverflow();
                showToast('已激活跨车溢出分流', '相关抢单与调度权限已实时点亮并下发');
                onClose();
              }}
              className="w-full mt-2 py-2 px-3 rounded-lg bg-orange-600 text-white font-bold text-xs hover:bg-orange-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              立即启动 03车 ➔ 04车 跨车溢出抢单分流
            </button>
          </div>

          <div className="p-3 rounded-lg border border-[#e4e4df] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[11px]">温控巡检阈值调节</span>
              <span className="font-mono text-[11px] font-bold text-amber-700">{targetTemp.toFixed(1)}°C</span>
            </div>
            <input
              type="range"
              min="60"
              max="80"
              step="0.5"
              value={targetTemp}
              onChange={(e) => setTargetTemp(parseFloat(e.target.value))}
              className="w-full accent-[#1a1a17] cursor-pointer"
            />
          </div>

          <button
            onClick={() => {
              setIsBroadcasting(true);
              setTimeout(() => {
                setIsBroadcasting(false);
                showToast('催单广播已送达', '已向 03号流动餐车车机发送优先出餐加急指令');
              }, 600);
            }}
            disabled={isBroadcasting}
            className="w-full py-2 px-3 rounded-lg border border-[#d2d2cd] text-xs font-medium text-[#37352f] hover:bg-[#f0f0ed] transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Radio className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
            {isBroadcasting ? '广播发送中...' : '向车机下发加急出餐督促广播'}
          </button>
        </div>

        <div className="px-5 py-3 border-t border-[#e4e4df] bg-[#fafaf9] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#1a1a17] text-white text-xs font-bold hover:bg-black cursor-pointer"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};

// ================= 3. L4 基层单兵全息档案模态框 =================
interface RiderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string, desc?: string) => void;
}

export const RiderDetailModal: React.FC<RiderDetailModalProps> = ({ isOpen, onClose, showToast }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl max-w-lg w-full border border-[#e4e4df] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-5 py-4 border-b border-[#e4e4df] flex items-center justify-between bg-[#fafaf9]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1a1a17]">周凯 (专送骑手) 全息状态档案</h3>
              <p className="text-[11px] text-[#787774]">UID: USR-RIDER-SHW-082 · 苏河湾专线单兵</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#787774] hover:text-[#1a1a17] hover:bg-[#f0f0ed] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3.5 overflow-y-auto text-xs text-[#37352f]">
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-2.5 rounded-lg bg-[#f7f6f3] border border-[#e3e2de] text-center">
              <span className="text-[10px] text-[#787774] block">今日完成单量</span>
              <span className="text-base font-black text-[#1a1a17] font-mono">18 单</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#f7f6f3] border border-[#e3e2de] text-center">
              <span className="text-[10px] text-[#787774] block">时效准时履约率</span>
              <span className="text-base font-black text-emerald-700 font-mono">99.4%</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#f7f6f3] border border-[#e3e2de] text-center">
              <span className="text-[10px] text-[#787774] block">手持终端电量</span>
              <span className="text-base font-black text-[#1a1a17] font-mono">89% (良好)</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#fafaf9] border border-[#e4e4df] space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-[#787774]">手持设备编号:</span>
              <span className="font-bold text-[#1a1a17]">PDA-9018 (Android 14)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#787774]">蜂窝基站定位:</span>
              <span className="text-neutral-800">121.4783°E, 31.2410°N</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#787774]">当前动态 MESH Token:</span>
              <span className="text-emerald-700 font-bold">TKN-9a8f-28c0-449e</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#787774]">班次有效时限:</span>
              <span className="text-neutral-800">当日 08:00 - 23:30</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-[11px] leading-relaxed">
            <strong>合规评级：</strong>当前该骑手具备「五星金牌专送」徽章，已连续 120 天无重大超时违规与顾客投诉，符合申请跨车溢出抢单与小额退款快捷免审资格。
          </div>
        </div>

        <div className="px-5 py-3 border-t border-[#e4e4df] bg-[#fafaf9] flex items-center justify-between">
          <button
            onClick={() => {
              showToast('心跳同步成功', '已向周凯手持终端强制唤醒并刷新 GPS 轨迹');
            }}
            className="px-3 py-1.5 rounded-lg border border-[#d2d2cd] text-xs font-medium text-[#37352f] hover:bg-white flex items-center gap-1.5 cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5" />
            Ping 骑手设备
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#1a1a17] text-white text-xs font-bold hover:bg-black cursor-pointer"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
};

// ================= 4. L5 国密 SM4 验签终端模态框 =================
interface SM4VerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string, desc?: string) => void;
}

export const SM4VerifyModal: React.FC<SM4VerifyModalProps> = ({ isOpen, onClose, showToast }) => {
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifiedTime, setVerifiedTime] = useState<string>('2026-03-29 14:02:18');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl max-w-lg w-full border border-[#e4e4df] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-5 py-4 border-b border-[#e4e4df] flex items-center justify-between bg-[#fafaf9]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1a1a17] text-white flex items-center justify-center font-black">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1a1a17]">L5 独立审计席数字凭证与 SM4 验签终端</h3>
              <p className="text-[11px] text-[#787774]">审计席: 方敏慧 (UID: AUD-99201)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#787774] hover:text-[#1a1a17] hover:bg-[#f0f0ed] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3.5 overflow-y-auto text-xs text-[#37352f]">
          <div className="p-3 rounded-lg bg-[#1a1a17] text-white font-mono text-[11px] space-y-1.5">
            <div className="flex justify-between text-[#a0a09a] text-[10px]">
              <span>SM4 CIPHER SUITE:</span>
              <span className="text-emerald-400">SM4-CBC / PKCS7</span>
            </div>
            <div className="text-neutral-300">
              SIGN_KEY: 0x9218F4...C044 [HARDWARE SEED]
            </div>
            <div className="text-neutral-300">
              LAST VERIFIED: <span className="text-emerald-300 font-bold">{verifiedTime}</span>
            </div>
            <div className="text-neutral-300">
              REPLAY DEFENSE: <span className="text-emerald-400">PASSED (NONCE VALID)</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] leading-relaxed">
            <strong>国密数字双签效力：</strong>根据《网络安全法》与《电子签名法》，本平台下发的全部 L1-L4 权限矩阵配置在入库生效前均需 L5 独立审计席完成 SM4 国密验签，具备完全不可篡改司法采信效力。
          </div>

          <button
            onClick={() => {
              setIsVerifying(true);
              setTimeout(() => {
                setIsVerifying(false);
                const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
                setVerifiedTime(nowStr);
                showToast('国密摘要验签通过', `SM4 算法实时复核成功，时间戳防重放校验通过`);
              }, 700);
            }}
            disabled={isVerifying}
            className="w-full py-2.5 px-3 rounded-lg bg-[#1a1a17] text-white font-bold text-xs hover:bg-black transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            {isVerifying ? '正在执行国密 SM4 密码机哈希运算...' : '重新执行国密 SM4 验签'}
          </button>
        </div>

        <div className="px-5 py-3 border-t border-[#e4e4df] bg-[#fafaf9] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-[#d2d2cd] text-xs font-bold text-[#1a1a17] hover:bg-white cursor-pointer"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

// ================= 5. 全部门基线同步模态框 =================
interface DepartmentSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSync: () => void;
}

export const DepartmentSyncModal: React.FC<DepartmentSyncModalProps> = ({
  isOpen,
  onClose,
  onConfirmSync
}) => {
  const [syncing, setSyncing] = useState<boolean>(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl max-w-lg w-full border border-[#e4e4df] shadow-2xl overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-[#e4e4df] flex items-center justify-between bg-[#fafaf9]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1a1a17]">全部门基线同步广播</h3>
              <p className="text-[11px] text-[#787774]">苏河湾金融商圈 · 统一岗位基线准入</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#787774] hover:text-[#1a1a17] hover:bg-[#f0f0ed] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3 text-xs text-[#37352f]">
          <p className="leading-relaxed">
            此操作将把当前经过审批核准的岗位基准配置，全域广播同步至<strong>苏河湾战区</strong>下辖的全部骑手单兵设备：
          </p>
          <div className="p-3 rounded-lg bg-[#f7f6f3] border border-[#e3e2de] space-y-1.5 font-mono text-[11px]">
            <div className="text-[#1a1a17] font-bold">目标同步单兵 (4 名):</div>
            <div className="text-[#787774] pl-2">• 周凯 (R-SHW-082) [当前选中]</div>
            <div className="text-[#787774] pl-2">• 李想 (R-SHW-083)</div>
            <div className="text-[#787774] pl-2">• 王涛 (R-SHW-084)</div>
            <div className="text-[#787774] pl-2">• 陈晨 (R-SHW-085)</div>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
            <strong>注意：</strong>执行后各单兵终端的本地权限缓存将在下一次 10Hz 心跳脉冲中强制重刷生效。
          </div>
        </div>

        <div className="px-5 py-3 border-t border-[#e4e4df] bg-[#fafaf9] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-[#d2d2cd] text-xs font-medium text-[#37352f] hover:bg-white cursor-pointer"
          >
            取消
          </button>
          <button
            onClick={() => {
              setSyncing(true);
              setTimeout(() => {
                setSyncing(false);
                onConfirmSync();
                onClose();
              }, 800);
            }}
            disabled={syncing}
            className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 cursor-pointer disabled:opacity-50"
          >
            {syncing ? '广播下发中...' : '确认全域同步下发'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ================= 6. 权限模板分发模态框 =================
interface TemplateDistributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string, desc?: string) => void;
}

export const TemplateDistributionModal: React.FC<TemplateDistributionModalProps> = ({
  isOpen,
  onClose,
  showToast
}) => {
  const [templateType, setTemplateType] = useState<string>('gold_rider');
  const [copied, setCopied] = useState<boolean>(false);
  const [broadcasting, setBroadcasting] = useState<boolean>(false);

  if (!isOpen) return null;

  const payloadData = generateTemplateDistributionPayload(templateType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl max-w-xl w-full border border-[#e4e4df] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-5 py-4 border-b border-[#e4e4df] flex items-center justify-between bg-[#fafaf9]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1a1a17] text-white flex items-center justify-center font-black">
              <FileText className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1a1a17]">分发当前权限模板</h3>
              <p className="text-[11px] text-[#787774]">跨商圈标准化 MESH 配置模板下发</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#787774] hover:text-[#1a1a17] hover:bg-[#f0f0ed] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3.5 overflow-y-auto text-xs text-[#37352f]">
          <div className="space-y-1.5">
            <label className="font-bold text-[11px]">选择模板预设类型：</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'gold_rider', name: '金牌专送模板' },
                { id: 'peak_rush', name: '高峰应急分流模板' },
                { id: 'baseline', name: '新骑手入职基准' }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTemplateType(t.id)}
                  className={`p-2 rounded-lg text-center font-bold text-xs border transition-all cursor-pointer ${
                    templateType === t.id
                      ? 'bg-[#1a1a17] text-white border-[#1a1a17]'
                      : 'bg-[#f7f6f3] border-[#e3e2de] text-[#787774] hover:text-[#1a1a17]'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 rounded-lg bg-[#f7f6f3] border border-[#e3e2de]">
              <span className="text-[#787774] block text-[10px]">模板签名 Token</span>
              <span className="font-mono font-bold text-[#1a1a17]">{payloadData.signatureToken}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#f7f6f3] border border-[#e3e2de]">
              <span className="text-[#787774] block text-[10px]">下发有效期</span>
              <span className="font-mono font-bold text-emerald-700">{payloadData.validPeriod}</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-[#1a1a17]">模板加密数据载荷预览 (JSON):</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(payloadData.jsonPayload);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                {copied ? '已复制' : '复制 JSON'}
              </button>
            </div>
            <pre className="p-3 rounded-lg bg-[#1a1a17] text-neutral-300 font-mono text-[10px] overflow-x-auto max-h-36">
              {payloadData.jsonPayload}
            </pre>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-[#e4e4df] bg-[#fafaf9] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-[#d2d2cd] text-xs font-medium text-[#37352f] hover:bg-white cursor-pointer"
          >
            取消
          </button>
          <button
            onClick={() => {
              setBroadcasting(true);
              setTimeout(() => {
                setBroadcasting(false);
                showToast('模板下发广播已成功', `模板 ${payloadData.templateCode} 已下发至辖区单兵`);
                onClose();
              }, 800);
            }}
            disabled={broadcasting}
            className="px-4 py-1.5 rounded-lg bg-[#1a1a17] text-white text-xs font-bold hover:bg-black cursor-pointer disabled:opacity-50"
          >
            {broadcasting ? '下发广播中...' : '立即广播下发模板'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ================= 7. 特权提权申请模态框 =================
interface ElevatedPrivilegeModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetItem: CascadePermissionItem | null;
  onConfirmElevate: (duration: number, reason: string) => void;
}

export const ElevatedPrivilegeModal: React.FC<ElevatedPrivilegeModalProps> = ({
  isOpen,
  onClose,
  targetItem,
  onConfirmElevate
}) => {
  const [duration, setDuration] = useState<number>(30);
  const [reason, setReason] = useState<string>('现场突发重大舆情应急处置需要');

  if (!isOpen || !targetItem) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl max-w-lg w-full border border-[#e4e4df] shadow-2xl overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-[#e4e4df] flex items-center justify-between bg-[#fafaf9]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center font-black">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1a1a17]">申请特权提权或临时豁免</h3>
              <p className="text-[11px] text-[#787774]">{targetItem.name} ({targetItem.code})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#787774] hover:text-[#1a1a17] hover:bg-[#f0f0ed] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3.5 text-xs text-[#37352f]">
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-[11px] space-y-1">
            <span className="font-bold block">锁定受控级别: {targetItem.levelLabel}</span>
            <span>{targetItem.lockReason || '该权限属于高危特权，受系统硬策略锁定保护。'}</span>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-[11px]">临时放行有效时长：</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { min: 30, label: '30 分钟' },
                { min: 120, label: '2 小时' },
                { min: 480, label: '当班有效 (8h)' }
              ].map((opt) => (
                <button
                  key={opt.min}
                  onClick={() => setDuration(opt.min)}
                  className={`p-2 rounded-lg text-center font-bold text-xs border cursor-pointer ${
                    duration === opt.min
                      ? 'bg-[#1a1a17] text-white border-[#1a1a17]'
                      : 'bg-[#f7f6f3] border-[#e3e2de] text-[#787774] hover:text-[#1a1a17]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-[11px]">提权理由 / 签批事由：</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#e4e4df] text-xs focus:outline-hidden focus:border-[#1a1a17]"
              placeholder="请输入提权事由"
            />
          </div>
        </div>

        <div className="px-5 py-3 border-t border-[#e4e4df] bg-[#fafaf9] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-[#d2d2cd] text-xs font-medium text-[#37352f] hover:bg-white cursor-pointer"
          >
            取消
          </button>
          <button
            onClick={() => {
              onConfirmElevate(duration, reason);
              onClose();
            }}
            className="px-4 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 cursor-pointer"
          >
            以 L5 审计席身份特权放行
          </button>
        </div>
      </div>
    </div>
  );
};

// ================= 8. 工单全景流转拓扑模态框 =================
interface WorkOrderTraceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkOrderTraceModal: React.FC<WorkOrderTraceModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl max-w-xl w-full border border-[#e4e4df] shadow-2xl overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-[#e4e4df] flex items-center justify-between bg-[#fafaf9]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center font-black">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1a1a17]">工单 #AUTH-9902 全域流转与分流全景</h3>
              <p className="text-[11px] text-[#787774]">03号流动餐车 ➔ 04号流动餐车 跨车溢出链</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#787774] hover:text-[#1a1a17] hover:bg-[#f0f0ed] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs text-[#37352f]">
          <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-[#f7f6f3] border border-[#e3e2de]">
            <div className="text-center flex-1">
              <span className="text-[10px] text-orange-700 font-bold block">源头：03号餐车</span>
              <span className="font-mono text-xs font-black">14 单排队超载</span>
            </div>
            <ArrowRight className="w-4 h-4 text-[#787774] shrink-0" />
            <div className="text-center flex-1">
              <span className="text-[10px] text-blue-700 font-bold block">触发阈值</span>
              <span className="font-mono text-xs font-black">超载自动分流</span>
            </div>
            <ArrowRight className="w-4 h-4 text-[#787774] shrink-0" />
            <div className="text-center flex-1">
              <span className="text-[10px] text-emerald-700 font-bold block">目标：04号餐车</span>
              <span className="font-mono text-xs font-black">4 单空闲可承接</span>
            </div>
          </div>

          <div className="space-y-2 text-[11px]">
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</div>
              <div>
                <strong>单兵周凯发起协同申请：</strong>
                <p className="text-[#787774]">申请开放跨车超载溢出抢单权与跨区调度权，直接承接 04号车就近订单。</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</div>
              <div>
                <strong>时效收益测算：</strong>
                <p className="text-[#787774]">跨车协同预计将顾客等待时长从 38.5 分钟缩短至 14.2 分钟，降低超时违约金损失。</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</div>
              <div>
                <strong>L5 审计席 SM4 验签：</strong>
                <p className="text-[#787774]">签批放行后立即生成审计哈希链，保证分账拆账清晰无误。</p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-[#e4e4df] bg-[#fafaf9] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#1a1a17] text-white text-xs font-bold hover:bg-black cursor-pointer"
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  );
};

// ================= 9. 90天审计日志模态框 (增强检索与导出) =================
interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditLogs: CascadeAuditLog[];
  showToast: (msg: string, desc?: string) => void;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({
  isOpen,
  onClose,
  auditLogs,
  showToast
}) => {
  const [search, setSearch] = useState<string>('');
  const [filterAction, setFilterAction] = useState<string>('all');

  if (!isOpen) return null;

  const filteredLogs = auditLogs.filter((log) => {
    if (filterAction !== 'all') {
      if (filterAction === 'approve' && !log.action.includes('核准') && !log.action.includes('放权') && !log.action.includes('提权')) return false;
      if (filterAction === 'reject' && !log.action.includes('驳回')) return false;
      if (filterAction === 'sync' && !log.action.includes('同步') && !log.action.includes('基准')) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        log.operator.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.targetSubject.toLowerCase().includes(q) ||
        log.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const exportCSV = () => {
    const header = 'ID,时间戳,操作席位,指令动作,穿透标的,区块链验签哈希\n';
    const rows = filteredLogs
      .map(
        (l) =>
          `"${l.id}","${l.timestamp}","${l.operator}","${l.action}","${l.targetSubject}","${l.meshHash}"`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cascade_mesh_audit_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('审计存证报告已导出', '已保存 90 天司法级区块链存证 CSV');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl max-w-3xl w-full border border-[#e4e4df] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-5 py-4 border-b border-[#e4e4df] flex items-center justify-between bg-[#fafaf9]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1a1a17] text-white flex items-center justify-center font-black">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1a1a17]">
                权限变更全量审计追踪 (90 天存证)
              </h3>
              <p className="text-[11px] text-[#787774]">
                SM4 国密验签 · 法律效力存证 · 共 {auditLogs.length} 条有效存证记录
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#787774] hover:text-[#1a1a17] hover:bg-[#f0f0ed] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search and Action Filter */}
        <div className="p-3.5 border-b border-[#e4e4df] bg-white flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-[#787774] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜索操作人、动作或单兵编号..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#e4e4df] bg-[#f7f6f3] focus:bg-white focus:outline-hidden focus:border-[#1a1a17]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-1">
              {[
                { id: 'all', label: '全部' },
                { id: 'approve', label: '签批/放权' },
                { id: 'reject', label: '驳回' },
                { id: 'sync', label: '基线同步' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterAction(tab.id)}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                    filterAction === tab.id
                      ? 'bg-[#1a1a17] text-white'
                      : 'bg-[#f7f6f3] text-[#787774] hover:text-[#1a1a17]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              onClick={exportCSV}
              className="px-2.5 py-1 rounded text-xs font-bold bg-[#f7f6f3] border border-[#d2d2cd] text-[#37352f] hover:bg-white flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              导出存证
            </button>
          </div>
        </div>

        <div className="p-4 space-y-2.5 overflow-y-auto flex-1 text-xs">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-[#787774]">无匹配的审计存证记录</div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-lg border border-[#e4e4df] bg-[#fafaf9] hover:bg-white transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-[#1a1a17] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    {log.id} · {log.operator}
                  </span>
                  <span className="text-[10px] text-[#787774] font-mono">{log.timestamp}</span>
                </div>
                <div className="text-[12px] font-medium text-[#201f1d]">{log.action}</div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] text-[#787774] pt-0.5 border-t border-[#f0f0ed] gap-1">
                  <span>穿透标的: {log.targetSubject}</span>
                  <span className="font-mono text-emerald-800 bg-emerald-50 px-1 rounded">
                    国密哈希: {log.meshHash}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-5 py-3 border-t border-[#e4e4df] bg-[#fafaf9] flex items-center justify-between">
          <span className="text-[11px] text-[#787774]">
            当前显示 {filteredLogs.length} / {auditLogs.length} 条存证记录
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#1a1a17] text-white text-xs font-bold hover:bg-black cursor-pointer"
          >
            完成查看
          </button>
        </div>
      </div>
    </div>
  );
};
