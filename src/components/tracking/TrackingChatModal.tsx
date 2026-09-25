import React from 'react';
import { CourierInfo } from '../../types/tracking';
import { Order } from '../../types';
import { UnifiedOmniChatModal } from '../chat/UnifiedOmniChatModal';

export interface TrackingChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  courier?: CourierInfo;
  order?: Order;
  orderId?: string;
  deliveryAddress?: string;
  onCallPhone?: () => void;
  onAdvanceOrderStatus?: (orderId: string, targetStatus?: Order['status'], extraDetails?: Partial<Order>) => void;
  showToast?: (msg: string) => void;
}

export const TrackingChatModal: React.FC<TrackingChatModalProps> = ({
  isOpen,
  onClose,
  courier,
  order,
  orderId = '#DEL-9912',
  deliveryAddress,
  onCallPhone,
  onAdvanceOrderStatus,
  showToast
}) => {
  return (
    <UnifiedOmniChatModal
      isOpen={isOpen}
      onClose={onClose}
      order={order}
      orderNo={order?.orderNo || orderId}
      viewerRole="user"
      onAdvanceOrderStatus={onAdvanceOrderStatus}
      showToast={showToast}
    />
  );
};
