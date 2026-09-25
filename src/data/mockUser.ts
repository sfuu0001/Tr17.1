import { UserProfile } from '../types/user';

export const INITIAL_USER_PROFILE: UserProfile = {
  uid: 'tcb_u_88201948',
  nickname: 'Urban Foodie (美食探险家)',
  phone: '138-8888-9201',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  bio: '黑曜石流动餐车站常驻先锋食客，热衷和牛炭烤与冷萃特调。',
  gender: 'secret',
  birthday: '1998-06-18',
  membershipTier: 'vip_black_elite',
  isVIPActive: true,
  points: 4250,
  balance: 168.5,
  addresses: [
    {
      id: 'addr-1',
      name: '张先生 (本人)',
      phone: '138-8888-9201',
      tag: '公司',
      address: '静安大悦城北座 商务楼',
      detail: '12 楼 1204 室 (前台转交)',
      isDefault: true,
      createdAt: '2026-08-01 10:20:00'
    },
    {
      id: 'addr-2',
      name: '张先生',
      phone: '138-8888-9201',
      tag: '家',
      address: '静安区曲阜路 188 弄 华润苏河湾',
      detail: '3 号楼 1802 室',
      isDefault: false,
      createdAt: '2026-08-10 18:35:00'
    },
    {
      id: 'addr-3',
      name: 'Lucy (朋友)',
      phone: '139-6688-2345',
      tag: '其他',
      address: '世纪大都会下沉广场 2 号出入口',
      detail: '靠星巴克露天长椅旁',
      isDefault: false,
      createdAt: '2026-08-18 14:10:00'
    }
  ],
  preferences: {
    spiciness: 'mild',
    cutlery: 'eco',
    autoApplyCoupons: true,
    radarTracking: true,
    smsNotification: true,
    dietaryNote: '少盐，不加香菜，和牛小汉堡七分熟'
  },
  walletHistory: [
    {
      id: 'w-01',
      type: 'recharge',
      title: '账户线上充值 (送VIP特惠券)',
      amount: 200.0,
      balanceAfter: 259.5,
      timestamp: '2026-08-20 09:30'
    },
    {
      id: 'w-02',
      type: 'expense',
      title: '餐车订单支付 - UR-9821',
      amount: -91.0,
      balanceAfter: 168.5,
      timestamp: '2026-08-25 12:40',
      orderNo: 'UR-9821'
    },
    {
      id: 'w-03',
      type: 'reward',
      title: '黑曜石会员能量日返现',
      amount: 15.0,
      balanceAfter: 168.5,
      timestamp: '2026-08-24 18:00'
    }
  ],
  cloudSyncedAt: new Date().toISOString(),
  authProvider: 'cloudbase_auth',
  createdAt: '2026-01-15 12:00:00'
};
