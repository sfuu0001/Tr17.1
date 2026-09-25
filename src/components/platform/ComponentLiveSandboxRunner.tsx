import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  SlidersHorizontal,
  Play,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  Radio,
  Share2,
  Flame,
  Truck,
  ArrowRightLeft,
  FileText,
  Download,
  ShieldCheck,
  ShieldAlert,
  Volume2,
  Mic,
  MapPin,
  Clock,
  Compass,
  FileCheck,
  RefreshCw,
  Coins,
  Send,
  Zap,
  Info,
  Check,
  Copy
} from 'lucide-react';
import {
  HeadquartersTier,
  HEADQUARTERS_ROLES,
  COMPONENT_FEATURE_CATALOG,
  ComponentFeatureDef,
  getComponentPermissions,
  submitDualApprovalRequest,
  getComponentExecutionLogs,
  appendComponentExecutionLog,
  ComponentExecutionLog
} from '../../utils/headquartersFlowEngine';
import { getAllTruckConfigs } from '../../utils/truckLocationEngine';
import { exportToCsv } from '../../utils/dataExportEngine';
import { fallbackToast } from '../../utils/fallbackToast';

interface ComponentLiveSandboxRunnerProps {
  currentTier: HeadquartersTier;
  showToast: (msg: string, desc?: string) => void;
  controlledFeatureId?: string;
  onSelectFeature?: (id: string) => void;
}

