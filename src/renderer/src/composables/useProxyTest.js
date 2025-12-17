/**
 * 代理测试 Composable
 * 负责代理连接测试逻辑
 */
import { ref } from 'vue'

export function useProxyTest() {
  const testingProxy = ref(false)
  const testDialog = ref({
    show: false,
    success: false,
    ip: '',
    address: '',
    error: '',
    details: null
  })

  const testProxy = async (settings) => {
    testingProxy.value = true
    try {
      const result = await window.api.storage.testProxy({
        proxyProtocol: settings.proxyProtocol,
        proxyHost: settings.proxyHost,
        proxyPort: settings.proxyPort,
        proxyAuth: settings.proxyAuth,
        proxyUsername: settings.proxyUsername,
        proxyPassword: settings.proxyPassword
      })

      testDialog.value = {
        show: true,
        success: result.success,
        ip: result.ip || '',
        address: result.address || '',
        error: result.error || '',
        details: result.details || null
      }

      return result
    } catch (error) {
      testDialog.value = {
        show: true,
        success: false,
        error: error.message,
        ip: '',
        address: '',
        details: null
      }
      return { success: false, error: error.message }
    } finally {
      testingProxy.value = false
    }
  }

  return {
    testingProxy,
    testDialog,
    testProxy
  }
}
