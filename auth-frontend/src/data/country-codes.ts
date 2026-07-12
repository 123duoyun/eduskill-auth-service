export interface CountryCode {
  code: string
  name: string
  iso: string
  flag: string
}

export const countryCodes: CountryCode[] = [
  { code: '+86', name: '中国', iso: 'CN', flag: '🇨🇳' },
]

export const DEFAULT_COUNTRY = countryCodes[0]
