/**
 * ==============================================================================
 * Urban Radar - Enterprise Universal Router Patch & SPA Deep Link Engine
 * ==============================================================================
 * 
 * 功能职责：
 * 1. 全环境单页路由容灾与深链解析（兼容腾讯云 COS 404 回退、静态托管、IFrame 容器与普通 Web）
 * 2. 多维度 URL 协议解析：
 *    - 语义化路径：`/merchant`, `/rider`, `/platform`, `/orders`, `/tracking/:orderId`, `/t/:tableId`, `/coupons`, `/vip`
 *    - 哈希路由：`#/merchant`, `#/rider`, `#/orders`, `#/tracking?orderId=...`
 *    - 统一查询参数：`?role=merchant&tab=precision_console`, `?tab=orders`, `?table=A01`
 * 3. 浏览器前进/后退（Popstate/History API）无缝拦截与虚拟堆栈联动，解决点击物理返回键退出站点的痛点
 * 4. 动态同步 URL 地址栏，支持任意页面/单品/订单/台位一键复制分享直达
 */

import { safeGetStorage } from './safeStorage';
import { IS_EMBED_CUSTOMER } from './embedMode';

export type AppNavRole = 'customer' | 'merchant' | 'rider' | 'platform';
export type AppNavTab = 'home' | 'menu' | 'cart' | 'checkout' | 'tracking' | 'orders' | 'profile' | 'coupons' | 'vip' | 'scan';

export interface AppRouteLocation {
  role: AppNavRole;
  tab: AppNavTab;
  merchantTab?: string;
  orderId?: string;
  dishId?: string;
  table?: string;
  couponCode?: string;
  action?: string;
  diningMode?: 'delivery' | 'dine_in' | 'pickup';
  rawPath: string;
  rawSearch: string;
  rawHash: string;
}

const ROUTE_CHANGE_EVENT = 'URBAN_RADAR_ROUTE_PATCH_EVENT';

/**
 * 从当前 window.location 提取解析完整的应用路由状态
 */
