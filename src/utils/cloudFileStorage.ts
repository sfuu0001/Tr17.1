/**
 * 腾讯云文件与附件云端直传引擎 (Cloud File Storage Engine)
 *
 * 核心目标:
 * 1. 彻底杜绝前端将用户上传的图片/文件转为巨大 Base64 字符串并写入 LocalStorage/IndexedDB
 * 2. 统一直传至腾讯云开发对象存储 (TCB Storage / COS 存储桶 7463-tc100-d9gz0e2ko5929e360-1445454244)
 * 3. 仅向业务层与云数据库持久化轻量 HTTPS CDN URL
 * 4. 离线/临时态仅采用浏览器原生临时 ObjectURL (内存生命周期，刷新/换版自动释放，零磁盘残留)
 */

import { getCloudbaseApp } from './cloudbase';

export interface FileUploadResult {
  success: boolean;
  url: string;
  fileID?: string;
  isEphemeral?: boolean;
  sizeBytes: number;
  fileName: string;
  error?: string;
}

// 活跃内存 ObjectURL 集合，用于主动析构防内存泄露
const activeObjectUrls = new Set<string>();

/**
 * 校验 URL 是否为安全的云端/轻量链接（拒绝大体积 Base64 字符串）
 */
export function isStorageSafeUrl(url: string): boolean {
  if (!url) return true;
  // 如果是 Base64 且超过 10KB，属于不安全本地污染
  if (url.startsWith('data:') && url.length > 10240) {
    return false;
  }
  return true;
}

/**
 * 清理临时内存 ObjectURL
 */
export function revokeEphemeralUrl(url: string): void {
  if (url && url.startsWith('blob:') && typeof window !== 'undefined') {
    try {
      URL.revokeObjectURL(url);
      activeObjectUrls.delete(url);
    } catch {}
  }
}

/**
 * 清理全部临时内存文件
 */
export function revokeAllEphemeralUrls(): void {
  if (typeof window === 'undefined') return;
  for (const url of activeObjectUrls) {
    try {
      URL.revokeObjectURL(url);
    } catch {}
  }
  activeObjectUrls.clear();
}

/**
 * 用户文件直传腾讯云对象存储
 *
 * @param file 待上传的文件对象 (如图片、头像、单据凭证)
 * @param options 上传配置 (目录、所属用户ID、业务类型)
 */
export async function uploadUserFileToCloud(
  file: File | Blob,
  options: {
    folder?: string;
    uid?: string;
    fileName?: string;
  } = {}
): Promise<FileUploadResult> {
  const folder = options.folder || 'user-uploads';
  const uid = options.uid || 'guest';
  const originalName = options.fileName || (file as File).name || 'upload.jpg';
  const ext = originalName.split('.').pop() || 'jpg';
  const cleanFileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const cloudPath = `${folder}/${uid}/${cleanFileName}`;

  try {
    const { app: tcbApp } = getCloudbaseApp();

    if (tcbApp && typeof tcbApp.uploadFile === 'function') {
      console.log(`[CloudFileStorage] 🚀 正在直传腾讯云存储桶: ${cloudPath} (${file.size} bytes)...`);

      const uploadRes = await tcbApp.uploadFile({
        cloudPath,
        filePath: file
      });

      if (uploadRes && uploadRes.fileID) {
        // 解析公网 HTTPS CDN 访问链接
        let cdnUrl = uploadRes.fileID;
        try {
          const urlRes = await tcbApp.getTempFileURL({
            fileList: [uploadRes.fileID]
          });
          if (urlRes?.fileList?.[0]?.tempFileURL) {
            cdnUrl = urlRes.fileList[0].tempFileURL;
          }
        } catch {
          // 若获取 CDN 临时链接失败，返回 fileID 由 SDK 解析
        }

        console.log(`[CloudFileStorage] ✅ 上传成功! 获得云端托管链接:`, cdnUrl);
        return {
          success: true,
          url: cdnUrl,
          fileID: uploadRes.fileID,
          isEphemeral: false,
          sizeBytes: file.size,
          fileName: originalName
        };
      }
    }
  } catch (err: any) {
    console.warn('[CloudFileStorage] 云端存储直传受限或未开通 (平滑降级为内存零残留 ObjectURL):', err?.message || err);
  }

  // 云端不可用时的零磁盘残留降级：生成浏览器原生内存 ObjectURL
  // 特性：只存在于当前渲染进程 RAM 中，页面刷新/版本升级自动湮灭，绝不写入 LocalStorage
  if (typeof window !== 'undefined' && window.URL && typeof window.URL.createObjectURL === 'function') {
    const objectUrl = URL.createObjectURL(file);
    activeObjectUrls.add(objectUrl);
    console.info('[CloudFileStorage] ⚠️ 已采用内存生命周期零污染 ObjectURL 承载图片，刷新或换版将自动回收.');

    return {
      success: true,
      url: objectUrl,
      isEphemeral: true,
      sizeBytes: file.size,
      fileName: originalName
    };
  }

  return {
    success: false,
    url: '',
    sizeBytes: file.size,
    fileName: originalName,
    error: '无法处理文件上传'
  };
}
