/**
 * POC 验证管理 Store
 * 用于管理 POC 验证的历史记录和相关状态
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const usePocStore = defineStore('poc', () => {
  // 漏洞历史记录
  const vulnHistory = ref([])

  // Favicon 缓存
  const faviconCache = ref({})

  // 加载状态
  const historyLoading = ref(false)
  const faviconLoading = ref({})

  // 加载漏洞历史
  const loadVulnHistory = async () => {
    historyLoading.value = true
    try {
      const result = await window.api.storage.loadHistory()
      if (result.success && Array.isArray(result.history)) {
        vulnHistory.value = result.history
        console.log('漏洞历史已加载:', result.history.length, '条')

        // 加载 favicon
        for (const url of result.history) {
          if (url && !faviconCache.value[url]) {
            loadFavicon(url)
          }
        }
      }
    } catch (error) {
      console.error('加载漏洞历史失败:', error)
    } finally {
      historyLoading.value = false
    }
  }

  // 加载 Favicon
  const loadFavicon = async (url) => {
    if (!url || faviconCache.value[url] || faviconLoading.value[url]) {
      return
    }

    faviconLoading.value[url] = true

    try {
      if (!window.api?.storage?.fetchFavicon) {
        console.warn('fetchFavicon API 不可用')
        return
      }

      const result = await window.api.storage.fetchFavicon(url)
      if (result.success && result.favicon) {
        faviconCache.value[url] = result.favicon
      }
    } catch (error) {
      console.error(`加载 favicon 失败 (${url}):`, error)
    } finally {
      delete faviconLoading.value[url]
    }
  }

  // 添加漏洞历史
  const addVulnHistory = async (url) => {
    try {
      const result = await window.api.storage.addHistoryItem(url)
      if (result.success) {
        await loadVulnHistory()
        console.log('漏洞历史已添加:', url)
      }
    } catch (error) {
      console.error('添加漏洞历史失败:', error)
    }
  }

  // 删除漏洞历史
  const removeVulnHistory = async (url) => {
    try {
      const result = await window.api.storage.removeHistoryItem(url)
      if (result.success) {
        vulnHistory.value = vulnHistory.value.filter((item) => item !== url)
        delete faviconCache.value[url]
        console.log('漏洞历史已删除:', url)
        return true
      }
      return false
    } catch (error) {
      console.error('删除漏洞历史失败:', error)
      return false
    }
  }

  // 清空漏洞历史
  const clearVulnHistory = async () => {
    try {
      const result = await window.api.storage.clearHistory()
      if (result.success) {
        vulnHistory.value = []
        faviconCache.value = {}
        console.log('漏洞历史已清空')
        return true
      }
      return false
    } catch (error) {
      console.error('清空漏洞历史失败:', error)
      return false
    }
  }

  return {
    vulnHistory,
    faviconCache,
    historyLoading,
    faviconLoading,
    loadVulnHistory,
    loadFavicon,
    addVulnHistory,
    removeVulnHistory,
    clearVulnHistory
  }
})
