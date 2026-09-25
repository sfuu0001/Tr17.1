import React from 'react';
import { OrderTrackingView } from './OrderTrackingView';
import { TruckInfo } from '../types';

interface RadarMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  truck?: TruckInfo;
  orderId?: string;
  deliveryAddress?: string;
}

export const RadarMapModal: React.FC<RadarMapModalProps> = ({
  isOpen,
  onClose,
  truck,
  orderId = '#UR-98215',
  deliveryAddress
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-md max-h-[95vh] bg-[#FAFAFA] rounded-2xl shadow-2xl overflow-y-auto hide-scrollbar border border-gray-200">
        <OrderTrackingView
          orderId={orderId}
          truck={truck}
          deliveryAddress={deliveryAddress}
          onBackToMenu={onClose}
        />
      </div>
    </div>
  );
};
