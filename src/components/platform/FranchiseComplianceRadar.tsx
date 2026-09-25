/**
 * Urban Radar 流动餐车 GPS 极速专送平台 - 加盟商违规脱圈与品控合规雷达 (Franchise Compliance Radar)
 * 具备：围栏脱圈违规越界列表与热力回放、私采黑料/私调价格智能监测、一键限流/冻结/罚款处置台
 */

import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Navigation,
  DollarSign,
  FileWarning,
  Lock,
  Unlock,
  RotateCcw,
  CheckCircle2,
  Sliders,
  Eye,
  ArrowRight
} from 'lucide-react';

interface ComplianceBreachRecord {
  id: string;
  truckId: string;
  truckName: string;
  breachType: 'GEOFENCE_DRIFT' | 'PRICE_TAMPER' | 'BOM_ANOMALY' | 'FOOD_SAFETY_EXPIRY';
  level: 'medium' | 'high' | 'critical';
  title: string;
  details: string;
  occurredAt: string;
  currentStatus: 'pending_penalty' | 'penalized' | 'appealed' | 'rectified';
  penaltyApplied?: string;
}

const INITIAL_BREACH_RECORDS: ComplianceBreachRecord[] = [
  {
    id: 'BREACH-901',
    truckId: 'truck-03',
    truckName: '黑曜石 03 号流动餐车 (新天地)',
    breachType: 'GEOFENCE_DRIFT',
    level: 'high',
    title: '脱圈移位违章摆摊',
    details: '定位显示该车偏离许可驻点 720 米，持续外摆超 45 分钟，违反静安城管特许点位备案协议。',
    occurredAt: '今日 11:24',
    currentStatus: 'pending_penalty'
  },
  {
    id: 'BREACH-902',
    truckId: 'truck-02',
    truckName: '黑曜石 02 号流动餐车 (陆家嘴)',
    breachType: 'PRICE_TAMPER',
    level: 'medium',
    title: '擅自上调核心爆品价格',
    details: '店长在收银台将总部统一指导价 ¥188 的「极炙炭烤和牛排」擅自修改为 ¥218，破坏全网品牌信誉。',
    occurredAt: '今日 10:15',
    currentStatus: 'penalized',
    penaltyApplied: '已自动执行强力配方锁，回滚价格并扣除诚信分 5 分'
  },
  {
    id: 'BREACH-903',
    truckId: 'truck-05',
    truckName: '黑曜石 05 号流动餐车 (静安寺)',
    breachType: 'BOM_ANOMALY',
    level: 'critical',
    title: '私采未经总部质检羊肉串 (疑似黑料)',
    details: '连续 5 天未在平台中心供应链下发牛羊肉采购订单，但前台日均售卖羊肉串超 80 串，触发严重品控红线！',
    occurredAt: '昨日 18:40',
    currentStatus: 'pending_penalty'
  }
];

interface FranchiseComplianceRadarProps {
  showToast: (msg: string) => void;
}

