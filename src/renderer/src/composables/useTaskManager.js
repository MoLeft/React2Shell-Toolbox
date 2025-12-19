/**
 * 任务管理 Composable
 * 负责批量验证任务的导出和导入，实现断点续爬功能
 */
import { ref } from 'vue'
import { encryptData, decryptData } from '../utils/crypto'

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
  autoLoadStatus
) {
  const taskDialog = ref(false)
  const taskDialogMode = ref('export') // 'export' 或 'import'

  // 检查是否可以导出任务
  const canExportTask = () => {
    // 必须先暂停批量验证或自动加载
    if (batchVerifying.value || autoLoadStatus.value === 'loading') {
      return {
        success: false,
        error: '请先暂停批量验证或自动加载后再导出任务'
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
        error: '没有可导出的任务数据'
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
        currentPage: currentPage.value,
        itemsPerPage: itemsPerPage.value,
        totalResults: totalResults.value,
        queryQueue: cleanDataForExport(queryQueue.value),
        batchSettings: cleanDataForExport(batchSettings.value),
        searchResultsCache: cleanDataForExport(searchResultsCache.value),
        batchVerifyPaused: batchVerifyPaused.value
      }

      let finalData = taskData

      // 如果提供了密码，则加密数据
      if (password) {
        const dataString = JSON.stringify(taskData)
        const encryptedData = await encryptData(dataString, password)
        finalData = {
          version: '1.0.0',
          encrypted: true,
          encryptedData: encryptedData
        }
      }

      // 生成文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
      const fileName = `batch-${timestamp}.task.r2stb`

      // 使用文件选择器保存
      const result = await window.api.storage.saveTaskFile(fileName, finalData)

      if (result.success) {
        showSnackbar(`任务已导出到: ${result.filePath}`, 'success')
        return { success: true }
      } else {
        showSnackbar(`导出失败: ${result.error}`, 'error')
        return { success: false }
      }
    } catch (error) {
      console.error('导出任务失败:', error)
      showSnackbar(`导出失败: ${error.message}`, 'error')
      return { success: false }
    }
  }

  // 导入任务
  const importTask = async (showSnackbar, callbacks, password = null, preloadedFileData = null) => {
    try {
      let fileData

      // 如果提供了预加载的文件数据，直接使用
      if (preloadedFileData) {
        fileData = preloadedFileData
      } else {
        // 否则使用文件选择器打开
        const result = await window.api.storage.loadTaskFile()

        if (!result.success) {
          if (result.error !== 'cancelled') {
            showSnackbar(`导入失败: ${result.error}`, 'error')
          }
          return { success: false, cancelled: result.error === 'cancelled' }
        }

        fileData = result.data
      }

      // 检查是否是加密数据
      if (fileData.encrypted && fileData.encryptedData) {
        // 如果没有提供密码，返回需要密码的标志
        if (!password) {
          return { success: false, needPassword: true, fileData }
        }

        // 尝试解密数据
        try {
          const decryptedString = await decryptData(fileData.encryptedData, password)
          const taskData = JSON.parse(decryptedString)

          // 恢复状态
          await restoreTaskData(taskData, callbacks)
          showSnackbar('任务导入成功，已恢复到上次状态', 'success')
          return { success: true }
        } catch (error) {
          console.error('解密失败:', error)
          // 如果是预加载的数据，返回需要密码标志以便重试
          return { success: false, error: '密码错误或数据已损坏', needPassword: true, fileData }
        }
      }

      // 未加密的数据
      const taskData = fileData

      // 验证任务数据
      if (!taskData.version || !taskData.searchQuery) {
        showSnackbar('无效的任务文件格式', 'error')
        return { success: false }
      }

      // 恢复状态
      await restoreTaskData(taskData, callbacks)
      showSnackbar('任务导入成功，已恢复到上次状态', 'success')
      return { success: true }
    } catch (error) {
      console.error('导入任务失败:', error)
      showSnackbar(`导入失败: ${error.message}`, 'error')
      return { success: false }
    }
  }

  // 恢复任务数据的辅助函数
  const restoreTaskData = async (taskData, callbacks) => {
    console.log('[任务导入] 开始恢复任务数据')
    console.log('[任务导入] selectedFilters:', taskData.selectedFilters)
    console.log('[任务导入] stats:', taskData.stats)
    console.log('[任务导入] queryQueue:', taskData.queryQueue)

    searchQuery.value = taskData.searchQuery
    selectedFilters.value = taskData.selectedFilters || []
    stats.value = taskData.stats || {}
    currentPage.value = taskData.currentPage || 1
    itemsPerPage.value = taskData.itemsPerPage || 50
    totalResults.value = taskData.totalResults || 0
    queryQueue.value = taskData.queryQueue || []
    searchResultsCache.value = taskData.searchResultsCache || {}
    batchVerifyPaused.value = taskData.batchVerifyPaused || false

    // 恢复设置
    if (taskData.batchSettings) {
      Object.assign(batchSettings.value, taskData.batchSettings)
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
