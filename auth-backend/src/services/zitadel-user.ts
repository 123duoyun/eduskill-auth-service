import { config } from '../config.js';

export interface RegionInfo {
  country: string;
  province: string;
  city: string;
  district: string;
}

export interface ZitadelUser {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  school?: string;
  region?: RegionInfo | null;
  created_at: string;
  roles?: string[];
}

interface ZitadelHumanUser {
  userId?: string;
  username?: string;
  preferredLoginName?: string;
  loginNames?: string[];
  human?: {
    email?: {
      email?: string;
      isVerified?: boolean;
    };
    phone?: {
      phone?: string;
      isVerified?: boolean;
    };
  };
  details?: {
    creationDate?: string;
  };
}

interface ZitadelMetadataResult {
  result?: Array<{ key: string; value: string }>;
}

function issuer(): string {
  return config.zitadelInternalIssuer.replace(/\/+$/, '');
}

function pat(): string {
  if (!config.zitadelServicePat) {
    throw new Error('ZITADEL_SERVICE_PAT_FILE is not configured or file cannot be read');
  }
  return config.zitadelServicePat;
}

function orgHeader(): Record<string, string> {
  return config.zitadelOrgId ? { 'x-zitadel-orgid': config.zitadelOrgId } : {};
}

function mapUser(u: ZitadelHumanUser): ZitadelUser | undefined {
  const id = u.userId;
  if (!id) return undefined;
  return {
    id,
    username: u.username || u.preferredLoginName || u.human?.email?.email || u.loginNames?.[0] || id,
    email: u.human?.email?.email,
    phone: u.human?.phone?.phone,
    created_at: u.details?.creationDate || new Date(0).toISOString(),
  };
}

export async function findById(id: string): Promise<ZitadelUser | undefined> {
  if (!id) return undefined;
  const res = await fetch(`${issuer()}/v2/users/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${pat()}` },
  });
  if (res.status === 404) return undefined;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zitadel findById failed (${res.status}): ${text}`);
  }
  const json = (await res.json()) as { user?: ZitadelHumanUser };
  return json.user ? mapUser(json.user) : undefined;
}

export async function searchUsers(queries: unknown[]): Promise<ZitadelHumanUser[]> {
  const body: Record<string, unknown> = { queries };
  if (config.zitadelOrgId) {
    body.organization = { orgId: config.zitadelOrgId };
  }
  const res = await fetch(`${issuer()}/v2/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${pat()}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { result?: ZitadelHumanUser[] };
  return data.result ?? [];
}

export async function listAllUsers(): Promise<ZitadelUser[]> {
  const users: ZitadelUser[] = [];
  const pageSize = 100;
  let offset = 0;
  while (true) {
    const body: Record<string, unknown> = {
      query: { offset: String(offset), limit: pageSize, asc: true },
    };
    if (config.zitadelOrgId) {
      body.organization = { orgId: config.zitadelOrgId };
    }
    const res = await fetch(`${issuer()}/v2/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pat()}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Zitadel listAllUsers failed (${res.status}): ${text}`);
    }
    const json = (await res.json()) as { result?: ZitadelHumanUser[] };
    const batch = json.result ?? [];
    for (const u of batch) {
      const mapped = mapUser(u);
      if (mapped) users.push(mapped);
    }
    if (batch.length < pageSize) break;
    offset += batch.length;
  }
  return users;
}

export async function assignUserRole(userId: string, roleKey: string): Promise<void> {
  const projectId = config.zitadelProjectId;
  if (!projectId) {
    throw new Error('ZITADEL_PROJECT_ID is not configured');
  }
  const res = await fetch(`${issuer()}/management/v1/users/${encodeURIComponent(userId)}/grants`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${pat()}`,
      ...orgHeader(),
    },
    body: JSON.stringify({
      projectId,
      roleKeys: [roleKey],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zitadel assignUserRole failed (${res.status}): ${text}`);
  }
}

interface UserGrantResult {
  result?: Array<{ roleKeys?: string[] }>;
}

export async function getUserRoles(userId: string): Promise<string[]> {
  const projectId = config.zitadelProjectId;
  if (!projectId) return [];
  const res = await fetch(`${issuer()}/management/v1/users/grants/_search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${pat()}`,
      ...orgHeader(),
    },
    body: JSON.stringify({
      queries: [
        { userIdQuery: { userId } },
        { projectIdQuery: { projectId } },
      ],
    }),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as UserGrantResult;
  const roles: string[] = [];
  for (const grant of data.result ?? []) {
    for (const role of grant.roleKeys ?? []) {
      if (!roles.includes(role)) roles.push(role);
    }
  }
  return roles;
}