export const ComponentLiveSandboxRunner: React.FC<ComponentLiveSandboxRunnerProps> = ({
  currentTier,
  showToast,
  controlledFeatureId,
  onSelectFeature
}) => {
  const permissions = useMemo(() => getComponentPermissions(), []);
  const allTrucks = useMemo(() => getAllTruckConfigs(), []);

  // Currently selected component to test
  const [internalFeatureId, setInternalFeatureId] = useState<string>('COMP_CROSS_TRUCK_TRANSFER');
  const selectedFeatureId = controlledFeatureId || internalFeatureId;
  const setSelectedFeatureId = (id: string) => {
    setInternalFeatureId(id);
    onSelectFeature?.(id);
  };

  // Execution logs state
  const [execLogs, setExecLogs] = useState<ComponentExecutionLog[]>(getComponentExecutionLogs());

  // Reason input for elevation requests
  const [requestReason, setRequestReason] = useState<string>('');

  // 1. COMP_CROSS_TRUCK_TRANSFER states
  const [transferSourceTruck, setTransferSourceTruck] = useState<string>('truck_01');
  const [transferTargetTruck, setTransferTargetTruck] = useState<string>('truck_04');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>(['ORD-7701', 'ORD-7703']);

  // 2. COMP_INTERCOM_BROADCAST states
  const [broadcastChannel, setBroadcastChannel] = useState<string>('ALL_TRUCKS');
  const [broadcastMessage, setBroadcastMessage] = useState<string>('⚠️ 平台调度提示：午市出餐高峰期，请各餐车站长关注炭火扒炉温控，优先履约临近黑金会员单！');
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);

  // 3. COMP_GEOFENCE_OVERRIDE states
  const [geofenceTruck, setGeofenceTruck] = useState<string>('truck_02');
  const [geofenceCorridor, setGeofenceCorridor] = useState<string>('世纪大道金融街南广场临时展会通道');
  const [geofenceDurationHours, setGeofenceDurationHours] = useState<number>(4);
  const [issuedPass, setIssuedPass] = useState<{ id: string; truck: string; hash: string; expires: string } | null>(null);

  // 4. COMP_INVOICE_SETTLEMENT states
  const [invoiceBuyerType, setInvoiceBuyerType] = useState<'individual' | 'enterprise'>('enterprise');
  const [invoiceHeader, setInvoiceHeader] = useState<string>('上海创智天地信息科技有限公司');
  const [invoiceTaxCode, setInvoiceTaxCode] = useState<string>('91310110MA1FL9827B');
  const [invoiceAmount, setInvoiceAmount] = useState<number>(328.5);
  const [generatedInvoice, setGeneratedInvoice] = useState<{ code: string; time: string; qrValue: string } | null>(null);

  // 5. COMP_SURGE_PRICING states
  const [surgeMultiplier, setSurgeMultiplier] = useState<number>(1.35);
  const [weatherCondition, setWeatherCondition] = useState<string>('暴雨雷电预警');

  // 6. COMP_GLOBAL_COMMISSION states
  const [commissionRate, setCommissionRate] = useState<number>(6.5);
  const [riderBasePay, setRiderBasePay] = useState<number>(8.0);

  // 7. COMP_KILL_SWITCH states
  const [isKillSwitchArmed, setIsKillSwitchArmed] = useState<boolean>(false);

  // Find active feature definition
  const currentFeature = useMemo(
    () => COMPONENT_FEATURE_CATALOG.find((f) => f.id === selectedFeatureId) || COMPONENT_FEATURE_CATALOG[0],
    [selectedFeatureId]
  );

  // Check if current impersonation tier has authorization
  const isAuthorized = useMemo(() => {
    const allowed = permissions[currentFeature.id] || currentFeature.defaultAllowedTiers;
    return allowed.includes(currentTier);
  }, [permissions, currentFeature, currentTier]);

  // Handle submit elevation request
  const handleSubmitRequest = () => {
    if (!requestReason.trim()) {
      showToast('请输入申请提权或复核理由', '需向 L1 超管或 L2 战区总监说明业务背景');
      return;
    }
    const meta = HEADQUARTERS_ROLES[currentTier];
    const ticket = submitDualApprovalRequest(
      currentFeature.id,
      currentFeature.name,
      `【${meta.shortName}】申请临时启用组件【${currentFeature.name}】`,
      requestReason.trim(),
      currentTier,
      meta.name
    );
    showToast(`提权复核申请单 ${ticket.id} 已提交！`, '已进入双人复核审批流，待具备终审权限的 L1/L2 审核');
    setRequestReason('');
  };

  // 1. Action: Execute Cross-Truck Transfer
  const handleExecuteTransfer = () => {
    if (selectedOrderIds.length === 0) {
      showToast('请至少勾选一笔待调拨的餐车订单！');
      return;
    }
    const sTruck = allTrucks.find((t) => t.id === transferSourceTruck)?.name || transferSourceTruck;
    const tTruck = allTrucks.find((t) => t.id === transferTargetTruck)?.name || transferTargetTruck;
    const log = appendComponentExecutionLog({
      featureId: currentFeature.id,
      featureName: currentFeature.name,
      executedByTier: currentTier,
      operatorName: HEADQUARTERS_ROLES[currentTier].name,
      actionSummary: `从【${sTruck}】向【${tTruck}】转派 ${selectedOrderIds.length} 笔订单`,
      details: `订单列表: ${selectedOrderIds.join(', ')}; 协同网格距离: 1.1km; 预计缩短出餐等待: 12分钟`,
      status: 'success'
    });
    setExecLogs(getComponentExecutionLogs());
    showToast(`已成功将 ${selectedOrderIds.length} 笔订单跨车调拨至【${tTruck}】`, '餐车 KDS 制作屏与顾客端已实时无感同步变更');
  };

  // 2. Action: Execute Intercom Broadcast
  const handleExecuteBroadcast = () => {
    if (!broadcastMessage.trim()) return;
    setIsBroadcasting(true);
    const log = appendComponentExecutionLog({
      featureId: currentFeature.id,
      featureName: currentFeature.name,
      executedByTier: currentTier,
      operatorName: HEADQUARTERS_ROLES[currentTier].name,
      actionSummary: `下发专线强插广播至【${broadcastChannel}】: ${broadcastMessage.slice(0, 30)}...`,
      details: `信标发射频段: 868.5MHz; 目标载具数: 8辆餐车 + 16辆专线骑手; 确认回传率: 100%`,
      status: 'success'
    });
    setExecLogs(getComponentExecutionLogs());
    setTimeout(() => {
      setIsBroadcasting(false);
      showToast('车载对讲强插广播已发射完毕！', '全域车载音响已完成高精语音解码与时空信标校准');
    }, 1500);
  };

  // 3. Action: Issue Geofence Override Pass
  const handleIssueGeofencePass = () => {
    const tName = allTrucks.find((t) => t.id === geofenceTruck)?.name || geofenceTruck;
    const passCode = `PASS-${Math.floor(100000 + Math.random() * 900000)}`;
    const hash = `0x${Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    const expires = new Date(Date.now() + geofenceDurationHours * 3600 * 1000).toLocaleTimeString('zh-CN', { hour12: false });
    const newPass = { id: passCode, truck: tName, hash, expires };
    setIssuedPass(newPass);

    appendComponentExecutionLog({
      featureId: currentFeature.id,
      featureName: currentFeature.name,
      executedByTier: currentTier,
      operatorName: HEADQUARTERS_ROLES[currentTier].name,
      actionSummary: `向【${tName}】签发电子围栏临时越界通行特批令: ${passCode}`,
      details: `通行通道: ${geofenceCorridor}; 有效期至: ${expires} (${geofenceDurationHours}小时); 押金扣罚已豁免`,
      status: 'success'
    });
    setExecLogs(getComponentExecutionLogs());
    showToast(`电子通行令【${passCode}】签发成功！`, 'GPS 越界自动告警已临时挂起，允许合规跨区巡航');
  };

  // 4. Action: Generate Fiscal Invoice
  const handleGenerateInvoice = () => {
    const code = `INV-2026-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const time = new Date().toLocaleString('zh-CN', { hour12: false });
    const qrValue = `UR-FOODTRUCK-TAX-${code}-${invoiceAmount.toFixed(2)}`;
    setGeneratedInvoice({ code, time, qrValue });

    appendComponentExecutionLog({
      featureId: currentFeature.id,
      featureName: currentFeature.name,
      executedByTier: currentTier,
      operatorName: HEADQUARTERS_ROLES[currentTier].name,
      actionSummary: `签发餐车实物开票结算单: ${code} (¥${invoiceAmount.toFixed(2)})`,
      details: `开票抬头: ${invoiceHeader}; 税号: ${invoiceTaxCode}; 餐饮服务增值税(6%): ¥${(invoiceAmount * 0.06).toFixed(2)}`,
      status: 'success'
    });
    setExecLogs(getComponentExecutionLogs());
    showToast(`增值税电子发票凭证【${code}】已开立！`, '防伪数字印章已签名，账单已自动归档至商户台账');
  };

  // 5. Action: Export Finance CSV
  const handleExportFinanceCsv = () => {
    const csvData = [
      { 订单编号: 'ORD-2026-9810', 餐车网格: '01号静安创智车', 交易总额: '¥168.00', 平台抽成: '¥10.92', 骑手运费: '¥8.50', 商户净收: '¥148.58', 结算状态: '已到账' },
      { 订单编号: 'ORD-2026-9811', 餐车网格: '02号陆家嘴中心车', 交易总额: '¥245.50', 平台抽成: '¥15.96', 骑手运费: '¥12.00', 商户净收: '¥217.54', 结算状态: '已到账' },
      { 订单编号: 'ORD-2026-9812', 餐车网格: '04号静安备用车', 交易总额: '¥98.00', 平台抽成: '¥6.37', 骑手运费: '¥7.00', 商户净收: '¥84.63', 结算状态: '已到账' },
      { 订单编号: 'ORD-2026-9813', 餐车网格: '03号陆家嘴滨江车', 交易总额: '¥312.00', 平台抽成: '¥20.28', 骑手运费: '¥15.00', 商户净收: '¥276.72', 结算状态: '已到账' },
      { 订单编号: 'ORD-2026-9814', 餐车网格: '05号张江高科车', 交易总额: '¥189.00', 平台抽成: '¥12.28', 骑手运费: '¥9.00', 商户净收: '¥167.72', 结算状态: '已到账' }
    ];
    const headers = [
      { label: '订单编号', key: '订单编号' },
      { label: '餐车网格', key: '餐车网格' },
      { label: '交易总额', key: '交易总额' },
      { label: '平台抽成', key: '平台抽成' },
      { label: '骑手运费', key: '骑手运费' },
      { label: '商户净收', key: '商户净收' },
      { label: '结算状态', key: '结算状态' }
    ];
    exportToCsv('餐车全域财务结算流水台账', headers, csvData);

    appendComponentExecutionLog({
      featureId: currentFeature.id,
      featureName: currentFeature.name,
      executedByTier: currentTier,
      operatorName: HEADQUARTERS_ROLES[currentTier].name,
      actionSummary: `全域财务结算流水 CSV 报表导出完成 (5 笔示范流水)`,
      details: `含交易额、平台抽佣(6.5%)、骑手分成与商户实收净额台账`,
      status: 'success'
    });
    setExecLogs(getComponentExecutionLogs());
    showToast('全域财务台账 CSV 已生成并触发下载！');
  };

  // 6. Action: Execute Surge Pricing
  const handleApplySurgePricing = () => {
    appendComponentExecutionLog({
      featureId: currentFeature.id,
      featureName: currentFeature.name,
      executedByTier: currentTier,
      operatorName: HEADQUARTERS_ROLES[currentTier].name,
      actionSummary: `商圈运价浮动系数调整为: ${surgeMultiplier}x (${weatherCondition})`,
      details: `触发条件: ${weatherCondition}; 骑手加单津贴: +¥${((surgeMultiplier - 1) * 10).toFixed(1)}/单; 客户侧提示已广播`,
      status: 'success'
    });
    setExecLogs(getComponentExecutionLogs());
    showToast(`运价浮动系数【${surgeMultiplier}x】已下发全域！`, '骑手在途抢单补贴已生效，配送网格时效已平抑');
  };

  // 7. Action: Toggle Kill Switch
  const handleToggleKillSwitch = () => {
    const nextState = !isKillSwitchArmed;
    setIsKillSwitchArmed(nextState);
    appendComponentExecutionLog({
      featureId: currentFeature.id,
      featureName: currentFeature.name,
      executedByTier: currentTier,
      operatorName: HEADQUARTERS_ROLES[currentTier].name,
      actionSummary: nextState ? '【高危熔断】启动全网突发应急暂停接单闸' : '【解除熔断】全网餐车恢复常规在线接单',
      details: nextState ? '全网订单流入口已关闭，车载蜂窝广播已挂起暂停接单指示' : '商户与后厨 KDS 恢复接单轮询',
      status: nextState ? 'warn' : 'success'
    });
    setExecLogs(getComponentExecutionLogs());
    showToast(nextState ? '⚠️ 全网突发应急一键熔断降级闸已锁定！' : '全网熔断降级已解除，已恢复在线运营');
  };

  // 8. Action: Save Global Commission
  const handleSaveCommission = () => {
    appendComponentExecutionLog({
      featureId: currentFeature.id,
      featureName: currentFeature.name,
      executedByTier: currentTier,
      operatorName: HEADQUARTERS_ROLES[currentTier].name,
      actionSummary: `平台基准抽佣调整为: ${commissionRate}%, 骑手基准派单费: ¥${riderBasePay.toFixed(1)}`,
      details: `生效时间: 即刻; 全域结算合约规则库版本已递增至 v2.4`,
      status: 'success'
    });
    setExecLogs(getComponentExecutionLogs());
    showToast(`平台基准抽佣费率【${commissionRate}%】已保存并生效！`);
  };

  return (
    <div className="space-y-4 text-[#37352f] antialiased">
      {/* Component Navigation Hub */}
      <div className="bg-white border border-[#e9e9e7] rounded-xl p-3 sm:p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#f1f1ef]">
          <div>
            <h3 className="text-sm font-black text-[#201f1d] flex items-center gap-2">
              <Play className="w-4 h-4 text-emerald-600 fill-emerald-600" />
              <span>组件功能实机试验台与动作发射器 (Component Action Runner)</span>
            </h3>
            <p className="text-xs text-[#787774] mt-0.5">
              可针对 8 大核心组件进行实机参数调试、动作下发与风控鉴权测试。当前操作人视角:
              <span className={`ml-1 font-mono font-bold px-1.5 py-0.2 rounded border ${HEADQUARTERS_ROLES[currentTier].badgeColor}`}>
                {HEADQUARTERS_ROLES[currentTier].shortName}
              </span>
            </p>
          </div>

          <span className="text-[11px] font-mono text-[#787774]">
            受辖组件数: {COMPONENT_FEATURE_CATALOG.length} 组
          </span>
        </div>

        {/* Component Selector Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
          {COMPONENT_FEATURE_CATALOG.map((comp) => {
            const isCompAuthorized = (permissions[comp.id] || comp.defaultAllowedTiers).includes(currentTier);
            const isSelected = selectedFeatureId === comp.id;
            return (
              <button
                key={comp.id}
                type="button"
                onClick={() => setSelectedFeatureId(comp.id)}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-900 border-slate-700 text-white shadow-xs'
                    : 'bg-[#fbfbfa] border-[#e3e2de] hover:border-[#c3c2be] text-[#37352f]'
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <span className={`text-[9.5px] font-mono font-bold px-1 rounded ${
                    comp.riskLevel === 'CRITICAL' ? 'bg-red-100 text-red-900' :
                    comp.riskLevel === 'HIGH' ? 'bg-orange-100 text-orange-900' :
                    'bg-emerald-100 text-emerald-900'
                  }`}>
                    {comp.riskLevel}
                  </span>

                  <span className="shrink-0">
                    {isCompAuthorized ? (
                      <Unlock className={`w-3 h-3 ${isSelected ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    ) : (
                      <Lock className={`w-3 h-3 ${isSelected ? 'text-rose-400' : 'text-rose-600'}`} />
                    )}
                  </span>
                </div>

                <div className="mt-2">
                  <div className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-[#201f1d]'}`}>
                    {comp.name}
                  </div>
                  <div className={`text-[10px] mt-0.5 truncate ${isSelected ? 'text-gray-300' : 'text-[#787774]'}`}>
                    {isCompAuthorized ? '已授权 · 可操作' : '已限制 · 需提权'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Component Live Sandbox Execution Card */}
      <div className="bg-white border border-[#e9e9e7] rounded-xl p-4 shadow-2xs">
        {/* Component Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#f1f1ef]">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-base font-black text-[#201f1d]">{currentFeature.name}</h4>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                isAuthorized ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-red-100 text-red-800 border border-red-300'
              }`}>
                {isAuthorized ? '当前视角已授权 (AUTHORIZED)' : '当前视角无权执行 (PERMISSION RESTRICTED)'}
              </span>
            </div>
            <p className="text-xs text-[#787774] mt-1">{currentFeature.description}</p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-[#787774]">
            <span>风险级别: {currentFeature.riskLevel}</span>
            <span>·</span>
            <span>双人复核: {currentFeature.requiresDualApproval ? '强制复核' : '无需复核'}</span>
          </div>
        </div>

        {/* Guard Check: If Not Authorized, Show Security Lockout Screen */}
        {!isAuthorized ? (
          <div className="py-8 px-4 text-center max-w-lg mx-auto space-y-4">
            <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-2xs">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <div>
              <h5 className="text-sm font-black text-[#201f1d]">【风控权限拦截】当前层级禁止直接执行该组件动作</h5>
              <p className="text-xs text-[#787774] mt-1 leading-relaxed">
                组件【{currentFeature.name}】涉及高敏感平台运力或资金风控规则，仅对
                {currentFeature.defaultAllowedTiers.map((t) => HEADQUARTERS_ROLES[t].shortName).join(' / ')} 开放。
                如确有突发紧急调度需求，可通过双人复核通道向 L1 集团超管或 L2 战区总监申请临时授权。
              </p>
            </div>

            {/* Request Elevation Form */}
            <div className="p-3 bg-[#fbfbfa] rounded-xl border border-[#e3e2de] text-left space-y-2">
              <label className="text-xs font-bold text-[#37352f]">输入申请业务背景与提权事由:</label>
              <textarea
                rows={2}
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                placeholder="例如: 创智商圈雷暴突发，客流积压，申请临时转单协调..."
                className="w-full text-xs p-2 rounded-lg bg-white border border-[#d3d2ce] focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none text-[#201f1d]"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSubmitRequest}
                  className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer shadow-2xs flex items-center gap-1.5"
                >
                  <Send className="w-3 h-3" />
                  <span>提交双人复核提权单</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Authorized: Render Specialized Interactive Console for This Feature */
          <div className="mt-4">
            {/* Feature 1: COMP_CROSS_TRUCK_TRANSFER */}
            {currentFeature.id === 'COMP_CROSS_TRUCK_TRANSFER' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-[#fbfbfa] rounded-xl border border-[#e3e2de] space-y-1.5">
                    <label className="text-xs font-bold text-[#787774]">源餐车 (超负荷备餐队列):</label>
                    <select
                      value={transferSourceTruck}
                      onChange={(e) => setTransferSourceTruck(e.target.value)}
                      className="w-full bg-white border border-[#d3d2ce] rounded-lg p-2 text-xs font-bold text-[#201f1d]"
                    >
                      {allTrucks.map((t) => (
                        <option key={t.id} value={t.id}>{t.name} ({t.id === 'truck_01' ? '当前排队 8 单 · 85% 负荷' : '正常'})</option>
                      ))}
                    </select>
                  </div>

                  <div className="p-3 bg-[#fbfbfa] rounded-xl border border-[#e3e2de] space-y-1.5">
                    <label className="text-xs font-bold text-[#787774]">协同目标餐车 (1.5km 范围空闲车):</label>
                    <select
                      value={transferTargetTruck}
                      onChange={(e) => setTransferTargetTruck(e.target.value)}
                      className="w-full bg-white border border-[#d3d2ce] rounded-lg p-2 text-xs font-bold text-[#201f1d]"
                    >
                      {allTrucks.map((t) => (
                        <option key={t.id} value={t.id}>{t.name} ({t.id === 'truck_04' ? '当前排队 1 单 · 20% 负荷 · 距 1.1km' : '备选'})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="p-3 bg-[#fbfbfa] rounded-xl border border-[#e3e2de] space-y-2">
                  <div className="text-xs font-bold text-[#37352f]">勾选拟分流调拨的排队订单 (溢出分派):</div>
                  <div className="space-y-1.5">
                    {[
                      { id: 'ORD-7701', dish: '秘制炭烤雪花牛肋条 × 2份', price: '¥76.0', eta: '已等 18min' },
                      { id: 'ORD-7703', dish: '黑松露现烤生蚝 × 6只', price: '¥88.0', eta: '已等 14min' },
                      { id: 'ORD-7709', dish: '和牛安格斯现煎汉堡 × 1个', price: '¥45.0', eta: '已等 10min' }
                    ].map((item) => {
                      const checked = selectedOrderIds.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            if (checked) {
                              setSelectedOrderIds(selectedOrderIds.filter((x) => x !== item.id));
                            } else {
                              setSelectedOrderIds([...selectedOrderIds, item.id]);
                            }
                          }}
                          className={`p-2.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition ${
                            checked ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' : 'bg-white border-[#e3e2de] text-[#787774]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-4 h-4 rounded border flex items-center justify-center ${checked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-300'}`}>
                              {checked && <Check className="w-3 h-3 stroke-[3]" />}
                            </span>
                            <span className="font-mono text-emerald-800 font-bold">#{item.id}</span>
                            <span>{item.dish}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold">{item.price}</span>
                            <span className="text-[10.5px] text-amber-600">{item.eta}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleExecuteTransfer}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer shadow-2xs flex items-center gap-2"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>执行跨车应急转单调拨 ({selectedOrderIds.length} 笔)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Feature 2: COMP_INTERCOM_BROADCAST */}
            {currentFeature.id === 'COMP_INTERCOM_BROADCAST' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-[#fbfbfa] rounded-xl border border-[#e3e2de] space-y-1.5">
                    <label className="text-xs font-bold text-[#787774]">广播频道 / 目标覆盖端:</label>
                    <select
                      value={broadcastChannel}
                      onChange={(e) => setBroadcastChannel(e.target.value)}
                      className="w-full bg-white border border-[#d3d2ce] rounded-lg p-2 text-xs font-bold text-[#201f1d]"
                    >
                      <option value="ALL_TRUCKS">全域全网广播 (全量餐车 + 专线骑手)</option>
                      <option value="CH_01_JINGAN">CH-01 静安创智商圈战区专线</option>
                      <option value="CH_02_LUJIAZUI">CH-02 陆家嘴金融中心战区专线</option>
                      <option value="RIDERS_IN_TRANSIT">在途专送骑手车载 HUD 紧急通道</option>
                    </select>
                  </div>

                  <div className="p-3 bg-[#fbfbfa] rounded-xl border border-[#e3e2de] space-y-1.5">
                    <label className="text-xs font-bold text-[#787774]">快速预设播报模板:</label>
                    <div className="flex items-center gap-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setBroadcastMessage('⚠️ 暴雨黄色预警：全员即刻启动双层保温箱防雨封条，限速行驶！')}
                        className="px-2 py-1 rounded bg-white hover:bg-neutral-100 border border-[#d3d2ce] text-[10.5px] font-bold"
                      >
                        暴雨预警
                      </button>
                      <button
                        type="button"
                        onClick={() => setBroadcastMessage('🔥 午市峰值保供：开启第二烤架，后厨现烤优先转派协同车！')}
                        className="px-2 py-1 rounded bg-white hover:bg-neutral-100 border border-[#d3d2ce] text-[10.5px] font-bold"
                      >
                        午市峰值
                      </button>
                      <button
                        type="button"
                        onClick={() => setBroadcastMessage('📡 平台信标校准：高精时钟与 GPS 漂移抑制已完成全量回传同步！')}
                        className="px-2 py-1 rounded bg-white hover:bg-neutral-100 border border-[#d3d2ce] text-[10.5px] font-bold"
                      >
                        信标校准
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-[#fbfbfa] rounded-xl border border-[#e3e2de] space-y-2">
                  <label className="text-xs font-bold text-[#37352f]">播报语音文本 (车载 TTS 智能合成):</label>
                  <textarea
                    rows={2}
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg bg-white border border-[#d3d2ce] focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none text-[#201f1d]"
                  />

                  {/* Simulated Waveform Bar */}
                  <div className="flex items-center gap-1.5 h-6 px-3 bg-slate-900 rounded-lg text-emerald-400 font-mono text-[10px]">
                    <Radio className="w-3 h-3 animate-pulse" />
                    <span>868.5MHz FM BEACON:</span>
                    <div className="flex items-center gap-0.5 flex-1 justify-center">
                      {[12, 18, 24, 10, 28, 14, 20, 8, 26, 16, 22, 10, 30, 18, 24, 12].map((h, i) => (
                        <div
                          key={i}
                          className="w-1 bg-emerald-500 rounded-full transition-all duration-200"
                          style={{ height: isBroadcasting ? `${(h * 0.7)}px` : '4px' }}
                        />
                      ))}
                    </div>
                    <span>{isBroadcasting ? 'TRANSMITTING...' : 'STANDBY'}</span>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={isBroadcasting}
                    onClick={handleExecuteBroadcast}
                    className="px-4 py-2 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer shadow-2xs flex items-center gap-2"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{isBroadcasting ? '正在发射车载广播...' : '发射车载对讲强插广播'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Feature 3: COMP_GEOFENCE_OVERRIDE */}
            {currentFeature.id === 'COMP_GEOFENCE_OVERRIDE' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-[#fbfbfa] rounded-xl border border-[#e3e2de] space-y-1.5">
                    <label className="text-xs font-bold text-[#787774]">特批营运餐车:</label>
                    <select
                      value={geofenceTruck}
                      onChange={(e) => setGeofenceTruck(e.target.value)}
                      className="w-full bg-white border border-[#d3d2ce] rounded-lg p-2 text-xs font-bold text-[#201f1d]"
                    >
                      {allTrucks.map((t) => (
                        <option key={t.id} value={t.id}>{t.name} (当前泊位: {t.locationName})</option>
                      ))}
                    </select>
                  </div>

                  <div className="p-3 bg-[#fbfbfa] rounded-xl border border-[#e3e2de] space-y-1.5">
                    <label className="text-xs font-bold text-[#787774]">越界通行特批走廊:</label>
                    <input
                      type="text"
                      value={geofenceCorridor}
                      onChange={(e) => setGeofenceCorridor(e.target.value)}
                      className="w-full bg-white border border-[#d3d2ce] rounded-lg p-2 text-xs font-bold text-[#201f1d]"
                    />
                  </div>

                  <div className="p-3 bg-[#fbfbfa] rounded-xl border border-[#e3e2de] space-y-1.5">
                    <label className="text-xs font-bold text-[#787774]">豁免授权时限:</label>
                    <select
                      value={geofenceDurationHours}
                      onChange={(e) => setGeofenceDurationHours(Number(e.target.value))}
                      className="w-full bg-white border border-[#d3d2ce] rounded-lg p-2 text-xs font-bold text-[#201f1d]"
                    >
                      <option value={2}>2 小时 (临时活动泊车)</option>
                      <option value={4}>4 小时 (半天会展巡航)</option>
                      <option value={12}>12 小时 (全日特别保供)</option>
                    </select>
                  </div>
                </div>

                {issuedPass && (
                  <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-300 text-xs space-y-1.5 font-mono">
                    <div className="flex items-center justify-between text-emerald-900 font-bold">
                      <span className="flex items-center gap-1.5">
                        <FileCheck className="w-4 h-4 text-emerald-700" />
                        电子围栏特批通行证已签发: {issuedPass.id}
                      </span>
                      <span className="text-[10.5px] bg-emerald-200 px-1.5 py-0.5 rounded text-emerald-900">
                        有效至: {issuedPass.expires}
                      </span>
                    </div>
                    <div className="text-emerald-800 text-[11px]">
                      受辖载具: {issuedPass.truck} · 密码学哈希防伪签名: {issuedPass.hash}
                    </div>
                    <div className="text-[10px] text-emerald-700">
                      * 平台脱圈告警引擎已自动将此餐车加入白名单信标池，期间不会触发扣罚或保证金冻结。
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleIssueGeofencePass}
                    className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer shadow-2xs flex items-center gap-2"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>签署并签发电子通行免责令</span>
                  </button>
                </div>
              </div>
            )}

            {/* Feature 4: COMP_INVOICE_SETTLEMENT */}
            {currentFeature.id === 'COMP_INVOICE_SETTLEMENT' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-[#fbfbfa] rounded-xl border border-[#e3e2de] space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[#787774]">开票抬头与类型:</label>
                      <div className="flex items-center gap-1 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setInvoiceBuyerType('enterprise')}
                          className={`px-2 py-0.5 rounded font-bold cursor-pointer ${invoiceBuyerType === 'enterprise' ? 'bg-emerald-600 text-white' : 'bg-gray-200'}`}
                        >
                          企业专票
                        </button>
                        <button
                          type="button"
                          onClick={() => setInvoiceBuyerType('individual')}
                          className={`px-2 py-0.5 rounded font-bold cursor-pointer ${invoiceBuyerType === 'individual' ? 'bg-emerald-600 text-white' : 'bg-gray-200'}`}
                        >
                          个人凭据
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={invoiceHeader}
                      onChange={(e) => setInvoiceHeader(e.target.value)}
                      placeholder="公司企业全称"
                      className="w-full bg-white border border-[#d3d2ce] rounded-lg p-2 text-xs font-bold text-[#201f1d]"
                    />
                    {invoiceBuyerType === 'enterprise' && (
                      <input
                        type="text"
                        value={invoiceTaxCode}
                        onChange={(e) => setInvoiceTaxCode(e.target.value)}
                        placeholder="纳税人识别号 (18位统一社会信用代码)"
                        className="w-full bg-white border border-[#d3d2ce] rounded-lg p-2 text-xs font-mono font-bold text-[#201f1d]"
                      />
                    )}
                  </div>

                  <div className="p-3 bg-[#fbfbfa] rounded-xl border border-[#e3e2de] space-y-2">
                    <label className="text-xs font-bold text-[#787774]">核销金额与增值税计算:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step={0.5}
                        value={invoiceAmount}
                        onChange={(e) => setInvoiceAmount(Number(e.target.value))}
                        className="w-32 bg-white border border-[#d3d2ce] rounded-lg p-2 text-xs font-mono font-black text-[#201f1d]"
                      />
                      <span className="text-xs text-[#787774]">元 (含税)</span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-[#e3e2de] text-[11px] text-[#787774] space-y-0.5 font-mono">
                      <div>不含税金额: ¥{(invoiceAmount / 1.06).toFixed(2)}</div>
                      <div>增值税额 (6%餐饮服务): ¥{(invoiceAmount - invoiceAmount / 1.06).toFixed(2)}</div>
                    </div>
                  </div>
                </div>

                {generatedInvoice && (
                  <div className="p-3.5 bg-[#faf9f7] rounded-xl border border-[#d3d2ce] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="font-mono font-bold text-[#201f1d]">发票凭证代码: {generatedInvoice.code}</div>
                      <div className="text-[11px] text-[#787774]">开具时间: {generatedInvoice.time} · 抬头: {invoiceHeader}</div>
                      <div className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                        QR 防伪指纹: {generatedInvoice.qrValue}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        fallbackToast('发票防伪明细已复制到剪贴板，可打印实物凭单！');
                      }}
                      className="px-3 py-1.5 bg-white hover:bg-neutral-100 border border-[#d3d2ce] text-[#201f1d] rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <Copy className="w-3 h-3 text-emerald-600" />
                      <span>复制打印数据</span>
                    </button>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleGenerateInvoice}
                    className="px-4 py-2 bg-[#201f1d] hover:bg-black text-white rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer shadow-2xs flex items-center gap-2"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>签发实物核销发票凭据</span>
                  </button>
                </div>
              </div>
            )}

            {/* Feature 5: COMP_FINANCE_CSV_EXPORT */}
            {currentFeature.id === 'COMP_FINANCE_CSV_EXPORT' && (
              <div className="space-y-4">
                <div className="p-3 bg-[#fbfbfa] rounded-xl border border-[#e3e2de] text-xs space-y-2">
                  <div className="font-bold text-[#201f1d]">导出范围与台账字段定义:</div>
                  <div className="text-[11.5px] text-[#787774] leading-relaxed">
                    将全域流动餐车已完成履约核销订单的财务数据进行封存导出，包含订单号、所属商圈泊位、总交易额、平台 6.5% 基准抽成、骑手专送运力费、商户净结转收益与纳税代扣明细。
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-mono text-emerald-800">
                    <span>• 覆盖餐车: 5 辆在营餐车</span>
                    <span>• 结算对账单: 2026年度实时汇总</span>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleExportFinanceCsv}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer shadow-2xs flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>一键导出全域财务对账 CSV</span>
                  </button>
                </div>
              </div>
            )}

            {/* Feature 6: COMP_SURGE_PRICING */}
            {currentFeature.id === 'COMP_SURGE_PRICING' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-[#fbfbfa] rounded-xl border border-[#e3e2de] space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-[#787774]">动态运价上浮倍率:</span>
                      <span className="text-emerald-700 font-mono text-sm font-black">{surgeMultiplier.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min={1.0}
                      max={2.2}
                      step={0.05}
                      value={surgeMultiplier}
                      onChange={(e) => setSurgeMultiplier(Number(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-[#787774]">
                      <span>1.0x (常态平峰)</span>
                      <span>1.5x (中度恶劣)</span>
                      <span>2.2x (极端气象)</span>
                    </div>
                  </div>

                  <div className="p-3 bg-[#fbfbfa] rounded-xl border border-[#e3e2de] space-y-1.5">
                    <label className="text-xs font-bold text-[#787774]">气象/商圈触发判据:</label>
                    <select
                      value={weatherCondition}
                      onChange={(e) => setWeatherCondition(e.target.value)}
                      className="w-full bg-white border border-[#d3d2ce] rounded-lg p-2 text-xs font-bold text-[#201f1d]"
                    >
                      <option value="暴雨雷电黄色预警">暴雨雷电黄色预警 (建议 1.35x)</option>
                      <option value="大风8级强对流天气">大风8级强对流天气 (建议 1.50x)</option>
                      <option value="午市超高峰订单积压">午市超高峰订单积压 (建议 1.25x)</option>
                      <option value="深夜夜市专线保供">深夜夜市专线保供 (建议 1.20x)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleApplySurgePricing}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer shadow-2xs flex items-center gap-2"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>发布动态运价杠杆生效</span>
                  </button>
                </div>
              </div>
            )}

            {/* Feature 7: COMP_KILL_SWITCH */}
            {currentFeature.id === 'COMP_KILL_SWITCH' && (
              <div className="space-y-4">
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                    <ShieldAlert className="w-4 h-4 text-rose-700" />
                    <span>高危安全防护：全域一键应急熔断降级闸</span>
                  </div>
                  <p className="text-[11.5px] text-rose-800 leading-relaxed">
                    在遭遇特大暴雨洪涝、重大交通事故或系统主库降级时，一键切断全域订单入口，向所有食客广播暂停接单，餐车进入安全停驻保护状态。该动作仅允许由 L1 集团超管触发。
                  </p>

                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-rose-300">
                    <div className="text-xs">
                      <div className="font-bold text-[#201f1d]">熔断闸当前状态:</div>
                      <div className="text-[11px] text-[#787774]">
                        {isKillSwitchArmed ? '🔴 已启动熔断！全网停止在线接单' : '🟢 处于解除常态，全网在线履约中'}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleToggleKillSwitch}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs ${
                        isKillSwitchArmed
                          ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                          : 'bg-rose-700 hover:bg-rose-800 text-white'
                      }`}
                    >
                      {isKillSwitchArmed ? '解除熔断并恢复' : '一键启动全域熔断'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Feature 8: COMP_GLOBAL_COMMISSION */}
            {currentFeature.id === 'COMP_GLOBAL_COMMISSION' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-[#fbfbfa] rounded-xl border border-[#e3e2de] space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-[#787774]">全网基准抽成率:</span>
                      <span className="text-purple-700 font-mono text-sm font-black">{commissionRate.toFixed(1)}%</span>
                    </div>
                    <input
                      type="range"
                      min={3.0}
                      max={12.0}
                      step={0.5}
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(Number(e.target.value))}
                      className="w-full accent-purple-600 cursor-pointer"
                    />
                  </div>

                  <div className="p-3 bg-[#fbfbfa] rounded-xl border border-[#e3e2de] space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-[#787774]">骑手起步基准配送费:</span>
                      <span className="text-emerald-700 font-mono text-sm font-black">¥{riderBasePay.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min={5.0}
                      max={15.0}
                      step={0.5}
                      value={riderBasePay}
                      onChange={(e) => setRiderBasePay(Number(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveCommission}
                    className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer shadow-2xs flex items-center gap-2"
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>下发全网基准费率配置</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Execution Audit Log Stream */}
      <div className="bg-white border border-[#e9e9e7] rounded-xl p-4 shadow-2xs">
        <div className="flex items-center justify-between pb-2.5 border-b border-[#f1f1ef]">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#787774]" />
            <h4 className="text-xs font-black text-[#201f1d]">组件动作执行审计流水 (Live Component Action Audit Stream)</h4>
          </div>
          <span className="text-[10.5px] font-mono text-[#787774]">已记录: {execLogs.length} 笔</span>
        </div>

        <div className="mt-3 space-y-2">
          {execLogs.slice(0, 5).map((log) => (
            <div
              key={log.id}
              className="p-2.5 rounded-lg border border-[#e3e2de] bg-[#fbfbfa] text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-2"
            >
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[10px] text-gray-500">{log.timestamp}</span>
                  <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                    {log.id}
                  </span>
                  <span className="font-bold text-[#201f1d]">{log.actionSummary}</span>
                </div>
                <div className="text-[11px] text-[#787774]">
                  操作人: {log.operatorName} ({HEADQUARTERS_ROLES[log.executedByTier]?.shortName || log.executedByTier}) · {log.details}
                </div>
              </div>

              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold shrink-0 ${
                log.status === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {log.status === 'success' ? '已成功生效' : '触发警示'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
