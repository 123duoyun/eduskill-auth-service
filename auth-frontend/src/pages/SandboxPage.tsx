import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { useAuthI18n } from '@/i18n/auth-i18n'
import { useAuthStore } from '@/stores/auth'
import { startSandbox, stopSandbox, extendSandboxTTL } from '@/api/sandbox'
import { UserPanel } from '@/components/UserPanel'
import type { SandboxStatus } from '@/types/sandbox'

type Phase = 'loading' | 'ready' | 'failed'

export function SandboxPage() {
  const { t } = useAuthI18n()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const userId = user?.id

  const [phase, setPhase] = useState<Phase>('loading')
  const [sandboxUrl, setSandboxUrl] = useState<string | undefined>()
  const [errorMsg, setErrorMsg] = useState('')
  const [disconnecting, setDisconnecting] = useState(false)

  const isMountedRef = useRef(true)

  // ─── 启动沙箱 ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return
    isMountedRef.current = true

    const FALLBACK_URL = 'http://localhost:3000/'

    startSandbox(userId)
      .then((status: SandboxStatus) => {
        if (!isMountedRef.current) return
        if (status.sandboxId && status.serviceUrl) {
          setSandboxUrl(status.serviceUrl)
        } else {
          setSandboxUrl(FALLBACK_URL)
        }
        setPhase('ready')
      })
      .catch((err: unknown) => {
        if (!isMountedRef.current) return
        setErrorMsg(err instanceof Error ? err.message : t('sandbox.startFailed'))
        setSandboxUrl(FALLBACK_URL)
        setPhase('ready')
      })

    return () => {
      isMountedRef.current = false
    }
  }, [userId, t])

  // ─── TTL 心跳 ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'ready' || !userId) return

    const id = window.setInterval(() => {
      extendSandboxTTL(userId).catch(() => {
        // 心跳失败不中断使用
      })
    }, 60_000)

    return () => window.clearInterval(id)
  }, [phase, userId])

  // ─── 断开连接 ─────────────────────────────────────────────────────────────
  const handleDisconnect = useCallback(async () => {
    setDisconnecting(true)
    try {
      if (userId) {
        await stopSandbox(userId)
      }
    } catch {
      // 即使停止失败也返回
    } finally {
      await useAuthStore.getState().logout()
      navigate('/login', { replace: true })
    }
  }, [userId, navigate])

  // ─── 加载中 ───────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-primary" />
          <p className="text-sm font-medium text-muted-foreground">{t('sandbox.loading')}</p>
        </div>
      </div>
    )
  }

  // ─── 启动失败（测试环境降级展示沙箱，不阻塞进入）────────────────────────────
  if (phase === 'failed') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex max-w-[360px] flex-col items-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-destructive/30">
            <span className="text-xl font-bold text-destructive">!</span>
          </div>
          <p className="text-base font-semibold text-foreground">{errorMsg || t('sandbox.startFailed')}</p>
          <button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            className="mt-2 rounded-full border border-border px-6 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent"
          >
            {t('sandbox.backToLogin')}
          </button>
        </div>
      </div>
    )
  }

  // ─── 沙箱工作区 ───────────────────────────────────────────────────────────
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      {/* 全屏 iframe（沙箱失败时降级加载 localhost:3000） */}
      <iframe
        title="Inno Agent Sandbox"
        src={sandboxUrl}
        className="h-full w-full border-0"
        allow="clipboard-read; clipboard-write; fullscreen"
      />

      <UserPanel user={user} onDisconnect={handleDisconnect} disconnecting={disconnecting} />
    </div>
  )
}
