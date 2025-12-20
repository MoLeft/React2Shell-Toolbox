import { getLocale } from '../locales'
import zhCN from '../locales/zh-CN'
import enUS from '../locales/en-US'
import hiIN from '../locales/hi-IN'
import esES from '../locales/es-ES'
import frFR from '../locales/fr-FR'
import zhHK from '../locales/zh-HK'
import ruRU from '../locales/ru-RU'
import deDE from '../locales/de-DE'
import ptPT from '../locales/pt-PT'
import jaJP from '../locales/ja-JP'
import koKR from '../locales/ko-KR'
import itIT from '../locales/it-IT'

/**
 * 国家代码到国旗 emoji 的映射
 */
export const countryFlags = {
  // 亚洲
  CN: '🇨🇳',
  JP: '🇯🇵',
  KR: '🇰🇷',
  IN: '🇮🇳',
  SG: '🇸🇬',
  TH: '🇹🇭',
  VN: '🇻🇳',
  MY: '🇲🇾',
  ID: '🇮🇩',
  PH: '🇵🇭',
  PK: '🇵🇰',
  BD: '🇧🇩',
  HK: '🇭🇰',
  TW: '🇹🇼',
  MO: '🇲🇴',
  // 北美
  US: '🇺🇸',
  CA: '🇨🇦',
  MX: '🇲🇽',
  // 南美
  BR: '🇧🇷',
  AR: '🇦🇷',
  CL: '🇨🇱',
  CO: '🇨🇴',
  PE: '🇵🇪',
  // 欧洲
  GB: '🇬🇧',
  DE: '🇩🇪',
  FR: '🇫🇷',
  IT: '🇮🇹',
  ES: '🇪🇸',
  NL: '🇳🇱',
  RU: '🇷🇺',
  PL: '🇵🇱',
  SE: '🇸🇪',
  NO: '🇳🇴',
  FI: '🇫🇮',
  DK: '🇩🇰',
  CH: '🇨🇭',
  AT: '🇦🇹',
  BE: '🇧🇪',
  IE: '🇮🇪',
  PT: '🇵🇹',
  GR: '🇬🇷',
  CZ: '🇨🇿',
  RO: '🇷🇴',
  UA: '🇺🇦',
  // 大洋洲
  AU: '🇦🇺',
  NZ: '🇳🇿',
  // 非洲
  ZA: '🇿🇦',
  EG: '🇪🇬',
  NG: '🇳🇬',
  KE: '🇰🇪',
  // 中东
  AE: '🇦🇪',
  SA: '🇸🇦',
  IL: '🇮🇱',
  TR: '🇹🇷',
  IR: '🇮🇷',
  // 其他
  UNKNOWN: '🏳️'
}

// 所有语言包的映射
const localeMap = {
  'zh-CN': zhCN,
  'zh-HK': zhHK,
  'en-US': enUS,
  'hi-IN': hiIN,
  'es-ES': esES,
  'fr-FR': frFR,
  'ru-RU': ruRU,
  'de-DE': deDE,
  'pt-PT': ptPT,
  'ja-JP': jaJP,
  'ko-KR': koKR,
  'it-IT': itIT
}

/**
 * 获取当前语言的翻译对象
 * @returns {object} - 当前语言的翻译对象
 */
function getCurrentTranslations() {
  const locale = getLocale()
  return localeMap[locale] || enUS
}

/**
 * 获取国家名称（支持 i18n）
 * @param {string} countryCode - 国家代码
 * @returns {string} - 国家名称
 */
function getCountryName(countryCode) {
  const translations = getCurrentTranslations()
  return translations.countries[countryCode] || countryCode
}

/**
 * 获取国家的名称和国旗
 * @param {string} countryCode - 国家代码（如 CN, US）
 * @returns {{name: string, flag: string, flagUrl: string, code: string}}
 */
export function getCountryInfo(countryCode) {
  if (!countryCode) {
    return {
      name: getCountryName('UNKNOWN'),
      flag: countryFlags.UNKNOWN,
      flagUrl: '',
      code: 'UNKNOWN'
    }
  }

  const code = countryCode.toUpperCase()
  const flag = countryFlags[code] || '🏳️'
  const name = getCountryName(code)

  return {
    name,
    flag,
    code,
    flagUrl: code !== 'UNKNOWN' ? `https://flagcdn.com/112x84/${code.toLowerCase()}.png` : ''
  }
}

/**
 * 根据国家名称获取国家信息
 * @param {string} countryName - 国家名称
 * @returns {{name: string, flag: string, flagUrl: string, code: string}}
 */
export function getCountryInfoByName(countryName) {
  if (!countryName) {
    return {
      name: getCountryName('UNKNOWN'),
      flag: countryFlags.UNKNOWN,
      code: 'UNKNOWN',
      flagUrl: ''
    }
  }

  // 先尝试作为代码查找
  const upperName = countryName.toUpperCase()
  if (countryFlags[upperName]) {
    return getCountryInfo(upperName)
  }

  // 在所有语言包中查找匹配的国家名称
  for (const translations of Object.values(localeMap)) {
    for (const [code, name] of Object.entries(translations.countries)) {
      if (name === countryName) {
        return getCountryInfo(code)
      }
    }
  }

  // 尝试模糊匹配（不区分大小写）
  const lowerName = countryName.toLowerCase()
  for (const code of Object.keys(countryFlags)) {
    if (code.toLowerCase() === lowerName) {
      return getCountryInfo(code)
    }
  }

  // 未找到匹配，返回原始名称
  return {
    name: countryName,
    flag: '🏳️',
    code: 'UNKNOWN',
    flagUrl: ''
  }
}
