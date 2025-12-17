/**
 * 设置数据管理 Composable
 * 负责加载和保存设置
 */
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '../stores/settingsStore'

export function useSettingsData() {
  const settingsStore = useSettingsStore()
  const { settings: storeSettings } = storeToRefs(settingsStore)

  // 默认设置
  const defaultSettings = {
    timeout: 10000,
    proxyEnabled: false,
    proxyProtocol: 'http',
    proxyHost: '127.0.0.1',
    proxyPort: 8080,
    proxyAuth: false,
    proxyUsername: '',
    proxyPassword: '',
    ignoreCertErrors: false,
    autoCheckUpdate: true,
    githubMirrorEnabled: false,
    githubMirrorType: 'prefix',
    githubMirrorUrl: '',
    fofaApiEmail: '',
    fofaApiKey: '',
    fofaBypassProxy: false,
    fofaTimeout: 30000, // FOFA 接口超时时间（默认 30 秒）
    advancedUnlocked: false,
    pocHijackEnabled: false,
    batchHijackEnabled: false
  }

  // 直接使用 settingsStore 的 settings，确保单一数据源
  const settings = computed({
    get: () => storeSettings.value,
    set: (val) => {
      settingsStore.settings = val
    }
  })

  // 加载设置
  const loadSettings = async () => {
    await settingsStore.loadSettings()
  }

  // 保存设置
  const saveSettings = async () => {
    try {
      console.log('💾 开始保存设置...', settings.value)
      console.log('💾 advancedUnlocked:', settings.value.advancedUnlocked)
      console.log('💾 pocHijackEnabled:', settings.value.pocHijackEnabled)

      // 创建纯对象副本，移除任何响应式代理
      const plainSettings = JSON.parse(JSON.stringify(settings.value))
      console.log('💾 plainSettings:', plainSettings)

      const result = await window.api.storage.saveSettings(plainSettings)
      console.log('✅ 设置保存成功:', result)

      // 更新 settingsStore 的状态标志
      settingsStore.isHijackUnlocked = settings.value.advancedUnlocked || false
      console.log('✅ settingsStore 已同步')
    } catch (error) {
      console.error('❌ 保存设置失败:', error)
    }
  }

  return {
    settings,
    defaultSettings,
    loadSettings,
    saveSettings
  }
}
