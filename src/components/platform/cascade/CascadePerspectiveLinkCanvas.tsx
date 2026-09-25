import React, { useEffect, useState, useRef, useCallback } from 'react';

interface Point {
  x: number;
  y: number;
}

interface NodeAnchors {
  id: string;
  left: Point;
  right: Point;
  top: Point;
  bottom: Point;
  center: Point;
  visible: boolean;
}

interface SegmentPath {
  path: string;
  startPoint: Point;
  endPoint: Point;
  fromId: string;
  toId: string;
  type: 'l1-l2' | 'l2-l3' | 'l3-l4';
}

interface CascadePerspectiveLinkCanvasProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  selectedDistrictId: string;
  selectedDirectorId: string;
  selectedTruckId: string;
  selectedRiderId: string;
  isEnabled?: boolean;
}

export const CascadePerspectiveLinkCanvas: React.FC<CascadePerspectiveLinkCanvasProps> = ({
  containerRef,
  selectedDistrictId,
  selectedDirectorId,
  selectedTruckId,
  selectedRiderId,
  isEnabled = true
}) => {
  const [segments, setSegments] = useState<SegmentPath[]>([]);
  const [anchorPoints, setAnchorPoints] = useState<Point[]>([]);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const animFrameRef = useRef<number | null>(null);

  // 计算节点锚点函数
  const calculateLinks = useCallback(() => {
    const container = containerRef.current;
    if (!container || !isEnabled) {
      setSegments([]);
      setAnchorPoints([]);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    setContainerSize({
      width: containerRect.width,
      height: containerRect.height
    });

    const nodeIds = [
      { id: selectedDistrictId, level: 1 },
      { id: selectedDirectorId, level: 2 },
      { id: selectedTruckId, level: 3 },
      { id: selectedRiderId, level: 4 }
    ];

    const anchors: (NodeAnchors | null)[] = nodeIds.map(({ id }) => {
      // 通过 cascade-col-node-{id} 寻找 DOM 元素
      const el = document.getElementById(`cascade-col-node-${id}`);
      if (!el) return null;

      const rect = el.getBoundingClientRect();
      // 计算相对于 container 的位置
      const relTop = rect.top - containerRect.top;
      const relBottom = rect.bottom - containerRect.top;
      const relLeft = rect.left - containerRect.left;
      const relRight = rect.right - containerRect.left;

      return {
        id,
        left: { x: relLeft, y: relTop + rect.height / 2 },
        right: { x: relRight, y: relTop + rect.height / 2 },
        top: { x: relLeft + rect.width / 2, y: relTop },
        bottom: { x: relLeft + rect.width / 2, y: relBottom },
        center: { x: relLeft + rect.width / 2, y: relTop + rect.height / 2 },
        visible: relBottom > 0 && relTop < containerRect.height
      };
    });

    const newSegments: SegmentPath[] = [];
    const newAnchors: Point[] = [];

    // 计算 L1 -> L2, L2 -> L3, L3 -> L4 三段贝塞尔钢笔连线
    for (let i = 0; i < 3; i++) {
      const source = anchors[i];
      const target = anchors[i + 1];

      if (!source || !target) continue;

      let startP: Point;
      let endP: Point;
      let pathString = '';

      // 判断布局模式：横向并排还是纵向堆叠
      const isHorizontal = target.left.x > source.right.x - 20;

      if (isHorizontal) {
        // 横向贝塞尔：从 source 的右侧连接到 target 的左侧
        startP = { x: source.right.x - 1, y: source.right.y };
        endP = { x: target.left.x + 1, y: target.left.y };

        const deltaX = endP.x - startP.x;
        // 钢笔张力曲率计算
        const curvature = Math.max(35, Math.min(100, deltaX * 0.52));

        const cp1 = { x: startP.x + curvature, y: startP.y };
        const cp2 = { x: endP.x - curvature, y: endP.y };

        pathString = `M ${startP.x.toFixed(1)} ${startP.y.toFixed(1)} C ${cp1.x.toFixed(1)} ${cp1.y.toFixed(1)}, ${cp2.x.toFixed(1)} ${cp2.y.toFixed(1)}, ${endP.x.toFixed(1)} ${endP.y.toFixed(1)}`;
      } else {
        // 纵向贝塞尔（移动端单列或多行折叠）
        startP = { x: source.bottom.x, y: source.bottom.y - 1 };
        endP = { x: target.top.x, y: target.top.y + 1 };

        const deltaY = endP.y - startP.y;
        const curvature = Math.max(25, Math.min(70, Math.abs(deltaY) * 0.5));

        const cp1 = { x: startP.x, y: startP.y + curvature };
        const cp2 = { x: endP.x, y: endP.y - curvature };

        pathString = `M ${startP.x.toFixed(1)} ${startP.y.toFixed(1)} C ${cp1.x.toFixed(1)} ${cp1.y.toFixed(1)}, ${cp2.x.toFixed(1)} ${cp2.y.toFixed(1)}, ${endP.x.toFixed(1)} ${endP.y.toFixed(1)}`;
      }

      const types: ('l1-l2' | 'l2-l3' | 'l3-l4')[] = ['l1-l2', 'l2-l3', 'l3-l4'];
      newSegments.push({
        path: pathString,
        startPoint: startP,
        endPoint: endP,
        fromId: source.id,
        toId: target.id,
        type: types[i]
      });

      if (i === 0) newAnchors.push(startP);
      newAnchors.push(endP);
    }

    setSegments(newSegments);
    setAnchorPoints(newAnchors);
  }, [
    containerRef,
    selectedDistrictId,
    selectedDirectorId,
    selectedTruckId,
    selectedRiderId,
    isEnabled
  ]);

  // 调度更新，避免过于频繁重绘
  const scheduleUpdate = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    animFrameRef.current = requestAnimationFrame(() => {
      calculateLinks();
    });
  }, [calculateLinks]);

  useEffect(() => {
    scheduleUpdate();

    const container = containerRef.current;
    if (!container) return;

    // 监听窗口缩放与容器大小变动
    const resizeObserver = new ResizeObserver(() => {
      scheduleUpdate();
    });
    resizeObserver.observe(container);

    // 监听各列内部可滚动列表的滚动事件
    const scrollContainers = container.querySelectorAll('.overflow-y-auto');
    scrollContainers.forEach((el) => {
      el.addEventListener('scroll', scheduleUpdate, { passive: true });
    });

    window.addEventListener('resize', scheduleUpdate);

    // 延迟 100ms 再次触发，确保样式动画和展开完成后位置稳固
    const timer = setTimeout(scheduleUpdate, 120);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      clearTimeout(timer);
      resizeObserver.disconnect();
      scrollContainers.forEach((el) => {
        el.removeEventListener('scroll', scheduleUpdate);
      });
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, [scheduleUpdate, containerRef]);

  if (!isEnabled || segments.length === 0 || containerSize.width === 0) {
    return null;
  }

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible"
      style={{ width: containerSize.width || '100%', height: containerSize.height || '100%' }}
    >
      <defs>
        {/* 透视高斯模糊发光滤镜 */}
        <filter id="cascade-pen-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* 软阴影滤镜 */}
        <filter id="cascade-pen-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2.5" stdDeviation="3" floodColor="#000000" floodOpacity="0.18" />
        </filter>

        {/* L1 -> L2 渐变 (曜石黑 -> 科技蓝) */}
        <linearGradient id="grad-l1-l2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1a1a17" />
          <stop offset="60%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>

        {/* L2 -> L3 渐变 (科技蓝 -> 活力炙烤橙) */}
        <linearGradient id="grad-l2-l3" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="50%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>

        {/* L3 -> L4 渐变 (活力橙 -> 极速翡翠绿) */}
        <linearGradient id="grad-l3-l4" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ea580c" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>

        {/* 脉冲光流粒子标记 */}
        <linearGradient id="pulse-beam" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* 1. 底层透视悬浮阴影轨迹 (Soft Depth Cast) */}
      <g filter="url(#cascade-pen-shadow)">
        {segments.map((seg, idx) => (
          <path
            key={`shadow-${idx}`}
            d={seg.path}
            fill="none"
            stroke="#1a1a17"
            strokeWidth="5"
            strokeOpacity="0.08"
            strokeLinecap="round"
          />
        ))}
      </g>

      {/* 2. 外部透视发光光晕层 (Outer Neon Glow Halo) */}
      <g filter="url(#cascade-pen-glow)">
        {segments.map((seg, idx) => {
          const strokeUrl =
            seg.type === 'l1-l2'
              ? 'url(#grad-l1-l2)'
              : seg.type === 'l2-l3'
              ? 'url(#grad-l2-l3)'
              : 'url(#grad-l3-l4)';
          return (
            <path
              key={`glow-${idx}`}
              d={seg.path}
              fill="none"
              stroke={strokeUrl}
              strokeWidth="5"
              strokeOpacity="0.32"
              strokeLinecap="round"
            />
          );
        })}
      </g>

      {/* 3. 核心钢笔实线层 (Core Precision Pen Vector Line) */}
      <g>
        {segments.map((seg, idx) => {
          const strokeUrl =
            seg.type === 'l1-l2'
              ? 'url(#grad-l1-l2)'
              : seg.type === 'l2-l3'
              ? 'url(#grad-l2-l3)'
              : 'url(#grad-l3-l4)';
          return (
            <path
              key={`core-${idx}`}
              d={seg.path}
              fill="none"
              stroke={strokeUrl}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
      </g>

      {/* 4. 实时 10Hz MESH 神经脉冲流光虚线 (Animated Dash Tracer) */}
      <g>
        {segments.map((seg, idx) => (
          <path
            key={`flow-${idx}`}
            d={seg.path}
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.8"
            strokeDasharray="6 14"
            strokeOpacity="0.9"
            strokeLinecap="round"
            className="animate-pen-link-dash"
          />
        ))}
      </g>

      {/* 5. 各节点雷达接驳锚点 (Precision Radar Anchor Rings) */}
      {anchorPoints.map((pt, idx) => {
        // 分别对应 L1 (曜石黑), L2 (指挥蓝), L3 (炙烤橙), L4 (翡翠绿)
        const colors = ['#1a1a17', '#2563eb', '#ea580c', '#059669'];
        const color = colors[idx] || '#2563eb';

        return (
          <g key={`anchor-${idx}`} transform={`translate(${pt.x}, ${pt.y})`}>
            {/* 外圈微波脉冲环 */}
            <circle
              r="7"
              fill="none"
              stroke={color}
              strokeWidth="1.2"
              strokeOpacity="0.4"
              className="animate-ping"
              style={{ transformOrigin: 'center' }}
            />
            {/* 静态高光环 */}
            <circle
              r="4.5"
              fill="#ffffff"
              stroke={color}
              strokeWidth="2"
              filter="url(#cascade-pen-shadow)"
            />
            {/* 内核发光点 */}
            <circle r="2" fill={color} />
          </g>
        );
      })}
    </svg>
  );
};
