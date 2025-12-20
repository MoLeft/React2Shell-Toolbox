/**
 * POC 历史记录功能 Composable
 * 负责漏洞历史记录管理
 * 现在使用 Pinia store 进行状态管理
 */
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { usePocStore } from '../stores/pocStore'

export function usePocHistory() {
  const { t } = useI18n()
  const pocStore = usePocStore()

  // 使用 storeToRefs 保持响应性
  const { vulnHistory, historyLoading, faviconCache, faviconLoading } = storeToRefs(pocStore)

  // 包装 store 方法，添加 showSnackbar 支持
  const removeVulnHistory = async (url, showSnackbar) => {
    const success = await pocStore.removeVulnHistory(url)
    if (success) {
      showSnackbar(t('messages.deleteSuccess'), 'success')
    } else {
      showSnackbar(t('messages.deleteFailed'), 'error')
    }
  }

  const clearVulnHistory = async (showSnackbar) => {
    const success = await pocStore.clearVulnHistory()
    if (success) {
      showSnackbar(t('messages.deleteSuccess'), 'success')
    } else {
      showSnackbar(t('messages.deleteFailed'), 'error')
    }
  }

  return {
    vulnHistory,
    historyLoading,
    faviconCache,
    faviconLoading,
    loadVulnHistory: pocStore.loadVulnHistory,
    addVulnHistory: pocStore.addVulnHistory,
    removeVulnHistory,
    clearVulnHistory
  }
}
