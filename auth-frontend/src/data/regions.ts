import i18nIsoCountries from 'i18n-iso-countries'
import zhLocale from 'i18n-iso-countries/langs/zh.json'
import chinaAreaData from 'china-area-data'

i18nIsoCountries.registerLocale(zhLocale)

export interface Country {
  code: string
  name: string
}

const CHINA_CODE = 'CN'
const CITY_ONLY_PLACEHOLDERS = new Set(['市辖区'])
const DISTRICT_PLACEHOLDERS = new Set(['市辖区', '省直辖县级行政区划', '自治区直辖县级行政区划'])

function findCodeByName(map: Record<string, string> | undefined, name: string): string | undefined {
  if (!map) return undefined
  return Object.entries(map).find(([, value]) => value === name)?.[0]
}

/** Get country list sorted by Chinese name */
export function getCountries(): Country[] {
  const names = i18nIsoCountries.getNames('zh', { select: 'official' })
  return Object.entries(names)
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh'))
}

/** Get provinces for a given country code */
export function getProvinces(countryCode: string): string[] {
  if (countryCode !== CHINA_CODE) return []
  return Object.values(chinaAreaData['86'] ?? {})
}

/** Get cities for a given province (handles municipalities like Beijing) */
export function getCities(province: string): string[] {
  const provinceCode = findCodeByName(chinaAreaData['86'], province)
  if (!provinceCode) return []

  const cities = Object.values(chinaAreaData[provinceCode] ?? {}).filter(
    (name) => !CITY_ONLY_PLACEHOLDERS.has(name)
  )

  // Direct-controlled municipalities have no real city level;
  // treat the province itself as the city for a better UX.
  if (cities.length === 0) {
    return [province]
  }
  return cities
}

/** Get districts for a given province + city */
export function getDistricts(province: string, city: string): string[] {
  const provinceCode = findCodeByName(chinaAreaData['86'], province)
  if (!provinceCode) return []

  const provinceCities = chinaAreaData[provinceCode] ?? {}
  const cityCode = findCodeByName(provinceCities, city)
  if (cityCode) {
    return Object.values(chinaAreaData[cityCode] ?? {}).filter(
      (name) => !DISTRICT_PLACEHOLDERS.has(name)
    )
  }

  // Municipality fallback: city name equals province name
  if (city === province) {
    const fallbackCityCode =
      Object.entries(provinceCities).find(([, name]) => !DISTRICT_PLACEHOLDERS.has(name))?.[0] ??
      Object.keys(provinceCities)[0]
    if (fallbackCityCode) {
      return Object.values(chinaAreaData[fallbackCityCode] ?? {}).filter(
        (name) => !DISTRICT_PLACEHOLDERS.has(name)
      )
    }
  }

  return []
}
