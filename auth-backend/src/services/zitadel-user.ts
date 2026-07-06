import { config } from '../config.js';

export interface ZitadelUser {
  id: string;
  username: string;
  email?: string;
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
  };
  details?: {
    creationDate?: string;
  };
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
