/**
 * i18n 辅助工具
 * 主进程现在直接返回 i18n 键（如 'messages.fofaNotConfigured'）
 * 渲染进程通过 useI18nMessage composable 自动翻译
 */

import { getLocale } from '../locales'

/**
 * 检查消息是否是 i18n 键
 * @param {string} message - 消息
 * @returns {boolean}
 */
export function isI18nKey(message) {
  if (!message || typeof message !== 'string') return false
  // 检查是否是 i18n 键格式（如 'messages.xxx' 或 'common.xxx'）
  return /^[a-z]+\.[a-zA-Z.]+$/.test(message)
}

/**
 * 检查是否需要翻译（是否包含中文字符）
 * @param {string} message - 消息
 * @returns {boolean}
 */
export function needsTranslation(message) {
  if (!message) return false
  // 检查是否包含中文字符
  return /[\u4e00-\u9fa5]/.test(message)
}

/**
 * 获取当前语言环境
 * @returns {string} - 'zh-CN' 或 'en-US'
 */
export function getCurrentLocale() {
  return getLocale()
}
