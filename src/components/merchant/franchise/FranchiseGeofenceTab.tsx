import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Compass,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  FileCheck,
  Check,
  CheckCircle2,
  X,
  Clock,
  Plus,
  Radio,
  Sliders,
  Sparkles,
  Search,
  ChevronRight
} from 'lucide-react';
import {
  globalFranchiseGeofenceEngine,
  FRANCHISE_GEOFENCE_EVENT
} from '../../../utils/franchiseGeofenceEngine';
import {
  FranchiseGeofenceConfig,
  TemporaryDispatchPermit,
  GeofenceInspectionStatus,
  FranchiseTenantContext
} from '../../../types/franchise';

interface FranchiseGeofenceTabProps {
  context: FranchiseTenantContext;
  showToast: (msg: string) => void;
}

export const FranchiseGeofenceTab: React.FC<FranchiseGeofenceTabProps> = ({ context, showToast }) => {
  const [selectedFranchiseeId, setSelectedFranchiseeId] = useState<string>(
    context.isHqUser ? 'all' : context.currentFranchiseeId
  );
  const [configs, setConfigs] = useState<FranchiseGeofenceConfig[]>(() =>
    globalFranchiseGeofenceEngine.getConfigs()
  );
  const [permits, setPermits] = useState<TemporaryDispatchPermit[]>(() =>
    globalFranchiseGeofenceEngine.getPermits(
      selectedFranchiseeId === 'all' ? undefined : selectedFranchiseeId
    )
  );

  const [activeSubView, setActiveSubView] = useState<'status' | 'permits' | 'new_permit'>('status');

  // Simulated live inspection
  const [simulatedTruckId, setSimulatedTruckId] = useState<string>('truck-01');
  const [simulatedLat, setSimulatedLat] = useState<number>(31.2425);
  const [simulatedLng, setSimulatedLng] = useState<number>(121.4695);
  const [simulatedLocName, setSimulatedLocName] = useState<string>('静安大悦城摩天轮广场');

  const [inspectionResult, setInspectionResult] = useState<GeofenceInspectionStatus>(() =>
    globalFranchiseGeofenceEngine.inspectTruckLocation(
      simulatedTruckId,
      simulatedLat,
      simulatedLng,
      simulatedLocName
    )
  );

  // New Permit Form State
  const [permitTruckId, setPermitTruckId] = useState('truck-01');
  const [permitFranId, setPermitFranId] = useState('FRAN-SH-001');
  const [eventName, setEventName] = useState('2026 外滩潮玩电音节餐饮快闪专位');
  const [targetLocationName, setTargetLocationName] = useState('上海市黄浦区中山东一路外滩广场');
  const [targetLat, setTargetLat] = useState('31.2380');
  const [targetLng, setTargetLng] = useState('121.4920');
  const [allowedRadiusKm, setAllowedRadiusKm] = useState('1.5');
  const [startTime, setStartTime] = useState('2026-09-15 11:00');
  const [endTime, setEndTime] = useState('2026-09-17 22:00');
  const [reason, setReason] = useState('获得主办方特邀出展餐饮保供资格，已通过文旅与城管临时报备');
  const [estimatedRevenue, setEstimatedRevenue] = useState('35000');

  useEffect(() => {
    const handleUpdate = () => {
      setConfigs(globalFranchiseGeofenceEngine.getConfigs());
      setPermits(
        globalFranchiseGeofenceEngine.getPermits(
          selectedFranchiseeId === 'all' ? undefined : selectedFranchiseeId
        )
      );
    };

    window.addEventListener(FRANCHISE_GEOFENCE_EVENT, handleUpdate);
    return () => window.removeEventListener(FRANCHISE_GEOFENCE_EVENT, handleUpdate);
  }, [selectedFranchiseeId]);

  const handleRunInspection = () => {
    const result = globalFranchiseGeofenceEngine.inspectTruckLocation(
      simulatedTruckId,
      simulatedLat,
      simulatedLng,
      simulatedLocName
    );
    setInspectionResult(result);
    showToast(`餐车 ${simulatedTruckId} 电子围栏实时合规核查已完成`);
  };

  const handleReviewPermit = (permitId: string, approved: boolean) => {
    globalFranchiseGeofenceEngine.reviewPermit(
      permitId,
      approved,
      approved ? '材料齐全，特批跨区出摊' : '活动场地不具备保供资格，驳回',
      '总部营运总监 · 陆明远'
    );
    setPermits(
      globalFranchiseGeofenceEngine.getPermits(
        selectedFranchiseeId === 'all' ? undefined : selectedFranchiseeId
      )
    );
    showToast(approved ? '特批出摊申请已核准放行！' : '特批出摊申请已被驳回');
  };

  const handleSubmitPermit = (e: React.FormEvent) => {
    e.preventDefault();
    const franNames: Record<string, string> = {
      'FRAN-SH-001': '黑曜石流动餐车 · 静安卓越分部',
      'FRAN-SH-002': '黑曜石流动餐车 · 浦东潮玩特许部',
      'FRAN-SH-003': '黑曜石流动餐车 · 徐汇西岸艺术驿站'
    };

    globalFranchiseGeofenceEngine.submitTemporaryPermit({
      franchiseeId: permitFranId,
      franchiseeName: franNames[permitFranId] || '特许分舵',
      truckId: permitTruckId,
      eventName,
      targetLocationName,
      targetLat: parseFloat(targetLat) || 31.24,
      targetLng: parseFloat(targetLng) || 121.48,
      allowedRadiusKm: parseFloat(allowedRadiusKm) || 1.5,
      startTime,
      endTime,
      reason,
      estimatedRevenue: parseFloat(estimatedRevenue) || 0
    });

    setActiveSubView('permits');
    showToast('跨区出摊特批申请已上报总部运营中台，等待审核');
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900 text-white p-3.5 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500/20 text-blue-400 border border-blue-400/30 flex items-center justify-center font-bold">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold tracking-tight">电子围栏营运合规与特批跨区出摊</h4>
              <span className="text-[10px] px-1.5 py-0.5 bg-blue-400/20 text-blue-300 font-mono">
                Geofence & Dispatch
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              精准网格授权半径 · 越界违规即时拦截 · 音乐节/市集出摊联合报备
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubView('new_permit')}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>申请跨区特批出摊</span>
          </button>
        </div>
      </div>

      {/* 2. Sub Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-semibold bg-slate-50">
        <button
          type="button"
          onClick={() => setActiveSubView('status')}
          className={`py-2 px-4 border-b-2 cursor-pointer transition-colors ${
            activeSubView === 'status'
              ? 'border-blue-600 bg-white text-blue-900'
              : 'border-transparent text-slate-600 hover:bg-slate-100'
          }`}
        >
          餐车围栏监控与实时合规核验
        </button>
        <button
          type="button"
          onClick={() => setActiveSubView('permits')}
          className={`py-2 px-4 border-b-2 cursor-pointer transition-colors ${
            activeSubView === 'permits'
              ? 'border-blue-600 bg-white text-blue-900'
              : 'border-transparent text-slate-600 hover:bg-slate-100'
          }`}
        >
          临时出摊特批报备单 ({permits.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubView('new_permit')}
          className={`py-2 px-4 border-b-2 cursor-pointer transition-colors ${
            activeSubView === 'new_permit'
              ? 'border-blue-600 bg-white text-blue-900'
              : 'border-transparent text-slate-600 hover:bg-slate-100'
          }`}
        >
          填写报备申请
        </button>
      </div>

      {/* SUBVIEW 1: Live Simulation & Status */}
      {activeSubView === 'status' && (
        <div className="space-y-4">
          {/* Quick Inspection Simulator Box */}
          <div className="bg-white border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-blue-600" />
                <span>实时车载 GPS 经纬度合规核验器</span>
              </h5>
              <button
                type="button"
                onClick={handleRunInspection}
                className="px-3 py-1 bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 cursor-pointer"
              >
                执行围栏比对
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-slate-500 block">核查餐车编号:</label>
                <select
                  value={simulatedTruckId}
                  onChange={(e) => setSimulatedTruckId(e.target.value)}
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-300"
                >
                  <option value="truck-01">truck-01 (静安卓越部)</option>
                  <option value="truck-02">truck-02 (静安卓越部)</option>
                  <option value="truck-03">truck-03 (浦东潮玩部)</option>
                  <option value="truck-04">truck-04 (徐汇西岸部)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-500 block">停靠点位名称:</label>
                <input
                  type="text"
                  value={simulatedLocName}
                  onChange={(e) => setSimulatedLocName(e.target.value)}
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-300"
                />
              </div>

              <div>
                <label className="text-slate-500 block">GPS 纬度 (Lat):</label>
                <input
                  type="number"
                  step="0.0001"
                  value={simulatedLat}
                  onChange={(e) => setSimulatedLat(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-500 block">GPS 经度 (Lng):</label>
                <input
                  type="number"
                  step="0.0001"
                  value={simulatedLng}
                  onChange={(e) => setSimulatedLng(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-300 font-mono"
                />
              </div>
            </div>

            {/* Inspection Outcome Alert */}
            <div
              className={`p-3 border flex items-start gap-3 ${
                inspectionResult.complianceStatus === 'in_bounds'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : inspectionResult.complianceStatus === 'temporary_permitted'
                  ? 'bg-blue-50 border-blue-200 text-blue-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="mt-0.5">
                {inspectionResult.complianceStatus === 'in_bounds' ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                ) : inspectionResult.complianceStatus === 'temporary_permitted' ? (
                  <FileCheck className="w-5 h-5 text-blue-600" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                )}
              </div>
              <div className="text-xs space-y-0.5">
                <div className="flex items-center gap-2">
                  <strong className="text-sm">
                    {inspectionResult.complianceStatus === 'in_bounds'
                      ? '在网格内合规营运'
                      : inspectionResult.complianceStatus === 'temporary_permitted'
                      ? '跨区出摊特批有效 (特许合法)'
                      : '疑似越界脱网经营！触碰电子围栏告警'}
                  </strong>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 bg-white/80 font-bold">
                    距网格中心 {inspectionResult.distanceToCenterKm} km
                  </span>
                </div>
                <p>
                  当前位置: <strong>{inspectionResult.currentLocationName}</strong> | 归属网格:{' '}
                  {inspectionResult.targetTerritoryName}
                </p>
                {inspectionResult.activePermitName && (
                  <p className="font-semibold text-blue-700">
                    生效特批令: {inspectionResult.activePermitName}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Grid Authorized Configs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {configs.map((cfg) => (
              <div key={cfg.franchiseeId} className="bg-white border border-slate-200 p-3.5 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-bold text-xs text-slate-900">{cfg.franchiseeName}</span>
                  <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 font-mono font-bold">
                    半径 {cfg.radiusKm} km
                  </span>
                </div>
                <div className="text-xs space-y-1 text-slate-600">
                  <p className="font-semibold text-slate-800">{cfg.authorizedTerritoryName}</p>
                  <p className="text-[11px] text-slate-500">
                    授权车牌: <span className="font-mono text-indigo-700">{cfg.assignedTruckIds.join(', ')}</span>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    中心坐标: <span className="font-mono">{cfg.centerLat}, {cfg.centerLng}</span>
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <span className="text-[10px] text-slate-400 font-medium block">准入核心点位:</span>
                  {cfg.allowedGridPoints.map((pt, i) => (
                    <div key={i} className="flex items-center justify-between text-[11px] text-slate-700">
                      <span>• {pt.name}</span>
                      <span className="text-[9px] px-1 bg-slate-100 text-slate-600">{pt.tag}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBVIEW 2: Temporary Permits List */}
      {activeSubView === 'permits' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3">
            {permits.map((p) => (
              <div key={p.id} className="bg-white border border-slate-200 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900">{p.eventName}</h4>
                      <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 font-mono font-semibold">
                        {p.truckId}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      报备加盟商: {p.franchiseeName} · 单号: <span className="font-mono">{p.id}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {p.status === 'approved' && (
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        已审批通过
                      </span>
                    )}
                    {p.status === 'pending' && (
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-bold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        等待总部审核
                      </span>
                    )}
                    {p.status === 'rejected' && (
                      <span className="px-2.5 py-1 bg-rose-100 text-rose-800 text-xs font-bold flex items-center gap-1">
                        <X className="w-3.5 h-3.5 text-rose-600" />
                        已驳回
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-slate-50 p-2.5">
                  <div>
                    <span className="text-slate-400 block text-[10px]">出摊目标地址:</span>
                    <strong className="text-slate-800">{p.targetLocationName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">特批营运时间窗:</span>
                    <strong className="text-slate-800">{p.startTime} 至 {p.endTime}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">预估出摊营业额:</span>
                    <strong className="text-emerald-700 font-mono font-black">¥{p.estimatedRevenue.toLocaleString()}</strong>
                  </div>
                </div>

                <div className="text-xs text-slate-600">
                  <span>申请理由: </span>
                  <span>{p.reason}</span>
                </div>

                {p.reviewNote && (
                  <p className="text-xs text-blue-700 bg-blue-50 p-2 border border-blue-100 font-medium">
                    审批意见: {p.reviewNote} ({p.reviewedBy} · {p.reviewedAt})
                  </p>
                )}

                {context.isHqUser && p.status === 'pending' && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleReviewPermit(p.id, false)}
                      className="px-3 py-1.5 bg-rose-50 text-rose-700 text-xs cursor-pointer border border-rose-200"
                    >
                      驳回申请
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReviewPermit(p.id, true)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                    >
                      核准特批出摊
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBVIEW 3: New Permit Form */}
      {activeSubView === 'new_permit' && (
        <form onSubmit={handleSubmitPermit} className="bg-white border border-slate-200 p-4 space-y-3 text-xs">
          <h4 className="font-bold text-sm text-slate-900 border-b border-slate-200 pb-2">
            提交跨区出摊 / 临时快闪活动特批报备单
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-600 font-medium block">申报特许分舵:</label>
              <select
                value={permitFranId}
                onChange={(e) => setPermitFranId(e.target.value)}
                className="w-full mt-1 p-2 bg-slate-50 border border-slate-300"
              >
                <option value="FRAN-SH-001">静安卓越分部 (FRAN-SH-001)</option>
                <option value="FRAN-SH-002">浦东潮玩特许部 (FRAN-SH-002)</option>
                <option value="FRAN-SH-003">徐汇西岸艺术驿站 (FRAN-SH-003)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-600 font-medium block">拟派流动餐车:</label>
              <input
                type="text"
                value={permitTruckId}
                onChange={(e) => setPermitTruckId(e.target.value)}
                className="w-full mt-1 p-2 bg-slate-50 border border-slate-300 font-mono"
              />
            </div>

            <div>
              <label className="text-slate-600 font-medium block">活动 / 赛事名称:</label>
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className="w-full mt-1 p-2 bg-slate-50 border border-slate-300 font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-600 font-medium block">目标场地详细地址:</label>
              <input
                type="text"
                value={targetLocationName}
                onChange={(e) => setTargetLocationName(e.target.value)}
                className="w-full mt-1 p-2 bg-slate-50 border border-slate-300"
              />
            </div>

            <div>
              <label className="text-slate-600 font-medium block">特批活动开始时间:</label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full mt-1 p-2 bg-slate-50 border border-slate-300 font-mono"
              />
            </div>

            <div>
              <label className="text-slate-600 font-medium block">特批活动结束时间:</label>
              <input
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full mt-1 p-2 bg-slate-50 border border-slate-300 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-600 font-medium block">特批允许活动半径 (km):</label>
              <input
                type="number"
                step="0.1"
                value={allowedRadiusKm}
                onChange={(e) => setAllowedRadiusKm(e.target.value)}
                className="w-full mt-1 p-2 bg-slate-50 border border-slate-300 font-mono"
              />
            </div>

            <div>
              <label className="text-slate-600 font-medium block">预估营业额 (元):</label>
              <input
                type="number"
                value={estimatedRevenue}
                onChange={(e) => setEstimatedRevenue(e.target.value)}
                className="w-full mt-1 p-2 bg-slate-50 border border-slate-300 font-mono"
              />
            </div>

            <div>
              <label className="text-slate-600 font-medium block">报备事由说明:</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full mt-1 p-2 bg-slate-50 border border-slate-300"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setActiveSubView('permits')}
              className="px-4 py-2 bg-slate-100 text-slate-700 text-xs cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-xs"
            >
              确认提交报备
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
