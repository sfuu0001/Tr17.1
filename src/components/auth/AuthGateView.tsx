import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  UtensilsCrossed,
  Wifi,
  Fingerprint,
  ShieldCheck,
  MessageSquareText,
  KeyRound,
  UserCheck,
  Search,
  X,
  Timer,
  BadgeCheck,
  Cpu,
  Activity,
  ShieldAlert,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  RefreshCw,
  Flame,
  type LucideIcon
} from 'lucide-react';
import {
  PRESET_MERCHANT_STAFF,
  PRESET_RIDERS,
  loginMerchantWithPhone,
  loginRiderWithPhone,
  MerchantSession,
  RiderSession,
  maskPhoneNumber
} from '../../utils/staffAndRiderAuthEngine';
import { collectDeviceHardwareDetails, DeviceHardwareDetails } from '../../utils/deviceFingerprint';
import {
  verifyAndGrantManagerOverride,
  getActiveManagerOverride,
  ManagerOverrideSession,
  recordSecurityAuditLog
} from '../../utils/rbacEngine';
import { safeGetStorage, safeSetStorage } from '../../utils/safeStorage';

/* ============================================================================
 * AuthGateView — 统一路由登录门（全屏接管式）
 * ----------------------------------------------------------------------------
 * 视觉来源：stitch_urban_radar_design_system (5) / code.html
 *   左 8 栏：出餐工坊画廊轮播（菜品实拍 + 工匠参数标签 + 进度指示）
 *   右 4 栏：身份核验面板（模式切换 / 在册专员速选 / 手机口令 / 主密码）
 *            + 硬件指纹与信道监测折叠模块
 *
 * 取代原先的 StaffRiderPhoneAuthModal 弹窗，成为商户端 / 骑手端的唯一登录入口；
 * 平台总控端因凭据类型不同（工号 + 6 位 PIN 门禁），仍走 PlatformAuthModal。
 *
 * 与参考稿的差异（有意为之，均已就地注释）：
 *   · 参考稿的「意面工坊」文案与西餐图 → 换成 Urban Radar 自有菜品与实拍图
 *   · 沙盒验证码 668822 → 项目真实沙盒码 888888（与 auth 引擎一致）
 * ========================================================================== */

export type AuthGateRole = 'merchant' | 'rider';

interface GateSlide {
  image: string;
  category: string;
  categoryTone: string;
  refCode: string;
  title: string;
  enName: string;
  desc: string;
  specs: Array<{ icon: LucideIcon; label: string; value: string; tone: string }>;
}

import skewersImg from '../../assets/images/skewers_dark_1788023181816.jpg';
import wagyuBurgerImg from '../../assets/images/wagyu_burger_dark_1788023170035.jpg';
import lobsterImg from '../../assets/images/lowkey_lobster_1788031977894.jpg';
import coldBrewImg from '../../assets/images/cold_brew_dark_1788023235365.jpg';

const SLIDES: GateSlide[] = [
  {
    image: skewersImg,
    category: 'BINCHOTAN SKEWER · CHAR',
    categoryTone: 'bg-amber-400/95 text-neutral-900',
    refCode: 'IT-011',
    title: '备长炭烤和牛串',
    enName: 'Binchotan Wagyu Skewer',
    desc: '精选 M8-9 和牛分割部位，备长炭白焰直烤 420℃，表面焦壳锁汁、内里粉嫩，佐以主理人特调配方的炙烤椒盐。',
    specs: [
      { icon: Timer, label: '炭火节拍', value: '90s 翻烤', tone: 'text-amber-300' },
      { icon: Flame, label: '核心温控', value: '56℃ 三分熟', tone: 'text-amber-300' },
      { icon: BadgeCheck, label: '出品标准', value: 'L1 招牌必点', tone: 'text-emerald-300' },
      { icon: Fingerprint, label: '原料溯源', value: '澳洲谷物饲育', tone: 'text-sky-300' }
    ]
  },
  {
    image: wagyuBurgerImg,
    category: 'SMOKED BURGER · WAGYU',
    categoryTone: 'bg-orange-400/95 text-neutral-900',
    refCode: 'IT-035',
    title: '炭烤果木和牛堡',
    enName: 'Smoked Wagyu Burger',
    desc: '果木明火双面炙烤，厚切和牛饼保持 68℃ 粉嫩芯温，叠加车达芝士与秘制黑椒酱，出炉静置 2 分钟锁汁。',
    specs: [
      { icon: Timer, label: '煎烤控温', value: '9m 00s', tone: 'text-amber-300' },
      { icon: Flame, label: '面包工艺', value: 'Fermo 极限张力', tone: 'text-orange-300' },
      { icon: BadgeCheck, label: '酱汁标准', value: '秘制黑椒果木', tone: 'text-emerald-300' },
      { icon: Fingerprint, label: '原料溯源', value: '和牛肩胛现绞', tone: 'text-sky-300' }
    ]
  },
  {
    image: lobsterImg,
    category: 'COASTAL SEAFOOD · BLACK',
    categoryTone: 'bg-yellow-300/95 text-neutral-900',
    refCode: 'IT-035',
    title: '黄金拉丝芝士焗龙虾',
    enName: 'Baked Lobster Mozzarella',
    desc: '波士顿活虾现杀取肉，高温 260℃ 焗烤 360 秒，双重马苏里拉拉丝成色达焦斑三级，蒜蓉黄油收尾。',
    specs: [
      { icon: Timer, label: '焗烤控温', value: '260℃ / 360s', tone: 'text-amber-300' },
      { icon: Flame, label: '拉丝标准', value: '焦斑 3 级', tone: 'text-yellow-300' },
      { icon: BadgeCheck, label: '出品档口', value: '海鲜焗烤线', tone: 'text-emerald-300' },
      { icon: Fingerprint, label: '原料溯源', value: '波士顿活鲜', tone: 'text-sky-300' }
    ]
  },
  {
    image: coldBrewImg,
    category: 'MIDNIGHT BREW · COLD',
    categoryTone: 'bg-sky-300/95 text-neutral-900',
    refCode: 'BV-008',
    title: '暗夜冷萃生椰咖啡',
    enName: 'Midnight Coconut Cold Brew',
    desc: '深烘拼配豆 12 小时冰滴慢萃，兑入厚椰乳与黑糖气泡，出品温度恒定 4℃，冰感顺滑不稀释。',
    specs: [
      { icon: Timer, label: '萃取时长', value: '12h 冰滴', tone: 'text-sky-300' },
      { icon: Flame, label: '出品温度', value: '4℃ 恒定', tone: 'text-sky-300' },
      { icon: BadgeCheck, label: '杯型标准', value: '500ml 特调', tone: 'text-emerald-300' },
      { icon: Fingerprint, label: '豆源溯源', value: '云南日晒拼配', tone: 'text-sky-300' }
    ]
  }
];

