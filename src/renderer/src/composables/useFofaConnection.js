/**
 * FOFA 连接管理 Composable
 * 负责 FOFA API 连接测试和用户信息管理
 * 现在使用 Pinia store 进行状态管理
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFofaStore } from '../stores/fofaStore'

export function useFofaConnection() {
  const { t } = useI18n()
  const fofaStore = useFofaStore()

  // 邮箱脱敏函数
  const maskEmail = (email) => {
    if (!email) return ''
    const [username, domain] = email.split('@')
    if (!username || !domain) return email

    if (username.length <= 4) {
      return `${username[0]}***@${domain}`
    }

    return `${username.slice(0, 2)}***${username.slice(-2)}@${domain}`
  }

  // 脱敏后的邮箱
  const fofaEmail = computed(() => maskEmail(fofaStore.email))

  // 加载 FOFA 邮箱（已废弃，现在由 fofaStore 管理）
  const loadFofaEmail = async () => {
    // 如果 store 还没有初始化，触发测试连接
    if (!fofaStore.initialized) {
      await fofaStore.testConnection()
    }
  }

  // 测试 FOFA 连接
  const testFofaConnection = async () => {
    await fofaStore.testConnection()
    
    if (fofaStore.connected) {
      return { success: true, message: t('settings.fofa.testSuccess') }
    } else {
      return { success: false, error: t('settings.fofa.testFailed') }
    }
  }

  return {
    fofaConnected: computed(() => fofaStore.connected),
    testingConnection: computed(() => fofaStore.testing),
    fofaEmail,
    userInfo: computed(() => fofaStore.userInfo),
    loadFofaEmail,
    testFofaConnection
  }
}
