/**
 * 应用全局状态管理 Store
 * 用于管理应用级别的全局状态
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  // POC 验证相关状态
  const isVulnerable = ref(false)
  const currentUrl = ref('')

  // 设置漏洞状态
  const setVulnerable = (vulnerable, url = '') => {
    isVulnerable.value = vulnerable
    if (url) {
      currentUrl.value = url
    }
  }

  // 重置漏洞状态
  const resetVulnerable = () => {
    isVulnerable.value = false
    currentUrl.value = ''
  }

  return {
    isVulnerable,
    currentUrl,
    setVulnerable,
    resetVulnerable
  }
})
