# CloudBase 安全规则（C2）

> **为什么规则要放进仓库**：数据库安全规则存在控制台而非代码里，极易遗漏且难以复核。
> 若 `obsidian_table_sessions` 的写权限开放给客户端，任何人都能直接把自己写进
> `participants`，整套授权协议形同虚设。因此规则必须与代码同源管理，并可被回归脚本断言。

## 涉及集合

| 集合 | 用途 | 客户端权限 |
|---|---|---|
| `obsidian_table_sessions` | 桌台会话（参与者、待决请求） | **只读**；一切写入经云函数 `tableLink` |
| `obsidian_table_link_requests` | 联动授权请求 | 只读（仅能看到 targets 含自己的文档） |
| `obsidian_reactive_events` | 跨设备事件总线（传输信封） | **仅追加**；只读发给自己的 |
| `obsidian_table_session_probes` | 行为探针 | **不开放客户端读写**（仅商家端经云函数读取） |

## 核心原则

1. **授权相关的一切写入必须经云函数**。客户端对 `obsidian_table_sessions` 只有读权限，
   对 `obsidian_table_link_requests` 只能创建"自己发起的申请"（且 `targets` 由云函数生成）。
2. **传输信封只追加、不可改**。`obsidian_reactive_events` 允许客户端 `create`，
   但更新与删除需被禁止（否则可篡改他人收到的授权结果）。
3. **探针不下发客户端**。探针是商家侧观测数据，客户端读写一律拒绝。

## 规则定义

### obsidian_table_sessions

```json
{
  "read": "auth != null",
  "write": false
}
```

理由：会话的成员增减、权限变更、桌主转移全部经云函数 `tableLink` 执行。
即使客户端持有会话 id，也无法绕过授权链把自己写入 `participants`。

### obsidian_table_link_requests

```json
{
  "read": "auth != null && (doc.targets.includes(auth.uid) || doc.requesterId == auth.uid || doc.targets.includes('*'))",
  "create": "auth != null && doc.requesterId == auth.uid",
  "update": false,
  "delete": false
}
```

理由：
- `update: false` 是关键 —— 授权收敛必须经服务端条件更新，
  客户端若能直接 `update` 就能绕过 CAS 直接把自己标成 `granted`。
- `targets` 字段应由云函数写入；`create` 规则仅作为纵深防御的第二道闸门。
  **若控制台支持字段级规则，应额外禁止 create 时传入 `targets`。**

### obsidian_reactive_events

```json
{
  "read": "auth != null && (doc.targets.includes(auth.uid) || doc.targets.includes('*'))",
  "create": "auth != null && doc.emittedBy == auth.uid",
  "update": false,
  "delete": false
}
```

理由：
- `create` 时校验 `emittedBy == auth.uid`，防止伪造他人身份发布事件。
- `update: false` 防止篡改已投递的事件内容（如把 `denied` 改成 `granted`）。
- 过期回收由**云函数定时触发器**负责（`expiresAtMs < now` 的文档批量删除），
  而不是开放客户端 delete。

### obsidian_table_session_probes

```json
{
  "read": false,
  "write": false
}
```

理由：探针仅经云函数读写。开放读会暴露全店顾客行为路径，开放性远超"商家本店"边界。

## ⚠️ 部署前必须确认的两件事

1. **登录方式**：本项目客户端使用**匿名登录**（`ensureCloudbaseAuth()` 走
   `anonymousAuthProvider().signIn()`）。匿名登录下 `auth.uid` 是否存在、
   规则表达式能否取到 uid，**必须在目标环境控制台实测确认**。
   若匿名登录的 uid 在规则中不可用，则需改用自定义登录，或把读权限收紧为
   "仅通过云函数读取"（即 `read: false` + 全部经 `tableLink` 的 `fetch`）。
2. **规则表达式语法**：不同 CloudBase 版本的规则语法存在差异
   （`auth.uid` / `doc._openid` / `auth.openid` 等）。以上规则是按"意图"书写的，
   部署时需按控制台实际语法改写，**不可直接粘贴**。

## 断言方式

`scripts/verify-transport.ts` 中的第 6 项验收（越权防护）通过**注入的假 LinkService**
验证客户端路径不产生越权写入。规则本身无法在本地断言，因此建议：

1. 把本文件作为部署清单的一部分，控制台改配置后同步更新此文件；
2. 交付前在真实环境执行一次"客户端直连数据库尝试写入参与者"的渗透用例，
   确认被拒绝并把结果记录到本次发布说明中。

## 过期清理（云函数定时触发器）

```js
// 建议与 tableLink 同环境部署，触发周期 10 分钟
const cloud = require('@cloudbase/node-sdk');
const app = cloud.init({ env: cloud.SYMBOL_CURRENT_ENV });
const db = app.database();
const _ = db.command;

exports.main = async () => {
  const res = await db
    .collection('obsidian_reactive_events')
    .where({ expiresAtMs: _.lt(Date.now()) })
    .remove();
  return { code: 0, deleted: res.deleted || 0 };
};
```