/**
 * 触发 ZITADEL 发送密码重置邮件
 * 调用后 ZITADEL 会向用户已验证的邮箱发送一封包含重置链接的邮件
 */
export async function sendPasswordReset(userId: string): Promise<void> {
  const res = await fetch(`${issuer()}/v2/users/${encodeURIComponent(userId)}/password/reset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${pat()}`,
    },
    body: JSON.stringify({ sendPasswordReset: {} }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zitadel sendPasswordReset failed (${res.status}): ${text}`);
  }
}

/**
 * 触发 ZITADEL 发送邮箱验证邮件
 * 注册后调用，ZITADEL 会向用户邮箱发送一封包含验证链接的邮件
 */
export async function sendEmailVerification(userId: string): Promise<void> {
  const res = await fetch(`${issuer()}/v2/users/${encodeURIComponent(userId)}/email/verification`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${pat()}`,
    },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zitadel sendEmailVerification failed (${res.status}): ${text}`);
  }
}

/**
 * 查询用户邮箱验证状态
 * 通过 ZITADEL GET /v2/users/{userId} 获取用户详情中的 isVerified 字段
 */
export async function isEmailVerified(userId: string): Promise<boolean> {
  const res = await fetch(`${issuer()}/v2/users/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${pat()}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zitadel getUser failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as { user?: ZitadelHumanUser };
  return json.user?.human?.email?.isVerified === true;
}

// ─── 用户信息更新 ─────────────────────────────────────────────────────────────

/**
 * 更新用户名(ZITADEL management v1 PUT /management/v1/users/{userId}/username)
 */
export async function updateUsername(userId: string, username: string): Promise<void> {
  const res = await fetch(
    `${issuer()}/management/v1/users/${encodeURIComponent(userId)}/username`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pat()}`,
        ...orgHeader(),
      },
      body: JSON.stringify({ userName: username }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    const normalized = text.toLowerCase();
    if (isDuplicateUsernameError(normalized)) {
      throw new Error('该用户名已存在');
    }
    throw new Error(`Zitadel updateUsername failed (${res.status}): ${text}`);
  }
}

function isDuplicateUsernameError(message: string): boolean {
  return (
    (/username/.test(message) && (/already/.test(message) || /exists/.test(message) || /taken/.test(message))) ||
    /user already exists/.test(message)
  );
}

/**
 * 设置用户 metadata(ZITADEL management v1 POST /management/v1/users/{userId}/metadata/{key})
 * 用于存储 school、region 等自定义字段
 */
export async function setUserMetadata(userId: string, key: string, value: string): Promise<void> {
  const res = await fetch(
    `${issuer()}/management/v1/users/${encodeURIComponent(userId)}/metadata/${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pat()}`,
        ...orgHeader(),
      },
      body: JSON.stringify({ value: Buffer.from(value, 'utf-8').toString('base64') }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zitadel setUserMetadata(${key}) failed (${res.status}): ${text}`);
  }
}

/**
 * 批量查询用户 metadata(ZITADEL management v1 POST /management/v1/users/{userId}/metadata/_search)
 * 返回 key→value 的 Map(value 为 base64 解码后的 UTF-8 字符串)
 */
export async function getUserMetadata(userId: string): Promise<Record<string, string>> {
  const res = await fetch(
    `${issuer()}/management/v1/users/${encodeURIComponent(userId)}/metadata/_search`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pat()}`,
        ...orgHeader(),
      },
      body: JSON.stringify({ queries: [] }),
    },
  );

  if (!res.ok) {
    // 用户从未设置过任何 metadata 时,ZITADEL 可能返回 404 或空,这里按无 metadata 处理
    if (res.status === 404) return {};
    const text = await res.text();
    throw new Error(`Zitadel getUserMetadata failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as ZitadelMetadataResult;
  const result: Record<string, string> = {};
  for (const item of data.result ?? []) {
    try {
      result[item.key] = Buffer.from(item.value, 'base64').toString('utf-8');
    } catch {
      result[item.key] = item.value;
    }
  }
  return result;
}

/**
 * 管理员设置用户密码(ZITADEL v2 POST /v2/users/{userId}/password)
 * 使用 PAT 走管理员权限,无需旧密码。用于手机验证码改密流程
 */
export async function setPassword(userId: string, newPassword: string): Promise<void> {
  const res = await fetch(`${issuer()}/v2/users/${encodeURIComponent(userId)}/password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${pat()}`,
    },
    body: JSON.stringify({
      newPassword: { password: newPassword, changeRequired: false },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    const normalized = text.toLowerCase();
    if (/complexity|weak|too short|invalid password/i.test(normalized)) {
      throw new Error('密码不满足复杂度要求');
    }
    throw new Error(`Zitadel setPassword failed (${res.status}): ${text}`);
  }
}
