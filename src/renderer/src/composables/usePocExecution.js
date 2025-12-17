/**
 * POC 执行功能 Composable
 * 负责 POC 检测执行逻辑
 */
import { ref, computed } from 'vue'

export function usePocExecution() {
  const form = ref({
    url: 'http://localhost:3000',
    command: 'ifconfig'
  })

  const isRunning = ref(false)
  const hasExecuted = ref(false)
  const statusCode = ref(null)
  const outputText = ref('')
  const responseText = ref('')
  const commandFailed = ref(false)
  const targetPlatform = ref(null)

  // 用于终止执行的标志
  let abortController = null

  // 状态卡片颜色
  const statusCardColor = computed(() => {
    if (isRunning.value) return 'info-lighten-5'
    if (!statusCode.value) return 'surface'
    if (statusCode.value === 0) return 'error-lighten-5'
    if (statusCode.value >= 200 && statusCode.value < 300) return 'success-lighten-5'
    if (statusCode.value >= 300 && statusCode.value < 400) return 'info-lighten-5'
    if (statusCode.value >= 400 && statusCode.value < 500) return 'warning-lighten-5'
    if (statusCode.value >= 500) return 'error-lighten-5'
    return 'grey-lighten-4'
  })

  const resultCardColor = computed(() => {
    if (isRunning.value) return 'info-lighten-5'
    if (!statusCode.value) return 'surface'
    return false // 将由外部的 isVulnerable 决定
  })

  const statusIcon = computed(() => {
    if (isRunning.value) return 'mdi-loading'
    if (!statusCode.value) return 'mdi-clock-outline'
    if (statusCode.value === 0) return 'mdi-alert-circle-outline'
    if (statusCode.value >= 200 && statusCode.value < 300) return 'mdi-check-circle'
    if (statusCode.value >= 300 && statusCode.value < 400) return 'mdi-information'
    if (statusCode.value >= 400 && statusCode.value < 500) return 'mdi-alert-circle-outline'
    if (statusCode.value >= 500) return 'mdi-alert-circle-outline'
    return 'mdi-clock-outline'
  })

  const statusIconColor = computed(() => {
    if (isRunning.value) return 'info'
    if (!statusCode.value) return 'info'
    if (statusCode.value === 0) return 'error'
    if (statusCode.value >= 200 && statusCode.value < 300) return 'success'
    if (statusCode.value >= 300 && statusCode.value < 400) return 'info'
    if (statusCode.value >= 400 && statusCode.value < 500) return 'warning'
    if (statusCode.value >= 500) return 'error'
    return 'grey'
  })

  const resultIcon = computed(() => {
    if (isRunning.value) return 'mdi-loading'
    if (!statusCode.value) return 'mdi-clock-outline'
    return 'mdi-check-circle' // 将由外部的 isVulnerable 决定
  })

  const resultIconColor = computed(() => {
    if (isRunning.value) return 'info'
    if (!statusCode.value) return 'info'
    return 'success' // 将由外部的 isVulnerable 决定
  })

  const statusText = computed(() => {
    if (isRunning.value) return '正在检测...'
    if (!statusCode.value && !hasExecuted.value) return '等待执行...'
    if (!statusCode.value) return '检测中...'
    return statusCode.value.toString()
  })

  const resultText = computed(() => {
    if (isRunning.value) return '正在检测...'
    if (!statusCode.value && !hasExecuted.value) return '等待检测...'
    if (!statusCode.value) return '检测中...'
    return '未检测到漏洞 (Not Vulnerable)' // 将由外部的 isVulnerable 决定
  })

  const outputTextClass = computed(() => {
    if (!hasExecuted.value) return ''
    return commandFailed.value ? 'text-error' : 'text-success'
  })

  // 执行 POC 检测
  const executePOC = async (isVulnerableRef, currentUrlRef, addVulnHistory, showSnackbar) => {
    if (!form.value.url || !form.value.command) {
      showSnackbar('请填写URL和命令', 'warning')
      return { success: false }
    }

    isRunning.value = true
    hasExecuted.value = true
    statusCode.value = null
    isVulnerableRef.value = false
    outputText.value = ''
    responseText.value = ''
    commandFailed.value = false
    targetPlatform.value = null

    // 创建新的 abort controller
    abortController = { aborted: false }

    try {
      const result = await window.api.executePOC(form.value.url, form.value.command)

      // 检查是否被终止
      if (abortController.aborted) {
        showSnackbar('检测已终止', 'info')
        statusCode.value = 0
        outputText.value = '检测已被用户终止'
        return { success: false, aborted: true }
      }

      if (result.success) {
        const data = result.data
        statusCode.value = data.status_code
        isVulnerableRef.value = data.is_vulnerable
        outputText.value = data.digest_content || '未提取到命令回显'
        responseText.value = data.response || ''
        commandFailed.value = data.command_failed
        targetPlatform.value = data.platform || null

        // 更新全局状态和当前URL
        currentUrlRef.value = form.value.url

        if (isVulnerableRef.value) {
          await addVulnHistory(form.value.url)
          return { success: true, vulnerable: true }
        }

        return { success: true, vulnerable: false }
      } else {
        showSnackbar(`执行失败: ${result.error}`, 'error')
        statusCode.value = 0
        return { success: false }
      }
    } catch (error) {
      if (abortController.aborted) {
        showSnackbar('检测已终止', 'info')
        return { success: false, aborted: true }
      }
      showSnackbar(`执行错误: ${error.message}`, 'error')
      statusCode.value = 0
      return { success: false }
    } finally {
      isRunning.value = false
      abortController = null
    }
  }

  // 终止执行
  const abortExecution = () => {
    if (abortController && isRunning.value) {
      abortController.aborted = true
      isRunning.value = false
      statusCode.value = 0
      outputText.value = '检测已被用户终止'
    }
  }

  return {
    form,
    isRunning,
    hasExecuted,
    statusCode,
    outputText,
    responseText,
    commandFailed,
    targetPlatform,
    statusCardColor,
    resultCardColor,
    statusIcon,
    statusIconColor,
    resultIcon,
    resultIconColor,
    statusText,
    resultText,
    outputTextClass,
    executePOC,
    abortExecution
  }
}
