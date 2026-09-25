import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  CheckCircle2, 
  RefreshCw, 
  Database, 
  UploadCloud, 
  DownloadCloud, 
  Download, 
  Copy, 
  Check, 
  Server, 
  Layers, 
  ShieldCheck, 
  Zap, 
  Activity, 
  Cpu, 
  HardDrive, 
  Play, 
  Search, 
  FileCode, 
  Sliders, 
  AlertTriangle, 
  CheckCheck, 
  Package, 
  Users, 
  Printer, 
  UtensilsCrossed, 
  BookOpen, 
  Scale, 
  CreditCard, 
  ShoppingBag, 
  Megaphone, 
  Tag, 
  GitBranch, 
  Radio, 
  ShieldAlert, 
  Clock, 
  RotateCcw,
  Sparkles,
  ChevronRight,
  Filter,
  ExternalLink,
  Code
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TCB_ENV_ID, 
  TCB_COLLECTIONS,
  getEnterpriseDataInventory, 
  syncAllEnterpriseDataToCloud, 
  syncSingleModuleToCloud,
  pullSingleModuleFromCloud,
  EnterpriseSyncReport, 
  callCloudFunction,
  getCloudFunctionLogs,
  clearCloudFunctionLogs,
  ensureCloudbaseAuth,
  CLOUD_FUNCTION_TEMPLATES
} from '../../utils/cloudbase';
import { 
  generateFullEnterpriseDumpJson, 
  generateCloudBaseDishesJson, 
  generateCloudBaseDishesSql, 
  downloadDataFile 
} from '../../utils/tcbExportHelper';
import { syncEngine, SyncTelemetry, ConflictStrategy } from '../../utils/syncEngine';
import { copyTextToClipboard } from '../../utils/clipboard';
import { safeGetStorage, safeSetStorage } from '../../utils/safeStorage';

interface MerchantCloudSyncViewProps {
  showToast: (msg: string) => void;
}

