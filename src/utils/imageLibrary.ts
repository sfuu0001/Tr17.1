/* ============================================================================
 * imageLibrary —— 在库图片素材库（ avoids 每次都本地上传）
 * ----------------------------------------------------------------------------
 * 设计要点：
 * 1. 素材按 origin 持久化在 localStorage（key: obsidian_image_library），
 *    上传一次即可在所有菜品/变体/口味中复用调用；
 * 2. 记录图片规格（宽/高/体积/格式），供运营核对分辨率；
 * 3. 上限保护：单图 > 900KB 时不入库（localStorage 容量限制），提示压缩；
 * 4. 组件层用 subscribeImageLibrary 订阅变更即可响应。
 * ==========================================================================*/

export interface ImageLibraryItem {
  id: string;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
  sizeKB: number;
  mime: string;
  createdAt: string;
}

const LIB_KEY = 'obsidian_image_library';
// 本地素材库是单机数据，不需要走跨设备事件总线；用轻量本地订阅即可
const libraryListeners = new Set<() => void>();
export function subscribeImageLibrary(cb: () => void): () => void {
  libraryListeners.add(cb);
  return () => libraryListeners.delete(cb);
}
function notifyLibraryChanged() {
  libraryListeners.forEach((l) => l());
}
const MAX_ITEM_KB = 900;
const MAX_ITEMS = 60;

function safeParse(raw: string | null): ImageLibraryItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function listLibraryImages(): ImageLibraryItem[] {
  if (typeof window === 'undefined') return [];
  return safeParse(window.localStorage.getItem(LIB_KEY)).sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1
  );
}

function persist(items: ImageLibraryItem[]) {
  try {
    window.localStorage.setItem(LIB_KEY, JSON.stringify(items));
  } catch {
    // 容量超限：丢弃最旧 3 张再试
    try {
      window.localStorage.setItem(LIB_KEY, JSON.stringify(items.slice(3)));
    } catch {
      /* ignore */
    }
  }
  notifyLibraryChanged();
}

export function removeLibraryImage(id: string) {
  const next = listLibraryImages().filter((i) => i.id !== id);
  persist(next);
  return next.length;
}

export function isImageInLibrary(dataUrl: string): boolean {
  return listLibraryImages().some((i) => i.dataUrl === dataUrl);
}

/** 读取图片规格（分辨率/体积/格式） */
function readImageSpec(file: File): Promise<ImageLibraryItem> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const img = new Image();
      img.onerror = () => reject(new Error('图片解析失败'));
      img.onload = () => {
        const item: ImageLibraryItem = {
          id: `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          dataUrl,
          width: img.naturalWidth,
          height: img.naturalHeight,
          sizeKB: Math.round(file.size / 1024),
          mime: file.type || 'image/*',
          createdAt: new Date().toISOString()
        };
        resolve(item);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

/** 批量入库（自动跳过超限/重复） */
export async function addFilesToLibrary(files: FileList | File[]): Promise<{
  added: ImageLibraryItem[];
  skipped: { name: string; reason: string }[];
}> {
  const added: ImageLibraryItem[] = [];
  const skipped: { name: string; reason: string }[] = [];
  const list = Array.from(files as File[]);

  for (const file of list) {
    if (!file.type.startsWith('image/')) {
      skipped.push({ name: file.name, reason: '非图片文件' });
      continue;
    }
    if (file.size / 1024 > MAX_ITEM_KB) {
      skipped.push({
        name: file.name,
        reason: `体积 ${Math.round(file.size / 1024)}KB 超过 ${MAX_ITEM_KB}KB 上限，请压缩后再入库`
      });
      continue;
    }
    try {
      const item = await readImageSpec(file);
      if (isImageInLibrary(item.dataUrl)) {
        skipped.push({ name: file.name, reason: '已在素材库中（自动去重）' });
        continue;
      }
      added.push(item);
    } catch (err: any) {
      skipped.push({ name: file.name, reason: err?.message || '读取失败' });
    }
  }

  if (added.length > 0) {
    const merged = [...added, ...listLibraryImages()].slice(0, MAX_ITEMS);
    persist(merged);
  }
  return { added, skipped };
}

/** 生成推荐规格文案（如 1024×1024 → 建议方形 1:1） */
export function describeSpec(item: ImageLibraryItem): string {
  const ratio = item.width / Math.max(1, item.height);
  const shape = Math.abs(ratio - 1) < 0.05 ? '1:1 方图' : ratio > 1.2 ? '横图' : ratio < 0.83 ? '竖图' : '近方图';
  return `${item.width}×${item.height} · ${shape} · ${item.sizeKB}KB`;
}
