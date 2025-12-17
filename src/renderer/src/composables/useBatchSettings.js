/**
 * 批量验证设置管理 Composable
 * 负责设置的加载、保存、验证
 */
import { ref } from 'vue'

export function useBatchSettings() {
  const settingsDialog = ref(false)
  const batchSettings = ref({
    pageSize: 50,
    customPageSize: 50,
    verifyCommand: 'whoami',
    maxFofaResults: 10000,
    autoHijackEnabled: false,
    hijackRouteMode: 'specific',
    hijackTargetRoute: '/'
  })
  const tempSettings = ref({
    pageSize: 50,
    customPageSize: 50,
    verifyCommand: 'whoami',
    maxFofaResults: 10000,
    autoHijackEnabled: false,
    hijackRouteMode: 'specific',
    hijackTargetRoute: '/'
  })

  // 加载批量验证设置
  const loadBatchSettings = async () => {
    try {
      const result = await window.api.storage.loadSettings()
      if (result.success && result.settings) {
        if (result.settings.batchVerifySettings) {
          const saved = result.settings.batchVerifySettings
          batchSettings.value = {
            pageSize: saved.pageSize || 50,
            customPageSize: saved.customPageSize || 50,
            verifyCommand: saved.verifyCommand || 'whoami',
            maxFofaResults: saved.maxFofaResults || 10000,
            // 从全局设置中读取挂黑配置
            autoHijackEnabled: result.settings.batchHijackEnabled || false,
            hijackRouteMode: result.settings.hijackRouteMode || 'specific',
            hijackTargetRoute: result.settings.hijackTargetRoute || '/'
          }
        } else if (result.settings.batchViewItemsPerPage) {
          const oldPageSize = result.settings.batchViewItemsPerPage
          const presetSizes = [20, 50, 100, 200]
          if (presetSizes.includes(oldPageSize)) {
            batchSettings.value.pageSize = oldPageSize
          } else {
            batchSettings.value.pageSize = 0
            batchSettings.value.customPageSize = oldPageSize
          }
          // 从全局设置中读取挂黑配置
          batchSettings.value.autoHijackEnabled = result.settings.batchHijackEnabled || false
          batchSettings.value.hijackRouteMode = result.settings.hijackRouteMode || 'specific'
          batchSettings.value.hijackTargetRoute = result.settings.hijackTargetRoute || '/'
        }

        console.log('[useBatchSettings] 加载的设置:', batchSettings.value)
        console.log('[useBatchSettings] autoHijackEnabled:', batchSettings.value.autoHijackEnabled)

        const pageSize =
          batchSettings.value.pageSize === 0
            ? batchSettings.value.customPageSize
            : batchSettings.value.pageSize
        return pageSize
      }
    } catch (error) {
      console.error('加载批量验证设置失败:', error)
    }
    return 50
  }

  // 保存批量验证设置
  const saveBatchSettings = async () => {
    try {
      const result = await window.api.storage.loadSettings()
      if (result.success) {
        const settings = result.settings || {}
        settings.batchVerifySettings = {
          pageSize: batchSettings.value.pageSize,
          customPageSize: batchSettings.value.customPageSize,
          verifyCommand: batchSettings.value.verifyCommand,
          maxFofaResults: batchSettings.value.maxFofaResults,
          autoHijackEnabled: batchSettings.value.autoHijackEnabled,
          hijackRouteMode: batchSettings.value.hijackRouteMode,
          hijackTargetRoute: batchSettings.value.hijackTargetRoute
        }
        await window.api.storage.saveSettings(settings)
      }
    } catch (error) {
      console.error('保存批量验证设置失败:', error)
    }
  }

  // 打开设置对话框
  const openSettingsDialog = () => {
    tempSettings.value = {
      pageSize: batchSettings.value.pageSize,
      customPageSize: batchSettings.value.customPageSize,
      verifyCommand: batchSettings.value.verifyCommand,
      maxFofaResults: batchSettings.value.maxFofaResults,
      autoHijackEnabled: batchSettings.value.autoHijackEnabled,
      hijackRouteMode: batchSettings.value.hijackRouteMode,
      hijackTargetRoute: batchSettings.value.hijackTargetRoute
    }
    settingsDialog.value = true
  }

  // 取消设置
  const cancelSettings = () => {
    settingsDialog.value = false
  }

  // 保存设置
  const saveSettings = async (
    itemsPerPage,
    hasSearched,
    buildPageMapping,
    currentPage,
    searchResultsCache,
    loadPageData,
    showSnackbar
  ) => {
    // 验证自定义页面大小
    if (tempSettings.value.pageSize === 0) {
      if (!tempSettings.value.customPageSize || tempSettings.value.customPageSize <= 0) {
        showSnackbar('请输入有效的页面数量', 'error')
        return false
      }
      if (tempSettings.value.customPageSize > 10000) {
        showSnackbar('页面数量不能超过 10000', 'error')
        return false
      }
    }

    // 验证 FOFA 最大数量
    if (!tempSettings.value.maxFofaResults || tempSettings.value.maxFofaResults <= 0) {
      showSnackbar('请输入有效的 FOFA 最大数量', 'error')
      return false
    }
    if (tempSettings.value.maxFofaResults > 10000) {
      showSnackbar('FOFA 最大数量不能超过 10000', 'error')
      return false
    }

    // 保存设置
    batchSettings.value = { ...tempSettings.value }

    // 更新 itemsPerPage
    const newPageSize =
      batchSettings.value.pageSize === 0
        ? batchSettings.value.customPageSize
        : batchSettings.value.pageSize

    if (newPageSize !== itemsPerPage.value) {
      itemsPerPage.value = newPageSize
      // 重新构建页码映射
      if (hasSearched.value) {
        buildPageMapping()
        // 重置到第一页
        currentPage.value = 1
        // 清空缓存
        searchResultsCache.value = {}
        // 重新加载第一页
        await loadPageData(1)
      }
    }

    // 持久化保存设置
    await saveBatchSettings()

    settingsDialog.value = false
    showSnackbar('设置已保存', 'success')
    return true
  }

  return {
    settingsDialog,
    batchSettings,
    tempSettings,
    loadBatchSettings,
    saveBatchSettings,
    openSettingsDialog,
    cancelSettings,
    saveSettings
  }
}