interface RosterEntry {
  phone: string;
  name: string;
  /** 工号（商户）/ 编号（骑手） */
  code: string;
  avatar: string;
}

interface AuthGateViewProps {
  role: AuthGateRole;
  onSuccess: (session: MerchantSession | RiderSession, authenticatedRole: AuthGateRole) => void;
  /** 端别切换（保留已输入手机号） */
  onSwitchRole: (role: AuthGateRole) => void;
  onCancel: () => void;
}

const SANDBOX_CODE = '888888';

/** POS 终端基准指纹：首次采集即注册（TOFU），之后每次登录比对离散度 */
const REGISTERED_FP_KEY = 'obsidian_pos_registered_fingerprint';
/** 离散度告警阈值（参考稿：Δ > 12.8% 判定指纹不吻合） */
const FP_DIVERGENCE_THRESHOLD = 12.8;

/** 两个哈希的字符级差异率（%）：真实可比对，不构造假数值 */
function hashDivergence(a: string, b: string): number {
  if (!a || !b) return 0;
  const len = Math.max(a.length, b.length);
  let diff = 0;
  for (let i = 0; i < len; i += 1) if ((a[i] || '') !== (b[i] || '')) diff += 1;
  return Math.round((diff / len) * 1000) / 10;
}

export const AuthGateView: React.FC<AuthGateViewProps> = ({ role, onSwitchRole, onSuccess, onCancel }) => {
  const isMerchant = role === 'merchant';
  const roster: RosterEntry[] = useMemo(
    () =>
      (isMerchant ? PRESET_MERCHANT_STAFF : PRESET_RIDERS).map((item) => ({
        phone: item.phone,
        name: item.name,
        code: item.staffNo ?? item.riderNo ?? '',
        avatar: item.avatar
      })),
    [isMerchant]
  );

  /* ---- 画廊轮播 ---- */
  const [slideIndex, setSlideIndex] = useState(0);
  const autoTimer = useRef<number | null>(null);
  const gotoSlide = (next: number) => {
    setSlideIndex(((next % SLIDES.length) + SLIDES.length) % SLIDES.length);
  };
  useEffect(() => {
    autoTimer.current = window.setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % SLIDES.length);
    }, 7000);
    return () => {
      if (autoTimer.current) window.clearInterval(autoTimer.current);
    };
  }, []);
  const manualGoto = (next: number) => {
    if (autoTimer.current) window.clearInterval(autoTimer.current);
    autoTimer.current = window.setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % SLIDES.length);
    }, 7000);
    gotoSlide(next);
  };

  /* ---- 登录态 ---- */
  const [authMode, setAuthMode] = useState<'sms' | 'pwd'>('sms');
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [password, setPassword] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [rosterQuery, setRosterQuery] = useState('');
  const [rosterSearchOpen, setRosterSearchOpen] = useState(false);
  const [showTelemetry, setShowTelemetry] = useState(true);
  const [hardware, setHardware] = useState<DeviceHardwareDetails | null>(null);
  const [securityModal, setSecurityModal] = useState<
    | null
    | { title: string; prodHash: string; currHash: string; match: boolean; divergence: number }
  >(null);

  /* ---- 次级折叠模块：三态子面板（遥测 / RBAC 提权 / 交接班矩阵）---- */
  const [subPanel, setSubPanel] = useState<'telemetry' | 'rbac' | 'shift'>('telemetry');
  const [overridePin, setOverridePin] = useState('');
  const [overrideMsg, setOverrideMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [activeOverride, setActiveOverride] = useState<ManagerOverrideSession | null>(() => getActiveManagerOverride());
  const [handoverMsg, setHandoverMsg] = useState<string | null>(null);
  const [posTicketId, setPosTicketId] = useState<string | null>(null);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [countdown]);

  useEffect(() => {
    let alive = true;
    collectDeviceHardwareDetails()
      .then((details) => {
        if (alive) setHardware(details);
      })
      .catch(() => {
        /* 指纹采集失败不阻断登录，面板展示待采集态 */
      });
    return () => {
      alive = false;
    };
  }, []);

  const filteredRoster = useMemo(() => {
    const q = rosterQuery.trim().toUpperCase();
    if (!q) return roster;
    return roster.filter(
      (item) =>
        item.phone.includes(q) ||
        item.name.toUpperCase().includes(q) ||
        item.code.toUpperCase().includes(q)
    );
  }, [roster, rosterQuery]);

  const handleSelectPreset = (presetPhone: string) => {
    setPhone(presetPhone);
    setSmsCode(SANDBOX_CODE);
    setPassword(SANDBOX_CODE);
    setErrorMessage('');
    setAuthMode('sms');
  };

  const handleSendCode = () => {
    const clean = phone.replace(/\D/g, '');
    if (clean.length !== 11) {
      setErrorMessage('请输入正确的 11 位在册手机号码');
      return;
    }
    setErrorMessage('');
    setCountdown(60);
    setSmsCode(SANDBOX_CODE);
    // 口令已自动填入输入框，界面同步展示沙盒码，无需再弹安全模态
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const clean = phone.replace(/\D/g, '');
    if (clean.length !== 11) {
      setErrorMessage('请输入正确的 11 位在册手机号码');
      return;
    }
    if (authMode === 'sms' && !smsCode.trim()) {
      setErrorMessage('请输入 6 位动态短信口令');
      return;
    }
    if (authMode === 'pwd' && !password.trim()) {
      setErrorMessage('请输入操作台主密码');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    try {
      const params = {
        phone: clean,
        smsCode,
        password,
        authMethod: authMode === 'sms' ? ('phone_sms' as const) : ('phone_pwd' as const)
      };
      const authenticatedRole: AuthGateRole = isMerchant ? 'merchant' : 'rider';
      const res = isMerchant ? await loginMerchantWithPhone(params) : await loginRiderWithPhone(params);
      if (res.success && res.session) {
        onSuccess(res.session, authenticatedRole);
      } else {
        setErrorMessage(res.message);
      }
    } catch (err) {
      setErrorMessage((err as Error).message || '登录失败，请检查网络后重试');
    } finally {
      setIsLoading(false);
    }
  };

  /* ---- POS 指纹比对（真实数据路径：注册指纹 vs 本次采集）---- */
  const [registeredHash, setRegisteredHash] = useState<string>(() => safeGetStorage<string>(REGISTERED_FP_KEY, ''));
  useEffect(() => {
    if (hardware && !registeredHash) setRegisteredHash(hardware.hardwareHash);
  }, [hardware, registeredHash]);

  const fpDivergence = useMemo(
    () => hashDivergence(registeredHash, hardware?.hardwareHash || ''),
    [registeredHash, hardware]
  );
  const fpMatch = fpDivergence <= FP_DIVERGENCE_THRESHOLD;
  const matchPill = registeredHash ? (fpMatch ? '100% MATCH' : 'Δ ' + fpDivergence + '% MISMATCH') : '首次注册';

  /** 自检：真实哈希比对，异常时进入告警模态 */
  const openSecurityCheck = () => {
    if (!hardware) return;
    setSecurityModal({
      title: fpMatch ? '终端指纹核验通过' : '硬件指纹离散度异常警告',
      prodHash: registeredHash || '--',
      currHash: hardware.hardwareHash,
      match: fpMatch,
      divergence: fpDivergence
    });
  };

  /** RBAC 店长短时提权：真实引擎 verifyAndGrantManagerOverride（15 分钟窗口 + 自动写安全审计） */
  const applyElevation = () => {
    const operator = phone ? maskPhoneNumber(phone) : '登录门访客';
    const res = verifyAndGrantManagerOverride(overridePin, operator, '登录门前置提权（登录门 RBAC 面板）');
    setOverrideMsg({ ok: res.success, text: res.message });
    setActiveOverride(getActiveManagerOverride());
    if (res.success) setOverridePin('');
  };

  /** 交接班换登：把登录上下文切换到在册账号，并写入安全审计 */
  const handleHandover = (entry: RosterEntry) => {
    setPhone(entry.phone);
    setSmsCode(SANDBOX_CODE);
    setPassword(SANDBOX_CODE);
    setAuthMode('sms');
    setErrorMessage('');
    setHandoverMsg('准入上下文已切换至 [' + entry.name + ' / ' + entry.code + ']，请核验口令后完成登入。');
    recordSecurityAuditLog({
      action: 'auth_login',
      operator: entry.name,
      target: '交接班换登 (' + entry.code + ')',
      status: 'allowed',
      details:
        '登录门交接班矩阵：准入上下文切换至 [' +
        entry.name +
        ' / ' +
        entry.code +
        ']，上一待登目标已归档。'
    });
  };

  /** 极速一键核验登入：无需反复切换填写，直接按在册凭证速通登入 */
  const handleQuickInstantLogin = async (entry: RosterEntry) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const authenticatedRole: AuthGateRole = isMerchant ? 'merchant' : 'rider';
      const res = isMerchant
        ? await loginMerchantWithPhone({ phone: entry.phone, authMethod: 'one_click' })
        : await loginRiderWithPhone({ phone: entry.phone, authMethod: 'one_click' });
      if (res.success && res.session) {
        recordSecurityAuditLog({
          action: 'auth_login',
          operator: entry.name,
          target: `在岗速切登入 (${entry.code})`,
          status: 'allowed',
          details: `统一登录门：在册专员 [${entry.name} / ${entry.code}] 一键免密极速换登成功。`
        });
        onSuccess(res.session, authenticatedRole);
      } else {
        setErrorMessage(res.message || '换登登录失败');
      }
    } catch (err) {
      setErrorMessage((err as Error).message || '登录异常，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  /** 向运维上报工单：生成本地工单号并记录审计 */
  const submitOpsTicket = () => {
    const ticket = 'OPS-' + Date.now().toString(36).toUpperCase().slice(-6);
    setPosTicketId(ticket);
    recordSecurityAuditLog({
      action: 'platform_access_denied',
      operator: phone ? maskPhoneNumber(phone) : '登录门访客',
      target: '终端指纹异常工单',
      status: 'denied',
      details:
        '指纹离散度 Δ' + fpDivergence + '% 超阈值(' + FP_DIVERGENCE_THRESHOLD + '%)，已生成运维工单 ' + ticket + '。'
    });
  };

  const slide = SLIDES[slideIndex];
  const activeChipPhone = phone.replace(/\D/g, '');

  const chipTone = (itemPhone?: string) =>
    activeChipPhone && itemPhone && itemPhone === activeChipPhone
      ? 'bg-neutral-900 border-neutral-900 text-white'
      : 'bg-neutral-100/80 hover:bg-white border-neutral-200 hover:border-neutral-900 text-neutral-900';

  const telemetryRows: Array<{ label: string; value: string }> = hardware
    ? [
        { label: 'GPU FINGERPRINT HASH', value: (hardware.gpuRenderer || '--').slice(0, 22).toUpperCase() },
        { label: 'CANVAS SCATTER', value: (hardware.canvasHash || '--').slice(0, 14).toUpperCase() },
        { label: 'AUDIO DSP SCATTER', value: (hardware.audioDspHash || '--').slice(0, 14).toUpperCase() },
        {
          label: 'COMP CIPHER',
          value: `${hardware.cpuCores ?? '--'}C / ${hardware.deviceMemoryGb ?? '--'}GB · DPR ${hardware.pixelRatio ?? '--'}`
        }
      ]
    : [
        { label: 'GPU FINGERPRINT HASH', value: '采集中…' },
        { label: 'CANVAS SCATTER', value: '采集中…' },
        { label: 'AUDIO DSP SCATTER', value: '采集中…' },
        { label: 'COMP CIPHER', value: '采集中…' }
      ];

  return (
    <main className="min-h-screen w-full bg-white p-3 lg:p-5 flex flex-col relative overflow-hidden">
      <div className="flex flex-col w-full max-w-[1680px] mx-auto flex-1 space-y-3">
        {/* ① 顶部轻量栏：品牌 + 端别切换 + 遥测 */}
        <header className="w-full flex items-center justify-between gap-3 backdrop-blur-md border border-neutral-200/80 rounded-[3px] px-3 py-2 z-20 shadow-[0_2px_12px_rgba(0,0,0,0.03)] bg-white">
          <div className="flex items-center gap-4 overflow-x-auto no-scrollbar min-w-0">
            <div className="flex items-center gap-2 pr-3 border-r border-neutral-200/80 shrink-0">
              <div className="w-6 h-6 rounded-[3px] bg-neutral-900 text-white flex items-center justify-center">
                <UtensilsCrossed className="w-[15px] h-[15px]" strokeWidth={2.2} />
              </div>
              <div className="flex flex-col">
                <span className="tabular-nums text-[11px] font-bold tracking-tight text-neutral-900 leading-none">
                  URBAN RADAR · POS GATE
                </span>
                <span className="tabular-nums text-[9px] text-neutral-400 leading-none mt-0.5">GATEWAY #CR-88029</span>
              </div>
            </div>

            <nav aria-label="登录端别" className="flex items-center gap-4 shrink-0 tabular-nums text-xs">
              <button
                type="button"
                onClick={() => onSwitchRole('merchant')}
                className={`pb-0.5 border-b-2 transition-colors cursor-pointer ${
                  isMerchant
                    ? 'border-neutral-900 text-neutral-900 font-bold'
                    : 'border-transparent text-neutral-400 hover:text-neutral-700'
                }`}
              >
                MERCHANT CONSOLE
              </button>
              <button
                type="button"
                onClick={() => onSwitchRole('rider')}
                className={`pb-0.5 border-b-2 transition-colors cursor-pointer ${
                  !isMerchant
                    ? 'border-neutral-900 text-neutral-900 font-bold'
                    : 'border-transparent text-neutral-400 hover:text-neutral-700'
                }`}
              >
                RIDER DISPATCH
              </button>
            </nav>

            <button
              type="button"
              onClick={onCancel}
              className="ml-auto sm:ml-0 flex items-center gap-1 text-[11px] tabular-nums text-neutral-400 hover:text-neutral-900 transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} />
              返回前台点餐
            </button>
          </div>

          <div className="flex items-center gap-2 tabular-nums text-[11px] shrink-0">
            <div className="hidden md:flex items-center gap-1.5 bg-neutral-100/90 border border-neutral-200/80 px-2 py-1 rounded-[3px] text-neutral-600">
              <Wifi className="w-[13px] h-[13px] text-emerald-600" strokeWidth={2} />
              <span>RTK 5G · 18ms</span>
            </div>
            <div className="hidden lg:flex items-center gap-1 bg-neutral-100/90 border border-neutral-200/80 px-2 py-1 rounded-[3px] text-neutral-600">
              <Fingerprint className="w-[13px] h-[13px] text-neutral-500" strokeWidth={2} />
              <span>{hardware ? `FP ${hardware.hardwareHash.slice(0, 8).toUpperCase()}` : 'FP 采集中'}</span>
            </div>
          </div>
        </header>

        {/* ② 主工作台：左画廊 + 右核验面板 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 items-stretch lg:min-h-[720px]">
          {/* 左：出餐工坊画廊 */}
          <section className="lg:col-span-8 relative flex flex-col rounded-[3px] overflow-hidden border border-neutral-200/80 bg-neutral-950 shadow-sm min-h-[420px]">
            {SLIDES.map((item, index) => (
              <img
                key={item.title}
                src={item.image}
                alt={item.title}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
                  index === slideIndex ? 'opacity-100' : 'opacity-0'
                }`}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-neutral-950/10" />

            {/* 顶部徽标与切换 */}
            <div className="relative z-10 flex items-start justify-between p-4">
              <div className="flex items-center gap-2 bg-neutral-900/85 backdrop-blur px-2.5 py-1.5 rounded-[3px]">
                <Flame className="w-4 h-4 text-amber-300" strokeWidth={2.2} />
                <span className="font-display text-[13px] font-bold text-white tracking-tight">
                  URBAN RADAR WORKBENCH <span className="text-neutral-400">//</span> 流动餐车出餐工坊
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="上一道"
                  onClick={() => manualGoto(slideIndex - 1)}
                  className="h-7 w-7 bg-white/90 hover:bg-white text-neutral-900 rounded-[3px] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" strokeWidth={2.2} />
                </button>
                <button
                  type="button"
                  aria-label="下一道"
                  onClick={() => manualGoto(slideIndex + 1)}
                  className="h-7 w-7 bg-white/90 hover:bg-white text-neutral-900 rounded-[3px] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" strokeWidth={2.2} />
                </button>
              </div>
            </div>

            {/* 底部菜品详情 */}
            <div className="relative z-10 mt-auto p-4 lg:p-5 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded-[2px] tabular-nums text-[10px] font-bold tracking-wider ${slide.categoryTone}`}>
                  {slide.category}
                </span>
                <span className="tabular-nums text-[10px] text-neutral-300">PASTA-REF #{slide.refCode}</span>
              </div>
              <div>
                <h2 className="font-display text-2xl lg:text-3xl font-bold text-white tracking-tight leading-tight">
                  {slide.title}
                  <span className="text-neutral-400 font-normal text-base lg:text-lg ml-2">/ {slide.enName}</span>
                </h2>
                <p className="text-xs text-neutral-300 mt-1.5 max-w-2xl leading-relaxed">{slide.desc}</p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
                {slide.specs.map((spec) => (
                  <div
                    key={spec.label}
                    className="bg-neutral-900/70 backdrop-blur border border-white/10 rounded-[3px] px-2.5 py-2"
                  >
                    <div className="flex items-center gap-1 tabular-nums text-[9px] text-neutral-400 uppercase tracking-wider">
                      <spec.icon className={`w-3 h-3 ${spec.tone}`} strokeWidth={2} />
                      <span>{spec.label}</span>
                    </div>
                    <div className="tabular-nums text-[11px] font-bold text-white mt-1 truncate">{spec.value}</div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between gap-4 pt-1.5">
                <div className="flex items-center gap-1.5 flex-1">
                  {SLIDES.map((item, index) => (
                    <button
                      key={`bar-${item.title}`}
                      type="button"
                      aria-label={`切换到 ${item.title}`}
                      onClick={() => manualGoto(index)}
                      className={`h-1 flex-1 rounded-full transition-colors cursor-pointer ${
                        index === slideIndex ? 'bg-white' : 'bg-white/25 hover:bg-white/50'
                      }`}
                    />
                  ))}
                </div>
                <span className="tabular-nums text-[10px] text-neutral-400 shrink-0">
                  {String(slideIndex + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')} GALLERY VIEW
                </span>
              </div>
            </div>
          </section>

          {/* 右：身份核验面板 */}
          <aside className="lg:col-span-4 flex flex-col space-y-3">
            <div className="backdrop-blur-md border border-neutral-200/80 rounded-[3px] p-4 lg:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] flex flex-col justify-between bg-white">
              <div>
                {/* 面板头 */}
                <div className="flex items-start justify-between pb-3 border-b border-neutral-200/80">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums text-[10px] bg-neutral-900 text-white px-1.5 py-0.5 rounded-[3px] font-semibold">
                        GATEWAY L-4
                      </span>
                      <span className="tabular-nums text-[11px] text-neutral-500 font-medium">STATION #POS-01</span>
                    </div>
                    <h3 className="font-display text-base text-neutral-900 font-bold mt-1 tracking-tight">
                      {isMerchant ? '餐车·商户端操作台身份核验' : '骑手专送·站点登录身份核验'}
                    </h3>
                  </div>
                  <div className="h-8 w-8 rounded-[3px] bg-neutral-100 flex items-center justify-center border border-neutral-200/60 text-neutral-800 shrink-0">
                    <ShieldCheck className="w-[17px] h-[17px]" strokeWidth={2} />
                  </div>
                </div>

                {/* 模式切换 */}
                <div className="flex items-center gap-2 pt-3">
                  <div className="grid grid-cols-2 w-full bg-neutral-100/90 p-0.5 rounded-[3px] tabular-nums text-xs">
                    <button
                      type="button"
                      aria-label="短信 / 专员速选"
                      onClick={() => setAuthMode('sms')}
                      className={`py-2 rounded-[2px] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        authMode === 'sms'
                          ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                          : 'text-neutral-500 hover:text-neutral-900'
                      }`}
                    >
                      <MessageSquareText className="w-[14px] h-[14px]" strokeWidth={2} />
                      短信口令
                    </button>
                    <button
                      type="button"
                      aria-label="账号与主密码"
                      onClick={() => setAuthMode('pwd')}
                      className={`py-2 rounded-[2px] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        authMode === 'pwd'
                          ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                          : 'text-neutral-500 hover:text-neutral-900'
                      }`}
                    >
                      <KeyRound className="w-[14px] h-[14px]" strokeWidth={2} />
                      主密码
                    </button>
                  </div>
                </div>

                {/* 在册专员速选 */}
                {authMode === 'sms' && (
                  <div className="mt-3.5 space-y-1.5">
                    <div className="flex items-center justify-between tabular-nums text-[11px] gap-2">
                      <span className="text-neutral-500 shrink-0">
                        {isMerchant ? '在册当班专员' : '在册骑手'} (轻触速选):
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-emerald-700 font-medium flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          {roster.length} 人在岗
                        </span>
                        <div className="flex items-center gap-1">
                          {rosterSearchOpen ? (
                            <>
                              <input
                                autoFocus
                                value={rosterQuery}
                                onChange={(event) => setRosterQuery(event.target.value)}
                                placeholder="搜手机/工号"
                                className="w-24 h-5 px-1.5 bg-white border border-neutral-300 rounded-[3px] tabular-nums text-[10px] text-neutral-900 focus:outline-none focus:border-neutral-900"
                              />
                              <button
                                type="button"
                                aria-label="收起搜索"
                                onClick={() => {
                                  setRosterSearchOpen(false);
                                  setRosterQuery('');
                                }}
                                className="w-4 h-4 flex items-center justify-center text-neutral-400 hover:text-neutral-900 cursor-pointer"
                              >
                                <X className="w-3 h-3" strokeWidth={2.2} />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              aria-label="搜索在册人员"
                              onClick={() => setRosterSearchOpen(true)}
                              className="w-5 h-5 rounded-[3px] bg-neutral-100/90 hover:bg-neutral-200/80 border border-neutral-200/80 flex items-center justify-center text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer"
                            >
                              <Search className="w-3 h-3" strokeWidth={2} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      {filteredRoster.map((item, index) => (
                        <button
                          key={item.phone}
                          type="button"
                          onClick={() => handleSelectPreset(item.phone)}
                          className={`group py-2 px-1 flex flex-col items-center justify-center border rounded-[3px] transition-all cursor-pointer ${chipTone(item.phone)}`}
                        >
                          <span className="text-base leading-none">{item.avatar}</span>
                          <span
                            className={`tabular-nums text-[10px] font-bold mt-1 tracking-tight ${
                              activeChipPhone === item.phone
                                ? 'text-white'
                                : 'text-neutral-500 group-hover:text-neutral-900'
                            }`}
                          >
                            {item.code}
                          </span>
                          <span
                            className={`text-[9px] leading-tight text-center mt-0.5 line-clamp-1 ${
                              activeChipPhone === item.phone ? 'text-neutral-300' : 'text-neutral-400'
                            }`}
                          >
                            {item.name}
                          </span>
                          <span className="sr-only">第 {index + 1} 位</span>
                        </button>
                      ))}
                      {filteredRoster.length === 0 && (
                        <div className="col-span-3 py-3 text-center tabular-nums text-[10px] text-neutral-400">
                          无匹配的在册人员
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 表单 */}
                <form onSubmit={handleSubmit} className="mt-3.5 space-y-3">
                  <div className="space-y-1">
                    <label htmlFor="gate-phone" className="block tabular-nums text-[11px] text-neutral-600">
                      认证手机号 (REGISTERED MOBILE)
                    </label>
                    <div className="flex rounded-[3px] overflow-hidden border border-neutral-300/80 focus-within:border-neutral-900 bg-white transition-colors">
                      <span className="inline-flex items-center px-2.5 bg-neutral-100 tabular-nums text-xs text-neutral-700 select-none border-r border-neutral-200">
                        +86
                      </span>
                      <input
                        id="gate-phone"
                        type="tel"
                        inputMode="numeric"
                        maxLength={11}
                        value={phone}
                        onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 11))}
                        placeholder="输入11位在册专员手机"
                        className="w-full h-8 px-2.5 tabular-nums text-xs text-neutral-900 focus:outline-none bg-transparent"
                      />
                    </div>
                  </div>

                  {authMode === 'sms' ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between tabular-nums text-[11px]">
                        <label htmlFor="gate-code" className="text-neutral-600">
                          6位动态短信口令
                        </label>
                        <span className="text-neutral-400">沙盒码: {SANDBOX_CODE}</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          id="gate-code"
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={smsCode}
                          onChange={(event) => setSmsCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="6 位动态口令"
                          className="w-full h-8 px-2.5 bg-white border border-neutral-300/80 focus:border-neutral-900 rounded-[3px] tabular-nums text-xs tracking-widest text-neutral-900 focus:outline-none transition-colors"
                        />
                        <button
                          type="button"
                          onClick={handleSendCode}
                          disabled={countdown > 0}
                          className="relative h-8 px-3 bg-neutral-100 hover:bg-neutral-200/80 disabled:opacity-60 disabled:cursor-not-allowed text-neutral-800 tabular-nums text-xs rounded-[3px] border border-neutral-300/60 whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Timer className="w-3.5 h-3.5" strokeWidth={2} />
                          <span>{countdown > 0 ? `${countdown}s 后重发` : '获取口令'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label htmlFor="gate-pwd" className="block tabular-nums text-[11px] text-neutral-600">
                        操作台主密码 (MASTER PASSWORD)
                      </label>
                      <input
                        id="gate-pwd"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="输入操作台主密码"
                        className="w-full h-8 px-2.5 bg-white border border-neutral-300/80 focus:border-neutral-900 rounded-[3px] tabular-nums text-xs text-neutral-900 focus:outline-none transition-colors"
                      />
                    </div>
                  )}

                  {/* 物理工卡指示 */}
                  <div className="p-2 bg-neutral-100/80 border border-neutral-200/60 rounded-[3px] flex items-center justify-between tabular-nums text-[11px]">
                    <div className="flex items-center gap-1.5 text-neutral-600">
                      <BadgeCheck className="w-[15px] h-[15px] text-emerald-600" strokeWidth={2} />
                      <span>
                        厨房物理工卡: <strong className="text-neutral-900">#SLOT-01 已就绪</strong>
                      </span>
                    </div>
                    <span className="text-emerald-700 font-bold">VALID</span>
                  </div>

                  {errorMessage && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded-[3px] flex items-start gap-1.5 text-[11px] text-red-700 tabular-nums">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" strokeWidth={2} />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* 提交 */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-10 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-60 text-white rounded-[3px] font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4" strokeWidth={2} />
                    <span>{isLoading ? '准入验签中…' : isMerchant ? '验签并一键准入开台' : '验签并上线接单'}</span>
                    {!isLoading && <ArrowRight className="w-4 h-4" strokeWidth={2.2} />}
                  </button>

                  <div className="flex items-center justify-between tabular-nums text-[9px] text-neutral-400 pt-0.5">
                    <span>GBT/ 35273-2020 · 生物特征已脱敏</span>
                    <span>URBAN-RADAR-OS v4.8</span>
                  </div>
                </form>
              </div>
            </div>

            {/* 次级折叠模块集合：硬件遥测 / RBAC 店长短时提权 / 在岗交接班换登矩阵（三态切换） */}
            <div className="border border-neutral-200/80 rounded-[3px] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden">
              {/* 三态切换 + 指纹状态胶囊 + 折叠开关 */}
              <div className="px-3 pt-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  {([
                    { key: 'telemetry', icon: Cpu, label: '硬件指纹与信道监测' },
                    { key: 'rbac', icon: ShieldAlert, label: 'RBAC 店长短时提权' },
                    { key: 'shift', icon: ArrowLeftRight, label: '在岗交接班换登矩阵' }
                  ] as const).map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      title={tab.label}
                      aria-label={tab.label}
                      aria-pressed={subPanel === tab.key}
                      onClick={() => {
                        setSubPanel(tab.key);
                        setShowTelemetry(true);
                      }}
                      className={`w-9 h-9 rounded-[3px] flex items-center justify-center transition-all cursor-pointer border ${
                        subPanel === tab.key
                          ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                          : 'bg-neutral-100/90 hover:bg-neutral-200/80 text-neutral-700 border-neutral-200/80'
                      }`}
                    >
                      <tab.icon className="w-[18px] h-[18px]" strokeWidth={1.9} />
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-1.5 py-0.5 rounded-[2px] tabular-nums text-[10px] border ${
                      fpMatch
                        ? 'bg-neutral-100 text-neutral-700 border-neutral-200/60'
                        : 'bg-red-50 text-red-700 border-red-200 font-bold'
                    }`}
                  >
                    {matchPill}
                  </span>
                  <button
                    type="button"
                    aria-label="折叠/展开"
                    onClick={() => setShowTelemetry((prev) => !prev)}
                    className="w-6 h-6 rounded-[2px] bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <ChevronRight
                      className={`w-[15px] h-[15px] transition-transform duration-200 ${showTelemetry ? 'rotate-90' : ''}`}
                      strokeWidth={2}
                    />
                  </button>
                </div>
              </div>

              {showTelemetry && (
                <div className="px-3 pb-3 pt-2 space-y-2">
                  {/* ① 硬件指纹与信道监测（真实采集值） */}
                  {subPanel === 'telemetry' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-neutral-200/60 tabular-nums text-[11px]">
                        <span className="font-semibold text-neutral-900 flex items-center gap-1.5">
                          <Cpu className="w-[15px] h-[15px] text-neutral-700" strokeWidth={2} />
                          硬件指纹与信道监测
                        </span>
                        <span className="text-neutral-500 text-[10px]">POS 外设 1.2ms</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {telemetryRows.map((row) => (
                          <div key={row.label} className="bg-neutral-50 border border-neutral-200/70 rounded-[2px] p-2">
                            <div className="tabular-nums text-[9px] text-neutral-400 uppercase tracking-wider truncate">
                              {row.label}
                            </div>
                            <div className="tabular-nums text-[10px] font-bold text-neutral-800 mt-1 truncate">
                              {row.value}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between tabular-nums text-[10px] text-neutral-400 pt-1">
                        <span className="flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-emerald-600" strokeWidth={2} />
                          沙盒环境核验完成
                        </span>
                        <button
                          type="button"
                          onClick={openSecurityCheck}
                          className="text-neutral-500 hover:text-red-600 underline transition-colors cursor-pointer"
                        >
                          自检异常报警
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ② RBAC 店长短时提权（真实引擎：15 分钟窗口 + 安全审计） */}
                  {subPanel === 'rbac' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-neutral-200/60 tabular-nums text-[11px]">
                        <span className="font-semibold text-neutral-900 flex items-center gap-1.5">
                          <ShieldAlert className="w-[15px] h-[15px] text-amber-700" strokeWidth={2} />
                          RBAC 店长短时提权
                        </span>
                        <span className="text-neutral-500 text-[10px]">TIER-1</span>
                      </div>
                      <div className="text-[11px] tabular-nums text-neutral-600 flex items-center justify-between gap-2">
                        <span className="truncate">拦截: 批量订单退款 (#O-89102)</span>
                        <span className="text-neutral-900 font-semibold shrink-0">需店长 Tier-1</span>
                      </div>
                      <div className="flex gap-1.5">
                        <input
                          value={overridePin}
                          onChange={(event) => setOverridePin(event.target.value.replace(/\D/g, '').slice(0, 6))}
                          maxLength={6}
                          placeholder="4-6 位店长授权码"
                          className="w-full h-7 px-2 bg-white border border-neutral-300 rounded-[2px] tabular-nums text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                        />
                        <button
                          type="button"
                          onClick={applyElevation}
                          disabled={overridePin.length < 4}
                          className="h-7 px-2.5 bg-neutral-900 hover:bg-black disabled:opacity-50 text-white tabular-nums text-[11px] rounded-[2px] whitespace-nowrap transition-colors cursor-pointer"
                        >
                          释放
                        </button>
                      </div>
                      {overrideMsg && (
                        <div
                          className={`tabular-nums text-[10px] leading-relaxed ${
                            overrideMsg.ok ? 'text-emerald-700' : 'text-red-600'
                          }`}
                        >
                          {overrideMsg.text}
                        </div>
                      )}
                      {activeOverride && (
                        <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-[2px] tabular-nums text-[10px] text-emerald-800 space-y-0.5">
                          <div className="font-bold">提权窗口已激活（15 分钟）</div>
                          <div>授权人: {activeOverride.authorizedBy}</div>
                          <div>有效期至 {new Date(activeOverride.expiresAt).toLocaleTimeString()}</div>
                          <div className="truncate">事由: {activeOverride.reason}</div>
                        </div>
                      )}
                      <div className="text-[10px] tabular-nums text-neutral-500 leading-relaxed">
                        真实引擎: verifyAndGrantManagerOverride · 默认授权码 8888 · 每次校验（含失败）均写入安全审计
                      </div>
                    </div>
                  )}

                  {/* ③ 在岗交接班换登矩阵（真实在册账号 + 安全审计） */}
                  {subPanel === 'shift' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-neutral-200/60 tabular-nums text-[11px]">
                        <span className="font-semibold text-neutral-900 flex items-center gap-1.5">
                          <ArrowLeftRight className="w-[15px] h-[15px] text-neutral-700" strokeWidth={2} />
                          在岗交接班换登矩阵
                        </span>
                        <span className="text-neutral-500 text-[10px]">SHIFT-A</span>
                      </div>
                      <div className="space-y-1.5">
                        {roster.map((entry) => (
                          <div
                            key={entry.phone}
                            className="flex items-center justify-between p-1.5 bg-neutral-50 border border-neutral-200/60 rounded-[2px] gap-2"
                          >
                            <div className="min-w-0">
                              <div className="tabular-nums text-xs font-semibold text-neutral-900 truncate">
                                {entry.name}
                              </div>
                              <div className="tabular-nums text-[10px] text-neutral-500 truncate">
                                工号: {entry.code} · {entry.phone.slice(-4)} 就绪
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleHandover(entry)}
                                className="h-6 px-1.5 bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-300 tabular-nums text-[10px] rounded-[2px] transition-colors cursor-pointer"
                                title="填入账号口令"
                              >
                                填入
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickInstantLogin(entry)}
                                className="h-6 px-2 bg-neutral-900 hover:bg-black text-white tabular-nums text-[10px] rounded-[2px] transition-colors cursor-pointer font-medium shadow-2xs"
                                title="一键免密直接登入操作台"
                              >
                                速登
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      {handoverMsg && (
                        <div className="p-2 bg-blue-50 border border-blue-200 rounded-[2px] tabular-nums text-[10px] text-blue-800 leading-relaxed">
                          {handoverMsg}
                        </div>
                      )}
                      <div className="text-[10px] tabular-nums text-neutral-500 leading-relaxed">
                        交接即把准入上下文切换至该在册账号（自动填入口令）并写入安全审计；数据源为
                        PRESET_MERCHANT_STAFF / PRESET_RIDERS。
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* 安全模态：终端指纹离散度核验（真实哈希对比 / ESC 关闭） */}
      {securityModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="gate-security-title"
          tabIndex={-1}
          className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-sm flex items-center justify-center p-4 outline-none"
          onClick={() => setSecurityModal(null)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setSecurityModal(null);
          }}
        >
          <div
            className="bg-white border border-neutral-200 rounded-[3px] max-w-md w-full p-5 shadow-2xl space-y-3 text-neutral-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldAlert
                  className={`w-[18px] h-[18px] ${securityModal.match ? 'text-emerald-600' : 'text-red-600'}`}
                  strokeWidth={2}
                />
                <h4 id="gate-security-title" className="tabular-nums text-sm font-bold tracking-tight">
                  {securityModal.title}
                </h4>
              </div>
              <button
                type="button"
                aria-label="关闭"
                onClick={() => setSecurityModal(null)}
                className="text-neutral-400 hover:text-neutral-900 cursor-pointer"
              >
                <X className="w-4 h-4" strokeWidth={2.2} />
              </button>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              {securityModal.match
                ? '当前终端指纹与餐车固定 POS 注册签名一致，可以安全载入操作台。'
                : '检测到当前终端 GPU 指纹与餐车固定 POS 注册签名不吻合（离散度差值超过阈值）。系统已激活沙盒锁定策略，请联系值班店长或向运维上报工单。'}
            </p>

            <div className="p-2.5 bg-neutral-100 rounded-[3px] tabular-nums text-[11px] space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span>PROD-HASH:</span>
                <span className="font-semibold text-neutral-900 truncate">
                  {(securityModal.prodHash || '--').slice(0, 16).toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>CURR-HASH:</span>
                <span
                  className={`font-semibold truncate ${securityModal.match ? 'text-emerald-700' : 'text-red-600'}`}
                >
                  {(securityModal.currHash || '--').slice(0, 16).toUpperCase()}
                  {!securityModal.match && ' (MISMATCH)'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>离散度 Δ:</span>
                <span className={`font-semibold ${securityModal.match ? 'text-neutral-900' : 'text-red-600'}`}>
                  {securityModal.divergence}% / 阈值 {FP_DIVERGENCE_THRESHOLD}%
                </span>
              </div>
            </div>

            {posTicketId && (
              <div className="p-2 bg-amber-50 border border-amber-200 rounded-[3px] tabular-nums text-[11px] text-amber-800">
                运维工单已生成: <strong>{posTicketId}</strong>（已写入安全审计日志）
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSecurityModal(null)}
                className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 tabular-nums text-xs rounded-[3px] transition-colors cursor-pointer"
              >
                关闭窗口
              </button>
              {!securityModal.match && !posTicketId && (
                <button
                  type="button"
                  onClick={submitOpsTicket}
                  className="px-3 py-1.5 bg-neutral-900 hover:bg-black text-white tabular-nums text-xs rounded-[3px] transition-colors cursor-pointer"
                >
                  向运维上报工单
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default AuthGateView;
