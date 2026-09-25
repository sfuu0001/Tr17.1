import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Flame,
  UtensilsCrossed,
  Tag,
  Eye,
  RotateCcw,
  Save,
  Plus,
  Trash2,
  Check,
  Clock,
  SlidersHorizontal,
  Info,
  ShieldCheck,
  Layers,
  Image as ImageIcon,
  CheckCircle2,
  X
} from 'lucide-react';
import {
  CategoryBrandModalConfig,
  CategoryBrandTriggerMode,
  DEFAULT_CATEGORY_BRAND_CONFIGS,
  getCategoryBrandConfigs,
  saveCategoryBrandConfigs,
  resetAllCategorySeenRecords,
  resetSingleCategorySeenRecord,
  CATEGORY_BRAND_STORAGE_KEY
} from '../../utils/categoryBrandSettings';
import { softDeleteToRecycleBin } from '../../utils/recycleBinEngine';
import { CategoryBrandModal } from '../CategoryBrandModal';

interface MerchantCategoryBrandSettingsProps {
  showToast: (msg: string) => void;
}

const PRESET_COVER_IMAGES = [
  { label: '炭火慢烤串串', url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80' },
  { label: '备长炭日式烧鸟', url: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800&auto=format&fit=crop&q=80' },
  { label: '黄金芝士焗烤', url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80' },
  { label: '谷饲西式原切牛排', url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80' },
  { label: '大火锅气暖心主食', url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&auto=format&fit=crop&q=80' },
  { label: '清爽冷萃特调饮品', url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&auto=format&fit=crop&q=80' },
  { label: '金黄香酥深夜小吃', url: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&auto=format&fit=crop&q=80' }
];

export const MerchantCategoryBrandSettings: React.FC<MerchantCategoryBrandSettingsProps> = ({ showToast }) => {
  const [configs, setConfigs] = useState<Record<string, CategoryBrandModalConfig>>(() => getCategoryBrandConfigs());
  const [selectedCatId, setSelectedCatId] = useState<string>('skewers');
  const [previewConfig, setPreviewConfig] = useState<CategoryBrandModalConfig | null>(null);
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatKey, setNewCatKey] = useState('');
  const [newTagInput, setNewTagInput] = useState('');
  const [newDishInput, setNewDishInput] = useState('');

  const currentConfig = configs[selectedCatId] || configs.skewers;

  const updateCurrentConfig = (updates: Partial<CategoryBrandModalConfig>) => {
    setConfigs((prev) => {
      const updated = {
        ...prev,
        [selectedCatId]: {
          ...prev[selectedCatId],
          ...updates,
          updatedAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        }
      };
      return updated;
    });
  };

  const handleSaveAll = () => {
    saveCategoryBrandConfigs(configs);
    showToast('分类品牌弹窗配置已成功保存并全端生效！');
  };

  const handleResetToDefault = () => {
    if (confirm('确认将当前分类品牌弹窗重置为官方推荐出厂配置？')) {
      setConfigs(DEFAULT_CATEGORY_BRAND_CONFIGS);
      saveCategoryBrandConfigs(DEFAULT_CATEGORY_BRAND_CONFIGS);
      showToast('已恢复官方默认分类品牌弹窗配置！');
    }
  };

  const handleCreateCustomCategory = () => {
    if (!newCatName.trim()) {
      showToast('请输入大类名称');
      return;
    }
    const safeKey = newCatKey.trim() || `custom_${Date.now()}`;
    if (configs[safeKey]) {
      showToast('该大类识别代码已存在');
      return;
    }

    const newConfig: CategoryBrandModalConfig = {
      categoryId: safeKey,
      categoryName: newCatName.trim(),
      categoryEnName: 'Custom Category',
      categoryIcon: '✨',
      enabled: true,
      triggerMode: 'first_time_only',
      brandTitle: `黑曜石 · ${newCatName.trim()}精选`,
      brandSubtitle: '严选优质食材 · 匠心烹调现做现出',
      badgeText: '✨ 甄选新品',
      coverImageUrl: PRESET_COVER_IMAGES[0].url,
      craftHighlights: ['严选好料', '现点现做', '独家风味', '锁鲜直供'],
      storyDescription: `黑曜石餐车为您倾心呈现全新${newCatName.trim()}系列！精选上乘食材与秘制调配工艺，为您带来舌尖上的美妙享受。`,
      couponText: `${newCatName.trim()}专区满¥30立减¥5`,
      featuredDishNames: [],
      buttonText: `开始选购${newCatName.trim()}`,
      autoCloseSeconds: 0,
      accentColor: 'orange',
      isCustom: true,
      updatedAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    };

    const updated = { ...configs, [safeKey]: newConfig };
    setConfigs(updated);
    saveCategoryBrandConfigs(updated);
    setSelectedCatId(safeKey);
    setIsAddingNewCategory(false);
    setNewCatName('');
    setNewCatKey('');
    showToast(`已成功新增【${newCatName.trim()}】大类品牌弹窗！`);
  };

  const handleDeleteCustomCategory = (key: string) => {
    if (confirm(`确认删除【${configs[key]?.categoryName || key}】大类品牌弹窗配置？`)) {
      // 统一回收站：软删除入站（30 天保留，可恢复）
      softDeleteToRecycleBin({
        type: 'category_brand',
        typeLabel: '大类品牌配置',
        refId: key,
        label: configs[key]?.categoryName || key,
        snapshot: configs[key],
        storageKey: CATEGORY_BRAND_STORAGE_KEY,
        container: 'map',
        idField: 'key'
      });
      const next = { ...configs };
      delete next[key];
      setConfigs(next);
      saveCategoryBrandConfigs(next);
      setSelectedCatId('skewers');
      showToast('已删除该自建大类配置（可在回收站恢复）');
    }
  };

  const handleAddCraftTag = () => {
    if (!newTagInput.trim()) return;
    const currentTags = currentConfig.craftHighlights || [];
    if (!currentTags.includes(newTagInput.trim())) {
      updateCurrentConfig({
        craftHighlights: [...currentTags, newTagInput.trim()]
      });
    }
    setNewTagInput('');
  };

  const handleRemoveCraftTag = (index: number) => {
    const nextTags = [...(currentConfig.craftHighlights || [])];
    nextTags.splice(index, 1);
    updateCurrentConfig({ craftHighlights: nextTags });
  };

  const handleAddFeaturedDish = () => {
    if (!newDishInput.trim()) return;
    const currentDishes = currentConfig.featuredDishNames || [];
    if (!currentDishes.includes(newDishInput.trim())) {
      updateCurrentConfig({
        featuredDishNames: [...currentDishes, newDishInput.trim()]
      });
    }
    setNewDishInput('');
  };

  const handleRemoveFeaturedDish = (index: number) => {
    const nextDishes = [...(currentConfig.featuredDishNames || [])];
    nextDishes.splice(index, 1);
    updateCurrentConfig({ featuredDishNames: nextDishes });
  };

  return (
    <div className="space-y-2.5">
      {/* Top Banner with Guide */}
      <div className="bg-white rounded-[2px] p-3 border border-[#e6e6e4] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-6 h-6 rounded-[2px] bg-[#fbfbfa] border border-[#e6e6e4] text-[#787774] flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <h2 className="text-xs font-medium text-[#0f172a] tracking-tight whitespace-nowrap">
              分类品牌弹窗与类目故事管理中枢
            </h2>
            <span className="text-[10px] font-medium bg-[#f1f1ef] text-[#787774] border border-[#e6e6e4] px-1.5 py-0.5 rounded-[2px] whitespace-nowrap">
              三大核心品类 + 自定义大类
            </span>
          </div>
          <p className="text-[11px] text-[#787774] max-w-2xl leading-relaxed">
            管理顾客在客户端切换分类时展示的品牌故事、专属工艺标准及限时优惠。支持设置第一次切换弹出、每次重复切换弹出或每日首次弹出防打扰策略。
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => {
              resetAllCategorySeenRecords();
              showToast('已重置所有分类的顾客查看记录，刷新客户端或切换分类将重新触发弹窗！');
            }}
            className="px-2.5 py-1.5 bg-[#fbfbfa] hover:bg-[#f1f1ef] text-[#787774] text-xs font-medium rounded-[2px] border border-[#e6e6e4] transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
            title="清除本地浏览缓存记录以便快速测试"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
            <span>重置顾客已读记录</span>
          </button>
          <button
            type="button"
            onClick={() => setPreviewConfig(currentConfig)}
            className="px-2.5 py-1.5 bg-[#fbfbfa] hover:bg-[#f1f1ef] text-[#0f172a] text-xs font-medium rounded-[2px] border border-[#e6e6e4] transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
          >
            <Eye className="w-3.5 h-3.5 text-[#787774]" />
            <span>预览当前分类弹窗</span>
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            className="px-3 py-1.5 bg-[#0f172a] hover:bg-neutral-800 text-white text-xs font-medium rounded-[2px] transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>保存全部分类设置</span>
          </button>
        </div>
      </div>

      {/* Category Tabs Switcher */}
      <div className="bg-white rounded-[2px] p-2.5 border border-[#e6e6e4] space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-[#787774] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#787774]" />
            <span>选择要配置的大类分类:</span>
          </div>
          <button
            type="button"
            onClick={() => setIsAddingNewCategory(true)}
            className="text-xs font-medium text-sky-700 hover:text-sky-800 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新增自定义大类品牌弹窗</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {Object.values(configs).map((cfg) => {
            const isSelected = selectedCatId === cfg.categoryId;
            const isEnabled = cfg.enabled && cfg.triggerMode !== 'disabled';
            return (
              <button
                key={cfg.categoryId}
                type="button"
                onClick={() => setSelectedCatId(cfg.categoryId)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 cursor-pointer bg-white border ${
                  isSelected
                    ? 'border-zinc-900 text-zinc-900 font-semibold shadow-2xs'
                    : 'border-[#e6e6e4] text-[#5a5854] hover:text-zinc-900 hover:border-zinc-300 hover:bg-slate-50'
                }`}
              >
                <span>{cfg.categoryIcon || '✨'}</span>
                <span>{cfg.categoryName}</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isEnabled ? 'bg-emerald-500' : 'bg-neutral-300'
                  }`}
                  title={isEnabled ? '已启用品牌弹窗' : '已停用'}
                />
                {cfg.isCustom && (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-[#f1f1ef] text-[#787774] border border-[#e6e6e4]">
                    自建
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Adding Custom Category Dialog Box */}
      {isAddingNewCategory && (
        <div className="bg-[#fbfbfa] border border-[#e6e6e4] rounded-[2px] p-3 space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#f1f1ef]">
            <div className="text-xs font-medium text-[#0f172a] flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-[#787774]" />
              <span>新增自定义大类品牌弹窗配置</span>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingNewCategory(false)}
              className="text-[#787774] hover:text-[#0f172a] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-medium text-[#787774] block mb-1">大类显示名称 (如: 特调清补凉 / 川香卤味)</label>
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="例如: 现熬热汤 / 精酿啤酒"
                className="w-full text-xs px-2.5 py-1.5 bg-white rounded-[2px] border border-[#e6e6e4] text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-[#787774] block mb-1">大类英文标识码 (唯一编码，可选填)</label>
              <input
                type="text"
                value={newCatKey}
                onChange={(e) => setNewCatKey(e.target.value)}
                placeholder="例如: soups / craft_beer (不填自动生成)"
                className="w-full text-xs px-2.5 py-1.5 bg-white rounded-[2px] border border-[#e6e6e4] font-mono text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1 border-t border-[#f1f1ef]">
            <button
              type="button"
              onClick={() => setIsAddingNewCategory(false)}
              className="px-3 py-1.5 rounded-[2px] text-xs font-medium bg-white text-[#787774] border border-[#e6e6e4] hover:bg-[#f1f1ef] cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleCreateCustomCategory}
              className="px-3 py-1.5 rounded-[2px] text-xs font-medium bg-[#0f172a] hover:bg-neutral-800 text-white cursor-pointer"
            >
              确认创建并开始配置
            </button>
          </div>
        </div>
      )}

      {/* Main Editing Card for Selected Category */}
      <div className="bg-white rounded-[2px] p-3 border border-[#e6e6e4] space-y-3">
        {/* Header & Status Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 border-b border-[#f1f1ef] gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl shrink-0">{currentConfig.categoryIcon || '🍢'}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-medium text-[#0f172a] truncate">
                  【{currentConfig.categoryName}】品牌弹窗配置
                </h3>
                {currentConfig.isCustom && (
                  <button
                    type="button"
                    onClick={() => handleDeleteCustomCategory(currentConfig.categoryId)}
                    className="text-[11px] font-medium text-rose-700 hover:text-rose-800 flex items-center gap-1 cursor-pointer shrink-0"
                    title="删除此自建分类"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>删除该分类</span>
                  </button>
                )}
              </div>
              <p className="text-[10px] text-[#787774] truncate">
                分类标识: <code className="font-mono text-[#0f172a]">{currentConfig.categoryId}</code> · 控制顾客进入或切换至该分类时的品牌展示
              </p>
            </div>
          </div>

          {/* Quick Enable Toggle */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-[#787774]">启用品牌弹窗:</span>
              <input
                type="checkbox"
                checked={currentConfig.enabled}
                onChange={(e) => updateCurrentConfig({ enabled: e.target.checked })}
                className="w-3.5 h-3.5 accent-[#0f172a] rounded-[2px] cursor-pointer"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                resetSingleCategorySeenRecord(currentConfig.categoryId);
                showToast(`已重置【${currentConfig.categoryName}】查看记录`);
              }}
              className="px-2 py-1 text-xs font-medium text-[#787774] hover:text-[#0f172a] bg-[#fbfbfa] hover:bg-[#f1f1ef] rounded-[2px] border border-[#e6e6e4] transition-colors cursor-pointer whitespace-nowrap"
            >
              清除本类目查看记录
            </button>
          </div>
        </div>

        {/* 1. Trigger Policy Mode */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#0f172a] flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#787774]" />
            <span>切换分类时触发策略 (核心防打扰机制):</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {[
              {
                id: 'first_time_only' as CategoryBrandTriggerMode,
                title: '仅第一次切换时弹出',
                sub: '推荐 · 用户看过一次后不再重复弹出打扰',
                badge: '体验最佳'
              },
              {
                id: 'repeat_switch' as CategoryBrandTriggerMode,
                title: '每次切换均重复弹出',
                sub: '高曝光 · 每次点击该分类都弹出品牌介绍',
                badge: '营销强推'
              },
              {
                id: 'daily_first' as CategoryBrandTriggerMode,
                title: '每日首次切换弹出',
                sub: '按天隔离 · 每天第一次点该分类时弹出一次',
                badge: '日常促活'
              },
              {
                id: 'disabled' as CategoryBrandTriggerMode,
                title: '停用此分类弹窗',
                sub: '点击分类直接浏览商品列表，不弹窗',
                badge: '静默模式'
              }
            ].map((mode) => {
              const isSelected = currentConfig.triggerMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => updateCurrentConfig({ triggerMode: mode.id })}
                  className={`p-2.5 rounded-[2px] border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#fbfbfa] border-[#0f172a] ring-1 ring-[#0f172a]'
                      : 'bg-white hover:bg-[#fbfbfa] border-[#e6e6e4]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-medium text-[#0f172a]">{mode.title}</span>
                      <span
                        className={`text-[9px] font-medium px-1.5 py-0.2 rounded-[2px] border ${
                          isSelected ? 'bg-[#0f172a] text-white border-[#0f172a]' : 'bg-[#f1f1ef] text-[#787774] border-[#e6e6e4]'
                        }`}
                      >
                        {mode.badge}
                      </span>
                    </div>
                    <p className="text-[11px] leading-snug text-[#787774]">
                      {mode.sub}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Brand Visual & Typography */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="space-y-2.5">
            <div>
              <label className="text-[10px] font-medium text-[#787774] block mb-1">品牌大标题</label>
              <input
                type="text"
                value={currentConfig.brandTitle}
                onChange={(e) => updateCurrentConfig({ brandTitle: e.target.value })}
                className="w-full text-xs px-2.5 py-1.5 rounded-[2px] border border-[#e6e6e4] bg-[#fbfbfa] text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                placeholder="例如: 黑曜石 · 果木炭烤工坊"
              />
            </div>

            <div>
              <label className="text-[10px] font-medium text-[#787774] block mb-1">品牌副标题 / 核心Slogan</label>
              <input
                type="text"
                value={currentConfig.brandSubtitle}
                onChange={(e) => updateCurrentConfig({ brandSubtitle: e.target.value })}
                className="w-full text-xs px-2.5 py-1.5 rounded-[2px] border border-[#e6e6e4] bg-[#fbfbfa] text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                placeholder="例如: 280℃果木菊花炭现点现烤 · 独家秘制九味干碟"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-medium text-[#787774] block mb-1">角标亮点标签</label>
                <input
                  type="text"
                  value={currentConfig.badgeText}
                  onChange={(e) => updateCurrentConfig({ badgeText: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 rounded-[2px] border border-[#e6e6e4] bg-[#fbfbfa] text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                  placeholder="例如: 🔥 果木现烤"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-[#787774] block mb-1">引导按钮文案</label>
                <input
                  type="text"
                  value={currentConfig.buttonText}
                  onChange={(e) => updateCurrentConfig({ buttonText: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 rounded-[2px] border border-[#e6e6e4] bg-[#fbfbfa] text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                  placeholder="例如: 开始选购炭烤串串"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-medium text-[#787774] block mb-1">专属优惠/特惠权益提示</label>
              <input
                type="text"
                value={currentConfig.couponText || ''}
                onChange={(e) => updateCurrentConfig({ couponText: e.target.value })}
                className="w-full text-xs px-2.5 py-1.5 rounded-[2px] border border-[#e6e6e4] bg-[#fbfbfa] text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                placeholder="例如: 炭烤专区专享：满¥35立减¥5 · 免费赠送秘制干碟"
              />
            </div>
          </div>

          <div className="space-y-2.5">
            <div>
              <label className="text-[10px] font-medium text-[#787774] block mb-1">品类风味故事与制作工艺标准说明</label>
              <textarea
                rows={4}
                value={currentConfig.storyDescription}
                onChange={(e) => updateCurrentConfig({ storyDescription: e.target.value })}
                className="w-full text-xs px-2.5 py-1.5 rounded-[2px] border border-[#e6e6e4] bg-[#fbfbfa] text-[#0f172a] focus:outline-none focus:border-[#0f172a] leading-relaxed"
                placeholder="详细说明该品类的选材标准、烤制温度、独家秘方及口感特色..."
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-medium text-[#787774] block mb-1">自动关闭倒计时</label>
                <select
                  value={currentConfig.autoCloseSeconds || 0}
                  onChange={(e) => updateCurrentConfig({ autoCloseSeconds: Number(e.target.value) })}
                  className="w-full text-xs px-2 py-1.5 rounded-[2px] border border-[#e6e6e4] bg-[#fbfbfa] text-[#0f172a] focus:outline-none"
                >
                  <option value={0}>常开 (需顾客主动点击)</option>
                  <option value={3}>3 秒后自动收起</option>
                  <option value={5}>5 秒后自动收起</option>
                  <option value={8}>8 秒后自动收起</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-medium text-[#787774] block mb-1">主题主色调</label>
                <select
                  value={currentConfig.accentColor || 'orange'}
                  onChange={(e) => updateCurrentConfig({ accentColor: e.target.value as any })}
                  className="w-full text-xs px-2 py-1.5 rounded-[2px] border border-[#e6e6e4] bg-[#fbfbfa] text-[#0f172a] focus:outline-none"
                >
                  <option value="orange">炭烤烈焰橙 (Orange)</option>
                  <option value="amber">居酒屋琥珀金 (Amber)</option>
                  <option value="yellow">芝士浓香金黄 (Yellow)</option>
                  <option value="rose">西式谷饲玫瑰红 (Rose)</option>
                  <option value="emerald">自然青翠绿 (Emerald)</option>
                  <option value="sky">冰爽特调天蓝 (Sky)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Craft Highlights Chips Editor */}
        <div className="pt-2 border-t border-[#f1f1ef] space-y-2">
          <label className="text-xs font-medium text-[#0f172a] flex items-center justify-between">
            <span>工匠标准与甄选特色标签 (弹窗中展示的4大亮点):</span>
            <span className="text-[11px] font-normal text-[#787774]">已配置 {currentConfig.craftHighlights?.length || 0} 个</span>
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            {(currentConfig.craftHighlights || []).map((tag, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-[2px] bg-[#fbfbfa] text-[#0f172a] text-xs font-normal border border-[#e6e6e4] flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveCraftTag(idx)}
                  className="w-3.5 h-3.5 rounded-[2px] hover:bg-[#f1f1ef] text-[#787774] hover:text-[#0f172a] flex items-center justify-center cursor-pointer"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}

            <div className="flex items-center gap-1">
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCraftTag();
                  }
                }}
                placeholder="新增亮点如: 现烤锁鲜"
                className="text-xs px-2 py-1 rounded-[2px] border border-[#e6e6e4] focus:outline-none focus:border-[#0f172a] w-32 bg-white text-[#0f172a]"
              />
              <button
                type="button"
                onClick={handleAddCraftTag}
                className="px-2 py-1 bg-[#0f172a] text-white text-xs font-medium rounded-[2px] cursor-pointer hover:bg-neutral-800"
              >
                添加
              </button>
            </div>
          </div>
        </div>

        {/* 4. Cover Image Selection & Custom URL */}
        <div className="pt-2 border-t border-[#f1f1ef] space-y-2">
          <label className="text-xs font-medium text-[#0f172a] block">
            封面大图选择 (可点击预设高清摄影图或输入自定义图床链接):
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {PRESET_COVER_IMAGES.map((img, i) => {
              const isCurrent = currentConfig.coverImageUrl === img.url;
              return (
                <div
                  key={i}
                  onClick={() => updateCurrentConfig({ coverImageUrl: img.url })}
                  className={`group relative h-18 rounded-[2px] overflow-hidden cursor-pointer border transition-all ${
                    isCurrent ? 'border-[#0f172a] ring-1 ring-[#0f172a]' : 'border-[#e6e6e4] hover:border-neutral-400'
                  }`}
                >
                  <img src={img.url} alt={img.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-1">
                    <span className="text-[10px] font-medium text-white leading-tight truncate">{img.label}</span>
                  </div>
                  {isCurrent && (
                    <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-[#0f172a] text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-0.5">
            <input
              type="text"
              value={currentConfig.coverImageUrl}
              onChange={(e) => updateCurrentConfig({ coverImageUrl: e.target.value })}
              className="w-full text-xs px-2.5 py-1.5 rounded-[2px] border border-[#e6e6e4] bg-[#fbfbfa] focus:outline-none focus:border-[#0f172a] font-mono text-[#0f172a]"
              placeholder="自定义高清图片 URL (如: https://...)"
            />
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="pt-2.5 border-t border-[#f1f1ef] flex items-center justify-between flex-wrap gap-2">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="text-xs font-medium text-[#787774] hover:text-[#0f172a] transition-colors cursor-pointer"
          >
            恢复官方出厂默认配置
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewConfig(currentConfig)}
              className="px-3 py-1.5 bg-[#fbfbfa] hover:bg-[#f1f1ef] text-[#0f172a] text-xs font-medium rounded-[2px] border border-[#e6e6e4] transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5 text-[#787774]" />
              <span>实时测试预览</span>
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-3.5 py-1.5 bg-[#0f172a] hover:bg-neutral-800 text-white text-xs font-medium rounded-[2px] transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>保存配置生效</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Preview Modal */}
      {previewConfig && (
        <CategoryBrandModal
          isOpen={Boolean(previewConfig)}
          onClose={() => setPreviewConfig(null)}
          config={previewConfig}
          onConfirmStartShopping={() => {
            setPreviewConfig(null);
            showToast(`[测试预览] 顾客点击了“${previewConfig.buttonText || '开始选购'}”`);
          }}
        />
      )}
    </div>
  );
};
