import React, { useState, useEffect } from 'react';
import {
  PackageCheck,
  Plus,
  Truck,
  CheckCircle2,
  Clock,
  ExternalLink,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Boxes,
  Thermometer,
  Calendar,
  X
} from 'lucide-react';
import {
  globalFranchiseBomEngine,
  FRANCHISE_BOM_EVENT
} from '../../../utils/franchiseBomLeakageEngine';
import {
  FranchiseSupplyOrder,
  FranchiseTenantContext
} from '../../../types/franchise';

interface FranchiseSupplyTabProps {
  context: FranchiseTenantContext;
  showToast: (msg: string) => void;
}

export const FranchiseSupplyTab: React.FC<FranchiseSupplyTabProps> = ({ context, showToast }) => {
  const [orders, setOrders] = useState<FranchiseSupplyOrder[]>(() =>
    globalFranchiseBomEngine.getSupplyOrders(context.isHqUser ? undefined : context.currentFranchiseeId)
  );

  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState<boolean>(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Form states for new order
  const [targetTruckId, setTargetTruckId] = useState<string>(context.currentTruckId || 'truck-01');
  const [coldTemp, setColdTemp] = useState<'冷冻 -18℃' | '冷藏 0-4℃' | '常温通风'>('冷冻 -18℃');
  const [orderAddress, setOrderAddress] = useState<string>('上海市静安区万荣路777号市北高新园区2号停机位');
  const [wagyuQty, setWagyuQty] = useState<number>(200);
  const [briocheQty, setBriocheQty] = useState<number>(200);
  const [gnocchiQty, setGnocchiQty] = useState<number>(6000);
  const [orderNotes, setOrderNotes] = useState<string>('周五前夜市高峰保供补货');

  useEffect(() => {
    const handleUpdate = () => {
      setOrders(
        globalFranchiseBomEngine.getSupplyOrders(context.isHqUser ? undefined : context.currentFranchiseeId)
      );
    };
    window.addEventListener(FRANCHISE_BOM_EVENT, handleUpdate);
    return () => window.removeEventListener(FRANCHISE_BOM_EVENT, handleUpdate);
  }, [context]);

  const filteredOrders = orders.filter((o) => {
    if (selectedStatus === 'all') return true;
    return o.status === selectedStatus;
  });

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const items = [
      {
        materialId: 'mat-001',
        materialName: '日本宫崎A5和牛纯牛肉饼(冷冻)',
        skuCode: 'MAT-WAGYU-A5-100G',
        unit: '块',
        requestedQty: Number(wagyuQty) || 100,
        unitPrice: 12.5,
        subtotal: (Number(wagyuQty) || 100) * 12.5
      },
      {
        materialId: 'mat-002',
        materialName: '定制布里欧迷你小汉堡胚',
        skuCode: 'MAT-BRIOCHE-MINI',
        unit: '个',
        requestedQty: Number(briocheQty) || 100,
        unitPrice: 2.2,
        subtotal: (Number(briocheQty) || 100) * 2.2
      }
    ];

    if (gnocchiQty > 0) {
      items.push({
        materialId: 'mat-005',
        materialName: '中央冷链特级马铃薯玉棋生胚',
        skuCode: 'MAT-GNOCCHI-BASE-200G',
        unit: 'g',
        requestedQty: Number(gnocchiQty),
        unitPrice: 0.065,
        subtotal: Number(gnocchiQty) * 0.065
      });
    }

    const total = items.reduce((sum, item) => sum + item.subtotal, 0);

    const created = globalFranchiseBomEngine.createSupplyOrder({
      franchiseeId: context.currentFranchiseeId === 'HQ' ? 'FRAN-SH-001' : context.currentFranchiseeId,
      franchiseeName: context.operatorName,
      truckId: targetTruckId,
      items,
      totalAmount: Math.round(total),
      deliveryAddress: orderAddress,
      coldChainTempZone: coldTemp,
      notes: orderNotes
    });

    setIsNewOrderModalOpen(false);
    showToast(`订货单 ${created.id} 提交成功！已流转至总部中央物流仓备货。`);
  };

  const handleApprove = (orderId: string) => {
    const trackingNo = `SF-COLD-${Math.floor(100000000 + Math.random() * 900000000)}`;
    globalFranchiseBomEngine.approveSupplyOrder(orderId, trackingNo);
    showToast(`已核准订货单 ${orderId}！生成顺丰冷链干线运单号: ${trackingNo}`);
  };

  const handleConfirmDelivered = (orderId: string) => {
    globalFranchiseBomEngine.markOrderDelivered(orderId);
    showToast(`已确认到车验收入库！物料已记入中央采购台账，并更新防飞单核销底表。`);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h4 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <Boxes className="w-5 h-5 text-slate-700" />
            中央仓冷链原料协同订货流转中心
          </h4>
          <p className="text-xs text-slate-600 mt-0.5">
            加盟商在线发起原料采购申领，总部中央仓集中集采统配发货，保障品牌爆品一致性
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsNewOrderModalOpen(true)}
            className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            发起中央仓订货
          </button>
        </div>
      </div>

      {/* Status filter bar */}
      <div className="flex items-center gap-2 overflow-x-auto text-xs font-medium">
        {[
          { id: 'all', label: '全量订货单' },
          { id: 'submitted', label: '待总部审核' },
          { id: 'in_transit', label: '顺丰冷链在途' },
          { id: 'delivered', label: '已验收入库' }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedStatus(tab.id)}
            className={`px-3 py-1 border transition-colors cursor-pointer ${
              selectedStatus === tab.id
                ? 'bg-slate-900 text-white border-slate-900 font-bold'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Order List */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-white border border-slate-200">
            暂无匹配的中央仓订货单记录
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isSubmitted = order.status === 'submitted';
            const isInTransit = order.status === 'in_transit';
            const isDelivered = order.status === 'delivered';

            return (
              <div key={order.id} className="border border-slate-300 bg-white p-4 shadow-2xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-slate-950 text-sm">{order.id}</span>
                    <span className="text-xs text-slate-600 font-medium">【{order.franchiseeName}】</span>
                    <span className="text-xs font-mono px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-300">
                      目标餐车: {order.truckId}
                    </span>
                    <span className="text-xs font-mono px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
                      <Thermometer className="w-3 h-3 text-blue-600" />
                      {order.coldChainTempZone}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isSubmitted && (
                      <span className="px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> 待总部审核备货
                      </span>
                    )}
                    {isInTransit && (
                      <span className="px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300 flex items-center gap-1 animate-pulse">
                        <Truck className="w-3.5 h-3.5" /> 冷链在途配送中
                      </span>
                    )}
                    {isDelivered && (
                      <span className="px-2 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 已验收入库
                      </span>
                    )}
                  </div>
                </div>

                {/* Items & Address details */}
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 font-medium block mb-1.5">申领物料清单:</span>
                    <div className="space-y-1">
                      {order.items.map((item) => (
                        <div key={item.materialId} className="flex items-center justify-between text-slate-800 font-mono">
                          <span>{item.materialName}</span>
                          <span>
                            {item.requestedQty} {item.unit} × ¥{item.unitPrice} = ¥{item.subtotal.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 text-right font-bold text-slate-900 font-mono">
                      订货总计: ¥{order.totalAmount.toLocaleString()}
                    </div>
                  </div>

                  <div className="space-y-1.5 border-t md:border-t-0 md:border-l border-slate-200 pt-2 md:pt-0 md:pl-4">
                    <div className="text-slate-600">
                      <span className="text-slate-400">停泊收货地址: </span>
                      <span className="font-medium text-slate-900">{order.deliveryAddress}</span>
                    </div>
                    {order.trackingNo && (
                      <div className="text-slate-600 font-mono">
                        <span className="text-slate-400">冷链物流单号: </span>
                        <span className="font-bold text-blue-700">{order.trackingNo}</span>
                      </div>
                    )}
                    <div className="text-slate-400 font-mono text-[11px]">
                      提交时间: {order.createdAt}
                      {order.deliveredAt && ` | 签收时间: ${order.deliveredAt}`}
                    </div>

                    {/* Operational Action Buttons */}
                    <div className="pt-2 flex items-center gap-2">
                      {context.isHqUser && isSubmitted && (
                        <button
                          type="button"
                          onClick={() => handleApprove(order.id)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                        >
                          HQ 核准发货
                        </button>
                      )}

                      {isInTransit && (
                        <button
                          type="button"
                          onClick={() => handleConfirmDelivered(order.id)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1"
                        >
                          <PackageCheck className="w-3.5 h-3.5" /> 车端扫码验收入库
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Order Modal */}
      {isNewOrderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-slate-300 w-full max-w-lg p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h5 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Boxes className="w-5 h-5 text-slate-700" />
                填报特许加盟商中央仓订货单
              </h5>
              <button
                type="button"
                onClick={() => setIsNewOrderModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-3.5 text-xs font-sans">
              <div>
                <label className="block font-bold text-slate-700 mb-1">目标餐车</label>
                <select
                  value={targetTruckId}
                  onChange={(e) => setTargetTruckId(e.target.value)}
                  className="w-full border border-slate-300 p-2 font-mono"
                >
                  <option value="truck-01">01 号流动餐车 (静安卓越)</option>
                  <option value="truck-02">02 号流动餐车 (市北高新)</option>
                  <option value="truck-03">03 号流动餐车 (浦东世博)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">温区要求</label>
                <div className="flex gap-2">
                  {(['冷冻 -18℃', '冷藏 0-4℃', '常温通风'] as const).map((zone) => (
                    <button
                      key={zone}
                      type="button"
                      onClick={() => setColdTemp(zone)}
                      className={`flex-1 py-1.5 border font-mono ${
                        coldTemp === zone ? 'bg-slate-900 text-white border-slate-900 font-bold' : 'bg-white border-slate-300 text-slate-700'
                      }`}
                    >
                      {zone}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 border border-slate-200 p-3 bg-slate-50">
                <span className="font-bold text-slate-800 block">物料订购量配额:</span>
                <div className="flex items-center justify-between">
                  <span>A5和牛肉饼 (块, ¥12.5):</span>
                  <input
                    type="number"
                    value={wagyuQty}
                    onChange={(e) => setWagyuQty(Number(e.target.value))}
                    className="w-24 border border-slate-300 p-1 font-mono text-right"
                    min={50}
                    step={50}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span>布里欧汉堡胚 (个, ¥2.2):</span>
                  <input
                    type="number"
                    value={briocheQty}
                    onChange={(e) => setBriocheQty(Number(e.target.value))}
                    className="w-24 border border-slate-300 p-1 font-mono text-right"
                    min={50}
                    step={50}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span>马铃薯玉棋生胚 (g, ¥0.065):</span>
                  <input
                    type="number"
                    value={gnocchiQty}
                    onChange={(e) => setGnocchiQty(Number(e.target.value))}
                    className="w-24 border border-slate-300 p-1 font-mono text-right"
                    min={1000}
                    step={1000}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">餐车指定停泊交货地址</label>
                <input
                  type="text"
                  value={orderAddress}
                  onChange={(e) => setOrderAddress(e.target.value)}
                  className="w-full border border-slate-300 p-2 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">加急/冷柜降温备忘</label>
                <input
                  type="text"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full border border-slate-300 p-2"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsNewOrderModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-950 text-white font-bold hover:bg-slate-800 cursor-pointer shadow-xs"
                >
                  确认提报订货
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
