/**
 * 搜索历史管理 Composable
 * 负责搜索历史的加载、保存、删除
 */
import { ref } from 'vue'

export function useSearchHistory() {
  const searchHistory = ref([])
  const showHistoryDropdown = ref(false)

  // 加载搜索历史
  const loadSearchHistory = async () => {
    try {
      console.log('开始加载搜索历史...')
      const result = await window.api.storage.loadSettings()
      console.log('加载设置结果:', result)
      if (result.success && result.settings && result.settings.fofaSearchHistory) {
        searchHistory.value = result.settings.fofaSearchHistory
        console.log('✓ 搜索历史加载成功:', searchHistory.value)
      } else {
        console.log('没有找到搜索历史，使用空数组')
        searchHistory.value = []
      }
    } catch (error) {
      console.error('加载搜索历史失败:', error)
      searchHistory.value = []
    }
  }

  // 保存搜索历史
  const saveSearchHistory = async () => {
    try {
      console.log('========== 开始保存搜索历史 ==========')
      console.log('当前历史记录数组:', JSON.stringify(searchHistory.value))
      console.log('数组长度:', searchHistory.value.length)

      const result = await window.api.storage.loadSettings()
      console.log('加载设置结果 success:', result.success)
      console.log('加载设置结果 settings:', result.settings)

      if (result.success) {
        const settings = result.settings || {}
        console.log('原始设置对象:', JSON.stringify(settings))

        settings.fofaSearchHistory = [...searchHistory.value]
        console.log('添加历史记录后的设置:', JSON.stringify(settings))
        console.log('fofaSearchHistory 字段:', settings.fofaSearchHistory)

        const saveResult = await window.api.storage.saveSettings(settings)
        console.log('保存结果 success:', saveResult.success)
        console.log('保存结果 error:', saveResult.error)

        if (saveResult.success) {
          console.log('✓✓✓ 搜索历史保存成功 ✓✓✓')

          const verifyResult = await window.api.storage.loadSettings()
          console.log('验证保存 - 重新加载的设置:', verifyResult.settings?.fofaSearchHistory)
        } else {
          console.error('✗✗✗ 搜索历史保存失败:', saveResult.error)
        }
      } else {
        console.error('✗✗✗ 加载设置失败，无法保存历史记录')
      }
      console.log('========== 保存流程结束 ==========')
    } catch (error) {
      console.error('✗✗✗ 保存搜索历史异常:', error)
      console.error('错误堆栈:', error.stack)
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
