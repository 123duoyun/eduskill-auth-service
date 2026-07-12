import * as React from "react"
import { cn } from "@/lib/utils"
import { useAuthI18n } from "@/i18n/auth-i18n"
import { DEFAULT_COUNTRY } from "@/data/country-codes"

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  className?: string
  disabled?: boolean
  placeholder?: string
  variant?: "default" | "pill"
  inputRef?: React.Ref<HTMLInputElement>
  onFocus?: React.FocusEventHandler<HTMLInputElement>
}

export function PhoneInput({
  value,
  onChange,
  className,
  disabled,
  placeholder,
  variant = "default",
  inputRef,
  onFocus,
}: PhoneInputProps) {
  const { t } = useAuthI18n()
  const [localNumber, setLocalNumber] = React.useState("")
  const lastEmittedRef = React.useRef("")
  const inputPlaceholder = placeholder ?? t('auth.phoneShort')

  React.useEffect(() => {
    if (value === lastEmittedRef.current) {
      return
    }
    if (!value) {
      setLocalNumber("")
      return
    }
    // 移除 +86 前缀
    if (value.startsWith(DEFAULT_COUNTRY.code)) {
      setLocalNumber(value.slice(DEFAULT_COUNTRY.code.length))
    } else {
      setLocalNumber(value)
    }
  }, [value])

  const emitChange = React.useCallback(
    (nextLocal: string) => {
      const full = nextLocal ? `${DEFAULT_COUNTRY.code}${nextLocal}` : ""
      lastEmittedRef.current = full
      onChange(full)
    },
    [onChange]
  )

  const handleLocalChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "")
    setLocalNumber(digits)
    emitChange(digits)
  }, [emitChange])

  if (variant === "pill") {
    return (
      <div className={cn("flex h-[58px] items-center rounded-full border border-transparent bg-[#f4f4f4] px-6 transition-[border-color,background-color,box-shadow] sm:h-[66px]", className)}>
        <span className="h-full shrink-0 px-0 py-0 text-[17px] font-medium text-[#0a0a28] sm:text-[20px]">
          {DEFAULT_COUNTRY.code}
        </span>
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder={inputPlaceholder}
          disabled={disabled}
          value={localNumber}
          onChange={handleLocalChange}
          onFocus={onFocus}
          className="h-full min-w-0 flex-1 bg-transparent text-[17px] font-medium text-[#0a0a28] outline-none placeholder:text-[#a7a7ad] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 sm:text-[20px]"
        />
      </div>
    )
  }

  return (
    <div className={cn("flex gap-2", className)}>
      <span className="flex w-[110px] shrink-0 items-center text-sm font-medium">
        <span className="text-muted-foreground">{DEFAULT_COUNTRY.code}</span>
      </span>
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder={inputPlaceholder}
        disabled={disabled}
        value={localNumber}
        onChange={handleLocalChange}
        onFocus={onFocus}
        className={cn(
          "h-11 w-full min-w-0 rounded-xl border border-input bg-transparent px-4 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        )}
      />
    </div>
  )
}
