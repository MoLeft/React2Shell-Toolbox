/**
 * 搜索历史管理 Composable
 * 负责搜索历史的加载、保存、删除
 */
import { ref } from 'vue'
import { createLogger } from '@/utils/logger'

const logger = createLogger('SearchHistory')

export function useSearchHistory() {
  const searchHistory = ref([])
  const showHistoryDropdown = ref(false)

  // 加载搜索历史
  const loadSearchHistory = async () => {
    try {
      logger.info('开始加载搜索历史')
      const result = await window.api.storage.loadSettings()
      logger.debug('加载设置结果', result)
      if (result.success && result.settings && result.settings.fofaSearchHistory) {
        searchHistory.value = result.settings.fofaSearchHistory
        logger.success('搜索历史加载成功', { count: searchHistory.value.length })
      } else {
        logger.info('没有找到搜索历史，使用空数组')
        searchHistory.value = []
      }
    } catch (error) {
      logger.error('加载搜索历史失败', error)
      searchHistory.value = []
    }
  }

  // 保存搜索历史
  const saveSearchHistory = async () => {
    try {
      logger.info('开始保存搜索历史', { count: searchHistory.value.length })
      logger.debug('当前历史记录数组', searchHistory.value)

      const result = await window.api.storage.loadSettings()
      logger.debug('加载设置结果', { success: result.success })

      if (result.success) {
        const settings = result.settings || {}
        logger.debug('原始设置对象', settings)

        settings.fofaSearchHistory = [...searchHistory.value]
        logger.debug('添加历史记录后的设置', settings.fofaSearchHistory)

        const saveResult = await window.api.storage.saveSettings(settings)
        logger.debug('保存结果', { success: saveResult.success, error: saveResult.error })

        if (saveResult.success) {
          logger.success('搜索历史保存成功')

          const verifyResult = await window.api.storage.loadSettings()
          logger.debug('验证保存 - 重新加载的设置', verifyResult.settings?.fofaSearchHistory)
        } else {
          logger.error('搜索历史保存失败', saveResult.error)
        }
      } else {
        logger.error('加载设置失败，无法保存历史记录')
      }
    } catch (error) {
      logger.error('保存搜索历史异常', error)
    }
  }

  // 添加到历史记录
  const addToHistory = async (query) => {
    if (!query || !query.trim()) return

    const trimmedQuery = query.trim()

    const existingIndex = searchHistory.value.indexOf(trimmedQuery)
    if (existingIndex > -1) {
      searchHistory.value.splice(existingIndex, 1)
    }

    searchHistory.value.unshift(trimmedQuery)

    if (searchHistory.value.length > 10) {
      searchHistory.value = searchHistory.value.slice(0, 10)
    }

    await saveSearchHistory()
  }

  // 选择历史记录
  const selectHistory = (query, searchQuery) => {
    searchQuery.value = query
    showHistoryDropdown.value = false
  }

  // 删除历史记录
  const deleteHistory = async (index) => {
    searchHistory.value.splice(index, 1)
    await saveSearchHistory()
  }

  // 处理搜索框失焦
  const handleSearchBlur = () => {
    setTimeout(() => {
      showHistoryDropdown.value = false
    }, 200)
  }

  return {
    searchHistory,
    showHistoryDropdown,
    loadSearchHistory,
    saveSearchHistory,
    addToHistory,
    selectHistory,
    deleteHistory,
    handleSearchBlur
  }
}
