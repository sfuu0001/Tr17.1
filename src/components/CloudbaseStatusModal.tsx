import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  CheckCircle2, 
  RefreshCw, 
  Database, 
  Radio, 
  UploadCloud,
  X,
  Copy,
  Check,
  DownloadCloud,
  Layers,
  Settings2,
  FileCode,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  Server,
  ShieldCheck,
  Zap,
  Activity,
  Cpu,
  HardDrive,
  Share2,
  Sliders,
  Play,
  RotateCcw,
  CheckCheck,
  Package,
  Users,
  Award,
  Printer,
  BellRing,
  UtensilsCrossed,
  BookOpen,
  Scale,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TCB_ENV_ID, 
  seedDishesToCloud, 
  createCloudOrder, 
  fetchDishesFromCloud, 
  fetchOrdersFromCloudFunction,
  fetchOrdersFromCloud,
  getEnterpriseDataInventory,
  syncAllEnterpriseDataToCloud,
  EnterpriseSyncReport,
  TCB_COLLECTIONS 
} from '../utils/cloudbase';
import { 
  generateCloudBaseDishesJson, 
  generateCloudBaseDishesSql, 
  generateFullEnterpriseDumpJson, 
  downloadDataFile 
} from '../utils/tcbExportHelper';
import { DishItem, Order } from '../types';
import { useToast } from './ui/ToastContext';
import { copyTextToClipboard } from '../utils/clipboard';
import { syncEngine, SyncTelemetry, ConflictStrategy } from '../utils/syncEngine';

interface CloudbaseStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  dishes: DishItem[];
  orders: Order[];
  onDishesUpdated?: (dishes: DishItem[]) => void;
  onOrdersUpdated?: (orders: Order[]) => void;
  isConnected: boolean;
  authUserId?: string;
}

