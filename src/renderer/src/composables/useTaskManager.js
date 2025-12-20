/**
 * 任务管理 Composable
 * 负责批量验证任务的导出和导入，实现断点续爬功能
 */
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

export function useTaskManager(
  searchQuery,
  selectedFilters,
  stats,
  searchResultsCache,
  currentPage,
  itemsPerPage,
  totalResults,
  queryQueue,
  batchSettings,
  batchVerifying,
  batchVerifyPaused,
  autoLoadStatus,
  failedFields, // 新增：失败的字段状态
  batchVerifyStats // 新增：批量验证统计信息
) {
  const { t } = useI18n()
  const taskDialog = ref(false)
  const taskDialogMode = ref('export') // 'export' 或 'import'

  // 检查是否可以导出任务
  const canExportTask = () => {
    // 必须先暂停批量验证或自动加载
    if (batchVerifying.value || autoLoadStatus.value === 'loading') {
      return {
        success: false,
        error: t('batch.task.pauseBeforeExport')
      }
    }

    // 检查是否有任何非默认状态的数据
    const hasSearchQuery = searchQuery.value && searchQuery.value.trim().length > 0
    const hasFilters = selectedFilters.value && selectedFilters.value.length > 0
    const hasStats =
      stats.value && Object.keys(stats.value).some((key) => stats.value[key].length > 0)
    const hasCache = searchResultsCache.value && Object.keys(searchResultsCache.value).length > 0
    const hasResults = totalResults.value > 0

    if (!hasSearchQuery && !hasFilters && !hasStats && !hasCache && !hasResults) {
      return {
        success: false,
        error: t('batch.task.noDataToExport')
      }
    }

    return { success: true }
  }

  // 清理数据，移除不可序列化的内容
  const cleanDataForExport = (data) => {
    try {
      // 使用 JSON.parse(JSON.stringify()) 来深拷贝并移除不可序列化的内容
      return JSON.parse(JSON.stringify(data))
    } catch (error) {
      console.error('数据清理失败:', error)
      return data
    }
  }

  // 导出任务
  const exportTask = async (showSnackbar, password = null) => {
    const checkResult = canExportTask()
    if (!checkResult.success) {
      showSnackbar(checkResult.error, 'error')
      return
    }

    try {
      // 构建任务数据并清理不可序列化的内容
      const taskData = {
        version: '1.0.0',
        exportTime: new Date().toISOString(),
        searchQuery: searchQuery.value,
        selectedFilters: cleanDataForExport(selectedFilters.value),
        stats: cleanDataForExport(stats.value),
        failedFields: cleanDataForExport(failedFields?.value || {}), // 导出失败的字段状态
        currentPage: currentPage.value,
        itemsPerPage: itemsPerPage.value,
        totalResults: totalResults.value,
        queryQueue: cleanDataForExport(queryQueue.value),
        batchSettings: cleanDataForExport(batchSettings.value),
        searchResultsCache: cleanDataForExport(searchResultsCache.value),
        batchVerifyPaused: batchVerifyPaused.value,
        batchVerifyStats: cleanDataForExport(
          batchVerifyStats?.value || {
            total: 0,
            safe: 0,
            vulnerable: 0,
            error: 0,
            hijacked: 0,
            hijackFailed: 0
          }
        ) // 导出批量验证统计信息
      }

      // 生成文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
      const fileName = `batch-${timestamp}.task.r2stb`

      // 使用文件选择器保存（主进程会处理 XOR 混淆）
      const result = await window.api.storage.saveTaskFile(fileName, taskData, password)

      if (result.success) {
        showSnackbar(t('batch.task.exportSuccess', { path: result.filePath }), 'success')
        return { success: true }
      } else {
        showSnackbar(`${t('batch.task.exportFailed')}: ${result.error}`, 'error')
        return { success: false }
      }
    } catch (error) {
      console.error('导出任务失败:', error)
      showSnackbar(`${t('batch.task.exportFailed')}: ${error.message}`, 'error')
      return { success: false }
    }
  }

  // 导入任务
  const importTask = async (showSnackbar, callbacks, password = null, preloadedFileData = null) => {
    try {
      let result

      // 如果提供了预加载的文件数据，说明已经从主进程加载过了
      if (preloadedFileData) {
        result = preloadedFileData
      } else {
        // 显示加载提示
        showSnackbar(t('batch.task.loadingFile'), 'info')

        // 使用文件选择器打开（主进程会处理 XOR 反混淆）
        // 如果提供了密码，传递给主进程
        result = await window.api.storage.loadTaskFile(password)

        if (!result.success) {
          if (result.error !== 'cancelled') {
            showSnackbar(`${t('batch.task.importFailed')}: ${result.error}`, 'error')
          }
          return { success: false, cancelled: result.error === 'cancelled' }
        }
      }

      // 数据已经在主进程中反混淆完成，直接使用
      const taskData = result.data

      // 验证任务数据
      if (!taskData.version || !taskData.searchQuery) {
        showSnackbar(t('batch.task.invalidFormat'), 'error')
        return { success: false }
      }

      // 恢复状态
      await restoreTaskData(taskData, callbacks)
      showSnackbar(t('batch.task.importSuccess'), 'success')
      return { success: true }
    } catch (error) {
      console.error('导入任务失败:', error)
      showSnackbar(`${t('batch.task.importFailed')}: ${error.message}`, 'error')
      return { success: false }
    }
  }

  // 恢复任务数据的辅助函数（优化大数据处理）
  const restoreTaskData = async (taskData, callbacks) => {
    console.log('[任务导入] 开始恢复任务数据')
    console.log('[任务导入] selectedFilters:', taskData.selectedFilters)
    console.log('[任务导入] stats:', taskData.stats)
    console.log('[任务导入] failedFields:', taskData.failedFields)
    console.log('[任务导入] queryQueue:', taskData.queryQueue)

    // 先恢复基本数据
    searchQuery.value = taskData.searchQuery
    selectedFilters.value = taskData.selectedFilters || []
    stats.value = taskData.stats || {}

    // 恢复失败的字段状态
    if (failedFields && taskData.failedFields) {
      Object.assign(failedFields.value, taskData.failedFields)
    }

    // 恢复批量验证统计信息
    if (batchVerifyStats && taskData.batchVerifyStats) {
      Object.assign(batchVerifyStats.value, taskData.batchVerifyStats)
      console.log('[任务导入] 恢复批量验证统计:', batchVerifyStats.value)
    }

    currentPage.value = taskData.currentPage || 1
    itemsPerPage.value = taskData.itemsPerPage || 50
    totalResults.value = taskData.totalResults || 0
    queryQueue.value = taskData.queryQueue || []
    batchVerifyPaused.value = taskData.batchVerifyPaused || false

    // 恢复设置
    if (taskData.batchSettings) {
      Object.assign(batchSettings.value, taskData.batchSettings)
    }

    // 分批恢复 searchResultsCache（避免一次性赋值导致内存峰值）
    if (taskData.searchResultsCache && Object.keys(taskData.searchResultsCache).length > 0) {
      console.log('[任务导入] 开始分批恢复缓存数据...')
      const cacheKeys = Object.keys(taskData.searchResultsCache)
      const BATCH_SIZE = 10 // 每批处理 10 页

      searchResultsCache.value = {}

      for (let i = 0; i < cacheKeys.length; i += BATCH_SIZE) {
        const batch = cacheKeys.slice(i, i + BATCH_SIZE)
        for (const key of batch) {
          searchResultsCache.value[key] = taskData.searchResultsCache[key]
        }

        // 每批处理后让出控制权，避免阻塞 UI
        await new Promise((resolve) => setTimeout(resolve, 0))

        console.log(
          `[任务导入] 已恢复 ${Math.min(i + BATCH_SIZE, cacheKeys.length)}/${cacheKeys.length} 页缓存`
        )
      }

      console.log('[任务导入] 缓存数据恢复完成')
    } else {
      searchResultsCache.value = {}
    }

    console.log('[任务导入] 数据恢复完成')
    console.log('[任务导入] 当前 selectedFilters:', selectedFilters.value)
    console.log('[任务导入] 当前 stats:', stats.value)

    // 调用回调函数更新页面状态
    if (callbacks && callbacks.onImportComplete) {
      await callbacks.onImportComplete()
    }
  }

  // 打开任务对话框
  const openTaskDialog = (mode) => {
    taskDialogMode.value = mode
    taskDialog.value = true
  }

  // 关闭任务对话框
  const closeTaskDialog = () => {
    taskDialog.value = false
  }

  return {
    taskDialog,
    taskDialogMode,
    canExportTask,
    exportTask,
    importTask,
    restoreTaskData,
    openTaskDialog,
    closeTaskDialog
  }
}
