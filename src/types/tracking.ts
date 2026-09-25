import { DishItem, TruckInfo } from '../types';

export type TrackingStatus =
  | 'ordered'
  | 'cooking'
  | 'ready'
  | 'rider_heading'
  | 'waiting_pickup'
  | 'picked_up'
  | 'delivering'
  | 'delivered'
  | 'cancel_requested'
  | 'merchant_rejected'
  | 'rider_rejected'
  | 'reassigning_rider'
  | 'refunded';

export interface TrackingDishItem {
  name: string;
  count: number;
  spec?: string;
  price: number;
}

export interface CourierInfo {
  id: string;
  name: string;
  enName?: string;
  title: string;
  phone: string;
  rating: number;
  completedOrders: number;
  isInsulatedBoxSanitized: boolean;
  avatarUrl?: string;
}

export interface TrackingTimelineLog {
  time: string;
  title: string;
  desc: string;
  status?: string;
}

export interface OrderTrackingData {
  orderId: string;
  createdAt: string;
  estimatedDeliveryTime: string;
  remainingMinutes: number;
  status: TrackingStatus;
  statusLabel: string;
  subStatusLabel?: string;
  speedKmH: number;
  remainingDistanceMeters: number;
  courier: CourierInfo;
  dishes: TrackingDishItem[];
  packageFee: number;
  deliveryFee: number;
  discountFee: number;
  totalAmount: number;
  destinationAddress: string;
  truckName?: string;
  truckDistanceKm?: number;
  logs: TrackingTimelineLog[];
}
