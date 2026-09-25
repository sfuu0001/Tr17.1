import React from 'react';
import {
  LayoutGrid,
  List,
  LayoutDashboard,
  CloudUpload,
  Images,
  Zap,
  Ban,
  SlidersHorizontal,
  Plus,
  QrCode,
  type LucideIcon
} from 'lucide-react';
import {
  ChannelTelemetry,
  ConsoleViewMode,
  TONE_CLASS,
  ConsoleTone
} from './consoleTokens';

/* ============================================================================
 * ① TOP OPERATIONAL DECK — 顶层运营甲板
 * ----------------------------------------------------------------------------
 * 结构（与参考稿 section 1 逐像素对齐）：
 *   a. 标题块：菜品运营控制台 + LIVE 脉冲 + 版本徽标 + SYS_REF 遥测
 *   b. 实时遥测胶囊组：TOTAL ITEMS / ACTIVE CHANNELS / DEPLETED(CRITICAL)
 *   c. 快速工具动作条：三端视图切换组 + 6 个战术动作按钮
 * 三端：xl 起标题与胶囊同排；xl 以下纵向堆叠，动作条整体换行不溢出。
 * ========================================================================== */

interface TelemetryPillProps {
  icon: LucideIcon;
  label: string;
  value: string;
  suffix?: string;
  tone: ConsoleTone;
}

const TelemetryPill: React.FC<TelemetryPillProps> = ({ icon: Icon, label, value, suffix, tone }) => {
  const shell =
    tone === 'olive'
      ? 'bg-signal-live-surface border-signal-live-border-strong'
      : tone === 'terracotta'
      ? 'bg-signal-critical-surface border-signal-critical-border'
      : 'bg-card-bg border-border-main';

  const iconColor =
    tone === 'olive'
      ? 'text-signal-live'
      : tone === 'terracotta'
      ? 'text-signal-critical'
      : 'text-slate-blue';

  const labelColor =
    tone === 'olive'
      ? 'text-signal-live-strong'
      : tone === 'terracotta'
      ? 'text-signal-critical-strong'
      : 'text-text-muted';

  const valueColor =
    tone === 'olive'
      ? 'text-signal-live-text'
      : tone === 'terracotta'
      ? 'text-signal-critical-text'
      : 'text-text-prominent';

  return (
    <div className={`flex items-center gap-2 px-space-md py-1.5 border rounded-console ${shell}`}>
      <Icon className={`w-3.5 h-3.5 shrink-0 ${iconColor}`} strokeWidth={2} />
      <div className="flex flex-col leading-none">
        <span className={`font-label-micro uppercase font-bold tracking-wider ${labelColor}`}>{label}</span>
        <span className={`font-label-md font-bold mt-0.5 ${valueColor}`}>
          {value}
          {suffix && <span className="font-label-micro font-normal text-text-muted ml-1">{suffix}</span>}
        </span>
      </div>
    </div>
  );
};

interface DeckIconButtonProps {
  icon: LucideIcon;
  title: string;
  onClick: () => void;
  variant?: 'neutral' | 'blue' | 'olive' | 'terracotta' | 'accent';
  disabled?: boolean;
  spinning?: boolean;
}

const DeckIconButton: React.FC<DeckIconButtonProps> = ({
  icon: Icon,
  title,
  onClick,
  variant = 'neutral',
  disabled,
  spinning
}) => {
  const variants: Record<string, string> = {
    neutral: 'bg-card-bg border-border-main text-text-secondary hover:bg-page-bg',
    blue: 'bg-card-bg border-border-main text-slate-blue hover:bg-slate-blue-bg',
    olive: 'bg-card-bg border-status-olive-border text-status-olive hover:bg-status-olive-bg',
    terracotta:
      'bg-card-bg border-status-terracotta-border text-status-terracotta hover:bg-status-terracotta-bg',
    accent: 'bg-dark-container border-transparent text-accent-orange hover:bg-dark-container-hover shadow-console-1'
  };

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center w-8 h-8 rounded-console border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]}`}
    >
      <Icon className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`} strokeWidth={1.9} />
    </button>
  );
};

interface ViewToggleProps {
  viewMode: ConsoleViewMode;
  setViewMode: (mode: ConsoleViewMode) => void;
}

const ViewToggleGroup: React.FC<ViewToggleProps> = ({ viewMode, setViewMode }) => {
  const options: Array<{ mode: ConsoleViewMode; icon: LucideIcon; label: string }> = [
    { mode: 'auto', icon: LayoutGrid, label: '自适应视图' },
    { mode: 'table', icon: List, label: '表格视图' },
    { mode: 'card', icon: LayoutDashboard, label: '卡片拓扑视图' }
  ];

  return (
    <div className="flex items-center gap-0.5 bg-card-bg p-0.5 rounded-console border border-border-main">
      {options.map(({ mode, icon: Icon, label }) => {
        const isActive = viewMode === mode;
        return (
          <button
            key={mode}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={isActive}
            onClick={() => setViewMode(mode)}
            className={`flex items-center justify-center w-7 h-7 rounded-console transition-all cursor-pointer ${
              isActive
                ? 'bg-dark-container text-white shadow-console-1'
                : 'text-text-secondary hover:text-text-prominent hover:bg-page-bg'
            }`}
          >
            <Icon className="w-4 h-4" strokeWidth={1.9} />
          </button>
        );
      })}
    </div>
  );
};