export function parseCurrentRoute(customUrl?: string): AppRouteLocation {
  if (typeof window === 'undefined') {
    return {
      role: 'customer',
      tab: 'home',
      rawPath: '/',
      rawSearch: '',
      rawHash: ''
    };
  }

  let pathname = window.location.pathname || '/';
  let search = window.location.search || '';
  let hash = window.location.hash || '';

  if (customUrl) {
    try {
      const parsedUrl = new URL(customUrl, window.location.origin);
      pathname = parsedUrl.pathname;
      search = parsedUrl.search;
      hash = parsedUrl.hash;
    } catch {
      // ignore
    }
  }

  // 1. 若当前在根目录且包含 hash (如 #/merchant 或 #/orders)，解析 hash 作为路径
  let effectivePath = pathname;
  let effectiveSearch = search;

  if (hash && hash.startsWith('#')) {
    const hashWithoutPound = hash.slice(1);
    if (hashWithoutPound.startsWith('/')) {
      const [hPath, hQuery] = hashWithoutPound.split('?');
      if (effectivePath === '/' || effectivePath === '/index.html' || effectivePath.endsWith('/')) {
        effectivePath = hPath;
      }
      if (hQuery && !effectiveSearch) {
        effectiveSearch = `?${hQuery}`;
      }
    } else if (hashWithoutPound.includes('=')) {
      if (!effectiveSearch) {
        effectiveSearch = `?${hashWithoutPound}`;
      }
    }
  }

  const queryParams = new URLSearchParams(effectiveSearch);

  // 2. 角色解析 (Role Resolution)
  let role: AppNavRole = 'customer';
  let merchantTab: string | undefined = queryParams.get('merchantTab') || queryParams.get('mTab') || undefined;

  if (effectivePath.startsWith('/merchant') || effectivePath === '/admin' || queryParams.get('role') === 'merchant') {
    role = 'merchant';
    const subParts = effectivePath.replace(/^\/merchant\/?/, '').split('/');
    if (subParts[0] && !merchantTab) {
      merchantTab = subParts[0];
    }
  } else if (effectivePath.startsWith('/rider') || queryParams.get('role') === 'rider') {
    role = 'rider';
  } else if (effectivePath.startsWith('/platform') || queryParams.get('role') === 'platform') {
    role = 'platform';
  } else if (queryParams.get('role') === 'customer') {
    role = 'customer';
  } else {
    // 降级使用本地存储的角色（若在根目录）
    if (!IS_EMBED_CUSTOMER && (effectivePath === '/' || effectivePath === '/index.html')) {
      const savedRole = safeGetStorage<AppNavRole>('obsidian_user_role', 'customer');
      if (savedRole && ['customer', 'merchant', 'rider', 'platform'].includes(savedRole)) {
        role = savedRole;
      }
    }
  }

  // 3. 食客端页面 Tab 解析
  let tab: AppNavTab = 'home';
  let orderId: string | undefined = queryParams.get('orderId') || queryParams.get('oid') || undefined;
  let dishId: string | undefined = queryParams.get('dishId') || queryParams.get('dish') || undefined;
  let table: string | undefined = queryParams.get('table') || undefined;
  let couponCode: string | undefined = queryParams.get('coupon') || queryParams.get('code') || undefined;
  let action: string | undefined = queryParams.get('action') || undefined;
  let diningMode: 'delivery' | 'dine_in' | 'pickup' | undefined = undefined;

  // 检查路径匹配
  if (effectivePath.includes('/t/')) {
    const parts = effectivePath.split('/t/');
    if (parts[1]) {
      table = decodeURIComponent(parts[1].split('/')[0]).toUpperCase();
      diningMode = 'dine_in';
    }
  } else if (effectivePath.startsWith('/tracking')) {
    tab = 'tracking';
    const parts = effectivePath.replace(/^\/tracking\/?/, '').split('/');
    if (parts[0] && !orderId) {
      orderId = decodeURIComponent(parts[0]);
    }
  } else if (effectivePath.startsWith('/orders')) {
    tab = 'orders';
  } else if (effectivePath.startsWith('/coupons')) {
    tab = 'coupons';
  } else if (effectivePath.startsWith('/vip')) {
    tab = 'vip';
  } else if (effectivePath.startsWith('/profile')) {
    tab = 'profile';
  } else if (effectivePath.startsWith('/cart')) {
    tab = 'cart';
  } else if (effectivePath.startsWith('/checkout')) {
    tab = 'checkout';
  } else if (effectivePath.startsWith('/menu')) {
    tab = 'menu';
  } else if (effectivePath.startsWith('/scan')) {
    tab = 'scan';
  } else if (effectivePath.startsWith('/dish/')) {
    const parts = effectivePath.replace(/^\/dish\/?/, '').split('/');
    if (parts[0]) {
      dishId = decodeURIComponent(parts[0]);
      tab = 'menu';
    }
  }

  // 查询参数覆盖
  const paramTab = queryParams.get('tab');
  if (paramTab && ['home', 'menu', 'cart', 'checkout', 'tracking', 'orders', 'profile', 'coupons', 'vip', 'scan'].includes(paramTab)) {
    tab = paramTab as AppNavTab;
  }

  if (table) {
    diningMode = 'dine_in';
  }

  return {
    role,
    tab,
    merchantTab,
    orderId,
    dishId,
    table,
    couponCode,
    action,
    diningMode,
    rawPath: pathname,
    rawSearch: search,
    rawHash: hash
  };
}

/**
 * 根据应用目标状态构建标准可分享 URL
 */
export function buildAppUrl(target: Partial<AppRouteLocation>): string {
  if (typeof window === 'undefined') return '/';

  const origin = window.location.origin;
  const url = new URL(origin);

  if (target.role === 'merchant') {
    url.pathname = target.merchantTab ? `/merchant/${target.merchantTab}` : '/merchant';
  } else if (target.role === 'rider') {
    url.pathname = '/rider';
  } else if (target.role === 'platform') {
    url.pathname = '/platform';
  } else {
    // Customer
    if (target.table) {
      url.pathname = `/t/${target.table.toUpperCase()}`;
    } else if (target.tab === 'tracking' && target.orderId) {
      url.pathname = `/tracking/${encodeURIComponent(target.orderId)}`;
    } else if (target.tab && target.tab !== 'home') {
      url.pathname = `/${target.tab}`;
    } else {
      url.pathname = '/';
    }
  }

  // 保留或注入关键查询参数
  if (target.orderId && !url.pathname.includes('/tracking/')) {
    url.searchParams.set('orderId', target.orderId);
  }
  if (target.dishId) {
    url.searchParams.set('dishId', target.dishId);
  }
  if (target.couponCode) {
    url.searchParams.set('coupon', target.couponCode);
  }
  if (target.action) {
    url.searchParams.set('action', target.action);
  }

  return url.toString();
}

/**
 * 同步路由状态到浏览器地址栏（无刷新写入 History API）
 */
