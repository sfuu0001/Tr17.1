import React, { useState } from 'react';
import {
  Activity,
  Cpu,
  Send,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Radio,
  ArrowRight,
  ShieldAlert,
  Zap,
  Ticket,
  FileCheck,
  Truck,
  RotateCcw
} from 'lucide-react';
import { TruckEntity, RiderEntity, ZoneMesh } from './cockpitData';

interface LoopOpsWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  zones: ZoneMesh[];
  trucks: TruckEntity[];
  riders: RiderEntity[];
  onDispatchTruck: (truckId: string, targetZoneId: string) => void;
  onIssueCoupons: (zoneId: string, amount: number) => void;
  onDispatchInspector: (zoneId: string, managerName: string) => void;
  showToast: (msg: string) => void;
  addAuditLog: (action: string, details: string) => void;
}

export const LoopOpsWorkflowModal: React.FC<LoopOpsWorkflowModalProps> = ({
  isOpen,
  onClose,
  zones,
  trucks,
  riders,
  onDispatchTruck,
  onIssueCoupons,
  onDispatchInspector,
  showToast,
  addAuditLog
}) => {
  const [activeStep, setActiveStep] = useState<'perceive' | 'judge' | 'execute' | 'evolve'>('perceive');
  const [isExecuting, setIsExecuting] = useState(false);
  const [hasExecuted, setHasExecuted] = useState(false);

  if (!isOpen) return null;

  // 执行闭环调度联动
  const handleExecuteFullLoop = () => {
    setIsExecuting(true);
    setTimeout(() => {
      // 1. 调拨备用餐车
      onDispatchTruck('truck-06', 'zone-02');
      // 2. 定向发券
      onIssueCoupons('zone-02', 5);
      // 3. 派发工单
      onDispatchInspector('zone-02', '李明 (区经理)');
      // 4. 写入审计日志
      addAuditLog(
        '闭环调度中心批量执行',
        '针对苏河湾供需失衡与竞品拦截：一键调拨 TC-06 应急餐车、下发 5 元夜市定向券、派发区经理现场核查'
      );

      setIsExecuting(false);
      setHasExecuted(true);
      setActiveStep('evolve');
      showToast('【感知-判断-执行-迭代】闭环指令已全量下发至高德路网与实体设备！');
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#e4e2dc] shadow-2xl w-full max-w-3xl overflow-hidden text-[#1a1c1b] animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
        {/* 顶部标题栏 */}
        <div className="px-6 py-4 border-b border-[#e4e2dc] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1a1c1b] text-white flex items-center justify-center font-mono font-bold text-xs shadow-xs">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-[#1a1c1b]">
                  全域运力决策闭环体系 (Perception-to-Evolution)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[#f4f4f2] text-[#1a1c1b] text-[10px] font-mono font-bold border border-[#e4e2dc]">
                  SLA 99.2%
                </span>
              </div>
              <p className="text-[11px] text-[#787770]">
                对接高德实时路网与车载 TBox 遥测：感知态势 → 智能判断 → 自动执行 → 模型演进
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#f4f4f2] text-[#787770] hover:text-[#1a1c1b] cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* 阶段选择步骤条 (四步闭环) */}
        <div className="grid grid-cols-4 border-b border-[#e4e2dc] bg-[#f9f9f7] text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveStep('perceive')}
            className={`py-3 px-3 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeStep === 'perceive'
                ? 'border-[#1a1c1b] text-[#1a1c1b] bg-white'
                : 'border-transparent text-[#787770] hover:text-[#1a1c1b]'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>1. 实时全域感知</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveStep('judge')}
            className={`py-3 px-3 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeStep === 'judge'
                ? 'border-[#1a1c1b] text-[#1a1c1b] bg-white'
                : 'border-transparent text-[#787770] hover:text-[#1a1c1b]'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>2. 智能规则判断</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveStep('execute')}
            className={`py-3 px-3 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeStep === 'execute'
                ? 'border-[#1a1c1b] text-[#1a1c1b] bg-white'
                : 'border-transparent text-[#787770] hover:text-[#1a1c1b]'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>3. 多端闭环执行</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveStep('evolve')}
            className={`py-3 px-3 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeStep === 'evolve'
                ? 'border-[#1a1c1b] text-[#1a1c1b] bg-white'
                : 'border-transparent text-[#787770] hover:text-[#1a1c1b]'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>4. 持续学习迭代</span>
          </button>
        </div>

        {/* 阶段内容展示区 */}
        <div className="p-6 overflow-y-auto flex-1 text-xs">
          {/* 阶段 1：实时全域感知 */}
          {activeStep === 'perceive' && (
            <div className="flex flex-col gap-4">
              <div className="p-3.5 rounded-xl bg-white border border-[#e4e2dc] shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-[#1a1c1b] flex items-center gap-1.5">
                    <Radio className="w-4 h-4 text-[#1a1c1b]" />
                    高德路网与空间遥测感知信号捕获 (10Hz Live)
                  </span>
                  <span className="font-mono text-[11px] text-[#787770]">采样正常 · 延迟 42ms</span>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-2.5 rounded-lg bg-[#f9f9f7] border border-[#e4e2dc]">
                    <div className="text-[#787770] text-[11px]">高德动态路况</div>
                    <div className="font-bold text-sm text-[#1a1c1b] mt-0.5">西藏北路拥堵缓行</div>
                    <div className="text-[10px] text-[#787770]">平均车速降至 14km/h</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#f9f9f7] border border-[#e4e2dc]">
                    <div className="text-[#787770] text-[11px]">食客聚集等待</div>
                    <div className="font-bold text-sm text-[#1a1c1b] mt-0.5">苏河湾 142 人聚类</div>
                    <div className="text-[10px] text-[#787770]">高频下午茶/夜宵刚需</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#f9f9f7] border border-[#e4e2dc]">
                    <div className="text-[#787770] text-[11px]">竞品贴脸入侵</div>
                    <div className="font-bold text-sm text-[#1a1c1b] mt-0.5">火焰乌炭烤出摊</div>
                    <div className="text-[10px] text-[#787770]">距 03 餐车站桩 120m</div>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-[#e4e2dc] shadow-2xs">
                <h4 className="font-bold text-[#1a1c1b] mb-2 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-[#1a1c1b]" />
                  实时触发的感知告警事件 (2项)
                </h4>
                <div className="flex flex-col gap-2">
                  <div className="p-2.5 rounded-lg bg-[#f9f9f7] border border-[#e4e2dc] flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#1a1c1b]">[严重] 苏河湾商圈订单排队积压</span>
                      <p className="text-[11px] text-[#787770] mt-0.5">
                        待制作订单 18 份，在岗餐车仅 1 辆，平均等待预计超出 28 分钟。
                      </p>
                    </div>
                    <span className="px-2 py-1 rounded bg-[#1a1c1b] text-white font-mono font-bold text-[10px]">
                      供需临界
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#f9f9f7] border border-[#e4e2dc] flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#1a1c1b]">[中度] 竞品低价分流截流风险</span>
                      <p className="text-[11px] text-[#787770] mt-0.5">
                        苏河湾路口对手推出 19.9 元炭烤汉堡，分流潜在客流预计达 25%-30%。
                      </p>
                    </div>
                    <span className="px-2 py-1 rounded bg-[#f4f4f2] border border-[#e4e2dc] font-bold text-[10px]">
                      客流侵蚀
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveStep('judge')}
                  className="px-4 py-2 rounded-xl bg-[#1a1c1b] hover:bg-black text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  进入智能规则与判断阶段
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* 阶段 2：智能规则判断 */}
          {activeStep === 'judge' && (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-xl bg-white border border-[#e4e2dc] shadow-2xs">
                <h4 className="font-bold text-sm text-[#1a1c1b] mb-1.5 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-[#1a1c1b]" />
                  时空算法供需剪刀差诊断与高德 ETA 测算
                </h4>
                <p className="text-[11px] text-[#787770] mb-3">
                  基于高德路网骑行/货运模型计算全域运力弹性与订单延误风险：
                </p>

                <div className="p-3 rounded-xl bg-[#f9f9f7] border border-[#e4e2dc] flex flex-col gap-2 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span>目标网格 (Target Zone):</span>
                    <span className="font-bold text-[#1a1c1b]">ZONE-02 // 苏河湾金融商圈</span>
                  </div>
                  <div className="flex justify-between">
                    <span>供需紧张度指数 (Demand Index):</span>
                    <span className="font-bold text-[#1a1c1b]">2.14 [极度不平衡 (基线 1.0)]</span>
                  </div>
                  <div className="flex justify-between">
                    <span>高德路网预估调配 ETA (AMap ETA):</span>
                    <span className="font-bold text-[#1a1c1b]">12.4 分钟 (途经西藏中路无障碍点)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>竞品分流概率估算:</span>
                    <span className="font-bold text-[#1a1c1b]">28.6% (高重叠目标客群)</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#e4e2dc] shadow-2xs">
                <h4 className="font-bold text-sm text-[#1a1c1b] mb-2 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-[#1a1c1b]" />
                  系统输出最优应对方案 (Option A - 推荐)
                </h4>
                <ul className="space-y-2 text-[#474741]">
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-[#1a1c1b] text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      <strong>流动餐车跨区补位</strong>：指派空闲的备用餐车 <strong>TC-06 (应急保障车)</strong> 沿高德路线立即驻停至苏河湾大悦城东侧点位。
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-[#1a1c1b] text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      <strong>定向营销反制</strong>：向苏河湾网格 142 名在线食客定向空投 <strong>¥5 夜市狂欢立减券</strong>，提升下单转化率，阻断竞品低价分流。
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-[#1a1c1b] text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      <strong>区经理现场执纪</strong>：派发巡检工单至李明经理手机端，现场核查对手是否占道并维护摊位动线。
                    </span>
                  </li>
                </ul>
              </div>

              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setActiveStep('perceive')}
                  className="px-3.5 py-1.5 rounded-xl border border-[#e4e2dc] text-[#787770] hover:text-[#1a1c1b]"
                >
                  返回感知
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep('execute')}
                  className="px-4 py-2 rounded-xl bg-[#1a1c1b] hover:bg-black text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  进入执行指令下发
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* 阶段 3：多端闭环执行 */}
          {activeStep === 'execute' && (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-xl bg-white border border-[#e4e2dc] shadow-2xs">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-sm text-[#1a1c1b] flex items-center gap-1.5">
                    <Send className="w-4 h-4 text-[#1a1c1b]" />
                    待下发执行指令清单 (一键多端协同)
                  </h4>
                  <span className="text-[11px] text-[#787770]">就绪状态 · 支持实时全链路触发</span>
                </div>

                <div className="flex flex-col gap-2.5">
                  <div className="p-3 rounded-xl bg-[#f9f9f7] border border-[#e4e2dc] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Truck className="w-5 h-5 text-[#1a1c1b]" />
                      <div>
                        <div className="font-bold text-[#1a1c1b]">指令 1：调度 TC-06 应急餐车</div>
                        <div className="text-[11px] text-[#787770]">目的地：苏河湾站桩点 · 预计 12 分钟抵达开工</div>
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded bg-white border border-[#e4e2dc] text-[10px] font-bold">
                      就绪
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#f9f9f7] border border-[#e4e2dc] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Ticket className="w-5 h-5 text-[#1a1c1b]" />
                      <div>
                        <div className="font-bold text-[#1a1c1b]">指令 2：定向发放 ¥5 营销补贴券</div>
                        <div className="text-[11px] text-[#787770]">受众：苏河湾网格 142 名在线食客 App 端</div>
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded bg-white border border-[#e4e2dc] text-[10px] font-bold">
                      就绪
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#f9f9f7] border border-[#e4e2dc] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <FileCheck className="w-5 h-5 text-[#1a1c1b]" />
                      <div>
                        <div className="font-bold text-[#1a1c1b]">指令 3：派发现场区经理巡检单</div>
                        <div className="text-[11px] text-[#787770]">责任人：区经理李明 · 现场秩序与竞品动态取证</div>
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded bg-white border border-[#e4e2dc] text-[10px] font-bold">
                      就绪
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#1a1c1b] text-white flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm">一键确认执行全流程闭环调度</div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    系统将通过高德地图同步导航路线并通知实体端
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleExecuteFullLoop}
                  disabled={isExecuting}
                  className="px-5 py-2.5 rounded-xl bg-white text-[#1a1c1b] hover:bg-neutral-100 font-bold cursor-pointer transition-all shadow-md flex items-center gap-1.5"
                >
                  {isExecuting ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      正在批量分发指令...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-[#1a1c1b]" />
                      立即执行
                    </>
                  )}
                </button>
              </div>

              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setActiveStep('judge')}
                  className="px-3.5 py-1.5 rounded-xl border border-[#e4e2dc] text-[#787770] hover:text-[#1a1c1b]"
                >
                  返回判断
                </button>
                {hasExecuted && (
                  <button
                    type="button"
                    onClick={() => setActiveStep('evolve')}
                    className="px-4 py-2 rounded-xl bg-[#1a1c1b] hover:bg-black text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    查看持续迭代复盘
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 阶段 4：持续学习迭代 */}
          {activeStep === 'evolve' && (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-xl bg-white border border-[#e4e2dc] shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-sm text-[#1a1c1b] flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-[#1a1c1b]" />
                    闭环执行效果与 SLA 达成对比
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-[#f4f4f2] text-[#1a1c1b] text-[10px] font-mono font-bold border border-[#e4e2dc]">
                    执行成功 · 真实回溯
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 my-2">
                  <div className="p-3 rounded-xl bg-[#f9f9f7] border border-[#e4e2dc]">
                    <div className="text-[11px] text-[#787770]">履约 SLA 达标率</div>
                    <div className="font-bold text-base text-[#1a1c1b] mt-0.5">81.4% → 96.8%</div>
                    <div className="text-[10px] text-[#1a1c1b] font-bold">▲ 提升 +15.4%</div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#f9f9f7] border border-[#e4e2dc]">
                    <div className="text-[11px] text-[#787770]">平均出餐等待</div>
                    <div className="font-bold text-base text-[#1a1c1b] mt-0.5">28.5m → 9.2m</div>
                    <div className="text-[10px] text-[#1a1c1b] font-bold">▼ 缩短 19.3 分钟</div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#f9f9f7] border border-[#e4e2dc]">
                    <div className="text-[11px] text-[#787770]">竞品拦截防御率</div>
                    <div className="font-bold text-base text-[#1a1c1b] mt-0.5">84.2%</div>
                    <div className="text-[10px] text-[#1a1c1b] font-bold">成功留存 120+ 客单</div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#e4e2dc] shadow-2xs">
                <h4 className="font-bold text-sm text-[#1a1c1b] mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#1a1c1b]" />
                  持续迭代与算法自进化记录 (Continuous Evolution)
                </h4>
                <div className="flex flex-col gap-2 text-[#474741]">
                  <div className="p-2.5 rounded-lg bg-[#f9f9f7] border border-[#e4e2dc] flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#1a1c1b] mt-1.5 shrink-0" />
                    <div>
                      <strong className="text-[#1a1c1b]">时空热点自适应校准：</strong>
                      系统已将苏河湾商圈周五 17:00 运力预警临界值下调 15%，下次将提前 30 分钟预调餐车。
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#f9f9f7] border border-[#e4e2dc] flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#1a1c1b] mt-1.5 shrink-0" />
                    <div>
                      <strong className="text-[#1a1c1b]">高德算路避堵强化：</strong>
                      自动将西藏北路拥堵路段权重提高，后续调配骑手与餐车将自动绕行海宁路隧道。
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#f9f9f7] border border-[#e4e2dc] flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#1a1c1b] mt-1.5 shrink-0" />
                    <div>
                      <strong className="text-[#1a1c1b]">沉淀 SOP 应急策略：</strong>
                      形成《苏河湾夜市流动餐车应急分流与竞品拦截标准操作指南 v2.4》。
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-[#1a1c1b] hover:bg-black text-white font-bold cursor-pointer shadow-xs"
                >
                  完成并返回大屏中枢
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
