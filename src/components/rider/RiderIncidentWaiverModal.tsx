/**
 * Urban Radar 骑手端 - 异常现场取证与一键免责报备面板 (Incident Reporting & Waiver Pool)
 * 包含：餐车压单/门禁阻拦/暴雨路阻拍照举证、免责判定直通车、爆胎故障 SOS 紧急转单池
 */

import React, { useState } from 'react';
import {
  ShieldAlert,
  Camera,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  FileCheck,
  Send,
  LifeBuoy,
  Clock,
  Sparkles
} from 'lucide-react';
import { ActiveDeliveryOrder } from '../../types';

interface WaiverTicket {
  id: string;
  orderNo: string;
  category: 'KITCHEN_SLOW' | 'SECURITY_BLOCKED' | 'BAD_WEATHER' | 'FLAT_TIRE';
  description: string;
  submittedAt: string;
  status: 'approved' | 'reviewing';
  exemptionType: string;
}

interface RiderIncidentWaiverModalProps {
  activeOrders: ActiveDeliveryOrder[];
  showToast: (msg: string) => void;
}

export const RiderIncidentWaiverModal: React.FC<RiderIncidentWaiverModalProps> = ({
  activeOrders,
  showToast
}) => {
  const [selectedOrderNo, setSelectedOrderNo] = useState(activeOrders[0]?.orderNo || 'UR-98215');
  const [incidentType, setIncidentType] = useState<'KITCHEN_SLOW' | 'SECURITY_BLOCKED' | 'BAD_WEATHER' | 'FLAT_TIRE'>('KITCHEN_SLOW');
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [remark, setRemark] = useState('');
  const [waiverHistory, setWaiverHistory] = useState<WaiverTicket[]>([
    {
      id: 'WB-1029',
      orderNo: 'UR-9801',
      category: 'KITCHEN_SLOW',
      description: '餐车现烤炭火慢，后厨待出餐排队达 8 单，已拍摄现场备餐取号票',
      submittedAt: '今日 11:05',
      status: 'approved',
      exemptionType: '已自动豁免 15 分钟超时扣款'
    }
  ]);

  const handleSubmitWaiver = () => {
    const newTicket: WaiverTicket = {
      id: `WB-${Math.floor(1000 + Math.random() * 9000)}`,
      orderNo: selectedOrderNo,
      category: incidentType,
      description: remark || (incidentType === 'KITCHEN_SLOW' ? '餐车出餐慢压单，已核实' : '现场门禁/极端天气不可抗力'),
      submittedAt: '刚刚',
      status: 'approved',
      exemptionType: incidentType === 'FLAT_TIRE' ? '已触发 SOS 转派，手头订单已分配给附近骑手' : '已核准免责，不计入骑手 SLA 超时与差评'
    };

    setWaiverHistory([newTicket, ...waiverHistory]);
    showToast(`✅【免责申请已自动核准】针对订单 ${selectedOrderNo} 的报备已入库，该单超时与考核自动免除！`);
    setRemark('');
    setPhotoUploaded(false);
  };

  const handleSosEmergency = () => {
    showToast('🚨【SOS 紧急求援已广播】已向 1.5km 内 3 名空闲兄弟骑手广播转单请求，订单将在 60 秒内无缝交接！');
  };

  return (
    <div className="space-y-4">
      {/* 顶部 SOS 应急转单求助快速入口 */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 animate-pulse">
            <LifeBuoy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-red-900">
              车辆抛锚 / 爆胎 / 突发事故 SOS 转单求助
            </h3>
            <p className="text-xs text-red-700 mt-0.5">
              遇到不可抗力无法继续骑行时，一键将挂载订单释放给附近空闲骑手救援
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSosEmergency}
          className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shrink-0 cursor-pointer shadow-2xs"
        >
          一键广播 SOS 转单救援
        </button>
      </div>

      {/* 现场拍照举证与一键免责申报表单 */}
      <div className="bg-white border border-[#e3e2e0] rounded-xl p-4 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#f1f1ef]">
          <ShieldAlert className="w-4 h-4 text-purple-600" />
          <h3 className="text-sm font-bold text-[#1a1a17]">
            在途异常现场取证与一键免责报备 (Zero-Penalty Ticket)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-3">
            <div>
              <label className="block text-[#5a5854] font-medium mb-1">选择报备关联在途单</label>
              <select
                value={selectedOrderNo}
                onChange={(e) => setSelectedOrderNo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#d3d1cb] bg-[#fbfbfa] text-xs font-mono font-bold"
              >
                {activeOrders.map((o) => (
                  <option key={o.id} value={o.orderNo}>
                    {o.orderNo} - {o.deliveryAddress}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[#5a5854] font-medium mb-1">异常事件类型</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIncidentType('KITCHEN_SLOW')}
                  className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                    incidentType === 'KITCHEN_SLOW'
                      ? 'border-purple-500 bg-purple-50 text-purple-900 font-bold'
                      : 'border-[#e8e7e4] text-[#5a5854]'
                  }`}
                >
                  🍔 餐车备餐慢压单
                </button>
                <button
                  type="button"
                  onClick={() => setIncidentType('SECURITY_BLOCKED')}
                  className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                    incidentType === 'SECURITY_BLOCKED'
                      ? 'border-purple-500 bg-purple-50 text-purple-900 font-bold'
                      : 'border-[#e8e7e4] text-[#5a5854]'
                  }`}
                >
                  🏢 大厦保安阻拦门禁
                </button>
                <button
                  type="button"
                  onClick={() => setIncidentType('BAD_WEATHER')}
                  className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                    incidentType === 'BAD_WEATHER'
                      ? 'border-purple-500 bg-purple-50 text-purple-900 font-bold'
                      : 'border-[#e8e7e4] text-[#5a5854]'
                  }`}
                >
                  ⛈️ 暴雨道路积水管制
                </button>
                <button
                  type="button"
                  onClick={() => setIncidentType('FLAT_TIRE')}
                  className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                    incidentType === 'FLAT_TIRE'
                      ? 'border-purple-500 bg-purple-50 text-purple-900 font-bold'
                      : 'border-[#e8e7e4] text-[#5a5854]'
                  }`}
                >
                  🛵 车辆故障爆胎
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[#5a5854] font-medium mb-1">补充说明 (选填)</label>
              <input
                type="text"
                placeholder="简短描述现场情况，例如：客梯维保中需步行上18楼..."
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#d3d1cb] bg-[#fbfbfa] text-xs"
              />
            </div>
          </div>

          <div className="space-y-3 flex flex-col justify-between">
            <div>
              <label className="block text-[#5a5854] font-medium mb-1">现场照片举证</label>
              <div
                onClick={() => {
                  setPhotoUploaded(true);
                  showToast('📸【现场照片拍摄就绪】已采集 GPS 地理水印与时间戳 (西藏北路 166 号)');
                }}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                  photoUploaded
                    ? 'border-emerald-500 bg-emerald-50/50'
                    : 'border-[#d3d1cb] hover:border-purple-500 bg-[#fafafa]'
                }`}
              >
                {photoUploaded ? (
                  <div className="space-y-1 text-emerald-800">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                    <div className="font-bold">现场水印照片已上传</div>
                    <div className="text-[11px] text-emerald-700">含 GPS 经纬度及精确至秒时间戳</div>
                  </div>
                ) : (
                  <div className="space-y-1 text-[#787774]">
                    <Camera className="w-8 h-8 text-[#9a9996] mx-auto" />
                    <div className="font-bold text-[#37352f]">点击调起相机拍照举证</div>
                    <div className="text-[11px]">拍摄后厨排队号单或门禁现场</div>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmitWaiver}
              className="w-full py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>提交审核并一键免除超时惩罚</span>
            </button>
          </div>
        </div>
      </div>

      {/* 历史免责与核准明细 */}
      <div className="bg-white border border-[#e3e2e0] rounded-xl p-4 shadow-2xs space-y-3">
        <h4 className="text-xs font-bold text-[#1a1a17]">已核准免责台账记录</h4>
        <div className="space-y-2">
          {waiverHistory.map((t) => (
            <div
              key={t.id}
              className="p-3 bg-[#fbfbfa] rounded-lg border border-[#e8e7e4] flex items-center justify-between text-xs"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#1a1a17]">{t.orderNo}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    {t.exemptionType}
                  </span>
                </div>
                <div className="text-[11px] text-[#787774]">{t.description}</div>
              </div>
              <span className="text-[11px] font-mono text-[#9a9996]">{t.submittedAt}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
