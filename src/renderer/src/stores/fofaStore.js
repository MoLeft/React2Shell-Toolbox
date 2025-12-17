/**
 * FOFA 连接状态管理 Store
 * 用于在不同页面间共享 FOFA 连接状态，避免重复检测和页面闪烁
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useFofaStore = defineStore('fofa', () => {
  // FOFA 连接状态
  const connected = ref(false)
  const email = ref('')
  const apiKey = ref('')
  const userInfo = ref(null)
  const testing = ref(false)
  const initialized = ref(false)

  // 设置连接状态
  const setConnection = (isConnected, userEmail = '', info = null) => {
    connected.value = isConnected
    email.value = userEmail
    userInfo.value = info
    initialized.value = true
  }

  // 设置 API Key
  const setApiKey = (key) => {
    apiKey.value = key
  }

  // 设置测试状态
  const setTesting = (isTesting) => {
    testing.value = isTesting
  }

  // 重置状态
  const reset = () => {
    connected.value = false
    email.value = ''
    apiKey.value = ''
    userInfo.value = null
    testing.value = false
    initialized.value = false
  }

  // 测试 FOFA 连接
  const testConnection = async () => {
    if (testing.value) return

    testing.value = true
    try {
      // 加载 FOFA 配置
      const settingsResult = await window.api.storage.loadSettings()
      if (!settingsResult.success || !settingsResult.settings) {
        console.log('未找到 FOFA 配置')
        setConnection(false)
        return
      }

      const settings = settingsResult.settings
      const fofaEmail = settings.fofaApiEmail
      const fofaKey = settings.fofaApiKey

      if (!fofaEmail || !fofaKey) {
        console.log('FOFA 配置不完整')
        setConnection(false)
        return
      }

      // 测试连接
      const testResult = await window.api.fofa.testConnection(fofaEmail, fofaKey)

      if (testResult.success) {
        console.log('FOFA 连接成功')
        setConnection(true, fofaEmail, testResult.userInfo)
        setApiKey(fofaKey)
      } else {
        console.log('FOFA 连接失败:', testResult.error)
        setConnection(false)
      }
    } catch (error) {
      console.error('测试 FOFA 连接异常:', error)
      setConnection(false)
    } finally {
      testing.value = false
    }
  }

  return {
    connected,
    email,
    apiKey,
    userInfo,
    testing,
    initialized,
    setConnection,
    setApiKey,
    setTesting,
    reset,
    testConnection
  }
})
