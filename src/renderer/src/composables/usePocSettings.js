/**
 * POC 设置功能 Composable
 * 负责加载和管理 POC 相关设置
 */
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '../stores/settingsStore'

export function usePocSettings() {
  const settingsStore = useSettingsStore()
  const { isHijackUnlocked, settings } = storeToRefs(settingsStore)

  // 计算属性：只有在高级功能解锁 且 POC劫持功能启用时才为 true
  const pocHijackEnabled = computed(() => {
    return isHijackUnlocked.value && settings.value.pocHijackEnabled === true
  })

  // 加载设置（保持向后兼容）
  const loadSettings = async () => {
    await settingsStore.loadSettings()
  }

  return {
    pocHijackEnabled,
    loadSettings
  }
}
