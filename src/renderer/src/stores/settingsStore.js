/**
 * 应用设置管理 Store
 * 用于管理应用的全局设置，包括高级功能解锁状态等
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  // 高级功能解锁状态
  const isHijackUnlocked = ref(false)

  // GitHub 授权信息
  const githubToken = ref('')
  const githubUsername = ref('')
  const githubAvatar = ref('')
  const isGithubAuthorized = ref(false)

  // 自动检查更新设置
  const autoCheckUpdate = ref(true)

  // 其他设置
  const settings = ref({})

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
    fofaTimeout: 30000,
    advancedUnlocked: false,
    pocHijackEnabled: false,
    batchHijackEnabled: false,
    githubToken: '',
    githubUsername: '',
    githubAvatar: '',
    isGithubAuthorized: false,
    security: {
      enableAppPassword: false,
      appPasswordHash: '',
      enableTaskEncryption: false,
      taskPasswordHash: ''
    }
  }

  // 加载设置
  const loadSettings = async () => {
    try {
      const result = await window.api.storage.loadSettings()
      if (result.success && result.settings) {
        // 深度合并默认设置，确保所有字段都存在（包括嵌套对象）
        settings.value = {
          ...defaultSettings,
          ...result.settings,
          security: {
            ...defaultSettings.security,
            ...(result.settings.security || {})
          }
        }
        isHijackUnlocked.value = settings.value.advancedUnlocked || false
        autoCheckUpdate.value = settings.value.autoCheckUpdate !== false

        // 加载 GitHub 授权信息
        githubToken.value = settings.value.githubToken || ''
        githubUsername.value = settings.value.githubUsername || ''
        githubAvatar.value = settings.value.githubAvatar || ''
        isGithubAuthorized.value = settings.value.isGithubAuthorized || false

        console.log('设置已加载:', settings.value)
      }
    } catch (error) {
      console.error('加载设置失败:', error)
    }
  }

  // 保存设置
  const saveSettings = async (newSettings) => {
    try {
      settings.value = { ...settings.value, ...newSettings }

      // 使用 JSON.parse(JSON.stringify()) 创建纯对象，避免 Proxy 对象序列化问题
      const plainSettings = JSON.parse(JSON.stringify(settings.value))

      const result = await window.api.storage.saveSettings(plainSettings)
      console.log('设置已保存:', plainSettings)
      return result
    } catch (error) {
      console.error('保存设置失败:', error)
      return { success: false, error: error.message }
    }
  }

  // 解锁高级功能
  const unlockAdvancedFeatures = async () => {
    // 先加载当前设置，确保 settings.value 包含所有现有设置
    await loadSettings()

    // 设置解锁状态
    isHijackUnlocked.value = true

    // 保存更新后的设置
    const result = await saveSettings({ advancedUnlocked: true })
    console.log('高级功能已解锁')
    return result
  }

  // 设置自动检查更新
  const setAutoCheckUpdate = async (enabled) => {
    autoCheckUpdate.value = enabled
    await saveSettings({ autoCheckUpdate: enabled })
  }

  // GitHub OAuth 授权
  const authorizeGitHub = async (statusCallback) => {
    return new Promise((resolve) => {
      // 设置回调监听
      const handleCallback = async (result) => {
        // 移除监听器
        window.api.github.removeOAuthCallbackListener()

        if (!result.success) {
          resolve({ success: false, error: result.error })
          return
        }

        try {
          // 更新状态：授权成功，正在获取信息
          if (statusCallback) statusCallback('授权成功，正在获取信息...')

          // 检查用户是否 star 了项目
          const starResult = await window.api.github.checkStar(result.token)

          if (!starResult.success) {
            resolve({ success: false, error: starResult.error })
            return
          }

          // 更新状态：正在保存
          if (statusCallback) statusCallback('正在保存授权信息...')

          // 保存授权信息
          githubToken.value = result.token
          githubUsername.value = starResult.username
          githubAvatar.value = starResult.avatar
          isGithubAuthorized.value = true

          // 根据 star 状态决定是否解锁
          if (starResult.starred) {
            isHijackUnlocked.value = true
            await saveSettings({
              githubToken: result.token,
              githubUsername: starResult.username,
              githubAvatar: starResult.avatar,
              isGithubAuthorized: true,
              advancedUnlocked: true
            })
            resolve({ success: true, starred: true, username: starResult.username })
          } else {
            isHijackUnlocked.value = false
            await saveSettings({
              githubToken: result.token,
              githubUsername: starResult.username,
              githubAvatar: starResult.avatar,
              isGithubAuthorized: true,
              advancedUnlocked: false
            })
            resolve({ success: true, starred: false, username: starResult.username })
          }
        } catch (error) {
          console.error('处理授权回调失败:', error)
          resolve({ success: false, error: error.message })
        }
      }

      // 注册回调监听
      window.api.github.onOAuthCallback(handleCallback)

      // 更新状态：等待网页授权
      if (statusCallback) statusCallback('等待网页授权...')

      // 发起授权（在浏览器中打开）
      window.api.github.auth().catch((error) => {
        window.api.github.removeOAuthCallbackListener()
        resolve({ success: false, error: error.message })
      })
    })
  }

  // 验证 GitHub star 状态
  const verifyGitHubStar = async () => {
    try {
      // 如果没有 token，返回未授权
      if (!githubToken.value) {
        isHijackUnlocked.value = false
        isGithubAuthorized.value = false
        return { success: true, starred: false, authorized: false }
      }

      // 验证 token 是否有效
      const validateResult = await window.api.github.validateToken(githubToken.value)
      if (!validateResult.success || !validateResult.valid) {
        // token 无效，清除授权信息
        githubToken.value = ''
        githubUsername.value = ''
        githubAvatar.value = ''
        isGithubAuthorized.value = false
        isHijackUnlocked.value = false
        await saveSettings({
          githubToken: '',
          githubUsername: '',
          githubAvatar: '',
          isGithubAuthorized: false,
          advancedUnlocked: false
        })
        return { success: true, starred: false, authorized: false }
      }

      // 检查是否 star 了项目
      const starResult = await window.api.github.checkStar(githubToken.value)

      if (!starResult.success) {
        return { success: false, error: starResult.error }
      }

      // 更新解锁状态
      isHijackUnlocked.value = starResult.starred
      await saveSettings({
        advancedUnlocked: starResult.starred
      })

      return {
        success: true,
        starred: starResult.starred,
        authorized: true,
        username: starResult.username
      }
    } catch (error) {
      console.error('验证 GitHub star 状态失败:', error)
      return { success: false, error: error.message }
    }
  }

  // 取消 GitHub 授权
  const revokeGitHubAuth = async () => {
    githubToken.value = ''
    githubUsername.value = ''
    githubAvatar.value = ''
    isGithubAuthorized.value = false
    isHijackUnlocked.value = false

    await saveSettings({
      githubToken: '',
      githubUsername: '',
      githubAvatar: '',
      isGithubAuthorized: false,
      advancedUnlocked: false
    })
  }

  // 强制禁用高级功能（用于启动时的安全检查）
  const forceDisableAdvancedFeatures = async () => {
    console.log('[settingsStore] 强制禁用高级功能')

    // 先加载当前设置
    await loadSettings()

    // 设置解锁状态为 false
    isHijackUnlocked.value = false

    // 强制写入配置文件，禁用所有高级功能
    await saveSettings({
      advancedUnlocked: false,
      pocHijackEnabled: false,
      batchHijackEnabled: false
    })

    console.log('[settingsStore] 高级功能已强制禁用并写入配置文件')
  }

  return {
    isHijackUnlocked,
    githubToken,
    githubUsername,
    githubAvatar,
    isGithubAuthorized,
    autoCheckUpdate,
    settings,
    loadSettings,
    saveSettings,
    unlockAdvancedFeatures,
    setAutoCheckUpdate,
    authorizeGitHub,
    verifyGitHubStar,
    revokeGitHubAuth,
    forceDisableAdvancedFeatures
  }
})
