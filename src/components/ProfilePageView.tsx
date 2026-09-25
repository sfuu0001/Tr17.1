import React, { useState, useRef, useMemo } from 'react';
import {
  Bell,
  Zap,
  Truck,
  Headset,
  Gift,
  User,
  CreditCard,
  Shield,
  ChevronRight,
  LogOut,
  Sparkles,
  CheckCircle2,
  Lock,
  X,
  Ticket,
  Cloud,
  Edit3,
  KeyRound,
  UserCheck,
  QrCode,
  RotateCw,
  ArrowLeft
} from 'lucide-react';
import { UserCouponsModal } from './UserCouponsModal';
import { UserProfileEditView } from './user/UserProfileEditView';
import { UserAuthModal } from './user/UserAuthModal';
import { INITIAL_USER_COUPONS } from '../data/mockCoupons';
import { INITIAL_USER_PROFILE } from '../data/mockUser';
import { UserCouponRecord } from '../types/coupon';
import { UserProfile, Order } from '../types';
import { safeGetStorage, safeSetStorage } from '../utils/safeStorage';
import { useDevSimulation } from '../context/DevSimulationContext';
import { useToast } from './ui/ToastContext';
import { ACTIVE_BUILD_VERSION, manualForceCloudPurgeAndReload } from '../utils/versionPurgeGateway';
import { purgeUserSessionAndLogout } from '../utils/cloudUserSync';
import { OrganicCardReveal } from '../utils/useCardScrollReveal';

interface ProfilePageViewProps {
  onOpenRadar?: () => void;
  onOpenVIP?: () => void;
  onOpenAddress?: () => void;
  onGoToMenu?: () => void;
  onOpenCoupons?: () => void;
  onOpenCloudSync?: () => void;
  currentAddress?: string;
  isVIPActive?: boolean;
  userProfile?: UserProfile;
  onProfileUpdated?: (updated: UserProfile) => void;
  orders?: Order[];
  onOrdersUpdated?: (orders: Order[]) => void;
}