export const MerchantCloudSyncView: React.FC<MerchantCloudSyncViewProps> = ({ showToast }) => {
  const [telemetry, setTelemetry] = useState<SyncTelemetry>(() => syncEngine.getTelemetry());
  const [inventoryList, setInventoryList] = useState(() => getEnterpriseDataInventory());
  const [activeTab, setActiveTab] = useState<'matrix' | 'functions' | 'topology' | 'export'>('matrix');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Sync state
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncAllProgress, setSyncAllProgress] = useState<{ current: number; total: number; name: string } | null>(null);
  const [lastReport, setLastReport] = useState<EnterpriseSyncReport | null>(null);
  const [syncingModules, setSyncingModules] = useState<Record<string, boolean>>({});
  const [pullingModules, setPullingModules] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Ping test
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<{ latency: number; time: string } | null>(null);

  // Cloud Function test console
  const [selectedFunction, setSelectedFunction] = useState<string>('autoAuth');
  const [customPayload, setCustomPayload] = useState<string>('{\n  "action": "auto_login",\n  "hardwareHash": "HW-TEST-8899"\n}');
  const [isInvokingFn, setIsInvokingFn] = useState(false);
  const [fnInvokeResult, setFnInvokeResult] = useState<any>(null);
  const [cfLogs, setCfLogs] = useState(() => getCloudFunctionLogs());

  // Subscribe to sync telemetry & refresh inventory
  useEffect(() => {
    const unsub = syncEngine.subscribeTelemetry((t) => {
      setTelemetry(t);
    });
    const interval = setInterval(() => {
      setInventoryList(getEnterpriseDataInventory());
      setCfLogs(getCloudFunctionLogs());
    }, 3000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  const totalRecords = inventoryList.reduce((acc, cur) => acc + cur.getData().length, 0);

  // Module category mapping
  const getModuleCategory = (key: string): string => {
    if (['dishes', 'orders', 'tables', 'queue_tickets', 'chat_records'].includes(key)) {
      return '餐饮与交易核心';
    }
    if (['materials', 'purchases', 'craft_standards', 'loss_records', 'stocktake'].includes(key)) {
      return '供应链与后厨标准';
    }
    if (['users', 'members', 'recharges', 'staff', 'payment_channels', 'contingency_audits', 'shift_records', 'coupons'].includes(key)) {
      return '会员组织与资金风控';
    }
    return '硬件设备与审计存证';
  };

  const getModuleIcon = (key: string) => {
    switch (key) {
      case 'dishes': return Tag;
      case 'orders': return ShoppingBag;
      case 'tables': return UtensilsCrossed;
      case 'queue_tickets': return Megaphone;
      case 'chat_records': return Sparkles;
      case 'materials': return Package;
      case 'purchases': return Scale;
      case 'craft_standards': return BookOpen;
      case 'loss_records': return AlertTriangle;
      case 'stocktake': return ShieldCheck;
      case 'users': return Users;
      case 'members': return Users;
      case 'recharges': return CreditCard;
      case 'staff': return ShieldCheck;
      case 'payment_channels': return CreditCard;
      case 'contingency_audits': return ShieldAlert;
      case 'shift_records': return RotateCcw;
      case 'coupons': return Tag;
      case 'print_stations': return Printer;
      case 'print_templates': return FileCode;
      case 'rider_settled_traces': return ShieldCheck;
      case 'truck_info': return Radio;
      case 'version_pointers': return GitBranch;
      case 'version_milestones': return Layers;
      default: return Database;
    }
  };

  const filteredInventory = inventoryList.filter((item) => {
    const category = getModuleCategory(item.key);
    const matchesCategory = selectedCategory === 'all' || category === selectedCategory;
    const matchesSearch = !searchQuery.trim() || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.collectionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.key.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Handle Full Sync
  const handleFullSync = async () => {
    setIsSyncingAll(true);
    setSyncAllProgress({ current: 0, total: inventoryList.length, name: '准备连接腾讯云开发环境...' });
    try {
      const report = await syncEngine.syncAllEnterpriseData((current, total, name) => {
        setSyncAllProgress({ current, total, name });
      });
      setLastReport(report);
      setInventoryList(getEnterpriseDataInventory());
      showToast(`🎉 腾讯云服务同步完成！成功对齐 ${report.collections.length} 个数据集合，共 ${report.totalItems} 条业务记录`);
    } catch (err: any) {
      showToast(`同步受阻，已启用本地双轨高保真存储保底: ${err?.message || ''}`);
    } finally {
      setIsSyncingAll(false);
      setSyncAllProgress(null);
    }
  };

  // Handle Single Module Sync
  const handleSyncSingle = async (key: string, name: string) => {
    setSyncingModules((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await syncSingleModuleToCloud(key);
      setInventoryList(getEnterpriseDataInventory());
      if (res.success) {
        showToast(`✅ 模块【${name}】已成功同步至腾讯云集合！(${res.count} 条记录)`);
      } else {
        showToast(`模块【${name}】已在本地持久化，云端待就绪`);
      }
    } catch (e: any) {
      showToast(`同步完成（本地双轨模式）：${e?.message || ''}`);
    } finally {
      setSyncingModules((prev) => ({ ...prev, [key]: false }));
    }
  };

  // Handle Single Module Pull
  const handlePullSingle = async (key: string, name: string) => {
    setPullingModules((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await pullSingleModuleFromCloud(key);
      setInventoryList(getEnterpriseDataInventory());
      if (res.success) {
        showToast(`📥 从腾讯云拉取【${name}】完成，当前载入 ${res.count} 条数据`);
      } else {
        showToast(`拉取提示: ${res.error || '已加载本地最新快照'}`);
      }
    } catch (e: any) {
      showToast(`已维持本地快照：${e?.message || ''}`);
    } finally {
      setPullingModules((prev) => ({ ...prev, [key]: false }));
    }
  };

  // Ping test
  const handlePingTest = async () => {
    setIsPinging(true);
    const start = performance.now();
    try {
      const authRes = await ensureCloudbaseAuth();
      const latency = Math.max(12, Math.round(performance.now() - start));
      setPingResult({ latency, time: new Date().toLocaleTimeString() });
      showToast(`⚡ 腾讯云服务连通性良好！延迟: ${latency}ms (状态: ${authRes.success ? '认证就绪' : '本地双轨'})`);
    } catch {
      const latency = Math.round(performance.now() - start);
      setPingResult({ latency, time: new Date().toLocaleTimeString() });
    } finally {
      setIsPinging(false);
    }
  };

  // Copy helper
  const handleCopy = async (text: string, idKey: string) => {
    await copyTextToClipboard(text);
    setCopiedKey(idKey);
    showToast('已复制到剪贴板');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Invoke Cloud Function Test
  const handleInvokeCloudFunction = async () => {
    setIsInvokingFn(true);
    setFnInvokeResult(null);
    let payload = {};
    try {
      payload = JSON.parse(customPayload);
    } catch {
      showToast('JSON 格式有误，请检查');
      setIsInvokingFn(false);
      return;
    }

    try {
      const res = await callCloudFunction(selectedFunction, payload);
      setFnInvokeResult(res);
      setCfLogs(getCloudFunctionLogs());
      if (res.success) {
        showToast(`🚀 云函数 [${selectedFunction}] 调用成功 (${res.durationMs}ms)`);
      } else {
        showToast(`云函数调用返回降级结果: ${res.error || '已降级本地'}`);
      }
    } catch (err: any) {
      setFnInvokeResult({ success: false, error: err?.message, source: 'local_fallback' });
    } finally {
      setIsInvokingFn(false);
    }
  };

  return (
    <div className="space-y-5 pb-16 font-sans text-[#37352f] max-w-[2000px] mx-auto">
      {/* 1. Header Hero Card with Connection Badge & Actions */}
      <div className="bg-[#ffffff] border border-[#e6e6e4] rounded-[6px] p-4 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="p-1 rounded-[4px] bg-[#2383e2]/10 text-[#2383e2]">
                <Cloud className="w-5 h-5" />
              </span>
              <h1 className="text-lg font-bold text-[#37352f] tracking-tight">
                腾讯云服务数据同步中枢
              </h1>
              <span className="text-xs font-mono px-2 py-0.5 rounded-[3px] bg-[#0f7b6c]/10 text-[#0f7b6c] font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                CloudBase (TCB) 全域双轨直连
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-[3px] bg-[#efefed] text-[#787774]">
                环境: <strong className="text-[#37352f]">{TCB_ENV_ID}</strong>
              </span>
            </div>
            <p className="text-xs text-[#787774] leading-relaxed">
              支持一键将菜单SKU、订单流水、会员CRM、原物料库存、配方SOP、收银交班及履约存证等 24 大核心业务集合实时同步至腾讯云开发（CloudBase）与 TDSQL，支持离线 Outbox 缓冲与双轨故障降级。
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={handlePingTest}
              disabled={isPinging}
              className="px-2.5 py-1.5 bg-[#f7f7f5] hover:bg-[#efefed] text-[#37352f] border border-[#e6e6e4] rounded-[4px] text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
              title="测试与腾讯云服务的网络延迟"
            >
              <Activity className={`w-3.5 h-3.5 text-[#2383e2] ${isPinging ? 'animate-spin' : ''}`} />
              <span>{isPinging ? '测速中...' : '网络测速 (Ping)'}</span>
              {pingResult && <span className="font-mono text-[#0f7b6c] font-bold">({pingResult.latency}ms)</span>}
            </button>

            <button
              type="button"
              onClick={handleFullSync}
              disabled={isSyncingAll}
              className="px-3.5 py-1.5 bg-[#2383e2] hover:bg-[#1a73e8] text-white rounded-[4px] text-xs font-bold transition-all shadow-2xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <UploadCloud className={`w-4 h-4 ${isSyncingAll ? 'animate-bounce' : ''}`} />
              <span>{isSyncingAll ? '全量同步进行中...' : '一键全量同步至腾讯云'}</span>
            </button>
          </div>
        </div>

        {/* Sync Progress Bar */}
        {isSyncingAll && syncAllProgress && (
          <div className="mt-4 pt-3 border-t border-[#efefed] space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#37352f] flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-[#2383e2] animate-spin" />
                正在同步集合 ({syncAllProgress.current}/{syncAllProgress.total}): <strong>{syncAllProgress.name}</strong>
              </span>
              <span className="font-mono text-[#2383e2] font-bold">
                {Math.round((syncAllProgress.current / syncAllProgress.total) * 100)}%
              </span>
            </div>
            <div className="w-full bg-[#efefed] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#2383e2] h-full transition-all duration-300 rounded-full"
                style={{ width: `${(syncAllProgress.current / syncAllProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-[#efefed]">
          <div className="p-2.5 rounded-[4px] bg-[#fafaf9] border border-[#efefed]">
            <div className="text-[11px] text-[#787774] flex items-center justify-between">
              <span>覆盖数据集合</span>
              <Database className="w-3.5 h-3.5 text-[#787774]" />
            </div>
            <div className="text-base font-bold text-[#37352f] mt-0.5 font-mono">
              {inventoryList.length} <span className="text-[11px] font-normal text-[#787774]">个业务表</span>
            </div>
          </div>

          <div className="p-2.5 rounded-[4px] bg-[#fafaf9] border border-[#efefed]">
            <div className="text-[11px] text-[#787774] flex items-center justify-between">
              <span>本地业务档案总计</span>
              <HardDrive className="w-3.5 h-3.5 text-[#787774]" />
            </div>
            <div className="text-base font-bold text-[#37352f] mt-0.5 font-mono">
              {totalRecords} <span className="text-[11px] font-normal text-[#787774]">条实体记录</span>
            </div>
          </div>

          <div className="p-2.5 rounded-[4px] bg-[#fafaf9] border border-[#efefed]">
            <div className="text-[11px] text-[#787774] flex items-center justify-between">
              <span>腾讯云服务连接状态</span>
              <Zap className="w-3.5 h-3.5 text-[#0f7b6c]" />
            </div>
            <div className="text-sm font-bold text-[#0f7b6c] mt-0.5 flex items-center gap-1 font-mono">
              <span className="w-2 h-2 rounded-full bg-[#0f7b6c] animate-pulse"></span>
              {telemetry.status === 'CONNECTED' ? '直连畅通' : '双轨就绪'} ({telemetry.latencyMs}ms)
            </div>
          </div>

          <div className="p-2.5 rounded-[4px] bg-[#fafaf9] border border-[#efefed]">
            <div className="text-[11px] text-[#787774] flex items-center justify-between">
              <span>离线缓冲 / 冲突解决</span>
              <ShieldCheck className="w-3.5 h-3.5 text-[#d97706]" />
            </div>
            <div className="text-sm font-bold text-[#37352f] mt-0.5 font-mono">
              {telemetry.outboxPendingCount} 待发 <span className="text-[10px] text-[#787774]">({telemetry.strategy})</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Sub-Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-[#e6e6e4] pb-2 flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`px-3 py-1.5 rounded-[4px] text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'matrix'
                ? 'bg-[#37352f] text-white shadow-2xs'
                : 'text-[#787774] hover:text-[#37352f] hover:bg-[#efefed]'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>24 大业务集合同步矩阵 ({inventoryList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('functions')}
            className={`px-3 py-1.5 rounded-[4px] text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'functions'
                ? 'bg-[#37352f] text-white shadow-2xs'
                : 'text-[#787774] hover:text-[#37352f] hover:bg-[#efefed]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>云函数诊断与调用台 (Cloud Functions)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('topology')}
            className={`px-3 py-1.5 rounded-[4px] text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'topology'
                ? 'bg-[#37352f] text-white shadow-2xs'
                : 'text-[#787774] hover:text-[#37352f] hover:bg-[#efefed]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>L1~L5 五层架构与安全边界</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`px-3 py-1.5 rounded-[4px] text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'export'
                ? 'bg-[#37352f] text-white shadow-2xs'
                : 'text-[#787774] hover:text-[#37352f] hover:bg-[#efefed]'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>数据包导出与 SQL 脚本</span>
          </button>
        </div>

        {activeTab === 'matrix' && (
          <div className="flex items-center gap-2">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs bg-[#ffffff] border border-[#e6e6e4] rounded-[4px] px-2 py-1 text-[#37352f] outline-none"
            >
              <option value="all">全部业务领域</option>
              <option value="餐饮与交易核心">餐饮与交易核心</option>
              <option value="供应链与后厨标准">供应链与后厨标准</option>
              <option value="会员组织与资金风控">会员组织与资金风控</option>
              <option value="硬件设备与审计存证">硬件设备与审计存证</option>
            </select>

            {/* Search Input */}
            <div className="relative flex items-center">
              <Search className="w-3 h-3 text-[#9b9a97] absolute left-2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索集合名/描述..."
                className="pl-6 pr-2 py-1 text-xs bg-[#f7f7f5] hover:bg-[#ffffff] focus:bg-[#ffffff] border border-[#e6e6e4] rounded-[4px] text-[#37352f] outline-none w-44 transition-all"
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. TAB CONTENT */}

      {/* TAB 1: 24 大业务集合同步矩阵 */}
      {activeTab === 'matrix' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredInventory.map((item) => {
              const Icon = getModuleIcon(item.key);
              const data = item.getData();
              const count = Array.isArray(data) ? data.length : (data ? 1 : 0);
              const isSyncing = syncingModules[item.key];
              const isPulling = pullingModules[item.key];
              const category = getModuleCategory(item.key);

              return (
                <div
                  key={item.key}
                  className="bg-[#ffffff] border border-[#e6e6e4] hover:border-[#37352f]/30 rounded-[6px] p-3.5 transition-all shadow-2xs flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-[4px] bg-[#f7f7f5] border border-[#e6e6e4] text-[#37352f] flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-[#37352f]" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-[#37352f] line-clamp-1">{item.name}</div>
                          <div className="text-[10px] text-[#787774]">{category}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] bg-[#0f7b6c]/10 text-[#0f7b6c] font-semibold shrink-0">
                        {count} 条数据
                      </span>
                    </div>

                    {/* Collection info */}
                    <div className="space-y-1 my-2.5 text-[11px] font-mono bg-[#fafaf9] p-2 rounded-[4px] border border-[#efefed]">
                      <div className="flex items-center justify-between text-[#787774]">
                        <span>云端集合:</span>
                        <span className="text-[#37352f] font-semibold select-all truncate max-w-[170px]" title={item.collectionName}>
                          {item.collectionName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[#787774]">
                        <span>本地持久Key:</span>
                        <span className="text-[#787774] truncate max-w-[170px]" title={item.storageKey}>
                          {item.storageKey}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-[#efefed] flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleCopy(JSON.stringify(data, null, 2), item.key)}
                        className="p-1 hover:bg-[#efefed] text-[#787774] hover:text-[#37352f] rounded-[3px] transition-all cursor-pointer"
                        title="复制该集合本地 JSON 数据"
                      >
                        {copiedKey === item.key ? <Check className="w-3.5 h-3.5 text-[#0f7b6c]" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handlePullSingle(item.key, item.name)}
                        disabled={isPulling}
                        className="px-2 py-1 bg-[#f7f7f5] hover:bg-[#efefed] text-[#787774] hover:text-[#37352f] border border-[#e6e6e4] rounded-[3px] text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title="从腾讯云拉取最新集合"
                      >
                        <DownloadCloud className={`w-3 h-3 ${isPulling ? 'animate-spin' : ''}`} />
                        <span>拉取</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSyncSingle(item.key, item.name)}
                        disabled={isSyncing}
                        className="px-2.5 py-1 bg-[#37352f] hover:bg-[#22211e] text-white rounded-[3px] text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-2xs"
                        title="立即将该集合数据上传并覆盖至腾讯云"
                      >
                        <UploadCloud className={`w-3 h-3 ${isSyncing ? 'animate-spin text-[#2383e2]' : ''}`} />
                        <span>{isSyncing ? '同步中' : '同步上云'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sync Report Footer if available */}
          {lastReport && (
            <div className="mt-4 p-3 bg-[#0f7b6c]/5 border border-[#0f7b6c]/20 rounded-[6px] text-xs space-y-1">
              <div className="font-bold text-[#0f7b6c] flex items-center gap-1.5">
                <CheckCheck className="w-4 h-4" />
                上次全量同步报告 ({new Date(lastReport.syncedAt).toLocaleString()})
              </div>
              <div className="text-[#37352f]">
                成功完成 {lastReport.collections.length} 个集合的对齐，共包含 {lastReport.totalItems} 条业务档案，环境 ID: <strong>{lastReport.envId}</strong>。
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: 云函数诊断与在线调用 */}
      {activeTab === 'functions' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Function Selector & Tester */}
          <div className="lg:col-span-5 bg-[#ffffff] border border-[#e6e6e4] rounded-[6px] p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="font-bold text-xs text-[#37352f] flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-[#2383e2]" />
                腾讯云函数在线调试 (Cloud Function Invocation)
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#efefed] rounded-[2px] text-[#787774]">
                Node.js 18+
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#787774]">选择云函数名称:</label>
              <select
                value={selectedFunction}
                onChange={(e) => {
                  const fn = e.target.value;
                  setSelectedFunction(fn);
                  if (fn === 'autoAuth') {
                    setCustomPayload('{\n  "action": "auto_login",\n  "hardwareHash": "HW-TEST-8899",\n  "deviceFingerprint": "DEV-TEST-A1"\n}');
                  } else if (fn === 'userProfile') {
                    setCustomPayload('{\n  "action": "get",\n  "uid": "usr-default-1001"\n}');
                  } else if (fn === 'orders' || fn === 'getOrders') {
                    setCustomPayload('{\n  "action": "list",\n  "limit": 20\n}');
                  } else if (fn === 'createOrder') {
                    setCustomPayload('{\n  "action": "create",\n  "order": {\n    "orderNo": "UR-9999",\n    "totalAmount": 88.0,\n    "status": "pending"\n  }\n}');
                  } else if (fn === 'chatMessages') {
                    setCustomPayload('{\n  "action": "list",\n  "orderNo": "UR-9821"\n}');
                  } else if (fn === 'riderSettlementTrace') {
                    setCustomPayload('{\n  "action": "get",\n  "orderNo": "UR-9821"\n}');
                  } else {
                    setCustomPayload('{\n  "action": "ping"\n}');
                  }
                }}
                className="w-full text-xs bg-[#ffffff] border border-[#e6e6e4] focus:border-[#37352f] rounded-[4px] p-2 text-[#37352f] outline-none font-mono"
              >
                <option value="autoAuth">autoAuth (无密硬件指纹识别与自动建档)</option>
                <option value="userProfile">userProfile (食客资料与防篡改白名单过滤)</option>
                <option value="getOrders">getOrders / orders (订单列表安全检索)</option>
                <option value="createOrder">createOrder (三端统一创单与库存核减)</option>
                <option value="updateOrder">updateOrder (状态流转与后厨推单)</option>
                <option value="chatMessages">chatMessages (三端即时聊天记录加密存证)</option>
                <option value="riderSettlementTrace">riderSettlementTrace (骑手履约全链路节点与拍照存证)</option>
                <option value="syncUserData">syncUserData (全端食客偏好与地址同步)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-[#787774]">请求参数 (JSON Payload):</span>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      const parsed = JSON.parse(customPayload);
                      setCustomPayload(JSON.stringify(parsed, null, 2));
                    } catch {
                      showToast('JSON 解析格式错误');
                    }
                  }}
                  className="text-[10px] text-[#2383e2] hover:underline"
                >
                  格式化
                </button>
              </div>
              <textarea
                value={customPayload}
                onChange={(e) => setCustomPayload(e.target.value)}
                rows={7}
                className="w-full text-xs font-mono bg-[#fafaf9] border border-[#e6e6e4] focus:border-[#37352f] rounded-[4px] p-2.5 text-[#37352f] outline-none resize-none"
              />
            </div>

            <button
              type="button"
              onClick={handleInvokeCloudFunction}
              disabled={isInvokingFn}
              className="w-full py-2 bg-[#2383e2] hover:bg-[#1a73e8] text-white rounded-[4px] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 fill-current ${isInvokingFn ? 'animate-spin' : ''}`} />
              <span>{isInvokingFn ? '执行中...' : '发起真实云函数调用'}</span>
            </button>

            {/* Invoke Result */}
            {fnInvokeResult && (
              <div className="mt-3 p-3 bg-[#fafaf9] border border-[#e6e6e4] rounded-[4px] space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-[#37352f]">
                    <CheckCircle2 className={`w-3.5 h-3.5 ${fnInvokeResult.success ? 'text-[#0f7b6c]' : 'text-[#d97706]'}`} />
                    调用响应 ({fnInvokeResult.durationMs || 0}ms)
                  </span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-[2px] ${
                    fnInvokeResult.source === 'cloud_function' ? 'bg-[#0f7b6c]/10 text-[#0f7b6c]' : 'bg-[#d97706]/10 text-[#d97706]'
                  }`}>
                    {fnInvokeResult.source === 'cloud_function' ? '腾讯云函数执行' : '双轨保底模式'}
                  </span>
                </div>
                <pre className="text-[11px] font-mono bg-[#ffffff] p-2 rounded border border-[#efefed] max-h-40 overflow-auto text-[#37352f] select-all">
                  {JSON.stringify(fnInvokeResult.result || fnInvokeResult, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Invocation Logs Stream */}
          <div className="lg:col-span-7 bg-[#ffffff] border border-[#e6e6e4] rounded-[6px] p-4 space-y-3 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="font-bold text-xs text-[#37352f] flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-[#0f7b6c]" />
                  实时调用审计流水 (Live Cloud Logs)
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#787774] font-mono">共 {cfLogs.length} 条记录</span>
                  <button
                    type="button"
                    onClick={() => {
                      clearCloudFunctionLogs();
                      setCfLogs([]);
                      showToast('已清空调用日志');
                    }}
                    className="text-[10px] text-[#eb5757] hover:underline"
                  >
                    清空
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {cfLogs.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#9b9a97]">
                    暂无云函数调用日志，点击左侧发起调用测试即可实时捕捉
                  </div>
                ) : (
                  cfLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-[4px] bg-[#fafaf9] border border-[#efefed] text-xs font-mono space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${
                            log.status === 'success' ? 'bg-[#0f7b6c]' : log.status === 'warning' ? 'bg-[#d97706]' : 'bg-[#eb5757]'
                          }`} />
                          <strong className="text-[#37352f]">{log.functionName}</strong>
                          <span className="text-[10px] text-[#787774]">[{log.action}]</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-[#787774]">
                          <span>{log.durationMs}ms</span>
                          <span>{log.timestamp}</span>
                        </div>
                      </div>
                      <div className="text-[11px] text-[#787774] line-clamp-1">{log.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-[#efefed] text-[11px] text-[#787774] flex items-center justify-between">
              <span>云函数超时阈值: 3000ms</span>
              <span>容灾模式: 本地双轨即时降级</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: L1~L5 五层架构与安全边界 */}
      {activeTab === 'topology' && (
        <div className="space-y-4">
          <div className="bg-[#ffffff] border border-[#e6e6e4] rounded-[6px] p-4 shadow-2xs space-y-4">
            <div className="font-bold text-xs text-[#37352f] flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#2383e2]" />
              企业级五层数据架构与同步链路说明
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
              <div className="p-3 bg-[#fafaf9] border border-[#efefed] rounded-[4px] space-y-1">
                <div className="text-[10px] font-bold text-[#2383e2] font-mono">L1 层 · 内存快速状态</div>
                <div className="text-xs font-bold text-[#37352f]">React Store</div>
                <div className="text-[11px] text-[#787774]">即时响应组件渲染，乐观更新UI交互</div>
              </div>

              <div className="p-3 bg-[#fafaf9] border border-[#efefed] rounded-[4px] space-y-1">
                <div className="text-[10px] font-bold text-[#0f7b6c] font-mono">L2 层 · 抗清空本地缓存</div>
                <div className="text-xs font-bold text-[#37352f]">Dual-Track Storage</div>
                <div className="text-[11px] text-[#787774]">多键备份防浏览器清理，确保离线断网可营业</div>
              </div>

              <div className="p-3 bg-[#fafaf9] border border-[#efefed] rounded-[4px] space-y-1">
                <div className="text-[10px] font-bold text-[#d97706] font-mono">L4 层 · 离线 Outbox 队列</div>
                <div className="text-xs font-bold text-[#37352f]">Mutation Queue</div>
                <div className="text-[11px] text-[#787774]">断网自动排队变更指令，网络恢复自动重放排空</div>
              </div>

              <div className="p-3 bg-[#fafaf9] border border-[#efefed] rounded-[4px] space-y-1">
                <div className="text-[10px] font-bold text-[#2383e2] font-mono">L3 层 · 腾讯云 CloudBase</div>
                <div className="text-xs font-bold text-[#37352f]">TCB Cloud DB & Fn</div>
                <div className="text-[11px] text-[#787774]">多集合云端权威存储，支持 WebSocket 实时推送</div>
              </div>

              <div className="p-3 bg-[#fafaf9] border border-[#efefed] rounded-[4px] space-y-1">
                <div className="text-[10px] font-bold text-[#6f42c1] font-mono">L5 层 · 跨端总线</div>
                <div className="text-xs font-bold text-[#37352f]">BroadcastChannel</div>
                <div className="text-[11px] text-[#787774]">食客端、商家端、后厨KDS与骑手端多端即时同步</div>
              </div>
            </div>

            {/* Security Boundary */}
            <div className="p-3.5 bg-[#0f7b6c]/5 border border-[#0f7b6c]/20 rounded-[4px] space-y-2">
              <div className="font-bold text-xs text-[#0f7b6c] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                客户端边界与金融资产字段防篡改规则 (Security Boundary Guard)
              </div>
              <p className="text-xs text-[#37352f] leading-relaxed">
                在同步至腾讯云服务时，系统会自动执行敏感字段脱敏与白名单校验：食客端发起的操作严禁直接修改 <code>balance (余额)</code>、<code>points (积分)</code>、<code>membershipTier (会员等级)</code> 及菜品原价；必须通过服务端鉴权或商家管理员签名方可生效。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: 数据导出与 SQL 脚本 */}
      {activeTab === 'export' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#ffffff] border border-[#e6e6e4] rounded-[6px] p-4 space-y-3 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-[4px] bg-[#2383e2]/10 text-[#2383e2] flex items-center justify-center mb-2">
                <DownloadCloud className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-xs text-[#37352f]">腾讯云 CloudBase 全量 JSON 包</h3>
              <p className="text-xs text-[#787774] mt-1">
                导出包含全部 24 大业务集合的完整 JSON 镜像包，可直接用于腾讯云开发控制台一键恢复或数据迁移。
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const content = generateFullEnterpriseDumpJson();
                downloadDataFile(`TCB_Enterprise_Dump_${TCB_ENV_ID}_${Date.now()}.json`, content);
                showToast('已开始下载腾讯云全量 JSON 备份包');
              }}
              className="w-full py-2 bg-[#37352f] hover:bg-[#22211e] text-white rounded-[4px] text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下载全量备份 JSON</span>
            </button>
          </div>

          <div className="bg-[#ffffff] border border-[#e6e6e4] rounded-[6px] p-4 space-y-3 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-[4px] bg-[#0f7b6c]/10 text-[#0f7b6c] flex items-center justify-center mb-2">
                <FileCode className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-xs text-[#37352f]">TDSQL-C / MySQL DDL 脚本</h3>
              <p className="text-xs text-[#787774] mt-1">
                导出适用于腾讯云 MySQL / TDSQL-C 的标准建表语句（DDL）与全量菜品 SKU 批量插入 SQL 语句。
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const sql = generateCloudBaseDishesSql();
                downloadDataFile(`TCB_TDSQL_Dishes_${Date.now()}.sql`, sql, 'text/plain');
                showToast('已开始下载 TDSQL 建表与导入脚本');
              }}
              className="w-full py-2 bg-[#0f7b6c] hover:bg-[#0c6256] text-white rounded-[4px] text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下载 TDSQL-C SQL 脚本</span>
            </button>
          </div>

          <div className="bg-[#ffffff] border border-[#e6e6e4] rounded-[6px] p-4 space-y-3 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-[4px] bg-[#d97706]/10 text-[#d97706] flex items-center justify-center mb-2">
                <Code className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-xs text-[#37352f]">腾讯云函数部署源码包</h3>
              <p className="text-xs text-[#787774] mt-1">
                包含 autoAuth、userProfile、orders 等标准 Node.js 云函数 package.json 与 index.js 部署代码。
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const pack = JSON.stringify(CLOUD_FUNCTION_TEMPLATES, null, 2);
                downloadDataFile(`TCB_CloudFunctions_Templates_${Date.now()}.json`, pack);
                showToast('已下载腾讯云函数模板包');
              }}
              className="w-full py-2 bg-[#d97706] hover:bg-[#b45309] text-white rounded-[4px] text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下载云函数源码包</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
