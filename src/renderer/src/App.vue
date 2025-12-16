<template>
  <v-app class="app-root">
    <v-navigation-drawer permanent width="200" class="sidebar">
      <div class="logo">
        <v-icon size="24" color="primary">mdi-shield-check</v-icon>
        <span class="logo-text">React2Shell</span>
        <span
          class="pro-badge"
          :class="{ 'pro-badge-disabled': !isSettingsPage }"
          @click="isSettingsPage ? handleProClick() : null"
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
          <span class="version-text">v{{ appVersion }}</span>
          <span
            v-if="versionStatus === 'update'"
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
        <router-view />
      </div>
    </v-main>

    <!-- 密码解锁对话框 -->
    <v-dialog v-model="showPasswordDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h6">解锁高级功能</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="password"
            label="请输入密码"
            type="password"
            variant="outlined"
            density="comfortable"
            autofocus
            @keyup.enter="checkPassword"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="showPasswordDialog = false">取消</v-btn>
          <v-btn color="primary" @click="checkPassword">确认</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 解锁成功提示 -->
    <v-snackbar v-model="showUnlockSnackbar" color="success" :timeout="2000">
      高级功能已解锁！
    </v-snackbar>

    <!-- 密码错误提示 -->
    <v-snackbar v-model="showErrorSnackbar" color="error" :timeout="2000">
      密码错误，请重试
    </v-snackbar>

    <!-- 已解锁提示 -->
    <v-snackbar v-model="showAlreadyUnlockedSnackbar" color="info" :timeout="2000">
      高级功能已经解锁
    </v-snackbar>

    <!-- 检查更新 Loading -->
    <v-snackbar v-model="checkingUpdate" :timeout="-1" location="top">
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
    <v-dialog v-model="showUpdateDialog" max-width="600" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="success" class="mr-2" size="24">mdi-update</v-icon>
          发现新版本
        </v-card-title>

        <v-card-text>
          <div class="mb-3">
            <div class="text-body-2 mb-1">
              <span class="font-weight-medium">当前版本：</span>v{{ updateInfo.currentVersion }}
            </div>
            <div class="text-body-2">
              <span class="font-weight-medium">最新版本：</span>v{{ updateInfo.version }}
            </div>
          </div>

          <v-divider class="my-3" />

          <div v-if="updateInfo.releaseNotes" class="release-notes">
            <div class="text-subtitle-2 mb-2">更新内容：</div>
            <div class="markdown-content" v-html="renderedReleaseNotes"></div>
          </div>

          <div class="text-caption text-grey mt-4">
            点击"前往下载"将打开 GitHub Releases 页面，请选择对应平台的安装包下载
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showUpdateDialog = false">稍后更新</v-btn>
          <v-btn color="primary" variant="flat" @click="downloadUpdate">前往下载</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup>
