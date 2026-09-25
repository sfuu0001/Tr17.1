import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Users,
  Award,
  Calendar,
  Download,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieChartIcon,
  FileSpreadsheet,
  Database,
  Upload,
  Search,
  Filter,
  Edit3,
  Trash2,
  Plus,
  RotateCcw,
  CheckCircle2,
  Copy,
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Activity,
  SlidersHorizontal,
  X,
  Check
} from 'lucide-react';
import { Order, DishItem } from '../../types';
import { exportToCsv, exportSystemBackup, importSystemBackup } from '../../utils/dataExportEngine';
import { merchantBackupEngine } from '../../utils/merchantBackupEngine';
import { HeatmapGridMatrix, HeatmapDataPoint } from '../common/HeatmapGridMatrix';

interface MerchantAnalyticsProps {
  orders: Order[];
  dishes: DishItem[];
  showToast: (msg: string) => void;
  onDataRestored?: () => void;
  onOpenMasterControl?: () => void;
}

export const MerchantAnalytics: React.FC<MerchantAnalyticsProps> = ({
  orders,
  dishes,
  showToast,
  onDataRestored,
  onOpenMasterControl
}) => {
  // 日期模式：'specific_day' (指定具体某天) | 'today' | 'yesterday' | 'week' | 'month'
  const [dateMode, setDateMode] = useState<'today' | 'yesterday' | 'specific_day' | 'week' | 'month'>('today');

  // 当前选中的具体指定日期 (YYYY-MM-DD)
  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  };
  const [selectedDateStr, setSelectedDateStr] = useState<string>(getTodayStr());

  // 菜品榜单排序与搜索
  const [dishSortBy, setDishSortBy] = useState<'qty' | 'revenue'>('qty');
  const [dishSearchKeyword, setDishSearchKeyword] = useState<string>('');
  const [dishCategoryFilter, setDishCategoryFilter] = useState<string>('all');
  const [showAllDishes, setShowAllDishes] = useState<boolean>(false);

  // 订单列表搜索与过滤
  const [orderSearchKeyword, setOrderSearchKeyword] = useState<string>('');
  const [orderChannelFilter, setOrderChannelFilter] = useState<string>('all');

  // 自定义报表修改与删除状态
  const [customAdjustments, setCustomAdjustments] = useState(merchantBackupEngine.getCustomAdjustments());
  const [orderOverrides, setOrderOverrides] = useState(merchantBackupEngine.getOrderOverrides());
  const [deletedOrderIds, setDeletedOrderIds] = useState<string[]>(merchantBackupEngine.getDeletedOrderIds());

  // 编辑订单弹窗
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editChannel, setEditChannel] = useState<string>('dine_in');
  const [editPaymentMethod, setEditPaymentMethod] = useState<string>('微信支付');
  const [editStatusText, setEditStatusText] = useState<string>('已完成');
  const [editNote, setEditNote] = useState<string>('');

  // 新增调整单弹窗
  const [isAddingAdjustment, setIsAddingAdjustment] = useState<boolean>(false);
  const [adjTitle, setAdjTitle] = useState<string>('');
  const [adjAmount, setAdjAmount] = useState<number>(0);
  const [adjCategory, setAdjCategory] = useState<'活动补贴' | '线上平台差额' | '线下手工补录' | '现金账目修正' | '食材物料损耗扣减'>('线下手工补录');
  const [adjRemark, setAdjRemark] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 监听备份引擎更新
  useEffect(() => {
    const unsub = merchantBackupEngine.subscribe(() => {
      setCustomAdjustments(merchantBackupEngine.getCustomAdjustments());
      setOrderOverrides(merchantBackupEngine.getOrderOverrides());
      setDeletedOrderIds(merchantBackupEngine.getDeletedOrderIds());
    });
    return unsub;
  }, []);

  // 模拟/持久化指定日期的示范流水，确保切换任意自选日期均有真实出单数据可核验与修改
  const [seededOrders, setSeededOrders] = useState<Order[]>(() => {
    try {
      const raw = localStorage.getItem('obsidian_analytics_seeded_orders_v1');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const handleSeedOrdersForDate = (dateStr: string) => {
    const safeDishes = dishes.length > 0 ? dishes : [
      { id: 'dish-1', name: '碳烤和牛汉堡', price: 48, category: '招牌主食' },
      { id: 'dish-2', name: '冷萃深煎冰咖', price: 22, category: '特调饮品' },
      { id: 'dish-3', name: '秘制照烧鸡肉串', price: 18, category: '风味小食' },
      { id: 'dish-4', name: '日式焦糖布丁', price: 16, category: '手作甜品' }
    ];

    const times = [
      '11:15:20', '11:42:05', '12:08:33', '12:26:15',
      '12:45:50', '13:12:00', '14:20:18', '17:35:42',
      '18:10:05', '18:48:30', '19:22:15', '20:05:40'
    ];

    const customers = [
      { name: '先锋食客 · 墨客', phone: '138****6621' },
      { name: 'VIP · 林先生', phone: '139****8820' },
      { name: '散客 · 陈小姐', phone: '186****9910' },
      { name: '园区老顾客 · 赵总', phone: '159****3342' },
      { name: '堂食食客 · 孙同学', phone: '137****1120' },
      { name: '外带常客 · 周先生', phone: '185****7741' },
      { name: '写字楼白领 · 钱小姐', phone: '133****4455' },
      { name: '夜市散客 · 吴先生', phone: '150****6677' },
      { name: 'VIP · 郑先生', phone: '188****9988' },
      { name: '自提顾客 · 冯女士', phone: '136****2233' },
      { name: '外卖食客 · 褚先生', phone: '177****5566' },
      { name: '餐车邻桌 · 卫小姐', phone: '131****8899' }
    ];

    const channels: Array<'dine_in' | 'delivery' | 'pickup'> = [
      'dine_in', 'delivery', 'pickup', 'dine_in', 'delivery', 'dine_in',
      'pickup', 'delivery', 'dine_in', 'pickup', 'delivery', 'dine_in'
    ];

    const paymentMethods = ['微信支付', '支付宝', '微信支付', '云闪付', '微信支付', '现金支付', '微信支付', '支付宝', '微信支付', '数字人民币', '微信支付', '支付宝'];

    const newMockOrders: Order[] = times.map((time, idx) => {
      const cust = customers[idx % customers.length];
      const ch = channels[idx % channels.length];
      const pm = paymentMethods[idx % paymentMethods.length];
      const d1 = safeDishes[idx % safeDishes.length];
      const d2 = safeDishes[(idx + 2) % safeDishes.length];
      const qty1 = (idx % 2) + 1;
      const qty2 = idx % 3 === 0 ? 1 : 0;

      const items = [
        {
          id: `it-${dateStr}-${idx}-1`,
          dishId: d1.id,
          name: d1.name,
          price: d1.price,
          quantity: qty1,
          total: d1.price * qty1
        }
      ];

      if (qty2 > 0) {
        items.push({
          id: `it-${dateStr}-${idx}-2`,
          dishId: d2.id,
          name: d2.name,
          price: d2.price,
          quantity: qty2,
          total: d2.price * qty2
        });
      }

      const totalAmt = items.reduce((acc, it) => acc + it.total, 0);
      const suffix = (1000 + idx * 73).toString();
      const prefix = ch === 'dine_in' ? 'UR-DIN' : ch === 'delivery' ? 'UR-DEL' : 'UR-PK';
      const orderNo = `${prefix}-${dateStr.replace(/-/g, '').slice(4)}-${suffix}`;

      return {
        id: `ord-${dateStr}-${idx}`,
        orderNo,
        customerName: cust.name,
        userPhone: cust.phone,
        items,
        channelType: ch,
        paymentMethod: pm,
        totalAmount: totalAmt,
        originalAmount: totalAmt,
        discountAmount: 0,
        status: 'delivered' as any,
        statusText: '已完成',
        createdTime: time,
        orderDate: dateStr,
        remark: idx % 3 === 0 ? '少放辣，多用餐巾纸' : idx % 4 === 0 ? '打包带走加保温袋' : '趁热出餐'
      } as any;
    });

    const updated = [...seededOrders.filter(o => (o as any).orderDate !== dateStr), ...newMockOrders];
    setSeededOrders(updated);
    try {
      localStorage.setItem('obsidian_analytics_seeded_orders_v1', JSON.stringify(updated));
    } catch {}

    merchantBackupEngine.createSnapshot(
      `载入 ${dateStr} 示范营业流水`,
      `自动生成 12 笔典型订单流水用于大屏核算与操作测试`,
      [...orders, ...updated],
      dishes
    );
    showToast(`已成功为【${dateStr}】载入 12 笔拟真营业出单！大屏与菜品榜单已实时刷新。`);
  };

  // 日期快速加减步进器
  const handleStepDate = (days: number) => {
    let baseDate: Date;
    if (dateMode === 'today') {
      baseDate = new Date();
    } else if (dateMode === 'yesterday') {
      baseDate = new Date(Date.now() - 86400000);
    } else if (selectedDateStr) {
      const [y, m, d] = selectedDateStr.split('-').map(Number);
      baseDate = new Date(y, m - 1, d);
    } else {
      baseDate = new Date();
    }

    baseDate.setDate(baseDate.getDate() + days);
    const yStr = baseDate.getFullYear();
    const mStr = (baseDate.getMonth() + 1).toString().padStart(2, '0');
    const dStr = baseDate.getDate().toString().padStart(2, '0');
    const newDateStr = `${yStr}-${mStr}-${dStr}`;

    setSelectedDateStr(newDateStr);
    setDateMode('specific_day');
  };

  // 智能解析订单时间戳与所在公历日期
  const orderTs = (o: Order): number => {
    if (!o.createdTime) return Date.now();

    // 1. 如果已有完整的标准时间戳或 ISO 日期字串
    const directTs = new Date(o.createdTime).getTime();
    if (!isNaN(directTs) && directTs > 1000000000000) {
      return directTs;
    }

    const now = new Date();
    const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    // 2. 如果包含相对日期关键词
    if (o.createdTime.includes('昨天')) {
      const match = o.createdTime.match(/(\d{1,2}):(\d{2})/);
      const h = match ? parseInt(match[1], 10) : 12;
      const m = match ? parseInt(match[2], 10) : 0;
      return todayZero - 86400000 + (h * 3600 + m * 60) * 1000;
    }
    if (o.createdTime.includes('前天')) {
      const match = o.createdTime.match(/(\d{1,2}):(\d{2})/);
      const h = match ? parseInt(match[1], 10) : 12;
      const m = match ? parseInt(match[2], 10) : 0;
      return todayZero - 2 * 86400000 + (h * 3600 + m * 60) * 1000;
    }

    // 3. 如果订单显式指定了挂载的 orderDate (如 2026-09-07)
    if ((o as any).orderDate) {
      const datePart = (o as any).orderDate;
      const match = o.createdTime.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
      const h = match ? parseInt(match[1], 10) : 12;
      const m = match ? parseInt(match[2], 10) : 0;
      const s = match && match[3] ? parseInt(match[3], 10) : 0;
      const [y, mon, d] = datePart.split('-').map((v: string) => parseInt(v, 10));
      return new Date(y, mon - 1, d, h, m, s).getTime();
    }

    // 4. 标准时间格式 "HH:mm:ss" 或 "HH:mm"
    const match = o.createdTime.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (match) {
      const h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const s = match[3] ? parseInt(match[3], 10) : 0;

      // 为演示丰富性，对初始静态订单进行合理的时间分布：
      let dayOffset = 0;
      if (o.id.includes('7078') || o.id.includes('5521') || o.id.includes('pk-6688')) {
        dayOffset = -86400000; // 归入昨日流水
      } else if (o.id.includes('4412') || o.id.includes('3390')) {
        dayOffset = -2 * 86400000; // 归入前日流水
      }
      return todayZero + dayOffset + (h * 3600 + m * 60 + s) * 1000;
    }

    return todayZero;
  };

  // 根据当前选择的日期模式和指定日期计算时间范围 [startTs, endTs]
  const targetDateBounds = useMemo(() => {
    const now = new Date();
    const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    if (dateMode === 'today') {
      return {
        start: todayZero,
        end: todayZero + 86400000,
        prevStart: todayZero - 86400000,
        prevEnd: todayZero,
        label: '今日实时'
      };
    }

    if (dateMode === 'yesterday') {
      const yZero = todayZero - 86400000;
      return {
        start: yZero,
        end: todayZero,
        prevStart: yZero - 86400000,
        prevEnd: yZero,
        label: '昨日数据'
      };
    }

    if (dateMode === 'week') {
      const weekStart = todayZero - 6 * 86400000;
      return {
        start: weekStart,
        end: todayZero + 86400000,
        prevStart: weekStart - 7 * 86400000,
        prevEnd: weekStart,
        label: '近 7 日累计'
      };
    }

    if (dateMode === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
      return {
        start: monthStart,
        end: todayZero + 86400000,
        prevStart: prevMonthStart,
        prevEnd: monthStart,
        label: '本月累计'
      };
    }

    // specific_day: 指定具体任意一天
    if (selectedDateStr) {
      const parts = selectedDateStr.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        const specificStart = new Date(y, m, d).getTime();
        return {
          start: specificStart,
          end: specificStart + 86400000,
          prevStart: specificStart - 86400000,
          prevEnd: specificStart,
          label: selectedDateStr
        };
      }
    }

    return {
      start: todayZero,
      end: todayZero + 86400000,
      prevStart: todayZero - 86400000,
      prevEnd: todayZero,
      label: '今日实时'
    };
  }, [dateMode, selectedDateStr]);

  // 融合“自定义修改”、“删除”与“指定日期示范流水”后的有效订单全量列表
  const allRawOrders = useMemo(() => {
    return [...orders, ...seededOrders];
  }, [orders, seededOrders]);

  const processedOrders = useMemo(() => {
    return allRawOrders
      .filter((o) => !deletedOrderIds.includes(o.orderNo))
      .map((o) => {
        const override = orderOverrides[o.orderNo];
        if (override) {
          return {
            ...o,
            ...override,
            isCustomModified: true
          } as Order & { isCustomModified?: boolean };
        }
        return o as Order & { isCustomModified?: boolean };
      });
  }, [allRawOrders, deletedOrderIds, orderOverrides]);

  // 当前所选时间区间内的订单
  const currentRangeOrders = useMemo(() => {
    return processedOrders.filter((o) => {
      const t = orderTs(o);
      // 如果日期被指定，且订单时间跨越到该天，或者属于默认订单
      return t >= targetDateBounds.start && t < targetDateBounds.end;
    });
  }, [processedOrders, targetDateBounds]);

  // 上一周期对比订单
  const prevRangeOrders = useMemo(() => {
    return processedOrders.filter((o) => {
      const t = orderTs(o);
      return t >= targetDateBounds.prevStart && t < targetDateBounds.prevEnd;
    });
  }, [processedOrders, targetDateBounds]);

  // 当前所选日期适用的自定义调整项 (Custom Adjustments)
  const matchedAdjustments = useMemo(() => {
    const curDateKey = dateMode === 'specific_day' ? selectedDateStr : getTodayStr();
    return customAdjustments.filter((a) => {
      if (dateMode === 'week' || dateMode === 'month') return true;
      return a.dateStr === curDateKey;
    });
  }, [customAdjustments, dateMode, selectedDateStr]);

  const totalAdjustmentSum = useMemo(() => {
    return matchedAdjustments.reduce((sum, a) => sum + a.amount, 0);
  }, [matchedAdjustments]);

  // 基础订单金额与汇总（加上报表自定义调整金额）
  const baseSales = currentRangeOrders.reduce((s, o) => s + o.totalAmount, 0);
  const totalSales = Math.max(0, baseSales + totalAdjustmentSum);
  const totalOrdersCount = currentRangeOrders.length;
  const avgTicketPrice = totalOrdersCount > 0 ? totalSales / totalOrdersCount : 0;

  const prevBaseSales = prevRangeOrders.reduce((s, o) => s + o.totalAmount, 0);
  const prevCount = prevRangeOrders.length;
  const salesDelta = prevBaseSales > 0 ? ((totalSales - prevBaseSales) / prevBaseSales) * 100 : null;
  const countDelta = prevCount > 0 ? ((totalOrdersCount - prevCount) / prevCount) * 100 : null;

  // 60 天营收与客流打卡热力矩阵数据源
  const salesHeatmapData: HeatmapDataPoint[] = useMemo(() => {
    const map = new Map<string, { revenue: number; count: number }>();
    processedOrders.forEach((o) => {
      const dStr = new Date(orderTs(o)).toISOString().slice(0, 10);
      const cur = map.get(dStr) || { revenue: 0, count: 0 };
      cur.revenue += o.totalAmount;
      cur.count += 1;
      map.set(dStr, cur);
    });

    customAdjustments.forEach((a) => {
      if (a.dateStr) {
        const cur = map.get(a.dateStr) || { revenue: 0, count: 0 };
        cur.revenue += a.amount;
        map.set(a.dateStr, cur);
      }
    });

    const list: HeatmapDataPoint[] = [];
    map.forEach((val, dStr) => {
      list.push({
        date: dStr,
        value: Math.max(0, Math.round(val.revenue)),
        title: `¥${val.revenue.toFixed(2)} · ${val.count}单`,
        extraNote: `${val.count} 笔成交流水`,
        metrics: [
          { label: '实收营收', value: `¥${val.revenue.toFixed(2)}` },
          { label: '订单流水', value: `${val.count} 单` }
        ]
      });
    });
    return list;
  }, [processedOrders, customAdjustments]);

  // 渠道构成
  const storeSideCount = currentRangeOrders.filter(
    (o) => o.channelType === 'dine_in' || o.channelType === 'pickup'
  ).length;
  const deliverySideCount = currentRangeOrders.filter((o) => o.channelType === 'delivery').length;
  const dineVsDeliveryTotal = storeSideCount + deliverySideCount;
  const dineShare = dineVsDeliveryTotal > 0 ? Math.round((storeSideCount / dineVsDeliveryTotal) * 100) : 0;
  const deliveryShare = dineVsDeliveryTotal > 0 ? 100 - dineShare : 0;

  // 各时段出单分布
  const hourlyHours = ['11:00', '12:00', '13:00', '14:00', '17:00', '18:00', '19:00', '20:00'];
  const hourlyData = useMemo(() => {
    const buckets: Record<string, { amount: number; count: number }> = {};
    for (const o of currentRangeOrders) {
      const key = `${new Date(orderTs(o)).getHours()}:00`;
      if (!buckets[key]) buckets[key] = { amount: 0, count: 0 };
      buckets[key].amount += o.totalAmount;
      buckets[key].count += 1;
    }
    let maxAmount = 0;
    const arr = hourlyHours.map((h) => {
      const b = buckets[h] || { amount: 0, count: 0 };
      if (b.amount > maxAmount) maxAmount = b.amount;
      return { hour: h, amount: Math.round(b.amount), count: b.count, isPeak: false };
    });
    arr.forEach((a) => {
      if (maxAmount > 0 && a.amount === maxAmount) a.isPeak = true;
    });
    return arr;
  }, [currentRangeOrders]);

  // -------------------------------------------------------------
  // 核心功能 2：每日菜品销售数据完整榜单 (按选定日期聚合)
  // -------------------------------------------------------------
  const allDishesRankList = useMemo(() => {
    const map: Record<string, { name: string; category: string; qty: number; revenue: number; price: number }> = {};

    // 默认以菜单中的基础菜品打底，确保没出单的菜品也可见
    dishes.forEach((d) => {
      map[d.name] = {
        name: d.name,
        category: d.category || '特色餐品',
        qty: 0,
        revenue: 0,
        price: d.price
      };
    });

    // 遍历当前选定日期的所有订单菜品
    for (const o of currentRangeOrders) {
      for (const it of o.items) {
        if (!map[it.name]) {
          map[it.name] = {
            name: it.name,
            category: '现制料理',
            qty: 0,
            revenue: 0,
            price: it.price
          };
        }
        map[it.name].qty += it.quantity;
        map[it.name].revenue += it.price * it.quantity;
      }
    }

    let list = Object.values(map);

    // 分类筛选
    if (dishCategoryFilter !== 'all') {
      list = list.filter((d) => d.category === dishCategoryFilter);
    }

    // 关键字搜索
    if (dishSearchKeyword.trim()) {
      const kw = dishSearchKeyword.toLowerCase();
      list = list.filter((d) => d.name.toLowerCase().includes(kw) || d.category.toLowerCase().includes(kw));
    }

    // 排序
    if (dishSortBy === 'qty') {
      list.sort((a, b) => b.qty - a.qty || b.revenue - a.revenue);
    } else {
      list.sort((a, b) => b.revenue - a.revenue || b.qty - a.qty);
    }

    const maxVal = list.length > 0 ? (dishSortBy === 'qty' ? list[0].qty : list[0].revenue) : 1;

    return list.map((d, index) => ({
      ...d,
      rank: index + 1,
      percent: maxVal > 0 ? Math.round(((dishSortBy === 'qty' ? d.qty : d.revenue) / maxVal) * 100) : 0
    }));
  }, [dishes, currentRangeOrders, dishCategoryFilter, dishSearchKeyword, dishSortBy]);

  const displayedDishesRank = showAllDishes ? allDishesRankList : allDishesRankList.slice(0, 5);

  // 所有分类选项
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    dishes.forEach((d) => {
      if (d.category) set.add(d.category);
    });
    return Array.from(set);
  }, [dishes]);

  // -------------------------------------------------------------
  // 核心功能 3：每日订单列表与订单号码明细流水
  // -------------------------------------------------------------
  const filteredOrderList = useMemo(() => {
    return currentRangeOrders.filter((o) => {
      if (orderChannelFilter !== 'all') {
        if (orderChannelFilter === 'dine_in' && o.channelType !== 'dine_in') return false;
        if (orderChannelFilter === 'delivery' && o.channelType !== 'delivery') return false;
        if (orderChannelFilter === 'pickup' && o.channelType !== 'pickup') return false;
      }
      if (orderSearchKeyword.trim()) {
        const kw = orderSearchKeyword.toLowerCase();
        const matchNo = o.orderNo.toLowerCase().includes(kw);
        const matchCust = (o.customerName || '').toLowerCase().includes(kw);
        const matchPhone = (o.userPhone || '').toLowerCase().includes(kw);
        const matchItems = o.items.some((it) => it.name.toLowerCase().includes(kw));
        return matchNo || matchCust || matchPhone || matchItems;
      }
      return true;
    });
  }, [currentRangeOrders, orderChannelFilter, orderSearchKeyword]);

  // -------------------------------------------------------------
  // 核心功能 4：报表自定义修改与删除
  // -------------------------------------------------------------
  const handleOpenEditOrder = (order: Order) => {
    setEditingOrder(order);
    setEditAmount(order.totalAmount);
    setEditChannel(order.channelType);
    setEditPaymentMethod(order.paymentMethod || '微信支付');
    setEditStatusText(order.statusText || '已完成');
    setEditNote(order.remark || '');
  };

  const handleSaveOrderEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    // 先留存安全快照
    merchantBackupEngine.createSnapshot(
      `修改订单 ${editingOrder.orderNo} 前快照`,
      `原金额 ¥${editingOrder.totalAmount} -> 修改为 ¥${editAmount}`,
      orders,
      dishes
    );

    const updatedOverrides = {
      ...orderOverrides,
      [editingOrder.orderNo]: {
        totalAmount: Number(editAmount),
        channelType: editChannel as any,
        paymentMethod: editPaymentMethod,
        statusText: editStatusText,
        remark: editNote
      }
    };

    merchantBackupEngine.saveOrderOverrides(updatedOverrides);
    merchantBackupEngine.logAction(
      '营收报表',
      'update',
      `修改报表订单 [${editingOrder.orderNo}]`,
      `实收金额调整为 ¥${editAmount} (${editPaymentMethod} / ${editChannel})，备注: ${editNote || '无'}`
    );

    setEditingOrder(null);
    showToast(`订单 ${editingOrder.orderNo} 报表记录已成功保存并重新核算大屏！`);
  };

  const handleDeleteOrder = (orderNo: string, amount: number) => {
    if (!confirm(`确定将订单 [${orderNo}] 从当日营收报表中作废/删除吗？此操作将自动创建安全快照并重新核算营收。`)) {
      return;
    }

    // 留存安全快照
    merchantBackupEngine.createSnapshot(
      `删除订单 ${orderNo} 前快照`,
      `从当日报表中剔除金额 ¥${amount.toFixed(2)}`,
      orders,
      dishes
    );

    const updatedDeletedIds = [...deletedOrderIds, orderNo];
    merchantBackupEngine.saveDeletedOrderIds(updatedDeletedIds);
    merchantBackupEngine.logAction(
      '营收报表',
      'delete',
      `作废删除订单 [${orderNo}]`,
      `已从大屏与流水中剔除该单 (原实付 ¥${amount.toFixed(2)})，并重新生成统计`
    );

    showToast(`订单 ${orderNo} 已从大屏报表中作废删除！指标已实时刷新。`);
  };

  // 新增手工调整/冲账
  const handleAddAdjustmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjTitle.trim()) {
      showToast('请输入调整项目名称！');
      return;
    }

    const curDateKey = dateMode === 'specific_day' ? selectedDateStr : getTodayStr();
    const newAdj = {
      id: `adj-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      dateStr: curDateKey,
      title: adjTitle.trim(),
      amount: Number(adjAmount),
      category: adjCategory,
      remark: adjRemark.trim(),
      createdAt: Date.now()
    };

    const updated = [newAdj, ...customAdjustments];
    merchantBackupEngine.saveCustomAdjustments(updated);
    merchantBackupEngine.logAction(
      '营收报表',
      'adjust',
      `新增报表调整项 [${newAdj.title}]`,
      `日期 ${curDateKey}，金额 ${newAdj.amount >= 0 ? '+' : ''}${newAdj.amount}元 (${newAdj.category})`
    );

    setAdjTitle('');
    setAdjAmount(0);
    setAdjRemark('');
    setIsAddingAdjustment(false);
    showToast(`已成功录入调整项【${newAdj.title}】，大屏营收已同步更新！`);
  };

  const handleDeleteAdjustment = (adjId: string, title: string) => {
    const updated = customAdjustments.filter((a) => a.id !== adjId);
    merchantBackupEngine.saveCustomAdjustments(updated);
    merchantBackupEngine.logAction('营收报表', 'delete', `删除报表调整项 [${title}]`, '已撤销该笔调账核算');
    showToast(`已删除调整项 [${title}]！`);
  };

  const handleResetAllCustomizations = () => {
    if (confirm('确定恢复原始数据吗？这将清除所有手动修改的订单金额、已删除订单及自定义调账项，恢复初始真实出单数据。')) {
      merchantBackupEngine.resetAllAnalyticsCustomizations();
      showToast('已恢复原始真实出单流水！');
    }
  };

  const copyOrderNo = (no: string) => {
    navigator.clipboard.writeText(no);
    showToast(`订单号 ${no} 已复制到剪贴板！`);
  };

  // 导出报表
  const handleExportOrdersCsv = () => {
    const exportData = filteredOrderList.map((o) => ({
      orderNo: o.orderNo,
      customerName: o.customerName || '顾客',
      phone: o.userPhone || '-',
      itemsSummary: o.items.map((i) => `${i.name}x${i.quantity}`).join('; '),
      totalAmount: o.totalAmount.toFixed(2),
      statusText: o.statusText || '已完成',
      channel: o.channelType === 'delivery' ? '雷达专送' : o.channelType === 'dine_in' ? '堂食外摆' : '到店自提',
      paymentMethod: o.paymentMethod || '微信支付',
      createdTime: o.createdTime
    }));

    exportToCsv(
      `黑石餐车_营业订单明细_${targetDateBounds.label}`,
      [
        { label: '订单编号', key: 'orderNo' },
        { label: '顾客称呼', key: 'customerName' },
        { label: '联系电话', key: 'phone' },
        { label: '餐品明细', key: 'itemsSummary' },
        { label: '实收总额(元)', key: 'totalAmount' },
        { label: '订单状态', key: 'statusText' },
        { label: '就餐渠道', key: 'channel' },
        { label: '支付方式', key: 'paymentMethod' },
        { label: '下单时间', key: 'createdTime' }
      ],
      exportData
    );
    showToast(`已成功下载 [${targetDateBounds.label}] 订单明细 CSV 表格！`);
  };

  return (
    <div className="space-y-4 text-xs max-w-[2000px] mx-auto pb-10">
      {/* 顶部主横幅与多维日期切换器 */}
      <div className="bg-white p-4 sm:p-5 rounded-[4px] border border-[#e6e6e4] shadow-2xs space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[2px] bg-[#f7f7f5] border border-[#e6e6e4] text-[#37352f] flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-[#37352f]">餐车营业营收与客流大屏</h3>
                <span className="px-1.5 py-0.5 rounded-[2px] text-[10px] font-medium bg-[#edf6f1] text-[#2b593f] border border-[#cbe4d7]">
                  正在查看：{targetDateBounds.label}
                </span>
                {(deletedOrderIds.length > 0 || Object.keys(orderOverrides).length > 0 || customAdjustments.length > 0) && (
                  <span className="px-1.5 py-0.5 rounded-[2px] text-[10px] font-medium bg-[#fef3d6] text-[#d9730d] border border-[#fae2a0]">
                    已包含自定义修改/调账
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#787774] mt-0.5">
                支持任意自选日期切换、每日菜品销售排行榜单、每日订单号码流水、报表修改与删除
              </p>
            </div>
          </div>

          {/* 核心操作按钮组 */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {onOpenMasterControl && (
              <button
                type="button"
                onClick={onOpenMasterControl}
                className="px-2.5 py-1.5 bg-[#37352f] hover:bg-[#201f1d] text-white rounded-[2px] font-medium text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                title="打开商家端总控 (用户行为全程监听 / 流失节点漏斗 / 全局备份快照)"
              >
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>进入商家端总控中枢</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsAddingAdjustment(true)}
              className="px-2.5 py-1.5 bg-[#2b593f] hover:bg-[#20432f] text-white rounded-[2px] font-medium text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ 录入调账/冲账</span>
            </button>

            <button
              type="button"
              onClick={handleExportOrdersCsv}
              className="px-2.5 py-1.5 bg-[#f7f7f5] hover:bg-[#efefed] text-[#37352f] border border-[#e6e6e4] rounded-[2px] font-medium text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#2b593f]" />
              <span>导出当前日期流水</span>
            </button>

            {(deletedOrderIds.length > 0 || Object.keys(orderOverrides).length > 0 || customAdjustments.length > 0) && (
              <button
                type="button"
                onClick={handleResetAllCustomizations}
                title="清除所有手动修改项，恢复原始真实出单"
                className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-[2px] font-medium text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>恢复原始流水</span>
              </button>
            )}
          </div>
        </div>

        {/* 核心功能 1：日期切换导航条 (支持切换指定的一个具体日期) */}
        <div className="flex items-center justify-between border-t border-[#efefed] pt-2.5 flex-wrap gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-medium text-[#37352f] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#2b593f]" />
              <span>日期范围切换:</span>
            </span>

            {/* 预设快捷周期 */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'today', label: '今日实时' },
                { id: 'yesterday', label: '昨日' },
                { id: 'week', label: '近 7 日' },
                { id: 'month', label: '本月累计' },
                { id: 'specific_day', label: '📅 自选指定日期' }
              ].map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setDateMode(r.id as any)}
                  className={`px-3 py-1 rounded-full text-xs transition-all cursor-pointer bg-white border ${
                    dateMode === r.id
                      ? 'text-zinc-900 font-semibold shadow-2xs border-zinc-900'
                      : 'text-[#5a5854] hover:text-zinc-900 border-[#e6e6e4] hover:border-zinc-300 hover:bg-slate-50'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* 日期步进器 (< 前一天 / 后一天 >) */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleStepDate(-1)}
                className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-[#e6e6e4] hover:border-zinc-300 rounded-full text-[#37352f] text-xs font-medium cursor-pointer flex items-center gap-0.5 transition-colors shadow-2xs"
                title="切换到前一天"
              >
                <ChevronLeft className="w-3 h-3" />
                <span>前一天</span>
              </button>
              <button
                type="button"
                onClick={() => handleStepDate(1)}
                className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-[#e6e6e4] hover:border-zinc-300 rounded-full text-[#37352f] text-xs font-medium cursor-pointer flex items-center gap-0.5 transition-colors shadow-2xs"
                title="切换到后一天"
              >
                <span>后一天</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* 自选指定具体某一天的日历选择器 (Specific Date Picker) */}
            {dateMode === 'specific_day' && (
              <div className="flex items-center gap-1.5 bg-[#edf6f1] px-2.5 py-0.5 rounded-[2px] border border-[#cbe4d7]">
                <span className="text-[11px] text-[#2b593f] font-medium">指定日期:</span>
                <input
                  type="date"
                  value={selectedDateStr}
                  onChange={(e) => setSelectedDateStr(e.target.value)}
                  className="bg-white border border-[#e6e6e4] rounded-[2px] px-2 py-0.5 text-xs text-[#37352f] font-mono focus:outline-hidden focus:border-[#2b593f]"
                />
                <span className="text-[10px] text-[#2b593f]">已切换至该日全量流水</span>
              </div>
            )}

            {/* 当前日期若暂无订单，快捷载入拟真示范流水按钮 */}
            {totalOrdersCount === 0 && (
              <button
                type="button"
                onClick={() => handleSeedOrdersForDate(dateMode === 'specific_day' ? selectedDateStr : getTodayStr())}
                className="px-2.5 py-1 bg-[#edf6f1] hover:bg-[#d6ecdf] text-[#2b593f] border border-[#cbe4d7] rounded-[2px] text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                title="一键快速载入该日期 12 笔示范出单记录"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#2b593f]" />
                <span>一键载入该日示范流水 (12笔)</span>
              </button>
            )}
          </div>

          <div className="text-[11px] text-[#787774]">
            当前周期统计订单数: <span className="font-mono font-semibold text-[#37352f]">{totalOrdersCount}</span> 笔
          </div>
        </div>
      </div>

      {/* 营收与客流打卡热力格子矩阵 */}
      <HeatmapGridMatrix
        id="analytics-sales-heatmap"
        title="餐车经营打卡与营收热力矩阵"
        subtitle="直观透视每日营业 GMV 达成走势，点击任意方格可瞬时切换查看该日流水报表"
        theme="emerald"
        daysCount={42}
        data={salesHeatmapData}
        metricUnit="元"
        selectedDate={dateMode === 'specific_day' ? selectedDateStr : (dateMode === 'today' ? getTodayStr() : null)}
        onSelectDate={(dStr) => {
          setDateMode('specific_day');
          setSelectedDateStr(dStr);
          showToast(`已切换查看 ${dStr} 的营业大屏与订单流水`);
        }}
        legendLabels={['无营收', '起步 <500', '常规 <1500', '良好 <3000', '爆单 >3000']}
      />

      {/* 4 项 KPI 指标概览卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-[4px] border border-[#e6e6e4] space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[#787774]">
            <span className="text-[11px]">总营业额 (GMV)</span>
            <DollarSign className="w-4 h-4 text-[#2b593f]" />
          </div>
          <p className="text-xl font-mono font-semibold text-[#2b593f]">
            ¥{totalSales.toFixed(2)}
          </p>
          {totalAdjustmentSum !== 0 && (
            <div className="text-[10px] font-mono text-[#d9730d]">
              包含手工调账: {totalAdjustmentSum >= 0 ? `+¥${totalAdjustmentSum}` : `-¥${Math.abs(totalAdjustmentSum)}`}
            </div>
          )}
          {salesDelta === null ? (
            <span className="text-[10px] text-[#787774]">环比上一周期 暂无对比数据</span>
          ) : (() => {
            const up = salesDelta >= 0;
            const Icon = up ? ArrowUpRight : ArrowDownRight;
            return (
              <span className={`text-[10px] font-medium flex items-center gap-0.5 ${up ? 'text-[#2b593f]' : 'text-rose-600'}`}>
                <Icon className="w-3 h-3" />
                <span>{up ? `环比上一周期 +${salesDelta.toFixed(1)}%` : `环比上一周期 ${salesDelta.toFixed(1)}%`}</span>
              </span>
            );
          })()}
        </div>

        <div className="bg-white p-3.5 rounded-[4px] border border-[#e6e6e4] space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[#787774]">
            <span className="text-[11px]">有效成单总数</span>
            <ShoppingBag className="w-4 h-4 text-[#37352f]" />
          </div>
          <p className="text-xl font-mono font-semibold text-[#37352f]">
            {totalOrdersCount} <span className="text-xs font-normal text-[#787774]">单</span>
          </p>
          {deletedOrderIds.length > 0 && (
            <div className="text-[10px] text-rose-600">
              已剔除作废单: {deletedOrderIds.length} 单
            </div>
          )}
          {countDelta === null ? (
            <span className="text-[10px] text-[#787774]">环比上一周期 暂无对比数据</span>
          ) : (() => {
            const up = countDelta >= 0;
            const Icon = up ? ArrowUpRight : ArrowDownRight;
            return (
              <span className={`text-[10px] font-medium flex items-center gap-0.5 ${up ? 'text-[#2b593f]' : 'text-rose-600'}`}>
                <Icon className="w-3 h-3" />
                <span>{up ? `环比上一周期 +${countDelta.toFixed(1)}%` : `环比上一周期 ${countDelta.toFixed(1)}%`}</span>
              </span>
            );
          })()}
        </div>

        <div className="bg-white p-3.5 rounded-[4px] border border-[#e6e6e4] space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[#787774]">
            <span className="text-[11px]">笔均客单价</span>
            <Award className="w-4 h-4 text-[#d9730d]" />
          </div>
          <p className="text-xl font-mono font-semibold text-[#d9730d]">
            ¥{avgTicketPrice.toFixed(1)}
          </p>
          <span className="text-[10px] text-[#787774]">平均每单消费额度</span>
        </div>

        <div className="bg-white p-3.5 rounded-[4px] border border-[#e6e6e4] space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[#787774]">
            <span className="text-[11px]">堂食 vs 外卖占比</span>
            <PieChartIcon className="w-4 h-4 text-[#37352f]" />
          </div>
          <p className="text-xl font-mono font-semibold text-[#37352f]">
            {dineVsDeliveryTotal > 0 ? `${dineShare}% : ${deliveryShare}%` : '—'}
          </p>
          <span className="text-[10px] text-[#787774]">
            堂食外摆 {storeSideCount} 单 · 专送 {deliverySideCount} 单
          </span>
        </div>
      </div>

      {/* 中部双栏：全天时段出餐波峰 + 核心功能 2：每日菜品销售数据榜单 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* 左侧：时段波峰图 (5 列) */}
        <div className="lg:col-span-5 bg-white p-4 rounded-[4px] border border-[#e6e6e4] space-y-3 shadow-2xs">
          <div className="flex items-center justify-between border-b border-[#efefed] pb-2">
            <div>
              <h4 className="font-semibold text-xs text-[#37352f] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#2b593f]" />
                <span>全天各时段出单波峰分布</span>
              </h4>
              <span className="text-[10px] text-[#787774]">对应选定日期的出单时段聚合</span>
            </div>
            <span className="text-[10px] text-[#d9730d] font-medium">● 峰值时段</span>
          </div>

          <div className="pt-2">
            <div className="grid grid-cols-8 gap-2 items-end h-36 pt-4">
              {hourlyData.map((h, idx) => {
                const maxVal = Math.max(500, ...hourlyData.map((x) => x.amount));
                const heightPercent = Math.max(12, (h.amount / maxVal) * 100);

                return (
                  <div key={idx} className="flex flex-col items-center gap-1 h-full justify-end">
                    <span className="font-mono text-[9px] text-[#787774]">
                      {h.amount > 0 ? `¥${h.amount}` : '-'}
                    </span>
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-[2px] transition-all ${
                        h.isPeak ? 'bg-[#d9730d]' : h.amount > 0 ? 'bg-[#37352f]' : 'bg-[#e6e6e4]'
                      }`}
                      title={`${h.hour} : ¥${h.amount} (${h.count}单)`}
                    />
                    <span className="font-mono text-[9.5px] text-[#787774]">{h.hour}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 右侧：每日菜品销售数据榜单 (7 列) */}
        <div className="lg:col-span-7 bg-white p-4 rounded-[4px] border border-[#e6e6e4] space-y-3 shadow-2xs">
          <div className="flex items-center justify-between border-b border-[#efefed] pb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-xs text-[#37352f] flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-[#d9730d]" />
                <span>每日菜品销售数据榜单</span>
              </h4>
              <span className="text-[10px] px-1.5 py-0.2 rounded-[2px] bg-[#f7f7f5] border border-[#e6e6e4] text-[#787774]">
                共 {allDishesRankList.length} 道菜品
              </span>
            </div>

            {/* 榜单过滤与排序 */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* 排序切换 */}
              <div className="flex bg-[#f7f7f5] p-0.5 rounded-[2px] border border-[#e6e6e4] text-[11px]">
                <button
                  type="button"
                  onClick={() => setDishSortBy('qty')}
                  className={`px-2 py-0.5 rounded-[2px] font-medium cursor-pointer ${
                    dishSortBy === 'qty' ? 'bg-white text-[#37352f] shadow-2xs border border-[#e6e6e4]' : 'text-[#787774]'
                  }`}
                >
                  按销量(份)
                </button>
                <button
                  type="button"
                  onClick={() => setDishSortBy('revenue')}
                  className={`px-2 py-0.5 rounded-[2px] font-medium cursor-pointer ${
                    dishSortBy === 'revenue' ? 'bg-white text-[#37352f] shadow-2xs border border-[#e6e6e4]' : 'text-[#787774]'
                  }`}
                >
                  按销售额(¥)
                </button>
              </div>

              {/* 分类筛选 */}
              <select
                value={dishCategoryFilter}
                onChange={(e) => setDishCategoryFilter(e.target.value)}
                className="px-2 py-0.5 border border-[#e6e6e4] rounded-[2px] text-[11px] bg-white text-[#37352f] focus:outline-hidden focus:border-[#37352f]"
              >
                <option value="all">全部分类</option>
                {availableCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {/* 展开/收起 */}
              <button
                type="button"
                onClick={() => setShowAllDishes(!showAllDishes)}
                className="text-[11px] text-[#2b593f] font-medium hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>{showAllDishes ? '收起榜单' : '查看全量'}</span>
                {showAllDishes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* 榜单列表 */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {displayedDishesRank.length === 0 ? (
              <div className="text-[11px] text-[#787774] py-8 text-center">当前所选日期无菜品销售记录</div>
            ) : (
              displayedDishesRank.map((dish) => {
                const isTop1 = dish.rank === 1;
                const isTop2 = dish.rank === 2;
                const isTop3 = dish.rank === 3;
                return (
                  <div key={dish.name} className="space-y-1 p-2 rounded-[2px] hover:bg-[#fafaf8] transition-colors border border-transparent hover:border-[#e6e6e4]">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-4 h-4 rounded-[2px] font-mono text-[10px] font-semibold flex items-center justify-center ${
                            isTop1
                              ? 'bg-[#37352f] text-white'
                              : isTop2
                              ? 'bg-[#787774] text-white'
                              : isTop3
                              ? 'bg-[#9d9d99] text-white'
                              : 'bg-[#f7f7f5] text-[#787774] border border-[#e6e6e4]'
                          }`}
                        >
                          {dish.rank}
                        </span>
                        <span className="font-medium text-[#37352f] truncate">{dish.name}</span>
                        <span className="text-[10px] text-[#787774] bg-[#f7f7f5] border border-[#e6e6e4] px-1.5 py-0.2 rounded-[2px]">
                          {dish.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[#787774] font-mono">
                          <strong className="text-[#37352f] font-semibold">{dish.qty}</strong> 份
                        </span>
                        <span className="font-mono font-semibold text-[#2b593f] min-w-[60px] text-right">
                          ¥{dish.revenue.toFixed(0)}
                        </span>
                      </div>
                    </div>

                    {/* 进度条 */}
                    <div className="w-full bg-[#f1f1ef] h-1.5 rounded-[1px] overflow-hidden">
                      <div
                        style={{ width: `${dish.percent}%` }}
                        className={`h-full ${isTop1 ? 'bg-[#d9730d]' : 'bg-[#37352f]'}`}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 调整单与手工核账记录展示条 (若有) */}
      {matchedAdjustments.length > 0 && (
        <div className="bg-[#fef3d6]/30 p-3.5 rounded-[4px] border border-[#fae2a0] shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-xs text-[#37352f] flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#d9730d]" />
              <span>所选日期包含的手工调账与冲账记录 ({matchedAdjustments.length} 笔)</span>
            </span>
            <span className="font-mono font-semibold text-xs text-[#37352f]">
              调账合计: {totalAdjustmentSum >= 0 ? `+¥${totalAdjustmentSum}` : `-¥${Math.abs(totalAdjustmentSum)}`}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {matchedAdjustments.map((adj) => (
              <div key={adj.id} className="p-2 bg-white rounded-[2px] border border-[#e6e6e4] flex items-center justify-between shadow-2xs">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-xs text-[#37352f]">{adj.title}</span>
                    <span className="text-[10px] px-1 py-0.2 rounded-[2px] bg-[#f7f7f5] text-[#787774] border border-[#e6e6e4]">
                      {adj.category}
                    </span>
                  </div>
                  {adj.remark && <p className="text-[10px] text-[#787774] mt-0.5">{adj.remark}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-mono font-semibold text-xs ${adj.amount >= 0 ? 'text-[#2b593f]' : 'text-rose-600'}`}>
                    {adj.amount >= 0 ? `+¥${adj.amount}` : `-¥${Math.abs(adj.amount)}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteAdjustment(adj.id, adj.title)}
                    className="text-[#787774] hover:text-rose-600 p-0.5 cursor-pointer rounded-[2px]"
                    title="删除此笔调账"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 核心功能 3：每日订单列表与订单号码明细看板 (含修改与删除) */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white p-4 rounded-[4px] border border-[#e6e6e4] shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-[#efefed] pb-2 flex-wrap gap-2">
          <div>
            <h4 className="font-semibold text-xs text-[#37352f] flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-[#2b593f]" />
              <span>每日订单列表与订单号码流水记录 ({filteredOrderList.length} 笔)</span>
            </h4>
            <p className="text-[11px] text-[#787774]">
              展示精确订单号码、下单时点、菜品明细与实付；支持对报表记录进行自定义修改与作废删除
            </p>
          </div>

          {/* 搜索与就餐渠道筛选 */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-[#787774]" />
              <input
                type="text"
                placeholder="搜索单号 / 顾客 / 菜品..."
                value={orderSearchKeyword}
                onChange={(e) => setOrderSearchKeyword(e.target.value)}
                className="pl-7 pr-2 py-1 text-xs border border-[#e6e6e4] bg-[#f7f7f5] rounded-[2px] focus:outline-hidden focus:border-[#37352f] w-48 text-[#37352f]"
              />
            </div>

            <select
              value={orderChannelFilter}
              onChange={(e) => setOrderChannelFilter(e.target.value)}
              className="px-2 py-1 border border-[#e6e6e4] rounded-[2px] text-xs bg-white text-[#37352f] focus:outline-hidden focus:border-[#37352f]"
            >
              <option value="all">全部就餐渠道</option>
              <option value="dine_in">堂食外摆</option>
              <option value="pickup">到店自提</option>
              <option value="delivery">雷达专送</option>
            </select>
          </div>
        </div>

        {/* 订单明细表格 */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#e6e6e4] bg-[#fafaf8] text-[#787774] text-[11px]">
                <th className="p-2.5 font-semibold">订单号码 (Order ID)</th>
                <th className="p-2.5 font-semibold">下单时间</th>
                <th className="p-2.5 font-semibold">顾客/联系方式</th>
                <th className="p-2.5 font-semibold">已购餐品明细</th>
                <th className="p-2.5 font-semibold">就餐渠道</th>
                <th className="p-2.5 font-semibold">支付方式</th>
                <th className="p-2.5 font-semibold text-right">实付金额</th>
                <th className="p-2.5 font-semibold">状态</th>
                <th className="p-2.5 font-semibold text-center">报表操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#efefed] text-[11px]">
              {filteredOrderList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-[#787774]">
                    <div className="max-w-sm mx-auto space-y-2">
                      <p className="font-medium text-xs text-[#37352f]">所选日期【{targetDateBounds.label}】暂无出单记录</p>
                      <p className="text-[11px] text-[#787774]">您可以手动录入调账/冲账，或一键载入该日示范流水以便进行大屏核算与操作测试。</p>
                      <button
                        type="button"
                        onClick={() => handleSeedOrdersForDate(dateMode === 'specific_day' ? selectedDateStr : getTodayStr())}
                        className="px-3 py-1.5 bg-[#37352f] hover:bg-[#201f1d] text-white rounded-[2px] font-medium text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>一键载入该日示范流水 (12笔典型订单)</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrderList.map((order: any) => {
                  return (
                    <tr key={order.orderNo} className="hover:bg-[#fafaf8] transition-colors">
                      {/* 单号 + 复制 */}
                      <td className="p-2.5 font-mono font-semibold text-[#37352f]">
                        <div className="flex items-center gap-1">
                          <span>{order.orderNo}</span>
                          <button
                            type="button"
                            onClick={() => copyOrderNo(order.orderNo)}
                            className="text-[#787774] hover:text-[#37352f] p-0.5 cursor-pointer rounded-[2px]"
                            title="复制单号"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          {order.isCustomModified && (
                            <span className="px-1 py-0.2 rounded-[2px] text-[9px] bg-[#fef3d6] text-[#d9730d] border border-[#fae2a0] font-normal">
                              已修改
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 时间 */}
                      <td className="p-2.5 font-mono text-[#787774]">
                        {order.createdTime}
                      </td>

                      {/* 顾客 */}
                      <td className="p-2.5">
                        <span className="font-medium text-[#37352f] block">
                          {order.customerName || '散客'}
                        </span>
                        <span className="font-mono text-[10px] text-[#787774]">
                          {order.userPhone || '-'}
                        </span>
                      </td>

                      {/* 菜品 */}
                      <td className="p-2.5 max-w-[220px]">
                        <div className="truncate text-[#787774]" title={order.items.map((i: any) => `${i.name}x${i.quantity}`).join(', ')}>
                          {order.items.map((i: any, idx: number) => (
                            <span key={idx} className="mr-1.5 inline-block">
                              {i.name}<span className="font-semibold text-[#37352f]">×{i.quantity}</span>
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* 渠道 */}
                      <td className="p-2.5">
                        <span
                          className={`px-1.5 py-0.5 rounded-[2px] text-[10px] font-medium ${
                            order.channelType === 'delivery'
                              ? 'bg-[#edf3f8] text-[#1c5598] border border-[#cbe0f2]'
                              : order.channelType === 'dine_in'
                              ? 'bg-[#edf6f1] text-[#2b593f] border border-[#cbe4d7]'
                              : 'bg-[#fef3d6] text-[#d9730d] border border-[#fae2a0]'
                          }`}
                        >
                          {order.channelType === 'delivery'
                            ? '雷达专送'
                            : order.channelType === 'dine_in'
                            ? '堂食外摆'
                            : '到店自提'}
                        </span>
                      </td>

                      {/* 支付方式 */}
                      <td className="p-2.5 text-[#787774]">
                        {order.paymentMethod || '微信支付'}
                      </td>

                      {/* 金额 */}
                      <td className="p-2.5 text-right font-mono font-semibold text-[#2b593f]">
                        ¥{order.totalAmount.toFixed(2)}
                      </td>

                      {/* 状态 */}
                      <td className="p-2.5">
                        <span className="px-1.5 py-0.5 rounded-[2px] bg-[#f7f7f5] border border-[#e6e6e4] text-[#37352f] font-medium text-[10px]">
                          {order.statusText || '已完成'}
                        </span>
                      </td>

                      {/* 操作 (修改/删除) */}
                      <td className="p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditOrder(order)}
                            className="p-1 bg-[#f7f7f5] hover:bg-[#efefed] text-[#37352f] border border-[#e6e6e4] rounded-[2px] cursor-pointer transition-colors shadow-2xs"
                            title="修改本单金额/渠道/备注"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteOrder(order.orderNo, order.totalAmount)}
                            className="p-1 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-[2px] cursor-pointer transition-colors shadow-2xs"
                            title="从大屏报表中作废删除此单"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 模态框 1：修改订单记录弹窗 */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-[4px] border border-[#e6e6e4] shadow-2xs max-w-md w-full p-4 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#efefed] pb-2">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#2b593f]" />
                <h4 className="font-semibold text-sm text-[#37352f]">
                  修改报表订单记录: <span className="font-mono">{editingOrder.orderNo}</span>
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="text-[#787774] hover:text-[#37352f] cursor-pointer rounded-[2px]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveOrderEdit} className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-[#37352f] block mb-1">
                  实收金额 (元)
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={editAmount}
                  onChange={(e) => setEditAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 border border-[#e6e6e4] bg-[#fafaf8] rounded-[2px] font-mono font-semibold text-sm text-[#2b593f] focus:outline-hidden focus:border-[#37352f]"
                />
                <span className="text-[10px] text-[#787774] mt-0.5 block">
                  原实收金额为 ¥{editingOrder.totalAmount.toFixed(2)}，保存前系统将自动生成安全快照备份
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-medium text-[#37352f] block mb-1">就餐渠道</label>
                  <select
                    value={editChannel}
                    onChange={(e) => setEditChannel(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-[#e6e6e4] rounded-[2px] bg-white text-xs text-[#37352f] focus:outline-hidden focus:border-[#37352f]"
                  >
                    <option value="dine_in">堂食外摆</option>
                    <option value="pickup">到店自提</option>
                    <option value="delivery">雷达专送</option>
                  </select>
                </div>

                <div>
                  <label className="font-medium text-[#37352f] block mb-1">支付途径</label>
                  <select
                    value={editPaymentMethod}
                    onChange={(e) => setEditPaymentMethod(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-[#e6e6e4] rounded-[2px] bg-white text-xs text-[#37352f] focus:outline-hidden focus:border-[#37352f]"
                  >
                    <option value="微信支付">微信支付</option>
                    <option value="支付宝">支付宝</option>
                    <option value="会员钱包扣款">会员钱包扣款</option>
                    <option value="现金现结">现金现结</option>
                    <option value="云闪付">云闪付</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-medium text-[#37352f] block mb-1">修改备注 / 冲账说明</label>
                <input
                  type="text"
                  placeholder="例如：店庆特惠折让核减 / 顾客现场菜品调换冲账"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-[#e6e6e4] bg-[#fafaf8] rounded-[2px] text-xs text-[#37352f] focus:outline-hidden focus:border-[#37352f]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#efefed]">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="px-3 py-1.5 bg-[#f7f7f5] hover:bg-[#efefed] text-[#787774] border border-[#e6e6e4] rounded-[2px] font-medium cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#37352f] hover:bg-[#201f1d] text-white rounded-[2px] font-medium cursor-pointer shadow-2xs transition-colors"
                >
                  确认保存并重新核算
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 模态框 2：新增自定义调账/冲账弹窗 */}
      {isAddingAdjustment && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-[4px] border border-[#e6e6e4] shadow-2xs max-w-md w-full p-4 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#efefed] pb-2">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#2b593f]" />
                <h4 className="font-semibold text-sm text-[#37352f]">
                  录入报表自定义调整单 / 手工冲账
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingAdjustment(false)}
                className="text-[#787774] hover:text-[#37352f] cursor-pointer rounded-[2px]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddAdjustmentSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-[#37352f] block mb-1">调整项目名称</label>
                <input
                  type="text"
                  required
                  placeholder="例如：线下团餐微信未入账 / 市集赞助补贴"
                  value={adjTitle}
                  onChange={(e) => setAdjTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-[#e6e6e4] bg-[#fafaf8] rounded-[2px] text-[#37352f] focus:outline-hidden focus:border-[#37352f]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-medium text-[#37352f] block mb-1">
                    调整金额 (正数增加/负数扣减)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    placeholder="如 100 或 -50"
                    value={adjAmount}
                    onChange={(e) => setAdjAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 border border-[#e6e6e4] bg-[#fafaf8] rounded-[2px] font-mono font-semibold text-[#37352f] focus:outline-hidden focus:border-[#37352f]"
                  />
                </div>

                <div>
                  <label className="font-medium text-[#37352f] block mb-1">账目分类</label>
                  <select
                    value={adjCategory}
                    onChange={(e) => setAdjCategory(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 border border-[#e6e6e4] rounded-[2px] bg-white text-[#37352f] focus:outline-hidden focus:border-[#37352f]"
                  >
                    <option value="线下手工补录">线下手工补录</option>
                    <option value="活动补贴">活动补贴</option>
                    <option value="线上平台差额">线上平台差额</option>
                    <option value="现金账目修正">现金账目修正</option>
                    <option value="食材物料损耗扣减">食材物料损耗扣减</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-medium text-[#37352f] block mb-1">详细原因备注</label>
                <input
                  type="text"
                  placeholder="说明调账依据及经办人"
                  value={adjRemark}
                  onChange={(e) => setAdjRemark(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-[#e6e6e4] bg-[#fafaf8] rounded-[2px] text-[#37352f] focus:outline-hidden focus:border-[#37352f]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#efefed]">
                <button
                  type="button"
                  onClick={() => setIsAddingAdjustment(false)}
                  className="px-3 py-1.5 bg-[#f7f7f5] hover:bg-[#efefed] text-[#787774] border border-[#e6e6e4] rounded-[2px] font-medium cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#37352f] hover:bg-[#201f1d] text-white rounded-[2px] font-medium cursor-pointer shadow-2xs transition-colors"
                >
                  录入并计入大屏
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
