import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router'
import { useAuthI18n } from '@/i18n/auth-i18n'
import { useAuthStore } from '@/stores/auth'

export function AccountSettingsPage() {
  const { t } = useAuthI18n()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const displayName = user?.username || t('common.user')

  return (
    <div className="h-full min-h-dvh w-full bg-white">
      <div className="mx-auto h-full w-full max-w-[1296px] overflow-y-auto px-5 py-5 sm:px-10 sm:py-8 md:px-16 md:py-10">
        <div className="flex min-h-[calc(100dvh-6rem)] flex-col justify-start py-2 text-[#15152f] sm:justify-center sm:py-0">
        <div className="mx-auto w-full max-w-[1000px]">
          {/* ── 导航栏 ── */}
          <nav className="mb-6 flex items-center gap-2 sm:mb-12">
            <button
              type="button"
              onClick={() => navigate('/sandbox')}
              className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-sm font-medium outline-none transition-all hover:bg-gray-100 hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 -ml-2 sm:-ml-9"
            >
              <ChevronLeft className="size-6" strokeWidth={3} />
            </button>
            <h2 className="text-base font-semibold sm:text-lg">{t('account.pageTitle')}</h2>
          </nav>

          {/* ── 设置项列表 ── */}
          <div className="divide-y divide-[#eceefa] border-b border-[#eceefa] [&_section]:min-h-20 [&_section]:gap-2 [&_section]:py-3 [&_section_h3]:text-base [&_section_p]:text-sm sm:[&_section]:min-h-24 sm:[&_section]:gap-4 sm:[&_section]:py-4 sm:[&_section_h3]:text-base sm:[&_section_p]:text-sm">
            {/* 用户名 */}
            <section className="flex min-h-24 items-center justify-between gap-4 py-4">
              <div>
                <h3 className="text-base font-semibold">{t('account.username')}</h3>
                <p className="mt-2 text-sm text-[#858597]">{displayName}</p>
              </div>
              <button
                type="button"
                className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border bg-white px-3 text-xs font-medium shadow-xs outline-none transition-all hover:bg-gray-100 hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:h-10 sm:px-6 sm:text-sm"
              >
                {t('account.editName')}
              </button>
            </section>

            {/* 学校 */}
            <section className="flex min-h-24 items-center justify-between gap-4 py-4">
              <div>
                <h3 className="text-base font-semibold">{t('account.school')}</h3>
                <p className="mt-2 text-sm text-[#858597]">—</p>
              </div>
              <button
                type="button"
                className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border bg-white px-3 text-xs font-medium shadow-xs outline-none transition-all hover:bg-gray-100 hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:h-10 sm:px-6 sm:text-sm"
              >
                {t('account.editSchool')}
              </button>
            </section>

            {/* 地区信息 */}
            <section className="flex min-h-24 items-center justify-between gap-4 py-4">
              <div>
                <h3 className="text-base font-semibold">{t('account.region')}</h3>
                <p className="mt-2 text-sm text-[#858597]">—</p>
              </div>
              <button
                type="button"
                className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border bg-white px-3 text-xs font-medium shadow-xs outline-none transition-all hover:bg-gray-100 hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:h-10 sm:px-6 sm:text-sm"
              >
                {t('account.editRegion')}
              </button>
            </section>

            {/* 更改密码 */}
            <section className="flex min-h-24 items-center justify-between gap-4 py-4">
              <div>
                <h3 className="text-base font-semibold">{t('account.changePassword')}</h3>
                <p className="mt-2 text-sm text-[#858597]">{t('account.changePasswordDesc')}</p>
              </div>
              <button
                type="button"
                className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border bg-white px-3 text-xs font-medium shadow-xs outline-none transition-all hover:bg-gray-100 hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:h-10 sm:px-6 sm:text-sm"
              >
                {t('account.changePasswordBtn')}
              </button>
            </section>
          </div>
          </div>
        </div>
      </div>
    </div>
  )
}