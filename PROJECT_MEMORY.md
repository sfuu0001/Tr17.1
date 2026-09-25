# 项目关键配置与部署记忆文档 (PROJECT_MEMORY.md)

本文档记录本项目所使用的第三方云服务、腾讯云对象存储（COS）凭证、发布流水线及相关操作备忘。

---

## 腾讯云静态网站托管与 COS 存储桶配置

- **Secret ID**: `<YOUR_TENCENT_SECRET_ID>`
- **Secret Key**: `<YOUR_TENCENT_SECRET_KEY>`
- **静态网站托管存储桶 (网页部署)**: `529f-static-tc100-d9gz0e2ko5929e360-1445454244`
- **应用附件存储桶 (文件存储)**: `7463-tc100-d9gz0e2ko5929e360-1445454244`
- **COS Region**: `ap-shanghai`（华东·上海）
- **🌐 网页浏览器直接访问地址 (免强制下载)**:
  [https://tc100-d9gz0e2ko5929e360-1445454244.tcloudbaseapp.com](https://tc100-d9gz0e2ko5929e360-1445454244.tcloudbaseapp.com)
- **COS 默认源站地址 (按监管要求默认触发文件下载)**:
  `https://529f-static-tc100-d9gz0e2ko5929e360-1445454244.cos-website.ap-shanghai.myqcloud.com`

---

## 为什么访问 *.myqcloud.com 默认域名会触发浏览器自动下载？

根据中国国家工信部与腾讯云安全合规监管要求（自 2024 年 1 月 1 日起）：
- 所有国内地域对象存储 COS 的**默认域名**（包含 `*.myqcloud.com` 及 `*.cos-website.*.myqcloud.com`）在浏览器访问 HTML/HTM 文件时，COS 网关层均会强制返回 `Content-Disposition: attachment` 和 `x-cos-force-download: true`，从而触发浏览器自动保存下载文件。
- **解决方案**：使用已通过合规白名单审核的**腾讯云云开发静态网站专属域名（`*.tcloudbaseapp.com`）**或绑定已备案的自定义域名。通过专属域名访问时，网页可在 Chrome、Safari、Edge 等主流浏览器中直接流畅交互，无任何下载提示。

---

## 常用指令

```bash
# 1. 一键构建并部署到腾讯云 COS
npm run deploy:cos

# 2. 本地开发调试
npm run dev

# 3. 生产环境构建
npm run build
```

---

## 关键文件说明

- `.env`: 存放本地/运行时的真实 API 密钥与存储桶信息。
- `.env.example`: 环境变量范例模板。
- `scripts/deploy-cos.mjs`: Node.js 腾讯云 COS 自动部署脚本（支持全量并发上传与 SPA 404 回退配置）。
- `AGENTS.md`: AI Agent 持久化记忆与上下文规范文件（系统每次对话会自动读取注入）。

---

## 核心交互铁律备忘

1. **输入框防缩放与互动器比例锁定 (Zero Auto-Zoom on Input Focus)**：
   - 全局及档口小票拆单打印所见即所得编辑器中，任何输入框（含虚线输入框 `InlineEditableText`、下拉选择器等）在被点击激活时，**绝对禁止触发系统视口或互动器比例画面放大**。
   - 移动端计算字号强制限制不低于 16px、配置 `touch-action: manipulation`，纸样画布恒定锁定 1:1 物理比例，聚焦时使用 `preventScroll: true` 阻断画布跳动。

2. **向下拉彩单/菜单小组件 AI 生成必须为美化版 (Strict Beautified Pull-down Menu & Dropdown Specification)**：
   - 彻底废除原生 `<select>` 与粗糙纯文本列表，凡生成向下拉彩单/下拉菜单小组件，必须生成包含「精致矢量图标 + 微光底槽 + 主标题 + 工况解释副标题 + 胶囊徽标/状态灯 + 选中高亮与对勾 + AnimatePresence 顺滑微动效」的全要素美化版内容；
   - 容器统一采用半透明高阶毛玻璃（`bg-white/95 backdrop-blur-xl border border-neutral-200/90 shadow-2xl`），触控热区适度，内部若有输入框严格遵循 16px 防缩放与 `touch-action: manipulation` 铁律。


