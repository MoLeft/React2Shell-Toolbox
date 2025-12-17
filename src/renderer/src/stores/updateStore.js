/**
 * 版本更新管理 Store
 * 用于管理应用版本检查和更新相关状态
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { marked } from 'marked'

// 配置 marked
marked.setOptions({
  breaks: true,
  gfm: true
})

export const useUpdateStore = defineStore('update', () => {
  // 应用版本号
  const appVersion = ref('...')
  
  // 版本状态：latest-最新版, update-有更新
  const versionStatus = ref('latest')
  
  // 检查更新中
  const checkingUpdate = ref(false)
  
  // 更新信息
  const updateInfo = ref({
    hasUpdate: false,
    version: '',
    currentVersion: '',
    releaseNotes: '',
    releaseUrl: ''
  })

  // 渲染 markdown 格式的更新内容
  const renderedReleaseNotes = computed(() => {
    if (!updateInfo.value.releaseNotes) return ''
    return marked.parse(updateInfo.value.releaseNotes)
  })

  // 加载应用版本号
  const loadAppVersion = async () => {
    try {
      const versionInfo = await window.api.getVersion()
      if (versionInfo && versionInfo.version) {
        appVersion.value = versionInfo.version
        console.log('应用版本:', versionInfo.version)
      }
    } catch (error) {
      console.error('获取版本号失败:', error)
      appVersion.value = '未知'
    }
  }

  // 静默检查版本状态（仅更新侧边栏徽章，不弹窗）
  const silentCheckVersion = async () => {
    try {
      console.log('静默检查版本状态...')

      const result = await window.api.updater.checkForUpdates()

      if (result.error) {
        console.error('检查版本失败:', result.error)
        return
      }

      if (result.hasUpdate) {
        versionStatus.value = 'update'
        updateInfo.value = {
          hasUpdate: true,
          version: result.version,
          currentVersion: result.currentVersion,
          releaseNotes: result.releaseNotes || '',
          releaseUrl: result.releaseUrl || result.downloadUrl
        }
        console.log(`发现新版本 v${result.version}`)
      } else {
        versionStatus.value = 'latest'
        console.log('当前已是最新版本')
      }
    } catch (error) {
      console.error('静默检查版本异常:', error)
    }
  }

  // 检查更新（带加载状态）
  const checkForUpdates = async () => {
    checkingUpdate.value = true
    try {
      await silentCheckVersion()
    } finally {
      checkingUpdate.value = false
    }
  }

  // 下载更新
  const downloadUpdate = async () => {
    try {
      const releaseUrl = updateInfo.value.releaseUrl
      const result = await window.api.updater.downloadUpdate(releaseUrl)
      return result.success
    } catch (error) {
      console.error('打开下载页面失败:', error)
      return false
    }
  }

  return {
    appVersion,
    versionStatus,
    checkingUpdate,
    updateInfo,
    renderedReleaseNotes,
    loadAppVersion,
    silentCheckVersion,
    checkForUpdates,
    downloadUpdate
  }
})