export interface ConsoleTopDeckProps {
  telemetry: ChannelTelemetry;
  viewMode: ConsoleViewMode;
  setViewMode: (mode: ConsoleViewMode) => void;
  isSyncingCloud: boolean;
  onSyncAllDishesToCloud: () => void;
  onRematchImages: () => void;
  onBulkAllInStock: () => void;
  onBulkAllSoldOut: () => void;
  onOpenBatchModal: () => void;
  onOpenAddModal: () => void;
  onOpenComboQrModal?: () => void;
}

export const ConsoleTopDeck: React.FC<ConsoleTopDeckProps> = ({
  telemetry,
  viewMode,
  setViewMode,
  isSyncingCloud,
  onSyncAllDishesToCloud,
  onRematchImages,
  onBulkAllInStock,
  onBulkAllSoldOut,
  onOpenBatchModal,
  onOpenAddModal,
  onOpenComboQrModal
}) => {
  return (
    <section className="w-full bg-card-bg px-space-md sm:px-space-lg py-space-md border-b border-border-main">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-space-md">
        {/* a. 标题块 */}
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-space-sm flex-wrap">
            <h1 className="font-headline-lg-mobile lg:font-headline-lg text-text-prominent uppercase tracking-tight font-bold">
              菜品运营控制台
            </h1>
            <div className="flex items-center gap-1.5 px-2 py-0.5 border rounded-console bg-signal-live-surface border-signal-live-border">
              <span className="w-2 h-2 rounded-full animate-pulse bg-signal-live" />
              <span className="font-label-micro uppercase font-bold tracking-wider text-signal-live-text">LIVE</span>
            </div>
            <span className="font-label-micro px-1.5 py-0.5 rounded-console bg-page-bg border border-border-main text-text-secondary uppercase">
              v4.8.2-PROD
            </span>
            <span className="font-label-micro text-text-muted uppercase hidden sm:inline">
              SYS_REF: SZ04-DECK-CORE
            </span>
          </div>
          <p className="font-label-sm text-text-body tracking-normal">
            全渠道菜单定价、味型工艺参数、多端在售监控控制面板 · FLEET RTK SYNC ACTIVE // NODE-SZ04
          </p>
        </div>

        {/* b. 实时遥测胶囊组 */}
        <div className="flex items-center gap-space-sm flex-wrap">
          <TelemetryPill
            icon={LayoutGrid}
            label="TOTAL ITEMS"
            value={String(telemetry.total)}
            suffix="/ 9 类目"
            tone="neutral"
          />
          <TelemetryPill
            icon={Zap}
            label="ACTIVE CHANNELS"
            value={`${telemetry.active} 项`}
            suffix={`(${telemetry.activePercent}% 双通)`}
            tone="olive"
          />
          <TelemetryPill
            icon={Ban}
            label="DEPLETED (CRITICAL)"
            value={`${String(telemetry.depleted).padStart(2, '0')} 项`}
            suffix="需即刻补库"
            tone="terracotta"
          />
        </div>
      </div>

      {/* c. 快速工具动作条 */}
      <div className="mt-space-md pt-space-sm flex flex-wrap items-center justify-between gap-space-sm bg-page-bg border border-border-main p-space-xs rounded-console">
        <ViewToggleGroup viewMode={viewMode} setViewMode={setViewMode} />

        <div className="flex items-center gap-2 flex-wrap">
          <DeckIconButton
            icon={CloudUpload}
            title="同步到云端"
            variant="blue"
            onClick={onSyncAllDishesToCloud}
            disabled={isSyncingCloud}
            spinning={isSyncingCloud}
          />
          <DeckIconButton icon={Images} title="重匹配图片" variant="blue" onClick={onRematchImages} />
          <DeckIconButton icon={Zap} title="一键全上架" variant="olive" onClick={onBulkAllInStock} />
          <DeckIconButton icon={Ban} title="一键全沽清" variant="terracotta" onClick={onBulkAllSoldOut} />
          <DeckIconButton icon={SlidersHorizontal} title="批量操作" onClick={onOpenBatchModal} />
          {onOpenComboQrModal && (
            <DeckIconButton
              icon={QrCode}
              title="配置套餐·单码多点二维码"
              variant="blue"
              onClick={onOpenComboQrModal}
            />
          )}
          <DeckIconButton icon={Plus} title="新建菜品" variant="accent" onClick={onOpenAddModal} />
        </div>
      </div>
    </section>
  );
};

export default ConsoleTopDeck;
