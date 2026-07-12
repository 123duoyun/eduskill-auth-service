export interface SandboxStatus {
  status: 'initializing' | 'allocating' | 'starting' | 'ready' | 'failed'
  progress: number
  message: string
  sandboxId?: string
  serviceUrl?: string
  diagnostics?: string[]
}

export type InnoAgentAction = 'StartInnoAgent' | 'StopInnoAgent' | 'ExtendSandboxTTL'

export interface InnoAgentRequest<Action extends InnoAgentAction = InnoAgentAction> {
  Action: Action
  RequestUUID: string
  UserID: string
}

export interface InnoAgentResponse<Action extends InnoAgentAction = InnoAgentAction> {
  Action: Action
  RetCode: number
  Message: string
}

export type StartInnoAgentRequest = InnoAgentRequest<'StartInnoAgent'>

export interface StartInnoAgentResponse extends InnoAgentResponse<'StartInnoAgent'> {
  InnoAgentID: string
}

export type StopInnoAgentRequest = InnoAgentRequest<'StopInnoAgent'>
export type StopInnoAgentResponse = InnoAgentResponse<'StopInnoAgent'>

export type ExtendSandboxTTLRequest = InnoAgentRequest<'ExtendSandboxTTL'>
export type ExtendSandboxTTLResponse = InnoAgentResponse<'ExtendSandboxTTL'>
