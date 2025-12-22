/**
 * i18n 翻译文件完整性检查工具
 * 用于检测各语言文件中缺失的翻译键
 */

/**
 * 获取对象的所有键路径
 * @param {Object} obj - 要遍历的对象
 * @param {string} prefix - 键路径前缀
 * @returns {Set<string>} 所有键路径的集合
 */
function getAllKeys(obj, prefix = '') {
  const keys = new Set()

  if (obj === null || typeof obj !== 'object') {
    return keys
  }

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const fullKey = prefix ? `${prefix}.${key}` : key
      keys.add(fullKey)

      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        const nestedKeys = getAllKeys(obj[key], fullKey)
        nestedKeys.forEach((k) => keys.add(k))
      }
    }
  }

  return keys
}

/**
 * 检查翻译文件的完整性
 * @param {Object} translations - 所有语言的翻译对象 { 'zh-CN': {...}, 'en-US': {...}, ... }
 * @param {string} baseLocale - 基准语言（默认为 'zh-CN'）
 * @returns {Object} 检查结果
 */
export function checkTranslations(translations, baseLocale = 'zh-CN') {
  const results = {
    baseLocale,
    totalKeys: 0,
    locales: {},
    summary: {
      complete: [],
      incomplete: []
    }
  }

  // 获取基准语言的所有键
  const baseTranslation = translations[baseLocale]
  if (!baseTranslation) {
    console.error(`[i18n Checker] 基准语言 ${baseLocale} 不存在`)
    return results
  }

  const baseKeys = getAllKeys(baseTranslation)
  results.totalKeys = baseKeys.size

  console.log(`\n${'='.repeat(80)}`)
  console.log(`🌍 i18n 翻译文件完整性检查`)
  console.log(`${'='.repeat(80)}`)
  console.log(`📋 基准语言: ${baseLocale}`)
  console.log(`🔑 总键数: ${baseKeys.size}`)
  console.log(`${'='.repeat(80)}\n`)

  // 检查每个语言文件
  for (const locale in translations) {
    if (locale === baseLocale) {
      results.locales[locale] = {
        total: baseKeys.size,
        missing: [],
        missingCount: 0,
        coverage: 100
      }
      results.summary.complete.push(locale)
      continue
    }

    const translation = translations[locale]
    const currentKeys = getAllKeys(translation)
    const missingKeys = []

    // 找出缺失的键
    baseKeys.forEach((key) => {
      if (!currentKeys.has(key)) {
        missingKeys.push(key)
      }
    })

    const coverage = ((baseKeys.size - missingKeys.length) / baseKeys.size) * 100

    results.locales[locale] = {
      total: baseKeys.size,
      missing: missingKeys,
      missingCount: missingKeys.length,
      coverage: coverage.toFixed(2)
    }

    if (missingKeys.length === 0) {
      results.summary.complete.push(locale)
    } else {
      results.summary.incomplete.push(locale)
    }

    // 打印结果
    const statusIcon = missingKeys.length === 0 ? '✅' : '⚠️'
    const statusColor = missingKeys.length === 0 ? '\x1b[32m' : '\x1b[33m'
    const resetColor = '\x1b[0m'

    console.log(
      `${statusIcon} ${statusColor}${locale}${resetColor} - 覆盖率: ${coverage.toFixed(2)}% (${baseKeys.size - missingKeys.length}/${baseKeys.size})`
    )

    if (missingKeys.length > 0) {
      console.log(`   ${'\x1b[31m'}缺失 ${missingKeys.length} 个键:${resetColor}`)
      missingKeys.slice(0, 10).forEach((key) => {
        console.log(`   ${'\x1b[90m'}- ${key}${resetColor}`)
      })
      if (missingKeys.length > 10) {
        console.log(`   ${'\x1b[90m'}... 还有 ${missingKeys.length - 10} 个${resetColor}`)
      }
      console.log('')
    }
  }

  // 打印总结
  console.log(`${'='.repeat(80)}`)
  console.log(`📊 检查总结`)
  console.log(`${'='.repeat(80)}`)
  console.log(`✅ 完整的语言: ${results.summary.complete.length} 个`)
  if (results.summary.complete.length > 0) {
    console.log(`   ${results.summary.complete.join(', ')}`)
  }
  console.log(`⚠️  不完整的语言: ${results.summary.incomplete.length} 个`)
  if (results.summary.incomplete.length > 0) {
    console.log(`   ${results.summary.incomplete.join(', ')}`)
  }
  console.log(`${'='.repeat(80)}\n`)

  return results
}

/**
 * 生成缺失键的模板
 * @param {Array<string>} missingKeys - 缺失的键列表
 * @param {Object} baseTranslation - 基准语言的翻译对象
 * @returns {Object} 缺失键的模板对象
 */
export function generateMissingKeysTemplate(missingKeys, baseTranslation) {
  const template = {}

  missingKeys.forEach((keyPath) => {
    const keys = keyPath.split('.')
    let current = template
    let baseValue = baseTranslation

    keys.forEach((key, index) => {
      if (baseValue) {
        baseValue = baseValue[key]
      }

      if (index === keys.length - 1) {
        // 最后一个键，设置值
        current[key] = `[TODO] ${baseValue || keyPath}`
      } else {
        // 中间键，创建对象
        if (!current[key]) {
          current[key] = {}
        }
        current = current[key]
      }
    })
  })

  return template
}

/**
 * 在开发环境中自动运行检查
 */
export function autoCheckInDev(messagesRef) {
  if (import.meta.env.DEV) {
    // 延迟执行，避免阻塞应用启动
    setTimeout(() => {
      // 如果是 ref，需要访问 .value
      const translations = messagesRef.value || messagesRef

      // 调试：打印 translations 的键
      console.log('[i18n Checker] Debug - translations keys:', Object.keys(translations))
      console.log('[i18n Checker] Debug - translations type:', typeof translations)
      console.log('[i18n Checker] Debug - has zh-CN:', 'zh-CN' in translations)

      const results = checkTranslations(translations)

      // 将检查函数暴露到全局，方便在控制台手动调用
      window.__i18nChecker = {
        check: () => {
          const trans = messagesRef.value || messagesRef
          return checkTranslations(trans)
        },
        getResults: () => results,
        generateTemplate: (locale) => {
          const localeResults = results.locales[locale]
          if (!localeResults || localeResults.missingCount === 0) {
            console.log(`✅ ${locale} 没有缺失的键`)
            return null
          }
          const template = generateMissingKeysTemplate(
            localeResults.missing,
            translations[results.baseLocale]
          )
          console.log(`\n📝 ${locale} 缺失键的模板:`)
          console.log(JSON.stringify(template, null, 2))
          return template
        },
        help: () => {
          console.log(`
🔧 i18n 检查工具使用方法:

1. 重新运行检查:
   window.__i18nChecker.check()

2. 查看检查结果:
   window.__i18nChecker.getResults()

3. 生成缺失键的模板:
   window.__i18nChecker.generateTemplate('en-US')

4. 显示帮助:
   window.__i18nChecker.help()
          `)
        }
      }

      console.log(`\n💡 提示: 可以在控制台使用 window.__i18nChecker.help() 查看更多命令\n`)
    }, 1000)
  }
}