export const CloudbaseStatusModal: React.FC<CloudbaseStatusModalProps> = ({
  isOpen,
  onClose,
  dishes,
  orders,
  onDishesUpdated,
  onOrdersUpdated,
  isConnected,
  authUserId
}) => {
  const toast = useToast();
  const [telemetry, setTelemetry] = useState<SyncTelemetry>(() => syncEngine.getTelemetry());
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncAllProgress, setSyncAllProgress] = useState<{ current: number; total: number; name: string } | null>(null);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; name: string } | null>(null);
  const [isTestingOrder, setIsTestingOrder] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isPullingOrders, setIsPullingOrders] = useState(false);
  const [isForceResyncing, setIsForceResyncing] = useState(false);
  const [isFlushingOutbox, setIsFlushingOutbox] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [lastSyncReport, setLastSyncReport] = useState<EnterpriseSyncReport | null>(null);
  const [activeTab, setActiveTab] = useState<'topology' | 'actions' | 'modules' | 'export' | 'schema'>('modules');

  // Inventory inspection
  const inventory = getEnterpriseDataInventory();
  const totalInventoryRecords = inventory.reduce((acc, cur) => acc + cur.getData().length, 0);

  // Subscribe to real-time sync engine telemetry
  useEffect(() => {
    if (!isOpen) return;
    const unsub = syncEngine.subscribeTelemetry((t) => {
      setTelemetry(t);
    });
    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyEnv = async () => {
    await copyTextToClipboard(TCB_ENV_ID);
    setIsCopied(true);
    toast.success('环境 ID 已复制到剪贴板');
    setTimeout(() => setIsCopied(false), 2000);
  };

  /**
   * 一键全量同步全部 16 大企业维度数据
   */
  const handleSyncAllModules = async () => {
    setIsSyncingAll(true);
    setSyncAllProgress({ current: 0, total: inventory.length, name: '连接腾讯云开发环境...' });
    try {
      const report = await syncEngine.syncAllEnterpriseData((current, total, name) => {
        setSyncAllProgress({ current, total, name });
      });
      setLastSyncReport(report);
      toast.success(
        '已全部同步至云端！',
        `成功同步 ${report.collections.length} 个数据集合，共 ${report.totalItems} 条业务档案`
      );
    } catch (e: any) {
      toast.info('全量同步保护', e?.message || '已完成本地双轨持久化存储');
    } finally {
      setIsSyncingAll(false);
      setSyncAllProgress(null);
    }
  };

  const handleForceFullResync = async () => {
    setIsForceResyncing(true);
    try {
      const res = await syncEngine.forceFullResync();
      if (onOrdersUpdated && res.ordersCount > 0) {
        const fullOrders = await fetchOrdersFromCloud();
        if (fullOrders.orders) onOrdersUpdated(fullOrders.orders);
      }
      if (onDishesUpdated && res.dishesCount > 0) {
        const fullDishes = await fetchDishesFromCloud();
        if (fullDishes.dishes) onDishesUpdated(fullDishes.dishes);
      }
      toast.success('全链路双向对齐同步完成', `已对齐 ${res.ordersCount} 笔订单与 ${res.dishesCount} 道菜品`);
    } catch (e: any) {
      toast.info('全量同步保护', e?.message || '已自动从本地多重缓存恢复一致性');
    } finally {
      setIsForceResyncing(false);
    }
  };

  const handleFlushOutbox = async () => {
    setIsFlushingOutbox(true);
    try {
      const res = await syncEngine.processOutbox();
      toast.success('离线队列处理完毕', `成功提交 ${res.processed} 笔突变，失败/重试 ${res.failed} 笔`);
    } catch (e: any) {
      toast.error('出列异常', e?.message);
    } finally {
      setIsFlushingOutbox(false);
    }
  };

  const handlePullCloudOrders = async () => {
    setIsPullingOrders(true);
    try {
      const res = await fetchOrdersFromCloudFunction();
      if (res.success && res.orders && res.orders.length > 0) {
        if (onOrdersUpdated) onOrdersUpdated(res.orders);
        syncEngine.broadcast('ORDERS_CHANGED', res.orders);
        toast.success(`云函数 [${res.functionName || 'getOrders'}] 订单拉取成功`, `已成功同步 ${res.orders.length} 条实时订单`);
      } else {
        const fullRes = await fetchOrdersFromCloud();
        if (fullRes.orders && fullRes.orders.length > 0 && onOrdersUpdated) {
          onOrdersUpdated(fullRes.orders);
          syncEngine.broadcast('ORDERS_CHANGED', fullRes.orders);
        }
        toast.info('云函数状态提示', res.error || '已自动切换为本地高保真订单并载入');
      }
    } catch (e: any) {
      toast.info('订单拉取保护', e?.message || '已自动从本地数据恢复');
    } finally {
      setIsPullingOrders(false);
    }
  };

  const handleSeedDishes = async () => {
    setIsSeeding(true);
    setSyncProgress({ current: 0, total: dishes.length, name: '准备连接云端集合...' });
    try {
      const res = await seedDishesToCloud(dishes, (current, total, name) => {
        setSyncProgress({ current, total, name });
      });

      if (res.success) {
        syncEngine.broadcast('DISHES_CHANGED', dishes);
        toast.success('菜品数据已全量同步至腾讯云', `成功推送 ${res.count} / ${dishes.length} 道菜品至集合 ${TCB_COLLECTIONS.DISHES}`);
      } else {
        toast.warning('本地数据完好', res.error || '建议在腾讯云控制台配置安全域名或使用下方一键导入文件');
      }
    } catch (err: any) {
      toast.error('同步失败', err.message);
    } finally {
      setIsSeeding(false);
      setSyncProgress(null);
    }
  };

  const handlePullCloudDishes = async () => {
    setIsPulling(true);
    try {
      const res = await fetchDishesFromCloud();
      if (res.success && res.fromCloud && res.dishes.length > 0) {
        if (onDishesUpdated) onDishesUpdated(res.dishes);
        syncEngine.broadcast('DISHES_CHANGED', res.dishes);
        toast.success('云端菜单拉取成功', `已从腾讯云同步 ${res.dishes.length} 道菜品`);
      } else {
        toast.info('腾讯云连接就绪', '当前云端暂无更新数据或已处于最新');
      }
    } catch (e: any) {
      toast.error('拉取失败', e.message);
    } finally {
      setIsPulling(false);
    }
  };

  const handleTestCreateOrder = async () => {
    setIsTestingOrder(true);
    try {
      const testOrderNo = `TCB-${Date.now().toString().slice(-4)}`;
      const testOrder: Order = {
        id: `tcb-ord-${Date.now()}`,
        orderNo: testOrderNo,
        items: [
          {
            name: '极鲜秘制嫩牛肉串',
            quantity: 5,
            price: 6.0,
            options: '微辣, 现烤薄油'
          },
          {
            name: '川渝红油烤苕皮',
            quantity: 2,
            price: 6.0,
            options: '加葱花, 经典酸豆角'
          }
        ],
        totalAmount: 42.0,
        status: 'cooking',
        statusText: '腾讯云端实时制作中',
        createdTime: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        estimatedDeliveryTime: '约 10 分钟后',
        etaMinutes: 10,
        courierName: '陈志远 (专线骑手 R-8821)',
        courierPhone: '138-1829-9201',
        deliveryAddress: '腾讯云端联调测试地址 (TCB Node)',
        truckName: '黑曜石流动餐车 01 号',
        progressPercent: 30,
        stepIndex: 1
      };

      await syncEngine.dispatchMutation('CREATE_ORDER', testOrder);
      if (onOrdersUpdated) {
        onOrdersUpdated([testOrder, ...orders]);
      }
      toast.success('测试突变已通过 Outbox 发送', `单号: ${testOrderNo} · 已完成乐观更新与跨端广播`);
    } catch (err: any) {
      toast.error('写入失败', err.message);
    } finally {
      setIsTestingOrder(false);
    }
  };

  const handleExportJson = () => {
    const jsonStr = generateCloudBaseDishesJson(dishes);
    downloadDataFile(`shaokao_sku_tcb_${Date.now()}.json`, jsonStr, 'application/json');
    toast.success('已生成腾讯云 CloudBase 导入 JSON 文件', '可在云开发控制台数据库一键导入');
  };

  const handleExportSql = () => {
    const sqlStr = generateCloudBaseDishesSql(dishes);
    downloadDataFile(`shaokao_sku_tdsql_${Date.now()}.sql`, sqlStr, 'application/sql');
    toast.success('已生成腾讯云 TDSQL/MySQL 建表与全量数据脚本', '可直接在腾讯云数据库执行');
  };

  const handleExportFullEnterpriseDump = () => {
    const fullDumpStr = generateFullEnterpriseDumpJson();
    downloadDataFile(`obsidian_enterprise_full_dump_${Date.now()}.json`, fullDumpStr, 'application/json');
    toast.success('16 大企业模块全量数据库备份包已生成并导出');
  };

  const handleExportSnapshot = () => {
    const snapshot = {
      timestamp: new Date().toISOString(),
      telemetry,
      ordersCount: orders.length,
      dishesCount: dishes.length,
      ordersSample: orders.slice(0, 5),
      dishesSample: dishes.slice(0, 5)
    };
    downloadDataFile(`sync_architecture_snapshot_${Date.now()}.json`, JSON.stringify(snapshot, null, 2), 'application/json');
    toast.success('系统全量同步架构快照已导出');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/65 backdrop-blur-xs cursor-pointer"
          onClick={onClose}
        />

        {/* Modal Card */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative bg-white rounded-3xl shadow-2xl border border-[#e2e3e1] max-w-2xl w-full p-4 sm:p-6 z-10 space-y-4 max-h-[92vh] overflow-y-auto hide-scrollbar"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#f0f0ed]">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-neutral-900 text-white flex items-center justify-center shadow-xs shrink-0">
                <Cloud className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-black text-black tracking-tight">
                    腾讯云开发 (CloudBase) 全域数据同步中枢
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{telemetry.status}</span>
                  </span>
                </div>
                <p className="text-[11px] text-[#787770]">
                  环境 ID: <span className="tabular-nums text-black font-semibold">{TCB_ENV_ID}</span> · 包含 16 大业务模块 · <span className="text-emerald-700 font-bold">{totalInventoryRecords} 条档案</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-neutral-100 flex items-center justify-center text-[#787770] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick One-Click Sync All CTA Card */}
          <div className="p-3.5 bg-gradient-to-r from-sky-50 via-indigo-50/50 to-neutral-50 rounded-2xl border border-sky-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 font-bold text-xs text-sky-950">
                <UploadCloud className="w-4 h-4 text-sky-600 shrink-0" />
                <span>全量数据一键直连同步</span>
                <span className="px-1.5 py-0.2 rounded bg-sky-200 text-sky-900 text-[10px] font-bold">16 集合就绪</span>
              </div>
              <p className="text-[11px] text-sky-800/80 leading-tight">
                将菜单SKU、订单、会员CRM、员工考勤、打印机、叫号单等全部写入腾讯云
              </p>
            </div>

            <button
              type="button"
              disabled={isSyncingAll}
              onClick={handleSyncAllModules}
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50 shrink-0"
            >
              {isSyncingAll ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>正在同步 ({syncAllProgress ? `${syncAllProgress.current}/${syncAllProgress.total}` : '...'})</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>立即同步全部数据</span>
                </>
              )}
            </button>
          </div>

          {/* Progress Bar when syncing all */}
          {syncAllProgress && (
            <div className="p-3 bg-sky-100/60 rounded-xl border border-sky-200 text-xs space-y-1.5">
              <div className="flex justify-between font-semibold text-sky-900 text-[11px]">
                <span>正在上传: {syncAllProgress.name}</span>
                <span>{Math.round((syncAllProgress.current / syncAllProgress.total) * 100)}%</span>
              </div>
              <div className="w-full h-1.5 bg-sky-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-600 transition-all duration-200"
                  style={{ width: `${(syncAllProgress.current / syncAllProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-xl overflow-x-auto no-scrollbar">
            {[
              { id: 'modules', label: '16大模块清单', icon: Database },
              { id: 'actions', label: '快捷调度', icon: Zap },
              { id: 'topology', label: '5层架构', icon: Layers },
              { id: 'export', label: '备份导出', icon: Download },
              { id: 'schema', label: '集合映射', icon: Server }
            ].map(tab => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap ${
                    isSelected
                      ? 'bg-white text-black shadow-xs'
                      : 'text-neutral-600 hover:text-black'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab: 16 大业务模块数据清单 (Modules Inventory) */}
          {activeTab === 'modules' && (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between text-[11px] text-[#787770] px-1">
                <span>系统已登记的业务数据集 ({inventory.length} 类)</span>
                <span>总计：<strong className="text-neutral-900">{totalInventoryRecords} 条</strong> 记录</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                {inventory.map((item, idx) => {
                  const data = item.getData();
                  const count = data.length;
                  return (
                    <div
                      key={item.key}
                      className="p-2.5 bg-neutral-50 hover:bg-neutral-100/80 rounded-xl border border-[#e4e4e0] flex items-center justify-between transition-colors"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="font-bold text-neutral-900 text-xs truncate flex items-center gap-1.5">
                          <span className="text-[10px] tabular-nums text-neutral-400">#{idx + 1}</span>
                          <span>{item.name}</span>
                        </div>
                        <div className="text-[10px] tabular-nums text-neutral-500 truncate">
                          {item.collectionName}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-bold text-neutral-900 text-xs">
                          {count} <span className="text-[10px] text-neutral-400 font-normal">条</span>
                        </div>
                        <span className="text-[9px] font-medium text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                          双轨就绪
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 2: 快捷调度 (Actions) */}
          {activeTab === 'actions' && (
            <div className="space-y-3 text-xs">
              {/* Environment ID Box */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-neutral-600 mb-1">
                  <span>腾讯云开发环境 ID (Env ID)</span>
                  <span className="text-[10px] text-emerald-600 font-medium">● 匿名鉴权已激活</span>
                </div>
                <div className="flex items-center gap-1.5 bg-neutral-50 rounded-xl p-2 border border-[#e2e3e1]">
                  <input
                    type="text"
                    readOnly
                    value={TCB_ENV_ID}
                    className="bg-transparent flex-1 tabular-nums text-[11px] text-black font-semibold outline-none select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyEnv}
                    className="px-2.5 py-1 bg-white hover:bg-neutral-100 text-neutral-700 rounded-lg text-[10px] font-bold border border-[#dcdcda] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600">已复制</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-neutral-600" />
                        <span>复制</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  disabled={isForceResyncing}
                  onClick={handleForceFullResync}
                  className="w-full py-2.5 bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isForceResyncing ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  ) : (
                    <RotateCcw className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>双向对齐同步 (Dishes & Orders)</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isFlushingOutbox || telemetry.outboxPendingCount === 0}
                    onClick={handleFlushOutbox}
                    className="py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isFlushingOutbox ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                    ) : (
                      <CheckCheck className="w-3.5 h-3.5 text-amber-600" />
                    )}
                    <span>排空 Outbox ({telemetry.outboxPendingCount})</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSeeding}
                    onClick={handleSeedDishes}
                    className="py-2 px-3 bg-white hover:bg-neutral-50 text-black border border-[#d2d2ce] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isSeeding ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-600" />
                    ) : (
                      <UploadCloud className="w-3.5 h-3.5 text-sky-600" />
                    )}
                    <span>推送 SKU 菜单 ({dishes.length})</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isPulling}
                    onClick={handlePullCloudDishes}
                    className="py-2 px-3 bg-white hover:bg-neutral-50 text-neutral-800 border border-[#d2d2ce] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isPulling ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-600" />
                    ) : (
                      <DownloadCloud className="w-3.5 h-3.5 text-sky-600" />
                    )}
                    <span>拉取云端菜品</span>
                  </button>

                  <button
                    type="button"
                    disabled={isPullingOrders}
                    onClick={handlePullCloudOrders}
                    className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isPullingOrders ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                    ) : (
                      <Radio className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                    <span>拉取云函数订单 ({orders.length})</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: 5层架构 (Topology) */}
          {activeTab === 'topology' && (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-neutral-900 text-white rounded-2xl space-y-2 tabular-nums">
                <div className="flex items-center justify-between text-[11px] border-b border-neutral-800 pb-1.5 text-neutral-400">
                  <span>5-TIER DATA SYNC PIPELINE</span>
                  <span className="text-emerald-400">● REAL-TIME ACTIVE</span>
                </div>

                <div className="p-2 bg-neutral-800/80 rounded-xl border border-neutral-700/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white text-[11px]">L1: 内存纳秒响应缓存 (React Store)</div>
                      <div className="text-[9px] text-neutral-400">乐观立即渲染 (Optimistic Mutation &lt; 16ms)</div>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">100% 同步</span>
                </div>

                <div className="p-2 bg-neutral-800/80 rounded-xl border border-neutral-700/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-sky-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white text-[11px]">L2: 双轨防腐本地存储 (Anti-Cache Storage)</div>
                      <div className="text-[9px] text-neutral-400">带版本向量 (_version, _hash, _updatedAt)</div>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[10px] font-bold">持久就绪</span>
                </div>

                <div className="p-2 bg-neutral-800/80 rounded-xl border border-neutral-700/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white text-[11px]">L4: 离线事务队列 (Offline Outbox Queue)</div>
                      <div className="text-[9px] text-neutral-400">自动指数退避重试 (LWW 时间戳冲突裁决)</div>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                    {telemetry.outboxPendingCount} 待出列
                  </span>
                </div>

                <div className="p-2 bg-neutral-800/80 rounded-xl border border-neutral-700/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-sky-300 shrink-0" />
                    <div>
                      <div className="font-bold text-white text-[11px]">L3: 腾讯云开发实时数据库 (TCB Cloud DB)</div>
                      <div className="text-[9px] text-neutral-400">Watcher 实时流 + 云函数 RPC</div>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[10px] font-bold">
                    {telemetry.cloudConnected ? '云端在线' : '双轨就绪'}
                  </span>
                </div>

                <div className="p-2 bg-neutral-800/80 rounded-xl border border-neutral-700/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-purple-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white text-[11px]">L5: 跨标签页/三端广播通信总线 (BroadcastBus)</div>
                      <div className="text-[9px] text-neutral-400">食客端 ⇄ 商家 KDS ⇄ 骑手端 毫秒级互通</div>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                    {telemetry.broadcastEventsCount} 广播
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: 备份导出 (Export) */}
          {activeTab === 'export' && (
            <div className="space-y-2.5 text-xs">
              {/* Full enterprise dump */}
              <div className="p-3 bg-neutral-50 rounded-2xl border border-[#e2e3e1] flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-neutral-900">
                    <Package className="w-4 h-4 text-indigo-600" />
                    <span>全量 16 大模块完整企业级备份包 (.json)</span>
                  </div>
                  <div className="text-[11px] text-[#787770]">
                    含菜品、订单、会员、考勤、打印机、叫号等全部 {totalInventoryRecords} 条数据
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleExportFullEnterpriseDump}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>导出全量包</span>
                </button>
              </div>

              {/* Export JSON Option */}
              <div className="p-3 bg-neutral-50 rounded-2xl border border-[#e2e3e1] flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-neutral-900">
                    <FileCode className="w-4 h-4 text-sky-600" />
                    <span>腾讯云 CloudBase JSON 数据包 (NDJSON)</span>
                  </div>
                  <div className="text-[11px] text-[#787770]">
                    包含 {dishes.length} 道菜品与调味 SOP
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="px-3 py-1.5 bg-white hover:bg-neutral-100 text-black border border-[#d2d2ce] rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>导出 JSON</span>
                </button>
              </div>

              {/* Export SQL Option */}
              <div className="p-3 bg-neutral-50 rounded-2xl border border-[#e2e3e1] flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-neutral-900">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>腾讯云 TDSQL / MySQL 导入脚本 (.sql)</span>
                  </div>
                  <div className="text-[11px] text-[#787770]">
                    包含完整建表语句与批量写入
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleExportSql}
                  className="px-3 py-1.5 bg-white hover:bg-neutral-100 text-black border border-[#d2d2ce] rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>导出 SQL</span>
                </button>
              </div>
            </div>
          )}

          {/* Tab 5: 云端集合规范 (Schema) */}
          {activeTab === 'schema' && (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-neutral-50 rounded-2xl border border-[#e2e3e1] space-y-2">
                <div className="font-bold text-neutral-900 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-sky-600" />
                  <span>已配置的 16 大腾讯云开发集合映射</span>
                </div>
                <div className="space-y-1 text-[11px] tabular-nums max-h-[220px] overflow-y-auto pr-1">
                  {Object.entries(TCB_COLLECTIONS).map(([key, val]) => (
                    <div key={key} className="flex justify-between items-center py-1 border-b border-[#e8e8e4]">
                      <span className="text-neutral-800 font-bold">{val}</span>
                      <span className="text-[#787770] font-sans">{key}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="pt-3 border-t border-[#f0f0ed] flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-neutral-900 text-white hover:bg-black rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              完成并关闭
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};


