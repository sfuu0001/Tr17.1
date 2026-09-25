import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import COS from 'cos-nodejs-sdk-v5';

const SecretId = process.env.TENCENT_SECRET_ID || process.env.COS_SECRET_ID || '';
const SecretKey = process.env.TENCENT_SECRET_KEY || process.env.COS_SECRET_KEY || '';
const Bucket = process.env.TENCENT_COS_BUCKET || process.env.COS_BUCKET || '529f-static-tc100-d9gz0e2ko5929e360-1445454244';
const Region = process.env.TENCENT_COS_REGION || process.env.COS_REGION || 'ap-shanghai';

if (!SecretId || !SecretKey || !Bucket) {
  console.error('\x1b[31m%s\x1b[0m', '❌ 缺少腾讯云 COS 必要配置！');
  console.log(`
请设置以下环境变量或在运行时提供：
  - TENCENT_SECRET_ID (或 COS_SECRET_ID)
  - TENCENT_SECRET_KEY (或 COS_SECRET_KEY)
  - TENCENT_COS_BUCKET (格式: 存储桶名称-APPID, 例如 foodtruck-1250000000)
  - TENCENT_COS_REGION (例如: ap-shanghai / ap-guangzhou / ap-beijing，默认为 ap-shanghai)

示例运行命令：
  TENCENT_SECRET_ID=xxx TENCENT_SECRET_KEY=yyy TENCENT_COS_BUCKET=foodtruck-1250000000 TENCENT_COS_REGION=ap-shanghai node scripts/deploy-cos.mjs
`);
  process.exit(1);
}

const cos = new COS({
  SecretId,
  SecretKey,
  Timeout: 120000, // 120s timeout
});

const distDir = path.resolve(process.cwd(), 'dist');

if (!fs.existsSync(distDir)) {
  console.error('\x1b[31m%s\x1b[0m', '❌ dist 目录不存在，请先执行 npm run build 进行构建！');
  process.exit(1);
}

function getAllFiles(dir, baseDir = dir) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getAllFiles(fullPath, baseDir));
    } else {
      const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      files.push({ fullPath, key: relPath });
    }
  }
  return files;
}

const mimeMap = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

async function ensureBucketPublicRead() {
  return new Promise((resolve) => {
    cos.putBucketAcl(
      {
        Bucket,
        Region,
        ACL: 'public-read',
      },
      (err) => {
        if (err) {
          console.warn('\x1b[33m%s\x1b[0m', `⚠️ 存储桶公有读权限配置提示: ${err.message || err.code}`);
        } else {
          console.log('\x1b[32m%s\x1b[0m', '✅ 已确保存储桶公有读 (public-read) 访问权限');
        }
        resolve();
      }
    );
  });
}

async function uploadSingleFile(file) {
  const ext = path.extname(file.fullPath).toLowerCase();
  const contentType = mimeMap[ext] || 'application/octet-stream';
  const isHtml = ext === '.html';
  const cacheControl = isHtml ? 'no-cache, no-store, must-revalidate' : 'public, max-age=31536000, immutable';

  return new Promise((resolve, reject) => {
    cos.uploadFile(
      {
        Bucket,
        Region,
        Key: file.key,
        FilePath: file.fullPath,
        StorageClass: 'STANDARD',
        SliceSize: 1024 * 1024 * 1, // 1MB slice
        AsyncLimit: 3,
        Headers: {
          'Content-Type': contentType,
          'Cache-Control': cacheControl,
          'x-cos-acl': 'public-read',
        },
      },
      (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      }
    );
  });
}

async function uploadWithRetry(file, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await uploadSingleFile(file);
    } catch (err) {
      if (attempt === maxRetries) throw err;
      console.warn(`\n⚠️ [${file.key}] 上传重试 (${attempt}/${maxRetries}): ${err.message || err}`);
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
}

async function configureWebsite() {
  return new Promise((resolve) => {
    cos.putBucketWebsite(
      {
        Bucket,
        Region,
        WebsiteConfiguration: {
          IndexDocument: { Suffix: 'index.html' },
          ErrorDocument: { Key: 'index.html' },
        },
      },
      (err) => {
        if (err) {
          console.warn('\x1b[33m%s\x1b[0m', `⚠️ 自动设置静态网站路由规则提示: ${err.message || err.code}（如果已手动开启可忽略）`);
        } else {
          console.log('\x1b[32m%s\x1b[0m', '✅ 已自动为您配置存储桶静态网站索引与 SPA 404 路由回退 (index.html)');
        }
        resolve();
      }
    );
  });
}

async function main() {
  console.log('\x1b[36m%s\x1b[0m', `🚀 开始部署到腾讯云 COS [${Bucket}] (${Region})...`);
  await ensureBucketPublicRead();
  const files = getAllFiles(distDir);
  console.log(`📦 共扫描到 ${files.length} 个静态文件，开始并发上传...\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < files.length; i += 3) {
    const chunk = files.slice(i, i + 3);
    await Promise.all(
      chunk.map(async (file) => {
        try {
          await uploadWithRetry(file);
          successCount++;
          process.stdout.write(`\r  已上传: [${successCount}/${files.length}] ${file.key}`);
        } catch (err) {
          failCount++;
          console.error(`\n❌ 上传失败: ${file.key}`, err.message || err);
        }
      })
    );
  }

  console.log(`\n\n🎉 文件上传完成！成功: ${successCount} 个, 失败: ${failCount} 个`);

  if (failCount === 0) {
    await configureWebsite();
    const websiteUrl = `https://${Bucket}.cos-website.${Region}.myqcloud.com`;

    // 针对腾讯云云开发静态托管存储桶（如 529f-static-tc100-xxx-1445454244），自动提取免强制下载的专属 Web 域名
    const tcbMatch = Bucket.match(/(?:static-)?(tc[0-9a-zA-Z_-]+)-(\d+)/);
    const tcbWebUrl = tcbMatch ? `https://${tcbMatch[1]}-${tcbMatch[2]}.tcloudbaseapp.com` : null;

    console.log('\n======================================================');
    console.log('\x1b[32m%s\x1b[0m', '✅ 腾讯云静态网站已部署就绪！');
    if (tcbWebUrl) {
      console.log('🌐 浏览器网页直接访问地址 (免下载，直接浏览):');
      console.log('\x1b[32m\x1b[1m%s\x1b[0m', `   ${tcbWebUrl}`);
      console.log('\n📦 COS 默认源站域名 (按国家监管要求默认触发文件下载):');
      console.log('\x1b[90m%s\x1b[0m', `   ${websiteUrl}`);
    } else {
      console.log('🌐 您的公网访问链接:');
      console.log('\x1b[34m%s\x1b[0m', `   ${websiteUrl}`);
    }
    console.log('======================================================\n');
  }
}

main().catch((err) => {
  console.error('\x1b[31m%s\x1b[0m', '❌ 部署过程出现异常:', err);
  process.exit(1);
});
