<template>
  <!-- 应用密码验证全屏遮罩（在 v-app 外部） -->
  <div v-if="showAppPasswordDialog" class="password-overlay">
    <div class="password-overlay-content">
      <v-card class="password-card" elevation="8">
        <v-card-title class="text-center pa-6">
          <v-icon size="48" color="primary" class="mb-4">mdi-shield-lock</v-icon>
          <div class="text-h5">应用已锁定</div>
        </v-card-title>
        <v-card-text class="pa-6">
          <v-text-field
            v-model="passwordInput"
            type="password"
            label="请输入应用密码"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-key"
            :error="passwordError"
            :error-messages="passwordErrorMessage"
            autofocus
            @keyup.enter="handleAppPasswordVerify"
          />
        </v-card-text>
        <v-card-actions class="pa-6 pt-0">
          <v-spacer />
          <v-btn
            color="primary"
            size="large"
            :loading="verifyingPassword"
            @click="handleAppPasswordVerify"
          >
            解锁
          </v-btn>
        </v-card-actions>
      </v-card>
    </div>
  </div>

  <v-app class="app-root">
    <!-- 主应用内容（只在解锁后显示） -->
    <template v-if="isAppUnlocked">
      <v-navigation-drawer permanent width="200" class="sidebar">
        <div class="logo">
          <v-icon size="24" color="primary">mdi-shield-check</v-icon>
          <span class="logo-text">React2Shell</span>
          <span
            class="pro-badge"
            :class="{ unlocked: settingsStore.isHijackUnlocked }"
            :title="
              settingsStore.isHijackUnlocked
                ? `已解锁 (${settingsStore.githubUsername})`
                : '需要 Star 项目解锁'
            "
          >
            PRO
          </span>
        </div>

        <v-list density="compact" nav>
          <v-list-item
            prepend-icon="mdi-bug"
            title="POC验证"
            value="poc"
            :to="{ path: '/poc' }"
            :active="activeMenu === '/poc'"
          />
          <v-list-item
            prepend-icon="mdi-format-list-bulleted"
            title="批量验证"
            value="batch"
            :to="{ path: '/batch' }"
            :active="activeMenu === '/batch'"
          />
          <v-list-item
            prepend-icon="mdi-cog"
            title="设置"
            value="settings"
            :to="{ path: '/settings' }"
            :active="activeMenu === '/settings'"
          />
        </v-list>

        <!-- 版本信息和链接 -->
        <div class="sidebar-footer">
          <div class="version-info">
            <span class="version-text">v{{ updateStore.appVersion }}</span>
            <span
              v-if="updateStore.versionStatus === 'update'"
              class="version-badge version-update"
              @click="showUpdateDialog = true"
            >
              有更新
            </span>
            <span v-else class="version-badge version-latest"> 最新版 </span>
          </div>
          <v-divider class="my-2" />
          <div class="author-links">
            <a
              href="https://github.com/MoLeft"
              target="_blank"
              class="author-link"
              title="作者 GitHub"
            >
              <v-icon size="16">mdi-github</v-icon>
              <span>GitHub</span>
            </a>
            <a
              href="https://blog.h-acker.cn/forums"
              target="_blank"
              class="author-link"
              title="官方博客"
            >
              <v-icon size="16">mdi-web</v-icon>
              <span>官方博客</span>
            </a>
          </div>
        </div>
      </v-navigation-drawer>

      <v-main class="main-content">
        <div class="main-wrapper">
          <router-view v-slot="{ Component }">
            <keep-alive>
              <component :is="Component" />
            </keep-alive>
          </router-view>
        </div>
      </v-main>
    </template>

    <!-- Star 被取消提示对话框 -->
    <v-dialog v-model="showStarRevokedDialog" max-width="400" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="warning" class="mr-2">mdi-alert</v-icon>
          高级功能已禁用
        </v-card-title>
        <v-card-text>
          <p class="mb-2">{{ starRevokedMessage }}</p>
          <p class="text-body-2 text-grey">
            高级功能已被禁用。如需继续使用，请前往 GitHub 为本项目点 Star，然后在设置中重新验证。
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" @click="showStarRevokedDialog = false">我知道了</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 检查更新 Loading -->
    <v-snackbar v-model="checkingUpdateSnackbar" :timeout="-1" location="top">
      <div class="d-flex align-center">
        <v-progress-circular indeterminate size="20" width="2" class="mr-3" />
        正在检查更新...
      </div>
    </v-snackbar>

    <!-- 已是最新版本提示 -->
    <v-snackbar v-model="showLatestVersionSnackbar" color="success" :timeout="3000" location="top">
      <div class="d-flex align-center">
        <v-icon class="mr-2">mdi-check-circle</v-icon>
        已经是最新版本啦
      </div>
    </v-snackbar>

    <!-- 更新对话框 -->
    <UpdateDialog
      :show="showUpdateDialog"
      :has-update="updateStore.versionStatus === 'update'"
      :version="updateStore.updateInfo.version"
      :current-version="updateStore.updateInfo.currentVersion"
      :release-notes="updateStore.updateInfo.releaseNotes"
      :rendered-notes="updateStore.renderedReleaseNotes"
      @close="showUpdateDialog = false"
      @download="downloadUpdate"
    />
  </v-app>
