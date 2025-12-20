/**
 * FOFA 测试 Composable
 * 负责 FOFA 连接测试逻辑
 */
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFofaStore } from '../stores/fofaStore'

export function useFofaTest() {
  const { t } = useI18n()
  const fofaStore = useFofaStore()
  const testingFofa = ref(false)

  const testFofa = async (email, key) => {
    testingFofa.value = true
    try {
      const result = await window.api.fofa.testConnection(email, key)
      if (result.success) {
        fofaStore.setConnection(true, email, result.userInfo)
        fofaStore.setApiKey(key)
        return { success: true, message: t('settings.fofa.testSuccess'), userInfo: result.userInfo }
      } else {
        fofaStore.setConnection(false)
        return { success: false, error: result.error || t('settings.fofa.testFailed') }
      }
    } catch (error) {
      fofaStore.setConnection(false)
      return { success: false, error: error.message }
    } finally {
      testingFofa.value = false
    }
  }

  return {
    testingFofa,
    testFofa
  }
}
