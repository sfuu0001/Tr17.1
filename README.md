# 极速配送追踪 - Urban Radar（组件化版本）

将「流动餐车 GPS 极速专送」实时订单追踪界面封装为**可复用的 React 组件**，支持通过 props 注入业务数据；不传数据时自动回退到内置示例数据，开箱即用。

## 快速开始

```bash
npm install
npm run dev        # 本地演示页（http://localhost:3000）
npm run build      # 生产构建
npm run lint       # TypeScript 类型检查
```

## 使用方式

### 1. 整页组件（推荐）

将整个配送追踪界面作为单个组件嵌入任意 React 页面：

```tsx
import { DeliveryTracking } from './src';              // 或默认导入
// import DeliveryTracking from './src';

function MyPage() {
  return <DeliveryTracking />;   // 全部使用内置示例数据
}
```

### 2. 注入真实业务数据

所有数据均可通过 props 覆盖，未提供的字段自动回退到示例数据：

```tsx
import DeliveryTracking from './src';
import type { CourierInfo } from './src';

const courier: CourierInfo = {
  name: 'Wang Wu',
  chineseName: '王五',
  tag: '钻石专送',
  rating: 4.99,
  completedOrders: 2300,
  sanitized: true,
  phone: '139-0000-0000',
  avatarText: 'WW',
};

function OrderTrackPage() {
  return (
    <DeliveryTracking
      courier={courier}
      orderData={{ orderId: 'DEL-2026', progressPercent: 40, currentSpeedKmh: 28 }}
      timelineSteps={mySteps}
      orderItems={myItems}
      totalAmount={88.5}
    />
  );
}
```

### 3. 按需使用子组件

库入口同时导出 8 个独立子组件，可自由组合：

```tsx
import { OrderHeader, MapRadarView, TimelineSteps, OrderSummaryDrawer } from './src';
```

| 组件 | 说明 |
| --- | --- |
| `OrderHeader` | 订单头部：订单号 / 状态 / ETA 深色卡片 |
| `MapRadarView` | 地图雷达视图：SVG 路线 + 骑手位置动画 + 配送模拟控制 |
| `CourierCard` | 骑手信息卡：评分 / 在线联系 / 电话联系（含聊天弹窗） |
| `CourierChatModal` | 骑手即时聊天弹窗：文本 / 图片 / 订单卡片消息 |
| `RouteLocationCard` | 出发地 → 目的地路线卡片 |
| `TimelineSteps` | 5 步流转时间线（下单 / 备餐 / 接单 / 配送 / 送达） |
| `OrderSummaryDrawer` | 餐品明细抽屉：清单 / 费用明细 / 复制 |
| `LogisticsDetailModal` | 物流流转日志弹窗：GPS 时间线 + 保障卡 |

## Props 一览

```ts
interface DeliveryTrackingProps {
  orderData?: Partial<OrderData>;          // 订单数据（进度 / 速度 / 剩余距离等）
  courier?: Partial<CourierInfo>;          // 骑手信息
  store?: Partial<StoreLocation>;          // 出发门店
  destination?: Partial<DestinationLocation>; // 收货地址
  timelineSteps?: TimelineStepItem[];      // 时间线节点（5 个）
  orderItems?: OrderItem[];                // 餐品明细
  logisticsLogs?: LogisticsLogItem[];      // 物流日志
  totalAmount?: number;                    // 实付金额，默认 145.00
  className?: string;                      // 附加容器样式
}
```

## 技术栈与前置条件

- **React 19**（`react` / `react-dom` 为 peer 依赖）
- **Vite 6** + **TypeScript**
- **Tailwind CSS 4**（`@tailwindcss/vite` 插件）—— 宿主项目需启用 Tailwind，组件内样式位于 `src/index.css`
- **lucide-react**（图标）

## 目录结构

```
src/
├── DeliveryTracking.tsx   # ★ 主组件：整页可复用配送追踪界面
├── App.tsx                # demo 页别名（= DeliveryTracking）
├── index.ts               # ★ 组件库统一导出入口
├── main.tsx               # demo 渲染入口
├── index.css              # Tailwind + 地图网格等全局样式
├── types.ts               # 全部 TypeScript 类型
├── data/mockData.ts       # 内置示例数据
└── components/            # 8 个可独立使用的子组件
```

## 与原项目的关系

本目录是 `Downloads/极速配送追踪---urban-radar` 的组件化副本，原项目未被改动。核心差异：

1. 新增 `src/DeliveryTracking.tsx` —— 原 `App.tsx` 的页面逻辑迁移至此并组件化；
2. 新增 `src/index.ts` —— 统一导出入口；
3. 新增 props 数据注入与默认回退机制；
4. 其余子组件、类型、mock 数据均保持原样。