export function syncRouteToBrowser(
  route: Partial<AppRouteLocation>,
  options: { replace?: boolean; title?: string } = {}
): void {
  if (typeof window === 'undefined' || !window.history) return;

  try {
    const currentParsed = parseCurrentRoute();
    const merged: AppRouteLocation = {
      ...currentParsed,
      ...route
    };

    // 构建目标路径
    let targetPath = '/';
    const params = new URLSearchParams(window.location.search);

    if (merged.role === 'merchant') {
      targetPath = merged.merchantTab ? `/merchant/${merged.merchantTab}` : '/merchant';
      params.delete('tab');
      params.delete('role');
    } else if (merged.role === 'rider') {
      targetPath = '/rider';
      params.delete('tab');
      params.delete('role');
    } else if (merged.role === 'platform') {
      targetPath = '/platform';
      params.delete('tab');
      params.delete('role');
    } else {
      // Customer
      if (merged.table) {
        targetPath = `/t/${merged.table.toUpperCase()}`;
      } else if (merged.tab === 'tracking' && merged.orderId) {
        targetPath = `/tracking/${encodeURIComponent(merged.orderId)}`;
        params.delete('orderId');
      } else if (merged.tab && merged.tab !== 'home') {
        targetPath = `/${merged.tab}`;
      } else {
        targetPath = '/';
      }
      params.delete('role');
      params.delete('tab');
    }

    // 保留非路由的业务参数（如 token, shortCode 等）
    const searchStr = params.toString() ? `?${params.toString()}` : '';
    const fullTarget = `${targetPath}${searchStr}${window.location.hash ? window.location.hash : ''}`;

    // 设置网页标题
    const tabTitles: Record<string, string> = {
      home: 'Urban Radar · 流动餐车 GPS 极速专送',
      menu: 'Urban Radar · 主厨菜单点餐',
      cart: 'Urban Radar · 购物车',
      checkout: 'Urban Radar · 收银台结算',
      tracking: 'Urban Radar · 配送轨迹实时追踪',
      orders: 'Urban Radar · 全渠道订单记录',
      profile: 'Urban Radar · 个人中心',
      coupons: 'Urban Radar · 优惠券领券中心',
      vip: 'Urban Radar · VIP 黑金会员',
      scan: 'Urban Radar · 扫码入座点餐'
    };

    let newTitle = options.title || tabTitles[merged.tab] || 'Urban Radar 流动餐车专送';
    if (merged.role === 'merchant') newTitle = 'Urban Radar · 商家全渠道总控矩阵';
    if (merged.role === 'rider') newTitle = 'Urban Radar · 骑士车载导航与配送终端';
    if (merged.role === 'platform') newTitle = 'Urban Radar · 城市数字孪生总指挥平台';

    try {
      document.title = newTitle;
    } catch {}

    const stateData = {
      role: merged.role,
      tab: merged.tab,
      merchantTab: merged.merchantTab,
      orderId: merged.orderId,
      table: merged.table,
      timestamp: Date.now()
    };

    if (options.replace) {
      window.history.replaceState(stateData, newTitle, fullTarget);
    } else {
      window.history.pushState(stateData, newTitle, fullTarget);
    }
  } catch {
    // 在部分极其严格的安全沙箱或第三方宿主内优雅降级
  }
}

/**
 * 监听浏览器前进、后退与外部深链变化
 */
export function initRouterPatch(
  onRouteChange: (route: AppRouteLocation) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handlePopState = (_e: PopStateEvent) => {
    const route = parseCurrentRoute();
    onRouteChange(route);
    window.dispatchEvent(new CustomEvent(ROUTE_CHANGE_EVENT, { detail: route }));
  };

  const handleHashChange = () => {
    const route = parseCurrentRoute();
    onRouteChange(route);
    window.dispatchEvent(new CustomEvent(ROUTE_CHANGE_EVENT, { detail: route }));
  };

  window.addEventListener('popstate', handlePopState);
  window.addEventListener('hashchange', handleHashChange);

  return () => {
    window.removeEventListener('popstate', handlePopState);
    window.removeEventListener('hashchange', handleHashChange);
  };
}

/**
 * 编程式跳转补丁：供各组件统一调用的单页安全跳转函数
 */
export function navigateAppRoute(
  route: Partial<AppRouteLocation>,
  options: { replace?: boolean } = {}
): void {
  syncRouteToBrowser(route, options);
  const updated = parseCurrentRoute();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ROUTE_CHANGE_EVENT, { detail: updated }));
  }
}
