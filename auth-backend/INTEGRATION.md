# Auth Service 接入文档

## 目录

- [概述](#概述)
- [架构说明](#架构说明)
- [基础信息](#基础信息)
- [认证流程](#认证流程)
- [API 接口](#api-接口)
  - [密码登录/注册](#1-密码登录注册)
  - [短信验证码登录/注册](#2-短信验证码登录注册)
  - [登出](#3-登出)
  - [忘记密码（发送重置链接）](#4-忘记密码发送重置链接)
  - [健康检查](#5-健康检查)
  - [Zitadel 自定义 SMS Provider](#6-zitadel-自定义-sms-provider)
  - [获取当前用户信息](#7-获取当前用户信息)
- [Token 使用说明](#token-使用说明)
- [错误码与错误处理](#错误码与错误处理)
- [安全机制](#安全机制)
- [接入示例](#接入示例)
- [环境变量配置](#环境变量配置)

---

## 概述

Auth Service 是基于 **Zitadel** 身份认证平台构建的认证服务，提供以下能力：

- **用户名/密码** 注册与登录
- **手机号短信验证码** 注册与登录
- **Token 管理**（签发、登出/注销）
- **用户信息查询**（含角色）

服务采用 **OIDC（OpenID Connect）** 协议，在服务端完成整个认证流程，客户端无需跳转到 Zitadel 登录页面。

## 架构说明

```
┌──────────┐     ┌───────────┐     ┌──────────────┐     ┌──────────┐
│  客户端   │────▶│   Kong    │────▶│ Auth Backend │────▶│ Zitadel  │
│ (Web/App)│◀────│  Gateway  │◀────│  (Express)   │◀────│   IdP    │
└──────────┘     └───────────┘     └──────────────┘     └──────────┘
```

- **Kong Gateway**：负责 JWT 验证、请求路由、Header 注入
- **Auth Backend**：负责认证业务逻辑、OTP 管理、调用 Zitadel API
- **Zitadel**：身份认证与用户数据存储

## 基础信息

| 项目 | 说明 |
|------|------|
| 服务网关地址 | `http://auth.localhost`（本地开发） |
| Content-Type | `application/json` |
| 请求体大小限制 | 2MB |

## 认证流程

### 密码登录流程

```
客户端                          Auth Backend                     Zitadel
  │                                │                               │
  │  POST /auth/password           │                               │
  │  {mode:"login",                │                               │
  │   username, password}          │                               │
  │───────────────────────────────▶│                               │
  │                                │  1. 发起 OIDC 授权请求         │
  │                                │  (生成 PKCE + state)           │
  │                                │──────────────────────────────▶│
  │                                │◀─── authRequestID ────────────│
  │                                │                               │
  │                                │  2. 创建 Session               │
  │                                │  (验证用户名密码)               │
  │                                │──────────────────────────────▶│
  │                                │◀─── sessionId + token ────────│
  │                                │                               │
  │                                │  3. 完成授权请求                │
  │                                │  (获取 authorization code)     │
  │                                │──────────────────────────────▶│
  │                                │◀─── callbackUrl (含 code) ────│
  │                                │                               │
  │                                │  4. 用 code 换取 Token          │
  │                                │  (PKCE code_verifier)          │
  │                                │──────────────────────────────▶│
  │                                │◀─── access_token + ... ───────│
  │◀── 返回 Token ─────────────────│                               │
```

### 短信验证码流程

```
1. 客户端  →  POST /auth/sms/send     →  发送验证码（返回 otpId）
2. 用户收到短信，获取 6 位验证码
3a. 登录：客户端  →  POST /auth/sms/login    →  返回 Token
3b. 注册：客户端  →  POST /auth/sms/register  →  返回 Token
```

---

## API 接口

### 1. 密码登录/注册

#### `POST /auth/password`

统一接口，通过 `mode` 字段区分登录和注册。

**登录请求：**

```json
{
  "mode": "login",
  "username": "your_username",
  "password": "your_password"
}
```

**注册请求：**

```json
{
  "mode": "register",
  "username": "your_username",
  "email": "your@email.com",
  "password": "your_password",
  "inviteCode": "optional_invite_code"
}
```

**字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| mode | string | ✅ | `"login"` 或 `"register"` |
| username | string | ✅ | 用户名（可使用邮箱作为用户名） |
| password | string | ✅ | 密码 |
| email | string | 注册时必填 | 邮箱地址 |
| inviteCode | string | 可选 | 邀请码（当系统开启邀请码验证时必填） |

**成功响应（200）：**

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "id_token": "eyJhbGciOiJSUzI1NiIs...",
  "refresh_token": "vLGKdFzjUBBiBn...",
  "token_type": "Bearer",
  "expires_in": 43200,
  "scope": "openid profile email offline_access"
}
```

**失败响应（400）：**

```json
{
  "error": "用户名或密码错误"
}
```

---

### 2. 短信验证码登录/注册

#### `POST /auth/sms/send` — 发送验证码

**请求：**

```json
{
  "phone": "+8613800138000"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| phone | string | ✅ | 手机号，支持 E.164 格式（`+8613800138000`）或 11 位纯数字（自动加 `+86` 前缀） |

**成功响应（200）：**

```json
{
  "ok": true,
  "otpId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "验证码已发送"
}
```

**频率限制响应（429）：**

```json
{
  "error": "发送过于频繁，请稍后再试",
  "retryAfterSeconds": 180
}
```

> ⚠️ **限制规则：** 每个手机号在 10 分钟内最多发送 3 条短信。验证码有效期 5 分钟，最多允许验证 5 次。

---

#### `POST /auth/sms/login` — 短信验证码登录

**请求：**

```json
{
  "phone": "+8613800138000",
  "code": "123456",
  "otpId": "550e8400-e29b-41d4-a716-446655440000"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| phone | string | ✅ | 手机号 |
| code | string | ✅ | 6 位验证码 |
| otpId | string | ✅ | 发送验证码时返回的 otpId |

**成功响应（200）：** 同密码登录返回的 Token 格式。

**失败响应：**
- `400` — 验证码错误或已过期
- `404` — 该手机号未注册

---

#### `POST /auth/sms/register` — 短信验证码注册

**请求：**

```json
{
  "phone": "+8613800138000",
  "code": "123456",
  "otpId": "550e8400-e29b-41d4-a716-446655440000",
  "username": "new_user",
  "password": "set_your_password",
  "inviteCode": "optional"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| phone | string | ✅ | 手机号 |
| code | string | ✅ | 6 位验证码 |
| otpId | string | ✅ | 发送验证码时返回的 otpId |
| username | string | ✅ | 用户名 |
| password | string | ✅ | 密码 |
| inviteCode | string | 可选 | 邀请码 |

**成功响应（200）：** 同密码登录返回的 Token 格式。

**失败响应：**
- `400` — 验证码错误或已过期
- `409` — 该手机号已被注册

---

### 3. 登出

#### `POST /auth/logout`

**请求：**

```json
{
  "refresh_token": "vLGKdFzjUBBiBn...",
  "access_token": "eyJhbGciOiJSUzI1NiIs..."
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| refresh_token | string | 可选 | 登录时获得的 refresh_token |
| access_token | string | 可选 | 登录时获得的 access_token |

> 建议同时传入两个 token 以确保完全注销。至少传入一个。

**成功响应（200）：**

```json
{
  "ok": true
}
```

---

### 4. 忘记密码（发送重置链接）

#### `POST /auth/forgot-password`

触发 ZITADEL 向用户已验证邮箱发送密码重置邮件。**出于安全原因，无论邮箱是否存在均返回成功响应，防止枚举攻击。**

**请求：**

```json
{
  "email": "user@example.com"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | ✅ | 用户注册时使用的邮箱地址 |

**成功响应（200）：**

```json
{
  "ok": true
}
```

> 📌 即使邮箱未注册，也返回 `{ "ok": true }`。建议前端在发送成功后提示用户"重置链接已发送，请查收邮箱。"

**失败响应：**
- `400` — 缺少 email 参数
- `500` — ZITADEL API 调用失败（一般不会发生，除非服务内部错误）

---

### 5. 健康检查

#### `GET /healthz`

健康检查端点，无需认证。

**成功响应（200）：**

```json
{
  "ok": true
}
```

---

### 6. Zitadel 自定义 SMS Provider

#### `POST /sms/send`

此端点供 Zitadel 调用，作为自定义短信发送提供商。Zitadel 会将验证码短信发送请求转发到此接口。

**请求体（Zitadel 格式）：**

```json
{
  "recipient": "+8613800138000",
  "message": "您的验证码是：123456"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| recipient | string | ✅ | E.164 格式手机号 |
| message | string | 否 | 包含验证码的消息文本 |

**成功响应（200）：**

```json
{
  "success": true
}
```

> 📌 此端点仅用于 Zitadel 集成，普通业务接入无需使用。

---

### 7. 获取当前用户信息

#### `GET /auth/me`

需要携带有效的 access_token（通过 Kong 网关访问）。

**请求头：**

```
Authorization: Bearer <access_token>
```

**成功响应（200）：**

```json
{
  "id": "291234567890123456",
  "username": "your_username",
  "email": "your@email.com",
  "created_at": "2025-01-01T00:00:00.000Z",
  "roles": ["EduClaw"]
}
```

**失败响应：**
- `401` — 未认证或 Token 无效
- `401` — 用户不存在
- `500` — 服务器内部错误

---

## Token 使用说明

### Token 结构

登录成功后返回以下 Token：

| Token | 用途 | 建议存储方式 |
|-------|------|-------------|
| `access_token` | 访问受保护资源的凭证（JWT） | 内存 / httpOnly Cookie |
| `id_token` | 用户身份信息（JWT，可解码获取用户资料） | 按需使用 |
| `refresh_token` | 用于刷新 access_token | 安全存储（httpOnly Cookie） |
| `expires_in` | access_token 有效期（秒），默认 43200（12小时） | — |
| `token_type` | Token 类型，固定为 `"Bearer"` | — |
| `scope` | 授权范围，如 `"openid profile email offline_access"` | — |

### 在请求中使用 Token

访问受保护的 API 时，在请求头中携带 access_token：

```http
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

Kong 网关会自动：
1. 验证 JWT 签名（使用 Zitadel JWKS）和有效期
2. 提取用户信息注入到以下请求头：
   - `X-User-Id` — 用户唯一标识
   - `X-User-Username` — 用户名
   - `X-User-Email` — 用户邮箱
3. 转发给上游服务（上游服务无需再验证 JWT）

> 📌 业务服务应从 `X-User-*` 头获取用户信息，不要尝试解析或验证 JWT。

---

## 错误码与错误处理

| HTTP 状态码 | 说明 | 典型场景 |
|------------|------|---------|
| 200 | 成功 | 登录/注册/登出成功 |
| 400 | 请求参数错误 | 用户名密码错误、验证码错误、参数缺失 |
| 401 | 未认证 | Token 无效或缺失 |
| 404 | 资源不存在 | 手机号未注册 |
| 409 | 冲突 | 手机号已被注册 |
| 429 | 请求过于频繁 | 短信发送频率超限 |
| 500 | 服务器内部错误 | Zitadel 服务异常、短信发送失败等 |

**错误响应格式：**

```json
{
  "error": "错误描述信息"
}
```

> 📌 出于安全考虑，内部错误信息会被脱敏处理。以中文开头的错误信息会原样返回，其他错误信息会被替换为通用提示。

### 常见验证错误

**密码登录/注册 (`POST /auth/password`)：**

| 错误信息 | 原因 |
|---------|------|
| `mode must be "login" or "register"` | mode 字段缺失或值不正确 |
| `username and password required` | 用户名或密码为空 |
| `email is required for registration` | 注册时未提供邮箱 |
| `该用户名已存在` | 注册时用户名已被占用 |
| `该邮箱已被注册` | 注册时邮箱已被占用 |
| `注册需要提供邀请码` | 开启邀请码验证但未提供 |
| `邀请码无效` | 提供的邀请码不正确 |
| `用户名或密码错误` | 登录时凭据不正确（脱敏后的通用提示） |

**短信验证码 (`POST /auth/sms/*`)：**

| 错误信息 | 原因 |
|---------|------|
| `手机号不能为空` | phone 字段为空 |
| `phone, code, otpId 必填` | 短信登录时缺少必填字段 |
| `phone, code, otpId, username, password 必填` | 短信注册时缺少必填字段 |
| `验证码不存在或已过期` | otpId 无效或已使用 |
| `验证码已过期` | 验证码超过 5 分钟有效期 |
| `验证码尝试次数过多` | 同一验证码验证超过 5 次 |
| `验证码错误` | 输入的验证码不正确 |
| `该手机号未注册` | 短信登录时手机号未注册 |
| `该手机号已注册` | 短信注册时手机号已注册 |
| `发送过于频繁，请稍后再试` | 短信发送频率超限（429） |
| `验证码发送失败` | 阿里云短信服务异常 |

---

## 安全机制

### OTP 安全

| 规则 | 值 |
|------|---|
| 验证码长度 | 6 位数字 |
| 有效期 | 5 分钟 |
| 最大验证尝试次数 | 5 次 |
| 短信频率限制 | 每个手机号 10 分钟内最多 3 条 |

### 组织隔离

当环境变量 `ZITADEL_ORG_ID` 设置后，服务会启用组织隔离模式：

- **用户注册**：新用户自动创建到指定组织下
- **用户查询**：仅查询指定组织内的用户
- **角色管理**：在指定组织上下文中分配和查询角色
- **OIDC 认证**：授权请求自动关联到指定组织

> 📌 未设置 `ZITADEL_ORG_ID` 时，使用 Zitadel 默认组织。

### 邀请码机制

当环境变量 `INVITE_REQUIRED=true` 时，注册接口必须提供有效的邀请码。邀请码通过 `INVITE_CODES` 环境变量配置（逗号分隔）。

### CORS

允许的来源：
- `http://{HOST}:{PORT}`（服务自身地址）
- `http://auth.localhost`
- `http://localhost`
- `http://127.0.0.1`

允许的请求方法：`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`

允许的请求头：`Accept`, `Content-Type`, `Authorization`

---

## 接入示例

### JavaScript / TypeScript

#### 密码登录

```typescript
async function login(username: string, password: string) {
  const res = await fetch('http://auth.localhost/auth/password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'login', username, password }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error);
  }

  const tokens = await res.json();
  // tokens.access_token, tokens.refresh_token, tokens.id_token
  return tokens;
}
```

#### 用户名/密码注册

```typescript
async function register(username: string, email: string, password: string, inviteCode?: string) {
  const res = await fetch('http://auth.localhost/auth/password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'register', username, email, password, inviteCode }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error);
  }

  return await res.json();
}
```

#### 短信验证码登录

```typescript
// 第一步：发送验证码
async function sendSmsCode(phone: string) {
  const res = await fetch('http://auth.localhost/auth/sms/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.otpId; // 保存此 otpId
}

// 第二步：验证码登录
async function smsLogin(phone: string, code: string, otpId: string) {
  const res = await fetch('http://auth.localhost/auth/sms/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code, otpId }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error);
  }

  return await res.json();
}
```

#### 获取当前用户信息

```typescript
async function getCurrentUser(accessToken: string) {
  const res = await fetch('http://auth.localhost/auth/me', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error('未登录或 Token 已过期');
  }

  return await res.json();
}
```

#### 登出

```typescript
async function logout(accessToken: string, refreshToken: string) {
  await fetch('http://auth.localhost/auth/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken }),
  });
}
```

#### 访问受保护的业务 API

```typescript
async function fetchProtectedApi(accessToken: string) {
  const res = await fetch('http://app.localhost/api/your-endpoint', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  if (res.status === 401) {
    // Token 无效或已过期，需要重新登录
    throw new Error('认证失败');
  }

  return await res.json();
}
```

### cURL 示例

```bash
# 密码登录
curl -X POST http://auth.localhost/auth/password \
  -H "Content-Type: application/json" \
  -d '{"mode":"login","username":"testuser","password":"yourpassword"}'

# 注册
curl -X POST http://auth.localhost/auth/password \
  -H "Content-Type: application/json" \
  -d '{"mode":"register","username":"newuser","email":"new@email.com","password":"yourpassword"}'

# 发送短信验证码
curl -X POST http://auth.localhost/auth/sms/send \
  -H "Content-Type: application/json" \
  -d '{"phone":"+8613800138000"}'

# 短信验证码登录
curl -X POST http://auth.localhost/auth/sms/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+8613800138000","code":"123456","otpId":"returned-otp-id"}'

# 获取当前用户信息
curl http://auth.localhost/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# 登出
curl -X POST http://auth.localhost/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"access_token":"YOUR_ACCESS_TOKEN","refresh_token":"YOUR_REFRESH_TOKEN"}'

# 健康检查
curl http://auth.localhost/healthz
```

---

## 环境变量配置

部署时需要配置以下环境变量：

### 服务基础配置

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `HOST` | `0.0.0.0` | 服务监听地址 |
| `PORT` | `3000` | 服务监听端口 |
| `LOG_LEVEL` | `info` | 日志级别 |
| `NODE_ENV` | — | 设为 `production` 时禁用日志美化 |

### Zitadel 配置

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `ZITADEL_ISSUER` | — | Zitadel 外部访问地址（用于 Token 签发验证） |
| `ZITADEL_INTERNAL_ISSUER` | 同 `ZITADEL_ISSUER` | Zitadel 容器内部地址（用于服务端 API 调用） |
| `ZITADEL_CLIENT_ID` | — | Zitadel OIDC Client ID |
| `ZITADEL_SERVICE_PAT` | — | Zitadel 服务账号 Personal Access Token |
| `ZITADEL_SERVICE_PAT_FILE` | — | PAT 文件路径（与 `ZITADEL_SERVICE_PAT` 二选一） |
| `ZITADEL_LOGIN_REDIRECT_URI` | `http://auth-service:3000/auth/callback` | OIDC 回调地址 |
| `ZITADEL_ORG_ID` | — | Zitadel 组织 ID（设置后用户将创建到该组织下） |
| `ZITADEL_PROJECT_ID` | — | Zitadel 项目 ID（用于角色管理） |
| `ZITADEL_DEFAULT_ROLE_KEY` | `EduClaw` | 新注册用户默认角色 |

### 阿里云短信配置

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `ALIYUN_ACCESS_KEY_ID` | — | 阿里云 AccessKey ID |
| `ALIYUN_ACCESS_KEY_SECRET` | — | 阿里云 AccessKey Secret |
| `ALIYUN_SMS_SIGN_NAME` | — | 短信签名名称 |
| `ALIYUN_SMS_TEMPLATE_CODE` | — | 短信模板编码（模板需包含 `${code}` 变量） |

### 邀请码配置

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `INVITE_CODES` | — | 有效的邀请码列表（逗号分隔） |
| `INVITE_REQUIRED` | `false` | 是否开启邀请码验证 |

---

## 快速接入检查清单

### 前端接入

- [ ] 确认网关地址可达（本地 `http://auth.localhost`）
- [ ] 实现登录页面（密码 或 短信验证码方式）
- [ ] 实现注册页面（可选，支持邀请码）
- [ ] 安全存储 Token（建议 httpOnly Cookie 或内存，避免 localStorage）
- [ ] 在业务 API 请求中携带 `Authorization: Bearer <access_token>` 头
- [ ] 处理 401 响应，引导用户重新登录
- [ ] 实现登出功能，调用 `/auth/logout` 注销 Token
- [ ] 使用 `GET /auth/me` 获取当前用户信息和角色
- [ ] 使用 `GET /healthz` 检查服务可用性

### 后端接入

- [ ] 从 Kong 注入的 `X-User-Id`、`X-User-Username`、`X-User-Email` 头获取用户身份
- [ ] 不要自行验证 JWT，Kong 已完成验证
- [ ] 处理用户不存在的情况（Kong 注入了 ID 但用户已被删除）

### 跨域接入（不同域名的业务服务）

- [ ] 从 URL hash `#token=...` 提取 Token 并存入 localStorage
- [ ] 登出后跳转到 `http://auth.localhost/login?logout=1` 清除 Token
- [ ] 登录后回跳使用 `http://auth.localhost/login?returnTo=<encoded-url>`
- [ ] 在 `kong/kong.yml` 中添加业务服务的路由规则