</template>

<script setup>
import { computed, ref, provide, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAppStore } from './stores/appStore'
import { useSettingsStore } from './stores/settingsStore'
import { useUpdateStore } from './stores/updateStore'
import { useFofaStore } from './stores/fofaStore'
import UpdateDialog from './components/settings/UpdateDialog.vue'
import { decryptData } from './utils/crypto'

const route = useRoute()
const activeMenu = computed(() => route.path)

// 使用 Pinia stores
const appStore = useAppStore()
const { isVulnerable, currentUrl } = storeToRefs(appStore)
const settingsStore = useSettingsStore()
const updateStore = useUpdateStore()
const fofaStore = useFofaStore()

// GitHub 验证相关状态
const showStarRevokedDialog = ref(false)
const starRevokedMessage = ref('')

// 验证 GitHub Star 状态并强制执行安全策略（隐式检查）
const verifyGitHubStarStatus = async () => {
  try {
    const result = await settingsStore.verifyGitHubStar()

    if (result.success) {
      if (!result.authorized) {
        // 未授权 GitHub，强制关闭高级功能（静默处理）
        console.log('用户未授权 GitHub，强制关闭高级功能')
        await settingsStore.forceDisableAdvancedFeatures()
      } else if (!result.starred) {
        // 已授权但未 Star，强制关闭高级功能并弹出 dialog
        console.log('用户未 Star 项目，强制关闭高级功能')
        await settingsStore.forceDisableAdvancedFeatures()
        starRevokedMessage.value = '检测到您已取消 Star 项目'
        showStarRevokedDialog.value = true
      } else {
        // 已授权且已 Star，验证通过（静默处理）
        console.log('GitHub Star 验证通过，高级功能已解锁')
      }
    } else {
      // 验证失败，为安全起见强制关闭高级功能（静默处理）
      console.error('GitHub Star 验证失败，强制关闭高级功能')
      await settingsStore.forceDisableAdvancedFeatures()
    }
  } catch (error) {
    // 验证异常，为安全起见强制关闭高级功能（静默处理）
    console.error('验证 GitHub Star 状态异常:', error)
    await settingsStore.forceDisableAdvancedFeatures()
  }
}

// 提供给子组件（保持向后兼容）
provide('isVulnerable', isVulnerable)
provide('currentUrl', currentUrl)

// 自动检查更新相关
const showUpdateDialog = ref(false)
const showLatestVersionSnackbar = ref(false)
const checkingUpdateSnackbar = ref(false)

// 应用密码验证相关
const showAppPasswordDialog = ref(false)
const passwordInput = ref('')
const passwordError = ref(false)
const passwordErrorMessage = ref('')
const verifyingPassword = ref(false)
const isAppUnlocked = ref(false)

// 启动时自动检查更新（根据设置决定是否弹窗提示）
const autoCheckUpdate = async () => {
  try {
    // 如果禁用了自动检查更新，则静默检查
    if (!settingsStore.autoCheckUpdate) {
      console.log('自动检查更新已禁用，仅更新侧边栏状态')
      await updateStore.silentCheckVersion()
      return
    }

    // 启用了自动检查更新，显示 loading snackbar
    console.log('启动时自动检查更新...')
    checkingUpdateSnackbar.value = true
    updateStore.checkingUpdate = true

    await updateStore.silentCheckVersion()

    if (updateStore.versionStatus === 'update') {
      // 有新版本，显示更新对话框
      showUpdateDialog.value = true
    } else if (updateStore.versionStatus === 'latest') {
      // 已是最新版本，显示提示
      showLatestVersionSnackbar.value = true
    }
  } catch (error) {
    console.error('自动检查更新异常:', error)
  } finally {
    updateStore.checkingUpdate = false
    checkingUpdateSnackbar.value = false
  }
}

// 打开下载页面
const downloadUpdate = async () => {
  const success = await updateStore.downloadUpdate()
  if (success) {
    showUpdateDialog.value = false
  }
}

// 监听路由变化，当进入设置页面时重新加载解锁状态
watch(
  () => route.path,
  (newPath) => {
    if (newPath === '/settings') {
      settingsStore.loadSettings()
    }
  }
)

// 验证应用密码
const verifyAppPassword = async () => {
  try {
    const result = await window.api.storage.loadSettings()
    if (result.success && result.settings?.security?.enableAppPassword) {
      const passwordHash = result.settings.security.appPasswordHash
      if (passwordHash) {
        // 需要验证密码
        showAppPasswordDialog.value = true
        return false
      }
    }
    // 不需要密码或未启用
    isAppUnlocked.value = true
    return true
  } catch (error) {
    console.error('检查应用密码失败:', error)
    isAppUnlocked.value = true
    return true
  }
}

