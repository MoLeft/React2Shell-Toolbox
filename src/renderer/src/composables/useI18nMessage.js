import { useI18n } from 'vue-i18n'

/**
 * 用于处理来自 main 进程的消息翻译
 * 主进程应该返回 i18n key（如 'messages.fofaNotConfigured'）
 * 支持带参数的格式：'messages.key: additional info'
 * 如果返回的是原始消息，则直接显示
 */
export function useI18nMessage() {
  const { t } = useI18n()

  /**
   * 翻译消息
   * 如果是 i18n key 格式，翻译它；否则返回原消息
   * 支持格式：
   * - 'messages.key' -> 翻译 key
   * - 'messages.key: 404' -> 翻译 key 并附加 ': 404'
   * - 'messages.key: some info' -> 翻译 key 并附加 ': some info'
   * @param {string} message - 消息或 i18n key
   * @returns {string} - 翻译后的消息
   */
  const translateMessage = (message) => {
    if (!message) return ''

    // 检查是否包含 i18n key 格式（messages.xxx 或 common.xxx 等）
    const keyPattern = /^([a-z]+\.[a-zA-Z.]+)(:\s*(.+))?$/
    const match = message.match(keyPattern)

    if (match) {
      const key = match[1] // 提取 key 部分
      const additionalInfo = match[3] // 提取附加信息（如果有）

      try {
        const translated = t(key)
        // 如果翻译后还是原 key，说明没有对应的翻译
        if (translated === key) {
          return message
        }
        // 如果有附加信息，拼接上去
        if (additionalInfo) {
          return `${translated}: ${additionalInfo}`
        }
        return translated
      } catch (error) {
        // 翻译失败，返回原消息
        return message
      }
    }

    // 不是 key 格式，直接返回原消息
    return message
  }

  /**
   * 翻译 API 响应中的错误消息
   * @param {object} response - API 响应对象
   * @returns {object} - 翻译后的响应对象
   */
  const translateResponse = (response) => {
    if (!response) return response

    const translated = { ...response }

    // 翻译 error 字段
    if (translated.error) {
      translated.error = translateMessage(translated.error)
    }

    // 翻译 message 字段
    if (translated.message) {
      translated.message = translateMessage(translated.message)
    }

    return translated
  }

  return {
    t,
    translateMessage,
    translateResponse
  }
}