import { computed, ref, provide, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { marked } from 'marked'

// 配置 marked
marked.setOptions({
  breaks: true,
  gfm: true
})

const route = useRoute()
const activeMenu = computed(() => route.path)
const isSettingsPage = computed(() => route.path === '/settings')

// 应用版本号（动态获取）
const appVersion = ref('...')
// 版本状态：latest-最新版（默认）, update-有更新
const versionStatus = ref('latest')

// 全局状态：是否检测到漏洞
const isVulnerable = ref(false)
const currentUrl = ref('')

// 解锁相关状态
const proClickCount = ref(0)
const showPasswordDialog = ref(false)
const password = ref('')
const isHijackUnlocked = ref(false)
const showUnlockSnackbar = ref(false)
const showErrorSnackbar = ref(false)
const showAlreadyUnlockedSnackbar = ref(false)
let clickTimer = null

// 处理 PRO 徽标点击
const handleProClick = () => {
  proClickCount.value++

  // 清除之前的定时器
  if (clickTimer) {
    clearTimeout(clickTimer)
  }

  // 2秒内没有新点击则重置计数
  clickTimer = setTimeout(() => {
    proClickCount.value = 0
  }, 2000)

  // 连续点击5次后的处理
  if (proClickCount.value >= 5) {
    proClickCount.value = 0

    // 如果已经解锁，显示提示
    if (isHijackUnlocked.value) {
      showAlreadyUnlockedSnackbar.value = true
    } else {
      // 未解锁，显示密码对话框
      showPasswordDialog.value = true
      password.value = ''
    }
  }
}

// 检查密码
const checkPassword = async () => {
  if (password.value === 'xuboyang666') {
    isHijackUnlocked.value = true
    showPasswordDialog.value = false
    showUnlockSnackbar.value = true

    // 保存解锁状态到设置中
    try {
      const result = await window.api.storage.loadSettings()
      const settings = result.success ? result.settings : {}
      settings.advancedUnlocked = true
      await window.api.storage.saveSettings(settings)
      console.log('高级功能已解锁并保存到设置')
    } catch (error) {
      console.error('保存解锁状态失败:', error)
    }
  } else {
    showErrorSnackbar.value = true
    password.value = ''
  }
}

// 从设置中恢复解锁状态
const loadUnlockStatus = async () => {
  try {
    const result = await window.api.storage.loadSettings()
    if (result.success && result.settings?.advancedUnlocked) {
      isHijackUnlocked.value = true
      console.log('已从设置中恢复解锁状态')
    } else {
      isHijackUnlocked.value = false
      console.log('高级功能未解锁')
    }
  } catch (error) {
    console.error('加载解锁状态失败:', error)
  }
}

// 提供给子组件
provide('isVulnerable', isVulnerable)
provide('currentUrl', currentUrl)

// 自动检查更新相关
const checkingUpdate = ref(false)
const showUpdateDialog = ref(false)
const showLatestVersionSnackbar = ref(false)
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

// 静默检查版本状态（仅更新侧边栏徽章，不弹窗）
const silentCheckVersion = async () => {
  try {
    console.log('静默检查版本状态...')

    const result = await window.api.updater.checkForUpdates()

    if (result.error) {
      console.error('检查版本失败:', result.error)
      // 保持默认的"最新版"状态
      return
    }

    if (result.hasUpdate) {
      // 有新版本，更新状态和信息，不弹窗
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
      // 已是最新版本，保持默认状态
      versionStatus.value = 'latest'
      console.log('当前已是最新版本')
    }
  } catch (error) {
    console.error('静默检查版本异常:', error)
    // 保持默认的"最新版"状态
  }
}

// 启动时自动检查更新（根据设置决定是否弹窗提示）
const autoCheckUpdate = async () => {
  try {
    // 加载设置
    const settingsResult = await window.api.storage.loadSettings()
    const settings = settingsResult.success ? settingsResult.settings : null

    // 先静默检查版本状态（总是执行）
    await silentCheckVersion()

    // 如果禁用了自动检查更新，则不显示弹窗和提示
    if (settings?.autoCheckUpdate === false) {
      console.log('自动检查更新已禁用，仅更新侧边栏状态')
      return
    }

    // 如果启用了自动检查更新，则显示相应的提示
    console.log('启动时自动检查更新...')
    checkingUpdate.value = true

    if (versionStatus.value === 'update') {
      // 有新版本，显示更新对话框
      showUpdateDialog.value = true
    } else if (versionStatus.value === 'latest') {
      // 已是最新版本，显示提示
      showLatestVersionSnackbar.value = true
    }
  } catch (error) {
    console.error('自动检查更新异常:', error)
  } finally {
    checkingUpdate.value = false
  }
}

// 打开下载页面
const downloadUpdate = async () => {
  try {
    const releaseUrl = updateInfo.value.releaseUrl
    const result = await window.api.updater.downloadUpdate(releaseUrl)

    if (result.success) {
      showUpdateDialog.value = false
    }
  } catch (error) {
    console.error('打开下载页面失败:', error)
  }
}

// 获取应用版本号
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

// 监听路由变化，当进入设置页面时重新加载解锁状态
watch(
  () => route.path,
  (newPath) => {
    if (newPath === '/settings') {
      loadUnlockStatus()
    }
  }
)

// 组件挂载时执行
onMounted(() => {
  // 立即获取版本号
  loadAppVersion()

  // 加载解锁状态
  loadUnlockStatus()

  // 延迟 2 秒后检查更新，避免影响启动速度
  setTimeout(() => {
    autoCheckUpdate()
  }, 2000)
})
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
  background-color: rgb(var(--v-theme-primary));
  color: white;
  font-size: 9px;
  font-weight: 600;
  border-radius: 3px;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  opacity: 0.9;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s;
}

.pro-badge:hover {
  opacity: 1;
}

.pro-badge:active {
  transform: scale(0.95);
}

.pro-badge-disabled {
  cursor: default;
}

.pro-badge-disabled:hover {
  opacity: 0.9;
  transform: none;
}

.pro-badge-disabled:active {
  transform: none;
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

.release-notes {
  max-height: 300px;
  overflow-y: auto;
  padding: 12px;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.markdown-content {
  font-size: 14px;
  line-height: 1.6;
  color: rgba(0, 0, 0, 0.7);
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  margin-top: 16px;
  margin-bottom: 8px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.87);
}

.markdown-content :deep(h1) {
  font-size: 1.5em;
}

.markdown-content :deep(h2) {
  font-size: 1.3em;
}

.markdown-content :deep(h3) {
  font-size: 1.1em;
}

.markdown-content :deep(p) {
  margin-bottom: 8px;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin-left: 20px;
  margin-bottom: 8px;
}

.markdown-content :deep(li) {
  margin-bottom: 4px;
}

.markdown-content :deep(code) {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

.markdown-content :deep(pre) {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
  margin-bottom: 8px;
}

.markdown-content :deep(pre code) {
  background-color: transparent;
  padding: 0;
}

.markdown-content :deep(a) {
  color: #1976d2;
  text-decoration: none;
}

.markdown-content :deep(a:hover) {
  text-decoration: underline;
}

.markdown-content :deep(blockquote) {
  border-left: 4px solid #ddd;
  padding-left: 12px;
  margin-left: 0;
  color: rgba(0, 0, 0, 0.6);
}

.markdown-content :deep(hr) {
  border: none;
  border-top: 1px solid #ddd;
  margin: 16px 0;
}

.markdown-content :deep(strong) {
  font-weight: 600;
}

.markdown-content :deep(em) {
  font-style: italic;
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
</style>
