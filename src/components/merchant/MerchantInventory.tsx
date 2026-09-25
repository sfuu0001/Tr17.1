import React, { useState, useEffect } from 'react';
import {
  Package,
  Lock,
  Unlock,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Layers,
  Sparkles,
  TrendingDown,
  RotateCcw,
  Truck
} from 'lucide-react';
import { StocktakeItem, StoreTransferRecord, DishItem } from '../../types';
import { INITIAL_STOCKTAKE_ITEMS, INITIAL_TRANSFERS } from '../../data/mockEnhancedData';
import { safeGetStorage, safeSetStorage } from '../../utils/safeStorage';
import { businessTransactionEngine } from '../../utils/businessTransactionEngine';
import { setAvailabilityOverride } from '../../utils/dishAvailability';

interface MerchantInventoryProps {
  showToast: (msg: string) => void;
  // FIX(审计P1): 注入当前在售菜单，便于盘点沽清时同步菜品可用性（打通 obsidian_sold_out_map 与 dish_availability_overrides 双键）
  dishes?: DishItem[];
}

export const MerchantInventory: React.FC<MerchantInventoryProps> = ({ showToast, dishes }) => {
  const [activeTab, setActiveTab] = useState<'stocktake' | 'transfers'>('stocktake');
  const [items, setItems] = useState<StocktakeItem[]>(
    () => safeGetStorage<StocktakeItem[]>('obsidian_inventory_stock', INITIAL_STOCKTAKE_ITEMS)
  );
  const [transfers, setTransfers] = useState<StoreTransferRecord[]>(
    () => safeGetStorage<StoreTransferRecord[]>('obsidian_inventory_loss', INITIAL_TRANSFERS)
  );
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Persist inventory counts and transfer records so they survive refresh
  useEffect(() => {
    safeSetStorage('obsidian_inventory_stock', items);
  }, [items]);

  useEffect(() => {
    safeSetStorage('obsidian_inventory_loss', transfers);
  }, [transfers]);

  // New Transfer Modal state
  const [isAddingTransfer, setIsAddingTransfer] = useState(false);
  const [transferItem, setTransferItem] = useState('原切羊肉块');
  const [transferQty, setTransferQty] = useState('10');
  const [transferUnit, setTransferUnit] = useState('kg');
  const [transferFrom, setTransferFrom] = useState('总店中央冷库 (HQ-01)');
  const [transferTo, setTransferTo] = useState('01号静安餐车 (Truck-01)');

  // 菜品/物料全渠道沽清状态
  const [soldOutMap, setSoldOutMap] = useState<Record<string, boolean>>(() =>
    safeGetStorage('obsidian_sold_out_map', {})
  );

  const handleToggleSoldOut = (item: StocktakeItem) => {
    const isCurrentlySoldOut = !!soldOutMap[item.name];
    const nextStatus = !isCurrentlySoldOut;
    const nextMap = { ...soldOutMap, [item.name]: nextStatus };
    setSoldOutMap(nextMap);
    safeSetStorage('obsidian_sold_out_map', nextMap);

    // FIX(审计P1): 盘点沽清同步到菜品可用性覆盖层（obsidian_dish_availability_overrides），
    // 使食客端菜单 applyAvailabilityOverrides 后即时下架/上架，打通双键不一致
    if (Array.isArray(dishes) && dishes.length > 0) {
      const matched = dishes.filter(
        (d) =>
          d.id === item.sku ||
          d.name === item.name ||
          (d as any).sku === item.sku ||
          d.name.includes(item.name) ||
          item.name.includes(d.name)
      );
      matched.forEach((dish) => {
        setAvailabilityOverride(dish.id, !nextStatus);
      });
    }

    // 跨组件联动事务：触发菜品沽清熔断与在途未出餐订单排查
    businessTransactionEngine.executeDishSoldOutCascade({
      dishId: item.sku,
      dishName: item.name,
      isSoldOut: nextStatus,
      showToast
    });
  };

  // Handle actual quantity update
  const handleUpdateActualQty = (id: string, newActual: number) => {
    if (isLocked) {
      showToast('当前库存已锁账锁定，请先解除锁账后再修改实盘！');
      return;
    }

    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const variance = newActual - item.systemQty;
        const varianceCost = variance * item.unitCost;
        const status = Math.abs(variance) > 1.0 ? 'investigate' : 'ok';
        return {
          ...item,
          actualQty: newActual,
          variance,
          varianceCost,
          status
        };
      })
    );
  };

  // Toggle Lock Inventory
  const handleToggleLock = () => {
    if (!isLocked) {
      setIsLocked(true);
      setItems((prev) => prev.map((item) => ({ ...item, locked: true })));
      showToast('打烊实测全盘点已锁账！数据已冻结并写入云端日报快照。');
    } else {
      setIsLocked(false);
      setItems((prev) => prev.map((item) => ({ ...item, locked: false })));
      showToast('已解除库存锁账，恢复实盘编辑态。');
    }
  };

  // Create Transfer
  const handleCreateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(transferQty) || 1;
    const newTr: StoreTransferRecord = {
      id: `tr-${Date.now().toString().slice(-4)}`,
      transferNo: `TR-${Date.now().toString().slice(-6)}`,
      date: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      fromStore: transferFrom,
      toStore: transferTo,
      itemName: transferItem,
      quantity: qty,
      unit: transferUnit,
      operator: '李店长 (EMP-8001)',
      status: 'in_transit'
    };

    setTransfers([newTr, ...transfers]);
    setIsAddingTransfer(false);
    showToast(`跨车物料调拨单 ${newTr.transferNo} 下发成功！已进入在途追踪。`);
  };

  // Calculation Metrics
  const totalVarianceCost = items.reduce((acc, i) => acc + i.varianceCost, 0);
  const abnormalCount = items.filter((i) => i.status === 'investigate').length;
  const filteredItems = items.filter((i) => {
    if (filterCategory === 'all') return true;
    return i.category === filterCategory;
  });

  return (
    <div className="space-y-3.5 text-xs">
      {/* 1. Header Metrics & Lock Controller */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-[#fbfbfa] p-3 rounded-[4px] border border-[#e6e6e4] space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[#787774]">
            <span className="text-[10.5px] font-normal">盘点锁账状态</span>
            {isLocked ? (
              <Lock className="w-3.5 h-3.5 text-[#2b593f]" />
            ) : (
              <Unlock className="w-3.5 h-3.5 text-[#d9730d]" />
            )}
          </div>
          <p className="font-semibold text-sm text-[#37352f] flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isLocked ? 'bg-[#4dab63]' : 'bg-[#d9730d] animate-pulse'
              }`}
            />
            <span>{isLocked ? '已打烊封账 (Locked)' : '盘点核对中 (Open)'}</span>
          </p>
          <span className="text-[10px] text-[#787774] font-normal block">
            {isLocked ? '数据只读冻结已防篡改' : '支持实时修改实盘数'}
          </span>
        </div>

        <div className="bg-[#fbfbfa] p-3 rounded-[4px] border border-[#e6e6e4] space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[#787774]">
            <span className="text-[10.5px] font-normal">盘盈 / 盘亏净额</span>
            <TrendingDown className="w-3.5 h-3.5 text-[#d44333]" />
          </div>
          <p
            className={`font-mono font-bold text-lg ${
              totalVarianceCost < 0 ? 'text-[#d44333]' : 'text-[#2b593f]'
            }`}
          >
            {totalVarianceCost > 0 ? `+¥${totalVarianceCost.toFixed(1)}` : `¥${totalVarianceCost.toFixed(1)}`}
          </p>
          <span className="text-[10px] text-[#787774] font-normal block">实盘与理论结存总差额</span>
        </div>

        <div className="bg-[#fbfbfa] p-3 rounded-[4px] border border-[#e6e6e4] space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[#787774]">
            <span className="text-[10.5px] font-normal">异常待查物料</span>
            <AlertCircle className="w-3.5 h-3.5 text-[#d9730d]" />
          </div>
          <p className="font-mono font-bold text-lg text-[#d9730d]">
            {abnormalCount} <span className="text-xs font-normal text-[#787774]">品项</span>
          </p>
          <span className="text-[10px] text-[#787774] font-normal block">差异超 ±1.0 需责任复核</span>
        </div>

        <div className="bg-[#fbfbfa] p-3 rounded-[4px] border border-[#e6e6e4] space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[#787774]">
            <span className="text-[10.5px] font-normal">跨店/车调拨在途</span>
            <Truck className="w-3.5 h-3.5 text-[#1c5598]" />
          </div>
          <p className="font-mono font-bold text-lg text-[#1c5598]">
            {transfers.filter((t) => t.status === 'in_transit').length} <span className="text-xs font-normal text-[#787774]">单</span>
          </p>
          <span className="text-[10px] text-[#787774] font-normal block">支持中心冷库向餐车调拨</span>
        </div>
      </div>

      {/* 2. Sub-tab Controller & Action Toolbar */}
      <div className="bg-[#fbfbfa] p-2.5 rounded-[4px] border border-[#e6e6e4] flex items-center justify-between gap-2 flex-wrap shadow-2xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('stocktake')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-[2px] font-medium text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'stocktake'
                ? 'bg-[#37352f] text-white shadow-xs'
                : 'bg-white border border-[#e6e6e4] text-[#5a5854] hover:bg-[#f1f1ef]'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>
              <span className="sm:hidden">库存盘点</span>
              <span className="hidden sm:inline">库存闭环盘点 (Stocktaking)</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('transfers')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-[2px] font-medium text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'transfers'
                ? 'bg-[#37352f] text-white shadow-xs'
                : 'bg-white border border-[#e6e6e4] text-[#5a5854] hover:bg-[#f1f1ef]'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>
              <span className="sm:hidden">跨车调拨</span>
              <span className="hidden sm:inline">跨餐车物料调拨 (Transfers)</span>
            </span>
            <span className="font-mono text-[10px] bg-black/10 px-1 rounded-[2px]">
              {transfers.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'stocktake' ? (
            <button
              type="button"
              onClick={handleToggleLock}
              className={`px-3 py-1.5 rounded-[2px] font-medium text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all ${
                isLocked
                  ? 'bg-white text-[#37352f] hover:bg-[#f1f1ef] border border-[#e6e6e4]'
                  : 'bg-[#2b593f] hover:bg-[#204430] text-white'
              }`}
            >
              {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span>
                <span className="sm:hidden">{isLocked ? '解锁' : '锁账'}</span>
                <span className="hidden sm:inline">{isLocked ? '解除锁账以供修改' : '一键打烊全锁账 (Lock)'}</span>
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingTransfer(!isAddingTransfer)}
              className="px-3 py-1.5 bg-[#1c5598] hover:bg-[#143e70] text-white rounded-[2px] font-medium text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新建调拨单</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. New Transfer Form */}
      {isAddingTransfer && activeTab === 'transfers' && (
        <form
          onSubmit={handleCreateTransfer}
          className="bg-[#fbfbfa] p-3.5 rounded-[4px] border border-[#e6e6e4] space-y-3 shadow-2xs animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between border-b border-[#e6e6e4] pb-2">
            <h4 className="font-semibold text-xs text-[#37352f] flex items-center gap-1.5">
              <ArrowRightLeft className="w-3.5 h-3.5 text-[#1c5598]" />
              <span>新建跨餐车 / 中心冷库物料调拨单</span>
            </h4>
            <span className="text-[10px] text-[#787774] font-normal">支持中心冷库 → 流动餐车补货</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10.5px] font-normal text-[#5a5854] block mb-1">调出品项</label>
              <input
                type="text"
                value={transferItem}
                onChange={(e) => setTransferItem(e.target.value)}
                className="w-full bg-white border border-[#e6e6e4] focus:border-[#37352f] focus:outline-none rounded-[2px] px-2 py-1.5 text-xs text-[#37352f]"
                required
              />
            </div>

            <div>
              <label className="text-[10.5px] font-normal text-[#5a5854] block mb-1">调拨数量与单位</label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  step="0.5"
                  value={transferQty}
                  onChange={(e) => setTransferQty(e.target.value)}
                  className="w-2/3 bg-white border border-[#e6e6e4] focus:border-[#37352f] focus:outline-none rounded-[2px] px-2 py-1.5 text-xs text-[#37352f] font-mono"
                  required
                />
                <input
                  type="text"
                  value={transferUnit}
                  onChange={(e) => setTransferUnit(e.target.value)}
                  className="w-1/3 bg-white border border-[#e6e6e4] focus:border-[#37352f] focus:outline-none rounded-[2px] px-2 py-1.5 text-xs text-[#37352f]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[10.5px] font-normal text-[#5a5854] block mb-1">调出仓/餐车</label>
              <input
                type="text"
                value={transferFrom}
                onChange={(e) => setTransferFrom(e.target.value)}
                className="w-full bg-white border border-[#e6e6e4] focus:border-[#37352f] focus:outline-none rounded-[2px] px-2 py-1.5 text-xs text-[#37352f]"
                required
              />
            </div>

            <div>
              <label className="text-[10.5px] font-normal text-[#5a5854] block mb-1">调入目标餐车</label>
              <input
                type="text"
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
                className="w-full bg-white border border-[#e6e6e4] focus:border-[#37352f] focus:outline-none rounded-[2px] px-2 py-1.5 text-xs text-[#37352f]"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAddingTransfer(false)}
              className="px-3 py-1 bg-white hover:bg-[#f1f1ef] border border-[#e6e6e4] text-[#5a5854] rounded-[2px] font-medium text-xs cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-1 bg-[#1c5598] hover:bg-[#143e70] text-white rounded-[2px] font-medium text-xs cursor-pointer shadow-xs"
            >
              确认生成调拨单
            </button>
          </div>
        </form>
      )}

      {/* 4. Stocktake Items Table */}
      {activeTab === 'stocktake' && (
        <div className="bg-[#fbfbfa] rounded-[4px] border border-[#e6e6e4] overflow-hidden shadow-2xs">
          <div className="p-3 bg-[#fbfbfa] border-b border-[#e6e6e4] flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-xs text-[#37352f]">
                物料理论结存与实盘对照
              </h4>
              <span className="text-[10.5px] text-[#787774] font-normal font-mono hidden sm:inline">
                (结存 = 期初 + 进货 - 销售 - 损耗)
              </span>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1">
              {['all', '肉类原料', '海鲜水产', '调料撒料'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFilterCategory(c)}
                  className={`px-2 py-0.5 rounded-[2px] font-medium text-[11px] cursor-pointer transition-colors ${
                    filterCategory === c
                      ? 'bg-[#37352f] text-white'
                      : 'bg-white border border-[#e6e6e4] text-[#5a5854] hover:bg-[#efefed]'
                  }`}
                >
                  {c === 'all' ? '全部物料' : c}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Card List (< md) */}
          <div className="md:hidden divide-y divide-[#efefed]">
            {filteredItems.map((item) => (
              <div key={item.id} className="p-3 space-y-2 hover:bg-white transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold text-xs text-[#37352f] block">{item.name}</span>
                    <div className="flex items-center gap-1.5 text-[10px] text-[#787774] font-normal mt-0.5">
                      <span className="font-mono">{item.sku}</span>
                      <span>·</span>
                      <span>{item.category}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[9.5px] font-mono px-1.5 py-0.5 rounded-[2px] border ${
                        item.abcClass === 'A'
                          ? 'bg-[#fde8e8] text-[#d44333] border-[#f8b4b4]'
                          : item.abcClass === 'B'
                          ? 'bg-[#fbf3db] text-[#8f6412] border-[#ecd9a8]'
                          : 'bg-[#edf3ec] text-[#2b593f] border-[#c4dcbc]'
                      }`}
                    >
                      {item.abcClass} 类
                    </span>
                    {item.status === 'ok' ? (
                      <span className="text-[10px] bg-[#edf3ec] text-[#2b593f] border border-[#c4dcbc] px-1.5 py-0.2 rounded-[2px] font-normal">
                        吻合
                      </span>
                    ) : (
                      <span className="text-[10px] bg-[#fde8e8] text-[#d44333] border border-[#f8b4b4] px-1.5 py-0.2 rounded-[2px] font-medium">
                        超差
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-[#e6e6e4] rounded-[2px] p-2 text-xs grid grid-cols-3 gap-2 text-center font-mono">
                  <div>
                    <span className="text-[10px] text-[#787774] font-normal block">理论数</span>
                    <span className="font-medium text-[#37352f]">{item.systemQty} {item.unit}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#787774] font-normal block">实盘数</span>
                    {isLocked ? (
                      <span className="font-medium text-[#37352f]">{item.actualQty} {item.unit}</span>
                    ) : (
                      <div className="flex items-center justify-center gap-0.5 mt-0.5">
                        <input
                          type="number"
                          step="0.5"
                          value={item.actualQty}
                          onChange={(e) =>
                            handleUpdateActualQty(item.id, parseFloat(e.target.value) || 0)
                          }
                          className="w-16 bg-white border border-[#e6e6e4] focus:border-[#37352f] focus:outline-none rounded-[2px] px-1 py-0.5 text-xs text-[#37352f] font-mono text-center"
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-[#787774] font-normal block">差异 / 盈亏</span>
                    <span
                      className={`font-semibold block ${
                        item.variance < 0
                          ? 'text-[#d44333]'
                          : item.variance > 0
                          ? 'text-[#2b593f]'
                          : 'text-[#787774]'
                      }`}
                    >
                      {item.variance > 0 ? `+${item.variance}` : item.variance}{item.unit}
                    </span>
                    <span className="text-[9.5px] text-[#787774] font-normal">
                      {item.varianceCost > 0 ? `+¥${item.varianceCost.toFixed(1)}` : `¥${item.varianceCost.toFixed(1)}`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-[#efefed]">
                  <span className="text-[11px] text-[#787774] font-normal">
                    单价: ¥{item.unitCost.toFixed(1)}/{item.unit}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleSoldOut(item)}
                    className={`px-2.5 py-1 rounded-[2px] text-xs font-medium transition-colors cursor-pointer ${
                      soldOutMap[item.name] || item.actualQty <= 0
                        ? 'bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300'
                        : 'bg-white text-[#5a5854] hover:bg-[#efefed] border border-[#e6e6e4]'
                    }`}
                  >
                    {soldOutMap[item.name] || item.actualQty <= 0 ? '已沽清 (恢复在售)' : '一键全渠道沽清'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e6e6e4] bg-[#fbfbfa] text-[#787774] text-[10.5px]">
                  <th className="p-2.5 font-normal">SKU / 物料名称</th>
                  <th className="p-2.5 font-normal">分类 &amp; ABC</th>
                  <th className="p-2.5 font-normal">理论结存 (System)</th>
                  <th className="p-2.5 font-normal">实盘数量 (Actual)</th>
                  <th className="p-2.5 font-normal">差异量 (Variance)</th>
                  <th className="p-2.5 font-normal">单价 &amp; 盈亏金额</th>
                  <th className="p-2.5 font-normal">盘点状态</th>
                  <th className="p-2.5 font-normal text-right">沽清联动</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#efefed] bg-white">
                {filteredItems.map((item) => {
                  const isSoldOut = !!soldOutMap[item.name] || item.actualQty <= 0;
                  return (
                    <tr key={item.id} className={`hover:bg-[#fbfbfa] transition-colors ${isSoldOut ? 'bg-rose-50/30' : ''}`}>
                      <td className="p-2.5">
                        <span className="font-mono text-[10px] text-[#787774] font-normal block">{item.sku}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-[#37352f]">{item.name}</span>
                          {isSoldOut && (
                            <span className="text-[9px] font-medium bg-rose-600 text-white px-1 py-0.2 rounded-[2px] shrink-0">
                              已沽清
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-2.5">
                        <span className="text-[11px] text-[#5a5854] font-normal block">{item.category}</span>
                        <span
                          className={`text-[9.5px] font-mono px-1 rounded-[2px] border ${
                            item.abcClass === 'A'
                              ? 'bg-[#fde8e8] text-[#d44333] border-[#f8b4b4]'
                              : item.abcClass === 'B'
                              ? 'bg-[#fbf3db] text-[#8f6412] border-[#ecd9a8]'
                              : 'bg-[#edf3ec] text-[#2b593f] border-[#c4dcbc]'
                          }`}
                        >
                          {item.abcClass} 类重点
                        </span>
                      </td>

                      <td className="p-2.5 font-mono text-xs font-medium text-[#37352f]">
                        {item.systemQty} {item.unit}
                      </td>

                      <td className="p-2.5">
                        {isLocked ? (
                          <span className="font-mono text-xs font-normal text-[#37352f] bg-[#f1f1ef] px-2 py-1 rounded-[2px] border border-[#e6e6e4]">
                            {item.actualQty} {item.unit} (锁)
                          </span>
                        ) : (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.5"
                              value={item.actualQty}
                              onChange={(e) =>
                                handleUpdateActualQty(item.id, parseFloat(e.target.value) || 0)
                              }
                              className="w-20 bg-white border border-[#e6e6e4] focus:border-[#37352f] focus:outline-none rounded-[2px] px-1.5 py-1 text-xs text-[#37352f] font-mono font-medium"
                            />
                            <span className="text-[10px] text-[#787774] font-normal">{item.unit}</span>
                          </div>
                        )}
                      </td>

                      <td className="p-2.5">
                        <span
                          className={`font-mono font-semibold text-xs ${
                            item.variance < 0
                              ? 'text-[#d44333]'
                              : item.variance > 0
                              ? 'text-[#2b593f]'
                              : 'text-[#787774]'
                          }`}
                        >
                          {item.variance > 0 ? `+${item.variance}` : item.variance} {item.unit}
                        </span>
                      </td>

                      <td className="p-2.5">
                        <span className="text-[10px] text-[#787774] font-normal block">
                          ¥{item.unitCost.toFixed(1)}/{item.unit}
                        </span>
                        <span
                          className={`font-mono font-semibold text-xs ${
                            item.varianceCost < 0
                              ? 'text-[#d44333]'
                              : item.varianceCost > 0
                              ? 'text-[#2b593f]'
                              : 'text-[#787774]'
                          }`}
                        >
                          {item.varianceCost > 0
                            ? `+¥${item.varianceCost.toFixed(1)}`
                            : `¥${item.varianceCost.toFixed(1)}`}
                        </span>
                      </td>

                      <td className="p-2.5">
                        {item.status === 'ok' ? (
                          <span className="text-[10px] bg-[#edf3ec] text-[#2b593f] border border-[#c4dcbc] px-1.5 py-0.5 rounded-[2px] font-normal flex items-center gap-1 w-max">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>正常吻合</span>
                          </span>
                        ) : (
                          <span className="text-[10px] bg-[#fde8e8] text-[#d44333] border border-[#f8b4b4] px-1.5 py-0.5 rounded-[2px] font-normal flex items-center gap-1 w-max">
                            <AlertCircle className="w-3 h-3" />
                            <span>待查明 (超差)</span>
                          </span>
                        )}
                      </td>

                      <td className="p-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleSoldOut(item)}
                          className={`px-2 py-1 rounded-[2px] text-xs font-medium transition-colors cursor-pointer ${
                            isSoldOut
                              ? 'bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300'
                              : 'bg-white text-[#5a5854] hover:bg-[#efefed] border border-[#e6e6e4]'
                          }`}
                          title={isSoldOut ? '点击恢复在售' : '点击全渠道沽清熔断下架'}
                        >
                          {isSoldOut ? '恢复在售' : '一键沽清'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Transfers Table */}
      {activeTab === 'transfers' && (
        <div className="bg-[#fbfbfa] rounded-[4px] border border-[#e6e6e4] overflow-hidden shadow-2xs">
          <div className="p-3 bg-[#fbfbfa] border-b border-[#e6e6e4] flex items-center justify-between">
            <h4 className="font-semibold text-xs text-[#37352f] flex items-center gap-1.5">
              <ArrowRightLeft className="w-3.5 h-3.5 text-[#1c5598]" />
              <span>跨店 / 跨餐车调拨流转单据</span>
            </h4>
            <span className="text-[10px] text-[#787774] font-normal">支持中心冷库补货与餐车间紧急借料</span>
          </div>

          {/* Mobile Card List (< md) */}
          <div className="md:hidden divide-y divide-[#efefed]">
            {transfers.map((tr) => (
              <div key={tr.id} className="p-3 space-y-2 hover:bg-white transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold text-xs text-[#37352f] block">{tr.itemName}</span>
                    <div className="flex items-center gap-1.5 text-[10px] text-[#787774] font-normal mt-0.5">
                      <span className="font-mono">{tr.transferNo}</span>
                      <span>·</span>
                      <span>{tr.date}</span>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-semibold text-xs text-[#37352f] block">
                      {tr.quantity} {tr.unit}
                    </span>
                    <span className="text-[10px] text-[#787774] font-normal">{tr.operator}</span>
                  </div>
                </div>

                <div className="bg-white border border-[#e6e6e4] rounded-[2px] p-2 text-xs flex items-center justify-between">
                  <div className="text-[11px] truncate flex-1 mr-2">
                    <span className="text-[#5a5854] font-normal">{tr.fromStore}</span>
                    <span className="text-[#37352f] font-normal mx-1">→</span>
                    <span className="text-[#2b593f] font-semibold">{tr.toStore}</span>
                  </div>
                  <div>
                    {tr.status === 'completed' ? (
                      <span className="text-[10px] bg-[#edf3ec] text-[#2b593f] border border-[#c4dcbc] px-1.5 py-0.5 rounded-[2px] font-normal whitespace-nowrap">
                        已入库
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setTransfers((prev) =>
                            prev.map((t) => (t.id === tr.id ? { ...t, status: 'completed' } : t))
                          );
                          showToast(`调拨单 ${tr.transferNo} 已确认签收并入库！`);
                        }}
                        className="text-[10px] bg-[#fbf3db] hover:bg-[#ecd9a8] text-[#8f6412] border border-[#ecd9a8] px-2 py-0.5 rounded-[2px] font-medium cursor-pointer whitespace-nowrap"
                      >
                        确认签收 →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e6e6e4] bg-[#fbfbfa] text-[#787774] text-[10.5px]">
                  <th className="p-2.5 font-normal">调拨单号/时间</th>
                  <th className="p-2.5 font-normal">物料名称</th>
                  <th className="p-2.5 font-normal">调出起点 → 调入目标</th>
                  <th className="p-2.5 font-normal">调拨数量</th>
                  <th className="p-2.5 font-normal">操作员</th>
                  <th className="p-2.5 font-normal">调拨状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#efefed] bg-white">
                {transfers.map((tr) => (
                  <tr key={tr.id} className="hover:bg-[#fbfbfa] transition-colors">
                    <td className="p-2.5">
                      <span className="font-mono font-semibold text-xs text-[#37352f] block">{tr.transferNo}</span>
                      <span className="text-[10px] text-[#787774] font-normal">{tr.date}</span>
                    </td>

                    <td className="p-2.5 font-semibold text-[#37352f]">{tr.itemName}</td>

                    <td className="p-2.5 text-xs">
                      <span className="text-[#5a5854] font-normal">{tr.fromStore}</span>
                      <span className="text-[#37352f] font-normal mx-1.5">→</span>
                      <span className="text-[#2b593f] font-semibold">{tr.toStore}</span>
                    </td>

                    <td className="p-2.5 font-mono font-semibold text-[#37352f]">
                      {tr.quantity} {tr.unit}
                    </td>

                    <td className="p-2.5 text-[#5a5854] font-normal">{tr.operator}</td>

                    <td className="p-2.5">
                      {tr.status === 'completed' ? (
                        <span className="text-[10px] bg-[#edf3ec] text-[#2b593f] border border-[#c4dcbc] px-1.5 py-0.5 rounded-[2px] font-normal">
                          已调拨入库
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setTransfers((prev) =>
                              prev.map((t) => (t.id === tr.id ? { ...t, status: 'completed' } : t))
                            );
                            showToast(`调拨单 ${tr.transferNo} 已确认签收并入库！`);
                          }}
                          className="text-[10px] bg-[#fbf3db] hover:bg-[#ecd9a8] text-[#8f6412] border border-[#ecd9a8] px-2 py-0.5 rounded-[2px] font-medium cursor-pointer"
                        >
                          在途确认签收 →
                        </button>
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
