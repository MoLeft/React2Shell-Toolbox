import { createI18n } from 'vue-i18n'
import zhCN from './zh-CN'
import enUS from './en-US'
import hiIN from './hi-IN'
import esES from './es-ES'
import frFR from './fr-FR'
import zhHK from './zh-HK'
import ruRU from './ru-RU'
import deDE from './de-DE'
import ptPT from './pt-PT'
import jaJP from './ja-JP'
import koKR from './ko-KR'
import itIT from './it-IT'

// 从 localStorage 获取保存的语言设置，默认为中文
const getDefaultLocale = () => {
  const savedLocale = localStorage.getItem('app-locale')
  if (savedLocale) {
    return savedLocale
  }

  // 如果没有保存的设置，尝试从浏览器语言判断
  const browserLang = navigator.language || navigator.userLanguage
  if (browserLang.startsWith('zh')) {
    if (browserLang.includes('HK') || browserLang.includes('TW')) {
      return 'zh-HK'
    }
    return 'zh-CN'
  } else if (browserLang.startsWith('en')) {
    return 'en-US'
  } else if (browserLang.startsWith('hi')) {
    return 'hi-IN'
  } else if (browserLang.startsWith('es')) {
    return 'es-ES'
  } else if (browserLang.startsWith('fr')) {
    return 'fr-FR'
  } else if (browserLang.startsWith('ru')) {
    return 'ru-RU'
  } else if (browserLang.startsWith('de')) {
    return 'de-DE'
  } else if (browserLang.startsWith('pt')) {
    return 'pt-PT'
  } else if (browserLang.startsWith('ja')) {
    return 'ja-JP'
  } else if (browserLang.startsWith('ko')) {
    return 'ko-KR'
  } else if (browserLang.startsWith('it')) {
    return 'it-IT'
  }

  // 默认中文
  return 'zh-CN'
}

const i18n = createI18n({
  legacy: false, // 使用 Composition API 模式
  locale: getDefaultLocale(),
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS,
    'hi-IN': hiIN,
    'es-ES': esES,
    'fr-FR': frFR,
    'zh-HK': zhHK,
    'ru-RU': ruRU,
    'de-DE': deDE,
    'pt-PT': ptPT,
    'ja-JP': jaJP,
    'ko-KR': koKR,
    'it-IT': itIT
  }
})

// 导出切换语言的函数
export const setLocale = (locale) => {
  i18n.global.locale.value = locale
  localStorage.setItem('app-locale', locale)
}

// 导出获取当前语言的函数
export const getLocale = () => {
  return i18n.global.locale.value
}

// 导出可用的语言列表
export const availableLocales = [
  { value: 'zh-CN', label: '简体中文', flag: 'cn' },
  { value: 'zh-HK', label: '繁體中文', flag: 'hk' },
  { value: 'en-US', label: 'English', flag: 'us' },
  { value: 'hi-IN', label: 'हिन्दी', flag: 'in' },
  { value: 'es-ES', label: 'Español', flag: 'es' },
  { value: 'fr-FR', label: 'Français', flag: 'fr' },
  { value: 'ru-RU', label: 'Русский', flag: 'ru' },
  { value: 'de-DE', label: 'Deutsch', flag: 'de' },
  { value: 'pt-PT', label: 'Português', flag: 'pt' },
  { value: 'ja-JP', label: '日本語', flag: 'jp' },
  { value: 'ko-KR', label: '한국어', flag: 'kr' },
  { value: 'it-IT', label: 'Italiano', flag: 'it' }
]

export default i18n
