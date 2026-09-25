import React, { useState, useEffect } from 'react';
import {
  X,
  Activity,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  Play,
  Terminal,
  ChevronRight,
  Server,
  Cloud,
  Check,
  Lock,
  KeyRound
} from 'lucide-react';
import { CloudFunctionCallLog, UserProfile, Order } from '../../types';
import { 
  getCloudFunctionLogs, 
  clearCloudFunctionLogs, 
  callCloudFunction,
  TCB_FUNCTION_NAMES 
} from '../../utils/cloudbase';
import { useToast } from '../ui/ToastContext';
import { useDevSimulation } from '../../context/DevSimulationContext';
import { SimulationProbe } from '../dev/SimulationProbe';

interface CloudFunctionMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile?: UserProfile;
  orders?: Order[];
  onOrdersUpdated?: (orders: Order[]) => void;
  onProfileUpdated?: (profile: UserProfile) => void;
}

export const CloudFunctionMonitorModal: React.FC<CloudFunctionMonitorModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  orders = [],
  onOrdersUpdated,
  onProfileUpdated
}) => {
  const toast = useToast();
  const { isSimulationAllowed, openDevAuthModal } = useDevSimulation();
  const [logs, setLogs] = useState<CloudFunctionCallLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<CloudFunctionCallLog | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [activeTab, setActiveTab] = useState<'logs' | 'test'>('logs');

  const refreshLogs = () => {
    const data = getCloudFunctionLogs();
    setLogs(data);
    if (data.length > 0 && !selectedLog) {
      setSelectedLog(data[0]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClearLogs = () => {
    clearCloudFunctionLogs();
    setLogs([]);
    setSelectedLog(null);
    toast.info('日志已清空');
  };

  // Test Cloud Function Trigger
  const handleTestCall = async (fnName: string, payload: any) => {
    setIsTesting(true);
    toast.info('正在发送测试请求', `云函数: ${fnName}`);
    try {
      const res = await callCloudFunction(fnName, payload);
      refreshLogs();
      if (res.success) {
        toast.success(`云函数 [${fnName}] 测试成功`, `耗时 ${res.durationMs}ms`);
      } else {
        toast.info(`云函数 [${fnName}] 已本地双轨响应`, `耗时 ${res.durationMs}ms`);
      }
    } catch (err: any) {
      toast.error('请求异常', err?.message);
    } finally {
      setIsTesting(false);
    }
  };

  // Compute metrics
  const totalCalls = logs.length;
  const successCalls = logs.filter((l) => l.status === 'success').length;
  const avgDuration = totalCalls > 0 
    ? Math.round(logs.reduce((acc, l) => acc + l.durationMs, 0) / totalCalls) 
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-neutral-200 flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-white tracking-tight flex items-center gap-2">
                <span>云函数实时监控与调用链路</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                  LIVE TELEMETRY
                </span>
              </h3>
              <p className="text-[11px] text-neutral-400">
                实时追踪 userProfile / orders / createOrder 云端调用延时与报文
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top Metrics Cards */}
        <div className="grid grid-cols-3 p-3 bg-neutral-50 border-b border-neutral-200 text-xs">
          <div className="px-3 py-1">
            <span className="text-[10px] text-neutral-400 font-bold block">总调用次数</span>
            <span className="text-base font-black font-sans text-black">{totalCalls} 次</span>
          </div>
          <div className="px-3 py-1 border-x border-neutral-200">
            <span className="text-[10px] text-neutral-400 font-bold block">平均执行耗时</span>
            <span className="text-base font-black font-sans text-emerald-700">{avgDuration} ms</span>
          </div>
          <div className="px-3 py-1">
            <span className="text-[10px] text-neutral-400 font-bold block">双轨降级保底率</span>
            <span className="text-base font-black font-sans text-neutral-800">100% 成功</span>
          </div>
        </div>

        {/* Tab Controls & Actions */}
        <div className="px-3 py-2 bg-white border-b border-neutral-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'logs' ? 'bg-black text-white shadow-xs' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              调用链路日志 ({logs.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('test')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === 'test' ? 'bg-black text-white shadow-xs' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <Zap className="w-3 h-3 text-amber-500" />
              <span>调试发射台</span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={refreshLogs}
              className="p-1 text-neutral-500 hover:text-black rounded-lg transition-colors cursor-pointer"
              title="刷新"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleClearLogs}
              className="p-1 text-neutral-500 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
              title="清空日志"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto max-h-[55vh]">
          {/* TAB 1: 调用日志与报文详情 */}
          {activeTab === 'logs' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in">
              {/* Left: Logs List */}
              <div className="space-y-1.5 max-h-[48vh] overflow-y-auto pr-1">
                {logs.length === 0 ? (
                  <div className="p-6 text-center text-xs text-neutral-400 border border-dashed rounded-2xl">
                    暂无云函数调用日志，可通过上方「调试发射台」发送实时请求
                  </div>
                ) : (
                  logs.map((log) => {
                    const isSelected = selectedLog?.id === log.id;
                    return (
                      <div
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                          isSelected
                            ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                            : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-800 border-neutral-200'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-sans font-black">{log.functionName}</span>
                            <span
                              className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                                log.status === 'success'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {log.source === 'cloud_function' ? '云端响应' : '双轨降级'}
                            </span>
                          </div>
                          <p className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                            {log.message}
                          </p>
                        </div>

                        <div className="text-right shrink-0 font-sans text-[10.5px]">
                          <span className={`font-bold block ${isSelected ? 'text-emerald-300' : 'text-emerald-700'}`}>
                            {log.durationMs}ms
                          </span>
                          <span className={`${isSelected ? 'text-neutral-400' : 'text-neutral-400'} text-[9px]`}>
                            {log.timestamp}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Right: Selected Log Payload Inspector */}
              <div className="bg-[#141517] rounded-2xl border border-neutral-800 p-3 text-white flex flex-col justify-between max-h-[48vh] overflow-hidden text-xs font-sans">
                {selectedLog ? (
                  <div className="space-y-3 overflow-y-auto pr-1">
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                      <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5" />
                        <span>{selectedLog.functionName} 报文详情</span>
                      </div>
                      <span className="text-[10px] text-neutral-400">{selectedLog.timestamp}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-neutral-400 block mb-1 font-bold">Request Payload (入参):</span>
                      <pre className="p-2 bg-black/60 rounded-lg text-[10.5px] text-neutral-200 overflow-x-auto">
                        {JSON.stringify(selectedLog.requestPayload, null, 2)}
                      </pre>
                    </div>

                    <div>
                      <span className="text-[10px] text-neutral-400 block mb-1 font-bold">Response Result (回执):</span>
                      <pre className="p-2 bg-black/60 rounded-lg text-[10.5px] text-emerald-300/90 overflow-x-auto">
                        {JSON.stringify(selectedLog.responsePayload, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-neutral-500 text-center py-10">
                    点击左侧任意请求日志查看完整入参与响应 JSON
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: 调试发射台 */}
          {activeTab === 'test' && (
            !isSimulationAllowed ? (
              <div className="p-6 bg-neutral-50 rounded-2xl border border-neutral-200 text-center space-y-3.5 my-2">
                <div className="w-11 h-11 rounded-2xl bg-neutral-900 text-amber-400 flex items-center justify-center mx-auto shadow-xs">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-black">云函数调试发射台已受限锁定</h4>
                  <p className="text-[11px] text-neutral-500 mt-1 max-w-sm mx-auto leading-relaxed">
                    当前处于普通用户权限。为防止向生产/测试云环境恶意注水或并发触发 RPC，发射台已关闭。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openDevAuthModal}
                  className="px-3.5 py-1.5 bg-black hover:bg-neutral-800 active:scale-95 text-white text-xs font-bold rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>管理员登录解锁发射台</span>
                </button>
              </div>
            ) : (
            <SimulationProbe pointId="SIM_TCB_CLOUD_FUNCTION" className="space-y-3 animate-in fade-in text-xs block">
              <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200">
                <span className="font-bold text-black block">一键触发云函数全链路调试 (开发者已授权)</span>
                <span className="text-[11px] text-neutral-500">
                  模拟生产环境向腾讯云开发触发不同场景的 RPC 调用
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Action 1: userProfile Get */}
                <div className="p-3 bg-white border border-neutral-200 rounded-xl flex items-center justify-between gap-2 shadow-2xs">
                  <div>
                    <span className="font-bold font-sans text-black block">userProfile (get)</span>
                    <span className="text-[10px] text-neutral-400">读取当前用户的完整个人资料与地址簿</span>
                  </div>
                  <button
                    type="button"
                    disabled={isTesting}
                    onClick={() => handleTestCall(TCB_FUNCTION_NAMES.USER_PROFILE, { action: 'get', uid: userProfile?.uid })}
                    className="px-2.5 py-1 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Play className="w-3 h-3" />
                    <span>执行</span>
                  </button>
                </div>

                {/* Action 2: orders List */}
                <div className="p-3 bg-white border border-neutral-200 rounded-xl flex items-center justify-between gap-2 shadow-2xs">
                  <div>
                    <span className="font-bold font-sans text-black block">orders (list)</span>
                    <span className="text-[10px] text-neutral-400">拉取最新 50 条多端同步订单流水</span>
                  </div>
                  <button
                    type="button"
                    disabled={isTesting}
                    onClick={() => handleTestCall(TCB_FUNCTION_NAMES.ORDERS, { action: 'list', limit: 50 })}
                    className="px-2.5 py-1 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Play className="w-3 h-3" />
                    <span>执行</span>
                  </button>
                </div>

                {/* Action 3: createOrder Test */}
                <div className="p-3 bg-white border border-neutral-200 rounded-xl flex items-center justify-between gap-2 shadow-2xs">
                  <div>
                    <span className="font-bold font-sans text-black block">createOrder (test)</span>
                    <span className="text-[10px] text-neutral-400">模拟向炭烤流动车台下发测试订单</span>
                  </div>
                  <button
                    type="button"
                    disabled={isTesting}
                    onClick={() =>
                      handleTestCall(TCB_FUNCTION_NAMES.CREATE_ORDER, {
                        order: {
                          id: `ord-test-${Date.now()}`,
                          orderNo: `TEST-${Date.now().toString().slice(-4)}`,
                          items: [{ name: '碳烤和牛小汉堡', quantity: 2, price: 63.0 }],
                          totalAmount: 126.0,
                          status: 'cooking',
                          statusText: '炭烤烹饪中',
                          createdTime: new Date().toLocaleTimeString(),
                          estimatedDeliveryTime: '约15分钟',
                          etaMinutes: 15,
                          deliveryAddress: '静安大悦城北座 1204 室',
                          truckName: '黑曜石 01 号流动餐车',
                          progressPercent: 25
                        }
                      })
                    }
                    className="px-2.5 py-1 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Play className="w-3 h-3" />
                    <span>执行</span>
                  </button>
                </div>

                {/* Action 4: syncUserData */}
                <div className="p-3 bg-white border border-neutral-200 rounded-xl flex items-center justify-between gap-2 shadow-2xs">
                  <div>
                    <span className="font-bold font-sans text-black block">syncUserData (full)</span>
                    <span className="text-[10px] text-neutral-400">双向打包同步用户资料与所有订单</span>
                  </div>
                  <button
                    type="button"
                    disabled={isTesting}
                    onClick={() =>
                      handleTestCall(TCB_FUNCTION_NAMES.SYNC_USER_DATA, {
                        profile: userProfile,
                        orders: orders.slice(0, 5)
                      })
                    }
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Play className="w-3 h-3" />
                    <span>执行</span>
                  </button>
                </div>
              </div>
            </SimulationProbe>
            )
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between text-xs">
          <span className="text-[11px] text-neutral-500">
            日志保留最近 100 条并持久化缓存至 LocalStorage
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-black hover:bg-neutral-800 text-white font-bold rounded-xl transition-colors cursor-pointer"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
