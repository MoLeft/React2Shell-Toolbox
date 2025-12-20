/**
 * 主进程简单的 i18n 支持
 * 从 localStorage 读取语言设置并提供翻译
 */
import { app } from 'electron'
import { join } from 'path'
import { readFileSync, existsSync } from 'fs'

// 翻译字典
const translations = {
  'zh-CN': {
    'dialog.exportData': '导出数据',
    'dialog.exportTask': '导出任务',
    'dialog.importTask': '导入任务'
  },
  'zh-HK': {
    'dialog.exportData': '匯出資料',
    'dialog.exportTask': '匯出任務',
    'dialog.importTask': '匯入任務'
  },
  'en-US': {
    'dialog.exportData': 'Export Data',
    'dialog.exportTask': 'Export Task',
    'dialog.importTask': 'Import Task'
  },
  'hi-IN': {
    'dialog.exportData': 'डेटा निर्यात करें',
    'dialog.exportTask': 'कार्य निर्यात करें',
    'dialog.importTask': 'कार्य आयात करें'
  },
  'es-ES': {
    'dialog.exportData': 'Exportar datos',
    'dialog.exportTask': 'Exportar tarea',
    'dialog.importTask': 'Importar tarea'
  },
  'fr-FR': {
    'dialog.exportData': 'Exporter les données',
    'dialog.exportTask': 'Exporter la tâche',
    'dialog.importTask': 'Importer la tâche'
  },
  'ru-RU': {
    'dialog.exportData': 'Экспорт данных',
    'dialog.exportTask': 'Экспорт задачи',
    'dialog.importTask': 'Импорт задачи'
  },
  'de-DE': {
    'dialog.exportData': 'Daten exportieren',
    'dialog.exportTask': 'Aufgabe exportieren',
    'dialog.importTask': 'Aufgabe importieren'
  },
  'pt-PT': {
    'dialog.exportData': 'Exportar Dados',
    'dialog.exportTask': 'Exportar Tarefa',
    'dialog.importTask': 'Importar Tarefa'
  },
  'ja-JP': {
    'dialog.exportData': 'データをエクスポート',
    'dialog.exportTask': 'タスクをエクスポート',
    'dialog.importTask': 'タスクをインポート'
  },
  'ko-KR': {
    'dialog.exportData': '데이터 내보내기',
    'dialog.exportTask': '작업 내보내기',
    'dialog.importTask': '작업 가져오기'
  },
  'it-IT': {
    'dialog.exportData': 'Esporta dati',
    'dialog.exportTask': 'Esporta attività',
    'dialog.importTask': 'Importa attività'
  }
}

/**
 * 获取当前语言设置
 * 从设置文件中读取
 */
function getCurrentLocale() {
  try {
    const userDataPath = app.getPath('userData')
    const settingsPath = join(userDataPath, 'settings.json')

    if (existsSync(settingsPath)) {
      const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'))
      return settings.language || 'zh-CN'
    }
  } catch (error) {
    console.error('读取语言设置失败:', error)
  }

  // 默认返回中文
  return 'zh-CN'
}

/**
 * 翻译文本
 * @param {string} key - 翻译键
 * @returns {string} - 翻译后的文本
 */
export function t(key) {
  const locale = getCurrentLocale()
  const translation = translations[locale]?.[key]

  if (translation) {
    return translation
  }

  // 如果找不到翻译，返回键本身
  console.warn(`翻译键不存在: ${key} (locale: ${locale})`)
  return key
}

/**
 * 添加翻译
 * @param {string} locale - 语言代码
 * @param {object} messages - 翻译消息对象
 */
export function addTranslations(locale, messages) {
  if (!translations[locale]) {
    translations[locale] = {}
  }
  Object.assign(translations[locale], messages)
}
