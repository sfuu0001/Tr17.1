import React, { useState, useMemo } from 'react';
import {
  FileText,
  Shield,
  Wifi,
  WifiOff,
  RotateCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowRight,
  Database,
  Layers,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { AuditLogItem, OutboxItem } from '../../types';
import { INITIAL_AUDIT_LOGS, INITIAL_OUTBOX_ITEMS } from '../../data/mockEnhancedData';
import { safeGetStorage, safeSetStorage } from '../../utils/safeStorage';
import { DateRangeFilter } from '../common/DateRangeFilter';
import { DateFilterState, resolveDateRange, isWithinRange } from '../../utils/dateFilter';
import { HeatmapGridMatrix, HeatmapDataPoint } from '../common/HeatmapGridMatrix';

const OUTBOX_STORAGE_KEY = 'obsidian_audit_outbox';

interface MerchantAuditLogProps {
  showToast: (msg: string) => void;
}

export const MerchantAuditLog: React.FC<MerchantAuditLogProps> = ({ showToast }) => {
  const [activeTab, setActiveTab] = useState<'audit' | 'outbox'>('audit');
  const [logs, setLogs] = useState<AuditLogItem[]>(INITIAL_AUDIT_LOGS);
  const [outbox, setOutbox] = useState<OutboxItem[]>(
    safeGetStorage<OutboxItem[]>(OUTBOX_STORAGE_KEY, INITIAL_OUTBOX_ITEMS)
  );
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterAction, setFilterAction] = useState<string>('all');
  // 时间区间筛选（日志 timestamp: 'YYYY-MM-DD HH:mm:ss'）
  const [dateFilter, setDateFilter] = useState<DateFilterState>({ preset: 'all' });
  const dateRange = useMemo(() => resolveDateRange(dateFilter), [dateFilter]);

  // Trigger Outbox Sync
  const handleSyncOutbox = () => {
    if (!isOnline) {
      showToast('当前处于离线模式，无法同步至云端。请先连接网络！');
      return;
    }

    setOutbox((prev) => {
      const synced = prev.map((item) => ({ ...item, status: 'synced' as const }));
      safeSetStorage(OUTBOX_STORAGE_KEY, synced);
      return synced;
    });
    showToast('离线外发队列已全部重放同步至腾讯云 CloudBase！');
  };

  const filteredLogs = useMemo(() => logs.filter((log) => {
    if (!isWithinRange(new Date(log.timestamp).getTime(), dateRange)) return false;
    const matchAction = filterAction === 'all' || log.actionType === filterAction;
    const matchSearch =
      log.operator.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.targetModule.toLowerCase().includes(searchQuery.toLowerCase());
    return matchAction && matchSearch;
  }), [logs, filterAction, searchQuery, dateRange]);

  // 42 天核心操作风控审计打卡热力数据
  const auditHeatmapData: HeatmapDataPoint[] = useMemo(() => {
    const map = new Map<string, { total: number; deletes: number; updates: number; auths: number }>();
    logs.forEach((log) => {
      const dStr = new Date(log.timestamp.replace(' ', 'T')).toISOString().slice(0, 10);
      const cur = map.get(dStr) || { total: 0, deletes: 0, updates: 0, auths: 0 };
      cur.total += 1;
      if (log.actionType === 'delete') cur.deletes += 1;
      else if (log.actionType === 'update') cur.updates += 1;
      else if (log.actionType === 'auth') cur.auths += 1;
      map.set(dStr, cur);
    });

    const today = new Date();
    for (let i = 0; i < 42; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dStr = d.toISOString().slice(0, 10);
      if (!map.has(dStr)) {
        const routineCount = (i % 6 === 0) ? 2 : ((i % 11 === 0) ? 4 : 0);
        map.set(dStr, {
          total: routineCount,
          deletes: (i % 11 === 0) ? 1 : 0,
          updates: routineCount > 0 ? routineCount - 1 : 0,
          auths: 0
        });
      }
    }

    const list: HeatmapDataPoint[] = [];
    map.forEach((val, dStr) => {
      const isHighRisk = val.deletes > 0 || val.total >= 4;
      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (val.total === 0) level = 0;
      else if (val.total <= 2 && val.deletes === 0) level = 1;
      else if (val.total <= 4) level = 2;
      else if (val.total <= 7) level = 3;
      else level = 4;

      list.push({
        date: dStr,
        value: val.total,
        level,
        title: `${val.total}次操作审计`,
        extraNote: val.deletes > 0 ? `含${val.deletes}次删单/退菜` : (val.total === 0 ? '全天零异常' : '常规参数更正'),
        status: isHighRisk ? 'warning' : 'normal',
        metrics: [
          { label: '审计条目', value: `${val.total} 笔` },
          { label: '删退高危', value: `${val.deletes} 笔` }
        ]
      });
    });
    return list;
  }, [logs]);

  // 42 天离线外发队列打卡热力数据
  const outboxHeatmapData: HeatmapDataPoint[] = useMemo(() => {
    const map = new Map<string, { total: number; sent: number; pending: number }>();
    outbox.forEach((item) => {
      const dStr = new Date(item.createdAt).toISOString().slice(0, 10);
      const cur = map.get(dStr) || { total: 0, sent: 0, pending: 0 };
      cur.total += 1;
      if (item.status === 'sent') cur.sent += 1;
      else cur.pending += 1;
      map.set(dStr, cur);
    });

    const today = new Date();
    for (let i = 0; i < 42; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dStr = d.toISOString().slice(0, 10);
      if (!map.has(dStr)) {
        const queueCount = (i % 5 === 0) ? 3 : ((i % 9 === 0) ? 6 : 0);
        map.set(dStr, {
          total: queueCount,
          sent: queueCount,
          pending: 0
        });
      }
    }

    const list: HeatmapDataPoint[] = [];
    map.forEach((val, dStr) => {
      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (val.total === 0) level = 0;
      else if (val.total <= 2) level = 1;
      else if (val.total <= 4) level = 2;
      else if (val.total <= 7) level = 3;
      else level = 4;

      list.push({
        date: dStr,
        value: val.total,
        level,
        title: `${val.total}条外发队列`,
        extraNote: val.pending > 0 ? `${val.pending}条待重放` : '全部入库已确认',
        status: val.pending > 0 ? 'alert' : 'success',
        metrics: [
          { label: '队列总量', value: `${val.total} 条` },
          { label: '待发待传', value: `${val.pending} 条` }
        ]
      });
    });
    return list;
  }, [outbox]);

  return (
    <div className="space-y-4 text-xs">
      {/* 1. Top Online Status & Outbox Summary Banner */}
      <div className="bg-white p-3 rounded-[3px] border border-[#e6e6e4] flex items-center justify-between gap-3 flex-wrap shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-[3px] flex items-center justify-center font-medium ${
              isOnline ? 'bg-[#edf3ec] text-[#2b593f]' : 'bg-[#fff7ed] text-[#ea580c]'
            }`}
          >
            {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm text-[#37352f]">
                {isOnline ? 'CloudBase 云端实时在线 (Online)' : '离线韧性工作模式 (Offline Outbox)'}
              </h4>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded border font-medium ${
                  isOnline
                    ? 'bg-[#edf3ec] text-[#2b593f] border-[#c4dcbc]'
                    : 'bg-[#fff7ed] text-[#ea580c] border-[#fed7aa]'
                }`}
              >
                {isOnline ? '5G 专线畅通' : '本地优先暂存'}
              </span>
            </div>
            <p className="text-[11px] text-[#787774] font-normal">
              所有改价、作废、折扣、配方修改均记录前后值快照 · 离线操作秒级重放
            </p>
          </div>
        </div>

        {/* Network Toggle and Replay Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsOnline(!isOnline);
              showToast(
                !isOnline
                  ? '已切换为在线模式！已联通腾讯云数据库'
                  : '已模拟离线网络！本地操作将自动压入 Outbox 外发队列'
              );
            }}
            className="px-3 py-1.5 bg-[#f1f1ef] hover:bg-[#e8e8e6] text-[#37352f] rounded-[3px] font-medium text-xs transition-all cursor-pointer border border-[#d3d1cb]"
          >
            切换为 {isOnline ? '离线模拟' : '恢复在线'}
          </button>

          <button
            type="button"
            onClick={handleSyncOutbox}
            className="px-3.5 py-1.5 bg-[#2b593f] hover:bg-[#204430] text-white rounded-[3px] font-medium text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-98"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>重放同步队列 ({outbox.filter((o) => o.status === 'queued').length})</span>
          </button>
        </div>
      </div>

      {/* 核心操作风控与外发热力矩阵 */}
      <HeatmapGridMatrix
        id="audit-trail-heatmap"
        title={activeTab === 'audit' ? "关键操作风控审计打卡热力" : "离线队列与云端同步心跳热力"}
        subtitle={activeTab === 'audit' ? "监控改价、删单、退菜、配方调参等敏感操作分布频次，点击方格可直接下钻" : "透视离线断网缓存写入与云端数据库重放回放频次"}
        theme={activeTab === 'audit' ? "risk_red" : "blue"}
        daysCount={42}
        data={activeTab === 'audit' ? auditHeatmapData : outboxHeatmapData}
        metricUnit={activeTab === 'audit' ? "次" : "条"}
        selectedDate={dateFilter.preset === 'custom' && dateFilter.customStart ? dateFilter.customStart.slice(0, 10) : null}
        onSelectDate={(dStr) => {
          setDateFilter({
            preset: 'custom',
            customStart: `${dStr}T00:00`,
            customEnd: `${dStr}T23:59`
          });
          showToast(`已下钻筛选 ${dStr} 的${activeTab === 'audit' ? '操作审计日志' : '队列状态'}`);
        }}
        legendLabels={activeTab === 'audit' ? ['零审计', '偶发更正', '中频关注', '密集风控', '高危删改'] : ['队列为空', '轻量同步', '稳定入库', '峰值暂存', '批量重放']}
      />

      {/* 2. Sub-tab Controller */}
      <div className="bg-white p-2.5 rounded-[3px] border border-[#e6e6e4] flex items-center justify-between gap-2 flex-wrap shadow-2xs">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-[3px] font-medium text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'bg-[#37352f] text-white shadow-xs'
                : 'bg-[#f1f1ef] text-[#5a5854] hover:bg-[#e8e8e6]'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-[#2b593f]" />
            <span>核心操作审计日志 (Audit Trail)</span>
            <span className="font-mono text-[10px] bg-black/20 px-1 rounded">
              {logs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('outbox')}
            className={`px-3 py-1.5 rounded-[3px] font-medium text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'outbox'
                ? 'bg-[#37352f] text-white shadow-xs'
                : 'bg-[#f1f1ef] text-[#5a5854] hover:bg-[#e8e8e6]'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-[#1c5598]" />
            <span>离线外发队列状态 (wm_cloud_outbox)</span>
            <span className="font-mono text-[10px] bg-black/20 px-1 rounded">
              {outbox.length}
            </span>
          </button>
        </div>

        {/* Action Type Filter (for audit) */}
        {activeTab === 'audit' && (
          <div className="flex items-center gap-1">
            <DateRangeFilter value={dateFilter} onChange={setDateFilter} compact className="mr-1" />
            {[
              { id: 'all', label: '全部' },
              { id: 'delete', label: '删单/退菜' },
              { id: 'update', label: '改价/改参数' },
              { id: 'auth', label: '主管授权' },
              { id: 'lock', label: '打烊锁账' }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterAction(f.id)}
                className={`px-2 py-0.5 rounded-[2px] text-[11px] font-medium cursor-pointer ${
                  filterAction === f.id
                    ? 'bg-[#37352f] text-white'
                    : 'bg-[#efefed] text-[#5a5854] hover:bg-[#e6e6e4]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Audit Logs Timeline / Table View */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-[3px] border border-[#e6e6e4] overflow-hidden shadow-2xs">
          <div className="p-3 bg-[#f7f7f5] border-b border-[#e6e6e4] flex items-center justify-between">
            <h4 className="font-semibold text-xs text-[#37352f] flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#2b593f]" />
              <span>关键动作前后值对比审计 (Audit Value Differentials)</span>
            </h4>
            <span className="text-[10px] text-[#787774] font-normal">不可篡改哈希存证 · 支持责任倒查</span>
          </div>

          <div className="divide-y divide-[#efefed]">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-3.5 hover:bg-[#fbfbfa] transition-colors space-y-2">
                {/* Header row */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-medium font-mono px-1.5 py-0.2 rounded border ${
                        log.actionType === 'delete'
                          ? 'bg-[#fde8e8] text-[#d44333] border-[#f8b4b4]'
                          : log.actionType === 'auth'
                          ? 'bg-[#fbf3db] text-[#8f6412] border-[#ecd9a8]'
                          : log.actionType === 'lock'
                          ? 'bg-[#edf3ec] text-[#2b593f] border-[#c4dcbc]'
                          : 'bg-[#eff6ff] text-[#1c5598] border-[#bfdbfe]'
                      }`}
                    >
                      {log.actionType.toUpperCase()}
                    </span>

                    <span className="font-medium text-xs text-[#37352f]">{log.targetModule}</span>
                    <span className="text-[11px] text-[#787774] font-normal">({log.targetItem})</span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-[#787774]">
                    <span className="flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-[#37352f]" />
                      <span className="text-[#37352f] font-medium">{log.operator}</span> <span className="font-normal">({log.role})</span>
                    </span>
                    <span className="font-mono font-normal text-[11px]">{log.timestamp}</span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-[#37352f] font-medium">{log.description}</p>

                {/* Before vs After comparison card */}
                {(log.beforeValue || log.afterValue) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-[#fef2f2] p-2 rounded-[3px] border border-[#fecaca] space-y-0.5">
                      <span className="text-[10px] font-medium text-[#b91c1c] block">
                        [修改前原始值 (Before)]
                      </span>
                      <p className="text-[#7f1d1d] font-mono text-[10.5px] leading-relaxed font-normal">
                        {log.beforeValue || '空'}
                      </p>
                    </div>

                    <div className="bg-[#ecfdf5] p-2 rounded-[3px] border border-[#a7f3d0] space-y-0.5">
                      <span className="text-[10px] font-medium text-[#047857] block">
                        [修改后最新值 (After)]
                      </span>
                      <p className="text-[#065f46] font-mono text-[10.5px] leading-relaxed font-normal">
                        {log.afterValue || '已生效'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Outbox List View */}
      {activeTab === 'outbox' && (
        <div className="bg-white rounded-[3px] border border-[#e6e6e4] overflow-hidden shadow-2xs">
          <div className="p-3 bg-[#f7f7f5] border-b border-[#e6e6e4] flex items-center justify-between">
            <h4 className="font-semibold text-xs text-[#37352f] flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-[#1c5598]" />
              <span>离线外发队列明细 (LocalStorage: wm_cloud_outbox)</span>
            </h4>
            <span className="text-[10px] text-[#787774] font-normal">签名内容哈希 · 保证数据不丢失</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e6e6e4] bg-[#fbfbfa] text-[#787774] text-[10.5px]">
                  <th className="p-2.5 font-medium">时间 / 队列项ID</th>
                  <th className="p-2.5 font-medium">动作类型 (Action)</th>
                  <th className="p-2.5 font-medium">目标云集合 (Target)</th>
                  <th className="p-2.5 font-medium">负载概要 (Payload)</th>
                  <th className="p-2.5 font-medium">数据签名 (Sign)</th>
                  <th className="p-2.5 font-medium">同步状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#efefed]">
                {outbox.map((ob) => (
                  <tr key={ob.id} className="hover:bg-[#fbfbfa] transition-colors">
                    <td className="p-2.5">
                      <span className="font-mono font-medium text-xs text-[#37352f] block">{ob.id}</span>
                      <span className="text-[10px] text-[#787774] font-normal">{ob.timestamp}</span>
                    </td>

                    <td className="p-2.5 font-mono font-medium text-xs text-[#37352f]">
                      {ob.action}
                    </td>

                    <td className="p-2.5 font-mono text-xs text-[#1c5598] font-normal">
                      {ob.target}
                    </td>

                    <td className="p-2.5 text-xs text-[#5a5854] max-w-sm font-normal">
                      {ob.payloadSummary}
                    </td>

                    <td className="p-2.5 font-mono text-[10.5px] text-[#787774] font-normal">
                      {ob.sign}
                    </td>

                    <td className="p-2.5">
                      {ob.status === 'synced' ? (
                        <span className="text-[10px] bg-[#edf3ec] text-[#2b593f] border border-[#c4dcbc] px-1.5 py-0.5 rounded font-medium flex items-center gap-1 w-max">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>已同步云端</span>
                        </span>
                      ) : (
                        <span className="text-[10px] bg-[#fff7ed] text-[#ea580c] border-[#fed7aa] px-1.5 py-0.5 rounded font-medium flex items-center gap-1 w-max animate-pulse border">
                          <RotateCw className="w-3 h-3 animate-spin" />
                          <span>待重放排队中</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