// 处理应用密码验证
const handleAppPasswordVerify = async () => {
  if (!passwordInput.value) {
    passwordError.value = true
    passwordErrorMessage.value = '请输入密码'
    return
  }

  verifyingPassword.value = true
  passwordError.value = false
  passwordErrorMessage.value = ''

  try {
    const result = await window.api.storage.loadSettings()
    if (result.success && result.settings?.security?.appPasswordHash) {
      const passwordHash = result.settings.security.appPasswordHash
      // 尝试解密验证字符串
      const testString = 'R2STB_APP_PASSWORD_VERIFICATION'
      const decrypted = await decryptData(passwordHash, passwordInput.value)

      if (decrypted === testString) {
        // 密码正确
        isAppUnlocked.value = true
        showAppPasswordDialog.value = false
        passwordInput.value = ''
      } else {
        // 密码错误
        passwordError.value = true
        passwordErrorMessage.value = '密码错误，请重试'
        passwordInput.value = ''
      }
    }
  } catch (error) {
    // 解密失败，密码错误
    console.error('密码验证失败:', error)
    passwordError.value = true
    passwordErrorMessage.value = '密码错误，请重试'
    passwordInput.value = ''
  } finally {
    verifyingPassword.value = false
  }
}

// 组件挂载时执行
onMounted(async () => {
  // 立即获取版本号
  await updateStore.loadAppVersion()

  // 加载设置（包括解锁状态和 GitHub 授权信息）
  await settingsStore.loadSettings()

  // 验证应用密码
  const unlocked = await verifyAppPassword()

  // 如果不需要密码，直接初始化
  if (unlocked) {
    initializeApp()
  }
  // 如果需要密码，等待用户在全屏遮罩中输入密码
  // 密码验证通过后会自动调用 initializeApp
})

// 监听解锁状态，解锁后初始化应用（只初始化一次）
let initialized = false
watch(isAppUnlocked, (unlocked) => {
  if (unlocked && !initialized) {
    initialized = true
    initializeApp()
  }
})

// 监听密码对话框状态，控制 body 滚动
watch(showAppPasswordDialog, (show) => {
  if (show) {
    // 显示密码遮罩时，禁用 body 滚动
    document.body.style.overflow = 'hidden'
  } else {
    // 隐藏密码遮罩时，恢复 body 滚动
    document.body.style.overflow = ''
  }
})

// 初始化应用
const initializeApp = async () => {
  // 验证 GitHub Star 状态（防止用户修改配置文件）
  await verifyGitHubStarStatus()

  // 测试 FOFA 连接（静默测试，不阻塞启动）
  fofaStore.testConnection()

  // 延迟 2 秒后检查更新，避免影响启动速度
  setTimeout(() => {
    autoCheckUpdate()
  }, 2000)
}
</script>

<style scoped>
.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  color: #333;
  font-weight: bold;
  font-size: 15px;
}

.logo-text {
  margin-left: 8px;
}

.pro-badge {
  margin-left: 6px;
  padding: 1px 5px;
  background-color: #9e9e9e;
  color: white;
  font-size: 9px;
  font-weight: 600;
  border-radius: 3px;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  opacity: 0.7;
  cursor: default;
  user-select: none;
  transition: all 0.3s;
}

.pro-badge.unlocked {
  background-color: rgb(var(--v-theme-primary));
  opacity: 1;
  box-shadow: 0 0 8px rgba(var(--v-theme-primary), 0.4);
}

.sidebar {
  background-color: #fafafa;
}

.main-content {
  background-color: #fff;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-content :deep(.v-main) {
  padding: 0;
}

.main-wrapper {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.main-content :deep(.v-main__wrap) {
  display: flex;
  flex: 1;
  min-height: 0;
}

.app-root {
  min-height: 100vh;
}

.sidebar-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  background-color: #fafafa;
  border-top: 1px solid rgba(0, 0, 0, 0.12);
}

.version-info {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.7);
  margin-bottom: 4px;
  gap: 6px;
}

.version-text {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.8);
}

.author-links {
  display: flex;
  justify-content: space-around;
  gap: 4px;
}

.author-link {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.7);
  text-decoration: none;
  border-radius: 4px;
  transition: all 0.2s;
}

.author-link:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: rgb(var(--v-theme-primary));
}

.author-link span {
  font-weight: 500;
}

.version-badge {
  margin-left: 6px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 600;
  border-radius: 3px;
  letter-spacing: 0.3px;
  white-space: nowrap;
}

.version-latest {
  background-color: #4caf50;
  color: white;
}

.version-update {
  background-color: #ff9800;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.version-update:hover {
  background-color: #f57c00;
  transform: scale(1.05);
}

.password-overlay {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 100% !important;
  height: 100% !important;
  max-width: 100% !important;
  max-height: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  background-color: rgba(0, 0, 0, 0.7) !important;
  z-index: 99999 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  overflow: hidden !important;
}

.password-overlay::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
}

.password-overlay-content {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.password-card {
  min-width: 400px;
  max-width: 500px;
}

.password-card .v-card-title {
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
