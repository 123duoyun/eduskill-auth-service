import { apiFetch } from './client'
import type {
  InnoAgentAction,
  InnoAgentRequest,
  InnoAgentResponse,
  SandboxStatus,
  StartInnoAgentResponse,
  StopInnoAgentResponse,
  ExtendSandboxTTLResponse,
} from '@/types/sandbox'

const WORKSPACE_URL_TEMPLATE =
  import.meta.env.VITE_SANDBOX_WORKSPACE_URL_TEMPLATE ?? 'http://sandbox.innoagent.tech/sandbox/{sandboxId}'

/** 请求去重：同一 userId 的并发 start 请求复用同一个 Promise */
const startRequests = new Map<string, Promise<SandboxStatus>>()

function createRequestUUID(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function buildWorkspaceUrl(sandboxId: string): string | undefined {
  if (!WORKSPACE_URL_TEMPLATE) return undefined

  const url = WORKSPACE_URL_TEMPLATE.includes('{sandboxId}')
    ? WORKSPACE_URL_TEMPLATE.replaceAll('{sandboxId}', encodeURIComponent(sandboxId))
    : `${WORKSPACE_URL_TEMPLATE.replace(/\/$/, '')}/${encodeURIComponent(sandboxId)}`

  return url.endsWith('/') ? url : `${url}/`
}

function createPayload<Action extends InnoAgentAction>(
  action: Action,
  userId: string,
): InnoAgentRequest<Action> {
  return {
    Action: action,
    RequestUUID: createRequestUUID(),
    UserID: userId,
  } as InnoAgentRequest<Action>
}

async function requestInnoAgent<Action extends InnoAgentAction>(
  payload: InnoAgentRequest<Action>,
): Promise<InnoAgentResponse<Action>> {
  const res = await apiFetch('/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  let data: Partial<InnoAgentResponse<Action>> | null = null
  try {
    data = await res.json()
  } catch {
    data = null
  }

  if (!res.ok) {
    throw new Error(data?.Message || `请求失败: ${payload.Action}`)
  }

  if (data?.Action !== payload.Action) {
    throw new Error(`意外的响应类型: 期望 ${payload.Action}，收到 ${data?.Action}`)
  }

  if (typeof data.RetCode !== 'number') {
    throw new Error('响应缺少 RetCode')
  }

  if (data.RetCode !== 0) {
    throw new Error(data.Message || `请求失败: ${payload.Action}`)
  }

  return data as InnoAgentResponse<Action>
}

async function requestStartSandbox(userId: string): Promise<SandboxStatus> {
  const payload = createPayload('StartInnoAgent', userId)
  const data = (await requestInnoAgent(payload)) as StartInnoAgentResponse

  if (typeof data.InnoAgentID !== 'string' || !data.InnoAgentID) {
    throw new Error('启动沙箱成功但未返回沙箱 ID')
  }

  return {
    status: 'ready',
    progress: 100,
    message: data.Message || '沙箱启动成功',
    sandboxId: data.InnoAgentID,
    serviceUrl: buildWorkspaceUrl(data.InnoAgentID),
    diagnostics: [
      `StartInnoAgent completed with request ${payload.RequestUUID}`,
      `Sandbox ID assigned: ${data.InnoAgentID}`,
    ],
  }
}

/** 启动沙箱（带请求去重） */
export function startSandbox(userId: string): Promise<SandboxStatus> {
  const existing = startRequests.get(userId)
  if (existing) return existing

  const request = requestStartSandbox(userId).finally(() => {
    startRequests.delete(userId)
  })

  startRequests.set(userId, request)
  return request
}

/** 停止沙箱 */
export async function stopSandbox(userId: string): Promise<StopInnoAgentResponse> {
  const payload = createPayload('StopInnoAgent', userId)
  return requestInnoAgent(payload) as Promise<StopInnoAgentResponse>
}

/** 续期沙箱 TTL */
export async function extendSandboxTTL(userId: string): Promise<ExtendSandboxTTLResponse> {
  const payload = createPayload('ExtendSandboxTTL', userId)
  return requestInnoAgent(payload) as Promise<ExtendSandboxTTLResponse>
}
