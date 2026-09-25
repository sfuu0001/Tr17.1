/**
 * 同桌点餐食客头像工具库
 * 提供统一且确定性（Deterministic）的食客头像匹配算法
 */

export const TABLE_COMPANION_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&h=120&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&h=120&fit=crop&crop=faces',
];

export function getMemberAvatar(id: string, index: number = 0): string {
  if (!id) return TABLE_COMPANION_AVATARS[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return TABLE_COMPANION_AVATARS[(hash + index) % TABLE_COMPANION_AVATARS.length];
}
