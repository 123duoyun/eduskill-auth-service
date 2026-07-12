import { X, ChevronLeft, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Dialog as D } from 'radix-ui'
import { useAuthI18n } from '@/i18n/auth-i18n'
import { useAuthStore } from '@/stores/auth'
import { getCountries, getProvinces, getCities, getDistricts } from '@/data/regions'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select'
import * as authApi from '@/api/auth'
import type { RegionInfo } from '@/api/auth'

function maskPhone(phone: string): string {
  if (!phone) return ''
  // +8613800138000 → +86 138****8000
  const match = phone.match(/^(\+\d{1,3})(\d{3})(\d{4})(\d{4})$/)
  if (match) return `${match[1]} ${match[2]}****${match[4]}`
  if (phone.length >= 7) return `${phone.slice(0, 3)}****${phone.slice(-4)}`
  return phone
}

function formatRegion(r?: RegionInfo | null): string {
  if (!r) return '—'
  const parts = [r.country, r.province, r.city, r.district].filter(Boolean)
  return parts.length > 0 ? parts.join(' / ') : '—'
}

export function AccountSettingsPage() {
  const { t } = useAuthI18n()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const checkAuth = useAuthStore((s) => s.checkAuth)

  const displayName = user?.username || t('common.user')
  const displaySchool = user?.school || '—'
  const displayRegion = formatRegion(user?.region)
  const phoneBoundText = user?.phone
    ? t('account.phoneBound').replace('{phone}', maskPhone(user.phone))
    : t('account.changePasswordDesc')

  // Name dialog state
  const [nameDialogOpen, setNameDialogOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [nameSubmitting, setNameSubmitting] = useState(false)
  const [nameError, setNameError] = useState('')

  // Region dialog state
  const [regionDialogOpen, setRegionDialogOpen] = useState(false)
  const [country, setCountry] = useState('CN')
  const [province, setProvince] = useState('')
  const [city, setCity] = useState('')
  const [district, setDistrict] = useState('')
  const [regionSubmitting, setRegionSubmitting] = useState(false)
  const [regionError, setRegionError] = useState('')

  // School dialog state
  const [schoolDialogOpen, setSchoolDialogOpen] = useState(false)
  const [schoolName, setSchoolName] = useState('')
  const [schoolSubmitting, setSchoolSubmitting] = useState(false)
  const [schoolError, setSchoolError] = useState('')

  // Change password dialog state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [passwordPhone, setPasswordPhone] = useState('')
  const [passwordCode, setPasswordCode] = useState('')
  const [passwordOtpId, setPasswordOtpId] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSending, setPasswordSending] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [sendCodeCountdown, setSendCodeCountdown] = useState(0)

  const countries = getCountries()
  const provinces = getProvinces(country)
  const cities = getCities(province)
  const districts = getDistricts(province, city)

  const handleCountryChange = (value: string) => {
    setCountry(value)
    setProvince('')
    setCity('')
    setDistrict('')
  }

  const handleProvinceChange = (value: string) => {
    setProvince(value)
    setCity('')
    setDistrict('')
  }

  const handleCityChange = (value: string) => {
    setCity(value)
    setDistrict('')
  }

  const handleConfirm = async () => {
    setRegionError('')
    if (!country) {
      setRegionError(t('auth.validation.required'))
      return
    }
    if (country === 'CN' && !province) {
      setRegionError(t('auth.validation.required'))
      return
    }
    setRegionSubmitting(true)
    try {
      const region: RegionInfo = { country, province, city, district }
      await authApi.updateRegion(region)
      await checkAuth()
      setRegionDialogOpen(false)
    } catch (err: any) {
      setRegionError(err?.message || t('common.operationFailed'))
    } finally {
      setRegionSubmitting(false)
    }
  }

  const openRegionDialog = () => {
    // 预填当前值
    setCountry(user?.region?.country || 'CN')
    setProvince(user?.region?.province || '')
    setCity(user?.region?.city || '')
    setDistrict(user?.region?.district || '')
    setRegionError('')
    setRegionDialogOpen(true)
  }

  const openSchoolDialog = () => {
    setSchoolName(user?.school || '')
    setSchoolError('')
    setSchoolDialogOpen(true)
  }

  const handleSchoolConfirm = async () => {
    setSchoolError('')
    if (!schoolName.trim()) {
      setSchoolError(t('account.schoolPlaceholder'))
      return
    }
    setSchoolSubmitting(true)
    try {
      await authApi.updateSchool(schoolName.trim())
      await checkAuth()
      setSchoolDialogOpen(false)
    } catch (err: any) {
      setSchoolError(err?.message || t('common.operationFailed'))
    } finally {
      setSchoolSubmitting(false)
    }
  }

  const openNameDialog = () => {
    setEditName(user?.username || '')
    setNameError('')
    setNameDialogOpen(true)
  }

  const handleNameConfirm = async () => {
    setNameError('')
    if (!editName.trim()) {
      setNameError(t('auth.validation.usernameRequired'))
      return
    }
    if (editName.trim() === user?.username) {
      setNameDialogOpen(false)
      return
    }
    setNameSubmitting(true)
    try {
      await authApi.updateUsername(editName.trim())
      await checkAuth()
      setNameDialogOpen(false)
    } catch (err: any) {
      setNameError(err?.message || t('common.operationFailed'))
    } finally {
      setNameSubmitting(false)
    }
  }

  const openPasswordDialog = () => {
    setPasswordPhone('')
    setPasswordCode('')
    setPasswordOtpId('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordError('')
    setPasswordSuccess('')
    setSendCodeCountdown(0)
    setPasswordDialogOpen(true)
  }

  const handleSendCode = async () => {
    setPasswordError('')
    if (!passwordPhone) {
      setPasswordError(t('auth.validation.phoneRequired'))
      return
    }
    setPasswordSending(true)
    try {
      const otpId = await authApi.sendSmsCode(passwordPhone)
      setPasswordOtpId(otpId)
      // 启动 60s 倒计时
      setSendCodeCountdown(60)
      const timer = setInterval(() => {
        setSendCodeCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err: any) {
      setPasswordError(err?.message || t('auth.validation.sendCodeFailed'))
    } finally {
      setPasswordSending(false)
    }
  }

  const handlePasswordNext = async () => {
    setPasswordError('')
    if (!passwordPhone || !passwordCode || !passwordOtpId) {
      setPasswordError(t('auth.validation.smsCodeRequired'))
      return
    }
    if (!newPassword) {
      setPasswordError(t('auth.validation.passwordRequired'))
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('auth.validation.passwordMismatch'))
      return
    }
    setPasswordLoading(true)
    try {
      await authApi.changePassword(passwordPhone, passwordCode, passwordOtpId, newPassword)
      setPasswordSuccess(t('account.changePasswordSuccess'))
      // 2 秒后关闭弹窗
      setTimeout(() => {
        setPasswordDialogOpen(false)
        setPasswordSuccess('')
      }, 1500)
    } catch (err: any) {
      setPasswordError(err?.message || t('common.operationFailed'))
    } finally {
      setPasswordLoading(false)
    }
  }

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
                onClick={openNameDialog}
                className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border bg-white px-3 text-xs font-medium shadow-xs outline-none transition-all hover:bg-gray-100 hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:h-10 sm:px-6 sm:text-sm"
              >
                {t('account.editName')}
              </button>
            </section>

            {/* 学校 */}
            <section className="flex min-h-24 items-center justify-between gap-4 py-4">
              <div>
                <h3 className="text-base font-semibold">{t('account.school')}</h3>
                <p className="mt-2 text-sm text-[#858597]">{displaySchool}</p>
              </div>
              <button
                type="button"
                onClick={openSchoolDialog}
                className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border bg-white px-3 text-xs font-medium shadow-xs outline-none transition-all hover:bg-gray-100 hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:h-10 sm:px-6 sm:text-sm"
              >
                {t('account.editSchool')}
              </button>
            </section>

            {/* 地区信息 */}
            <section className="flex min-h-24 items-center justify-between gap-4 py-4">
              <div>
                <h3 className="text-base font-semibold">{t('account.region')}</h3>
                <p className="mt-2 text-sm text-[#858597]">{displayRegion}</p>
              </div>
              <button
                type="button"
                onClick={openRegionDialog}
                className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border bg-white px-3 text-xs font-medium shadow-xs outline-none transition-all hover:bg-gray-100 hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:h-10 sm:px-6 sm:text-sm"
              >
                {t('account.editRegion')}
              </button>
            </section>

            {/* 更改密码 */}
            <section className="flex min-h-24 items-center justify-between gap-4 py-4">
              <div>
                <h3 className="text-base font-semibold">{t('account.changePassword')}</h3>
                <p className="mt-2 text-sm text-[#858597]">{phoneBoundText}</p>
              </div>
              <button
                type="button"
                onClick={openPasswordDialog}
                disabled={!user?.phone}
                className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border bg-white px-3 text-xs font-medium shadow-xs outline-none transition-all hover:bg-gray-100 hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:h-10 sm:px-6 sm:text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('account.changePasswordBtn')}
              </button>
            </section>
          </div>
          </div>
        </div>
      </div>

      {/* ── 编辑地区弹窗 ── */}
      <D.Dialog open={regionDialogOpen} onOpenChange={setRegionDialogOpen}>
        <D.DialogPortal>
          <D.DialogOverlay className="fixed inset-0 z-40 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
          <D.DialogContent
            data-slot="dialog-content"
            className="fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 bg-white p-6 text-sm text-popover-foreground ring-1 ring-foreground/5 duration-100 outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 gap-4 rounded-xl px-5 py-6 sm:gap-5 sm:max-w-[400px] sm:px-12 sm:py-10"
          >
            <D.DialogTitle className="font-heading text-lg font-semibold">
              {t('account.editRegionTitle')}
            </D.DialogTitle>

            <form
              className="flex-1 space-y-5"
              onSubmit={(e) => { e.preventDefault(); handleConfirm() }}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* 国家 */}
                <div className="block min-w-0">
                  <span className="mb-2 block text-sm">{t('account.country')}</span>
                  <Select value={country} onValueChange={handleCountryChange}>
                    <SelectTrigger className="h-10 w-full px-4 text-base">
                      {countries.find((c) => c.code === country)?.name || t('account.regionPlaceholder')}
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 省份 */}
                <div className="block min-w-0">
                  <span className="mb-2 block text-sm">{t('account.province')}</span>
                  <Select value={province} onValueChange={handleProvinceChange}>
                    <SelectTrigger className="h-10 w-full px-4 text-base">
                      {province || t('account.regionPlaceholder')}
                    </SelectTrigger>
                    <SelectContent>
                      {provinces.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 城市 */}
                <div className="block min-w-0">
                  <span className="mb-2 block text-sm">{t('account.city')}</span>
                  <Select value={city} onValueChange={handleCityChange} disabled={!province}>
                    <SelectTrigger className="h-10 w-full px-4 text-base">
                      {city || t('account.regionPlaceholder')}
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 区县 */}
                <div className="block min-w-0">
                  <span className="mb-2 block text-sm">{t('account.district')}</span>
                  <Select value={district} onValueChange={setDistrict} disabled={!city}>
                    <SelectTrigger className="h-10 w-full px-4 text-base">
                      {district || t('account.regionPlaceholder')}
                    </SelectTrigger>
                    <SelectContent>
                      {districts.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {regionError && (
                <p className="text-sm text-red-500">{regionError}</p>
              )}

              <button
                type="submit"
                data-slot="button"
                data-variant="default"
                disabled={regionSubmitting}
                className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-[#5758ff] px-4 py-2 text-base font-medium text-primary-foreground shadow-xs outline-none transition-all hover:bg-[#4d4ee6] disabled:pointer-events-none disabled:opacity-50"
              >
                {regionSubmitting ? t('common.loading') : t('account.confirm')}
              </button>
            </form>

            <D.DialogClose asChild>
              <button
                type="button"
                data-variant="ghost"
                className="absolute right-4 top-4 flex size-8 cursor-pointer items-center justify-center rounded-md text-sm font-medium outline-none transition-all hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:right-12 sm:top-10"
              >
                <X className="size-4" />
                <span className="sr-only">Close</span>
              </button>
            </D.DialogClose>
          </D.DialogContent>
        </D.DialogPortal>
      </D.Dialog>

      {/* ── 编辑学校弹窗 ── */}
      <D.Dialog open={schoolDialogOpen} onOpenChange={setSchoolDialogOpen}>
        <D.DialogPortal>
          <D.DialogOverlay className="fixed inset-0 z-40 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
          <D.DialogContent
            data-slot="dialog-content"
            className="fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 bg-white p-6 text-sm text-popover-foreground ring-1 ring-foreground/5 duration-100 outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 gap-4 rounded-xl px-5 py-6 sm:gap-5 sm:max-w-[400px] sm:px-12 sm:py-10"
          >
            <D.DialogTitle className="font-heading text-lg font-semibold">
              {t('account.editSchoolTitle')}
            </D.DialogTitle>

            <form
              className="flex-1 space-y-5"
              onSubmit={(e) => { e.preventDefault(); handleSchoolConfirm() }}
            >
              <div>
                <span className="mb-2 block text-sm">{t('account.schoolName')}</span>
                <Input
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder={t('account.schoolPlaceholder')}
                  className="h-10 w-full px-4 text-base"
                />
              </div>

              {schoolError && (
                <p className="text-sm text-red-500">{schoolError}</p>
              )}

              <button
                type="submit"
                data-slot="button"
                data-variant="default"
                disabled={schoolSubmitting}
                className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-[#5758ff] px-4 py-2 text-base font-medium text-primary-foreground shadow-xs outline-none transition-all hover:bg-[#4d4ee6] disabled:pointer-events-none disabled:opacity-50"
              >
                {schoolSubmitting ? t('common.loading') : t('account.confirm')}
              </button>
            </form>

            <D.DialogClose asChild>
              <button
                type="button"
                data-variant="ghost"
                className="absolute right-4 top-4 flex size-8 cursor-pointer items-center justify-center rounded-md text-sm font-medium outline-none transition-all hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:right-12 sm:top-10"
              >
                <X className="size-4" />
                <span className="sr-only">Close</span>
              </button>
            </D.DialogClose>
          </D.DialogContent>
        </D.DialogPortal>
      </D.Dialog>

      {/* ── 编辑用户名弹窗 ── */}
      <D.Dialog open={nameDialogOpen} onOpenChange={setNameDialogOpen}>
        <D.DialogPortal>
          <D.DialogOverlay className="fixed inset-0 z-40 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
          <D.DialogContent
            data-slot="dialog-content"
            className="fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 bg-white p-6 text-sm text-popover-foreground ring-1 ring-foreground/5 duration-100 outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 gap-4 rounded-xl px-5 py-6 sm:gap-5 sm:max-w-[400px] sm:px-12 sm:py-10"
          >
            <div data-slot="dialog-header" className="flex flex-col gap-2">
              <D.DialogTitle data-slot="dialog-title" className="font-heading text-lg font-semibold">
                {t('account.editNameTitle')}
              </D.DialogTitle>
            </div>

            <form
              className="flex-1 space-y-5"
              onSubmit={(e) => { e.preventDefault(); handleNameConfirm() }}
            >
              <div data-slot="form-item" className="grid gap-2">
                <label
                  data-slot="form-label"
                  className="mb-2 block text-sm font-normal text-[#15152f]"
                >
                  {t('account.editNameLabel')}
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder={t('account.editNamePlaceholder')}
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-4 py-1 text-base shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>

              {nameError && (
                <p className="text-sm text-red-500">{nameError}</p>
              )}

              <button
                type="submit"
                data-slot="button"
                data-variant="default"
                disabled={nameSubmitting}
                className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-[#5758ff] px-4 py-2 text-base font-medium text-primary-foreground shadow-xs outline-none transition-all hover:bg-[#4d4ee6] disabled:pointer-events-none disabled:opacity-50"
              >
                {nameSubmitting ? t('common.loading') : t('account.confirm')}
              </button>
            </form>

            <D.DialogClose asChild>
              <button
                type="button"
                data-variant="ghost"
                className="absolute right-4 top-4 flex size-8 cursor-pointer items-center justify-center rounded-md text-sm font-medium outline-none transition-all hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:right-12 sm:top-10"
              >
                <X className="size-4" />
                <span className="sr-only">Close</span>
              </button>
            </D.DialogClose>
          </D.DialogContent>
        </D.DialogPortal>
      </D.Dialog>

      {/* ── 更改密码弹窗 ── */}
      <D.Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <D.DialogPortal>
          <D.DialogOverlay className="fixed inset-0 z-40 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
          <D.DialogContent
            data-slot="dialog-content"
            className="fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 bg-white p-6 text-sm text-popover-foreground ring-1 ring-foreground/5 duration-100 outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 gap-4 rounded-xl px-5 py-6 sm:gap-5 sm:max-w-[600px] sm:px-16 sm:py-12"
          >
            <div data-slot="dialog-header" className="flex flex-col gap-2">
              <D.DialogTitle data-slot="dialog-title" className="font-heading text-lg font-semibold">
                {t('account.changePasswordTitle')}
              </D.DialogTitle>
            </div>

            <form
              className="space-y-6"
              onSubmit={(e) => { e.preventDefault(); handlePasswordNext() }}
            >
              <div data-slot="form-item" className="grid gap-2">
                <label
                  data-slot="form-label"
                  className="mb-3 block text-base font-normal text-[#15152f]"
                >
                  {t('account.changePasswordPhone')}
                </label>
                <div className="flex h-14 items-center rounded-lg border px-5 text-base">
                  <span className="font-semibold">+86</span>
                  <ChevronDown className="mx-4 size-4 text-muted-foreground" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder={t('account.changePasswordPhone')}
                    value={passwordPhone}
                    onChange={(e) => setPasswordPhone(e.target.value.replace(/\D/g, ''))}
                    className="h-full flex-1 border-0 bg-transparent px-0 text-base outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <div data-slot="form-item" className="grid gap-2">
                <div className="flex h-14 items-center rounded-lg border px-5">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder={t('account.changePasswordCode')}
                    value={passwordCode}
                    onChange={(e) => setPasswordCode(e.target.value)}
                    className="h-full flex-1 border-0 bg-transparent px-0 text-base outline-none placeholder:text-muted-foreground"
                  />
                  <button
                    type="button"
                    data-slot="button"
                    data-variant="ghost"
                    disabled={passwordSending || !passwordPhone || sendCodeCountdown > 0}
                    onClick={handleSendCode}
                    className="cursor-pointer rounded-md px-4 py-2 text-base font-medium text-[#5758ff] transition-all hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                  >
                    {sendCodeCountdown > 0
                      ? t('account.sendCodeRetry').replace('{seconds}', String(sendCodeCountdown))
                      : passwordSending
                        ? t('common.loading')
                        : t('account.changePasswordSendCode')}
                  </button>
                </div>
              </div>

              <div data-slot="form-item" className="grid gap-2">
                <label
                  data-slot="form-label"
                  className="mb-3 block text-base font-normal text-[#15152f]"
                >
                  {t('account.changePasswordNewPassword')}
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder={t('account.changePasswordNewPasswordPlaceholder')}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="flex h-14 w-full rounded-lg border px-5 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>

              <div data-slot="form-item" className="grid gap-2">
                <label
                  data-slot="form-label"
                  className="mb-3 block text-base font-normal text-[#15152f]"
                >
                  {t('account.changePasswordConfirm')}
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder={t('account.changePasswordConfirmPlaceholder')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="flex h-14 w-full rounded-lg border px-5 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>

              {passwordError && (
                <p className="text-sm text-red-500">{passwordError}</p>
              )}
              {passwordSuccess && (
                <p className="text-sm text-green-600">{passwordSuccess}</p>
              )}

              <button
                type="submit"
                data-slot="button"
                data-variant="default"
                disabled={passwordLoading || !passwordPhone || !passwordCode || !newPassword || !confirmPassword}
                className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-[#5758ff] px-4 py-2 text-lg font-medium text-primary-foreground shadow-xs outline-none transition-all hover:bg-[#4d4ee6] disabled:pointer-events-none disabled:opacity-50"
              >
                {passwordLoading ? t('account.changePasswordSubmitting') : t('account.changePasswordSubmit')}
              </button>
            </form>

            <D.DialogClose asChild>
              <button
                type="button"
                data-variant="ghost"
                className="absolute right-4 top-4 flex size-8 cursor-pointer items-center justify-center rounded-md text-sm font-medium outline-none transition-all hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:right-16 sm:top-12"
              >
                <X className="size-4" />
                <span className="sr-only">Close</span>
              </button>
            </D.DialogClose>
          </D.DialogContent>
        </D.DialogPortal>
      </D.Dialog>
    </div>
  )
}