export const ProfilePageView: React.FC<ProfilePageViewProps> = ({
  onOpenRadar,
  onOpenVIP,
  onOpenAddress,
  onGoToMenu,
  onOpenCoupons,
  onOpenCloudSync,
  currentAddress = '静安大悦城北座 1F 中庭',
  isVIPActive = true,
  userProfile = INITIAL_USER_PROFILE,
  onProfileUpdated,
  orders = [],
  onOrdersUpdated
}) => {
  const toast = useToast();
  const [activeModal, setActiveModal] = useState<'payment' | 'security' | null>(null);
  const [isCouponsOpen, setIsCouponsOpen] = useState(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [profileEditTab, setProfileEditTab] = useState<'profile' | 'addresses' | 'preferences' | 'wallet'>('profile');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'sms' | 'password' | 'register' | 'auto' | 'presets' | 'login'>('sms');
  const [isSignedOut, setIsSignedOut] = useState(false);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Notification toggle state
  const [isNotificationOn, setIsNotificationOn] = useState<boolean>(() =>
    safeGetStorage<boolean>('obsidian_member_notification_on', true)
  );

  const toggleMemberNotification = () => {
    setIsNotificationOn((prev) => {
      const next = !prev;
      safeSetStorage('obsidian_member_notification_on', next);
      showToast(next ? '会员通知已开启：订单与黑卡特权动态将实时提醒' : '会员通知已关闭：将不再接收实时推送');
      return next;
    });
  };

  const { isAdminDeveloper, openDevControlCenter, openDevAuthModal } = useDevSimulation();

  // Read active coupons count
  const availableCouponsCount = useMemo(() => {
    const list = safeGetStorage<UserCouponRecord[]>('obsidian_user_coupons', INITIAL_USER_COUPONS);
    return list.filter((c) => c.status === 'available').length;
  }, [isCouponsOpen]);

  // 3D Parallax Tilt & Holographic Glare Calculations
  const cardWrapperRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isActiveTilt, setIsActiveTilt] = useState(false);

  const updateTiltAndGlare = (clientX: number, clientY: number) => {
    if (!cardWrapperRef.current) return;
    const rect = cardWrapperRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const clampedX = Math.max(0, Math.min(x, rect.width));
    const clampedY = Math.max(0, Math.min(y, rect.height));

    const percentX = (clampedX / rect.width) * 2 - 1;
    const percentY = (clampedY / rect.height) * 2 - 1;

    const tiltX = -percentY * 8;
    const tiltY = percentX * 8;
    setTilt({ x: tiltX, y: tiltY });

    const glarePercentX = ((clampedX / rect.width) * 100).toFixed(1) + '%';
    const glarePercentY = ((clampedY / rect.height) * 100).toFixed(1) + '%';

    cardWrapperRef.current.style.setProperty('--glare-x', glarePercentX);
    cardWrapperRef.current.style.setProperty('--glare-y', glarePercentY);
  };

  const resetTiltAndGlare = () => {
    setTilt({ x: 0, y: 0 });
    setIsActiveTilt(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsActiveTilt(true);
    updateTiltAndGlare(e.clientX, e.clientY);
  };

  const handleMouseLeave = () => {
    resetTiltAndGlare();
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setIsActiveTilt(true);
    if (e.touches && e.touches[0]) {
      updateTiltAndGlare(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches && e.touches[0]) {
      updateTiltAndGlare(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchEnd = () => {
    setTimeout(resetTiltAndGlare, 300);
  };

  const toggleCardFlip = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setIsCardFlipped((prev) => !prev);
  };

  const showToast = (msg: string) => {
    toast.info(msg);
  };

  const handlePerkClick = (perkName: string) => {
    if (onOpenVIP) {
      onOpenVIP();
    } else {
      toast.success(`已激活黑卡特权: ${perkName}`);
    }
  };

  const handleSignOut = async () => {
    await purgeUserSessionAndLogout();
    setIsSignedOut(true);
    toast.info('已安全退出登录', '已清空本地用户文件与凭据残留，切换至纯净访客模式');
    if (onProfileUpdated) {
      onProfileUpdated({
        uid: 'guest',
        nickname: '访客食客',
        phone: '',
        membershipTier: 'standard',
        points: 0,
        balance: 0,
        couponsCount: 0,
        addresses: [],
        favoriteDishIds: []
      } as any);
    }
  };

  const handleOpenAuth = (mode: 'sms' | 'password' | 'register' | 'auto' | 'presets' | 'login' = 'sms') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  // If user opened embedded profile/settings page
  if (isProfileEditOpen) {
    return (
      <div className="w-full min-h-screen bg-[#f4f4f2] text-[#1a1a17] flex flex-col font-sans select-none animate-in fade-in duration-200">
        <UserProfileEditView
          userProfile={userProfile}
          onProfileUpdated={(updated) => {
            if (onProfileUpdated) onProfileUpdated(updated);
          }}
          onBack={() => setIsProfileEditOpen(false)}
          initialTab={profileEditTab}
        />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#f6f6f4] text-[#1a1a17] pb-10 select-none font-sans">
      {/* Main Container - 全屏响应式展开，底部导航栏常驻 */}
      <div className="w-full max-w-5xl mx-auto min-h-screen px-3.5 sm:px-6 pt-4 pb-28 flex flex-col gap-5">
        {/* BEGIN: HeaderSection */}
        <header className="flex flex-col gap-2.5" data-purpose="page-header">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              id="profile-header-back-btn"
              onClick={() => {
                if (onGoToMenu) {
                  onGoToMenu();
                } else if (typeof window !== 'undefined' && window.history.length > 1) {
                  window.history.back();
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-brand-border rounded-lg text-xs font-bold tracking-wide text-brand-dark shadow-sm hover:bg-neutral-50 hover:border-neutral-400 active:scale-95 transition-all flex-shrink-0 cursor-pointer group"
              aria-label="返回点餐"
              title="返回点餐"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-neutral-800 transition-transform group-hover:-translate-x-0.5" />
              <span className="text-xs font-bold">返回点餐</span>
            </button>

            <div className="flex-1 min-w-0 flex items-center justify-center px-1">
              <span className="text-sm font-extrabold text-neutral-900 tracking-tight">会员特权与黑卡中心</span>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setProfileEditTab('profile');
                  setIsProfileEditOpen(true);
                }}
                className="inline-flex items-center gap-1 px-2 py-1.5 bg-white border border-brand-border rounded-full text-xs font-bold text-neutral-700 shadow-sm active:scale-95 transition cursor-pointer hover:bg-neutral-50"
              >
                <Edit3 className="w-3.5 h-3.5 text-brand-emerald" />
                <span>资料设置</span>
              </button>

              <button
                type="button"
                aria-label="通知"
                onClick={toggleMemberNotification}
                className="w-7 h-7 rounded-full bg-white border border-brand-border flex items-center justify-center text-neutral-600 shadow-sm relative active:scale-95 transition flex-shrink-0 cursor-pointer hover:bg-neutral-50"
                title={isNotificationOn ? '通知已开启（点击关闭）' : '通知已关闭（点击开启）'}
              >
                <Bell className={`w-3.5 h-3.5 ${isNotificationOn ? 'text-neutral-800' : 'text-neutral-400'}`} />
                {isNotificationOn && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-brand-emerald rounded-full" />}
              </button>
            </div>
          </div>
        </header>
        {/* END: HeaderSection */}

        {/* BEGIN: UserProfileBar */}
        <OrganicCardReveal className="w-full">
          <section className="bg-white rounded-xl p-3 border border-brand-border shadow-card flex items-center justify-between" data-purpose="user-profile-summary">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {/* Avatar with verified check badge */}
            <div className="relative flex-shrink-0">
              <div className="w-11 h-11 rounded-full overflow-hidden border border-neutral-200 bg-neutral-100 flex items-center justify-center">
                {userProfile.avatar && !isSignedOut ? (
                  <img
                    src={userProfile.avatar}
                    alt={userProfile.nickname}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-6 h-6 text-neutral-400" />
                )}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-brand-emerald rounded-full flex items-center justify-center text-white ring-2 ring-white">
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
                </svg>
              </span>
            </div>

            {/* User Meta Info */}
            <div className="flex flex-col leading-tight min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-neutral-900 tracking-tight truncate">
                  {isSignedOut ? '访客食客 (未登录)' : userProfile.nickname || '黑曜石先锋食客 #7F72E5'}
                </span>
                <span className="text-[10px] bg-neutral-100 text-neutral-500 font-medium px-1.5 py-0.2 rounded border border-neutral-200">
                  UID: {isSignedOut ? 'GUEST' : userProfile.uid ? userProfile.uid.slice(-4) : '72e5'}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-neutral-500 mt-1">
                <span className="font-medium">{isSignedOut ? '未绑定手机号' : userProfile.phone || '138-0000-6357'}</span>
                <span className="text-neutral-300">·</span>
                <span className="inline-flex items-center gap-0.5 text-brand-emerald font-medium">
                  <Cloud className="w-3 h-3" />
                  云函数已打通
                </span>
              </div>
            </div>
          </div>

          {/* Right Balance and Switch */}
          <div className="flex items-center gap-2 pl-2 flex-shrink-0">
            <div className="text-right">
              <div className="text-sm font-extrabold text-neutral-900 leading-none">
                ¥{isSignedOut ? '0.00' : userProfile.balance.toFixed(2)}
              </div>
              <div className="text-[10px] text-neutral-400 mt-0.5">账户余额</div>
            </div>
            <button
              type="button"
              onClick={() => handleOpenAuth('presets')}
              className="inline-flex items-center gap-0.5 px-2 py-1.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-md text-neutral-700 text-xs font-semibold tracking-tight transition active:scale-95 cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-brand-emerald" />
              <span>换号</span>
            </button>
          </div>
        </section>
        </OrganicCardReveal>
        {/* END: UserProfileBar */}

        {/* BEGIN: ObsidianVipCard */}
        <div
          ref={cardWrapperRef}
          id="vip-card-wrapper"
          data-purpose="card-wrapper"
          onClick={() => toggleCardFlip()}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`card-perspective-container cursor-pointer select-none ${isActiveTilt ? 'is-active' : ''}`}
          style={{
            transform: `rotateX(${tilt.x}deg) rotateY(${isCardFlipped ? -tilt.y : tilt.y}deg)`,
            transition: isActiveTilt ? 'transform 0.1s ease-out' : 'transform 0.4s ease-out'
          }}
        >
          <article
            id="vip-card"
            data-purpose="obsidian-vip-card"
            className={`card-flipper relative w-full min-h-[200px] rounded-xl shadow-black-card ${
              isCardFlipped ? 'is-flipped' : ''
            }`}
          >
            {/* CARD FRONT */}
            <div
              className="card-front absolute inset-0 obsidian-mesh rounded-xl p-4 text-white border border-neutral-700/70 flex flex-col justify-between select-none"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden'
              }}
            >
              <div className="glare-overlay absolute inset-0 rounded-xl pointer-events-none" />

              {/* Top Row: Microchip, Status, Flip Trigger */}
              <div className="relative z-10 flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-5 rounded-sm chip-gold p-0.5 border border-amber-300 shadow flex flex-col justify-between flex-shrink-0">
                    <div className="w-full h-0.5 bg-black/25 rounded" />
                    <div className="w-full h-0.5 bg-black/25 rounded" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] tracking-widest text-amber-300/90 uppercase font-semibold leading-tight">
                      STATUS
                    </span>
                    <span className="text-[11px] font-bold text-white tracking-tight flex items-center gap-1 leading-tight">
                      {isSignedOut ? 'GUEST' : 'ACTIVE'}
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-emeraldLight animate-pulse" />
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => toggleCardFlip(e)}
                  className="flip-trigger inline-flex items-center gap-1 text-[11px] font-medium text-neutral-300 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 px-2 py-1 rounded-md transition active:scale-95 cursor-pointer"
                >
                  <RotateCw className="w-3 h-3 text-amber-300" />
                  <span className="leading-none">点击翻面</span>
                </button>
              </div>

              {/* Center Row: VIP Title & Holographic Barcode */}
              <div className="relative z-10 my-1 flex flex-col items-center justify-center">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-extrabold tracking-wider text-white uppercase font-sans">
                    VIP ELITE
                  </h2>
                  <Sparkles className="w-4 h-4 text-brand-emeraldLight flex-shrink-0" />
                </div>

                <div className="mt-1.5 w-full max-w-[260px] bg-neutral-950/90 border border-neutral-700/80 rounded px-2.5 py-1.5 flex flex-col items-center justify-center">
                  <div className="h-5 w-full flex items-center justify-center gap-[3px] overflow-hidden opacity-90">
                    <div className="w-[2px] h-full bg-white" />
                    <div className="w-[3px] h-full bg-white" />
                    <div className="w-[1px] h-full bg-white" />
                    <div className="w-[4px] h-full bg-white" />
                    <div className="w-[1px] h-full bg-white" />
                    <div className="w-[2px] h-full bg-white" />
                    <div className="w-[4px] h-full bg-white" />
                    <div className="w-[1px] h-full bg-white" />
                    <div className="w-[3px] h-full bg-white" />
                    <div className="w-[1px] h-full bg-white" />
                    <div className="w-[4px] h-full bg-white" />
                    <div className="w-[2px] h-full bg-white" />
                    <div className="w-[3px] h-full bg-white" />
                    <div className="w-[1px] h-full bg-white" />
                    <div className="w-[4px] h-full bg-white" />
                    <div className="w-[2px] h-full bg-white" />
                    <div className="w-[3px] h-full bg-white" />
                    <div className="w-[1px] h-full bg-white" />
                    <div className="w-[4px] h-full bg-white" />
                    <div className="w-[2px] h-full bg-white" />
                  </div>
                  <span className="mt-1 text-[10px] tracking-widest text-neutral-300 font-bold leading-none">
                    VIP · {userProfile.uid ? userProfile.uid.slice(-4).toUpperCase() : '7F72'} · E500 · 8892
                  </span>
                </div>
              </div>

              {/* Bottom Row: Points to Next Tier & Emerald Bar */}
              <div className="relative z-10 pt-1">
                <div className="flex justify-between items-end text-[10px] tracking-tight text-neutral-400 mb-1">
                  <span className="uppercase font-semibold">POINTS TO NEXT TIER</span>
                  <span className="text-neutral-300 font-medium">
                    <strong className="text-white font-bold">{isSignedOut ? 0 : userProfile.points || 1000}</strong> / 5,000
                  </span>
                </div>
                <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden p-[1px]">
                  <div
                    className="bg-gradient-to-r from-brand-emerald to-emerald-300 h-full rounded-full transition-all duration-700"
                    style={{
                      width: isSignedOut ? '0%' : `${Math.min(100, ((userProfile.points || 1000) / 5000) * 100)}%`
                    }}
                  />
                </div>
              </div>
            </div>

            {/* CARD BACK */}
            <div
              className="card-back absolute inset-0 obsidian-mesh rounded-xl p-4 text-white border border-neutral-700/70 flex flex-col justify-between select-none"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden'
              }}
            >
              <div className="glare-overlay absolute inset-0 rounded-xl pointer-events-none" />

              <div className="relative z-10 flex items-center justify-between border-b border-neutral-700/60 pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] tracking-wider text-neutral-400 uppercase font-bold">
                    BLACK OBSIDIAN PRIVILEGE
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                    L3 ACTIVE
                  </span>
                </div>

                <button
                  type="button"
                  onClick={(e) => toggleCardFlip(e)}
                  className="flip-trigger inline-flex items-center gap-1 text-[11px] font-medium text-neutral-300 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 px-2 py-1 rounded-md transition active:scale-95 cursor-pointer"
                >
                  <RotateCw className="w-3 h-3 text-amber-300" />
                  <span className="leading-none">翻回正面</span>
                </button>
              </div>

              <div className="relative z-10 flex items-center justify-between gap-3 my-1">
                <div className="flex flex-col gap-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-neutral-400">食客身份</span>
                    <span className="text-xs font-bold text-amber-400">
                      #{userProfile.uid ? userProfile.uid.slice(-6).toUpperCase() : '7F72E5'}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-300 flex flex-col gap-0.5">
                    <span className="font-medium text-white">尊享黑卡权益保障</span>
                    <span className="text-[10px] text-brand-emeraldLight">全单9折 · 极速出餐免排队</span>
                  </div>
                </div>

                <div className="w-16 h-16 bg-white rounded-lg p-1.5 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <QrCode className="w-full h-full text-neutral-900" />
                </div>
              </div>

              <div className="pt-2 relative z-10 border-t border-neutral-800/80 flex items-center justify-between text-[10px] text-neutral-400">
                <div>
                  VALID THRU <span className="text-amber-300 font-bold">2026/12/31</span>
                </div>
                <div className="text-brand-emeraldLight font-semibold">URBAN RADAR VIP</div>
              </div>
            </div>
          </article>
        </div>
        {/* END: ObsidianVipCard */}

        {/* BEGIN: AccountAndSecurity */}
        <OrganicCardReveal className="w-full">
        <section data-purpose="account-and-security">
          <h3 className="text-base font-black tracking-tight text-neutral-900 mb-2">Account &amp; Security</h3>
          <div className="bg-white rounded-xl border border-brand-border shadow-card divide-y divide-neutral-100 overflow-hidden">
            {/* Exclusive Perks Box */}
            <div className="p-3 bg-neutral-50/60">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-neutral-900 tracking-tight">Exclusive Perks</span>
                  <span className="text-[10px] font-semibold text-brand-emerald bg-brand-emeraldMuted px-2 py-0.5 rounded-full border border-emerald-200">
                    4 项尊享权益
                  </span>
                </div>
                <span className="text-[10px] text-neutral-400 font-medium">黑卡特权生效中</span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenRadar) {
                      onOpenRadar();
                    } else {
                      handlePerkClick('Priority Radar');
                    }
                  }}
                  className="bg-white rounded-lg p-2 border border-brand-border text-center shadow-sm flex flex-col items-center justify-center gap-1 hover:border-neutral-400 transition cursor-pointer active:scale-95"
                >
                  <div className="w-7 h-7 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-800">
                    <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  </div>
                  <span className="text-[10px] font-bold text-neutral-800 leading-tight">Priority Radar</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePerkClick('Free Delivery')}
                  className="bg-white rounded-lg p-2 border border-brand-border text-center shadow-sm flex flex-col items-center justify-center gap-1 hover:border-neutral-400 transition cursor-pointer active:scale-95"
                >
                  <div className="w-7 h-7 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-800">
                    <Truck className="w-3.5 h-3.5 text-brand-emerald" />
                  </div>
                  <span className="text-[10px] font-bold text-neutral-800 leading-tight">Free Delivery</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePerkClick('VIP Support')}
                  className="bg-white rounded-lg p-2 border border-brand-border text-center shadow-sm flex flex-col items-center justify-center gap-1 hover:border-neutral-400 transition cursor-pointer active:scale-95"
                >
                  <div className="w-7 h-7 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-800">
                    <Headset className="w-3.5 h-3.5 text-neutral-700" />
                  </div>
                  <span className="text-[10px] font-bold text-neutral-800 leading-tight">VIP Support</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePerkClick('Monthly Gift')}
                  className="bg-white rounded-lg p-2 border border-brand-border text-center shadow-sm flex flex-col items-center justify-center gap-1 hover:border-neutral-400 transition cursor-pointer active:scale-95"
                >
                  <div className="w-7 h-7 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-800">
                    <Gift className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <span className="text-[10px] font-bold text-neutral-800 leading-tight">Monthly Gift</span>
                </button>
              </div>
            </div>

            {/* Coupons Banner Row */}
            <div
              onClick={() => {
                if (onOpenCoupons) {
                  onOpenCoupons();
                } else {
                  setIsCouponsOpen(true);
                }
              }}
              className="p-3 hover:bg-neutral-50 transition flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-white flex-shrink-0 mt-0.5">
                  <Ticket className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-neutral-900">我的优惠券包</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded">
                      {availableCouponsCount} 张可用
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5 leading-tight">
                    查看全品类通用券、时段专享券与过期失效记录
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-0.5 text-xs text-brand-emerald font-semibold flex-shrink-0 ml-2">
                <span className="bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded text-[11px]">
                  管理与兑换
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
              </div>
            </div>

            {/* Auth Center Row */}
            <div className="p-3 bg-emerald-50/40 hover:bg-emerald-50/70 transition flex items-center justify-between">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-emerald flex items-center justify-center text-white flex-shrink-0 mt-0.5">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-neutral-900">账号注册、登录与身份切换</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-brand-emerald text-white rounded">
                      AUTH
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5 leading-tight">
                    支持短信验证码、账号密码注册登录与多身份极速切换
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleOpenAuth('sms')}
                className="flex-shrink-0 ml-2 inline-flex items-center gap-0.5 text-xs font-bold text-brand-emerald border border-brand-emerald/40 px-2.5 py-1 rounded-full bg-white hover:bg-emerald-50 active:scale-95 transition cursor-pointer"
              >
                注册 / 登录
                <ChevronRight className="w-3 h-3 stroke-[2.5]" />
              </button>
            </div>

            {/* Personal Info & Addresses Row */}
            <div
              onClick={() => {
                setProfileEditTab('addresses');
                setIsProfileEditOpen(true);
              }}
              className="p-3 hover:bg-neutral-50 transition flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-700 flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-neutral-900 block">Personal Information &amp; Addresses</span>
                  <p className="text-[11px] text-neutral-400 mt-0.5">管理头像、昵称、常用地址簿与就餐偏好</p>
                </div>
              </div>
              <div className="flex items-center gap-0.5 text-xs text-brand-emerald font-semibold flex-shrink-0">
                <span className="bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded text-[11px]">
                  {userProfile.addresses?.length || 1} 个地址
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
              </div>
            </div>

            {/* Payment Methods Row */}
            <div
              onClick={() => setActiveModal('payment')}
              className="p-3 hover:bg-neutral-50 transition flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-700 flex-shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-neutral-900">Payment Methods</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
            </div>

            {/* Privacy & Security Row */}
            <div
              onClick={() => setActiveModal('security')}
              className="p-3 hover:bg-neutral-50 transition flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-700 flex-shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-neutral-900">Privacy &amp; Security</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
            </div>

            {/* Developer Auth & Center Row */}
            <div
              onClick={() => {
                if (isAdminDeveloper) {
                  openDevControlCenter();
                } else {
                  openDevAuthModal();
                }
              }}
              className="p-3 hover:bg-neutral-50 transition flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-600 flex-shrink-0 mt-0.5">
                  {isAdminDeveloper ? <Sparkles className="w-4 h-4 text-amber-500" /> : <Lock className="w-4 h-4" />}
                </div>
                <div>
                  <span className="text-xs font-bold text-neutral-900 block">
                    {isAdminDeveloper ? '开发者模拟与调试中枢' : '开发者账号登录认证'}
                  </span>
                  <p className="text-[11px] text-neutral-400 mt-0.5 leading-tight">
                    {isAdminDeveloper
                      ? '已登录开发者账号 · 悬浮调试入口与控制中枢已激活'
                      : '登录开发者账号以后才会在界面显示悬浮调试入口'}
                  </p>
                </div>
              </div>
              <div className="flex-shrink-0 ml-2 inline-flex items-center gap-0.5 text-xs text-neutral-700 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded">
                <span>{isAdminDeveloper ? '配置中枢 ⚡' : '登录开发者 🔑'}</span>
                <ChevronRight className="w-3 h-3 text-neutral-400 stroke-[2.5]" />
              </div>
            </div>

            {/* Version & Cloud Sync Governance Row */}
            <div className="p-3 hover:bg-neutral-50 transition flex items-center justify-between border-t border-neutral-100">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5 border border-emerald-200">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-neutral-900 block">云端实时拉取与版本自愈</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded">
                      {ACTIVE_BUILD_VERSION}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5 leading-tight">
                    数据源直连腾讯云开发，换版自动清理残留并实时同步
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  toast.info('正在清理残留并从云端全量拉取...');
                  manualForceCloudPurgeAndReload();
                }}
                className="flex-shrink-0 ml-2 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-2.5 py-1 rounded-lg transition active:scale-95 cursor-pointer"
                title="清空本地所有旧版本缓存并从云端拉取最新数据"
              >
                <RotateCw className="w-3 h-3" />
                <span>云端强刷</span>
              </button>
            </div>
          </div>
        </section>
        </OrganicCardReveal>
        {/* END: AccountAndSecurity */}

        {/* BEGIN: FooterActionButtons */}
        <footer className="mt-2 flex items-center justify-center gap-4" data-purpose="footer-account-switch">
          <button
            type="button"
            aria-label="切换用户"
            title="切换 / 注册新号"
            onClick={() => handleOpenAuth('presets')}
            className="w-11 h-11 bg-white border border-brand-border rounded-xl text-neutral-700 shadow-sm hover:bg-neutral-50 flex items-center justify-center transition active:scale-95 cursor-pointer"
          >
            <UserCheck className="w-5 h-5 text-neutral-700" />
          </button>

          <button
            type="button"
            aria-label="安全退出"
            title="安全退出登录"
            onClick={handleSignOut}
            className="w-11 h-11 bg-white border border-red-200 rounded-xl text-red-600 shadow-sm hover:bg-red-50/50 flex items-center justify-center transition active:scale-95 cursor-pointer"
          >
            <LogOut className="w-5 h-5 text-red-500" />
          </button>
        </footer>
        {/* END: FooterActionButtons */}
      </div>

      {/* Payment Methods Modal */}
      {activeModal === 'payment' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 border border-brand-border shadow-2xl relative animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-brand-dark" />
                <h4 className="font-bold text-sm text-neutral-900">支付方式管理</h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-6 h-6 rounded-full hover:bg-neutral-100 flex items-center justify-center text-neutral-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-4 space-y-2.5 text-xs">
              <div className="p-3 rounded-xl border border-neutral-900 bg-neutral-50 flex items-center justify-between">
                <div>
                  <span className="font-bold text-neutral-900 block">微信支付 (WeChat Pay)</span>
                  <span className="text-[10px] text-neutral-500">默认快捷免密支付</span>
                </div>
                <span className="text-[10px] font-bold text-brand-emerald bg-brand-emeraldMuted px-2 py-0.5 rounded border border-emerald-200">
                  已绑定
                </span>
              </div>
              <div className="p-3 rounded-xl border border-neutral-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-neutral-900 block">支付宝 (Alipay)</span>
                  <span className="text-[10px] text-neutral-500">花呗/余额宝安全支付</span>
                </div>
                <span className="text-[10px] font-bold text-brand-emerald bg-brand-emeraldMuted px-2 py-0.5 rounded border border-emerald-200">
                  已绑定
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 bg-brand-charcoal text-white text-xs font-bold rounded-xl hover:bg-neutral-800 transition active:scale-[0.99] cursor-pointer"
            >
              确定
            </button>
          </div>
        </div>
      )}

      {/* Privacy & Security Modal */}
      {activeModal === 'security' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 border border-brand-border shadow-2xl relative animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-brand-dark" />
                <h4 className="font-bold text-sm text-neutral-900">隐私与安全中心</h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-6 h-6 rounded-full hover:bg-neutral-100 flex items-center justify-center text-neutral-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-4 space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                <span className="font-bold text-neutral-900 block">数据端到端加密保护</span>
                <span className="text-[10px] text-neutral-500 mt-0.5 block">
                  您的订单位置信息及支付凭证均受 TLS 1.3 银行级协议加密。
                </span>
              </div>
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                <span className="font-bold text-neutral-900 block">匿名点单隐私模式</span>
                <span className="text-[10px] text-neutral-500 mt-0.5 block">
                  餐车骑手仅获取脱敏虚拟电话与地址末段编号。
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 bg-brand-charcoal text-white text-xs font-bold rounded-xl hover:bg-neutral-800 transition active:scale-[0.99] cursor-pointer"
            >
              完成
            </button>
          </div>
        </div>
      )}

      {/* Unified User Auth Modal */}
      <UserAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        onLoginSuccess={(user) => {
          setIsSignedOut(false);
          if (onProfileUpdated) {
            onProfileUpdated(user);
          }
          showToast(`登录成功，欢迎 ${user.nickname}！`);
        }}
      />

      {/* User Coupons Management Center Modal */}
      <UserCouponsModal
        isOpen={isCouponsOpen}
        onClose={() => setIsCouponsOpen(false)}
        onGoToMenu={onGoToMenu}
        isVIPActive={isVIPActive}
      />
    </div>
  );
};
