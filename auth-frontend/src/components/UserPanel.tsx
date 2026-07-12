import { useCallback, useEffect, useRef, useState } from 'react'
import { CircleAlert, ChevronRight, GraduationCap, LogOut, User } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { useNavigate } from 'react-router'
import { useAuthI18n } from '@/i18n/auth-i18n'
import type { AuthUser } from '@/api/auth'

interface UserPanelProps {
  user: AuthUser | null
  onDisconnect: () => void
  disconnecting: boolean
}

export function UserPanel({ user, onDisconnect, disconnecting }: UserPanelProps) {
  const { t } = useAuthI18n()
  const navigate = useNavigate()
  const [showPanel, setShowPanel] = useState(false)
  const disconnectingRef = useRef(false)

  // Keep ref in sync so the postMessage handler always sees the latest value
  disconnectingRef.current = disconnecting

  const displayName = user?.username || t('common.user')
  const avatarInitial = displayName.charAt(0).toUpperCase()

  const handleDisconnect = useCallback(() => {
    if (disconnectingRef.current) return
    onDisconnect()
  }, [onDisconnect])

  // Listen for postMessage from iframe (logout button)
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data === 'iframe-logout') {
        handleDisconnect()
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [handleDisconnect])

  return (
    <DropdownMenu.Root open={showPanel} onOpenChange={setShowPanel}>
      {/* Floating button — bottom-left */}
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          onClick={() => setShowPanel((v) => !v)}
          onPointerDown={(e) => e.preventDefault()}
          className="fixed bottom-4 left-4 z-50 flex h-14 max-w-[220px] cursor-pointer items-center gap-2 overflow-hidden rounded-lg px-3 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground"
          title={t('sandbox.userMenu')}
        >
          <span className="flex size-8 shrink-0 overflow-hidden rounded-full">
            <span className="flex size-full items-center justify-center bg-primary text-xs font-semibold text-primary-foreground">
              {avatarInitial}
            </span>
          </span>
          <span className="truncate text-sm font-medium text-[#5d6078]">
            {displayName}
          </span>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content
          side="top"
          align="start"
          sideOffset={8}
          className="z-50 w-50 overflow-hidden rounded-xl border border-[#dce1ff] bg-white px-3.5 py-3 text-[#5d6078] shadow-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 max-md:-translate-x-14"
        >
          <div className="flex flex-col gap-1.5">
            <DropdownMenu.Item
              onSelect={() => navigate('/sandbox/account')}
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-[#f0f1ff] focus:bg-[#f0f1ff] outline-hidden focus:outline-hidden"
            >
              <User className="size-4 shrink-0" strokeWidth={2} />
              {t('sandbox.accountSettings')}
            </DropdownMenu.Item>

            <DropdownMenu.Item
              onSelect={() => window.location.href = 'https://innospark.aiecnu.cn/'}
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-[#f0f1ff] focus:bg-[#f0f1ff] outline-hidden focus:outline-hidden"
            >
              <GraduationCap className="size-4 shrink-0" strokeWidth={2} />
              {t('sandbox.officialSite')}
            </DropdownMenu.Item>

            <DropdownMenu.Sub>
              <DropdownMenu.SubTrigger className="focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-hidden select-none gap-2">
                <CircleAlert className="size-4 shrink-0" strokeWidth={2} />
                {t('sandbox.aboutInnospark')}
                <ChevronRight className="ml-auto size-4" strokeWidth={2} />
              </DropdownMenu.SubTrigger>
              <DropdownMenu.Portal>
                <DropdownMenu.SubContent
                  sideOffset={8}
                  alignOffset={-4}
                  className="bg-white text-[#5d6078] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-32 origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden rounded-xl border border-[#dce1ff] px-4 py-2 shadow-none ml-4 w-50 space-y-2 md:mb-1 md:px-4 md:py-2 max-md:mb-3"
                >
                  <DropdownMenu.Item className="relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none hover:bg-[#f0f1ff] focus:bg-[#f0f1ff] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
                    {t('sandbox.aboutContact')}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item className="relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none hover:bg-[#f0f1ff] focus:bg-[#f0f1ff] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
                    {t('sandbox.aboutTerms')}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item className="relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none hover:bg-[#f0f1ff] focus:bg-[#f0f1ff] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
                    {t('sandbox.aboutPrivacy')}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item className="relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none hover:bg-[#f0f1ff] focus:bg-[#f0f1ff] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
                    {t('sandbox.aboutComplaint')}
                  </DropdownMenu.Item>

                  <div className="mx-auto my-2 h-px w-11/12 bg-[#e7e9f7]" />

                  <div className="space-y-2 px-2 py-1">
                    <p className="text-xs text-[#5d6078]">沪ICP备2021037901号-1</p>
                    <div className="mx-auto my-2 h-px w-11/12 bg-[#e7e9f7]" />
                    <p className="text-xs text-[#5d6078]">Shanghai-QiChuangInnoSpark-202601200116</p>
                  </div>
                </DropdownMenu.SubContent>
              </DropdownMenu.Portal>
            </DropdownMenu.Sub>
          </div>

          <DropdownMenu.Separator className="bg-border -mx-1 my-1 h-px mx-1" />

          <DropdownMenu.Item
            onSelect={handleDisconnect}
            disabled={disconnecting}
            className="data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-red-50 focus:text-red-600 relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-red-600 outline-hidden select-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <LogOut className="size-4 shrink-0" strokeWidth={2} />
            {disconnecting ? t('sandbox.disconnecting') : t('sandbox.logoutMenuItem')}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}