export const FranchiseComplianceRadar: React.FC<FranchiseComplianceRadarProps> = ({
  showToast
}) => {
  const [records, setRecords] = useState<ComplianceBreachRecord[]>(INITIAL_BREACH_RECORDS);
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<ComplianceBreachRecord | null>(null);

  const handleApplyPenalty = (recordId: string, actionType: 'fine' | 'freeze_pos' | 'pause_dispatch') => {
    setRecords((prev) =>
      prev.map((rec) => {
        if (rec.id === recordId) {
          let actionText = '';
          if (actionType === 'fine') actionText = '下发违规罚单 ¥500 并从当月分账直接冲扣';
          else if (actionType === 'freeze_pos') actionText = '强制锁定车载 POS 工作台，责令立即整改';
          else actionText = '暂停线上专送接单 24 小时，服务半径收缩至 0km';

          showToast(`【平台风控处置】已对 ${rec.truckName} 执行处置：${actionText}`);
          return {
            ...rec,
            currentStatus: 'penalized',
            penaltyApplied: actionText
          };
        }
        return rec;
      })
    );
  };

  const handlePardonRecord = (recordId: string) => {
    setRecords((prev) =>
      prev.map((rec) => {
        if (rec.id === recordId) {
          showToast(`已将违规单据 ${rec.id} 标记为整改完毕并复核通过`);
          return {
            ...rec,
            currentStatus: 'rectified',
            penaltyApplied: '加盟商已提交现场整改照片并复核合规'
          };
        }
        return rec;
      })
    );
  };

  const filteredRecords = records.filter((r) => {
    if (filterType === 'all') return true;
    return r.breachType === filterType;
  });

  return (
    <div className="space-y-4">
      {/* 顶部风控概况 */}
      <div className="bg-white border border-[#e3e2e0] rounded-xl p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1a1a17]">
                加盟商违规脱圈与品控合规雷达
              </h2>
              <p className="text-xs text-[#787774]">
                基于物理电子围栏、BOM 原料采销对账与指导价强锁定进行 24 小时合规审计
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
              待处置严重违规: {records.filter((r) => r.currentStatus === 'pending_penalty').length} 起
            </span>
          </div>
        </div>

        {/* 筛选分类 */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#f1f1ef] overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
              filterType === 'all' ? 'bg-[#37352f] text-white' : 'text-[#787774] hover:bg-[#f7f7f5]'
            }`}
          >
            全部违规
          </button>
          <button
            type="button"
            onClick={() => setFilterType('GEOFENCE_DRIFT')}
            className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
              filterType === 'GEOFENCE_DRIFT' ? 'bg-[#37352f] text-white' : 'text-[#787774] hover:bg-[#f7f7f5]'
            }`}
          >
            脱圈违章摆摊
          </button>
          <button
            type="button"
            onClick={() => setFilterType('BOM_ANOMALY')}
            className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
              filterType === 'BOM_ANOMALY' ? 'bg-[#37352f] text-white' : 'text-[#787774] hover:bg-[#f7f7f5]'
            }`}
          >
            私采原料黑料
          </button>
          <button
            type="button"
            onClick={() => setFilterType('PRICE_TAMPER')}
            className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
              filterType === 'PRICE_TAMPER' ? 'bg-[#37352f] text-white' : 'text-[#787774] hover:bg-[#f7f7f5]'
            }`}
          >
            擅自私调价格
          </button>
        </div>
      </div>

      {/* 违规列表 */}
      <div className="grid grid-cols-1 gap-3">
        {filteredRecords.map((record) => (
          <div
            key={record.id}
            className={`bg-white border rounded-xl p-4 shadow-2xs space-y-3 transition-all ${
              record.level === 'critical' ? 'border-red-300' : 'border-[#e3e2e0]'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    record.level === 'critical'
                      ? 'bg-red-500 text-white'
                      : record.level === 'high'
                      ? 'bg-orange-500 text-white'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {record.level === 'critical' ? '红线告警' : record.level === 'high' ? '严重违章' : '中度预警'}
                </span>
                <span className="font-mono text-xs font-bold text-[#1a1a17]">{record.id}</span>
                <h3 className="text-sm font-bold text-[#1a1a17]">{record.title}</h3>
                <span className="text-xs text-[#787774]">· {record.truckName}</span>
              </div>
              <span className="text-xs text-[#787774] font-mono">{record.occurredAt}</span>
            </div>

            <p className="text-xs text-[#5a5854] bg-[#fbfbfa] p-3 rounded-lg border border-[#ecebe8]">
              {record.details}
            </p>

            {record.penaltyApplied && (
              <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>处置已生效：{record.penaltyApplied}</span>
              </div>
            )}

            {record.currentStatus === 'pending_penalty' && (
              <div className="pt-2 border-t border-[#f1f1ef] flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs text-[#787774]">选择平台合规处置手段：</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleApplyPenalty(record.id, 'fine')}
                    className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer"
                  >
                    下发扣款罚单 (¥500)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPenalty(record.id, 'pause_dispatch')}
                    className="px-2.5 py-1 rounded bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold cursor-pointer"
                  >
                    熔断暂停专送接单
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPenalty(record.id, 'freeze_pos')}
                    className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
                  >
                    强制锁定 POS 终端
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePardonRecord(record.id)}
                    className="px-2.5 py-1 rounded bg-white hover:bg-[#f7f7f5] border border-[#d3d1cb] text-xs font-semibold text-[#37352f] cursor-pointer"
                  >
                    现场整改复核放行
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
